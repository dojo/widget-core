import compose, { ComposeFactory } from 'dojo-compose/compose';

export type CSSModuleClassNames = {
	[key: string]: boolean;
}

export type AppliedClasses<T> = {
	[P in keyof T]?: CSSModuleClassNames;
}

type Theme = {
	[key: string]: string;
}

export interface ThemeManager {
	setTheme(theme: {}): void;
	getThemeClasses<T extends {}>(baseThemeClasses: T, overrideClasses?: {}): AppliedClasses<T>;
}

export interface ThemeManagerFactory extends ComposeFactory<ThemeManager, {}> { }

type CacheKey = {
	baseThemeClasses: {};
	overrideClasses?: {};
};

const themeMap = new WeakMap<ThemeManager, Theme>();
const themeManagerCacheMap = new WeakMap<ThemeManager, Map<CacheKey, AppliedClasses<any>>>();

function addClassNameToMap(classMap: CSSModuleClassNames, classList: Theme, className: string) {
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
		themeManagerCacheMap.set(this, new Map<CacheKey, AppliedClasses<{}>>());
	},

	getThemeClasses<T extends {}>(this: ThemeManager, baseThemeClasses: T, overrideClasses?: {}): AppliedClasses<T> {
		const cacheMap = themeManagerCacheMap.get(this);
		const cacheKey = { baseThemeClasses, overrideClasses };

		if (!cacheMap.has(cacheKey)) {
			const currentTheme = themeMap.get(this);
			const appliedClasses = Object.keys(baseThemeClasses).reduce((currentAppliedClasses, className) => {
				const classMap: CSSModuleClassNames = currentAppliedClasses[<keyof T> className] = {};
				let themeClassSource: Theme = baseThemeClasses;

				if (currentTheme && currentTheme.hasOwnProperty(className)) {
					themeClassSource = currentTheme;
				}

				addClassNameToMap(classMap, themeClassSource, className);
				overrideClasses && addClassNameToMap(classMap, overrideClasses, className);

				return currentAppliedClasses;
			}, <AppliedClasses<T>> {});

			cacheMap.set(cacheKey, appliedClasses);
		}

		return cacheMap.get(cacheKey);
	}
});

const themeManager = createThemeManager();

export default themeManager;
