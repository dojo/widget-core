import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { setTheme, getTheme } from '../../../src/theme/manager';

const testTheme = {
	class1: 'themeClass1',
	class2: 'themeClass2'
};
const overrideClasses = {
	class1: 'overrideClass1'
};

registerSuite({
	name: 'themeManager',
	beforeEach() {
		setTheme({});
	},
	'should return only base classes when no theme is set'() {
		const themeClasses = getTheme({ class1: 'baseClass1' });

		assert.deepEqual(themeClasses, { class1: { baseClass1: true } });
	},
	'should return theme class instead of base class when a theme is set'() {
		setTheme(testTheme);
		const themeClasses = getTheme({ class1: 'baseClass1' });

		assert.deepEqual(themeClasses, { class1: { [ testTheme.class1 ]: true } });
	},
	'should return theme class and override class when a theme is set'() {
		setTheme(testTheme);
		const themeClasses = getTheme({ class1: 'baseClass1' }, overrideClasses);

		assert.deepEqual(themeClasses, {
			class1: { [ testTheme.class1 ]: true, [ overrideClasses.class1 ]: true }
		});
	},
	'should return multiple theme and override classes when a theme is set and multiple baseClasses are provided'() {
		setTheme(testTheme);

		const themeClasses = getTheme({
			class1: 'baseClass1',
			class2: 'baseClass2',
			class3: 'baseClass3'
		}, overrideClasses);

		assert.deepEqual(themeClasses, {
			class1: { [ testTheme.class1 ]: true, [ overrideClasses.class1 ]: true } ,
			class2: { [ testTheme.class2 ]: true },
			class3: { baseClass3: true }
		});
	}
});
