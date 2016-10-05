import createMemoryStore from 'dojo-stores/createMemoryStore';
import createWidget from '../createWidget';
import createPanel from '../createPanel';
import createTabbedPanel from '../createTabbedPanel';
import { Child, RegistryProvider } from '../mixins/interfaces';
import projector from '../projector';
import Promise from 'dojo-shim/Promise';
import { ComposeFactory } from 'dojo-compose/compose';

/**
 * A memory store which handles the widget states
 */
const widgetStore = createMemoryStore({
	data: [
		{ id: 'title', label: 'dojo-widget Examples'},
		{ id: 'tabbed-panel', children: [ 'panel-1', 'panel-2', 'panel-3', 'panel-4' ] },
		{ id: 'panel-1', label: 'foo', closeable: true },
		{ id: 'foo', label: 'Validus os indoles. Demoveo ventosus illum ut refoveo saepius antehabeo euismod gravis aliquam ea aliquip. Autem ratis verto. Accumsan refero capio ludus consequat tincidunt roto modo ea dolore. Ad iustum blandit.' },
		{ id: 'panel-2', label: 'bar foo qut qux quux', active: true },
		{ id: 'bar', label: 'Si at humo euismod fatua melior praesent praemitto camur foras eros. Esca multo transverbero facilisi nisl exputo nisl.' },
		{ id: 'panel-3', label: 'qat' },
		{ id: 'baz', label: 'Odio vel inhibeo nostrud. Ad duis blandit facilisi hos multo nobis quibus zelus bene. Ideo veniam eum iriure ymo.' },
		{ id: 'panel-4', label: 'baz', closeable: true },
		{ id: 'qat', label: 'Sit pertineo at facilisis quidne qui et amet duis. Patria meus proprius immitto ne appellatio cogo jus. Cui genitus sudo. Suscipit abdo dignissim huic accumsan importunus inhibeo luptatum ut neque augue sagaciter. Iaceo odio exerci natu nonummy vel iaceo odio erat.' }
	]
});

/**
 * This is a mock of dojo/app
 */
const widgetRegistry = {
	get(id: string | symbol): Promise<Child> {
		switch (id) {
		case 'panel-1':
			return Promise.resolve(panel1);
		case 'panel-2':
			return Promise.resolve(panel2);
		case 'panel-3':
			return Promise.resolve(panel3);
		case 'panel-4':
			return Promise.resolve(panel4);
		default:
			return Promise.reject(new Error('Unknown widget'));
		}
	},
	identify(value: Child): string | symbol {
		switch (value) {
		case panel1:
			return 'panel-1';
		case panel2:
			return 'panel-2';
		case panel3:
			return 'panel-3';
		case panel4:
			return 'panel-4';
		default:
			throw new Error('Not registered');
		}
	},
	create(factory: ComposeFactory<any, any>, options?: any): Promise<[ string, Child ]> {
		return factory(options);
	}
};

const registryProvider: RegistryProvider<any> = {
	get(type: string) {
		if (type === 'widgets') {
			return widgetRegistry;
		}

		throw new Error('No such registry');
	}
};

const widgets: Child[] = [];

/**
 * Header widget
 */
widgets.push(createWidget({
	id: 'title',
	stateFrom: widgetStore,
	tagName: 'h1'
}));

const tabbedPanel = createTabbedPanel({
	id: 'tabbed-panel',
	stateFrom: widgetStore,
	registryProvider,
	listeners: {
		error(evt) {
			console.log(evt);
		},
		statechange(evt) {
			console.log(evt);
		},
		childlist(evt) {
			console.log(evt);
		}
	}
});

widgets.push(tabbedPanel);

const panel1 = createPanel({
	id: 'panel-1',
	stateFrom: widgetStore
});

panel1.append(createWidget({
	id: 'foo',
	stateFrom: widgetStore
}));

const panel2 = createPanel({
	id: 'panel-2',
	stateFrom: widgetStore
});

panel2.append(createWidget({
	id: 'bar',
	stateFrom: widgetStore
}));

const panel3 = createPanel({
	id: 'panel-3',
	stateFrom: widgetStore
});

panel3.append(createWidget({
	id: 'baz',
	stateFrom: widgetStore
}));

const panel4 = createPanel({
	id: 'panel-4',
	stateFrom: widgetStore
});

panel4.append(createWidget({
	id: 'qat',
	stateFrom: widgetStore
}));

/* debug logging */
projector.on('schedulerender', () => { console.log('scheduleRender()'); });

/* Append widgets to projector */
projector.append(widgets);

/* Attach projector to DOM */
projector.attach();
