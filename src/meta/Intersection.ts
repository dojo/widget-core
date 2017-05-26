import { WidgetMeta, WidgetMetaProperties } from '../WidgetBase';
import Map from '@dojo/shim/Map';
import WeakMap from '@dojo/shim/WeakMap';
import global from '@dojo/core/global';

import 'intersection-observer';

export default class Intersection implements WidgetMeta {
	private _nodes: Map<string, any>;
	private _listeners: WeakMap<Element, any>;
	private _invalidate: Function;
	private _rootObserver: IntersectionObserver;

	readonly requiresRender = true;

	constructor(properties: WidgetMetaProperties) {
		this._nodes = properties.nodes;
		this._listeners = new WeakMap<Element, IntersectionObserverEntry>();
		this._invalidate = properties.invalidate;

		this._rootObserver = new global.IntersectionObserver((entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
			entries.forEach(entry => {
				this._listeners.set(entry.target, entry);
				this._invalidate();
			});
		}, {
			rootMargin: '0px',
			threshold: 0
		});
	}

	isInViewport(key: string) {
		// is this node set up?
		const node = this._nodes.get(key);

		if (node) {
			if (this._listeners.has(node)) {
				return this._listeners.get(node).intersectionRatio > 0;
			}
			else {
				this._rootObserver.observe(node);
			}
		}

		return false;
	}

	getViewportIntersectionRatio(key: string) {
		// is this node set up?
		const node = this._nodes.get(key);

		if (node) {
			if (this._listeners.has(node)) {
				return this._listeners.get(node).intersectionRatio;
			}
			else {
				this._rootObserver.observe(node);

				return 0;
			}
		}
	}
}
