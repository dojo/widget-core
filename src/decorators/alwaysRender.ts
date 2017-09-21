import { handleDecorator } from './../WidgetBase';

export function alwaysRender() {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('alwaysRender');
	});
}

export default alwaysRender;
