import { ComposeFactory } from 'dojo-compose/compose';
import { DNode, Children, WNode, Widget, WidgetOptions, WidgetState } from './interfaces';

export const fakeFactoryRegistry = new Map<string, ComposeFactory<any, any>>();

function w<S extends WidgetState, W extends Widget<S>, O extends WidgetOptions<S>>(
	factory: ComposeFactory<W, O> | string,
	options: O,
	children: Children
): WNode {

	if (typeof factory === 'string') {
		if (fakeFactoryRegistry.has(factory)) {
			factory = fakeFactoryRegistry.get(factory);
		}
		else {
			throw new Error('factory not registered.');
		}
	}

	const filteredChildren = <(DNode)[]> children.filter((child) => child);

	return {
		children: filteredChildren,
		factory,
		options
	};
}

export default w;
