import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { AnimatableMixin, AnimationPlayer } from '../../../src/mixins/Animatable';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { spy } from 'sinon';

const staticAnimateProperties = {
	id: 'staticAnimation',
	effects: [
		{ height: '0px' },
		{ height: '10px' }
	]
};

class TestWidget extends AnimatableMixin(WidgetBase) {
	render() {
		return v('div', {}, [
			v('div', {
				key: 'animated',
				animate: staticAnimateProperties
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

registerSuite({
	name: 'animatable',
	'animatable mixin': {
		'adds an animatable player for each node with animations'() {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'add');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
			assert.isTrue(addSpy.firstCall.calledWith('animated', staticAnimateProperties));
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

	}
});
