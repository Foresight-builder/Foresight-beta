const { expect } = require("chai");

describe("Timelock Governance Flow (CJS)", function () {
  it("uses timelock for unpause and keeps emergency for pause", async function () {
    const [admin, safe, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateral = await MockERC20.deploy("MockUSD", "mUSD");
    await collateral.waitForDeployment();

    const OutcomeToken1155 = await ethers.getContractFactory("OutcomeToken1155");
    const outcome1155 = await OutcomeToken1155.deploy();
    await outcome1155.waitForDeployment();
    await outcome1155.initialize("");

    const ManualOracle = await ethers.getContractFactory("ManualOracle");
    const oracle = await ManualOracle.deploy(await admin.getAddress());
    await oracle.waitForDeployment();

    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const mf = await MarketFactory.deploy();
    await mf.waitForDeployment();
    await mf.initialize(await admin.getAddress(), await oracle.getAddress());

    const OffchainBinaryMarket = await ethers.getContractFactory("OffchainBinaryMarket");
    const impl = await OffchainBinaryMarket.deploy();
    await impl.waitForDeployment();

    const templateId = ethers.id("OFFCHAIN_BINARY_V1");
    await (await mf.registerTemplate(templateId, await impl.getAddress(), "Offchain Binary v1")).wait();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const resolutionTime = now + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await outcome1155.getAddress()]);

    const txCreate = await mf["createMarket(bytes32,address,address,uint256,uint256,bytes)"](
      templateId,
      await collateral.getAddress(),
      await oracle.getAddress(),
      0,
      resolutionTime,
      data
    );
    await txCreate.wait();

    const marketInfo = await mf.markets(1);
    const marketAddress = marketInfo.market;
    const market = await ethers.getContractAt("OffchainBinaryMarket", marketAddress);

    await (await outcome1155.grantMinter(marketAddress)).wait();

    const Timelock = await ethers.getContractFactory("ForesightTimelock");
    const delay = 3600;
    const timelock = await Timelock.deploy(
      delay,
      [await safe.getAddress()],
      [ethers.ZeroAddress],
      ethers.ZeroAddress
    );
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();

    const ADMIN_ROLE = await mf.DEFAULT_ADMIN_ROLE();
    const EMERGENCY_ROLE = await mf.EMERGENCY_ROLE();

    await (await mf.grantRole(ADMIN_ROLE, timelockAddress)).wait();
    await (await mf.grantRole(EMERGENCY_ROLE, await safe.getAddress())).wait();
    await (await mf.revokeRole(ADMIN_ROLE, await admin.getAddress())).wait();

    await (await mf.connect(safe).pause()).wait();
    expect(await mf.paused()).to.equal(true);

    await expect(mf.connect(safe).unpause()).to.be.reverted;

    const unpauseData = mf.interface.encodeFunctionData("unpause", []);
    const predecessor = ethers.ZeroHash;
    const salt = ethers.id("unpause-factory");

    await (await timelock.connect(safe).schedule(
      await mf.getAddress(),
      0,
      unpauseData,
      predecessor,
      salt,
      delay
    )).wait();

    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await timelock.execute(
      await mf.getAddress(),
      0,
      unpauseData,
      predecessor,
      salt
    )).wait();

    expect(await mf.paused()).to.equal(false);

    await (await mf.connect(safe).pauseMarketById(1)).wait();
    expect(await market.paused()).to.equal(true);

    await expect(mf.connect(attacker).pauseMarketById(1)).to.be.reverted;
    await expect(mf.connect(safe).unpauseMarketById(1)).to.be.reverted;

    const unpauseMarketData = mf.interface.encodeFunctionData("unpauseMarketById", [1]);
    const salt2 = ethers.id("unpause-market-1");

    await (await timelock.connect(safe).schedule(
      await mf.getAddress(),
      0,
      unpauseMarketData,
      predecessor,
      salt2,
      delay
    )).wait();

    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await timelock.execute(
      await mf.getAddress(),
      0,
      unpauseMarketData,
      predecessor,
      salt2
    )).wait();

    expect(await market.paused()).to.equal(false);
  });

  it("supports batch schedule/execute and can revoke emergency role", async function () {
    const [admin, safe] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const collateral = await MockERC20.deploy("MockUSD", "mUSD");
    await collateral.waitForDeployment();

    const OutcomeToken1155 = await ethers.getContractFactory("OutcomeToken1155");
    const outcome1155 = await OutcomeToken1155.deploy();
    await outcome1155.waitForDeployment();
    await outcome1155.initialize("");

    const ManualOracle = await ethers.getContractFactory("ManualOracle");
    const oracle = await ManualOracle.deploy(await admin.getAddress());
    await oracle.waitForDeployment();

    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const mf = await MarketFactory.deploy();
    await mf.waitForDeployment();
    await mf.initialize(await admin.getAddress(), await oracle.getAddress());

    const OffchainBinaryMarket = await ethers.getContractFactory("OffchainBinaryMarket");
    const impl = await OffchainBinaryMarket.deploy();
    await impl.waitForDeployment();

    const templateId = ethers.id("OFFCHAIN_BINARY_V1");
    await (await mf.registerTemplate(templateId, await impl.getAddress(), "Offchain Binary v1")).wait();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const resolutionTime = now + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await outcome1155.getAddress()]);

    await (await mf["createMarket(bytes32,address,address,uint256,uint256,bytes)"](
      templateId,
      await collateral.getAddress(),
      await oracle.getAddress(),
      0,
      resolutionTime,
      data
    )).wait();

    const marketInfo = await mf.markets(1);
    const marketAddress = marketInfo.market;
    const market = await ethers.getContractAt("OffchainBinaryMarket", marketAddress);
    await (await outcome1155.grantMinter(marketAddress)).wait();

    const Timelock = await ethers.getContractFactory("ForesightTimelock");
    const delay = 3600;
    const timelock = await Timelock.deploy(
      delay,
      [await safe.getAddress()],
      [ethers.ZeroAddress],
      ethers.ZeroAddress
    );
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();

    const ADMIN_ROLE = await mf.DEFAULT_ADMIN_ROLE();
    const EMERGENCY_ROLE = await mf.EMERGENCY_ROLE();

    await (await mf.grantRole(ADMIN_ROLE, timelockAddress)).wait();
    await (await mf.grantRole(EMERGENCY_ROLE, await safe.getAddress())).wait();
    await (await mf.revokeRole(ADMIN_ROLE, await admin.getAddress())).wait();

    await (await mf.connect(safe).pause()).wait();
    await (await mf.connect(safe).pauseMarketById(1)).wait();
    expect(await mf.paused()).to.equal(true);
    expect(await market.paused()).to.equal(true);

    const predecessor = ethers.ZeroHash;
    const salt = ethers.id("batch-unpause-and-revoke");

    const unpauseFactoryData = mf.interface.encodeFunctionData("unpause", []);
    const unpauseMarketData = mf.interface.encodeFunctionData("unpauseMarketById", [1]);
    const revokeEmergencyData = mf.interface.encodeFunctionData("revokeRole", [
      EMERGENCY_ROLE,
      await safe.getAddress(),
    ]);

    const targets = [await mf.getAddress(), await mf.getAddress(), await mf.getAddress()];
    const values = [0, 0, 0];
    const datas = [unpauseFactoryData, unpauseMarketData, revokeEmergencyData];

    await (await timelock.connect(safe).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    )).wait();

    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await timelock.executeBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    )).wait();

    expect(await mf.paused()).to.equal(false);
    expect(await market.paused()).to.equal(false);
    expect(await mf.hasRole(EMERGENCY_ROLE, await safe.getAddress())).to.equal(false);

    await expect(mf.connect(safe).pause()).to.be.reverted;
  });
});
