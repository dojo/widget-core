export const proxyPort = 9000;

// A fully qualified URL to the Intern proxy
export const proxyUrl = 'http://localhost:9000/';

// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
export const capabilities = {
	'browserstack.debug': false,
	project: 'Dojo 2',
	name: '@dojo/widget-core'
};

// Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
// OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
// capabilities options specified for an environment will be copied as-is
export const environments = [
	{ browserName: 'IE', version: [ '10.0', '11.0' ], platform: 'Windows' },
	{ browserName: 'Edge', platform: 'Windows' },
	{ browserName: 'Firefox', platform: 'Windows' },
	{ browserName: 'Chrome', platform: 'Windows' },
	{ browserName: 'Opera', platform: 'Windows' },
	{ browserName: 'Safari', version: [ '8.0', '9.0' ], platform: 'MAC' } // ,

	/* issues with these platforms on browserstack */
	// { browserName: 'android', platform: 'ANDROID', device: 'Google Nexus 5' },
	// { browserName: 'iPhone', platform: 'MAC', device: 'iPhone 5s' }
];

// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
export const maxConcurrency = 1;

// Name of the tunnel class to use for WebDriver tests
export const tunnel = 'BrowserStackTunnel';

// Support running unit tests from a web server that isn't the intern proxy
export const initialBaseUrl: string | null = (function () {
	if (typeof location !== 'undefined' && location.pathname.indexOf('__intern/') > -1) {
		return '/';
	}
	return null;
})();

// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
// loader
export const loaders = {
	'host-browser': 'node_modules/@dojo/loader/loader.js',
	'host-node': '@dojo/loader'
};

// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
// can be used here
export const loaderOptions = {
	// Packages that should be registered with the loader in each testing environment
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'tests', location: '_build/tests' },
		{ name: 'node_modules', location: '_build/node_modules' },
		{ name: 'dojo', location: 'node_modules/intern/browser_modules/dojo' },
		{ name: '@dojo', location: 'node_modules/@dojo' },
		{ name: 'cldr-data', location: 'node_modules/cldr-data' },
		{ name: 'cldrjs', location: 'node_modules/cldrjs' },
		{ name: 'globalize', location: 'node_modules/globalize', main: 'dist/globalize' },
		{ name: 'maquette', location: 'node_modules/maquette/dist', main: 'maquette' },
		{ name: 'sinon', location: 'node_modules/sinon/pkg', main: 'sinon' }
	],
	map: {
		globalize: {
			'cldr': 'cldrjs/dist/cldr',
			'cldr/event': 'cldrjs/dist/cldr/event',
			'cldr/supplemental': 'cldrjs/dist/cldr/supplemental',
			'cldr/unresolved': 'cldrjs/dist/cldr/unresolved'
		}
	}
};

// Non-functional test suite(s) to run in each browser
export const suites = [ 'tests/unit/all' ];

// Functional test suite(s) to run in each browser once non-functional tests are completed
export const functionalSuites = [ 'tests/functional/all' ];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const excludeInstrumentation = /(?:node_modules|bower_components|tests|examples)[\/\\]/;
