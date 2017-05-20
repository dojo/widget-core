module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-dojo2-extras');
	require('grunt-dojo2').initConfig(grunt, {
		api: {
			html: {
				options: {
					dest: '<%= apiDocDirectory %>',
					format: 'html',
					src: '.',
					typedoc: {
						mode: 'modules',
						externalPattern: '**/+(example|examples|node_modules|tests|typings)/**/*.ts',
						excludeExternals: true,
						excludeNotExported: true,
						ignoreCompilerErrors: true
					}
				}
			}
		}
	});
};
