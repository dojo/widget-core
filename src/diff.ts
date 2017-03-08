import { PropertyChangeRecord } from './interfaces';

export const enum DiffType {
	CUSTOM = 1,
	IGNORE,
	REFERENCE,
	SHALLOW,
	AUTO
}

function isObjectOrArray(value: any): boolean {
	return Object.prototype.toString.call(value) === '[object Object]' || Array.isArray(value);
}

function ignore(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: false,
		value: newProperty
	};
}

function custom(previousProperty: any, newProperty: any, meta: any): PropertyChangeRecord {
	const { diffFunction, scope } = meta;
	if (!diffFunction) {
		return {
			changed: false,
			value: newProperty
		};
	}
	return diffFunction.call(scope, previousProperty, newProperty);
}

function reference(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

function shallow(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let changed = false;

	const validOldProperty = previousProperty && isObjectOrArray(previousProperty);
	const validNewProperty = newProperty && isObjectOrArray(newProperty);

	if (!validOldProperty || !validNewProperty) {
		return {
			changed: true,
			value: newProperty
		};
	}

	const previousKeys = Object.keys(previousProperty);
	const newKeys = Object.keys(newProperty);

	if (previousKeys.length !== newKeys.length) {
		changed = true;
	}
	else {
		changed = newKeys.some((key) => {
			return newProperty[key] !== previousProperty[key];
		});
	}
	return {
		changed,
		value: newProperty
	};
}

export default function diff(diffDiffType: DiffType, previousProperty: any, newProperty: any, meta?: any) {
	let result;
	switch (diffDiffType) {
		case DiffType.CUSTOM:
			result = custom(previousProperty, newProperty, meta);
		break;
		case DiffType.IGNORE:
			result = ignore(previousProperty, newProperty);
		break;
		case DiffType.REFERENCE:
			result = reference(previousProperty, newProperty);
		break;
		case DiffType.SHALLOW:
			result = shallow(previousProperty, newProperty);
		break;
		case DiffType.AUTO:
			if (typeof newProperty === 'function') {
				result = ignore(previousProperty, newProperty);
			}
			else if (isObjectOrArray(newProperty)) {
				result = shallow(previousProperty, newProperty);
			}
			else {
				result = reference(previousProperty, newProperty);
			}
		break;
		default:
			result = {
				changed: true,
				value: newProperty
			};
	}
	return result;
}
