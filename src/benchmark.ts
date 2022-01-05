import { Keyring } from "@polkadot/keyring";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import BN from "bn.js";
import { exec, spawn } from "child_process";
import Big from "big.js";

var argv = require("minimist")(process.argv.slice(2));
let WS_URL = argv.url ? argv.url : "ws://localhost:9944";
let TOTAL_PROCESS = argv.process ? argv.process : 10;
let MAIN_WALLET = argv.main_wallet ? argv.main_wallet : "//Alice//stash";
let SETUP_PROCESS = argv.setup_process ? argv.setup_process : false;
let SCALE = argv.scale ? argv.scale : 100;
let TOTAL_THREADS = argv.total_threads ? argv.total_threads : 10;
let TOTAL_TRANSACTIONS = argv.total_transactions
  ? argv.total_transactions
  : 10000;
let childProcesses = [];

async function main() {
  let provider = new WsProvider(WS_URL);
  let api = await ApiPromise.create({ provider });
  let keyring = new Keyring({ type: "sr25519" });
  let mainWallet = keyring.addFromUri(MAIN_WALLET);

  if (SETUP_PROCESS) {
    console.log("Setup processes...");

    const freeBalance = await (
      await api.query.system.account(mainWallet.address)
    ).data.free;

    let balanceForEachProcess = new Big(freeBalance.toString())
      .mul("0.5")
      .div(TOTAL_PROCESS);

    let mainWalletNonce = (
      await api.query.system.account(mainWallet.address)
    ).nonce.toNumber();

    const tasks = [];
    console.log("Transfer from main process wallet to child process wallet...");

    for (let i = 1; i <= TOTAL_PROCESS; ++i) {
      let processWallet = keyring.addFromUri(`//Alice//stash${i}`);

      console.log(
        `Transfer ${balanceForEachProcess.toString()} child process wallet ${i}...`
      );

      const transfer = api.tx.balances.transfer(
        processWallet.address,
        new BN(balanceForEachProcess.toFixed())
      );

      const task = new Promise((resolve, reject) => {
        transfer
          .signAndSend(mainWallet, { nonce: mainWalletNonce }, ({ status }) => {
            if (status.isFinalized) {
              resolve({});
            }
          })
          .catch(reject);
      });

      tasks.push(task);

      mainWalletNonce++;
    }

    await Promise.all(tasks);

    console.log(
      `Transfer from main process wallet to child process wallet... done`
    );
  }

  let finishedProcess = 0;

  for (let i = 1; i <= TOTAL_PROCESS; ++i) {
    console.log(`Spawning process ${i}...`);
    const childProcess = spawn(`node`, [
      "dist/index.js",
      `--scale`,
      SCALE,
      `--total_threads`,
      TOTAL_THREADS,
      `--salt`,
      i,
      `--total_transactions`,
      TOTAL_TRANSACTIONS,
      `--account`,
      `//Alice//stash${i}`,
    ]);

    childProcess.stdout.on("data", (data) => {
      console.log(`Process ${i}: ${data.toString()}`);
    });

    childProcess.on("exit", () => {
      finishedProcess++;
      if (finishedProcess === TOTAL_PROCESS) {
        process.exit(0);
      }
    });

    childProcesses.push(childProcess);
  }
}

process.on("SIGINT", () => {
  console.log("Ctrl+C SIGINT");
  childProcesses.forEach((p) => p.kill("SIGINT"));
});

process.on("SIGTERM", () => {
  console.log("Ctrl+C SIGTERM");
  childProcesses.forEach((p) => p.kill("SIGTERM"));
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
