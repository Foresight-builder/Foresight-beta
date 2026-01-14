/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying Offchain settlement (UMA + offchain orderbook) system...");

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);

  // Collateral (USDC)
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const env = process.env;
  let collateralTokenAddress =
    env.COLLATERAL_TOKEN_ADDRESS ||
    (chainId === 137 ? env.USDC_ADDRESS_POLYGON || env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON : "") ||
    (chainId === 80002 ? env.USDC_ADDRESS_AMOY || env.NEXT_PUBLIC_USDC_ADDRESS_AMOY : "") ||
    (chainId === 11155111
      ? env.USDC_ADDRESS_SEPOLIA || env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA
      : "") ||
    (chainId === 1337
      ? env.USDC_ADDRESS_LOCALHOST || env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST
      : "") ||
    env.USDC_ADDRESS ||
    env.NEXT_PUBLIC_USDC_ADDRESS ||
    "";

  // Deploy test USDC for localhost network
  if (!collateralTokenAddress && chainId === 1337) {
    console.log("Deploying test USDC token for localhost...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const testUSDC = await MockERC20.deploy("USD Coin", "USDC");
    await testUSDC.waitForDeployment();
    collateralTokenAddress = await testUSDC.getAddress();
    console.log(`Test USDC deployed to: ${collateralTokenAddress}`);
  } else if (!collateralTokenAddress) {
    throw new Error(
      `Missing USDC collateral address for chainId ${chainId}. Set COLLATERAL_TOKEN_ADDRESS or USDC_ADDRESS_*.`
    );
  }

  // UMA OOv3
  let UMA_OO_V3_ADDRESS =
    env.UMA_OO_V3_ADDRESS || env.UMA_OPTIMISTIC_ORACLE_ADDRESS || env.ORACLE_ADDRESS || "";

  // Deploy mock UMA Oracle for localhost network
  if (!UMA_OO_V3_ADDRESS && chainId === 1337) {
    console.log("Deploying mock OptimisticOracleV3 for localhost...");
    const MockOptimisticOracleV3 = await hre.ethers.getContractFactory("MockOptimisticOracleV3");
    const mockOracle = await MockOptimisticOracleV3.deploy();
    await mockOracle.waitForDeployment();
    UMA_OO_V3_ADDRESS = await mockOracle.getAddress();
    console.log(`Mock OptimisticOracleV3 deployed to: ${UMA_OO_V3_ADDRESS}`);
  } else if (!UMA_OO_V3_ADDRESS) {
    throw new Error("Missing UMA_OO_V3_ADDRESS env (UMA Optimistic Oracle V3 address).");
  }

  // 1. Deploy OutcomeToken1155
  const OutcomeToken1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
  const outcomeToken1155 = await OutcomeToken1155.deploy();
  await outcomeToken1155.waitForDeployment();
  await outcomeToken1155.initialize("");
  const outcomeToken1155Address = await outcomeToken1155.getAddress();
  console.log(`OutcomeToken1155 deployed to: ${outcomeToken1155Address}`);

  // 2. Deploy UMAOracleAdapterV2 (reporter=deployer by default)
  const UMAOracleAdapterV2 = await hre.ethers.getContractFactory("UMAOracleAdapterV2");
  const umaAdapter = await UMAOracleAdapterV2.deploy(
    UMA_OO_V3_ADDRESS,
    collateralTokenAddress,
    deployerAddress,
    deployerAddress
  );
  await umaAdapter.waitForDeployment();
  const umaAdapterAddress = await umaAdapter.getAddress();
  console.log(`UMAOracleAdapterV2 deployed to: ${umaAdapterAddress}`);

  // 3. Deploy MarketFactory + initialize(defaultOracle=UMA adapter)
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy();
  await marketFactory.waitForDeployment();
  await marketFactory.initialize(deployerAddress, umaAdapterAddress);
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log(`MarketFactory deployed to: ${marketFactoryAddress}`);

  const REGISTRAR_ROLE = await umaAdapter.REGISTRAR_ROLE();
  if (!(await umaAdapter.hasRole(REGISTRAR_ROLE, marketFactoryAddress))) {
    await (await umaAdapter.grantRole(REGISTRAR_ROLE, marketFactoryAddress)).wait();
  }

  // 4. Deploy OffchainBinaryMarket template
  const OffchainBinaryMarket = await hre.ethers.getContractFactory("OffchainBinaryMarket");
  const binaryTemplate = await OffchainBinaryMarket.deploy();
  await binaryTemplate.waitForDeployment();
  const binaryMarketTemplateAddress = await binaryTemplate.getAddress();
  console.log(`OffchainBinaryMarket template deployed to: ${binaryMarketTemplateAddress}`);

  // 5. Deploy OffchainMultiMarket8 template for testing multi-outcome markets
  console.log("\nDeploying additional templates for testing...");
  const OffchainMultiMarket8 = await hre.ethers.getContractFactory("OffchainMultiMarket8");
  const multiTemplate = await OffchainMultiMarket8.deploy();
  await multiTemplate.waitForDeployment();
  const multiMarketTemplateAddress = await multiTemplate.getAddress();
  console.log(`OffchainMultiMarket8 template deployed to: ${multiMarketTemplateAddress}`);

  // 6. Deploy ManualOracle for easy testing
  const ManualOracle = await hre.ethers.getContractFactory("ManualOracle");
  const manualOracle = await ManualOracle.deploy(deployerAddress);
  await manualOracle.waitForDeployment();
  const manualOracleAddress = await manualOracle.getAddress();
  console.log(`ManualOracle deployed to: ${manualOracleAddress}`);

  // 7. Deploy LPFeeStaking for testing reward mechanisms
  const LPFeeStaking = await hre.ethers.getContractFactory("LPFeeStaking");
  const lpFeeStaking = await LPFeeStaking.deploy(
    outcomeToken1155Address,
    collateralTokenAddress,
    deployerAddress
  );
  await lpFeeStaking.waitForDeployment();
  const lpFeeStakingAddress = await lpFeeStaking.getAddress();
  console.log(`LPFeeStaking deployed to: ${lpFeeStakingAddress}`);

  // 8. Register templates
  console.log("\nRegistering templates...");
  // Register binary template
  const binaryTemplateId = hre.ethers.id("OFFCHAIN_BINARY_V1");
  await marketFactory.registerTemplate(
    binaryTemplateId,
    binaryMarketTemplateAddress,
    "Offchain Binary v1"
  );
  console.log(`OffchainBinaryMarket template registered with ID: ${binaryTemplateId}`);

  // Register multi-outcome template
  const multiTemplateId = hre.ethers.id("OFFCHAIN_MULTI_8_V1");
  await marketFactory.registerTemplate(
    multiTemplateId,
    multiMarketTemplateAddress,
    "Offchain Multi 8 v1"
  );
  console.log(`OffchainMultiMarket8 template registered with ID: ${multiTemplateId}`);

  // 9. Create a new OffchainBinaryMarket instance (fee=0 per requirement)
  const feeBps = 0;
  const resolutionTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const data = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [outcomeToken1155Address]);

  // Call createMarket with explicit arguments to avoid overload ambiguity
  const tx = await marketFactory["createMarket(bytes32,address,address,uint256,uint256,bytes)"](
    binaryTemplateId,
    collateralTokenAddress,
    umaAdapterAddress,
    feeBps,
    resolutionTime,
    data
  );
  const receipt = await tx.wait();
  const log = receipt.logs.find((l: any) => {
    try {
      const parsed = marketFactory.interface.parseLog(l);
      return parsed?.name === "MarketCreated";
    } catch {
      return false;
    }
  });
  const parsed = log ? marketFactory.interface.parseLog(log) : null;
  const marketAddress = parsed ? (parsed.args.market ?? parsed.args[1]) : undefined;
  console.log(`New OffchainBinaryMarket created at: ${marketAddress}`);

  // 10. Grant MINTER_ROLE to the new market
  if (marketAddress) {
    await outcomeToken1155.grantMinter(marketAddress);
    console.log(`MINTER_ROLE granted to market: ${marketAddress}`);
  }

  // Save deployment info with all test contracts
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployerAddress,
    outcomeToken1155: outcomeToken1155Address,
    marketFactory: marketFactoryAddress,
    umaOracleAdapterV2: umaAdapterAddress,
    manualOracle: manualOracleAddress,
    lpFeeStaking: lpFeeStakingAddress,
    offchainBinaryTemplate: binaryMarketTemplateAddress,
    offchainMultiTemplate: multiMarketTemplateAddress,
    createdMarket: marketAddress,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync("deployment_optimized.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\nOptimized deployment information saved to deployment_optimized.json");
  console.log("\n✅ All test contracts deployed successfully!");
  console.log("\nTesting contracts deployed:");
  console.log(`- ManualOracle: ${manualOracleAddress} (for easy outcome testing)`);
  console.log(
    `- OffchainMultiMarket8 template: ${multiMarketTemplateAddress} (for multi-outcome markets)`
  );
  console.log(`- LPFeeStaking: ${lpFeeStakingAddress} (for reward mechanism testing)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
