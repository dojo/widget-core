import { afterRender, Base, beforeRender, diffProperty, handleDecorator } from './Base';
import { ThemeableMixin } from './mixins/Themeable';

export { afterRender, beforeRender, diffProperty, handleDecorator };

export const WidgetBase = ThemeableMixin(Base);

export default WidgetBase;
