import hardhat from "hardhat";
import fs from "fs";

const { ethers, network } = hardhat;

async function main() {
  console.log("🚀 Deploying DeAsync contract with Hardhat...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

  // Deploy contract
  const DeAsync = await ethers.getContractFactory("DeAsync");
  const deasync = await DeAsync.deploy();

  // ✅ ethers v6 way
  await deasync.waitForDeployment();

  console.log("✅ DeAsync deployed to:", await deasync.getAddress());
  console.log("Network:", network.name);

  const txHash = deasync.deploymentTransaction().hash;
  console.log("Transaction hash:", txHash);

  // Save deployment info
  const deploymentInfo = {
    address: await deasync.getAddress(),
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    transactionHash: txHash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployed-contract.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to deployed-contract.json");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});