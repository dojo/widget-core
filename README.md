# @dojo/widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidgets.svg)](https://badge.fury.io/js/%40dojo%2Fwidgets)

This repo provides users with the ability to write their own Dojo 2 widgets.

We also provide a suite of pre-built widgets to use in your applications: [(@dojo/widgets)](https://github.com/dojo/widgets).

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Overview](#overview)
    - [`v` & `w`](#v--w)
        - [`v`](#v)
        - [`w`](#w)
    - [Writing custom widgets](#writing-custom-widgets)
        - [Public API](#public-api)
        - [The 'properties' lifecycle](#the-properties-lifecycle)
            - [Custom property diff control](#custom-property-diff-control)
            - [The `properties:changed` event](#the-propertieschanged-event)
        - [Projector](#projector)
        - [Event Handling](#event-handling)
        - [Widget Registry](#widget-registry)
        - [Theming](#theming)
        - [Internationalization](#internationalization-i18n)
    - [Key Principles](#key-principles)
    - [Examples](#examples)
        - [Example Label Widget](#example-label-widget)
        - [Example List Widget](#example-list-widget)
    - [API](#api)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use @dojo/widgets, install the package along with its required peer dependencies:

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

You can also use the [dojo cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application.

## Features

Constructing your own widgets (Custom widgets) is simple and straightforward.
The smallest `@dojo/widgets` example looks like this:

```ts
const createMyWidget = createWidgetBase.extend({
	tagName: 'h1',
	nodeAttributes: [
		function() {
			return { innerHTML: 'Hello, Dojo!' };
		}
	]
});

createMyWidget.mixin(createProjectorMixin)().append();
```

This code renders a `h1` element onto the page, that says "Hello, Dojo!".

### Overview

All widgets in Dojo 2 are designed using key reactive architecture concepts.
These concepts include unidirectional data flow, inversion of control and property passing.

Dojo 2's widget suite is built using the [@dojo/compose](https://github.com/dojo/compose) composition library.
This library provides the ability to construct and manipulate traits and mixins.

We also make use of a VirtualDOM (VDOM) in Dojo 2.
In order to interact with our VDOM, you need to pass it [HyperScript](https://github.com/dominictarr/hyperscript).
In Dojo 2 we provide 2 functions that make interacting with the VDOM, easy and intuitive: `v` and `w`.

### `v` & `w`

These functions express structures that will be passed to the VDOM.

`v` creates nodes that represent DOM tags, e.g. `div`, `header` etc.
This function allows Dojo 2 to manage lazy hyperscript creation and element caching.
  
 `w` creates Dojo 2 widgets or custom widget.
This function provides support for lazy widget instantiation, instance management and caching.

The `v` & `w` functions are available from the `@dojo/widgets/d` package.

```ts
import { v, w } from '@dojo/widgets/d';
```

The argument and return types for `v` and `w` are available from `@dojo/widgets/interfaces`, and are as follows:

```ts
import { DNode, HNode, WNode } from '@dojo/widgets/interfaces';
```

#### `v`

The following code creates an element with the specified `tag`

```ts
v(tag: string): HNode[];
```

where `tag` is in the form: element.className(s)#id, e.g.

```
h2                  (produces <h2></h2>)
h2.foo              (produces <h2 class="foo"></h2>)
h2.foo.bar          (produces <h2 class="foo bar"></h2>)
h2.foo.bar#baz      (produces <h2 class="foo bar" id="baz"></h2>)
h2#baz              (produces <h2 id="baz"></h2>)
```

`classNames` should be delimited by a period (`.`).

**Please note**, both the `classes` and `id` portions of the `tag` are optional.


The following code renders an element with the `tag` and `children`.

```ts
v(tag: string, children: (DNode | null)[]): HNode[];
```

The following code renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VNodeProperties, children?: (DNode | null)[]): HNode[];
```

As well as interacting with the VDOM by passing it HyperScript, you can also pass it Dojo 2 Widgets or Custom Widgets using the `w` function.

#### `w`

The following code creates a widget using the `factory` and `properties`.

```ts
w<P extends WidgetProperties>(factory: string | WidgetFactory<Widget<P>, P>, properties: P): WNode[];
```

The following code creates a widget using the `factory`, `properties` and `children`

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

The example above that uses a string for the `factory`, is taking advantage of our [widget registry](#widget-registry) functionality.
The widget registry allows you to lazy instantiate widgets.

### Writing Custom Widgets

The `createWidgetBase` class provides the functionality needed to create Custom Widgets.
This functionality includes caching and widget lifecycle management.

The `createWidgetBase` class is available from the `@dojo/widgets/createWidgetBase` package.

```ts
import { createWidgetBase } from '@dojo/widgets/createWidgetBase';
```

**All** widgets should extend from this class.

#### Public API

|Function|Description|Default Behaviour|
|---|---|---|
|getNode|Returns the top level node of a widget|Returns a `HNode` with the widgets `tagName`, the result of `this.getNodeAttributes` and `this.children`|
|getChildrenNodes|Returns the child node structure of a widget|Returns the widgets children `DNode` array|
|nodeAttributes|An array of functions that return VNodeProperties to be applied to the top level node|Returns attributes for `data-widget-id`, `classes` and `styles` using the widget's specified `properties` (`id`, `classes`, `styles`) at the time of render|
|diffProperties|Diffs the current properties against the previous properties and returns an object with the changed keys and new properties|Performs a shallow comparison previous and current properties, copies the properties using `Object.assign` and returns the resulting `PropertiesChangeRecord`.|

#### The 'properties' lifecycle

The widget's properties lifecycle occurs before its render lifecycle.

Properties passed to the `w` function represent the public API for a widget.

The properties lifecycle starts when properties are passed to the widget.
The properties lifecycle is performed in the widgets `setProperties` function.
This function uses the widget instance's `diffProperties` function to determine whether any of the properties have changed since the last render cycle.
By default `diffProperties` provides a shallow comparison of the previous properties and new properties. 

The `diffProperties` function is also responsible for creating a copy (the default implementation uses`Object.assign({}, newProperties)` of all changed properties.
The depth of the returned diff is equal to the depth used during the equality comparison.

<!-- add example of 'depth' -->

**Note** If a widget's properties contain complex data structures that you need to diff, then the `diffProperties` function will need to be overridden.

##### Custom property diff control

Included in `createWidgetBase` is functionality to support targeting a specific property with a custom comparison function.
This is done by adding a function to the widget class with `diffProperty` prefixed to the property name.
 
e.g. for a property `foo` you would add a function called `diffPropertyFoo`
(the casing of the comparison function name is unimportant).

```ts

const createMyWidget = createWidgetBase.mixin({
	mixin: {
		diffPropertyFoo(this: MyWidget, previousProperty: MyComplexObject, newProperty: MyComplexObject) {
			// can perfom complex comparison logic here between the two property values
			// or even use externally stored state to assist the comparison.
		}
	}
});
```

If a property has a custom diff function then that property is excluded from those passed to the `diffProperties` function.

##### The 'properties:changed' event 

When `diffProperties` has completed, the results are used to update the properties on the widget instance.
If any properties were changed, then the `properties:changed` event is emitted.

*Attaching*

```ts
this.on('properties:changed', (evt: PropertiesChangedEvent<MyWidget, MyProperties>) {
	// do something
});
```

*Example event payload*

```ts
{
	type: 'properties:changed',
	target: this,
	properties: { foo: 'bar', baz: 'qux' },
	changedKeyValues: [ 'foo' ]
}
```

Finally once all the attached events have been processed, the properties lifecycle is complete and the finalized widget properties are available during the render cycle functions.

<!-- render lifecycle goes here -->

#### Projector

Projector is a term used to describe a widget that will be attached to a DOM element, also known as a root widget.
Any widget can be converted into a projector simply by mixing in the `createProjectorMixin` mixin.

```ts
createMyWidget.mixin(createProjectorMixin)
```

Projectors behave in the same way as any other widget **except** that they need to be manually instantiated and managed outside of the standard widget lifecycle. 

There are 3 ways that a projector widget can be added to the DOM - `.append`, `.merge` or `.replace`, depending on the type of attachment required.

 - append  - Creates the widget as a child to the projector's `root` node
 - merge   - Merges the widget with the projector's `root` node
 - replace - Replace the projector's `root` node with the widget

```ts
const createWidgetProjector = createMyWidget.mixin(createProjectorMixin);

createWidgetProjector().append(() => {
	// appended
});
```

#### Event Handling

The recommended pattern for custom event handlers is to declare them on the widget class and reference the function using `this`.
Event handlers are most commonly called from the `getChildrenNodes` function or a `nodeAttributes` function.

Event handlers can be internal logic encapsulated within a widget or delegate to a function passed into the widget via `properties`.
For convenience event handlers are automatically bound to the scope of their enclosing widget.

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

It is recommended to use the factory registry when defining widgets with [`w`](#w--d), to support lazy factory resolution. 

Example of registering a function that returns a `Promise` that resolves to a `Factory`.

```ts
import load from '@dojo/core/load';

registry.define('my-widget', () => {
	return load(require, './createMyWidget')
		.then(([ createMyWidget ]) => createMyWidget.default);
});
```

#### Theming

// To be completed

#### Internationalization (i18n)

Widgets can be internationalized by mixing in `@dojo/widgets/mixins/createI18nMixin`.
[Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`. 

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned.
The widget will be invalidated once the locale-specific messages have been loaded.

Each widget can have its own locale by setting its `state.locale`. 
If no locale is set, then the default locale, as set by [`@dojo/i18n`](https://github.com/dojo/i18n), is assumed.

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
					w(createLabel, {
						// Passing a message string to a child widget.						label: messages.purchaseItems
					}),
					w(createButton, {
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

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:
 
1. the widget *`__render__`* function should **never** be overridden
2. except for projectors you should **never** need to deal directly with widget instances.
3. hyperscript should **always** be written using the @dojo/widgets `v` helper function.
4. **never** set state outside of a widget instance.
5. **never** update `properties` within a widget instance.

### Examples

#### Example Label Widget

A simple widget with no children, such as a `label` widget, can be created like this:

```ts
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetFactory, WidgetProperties } from '@dojo/widgets/interfaces';
import createWidgetBase from '@dojo/widgets/createWidgetBase';

export interface LabelProperties extends WidgetProperties {
    content: string;
}

export type Label = Widget<LabelProperties>

export interface LabelFactory extends WidgetFactory<Label, LabelProperties> {}

const createLabelWidget: LabelFactory = createWidgetBase.mixin({
    mixin: {
        tagName: 'label',
        nodeAttributes: [
            function(this: Label): VNodeProperties {
                return { innerHTML: this.properties.content };
            }
        ]
    }
});

export default createLabelWidget;
```

#### Example List Widget

To create structured widgets, override the `getChildrenNodes` function:

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

// add link to generated API docs.

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

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
