import WeakMap from '@dojo/shim/WeakMap';
import { decorate, isWNode } from '../d';
import { DNode, WNode } from '../interfaces';
import { WidgetBase, handleDecorator, afterRender } from '../WidgetBase';

const propagateInstanceMap = new WeakMap<WidgetBase<any>, boolean>();

function propertyPropagator(this: WidgetBase<any>, node: DNode) {
	const propagatedProperties: string[] = (<any> this).getDecorator('propagateProperty').filter((propertyName: string) => {
		return propertyName in this.properties;
	});

	decorate(node, (wNode: WNode) => {
		propagatedProperties
			.filter(propertyName => !(propertyName in wNode.properties))
			.forEach(propertyName => {
				(<any> wNode.properties)[propertyName] = this.properties[propertyName];
			});
	}, isWNode);

	return node;
}

export function propagateProperty(propertyName: string) {
	return handleDecorator(target => {
		target.addDecorator('propagateProperty', propertyName);

		if (!propagateInstanceMap.has(target)) {
			afterRender(propertyPropagator)(target);
			propagateInstanceMap.set(target, true);
		}
	});
}
