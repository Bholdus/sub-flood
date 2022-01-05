## Overview
Flooding substrate node with transactions

To run:

```
# This will generate dist dir which is needed in order for the script to run
yarn run build 
# If you would like to use this script with a network simulation tool like 
# "gurke" create a symlink of index.js of this package in a general purpose dir path
ln -s "$(pwd)"/dist/index.js /usr/local/bin/sub-flood
# Run script with
node dist/benchmark.js --scale 1500 --total_threads 50 --total_transactions 20000 --process 5 --setup_process
```

## Details of the concept
Implemented script does the following:
- Setup process (can be toggled through `--setup_process`):
    - Each process will use a whale wallet that will endow another accounts for benchmarks. This will setup the whale wallet for each process.
- For each process:
    - Derives temporary accounts from a whale account
    - Setups these accounts, transfering existential deposit to them
    - Generates bunch of transactions, transfers from temporary accounts to Alice
    - Sends generated transactions in batches in several threads every second

In order to measure TPS (transactions per seconds) metric script calculates, how many transactions were included into the blocks on the latest step (obviously it will be just a part of all sent transactions) and divides on time of operation.

Script may also try to wait for all sent transactions' finalization (see corresponding startup argument). In this case, script pauses several times, checking every time, if all transactions were finalized.

## Startup arguments
- `total_transactions` - total amount of generated transactions, default is 25000
- `scale` - scaling parameter for spreading all load among threads, default is 100
- `total_threads` - total amount of used threads, default is 10
- `url` - url to RPC node, default is "ws://localhost:9944"
- `finalization` - boolean flag, if true, script should wait for all transactions finalization, default is false
- `finalization_timeout` - amount of time to wait in every attempt, default is 20000 (in ms); screen makes several attempts, so the total waiting time is finalization_timeout * finalization_attempts
- `finalization_attempts` - amount of waiting attempts, default is 5
- `setup_process` - Setup balances for processes before running the benchmarks. Use this flag whenever we benchmark the chain that we haven't run this benchmark before.