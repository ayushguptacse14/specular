import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Manifest } from "@openzeppelin/upgrades-core";
import { exec } from "child_process";
import util from "util";
import path from "path";

const CLIENT_SBIN_DIR = "../clients/geth/specular/sbin";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers, upgrades, network } = hre;
  const { save } = deployments;
  const { sequencer, deployer } = await getNamedAccounts();
  const deployerSigner = await ethers.getSigner(deployer);
  const { provider } = network;
  const execPromise = util.promisify(exec);

  const sequencerInboxProxyAddress = (await deployments.get("SequencerInbox"))
    .address;
  const verifierProxyAddress = (await deployments.get("Verifier")).address;

  try {
    const { stdout: pwdOutput } = await execPromise("pwd && ls -la");
    console.log("initial VM hash path is:",pwdOutput);
    const { stdout: pwdOutput1 } = await execPromise("cd ../clients && pwd && ls -la");
    console.log("initial VM hash path 1 is:",pwdOutput1);

    const { stdout } = await execPromise(
      path.join(CLIENT_SBIN_DIR, "export_genesis.sh")
    );
    const initialVmHash = JSON.parse(stdout).root;

    if (!initialVmHash) {
      throw Error("could not export genesis hash");
    }

    console.log("initial VM hash:", initialVmHash);

    const rollupArgs = [
      sequencer, // address _vault
      sequencerInboxProxyAddress, // address _sequencerInbox
      verifierProxyAddress, // address _verifier
      5, // uint256 _confirmationPeriod
      0, // uint256 _challengePeriod
      0, // uint256 _minimumAssertionPeriod
      0, // uint256 _baseStakeAmount
      0, // uint256 _initialAssertionID
      0, // uint256 _initialInboxSize
      initialVmHash, // bytes32_initialVMhash
    ];

    const Rollup = await ethers.getContractFactory("Rollup", deployer);
    const rollup = await upgrades.deployProxy(Rollup, rollupArgs, {
      initializer: "initialize",
      timeout: 0,
      kind: "uups",
    });

    await rollup.deployed();
    console.log("Rollup Proxy:", rollup.address);
    console.log(
      "Rollup Implementation Address",
      await upgrades.erc1967.getImplementationAddress(rollup.address)
    );
    console.log(
      "Rollup Admin Address",
      await upgrades.erc1967.getAdminAddress(rollup.address)
    );

    const artifact = await deployments.getExtendedArtifact("Rollup");
    const proxyDeployments = {
      address: rollup.address,
      ...artifact,
    };
    await save("Rollup", proxyDeployments);
  } catch (err) {
    console.error("Error while exporting genesis hash:", err);
  }
};

export default func;
func.tags = ["Rollup"];
