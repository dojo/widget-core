import global from '@dojo/core/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetProperties } from '../../../src/interfaces';
import Intersection from '../../../src/meta/Intersection';
import { WidgetBase } from '../../../src/WidgetBase';

let rAF: any;
let observerCallback: any;
let intersectionObserver: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta - Intersection Observer',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
		intersectionObserver = stub(global, 'IntersectionObserver', function (callback: any) {
			observerCallback = callback;
			return {
				observe: stub()
			};
		});
	},

	afterEach() {
		rAF.restore();
		intersectionObserver.restore();
	},

	'intersections cause invalidations'() {
		const visibles: boolean[] = [];

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				visibles.push(this.meta(Intersection).get('root') > 0);
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

		observerCallback([{
			target: node,
			intersectionRatio: 0.1
		}]);

		resolveRAF();

		observerCallback([{
			target: node,
			intersectionRatio: 0
		}]);

		resolveRAF();

		assert.deepEqual(visibles, [false, false, true, false]);
	},

	'intersections report ratio'() {
		let ratio = 0;

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				ratio = this.meta(Intersection).get('root');

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

		observerCallback([{
			target: node,
			intersectionRatio: 0.1
		}]);

		resolveRAF();

		assert.strictEqual(ratio, 0.1);
	},

	'intersections accept root'() {
		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				this.meta(Intersection).get('test', {
					root: 'root'
				});

				return [
					v('div', {
						key: 'root'
					}),
					v('div', {
						key: 'test'
					})
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
	}
});
