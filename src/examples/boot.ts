import { DNode, Widget, WidgetState, WidgetProperties } from '../interfaces';
import { w } from '../d';
import createProjector, { ProjectorMixin } from '../createProjector';
import createButton from '../components/button/createButton';
import createDialog from '../components/dialog/createDialog';

interface RootState extends WidgetState {
	dialogOpen?: boolean;
	modalDialogOpen?: boolean;
}

type Root = Widget<RootState, WidgetProperties> & ProjectorMixin;

const createApp = createProjector.mixin({
	mixin: {
		getChildrenNodes: function(this: Root): DNode[] {
			return [
				w(createDialog, {
					id: 'dialog',
					properties: {
						title: 'Dialog',
						open: this.state.dialogOpen,
						onRequestClose: () => {
							this.setState({ dialogOpen: false });
						}
					}
				}),
				w(createDialog, {
					id: 'modal-dialog',
					properties: {
						title: 'Modal Dialog',
						modal: true,
						open: this.state.modalDialogOpen,
						onRequestClose: () => {
							this.setState({ modalDialogOpen: false });
						}
					}
				}),
				w(createButton, {
					id: 'button',
					properties: { label: 'open dialog' },
					listeners: {
						click: () => {
							this.setState({ dialogOpen: true });
						}
					}
				}),
				w(createButton, {
					id: 'modal-button',
					properties: { label: 'open modal dialog' },
					listeners: {
						click: () => {
							this.setState({ modalDialogOpen: true });
						}
					}
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
