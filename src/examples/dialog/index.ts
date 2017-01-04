import { DNode, Widget, WidgetState, WidgetProperties } from '../../interfaces';
import { w, v } from '../../d';
import createProjector, { ProjectorMixin } from '../../createProjector';
import createButton from '../../components/button/createButton';
import createDialog from '../../components/dialog/createDialog';

interface RootState extends WidgetState {
	open?: boolean;
	modal?: boolean;
	underlay?: boolean;
}

type Root = Widget<RootState, WidgetProperties> & ProjectorMixin;

function toggleModal(this: Root, event: Event) {
	this.setState({ modal: (<HTMLInputElement> event.target).checked });
}

function toggleUnderlay(this: Root, event: Event) {
	this.setState({ underlay: (<HTMLInputElement> event.target).checked });
}

const createApp = createProjector.mixin({
	mixin: {
		getChildrenNodes: function(this: Root): DNode[] {
			return [
				w(createDialog, {
					id: 'dialog',
					properties: {
						title: 'Dialog',
						open: this.state.open,
						modal: this.state.modal,
						underlay: this.state.underlay,
						onRequestClose: () => {
							this.setState({ open: false });
						}
					}
				}),
				w(createButton, {
					id: 'button',
					properties: { label: 'open dialog' },
					listeners: {
						click: () => {
							this.setState({ open: true });
						}
					}
				}),
				v('label', {
					for: 'modal',
					innerHTML: 'modal'
				}),
				v('input', {
					type: 'checkbox',
					id: 'modal',
					onchange: toggleModal
				}),
				v('label', {
					for: 'underlay',
					innerHTML: 'underlay'
				}),
				v('input', {
					type: 'checkbox',
					id: 'underlay',
					onchange: toggleUnderlay
				})
			];
		},
		classes: [ 'main-app' ],
		tagName: 'main'
	}
});

const app = createApp();

app.append().then(() => {
	console.log('projector is attached');
});
