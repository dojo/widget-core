import 'web-animations-js/web-animations-next-lite.min';
import { Constructor, DNode, HNode } from '../interfaces';
import { WidgetBase, afterRender } from '../WidgetBase';
import { isHNode, decorate } from '../d';
import Map from '@dojo/shim/Map';
import MetaBase from '../meta/Base';

/**
 * KeyframeEffect and Animation types required
 */
declare const KeyframeEffect: any;
declare const Animation: any;

/**
 * The controls for the animation player which can
 * be changed after the animation has been created
 */
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

/**
 * Timing properties for the animation.
 * These are fixed once the aimation has been created
 */
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

/**
 * The anmiations property to be passed as
 * 'animations' in vNode properties
 */
export interface AnimationProperties {
	id: string;
	effects: any[];
	controls?: AnimationControls;
	timing?: AnimationTimingProperties;
}

/**
 * The animation player class.
 * Has access to meta to require nodes and apply animations
 */
class AnimationPlayer extends MetaBase {

	/**
	 * The map of animations
	 */
	private _animationMap = new Map<string, any>();

	/**
	 * Function that creates an animation player
	 *
	 * @param node The node to apply the animation to
	 * @param properties The animation properties
	 */
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

	/**
	 * Updates a current player based on the AnimationControls passed
	 *
	 * @param player the Animation object
	 * @param controls The controls to be set on the Animation
	 */
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

	/**
	 * Adds a new Animation to the animation map on next animation frame and
	 * sets the given player controls against the new Animation.
	 *
	 * @param key The VNode key for the node to be animated
	 * @param animateProperties The Animation properties to be applied to the generated HTMLElement
	 */
	add(key: string, animateProperties: AnimationProperties[]): Promise<any> {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				this.requireNode(key, function(this: AnimationPlayer, node: HTMLElement) {

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

					resolve();

				}.bind(this));
			});
		});
	}

	/**
	 * Clears out any animations that have not been used
	 */
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

/**
 * Function that returns a class decorated with Animatable
 */
export function AnimatableMixin<T extends Constructor<WidgetBase>>(Base: T): T {
	class Animatable extends Base {

		/**
		 * Finds animation properties in the result of afterRender and creates Animation
		 * Players per node before clearing down any unused animations.
		 *
		 * @param result
		 */
		@afterRender()
		myAfterRender(result: DNode): DNode {
			const promises: Promise<any>[] = [];
			decorate(result,
				(node: HNode) => {
					const { animate, key } = node.properties;
					promises.push(this.meta(AnimationPlayer).add(key as string, animate));
				},
				(node: DNode) => {
					return !!(isHNode(node) && node.properties.animate && node.properties.key);
				}
			);
			Promise.all(promises).then(() => this.meta(AnimationPlayer).clearAnimations());
			return result;
		}
	}

	return Animatable;
}

export default AnimatableMixin;
