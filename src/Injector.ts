import { Evented } from '@dojo/core/Evented';

export class Injector extends Evented {

	private _context: any;

	constructor(context: any) {
		super({});
		this._context = context;
	}

	public get(): any {
		return this._context;
	}

	public set(context: any): void {
		this._context = context;
		this.emit({ type: 'invalidate' });
	}
}

export default Injector;
