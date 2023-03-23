import rollupJson from "../deployments/localhost/Rollup.json";
import sequencerInboxJson from "../deployments/localhost/SequencerInbox.json";
import { Wallet, utils, ethers, BigNumber } from "ethers";
import assert from "assert";
import fs from "fs";

const ROOT_DIR = __dirname + "/../../";

const sequencerPrivateKeyPath =
  ROOT_DIR + "clients/geth/specular/data/keys/sequencer.prv";
const validatorPrivateKeyPath =
  ROOT_DIR + "clients/geth/specular/data/keys/validator.prv";

const l2Provider = new ethers.providers.JsonRpcProvider(
  "http://localhost:4011"
);

const l1Provider = new ethers.providers.JsonRpcProvider(
  "http://localhost:8545"
);

// Setup signers
export async function setupSigners(
  sequencerPrivateKeyPath: string,
  validatorPrivateKeyPath: string
) {
  const sequencerPrivateKey = fs.readFileSync(sequencerPrivateKeyPath, "utf8");
  const sequencerSigner = new Wallet(sequencerPrivateKey, l2Provider);

  const validatorPrivateKey = fs.readFileSync(validatorPrivateKeyPath, "utf8");
  const validatorSigner = new Wallet(validatorPrivateKey, l2Provider);

  return {
    sequencerSigner,
    validatorSigner,
  };
}

// Initialize contracts and event filters
function initializeContracts(
  sequencerContractAddress: string,
  sequencerContractAbi: any,
  rollupContractAddress: string,
  rollupContractAbi: any
) {
  const sequencerContract = new ethers.Contract(
    sequencerContractAddress,
    sequencerContractAbi,
    l1Provider
  );
  const rollupContract = new ethers.Contract(
    rollupContractAddress,
    rollupContractAbi,
    l1Provider
  );

  const appendTxFilter = sequencerContract.filters.TxBatchAppended();
  const assertionCreatedFilter = rollupContract.filters.AssertionCreated();
  const assertionConfirmedFilter = rollupContract.filters.AssertionConfirmed();

  return {
    sequencerContract,
    rollupContract,
    appendTxFilter,
    assertionCreatedFilter,
    assertionConfirmedFilter,
  };
}

// Send a tx
async function sendTx(sequencerSigner: any, toAddress: any, value: number) {
  const nonce = await l2Provider.getTransactionCount(sequencerSigner.address);

  const txData = {
    to: toAddress,
    value: value,
    nonce: nonce,
  };

  const txResponse = await sequencerSigner.sendTransaction(txData);
  await txResponse.wait();

  const txReceipt = await l2Provider.getTransactionReceipt(txResponse.hash);
  assert(txReceipt, "No tx on L2 blockchain");

  return txResponse;
}

// Check logs
async function checkLogs(contract: any, filter: any) {
  const logs = await contract.queryFilter(filter);
  console.log("Logs: ", logs);
  assert(logs.length > 0, "No matching logs found");
}

// test Tx
async function testTx(
  sequencerSigner: any,
  validatorSigner: any,
  sequencerContract: any,
  rollupContract: any,
  appendTxFilter: any,
  assertionCreatedFilter: any,
  assertionConfirmedFilter: any,
  toAddress: any,
  value: any
) {
  const txResponse = await sendTx(sequencerSigner, toAddress, value);

  //await checkLogs(sequencerContract, appendTxFilter);
  await checkLogs(rollupContract, assertionCreatedFilter);
  //await checkLogs(rollupContract, assertionConfirmedFilter);

  return txResponse;
}

// New Test tx flow
async function testTxs(toAddress: string, value: BigNumber) {
  const { sequencerSigner, validatorSigner } = await setupSigners(
    sequencerPrivateKeyPath,
    validatorPrivateKeyPath
  );

  const sequencerContractAddress = sequencerInboxJson.address;
  const rollupContractAddress = rollupJson.address;

  const {
    sequencerContract,
    rollupContract,
    appendTxFilter,
    assertionCreatedFilter,
    assertionConfirmedFilter,
  } = initializeContracts(
    sequencerContractAddress,
    sequencerInboxJson.abi,
    rollupContractAddress,
    rollupJson.abi
  );

  for (let i = 0; i < 1; i++) {
    const res = await testTx(
      sequencerSigner,
      validatorSigner,
      sequencerContract,
      rollupContract,
      appendTxFilter,
      assertionCreatedFilter,
      assertionConfirmedFilter,
      toAddress,
      value
    );
  }
}

// Send multiple Txs
async function sendMultipleTxs() {
  const validatorPrivateKey = fs.readFileSync(validatorPrivateKeyPath, "utf8");
  const validatorSigner = new Wallet(validatorPrivateKey, l2Provider);

  for (let i = 0; i < 1; i++) {
    const res = await testTxs(validatorSigner.address, utils.parseEther("0.1"));
    console.log("Done sending i = ", i);
  }
}

sendMultipleTxs();
