import 'web-animations-js/web-animations-next-lite.min';
import { Constructor, DNode, HNode } from '../interfaces';
import { WidgetBase } from '../WidgetBase';
import { afterRender } from '../decorators/afterRender';
import { isHNode, decorate } from '../d';
import Map from '@dojo/shim/Map';
import MetaBase from '../meta/Base';

declare const KeyframeEffect: any;
declare const Animation: any;

export interface AnimationControls {
	play?: boolean;
	onFinish?: () => void;
	reverse?: boolean;
	cancel?: boolean;
	finish?: boolean;
	playbackRate?: number;
	startTime?: number;
	currentTime?: number;
}

export interface AnimationTimingProperties {
	duration?: number;
	delay?: number;
	direction?: string;
	easing?: string;
	endDelay?: number;
	fill?: string;
	iterations?: number;
	iterationStart?: number;
}

export interface AnimationProperties {
	id: string;
	effects: any[];
	controls?: AnimationControls;
	timing?: AnimationTimingProperties;
}

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
			playbackRate,
			startTime,
			currentTime
		} = controls;

		if (playbackRate !== undefined) {
			player.playbackRate = playbackRate;
		}

		if (finish) {
			player.finish();
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
	}

	add(key: string, animateProperties: AnimationProperties[]) {
		const node = this.getNode(key);

		if (node) {
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

					this._updatePlayer(player, controls);

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

export function AnimatableMixin<T extends Constructor<WidgetBase>>(Base: T): T {
	class Animated extends Base {

		@afterRender()
		protected decorateAfterRender(result: DNode): DNode {
			decorate(result,
				(node: HNode) => {
					const { animate, key } = node.properties;
					this.meta(AnimationPlayer).add(key as string, animate);
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

export default AnimatableMixin;
