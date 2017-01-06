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
	enterAnimation?: string;
	exitAnimation?: string;
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
	onUnderlayClick?(): void;
};

export interface DialogFactory extends ComposeFactory<Dialog, DialogOptions> { };

const createDialogWidget: DialogFactory = createWidgetBase
	.mixin({
		mixin: {
			onCloseClick: function (this: Dialog) {
				const closeable = this.state.closeable || typeof this.state.closeable === 'undefined';
				closeable && this.properties.onRequestClose && this.properties.onRequestClose.call(this);
			},

			onUnderlayClick: function (this: Dialog) {
				!this.state.modal && this.onCloseClick && this.onCloseClick();
			},

			getChildrenNodes: function (this: Dialog): DNode[] {
				const {
					closeable = true,
					enterAnimation = 'show',
					exitAnimation = 'hide'
				} = this.properties;

				const children: DNode[] = [
					v('div.underlay', {
						enterAnimation: 'show',
						exitAnimation: 'hide',
						onclick: this.onUnderlayClick
					}),
					v('div.main', {
						enterAnimation: enterAnimation,
						exitAnimation: exitAnimation
					}, [
						v('div.title', [
							this.state.title ? this.state.title : null,
							closeable ? v('div.close', {
								innerHTML: '✕',
								onclick: this.onCloseClick
							}) : null
						]),
						v('div.content', this.children)
					])
				];

				return this.state.open ? children : [];
			},

			nodeAttributes: [
				function(this: Dialog): VNodeProperties {
					this.state.open && this.properties.onOpen && this.properties.onOpen.call(this);
					return {
						'data-underlay': this.state.underlay ? 'true' : 'false',
						'data-open': this.state.open ? 'true' : 'false'
					};
				}
			],

			classes: [ 'dialog' ]
		}
	});

export default createDialogWidget;
