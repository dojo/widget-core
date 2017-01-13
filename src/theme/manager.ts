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

let currentTheme = {};

function addClassNameToMap(classMap: CSSModuleClassNames, classList: StringIndexedObject, className: string) {
	if (classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			classMap[generatedClassName] = true;
		});
	}
}
/**
 * Set the current theme. Theme classes will override widget
 * base classes.
 *
 * @param  theme The theme to be set
 */
export function setTheme(theme: {}) {
	currentTheme = theme;
};

/**
 * Gets complete list of classes from the manager to be applied to a widget.
 *
 * @param  baseThemeClasses Classes passed in by the widget requesting classes. These are overridden by
 * any theme classes with the same name.
 * @param  overrideClasses? Classes to be added to the widget along side the theme / base class.
 * @returns AppliedClasses An object representing the resulting classes to be applied.
 */
export function getTheme<T extends {}>(baseThemeClasses: T, overrideClasses?: {}): AppliedClasses<T> {
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
};
