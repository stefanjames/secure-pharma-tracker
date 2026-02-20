import { Pill } from "lucide-react";
import { PHARMA_CHAIN_ADDRESS } from "@/lib/contract";

export function Footer() {
  const truncatedContract = PHARMA_CHAIN_ADDRESS
    ? `${PHARMA_CHAIN_ADDRESS.slice(0, 6)}...${PHARMA_CHAIN_ADDRESS.slice(-4)}`
    : "Not deployed";

  return (
    <footer className="border-t border-gray-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Branding */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Pill className="h-5 w-5 text-emerald-400" />
              <span className="font-bold text-lg">PharmaChain</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Decentralized pharmaceutical supply chain tracking powered by
              Ethereum smart contracts.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="#how-it-works" className="hover:text-gray-300 transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#demo" className="hover:text-gray-300 transition-colors">
                    Demo
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                Contract
              </h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <span className="font-mono text-xs">
                    {truncatedContract}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>Built with Solidity &bull; Secured by Ethereum &bull; Open Source</p>
          <p>&copy; {new Date().getFullYear()} PharmaChain</p>
        </div>
      </div>
    </footer>
  );
}
