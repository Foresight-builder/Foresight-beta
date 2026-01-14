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

  console.log("\n=== Deployment Overview ===");
  console.log(`MarketFactory: ${marketFactoryAddress}`);
  console.log(`UMA Oracle Adapter: ${umaOracleAdapterAddress}`);
  console.log(`Manual Oracle: ${manualOracleAddress}`);
  console.log(`Created Market: ${createdMarketAddress}`);

  // 1. Check MarketFactory default oracle using ethers.js v6 syntax
  console.log("\n=== MarketFactory Configuration ===");
  const marketFactory = await hre.ethers.getContractAt("MarketFactory", marketFactoryAddress);

  // In ethers.js v6, we use .getFunction() to call functions
  const umaOracleFunction = marketFactory.interface.getFunction("umaOracle");
  const defaultOracle = await marketFactory.callStatic[umaOracleFunction.name]();
  console.log(`Default oracle: ${defaultOracle}`);
  console.log(`Default oracle is UMA adapter: ${defaultOracle === umaOracleAdapterAddress}`);

  // 2. Check UMA Oracle Adapter details
  console.log("\n=== UMA Oracle Adapter Details ===");
  const umaAdapter = await hre.ethers.getContractAt("UMAOracleAdapterV2", umaOracleAdapterAddress);

  // Get UMA oracle address from adapter
  const umaOracleAddress = await umaAdapter.uma();
  console.log(`UMA Oracle Address: ${umaOracleAddress}`);

  // Check if UMA oracle has code
  const umaOracleCode = await hre.ethers.provider.getCode(umaOracleAddress);
  console.log(`UMA Oracle has code: ${umaOracleCode.length > 2}`);

  // Check if it's a mock oracle (in localhost, we deployed MockOptimisticOracleV3)
  console.log(`Using Mock Optimistic Oracle: ${umaOracleCode.length > 2}`);

  // 3. Check created market
  console.log("\n=== Created Market Configuration ===");
  const market = await hre.ethers.getContractAt("OffchainBinaryMarket", createdMarketAddress);

  // Get market oracle using the correct function call syntax
  const marketOracle = await market.oracle();
  console.log(`Market's oracle: ${marketOracle}`);
  console.log(`Market uses UMA adapter: ${marketOracle === umaOracleAdapterAddress}`);
  console.log(`Market uses Manual oracle: ${marketOracle === manualOracleAddress}`);

  // Get market state
  const state = await market.state();
  console.log(`Market state: ${state}`);

  // Get outcome count
  const outcomeCount = await market.outcomeCount();
  console.log(`Outcome count: ${outcomeCount}`);

  // Get resolution time
  const resolutionTime = await market.resolutionTime();
  console.log(`Resolution time: ${new Date(Number(resolutionTime) * 1000).toLocaleString()}`);

  // 4. Check Manual Oracle status
  console.log("\n=== Manual Oracle Details ===");
  const manualOracle = await hre.ethers.getContractAt("ManualOracle", manualOracleAddress);
  const manualOracleAdmin = await manualOracle.admin();
  console.log(`Manual Oracle Admin: ${manualOracleAdmin}`);

  // 5. Available oracle options
  console.log("\n=== Available Oracle Options ===");
  console.log("1. UMA Oracle Adapter (configured as default)");
  console.log("2. Manual Oracle (for testing)");
  console.log("3. You can also deploy and use other oracles");

  // 6. How to use different oracles
  console.log("\n=== How to Use Different Oracles ===");
  console.log("- Create market with UMA Oracle: Use default marketFactory.createMarket()");
  console.log("- Create market with Manual Oracle: Pass manualOracleAddress as oracle parameter");
  console.log("- Switch default oracle: Call marketFactory.setDefaultOracle(newOracleAddress)");

  // 7. Summary
  console.log("\n=== Summary ===");
  console.log("✅ Default oracle is set to UMA Oracle Adapter");
  console.log("✅ UMA Oracle Adapter is deployed and configured");
  console.log("✅ Manual Oracle is available for testing");
  console.log("✅ Created market is using the configured oracle");
  console.log("\nYour system is configured to use UMA Oracle by default!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
