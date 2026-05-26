const { ethers } = require("hardhat");

async function main() {
  const campaignAddress = "0xa16e02e87b7454126e5e10d957a927a7f5b5d2be"; // Lowercase fixes checksum issues in JS
  const funderAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const Campaign = await ethers.getContractFactory("Campaign");
  const campaign = Campaign.attach(campaignAddress);
  
  const contribution = await campaign.contributions(funderAddress);
  console.log("Funder contribution:", ethers.formatEther(contribution));
  
  const [addrs, amounts] = await campaign.getContributors();
  console.log("All contributors:", addrs);
  console.log("All amounts:", amounts.map(a => ethers.formatEther(a)));
}

main().catch(console.error);
