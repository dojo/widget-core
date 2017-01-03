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
			console.log('a', this.state.dialogOpen);
			const self: Root = this;
			return [
				w(createDialog, {
					id: 'dialog',
					properties: {
						title: 'Dialog',
						open: this.state.dialogOpen,
						onclose: () => {
							console.log('b', this.state.dialogOpen);
							self.setState({ dialogOpen: false });
							console.log('c', this.state.dialogOpen);
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
