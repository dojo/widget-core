import { Handle } from '@dojo/interfaces/core';
import Promise from '@dojo/shim/Promise';

function noop(): Promise<boolean> {
	return Promise.resolve(false);
};

function destroyed(): never {
	throw new Error('Call made to destroyed method');
};

class Destroyable {
	private handles: Handle[];

	constructor() {
		this.handles = [];
	}

	own(handle: Handle): Handle {
		const { handles } = this;
		handles.push(handle);
		return {
			destroy() {
				handles.splice(handles.indexOf(handle));
				handle.destroy();
			}
		};
	}

	destroy(): Promise<any> {
		return new Promise((resolve) => {
			this.handles.forEach((handle) => {
				handle && handle.destroy && handle.destroy();
			});
			this.destroy = noop;
			this.own = destroyed;
			resolve(true);
		});
	}
}

export default Destroyable;
