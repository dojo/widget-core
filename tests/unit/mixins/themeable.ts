import compose from '@dojo/compose/compose';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import themeable, { Themeable, BaseTheme } from '../../../src/mixins/themeable';
import createWidgetBase from '../../../src/createWidgetBase';
import { v } from '../../../src/d';
import { Widget, WidgetProperties, DNode } from '../../../src/interfaces';

const baseThemeClasses = {
	class1: 'baseClass1',
	class2: 'baseClass2'
};

const baseTheme: BaseTheme<typeof baseThemeClasses> = {
	key: 'testPath',
	classes: baseThemeClasses
};

const themeExtraClasses = {
	testPath: {
		extraClass: 'extraClass'
	}
};

const testTheme1 = {
	testPath: {
		class1: 'theme1Class1'
	}
};

const testTheme2 = {
	testPath: {
		class1: 'theme2Class1'
	}
};

const testTheme3 = {
	testPath: {
		class1: 'testTheme3Class1 testTheme3AdjoinedClass1'
	}
};

const overrideClasses1 = {
	class1: 'override1Class1'
};

const overrideClasses2 = {
	class1: 'override2Class1'
};

const themeableFactory = compose({
	properties: <any> {},
	baseTheme
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(themeable);

let themeableInstance: Themeable<typeof baseThemeClasses>;

registerSuite({
	name: 'themeManager',
	'classes object': {
		'should return classNames object with base classes set'() {
			themeableInstance = themeableFactory();
			assert.deepEqual(themeableInstance.theme, {
				class1: 'class1',
				class2: 'class2'
			});
		},
		'should not include extra theme classes in classNames object'() {
			themeableInstance = themeableFactory({
				properties: { theme: themeExtraClasses }
			});
			assert.deepEqual(themeableInstance.theme, {
				class1: 'class1',
				class2: 'class2'
			});
		}
	},
	'class names function': {
		'should return baseTheme flagged classes via the classes function'() {
			themeableInstance = themeableFactory();
			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ baseTheme.classes.class1 ]: true,
				[ baseTheme.classes.class2 ]: true
			});
		},
		'should return negated classes for those that are not passed'() {
			themeableInstance = themeableFactory();
			const { class1 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1);
			assert.deepEqual(flaggedClasses, {
				[ baseTheme.classes.class1 ]: true,
				[ baseTheme.classes.class2 ]: false
			});
		},
		'should pass through new classes that do not exist in baseTheme'() {
			themeableInstance = themeableFactory();
			const { class1 } = themeableInstance.theme;
			const newClassName = 'newClassName';
			const flaggedClasses = themeableInstance.classes(class1, newClassName);
			assert.deepEqual(flaggedClasses, {
				[ baseTheme.classes.class1 ]: true,
				[ baseTheme.classes.class2 ]: false,
				[ newClassName ]: true
			});
		},
		'should negate any new classes that are not requested on second call'() {
			themeableInstance = themeableFactory();
			const { class1 } = themeableInstance.theme;
			const newClassName = 'newClassName';
			const flaggedClassesFirstCall = themeableInstance.classes(class1, newClassName);
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseTheme.classes.class1 ]: true,
				[ baseTheme.classes.class2 ]: false,
				[ newClassName ]: true
			}, `${newClassName} should be true on first call`);

			const flaggedClassesSecondCall = themeableInstance.classes(class1);
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseTheme.classes.class1 ]: true,
				[ baseTheme.classes.class2 ]: false,
				[ newClassName ]: false
			}, `${newClassName} should be false on second call`);
		}
	},
	'setting a theme': {
		'should override basetheme classes with theme classes'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme1 }
			});
			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseTheme.classes.class2 ]: true
			});
		},
		'should negate old theme class when a new theme is set'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme1 }
			});
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'theme' ]
			});

			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseTheme.classes.class2 ]: true
			});
		}
	},
	'setting override classes': {
		'should supplement basetheme classes with override classes'() {
			themeableInstance = themeableFactory({
				properties: { overrideClasses: overrideClasses1 }
			});
			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ baseTheme.classes.class1 ]: true,
				[ overrideClasses1.class1 ]: true,
				[ baseTheme.classes.class2 ]: true
			});
		},
		'should set override classes to false when they are changed'() {
			themeableInstance = themeableFactory({
				properties: { overrideClasses: overrideClasses1 }
			});
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'overrideClasses' ]
			});

			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ baseTheme.classes.class1 ]: true,
				[ overrideClasses1.class1 ]: false,
				[ overrideClasses2.class1 ]: true,
				[ baseTheme.classes.class2 ]: true
			});
		}
	},
	'splitting adjoined classes': {
		'should split adjoined classes into multiple classes'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme3 }
			});

			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				testTheme3Class1: true,
				testTheme3AdjoinedClass1: true,
				[ baseTheme.classes.class2 ]: true
			});
		},
		'should remove adjoined classes when they are no longer provided'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme3 }
			});

			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme1
				},
				changedPropertyKeys: [ 'theme' ]
			});

			const { class1, class2 } = themeableInstance.theme;
			const flaggedClasses = themeableInstance.classes(class1, class2);
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				testTheme3Class1: false,
				testTheme3AdjoinedClass1: false,
				[ baseTheme.classes.class2 ]: true
			});
		}
	},
	'integration': {
		'should work as mixin to createWidgetBase'() {
			type ThemeableWidget = Widget<WidgetProperties> & Themeable<typeof baseThemeClasses>;

			const createThemeableWidget = createWidgetBase.mixin(themeable).mixin({
				mixin: {
					baseTheme,
					getChildrenNodes(this: ThemeableWidget ): DNode[] {
						const { class1 } = this.theme;
						return [
							v('div', { classes: this.classes(class1) })
						];
					}
				}
			});

			const themeableWidget: ThemeableWidget = createThemeableWidget({
				properties: { theme: testTheme1 }
			});

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseTheme.classes.class2 ]: false
			});

			themeableWidget.setProperties({ theme: testTheme2 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseTheme.classes.class2 ]: false
			});
		}
	}
});
