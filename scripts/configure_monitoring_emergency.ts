/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Configuring monitoring and emergency mechanisms...");

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);
  const env = process.env;

  // Load deployment info from previous deployment
  const deploymentPath = "deployment_optimized.json";
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment info file not found at ${deploymentPath}. Run deploy_optimized.ts first.`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const marketFactoryAddress = deploymentInfo.marketFactory;
  const outcomeToken1155Address = deploymentInfo.outcomeToken1155;

  if (!marketFactoryAddress || !outcomeToken1155Address) {
    throw new Error("Missing required addresses in deployment info");
  }

  // 1. Get contract instances
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = MarketFactory.attach(marketFactoryAddress);

  const OutcomeToken1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
  const outcomeToken1155 = OutcomeToken1155.attach(outcomeToken1155Address);

  // 2. Configure roles and permissions
  console.log("\nConfiguring roles and permissions...");

  // Check current admin role
  const adminRole = await marketFactory.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await marketFactory.hasRole(adminRole, deployerAddress);
  console.log(`Deployer has admin role: ${hasAdminRole}`);

  const emergencyController = env.EMERGENCY_ADDRESS || env.SAFE_ADDRESS || deployerAddress;
  console.log(`Emergency controller: ${emergencyController}`);

  // 3. Grant EMERGENCY_ROLE to emergency controller (if not already granted)
  const emergencyRole = await marketFactory.EMERGENCY_ROLE();
  const hasEmergencyRole = await marketFactory.hasRole(emergencyRole, emergencyController);

  if (!hasEmergencyRole) {
    console.log("Granting EMERGENCY_ROLE...");
    await (await marketFactory.grantRole(emergencyRole, emergencyController)).wait();
    console.log("EMERGENCY_ROLE granted");
  } else {
    console.log("Emergency controller already has EMERGENCY_ROLE");
  }

  if (emergencyController !== deployerAddress) {
    const deployerHasEmergencyRole = await marketFactory.hasRole(emergencyRole, deployerAddress);
    if (deployerHasEmergencyRole) {
      console.log("⚠️  Consider revoking deployer's EMERGENCY_ROLE after verification:");
      console.log(`   marketFactory.revokeRole(EMERGENCY_ROLE, "${deployerAddress}")`);
    }
  }

  // 4. Configure fee settings
  console.log("\nConfiguring fee settings...");

  // Set reasonable fee settings if not already set
  const currentFeeBps = await marketFactory.feeBps();
  if (currentFeeBps === 0) {
    const feeBps = 100; // 1% platform fee
    const lpFeeBps = 50; // 0.5% LP fee
    const feeTo = deployerAddress;
    const lpFeeTo = deployerAddress;

    console.log(
      `Setting fee settings: feeBps=${feeBps}, lpFeeBps=${lpFeeBps}, feeTo=${feeTo}, lpFeeTo=${lpFeeTo}`
    );
    await marketFactory.setFee(feeBps, feeTo);
    await marketFactory.setFeeSplit(lpFeeBps, lpFeeTo);
    console.log("Fee settings updated");
  } else {
    console.log(`Current feeBps: ${currentFeeBps}`);
  }

  // 5. Configure allowlists
  console.log("\nConfiguring allowlists...");

  // Disable collateral and oracle allowlist enforcement for now
  const enforceCollateralAllowlist = await marketFactory.enforceCollateralAllowlist();
  if (enforceCollateralAllowlist) {
    console.log("Disabling collateral allowlist enforcement...");
    await marketFactory.setAllowlistEnforcement(
      false,
      await marketFactory.enforceOracleAllowlist()
    );
    console.log("Collateral allowlist enforcement disabled");
  }

  const enforceOracleAllowlist = await marketFactory.enforceOracleAllowlist();
  if (enforceOracleAllowlist) {
    console.log("Disabling oracle allowlist enforcement...");
    await marketFactory.setAllowlistEnforcement(
      await marketFactory.enforceCollateralAllowlist(),
      false
    );
    console.log("Oracle allowlist enforcement disabled");
  }

  // 6. Configure market factory settings
  console.log("\nConfiguring market factory settings...");

  // Enable contract collateral requirement
  const requireContractCollateral = await marketFactory.requireContractCollateral();
  if (!requireContractCollateral) {
    console.log("Enabling contract collateral requirement...");
    await marketFactory.setContractRequirement(true, await marketFactory.requireContractOracle());
    console.log("Contract collateral requirement enabled");
  }

  // Enable contract oracle requirement
  const requireContractOracle = await marketFactory.requireContractOracle();
  if (!requireContractOracle) {
    console.log("Enabling contract oracle requirement...");
    await marketFactory.setContractRequirement(
      await marketFactory.requireContractCollateral(),
      true
    );
    console.log("Contract oracle requirement enabled");
  }

  // 7. Verify MINTER_ROLE is properly configured
  console.log("\nVerifying MINTER_ROLE configuration...");
  const minterRole = await outcomeToken1155.MINTER_ROLE();
  const hasMinterRole = await outcomeToken1155.hasRole(minterRole, marketFactoryAddress);

  if (!hasMinterRole) {
    console.log("MarketFactory does not have MINTER_ROLE on OutcomeToken1155");
    console.log("This is expected if markets receive MINTER_ROLE individually.");
  } else {
    console.log("MarketFactory already has MINTER_ROLE");
  }

  // 8. Save monitoring and emergency configuration
  // First get all settings values
  const configFeeBps = await marketFactory.feeBps();
  const configLpFeeBps = await marketFactory.lpFeeBps();
  const configFeeTo = await marketFactory.feeTo();
  const configLpFeeTo = await marketFactory.lpFeeTo();
  const configEnforceCollateralAllowlist = await marketFactory.enforceCollateralAllowlist();
  const configEnforceOracleAllowlist = await marketFactory.enforceOracleAllowlist();
  const configRequireContractCollateral = await marketFactory.requireContractCollateral();
  const configRequireContractOracle = await marketFactory.requireContractOracle();
  const configPaused = await marketFactory.paused();

  const configInfo = {
    network: hre.network.name,
    deployer: deployerAddress,
    marketFactory: marketFactoryAddress,
    outcomeToken1155: outcomeToken1155Address,
    roles: {
      adminRole: String(adminRole),
      emergencyRole: String(emergencyRole),
      minterRole: String(minterRole),
    },
    permissions: {
      deployerHasAdminRole: hasAdminRole,
      emergencyController: String(emergencyController),
      emergencyControllerHasEmergencyRole: hasEmergencyRole,
      marketFactoryHasMinterRole: hasMinterRole,
    },
    settings: {
      feeBps: Number(configFeeBps),
      lpFeeBps: Number(configLpFeeBps),
      feeTo: String(configFeeTo),
      lpFeeTo: String(configLpFeeTo),
      enforceCollateralAllowlist: configEnforceCollateralAllowlist,
      enforceOracleAllowlist: configEnforceOracleAllowlist,
      requireContractCollateral: configRequireContractCollateral,
      requireContractOracle: configRequireContractOracle,
      paused: configPaused,
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync("monitoring_emergency_config.json", JSON.stringify(configInfo, null, 2));
  console.log("\nMonitoring and emergency configuration saved to monitoring_emergency_config.json");

  // 9. Verify configuration
  console.log("\nVerifying configuration...");
  console.log(`MarketFactory paused: ${await marketFactory.paused()}`);
  console.log(`EMERGENCY_ROLE: ${emergencyRole}`);
  console.log(`MINTER_ROLE: ${minterRole}`);

  console.log("\n✅ Monitoring and emergency mechanisms configured successfully!");
  console.log("\nNext steps:");
  console.log("1. Start the relayer service with contract event listener");
  console.log("2. Configure monitoring and alerting systems");
  console.log("3. Test emergency pause/resume functionality");
  console.log("4. Conduct emergency response drills");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
