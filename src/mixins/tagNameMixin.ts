import compose, { ComposeFactory } from 'dojo-compose/compose';

/**
 * TagNameMixin Properties
 */
export interface TagNameMixinProperties {
	tagName?: string;
}

/**
 * TagNameMixin interface
 */
export interface TagNameMixin {
	tagName: string;
}

/**
 * TagNameMixin Compose Factory
 */
export interface TagNameMixinFactory extends ComposeFactory<TagNameMixin, {}> {}

const tagNameMixinFactory: TagNameMixinFactory = compose({
	tagName: 'div'
})
.aspect({
	before: {
		applyChangedProperties(this: TagNameMixin, previousProperties: TagNameMixinProperties, currentProperties: TagNameMixinProperties) {
			if (currentProperties.tagName) {
				this.tagName = currentProperties.tagName;
			}
		}
	}
});

export default tagNameMixinFactory;
