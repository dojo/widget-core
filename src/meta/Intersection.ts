import { from } from '@dojo/shim/array';
import global from '@dojo/shim/global';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

import 'intersection-observer';

(<{ THROTTLE_TIMEOUT: number }> global.IntersectionObserver.prototype).THROTTLE_TIMEOUT = 0;

interface IntersectionDetail {
	conditions: { [key: string]: [ IntersectionTestCondition, IntersectionGetOptions | undefined, IntersectionResult ] };
	entries: WeakMap<Element, IntersectionObserverEntry>;
	intersections: { [key: string]: IntersectionResult }; // previous intersections
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

export enum IntersectionType {
	Never,
	Outside,
	Within
}

export interface IntersectionTestCondition {
	(previousValue: IntersectionResult, value: IntersectionResult, key: string): boolean;
}

function neverCondition() {
	return false;
}

function outsideCondition(previousValue: IntersectionResult, value: IntersectionResult, key: string) {
	return !value.isIntersecting;
}

function withinCondition(previousValue: IntersectionResult, value: IntersectionResult, key: string) {
	return value.isIntersecting;
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
				conditions: {},
				entries: new WeakMap<Element, IntersectionObserverEntry>(),
				intersections: {},
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
		const lookup = new WeakMap<Element, string>();
		for (const key of from(this.nodes.keys())) {
			const node = this.nodes.get(key);
			if (node) {
				lookup.set(node, key);
			}
		}

		const keys: string[] = [];
		for (const intersectionEntry of intersectionObserverEntries) {
			const {
				intersectionRatio,
				isIntersecting
			} = <(IntersectionObserverEntry & { isIntersecting: boolean })> intersectionEntry;
			details.entries.set(intersectionEntry.target, intersectionEntry);
			if (lookup.has(intersectionEntry.target)) {
				const key = lookup.get(intersectionEntry.target);
				if (key) {
					details.intersections[key] = {
						intersectionRatio,
						isIntersecting
					};
					keys.push(key);
				}
			}
		}

		// Check to see if this intersection should cause an invalidation
		const conditions = details.conditions;
		let invalidate = false;
		for (const key of keys) {
			if (key in conditions) {
				const [ condition, options, previousValue ] = conditions[key];
				const value = this.get(key, options);
				if (condition(previousValue, value, key)) {
					invalidate = true;
				}
				conditions[key][2] = value;
			}
			else {
				// no invalidation test exists for this key
				invalidate = true;
			}
		}
		if (invalidate) {
			this.invalidate();
		}
	}

	private _track(key: string, options: IntersectionGetOptions): void {
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
	}

	public get(key: string, options: IntersectionGetOptions = {}): IntersectionResult {
		if (this.has(key, options)) {
			return this._getDetails(options).intersections[key];
		}
		this._track(key, options);
		return defaultIntersection;
	}

	public has(key: string, options: IntersectionGetOptions = {}): boolean {
		if (!this.nodes.has(key)) {
			return false;
		}
		const details = this._getDetails(options);
		const intersectionObserver = details.intersectionObserver;
		if (intersectionObserver) {
			const entries = intersectionObserver.takeRecords();
			if (entries.length) {
				this._onIntersect(details, entries);
			}
		}
		return key in details.intersections;
	}

	public invalidateIf(key: string, type: IntersectionType.Never, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType.Outside, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType.Within, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, condition: IntersectionTestCondition, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType | IntersectionTestCondition, ...args: any[]): void {
		let condition: IntersectionTestCondition | undefined;
		let options: IntersectionGetOptions | undefined;
		switch (type) {
			case IntersectionType.Never:
				condition = neverCondition;
				options = args[0];
				break;
			case IntersectionType.Outside:
				condition = outsideCondition;
				options = args[0];
				break;
			case IntersectionType.Within:
				condition = withinCondition;
				options = args[0];
				break;
			default:
				condition = <IntersectionTestCondition> type;
				options = args[0];
				break;
		}
		if (condition) {
			options = options || {};
			const details = this._getDetails(options);
			details.conditions[key] = [ condition, options, this.get(key, options) ];
			this._track(key, options);
		}
	}
}

export default Intersection;
