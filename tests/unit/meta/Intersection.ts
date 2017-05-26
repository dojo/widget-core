import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Intersection from '../../../src/meta/Intersection';
import { stub } from 'sinon';
import global from '@dojo/core/global';
import { WidgetProperties } from '../../../src/interfaces';

let rAF: any;
let observerCallback: any;
let oldIntersectionObserver: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(0).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta - Intersection Observer',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
		oldIntersectionObserver = global.IntersectionObserver;
		global.IntersectionObserver = function (callback: any) {
			observerCallback = callback;
			return {
				observe: stub()
			};
		};
	},

	afterEach() {
		rAF.restore();
		global.IntersectionObserver = oldIntersectionObserver;
	},

	'intersections cause invalidations'() {
		const visibles: boolean[] = [];

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				visibles.push(this.meta(Intersection).isInViewport('root'));
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
				ratio = this.meta(Intersection).getViewportIntersectionRatio('root');

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
	}
});
