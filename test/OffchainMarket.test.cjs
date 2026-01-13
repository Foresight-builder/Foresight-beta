const { expect } = require("chai");

describe("OffchainBinaryMarket Test (CJS)", function () {
  let admin, user1, user2;
  let marketFactory, offchainBinaryMarketImpl, marketAddress, market;
  let outcomeToken1155, manualOracle, mockERC20;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();

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
    // OffchainBinaryMarket only requires outcome1155 address in data
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
  });

  it("should create market successfully", async function () {
    // Verify market was created with correct parameters
    expect(await market.oracle()).to.equal(await manualOracle.getAddress());
    expect(await market.collateral()).to.equal(await mockERC20.getAddress());
  });

  it("should allow minting complete set", async function () {
    const mintAmount = ethers.parseEther("1");
    const depositAmount = 1000000n; // 1 mUSD

    // Mint collateral to user1
    await (await mockERC20.mint(await user1.getAddress(), depositAmount)).wait();
    await (await mockERC20.connect(user1).approve(await market.getAddress(), depositAmount)).wait();

    // Mint complete set
    await (await market.connect(user1).mintCompleteSet(mintAmount)).wait();

    // Verify outcome tokens were minted
    const yesTokenId = await outcomeToken1155.computeTokenId(await market.getAddress(), 0);
    const noTokenId = await outcomeToken1155.computeTokenId(await market.getAddress(), 1);
    
    expect(await outcomeToken1155.balanceOf(await user1.getAddress(), yesTokenId)).to.equal(mintAmount);
    expect(await outcomeToken1155.balanceOf(await user1.getAddress(), noTokenId)).to.equal(mintAmount);
  });

  it("should allow resolving market", async function () {
    // Set oracle answer
    await (await manualOracle.setOutcome(1)).wait();

    // Increase time to resolution time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Resolve market
    await (await market.resolve()).wait();

    // Verify market status
    expect(await market.state()).to.equal(1); // STATE.RESOLVED = 1
    expect(await market.resolvedOutcome()).to.equal(1);
  });

  it("should allow redeeming outcome tokens after resolution", async function () {
    const mintAmount = ethers.parseEther("1");
    const depositAmount = 1000000n;

    // Mint collateral to user1
    await (await mockERC20.mint(await user1.getAddress(), depositAmount)).wait();
    await (await mockERC20.connect(user1).approve(await market.getAddress(), depositAmount)).wait();

    // Mint complete set
    await (await market.connect(user1).mintCompleteSet(mintAmount)).wait();

    // Set oracle answer to YES (1)
    await (await manualOracle.setOutcome(1)).wait();

    // Increase time to resolution time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Resolve market
    await (await market.resolve()).wait();

    // Get token IDs
    const yesTokenId = await outcomeToken1155.computeTokenId(await market.getAddress(), 0);
    const noTokenId = await outcomeToken1155.computeTokenId(await market.getAddress(), 1);

    // Approve market to spend outcome tokens
    await (await outcomeToken1155.connect(user1).setApprovalForAll(await market.getAddress(), true)).wait();

    // Redeem winning tokens (using redeem method)
    await (await market.connect(user1).redeem(mintAmount)).wait();

    // Verify user received collateral
    const user1Balance = await mockERC20.balanceOf(await user1.getAddress());
    expect(user1Balance).to.be.greaterThan(0n);
  });
});

describe("OffchainMultiMarket8 Test (CJS)", function () {
  let admin, user1;
  let marketFactory, offchainMultiMarket8Impl, marketAddress, market;
  let outcomeToken1155, manualOracle, mockERC20;

  beforeEach(async function () {
    [admin, user1] = await ethers.getSigners();

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

    // Deploy OffchainMultiMarket8 implementation
    const OffchainMultiMarket8 = await ethers.getContractFactory("OffchainMultiMarket8");
    offchainMultiMarket8Impl = await OffchainMultiMarket8.deploy();
    await offchainMultiMarket8Impl.waitForDeployment();

    // Register template
    const templateId = ethers.id("OFFCHAIN_MULTI_V1");
    await (await marketFactory.registerTemplate(templateId, await offchainMultiMarket8Impl.getAddress(), "Offchain Multi v1")).wait();

    // Create market
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const resolutionTime = now + 3600;
    // OffchainMultiMarket8 requires both outcome1155 and outcomeCount in data
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint8"], [await outcomeToken1155.getAddress(), 4]); // 4 outcomes
    
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
    market = await ethers.getContractAt("OffchainMultiMarket8", marketAddress);

    // Grant minter role to market
    await (await outcomeToken1155.grantMinter(marketAddress)).wait();
  });

  it("should create multi market successfully", async function () {
    // Verify market was created with correct parameters
    expect(await market.factory()).to.equal(await marketFactory.getAddress());
    expect(await market.oracle()).to.equal(await manualOracle.getAddress());
  });

  it("should allow minting complete set for multi market", async function () {
    const mintAmount = ethers.parseEther("1");
    const depositAmount = 1000000n;

    // Mint collateral to user1
    await (await mockERC20.mint(await user1.getAddress(), depositAmount)).wait();
    await (await mockERC20.connect(user1).approve(await market.getAddress(), depositAmount)).wait();

    // Mint complete set
    await (await market.connect(user1).mintCompleteSet(mintAmount)).wait();

    // Verify outcome tokens were minted for all outcomes (0-3, since we set outcomeCount=4)
    for (let i = 0; i < 4; i++) {
      const tokenId = await outcomeToken1155.computeTokenId(await market.getAddress(), i);
      expect(await outcomeToken1155.balanceOf(await user1.getAddress(), tokenId)).to.equal(mintAmount);
    }
  });
});
