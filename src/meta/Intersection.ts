import global from '@dojo/shim/global';
import WeakMap from '@dojo/shim/WeakMap';
import Map from '@dojo/shim/Map';
import { createHandle } from '@dojo/core/lang';
import { Base } from './Base';

interface ExtendedIntersectionObserverEntry extends IntersectionObserverEntry {
	readonly isIntersecting: boolean;
}

interface IntersectionDetail extends IntersectionGetOptions {
	entries: WeakMap<Element, ExtendedIntersectionObserverEntry>;
	observer?: IntersectionObserver;
}

export interface IntersectionGetOptions {
	root?: string;
	rootMargin?: string;
	thresholds?: number[];
}

export interface IntersectionResult {
	intersectionRatio: number;
	isIntersecting: boolean;
}

const defaultIntersection: IntersectionResult = Object.freeze({
	intersectionRatio: 0,
	isIntersecting: false
});

export class Intersection extends Base {
	private readonly _details: Map<string, IntersectionDetail> = new Map();

	public get(key: string, options: IntersectionGetOptions = {}): IntersectionResult {
		let rootNode: HTMLElement | undefined;
		const details = this._getDetails(options);

		if (details.root) {
			rootNode = this.getNode(details.root);
			if (!rootNode) {
				return defaultIntersection;
			}
		}
		const node = this.getNode(key);
		if (!node) {
			return defaultIntersection;
		}

		this._getIntersectionObserver(details, rootNode).observe(node);
		const { intersectionRatio, isIntersecting } = details.entries.get(node) || defaultIntersection;
		return {
			intersectionRatio,
			isIntersecting
		};
	}

	public has(key: string | number, options?: IntersectionGetOptions): boolean {
		const node = this.getNode(key);
		if (!node) {
			return false;
		}
		return this._getDetails(options).entries.has(node);
	}

	private _getDetails(options: IntersectionGetOptions = {}): IntersectionDetail {
		const cacheKey = JSON.stringify(options);
		let cached = this._details.get(cacheKey);

		if (!cached) {
			const entries = new WeakMap<HTMLElement, ExtendedIntersectionObserverEntry>();
			cached = { ...options, entries };
			this._details.set(cacheKey, cached);
		}
		return cached;
	}

	private _getIntersectionObserver(details: IntersectionDetail, rootNode?: HTMLElement): IntersectionObserver {
		if (details.observer) {
			return details.observer;
		}

		const { rootMargin, thresholds } = details;
		const options = { rootMargin, thresholds, root: rootNode };
		const observer = new global.IntersectionObserver(this._onIntersect(details), options);

		this.own(createHandle(observer.disconnect));
		details.observer = observer;
		return observer;
	}

	private _onIntersect = (details: IntersectionDetail) => {
		return (entries: ExtendedIntersectionObserverEntry[]) => {
			for (const entry of entries) {
				details.entries.set(entry.target, entry);
			}
			this.invalidate();
		};
	}
}

export default Intersection;
