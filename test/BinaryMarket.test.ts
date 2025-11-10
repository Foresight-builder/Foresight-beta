import { expect } from "chai";
import hre from "hardhat";

describe("BinaryMarket with AMM", function () {
    async function deployFixture() {
        const [deployer, user1, user2] = await hre.ethers.getSigners();

        // Deploy mock collateral token
        const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
        const collateral = await MockERC20.deploy("Mock USDT", "USDT", 6);
        await collateral.waitForDeployment();

        // Deploy system contracts
        const OutcomeToken1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
        const outcomeToken1155 = await OutcomeToken1155.deploy();
        await outcomeToken1155.waitForDeployment();

        const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
        const marketFactory = await MarketFactory.deploy(deployer.address);
        await marketFactory.waitForDeployment();

        const ManualOracle = await hre.ethers.getContractFactory("ManualOracle");
        const manualOracle = await ManualOracle.deploy(deployer.address);
        await manualOracle.waitForDeployment();

        const BinaryMarket = await hre.ethers.getContractFactory("BinaryMarket");
        const binaryMarketTemplate = await BinaryMarket.deploy();
        await binaryMarketTemplate.waitForDeployment();

        // Register template
        const templateId = hre.ethers.id("BINARY_MARKET_V1");
        await marketFactory.registerTemplate(templateId, await binaryMarketTemplate.getAddress(), "Binary Market v1");

        // Create market
        const data = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [await outcomeToken1155.getAddress()]);
        const tx = await marketFactory.createMarket(
            templateId,
            await collateral.getAddress(),
            await manualOracle.getAddress(),
            30, // 0.3% fee
            Math.floor(Date.now() / 1000) + 3600,
            data
        );
        const receipt = await tx.wait();
        const marketAddress = receipt.events.find(e => e.event === 'MarketCreated').args.market;
        const market = await hre.ethers.getContractAt("BinaryMarket", marketAddress);

        // Grant minter role
        await outcomeToken1155.grantRole(await outcomeToken1155.MINTER_ROLE(), marketAddress);

        return { market, collateral, outcomeToken1155, manualOracle, deployer, user1, user2 };
    }

    describe("Deployment", function () {
        it("Should set the right oracle", async function () {
            const { market, manualOracle } = await deployFixture();
            expect(await market.oracle()).to.equal(await manualOracle.getAddress());
        });
    });

    // TODO: Add more tests for deposit, addLiquidity, swap, finalize, and redeem
});