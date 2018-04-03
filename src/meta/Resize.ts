import { Base } from './Base';
import Map from '@dojo/shim/Map';

interface Observer {
	observe(node: HTMLElement): void;
}

declare var ResizeObserver: {
	prototype: Observer;
	new (callback: (entries: ResizeObserverEntry[]) => any): any;
};

interface ResizeObserverEntry {
	readonly contentRect: ContentRect;
}

export interface ContentRect {
	bottom: number;
	height: number;
	left: number;
	right: number;
	top: number;
	width: number;
	x: number;
	y: number;
}

export interface PredicateFunction {
	(contentRect: ContentRect): boolean;
}

export interface PredicateFunctions {
	[id: string]: PredicateFunction;
}

export type PredicateResponses<T = PredicateFunctions> = { [id in keyof T]: boolean };

export class Resize extends Base {
	private _details = new Map<string | number, PredicateResponses>();

	public get<T extends PredicateFunctions>(key: string | number, predicates: T): PredicateResponses<T> {
		const node = this.getNode(key);

		if (!node) {
			return {} as PredicateResponses<T>;
		}

		if (!this._details.has(key)) {
			this._details.set(key, {});
			const resizeObserver = new ResizeObserver(([entry]) => {
				if (entry) {
					const { contentRect } = entry;
					const previousDetails = this._details.get(key);
					let predicateChanged = false;
					let predicateResponses: PredicateResponses = {};

					for (let predicateId in predicates) {
						const response = predicates[predicateId](contentRect);
						predicateResponses[predicateId] = response;
						if (!predicateChanged && previousDetails && response !== previousDetails[predicateId]) {
							predicateChanged = true;
						}
					}

					this._details.set(key, predicateResponses);
					predicateChanged && this.invalidate();
				}
			});
			resizeObserver.observe(node);
		}

		return this._details.get(key) as PredicateResponses<T>;
	}
}

export default Resize;
