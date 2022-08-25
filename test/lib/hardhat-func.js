require("hardhat");

const mineBlockNumber = async (blockNumber) => {
  return rpc({ method: "evm_mineBlockNumber", params: [blockNumber] });
};

const mineBlock = async () => {
  return rpc({ method: "evm_mine" });
};

const increaseTime = async (seconds) => {
  await rpc({ method: "evm_increaseTime", params: [seconds] });
  return rpc({ method: "evm_mine" });
};

// doesn't work with hardhat
const setTime = async (seconds) => {
  await rpc({ method: "evm_setTime", params: [new Date(seconds * 1000)] });
};

// doesn't work with hardhat
const freezeTime = async (seconds) => {
  await rpc({ method: "evm_freezeTime", params: [seconds] });
  return rpc({ method: "evm_mine" });
};

// adapted for both truffle and hardhat
const advanceBlocks = async (blocks) => {
  let currentBlockNumber = await blockNumber();
  for (let i = currentBlockNumber; i < blocks; i++) {
    await mineBlock();
  }
};

const setNextBlockTimestamp = async (timestamp) => {
  await rpc({ method: "evm_setNextBlockTimestamp", params: [timestamp] });
};

const blockNumber = async () => {
  let { result: num } = await rpc({ method: "eth_blockNumber" });
  if (num === undefined) num = await rpc({ method: "eth_blockNumber" });
  return parseInt(num);
};

const lastBlock = async () => {
  return await rpc({
    method: "eth_getBlockByNumber",
    params: ["latest", true],
  });
};

// doesn't work with hardhat
const minerStart = async () => {
  return rpc({ method: "miner_start" });
};

// doesn't work with hardhat
const minerStop = async () => {
  return rpc({ method: "miner_stop" });
};

// adapted to work in both truffle and hardhat
const rpc = async (request) => {
  try {
    return await hre.network.provider.request(request);
  } catch (e) {
    if (typeof hre.network != "undefined") console.error(e);
  }
};

module.exports = {
  advanceBlocks,
  blockNumber,
  lastBlock,
  freezeTime,
  increaseTime,
  mineBlock,
  mineBlockNumber,
  minerStart,
  minerStop,
  rpc,
  setTime,
  setNextBlockTimestamp,
};