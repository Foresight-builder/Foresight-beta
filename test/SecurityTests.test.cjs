const { expect } = require("chai");

/**
 * 安全测试：针对智能合约的各种攻击场景
 */
describe("Smart Contract Security Tests", function () {
  let admin, attacker, user1;
  let marketFactory, offchainBinaryMarketImpl, marketAddress, market;
  let outcomeToken1155, manualOracle, mockERC20;

  beforeEach(async function () {
    [admin, attacker, user1] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("MockUSD", "mUSD");
    await mockERC20.waitForDeployment();

    // Deploy OutcomeToken1155
    const OutcomeToken1155 = await ethers.getContractFactory("OutcomeToken1155");
    outcomeToken1155 = await OutcomeToken1155.deploy();
    await outcomeToken1155.waitForDeployment();
    await outcomeToken1155.initialize("");

    // Deploy ManualOracle
    const ManualOracle = await ethers.getContractFactory("ManualOracle");
    manualOracle = await ManualOracle.deploy(await admin.getAddress());
    await manualOracle.waitForDeployment();

    // Deploy MarketFactory
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    marketFactory = await MarketFactory.deploy();
    await marketFactory.waitForDeployment();
    await marketFactory.initialize(await admin.getAddress(), await manualOracle.getAddress());

    // Deploy OffchainBinaryMarket implementation
    const OffchainBinaryMarket = await ethers.getContractFactory("OffchainBinaryMarket");
    offchainBinaryMarketImpl = await OffchainBinaryMarket.deploy();
    await offchainBinaryMarketImpl.waitForDeployment();

    // Register template
    const templateId = ethers.id("OFFCHAIN_BINARY_V1");
    await (await marketFactory.registerTemplate(templateId, await offchainBinaryMarketImpl.getAddress(), "Offchain Binary v1")).wait();

    // Create market
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const resolutionTime = now + 3600;
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await outcomeToken1155.getAddress()]);
    
    const txCreate = await marketFactory["createMarket(bytes32,address,address,uint256,uint256,bytes)"](
      templateId,
      await mockERC20.getAddress(),
      await manualOracle.getAddress(),
      0,
      resolutionTime,
      data
    );
    
    const receipt = await txCreate.wait();
    const created = receipt.logs
      .map((l) => {
        try {
          return marketFactory.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((x) => x && x.name === "MarketCreated");
    
    marketAddress = created.args.market;
    market = await ethers.getContractAt("OffchainBinaryMarket", marketAddress);

    // Grant minter role to market
    await (await outcomeToken1155.grantMinter(marketAddress)).wait();

    // Mint collateral to users
    await (await mockERC20.mint(await user1.getAddress(), 1000000n)).wait();
    await (await mockERC20.mint(await attacker.getAddress(), 1000000n)).wait();
  });

  it("should validate outcome indices when computing token ids", async function () {
    // This should fail due to invalid outcome index
    await expect(
      market.outcomeTokenId(10) // Invalid outcome index for binary market
    ).to.be.revertedWithCustomError(market, "InvalidOutcomeIndex");
  });

  it("should prevent expired orders", async function () {
    // Skip this test for now as we need to implement order filling first
    this.skip();
  });

  it("should prevent resolution before resolution time", async function () {
    // This should fail because resolution time hasn't been reached
    await expect(
      market.resolve()
    ).to.be.revertedWithCustomError(market, "ResolutionTimeNotReached");
  });

  it("should prevent unauthorized resolution", async function () {
    // Increase time to resolution time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // This should fail because only admin/creator can resolve
    await expect(
      market.connect(attacker).resolve()
    ).to.be.reverted;
  });

  it("should ensure proper access control for pause functions", async function () {
    // Only admin/creator should be able to pause the market
    await expect(
      market.connect(attacker).pause()
    ).to.be.reverted;

    // Only admin/creator should be able to unpause the market
    await expect(
      market.connect(attacker).unpause()
    ).to.be.reverted;
  });

  it("should prevent zero value minting", async function () {
    // Should fail to mint 0 amount
    await expect(
      market.mintCompleteSet(0)
    ).to.be.revertedWithCustomError(market, "InvalidAmount");
  });

  it("should enforce share granularity requirements", async function () {
    // Should fail to mint with invalid granularity
    await expect(
      market.mintCompleteSet(1) // Not a multiple of 1e12
    ).to.be.revertedWithCustomError(market, "InvalidShareGranularity");
  });

  it("should not allow unauthorized invalidation", async function () {
    // Only admin/creator should be able to invalidate the market
    await expect(
      market.connect(attacker).invalidate()
    ).to.be.reverted;
  });

  it("should implement proper access control for order cancellation", async function () {
    // Skip this test for now as we need to implement order filling first
    this.skip();
  });

  it("should verify state transitions", async function () {
    // Initial state should be TRADING
    expect(await market.state()).to.equal(0); // State.TRADING = 0
    
    // Can't resolve yet (resolution time not reached)
    await expect(
      market.resolve()
    ).to.be.revertedWithCustomError(market, "ResolutionTimeNotReached");
  });

  it("should prevent invalid oracle outcome", async function () {
    // Skip this test for now as we need to implement oracle functionality
    this.skip();
  });
});
