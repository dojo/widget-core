#!/usr/bin/env bash -x

# Clean up existing benchmark results, and don't fail if the folder does not exist
rm html-report/results/*.json || true

./node_modules/.bin/serve -p 8080 &
SERVER_PID=$!

echo '--- Benchmark starting ---'

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 1 --headless true --framework dojo2-v0.2.0-non-keyed

# Move the benchmark results somewhere else for now
mkdir -p html-report
mv results html-report/benchmark-results

# Use node to console.log since it gives pretty printing
node -e "console.dir(require('./html-report/benchmark-results/dojo2-v0.2.0-non-keyed_01_run1k.json'), {colors: true})"

function cleanup {
    kill $SERVER_PID
}

trap cleanup EXIT
