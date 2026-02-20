import { keccak256, toUtf8Bytes } from "ethers";

export const PHARMA_CHAIN_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "";

export const PHARMA_CHAIN_ABI = [
  // Role constants
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MANUFACTURER_ROLE() view returns (bytes32)",
  "function LOGISTICS_ROLE() view returns (bytes32)",
  "function TESTER_ROLE() view returns (bytes32)",
  "function REGULATOR_ROLE() view returns (bytes32)",

  // AccessControl
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",

  // Batch lifecycle
  "function createBatch(string drugName) returns (uint256 batchId)",
  "function shipBatch(uint256 batchId, address logistics)",
  "function deliverBatch(uint256 batchId, address destination)",
  "function beginQATesting(uint256 batchId)",
  "function approveBatch(uint256 batchId)",
  "function rejectBatch(uint256 batchId)",
  "function recallBatch(uint256 batchId)",
  "function recordTemperature(uint256 batchId, int16 temperatureCelsius)",

  // View
  "function getBatch(uint256 batchId) view returns (tuple(uint256 batchId, string drugName, address manufacturer, address currentHolder, uint8 status, uint256 createdAt, uint256 updatedAt) info)",
  "function getTemperatureLogs(uint256 batchId) view returns (tuple(int16 temperatureCelsius, uint256 timestamp, address recorder)[] logs)",
  "function batchCount() view returns (uint256 count)",

  // Events
  "event BatchCreated(uint256 indexed batchId, string drugName, address indexed manufacturer, uint256 timestamp)",
  "event BatchTransitioned(uint256 indexed batchId, uint8 indexed fromStatus, uint8 indexed toStatus, address actor, uint256 timestamp)",
  "event TemperatureRecorded(uint256 indexed batchId, int16 temperatureCelsius, address indexed recorder, uint256 timestamp)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
] as const;

// ── Status enum ──────────────────────────────────────────────────────────────

export const Status = {
  Created: 0,
  InTransit: 1,
  Delivered: 2,
  QATesting: 3,
  Approved: 4,
  Rejected: 5,
  Recalled: 6,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  [Status.Created]: "Created",
  [Status.InTransit]: "In Transit",
  [Status.Delivered]: "Delivered",
  [Status.QATesting]: "QA Testing",
  [Status.Approved]: "Approved",
  [Status.Rejected]: "Rejected",
  [Status.Recalled]: "Recalled",
};

export const STATUS_COLORS: Record<number, string> = {
  [Status.Created]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  [Status.InTransit]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  [Status.Delivered]: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  [Status.QATesting]: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  [Status.Approved]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  [Status.Rejected]: "bg-red-500/20 text-red-400 border-red-500/30",
  [Status.Recalled]: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export const TIMELINE_DOT: Record<number, string> = {
  [Status.Created]: "bg-blue-500",
  [Status.InTransit]: "bg-yellow-500",
  [Status.Delivered]: "bg-purple-500",
  [Status.QATesting]: "bg-orange-500",
  [Status.Approved]: "bg-emerald-500",
  [Status.Rejected]: "bg-red-500",
  [Status.Recalled]: "bg-rose-500",
};

// ── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  DEFAULT_ADMIN:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  MANUFACTURER: keccak256(toUtf8Bytes("MANUFACTURER_ROLE")),
  LOGISTICS: keccak256(toUtf8Bytes("LOGISTICS_ROLE")),
  TESTER: keccak256(toUtf8Bytes("TESTER_ROLE")),
  REGULATOR: keccak256(toUtf8Bytes("REGULATOR_ROLE")),
} as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.DEFAULT_ADMIN]: "Admin",
  [ROLES.MANUFACTURER]: "Manufacturer",
  [ROLES.LOGISTICS]: "Logistics",
  [ROLES.TESTER]: "QA Tester",
  [ROLES.REGULATOR]: "Regulator",
};

export const GRANTABLE_ROLES = [
  { value: ROLES.MANUFACTURER, label: "Manufacturer" },
  { value: ROLES.LOGISTICS, label: "Logistics" },
  { value: ROLES.TESTER, label: "QA Tester" },
  { value: ROLES.REGULATOR, label: "Regulator" },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface BatchInfo {
  batchId: bigint;
  drugName: string;
  manufacturer: string;
  currentHolder: string;
  status: number;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TemperatureLog {
  temperatureCelsius: number;
  timestamp: bigint;
  recorder: string;
}

export interface UserRoles {
  isAdmin: boolean;
  isManufacturer: boolean;
  isLogistics: boolean;
  isTester: boolean;
  isRegulator: boolean;
}

export interface BatchEvent {
  type: "created" | "transitioned";
  batchId: number;
  status: number;
  fromStatus?: number;
  actor: string;
  drugName?: string;
  timestamp: bigint;
  blockNumber: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseContractError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (m.includes("EmptyDrugName")) return "Drug name cannot be empty";
    if (m.includes("BatchDoesNotExist")) return "Batch does not exist";
    if (m.includes("InvalidStateTransition"))
      return "Invalid state transition for this batch";
    if (m.includes("NotCurrentHolder"))
      return "You are not the current holder of this batch";
    if (m.includes("TerminalState"))
      return "Batch is in a terminal state and cannot be modified";
    if (m.includes("RecipientMissingRole"))
      return "Recipient does not have the required role";
    if (m.includes("AccessControlUnauthorizedAccount"))
      return "You do not have the required role for this action";
    if (m.includes("user rejected") || m.includes("ACTION_REJECTED"))
      return "Transaction rejected by user";
    return m.length > 200 ? m.slice(0, 200) + "..." : m;
  }
  return "Transaction failed";
}

export function truncAddr(a: string): string {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

export function fmtTime(ts: bigint | number): string {
  return new Date(Number(ts) * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
