import global from '@dojo/shim/global';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetProperties } from '../../../src/interfaces';
import { AnimatableMixin, AnimationPlayer, AnimationControls, AnimationTimingProperties } from '../../../src/mixins/Animatable';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { spy, stub } from 'sinon';

interface TestWidgetProperties extends WidgetProperties {
	controls?: AnimationControls;
	effects?: any;
	timing?: AnimationTimingProperties;
	animate?: boolean;
}

class TestWidget extends AnimatableMixin(WidgetBase)<TestWidgetProperties> {
	protected getAnimation(): {} | undefined | (() => {}) {
		const { animate = true,
			controls = {},
			timing = {},
			effects = [
				{ height: '0px' },
				{ height: '10px' }
			] } = this.properties;

		return animate ? {
			id: 'animation',
			effects,
			controls,
			timing
		} : undefined;
	}

	render() {
		return v('div', {}, [
			v('div', {
				key: 'animated',
				animate: this.getAnimation()
			}),
			v('div', {
				key: 'nonAnimated'
			})
		]);
	}

	getMeta() {
		return this.meta(AnimationPlayer);
	}
}

class PropertyFunctionWidget extends TestWidget {
	getAnimation() {
		const { controls = {},
			timing = {},
			effects = [
				{ height: '0px' },
				{ height: '10px' }
			] } = this.properties;

		return function () {
			return {
				id: 'animation',
				effects,
				controls,
				timing
			};
		};
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
let metaNode: HTMLElement;

registerSuite({
	name: 'animatable',
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
		'passed timing and node info to keyframe effect'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				timing: {
					duration: 2
				}
			});
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
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					play: true
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(playStub.calledOnce);
			assert.isTrue(pauseStub.notCalled);
		},
		'reverses when reverse set to true'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					reverse: true
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(reverseStub.calledOnce);
		},
		'cancels when cancel set to true'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					cancel: true
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		},
		'finishes when finish set to true'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					finish: true
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(finishStub.calledOnce);
		},
		'can set start time'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					startTime: 2
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(startStub.calledOnce);
			assert.isTrue(startStub.firstCall.calledWith(2));
		},
		'can set current time'() {
			const widget = new TestWidget();
			widget.__setProperties__({
				controls: {
					currentTime: 2
				}
			});
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(currentStub.calledOnce);
			assert.isTrue(currentStub.firstCall.calledWith(2));
		},
		'will execute effects function if one is passed'() {
			const widget = new TestWidget();
			const fx = stub().returns([]);
			widget.__setProperties__({
				effects: fx
			});
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
			widget.__setProperties__({
				animate: false
			});
			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		},
		'will call onfinish function if passed'() {
			const onFinishStub = stub();
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__setProperties__({
				controls: {
					onFinish: onFinishStub
				}
			});

			widget.__render__();
			assert.isTrue(onFinishStub.calledOnce);
		},
		'can return a function instead of properties object'() {
			const widget = new PropertyFunctionWidget();
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
		}
	}
});
