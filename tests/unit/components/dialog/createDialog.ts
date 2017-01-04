import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from 'dojo-interfaces/vdom';
import createDialog from '../../../../src/components/dialog/createDialog';
import createProjector from '../../../../src/createProjector';
import { w } from '../../../../src/d';

registerSuite({
	name: 'createDialog',

	construction() {
		const dialog = createDialog({
			properties: {
				id: 'foo',
				modal: true,
				open: false,
				title: 'dialog',
				underlay: true,
				closeable: true
			}
		});
		assert.strictEqual(dialog.state.id, 'foo');
		assert.isTrue(dialog.state.modal);
		assert.isFalse(dialog.state.open);
		assert.strictEqual(dialog.state.title, 'dialog');
		assert.isTrue(dialog.state.underlay);
		assert.isTrue(dialog.state.closeable);
	},

	render() {
		const dialog = createDialog({
			properties: {
				id: 'foo',
				open: true,
				underlay: true
			}
		});
		const vnode = <VNode> dialog.__render__();
		assert.strictEqual(vnode.vnodeSelector, 'div.dialog');
		assert.strictEqual(vnode.properties!['data-widget-id'], 'foo');
		assert.strictEqual(vnode.properties!['data-underlay'], 'true');
		assert.strictEqual(vnode.properties!['data-open'], 'true');
		assert.lengthOf(vnode.children, 1);
	},

	onRequestClose() {
		const dialog = createDialog({
			properties: {
				open: true,
				onRequestClose: () => {
					dialog.setState({ open: false });
				}
			}
		});

		dialog.onCloseClick && dialog.onCloseClick();
		assert.isFalse(dialog.state.open);
	},

	onOpen(this: any) {
		let dfd = this.async(1000, 1);

		function onOpen(): void {
			let func = dfd.callback(() => { });
			func.call();
		}

		const dialog = w(createDialog, {
			properties: {
				open: true,
				onOpen: onOpen
			}
		});

		const projector = createProjector();
		projector.children = [ dialog ];
		projector.append();
	},

	modal() {
		const dialog = createDialog({
			properties: {
				open: true,
				modal: true,
				onRequestClose: () => {
					dialog.setState({ open: false });
				}
			}
		});

		dialog.onContentClick && dialog.onContentClick(<MouseEvent> { stopPropagation: () => { }});
		dialog.onUnderlayClick && dialog.onUnderlayClick();
		assert.isTrue(dialog.state.open);
	},

	closeable() {
		const dialog = createDialog({
			properties: {
				closeable: false,
				open: true
			}
		});

		dialog.onCloseClick && dialog.onCloseClick();
		assert.isTrue(dialog.state.open);
	}
});
