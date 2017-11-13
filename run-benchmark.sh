#!/usr/bin/env bash

set -x

# Clean up existing benchmark results, and don't fail if the folder does not exist
rm html-report/results/*.json || true

./node_modules/.bin/serve -p 8080 &
SERVER_PID=$!

echo '--- Benchmark starting ---'

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 3 --headless true --framework dojo2-v0.2.0-non-keyed

# Move the benchmark results somewhere else for now
mkdir -p html-report
mv results html-report/benchmark-results

# Use node to console.log since it gives pretty printing
#node -e "console.dir(require('./html-report/benchmark-results/dojo2-v0.2.0-non-keyed_01_run1k.json'), {colors: true})"

files=(
	"dojo2-v0.2.0-non-keyed_01_run1k.json"
	"dojo2-v0.2.0-non-keyed_02_replace1k.json"
	"dojo2-v0.2.0-non-keyed_03_update10th1k.json"
	"dojo2-v0.2.0-non-keyed_04_select1k.json"
	"dojo2-v0.2.0-non-keyed_05_swap1k.json"
	"dojo2-v0.2.0-non-keyed_06_remove-one-1k.json"
	"dojo2-v0.2.0-non-keyed_07_create10k.json"
	"dojo2-v0.2.0-non-keyed_08_create1k-after10k.json"
	"dojo2-v0.2.0-non-keyed_09_clear10k.json"
	"dojo2-v0.2.0-non-keyed_21_ready-memory.json"
	"dojo2-v0.2.0-non-keyed_22_run-memory.json"
	"dojo2-v0.2.0-non-keyed_23_update5-memory.json"
	"dojo2-v0.2.0-non-keyed_24_run5-memory.json"
	"dojo2-v0.2.0-non-keyed_25_run-clear-memory.json"
	"dojo2-v0.2.0-non-keyed_30_startup.json"
)

echo 'Benchmark results: \n'
for file in "${files[@]}"
do
	# Pretty printed JSON
	# node -e "console.dir(require('./html-report/benchmark-results/$file'), {colors: true})"

	node -e "
		const result = require('./html-report/benchmark-results/$file');\
		console.log(result.benchmark, ':', result.median);\
	"
done

function cleanup {
    kill $SERVER_PID
}

trap cleanup EXIT
