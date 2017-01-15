# @dojo/widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidgets.svg)](https://badge.fury.io/js/%40dojo%2Fwidgets)

Provides Dojo2 core widget and mixin functionality for creating custom widgets. For Dojo2 widgets please see [@dojo/widgets](https://github.com/dojo/widgets).

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Key Principles](#key-principles)
    - [Overview](#overview)
    	- [Introducing `v` & `w`](#v--w)
    	- [Widget Registry](#widget-registry)
    	- [Properties Lifecycle](#properties-lifecycle)
    	- [Event Handling](#event-handling)
    	- [Internationalization](#internationalization)
    	- [Projector](#projector)
    - [Authoring Examples](#authoring-examples)
    	- [Sample Label Widget](sample-label-widget)
    	- [Sample List Widget](sample-list-widget)
    - [API](#api)
    	- [src/interfaces.d.ts](#srcinterfacesdts)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use @dojo/widgets install the package along with the required peer dependencies.

```shell
npm install @dojo/widgets

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/compose
npm install @dojo/i18n
npm install maquette
```

Use the [@dojo/cli](https://github.com/dojo/cli) to create a complete Dojo skeleton application with the [@dojo/cli-create-app](https://github.com/dojo/cli-create-app) command.

## Features

@dojo/widgets are based on a virtual DOM implementation called [Maquette](http://maquettejs.org/) as well as some base classes
provided in [@dojo/compose](https://github.com/dojo/compose).

The smallest `@dojo/widgets` example looks like this:

```ts
const projector = createProjector();
projector.setChildren(v('h1', [ 'Hello, Dojo!' ]));
projector.append();
```

It renders a `h1` element saying "Hello, Dojo!" on the page.

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:
 
1. the widget *`__render__`* function should **never** be overridden
2. except for projectors you should **never** need to deal directory with widget instances.
3. hyperscript should **always** be written using the @dojo/widgets `v` helper function.
4. `state` should **never** be set outside of the widget instance.
5. should **never** update `properties` within a widget instance.

### Overview

Dojo2 widgets is designed using key reactive architecture concepts. These include unidirectional data flow, inversion of control and property passing.

<!-- needs more details-->

#### Introducing `v` & `w`

`v` & `w` are exported from `d.ts` and used to express widget structures within Dojo 2. This structure constructed of `DNode`s (`DNode` is the intersection type of `HNode` and `WNode`).

```ts
import { v, w } from '@dojo/widgets/d';
```

The argument and return types are available from `@dojo/widgets/interfaces` as follows:

```ts
import { DNode, HNode, WNode } from '@dojo/widgets/interfaces';
```

##### `v`

`v` is an abstraction of Hyperscript that allows dojo 2 to manage caching and lazy creation.

Creates an element with the specified `tag`

```ts
v(tag: string): HNode[];
```

where `tag` is in the form: element.className(s)#id, e.g.

h2
h2.foo
h2.foo.bar
h2.foo.bar#baz
h2#baz

`classNames` should be delimited by a period (`.`). **Please note**, both the `classes` and `id` portions of the `tag` are optional.

The results of the invocations above are:

```
h2                  (<h2></h2>)
h2.foo              (<h2 class="foo"></h2>)
h2.foo.bar          (<h2 class="foo bar"></h2>)
h2.foo.bar#baz      (<h2 class="foo bar" id="baz"></h2>)
h2#baz              (<h2 id="baz"></h2>)
```

Renders an element with the `tag` and `children`.

```ts
v(tag: string, children: (DNode | null)[]): HNode[];
```

Renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VNodeProperties, children?: (DNode | null)[]): HNode[];
```

##### `w`

`w` is an abstraction layer for @dojo/widgets. That enables lazy widget instantiation, instance management and caching.

Creates a @dojo/widget using the `factory` and `properties`.

```ts
w<P extends WidgetProperties>(factory: string | WidgetFactory<Widget<P>, P>, properties: P): WNode[];
```

Creates a @dojo/widget using the `factory`, `properties` and `children`

```ts
w<P extends WidgetProperties>(factory: string | WidgetFactory<Widget<P>, P>, properties: P, children: (DNode | null)[]): WNode[];
```
Example `w` constructs:

```ts
w(createFactory, properties);
w(createFactory, properties, children);

w('my-factory', properties);
w('my-factory', properties, children);
```

#### Widget Registry

The registry provides the ability to define a label against a `WidgetFactory`, a `Promise<WidgetFactory>` or a function that when executed returns a `Promise<WidgetFactory>`.

A global widget registry is exported from the `d.ts` class.

```ts
import { registry } from '@dojo/widgets/d';
import createMyWidget from './createMyWidget';

// registers the widget factory that will be available immediately
registry.define('my-widget-1', createMyWidget);

// registers a promise that is resolving to a widget factory and will be
// available as soon as the promise resolves.
registry.define('my-widget-2', Promise.resolve(createMyWidget));

// registers a function that will be lazily executed the first time the factory
// label is used within a widget render pipeline. The widget will be available
// as soon as the promise is resolved after the initial get.
registry.define('my-widget-3', () => Promise.resolve(createMyWidget));
```

All widgets have access to a locally scoped registry (`this.registry`) created during instantiation. For factory resolution the local registry takes precedence over the global registry.

It's recommended to use the factory registry when defining widgets with [`w`](#w--d) to support lazy factory resolution. 

Example of registering a function that returns a `Promise` that resolves to a `Factory`.

```ts
import load from '@dojo/core/load';

registry.define('my-widget', () => {
	return load(require, './createMyWidget')
		.then(([ createMyWidget ]) => createMyWidget.default);
});
```

#### Properties Lifecycle

// talk about the properties lifecycle.

#### Event Handling

The recommended pattern for event listeners is to declare them on the widget class, referencing the function using `this` most commonly within `getChildrenNodes` or a `nodeAttributes` function.

Event listeners can be internal logic encapsulated within a widget or delegate to a function passed via `properties`. For convenience event listeners handlers are automatically bound to the scope of their widget.

*internally defined handler*

```ts
const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		onClick: function (this: MyWidget): void {
			this.setState(!this.state.selected);
		},
		getChildrenNodes(this: MyWidget): DNode[] {
			const { state: { selected } } = this;
			
			return [
				v('input', { type: 'checkbox', onclick: this.onClick }),
				v('input', { type: 'text', disabled: this.state.selected })
			];
		}
	}
});
```

*Handler passed via properties*

```ts
const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		onClick: function (this: MyWidget): void {
			this.properties.mySpecialFunction();
		}
		...
	}
});
```

*Binding a function passed to child widget*

```ts
import { specialClick } from './mySpecialFunctions';

const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		getChildrenNodes(this: MyWidget): DNode[] {
			const { properties: { specialClick } } = this;
			return [
				w(createChildWidget, { onClick: specialClick.bind(this) })
			]
		}
	}
});
```

#### Theming

// talk about the css and theming support

#### Internationalization

Widgets can be internationalized by mixing in `@dojo/widgets/mixins/createI18nMixin`. [Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`. If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned and the widget will be invalidated once the locale-specific messages have been loaded. Each widget can have its own locale by setting its `state.locale`; if no locale is set, then the default locale as set by [`@dojo/i18n`](https://github.com/dojo/i18n) is assumed.

```ts
const createI18nWidget = createWidgetBase
	.mixin(createI18nMixin)
	.mixin({
		mixin: {
			nodeAttributes: [
				function (attributes: VNodeProperties): VNodeProperties {
					// Load the `greetings` messages for the current locale.
					const messages = this.localizeBundle(greetings);
					return { title: messages.hello };
				}
			],

			getChildrenNodes: function () {
				// Load the "greetings" messages for the current locale. If the locale-specific
				// messages have not been loaded yet, then the default messages are returned,
				// and the widget will be invalidated once the locale-specific messages have
				// loaded.
				const messages = this.localizeBundle(greetingsBundle);

				return [
					d(createLabel, {
						// Passing a message string to a child widget.						label: messages.purchaseItems
					}),
					d(createButton, {
						// Passing a formatted message string to a child widget.
						label: messages.format('itemCount', { count: 2 })
					})
				];
			}
		}
	});

const widget = createI18nWidget({
	// Set the locale for the widget and all of its children. Any child can
	// still set its own locale.
	locale: 'fr'
});
```

#### Projector

To render a widget into the DOM projector traits need to mixed in using the `createProjectorMixin`. It is possible to have many projectors and attach them to elements in the DOM. However widgets with projector traits must not be nested.

Projectors operate in the same way as any widget except need to be instantiated and managed outside of the usual lifecycle. To attach the projector to the DOM call either `.append`, `.merge` or `.replace` depending on the type of attachment required.

 - append  - Creates the widget as a child to the projector's `root` node
 - merge   - Merges the widget with the projector's `root` node
 - replace - Replace the projector's `root` node with the widget

Using the `createProjectorMixin` to turn any widget into a projector:

```ts
import createProjectorMixin from '@dojo/widgets/mixins/createProjectorMixin';
import createMyWidget from './createMyWidget';

const myProjectorWidget = createMyWidget.mixin(createProjectorMixin)();

myProjectorWidget.append().then(() => {
	// appended
});
```
At times it may be required to directly instantiate a dedicated projector using `createProjector` and manually set the children for attaching to the DOM.

```ts
import { DNode } from '@dojo/widgets/interfaces';
import { w } from '@dojo/widgets/d';
import createProjector, { Projector } from '@dojo/widgets/createProjector';

import createButton from './createMyButton';
import createTextInput from './createMyTextInput';

const projector = createProjector();

projector.setChildren([
	w(createMyTextInput, { id: 'textinput' }),
	w(createMyButton, { id: 'button', { label: 'Button' })
]);

projector.append().then(() => {
	console.log('projector is attached');
});
```

### Authoring Examples

#### Sample Label Widget

A simple widget with no children such as a `label` widget can be created like this:

```ts
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetFactory, WidgetProperties } from '@dojo/widgets/interfaces';
import createWidgetBase from '@dojo/widgets/createWidgetBase';

export interface LabelProperties extends WidgetProperties {
    label: string;
}

export type Label = Widget<LabelProperties>

export interface LabelFactory extends WidgetFactory<Label, LabelProperties> {}

const createLabelWidget: LabelFactory = createWidgetBase.mixin({
    mixin: {
        tagName: 'label',
        nodeAttributes: [
            function(this: Label): VNodeProperties {
                return { innerHTML: this.properties.label };
            }
        ]
    }
});

export default createLabelWidget;
```

#### Sample List Widget

To create structured widgets override the `getChildrenNodes` function.

```ts
import { DNode, Widget, WidgetFactory, WidgetProperties } from '@dojo/widgets/interfaces';
import createWidgetBase from '@dojo/widgets/createWidgetBase';
import { v } from '@dojo/widgets/d';

export interface ListItem {
    name: string;
}

export interface ListProperties extends WidgetProperties {
    items?: ListItem[];
}

export type List = Widget<ListProperties>;

export interface ListFactory extends WidgetFactory<List, ListProperties> {}

function isEven(value: number) {
    return value % 2 === 0;
}

function listItem(item: ListItem, itemNumber: number): DNode {
    const classes = isEven(itemNumber) ? {} : { 'odd-row': true };
    return v('li', { innerHTML: item.name, classes });
}

const createListWidget: ListFactory = createWidgetBase.mixin({
	mixin: {
		getChildrenNodes: function (this: List): DNode[] {
			const { properties: { items = [] } } = this;
			const listItems = items.map(listItem);

			return [ v('ul', listItems) ];
		}
	}
});

export default createListWidget;
```

### API

#### src/interfaces.d.ts

 - Interfaces
 	- [WidgetMixin](#widgetmixin)
 - Types
 	- [Widget](#widget)

###### WidgetMixin

An interface for the base widget API

```ts
interface WidgetMixin<P extends WidgetProperties> extends PropertyComparison<P> {
	readonly id: string | undefined;
	readonly classes: string[];
	readonly properties: Partial<P>;
	readonly registry: FactoryRegistryInterface;
	readonly children: DNode[];
	tagName: string;
	nodeAttributes: NodeAttributeFunction<Widget<WidgetProperties>>[];
	getNode: NodeFunction;
	getChildrenNodes: ChildNodeFunction;
	getNodeAttributes(): VNodeProperties;
	setProperties(this: Widget<P>, properties: P): void;
	onPropertiesChanged(this: Widget<P>, properties: P, changedPropertyKeys: string[]): void;
	__render__(): VNode | string | null;
	invalidate(): void;
}
```

**Member Summary**

---

| Name | Type | Readonly | Description |
|---|---|---|---|
|id|`string | undefined`| true |The id of the widget|
|classes|`string[]`| true |Base classes for the widgets top node |
|properties| `Partial<P>` | true | The public properties API for widgets|
|registry| `FactoryRegistryInterface` | true |Locally scoped widget registry|
|children| `DNode[]` | true |Array of children|
|tagName| `string` | false |The tag name of the top node|
|nodeAttributes| `NodeAttributeFunction<Widget<P>[]`| false|Array of functions that get reduced to provide properties for the top level node|

**Method Summary**

---

| Method | Description |
|---|---|
|`getNode(this: Widget<P>): DNode`|Return the single top level node of a widget|
|`getChildrenNodes(this: Widget<P>): DNode[]`|Return the children nodes of a widgets|
|`getNodeAttributes(this: Widget<P>): VNodeProperties`|Call all registered `nodeAttribute` functions reducing the results|
|`setProperties(this: Widget<P>, properties: P): void`|Runs the property lifecycle and sets the properties against the instance|
|`setChildren(this: Widget<P>, children: DNode | DNode[]): void`|Set a single child or array of children on the widget| 
|`onPropertiesChanged(this: Widget<P>, properties: P, changedPropertyKeys: string[]): void`|Called if properties have been considered different during the property lifecycle| 
|`__render__(this: Widget<P>): VNode | string | null`|Renders the widget|
|`invalidate(this: Widget<P>): void`|Invalidates the widget so it will be included in the next render|

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing Information

© 2016 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
