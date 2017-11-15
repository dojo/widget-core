#!/usr/bin/env bash

./node_modules/.bin/serve -p 8080 &
SERVER_PID=$!

echo '--- Benchmark starting ---'

rm -rf benchmark-results

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 3 --headless true --framework vanillajs-non-keyed

node _build/tests/benchmark/runner/src/benchmarkRunner.js --count 3 --headless true --framework dojo2-v0.2.0-non-keyed


files=(
	"_01_run1k.json"
	"_02_replace1k.json"
	"_03_update10th1k.json"
	"_04_select1k.json"
	"_05_swap1k.json"
	"_06_remove-one-1k.json"
	"_07_create10k.json"
	"_08_create1k-after10k.json"
	"_09_clear10k.json"
	"_21_ready-memory.json"
	"_22_run-memory.json"
	"_23_update5-memory.json"
	"_24_run5-memory.json"
	"_25_run-clear-memory.json"
	"_30_startup.json"
)

echo 'Benchmark results: \n'
for file in "${files[@]}"
do
	./node_modules/.bin/jq '.' benchmark-results/dojo2-v0.2.0-non-keyed$file
	./node_modules/.bin/jq '.' benchmark-results/vanillajs-non-keyed$file
done

for file in "${files[@]}"
do
	dojoMedian="$(./node_modules/.bin/jq '.median' benchmark-results/dojo2-v0.2.0-non-keyed$file)"
	vanillaJSMedian="$(./node_modules/.bin/jq '.median' benchmark-results/vanillajs-non-keyed$file)"

	# node tests/benchmark/runner/output.ts
done

function cleanup {
    kill $SERVER_PID
}

trap cleanup EXIT
