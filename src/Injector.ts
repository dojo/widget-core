import { Evented } from '@dojo/core/Evented';

export class Injector<T = any> extends Evented {

	private _context: T;

	constructor(context: T) {
		super({});
		this._context = context;
	}

	public get(): T {
		return this._context;
	}

	public set(context: T): void {
		this._context = context;
		this.emit({ type: 'invalidate' });
	}
}

export default Injector;
