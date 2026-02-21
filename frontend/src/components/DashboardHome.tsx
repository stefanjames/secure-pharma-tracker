import { useState, useEffect, useCallback } from "react";
import { Contract } from "ethers";
import {
  Status,
  STATUS_LABELS,
  ROLE_LABELS,
  ROLES,
  truncAddr,
  type UserRoles,
  type BatchInfo,
} from "@/lib/contract";
import {
  Package,
  TrendingUp,
  Clock,
  ClipboardCheck,
  Plus,
  BarChart3,
  FlaskConical,
  ChevronRight,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalBatches: number;
  activeBatches: number;
  pendingTests: number;
  qualityTests: number;
}

interface RecentEvent {
  id: string;
  type: "created" | "transitioned";
  batchId: number;
  description: string;
  status: number;
  actor: string;
  timestamp: bigint;
}

interface Props {
  roles: UserRoles;
  address: string;
  contract: Contract | null;
  getBatch: (id: number) => Promise<BatchInfo>;
  getBatchCount: () => Promise<number>;
  onNavigate: (view: "create" | "search" | "testing") => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRoleName(roles: UserRoles): string {
  if (roles.isAdmin) return ROLE_LABELS[ROLES.DEFAULT_ADMIN];
  if (roles.isManufacturer) return ROLE_LABELS[ROLES.MANUFACTURER];
  if (roles.isLogistics) return ROLE_LABELS[ROLES.LOGISTICS];
  if (roles.isTester) return ROLE_LABELS[ROLES.TESTER];
  if (roles.isRegulator) return ROLE_LABELS[ROLES.REGULATOR];
  return "No Role";
}

const STATUS_BADGE: Record<number, string> = {
  [Status.Created]: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  [Status.InTransit]: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  [Status.Delivered]: "border-purple-500/20 bg-purple-500/10 text-purple-400",
  [Status.QATesting]: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  [Status.Approved]: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  [Status.Rejected]: "border-red-500/20 bg-red-500/10 text-red-400",
  [Status.Recalled]: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

const GETTING_STARTED_STEPS = [
  { id: "connect", label: "Connect your wallet" },
  { id: "role", label: "Get a role assigned" },
  { id: "create", label: "Create your first batch" },
  { id: "ship", label: "Ship a batch" },
  { id: "approve", label: "Complete a quality test" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function DashboardHome({
  roles,
  address: _address,
  contract,
  getBatch,
  getBatchCount,
  onNavigate,
}: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalBatches: 0,
    activeBatches: 0,
    pendingTests: 0,
    qualityTests: 0,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const hasAnyRole =
    roles.isAdmin ||
    roles.isManufacturer ||
    roles.isLogistics ||
    roles.isTester ||
    roles.isRegulator;

  // ── Fetch stats ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const count = await getBatchCount();
      let active = 0;
      let pendingTests = 0;
      let qualityTests = 0;

      for (let i = 1; i <= count; i++) {
        try {
          const batch = await getBatch(i);
          const s = batch.status;
          if (
            s === Status.Created ||
            s === Status.InTransit ||
            s === Status.Delivered ||
            s === Status.QATesting
          ) {
            active++;
          }
          if (s === Status.Delivered) pendingTests++;
          if (
            s === Status.QATesting ||
            s === Status.Approved ||
            s === Status.Rejected
          ) {
            qualityTests++;
          }
        } catch {
          // skip
        }
      }

      setStats({ totalBatches: count, activeBatches: active, pendingTests, qualityTests });

      const steps = new Set<string>();
      steps.add("connect");
      if (hasAnyRole) steps.add("role");
      if (count > 0) steps.add("create");

      try {
        const block = await contract.runner?.provider?.getBlockNumber();
        if (block) {
          const from = Math.max(0, block - 10000);
          const transitions = await contract.queryFilter(
            contract.filters.BatchTransitioned(),
            from
          );
          for (const ev of transitions) {
            const l = ev as any;
            const toStatus = Number(l.args.toStatus);
            if (toStatus === Status.InTransit) steps.add("ship");
            if (toStatus === Status.Approved || toStatus === Status.Rejected)
              steps.add("approve");
          }
        }
      } catch {
        // non-critical
      }

      setCompletedSteps(steps);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [contract, getBatch, getBatchCount, hasAnyRole]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Fetch recent events ──────────────────────────────────────────────────

  useEffect(() => {
    if (!contract) return;
    let cancelled = false;

    const load = async () => {
      try {
        const block = await contract.runner?.provider?.getBlockNumber();
        if (!block || cancelled) return;
        const from = Math.max(0, block - 5000);

        const [created, transitioned] = await Promise.all([
          contract.queryFilter(contract.filters.BatchCreated(), from),
          contract.queryFilter(contract.filters.BatchTransitioned(), from),
        ]);

        if (cancelled) return;

        const feed: RecentEvent[] = [];

        for (const ev of created) {
          const l = ev as any;
          feed.push({
            id: `c-${l.transactionHash}-${l.index}`,
            type: "created",
            batchId: Number(l.args.batchId),
            description: `Batch created: ${l.args.drugName}`,
            status: 0,
            actor: l.args.manufacturer,
            timestamp: l.args.timestamp,
          });
        }

        for (const ev of transitioned) {
          const l = ev as any;
          const to = Number(l.args.toStatus);
          feed.push({
            id: `t-${l.transactionHash}-${l.index}`,
            type: "transitioned",
            batchId: Number(l.args.batchId),
            description: `${STATUS_LABELS[Number(l.args.fromStatus)]} → ${STATUS_LABELS[to]}`,
            status: to,
            actor: l.args.actor,
            timestamp: l.args.timestamp,
          });
        }

        feed.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        setRecentEvents(feed.slice(0, 10));
      } catch {
        // non-critical
      }
    };

    load();

    const onCreated = (
      batchId: bigint,
      drugName: string,
      manufacturer: string,
      timestamp: bigint
    ) => {
      setRecentEvents((prev) =>
        [
          {
            id: `live-c-${Date.now()}`,
            type: "created" as const,
            batchId: Number(batchId),
            description: `Batch created: ${drugName}`,
            status: 0,
            actor: manufacturer,
            timestamp,
          },
          ...prev,
        ].slice(0, 10)
      );
      fetchStats();
    };

    const onTransitioned = (
      batchId: bigint,
      fromStatus: bigint,
      toStatus: bigint,
      actor: string,
      timestamp: bigint
    ) => {
      const to = Number(toStatus);
      setRecentEvents((prev) =>
        [
          {
            id: `live-t-${Date.now()}`,
            type: "transitioned" as const,
            batchId: Number(batchId),
            description: `${STATUS_LABELS[Number(fromStatus)]} → ${STATUS_LABELS[to]}`,
            status: to,
            actor,
            timestamp,
          },
          ...prev,
        ].slice(0, 10)
      );
      fetchStats();
    };

    contract.on("BatchCreated", onCreated);
    contract.on("BatchTransitioned", onTransitioned);

    return () => {
      cancelled = true;
      contract.off("BatchCreated", onCreated);
      contract.off("BatchTransitioned", onTransitioned);
    };
  }, [contract, fetchStats]);

  // ── Date ─────────────────────────────────────────────────────────────────

  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // ── Data ─────────────────────────────────────────────────────────────────

  const statCards = [
    {
      label: "Total Batches",
      value: stats.totalBatches,
      sub: "All time",
      icon: Package,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Active Batches",
      value: stats.activeBatches,
      sub: "In supply chain",
      icon: TrendingUp,
      gradient: "from-teal-500/20 to-teal-500/5",
      iconColor: "text-teal-400 bg-teal-500/10",
    },
    {
      label: "Pending Tests",
      value: stats.pendingTests,
      sub: "Awaiting QA review",
      icon: Clock,
      gradient: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400 bg-amber-500/10",
    },
    {
      label: "Quality Tests",
      value: stats.qualityTests,
      sub: stats.totalBatches > 0
        ? `${Math.round((stats.qualityTests / stats.totalBatches) * 100)}% tested`
        : "No batches yet",
      icon: ClipboardCheck,
      gradient: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400 bg-purple-500/10",
    },
  ];

  const quickActions = [
    {
      id: "create" as const,
      label: "Create New Batch",
      description: "Add a pharmaceutical batch to the supply chain",
      icon: Plus,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconColor: "text-emerald-400 bg-emerald-500/10",
      cta: "Get Started",
      visible: roles.isManufacturer || roles.isAdmin,
    },
    {
      id: "search" as const,
      label: "View All Batches",
      description: "Browse and manage existing batches",
      icon: BarChart3,
      gradient: "from-gray-500/10 to-gray-500/5",
      border: "border-gray-800/60 hover:border-gray-700",
      iconColor: "text-gray-400 bg-gray-800",
      cta: "View",
      visible: true,
    },
    {
      id: "testing" as const,
      label: "Quality Testing",
      description: "Add or review quality test results",
      icon: FlaskConical,
      gradient: "from-gray-500/10 to-gray-500/5",
      border: "border-gray-800/60 hover:border-gray-700",
      iconColor: "text-gray-400 bg-gray-800",
      cta: "View",
      visible: roles.isTester || roles.isRegulator || roles.isAdmin,
    },
  ];

  const visibleActions = quickActions.filter((a) => a.visible);
  const completedCount = completedSteps.size;

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="text-gray-400 mt-1">
            Managing pharmaceutical supply chain as{" "}
            <span className="font-medium text-emerald-400">
              {getRoleName(roles)}
            </span>
          </p>
        </div>
        <div className="text-right text-sm hidden sm:block">
          <p className="text-gray-500">Today</p>
          <p className="font-medium text-gray-300">{dateStr}</p>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="group relative">
            {/* Hover glow */}
            <div
              className={`absolute -inset-0.5 rounded-xl bg-gradient-to-b ${s.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity`}
            />
            <div className="relative rounded-xl border border-gray-800/60 bg-gray-900/50 backdrop-blur-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold mt-1 text-white">
                    {loading ? "-" : s.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${s.iconColor}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions + Recent Activity ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Quick Actions + Getting Started */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {visibleActions.map((action) => (
                <div
                  key={action.id}
                  className="group relative cursor-pointer"
                  onClick={() => onNavigate(action.id)}
                >
                  <div
                    className={`absolute -inset-0.5 rounded-xl bg-gradient-to-b ${action.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity`}
                  />
                  <div
                    className={`relative rounded-xl border ${action.border} bg-gray-900/50 backdrop-blur-sm p-5 h-full transition-colors`}
                  >
                    <div className={`rounded-xl p-3 w-fit mb-3 ${action.iconColor}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-sm text-white">
                      {action.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-3">
                      {action.cta}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 backdrop-blur-sm p-5">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setGettingStartedOpen(!gettingStartedOpen)}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-sm text-white">
                    Getting Started
                  </h4>
                  <p className="text-xs text-gray-500">
                    {completedCount} of {GETTING_STARTED_STEPS.length} completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-gray-800 rounded-full hidden sm:block">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${(completedCount / GETTING_STARTED_STEPS.length) * 100}%`,
                    }}
                  />
                </div>
                {gettingStartedOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>
            {gettingStartedOpen && (
              <div className="mt-4 space-y-2.5 pl-1">
                {GETTING_STARTED_STEPS.map((step) => {
                  const done = completedSteps.has(step.id);
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-600 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${done ? "text-gray-500 line-through" : "text-gray-300"}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <button
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 border border-gray-800 rounded-lg px-2.5 py-1 transition-colors"
              onClick={() => onNavigate("search")}
            >
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/50 backdrop-blur-sm p-4">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No activity yet. Events will appear here as batches are created
                and updated.
              </p>
            ) : (
              <div className="space-y-1 max-h-[32rem] overflow-y-auto scrollbar-thin">
                {recentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-800/30 transition-colors"
                  >
                    <div
                      className={`rounded-lg p-1.5 mt-0.5 shrink-0 ${
                        ev.type === "created"
                          ? "bg-emerald-500/10"
                          : "bg-gray-800"
                      }`}
                    >
                      {ev.type === "created" ? (
                        <Package className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">
                        {ev.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500">
                          Batch #{ev.batchId}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {truncAddr(ev.actor)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${STATUS_BADGE[ev.status]}`}
                    >
                      {STATUS_LABELS[ev.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
