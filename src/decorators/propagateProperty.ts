import WeakMap from '@dojo/shim/WeakMap';
import { decorate, isWNode } from '../d';
import { DNode, WNode } from '../interfaces';
import { WidgetBase, handleDecorator, afterRender } from '../WidgetBase';

const propagateInstanceMap = new WeakMap<WidgetBase<any>, boolean>();

export function propagateProperty(propertyName: string) {
	return handleDecorator(target => {
		const getDecorators = target.addDecorator('propagateProperty', propertyName);

		if (!propagateInstanceMap.has(target)) {
			afterRender(function (this: WidgetBase<any>, node: DNode) {
				const propagatedProperties: string[] = getDecorators(this).filter((propertyName: string) => {
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
			})(target);
			propagateInstanceMap.set(target, true);
		}
	});
}
