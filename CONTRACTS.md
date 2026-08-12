# Smart Contract API Reference

This document is the API reference for the four Solidity contracts in
`contracts/`. It covers every external/public function and event, the state
machine each contract enforces, and copy-pasteable ethers.js snippets for
integrating a frontend against them. For setup/deployment instructions see
the main [README](./README.md).

All contracts target Solidity `^0.8.20` and are compiled with the optimizer
enabled (200 runs). None of them are upgradeable or pausable — see
[Security Notes](./README.md#security-notes) in the README.

---

## Table of Contents
- [Job](#job) — the marketplace + escrow contract
- [Reputation](#reputation) — ratings tied to real, paid jobs
- [Identity](#identity) — wallet registration
- [Escrow](#escrow) — standalone single-job escrow
- [Contract Interactions](#contract-interactions)

---

## Job

`contracts/Job.sol` — job postings, on-chain escrow, and fund release. This
is the contract the frontend talks to for the core marketplace flow.

### State machine

```
                postJob()                acceptJob()
   (none)  ──────────────►  OPEN  ──────────────────►  IN PROGRESS
                              │                              │
                              │ cancelJob()                  │ releaseFunds()
                              ▼                               ▼
                          CANCELLED                       COMPLETED
                       (client refunded)              (freelancer paid)
                                                              ▲
                                                              │ reclaimExpiredFunds()
                                                              │ (only after DELIVERY_WINDOW
                                                              │  has elapsed since acceptance)
                                                        IN PROGRESS ─┘ (client refunded instead)
```

Every job ends in exactly one terminal state: `CANCELLED`, or paid out via
either `releaseFunds` (freelancer gets paid) or `reclaimExpiredFunds` (client
gets refunded). The two payout paths share the `fundsReleased` flag, so
whichever happens first blocks the other — the escrowed ETH can never be
paid out twice.

### Struct: `JobDetail`

| Field | Type | Description |
| --- | --- | --- |
| `client` | `address` | Wallet that posted and funded the job |
| `description` | `string` | Free-text job description |
| `budget` | `uint256` | Escrowed amount, in wei |
| `isOpen` | `bool` | `true` until a freelancer accepts or the client cancels |
| `freelancer` | `address` | Wallet that accepted the job (`0x0` until accepted) |
| `fundsReleased` | `bool` | `true` once the escrow has been paid out (to either party) |
| `acceptedAt` | `uint256` | Unix timestamp of `acceptJob`, used for the delivery deadline |
| `isCancelled` | `bool` | `true` if the client cancelled before anyone accepted |

### Constants

| Name | Value | Description |
| --- | --- | --- |
| `DELIVERY_WINDOW` | `30 days` | How long a freelancer has to deliver after accepting before the client may reclaim escrowed funds |

### Functions

#### `postJob(string _description, uint256 _budget) external payable`
Creates a new job and escrows the budget in the contract.
- **Requires:** `_budget > 0`; `msg.value == _budget` (you must send exactly the budget as ETH).
- **Emits:** `JobPosted(jobId, client, description, budget)`.

#### `acceptJob(uint256 _jobId) external`
Claims an open job as the freelancer.
- **Requires:** job exists; `isOpen == true`; `msg.sender != client` (clients can't accept their own jobs).
- **Effects:** sets `freelancer = msg.sender`, `isOpen = false`, `acceptedAt = block.timestamp`.
- **Emits:** `JobAccepted(jobId, freelancer)`.

#### `releaseFunds(uint256 _jobId) external`
Pays the escrowed budget to the accepted freelancer. This is the normal,
happy-path completion of a job.
- **Requires:** `msg.sender == client`; job has been accepted (`!isOpen`); `freelancer != address(0)`; `!fundsReleased`; `!isCancelled`.
- **Emits:** `FundsReleased(jobId, freelancer, amount)`.

#### `cancelJob(uint256 _jobId) external`
Lets the client pull an unaccepted job and get a full refund. Only works
before anyone has accepted, so an assigned freelancer's job can never be
cancelled out from under them.
- **Requires:** `msg.sender == client`; `!isCancelled`; `isOpen == true` (not yet accepted).
- **Emits:** `JobCancelled(jobId, client, amount)`.

#### `reclaimExpiredFunds(uint256 _jobId) external`
Safety valve for a freelancer who accepts and then never delivers: once
`DELIVERY_WINDOW` (30 days) has passed since acceptance with no funds
released, the client can reclaim the escrow.
- **Requires:** `msg.sender == client`; job accepted (`!isOpen`); `freelancer != address(0)`; `!fundsReleased`; `!isCancelled`; `block.timestamp >= acceptedAt + DELIVERY_WINDOW`.
- **Emits:** `JobRefunded(jobId, client, amount)`.

#### `jobs(uint256) public view returns (JobDetail)`
Auto-generated struct getter. Returns all eight `JobDetail` fields in
struct-declaration order (see table above) — this is what the frontend
reads to render job cards and detail pages.

#### `jobCounter() public view returns (uint256)`
Total number of jobs ever posted; job IDs are `1..jobCounter` (there is no
job `0`).

### Events

| Event | Fields |
| --- | --- |
| `JobPosted` | `jobId, client (indexed), description, budget` |
| `JobAccepted` | `jobId, freelancer (indexed)` |
| `FundsReleased` | `jobId, freelancer (indexed), amount` |
| `JobCancelled` | `jobId, client (indexed), amount` |
| `JobRefunded` | `jobId, client (indexed), amount` |

---

## Reputation

`contracts/Reputation.sol` — freelancer ratings that are cryptographically
tied to real, paid-out jobs on the `Job` contract. A rating can only be left
by the client who actually hired and paid that freelancer, and only once per
job — there is no way to rate an address you never transacted with, or to
inflate/deflate a rating by calling the function repeatedly.

### Constructor

```solidity
constructor(address _jobContract)
```
Reverts if `_jobContract == address(0)`. Deploy `Job` first, then pass its
address here (see `scripts/deploy.js`).

### Functions

#### `rateFreelancer(uint256 _jobId, uint8 _rating) external`
Rates the freelancer of a specific job, 1–5.
- **Requires:** `1 <= _rating <= 5`; job hasn't been rated before (`!jobRated[_jobId]`); job exists; `msg.sender` is the job's original client (looked up live from the `Job` contract); the job's `fundsReleased == true` (i.e. actually completed and paid).
- **Emits:** `FreelancerRated(jobId, client, freelancer, rating)`.

#### `getReputation(address _freelancer) external view returns (uint256 averageRating, uint256 completedJobs)`
Returns the integer-average rating (0 if never rated) and total rated jobs
for a freelancer.

#### `addProjectLink(string _link) external` / `getProjectLink(address _freelancer) external view returns (string)`
Lets a freelancer publish (and anyone read) a portfolio/work-sample link.

### Events

| Event | Fields |
| --- | --- |
| `FreelancerRated` | `jobId (indexed), client (indexed), freelancer (indexed), rating` |

---

## Identity

`contracts/Identity.sol` — a minimal on-chain registry of which wallets have
opted into the platform.

#### `register() external`
Registers `msg.sender`. Reverts with `"User already registered."` if called twice by the same address.
- **Emits:** `UserRegistered(user)`.

#### `isRegistered(address _user) external view returns (bool)`

---

## Escrow

`contracts/Escrow.sol` — a minimal, standalone single-job escrow you can
deploy independently of the `Job` marketplace flow, for a simple
one-off client/freelancer pairing.

#### `constructor(address _freelancer) payable`
Deploys a dedicated escrow between `msg.sender` (client) and `_freelancer`,
funded with `msg.value`.
- **Emits:** `PaymentDeposited(client, amount)`.

#### `markJobCompleted() external` — client-only
Marks the job done, unlocking `releasePayment`.

#### `releasePayment() external` — client-only
Requires `jobCompleted == true`; transfers the full escrowed `amount` to the freelancer.
- **Emits:** `PaymentReleased(freelancer, amount)`.

> Note: `Escrow` is intentionally separate from `Job` — it has no
> cancellation or timeout path, since it's meant as a lightweight primitive
> rather than the marketplace's main escrow mechanism.

---

## Contract Interactions

`Job` and `Reputation` are the only two contracts wired together on-chain:
`Reputation.rateFreelancer` calls back into `Job.jobs(jobId)` to verify the
caller, the freelancer, and the payout status before accepting a rating.
`Identity` and `Escrow` are standalone and not referenced by any other
contract.

```
 ┌──────────┐   reads jobs(jobId) to verify    ┌─────────────┐
 │   Job    │ ◄──────────────────────────────── │ Reputation  │
 │ (escrow) │   client / freelancer / paid?      │ (ratings)  │
 └──────────┘                                    └─────────────┘

 ┌──────────┐        ┌──────────┐
 │ Identity │        │  Escrow  │   (both standalone — no cross-calls)
 └──────────┘        └──────────┘
```

### Minimal ethers.js (v6, Hardhat scripts/tests) example

```js
const job = await ethers.deployContract("Job");
const reputation = await ethers.deployContract("Reputation", [await job.getAddress()]);

// Client posts and escrows 1 ETH
await job.connect(client).postJob("Build a landing page", ethers.parseEther("1"), {
  value: ethers.parseEther("1"),
});

// Freelancer accepts job #1
await job.connect(freelancer).acceptJob(1);

// Client releases funds — freelancer gets paid
await job.connect(client).releaseFunds(1);

// Now that it's paid, the client can rate the freelancer
await reputation.connect(client).rateFreelancer(1, 5);
```

### Minimal ethers.js (v5, frontend) example

```js
const abi = [
  "function jobs(uint256) view returns (address client, string description, uint256 budget, bool isOpen, address freelancer, bool fundsReleased, uint256 acceptedAt, bool isCancelled)",
  "function postJob(string calldata _description, uint256 _budget) external payable",
  "function acceptJob(uint256 _jobId) external",
  "function releaseFunds(uint256 _jobId) external",
  "function cancelJob(uint256 _jobId) external",
  "function reclaimExpiredFunds(uint256 _jobId) external",
];
const contract = new ethers.Contract(contractAddress, abi, signer);
const job = await contract.jobs(1); // positional tuple matching the struct above
```

> **Note on ABI decoding:** ethers only decodes as many return values as
> your ABI fragment declares, in the order you declare them — it does not
> need to match the *full* on-chain return list. Callers that only care
> about the first few fields of `JobDetail` can safely omit the rest, as
> long as the fields they do list are in the correct order.
