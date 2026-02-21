import { motion } from "framer-motion";
import { NetworkCanvas } from "./NetworkCanvas";
import { Wallet, ChevronDown } from "lucide-react";

interface Props {
  onConnect: () => void;
}

export function Hero({ onConnect }: Props) {
  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <NetworkCanvas />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f0f1f3]/50 to-[#f0f1f3] dark:via-gray-950/50 dark:to-gray-950 pointer-events-none" />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-emerald-600/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/20 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Secured by Ethereum
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
        >
          Pharmaceutical Supply Chain.{" "}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            Verified On-Chain.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
        >
          Track drug batches from manufacturer to patient with tamper-proof
          blockchain transparency
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onConnect}
            className="group flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            <Wallet className="h-5 w-5" />
            Connect Wallet
            <span className="group-hover:translate-x-0.5 transition-transform">
              &rarr;
            </span>
          </button>
          <button
            onClick={scrollToDemo}
            className="flex items-center gap-2 px-8 py-3.5 border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:hover:border-gray-500 dark:text-gray-300 dark:hover:text-white rounded-lg transition-all"
          >
            View Demo
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="h-6 w-6 text-gray-500 animate-bounce" />
      </motion.div>
    </section>
  );
}
