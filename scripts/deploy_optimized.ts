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
  const collateralTokenAddress =
    env.COLLATERAL_TOKEN_ADDRESS ||
    (chainId === 137 ? env.USDC_ADDRESS_POLYGON || env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON : "") ||
    (chainId === 80002 ? env.USDC_ADDRESS_AMOY || env.NEXT_PUBLIC_USDC_ADDRESS_AMOY : "") ||
    (chainId === 11155111 ? env.USDC_ADDRESS_SEPOLIA || env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA : "") ||
    (chainId === 1337
      ? env.USDC_ADDRESS_LOCALHOST || env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST
      : "") ||
    env.USDC_ADDRESS ||
    env.NEXT_PUBLIC_USDC_ADDRESS ||
    "";
  if (!collateralTokenAddress) {
    throw new Error(
      `Missing USDC collateral address for chainId ${chainId}. Set COLLATERAL_TOKEN_ADDRESS or USDC_ADDRESS_*.`
    );
  }

  // UMA OOv3
  const UMA_OO_V3_ADDRESS =
    env.UMA_OO_V3_ADDRESS || env.UMA_OPTIMISTIC_ORACLE_ADDRESS || env.ORACLE_ADDRESS || "";
  if (!UMA_OO_V3_ADDRESS) {
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

  // 4. Deploy OffchainBinaryMarket template
  const OffchainBinaryMarket = await hre.ethers.getContractFactory("OffchainBinaryMarket");
  const binaryTemplate = await OffchainBinaryMarket.deploy();
  await binaryTemplate.waitForDeployment();
  const binaryMarketTemplateAddress = await binaryTemplate.getAddress();
  console.log(`OffchainBinaryMarket template deployed to: ${binaryMarketTemplateAddress}`);

  // 5. Register template
  const templateId = hre.ethers.id("OFFCHAIN_BINARY_V1");
  await marketFactory.registerTemplate(templateId, binaryMarketTemplateAddress, "Offchain Binary v1");
  console.log(`OffchainBinaryMarket template registered with ID: ${templateId}`);

  // 6. Create a new OffchainBinaryMarket instance (fee=0 per requirement)
  const feeBps = 0;
  const resolutionTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const data = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [outcomeToken1155Address]);

  const tx = await marketFactory.createMarket(
    templateId,
    collateralTokenAddress,
    umaAdapterAddress,
    feeBps,
    resolutionTime,
    data
  );
  const receipt = await tx.wait();
  const log = receipt.logs.find((l: any) => {
    try {
      return marketFactory.interface.parseLog(l).name === "MarketCreated";
    } catch {
      return false;
    }
  });
  const parsed = log ? marketFactory.interface.parseLog(log) : null;
  const marketAddress = parsed ? (parsed.args.market ?? parsed.args[1]) : undefined;
  console.log(`New OffchainBinaryMarket created at: ${marketAddress}`);

  // 7. Grant MINTER_ROLE to the new market
  if (marketAddress) {
    await outcomeToken1155.grantMinter(marketAddress);
    console.log(`MINTER_ROLE granted to market: ${marketAddress}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployerAddress,
    outcomeToken1155: outcomeToken1155Address,
    marketFactory: marketFactoryAddress,
    umaOracleAdapterV2: umaAdapterAddress,
    offchainBinaryTemplate: binaryMarketTemplateAddress,
    createdMarket: marketAddress,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync("deployment_optimized.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Optimized deployment information saved to deployment_optimized.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
