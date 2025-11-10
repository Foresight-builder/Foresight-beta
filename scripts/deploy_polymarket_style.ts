/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

async function main() {
    console.log("Deploying Polymarket-style prediction market system...");

    const [deployer] = await hre.ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`Deployer: ${deployerAddress}`);

    // --- UMA Specific Configuration ---
    // IMPORTANT: Replace with the actual UMA Optimistic Oracle address for your target network.
    const UMA_OPTIMISTIC_ORACLE_ADDRESS = "0x9923D42eF695B5dd9911D05Ac944d4cA18D32A73"; // Example for Sepolia

    // 1. Deploy OutcomeToken1155
    const OutcomeToken1155 = await hre.ethers.getContractFactory("OutcomeToken1155");
    const outcomeToken1155 = await OutcomeToken1155.deploy();
    await outcomeToken1155.waitForDeployment();
    const outcomeToken1155Address = await outcomeToken1155.getAddress();
    console.log(`OutcomeToken1155 deployed to: ${outcomeToken1155Address}`);

    // 2. Deploy MarketFactory
    const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
    const marketFactory = await MarketFactory.deploy(deployerAddress); // admin is deployer
    await marketFactory.waitForDeployment();
    const marketFactoryAddress = await marketFactory.getAddress();
    console.log(`MarketFactory deployed to: ${marketFactoryAddress}`);

    // 3. Deploy UMAOracleAdapter
    const UMAOracleAdapter = await hre.ethers.getContractFactory("UMAOracleAdapter");
    const umaOracleAdapter = await UMAOracleAdapter.deploy(UMA_OPTIMISTIC_ORACLE_ADDRESS);
    await umaOracleAdapter.waitForDeployment();
    const umaOracleAdapterAddress = await umaOracleAdapter.getAddress();
    console.log(`UMAOracleAdapter deployed to: ${umaOracleAdapterAddress}`);

    // 4. Deploy BinaryMarket template
    const BinaryMarket = await hre.ethers.getContractFactory("BinaryMarket");
    const binaryMarketTemplate = await BinaryMarket.deploy();
    await binaryMarketTemplate.waitForDeployment();
    const binaryMarketTemplateAddress = await binaryMarketTemplate.getAddress();
    console.log(`BinaryMarket template deployed to: ${binaryMarketTemplateAddress}`);

    // 5. Register BinaryMarket template
    const templateId = hre.ethers.id("BINARY_MARKET_V1");
    await marketFactory.registerTemplate(templateId, binaryMarketTemplateAddress, "Binary Market v1");
    console.log(`BinaryMarket template registered with ID: ${templateId}`);

    // 6. Create a new BinaryMarket instance using the UMA adapter (CPMM)
    const collateralTokenAddress = "0x..."; // Replace with actual ERC20 address
    const feeBps = 30; // 0.3%
    const resolutionTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const cpmmData = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "uint256"],
        [outcomeToken1155Address, 0, 0] // 0 for CPMM, 0 for lmsrB (unused)
    );

    const tx = await marketFactory.createMarket(
        templateId,
        collateralTokenAddress,
        umaOracleAdapterAddress, // Using UMA Oracle Adapter
        feeBps,
        resolutionTime,
        cpmmData
    );
    const receipt = await tx.wait();
    const marketCreatedEvent = receipt.events.find(event => event.event === 'MarketCreated');
    const cpmmMarketAddress = marketCreatedEvent.args.market;
    console.log(`New CPMM BinaryMarket created at: ${cpmmMarketAddress}`);

    // Grant MINTER_ROLE to the new CPMM market
    await outcomeToken1155.grantRole(await outcomeToken1155.MINTER_ROLE(), cpmmMarketAddress);
    console.log(`MINTER_ROLE granted to market: ${cpmmMarketAddress}`);

    // 7. Create a new BinaryMarket instance using the UMA adapter (LMSR)
    const lmsrB = hre.ethers.parseEther("100"); // Liquidity parameter b = 100
    const lmsrData = hre.ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "uint256"],
        [outcomeToken1155Address, 1, lmsrB] // 1 for LMSR
    );

    const tx2 = await marketFactory.createMarket(
        templateId,
        collateralTokenAddress,
        umaOracleAdapterAddress, // Using UMA Oracle Adapter
        feeBps,
        resolutionTime,
        lmsrData
    );
    const receipt2 = await tx2.wait();
    const marketCreatedEvent2 = receipt2.events.find(event => event.event === 'MarketCreated');
    const lmsrMarketAddress = marketCreatedEvent2.args.market;
    console.log(`New LMSR BinaryMarket created at: ${lmsrMarketAddress}`);

    // Grant MINTER_ROLE to the new LMSR market
    await outcomeToken1155.grantRole(await outcomeToken1155.MINTER_ROLE(), lmsrMarketAddress);
    console.log(`MINTER_ROLE granted to market: ${lmsrMarketAddress}`);

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployerAddress,
        outcomeToken1155: outcomeToken1155Address,
        marketFactory: marketFactoryAddress,
        umaOracleAdapter: umaOracleAdapterAddress,
        binaryMarketTemplate: binaryMarketTemplateAddress,
        createdCpmmMarket: cpmmMarketAddress,
        createdLmsrMarket: lmsrMarketAddress,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        "deployment_polymarket_style.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Polymarket-style deployment information saved to deployment_polymarket_style.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});