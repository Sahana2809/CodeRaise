const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying CodeRaise contracts...\n");

  // Deploy CampaignFactory (which includes reputation system)
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ CampaignFactory deployed to: ${factoryAddress}`);

  // Log deployment info
  const [deployer] = await hre.ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network:  ${hre.network.name}`);
  console.log(`\n📋 Save this address for frontend configuration!`);
  console.log(`   VITE_FACTORY_ADDRESS=${factoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
