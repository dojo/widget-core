import createStateful from 'dojo-compose/bases/createStateful';
import { State, Stateful } from 'dojo-interfaces/bases';
import { VNode } from 'dojo-interfaces/vdom';
import { h } from 'maquette';

export interface RenderableSpyMixin {
	readonly id: string;
	invalidate(): void;
	render(): VNode;
	tagName: string;
	_shadowProps: any;
}

export type RenderableSpy = Stateful<State> & RenderableSpyMixin;

let renderableSpyCount = 0;

const createRenderableSpy = createStateful
	.mixin({
		className: 'RenderableSpy',
		mixin: <RenderableSpyMixin> {
			get id(this: RenderableSpy) {
				return this._shadowProps.id;
			},

			invalidate(this: RenderableSpy) {
				this._shadowProps.invalidateCount++;
				this.emit({
					type: 'invalidated',
					target: this
				});
			},

			render(this: RenderableSpy) {
				this._shadowProps.renderCount++;
				return h(this.tagName, { 'data-widget-id': this.id }, [ 'renderableSpy' ]);
			},

			tagName: 'div',

			_shadowProps: <any> null
		},
		initialize(instance, options) {
			instance._shadowProps = {
				options,
				id: options ? options.id : `spy-${++renderableSpyCount}`,
				invalidateCount: 0,
				renderCount: 0
			};
		}
	})
	.static({
		count(): number {
			return renderableSpyCount;
		}
	});

export default createRenderableSpy;
