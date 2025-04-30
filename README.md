# Task Tokenizer Web App

Welcome to the Task Tokenizer project! This repository contains a full-stack decentralized freelance job marketplace, built with Next.js, Hardhat, and Solidity smart contracts. This guide will walk you through everything you need to know to get started, even if you're new to web development, Ethereum, or Docker.

---

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Running the Frontend](#running-the-frontend)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features
- Decentralized freelance job marketplace
- Ethereum smart contracts for jobs, identity, reputation, and escrow
- Modern Next.js frontend
- Wallet integration (MetaMask, etc.)
- Easy deployment with Docker

---

## Project Structure
```
├── contracts/            # Solidity smart contracts
├── scripts/              # Deployment and utility scripts
├── project/              # Next.js frontend app
│   ├── pages/            # App pages
│   ├── components/       # React components
│   ├── public/           # Static assets
│   └── ...
├── artifacts/            # Compiled contract artifacts (auto-generated)
├── test/                 # Smart contract tests
├── hardhat.config.js     # Hardhat configuration
├── package.json          # Project dependencies
├── Dockerfile            # Docker build instructions (in /project)
└── README.md             # You're here!
```

---

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Docker** (for containerized deployment, optional)
- **Git** (for cloning the repo)
- **MetaMask** or another Ethereum wallet (for interacting with the app)

---

## Getting Started (Local Development)

### 1. Clone the Repository
```sh
git clone https://github.com/your-username/Task-Tokenizer.git
cd Task-Tokenizer
```

### 2. Install Dependencies
#### For the root (smart contracts):
```sh
npm install
```
#### For the frontend (inside `project/`):
```sh
cd project
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in both the root and `project/` directories (as needed):

#### Example `.env` (for smart contracts):
```
ALCHEMY_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key
```

#### Example `.env` (for frontend, in `project/`):
```
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
NEXT_PUBLIC_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

---

## Smart Contract Deployment

1. **Compile contracts:**
   ```sh
   npx hardhat compile
   ```
2. **Deploy contracts to Sepolia testnet:**
   ```sh
   npx hardhat run scripts/deploy.js --network sepolia
   ```
   - The deployed contract addresses will be saved to `deployed-addresses.json`.
   - Copy the relevant address to your frontend `.env` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

---

## Running the Frontend

1. **Start the development server:**
   ```sh
   cd project
   npm run dev
   ```
2. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000) to view the app.

---

## Docker Deployment

1. **Build the Docker image:**
   ```sh
   cd project
   docker build -t task-tokenizer-app .
   ```
2. **Run the Docker container:**
   ```sh
   docker run -p 3000:3000 --env-file .env task-tokenizer-app
   ```
   - The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables
- **Smart contract deployment:**
  - `ALCHEMY_SEPOLIA_URL`: Your Infura/Alchemy endpoint for Sepolia testnet
  - `PRIVATE_KEY`: Private key of your deployment wallet (keep it secret!)
- **Frontend:**
  - `NEXT_PUBLIC_CONTRACT_ADDRESS`: The address of your deployed contract
  - `NEXT_PUBLIC_PROVIDER_URL`: The same Sepolia endpoint as above

---

## Troubleshooting
- **Contract address errors:**
  - Make sure the address is copied correctly to the frontend `.env` and the server is restarted after changes.
- **Environment variables not found:**
  - Ensure `.env` files are in the correct directories and have no spaces around `=`.
- **Docker issues:**
  - Make sure your `.env` is present in the `project/` directory and referenced in the Docker run command.
- **MetaMask not connecting:**
  - Make sure MetaMask is set to the Sepolia network and your account has test ETH.

---

## License
This project is licensed under the MIT License.

---

**Happy building! If you have questions, feel free to open an issue or discussion on the repository.**
