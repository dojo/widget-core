import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import Promise from '@dojo/shim/Promise';
import * as assert from 'intern/chai!assert';
import externalState from '../../../src/mixins/externalState';
import { createObservableStore, ObservableStore } from '@dojo/stores/store/mixins/createObservableStoreMixin';

let store: ObservableStore<{}, {}, any>;

const externalStateWithProperties = compose({
	properties: <any> {},
	diffProperties(this: any, previousProperties: any, newProperties: any) {}
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(externalState);

registerSuite({
	name: 'mixins/externalStateMixin',
	beforeEach() {
		store = createObservableStore({
			data: [
				{ id: '1', foo: 'bar' },
				{ id: '2', foo: 'bar' }
			]
		});
	},
	observe: {
		'throw error if `externalState` property is not passed'() {
			assert.throws(() => externalStateWithProperties({properties: { id: '1' } }), Error);
		},
		observe() {
			const properties = {
				id: '1',
				externalState: store
			};
			const externalStateMixin = externalStateWithProperties({ properties });
			let stateChangeCount = 0;

			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', ({ state }: any) => {
					stateChangeCount++;
					try {
						assert.equal(stateChangeCount, 1);
						assert.deepEqual(state, { id: '1', foo: 'bar'});
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			externalStateMixin.diffProperties({}, properties);
			externalStateMixin.observe();
			externalStateMixin.observe();
			return promise;
		},
		'throws error if observe called with a different id'() {
			const externalStateMixin = externalStateWithProperties({ properties: { id: '1', externalState: store } });

			externalStateMixin.observe();
			externalStateMixin.properties.id = '2';
			assert.throws(() => externalStateMixin.observe(), Error);

		}
	},
	getState() {
		const externalStateMixin = externalStateWithProperties({ properties: { id: '1', externalState: store } });

		const promise = new Promise((resolve, reject) => {
			externalStateMixin.on('state:changed', () => {
				try {
					assert.deepEqual(externalStateMixin.state, { id: '1', foo: 'bar'});
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});

		externalStateMixin.observe();
		assert.deepEqual(externalStateMixin.state, Object.create(null));
		return promise;
	},
	setState: {
		'when observing a single item'() {
			const externalStateMixin = externalStateWithProperties({ properties: { id: '1', externalState: store } });
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', () => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.deepEqual(externalStateMixin.state, { id: '1', foo: 'bar'});
						}
						else {
							assert.deepEqual(externalStateMixin.state, { id: '1', foo: 'baz', baz: 'qux' });
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			externalStateMixin.observe();
			assert.deepEqual(externalStateMixin.state, Object.create(null));
			externalStateMixin.setState({ id: '1', foo: 'baz', baz: 'qux' });
			return promise;
		},
		'when observing the whole store'() {
			const store = createObservableStore({
				data: [
					{ id: '1', foo: 'bar' },
					{ id: '2', foo: 'bar' }
				]
			});

			const externalStateMixin = externalStateWithProperties({ properties: { externalState: store } });
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', () => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.isOk(externalStateMixin.state);
							assert.lengthOf(externalStateMixin.state, 2);
							assert.deepEqual(externalStateMixin.state, [
								{ id: '1', foo: 'bar'}, { id: '2', foo: 'bar' }
							]);
						}
						else {
							assert.isOk(externalStateMixin.state);
							assert.lengthOf(externalStateMixin.state, 2);
							assert.deepEqual(externalStateMixin.state, [
								{ id: '1', foo: 'baz', baz: 'qux'}, { id: '2', foo: 'bar' }
							]);
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			externalStateMixin.observe();
			externalStateMixin.setState({ id: '1', foo: 'baz', baz: 'qux' });

			return promise;
		},
		'throws error if no id can be determined'() {
			const externalStateMixin = externalStateWithProperties({ properties: { externalState: store } });
			externalStateMixin.observe();
			assert.throws(() => externalStateMixin.setState({ foo: 'baz', baz: 'qux' }), Error);
		}
	},
	'on "properties:changed" event': {
		'initial properties'() {
			const externalStateMixin = externalStateWithProperties({ properties: { id: '1', externalState: store } });

			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', () => {
					try {
						assert.deepEqual(externalStateMixin.state, { id: '1', foo: 'bar' });
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			return promise;
		},

		'call destroy on observe handle if externalState has been updated.'() {
			const initialProperties = {
				id: '1',
				externalState: store
			};
			const externalStateMixin = externalStateWithProperties({ properties: initialProperties });
			const newStore = createObservableStore({ data: [ { id: '1', foo: 'bar' } ]});
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', ({ target }: any) => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.equal(target.properties.externalState, store);
							const updatedProperties = {
								externalState: newStore,
								id: '1'
							};
							externalStateMixin.properties = updatedProperties;
							externalStateMixin.emit({
								type: 'properties:changed',
								target: externalStateMixin,
								properties: updatedProperties,
								changedPropertyKeys: [ 'externalState' ]
							});
						}
						else {
							assert.equal(target.properties.externalState, newStore);
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			externalStateMixin.emit({
				type: 'properties:changed',
				target: externalStateMixin,
				properties: initialProperties,
				changedPropertyKeys: [ 'externalState', 'id' ]
			});

			return promise;
		},
		'call destroy on observe handle if id has been updated.'() {
			const initialProperties = {
				id: '1',
				externalState: store
			};
			const externalStateMixin = externalStateWithProperties({ properties: initialProperties });
			let intialStateChange = true;
			const promise = new Promise((resolve, reject) => {
				externalStateMixin.on('state:changed', ({ target }: any) => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.equal(target.properties.id, '1');
							const updatedProperties = {
								externalState: store,
								id: '2'
							};
							externalStateMixin.properties = updatedProperties;
							externalStateMixin.emit({
								type: 'properties:changed',
								target: externalStateMixin,
								properties: updatedProperties,
								changedPropertyKeys: [ 'id' ]
							});
						}
						else {
							assert.equal(target.properties.id, '2');
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			externalStateMixin.emit({
				type: 'properties:changed',
				target: externalStateMixin,
				properties: initialProperties,
				changedPropertyKeys: [ 'externalState', 'id' ]
			});

			return promise;
		}
	}
});
