# GigX — Task Tokenizer

**A decentralized freelance job marketplace secured by on-chain escrow.**
Clients post jobs and escrow the budget directly in a smart contract; freelancers accept jobs and get paid automatically once work is released — no platform custodian, no invoicing, no chargebacks, and (as of this release) no way for funds to get permanently stuck.

[![CI](https://github.com/bharat3645/AppXcess-GigX/actions/workflows/ci.yml/badge.svg)](https://github.com/bharat3645/AppXcess-GigX/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity&logoColor=white)](contracts)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](project)
[![Tests](https://img.shields.io/badge/tests-39%20passing-brightgreen)](test)

For the full function-by-function contract API, see **[CONTRACTS.md](./CONTRACTS.md)**.

---

## Table of Contents
- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Running the Frontend](#running-the-frontend)
- [Usage](#usage)
- [Testing](#testing)
- [Continuous Integration](#continuous-integration)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## Overview

GigX is a full-stack decentralized freelance marketplace: four purpose-built Solidity contracts on the backend, and a modern Next.js frontend wired to them through MetaMask. The `Job` contract *is* the escrow — there's no separate custodian holding funds, no off-chain database of truth, and no way for a client or freelancer to unilaterally rewrite what happened. Every job's full lifecycle — posted, accepted, paid, cancelled, or reclaimed — lives on-chain and is independently verifiable.

This isn't a toy demo of `postJob`/`acceptJob`/`releaseFunds` and nothing else: it also closes the two gaps that make an escrow-without-an-exit unsafe to actually use — an unaccepted job whose client changes their mind, and an accepted job whose freelancer disappears — and ties the reputation system to proof of real, paid work instead of an open, gameable rating free-for-all.

---

## How It Works

The `Job` contract is the heart of the marketplace, and doubles as its own escrow:

1. **Post a job** — a client calls `postJob(description, budget)` and sends exactly `budget` wei with the transaction. The funds are held in the contract, not with any third party.
2. **Accept a job** — any freelancer (other than the client) calls `acceptJob(jobId)` to claim it. The job closes to other applicants.
3. **Release funds** — once the client is satisfied, they call `releaseFunds(jobId)`, which pays the escrowed budget straight to the freelancer's wallet. Funds can only be released once, and only by the original client.

Two safety valves keep funds from ever being permanently stuck:
- **Cancel before acceptance** — `cancelJob(jobId)` lets the client pull back the escrow any time before a freelancer accepts.
- **Reclaim after a missed deadline** — if a freelancer accepts and then never delivers, `reclaimExpiredFunds(jobId)` lets the client reclaim the escrow once `DELIVERY_WINDOW` (30 days) has passed since acceptance.

`Identity` tracks which wallet addresses have registered. `Reputation` records star ratings and completed-job counts (plus a link to a freelancer's project) — and is wired directly to `Job`, so a rating can only be left by the client who actually hired and paid that freelancer for that specific job, exactly once. `Escrow` is a minimal standalone escrow you can deploy per-engagement outside the `Job` flow if you want a simpler client/freelancer pairing.

See [CONTRACTS.md](./CONTRACTS.md) for the full state machine diagram and API reference.

---

## Features

- Decentralized freelance job marketplace with on-chain escrow — job budgets are held and released by the `Job` contract itself, not a custodian
- **Escrow safety net**: clients can cancel unaccepted jobs for a full refund, or reclaim funds automatically if an accepted freelancer never delivers within the 30-day delivery window — no funds can get stuck forever
- **Reputation tied to real work**: ratings can only be left by the client who actually hired and paid a freelancer through the `Job` contract, once per job — not an open, gameable free-for-all
- Live job status everywhere it matters — the job detail page and the browse-all grid both show Open / In Progress / Completed / Cancelled state, plus a Cancel button and a Reclaim button (with a live countdown until the deadline unlocks it)
- Four purpose-built Solidity contracts: `Identity`, `Job`, `Reputation`, `Escrow` — full API docs in [CONTRACTS.md](./CONTRACTS.md)
- Modern Next.js 15 (App Router) frontend styled with Tailwind CSS and shadcn/ui
- MetaMask wallet integration with live account/network change handling
- Client-side input validation (Zod) and toast-based error handling (sonner) on job posting and every job action — decoded on-chain revert reasons instead of a raw `console.error`
- 39 Hardhat/Chai tests covering every contract, including the cancellation and timeout-refund paths
- GitHub Actions CI: compiles + tests the contracts and lints + builds the frontend on every push/PR (see [Continuous Integration](#continuous-integration))
- Docker image for the frontend

---

## Tech Stack

**Smart contracts**
- [Solidity](https://soliditylang.org/) `^0.8.20` — no external contract dependencies (no OpenZeppelin), optimizer enabled (200 runs)
- [Hardhat](https://hardhat.org/) — compilation, local network, deployment, and testing
- [ethers.js v6](https://docs.ethers.org/v6/) — contract deployment/interaction in Hardhat scripts and tests
- [Mocha](https://mochajs.org/) + [Chai](https://www.chaijs.com/) — the 39-test suite

**Frontend**
- [Next.js 15](https://nextjs.org/) (App Router) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) for styling/components
- [ethers.js v5](https://docs.ethers.org/v5/) — browser-side contract calls through the injected MetaMask provider
- [Zod](https://zod.dev/) — form/input validation
- [sonner](https://sonner.emilkowal.ski/) — toast notifications for transaction status and errors
- [Framer Motion](https://www.framer.com/motion/) and [Recharts](https://recharts.org/) for animation and dashboard charts

**Tooling & infra**
- [MetaMask](https://metamask.io/) (or any injected EIP-1193 wallet) for signing and network detection
- [GitHub Actions](https://github.com/features/actions) — CI (compile/test contracts, lint/build frontend) on every push/PR
- [Docker](https://www.docker.com/) — containerized production build of the frontend
- [Sepolia](https://sepolia.dev/) testnet as the default deploy target

---

## Architecture

```
                        ┌─────────────────────────────┐
                        │        Browser (User)       │
                        │  Next.js 15 App Router UI   │
                        │  Tailwind CSS + shadcn/ui   │
                        └───────────────┬─────────────┘
                                        │ ethers.js v5
                                        ▼
                        ┌─────────────────────────────┐
                        │   MetaMask (injected EIP-   │
                        │   1193 provider + signer)   │
                        └───────────────┬─────────────┘
                                        │ JSON-RPC
                                        ▼
                        ┌─────────────────────────────┐
                        │   Ethereum (Sepolia testnet │
                        │      / local Hardhat node)  │
                        │ ┌─────────┐   ┌────────────┐│
                        │ │   Job   │◄──│ Reputation ││
                        │ │(escrow) │   │ (ratings)  ││
                        │ └─────────┘   └────────────┘│
                        │ ┌─────────┐   ┌────────────┐│
                        │ │Identity │   │   Escrow   ││
                        │ └─────────┘   └────────────┘│
                        └─────────────────────────────┘
```

- The frontend never talks to a database of record for job/reputation state — it reads directly from the deployed contracts (via `NEXT_PUBLIC_PROVIDER_URL` for public reads, and the connected wallet for writes).
- `scripts/deploy.js` deploys all four contracts (wiring `Reputation` to `Job`'s address) and writes their addresses to `deployed-addresses.json`, which `next.config.js` picks up automatically at frontend build time.
- See [Contract Interactions](./CONTRACTS.md#contract-interactions) in CONTRACTS.md for how `Job` and `Reputation` call into each other on-chain.

---

## Project Structure
```
├── contracts/             # Solidity smart contracts
│   ├── Identity.sol        # Wallet registration
│   ├── Job.sol              # Job postings + on-chain escrow + fund release
│   ├── Reputation.sol       # Ratings, completed jobs, project links
│   └── Escrow.sol            # Standalone single-job escrow
├── scripts/                # Deployment scripts
├── test/                    # Hardhat/Chai test suite (one file per contract)
├── project/                 # Next.js frontend app
│   ├── app/                  # App Router pages (jobs, freelancers, dashboard, ...)
│   ├── components/           # React components (shadcn/ui primitives + custom)
│   ├── context/               # WalletContext (MetaMask connect/account/network)
│   └── public/                 # Static assets
├── artifacts/               # Compiled contract artifacts (auto-generated, gitignored)
├── deployed-addresses.json  # Written by scripts/deploy.js after each deployment
├── hardhat.config.js        # Hardhat configuration
├── package.json              # Root (contracts) dependencies
├── Dockerfile                 # Builds and serves the Next.js frontend
├── CONTRACTS.md                # Full smart contract API reference
└── README.md                    # You're here!
```

---

## Prerequisites
- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Docker** (optional, for containerized frontend deployment)
- **Git**
- **MetaMask** or another injected Ethereum wallet, funded with Sepolia test ETH if you plan to deploy/transact

---

## Getting Started (Local Development)

### 1. Clone the Repository
```sh
git clone https://github.com/bharat3645/AppXcess-GigX.git
cd AppXcess-GigX
```

### 2. Install Dependencies
```sh
# Root (Hardhat + contracts)
npm install

# Frontend
cd project
npm install
cd ..
```

### 3. Set Up Environment Variables
Copy the provided templates and fill in your own values — **never commit real keys**:

```sh
cp .env.example .env
cp project/.env.example project/.env
```

See [Environment Variables](#environment-variables) for what each value means.

---

## Smart Contract Deployment

1. **Compile contracts:**
   ```sh
   npm run compile
   ```
2. **Run the test suite** (optional but recommended — see [Testing](#testing)):
   ```sh
   npm test
   ```
3. **Deploy to the Sepolia testnet:**
   ```sh
   npm run deploy:sepolia
   ```
   - Requires `ALCHEMY_SEPOLIA_URL` and a funded `PRIVATE_KEY` in the root `.env`.
   - The deploy script deploys `Identity`, `Job`, `Reputation` (wired to `Job`'s address), and `Escrow`, posts a handful of demo jobs (escrowing real Sepolia ETH from the deployer wallet), and writes all four contract addresses to `deployed-addresses.json`.
   - The frontend's `next.config.js` automatically picks up the `Job` contract address from `deployed-addresses.json` — you generally don't need to copy it by hand.

---

## Running the Frontend

```sh
cd project
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000).

For a production build:
```sh
cd project
npm run build
npm start
```

---

## Usage

Once contracts are deployed and the frontend is running with your wallet connected to the same network:

1. **Register** — connect MetaMask and register your wallet with the `Identity` contract from the app.
2. **Post a job** (as a client) — go to `Jobs → Register a Job`, fill in a description and budget, and confirm the transaction. The budget is escrowed in `Job` the moment the transaction lands.
3. **Browse & accept jobs** (as a freelancer) — `Jobs → Browse All` lists every job with a live status badge (Open / In Progress / Completed / Cancelled); open one and call **Accept** to claim it.
4. **Release funds** (as the client) — on the job detail page, once you're satisfied with the delivered work, click **Release Funds** to pay the freelancer directly from escrow.
5. **Cancel or reclaim, if needed** — an unaccepted job shows a **Cancel** button for a full refund; an accepted-but-undelivered job shows a **Reclaim** button that unlocks (with a live countdown until then) once the 30-day delivery window has passed.
6. **Rate the freelancer** — after funds are released, the client can leave a 1–5 rating through `Reputation`, which is only accepted once per completed, paid job.

For direct contract calls (scripts, tests, or a custom frontend), see the copy-pasteable ethers v5/v6 snippets in [CONTRACTS.md](./CONTRACTS.md#contract-interactions).

---

## Testing

The root project ships a full Hardhat/Chai suite (39 tests) covering registration, job posting/acceptance/fund release, cancellation, timeout-based reclaiming, ratings, and standalone escrow:

```sh
npm test
```

---

## Continuous Integration

Every push and pull request to `main` runs two independent jobs via GitHub Actions (`.github/workflows/ci.yml`):

| Job | Steps |
| --- | --- |
| **contracts** | `npm ci` → `hardhat compile` → `hardhat test` (39 tests) |
| **frontend** | `npm ci` → `next lint` → `next build` (17 routes) |

Check the badge at the top of this README, or the [Actions tab](https://github.com/bharat3645/AppXcess-GigX/actions), for the current status.

---

## Docker Deployment

The `Dockerfile` builds and serves only the frontend. Deploy your contracts first (see above) so `deployed-addresses.json` exists, and make sure `project/.env` is filled in — `NEXT_PUBLIC_*` values are inlined into the client bundle at **build time**, not container start time.

1. **Build the image** (from the repo root, so `deployed-addresses.json` is in the build context):
   ```sh
   docker build -t task-tokenizer-app .
   ```
2. **Run the container:**
   ```sh
   docker run -p 3000:3000 task-tokenizer-app
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

**Root `.env`** (see `.env.example`) — used by Hardhat when deploying contracts:
| Variable | Description |
| --- | --- |
| `ALCHEMY_SEPOLIA_URL` | RPC endpoint for the Sepolia testnet (Alchemy or Infura) |
| `PRIVATE_KEY` | Private key of the deployment wallet. **Use a throwaway/testnet-only wallet.** |
| `ETHERSCAN_API_KEY` | Optional, for verifying contract source via `hardhat-verify` |

**`project/.env`** (see `project/.env.example`) — used by the frontend:
| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `Job` contract address (auto-filled from `deployed-addresses.json` at build time if unset) |
| `NEXT_PUBLIC_PROVIDER_URL` | RPC endpoint the frontend uses to read job data without a connected wallet |

---

## Troubleshooting
- **Contract address errors:** confirm the address in `project/.env` (or `deployed-addresses.json`) matches your latest deployment, and restart `next dev` after changing env files.
- **Environment variables not found:** ensure `.env` files exist in the correct directories and have no spaces around `=`.
- **`hardhat compile`/`hardhat test` fail with an "Invalid account" error:** `PRIVATE_KEY` in the root `.env` must be a real 32-byte hex key to deploy to Sepolia; leaving it blank or as a placeholder still works fine for local compiling/testing.
- **"Release Funds" or "Post a Job" transactions revert:** `postJob` is `payable` and requires the sent value to exactly match the budget; make sure your wallet has enough Sepolia ETH.
- **Docker build can't find `deployed-addresses.json`:** build from the repo root (`docker build -t task-tokenizer-app .`), not from `project/`.
- **MetaMask not connecting:** make sure MetaMask is set to the Sepolia network and your account has test ETH (get some from a [Sepolia faucet](https://sepoliafaucet.com/)).

---

## Security Notes
- Treat any `PRIVATE_KEY` you put in `.env` as sensitive — **use a dedicated testnet wallet with no real funds**, never a wallet you also use on mainnet.
- Both `.env` files are listed in `.gitignore`; double-check `git status` before committing if you're ever unsure whether one is tracked.
- The contracts here are demo-grade (no reentrancy guards, no pausability, no upgradeability) and have not been audited — don't deploy them to mainnet with real funds without a proper security review.

---

## License
This project is licensed under the [MIT License](./LICENSE).

---

**Happy building! If you have questions, feel free to open an issue or discussion on the repository.**
