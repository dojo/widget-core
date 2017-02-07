import { WidgetBaseConstructor, WidgetProperties, WidgetOptions } from './../WidgetBase';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { assign } from '@dojo/core/lang';

/**
 * A representation of the css class names to be applied and
 * removed.
 */
export type ClassNameFlags = {
	[key: string]: boolean;
}

/**
 * A lookup object for available class names
 */
export type ClassNames = {
	[key: string]: string;
}

/**
 * The object returned by getClasses required by maquette for
 * adding / removing classes. They are flagged to true / false.
 */
export type ClassNameFlagsMap = {
	[key: string]: ClassNameFlags;
}

/**
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties extends WidgetProperties {
	theme?: {};
	overrideClasses?: {};
}

/**
 * Returned by classes function.
 */
export interface ClassesFunctionChain {
	/**
	 * The classes to be returned when get() is called
	 */
	classes: ClassNameFlags;
	/**
	 * Function to pass fixed class names that bypass the theming
	 * process
	 */
	fixed: (...classes: string[]) => ClassesFunctionChain;
	/**
	 * Finalize function to return the generated class names
	 */
	get: () => ClassNameFlags;
}

type BaseClasses = { [key: string]: string; };

export interface ThemableOptions<P extends WidgetProperties> extends WidgetOptions<P> {

	baseClasses: {};
}

const THEME_KEY = ' _key';

export function Themeable(base: WidgetBaseConstructor<ThemeableProperties>) {
	return class extends base {

		private allClasses: ClassNameFlags;
		private baseClassesReverseLookup: ClassNames;
		private generatedClassName: ClassNameFlagsMap;
		public baseClasses: {};

		constructor(options: ThemableOptions<ThemeableProperties>) {
			super(options);

			this.baseClasses = options.baseClasses;
			this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<this, ThemeableProperties>) => {
				this.onPropertiesChanged(evt.properties, evt.changedPropertyKeys);
			}));
			this.onPropertiesChanged(this.properties, [ 'theme' ]);
			this.baseClassesReverseLookup = this.createBaseClassesLookup(this.baseClasses);
		}

		public classes(...classNames: string[]) {

			const appliedClasses = classNames.reduce((currentCSSModuleClassNames, className) => {
				const classNameKey = this.baseClassesReverseLookup[className];
				if (this.generatedClassName.hasOwnProperty(classNameKey)) {
					assign(currentCSSModuleClassNames, this.generatedClassName[classNameKey]);
				}
				else {
					console.warn(`Class name: ${className} and lookup key: ${classNameKey} not from baseClasses, use chained 'fixed' method instead`);
				}
				return currentCSSModuleClassNames;
			}, {});

			const responseClasses = assign({}, this.allClasses, appliedClasses);
			const themeable = this;

			const classesResponseChain: ClassesFunctionChain = {
				classes: responseClasses,
				fixed(this: ClassesFunctionChain, ...classes: string[]) {
					const splitClasses = themeable.splitClassStrings(classes);
					assign(this.classes, themeable.createClassNameObject(splitClasses, true));
					themeable.appendToAllClassNames(splitClasses);
					return this;
				},
				get(this: ClassesFunctionChain) {
					return this.classes;
				}
			};

			return classesResponseChain;
		}

		private appendToAllClassNames(classNames: string[]) {
			const negativeClassFlags = this.createClassNameObject(classNames, false);
			this.allClasses = assign({}, this.allClasses, negativeClassFlags);
		}

		private createClassNameObject(classNames: string[], applied: boolean) {
			return classNames.reduce((flaggedClassNames: ClassNameFlags, className) => {
				flaggedClassNames[className] = applied;
				return flaggedClassNames;
			}, {});
		}

		private generateThemeClasses(baseClasses: BaseClasses, theme: any = {}, overrideClasses: any = {}) {
			let allClasses: string[] = [];
			const themeKey = baseClasses[THEME_KEY];
			const sourceThemeClasses = themeKey && theme.hasOwnProperty(themeKey) ? assign({}, baseClasses, theme[themeKey]) : baseClasses;

			const themeClasses = Object.keys(baseClasses).reduce((newAppliedClassNames, className: string) => {
				if (className === THEME_KEY) {
					return newAppliedClassNames;
				}

				let cssClassNames = sourceThemeClasses[className].split(' ');

				if (overrideClasses.hasOwnProperty(className)) {
					cssClassNames = [...cssClassNames, ...overrideClasses[className].split(' ')];
				}

				allClasses = [...allClasses, ...cssClassNames];

				newAppliedClassNames[className] = this.createClassNameObject(cssClassNames, true);

				return newAppliedClassNames;
			}, <ClassNameFlagsMap> {});

			this.appendToAllClassNames(allClasses);

			return themeClasses;
		}

		private onPropertiesChanged({ theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
			const themeChanged = includes(changedPropertyKeys, 'theme');
			const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

			if (themeChanged || overrideClassesChanged) {
				this.generatedClassName = this.generateThemeClasses(this.baseClasses, theme, overrideClasses);
			}
		}

		private createBaseClassesLookup(classes: BaseClasses): ClassNames {
			return Object.keys(classes).reduce((currentClassNames, key: string) => {
				currentClassNames[classes[key]] = key;
				return currentClassNames;
			}, <ClassNames> {});
		}

		private splitClassStrings(classes: string[]): string[] {
			return classes.reduce((splitClasses: string[], className) => {
				if (className.indexOf(' ') > -1) {
					splitClasses.push(...className.split(' '));
				}
				else {
					splitClasses.push(className);
				}
				return splitClasses;
			}, []);
		}
	};
}
