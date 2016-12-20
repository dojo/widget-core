import { entries } from 'dojo-shim/Object';

export interface ShallowPropertyComparisonMixin {
	diffProperties(previousProperties: any): string[];
}

function isObject(value: any) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function shallowCompare(from: any, to: any) {
	if (to) {
		return Object.keys(from).every((key) => from[key] === to[key]);
	}
	return false;
}

const shallowPropertyComparisonMixin: { mixin: ShallowPropertyComparisonMixin } = {
	mixin: {
		diffProperties(this: { properties: any }, previousProperties: any): string[] {
			const changedPropertyKeys: string[] = [];

			entries(this.properties).forEach(([key, value]) => {
				let isEqual = true;
				if (previousProperties.hasOwnProperty(key)) {
					if (!(typeof value === 'function')) {
						if (Array.isArray(value)) {
							isEqual = value.every((item: any, index: number) => {
								if (isObject(item)) {
									return shallowCompare(item, previousProperties[key][index]);
								}
								else {
									return item === previousProperties[key][index];
								}
							});
						}
						else if (isObject(value)) {
							isEqual = shallowCompare(value, previousProperties[key]);
						}
						else {
							isEqual = value === previousProperties[key];
						}
					}
				}
				else {
					isEqual = false;
				}
				if (!isEqual) {
					changedPropertyKeys.push(key);
				}
			});
			return changedPropertyKeys;
		}
	}
};

export default shallowPropertyComparisonMixin;
