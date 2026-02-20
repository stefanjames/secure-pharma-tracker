import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BatchTimeline } from "./BatchTimeline";
import { BatchActions } from "./BatchActions";
import {
  type BatchInfo,
  type TemperatureLog,
  type BatchEvent,
  type UserRoles,
  STATUS_LABELS,
  STATUS_COLORS,
  truncAddr,
  fmtTime,
  parseContractError,
} from "@/lib/contract";
import { Search, Loader2, Thermometer, Copy, Check } from "lucide-react";
import { addToast } from "@/hooks/useToast";

interface Props {
  roles: UserRoles;
  address: string;
  txPending: boolean;
  onGetBatch: (id: number) => Promise<BatchInfo>;
  onGetHistory: (id: number) => Promise<BatchEvent[]>;
  onGetTempLogs: (id: number) => Promise<TemperatureLog[]>;
  onShipBatch: (id: number, logistics: string) => Promise<unknown>;
  onDeliverBatch: (id: number, dest: string) => Promise<unknown>;
  onBeginQA: (id: number) => Promise<unknown>;
  onApprove: (id: number) => Promise<unknown>;
  onReject: (id: number) => Promise<unknown>;
  onRecall: (id: number) => Promise<unknown>;
  onRecordTemp: (id: number, temp: number) => Promise<unknown>;
}

export function BatchSearch(props: Props) {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [history, setHistory] = useState<BatchEvent[]>([]);
  const [tempLogs, setTempLogs] = useState<TemperatureLog[]>([]);
  const [copied, setCopied] = useState("");

  const fetchBatch = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const [b, h, t] = await Promise.all([
          props.onGetBatch(id),
          props.onGetHistory(id),
          props.onGetTempLogs(id),
        ]);
        setBatch(b);
        setHistory(h);
        setTempLogs(t);
      } catch (err) {
        addToast(parseContractError(err), "error");
        setBatch(null);
        setHistory([]);
        setTempLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [props]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchId);
    if (isNaN(id) || id <= 0) {
      addToast("Enter a valid batch ID", "error");
      return;
    }
    fetchBatch(id);
  };

  const refresh = () => {
    if (batch) fetchBatch(Number(batch.batchId));
  };

  const copyAddr = (a: string) => {
    navigator.clipboard.writeText(a);
    setCopied(a);
    setTimeout(() => setCopied(""), 2000);
  };

  const Addr = ({ addr, label }: { addr: string; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => copyAddr(addr)}
        className="flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors"
      >
        {truncAddr(addr)}
        {copied === addr ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3 opacity-40" />
        )}
      </button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Batch Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Enter batch ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            type="number"
            min="1"
          />
          <Button type="submit" disabled={loading} variant="secondary">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Results */}
        {batch && (
          <div className="space-y-6">
            {/* Batch info card */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{batch.drugName}</h3>
                  <p className="text-xs text-muted-foreground">
                    Batch #{Number(batch.batchId)}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[batch.status]}>
                  {STATUS_LABELS[batch.status]}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <Addr addr={batch.manufacturer} label="Manufacturer" />
                <Addr addr={batch.currentHolder} label="Current Holder" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-xs">{fmtTime(batch.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Last Updated
                  </span>
                  <span className="text-xs">{fmtTime(batch.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <BatchActions
              batchId={Number(batch.batchId)}
              status={batch.status}
              currentHolder={batch.currentHolder}
              address={props.address}
              roles={props.roles}
              txPending={props.txPending}
              onShipBatch={props.onShipBatch}
              onDeliverBatch={props.onDeliverBatch}
              onBeginQA={props.onBeginQA}
              onApprove={props.onApprove}
              onReject={props.onReject}
              onRecall={props.onRecall}
              onRecordTemp={props.onRecordTemp}
              onComplete={refresh}
            />

            {/* Timeline */}
            {history.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                  Supply Chain Timeline
                </h4>
                <BatchTimeline events={history} />
              </div>
            )}

            {/* Temperature logs */}
            {tempLogs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4" />
                  Temperature Log
                </h4>
                <div className="space-y-2">
                  {tempLogs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                    >
                      <span className="font-mono font-medium">
                        {(log.temperatureCelsius / 10).toFixed(1)} °C
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {truncAddr(log.recorder)} &middot;{" "}
                        {fmtTime(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
