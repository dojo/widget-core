import global from '@dojo/shim/global';
import { assign } from '@dojo/shim/object';
import WeakMap from '@dojo/shim/WeakMap';
import { Base } from './Base';

export interface DragResults {
	/**
	 * The movement of pointer during the duration of the drag state
	 */
	delta: Position;

	/**
	 * Is the DOM node currently in a drag state
	 */
	isDragging: boolean;
}

interface NodeData {
	dragResults: DragResults;
	invalidate: () => void;
	last: Position;
	start: Position;
}

export interface Position {
	x: number;
	y: number;
}

/**
 * A frozen empty result object, frozen to ensure that no one downstream modifies it
 */
const emptyResults = Object.freeze({
	delta: Object.freeze({ x: 0, y: 0 }),
	isDragging: false
});

/**
 * Return the x/y position for an event
 * @param e The MouseEvent or TouchEvent
 */
function getPosition(e: MouseEvent & TouchEvent): Position {
	return e.type.match(/^touch/) ? {
		x: e.changedTouches[0].screenX,
		y: e.changedTouches[0].screenY
	} : {
		x: e.pageX,
		y: e.pageY
	};
}

/**
 * Return the delta position between two positions
 * @param start The first posistion
 * @param current The second posistion
 */
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
			this._dragging = e.target as HTMLElement;
			state.dragResults.isDragging = true;
			state.last = state.start = getPosition(e);
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
			state.last = getPosition(e);
			state.dragResults.delta = getDelta(state.start, state.last);
			state.invalidate();
		}
	}

	private _onDragStop = (e: MouseEvent & TouchEvent) => {
		const { _dragging } = this;
		if (!_dragging) {
			return;
		}
		const state = this._nodeMap.get(_dragging);
		if (state) {
			state.last = getPosition(e);
			state.dragResults = {
				delta: getDelta(state.start, state.last),
				isDragging: false
			};
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
		// first time we see a node, we will initialize its state
		if (!_nodeMap.has(node)) {
			_nodeMap.set(node, {
				dragResults: {
					delta: { x: 0, y: 0 },
					isDragging: false
				},
				invalidate,
				last: { x: 0, y: 0 },
				start: { x: 0, y: 0 }
			});
			return emptyResults;
		}

		const state = _nodeMap.get(node)!;
		// we are offering up an accurate delta, so we need to take the last event position and move it to the start so
		// that our deltas are calculated from the last time they are read
		state.start = state.last;
		// shallow "clone" the results, so no downstream manipulation can occur
		const dragResults = assign({}, state.dragResults);

		// reset the delta after we have read any last delta while not dragging
		if (!dragResults.isDragging && dragResults.delta.x !== 0 && dragResults.delta.y !== 0) {
			// future reads of the delta will be blank
			state.dragResults.delta = { x: 0, y: 0 };
		}

		return dragResults;
	}
}

const controller = new DragController();

export default class Drag extends Base {
	private boundInvalidate = this.invalidate.bind(this);

	public get(key: string): Readonly<DragResults> {
		this.requireNode(key);

		const node = this.nodes.get(key);

		// if we don't have a reference to the node yet, return an empty set of results
		if (!node) {
			return emptyResults;
		}

		// otherwise we will ask the controller for our results
		return controller.get(node, this.boundInvalidate);
	}
}
