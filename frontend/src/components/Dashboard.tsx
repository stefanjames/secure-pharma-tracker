import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePharmaChain } from "@/hooks/usePharmaChain";
import { WalletConnect } from "@/components/WalletConnect";
import { DashboardHome } from "@/components/DashboardHome";
import { CreateBatch } from "@/components/CreateBatch";
import { BatchSearch } from "@/components/BatchSearch";
import { EventFeed } from "@/components/EventFeed";
import { RoleManager } from "@/components/RoleManager";
import { LandingPage } from "@/components/landing/LandingPage";
import { ROLE_LABELS, ROLES, PHARMA_CHAIN_ADDRESS } from "@/lib/contract";
import {
  Pill,
  Loader2,
  AlertCircle,
  Home,
  Search,
  PlusCircle,
  Shield,
  Activity,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type View = "home" | "search" | "create" | "testing" | "roles" | "events";

export function Dashboard() {
  const { theme, toggle: toggleTheme } = useTheme();
  const wallet = useWallet();
  const pharma = usePharmaChain(
    wallet.signer,
    wallet.provider,
    wallet.address
  );
  const [currentView, setCurrentView] = useState<View>("home");

  const roleBadges: { key: string; label: string }[] = [];
  if (pharma.roles.isAdmin)
    roleBadges.push({ key: "admin", label: ROLE_LABELS[ROLES.DEFAULT_ADMIN] });
  if (pharma.roles.isManufacturer)
    roleBadges.push({ key: "mfr", label: ROLE_LABELS[ROLES.MANUFACTURER] });
  if (pharma.roles.isLogistics)
    roleBadges.push({ key: "log", label: ROLE_LABELS[ROLES.LOGISTICS] });
  if (pharma.roles.isTester)
    roleBadges.push({ key: "tst", label: ROLE_LABELS[ROLES.TESTER] });
  if (pharma.roles.isRegulator)
    roleBadges.push({ key: "reg", label: ROLE_LABELS[ROLES.REGULATOR] });

  const hasAnyRole = roleBadges.length > 0;

  const handleNavigate = (view: "create" | "search" | "testing") => {
    if (view === "testing") {
      setCurrentView("search");
    } else {
      setCurrentView(view);
    }
  };

  const navItems = [
    { id: "home" as View, label: "Home", icon: Home, visible: true },
    { id: "search" as View, label: "Batches", icon: Search, visible: true },
    {
      id: "create" as View,
      label: "Create",
      icon: PlusCircle,
      visible: pharma.roles.isManufacturer || pharma.roles.isAdmin,
    },
    {
      id: "events" as View,
      label: "Events",
      icon: Activity,
      visible: true,
    },
    {
      id: "roles" as View,
      label: "Roles",
      icon: Shield,
      visible: pharma.roles.isAdmin,
    },
  ];

  const visibleNavItems = navItems.filter((n) => n.visible);

  // ── Landing page (not connected) ──────────────────────────────────────
  if (!wallet.isConnected) {
    return (
      <LandingPage
        onConnect={wallet.connect}
        isConnecting={wallet.isConnecting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f1f3] text-gray-900 dark:bg-gray-950 dark:text-gray-100 animate-fade-in">
      {/* ── Header — matches landing nav ──────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md shadow-sm dark:border-gray-800/50 dark:bg-gray-950/80 dark:shadow-none">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-400" />
            <h1 className="font-bold text-lg">PharmaChain</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badges — landing page pill style */}
            {!pharma.rolesLoading && roleBadges.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                {roleBadges.map((r) => (
                  <span
                    key={r.key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-medium"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            )}
            {pharma.rolesLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 dark:hover:text-gray-200 dark:hover:bg-gray-800/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <WalletConnect
              address={wallet.address}
              isConnected={wallet.isConnected}
              isConnecting={wallet.isConnecting}
              error={wallet.error}
              onConnect={wallet.connect}
              onDisconnect={wallet.disconnect}
            />
          </div>
        </div>
      </header>

      {!PHARMA_CHAIN_ADDRESS ? (
        /* ── No contract ──────────────────────────────────────────────── */
        <main className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold">Contract Not Configured</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Set{" "}
              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                VITE_CONTRACT_ADDRESS
              </code>{" "}
              in your{" "}
              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                frontend/.env
              </code>{" "}
              file and restart the dev server.
            </p>
          </div>
        </main>
      ) : (
        /* ── Connected app ────────────────────────────────────────────── */
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
          {/* ── Navigation tabs ───────────────────────────────────────── */}
          <nav className="border-b border-gray-200 bg-white/50 dark:border-gray-800/50 dark:bg-gray-950/50">
            <div className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-thin px-6 py-1">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                    currentView === item.id
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Main content area ─────────────────────────────────────── */}
          <main className="max-w-6xl mx-auto w-full px-6 py-6 flex-1">
            {/* No-role warning */}
            {!hasAnyRole && !pharma.rolesLoading && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400 mb-6">
                Your wallet has no roles assigned. Ask an admin to grant you a
                role to interact with batches.
              </div>
            )}

            {/* Mobile role badges */}
            {roleBadges.length > 0 && (
              <div className="flex md:hidden items-center gap-1.5 flex-wrap mb-4">
                {roleBadges.map((r) => (
                  <span
                    key={r.key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-medium"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            )}

            {/* ── Views ─────────────────────────────────────────────── */}
            {currentView === "home" && (
              <DashboardHome
                roles={pharma.roles}
                address={wallet.address}
                contract={pharma.contract}
                getBatch={pharma.getBatch}
                getBatchCount={pharma.getBatchCount}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === "search" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold">Batch Lookup</h2>
                </div>
                <div className="grid gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-3">
                    <BatchSearch
                      roles={pharma.roles}
                      address={wallet.address}
                      txPending={pharma.txPending}
                      onGetBatch={pharma.getBatch}
                      onGetHistory={pharma.getBatchHistory}
                      onGetTempLogs={pharma.getTemperatureLogs}
                      onShipBatch={pharma.shipBatch}
                      onDeliverBatch={pharma.deliverBatch}
                      onBeginQA={pharma.beginQATesting}
                      onApprove={pharma.approveBatch}
                      onReject={pharma.rejectBatch}
                      onRecall={pharma.recallBatch}
                      onRecordTemp={pharma.recordTemperature}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <EventFeed contract={pharma.contract} />
                  </div>
                </div>
              </div>
            )}

            {currentView === "create" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold">Create New Batch</h2>
                </div>
                <div className="max-w-lg">
                  <CreateBatch
                    onCreateBatch={pharma.createBatch}
                    txPending={pharma.txPending}
                  />
                </div>
              </div>
            )}

            {currentView === "events" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold">Event Feed</h2>
                </div>
                <div className="max-w-2xl">
                  <EventFeed contract={pharma.contract} />
                </div>
              </div>
            )}

            {currentView === "roles" && pharma.roles.isAdmin && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentView("home")}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold">Role Management</h2>
                </div>
                <div className="max-w-lg">
                  <RoleManager
                    txPending={pharma.txPending}
                    onGrantRole={pharma.grantRole}
                    onRevokeRole={pharma.revokeRole}
                    onRolesChanged={pharma.refreshRoles}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
