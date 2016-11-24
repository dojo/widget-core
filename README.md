# dojo-widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/dojo-widgets.svg)](http://badge.fury.io/js/dojo-widgets)

A core widget library for Dojo 2.

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

For more background on Widgets for Dojo 2, there is a document describing the [widgeting system](https://github.com/dojo/meta/blob/master/documents/Widget-System.md).

- [Usage](#usage)
- [Features](#features)
    - [Base Widget](#base-widget)
    - [Extending Base Widget](#extending-base-widget)
    - [Projector](#projector)
    - [Dojo Widget Components](#dojo-widget-components)
- [How do I contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing information](#licensing-information)

## Usage

To use dojo-widgets in a project install the package along with the required peer dependencies.

```shell
npm install dojo-widgets

# peer dependencies
npm install dojo-has
npm install dojo-shim
npm install dojo-core
npm install dojo-compose
npm install dojo-store
```

and then import the required modules into the project such as, for more details see [features](#features) below.

```ts
import createButton from 'dojo-widgets/components/createButton';
```

Alternatively use the [dojo cli](https://github.com/dojo/cli-create-app) to create a complete Dojo 2 skeleton application.

## Features

Dojo 2 Widgets are based on a virtual DOM implementation named [Maquette](http://maquettejs.org/) as well as some foundational classes
provided in [dojo-compose](https://github.com/dojo/compose).

The examples below are provided in TypeScript syntax. The package does work under JavaScript, but for clarity, the examples will only include one syntax.

### Base Widget

A class `createWidgetBase` provides all the base Dojo 2 widget functionality, caching and widget lifecycle management, that can be used directly or extended to create custom widgets.

```ts
const myBasicWidget = createWidgetBase();
```

Create the following DOM element:

```html
<div></div>
```

To customise the widget an optional `options` argument can be provided with the following interface.

**Type**: `WidgetOptions<WidgetState>` - All properties are optional.

|Property|Type|Description|
|---|---|---|
|id|string|identifier for the widget|
|state|WidgetState|Initial state of the widget|
|stateFrom|StoreObservablePatchable|Observable that provides state for the widget|
|listeners|EventedListenersMap|Map of listeners for to attach to the widget|
|tagName|string|Override the widgets	 tagname|
|getChildrenNodes|Function|Function that returns an array of children DNodes|
|nodeAttributes|Function[]|An array of functions that return VNodeProperties to be applied to the VNode|

By default the base widget class applies an `id`, `classes` and `styles` from the widgets specified `state` (either by direct state injection or via an observable store).

```ts
const myBasicWidget = createWidgetBase({
	state: {
		id: 'my-widget',
		classes: [ 'class-a', 'class-b' ],
		styles: [ 'width:20px' ]
	}
});
```

Create the following DOM element:

```html
<div data-widget-id="my-widget" class="class-a class-b" styles="width:20px"></div>
```

Alternatively state can be derived directly from an observable store provided as the `stateFrom`, to create the same DOM element.

```ts
const widgetStore = createObservableStore({
	data: [
		{ 
			id: 'my-widget', 
			classes: [ 'class-a', 'class-b' ], 
			styles: [ 'width:20px' ]
		}
	]
});

const myBasicWidget = createWidgetBase({
	id: 'my-widget',
	stateFrom: widgetStore
});
```

Children can be nested within a widget by providing a `getChildrenNodes` function to the options.

```ts
const widgetStore = createObservableStore({
	data: [
		{ 
			id: 'my-list-widget', 
			items: [
				{ id: '1', name: 'name-1' },
				{ id: '2', name: 'name-2' },
				{ id: '3', name: 'name-3' },
				{ id: '4', name: 'name-4' }
			]
		}
	]
});

const getChildrenNodes = function(this: Widget<WidgetState>) {
	const listItems = this.state.items.map((item) => {
		return d('li', { innnerHTML: item.name });
	});
	
	return listItems;
};

const myBasicListWidget = createWidgetBase({
	id: 'my-list-widget',
	stateFrom: widgetStore,
	tagName: 'ul',
	getChildrenNodes
});
```
Creates the following DOM structure

```html
<ul data-widget-id="my-list-widget">
	<li>name-1</li>
	<li>name-2</li>
	<li>name-3</li>
	<li>name-4</li>
</ul>
``` 
### `d`

`d` is a function that is used within Dojo 2 to express widget hierarchical struture using both Dojo 2 widget factories or hyperscript, it is imported via

```ts
import d from 'dojo-widgets/util/d';
```

and the param and return interfaces are available in the `dojo-interfaces` package.

```ts
import { DNode, HNode, WNode } from 'dojo-interfaces/widgetBases';
```

The API for using hyperscript provides multiple signitures for convienience, **tagName** is the only mandatory argument, **options** is defaulted to `{}` when not provided and **children** is completetely optional

```ts
d(tagName: string): HNode[];
```
```ts
d(tagName: string, children: (DNode | VNode | null)[]): HNode[];
```
```ts
d(tagName: string, options: VNodeProperties, children?: (DNode | VNode | null)[]): HNode[];
```
The is a single API when using Dojo 2 widget factories, with **options** being defaulted to `{}` if not supplied.

```ts
d(factory: ComposeFactory<W, O>, options: O): WNode[];
```

### Extending Base Widget

`createWidgetBase` can be extended to create custom reusable widgets. A simple widget with no children such as a `label` widget can be created like this:

```ts
import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';

interface LabelState extends WidgetState {
	label?: string;
}

interface LabelOptions extends WidgetOptions<LabelState> { }

type Label = Widget<LabelState>;

interface LabelFactory extends ComposeFactory<Label, LabelOptions> { }

const createLabelWidget: LabelFactory = createWidgetBase.mixin(
	mixin: {
		tagName: 'label',
		nodeAttributes: [
			function(this: Label): VNodeProperties {
				return { innerHTML: this.state.label };
			}
		]
	}
});

export default createLabelWidget;
```
With its usages as follows:

```ts
import createLabelWidget from './widgets/createLabelWidget';

const label = createLabelWidget({ state: { label: 'I am a label' }});
```

More complex composite widgets can be created by overriding the `getChildrenNodes` function that returns an array of `DNodes` similar to providing the function via the `WidgetOptions`

```ts
import { ComposeFactory } from 'dojo-compose/compose';
import { DNode, Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';
import d from 'dojo-widgets/util/d';

interface ListItem {
	name: string;
}

interface ListState extends WidgetState {
	items?: ListItem[];
};

interface ListOptions extends WidgetOptions<ListState> { };

type List = Widget<ListState>;

interface ListFactory extends ComposeFactory<List, ListOptions> { };

function isEven(value: number) {
	return value % 2 === 0;
}

function listItem(item: ListItem, itemNumber: number): DNode {
	const classes = isEven(itemNumber) ? {} : { 'odd-row': true };
	return d('li', { innerHTML: item.name, classes });
}

const createListWidget: ListFactory = createWidgetBase.mixin({
	mixin: {
		getChildrenNodes: function (this: List): DNode[] {
			const listItems = this.state.items.map(listItem);

			return [ d('ul', {}, listItems) ];
		}
	}
});

export default createListWidget;
```

### Projector

In order to render widgets they need to be appended to a `projector`. It is possible to create multiple projectors and attach them to `Elements` in the `DOM`, however `projectors` must not be nested.

More to follow.

### Dojo Widget Components

A selection of core reusable widgets are provided for convience that are fully accessible and internationalizable.

To be completed, list core components here.

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Intallation

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

## Licensing information

© 2016 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.