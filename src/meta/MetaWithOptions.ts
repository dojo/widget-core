import MetaBase from './Base';
import { WidgetMetaConstructor, WidgetMetaOptions } from './interfaces';

function MetaWithOptions<T extends MetaBase<any>, O extends WidgetMetaOptions>(MetaType: WidgetMetaConstructor<T, O>, options: O): MetaWithOptionsRef<T, O> {
	return new MetaWithOptionsRef(MetaType, options);
}

export class MetaWithOptionsRef<T extends MetaBase<any>, O extends WidgetMetaOptions> {
	private MetaType: WidgetMetaConstructor<T, O>;
	private options: O;

	constructor(MetaType: WidgetMetaConstructor<T, O>, options: O) {
		this.MetaType = MetaType;
		this.options = options;
	}
}

export default MetaWithOptions;
