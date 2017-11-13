#!/usr/bin/env bash

# Clean up existing benchmark results, and don't fail if the folder does not exist
rm html-report/results/*.json || true

echo 'Running curl before server start http://localhost:8080'
curl http://localhost:8080

./node_modules/.bin/serve -p 8080 --silent &
SERVER_PID=$!
sleep 2

echo 'Running curl after server start http://localhost:8080'
curl http://localhost:8080

echo 'Running curl after server start http://127.0.0.1:8080'
curl http://127.0.0.1:8080

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 1 --headless true --framework dojo2-v0.2.0-non-keyed

# Move the benchmark results somewhere else for now
mkdir -p html-report
mv results html-report

# Use node to console.log since it gives pretty printing
node -e "console.dir(require('./html-report/results/dojo2-v0.2.0-non-keyed_01_run1k.json'), {colors: true})"

function cleanup {
    kill $SERVER_PID
}

trap cleanup EXIT
