import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRANTABLE_ROLES, parseContractError } from "@/lib/contract";
import { addToast } from "@/hooks/useToast";
import { Shield, Loader2, UserPlus, UserMinus } from "lucide-react";

interface Props {
  txPending: boolean;
  onGrantRole: (role: string, address: string) => Promise<unknown>;
  onRevokeRole: (role: string, address: string) => Promise<unknown>;
  onRolesChanged: () => void;
}

export function RoleManager({
  txPending,
  onGrantRole,
  onRevokeRole,
  onRolesChanged,
}: Props) {
  const [address, setAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState(GRANTABLE_ROLES[0].value);
  const [mode, setMode] = useState<"grant" | "revoke">("grant");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    const label =
      GRANTABLE_ROLES.find((r) => r.value === selectedRole)?.label ?? "Role";

    try {
      if (mode === "grant") {
        await onGrantRole(selectedRole, address.trim());
        addToast(`Granted ${label} role`, "success");
      } else {
        await onRevokeRole(selectedRole, address.trim());
        addToast(`Revoked ${label} role`, "success");
      }
      setAddress("");
      onRolesChanged();
    } catch (err) {
      addToast(parseContractError(err), "error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-yellow-400" />
          Role Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "grant"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
              onClick={() => setMode("grant")}
            >
              <UserPlus className="inline h-3.5 w-3.5 mr-1.5" />
              Grant
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "revoke"
                  ? "bg-destructive text-destructive-foreground"
                  : "hover:bg-accent"
              }`}
              onClick={() => setMode("revoke")}
            >
              <UserMinus className="inline h-3.5 w-3.5 mr-1.5" />
              Revoke
            </button>
          </div>

          {/* Role */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={txPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {GRANTABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Account Address
            </label>
            <Input
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={txPending}
            />
          </div>

          <Button
            type="submit"
            disabled={txPending || !address.trim()}
            variant={mode === "revoke" ? "destructive" : "default"}
            className="w-full"
          >
            {txPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : mode === "grant" ? (
              "Grant Role"
            ) : (
              "Revoke Role"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
