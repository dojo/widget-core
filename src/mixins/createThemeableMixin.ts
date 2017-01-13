import compose, { ComposeFactory } from 'dojo-compose/compose';
import { WidgetProperties, WidgetState } from '../interfaces';
import WeakMap from 'dojo-shim/WeakMap';

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
 * Properties required for the external state mixin
 */
export interface ThemeableProperties {
	/**
	 * An optional theme to be passed to the widget
	 */
	theme?: {};

	/**
	 * Optional override classes to be passed to the widget
	 */
	overrideClasses?: {};
}

/**
 * External State Options
 */
export interface ThemeableOptions {
	properties: ThemeableProperties;
}

export interface ThemeableMixin {
	setTheme: (theme: {}) => void;
	getTheme: <T extends {}>(baseThemeClasses: T, overrideClasses?: {}) => AppliedClasses<T>;
}

/**
 * Compose External State Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin, ThemeableOptions> {}

const themeMap = new WeakMap<ThemeableMixin, {}>();

function addClassNameToMap(classMap: CSSModuleClassNames, classList: StringIndexedObject, className: string) {
	if (classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			classMap[generatedClassName] = true;
		});
	}
}

const createThemeableMixin: ThemeableFactory = compose({
	setTheme(this: ThemeableMixin, theme: {}) {
		themeMap.set(this, theme);
	},
	getTheme<T extends {}>(this: ThemeableMixin, baseThemeClasses: T, overrideClasses?: {}): AppliedClasses<T> {
		const currentTheme = themeMap.get(this);

		return Object.keys(baseThemeClasses).reduce((currentAppliedClasses, className) => {
			const classMap: CSSModuleClassNames = currentAppliedClasses[<keyof T> className] = {};
			let themeClassSource: {} = baseThemeClasses;

			if (currentTheme && currentTheme.hasOwnProperty(className)) {
				themeClassSource = currentTheme;
			}

			addClassNameToMap(classMap, themeClassSource, className);
			overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

			return currentAppliedClasses;
		}, <AppliedClasses<T>> {});
	}
}, (instance: ThemeableMixin) => {
	themeMap.set(instance, {});
});

export default createThemeableMixin;
