import 'web-animations-js/web-animations-next-lite.min';
import { Base } from './Base';
import { AnimationControls, AnimationProperties } from '../interfaces';
import Map from '@dojo/shim/Map';

export class WebAnimations extends Base {

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
			player.onfinish = onFinish.bind(this._bind);
		}

		if (onCancel) {
			player.oncancel = onCancel.bind(this._bind);
		}
	}

	animate(key: string, animateProperties: AnimationProperties | AnimationProperties[]) {
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

					this._updatePlayer(player, controls);

					this._animationMap.set(id, {
						player,
						used: true
					});
				}
			});
		}
	}

	afterRender() {
		super.afterRender();

		this._animationMap.forEach((animation, key) => {
			if (!animation.used) {
				animation.player.cancel();
				this._animationMap.delete(key);
			}
			animation.used = false;
		});
	}
}

export default WebAnimations;
