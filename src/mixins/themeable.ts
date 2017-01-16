import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';

/**
 * A representation of the css-module class names
 * to be applied where each class in appliedClasses
 * is used.
 */
export type CSSModuleClassNames = {
	[key: string]: boolean;
}

/**
 * The object returned by getClasses.
 */
export type AppliedClasses<T> = {
	[P in keyof T]?: CSSModuleClassNames;
};

type StringIndexedObject = { [key: string]: string; };

/**
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties {
	theme?: {};
	overrideClasses?: {};
}

/**
 * Themeable Options
 */
export interface ThemeableOptions {
	properties: ThemeableProperties;
}

/**
 * Themeable Mixin
 */
export interface ThemeableMixin<P> extends Evented {
	theme: AppliedClasses<P>;
}

/**
 * Themeable
 */
export interface Themeable<P> extends ThemeableMixin<P> {
	baseTheme: P;
	properties: ThemeableProperties;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin<{}>, ThemeableOptions> {}

/**
 * Private map for the widgets themeClasses.
 */
const themeClassesMap = new WeakMap<ThemeableMixin<{}>, AppliedClasses<any>>();

function addClassNameToMap(classMap: CSSModuleClassNames, classList: StringIndexedObject, className: string) {
	if (classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			classMap[generatedClassName] = true;
		});
	}
}

function negatePreviousClasses<T>(oldClasses: AppliedClasses<T>, newClasses: AppliedClasses<T>) {
	return Object.keys(oldClasses).reduce((newAppliedClasses, className: keyof T) => {
		const oldCSSModuleClassNames: CSSModuleClassNames = oldClasses[className] || {};

		const negatedClassNameMap = Object.keys(oldCSSModuleClassNames).reduce((newClassMap, oldAppliedClassName) => {
			const currentClassNameFlag = oldCSSModuleClassNames[<keyof T> oldAppliedClassName];
			// If it's true it needs to be negated and passed along, If it's false,
			// don't return it as maquette will already have removed it.
			if (currentClassNameFlag) {
				newClassMap[oldAppliedClassName] = false;
			}
			return newClassMap;
		}, <CSSModuleClassNames> {});

		const calculatedClassNameMap = assign({}, negatedClassNameMap, newClasses[className]);
		newAppliedClasses[className] = calculatedClassNameMap;

		return newAppliedClasses;
	}, <AppliedClasses<T>> {});
}

function generateThemeClasses<I, T>(instance: Themeable<I>, baseTheme: T, theme: {} = {}, overrideClasses: {} = {}) {
	const newThemeClasses = Object.keys(instance.baseTheme).reduce((currentAppliedClasses, className: keyof T) => {
		const classMap: CSSModuleClassNames = currentAppliedClasses[className] = {};
		let themeClassSource: {} = instance.baseTheme;

		if (theme && theme.hasOwnProperty(className)) {
			themeClassSource = theme;
		}

		addClassNameToMap(classMap, themeClassSource, className);
		overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

		return currentAppliedClasses;
	}, <AppliedClasses<T>> {});

	if (themeClassesMap.has(instance)) {
		const oldClasses = themeClassesMap.get(instance);
		themeClassesMap.set(instance, negatePreviousClasses(oldClasses, newThemeClasses));
	} else {
		themeClassesMap.set(instance, newThemeClasses);
	}
}

function onPropertiesChanged<I>(instance: Themeable<I>, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const { theme: propTheme, overrideClasses: propOverrideClasses } = instance.properties;
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		generateThemeClasses(instance, instance.baseTheme, theme || propTheme, overrideClasses || propOverrideClasses);
	}
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		get theme(this: Themeable<any>): AppliedClasses<any> {
			return themeClassesMap.get(this);
		}
	},
	initialize<I>(instance: Themeable<I>) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin<I>, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		const { theme, overrideClasses } = instance.properties;
		generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
	}
});

export default themeableFactory;
