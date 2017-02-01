import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';

/**
 * A representation of the css-module class names to be applied
 * where each class in appliedClasses is used.
 */
export type AppliedCSSModuleClassNames = {
	[key: string]: boolean;
}

/**
 * A mapping from class names to generatred css-module class names
 */
export type CSSModuleClassNameMap = {
	[key: string]: string[];
}

/**
 * A lookup object for available class names
 */
export type ClassNames = {
	[key: string]: string;
}

/**
 * The object returned by getClasses required by maquette for
 * adding / removing classes
 */
export type CSSModuleClasses = {
	[key: string]: AppliedCSSModuleClassNames;
};

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

export interface ClassesChain {
	classes: AppliedCSSModuleClassNames;
	fixed: (...classes: string[]) => ClassesChain;
	get: () => AppliedCSSModuleClassNames;
}

/**
 * Themeable Mixin
 */
export interface ThemeableMixin extends Evented {
	classes: (...classNames: string[]) => ClassesChain;
}

/**
 * Themeable
 */
export interface Themeable extends ThemeableMixin {
	baseTheme: BaseTheme;
	properties: ThemeableProperties;
}

/**
 * BaseTheme to be passed as this.baseTheme. The path string is used to
 * perform a lookup against any theme that has been set.
 */
export interface BaseTheme {
	classes: ClassNames;
	key: string;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin, ThemeableOptions> {}

type StringIndexedObject = { [key: string]: string; };

/**
 * Map containing lookups for available css module class names.
 * Responding object contains each css module class name that applies
 * with a boolean set to true.
 */
const cssModuleClassNameMap = new WeakMap<Themeable, CSSModuleClasses>();

/**
 * Map containing a reverse lookup for all the class names provided in the
 * widget's baseTheme.
 */
const baseThemeLookupMap = new WeakMap<Themeable, ClassNames>();

/**
 * Map containing every class name that has been applied to the widget.
 * Responding object consits of each ckass name with a boolean set to false.
 */
const allClassNamesMap = new WeakMap<Themeable, AppliedCSSModuleClassNames>();

function appendToAllClassNames(instance: Themeable, classNames: string[]) {
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

function generateThemeClasses(instance: Themeable, { classes: baseThemeClasses, key }: BaseTheme, theme: any = {}, overrideClasses: any = {}) {
	const applicableThemeClasses = theme.hasOwnProperty(key) ? theme[key] : {};
	const combinedThemeClasses = assign({}, baseThemeClasses, applicableThemeClasses);
	let allClasses: string[] = [];

	const themeClasses = Object.keys(combinedThemeClasses).reduce((newAppliedClasses, className: string) => {
		const cssClassNames = combinedThemeClasses[className].split(' ');
		const overrideCssClassNames = overrideClasses.hasOwnProperty(className) ? overrideClasses[className].split(' ') : [];
		const combinedCssClassNames = [...cssClassNames, ...overrideCssClassNames];
		allClasses = [...allClasses, ...combinedCssClassNames];

		newAppliedClasses[className] = setClassNameApplied(combinedCssClassNames, true);

		return newAppliedClasses;
	}, <CSSModuleClasses> {});

	appendToAllClassNames(instance, allClasses);

	return themeClasses;
}

function onPropertiesChanged(instance: Themeable, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		const themeClasses = generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
		cssModuleClassNameMap.set(instance, themeClasses);
	}
}

function createBaseThemeLookup({ classes }: BaseTheme): ClassNames {
	return Object.keys(classes).reduce((currentClassNames, key: string) => {
		currentClassNames[classes[key]] = key;
		return currentClassNames;
	}, <ClassNames> {});
}

function getThemeableClasses(this: Themeable, ...classNames: string[]) {
	const cssModuleClassNames = cssModuleClassNameMap.get(this);
	const baseThemeLookup = baseThemeLookupMap.get(this);
	const appliedClasses = classNames.reduce((currentCSSModuleClassNames, className) => {
		const classNameKey = baseThemeLookup[className];
		if (cssModuleClassNames.hasOwnProperty(classNameKey)) {
			assign(currentCSSModuleClassNames, cssModuleClassNames[classNameKey]);
		} else {
			console.error(`Class name: ${className} and lookup key: ${classNameKey} not from baseTheme, use chained 'fixed' method instead`);
		}
		return currentCSSModuleClassNames;
	}, <any> {});

	let responseClasses = assign({}, allClassNamesMap.get(this), appliedClasses);
	const instance = this;

	const response: ClassesChain = {
		classes: responseClasses,
		fixed(this: ClassesChain, ...classes: string[]) {
			assign(this.classes, setClassNameApplied(classes, true));
			appendToAllClassNames(instance, classes);
			return this;
		},
		get(this: ClassesChain) {
			return this.classes;
		}
	};

	return response;
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		classes: getThemeableClasses
	},
	initialize(instance: Themeable) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		onPropertiesChanged(instance, instance.properties, [ 'theme' ]);
		baseThemeLookupMap.set(instance, createBaseThemeLookup(instance.baseTheme));
	}
});

export default themeableFactory;
