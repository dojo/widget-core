import { DNode } from '../../interfaces';
import { w } from '../../d';
import createProjector, { ProjectorMixin } from '../../createProjector';
import createButton from '../../components/button/createButton';
import createTextInput from '../../components/textinput/createTextInput';
import createCheckbox from '../../components/checkbox/createCheckbox';

const createApp = createProjector.mixin({
	mixin: {
		getChildrenNodes: function(this: ProjectorMixin): DNode[] {
			return [
				w(createTextInput, {
					id: 'textinput',
					placeholder: 'Type Something new',
					label: 'Label Lama'
				}),
				w(createButton, {
					id: 'button',
					content: 'Sample Button'
				}),
				w(createCheckbox, {
					value: 'foo',
					label: 'Check me'
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
