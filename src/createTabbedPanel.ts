import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createTabbedMixin, { TabbedMixin, TabbedChild, TabbedMixinOptions } from './mixins/createTabbedMixin';
import { RenderMixinState } from './mixins/createRenderMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';

export interface TabbedPanelState extends WidgetState, RenderMixinState, StatefulChildrenState { }

export type TabbedPanelOptions = WidgetOptions<TabbedPanelState> & TabbedMixinOptions<TabbedChild, TabbedPanelState> & StatefulChildrenOptions<TabbedChild, TabbedPanelState>;

export type TabbedPanel = Widget<WidgetState> & TabbedMixin<TabbedChild>;

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel: TabbedPanelFactory = createWidget
	.mixin(createTabbedMixin)
	.mixin(createStatefulChildrenMixin)
	.extend('TabbedPanel', {
		tagName: 'dojo-panel-tabbed'
	});

export default createTabbedPanel;
