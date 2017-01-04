import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { DNode, Widget, WidgetOptions, WidgetProperties, WidgetState } from '../../interfaces';
import createWidgetBase from '../../createWidgetBase';
import { v } from '../../d';

export interface DialogState extends WidgetState {
	closeable?: boolean;
	modal?: boolean;
	open?: boolean;
	title?: string;
	underlay?: boolean;
};

export interface DialogProperties extends WidgetProperties {
	closeable?: boolean;
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
	onContentClick?(event: MouseEvent): void;
	onUnderlayClick?(): void;
};

export interface DialogFactory extends ComposeFactory<Dialog, DialogOptions> { }

const createDialogWidget: DialogFactory = createWidgetBase
	.mixin({
		mixin: {
			onCloseClick: function (this: Dialog) {
				const closeable = this.state.closeable || typeof this.state.closeable === 'undefined';
				closeable && this.properties.onRequestClose && this.properties.onRequestClose.call(this);
			},

			onContentClick: function (event: MouseEvent) {
				event.stopPropagation();
			},

			onUnderlayClick: function (this: Dialog) {
				!this.state.modal && this.onCloseClick && this.onCloseClick();
			},

			getChildrenNodes: function (this: Dialog): DNode[] {
				const children: DNode[] = [ v('div.title', { innerHTML: this.state.title }) ];
				// TODO: Properly default closeable property to `true`
				if (this.state.closeable || typeof this.state.closeable === 'undefined') {
					children.push(v('div.close', {
						innerHTML: '✖',
						onclick: this.onCloseClick
					}));
				}
				children.push(v('div.content', this.children));
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
