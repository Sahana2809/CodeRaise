# CodeRaise — Web3 Open-Source Crowdfunding

CodeRaise is an academically defensible, escrow-gated crowdfunding platform designed to fund open-source development securely. It implements a milestone-based escrow system, DAO voting, and reputation tracking directly via smart contracts, integrated with off-chain GitHub activity verification.

## Architecture

```text
CodeRaise/
│
├── contracts/          → Hardhat 2 + Solidity 0.8.24 smart contracts
│   ├── contracts/
│   │   ├── Campaign.sol        → State machine, donations, milestones, voting, refunds
│   │   └── CampaignFactory.sol  → Deployer, creator registry, reputation system
│   └── test/
│       └── CodeRaise.test.js   → 28 comprehensive unit/integration tests
│
├── frontend/           → React + Vite + TailwindCSS v4 Dashboard
│   └── src/
│       ├── context/Web3Context.jsx  → Wallet connection & Ethers.js integration
│       └── pages/                   → Home, CreateCampaign, CampaignDetails, Dashboard
│
└── backend/            → Express.js off-chain helper
    └── server.js       → Off-chain GitHub commit verification API
```

---

## Getting Started

### 1. Smart Contracts & Local Node

Navigate to `contracts/`, install dependencies, run the local Hardhat node, and deploy the contracts:

```bash
cd contracts
npm install
npx hardhat node
```

In a new terminal:
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
*Note the deployed `CampaignFactory` address from the terminal output.*

### 2. Start the Backend API

Navigate to `backend/` and start the server on port `5001`:

```bash
cd backend
npm install
npm start
```
*(Optional) Create a `.env` file containing `GITHUB_TOKEN=your_token` to avoid GitHub API rate limits.*

### 3. Run the Frontend

Create a `.env` file under `frontend/` containing the address of your deployed Factory contract:

```env
VITE_FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Configure MetaMask to point to Localhost 8545 (ChainID 31337).

---

## Smart Contract Tests

To run the unit and integration tests (28 passing tests):

```bash
cd contracts
npx hardhat test
```
