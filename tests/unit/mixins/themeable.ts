import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import themeable, { Themeable } from '../../../src/mixins/themeable';
// import Promise from '@dojo/shim/Promise';

const baseTheme = {
	class1: 'baseClass1',
	class2: 'baseClass2'
};

const testTheme = {
	class1: 'themeClass1'
};

const testTheme2 = {
	class2: 'theme2Class2'
};

const overrideClasses = {
	class2: 'overrideClass2'
};

const overrideClasses2 = {
	class2: 'override2Class2'
};

const themeableFactory = compose({
	properties: <any> {},
	baseTheme
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(themeable);

let themeableInstance: Themeable<typeof baseTheme>;

registerSuite({
	name: 'themeManager',
	'no theme': {
		beforeEach() {
			themeableInstance = themeableFactory();
		},
		'should return only base classes when no theme is set'() {
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { baseClass1: true },
				class2: { baseClass2: true }
			});
		},
		'should cache generated classes'() {
			const firstThemeClasses = themeableInstance.getTheme();
			const secondThemeClasses = themeableInstance.getTheme();
			assert.strictEqual(firstThemeClasses, secondThemeClasses);
		}
	},
	'with a theme': {
		beforeEach() {
			themeableInstance = themeableFactory({ properties: { theme: testTheme }});
		},
		'should return theme class instead of base class when a theme is set'() {
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { themeClass1: true },
				class2: { baseClass2: true }
			});
		},
		'should cache theme class responses'() {
			const firstThemeClasses = themeableInstance.getTheme();
			const secondThemeClasses = themeableInstance.getTheme();
			assert.strictEqual(firstThemeClasses, secondThemeClasses);
		},
		'should regenerate class names on theme change'() {
			themeableInstance.properties.theme = testTheme2;
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'theme' ]
			});
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { baseClass1: true },
				class2: { theme2Class2: true }
			});
		}
	},
	'with overrides and a theme': {
		beforeEach() {
			themeableInstance = themeableFactory({ properties: {
				theme: testTheme,
				overrideClasses: overrideClasses
			}});
		},
		'should return override class as well as baseclass'() {
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { themeClass1: true },
				class2: { baseClass2: true, overrideClass2: true }
			});
		},
		'should cache override class responses'() {
			const firstThemeClasses = themeableInstance.getTheme();
			const secondThemeClasses = themeableInstance.getTheme();
			assert.strictEqual(firstThemeClasses, secondThemeClasses);
		},
		'should regenerate class names on overrides change'() {
			themeableInstance.properties.overrideClasses = overrideClasses2;
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'overrideClasses' ]
			});
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { baseClass1: true },
				class2: { baseClass2: true, override2Class2: true }
			});
		},
		'should regenerate class names on theme and overrides change'() {
			themeableInstance.properties.theme = testTheme2;
			themeableInstance.properties.overrideClasses = overrideClasses2;
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2,
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'theme', 'overrideClasses' ]
			});
			const themeClasses = themeableInstance.getTheme();
			assert.deepEqual(themeClasses, {
				class1: { baseClass1: true },
				class2: { theme2Class2: true, override2Class2: true }
			});
		}
	}
});
