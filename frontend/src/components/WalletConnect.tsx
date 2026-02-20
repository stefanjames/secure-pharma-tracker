import { Wallet, LogOut } from "lucide-react";

interface WalletConnectProps {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({
  address,
  isConnected,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-400">{error}</span>}
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-sm font-mono text-gray-300">
            {truncated}
          </span>
          <button
            onClick={onDisconnect}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-lg transition-colors"
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
