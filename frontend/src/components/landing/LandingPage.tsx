import { Hero } from "./Hero";
import { ProblemSolution } from "./ProblemSolution";
import { HowItWorks } from "./HowItWorks";
import { ChainStats } from "./ChainStats";
import { DemoExplorer } from "./DemoExplorer";
import { RoleCards } from "./RoleCards";
import { Footer } from "./Footer";
import { Pill, Wallet } from "lucide-react";

interface Props {
  onConnect: () => void;
  isConnecting: boolean;
}

export function LandingPage({ onConnect, isConnecting }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sticky nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-lg">PharmaChain</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#demo"
              className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Demo
            </a>
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-lg transition-colors"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      {/* Sections */}
      <Hero onConnect={onConnect} />
      <ProblemSolution />
      <HowItWorks />
      <ChainStats />
      <DemoExplorer onConnect={onConnect} />
      <RoleCards />
      <Footer />
    </div>
  );
}
