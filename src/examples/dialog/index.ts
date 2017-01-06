import { DNode, Widget, WidgetState, WidgetProperties } from '../../interfaces';
import { w, v } from '../../d';
import createProjector, { ProjectorMixin } from '../../createProjector';
import createButton from '../../components/button/createButton';
import createDialog from '../../components/dialog/createDialog';

interface RootState extends WidgetState {
	open?: boolean;
	modal?: boolean;
	underlay?: boolean;
	closeable?: boolean;
	enterAnimation?: string;
	exitAnimation?: string;
}

interface RootProperties extends WidgetProperties {
	open?: boolean;
	modal?: boolean;
	underlay?: boolean;
	closeable?: boolean;
	enterAnimation?: string;
	exitAnimation?: string;
};

type Root = Widget<RootState, RootProperties> & ProjectorMixin;

function toggleModal(this: Root, event: Event) {
	this.setState({ modal: (<HTMLInputElement> event.target).checked });
}

function toggleUnderlay(this: Root, event: Event) {
	this.setState({ underlay: (<HTMLInputElement> event.target).checked });
}

function toggleCloseable(this: Root, event: Event) {
	this.setState({ closeable: (<HTMLInputElement> event.target).checked });
}

function toggleEnterAnimation(this: Root, event: Event) {
	this.setState({ enterAnimation: (<HTMLInputElement> event.target).checked ? 'slideIn' : undefined });
}

function toggleExitAnimation(this: Root, event: Event) {
	this.setState({ exitAnimation: (<HTMLInputElement> event.target).checked ? 'slideOut' : undefined });
}

const createApp = createProjector.mixin({
	mixin: {
		cssTransitions: true,
		getChildrenNodes: function(this: Root): DNode[] {
			return [
				w(createDialog, {
					id: 'dialog',
					properties: {
						title: 'Dialog',
						open: this.state.open,
						modal: this.state.modal,
						underlay: this.state.underlay,
						closeable: this.state.closeable,
						enterAnimation: this.state.enterAnimation,
						exitAnimation: this.state.exitAnimation,
						onRequestClose: () => {
							this.setState({ open: false });
						}
					}
				}, [
					`Lorem ipsum dolor sit amet, consectetur adipiscing elit.
					Quisque id purus ipsum. Aenean ac purus purus.
					Nam sollicitudin varius augue, sed lacinia felis tempor in.`
				]),
				w(createButton, {
					id: 'button',
					properties: { label: 'open dialog' },
					listeners: {
						click: () => {
							this.setState({ open: true });
						}
					}
				}),
				v('div', { classes: { option: true }}, [
					v('input', {
						type: 'checkbox',
						id: 'modal',
						onchange: toggleModal
					}),
					v('label', {
						for: 'modal',
						innerHTML: 'modal'
					})
				]),
				v('div', { classes: { option: true }}, [
					v('input', {
						type: 'checkbox',
						id: 'underlay',
						onchange: toggleUnderlay
					}),
					v('label', {
						for: 'underlay',
						innerHTML: 'underlay'
					})
				]),
				v('div', { classes: { option: true }}, [
					v('input', {
						type: 'checkbox',
						id: 'closeable',
						onchange: toggleCloseable,
						checked: true
					}),
					v('label', {
						for: 'closeable',
						innerHTML: 'closeable'
					})
				]),
				v('div', { classes: { option: true }}, [
					v('input', {
						type: 'checkbox',
						id: 'enterAnimation',
						onchange: toggleEnterAnimation
					}),
					v('label', {
						for: 'enterAnimation',
						innerHTML: 'enterAnimation'
					})
				]),
				v('div', { classes: { option: true }}, [
					v('input', {
						type: 'checkbox',
						id: 'exitAnimation',
						onchange: toggleExitAnimation
					}),
					v('label', {
						for: 'exitAnimation',
						innerHTML: 'exitAnimation'
					})
				])
			];
		},
		classes: [ 'main-app' ],
		tagName: 'main'
	}
});

const app = createApp({
	cssTransitions: true,
	properties: {
		closeable: true
	}
});

app.append().then(() => {
	console.log('projector is attached');
});
