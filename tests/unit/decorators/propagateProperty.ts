import { assign } from '@dojo/core/lang';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v, w } from '../../../src/d';
import { propagateProperty } from '../../../src/decorators/propagateProperty';
import { WidgetBase } from '../../../src/WidgetBase';

registerSuite({
	name: 'decorators/propagateProperty',

	'propagateProperty registers decorators'() {
		@propagateProperty('theme')
		class TestWidget extends WidgetBase<any> {
			getPropagatedProperties() {
				return this.getDecorator('propagateProperty');
			}
		}

		class AnotherTestWidget extends TestWidget {
		}

		@propagateProperty('testProp')
		class LastTestWidget extends AnotherTestWidget {
		}

		const widget = new TestWidget();
		const widget2 = new AnotherTestWidget();
		const widget3 = new LastTestWidget();

		assert.equal(widget.getPropagatedProperties().length, 1, 'Expecting a single propagated property');
		assert.equal(widget2.getPropagatedProperties().length, 1, 'Expecting a single propagated property');
		assert.equal(widget3.getPropagatedProperties().length, 2, 'Expecting a two propagated properties');
	},
	'propagateProperty works as non decorator'() {
		class TestWidget extends WidgetBase<any> {
			constructor() {
				super();

				propagateProperty('theme')(this);
			}

			getPropagatedProperties() {
				return this.getDecorator('propagateProperty');
			}
		}

		const widget = new TestWidget();
		assert.deepEqual(widget.getPropagatedProperties(), ['theme']);
	},
	'propagateProperty propagates properties to child widgets'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
		}

		let childProps: any = null;

		class ChildWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return v('div');
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: 'child-manual'
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual',
			automaticProperty: 'parent-auto'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'child-manual',
			automaticProperty: 'parent-auto'
		});
	},
	'propagateProperty does not propagate more than one level'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
		}

		let childProps: any = null;

		class LeafWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return v('div');
			}
		}

		class ChildWidget extends WidgetBase<TestProperties> {
			render() {
				return w(LeafWidget, {
					manualProperty: 'leaf-manual'
				});
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: this.properties.manualProperty
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual',
			automaticProperty: 'parent-auto'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'leaf-manual'
		});
	},
	'propagateProperty works more than one level deep'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
		}

		let childProps: any = null;

		class LeafWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return v('div');
			}
		}

		@propagateProperty('automaticProperty')
		class ChildWidget extends WidgetBase<TestProperties> {
			render() {
				return w(LeafWidget, {
					manualProperty: 'leaf-manual'
				});
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: this.properties.manualProperty
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual',
			automaticProperty: 'parent-auto'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'leaf-manual',
			automaticProperty: 'parent-auto'
		});
	},
	'propagated values won\'t override explicit values'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
		}

		let childProps: any = null;

		class ChildWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return v('div');
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: 'child-manual',
					automaticProperty: 'child-auto'
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual',
			automaticProperty: 'parent-auto'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'child-manual',
			automaticProperty: 'child-auto'
		});
	},
	'propagated properties stack'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
			testProperty?: string;
		}

		let childProps: any = null;

		class LeafWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;

				return v('div');
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: 'child-manual',
					automaticProperty: 'child-auto',
					testProperty: 'test'
				});
			}
		}

		@propagateProperty('testProperty')
		class ChildWidget extends TestWidget {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return w(LeafWidget, {
					manualProperty: 'child-manual'
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual',
			automaticProperty: 'parent-auto'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'child-manual',
			automaticProperty: 'child-auto',
			testProperty: 'test'
		});
	},
	'propagated values arent set if they dont exist'() {
		interface TestProperties {
			manualProperty: string;
			automaticProperty?: string;
		}

		let childProps: any = null;

		class ChildWidget extends WidgetBase<TestProperties> {
			render() {
				childProps = assign({}, this.properties);
				delete childProps.bind;
				return v('div');
			}
		}

		@propagateProperty('automaticProperty')
		class TestWidget extends WidgetBase<TestProperties> {
			render() {
				return w(ChildWidget, {
					manualProperty: 'child-manual'
				});
			}
		}

		const widget = new TestWidget();
		widget.setProperties({
			manualProperty: 'parent-manual'
		});

		widget.__render__();

		assert.deepEqual(childProps, {
			manualProperty: 'child-manual'
		});
	}
});
