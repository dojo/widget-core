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
export type FlaggedCSSModuleClassNames = {
	[key: string]: boolean;
}

export type CSSModuleClassNameMap<T> = {
	[P in keyof T]: string[];
}

export type ClassNames<T> = {
	[P in keyof T]: string;
}

/**
 * The object returned by getClasses.
 */
export type AppliedClasses<T> = {
	[P in keyof T]: FlaggedCSSModuleClassNames;
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
	classes: (...classNames: string[]) => FlaggedCSSModuleClassNames;
}

/**
 * Themeable
 */
export interface Themeable<T> extends ThemeableMixin<T> {
	baseTheme: BaseTheme<T>;
	properties: ThemeableProperties;
}

export interface BaseTheme<T> {
	classes: T;
	path: string;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin<any>, ThemeableOptions> {}

/**
 * Private map for the widgets themeClasses.
 */
const themeClassesMap = new WeakMap<Themeable<any>, AppliedClasses<any>>();
const classNameMap = new WeakMap<Themeable<any>, ClassNames<any>>();
const negativeClassMap = new WeakMap<Themeable<any>, FlaggedCSSModuleClassNames>();

function updateNegativeClassNames<T>(instance: Themeable<T>, classNames: string[]) {
	const negativeClassFlags = setClassNameFlags(classNames, false);
	const currentNegativeClassFlags = negativeClassMap.get(instance);
	negativeClassMap.set(instance, assign({}, currentNegativeClassFlags, negativeClassFlags));
}

function setClassNameFlags(classNames: string[], applied: boolean) {
	return classNames.reduce((flaggedClassNames: FlaggedCSSModuleClassNames, className) => {
		flaggedClassNames[className] = applied;
		return flaggedClassNames;
	}, <FlaggedCSSModuleClassNames> {});
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

		newAppliedClasses[className] = setClassNameFlags(combinedCssClassNames, true);

		return newAppliedClasses;
	}, <AppliedClasses<T>> {});

	updateNegativeClassNames(instance, allClasses);

	return themeClasses;
}

function updateThemeClassesMap<T>(instance: Themeable<T>, newThemeClasses: AppliedClasses<T>) {
	themeClassesMap.set(instance, newThemeClasses);
}

function onPropertiesChanged<T>(instance: Themeable<T>, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		const themeClasses = generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
		updateThemeClassesMap(instance, themeClasses);
	}
}

function getClassNames<T>(baseTheme: BaseTheme<T>): ClassNames<T> {
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
			return classNameMap.get(this);
		},
		classes(this: Themeable<any>, ...classNames: string[]) {
			const themeClasses = themeClassesMap.get(this);
			const newClassNames: string[] = [];
			const appliedClasses = classNames.reduce((currentAppliedClasses, className) => {
				if (themeClasses.hasOwnProperty(className)) {
					assign(currentAppliedClasses, themeClasses[className]);
				} else {
					assign(currentAppliedClasses, { [className]: true });
					newClassNames.push(className);
				}
				return currentAppliedClasses;
			}, <any> {});

			updateNegativeClassNames(this, newClassNames);
			return assign({}, negativeClassMap.get(this), appliedClasses);
		}
	},
	initialize<T>(instance: Themeable<T>) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin<T>, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		onPropertiesChanged(instance, instance.properties, [ 'theme' ]);
		classNameMap.set(instance, getClassNames(instance.baseTheme));
	}
});

export default themeableFactory;
