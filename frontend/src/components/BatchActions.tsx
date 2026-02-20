import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type UserRoles, Status, parseContractError } from "@/lib/contract";
import { addToast } from "@/hooks/useToast";
import {
  Truck,
  MapPin,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Thermometer,
  Loader2,
} from "lucide-react";

interface Props {
  batchId: number;
  status: number;
  currentHolder: string;
  address: string;
  roles: UserRoles;
  txPending: boolean;
  onShipBatch: (id: number, logistics: string) => Promise<unknown>;
  onDeliverBatch: (id: number, dest: string) => Promise<unknown>;
  onBeginQA: (id: number) => Promise<unknown>;
  onApprove: (id: number) => Promise<unknown>;
  onReject: (id: number) => Promise<unknown>;
  onRecall: (id: number) => Promise<unknown>;
  onRecordTemp: (id: number, temp: number) => Promise<unknown>;
  onComplete: () => void;
}

export function BatchActions({
  batchId,
  status,
  currentHolder,
  address,
  roles,
  txPending,
  onShipBatch,
  onDeliverBatch,
  onBeginQA,
  onApprove,
  onReject,
  onRecall,
  onRecordTemp,
  onComplete,
}: Props) {
  const [addrInput, setAddrInput] = useState("");
  const [tempInput, setTempInput] = useState("");

  const isHolder = address.toLowerCase() === currentHolder.toLowerCase();
  const isTerminal =
    status === Status.Approved ||
    status === Status.Rejected ||
    status === Status.Recalled;

  const exec = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      addToast(msg, "success");
      setAddrInput("");
      setTempInput("");
      onComplete();
    } catch (err) {
      addToast(parseContractError(err), "error");
    }
  };

  if (isTerminal) return null;

  const actions: React.ReactNode[] = [];

  // Ship — Manufacturer + holder + Created
  if (roles.isManufacturer && isHolder && status === Status.Created) {
    actions.push(
      <div key="ship" className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Logistics wallet address (0x...)"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            disabled={txPending}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={txPending}
            onClick={() => setAddrInput(address)}
            className="shrink-0 text-xs"
          >
            Use Mine
          </Button>
        </div>
        <Button
          size="sm"
          disabled={txPending || !addrInput}
          onClick={() =>
            exec(() => onShipBatch(batchId, addrInput), "Batch shipped")
          }
          className="w-full"
        >
          {txPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Truck className="mr-2 h-4 w-4" />
          )}
          Ship Batch
        </Button>
      </div>
    );
  }

  // Deliver — Logistics + holder + InTransit
  if (roles.isLogistics && isHolder && status === Status.InTransit) {
    actions.push(
      <div key="deliver" className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Destination wallet address (0x...)"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            disabled={txPending}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={txPending}
            onClick={() => setAddrInput(address)}
            className="shrink-0 text-xs"
          >
            Use Mine
          </Button>
        </div>
        <Button
          size="sm"
          disabled={txPending || !addrInput}
          onClick={() =>
            exec(
              () => onDeliverBatch(batchId, addrInput),
              "Batch delivered"
            )
          }
          className="w-full"
        >
          {txPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Confirm Delivery
        </Button>
      </div>
    );
  }

  // Begin QA — Tester + Delivered
  if (roles.isTester && status === Status.Delivered) {
    actions.push(
      <Button
        key="qa"
        size="sm"
        disabled={txPending}
        onClick={() =>
          exec(() => onBeginQA(batchId), "QA testing started")
        }
        className="w-full"
      >
        {txPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FlaskConical className="mr-2 h-4 w-4" />
        )}
        Begin QA Testing
      </Button>
    );
  }

  // Approve / Reject — Tester + holder + QATesting
  if (roles.isTester && isHolder && status === Status.QATesting) {
    actions.push(
      <div key="verdict" className="flex gap-2">
        <Button
          size="sm"
          disabled={txPending}
          onClick={() =>
            exec(() => onApprove(batchId), "Batch approved")
          }
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {txPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={txPending}
          onClick={() =>
            exec(() => onReject(batchId), "Batch rejected")
          }
          className="flex-1"
        >
          {txPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Reject
        </Button>
      </div>
    );
  }

  // Record Temperature — Logistics or Tester
  if (roles.isLogistics || roles.isTester) {
    actions.push(
      <div key="temp" className="flex gap-2">
        <Input
          placeholder="Temp °C (e.g. 36.5)"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          disabled={txPending}
          type="number"
          step="0.1"
          className="flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={txPending || !tempInput}
          onClick={() => {
            const temp = Math.round(parseFloat(tempInput) * 10);
            if (isNaN(temp)) {
              addToast("Enter a valid temperature", "error");
              return;
            }
            exec(
              () => onRecordTemp(batchId, temp),
              `Temperature recorded: ${tempInput} °C`
            );
          }}
        >
          {txPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Thermometer className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // Recall — Regulator
  if (roles.isRegulator) {
    actions.push(
      <Button
        key="recall"
        size="sm"
        variant="destructive"
        disabled={txPending}
        onClick={() =>
          exec(() => onRecall(batchId), "Batch recalled")
        }
        className="w-full"
      >
        {txPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle className="mr-2 h-4 w-4" />
        )}
        Recall Batch
      </Button>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        Available Actions
      </h4>
      <div className="space-y-3">{actions}</div>
    </div>
  );
}
