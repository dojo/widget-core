import compose, { ComposeFactory } from 'dojo-compose/compose';

export type ActiveClasses = {
	[key: string]: boolean;
}

export type ActiveClassMap<T> = {
	[P in keyof T]?: ActiveClasses;
}

type Theme = {
	[key: string]: string;
}

export interface ThemeManager {
	setTheme(theme: {}): void;
	getThemeClasses<T extends {}>(baseThemeClasses: T, overrideClasses?: {}): ActiveClassMap<T>;
}

export interface ThemeManagerFactory extends ComposeFactory<ThemeManager, {}> { }

const themeManagerThemeMap = new WeakMap<ThemeManager, Theme>();

function addClassNameToMap(classMap: ActiveClasses, classList: Theme, className: string) {
	if (classList && classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			classMap[generatedClassName] = true;
		});
	}
}

const createThemeManager: ThemeManagerFactory = compose({
	setTheme(this: ThemeManager, theme: {}) {
		themeManagerThemeMap.set(this, theme);
	},

	getThemeClasses<T extends {}>(this: ThemeManager, baseThemeClasses: T, overrideClasses?: {}): ActiveClassMap<T> {
		const loadedTheme = themeManagerThemeMap.get(this);

		return Object.keys(baseThemeClasses).reduce((activeClassMap, className) => {
			const classMap: ActiveClasses = activeClassMap[<keyof T> className] = {};
			let themeClassSource: Theme = baseThemeClasses;

			if (loadedTheme && loadedTheme.hasOwnProperty(className)) {
				themeClassSource = loadedTheme;
			}

			addClassNameToMap(classMap, themeClassSource, className);
			overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

			return activeClassMap;
		}, <ActiveClassMap<T>> {});
	}
});

const themeManager = createThemeManager();

export default themeManager;
