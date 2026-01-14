/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Checking oracle configuration...");

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment_optimized.json", "utf8"));
  const marketFactoryAddress = deploymentInfo.marketFactory;
  const createdMarketAddress = deploymentInfo.createdMarket;
  const umaOracleAdapterAddress = deploymentInfo.umaOracleAdapterV2;
  const manualOracleAddress = deploymentInfo.manualOracle;

  // Get contract instances
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = MarketFactory.attach(marketFactoryAddress);

  // Use OffchainBinaryMarket instead of IMarket interface to access all public variables
  const OffchainBinaryMarket = await hre.ethers.getContractFactory("OffchainBinaryMarket");
  const market = OffchainBinaryMarket.attach(createdMarketAddress);

  const UMAOracleAdapterV2 = await hre.ethers.getContractFactory("UMAOracleAdapterV2");
  const umaAdapter = UMAOracleAdapterV2.attach(umaOracleAdapterAddress);

  // 1. Check MarketFactory default oracle
  console.log("\n=== MarketFactory Configuration ===");
  const defaultOracle = await marketFactory.umaOracle();
  console.log(`Default oracle: ${defaultOracle}`);
  console.log(`UMA Oracle Adapter: ${umaOracleAdapterAddress}`);
  console.log(`Manual Oracle: ${manualOracleAddress}`);
  console.log(`Default oracle is UMA adapter: ${defaultOracle === umaOracleAdapterAddress}`);

  // 2. Check created market's oracle
  console.log("\n=== Created Market Configuration ===");
  const marketOracle = await market.oracle; // In ethers.js v6, access public variables as properties, not functions
  console.log(`Market's oracle: ${marketOracle}`);
  console.log(`Market uses UMA adapter: ${marketOracle === umaOracleAdapterAddress}`);
  console.log(`Market uses Manual oracle: ${marketOracle === manualOracleAddress}`);

  // 3. Check UMA Oracle Adapter details
  console.log("\n=== UMA Oracle Adapter Details ===");
  const umaAddress = await umaAdapter.uma(); // uma() is a function that returns the UMA oracle address
  console.log(`UMA Oracle Address: ${umaAddress}`);

  // Check if it's using the mock oracle (starts with 0x and has code)
  const code = await hre.ethers.provider.getCode(umaAddress);
  console.log(`UMA Oracle has code: ${code.length > 2}`);
  console.log(`Using Mock Optimistic Oracle: ${code.length > 2}`); // In localhost, we deployed MockOptimisticOracleV3

  // 4. Check created market details
  console.log("\n=== Market Details ===");
  const marketState = await market.state;
  console.log(`Market state: ${marketState}`);
  const outcomeCount = await market.outcomeCount;
  console.log(`Outcome count: ${outcomeCount}`);
  const resolutionTime = await market.resolutionTime;
  console.log(`Resolution time: ${new Date(Number(resolutionTime) * 1000).toLocaleString()}`);

  // 4. Check available oracle options
  console.log("\n=== Available Oracle Options ===");
  console.log("1. UMA Oracle Adapter (configured as default)");
  console.log("2. Manual Oracle (for testing)");
  console.log("3. You can also deploy and use other oracles");

  // 5. How to use different oracles
  console.log("\n=== How to Use Different Oracles ===");
  console.log("- Create market with UMA Oracle: Use default marketFactory.createMarket()");
  console.log("- Create market with Manual Oracle: Pass manualOracleAddress as oracle parameter");
  console.log("- Switch default oracle: Call marketFactory.setDefaultOracle(newOracleAddress)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
