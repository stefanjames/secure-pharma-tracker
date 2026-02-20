import { useState, useEffect } from "react";
import { Contract } from "ethers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  truncAddr,
  fmtTime,
} from "@/lib/contract";
import { Activity, Radio } from "lucide-react";

interface FeedEvent {
  id: string;
  type: "created" | "transitioned";
  batchId: number;
  description: string;
  status: number;
  timestamp: bigint;
  actor: string;
}

interface Props {
  contract: Contract | null;
}

export function EventFeed({ contract }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!contract) return;

    let cancelled = false;

    // Load recent events
    const loadRecent = async () => {
      try {
        const block = await contract.runner?.provider?.getBlockNumber();
        if (!block || cancelled) return;
        const from = Math.max(0, block - 5000);

        const [created, transitioned] = await Promise.all([
          contract.queryFilter(contract.filters.BatchCreated(), from),
          contract.queryFilter(contract.filters.BatchTransitioned(), from),
        ]);

        if (cancelled) return;

        const feed: FeedEvent[] = [];

        for (const ev of created) {
          const l = ev as any;
          feed.push({
            id: `c-${l.transactionHash}-${l.index}`,
            type: "created",
            batchId: Number(l.args.batchId),
            description: `New batch: ${l.args.drugName}`,
            status: 0,
            timestamp: l.args.timestamp,
            actor: l.args.manufacturer,
          });
        }

        for (const ev of transitioned) {
          const l = ev as any;
          const to = Number(l.args.toStatus);
          feed.push({
            id: `t-${l.transactionHash}-${l.index}`,
            type: "transitioned",
            batchId: Number(l.args.batchId),
            description: `${STATUS_LABELS[Number(l.args.fromStatus)]} \u2192 ${STATUS_LABELS[to]}`,
            status: to,
            timestamp: l.args.timestamp,
            actor: l.args.actor,
          });
        }

        feed.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        setEvents(feed.slice(0, 50));
      } catch {
        // events are non-critical
      }
    };

    loadRecent();

    // Live listeners
    const onCreated = (
      batchId: bigint,
      drugName: string,
      manufacturer: string,
      timestamp: bigint
    ) => {
      const ev: FeedEvent = {
        id: `live-c-${Date.now()}`,
        type: "created",
        batchId: Number(batchId),
        description: `New batch: ${drugName}`,
        status: 0,
        timestamp,
        actor: manufacturer,
      };
      setEvents((prev) => [ev, ...prev].slice(0, 50));
    };

    const onTransitioned = (
      batchId: bigint,
      fromStatus: bigint,
      toStatus: bigint,
      actor: string,
      timestamp: bigint
    ) => {
      const to = Number(toStatus);
      const ev: FeedEvent = {
        id: `live-t-${Date.now()}`,
        type: "transitioned",
        batchId: Number(batchId),
        description: `${STATUS_LABELS[Number(fromStatus)]} \u2192 ${STATUS_LABELS[to]}`,
        status: to,
        timestamp,
        actor,
      };
      setEvents((prev) => [ev, ...prev].slice(0, 50));
    };

    contract.on("BatchCreated", onCreated);
    contract.on("BatchTransitioned", onTransitioned);
    setListening(true);

    return () => {
      cancelled = true;
      contract.off("BatchCreated", onCreated);
      contract.off("BatchTransitioned", onTransitioned);
      setListening(false);
    };
  }, [contract]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Event Feed
          </span>
          {listening && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No events yet. Events will appear here as batches are created and
            updated.
          </p>
        ) : (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto scrollbar-thin pr-1">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-md border px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Batch #{ev.batchId}
                    </span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[ev.status]}`}
                    >
                      {STATUS_LABELS[ev.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {ev.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    {truncAddr(ev.actor)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtTime(ev.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
