import { useState, useCallback, useEffect } from "react";
import {
  Contract,
  BrowserProvider,
  JsonRpcSigner,
  ContractTransactionResponse,
} from "ethers";
import {
  PHARMA_CHAIN_ABI,
  PHARMA_CHAIN_ADDRESS,
  ROLES,
  type BatchInfo,
  type TemperatureLog,
  type UserRoles,
  type BatchEvent,
} from "@/lib/contract";

const NO_ROLES: UserRoles = {
  isAdmin: false,
  isManufacturer: false,
  isLogistics: false,
  isTester: false,
  isRegulator: false,
};

export function usePharmaChain(
  signer: JsonRpcSigner | null,
  provider: BrowserProvider | null,
  address: string
) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [roles, setRoles] = useState<UserRoles>(NO_ROLES);
  const [rolesLoading, setRolesLoading] = useState(false);

  // ── Build contract instance ───────────────────────────────────────────────

  useEffect(() => {
    if (!PHARMA_CHAIN_ADDRESS) {
      setContract(null);
      return;
    }
    if (signer) {
      setContract(
        new Contract(PHARMA_CHAIN_ADDRESS, PHARMA_CHAIN_ABI, signer)
      );
    } else if (provider) {
      setContract(
        new Contract(PHARMA_CHAIN_ADDRESS, PHARMA_CHAIN_ABI, provider)
      );
    } else {
      setContract(null);
    }
  }, [signer, provider]);

  // ── Fetch user roles ──────────────────────────────────────────────────────

  const refreshRoles = useCallback(async () => {
    if (!contract || !address) {
      setRoles(NO_ROLES);
      return;
    }
    setRolesLoading(true);
    try {
      const [isAdmin, isManufacturer, isLogistics, isTester, isRegulator] =
        await Promise.all([
          contract.hasRole(ROLES.DEFAULT_ADMIN, address),
          contract.hasRole(ROLES.MANUFACTURER, address),
          contract.hasRole(ROLES.LOGISTICS, address),
          contract.hasRole(ROLES.TESTER, address),
          contract.hasRole(ROLES.REGULATOR, address),
        ]);
      setRoles({ isAdmin, isManufacturer, isLogistics, isTester, isRegulator });
    } catch {
      setRoles(NO_ROLES);
    } finally {
      setRolesLoading(false);
    }
  }, [contract, address]);

  useEffect(() => {
    refreshRoles();
  }, [refreshRoles]);

  // ── TX wrapper ────────────────────────────────────────────────────────────

  const callTx = useCallback(
    async (fn: (c: Contract) => Promise<ContractTransactionResponse>) => {
      if (!contract) throw new Error("Wallet not connected");
      setTxPending(true);
      try {
        const tx = await fn(contract);
        const receipt = await tx.wait();
        return receipt!;
      } finally {
        setTxPending(false);
      }
    },
    [contract]
  );

  // ── Write methods ─────────────────────────────────────────────────────────

  const createBatch = useCallback(
    (drugName: string) => callTx((c) => c.createBatch(drugName)),
    [callTx]
  );

  const shipBatch = useCallback(
    (batchId: number, logistics: string) =>
      callTx((c) => c.shipBatch(batchId, logistics)),
    [callTx]
  );

  const deliverBatch = useCallback(
    (batchId: number, destination: string) =>
      callTx((c) => c.deliverBatch(batchId, destination)),
    [callTx]
  );

  const beginQATesting = useCallback(
    (batchId: number) => callTx((c) => c.beginQATesting(batchId)),
    [callTx]
  );

  const approveBatch = useCallback(
    (batchId: number) => callTx((c) => c.approveBatch(batchId)),
    [callTx]
  );

  const rejectBatch = useCallback(
    (batchId: number) => callTx((c) => c.rejectBatch(batchId)),
    [callTx]
  );

  const recallBatch = useCallback(
    (batchId: number) => callTx((c) => c.recallBatch(batchId)),
    [callTx]
  );

  const recordTemperature = useCallback(
    (batchId: number, temp: number) =>
      callTx((c) => c.recordTemperature(batchId, temp)),
    [callTx]
  );

  const grantRole = useCallback(
    (role: string, account: string) =>
      callTx((c) => c.grantRole(role, account)),
    [callTx]
  );

  const revokeRole = useCallback(
    (role: string, account: string) =>
      callTx((c) => c.revokeRole(role, account)),
    [callTx]
  );

  // ── Read methods ──────────────────────────────────────────────────────────

  const getBatch = useCallback(
    async (batchId: number): Promise<BatchInfo> => {
      if (!contract) throw new Error("No contract connection");
      const r = await contract.getBatch(batchId);
      return {
        batchId: r.batchId,
        drugName: r.drugName,
        manufacturer: r.manufacturer,
        currentHolder: r.currentHolder,
        status: Number(r.status),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    },
    [contract]
  );

  const getTemperatureLogs = useCallback(
    async (batchId: number): Promise<TemperatureLog[]> => {
      if (!contract) throw new Error("No contract connection");
      const logs = await contract.getTemperatureLogs(batchId);
      return logs.map((l: any) => ({
        temperatureCelsius: Number(l.temperatureCelsius),
        timestamp: l.timestamp,
        recorder: l.recorder,
      }));
    },
    [contract]
  );

  const getBatchCount = useCallback(async (): Promise<number> => {
    if (!contract) throw new Error("No contract connection");
    return Number(await contract.batchCount());
  }, [contract]);

  const getBatchHistory = useCallback(
    async (batchId: number): Promise<BatchEvent[]> => {
      if (!contract) throw new Error("No contract connection");

      const events: BatchEvent[] = [];

      const cFilter = contract.filters.BatchCreated(batchId);
      for (const ev of await contract.queryFilter(cFilter)) {
        const l = ev as any;
        events.push({
          type: "created",
          batchId: Number(l.args.batchId),
          status: 0,
          actor: l.args.manufacturer,
          drugName: l.args.drugName,
          timestamp: l.args.timestamp,
          blockNumber: l.blockNumber,
        });
      }

      const tFilter = contract.filters.BatchTransitioned(batchId);
      for (const ev of await contract.queryFilter(tFilter)) {
        const l = ev as any;
        events.push({
          type: "transitioned",
          batchId: Number(l.args.batchId),
          status: Number(l.args.toStatus),
          fromStatus: Number(l.args.fromStatus),
          actor: l.args.actor,
          timestamp: l.args.timestamp,
          blockNumber: l.blockNumber,
        });
      }

      events.sort((a, b) => a.blockNumber - b.blockNumber);
      return events;
    },
    [contract]
  );

  return {
    contract,
    txPending,
    roles,
    rolesLoading,
    refreshRoles,
    createBatch,
    shipBatch,
    deliverBatch,
    beginQATesting,
    approveBatch,
    rejectBatch,
    recallBatch,
    recordTemperature,
    grantRole,
    revokeRole,
    getBatch,
    getTemperatureLogs,
    getBatchCount,
    getBatchHistory,
  };
}
