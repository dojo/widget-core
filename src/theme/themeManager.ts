export type CSSModuleClassNames = {
	[key: string]: boolean;
}

export type AppliedClasses<T> = {
	[P in keyof T]?: CSSModuleClassNames;
}

type Theme = {
	[key: string]: string;
}

type CacheKey = {
	baseThemeClasses: {};
	overrideClasses?: {};
};

let currentTheme: Theme = {};
let cacheMap = new Map<CacheKey, AppliedClasses<any>>();

function addClassNameToMap(classMap: CSSModuleClassNames, classList: Theme, className: string) {
	if (classList && classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			classMap[generatedClassName] = true;
		});
	}
}

export function setTheme(theme: {}) {
	currentTheme = theme;
	cacheMap = new Map<CacheKey, AppliedClasses<{}>>();
};

export function getClasses<T extends {}>(baseThemeClasses: T, overrideClasses?: {}): AppliedClasses<T> {
	const cacheKey = { baseThemeClasses, overrideClasses };

	if (!cacheMap.has(cacheKey)) {
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
};
