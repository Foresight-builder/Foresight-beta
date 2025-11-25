const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const env = process.env;
  const userAddr = String(env.MINT_TO || deployerAddress).toLowerCase();

  // Oracle for CLOB (implements IOracle)
  const ManualOracle = await hre.ethers.getContractFactory("ManualOracle");
  const manual = await ManualOracle.deploy(deployerAddress);
  await manual.waitForDeployment();
  const manualAddr = await manual.getAddress();
  console.log("ManualOracle:", manualAddr);

  // MarketFactory (upgradeable: initialize with UMA/Manual oracle)
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const mf = await MarketFactory.deploy();
  await mf.waitForDeployment();
  await mf.initialize(deployerAddress, manualAddr);
  const mfAddr = await mf.getAddress();
  console.log("MarketFactory:", mfAddr);

  // CLOB template
  const CLOB = await hre.ethers.getContractFactory("CLOBMarket");
  const clobImpl = await CLOB.deploy();
  await clobImpl.waitForDeployment();
  const clobImplAddr = await clobImpl.getAddress();
  console.log("CLOBMarket implementation:", clobImplAddr);

  const templateId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("CLOB"));
  const t = await mf.getTemplate(templateId);
  if (!t.exists) {
    const txReg = await mf.registerTemplate(templateId, clobImplAddr, "CLOB");
    await txReg.wait();
    console.log("Registered CLOB template");
  } else {
    console.log("CLOB template already registered:", t.implementation);
  }

  // Outcome1155: reuse via env or deploy
  let outcome1155Addr = env.OUTCOME1155_ADDRESS || "";
  if (!outcome1155Addr) {
    const Outcome1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
    const outcome1155 = await Outcome1155.deploy();
    await outcome1155.waitForDeployment();
    await outcome1155.initialize("");
    outcome1155Addr = await outcome1155.getAddress();
    console.log("OutcomeToken1155:", outcome1155Addr);
  } else {
    console.log("Using Outcome1155 from env:", outcome1155Addr);
  }

  // Collateral: prefer explicit AMOY USDT env; fallback deploy 6-decimal MockERC20
  const chain = await hre.ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  let collateral = env.USDT_ADDRESS_AMOY || env.NEXT_PUBLIC_USDT_ADDRESS_AMOY || env.COLLATERAL_TOKEN_ADDRESS || "";
  if (!collateral) {
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("USDT", "USDT");
    await usdt.waitForDeployment();
    collateral = await usdt.getAddress();
    const amt = hre.ethers.parseUnits("1000000", 6);
    await usdt.mint(userAddr, amt);
    console.log("Mock USDT deployed:", collateral, "minted to", userAddr);
  }

  // Create market (binary: outcomeCount defaults to 2 when passing only address)
  const feeBps = env.MARKET_FEE_BPS ? Number(env.MARKET_FEE_BPS) : 30;
  const resolutionTime = env.MARKET_RESOLUTION_TS ? Number(env.MARKET_RESOLUTION_TS) : (Math.floor(Date.now()/1000) + 7*24*3600);
  const data = new hre.ethers.AbiCoder().encode(["address"], [outcome1155Addr]);
  const txCreate = await mf.createMarket(templateId, collateral, feeBps, resolutionTime, data);
  const rc = await txCreate.wait();
  const iface = mf.interface;
  const log = rc.logs.find((l) => { try { return iface.parseLog(l).name === "MarketCreated"; } catch(_) { return false; } });
  let marketAddr;
  if (log) {
    const parsed = iface.parseLog(log);
    marketAddr = parsed.args.market ?? parsed.args[1];
    console.log("MarketCreated (CLOB):", {
      marketId: parsed.args.marketId?.toString?.() ?? parsed.args[0].toString(),
      market: marketAddr,
      collateralToken: parsed.args.collateralToken ?? parsed.args[4],
      feeBps: parsed.args.feeBps?.toString?.() ?? parsed.args[6].toString(),
      resolutionTime: parsed.args.resolutionTime?.toString?.() ?? parsed.args[7].toString(),
    });
  } else {
    console.log("CLOB market created. Tx:", rc.hash);
  }

  // Grant MINTER_ROLE to market and start trading
  if (marketAddr) {
    const outcome1155 = await hre.ethers.getContractAt("OutcomeToken1155", outcome1155Addr);
    const MINTER_ROLE = await outcome1155.MINTER_ROLE();
    const hasRole = await outcome1155.hasRole(MINTER_ROLE, marketAddr);
    if (!hasRole) {
      const txGrant = await outcome1155.grantMinter(marketAddr);
      await txGrant.wait();
      console.log("Granted MINTER_ROLE to market:", marketAddr);
    }
    const market = await hre.ethers.getContractAt("CLOBMarket", marketAddr);
    const txStart = await market.startTrading();
    await txStart.wait();
    console.log("Trading started on:", marketAddr);
    const tick = env.TICK_SIZE ? Number(env.TICK_SIZE) : 1;
    const txTick = await market.setTickSize(tick);
    await txTick.wait();
    console.log("Tick size set to:", tick);
  }

  // Save
  const out = {
    network: chainId,
    deployer: deployerAddress,
    manualOracle: manualAddr,
    marketFactory: mfAddr,
    clobImpl: clobImplAddr,
    outcome1155: outcome1155Addr,
    collateral,
    market: marketAddr,
    feeBps,
    resolutionTime,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync("deployment_clob_amoy.json", JSON.stringify(out, null, 2));
  console.log("Saved deployment to deployment_clob_amoy.json");
}

main().catch((err) => { console.error(err); process.exit(1); });