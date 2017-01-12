import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import themeManager, { ThemeManager } from '../../../src/theme/themeManager';

let testThemeManager: ThemeManager;
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
		testThemeManager = new ThemeManager();
	},
	'should provide a themeManager singleton'() {
		assert.instanceOf(themeManager, ThemeManager);
	},
	'should return only base classes when no theme is set'() {
		const themeClasses = testThemeManager.getThemeClasses({ class1: 'baseClass1' });
		assert.deepEqual(themeClasses, { class1: { baseClass1: true } });
	},
	'should return theme class instead of base class when a theme is set'() {
		testThemeManager.setTheme(testTheme);
		const themeClasses = testThemeManager.getThemeClasses({ class1: 'baseClass1' });
		assert.deepEqual(themeClasses, { class1: { [ testTheme.class1 ]: true } });
	},
	'should return theme class and override class when a theme is set'() {
		testThemeManager.setTheme(testTheme);
		const themeClasses = testThemeManager.getThemeClasses({ class1: 'baseClass1' }, overrideClasses);
		assert.deepEqual(themeClasses, { class1: { [ testTheme.class1 ]: true, [ overrideClasses.class1 ]: true } });
	},
	'should return only base classes after theme has been cleared'() {
		testThemeManager.setTheme(testTheme);
		let themeClasses = testThemeManager.getThemeClasses({ class1: 'baseClass1' });
		assert.deepEqual(themeClasses, { class1: { [ testTheme.class1 ]: true } }, 'should contain theme class');
		testThemeManager.clearTheme();
		themeClasses = testThemeManager.getThemeClasses({ class1: 'baseClass1' });
		assert.deepEqual(themeClasses, { class1: { baseClass1: true } }, 'should only contain base class');
	}
});
