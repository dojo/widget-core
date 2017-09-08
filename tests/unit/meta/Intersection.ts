import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetProperties } from '../../../src/interfaces';
import Intersection, { IntersectionGetOptions, IntersectionResult, IntersectionType } from '../../../src/meta/Intersection';
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

	'intersection events can be ignored'() {
		const visibles: [boolean, boolean][] = [];

		const halfVisibleOptions: IntersectionGetOptions = {
			rootMargin: '0px',
			thresholds: [ 0, 0.5 ]
		};
		function halfVisibleCondition(previousIntersection: IntersectionResult, intersection: IntersectionResult, key: string): boolean {
			return intersection.intersectionRatio >= 0.5;
		}

		class TestWidget extends ProjectorMixin(WidgetBase)<WidgetProperties> {
			render() {
				const intersections = this.meta(Intersection);
				intersections.invalidateIf('never', IntersectionType.Never);
				intersections.invalidateIf('within', IntersectionType.Within);
				intersections.invalidateIf('outside', IntersectionType.Outside);
				intersections.invalidateIf('custom', halfVisibleCondition, halfVisibleOptions);
				visibles.push([
					intersections.get('parent').isIntersecting,
					intersections.get('never').isIntersecting,
					intersections.get('within').isIntersecting,
					intersections.get('outside').isIntersecting,
					intersections.get('custom', halfVisibleOptions).isIntersecting
				]);
				return v('div', {
					key: 'parent'
				}, [
					v('div', {
						key: 'never'
					}),
					v('div', {
						key: 'within'
					}),
					v('div', {
						key: 'outside'
					}),
					v('div', {
						key: 'custom'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		const node = (<any> widget)._nodeMap.get('parent');
		const never = (<any> widget)._nodeMap.get('never');
		const within = (<any> widget)._nodeMap.get('within');
		const outside = (<any> widget)._nodeMap.get('outside');
		const custom = (<any> widget)._nodeMap.get('custom');

		assert.isNotNull(node);

		const [ observer, callback ] = observers[0];

		callback([{
			target: node,
			intersectionRatio: 0.1,
			isIntersecting: true
		}, {
			target: never,
			intersectionRatio: 0.1,
			isIntersecting: true
		}, {
			target: within,
			intersectionRatio: 0,
			isIntersecting: false
		}, {
			target: outside,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		callback([{
			target: node,
			intersectionRatio: 0,
			isIntersecting: false
		}, {
			target: never,
			intersectionRatio: 0,
			isIntersecting: false
		}, {
			target: within,
			intersectionRatio: 0.1,
			isIntersecting: true
		}, {
			target: outside,
			intersectionRatio: 0,
			isIntersecting: false
		}], observer);

		resolveRAF();

		// this should not result in an invalidation
		callback([{
			target: never,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		// this should not result in an invalidation
		callback([{
			target: within,
			intersectionRatio: 0,
			isIntersecting: false
		}], observer);

		resolveRAF();

		// this should not result in an invalidation
		callback([{
			target: outside,
			intersectionRatio: 0.1,
			isIntersecting: true
		}], observer);

		resolveRAF();

		const [ halfObserver, halfCallback ] = observers[1];

		// this should not result in an invalidation
		halfCallback([{
			target: custom,
			intersectionRatio: 0.4,
			isIntersecting: true
		}], halfObserver);

		resolveRAF();

		// this should result in an invalidation
		halfCallback([{
			target: custom,
			intersectionRatio: 0.6,
			isIntersecting: true
		}], halfObserver);

		resolveRAF();

		assert.deepEqual(visibles, [
			// parent, never, within, outside, custom
			[ false, false, false, false, false ], // initial default (unobserved) results
			[ true, true, false, true, false ], // provided by observer callback
			[ false, false, true, false, false ], // state change after initial observation
			[ false, true, false, true, true ] // once halfVisibleCondition resolves to true
		]);
	}
});
