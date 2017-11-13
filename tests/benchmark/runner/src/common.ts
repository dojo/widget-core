export interface JSONResult {
	framework: string; benchmark: string; type: string; min: number;
		max: number; mean: number; geometricMean: number;
		standardDeviation: number; median: number; values: Array<number>;
}

export let config = {
	REPEAT_RUN: 20,
	DROP_WORST_RUN: 0,
	WARMUP_COUNT: 5,
	TIMEOUT: 60 * 1000,
	LOG_PROGRESS: true,
	LOG_DETAILS: false,
	LOG_DEBUG: false,
	EXIT_ON_ERROR: false
};

export interface FrameworkData {
	name: string;
	uri: string;
	keyed: boolean;
	useShadowRoot: boolean;
}

interface Options {
	uri: string;
	useShadowRoot?: boolean;
}

function f(name: string, keyed: boolean, options: Options = {uri: null, useShadowRoot: false}): FrameworkData {
	let ret = {name, keyed, uri: options.uri ? options.uri : name, useShadowRoot: options.useShadowRoot};
	return ret;
}

export let frameworks = [
	f('dojo2-v0.2.0-non-keyed', false, { uri: 'tests/benchmark/app' })
];
