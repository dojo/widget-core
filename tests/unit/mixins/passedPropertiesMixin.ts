import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import passedPropertiesMixin from '../../../src/mixins/passedPropertiesMixin';
import createWidgetBase from '../../../src/createWidgetBase';
import { v, w } from '../../../src/d';
import { DNode } from '../../../src/interfaces';

registerSuite({
	name: 'mixins/passedPropertiesMixin',
	integration: {
		'works with widget base'() {
			let propertiesPassedCount = 0;

			const createSpan = createWidgetBase.mixin({
				initialize(instance) {
					const { properties: { passed } } = instance;
					if (passed) {
						propertiesPassedCount++;
					}
				}
			});

			const createWidgetWithPassedProperties = createWidgetBase
				.mixin(passedPropertiesMixin)
				.override({ propertiesToPass: [ 'passed' ] })
				.mixin({
					mixin: {
						getChildrenNodes(): DNode[] {
							return [
								w(createSpan, { id: '1' }),
								v('div', {}, [
									'text',
									w(createSpan, { id: '2' }, [
										w(createSpan, { id: '3' })
									]),
									v('div', {}, [
										w(createSpan, { id: '4' })
									])
								]),
								w(createSpan, { id: '5' })
							];
						}
					}
				});

			const instance = createWidgetWithPassedProperties({ properties: { passed: true } });
			instance.__render__();
			assert.equal(propertiesPassedCount, 5);
		}
	}
});
