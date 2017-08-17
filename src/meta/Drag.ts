import global from '@dojo/shim/global';
import { assign } from '@dojo/shim/object';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

export interface DragResults {
	/**
	 * The movement of pointer during the duration of the drag state
	 */
	delta: {
		/**
		 * The relative number of pixels on the x-axis
		 */
		x: number;

		/**
		 * The relative number of pixels on the y-axis
		 */
		y: number;
	};

	/**
	 * Is the DOM node currently in a drag state
	 */
	isDragging: boolean;
}

interface NodeData {
	dragResults: DragResults;
	invalidate: () => void;
	start: {
		x: number;
		y: number;
	};
}

interface Position {
	x: number;
	y: number;
}

const emptyResults = Object.freeze({
	delta: Object.freeze({ x: 0, y: 0 }),
	isDragging: false
});

function getPosition(e: MouseEvent & TouchEvent): Position {
	return e.type.match(/^touch/) ? {
		x: e.changedTouches[0].screenX,
		y: e.changedTouches[0].screenY
	} : {
		x: e.pageX,
		y: e.pageX
	};
}

function getDelta(start: Position, current: Position): Position {
	return {
		x: current.x - start.x,
		y: current.y - start.y
	};
}

class DragController {
	private _nodeMap = new WeakMap<HTMLElement, NodeData>();
	private _dragging: HTMLElement | undefined = undefined;

	private _onDragStart = (e: MouseEvent & TouchEvent) => {
		if (this._dragging) {
			return; // should this really occur?
		}
		const state = this._nodeMap.get(e.target as HTMLElement);
		if (state) {
			state.dragResults.isDragging = true;
			state.start = getPosition(e);
			state.dragResults.delta = { x: 0, y: 0 };
			state.invalidate();
		} // else, we are ignoring the event
	}

	private _onDrag = (e: MouseEvent & TouchEvent) => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		const state = this._nodeMap.get(_dragging);
		if (state) {
			state.dragResults.delta = getDelta(state.start, getPosition(e));
			state.invalidate();
		}
	}

	private _onDragStop = () => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		const state = this._nodeMap.get(_dragging);
		if (state) {
			state.dragResults.isDragging = false;
			state.invalidate();
		}
		this._dragging = undefined;
	}

	constructor() {
		const win: Window = global.window;
		win.addEventListener('mousedown', this._onDragStart);
		win.addEventListener('mousemove', this._onDrag, true);
		win.addEventListener('mouseup', this._onDragStop, true);
		win.addEventListener('touchstart', this._onDragStart);
		win.addEventListener('touchmove', this._onDrag, true);
		win.addEventListener('touchend', this._onDragStop, true);
	}

	public get(node: HTMLElement, invalidate: () => void): DragResults {
		const { _nodeMap } = this;
		if (!_nodeMap.has(node)) {
			_nodeMap.set(node, {
				dragResults: {
					delta: { x: 0, y: 0 },
					isDragging: false
				},
				invalidate,
				start: { x: 0, y: 0 }
			});
			return emptyResults;
		}
		const state = _nodeMap.get(node)!;
		const dragResults = assign({}, state.dragResults);
		if (!dragResults.isDragging && dragResults.delta.x !== 0 && dragResults.delta.y !== 0) {
			// future reads of the delat will be blank
			state.dragResults.delta = { x: 0, y: 0 };
		}
		return dragResults;
	}
}

const controller = new DragController();

export default class Drag extends Base {
	public get(key: string): Readonly<DragResults> {
		this.requireNode(key);

		const node = this.nodes.get(key);

		if (!node) {
			return emptyResults;
		}

		return controller.get(node, this.invalidate);
	}
}
