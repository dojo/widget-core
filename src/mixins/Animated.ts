import 'web-animations-js/web-animations-next-lite.min';
import { Constructor, DNode, HNode, AnimationControls, AnimationProperties } from '../interfaces';
import { WidgetBase } from '../WidgetBase';
import { afterRender } from '../decorators/afterRender';
import { isHNode, decorate } from '../d';
import Map from '@dojo/shim/Map';
import MetaBase from '../meta/Base';

declare const KeyframeEffect: any;
declare const Animation: any;

export class AnimationPlayer extends MetaBase {

	private _animationMap = new Map<string, any>();

	private _createPlayer(node: HTMLElement, properties: AnimationProperties) {
		const {
			effects,
			timing = {}
		} = properties;

		const fx = typeof effects === 'function' ? effects() : effects;

		const keyframeEffect = new KeyframeEffect(
			node,
			fx,
			timing
		);

		return new Animation(keyframeEffect, (document as any).timeline);
	}

	private _updatePlayer(player: any, controls: AnimationControls) {
		const {
			play,
			reverse,
			cancel,
			finish,
			onFinish,
			onCancel,
			playbackRate,
			startTime,
			currentTime
		} = controls;

		if (playbackRate !== undefined) {
			player.playbackRate = playbackRate;
		}

		if (reverse) {
			player.reverse();
		}

		if (cancel) {
			player.cancel();
		}

		if (finish) {
			player.finish();
		}

		if (startTime !== undefined) {
			player.startTime(startTime);
		}

		if (currentTime !== undefined) {
			player.currentTime(currentTime);
		}

		if (play) {
			player.play();
		}
		else {
			player.pause();
		}

		if (onFinish) {
			player.onfinish = onFinish;
		}

		if (onCancel) {
			player.oncancel = onCancel;
		}
	}

	private _bindControlCallbacks(controls: AnimationControls, bindScope: any): AnimationControls {

		const {
			onFinish,
			onCancel
		} = controls;

		return {
			...controls,
			onFinish: onFinish ? onFinish.bind(bindScope) : null,
			onCancel: onCancel ? onCancel.bind(bindScope) : null
		};
	}

	add(key: string, animateProperties: AnimationProperties | AnimationProperties[], bindScope: any) {
		const node = this.getNode(key);

		if (node) {
			if (!Array.isArray(animateProperties)) {
				animateProperties = [ animateProperties ];
			}
			animateProperties.forEach((properties) => {
				properties = typeof properties === 'function' ? properties() : properties;

				if (properties) {
					const { id } = properties;
					if (!this._animationMap.has(id)) {

						this._animationMap.set(id, {
							player: this._createPlayer(node, properties),
							used: true
						});
					}

					const { player } = this._animationMap.get(id);
					const { controls = {} } = properties;

					this._updatePlayer(player, this._bindControlCallbacks(controls, bindScope));

					this._animationMap.set(id, {
						player,
						used: true
					});
				}
			});
		}
	}

	clearAnimations() {
		this._animationMap.forEach((animation, key) => {
			if (!animation.used) {
				animation.player.cancel();
				this._animationMap.delete(key);
			}
			animation.used = false;
		});
	}

}

export function AnimatedMixin<T extends Constructor<WidgetBase>>(Base: T): T {
	class Animated extends Base {

		@afterRender()
		protected decorateAfterRender(result: DNode): DNode {
			decorate(result,
				(node: HNode) => {
					const { animate, key } = node.properties;
					if (animate && key) {
						this.meta(AnimationPlayer).add(key as string, animate, this);
					}
				},
				(node: DNode) => {
					return !!(isHNode(node) && node.properties.animate && node.properties.key);
				}
			);
			this.meta(AnimationPlayer).clearAnimations();
			return result;
		}
	}

	return Animated;
}

export default AnimatedMixin;
