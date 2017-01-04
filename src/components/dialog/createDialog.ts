import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { DNode, Widget, WidgetOptions, WidgetProperties, WidgetState } from '../../interfaces';
import createWidgetBase from '../../createWidgetBase';
import { v } from '../../d';

export interface DialogState extends WidgetState {
	title?: string;
	open?: boolean;
	modal?: boolean;
	underlay?: boolean;
};

export interface DialogProperties extends WidgetProperties {
	modal?: boolean;
	open?: boolean;
	title?: string;
	underlay?: boolean;
	onOpen?(): void;
	onRequestClose?(): void;
};

export interface DialogOptions extends WidgetOptions<DialogState, DialogProperties> { };

export type Dialog = Widget<DialogState, DialogProperties> & {
	onCloseClick?(): void;
	onContentClick?(): void;
	onUnderlayClick?(): void;
};

export interface DialogFactory extends ComposeFactory<Dialog, DialogOptions> { }

const createDialogWidget: DialogFactory = createWidgetBase
	.mixin({
		mixin: {
			onCloseClick: function (this: Dialog) {
				this.properties.onRequestClose && this.properties.onRequestClose.call(this);
			},

			onContentClick: function (this: Dialog, event: MouseEvent) {
				event.stopPropagation();
			},

			onUnderlayClick: function (this: Dialog) {
				!this.state.modal && this.onCloseClick && this.onCloseClick();
			},

			getChildrenNodes: function (this: Dialog): DNode[] {
				const children: DNode[] = [
					v('div.title', { innerHTML: this.state.title }),
					v('div.close', {
						innerHTML: '✖',
						onclick: this.onCloseClick
					}),
					v('div.content', this.children)
				];
				const content: DNode = v('div.content', { onclick: this.onContentClick }, children);
				return [ content ];
			},

			nodeAttributes: [
				function(this: Dialog): VNodeProperties {
					this.state.open && this.properties.onOpen && this.properties.onOpen.call(this);
					return {
						onclick: this.onUnderlayClick,
						'data-open': this.state.open ? 'true' : 'false',
						'data-underlay': this.state.underlay ? 'true' : 'false'
					};
				}
			],

			classes: [ 'dialog' ]
		}
	});

export default createDialogWidget;
