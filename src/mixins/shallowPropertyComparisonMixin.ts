import { entries } from '@dojo/shim/object';
import { WidgetProperties, PropertyComparison } from './../interfaces';

/**
 * Determine if the value is an Object
 */
function isObject(value: any) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Shallow comparison of all keys on the objects
 */
function shallowCompare(from: any, to: any) {
	return Object.keys(from).every((key) => from[key] === to[key]);
}

/**
 * Mixin that overrides the `diffProperties` method providing a shallow comparison of attributes.
 *
 * For Objects, values for all `keys` are compared against the equivalent `key` on the `previousProperties`
 * attribute using `===`. If the `key` does not exists on the `previousProperties` attribute it is considered unequal.
 *
 * For Arrays, each `item` is compared with the `item` in the equivalent `index` of the `previousProperties` attribute.
 * If the `item` is an `object` then the object comparison described above is applied otherwise a simple `===` is used.
 */
const shallowPropertyComparisonMixin: { mixin: PropertyComparison<WidgetProperties> } = {
	mixin: {
		diffProperties<S>(this: S, previousProperties: WidgetProperties, newProperties: WidgetProperties): string[] {
			const changedPropertyKeys: string[] = [];

			entries(newProperties).forEach(([ key, value ]) => {
				let isEqual = true;
				if (previousProperties.hasOwnProperty(key)) {
					const previousValue = (<any> previousProperties)[key];
					if (Array.isArray(value) && Array.isArray(previousValue)) {
						if (value.length !== previousValue.length) {
							isEqual = false;
						}
						else {
							isEqual = value.every((item: any, index: number) => {
								if (isObject(item)) {
									return shallowCompare(item, previousValue[index]);
								}
								else {
									return item === previousValue[index];
								}
							});
						}
					}
					else if (isObject(value) && isObject(previousValue)) {
						isEqual = shallowCompare(value, previousValue);
					}
					else {
						isEqual = value === previousValue;
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
		},
		assignProperties<S>(this: S, previousProperties: WidgetProperties, newProperties: WidgetProperties, changedPropertyKeys: string[]): WidgetProperties {
			return Object.keys(newProperties).reduce((properties, key) => {
				const newValue = newProperties[key];
				if (Array.isArray(newValue)) {
					properties[key] = newValue.map((value: any) => {
						return isObject(value) ? Object.assign({}, value) : value;
					});
				}
				else {
					properties[key] = isObject(newValue) ? Object.assign({}, newValue) : newValue;
				}
				return properties;
			}, <WidgetProperties> {});
		}
	}
};

export default shallowPropertyComparisonMixin;
