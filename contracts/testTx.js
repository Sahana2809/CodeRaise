const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account:", deployer.address);
  const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const factory = await ethers.getContractAt("CampaignFactory", factoryAddress);
  
  const title = "Decentralized Editor";
  const desc = "Decentralized markdown editor with IPFS backup";
  const goal = ethers.parseEther("2");
  const deadline = Math.floor(Date.now() / 1000) + (30 * 86400);
  const milestones = 2;
  const github = "https://github.com/facebook/react";
  const img = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600";
  
  try {
    const tx = await factory.createCampaign(title, desc, goal, deadline, milestones, github, img);
    console.log("Success! TX Hash:", tx.hash);
    await tx.wait();
  } catch(e) {
    console.error("Revert reason:", e.message);
  }
}
main().catch(console.error);
