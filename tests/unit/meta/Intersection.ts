import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetProperties } from '../../../src/interfaces';
import Intersection from '../../../src/meta/Intersection';
import { WidgetBase } from '../../../src/WidgetBase';

let intersectionObserver: any;
const observers: ([ object, Function ])[] = [];
let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta - Intersection',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
		intersectionObserver = stub(global, 'IntersectionObserver', function (callback: any) {
			const observer = {
				observe: stub(),
				takeRecords: stub().returns([])
			};
			observers.push([ observer, callback ]);
			return observer;
		});
	},

	afterEach() {
		rAF.restore();
		intersectionObserver.restore();
		observers.length = 0;
	},

	'intersections cause invalidations'() {
		const visibles: boolean[] = [];

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				visibles.push(this.meta(Intersection).get('root').isIntersecting);
				return v('div', {
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		const node = (<any> widget)._nodeMap.get('root');

		assert.isNotNull(node);

		const [ observer, callback ] = observers[0];

		callback([{
			target: node,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		callback([{
			target: node,
			intersectionRatio: 0,
			isIntersecting: false
		}], observer);

		resolveRAF();

		assert.deepEqual(visibles, [ false, true, false ]);
	},

	'intersections report ratio'() {
		let ratio = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				ratio = this.meta(Intersection).get('root', {
					thresholds: [ 0 ]
				}).intersectionRatio;

				return v('div', {
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		const node = (<any> widget)._nodeMap.get('root');

		assert.isNotNull(node);

		const [ observer, callback ] = observers[0];

		callback([{
			target: node,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		assert.strictEqual(ratio, 0.1);
	},

	'intersections accept root'() {
		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				this.meta(Intersection).get('test', {
					threshold: 0,
					root: 'root'
				});

				return [
					v('div', {
						key: 'root'
					}, [
						v('div', {
							key: 'test'
						})
					])
				];
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		const root = (<any> widget)._nodeMap.get('root');

		assert.isTrue(intersectionObserver.called);
		assert.strictEqual(intersectionObserver.args[0][1].root, root);
	},

	'intersections report has only when observing'() {
		let renders = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			has(key: string): boolean {
				return this.meta(Intersection).has(key);
			}

			render() {
				renders++;
				this.meta(Intersection).get('root');
				return v('div', {
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();

		assert.isFalse(widget.has('root'));

		widget.append(div);

		resolveRAF();

		assert.equal(renders, 1);
		assert.isFalse(widget.has('root'));

		const node = (<any> widget)._nodeMap.get('root');

		const [ observer, callback ] = observers[0];

		callback([{
			target: node,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		assert.equal(renders, 2);
		assert.isTrue(widget.has('root'));
	}
});
