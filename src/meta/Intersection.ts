import global from '@dojo/core/global';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

import 'intersection-observer';

(<{ THROTTLE_TIMEOUT: number }> global.IntersectionObserver.prototype).THROTTLE_TIMEOUT = 0;

interface IntersectionDetail {
	conditions: { [key: string]: [ IntersectionTestCondition, IntersectionGetOptions | undefined, IntersectionResult ] };
	entries: WeakMap<Element, IntersectionObserverEntry>;
	keys: string[];
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
	boundingClientRect: ClientRect;
	intersectionRatio: number;
	intersectionRect: ClientRect;
	isIntersecting: boolean;
	rootBounds: ClientRect;
}

export enum IntersectionType {
	Custom,
	Never,
	Outside,
	Within
}

export interface IntersectionTestCondition {
	(previousValue: IntersectionResult, value: IntersectionResult, key: string): boolean;
}

function NeverCondition() {
	return false;
}

function OutsideCondition(previousValue: IntersectionResult, value: IntersectionResult, key: string) {
	return !value.isIntersecting;
}

function WithinCondition(previousValue: IntersectionResult, value: IntersectionResult, key: string) {
	return value.isIntersecting;
}

const defaultRect: ClientRect = Object.freeze({
	width: 0,
	height: 0,
	top: 0,
	bottom: 0,
	left: 0,
	right: 0
});

const defaultIntersection: IntersectionResult = Object.freeze({
	boundingClientRect: defaultRect,
	intersectionRatio: 0,
	intersectionRect: defaultRect,
	isIntersecting: false,
	rootBounds: defaultRect
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
				keys: [],
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

	private _observe(rootNode: HTMLElement | undefined, node: HTMLElement, details: IntersectionDetail): void {
		const intersectionObserver = this._getIntersectionObserver(details, rootNode);
		intersectionObserver.observe(node);
		if (typeof (<any> intersectionObserver)._checkForIntersections === 'function') {
			(<any> intersectionObserver)._checkForIntersections();
		}
	}

	private _onIntersect(details: IntersectionDetail, intersectionObserverEntries: IntersectionObserverEntry[]) {
		const lookup = new WeakMap<Element, string>();
		for (const key of details.keys) {
			const node = this.nodes.get(key);
			if (node) {
				lookup.set(node, key);
			}
		}

		const keys: string[] = [];
		for (const intersectionEntry of intersectionObserverEntries) {
			const {
				boundingClientRect,
				intersectionRatio,
				intersectionRect,
				isIntersecting,
				rootBounds
			} = <(IntersectionObserverEntry & { isIntersecting: boolean })> intersectionEntry;
			details.entries.set(intersectionEntry.target, intersectionEntry);
			if (lookup.has(intersectionEntry.target)) {
				const key = lookup.get(intersectionEntry.target);
				if (key) {
					details.intersections[key] = {
						boundingClientRect,
						intersectionRatio,
						intersectionRect,
						isIntersecting,
						rootBounds
					};
					keys.push(key);
				}
			}
		}

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
		if (details.keys.indexOf(key) < 0) {
			details.keys.push(key);
		}
		if (details.root) {
			let rootNode: HTMLElement;
			let node: HTMLElement;
			const all = () => {
				rootNode = this.nodes.get(details.root) || rootNode;
				node = this.nodes.get(key) || node;
				if (rootNode && node) {
					this._observe(rootNode, node, details);
				}
			};
			this.requireNode(details.root, all);
			this.requireNode(key, all);
		}
		else {
			this.requireNode(key, (node) => {
				this._observe(undefined, node, details);
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

	public invalidateIf(key: string, type: IntersectionType.Custom, condition: IntersectionTestCondition, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType.Never, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType.Outside, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType.Within, options?: IntersectionGetOptions): void;
	public invalidateIf(key: string, type: IntersectionType, ...args: any[]): void {
		let condition: IntersectionTestCondition | undefined;
		let options: IntersectionGetOptions = {};
		switch (type) {
			case IntersectionType.Custom:
				condition = args[0];
				options = args[1];
				break;
			case IntersectionType.Never:
				condition = NeverCondition;
				options = args[0];
				break;
			case IntersectionType.Outside:
				condition = OutsideCondition;
				options = args[0];
				break;
			case IntersectionType.Within:
				condition = WithinCondition;
				options = args[0];
		}
		if (condition) {
			const details = this._getDetails(options);
			details.conditions[key] = [ condition, options, this.get(key, options) ];
			this._track(key, options);
		}
	}
}

export default Intersection;
