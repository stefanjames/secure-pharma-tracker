import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  AlertTriangle,
  FileQuestion,
  EyeOff,
  Shield,
  Link2,
  ScanSearch,
} from "lucide-react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Counterfeit Drugs",
    description:
      "1 in 10 medical products in developing countries is substandard or falsified",
  },
  {
    icon: FileQuestion,
    title: "Broken Audit Trails",
    description:
      "Paper-based records are easily lost, forged, or left incomplete",
  },
  {
    icon: EyeOff,
    title: "Opaque Supply Chains",
    description:
      "Patients and regulators can't verify where a drug has actually been",
  },
];

const solutions = [
  {
    icon: Shield,
    title: "Immutable Records",
    description:
      "Every batch event is permanently recorded on the Ethereum blockchain",
  },
  {
    icon: Link2,
    title: "End-to-End Traceability",
    description:
      "Follow each batch from manufacturer through logistics, QA, and delivery",
  },
  {
    icon: ScanSearch,
    title: "Instant Verification",
    description:
      "Anyone can verify a batch's full history with just a batch ID",
  },
];

function AnimatedCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex gap-4"
    >
      <div className="shrink-0 mt-1">
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div>
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export function ProblemSolution() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            The pharmaceutical supply chain is{" "}
            <span className="text-red-400">broken</span>
          </h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            Traditional tracking systems leave critical gaps that put patients at
            risk
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-20">
          {/* Problem side */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium uppercase tracking-wider">
              The Problem
            </div>
            <div className="space-y-6">
              {problems.map((p, i) => (
                <AnimatedCard key={p.title} {...p} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* Solution side */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium uppercase tracking-wider">
              PharmaChain Solution
            </div>
            <div className="space-y-6">
              {solutions.map((s, i) => (
                <AnimatedCard key={s.title} {...s} delay={i * 0.1 + 0.2} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
