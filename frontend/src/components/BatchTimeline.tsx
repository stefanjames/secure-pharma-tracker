import {
  type BatchEvent,
  STATUS_LABELS,
  TIMELINE_DOT,
  Status,
  truncAddr,
  fmtTime,
} from "@/lib/contract";
import { cn } from "@/lib/utils";
import {
  Package,
  Truck,
  MapPin,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const statusIcon: Record<number, React.ElementType> = {
  [Status.Created]: Package,
  [Status.InTransit]: Truck,
  [Status.Delivered]: MapPin,
  [Status.QATesting]: FlaskConical,
  [Status.Approved]: CheckCircle2,
  [Status.Rejected]: XCircle,
  [Status.Recalled]: AlertTriangle,
};

interface Props {
  events: BatchEvent[];
}

export function BatchTimeline({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1;
        const Icon = statusIcon[ev.status] ?? Package;
        const dot = TIMELINE_DOT[ev.status] ?? "bg-gray-500";

        return (
          <div key={idx} className="flex gap-4">
            {/* dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  dot,
                  isLast && "ring-2 ring-offset-2 ring-offset-background ring-current"
                )}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[2rem]" />}
            </div>

            {/* content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p className="font-medium text-sm">
                {STATUS_LABELS[ev.status]}
                {ev.type === "created" && ev.drugName && (
                  <span className="text-muted-foreground font-normal">
                    {" "}&mdash; {ev.drugName}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {truncAddr(ev.actor)} &middot; {fmtTime(ev.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
