import compose, { ComposeFactory } from '@dojo/compose/compose';
import { isWNode } from '../../src/d';
import { Widget, WidgetProperties, DNode } from '../interfaces';

export interface PassedPropertiesOptions {
}

export interface PassedProperties {
	propertiesToPass: string[];
}

export type Projector = Widget<WidgetProperties> & PassedProperties;

export interface PassedPropertiesFactory extends ComposeFactory<PassedProperties, PassedPropertiesOptions> {}

const passedPropertiesMixin: PassedPropertiesFactory = compose<PassedProperties, PassedPropertiesOptions>({
	propertiesToPass: []
}).mixin({
	aspectAdvice: {
		after: {
			getChildrenNodes(this: Projector, dNodes: DNode[]): DNode[] {
				let nodes = [ ...dNodes ];
				while (nodes.length) {
					const node = nodes.pop();
					if (node && typeof node !== 'string') {
						if (isWNode(node)) {
							this.propertiesToPass.map((property: string) => {
								node.properties[property] = this.properties[property];
							});
						}
						if (node.children) {
							nodes = [ ...nodes, ...(<any> node).children ];
						}
					}
				}
				return dNodes;
			}
		}
	}
});

export default passedPropertiesMixin;
