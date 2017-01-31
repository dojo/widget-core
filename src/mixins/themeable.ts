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
export type AppliedCSSModuleClassNames = {
	[key: string]: boolean;
}

/**
 * A mapping from class names to generatred
 * css-module class names
 */
export type CSSModuleClassNameMap<T> = {
	[P in keyof T]: string[];
}

/**
 * A lookup object for available class names
 */
export type ClassNames<T> = {
	[P in keyof T]: string;
}

/**
 * The object returned by getClasses required
 * by maquette for adding / removing classes
 */
export type CSSModuleClasses<T> = {
	[P in keyof T]: AppliedCSSModuleClassNames;
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
export interface ThemeableMixin<T> extends Evented {
	theme: ClassNames<T>;
	classes: (...classNames: string[]) => AppliedCSSModuleClassNames;
}

/**
 * Themeable
 */
export interface Themeable<T> extends ThemeableMixin<T> {
	baseTheme: BaseTheme<T>;
	properties: ThemeableProperties;
}

/**
 * BaseTheme to be passed as this.baseTheme
 * The path string is used to perform a lookup
 * against any theme that has been set.
 */
export interface BaseTheme<T> {
	classes: T;
	path: string;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin<any>, ThemeableOptions> {}

/**
 * Map containing lookups for available css module class names,.
 * Responding object contains each css module class name that applies
 * with a boolean set to true.
 */
const cssModuleClassNameMap = new WeakMap<Themeable<any>, CSSModuleClasses<any>>();

/**
 * Map containing a lookup for all the class names provided in the
 * widgets baseTheme.
 */
const availableClassNameMap = new WeakMap<Themeable<any>, ClassNames<any>>();

/**
 * Map containing every class name that has been applied to the widget.
 * Responding object consits of each ckass name with a boolean set to false.
 */
const allClassNamesMap = new WeakMap<Themeable<any>, AppliedCSSModuleClassNames>();

function appendToAllClassNames<T>(instance: Themeable<T>, classNames: string[]) {
	const negativeClassFlags = setClassNameApplied(classNames, false);
	const currentNegativeClassFlags = allClassNamesMap.get(instance);
	allClassNamesMap.set(instance, assign({}, currentNegativeClassFlags, negativeClassFlags));
}

function setClassNameApplied(classNames: string[], applied: boolean) {
	return classNames.reduce((flaggedClassNames: AppliedCSSModuleClassNames, className) => {
		flaggedClassNames[className] = applied;
		return flaggedClassNames;
	}, <AppliedCSSModuleClassNames> {});
}

function generateThemeClasses<T>(instance: Themeable<T>, { classes: baseThemeClasses, path }: BaseTheme<T>, theme: any = {}, overrideClasses: any = {}) {
	const applicableThemeClasses = theme.hasOwnProperty(path) ? theme[path] : {};
	const combinedThemeClasses = assign({}, baseThemeClasses, applicableThemeClasses);
	let allClasses: string[] = [];

	const themeClasses = Object.keys(combinedThemeClasses).reduce((newAppliedClasses, className: keyof T) => {
		const cssClassNames = combinedThemeClasses[className].split(' ');
		const overrideCssClassNames = overrideClasses.hasOwnProperty(className) ? overrideClasses[className].split(' ') : [];
		const combinedCssClassNames = [...cssClassNames, ...overrideCssClassNames];
		allClasses = [...allClasses, ...combinedCssClassNames];

		newAppliedClasses[className] = setClassNameApplied(combinedCssClassNames, true);

		return newAppliedClasses;
	}, <CSSModuleClasses<T>> {});

	appendToAllClassNames(instance, allClasses);

	return themeClasses;
}

function onPropertiesChanged<T>(instance: Themeable<T>, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		const themeClasses = generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
		cssModuleClassNameMap.set(instance, themeClasses);
	}
}

function getAvailableClassNames<T>(baseTheme: BaseTheme<T>): ClassNames<T> {
	return Object.keys(baseTheme.classes).reduce((currentClassNames, key: keyof T) => {
		currentClassNames[key] = key;
		return currentClassNames;
	}, <ClassNames<T>> {});
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		get theme(this: Themeable<any>): ClassNames<any> {
			return availableClassNameMap.get(this);
		},
		classes(this: Themeable<any>, ...classNames: string[]) {
			const cssModuleClassNames = cssModuleClassNameMap.get(this);
			const newClassNames: string[] = [];
			const appliedClasses = classNames.reduce((currentCSSModuleClassNames, className) => {
				if (cssModuleClassNames.hasOwnProperty(className)) {
					assign(currentCSSModuleClassNames, cssModuleClassNames[className]);
				} else {
					assign(currentCSSModuleClassNames, { [className]: true });
					newClassNames.push(className);
				}
				return currentCSSModuleClassNames;
			}, <any> {});

			appendToAllClassNames(this, newClassNames);
			return assign({}, allClassNamesMap.get(this), appliedClasses);
		}
	},
	initialize<T>(instance: Themeable<T>) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin<T>, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		onPropertiesChanged(instance, instance.properties, [ 'theme' ]);
		availableClassNameMap.set(instance, getAvailableClassNames(instance.baseTheme));
	}
});

export default themeableFactory;
