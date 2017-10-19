import global from '@dojo/shim/global';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { AnimatableMixin, AnimationPlayer } from '../../../src/mixins/Animatable';
import { AnimationControls, AnimationTimingProperties } from '../../../src/interfaces';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { spy, stub } from 'sinon';

let effects: any;
let controls: AnimationControls;
let timing: AnimationTimingProperties;
let animate: any;

class TestWidget extends AnimatableMixin(WidgetBase) {
	render() {
		return v('div', {}, [
			v('div', {
				key: 'animated',
				animate
			}),
			v('div', {
				key: 'nonAnimated'
			})
		]);
	}

	callInvalidate() {
		this.invalidate();
	}

	getMeta() {
		return this.meta(AnimationPlayer);
	}
}

const keyframeCtorStub = stub();
const animationCtorStub = stub();
const pauseStub = stub();
const playStub = stub();
const reverseStub = stub();
const cancelStub = stub();
const finishStub = stub();
const startStub = stub();
const currentStub = stub();
const playbackRateStub = stub();
let metaNode: HTMLElement;

registerSuite({
	name: 'animatable',
	'beforeEach'() {
		effects = [
			{ height: '0px' },
			{ height: '10px' }
		];
		controls = {};
		timing = {};
		animate = {
			id: 'animation',
			effects
		};
	},
	'animatable mixin': {
		'adds an animatable player for each node with animations'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'add');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
		},
		'clears animations after new animations have been added'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'add');
			const clearSpy = spy(meta, 'clearAnimations');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
			assert.isTrue(clearSpy.calledOnce);
			assert.isTrue(clearSpy.calledAfter(addSpy));
		},
		'only calls add on nodes with key and animate properties'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'add');

			const renderedWidget = (widget.__render__() as VNode);

			assert.equal(renderedWidget.children!.length, 2);
			assert.isTrue(addSpy.calledOnce);
		}
	},
	'animation player': {
		beforeAll() {
			class KeyframeEffectMock {
				constructor(...args: any[]) {
					keyframeCtorStub(...args);
				}
			}
			class AnimationMock {
				constructor(...args: any[]) {
					animationCtorStub(...args);
				}
				pause() {
					pauseStub();
				}
				play() {
					playStub();
				}
				reverse() {
					reverseStub();
				}
				cancel() {
					cancelStub();
				}
				finish() {
					finishStub();
				}
				startTime(time: number) {
					startStub(time);
				}
				currentTime(time: number) {
					currentStub(time);
				}
				set onfinish(onFinish: () => {}) {
					onFinish();
				}
				set playbackRate(rate: number) {
					playbackRateStub(rate);
				}
			}
			global.KeyframeEffect = KeyframeEffectMock;
			global.Animation = AnimationMock;
		},
		beforeEach() {
			keyframeCtorStub.reset();
			animationCtorStub.reset();
			pauseStub.reset();
			playStub.reset();
			reverseStub.reset();
			cancelStub.reset();
			finishStub.reset();
			startStub.reset();
			currentStub.reset();
			playbackRateStub.reset();
			metaNode = document.createElement('div');
		},
		afterEach() {

		},
		'creates new KeyframeEffect and Animation for each animated node'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(animationCtorStub.calledOnce);
		},
		'reuses previous KeyframeEffect and Player when animation is still valid'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			widget.callInvalidate();
			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(animationCtorStub.calledOnce);
		},
		'passed timing and node info to keyframe effect'() {
			animate.timing = {
				duration: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(keyframeCtorStub.firstCall.calledWithMatch(
				metaNode,
				[
					{ height: '0px' },
					{ height: '10px' }
				],
				{
					duration: 2
				}
			));
		},
		'starts animations paused'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(pauseStub.calledOnce);
			assert.isTrue(playStub.notCalled);
		},
		'plays when play set to true'() {
			animate.controls = {
				play: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(playStub.calledOnce);
			assert.isTrue(pauseStub.notCalled);
		},
		'reverses when reverse set to true'() {
			animate.controls = {
				reverse: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(reverseStub.calledOnce);
		},
		'cancels when cancel set to true'() {
			animate.controls = {
				cancel: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		},
		'finishes when finish set to true'() {
			animate.controls = {
				finish: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(finishStub.calledOnce);
		},
		'sets playback rate when passed'() {
			animate.controls = {
				playbackRate: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(playbackRateStub.calledOnce);
		},
		'can set start time'() {
			animate.controls = {
				startTime: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(startStub.calledOnce);
			assert.isTrue(startStub.firstCall.calledWith(2));
		},
		'can set current time'() {
			animate.controls = {
				currentTime: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(currentStub.calledOnce);
			assert.isTrue(currentStub.firstCall.calledWith(2));
		},
		'will execute effects function if one is passed'() {
			const fx = stub().returns([]);
			animate.effects = fx;
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(fx.calledOnce);
		},
		'clears down used animations on next render if theyve been removed'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(cancelStub.notCalled);

			widget.callInvalidate();
			animate = undefined;

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		},
		'will call onfinish function if passed'() {
			const onFinishStub = stub();
			animate.controls = {
				onFinish: onFinishStub
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(onFinishStub.calledOnce);
		},
		'can return a function instead of properties object'() {
			const animateReturn = {
				id: 'animation',
				effects,
				controls,
				timing
			};
			animate = () => animateReturn;

			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(keyframeCtorStub.firstCall.calledWithMatch(
				metaNode,
				[
					{ height: '0px' },
					{ height: '10px' }
				],
				{}
			));
		},
		'does not create animation if function does not return properties'() {
			animate = () => undefined;

			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.notCalled);
		},
		'can have multiple animations on a single node'() {
			animate = [{
				id: 'animation1',
				effects,
				controls,
				timing
			},
			{
				id: 'animation2',
				effects,
				controls,
				timing
			}];
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledTwice);
		}
	}
});
