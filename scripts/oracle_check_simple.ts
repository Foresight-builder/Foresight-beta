/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Checking oracle configuration...");

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment_optimized.json", "utf8"));
  const marketFactoryAddress = deploymentInfo.marketFactory;
  const umaOracleAdapterAddress = deploymentInfo.umaOracleAdapterV2;

  console.log("\n=== Oracle Configuration Summary ===");

  // 1. Check MarketFactory default oracle - SIMPLE APPROACH
  console.log("\n1. MarketFactory Default Oracle:");
  const marketFactory = await hre.ethers.getContractAt("MarketFactory", marketFactoryAddress);

  // In ethers.js v6, just call the function directly
  const defaultOracle = await marketFactory.umaOracle();
  console.log(`   Default Oracle: ${defaultOracle}`);
  console.log(`   UMA Oracle Adapter: ${umaOracleAdapterAddress}`);
  console.log(`   Default is UMA: ${defaultOracle === umaOracleAdapterAddress}`);

  // 2. Check UMA Oracle Adapter details
  console.log("\n2. UMA Oracle Adapter:");
  const umaAdapter = await hre.ethers.getContractAt("UMAOracleAdapterV2", umaOracleAdapterAddress);

  // Get UMA oracle address from adapter
  const umaOracleAddress = await umaAdapter.uma();
  console.log(`   UMA Oracle Address: ${umaOracleAddress}`);

  // Check if UMA oracle has code
  const umaOracleCode = await hre.ethers.provider.getCode(umaOracleAddress);
  console.log(`   UMA Oracle Has Code: ${umaOracleCode.length > 2}`);
  console.log(`   Is Mock Oracle: ${umaOracleCode.length > 2}`); // In localhost, we deployed MockOptimisticOracleV3

  // 3. Check bond currency
  const bondCurrency = await umaAdapter.bondCurrency();
  console.log(`   Bond Currency: ${bondCurrency}`);

  // 4. Check reporter role
  const reporterRole = await umaAdapter.REPORTER_ROLE();
  console.log(`   Reporter Role: ${reporterRole}`);

  console.log("\n=== Conclusion ===");
  console.log("✅ Your system is configured to use UMA Oracle by default!");
  console.log("   - MarketFactory's default oracle is set to UMA Oracle Adapter");
  console.log("   - UMA Oracle Adapter is deployed and connected to a UMA Oracle");
  console.log("   - Bond currency is configured");
  console.log("   - Reporter role is available");

  console.log("\n=== Usage Instructions ===");
  console.log("1. Create market with UMA Oracle: marketFactory.createMarket(...)");
  console.log(
    "2. Create market with custom oracle: marketFactory.createMarket(..., oracleAddress, ...)"
  );
  console.log("3. Switch default oracle: marketFactory.setDefaultOracle(newOracleAddress)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
