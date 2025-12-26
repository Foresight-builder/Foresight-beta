/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

function getUSDC(chainId: number, env: NodeJS.ProcessEnv) {
  return (
    env.COLLATERAL_TOKEN_ADDRESS ||
    (chainId === 137 ? env.USDC_ADDRESS_POLYGON || env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON : "") ||
    (chainId === 80002 ? env.USDC_ADDRESS_AMOY || env.NEXT_PUBLIC_USDC_ADDRESS_AMOY : "") ||
    (chainId === 11155111 ? env.USDC_ADDRESS_SEPOLIA || env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA : "") ||
    (chainId === 1337
      ? env.USDC_ADDRESS_LOCALHOST || env.NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST
      : "") ||
    env.USDC_ADDRESS ||
    env.NEXT_PUBLIC_USDC_ADDRESS ||
    ""
  );
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const env = process.env;

  const usdc = getUSDC(chainId, env);
  if (!usdc) {
    throw new Error(
      `Missing USDC collateral address for chainId ${chainId}. Set COLLATERAL_TOKEN_ADDRESS or USDC_ADDRESS_*.`
    );
  }

  const umaOO =
    env.UMA_OO_V3_ADDRESS || env.UMA_OPTIMISTIC_ORACLE_ADDRESS || env.ORACLE_ADDRESS || "";
  if (!umaOO) {
    throw new Error("Missing UMA_OO_V3_ADDRESS env (UMA Optimistic Oracle V3 address).");
  }

  // Deploy OutcomeToken1155
  const OutcomeToken1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
  const outcome1155 = await OutcomeToken1155.deploy();
  await outcome1155.waitForDeployment();
  await outcome1155.initialize("");
  const outcome1155Address = await outcome1155.getAddress();
  console.log("OutcomeToken1155:", outcome1155Address);

  // Deploy UMAOracleAdapterV2
  const UMAOracleAdapterV2 = await hre.ethers.getContractFactory("UMAOracleAdapterV2");
  const reporter = env.UMA_REPORTER_ADDRESS || deployerAddress;
  const umaAdapter = await UMAOracleAdapterV2.deploy(umaOO, usdc, deployerAddress, reporter);
  await umaAdapter.waitForDeployment();
  const umaAdapterAddress = await umaAdapter.getAddress();
  console.log("UMAOracleAdapterV2:", umaAdapterAddress, "reporter:", reporter);

  // Deploy MarketFactory + initialize defaultOracle = UMA adapter
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const mf = await MarketFactory.deploy();
  await mf.waitForDeployment();
  await mf.initialize(deployerAddress, umaAdapterAddress);
  const mfAddress = await mf.getAddress();
  console.log("MarketFactory:", mfAddress);

  // Deploy templates
  const OffchainBinaryMarket = await hre.ethers.getContractFactory("OffchainBinaryMarket");
  const binImpl = await OffchainBinaryMarket.deploy();
  await binImpl.waitForDeployment();
  const binImplAddress = await binImpl.getAddress();
  console.log("OffchainBinaryMarket impl:", binImplAddress);

  const OffchainMultiMarket8 = await hre.ethers.getContractFactory("OffchainMultiMarket8");
  const multiImpl = await OffchainMultiMarket8.deploy();
  await multiImpl.waitForDeployment();
  const multiImplAddress = await multiImpl.getAddress();
  console.log("OffchainMultiMarket8 impl:", multiImplAddress);

  // Register templates
  const templateBinary = hre.ethers.id("OFFCHAIN_BINARY_V1");
  const templateMulti = hre.ethers.id("OFFCHAIN_MULTI8_V1");
  await (await mf.registerTemplate(templateBinary, binImplAddress, "Offchain Binary v1")).wait();
  await (await mf.registerTemplate(templateMulti, multiImplAddress, "Offchain Multi(<=8) v1")).wait();

  // Create example markets
  const now = Math.floor(Date.now() / 1000);
  const resolutionTime = env.MARKET_RESOLUTION_TS ? Number(env.MARKET_RESOLUTION_TS) : now + 7 * 24 * 3600;
  const feeBps = 0;

  // Binary: data = abi.encode(outcome1155)
  const dataBin = new hre.ethers.AbiCoder().encode(["address"], [outcome1155Address]);
  const receiptBin = await (await mf.createMarket(templateBinary, usdc, umaAdapterAddress, feeBps, resolutionTime, dataBin)).wait();
  const createdBinLog = receiptBin.logs.find((l: any) => {
    try { return mf.interface.parseLog(l).name === "MarketCreated"; } catch { return false; }
  });
  const createdBinParsed = createdBinLog ? mf.interface.parseLog(createdBinLog) : null;
  const binaryMarket = createdBinParsed ? (createdBinParsed.args.market ?? createdBinParsed.args[1]) : undefined;
  console.log("Created binary market:", binaryMarket);

  // Multi: data = abi.encode(outcome1155, uint8 outcomeCount)
  const outcomeCount = Math.max(2, Math.min(8, env.OUTCOME_COUNT ? Number(env.OUTCOME_COUNT) : 3));
  const dataMulti = new hre.ethers.AbiCoder().encode(["address", "uint8"], [outcome1155Address, outcomeCount]);
  const receiptMulti = await (await mf.createMarket(templateMulti, usdc, umaAdapterAddress, feeBps, resolutionTime, dataMulti)).wait();
  const createdMultiLog = receiptMulti.logs.find((l: any) => {
    try { return mf.interface.parseLog(l).name === "MarketCreated"; } catch { return false; }
  });
  const createdMultiParsed = createdMultiLog ? mf.interface.parseLog(createdMultiLog) : null;
  const multiMarket = createdMultiParsed ? (createdMultiParsed.args.market ?? createdMultiParsed.args[1]) : undefined;
  console.log("Created multi market:", multiMarket, "outcomeCount:", outcomeCount);

  // Grant MINTER_ROLE to markets
  if (binaryMarket) await (await outcome1155.grantMinter(binaryMarket)).wait();
  if (multiMarket) await (await outcome1155.grantMinter(multiMarket)).wait();

  const deploymentInfo = {
    network: hre.network.name,
    chainId,
    deployer: deployerAddress,
    collateralUSDC: usdc,
    outcome1155: outcome1155Address,
    umaOOv3: umaOO,
    umaAdapterV2: umaAdapterAddress,
    marketFactory: mfAddress,
    templates: { offchainBinary: binImplAddress, offchainMulti8: multiImplAddress },
    markets: { binary: binaryMarket, multi: multiMarket, multiOutcomeCount: outcomeCount },
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment_offchain_sprint1.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Saved deployment_offchain_sprint1.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


