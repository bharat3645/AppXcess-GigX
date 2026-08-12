require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { ALCHEMY_SEPOLIA_URL, PRIVATE_KEY } = process.env;
// Hardhat validates every configured network's `accounts` field up front,
// even for commands that never touch that network (e.g. `hardhat compile`
// or `hardhat test`). Only wire up a real deploy key when one looks valid,
// so a missing/placeholder PRIVATE_KEY in .env can't break local dev.
const hasValidDeployKey = !!PRIVATE_KEY && /^(0x)?[0-9a-fA-F]{64}$/.test(PRIVATE_KEY);

if (!hasValidDeployKey) {
  console.warn(
    "[hardhat.config.js] PRIVATE_KEY is missing or not a valid 32-byte hex key — " +
    "the `sepolia` network will be unavailable for deployment until you set a real " +
    "key in .env (see .env.example). Compiling and testing locally still works."
  );
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL || "",
      accounts: hasValidDeployKey ? [PRIVATE_KEY] : [],
      timeout: 200000,
    },
  },
};
