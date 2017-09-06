import { handleDecorator } from './../WidgetBase';
import { BeforeProperties } from './../interfaces';

/**
 *
 */
export function beforeProperties(method: BeforeProperties): (target: any) => void;
export function beforeProperties(): (target: any, propertyKey: string) => void;
export function beforeProperties(method?: BeforeProperties) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('beforeProperties', propertyKey ? target[propertyKey] : method);
	});
}

export default beforeProperties;
