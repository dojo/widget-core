import global from '@dojo/shim/global';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

interface IntersectionDetail {
	entries: WeakMap<Element, IntersectionObserverEntry>;
	intersectionObserver?: IntersectionObserver; // attached observer
	options: IntersectionGetOptions;
	root: string;
	rootMargin: string | undefined;
	thresholds: number[]; // thresholds the observe should be attached with
}

export interface IntersectionGetOptions {
	root?: string;
	rootMargin?: string;
	threshold?: number;
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
	private _details: IntersectionDetail[] = [];

	private _getDetails(options: IntersectionGetOptions): IntersectionDetail {
		let {
			root = '',
			rootMargin,
			threshold,
			thresholds = []
		} = options;
		const {
			_details: details
		} = this;
		if (typeof threshold === 'number' && !thresholds.length) {
			thresholds = [ threshold ];
		}

		// Look to see if a detail record has already been created for these options
		let cached: IntersectionDetail | undefined = undefined;
		for (const detail of details) {
			if (
				options === detail.options ||
				(
					root === detail.root &&
					rootMargin === detail.rootMargin &&
					thresholds.length === detail.thresholds.length &&
					thresholds.every(function(i) {
						return thresholds[i] === detail.thresholds[i];
					})
				)
			) {
				cached = detail;
				break;
			}
		}
		if (!cached) {
			cached = {
				entries: new WeakMap<Element, IntersectionObserverEntry>(),
				options,
				root,
				rootMargin,
				thresholds
			};
			details.push(cached);
		}
		return cached;
	}

	private _getIntersectionObserver(details: IntersectionDetail, rootNode?: Element): IntersectionObserver {
		if (details.intersectionObserver) {
			return details.intersectionObserver;
		}

		const {
			rootMargin = '0px',
			thresholds
		} = details;

		const intersectionOptions: IntersectionObserverInit = {
			rootMargin
		};
		if (thresholds.length) {
			intersectionOptions.threshold = thresholds;
		}
		if (rootNode) {
			intersectionOptions.root = rootNode;
		}
		const observer = new global.IntersectionObserver(this._onIntersect.bind(this, details), intersectionOptions);
		details.intersectionObserver = observer;
		this.own({
			destroy() {
				observer.disconnect();
			}
		});
		return observer;
	}

	private _onIntersect(details: IntersectionDetail, intersectionObserverEntries: IntersectionObserverEntry[]) {
		for (const intersectionEntry of intersectionObserverEntries) {
			details.entries.set(intersectionEntry.target, intersectionEntry);
		}

		this.invalidate();
	}

	public get(key: string, options: IntersectionGetOptions = {}): IntersectionResult {
		const details = this._getDetails(options);
		if (details.root) {
			let rootNode: HTMLElement;
			let node: HTMLElement;
			const all = () => {
				rootNode = this.nodes.get(details.root) || rootNode;
				node = this.nodes.get(key) || node;
				if (rootNode && node) {
					this._getIntersectionObserver(details, rootNode).observe(node);
				}
			};
			this.requireNode(details.root, all);
			this.requireNode(key, all);
		}
		else {
			this.requireNode(key, (node) => {
				this._getIntersectionObserver(details).observe(node);
			});
		}

		const node = this.nodes.get(key);
		if (details && node) {
			const entry = details.entries.get(node);
			/* istanbul ignore else: only process entry if it exists */
			if (entry) {
				const {
					intersectionRatio,
					isIntersecting
				} = <(IntersectionObserverEntry & { isIntersecting: boolean })> entry;
				return {
					intersectionRatio,
					isIntersecting
				};
			}
		}

		return defaultIntersection;
	}

	public has(key: string, options: IntersectionGetOptions = {}): boolean {
		const node = this.nodes.get(key);
		/* istanbul ignore else: only check for true if node exists */
		if (node) {
			const details = this._getDetails(options);
			return details && details.entries.has(node);
		}
		return false;
	}
}

export default Intersection;
