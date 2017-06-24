# @dojo/widget-core

[![Build Status](https://travis-ci.org/dojo/widget-core.svg?branch=master)](https://travis-ci.org/dojo/widget-core)
[![codecov](https://codecov.io/gh/dojo/widget-core/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widget-core)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidget-core.svg)](https://badge.fury.io/js/%40dojo%2Fwidget-core)

This repo provides users with the ability to write their own Dojo 2 widgets.

We also provide a suite of pre-built widgets to use in your applications: [(@dojo/widgets)](https://github.com/dojo/widgets).

**WARNING** This is _beta_ software. While we do not anticipate significant changes to the API at this stage, we may feel the need to do so. This is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Overview](#overview)
    - [`v` & `w`](#v--w)
        - [`v`](#v)
        - [`w`](#w)
    - [tsx](#tsx)
    - [Writing custom widgets](#writing-custom-widgets)
        - [Public API](#public-api)
        - [The 'properties' lifecycle](#the-properties-lifecycle)
            - [Individual Property Diffing](#individual-property-diffing)
			- [Property Diffing Reactions](#property-diffing-reactions)
		- [Render Lifecycle](#render-lifecycle)
        - [Projector](#projector)
		  - [Server Side Rendering](#server-side-rendering)
        - [Event Handling](#event-handling)
        - [Widget Registry](#widget-registry)
        - [Injecting State](#injecting-state)
        - [Theming](#theming)
        - [Internationalization](#internationalization-i18n)
        - [Web Components](#web-components)
            - [Attributes](#attributes)
            - [Properties](#properties)
            - [Events](#events)
            - [Initialization](#initialization)
        - [Meta](#meta)
		- [DomWrapper](#domwrapper)
    - [Key Principles](#key-principles)
    - [API](#api)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use @dojo/widget-core, install the package along with its required peer dependencies:

```shell
npm install @dojo/widget-core

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/i18n
npm install maquette
```

You can also use the [dojo cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application.

## Features

Constructing your own widgets (Custom widgets) is simple and straightforward.
The smallest `@dojo/widget-core` example looks like this:

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	render() {
       return v('h1', [ 'Hello, Dojo!' ]);
	}
}

const Projector = ProjectorMixin(MyWidget);
const projector = new Projector();

projector.append(root);
```

This code renders a `h1` element onto the page, that says "Hello, Dojo!".

### Overview

All widgets in Dojo 2 are designed using key reactive architecture concepts.
These concepts include unidirectional data flow, inversion of control and property passing.

Dojo 2's widget-core is built with TypeScript, leveraging Class mixins to construct and manipulate traits and mixins.

We also make use of a VirtualDOM (VDOM) in Dojo 2.
In order to interact with our VDOM, you need to pass it [HyperScript](https://github.com/dominictarr/hyperscript).
In Dojo 2 we provide 2 functions that make interacting with the VDOM, easy and intuitive: `v` and `w`.

### `v` & `w`

These functions express structures that will be passed to the VDOM.

`v` creates nodes that represent DOM tags, e.g. `div`, `header` etc.
This function allows Dojo 2 to manage lazy hyperscript creation and element caching.

 `w` creates Dojo 2 widgets or custom widget.
This function provides support for lazy widget instantiation, instance management and caching.

The `v` & `w` functions are available from the `@dojo/widget-core/d` package.

```ts
import { v, w } from '@dojo/widget-core/d';
```

The argument and return types for `v` and `w` are available from `@dojo/widget-core/interfaces`, and are as follows:

```ts
import { DNode, HNode, WNode } from '@dojo/widget-core/interfaces';
```

#### `v`

The following code creates an element with the specified `tag`

```ts
v(tag: string): HNode[];
```

The following code renders an element with the `tag` and `children`.

```ts
v(tag: string, children: DNode[]): HNode[];
```

The following code renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VirtualDomProperties, children?: DNode[]): HNode[];
```

As well as interacting with the VDOM by passing it HyperScript, you can also pass it Dojo 2 Widgets or Custom Widgets using the `w` function.

#### `w`

The following code creates a widget using the `widgetConstructor` and `properties`.

```ts
w<W extends WidgetBaseInterface>(widgetConstructor: W | RegistryLabel, properties: W['properties']): WNode<W>;
```

The following code creates a widget using the `widgetConstructor`, `properties` and `children`

```ts
w<W extends WidgetBaseInterface>(widgetConstructor: W | RegistryLabel, properties: W['properties'], children: W['children']): WNode<W>;
```
Example `w` constructs:

```ts
w(WidgetClass, properties);
w(WidgetClass, properties, children);

w('my-widget', properties);
w('my-widget', properties, children);
```

The example above that uses a string for the `widgetConstructor `, is taking advantage of the [widget registry](#widget-registry) functionality.
The widget registry allows for the lazy loading of widgets.

### tsx

In additional to the programatic functions `v` and `w`, widget-core optionally supports the use of the `jsx` syntax known as [`tsx`](https://www.typescriptlang.org/docs/handbook/jsx.html) in TypeScript.

To start to use `jsx` in your project the widgets need to be named with a `.tsx` extension and some configuration is required in the project's `tsconfig.json`:

Add the configuration options for `jsx`:

```
"jsx": "react",
"jsxFactory": "tsx",
```

Include `.tsx` files in the project:

```
 "include": [
 	"./src/**/*.ts",
 	"./src/**/*.tsx"
 ]
```

Once the project is configured, `tsx` can be used in a widget's `render` function simply by importing the `tsx` function as `import { tsx } from '@dojo/widget-core/tsx';`

```tsx
class MyWidgetWithTsx extends WidgetBase<MyProperties> {
	protected render(): DNode {
		const { clear, properties: { completed, count, activeCount, activeFilter } } = this;

		return (
			<footer classes={this.classes(css.footer)}>
				<span classes={this.classes(css.count)}>
					<strong>{`${activeCount}`}</strong>
					<span>{`${count}`}</span>
				</span>
				<TodoFilter activeFilter={activeFilter} />
				{ completed ? ( <button onclick={clear} /> ) : ( null ) }
			</footer>
		);
	}
}
```

**Note:** Unfortunately `tsx` is not directly used within the module so will report as an unused import so would be needed to be ignored by linters.

### Writing Custom Widgets

The `WidgetBase` class provides the functionality needed to create Custom Widgets.
This functionality includes caching and widget lifecycle management.

The `WidgetBase` class is available from the `@dojo/widget-core/WidgetBase ` package.

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
```

**All** widgets should extend from this class.

#### The 'properties' lifecycle

The properties lifecycle occurs immediately the widget render lifecycle. Properties are defined by an interface passed as a generic type to `WidgetBase` and represent the public default API. By default properties are automatically diffed against previous properties using the `auto` diff function (see table below).

**Note:** If a property contains complex data structures that you need to diff, then individual control is required using the `diffProperty` decorator.

##### Individual Property Diffing

Property diffing can be controlled for an individual property using the `diffProperty` decorator on a widget class.

`widget-core` provides a set of diffing function from `diff.ts` that can be used or a custom diffing function can be provided. Properties that have been configured with a specific diffing type will be excluded from the automatic diffing provided.

| Diff Function                 | Description                                                                       |
| -------------------- | ----------------------------------------------------------------------------------|
| `always`    | Always report a property as changed.                                              |
| `auto`      | Ignore functions, shallow compare objects, and reference compare all other values.|                                 |
| `ignore`    | Never report a property as changed.                                               |
| `reference` | Compare values by reference (`old === new`)                                       |
| `shallow`   | Treat the values as objects and compare their immediate values by reference.      |

**Important:** All diffing functions should be pure functions and are called *WITHOUT* any scope.

```ts
// using a diff function provided by widget-core#diff
@diffProperty('title', reference)
class MyWidget extends WidgetBase<MyProperties> { }

//custom diff function; A pure function with no side effects.
function customDiff(previousProperty: string, newProperty: string): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

// using a custom diff function
@diffProperty('title', customDiff)
class MyWidget extends WidgetBase<MyProperties> { }
```

##### Property Diffing Reactions

It can be necessary to perform some internal logic when one or more properties change, this can be done by registering a reaction callback.

A reaction function is registered using the `diffProperty` decorator on a widget class method. This method will be called when the specified property has been detected as changed and receives both the old and new property values.

```ts
class MyWidget extends WidgetBase<MyProperties> {

	@diffProperty('title', auto)
	protected onTitleChange(previousProperties: any, newProperties: any): void {
		this._previousTitle = previousProperties.title;
	}
}
```

`diffProperty` decorators can be stacked on a single class method and will be called if any of the specified properties are considered changed.

```ts
class MyWidget extends WidgetBase<MyProperties> {

	@diffProperty('title', auto)
	@diffProperty('subtitle', auto)
	protected onTitleOrSubtitleChange(previousProperties: any, newProperties: any): void {
		this._titlesUpdated = true;
	}
}
```

For non-decorator environments (Either JavaScript/ES6 or a TypeScript project that does not have the experimental decorators configuration set to true in the `tsconfig`), the functions need to be registered in the constructor using the `addDecorator` API with `diffProperty` as the key.

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		diffProperty('foo', auto, this.diffFooReaction)(this);
	}

	diffFooReaction(previousProperty: any, newProperty: any) {
		// do something to reaction to a diff of foo
	}
}
```

#### Render Lifecycle

<!-- TODO: render lifecycle goes here -->

Occasionally, in a mixin or base widget class, it my be required to provide logic that needs to be executed before or after a widget's `render` call. These lifecycle hooks are supported in `WidgetBase` and operate as before and after aspects.

The functionality is provided by the `beforeRender` and `afterRender` decorators.

***Note:*** Both the `beforeRender` and `afterRender` functions are executed in the order that they are specified from the super class up to the final class.

##### BeforeRender

The `beforeRender` call receives the widget's `render` function, `properties` and `children` and is expected to return a function that satisfies the `render` API. The `properties` and `children` are passed to enable them to be manipulated or decorated prior to the `render` being called.

This is the only time in the widget lifecycle that exposes either of these attributes to be manipulated outside of the property system.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@beforeRender()
	myBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// decorate/manipulate properties or children.
		properties.extraAttribute = 'foo';
		// Return or replace the `render` function
		return () => {
			return v('my-replaced-attribute');
		};
	}
}
```

And using the `beforeRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		beforeRender(this.myOtherBeforeRender)(this);
	}

	myOtherBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// do something with the result
		return renderFunc;
	}
}
```

##### AfterRender

The `afterRender` call receives the returned `DNode`s from a widget's `render` call, so that the nodes can decorated, manipulated or even swapped.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@afterRender()
	myAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

And using the `afterRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		afterRender(this.myOtherAfterRender)(this);
	}

	myOtherAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

#### Projector

Projector is a term used to describe a widget that will be attached to a DOM element, also known as a root widget.
Any widget can be converted into a projector simply by mixing in the `ProjectMixin` mixin.

```ts
const MyProjector = ProjectorMixin(MyWidget);
```

Projectors behave in the same way as any other widget **except** that they need to be manually instantiated and managed outside of the standard widget lifecycle.

There are 3 ways that a projector widget can be added to the DOM - `.append`, `.merge`, `.replace`, or `.sandbox`, depending on the type of attachment required.

 - `append`  - Creates the widget as a child to the projector's `root` node
 - `merge`   - Merges the widget with the projector's `root` node
 - `replace` - Replace the projector's `root` node with the widget
 - `sandbox` - Create a document fragment as the projector's `root` node

```ts
const MyProjector = ProjectorMixin(MyWidget);

const myProjector = new MyProjector()
myProjector.append(root);
```

##### Server Side Rendering

The `Projector` provides several features which facilitate server side rendering and progressive enhancement.  For rendering on the server, there are the methods `.sandbox()` and `.toHtml()`.

###### .sandbox()

`.sandbox()` does two things.  It creates the `root` of the projector as a `DocumentFragment`.  This ensures that the rendering of the projector does not interfere with the `document`.  In order to server side render, you still need something like `jsdom` though in order to provide the functionality needed to generate the DOM structure which will be shipped to the browser.  Also, when the projector is attached it will render synchronously.  Usually the projector renders asyncronously to ensure that renders have a minimal impact on the user experience, helping eliminate _jank_.  This can cause problems though in that when exporting the HTML, the projector needs to be in a _known_ render state. `.sandbox()` takes a single optional argument which is a `Document`.  If none is supplied, then the global `document` will be used.

An example using [`jsdom`](https://github.com/tmpvar/jsdom):

```ts
import { JSDOM } from 'jsdom';
import ProjectorMixin from '@dojo/widget-core/mixins/Projector';
import App from './widgets/App';

const dom = new JSDOM('', { runScripts: 'dangerously' });
const projector = new (ProjectorMixin(App))();
const projector.sandbox(dom.window.document);
```

###### .toHtml()

`.toHtml()` returns a string which represents the current render of the `Projector`.  While it can be used with any attachment mode, it is most effective when using `.sandbox()`, as this mode operates synronously, ensuring that the string returned accuretly represents the current rendered DOM structure.  Building on the example from above:

```ts
import { JSDOM } from 'jsdom';
import ProjectorMixin from '@dojo/widget-core/mixins/Projector';
import App from './widgets/App';

const dom = new JSDOM('', { runScripts: 'dangerously' });
const projector = new (ProjectorMixin(App))();
const projector.sandbox(dom.window.document);

/* set any App properties/children/state */
const html = projector.toHtml();
/* `html` contains the rendered HTML */
```

#### Event Handling

The recommended pattern for custom event handlers is to declare them on the widget class and reference the function using `this`.
Event handlers are most commonly called from `render`.

Event handlers can be internal logic encapsulated within a widget or delegate to a function passed into the widget via `properties`.
For convenience event handlers are automatically bound to the scope of their enclosing widget.

*internally defined handler*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	private selected: boolean;

	onClick() {
		this.selected = !this.selected;
	}

	render(this: MyWidget): DNode {
		return v('div', [
			v('input', { type: 'checkbox', onclick: this.onClick }),
			v('input', { type: 'text', disabled: this.selected })
		]);
	}
}
```

*Handler passed via properties*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	onClick(): void {
		this.properties.mySpecialFunction();
	}
}
```

*Binding a function passed to a child widget*

```ts
import { specialClick } from './mySpecialFunctions';

class MyWidget extends WidgetBase<WidgetProperties> {
	render() {
		return	w(ChildWidget, { onClick: specialClick });
	}
}
```

#### Widget Registry

The widget registry provides the ability to define a `string` or `symbol` as a label for a `WidgetRegistryItem`.

The `WidgetRegistryItem`, can be one of the following types:

1. `WidgetConstructor`
2. `Promise<WidgetConstructor>`
3. `() => Promise<WidgetConstructor>`

A global widget registry is exported from the `d` module.

```ts
import { registry } from '@dojo/widget-core/d';
import MyWidget from './MyWidget';

// registers the widget that will be available immediately
registry.define('my-widget-1', MyWidget);

// registers a promise that is resolving to a widget and will be
// available as soon as the promise resolves.
registry.define('my-widget-2', Promise.resolve(MyWidget));

// registers a function that will be lazily executed the first time the
// label is used within a widget render pipeline. The widget will be available
// as soon as the promise is resolved after the initial get.
registry.define('my-widget-3', () => Promise.resolve(MyWidget));
```

It is recommended to use the widget registry when defining widgets with [`w`](#w--d), to support lazy widget resolution.

Example of registering a function that returns a `Promise` that resolves to a `widget`.

```ts
import load from '@dojo/core/load';

registry.define('my-widget', () => {
	return load(require, './MyWidget')
		.then(([ MyWidget ]) => MyWidget.default);
});
```

#### Injecting State

Working with larger widget structures, it can quickly become tiresome and complex to pass all the required properties down the tree. Needing to pass all required properties also means widgets often need to be aware of properties that are only needed for ensuring their propagation to child widgets.

Dojo 2 provides a mechanism to inject state directly to parts of the widget tree; this is done by defining an `Injector` in the `registry` and passing a context object that will source the state that is to be injected.

```ts
import { Injector, BaseInjector } from '@dojo/widget-core/Injector';

const myStateContext = {
	theme: 'solid'
};

registry.define('state', Injector(BaseInjector, myStateContext));
```

To use the injected state, create a `beforeRender` method that returns a render function which creates a `w` reference to the registry item like any other widget and pass the properties required by the `InjectorProperties` interface.

```ts
beforeRender(renderFunc: () => DNode, properties: any, children: any): DNode {
	return () => {
		return w('state', {
			render: renderFunc,
			getProperties(context: any, properties: any): any {
				return context;
			},
			properties,
			getChildren(context: any, children: DNode[]): DNode[] {
				return [];
			},
			children
		});
	};
}
```

This will inject the values of `myState` as properties to the widget, as the returned object from `getProperties` is mixed over the widget's existing properties.

For convenience, Dojo 2 provides a mixin called `Container` that will decorate a widget with the above `beforeRender` implementation. Using the `Container` mixin enables any view widget to have state injected without coupling the widget to always have state injected. This means the widget can also be used as a normal widget with properties being passed from its parent.


```ts
import { MyViewWidget } from './MyViewWidget';
import { Container } from '@dojo/widget-core/Container';

function getProperties(context: any, properties: any): any {
	return context;
}

const MyViewWidgetContainer = Container(MyViewWidget, 'state', { getProperties });
```

**Note:** that both the `getProperties` and `getChildren` functions do not need to be provided, if the functions are not defined the default mappers will be used that return an empty object and an empty array respectively.

There may be times when the default `BaseInjector` doesn't fully meet your needs. For example if the context contains a reference to an eventable instance, you may want to add an event listener in the `Injector` to perform some logic, perhaps invalidate the widget.

To do this the `BaseInjector` can be extended easily to add the extra logic required.

```ts
interface MyContext {
	eventeableInstance: Evented;
	bar: number;
}

class MyInjector extends BaseInjector<MyContext> {
	constructor(context: MyContext) {
		super(context);
		const { eventeableInstance } = context;
		eventeableInstance.on('change', () => {
			this.invalidate();
		});
	}

	protected toInject(): any {
		const { eventeableInstance, bar } = this.context;
		return {
			eventeableInstance,
			bar
		};
	}
}
```

#### Theming

##### Overview

Widgets are themed using `css-modules` and the `Themeable` mixin. Each widget must implement a .css file that contains all the css classes that will be used to style it. The `baseClasses` object is the css API for the Widget: `baseClasses` css classes can be overridden by external themes. Further customization of specific Custom Widget classes can be achieved by passing `extraClasses` into the widget.
The `Themeable` mixin provides a `classes` function that controls the classes to be applied to each node. Classes from the base `css` object passed to the `classes` function can be themed and overridden. To create fixed classes that cannot be changed, the chained `fixed` function can be used.

##### Authoring a Base Theme

A base theme is authored using `css-modules` and `cssnext`. The base theme `css` file should be located in a `styles` folder within the Widget's package directory.
The `typed-css-modules` [cli](https://github.com/Quramy/typed-css-modules#cli) should be used in `watch` mode in order to generate typings for TypeScript usage. This is automatically included within the `dojo build -w` command from `dojo-cli`.

```
tabPanel
├── createTabPanel.ts
└── styles
    └── tabPanel.css
```

The `baseClasses` css must contain a complete set of all of the classes you wish to apply to a widget as all theme and extra classes are limited by the classnames made available here.
Classnames are locally scoped as part of building a Dojo application. A theme `key` is generated at build time to locate the themes for each class where a theme is set.

```css
/* tabpanel.css */
.root {
	background: red;
}

.tab {
	background: blue;
}
```

##### Registering `baseClasses`

To apply `baseClasses` a widget must use `ThemeableMixin` and the `theme` decorator from `mixins/Themeable` to register the `baseClasses`.

```ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<WidgetProperties> {
	// ...
}
```

Basic usage:

```ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		const { root, tab } = baseClasses;
		return
			v('ul', { classes: this.classes(root) }, [
				v('li', { classes: this.classes(tab) }, [ 'tab1' ])
				// ...
			]);
	}
}
```

##### Applying a Theme

Themeable widgets include an optional `theme` property which can be set to pass in a theme. Theme classes will override `baseClasses`. When a `theme` property is set or changed, the widgets `theme` classes will be regenerated and the widget invalidated such that it is redrawn. Themes are used to apply consistent styling across the widget codebase.

Usage Extending on the previous `tabPanel` example.

``` css
/* customTheme/tabPanel.css */
.tabs {
	background: green;
}
```

Import the theme and pass it to the widget via its `properties`. The theme classes will be automatically mixed into the widget and available via `this.classes`.

```ts
import * as customTheme from './themes/customTheme.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will have green tabs instead of baseTheme red.
		return w(TabPanel, { theme: customTheme });
	}
}
```

The theme can be applied to individual widgets or to a project and property passed down to its children.

##### Injecting a theme

The theming system supports injecting a theme that is configured externally to the usual mechanism of passing properties down the widget tree.

This is done using a `ThemeInjectorContext` instance that is passed to the `Injector` mixin along with the `ThemeInjector` class. Once the theme injector is defined in the registry, the `theme` can be changed by calling the `ThemeInjectorContext#set(theme: any)` API on the instance of the injector context.

```ts
// Create the singleton injector context
const themeInjectorContext = new ThemeInjectorContext(myTheme);

// Create the base ThemeInjector using the singleton context and the Injector mixin
const ThemeInjectorBase = Injector<ThemeInjectorContext, Constructor<ThemeInjector>>(ThemeInjector, themeInjectorContext);

// Define the created ThemeInjector against the static key exported from `Themeable`
registry.define(INJECTED_THEME_KEY, ThemeInjectorBase);
```

Once this theme injector is defined, any themeable widgets without an explicit `theme` property will be controlled via the theme set within the `themeInjectorContext`. To change the theme simply call `themeInjectorContext.set(myNewTheme);` and all widgets that are using the injected theme will be updated to the new theme.

To make this even easier, `Themeable` exports a helper function wraps the behavior defined above and returns the context, with a parameter for the `theme` and an optional `registry` for the injector to be defined. If a `registry` is not provided then the global `registry` is used.

```ts
// Uses global registry
const context = registerThemeInjector(myTheme);

// Setting the theme
context.set(myNewTheme);

// Uses the user defined registry
const context = registryThemeInjector(myTheme, myRegistry);
```

##### Overriding Theme Classes

As we are using `css-modules` to scope widget css classes, the generated class names cannot be used to target specific nodes and apply custom styling to them. Instead you must use the `extraClasses` property to pass your generated classes to the widget. This will only effect one instance of a widget and will be applied on top of, rather than instead of, theme classes.

```css
/* tabPaneExtras.css */
.tabs {
	font-weight: bold;
}
```

```ts
import * as myExtras from './extras/myExtras.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will still have baseTheme red tabs,
		// but will have font-weight: bold; applied also
		return w(TabPanel, { extraClasses: myExtras });
	}
}
```

##### Applying Fixed Classes

The `this.classes` function returns a chained `fixed` function that can be used to set non-themeable classes on a node. This allows a widget author to apply classes to a widget that cannot be overridden.

``` ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		const { root, tab } = baseClasses;
		return
			v(`ul`, { classes: this.classes(root) }, [
				v('li', { classes: this.classes().fixed(tab) }, [ 'tab1' ])
				// ...
			]);
	}
}
```

In the above example, the `root` class is still themeable, but the `tab` class is applied using `.fixed()` so it will not be themeable. The classes passed to `.fixed()` can be any string, and unlike the `.classes()` parameters, `fixed()` css classes do not need to originate from `baseClasses`.

#### Internationalization (i18n)

Widgets can be internationalized by mixing in `@dojo/widget-core/mixins/I18n`.
[Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned.
The widget will be invalidated once the locale-specific messages have been loaded.

Each widget can have its own locale by passing a property - `properties.locale`.
If no locale is set, then the default locale, as set by [`@dojo/i18n`](https://github.com/dojo/i18n), is assumed.

```ts
class I18nWidget extends I18nMixin(WidgetBase)<I18nWidgetProperties> {
	render: function () {
		// Load the "greetings" messages for the current locale. If the locale-specific
		// messages have not been loaded yet, then the default messages are returned,
		// and the widget will be invalidated once the locale-specific messages have
		// loaded.
		const messages = this.localizeBundle(greetingsBundle);

		return v('div', { title: messages.hello }, [
			w(Label, {
				// Passing a message string to a child widget.
				label: messages.purchaseItems
			}),
			w(Button, {
				// Passing a formatted message string to a child widget.
				label: messages.format('itemCount', { count: 2 })
			})
		]);
	}
}
```

#### Web Components

Widgets can be turned into [Custom Elements](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) with
minimal extra effort.

Just create a `CustomElementDescriptor` factory and use the `@dojo/cli` build tooling to do the rest of the work,

```ts
import { CustomElementDescriptor } from '@dojo/widget-core/customElements';
import MyWidget from './path/to/MyWidget';

export default function createCustomElement(): CustomElementDescriptor {
	return {
		tagName: 'my-widget',
		widgetConstructor: MyWidget,
	   	attributes: [
		   	{
			   	attributeName: 'label'
		   	}
	   	],
	   	events: [
		   	{
			   	propertyName: 'onChange',
			   	name: 'change'
		   	}
	   	]
   };
};
```

By convention, this file should be named `createMyWidgetElement.ts`.

To build your custom element, use [@dojo/cli](https://github.com/dojo/cli),

```bash
$ dojo build --element=/path/to/createMyWidget.ts
```

This will generate the following files:

* `dist/my-widget/my-widget.html` - HTML import file that includes all widget dependencies. This is the only file you need to import into your HTML page to use your widget.
* `dist/my-widget/my-widget.js` - A compiled version of your widget.
* `dist/my-widget/my-widget.css` - The CSS for your widget
* `dist/my-widget/widget-core.js` - A shared base widget library. Keeping this separate means that you can include HTML imports for multiple Dojo widgets and the applicartion environment will not re-request this shared file for each widget.

Using your widget would be a simple matter of importing the HTML import:

```html
<!DOCTYPE html>
<html>
	<head>
		<!-- this will include all JS and CSS used by your widget -->
		<link rel="import" href="/path/to/my-widget.html" />
	</head>
	<body>
		<!-- this will actually create your widget -->
		<my-widget></my-widget>
	</body>
</html>
```

##### Tag Name

Your widget will be registered with the browser using the provided tag name. The tag name **must** have a `-` in it.

##### Widget Constructor

A widget class that you want wrapped as a custom element.

##### Attributes

You can explicitly map widget properties to DOM node attributes with the `attributes` array.

```ts
{
    attributes: [
        {
            attributeName: 'label'
        },
        {
            attributeName: 'placeholder',
            propertyName: 'placeHolder'
        },
        {
            attributeName: 'delete-on-focus',
            propertyName: 'deleteOnFocus',
            value: value => Boolean(value || 0)
        }
    ]
}
```

* `attributeName` - the attribute that will set on the DOM element, e.g. `<text-widget label="test" />`.
* `propertyName` - the property on the widget to set; if not set, it defaults to the `attributeName`.
* `value` - specify a transformation function on the attribute value. This function should return the value that
will be set on the widget's property.

Adding an attribute to the element will also automatically add a corresponding property to the element.

```ts
// as an attribute
textWidget.setAttribute('label', 'First Name');

// as a property
textWidget.label = 'First Name';
```

##### Properties

You can map DOM element properties to widget properties,

```ts
{
    properties: [
        {
            propertyName: 'placeholder',
            widgetPropertyName: 'placeHolder'
        }
    ]
}

// ...

textWidget.placeholder = 'Enter first name';
```

* `propertyName` - name of the property on the DOM element
* `widgetPropertyName` - name of the property on the widget; if unspecified, `propertyName` is used instead
* `getValue` - if specified, will be called with the widget's property value as an argument. The returned value is returned as the DOM element property value.
* `setValue` - if specified, is called with the DOM elements property value. The returned value is used for the widget property's value.

##### Events

Some widgets have function properties, like events, that need to be exposed to your element. You can use the
`events` array to map widget properties to DOM events.

```ts
{
    events: [
        {
            propertyName: 'onChange',
            eventName: 'change'
        }
    ]
}
```

This will add a property to `onChange` that will emit the `change` custom event. You can listen like any other
DOM event,

```ts
textWidget.addEventListener('change', function (event) {
    // do something
});
```

##### Initialization

Custom logic can be performed after properties/attributes have been defined but before the projector is created. This
allows you full control over your widget, allowing you to add custom properties, event handlers, work with child nodes, etc.
The initialization function is run from the context of the HTML element.

```ts
{
    initialization(properties) {
        const footer = this.getElementsByTagName('footer');
        if (footer) {
            properties.footer = footer;
        }

        const header = this.getElementsByTagName('header');
        if (header) {
            properties.header = header;
        }
    }
}
```

It should be noted that children nodes are removed from the DOM when widget instantiation occurs, and added as children
to the widget instance.

#### Meta

Widget meta is used to access additional information about the widget, usually information only available through the rendered DOM element - for example, the dimensions of an HTML node. You can access and respond to meta data during a widget's render operation.

```typescript
class TestWidget extends WidgetBase<WidgetProperties> {
    render() {
        const dimensions = this.meta(Dimensions).get('root');

        return v('div', {
            key: 'root',
            innerHTML: `Width: ${dimensions.width}`
        });
    }
}
```

If an HTML node is required to calculate the meta information, a sensible default will be returned and your widget will be automatically re-rendered to provide more accurate information.

###### Dimensions

The `Dimensions` meta provides size/position information about a node.

```
const dimensions = this.meta(Dimensions).get('root');
```

In this simple snippet, `dimensions` would be an object containing `offset`, `position`, `scroll`, and `size` objects.

The following fields are provided:

| Property         | Source                                |
| -----------------| ------------------------------------- |
| `position.bottom`| `node.getBoundingClientRect().bottom` |
| `position.left`  | `node.getBoundingClientRect().left`   |
| `position.right` | `node.getBoundingClientRect().right`  |
| `position.top`   | `node.getBoundingClientRect().top`    |
| `size.width`     | `node.getBoundingClientRect().width`  |
| `size.height`    | `node.getBoundingClientRect().height` |
| `scroll.left`    | `node.scrollLeft`                     |
| `scroll.top`     | `node.scrollTop`                      |
| `scroll.height`  | `node.scrollHeight`                   |
| `scroll.width`   | `node.scrollWidth`                    |
| `offset.left`    | `node.offsetLeft`                     |
| `offset.top`     | `node.offsetTop`                      |
| `offset.width`   | `node.offsetWidth`                    |
| `offset.height`  | `node.offsetHeight`                   |

If the node has not yet been rendered, all values will contain `0`. If you need more information about whether or not the node has been rendered you can use the `has` method:

```
const hasRootBeenRendered = this.meta(Dimensions).has('root');
```

##### Implementing Custom Meta

You can create your own meta if you need access to DOM nodes.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

class HtmlMeta extends MetaBase {
    get(key: string): string {
        this.requireNode(key);
        const node = this.nodes.get(key);
        return node ? node.innerHTML : '';
    }
}
```

And you can use it like:

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
    // ...
    render() {
        // run your meta
        const html = this.meta(HtmlMeta).get('comment');

        return v('div', { key: 'root', innerHTML: html });
    }
    // ...
}
```

Meta classes are provided with a few hooks into the widget, passed to the constructor:

* `nodes` - A map of `key` strings to DOM elements. Only `v` nodes rendered with `key` properties are stored.
* `requireNode` - A method that accept a `key` string to inform the widget it needs a rendered DOM element corresponding to that key. If one is available, it will be returned immediately. If not, the widget will be re-rendered and if the node does not exist on the next render, an error will be thrown.
* `invalidate` - A method that will invalidate the widget.

Extending the base class found in `meta/Base` will automatically add these hooks to the class instance as well as providing a `has` method:

* `has(key: string)` - A method that returns `true` if the DOM element with the passed key exists in the rendered DOM.

Meta classes that require extra options should accept them in their methods.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

interface IsTallMetaOptions {
    minHeight: number;
}

class IsTallMeta extends MetaBase {
    isTall(key: string, { minHeight }: IsTallMetaOptions = { minHeight: 300 }): boolean {
        this.requireNode(key);
        const node = this.nodes.get(key);
        if (node) {
            return node.offsetHeight >= minHeight;
        }
        return false;
    }
}
```

#### DomWrapper

`DomWrapper` is used to wrap DOM that is created _outside_ of the virtual DOM system.  This is the main mechanism to integrate _foreign_ components or widgets into the virtual DOM system.

The `DomWrapper` generates a class/constructor function that is then used as a widget class in the virtual DOM.  `DomWrapper` takes up to two arguments.  The first argument is the DOM node that it is wrapping.  The second is an optional set of options.

The currently supported options:

|Name|Description|
|-|-|
|`onAttached`|A callback that is called when the wrapped DOM is flowed into the virtual DOM|

As an example, we want to integrate a 3rd party library where we need to pass the component factory a _root_ element and then flow that into our virtual DOM.  In this situation we don't want to create the component until the widget is being flowed into the DOM, so `onAttached` is used to perform the creation of the component:

```ts
import { w } from '@dojo/widget-core/d';
import DomWrapper from '@dojo/widget-core/util/DomWrapper';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import createComponent from 'third/party/library/createComponent';

export default class WrappedComponent extends WidgetBase {
    private _component: any;
    private _onAttach = () => {
        this._component = createComponent(this._root);
    }
    private _root: HTMLDivElement;
    private _WrappedDom: DomWrapper;

    constructor() {
        super();
        const root = this._root = document.createElement('div');
        this._WrappedDom = DomWrapper(root, { onAttached: this._onAttached });
    }

    public render() {
        return w(this._WrappedDom, { key: 'wrapped' });
    }
}
```

The properties which can be set on `DomWrapper` are the combination of the `WidgetBaseProperties` and the `VirtualDomProperties`, which means effectively you can use any of the properties passed to a `v()` node and they will be applied to the wrapped DOM node.  For example the following would set the classes on the wrapped DOM node:

```ts
const div = document.createElement('div');
const WrappedDiv = DomWrapper(div);
const wnode = w(WrappedDiv, {
    classes: {
        'foo': true
    }
});
```

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. The widget's *`__render__`*, *`__setProperties__`*, *`__setChildren__`* functions should **never** be called or overridden
2. Except for projectors, you should **never** need to deal directly with widget instances
3. Hyperscript should **always** be written using the @dojo/widget-core `v` helper function
4. **Never** set state outside of a widget instance
5. **Never** update `properties` within a widget instance

### API

[API Documentation](http://dojo.io/api/widget-core/v2.0.0-alpha.28/)

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project, run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by Istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing Information

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
