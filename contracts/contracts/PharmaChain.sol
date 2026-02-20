// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PharmaChain
 * @author PharmaChain Team
 * @notice Security-first pharmaceutical supply-chain tracker.
 * @dev Implements a strict state machine for batch lifecycle with
 *      role-based access via OpenZeppelin AccessControl.
 *
 *      Lifecycle:  Created → InTransit → Delivered → QATesting → Approved / Rejected
 *                  Any non-terminal state ──────────────────────→ Recalled
 *
 *      SWC compliance:
 *        - SWC-103  Locked pragma
 *        - SWC-100  Explicit visibility on all functions & state vars
 *        - SWC-108  No default visibility
 *        - SWC-115  msg.sender only (no tx.origin)
 */
contract PharmaChain is AccessControl, ReentrancyGuard {
    // ──────────────────────────── Roles ────────────────────────────

    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant LOGISTICS_ROLE    = keccak256("LOGISTICS_ROLE");
    bytes32 public constant TESTER_ROLE       = keccak256("TESTER_ROLE");
    bytes32 public constant REGULATOR_ROLE    = keccak256("REGULATOR_ROLE");

    // ──────────────────────────── Types ────────────────────────────

    enum Status {
        Created,     // 0
        InTransit,   // 1
        Delivered,   // 2
        QATesting,   // 3
        Approved,    // 4
        Rejected,    // 5
        Recalled     // 6
    }

    struct BatchInfo {
        uint256 batchId;
        string  drugName;
        address manufacturer;
        address currentHolder;
        Status  status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct TemperatureLog {
        int16   temperatureCelsius; // tenths of °C (e.g. 365 = 36.5 °C)
        uint256 timestamp;
        address recorder;
    }

    // ──────────────────────────── Custom Errors ────────────────────

    error EmptyDrugName();
    error EmptyBatchNumber();
    error InvalidExpiryDate();
    error BatchDoesNotExist(uint256 batchId);
    error InvalidStateTransition(Status current, Status target);
    error NotCurrentHolder(address caller, address holder);
    error TerminalState(uint256 batchId, Status status);
    error RecipientMissingRole(address recipient, bytes32 role);

    // ──────────────────────────── Events ───────────────────────────

    event BatchCreated(
        uint256 indexed batchId,
        string  drugName,
        address indexed manufacturer,
        uint256 timestamp
    );

    event BatchTransitioned(
        uint256 indexed batchId,
        Status  indexed fromStatus,
        Status  indexed toStatus,
        address actor,
        uint256 timestamp
    );

    event TemperatureRecorded(
        uint256 indexed batchId,
        int16   temperatureCelsius,
        address indexed recorder,
        uint256 timestamp
    );

    // ──────────────────────────── State ────────────────────────────

    uint256 private _batchCount;
    mapping(uint256 => BatchInfo)         private _batches;
    mapping(uint256 => TemperatureLog[])  private _temperatureLogs;

    // ──────────────────────────── Constructor ──────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ──────────────────────────── Modifiers ────────────────────────

    modifier batchExists(uint256 batchId) {
        if (batchId == 0 || batchId > _batchCount)
            revert BatchDoesNotExist(batchId);
        _;
    }

    modifier onlyHolder(uint256 batchId) {
        address holder = _batches[batchId].currentHolder;
        if (msg.sender != holder)
            revert NotCurrentHolder(msg.sender, holder);
        _;
    }

    modifier notTerminal(uint256 batchId) {
        Status s = _batches[batchId].status;
        if (s == Status.Approved || s == Status.Rejected || s == Status.Recalled)
            revert TerminalState(batchId, s);
        _;
    }

    // ──────────────────────────── Batch Creation ──────────────────

    /// @notice Register a new pharmaceutical batch on-chain.
    /// @param drugName  Human-readable drug name (must be non-empty).
    /// @return batchId  The ID assigned to the new batch.
    function createBatch(
        string calldata drugName
    )
        external
        onlyRole(MANUFACTURER_ROLE)
        nonReentrant
        returns (uint256 batchId)
    {
        if (bytes(drugName).length == 0) revert EmptyDrugName();

        unchecked { _batchCount++; }
        batchId = _batchCount;

        _batches[batchId] = BatchInfo({
            batchId:       batchId,
            drugName:      drugName,
            manufacturer:  msg.sender,
            currentHolder: msg.sender,
            status:        Status.Created,
            createdAt:     block.timestamp,
            updatedAt:     block.timestamp
        });

        emit BatchCreated(batchId, drugName, msg.sender, block.timestamp);
    }

    // ──────────────────────────── State Transitions ───────────────

    /// @notice Ship a batch from manufacturer to a logistics provider.
    /// @param batchId   Batch to ship.
    /// @param logistics Address of the logistics provider (must hold LOGISTICS_ROLE).
    function shipBatch(uint256 batchId, address logistics)
        external
        onlyRole(MANUFACTURER_ROLE)
        batchExists(batchId)
        onlyHolder(batchId)
        nonReentrant
    {
        _requireStatus(batchId, Status.Created, Status.InTransit);
        if (!hasRole(LOGISTICS_ROLE, logistics))
            revert RecipientMissingRole(logistics, LOGISTICS_ROLE);

        _transition(batchId, Status.InTransit, logistics);
    }

    /// @notice Confirm delivery of a batch at its destination.
    /// @param batchId     Batch to mark as delivered.
    /// @param destination Address that will hold the batch after delivery.
    function deliverBatch(uint256 batchId, address destination)
        external
        onlyRole(LOGISTICS_ROLE)
        batchExists(batchId)
        onlyHolder(batchId)
        nonReentrant
    {
        _requireStatus(batchId, Status.InTransit, Status.Delivered);
        _transition(batchId, Status.Delivered, destination);
    }

    /// @notice Begin QA testing on a delivered batch.
    /// @param batchId Batch to start testing.
    function beginQATesting(uint256 batchId)
        external
        onlyRole(TESTER_ROLE)
        batchExists(batchId)
        nonReentrant
    {
        _requireStatus(batchId, Status.Delivered, Status.QATesting);
        _transition(batchId, Status.QATesting, msg.sender);
    }

    /// @notice Approve a batch after QA testing passes.
    /// @param batchId Batch to approve.
    function approveBatch(uint256 batchId)
        external
        onlyRole(TESTER_ROLE)
        batchExists(batchId)
        onlyHolder(batchId)
        nonReentrant
    {
        _requireStatus(batchId, Status.QATesting, Status.Approved);
        _transition(batchId, Status.Approved, msg.sender);
    }

    /// @notice Reject a batch after QA testing fails.
    /// @param batchId Batch to reject.
    function rejectBatch(uint256 batchId)
        external
        onlyRole(TESTER_ROLE)
        batchExists(batchId)
        onlyHolder(batchId)
        nonReentrant
    {
        _requireStatus(batchId, Status.QATesting, Status.Rejected);
        _transition(batchId, Status.Rejected, msg.sender);
    }

    /// @notice Recall a batch. Callable by regulators on any non-terminal batch.
    /// @param batchId Batch to recall.
    function recallBatch(uint256 batchId)
        external
        onlyRole(REGULATOR_ROLE)
        batchExists(batchId)
        notTerminal(batchId)
        nonReentrant
    {
        _transition(batchId, Status.Recalled, msg.sender);
    }

    // ──────────────────────────── Temperature Logging ─────────────

    /// @notice Record a temperature reading for a batch.
    /// @dev Only logistics (during transit) or testers (during QA) may log.
    /// @param batchId            Batch to log temperature for.
    /// @param temperatureCelsius Temperature in tenths of °C.
    function recordTemperature(uint256 batchId, int16 temperatureCelsius)
        external
        batchExists(batchId)
        nonReentrant
    {
        bool isLogistics = hasRole(LOGISTICS_ROLE, msg.sender);
        bool isTester    = hasRole(TESTER_ROLE, msg.sender);

        if (!isLogistics && !isTester)
            revert RecipientMissingRole(msg.sender, LOGISTICS_ROLE);

        _temperatureLogs[batchId].push(TemperatureLog({
            temperatureCelsius: temperatureCelsius,
            timestamp:          block.timestamp,
            recorder:           msg.sender
        }));

        emit TemperatureRecorded(batchId, temperatureCelsius, msg.sender, block.timestamp);
    }

    // ──────────────────────────── View Functions ──────────────────

    /// @notice Retrieve full batch information.
    /// @param batchId Batch to look up.
    /// @return info The BatchInfo struct.
    function getBatch(uint256 batchId)
        external
        view
        batchExists(batchId)
        returns (BatchInfo memory info)
    {
        info = _batches[batchId];
    }

    /// @notice Get all temperature logs for a batch.
    /// @param batchId Batch to look up.
    /// @return logs Array of TemperatureLog structs.
    function getTemperatureLogs(uint256 batchId)
        external
        view
        batchExists(batchId)
        returns (TemperatureLog[] memory logs)
    {
        logs = _temperatureLogs[batchId];
    }

    /// @notice Total number of batches registered.
    /// @return count The current batch count.
    function batchCount() external view returns (uint256 count) {
        count = _batchCount;
    }

    // ──────────────────────────── Internal Helpers ────────────────

    /// @dev Enforce that the batch is in `required` status before moving to `target`.
    function _requireStatus(uint256 batchId, Status required, Status target) private view {
        Status current = _batches[batchId].status;
        if (current != required)
            revert InvalidStateTransition(current, target);
    }

    /// @dev Apply a state transition and emit the event.
    function _transition(uint256 batchId, Status newStatus, address newHolder) private {
        Status prev = _batches[batchId].status;

        _batches[batchId].status        = newStatus;
        _batches[batchId].currentHolder = newHolder;
        _batches[batchId].updatedAt     = block.timestamp;

        emit BatchTransitioned(batchId, prev, newStatus, msg.sender, block.timestamp);
    }
}
