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

type CacheKey = {
	baseThemeClasses: {};
	overrideClasses?: {};
};

const themeMap = new WeakMap<ThemeManager, Theme>();
const themeManagerCacheMap = new WeakMap<ThemeManager, Map<CacheKey, ActiveClassMap<any>>>();

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
		themeMap.set(this, theme);
		themeManagerCacheMap.set(this, new Map<CacheKey, ActiveClassMap<any>>());
	},

	getThemeClasses<T extends {}>(this: ThemeManager, baseThemeClasses: T, overrideClasses?: {}): ActiveClassMap<T> {
		const cacheMap = themeManagerCacheMap.get(this);
		const cacheKey = { baseThemeClasses, overrideClasses };
		if (!cacheMap.has(cacheKey)) {
			const loadedTheme = themeMap.get(this);
			const activeClassMap = Object.keys(baseThemeClasses).reduce((activeClassMap, className) => {
				const classMap: ActiveClasses = activeClassMap[<keyof T> className] = {};
				let themeClassSource: Theme = baseThemeClasses;

				if (loadedTheme && loadedTheme.hasOwnProperty(className)) {
					themeClassSource = loadedTheme;
				}

				addClassNameToMap(classMap, themeClassSource, className);
				overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

				return activeClassMap;
			}, <ActiveClassMap<T>> {});

			cacheMap.set(cacheKey, activeClassMap);
		}

		return cacheMap.get(cacheKey);
	}
});

const themeManager = createThemeManager();

export default themeManager;
