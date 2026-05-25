#!/bin/bash
cd "/Users/sahanaagadi/Downloads/6th sem/Blockchain/CodeRaise/contracts"
npx hardhat node > hardhat_node.log 2>&1 &
echo $! > node.pid
sleep 5

OUTPUT=$(npx hardhat run scripts/deploy.js --network localhost)
echo "$OUTPUT"
FACTORY_ADDR=$(echo "$OUTPUT" | grep -oE "0x[a-fA-F0-9]{40}")

cd "/Users/sahanaagadi/Downloads/6th sem/Blockchain/CodeRaise/frontend"
echo "VITE_FACTORY_ADDRESS=$FACTORY_ADDR" > .env

cd "/Users/sahanaagadi/Downloads/6th sem/Blockchain/CodeRaise/backend"
npm start > backend.log 2>&1 &
echo $! > backend.pid

cd "/Users/sahanaagadi/Downloads/6th sem/Blockchain/CodeRaise/frontend"
npm run dev > frontend.log 2>&1 &
echo $! > frontend.pid

echo "ALL SERVICES STARTED WITH FACTORY: $FACTORY_ADDR"
