import compose, { ComposeFactory } from '@dojo/compose/compose';
import { isWNode, decorateDNodes } from '../../src/d';
import { Widget, WidgetProperties, DNode, WNode } from '../interfaces';

export interface PassedPropertiesOptions {}

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
				return decorateDNodes(
					dNodes,
					(dNode) => isWNode(dNode),
					(dNode: WNode) => {
						this.propertiesToPass.map((property: string) => {
							dNode.properties[property] = this.properties[property];
						});
					}
				);
			}
		}
	}
});

export default passedPropertiesMixin;
