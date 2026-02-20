import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PharmaChainModule = buildModule("PharmaChainModule", (m) => {
  const pharmaChain = m.contract("PharmaChain");
  return { pharmaChain };
});

export default PharmaChainModule;
