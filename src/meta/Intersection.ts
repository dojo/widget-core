import global from '@dojo/core/global';
import Map from '@dojo/shim/Map';
import WeakMap from '@dojo/shim/WeakMap';
import MetaBase from '../meta/Base';

import 'intersection-observer';

export interface IntersectionOptions {
	root?: string;
}

export default class Intersection extends MetaBase {
	private _listeners = new WeakMap<Element, IntersectionObserverEntry>();
	private _rootObservers = new Map<string, IntersectionObserver>();

	private _onIntersect(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
		entries.forEach(entry => {
			this._listeners.set(entry.target, entry);
			this.invalidate();
		});
	}

	public get(key: string, { root = '' }: IntersectionOptions = {}): number {
		let rootObserver = this._rootObservers.get(root);
		if (!rootObserver) {
			const intersectionOptions: any = {
				rootMargin: '0px',
				threshold: 0.0000001
			};
			if (root) {
				this.requireNode(root);
				const rootNode = this.nodes.get(root);
				if (rootNode) {
					intersectionOptions.root = rootNode;
					rootObserver = new global.IntersectionObserver(this._onIntersect.bind(this), intersectionOptions);
				}
			}
			else {
				rootObserver = new global.IntersectionObserver(this._onIntersect.bind(this), intersectionOptions);
			}
			if (rootObserver) {
				this._rootObservers.set(root, rootObserver);
			}
		}

		if (rootObserver) {
			// is this node set up?
			this.requireNode(key);
			const node = this.nodes.get(key);
			if (node) {
				if (this._listeners.has(node)) {
					return this._listeners.get(node).intersectionRatio;
				}
				else {
					rootObserver.observe(node);
				}
			}
		}

		return 0;
	}
}
