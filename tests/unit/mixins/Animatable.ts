// import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
// import * as assert from 'intern/chai!assert';
import {
	AnimatableMixin
} from '../../../src/mixins/Animatable';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
// import { stub, SinonStub } from 'sinon';

class TestWidget extends AnimatableMixin(WidgetBase) {
	render() {
		return v('div', {
			key: 'root',
			animate: {
				id: 'testAnimation',
				effects: [
					{ height: '0px' },
					{ height: '10px' }
				]
			}
		});
	}
}

registerSuite({
	name: 'animatable',
	beforeEach() {

	},
	afterEach() {

	},
	''() {

	}
});
