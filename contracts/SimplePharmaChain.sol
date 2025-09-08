// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimplePharmaChain {
    address public owner;
    
    enum BatchStatus {
        MANUFACTURED,
        IN_TRANSIT,
        DELIVERED,
        RECALLED
    }

    struct Batch {
        string batchId;
        string productName;
        string manufacturer;
        string manufacturerLicenseId;
        string lotNumber;
        uint256 quantity;
        string manufacturingDate;
        string expiryDate;
        string location;
        BatchStatus status;
        bool temperatureSensitive;
        string storageConditions;
        address creator;
        uint256 timestamp;
    }

    struct QualityTest {
        string batchId;
        string testType;
        string testResult;
        string testerId;
        address creator;
        uint256 timestamp;
    }

    mapping(string => Batch) public batches;
    mapping(string => bool) public batchExists;
    mapping(string => QualityTest[]) public qualityTests;
    
    string[] public batchIds;
    
    event BatchCreated(
        string indexed batchId,
        string productName,
        string manufacturer,
        string manufacturerLicenseId,
        string lotNumber,
        address indexed creator
    );

    event QualityTestAdded(
        string indexed batchId,
        string testType,
        string testResult,
        string testerId
    );

    event BatchStatusUpdated(
        string indexed batchId,
        BatchStatus newStatus
    );

    event BatchRecalled(
        string indexed batchId,
        string reason
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }

    function createBatch(
        string calldata _batchId,
        string calldata _productName,
        string calldata _manufacturer,
        string calldata _manufacturerLicenseId,
        string calldata _lotNumber,
        uint256 _quantity,
        string calldata _manufacturingDate,
        string calldata _expiryDate,
        string calldata _location,
        bool _temperatureSensitive,
        string calldata _storageConditions
    ) external {
        require(!batchExists[_batchId], "Batch already exists");
        require(bytes(_batchId).length > 0, "Batch ID required");
        require(bytes(_productName).length > 0, "Product name required");
        require(_quantity > 0, "Quantity must be greater than 0");

        batches[_batchId] = Batch({
            batchId: _batchId,
            productName: _productName,
            manufacturer: _manufacturer,
            manufacturerLicenseId: _manufacturerLicenseId,
            lotNumber: _lotNumber,
            quantity: _quantity,
            manufacturingDate: _manufacturingDate,
            expiryDate: _expiryDate,
            location: _location,
            status: BatchStatus.MANUFACTURED,
            temperatureSensitive: _temperatureSensitive,
            storageConditions: _storageConditions,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        batchExists[_batchId] = true;
        batchIds.push(_batchId);

        emit BatchCreated(_batchId, _productName, _manufacturer, _manufacturerLicenseId, _lotNumber, msg.sender);
    }

    function addQualityTest(
        string memory _batchId,
        string memory _testType,
        string memory _testResult,
        string memory _testerId
    ) public {
        require(batchExists[_batchId], "Batch does not exist");
        require(bytes(_testType).length > 0, "Test type required");
        require(bytes(_testResult).length > 0, "Test result required");
        require(bytes(_testerId).length > 0, "Tester ID required");

        QualityTest memory newTest = QualityTest({
            batchId: _batchId,
            testType: _testType,
            testResult: _testResult,
            testerId: _testerId,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        qualityTests[_batchId].push(newTest);

        emit QualityTestAdded(_batchId, _testType, _testResult, _testerId);
    }

    function updateBatchStatus(
        string memory _batchId,
        uint256 _newStatus
    ) public {
        require(batchExists[_batchId], "Batch does not exist");
        require(_newStatus <= uint256(BatchStatus.RECALLED), "Invalid status");

        batches[_batchId].status = BatchStatus(_newStatus);

        emit BatchStatusUpdated(_batchId, BatchStatus(_newStatus));
    }

    function recallBatch(string memory _batchId, string memory reason) public {
        require(batchExists[_batchId], "Batch does not exist");

        batches[_batchId].status = BatchStatus.RECALLED;

        emit BatchRecalled(_batchId, reason);
    }

    function getBatch(string memory _batchId) public view returns (Batch memory) {
        require(batchExists[_batchId], "Batch does not exist");
        return batches[_batchId];
    }

    function getQualityTests(string memory _batchId) public view returns (QualityTest[] memory) {
        require(batchExists[_batchId], "Batch does not exist");
        return qualityTests[_batchId];
    }

    function getAllBatchIds() public view returns (string[] memory) {
        return batchIds;
    }

    function getBatchCount() public view returns (uint256) {
        return batchIds.length;
    }
}