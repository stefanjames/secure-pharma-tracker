import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Factory, Truck, FlaskConical, Shield } from "lucide-react";

const steps = [
  {
    id: "manufacture",
    label: "Manufacture",
    icon: Factory,
    title: "Batch Created On-Chain",
    description:
      "Manufacturers register each pharmaceutical batch with drug name, metadata, and timestamps. A unique batch ID is minted and ownership is assigned.",
    color: "emerald",
  },
  {
    id: "ship",
    label: "Ship",
    icon: Truck,
    title: "Logistics Recorded Immutably",
    description:
      "Shipping handoffs between manufacturers and logistics providers are tracked on-chain. Temperature logs and custody transfers create an unbreakable audit trail.",
    color: "teal",
  },
  {
    id: "verify",
    label: "Verify",
    icon: FlaskConical,
    title: "QA Results Anchored to Batch",
    description:
      "Quality assurance testers record test results directly against the batch. Approvals and rejections are permanent, transparent, and timestamped.",
    color: "cyan",
  },
  {
    id: "regulate",
    label: "Regulate",
    icon: Shield,
    title: "Compliance Visible to All",
    description:
      "Regulators can view any batch's full lifecycle, issue recalls that propagate instantly, and audit the entire supply chain in real-time.",
    color: "blue",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const activeStep = steps[active];

  return (
    <section className="py-24 px-6" id="how-it-works">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Four steps from factory floor to verified delivery
          </p>
        </motion.div>

        {/* Step tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-white border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 rounded-lg p-1">
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  i === active
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step connector line */}
        <div className="relative max-w-2xl mx-auto mb-12">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
              initial={{ width: "0%" }}
              animate={{ width: `${(active / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
          <div className="relative flex justify-between">
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setActive(i)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i <= active
                      ? "bg-emerald-500 text-gray-950"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-800"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === active ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active step content */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <activeStep.icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3">{activeStep.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {activeStep.description}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
