#!/bin/bash
echo "=== Test Backend Health ==="
curl -s http://localhost:3000/health
echo ""

echo ""
echo "=== Test Assets API ==="
curl -s "http://localhost:3000/api/trpc/asset.getAll" | head -100
echo ""

echo ""
echo "=== Test Level API ==="
curl -s "http://localhost:3000/api/trpc/level.getAll" | head -100
echo ""

echo ""
echo "=== Test Holding API ==="
curl -s "http://localhost:3000/api/trpc/holding.getAll" | head -100
echo ""

echo ""
echo "=== Test Investment Buy (should fail without valid data) ==="
curl -s -X POST "http://localhost:3000/api/trpc/investment.buy" \
  -H "Content-Type: application/json" \
  -d '{"json":{"walletId":1,"assetId":1,"amount":100,"gameInstanceId":1}}' | head -100
echo ""
