import compose from 'dojo-compose/compose';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import tagNameMixin from '../../../src/mixins/tagNameMixin';

const tagNameMixinTestFactory = compose({
	tagName: 'div',
	properties: <any> {},
	applyChangedProperties(this: any, previousProperties: any, currentProperties: any) { }
})
.mixin(tagNameMixin);

registerSuite({
	name: 'mixins/tagNameMixin',
	applyChangedProperties() {
		const tagNameMixinInstance = tagNameMixinTestFactory();
		tagNameMixinInstance.applyChangedProperties({}, { tagName: 'header' });
		assert.equal(tagNameMixinInstance.tagName, 'header');
		tagNameMixinInstance.applyChangedProperties({}, {});
		assert.equal(tagNameMixinInstance.tagName, 'header');
	}
});
