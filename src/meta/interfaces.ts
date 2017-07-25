import MetaBase from './Base';
import Map from '@dojo/shim/Map';

/**
 * Meta Base constructor type
 */
export interface WidgetMetaConstructor<T extends MetaBase<any>, O extends WidgetMetaOptions = WidgetMetaOptions> {
	new (properties: WidgetMetaProperties, options: O): T;
}

/**
 * Options passed via MetaWithOptions factory
 */
export interface WidgetMetaOptions {}

/**
 * Callback when asking widget meta for a required node
 */
export interface WidgetMetaRequiredNodeCallback {
	(node: Element): void;
}

/**
 * Properties passed to meta Base constructors
 */
export interface WidgetMetaProperties {
	nodes: Map<string, HTMLElement>;
	requiredNodes: Map<string, WidgetMetaRequiredNodeCallback[]>;
	invalidate: () => void;
}
