const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const env = process.env;
  const oracle = env.ORACLE_ADDRESS || deployerAddress;
  const userAddr = String(env.MINT_TO || "0xC14eE1A093c5B715d5aC2E7F9bAEf1a50dB86148").toLowerCase();

  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const mf = await MarketFactory.deploy();
  await mf.waitForDeployment();
  await mf.initialize(deployerAddress, oracle);
  const mfAddress = await mf.getAddress();
  console.log("MarketFactory:", mfAddress);

  const MultiFactory = await hre.ethers.getContractFactory("MultiOutcomeMarket1155");
  const multiImpl = await MultiFactory.deploy();
  await multiImpl.waitForDeployment();
  const multiImplAddress = await multiImpl.getAddress();
  console.log("MultiOutcomeMarket1155 implementation:", multiImplAddress);

  const templateIdMulti = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MULTI"));
  {
    const t = await mf.getTemplate(templateIdMulti);
    if (!t.exists) {
      const txReg = await mf.registerTemplate(templateIdMulti, multiImplAddress, "MultiOutcome1155");
      await txReg.wait();
      console.log("Registered MULTI template");
    } else {
      console.log("MULTI template already registered:", t.implementation);
    }
  }

  const Outcome1155Factory = await hre.ethers.getContractFactory("OutcomeToken1155");
  const outcome1155 = await Outcome1155Factory.deploy();
  await outcome1155.waitForDeployment();
  await outcome1155.initialize("");
  const outcome1155Address = await outcome1155.getAddress();
  console.log("OutcomeToken1155:", outcome1155Address);

  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  let collateral = env.COLLATERAL_TOKEN_ADDRESS;
  if (!collateral) {
    if (chainId === 137) collateral = env.USDT_ADDRESS_POLYGON || env.NEXT_PUBLIC_USDT_ADDRESS_POLYGON || "";
    else if (chainId === 80002) collateral = env.USDT_ADDRESS_AMOY || env.NEXT_PUBLIC_USDT_ADDRESS_AMOY || "";
    else if (chainId === 11155111) collateral = env.USDT_ADDRESS_SEPOLIA || env.NEXT_PUBLIC_USDT_ADDRESS_SEPOLIA || "";
    else if (chainId === 1337) collateral = env.USDT_ADDRESS_LOCALHOST || env.NEXT_PUBLIC_USDT_ADDRESS_LOCALHOST || env.COLLATERAL_TOKEN_ADDRESS || "";
    else collateral = env.USDT_ADDRESS || env.NEXT_PUBLIC_USDT_ADDRESS || env.COLLATERAL_TOKEN_ADDRESS || "";
  }
  if (!collateral) {
    const MockERC20Factory = await hre.ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20Factory.deploy("USDT", "USDT");
    await usdt.waitForDeployment();
    collateral = await usdt.getAddress();
    const amt = hre.ethers.parseUnits("1000000", 6);
    await usdt.mint(userAddr, amt);
    console.log("Mock USDT deployed:", collateral, "minted to", userAddr);
  }

  const feeBps = env.MARKET_FEE_BPS ? Number(env.MARKET_FEE_BPS) : 30; // 0.30%
  const now = Math.floor(Date.now() / 1000);
  const resolutionTime = env.MARKET_RESOLUTION_TS ? Number(env.MARKET_RESOLUTION_TS) : (now + 7 * 24 * 3600);
  const outcomeCount = env.OUTCOME_COUNT ? Number(env.OUTCOME_COUNT) : 3;
  const data = new hre.ethers.AbiCoder().encode(["address", "uint256"], [outcome1155Address, outcomeCount]);

  const txCreate = await mf.createMarket(templateIdMulti, collateral, feeBps, resolutionTime, data);
  const receipt = await txCreate.wait();

  const iface = mf.interface;
  const log = receipt.logs.find((l) => { try { return iface.parseLog(l).name === "MarketCreated"; } catch (_) { return false; } });
  let createdMarket;
  if (log) {
    const parsed = iface.parseLog(log);
    createdMarket = parsed.args.market ?? parsed.args[1];
    console.log("MarketCreated (MULTI):", {
      marketId: parsed.args.marketId?.toString?.() ?? parsed.args[0].toString(),
      market: createdMarket,
      collateralToken: parsed.args.collateralToken ?? parsed.args[4],
      feeBps: parsed.args.feeBps?.toString?.() ?? parsed.args[6].toString(),
      resolutionTime: parsed.args.resolutionTime?.toString?.() ?? parsed.args[7].toString(),
    });
  } else {
    console.log("Multi market created. Tx:", receipt.hash);
  }

  if (createdMarket) {
    const MINTER_ROLE = await outcome1155.MINTER_ROLE();
    const hasRole = await outcome1155.hasRole(MINTER_ROLE, createdMarket);
    if (!hasRole) {
      const txGrant = await outcome1155.grantMinter(createdMarket);
      await txGrant.wait();
      console.log("Granted MINTER_ROLE to market:", createdMarket);
    }
  }

  const info = {
    network: chainId,
    deployer: deployerAddress,
    marketFactory: mfAddress,
    multiImpl: multiImplAddress,
    outcome1155: outcome1155Address,
    collateral,
    market: createdMarket,
    oracle,
    feeBps,
    resolutionTime,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment_amoy.json", JSON.stringify(info, null, 2));
  console.log("Saved deployment to deployment_amoy.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});