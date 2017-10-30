import { Constructor, WidgetProperties } from './../interfaces';
import { Registry } from './../Registry';
import { Injector } from './../Injector';
import { inject } from './../decorators/inject';
import { WidgetBase } from './../WidgetBase';
import { handleDecorator } from './../decorators/handleDecorator';
import { diffProperty } from './../decorators/diffProperty';
import { shallow } from './../diff';

/**
 * A lookup object for available class names
 */
export type ClassNames = {
	[key: string]: string;
};

/**
 * A lookup object for available widget classes names
 */
export interface Theme {
	[key: string]: object;
}

/**
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties<T = ClassNames> extends WidgetProperties {
	injectedTheme?: any;
	theme?: Theme;
	extraClasses?: { [P in keyof T]?: string };
}

const THEME_KEY = ' _key';

export const INJECTED_THEME_KEY = Symbol('theme');

/**
 * Interface for the ThemeableMixin
 */
export interface ThemeableMixin<T = ClassNames> {
	theme(...classNames: (string | null)[]): string[];
	properties: ThemeableProperties<T>;
}

/**
 * Decorator for base css classes
 */
export function theme (theme: {}) {
	return handleDecorator((target) => {
		target.addDecorator('baseThemeClasses', theme);
	});
}

/**
 * Creates a reverse lookup for the classes passed in via the `theme` function.
 *
 * @param classes The baseClasses object
 * @requires
 */
function createThemeClassesLookup(classes: ClassNames[]): ClassNames {
	return classes.reduce((currentClassNames, baseClass) => {
		Object.keys(baseClass).forEach((key: string) => {
			currentClassNames[baseClass[key]] = key;
		});
		return currentClassNames;
	}, <ClassNames> {});
}

/**
 * Convenience function that is given a theme and an optional registry, the theme
 * injector is defined against the registry, returning the theme.
 *
 * @param theme the theme to set
 * @param themeRegistry registry to define the theme injector against. Defaults
 * to the global registry
 *
 * @returns the theme injector used to set the theme
 */
export function registerThemeInjector(theme: any, themeRegistry: Registry): Injector {
	const themeInjector = new Injector(theme);
	themeRegistry.defineInjector(INJECTED_THEME_KEY, themeInjector);
	return themeInjector;
}

/**
 * Function that returns a class decorated with with Themeable functionality
 */
export function ThemeableMixin<E, T extends Constructor<WidgetBase<ThemeableProperties<E>>>>(Base: T): Constructor<ThemeableMixin<E>> & T {
	@inject({
		name: INJECTED_THEME_KEY,
		getProperties: (theme: Theme, properties: ThemeableProperties): ThemeableProperties  => {
		if (!properties.theme) {
			return { theme };
		}
		return {};
	}})
	class Themeable extends Base {

		public properties: ThemeableProperties<E>;

		/**
		 * The Themeable baseClasses
		 */
		private _registeredBaseTheme: ClassNames;

		/**
		 * Registered base theme keys
		 */
		private _registeredBaseThemeKeys: string[] = [];

		/**
		 * Reverse lookup of the theme classes
		 */
		private _baseThemeClassesReverseLookup: ClassNames;

		/**
		 * Indicates if classes meta data need to be calculated.
		 */
		private _recalculateClasses = true;

		/**
		 * Loaded theme
		 */
		private _theme: ClassNames = {};

		public theme(...classNames: (string | null)[]): string[] {
			if (this._recalculateClasses) {
				this._recalculateThemeClasses();
			}
			return this._getThemeClasses(classNames);
		}

		/**
		 * Function fired when `theme` or `extraClasses` are changed.
		 */
		@diffProperty('theme', shallow)
		@diffProperty('extraClasses', shallow)
		protected onPropertiesChanged() {
			this._recalculateClasses = true;
		}

		/**
		 * Get theme class object from classNames
		 */
		private _getThemeClasses(classNames: (string | null)[]): string[]  {
			const extraClasses = this.properties.extraClasses || {} as any;
			let themeClasses: string[] = [];
			for (let i = 0; i < classNames.length; i++) {
				const className = classNames[i];
				if (!className) {
					continue;
				}
				const themeClassName = this._baseThemeClassesReverseLookup[className];
				if (!themeClassName) {
					console.warn(`Class name: '${className}' not found`);
					continue;
				}

				if (extraClasses[themeClassName]) {
					themeClasses.push(...extraClasses[themeClassName].split(' '));
				}

				if (this._theme[themeClassName]) {
					themeClasses = [ ...themeClasses, ...this._theme[themeClassName].split(' ') ];
					continue;
				}
				themeClasses.push(this._registeredBaseTheme[themeClassName]);
			}
			return themeClasses;
		}

		private _recalculateThemeClasses() {
			const { theme = {} } = this.properties;
			const baseThemes = this.getDecorator('baseThemeClasses');
			if (!this._registeredBaseTheme) {
				this._registeredBaseTheme = baseThemes.reduce((finalBaseTheme, baseTheme) => {
					const { [THEME_KEY]: key, ...classes }  = baseTheme;
					this._registeredBaseThemeKeys.push(key);
					return { ...classes, ...finalBaseTheme };
				}, {});
				this._baseThemeClassesReverseLookup = createThemeClassesLookup(baseThemes);
			}

			this._theme = this._registeredBaseThemeKeys.reduce((baseTheme, themeKey) => {
				return { ...baseTheme, ...theme[themeKey] };
			}, {});

			this._recalculateClasses = false;
		}
	}

	return Themeable;
}

export default ThemeableMixin;
