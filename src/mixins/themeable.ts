import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';

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
	getTheme(): AppliedClasses<P>;
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

function generateThemeClasses<I, T>(instance: Themeable<I>, baseTheme: T, theme: {} = {}, overrideClasses: {} = {}) {
	const themeClasses = Object.keys(instance.baseTheme).reduce((currentAppliedClasses, className) => {
		const classMap: CSSModuleClassNames = currentAppliedClasses[<keyof T> className] = {};
		let themeClassSource: {} = instance.baseTheme;

		if (theme && theme.hasOwnProperty(className)) {
			themeClassSource = theme;
		}

		addClassNameToMap(classMap, themeClassSource, className);
		overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

		return currentAppliedClasses;
	}, <AppliedClasses<T>> {});

	themeClassesMap.set(instance, themeClasses);
}

function onPropertiesChanged<I>(instance: Themeable<I>, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		themeClassesMap.delete(instance);
		generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
	}
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		getTheme<I>(this: Themeable<I>): AppliedClasses<I> {
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
