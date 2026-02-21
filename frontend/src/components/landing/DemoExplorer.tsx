import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search,
  Package,
  Truck,
  MapPin,
  FlaskConical,
  CheckCircle2,
  Wallet,
} from "lucide-react";

interface TimelineStep {
  status: string;
  label: string;
  actor: string;
  time: string;
  icon: typeof Package;
  color: string;
}

const DEMO_BATCHES: Record<
  string,
  { drugName: string; manufacturer: string; timeline: TimelineStep[] }
> = {
  "1": {
    drugName: "Aspirin 500mg",
    manufacturer: "PharmaCorp Ltd.",
    timeline: [
      {
        status: "Created",
        label: "Batch registered by manufacturer",
        actor: "PharmaCorp Ltd.",
        time: "Jan 15, 2026 09:00 AM",
        icon: Package,
        color: "text-blue-400 bg-blue-500/20",
      },
      {
        status: "In Transit",
        label: "Shipped via MedLogistics Inc.",
        actor: "MedLogistics Inc.",
        time: "Jan 16, 2026 02:30 PM",
        icon: Truck,
        color: "text-yellow-400 bg-yellow-500/20",
      },
      {
        status: "Delivered",
        label: "Delivered to Central Testing Facility",
        actor: "MedLogistics Inc.",
        time: "Jan 18, 2026 11:15 AM",
        icon: MapPin,
        color: "text-purple-400 bg-purple-500/20",
      },
      {
        status: "QA Testing",
        label: "Quality assurance initiated",
        actor: "QA Lab Alpha",
        time: "Jan 19, 2026 08:00 AM",
        icon: FlaskConical,
        color: "text-orange-400 bg-orange-500/20",
      },
      {
        status: "Approved",
        label: "Batch passed all quality checks",
        actor: "QA Lab Alpha",
        time: "Jan 20, 2026 04:45 PM",
        icon: CheckCircle2,
        color: "text-emerald-400 bg-emerald-500/20",
      },
    ],
  },
  "2": {
    drugName: "Amoxicillin 250mg",
    manufacturer: "BioGenics Corp.",
    timeline: [
      {
        status: "Created",
        label: "Batch registered by manufacturer",
        actor: "BioGenics Corp.",
        time: "Feb 01, 2026 10:30 AM",
        icon: Package,
        color: "text-blue-400 bg-blue-500/20",
      },
      {
        status: "In Transit",
        label: "Shipped via SwiftMed Logistics",
        actor: "SwiftMed Logistics",
        time: "Feb 02, 2026 08:00 AM",
        icon: Truck,
        color: "text-yellow-400 bg-yellow-500/20",
      },
      {
        status: "Delivered",
        label: "Delivered to Regional QA Center",
        actor: "SwiftMed Logistics",
        time: "Feb 04, 2026 03:20 PM",
        icon: MapPin,
        color: "text-purple-400 bg-purple-500/20",
      },
    ],
  },
  "3": {
    drugName: "Metformin 850mg",
    manufacturer: "GlobalPharma Inc.",
    timeline: [
      {
        status: "Created",
        label: "Batch registered by manufacturer",
        actor: "GlobalPharma Inc.",
        time: "Feb 10, 2026 07:45 AM",
        icon: Package,
        color: "text-blue-400 bg-blue-500/20",
      },
    ],
  },
};

export function DemoExplorer({ onConnect }: { onConnect: () => void }) {
  const [searchId, setSearchId] = useState("");
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const batch = activeBatch ? DEMO_BATCHES[activeBatch] : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = searchId.trim();
    if (DEMO_BATCHES[id]) {
      setActiveBatch(id);
    } else {
      setActiveBatch(null);
    }
  };

  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-4xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Try It — No Wallet Needed
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Look up a demo batch to see the full supply chain timeline. Try batch
            IDs <strong className="text-gray-600 dark:text-gray-300">1</strong>,{" "}
            <strong className="text-gray-600 dark:text-gray-300">2</strong>, or{" "}
            <strong className="text-gray-600 dark:text-gray-300">3</strong>.
          </p>
        </motion.div>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter batch ID (1, 2, or 3)"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all dark:bg-gray-900/50 dark:border-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Results */}
        {activeBatch && batch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-10"
          >
            {/* Batch header */}
            <div className="rounded-xl border border-gray-200 bg-white backdrop-blur-sm p-6 mb-6 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold">{batch.drugName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Batch #{activeBatch} &middot; {batch.manufacturer}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${batch.timeline[batch.timeline.length - 1].color}`}
                >
                  {batch.timeline[batch.timeline.length - 1].status}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-0">
              {batch.timeline.map((step, i) => (
                <motion.div
                  key={step.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  {/* Line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    {i < batch.timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-800" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8">
                    <p className="font-semibold text-sm">{step.status}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{step.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                      {step.actor} &middot; {step.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeBatch && !batch && (
          <div className="mt-10 text-center text-gray-600 dark:text-gray-400 py-8">
            No batch found. Try IDs 1, 2, or 3.
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <button
            onClick={onConnect}
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            <Wallet className="h-5 w-5" />
            Connect Wallet to Track Real Batches
            <span className="group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
