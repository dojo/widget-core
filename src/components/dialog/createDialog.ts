import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { DNode, Widget, WidgetOptions, WidgetProperties, WidgetState } from '../../interfaces';
import createWidgetBase from '../../createWidgetBase';
import { v } from '../../d';

export interface DialogState extends WidgetState {
	title?: string;
	open?: boolean;
	modal?: boolean;
}

export interface DialogProperties extends WidgetProperties {
	title?: string;
	open?: boolean;
	modal?: boolean;
	onopen?(): void;
	onclose?(): void;
}

export interface DialogOptions extends WidgetOptions<DialogState, DialogProperties> { }

export type Dialog = Widget<DialogState, DialogProperties>;

export interface DialogFactory extends ComposeFactory<Dialog, DialogOptions> { };

function onCloseClick(this: Dialog) {
	this.setState({ open: false });
}

function onContentClick(this: Dialog, event: MouseEvent) {
	event.stopPropagation();
}

function onUnderlayClick(this: Dialog, event: MouseEvent) {
	if (this.state.modal) {
		return;
	}

	this.setState({ open: false });
}

const createDialogWidget: DialogFactory = createWidgetBase
	.mixin({
		mixin: {
			getChildrenNodes: function (this: Dialog): DNode[] {
				const children: DNode[] = [
					// TODO: CSS modules
					v('div.title', { innerHTML: this.state.title }),
					// TODO: CSS modules
					v('div.close', {
						innerHTML: '✖',
						onclick: onCloseClick
					}),
					// TODO: CSS modules
					v('div.content', this.children)
				];
				// TODO: CSS modules
				const content: DNode = v('div.content', { onclick: onContentClick }, children);
				return [ content ];
			},

			nodeAttributes: [
				function(this: Dialog): VNodeProperties {
					this.state.open && this.properties.onopen && this.properties.onopen();
					!this.state.open && this.properties.onclose && this.properties.onclose();
					return { 'data-open': this.state.open ? 'true' : 'false' };
				},
				function(this: Dialog): VNodeProperties {
					return { 'data-modal': this.state.modal ? 'true' : 'false' };
				}
			],

			listeners: { onclick: onUnderlayClick },

			// TODO: CSS modules
			classes: [ 'dialog' ]
		}
	});

export default createDialogWidget;
