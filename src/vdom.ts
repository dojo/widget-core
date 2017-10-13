import { DNode, HNode, VirtualDomProperties } from './interfaces';
import { isWNode, isHNode, HNODE } from './d';

/**
 * A projector is used to create the real DOM from the the virtual DOM and to keep it up-to-date afterwards.
 *
 * You can call [[append]], [[merge]], [[insertBefore]] and [[replace]] to add the virtual DOM to the real DOM.
 * The `renderMaquetteFunction` callbacks will be called to create the real DOM immediately.
 * Afterwards, the `renderMaquetteFunction` callbacks will be called again to update the DOM on the next animation-frame after:
 *
 *  - The Projector's [[scheduleRender]] function  was called
 *  - An event handler (like `onclick`) on a rendered [[VNode]] was called.
 *
 * The projector stops when [[stop]] is called or when an error is thrown during rendering.
 * It is possible to use `window.onerror` to handle these errors.
 * Instances of [[Projector]] can be created using [[createProjector]].
 */
export interface Projector {
	/**
	 * Appends a new child node to the DOM using the result from the provided `renderMaquetteFunction`.
	 * The `renderMaquetteFunction` will be invoked again to update the DOM when needed.
	 * @param parentNode - The parent node for the new child node.
	 * @param renderMaquetteFunction - Function with zero arguments that returns a [[VNode]] tree.
	 */
	append(parentNode: Element, renderMaquetteFunction: () => DNode): void;
	/**
	 * Inserts a new DOM node using the result from the provided `renderMaquetteFunction`.
	 * The `renderMaquetteFunction` will be invoked again to update the DOM when needed.
	 * @param beforeNode - The node that the DOM Node is inserted before.
	 * @param renderMaquetteFunction - Function with zero arguments that returns a [[VNode]] tree.
	 */
	insertBefore(beforeNode: Element, renderMaquetteFunction: () => DNode): void;
	/**
	 * Merges a new DOM node using the result from the provided `renderMaquetteFunction` with an existing DOM Node.
	 * This means that the virtual DOM and real DOM have one overlapping element.
	 * Therefore the selector for the root [[VNode]] will be ignored, but its properties and children will be applied to the Element provided
	 * The `renderMaquetteFunction` will be invoked again to update the DOM when needed.
	 * @param domNode - The existing element to adopt as the root of the new virtual DOM. Existing attributes and child nodes are preserved.
	 * @param renderMaquetteFunction - Function with zero arguments that returns a [[VNode]] tree.
	 */
	merge(domNode: Element, renderMaquetteFunction: () => DNode): void;
	/**
	 * Replaces an existing DOM node with the result from the provided `renderMaquetteFunction`.
	 * The `renderMaquetteFunction` will be invoked again to update the DOM when needed.
	 * @param domNode - The DOM node to replace.
	 * @param renderMaquetteFunction - Function with zero arguments that returns a [[VNode]] tree.
	 */
	replace(domNode: Element, renderMaquetteFunction: () => DNode): void;
	/**
	 * Resumes the projector. Use this method to resume rendering after [[stop]] was called or an error occurred during rendering.
	 */
	resume(): void;
	/**
	 * Instructs the projector to re-render to the DOM at the next animation-frame using the registered `renderMaquette` functions.
	 * This method is automatically called for you when event-handlers that are registered in the [[VNode]]s are invoked.
	 *
	 * You need to call this method when timeouts expire, when AJAX responses arrive or other asynchronous actions happen.
	 */
	scheduleRender(): void;
	/**
	 * Synchronously re-renders to the DOM. You should normally call the `scheduleRender()` function to keep the
	 * user interface more performant. There is however one good reason to call renderNow(),
	 * when you want to put the focus into a newly created element in iOS.
	 * This is only allowed when triggered by a user-event, not during requestAnimationFrame.
	 */
	renderNow(): void;
	/**
	 * Stops running the `renderMaquetteFunction` to update the DOM. The `renderMaquetteFunction` must have been
	 * registered using [[append]], [[merge]], [[insertBefore]] or [[replace]].
	 *
	 * @returns The [[Projection]] which was created using this `renderMaquetteFunction`.
	 * The [[Projection]] contains a reference to the DOM Node that was rendered.
	 */
	detach(renderMaquetteFunction: () => DNode): Projection;
	/**
	 * Stops the projector. This means that the registered `renderMaquette` functions will not be called anymore.
	 *
	 * Note that calling [[stop]] is not mandatory. A projector is a passive object that will get garbage collected
	 * as usual if it is no longer in scope.
	 */
	stop(): void;
}

/**
 * These functions are called when [[VirtualDomProperties.enterAnimation]] and [[VirtualDomProperties.exitAnimation]] are provided as strings.
 * See [[ProjectionOptions.transitions]].
 */
export interface TransitionStrategy {
	/**
	 * Function that is called when a [[VNode]] with an `enterAnimation` string is added to an already existing parent [[VNode]].
	 *
	 * @param element         Element that was just added to the DOM.
	 * @param properties      The properties object that was supplied to the [[h]] method
	 * @param enterAnimation  The string that was passed to [[VirtualDomProperties.enterAnimation]].
	 */
	enter(element: Element, properties: VirtualDomProperties, enterAnimation: string): void;
	/**
	 * Function that is called when a [[VNode]] with an `exitAnimation` string is removed from a existing parent [[VNode]] that remains.
	 *
	 * @param element         Element that ought to be removed from the DOM.
	 * @param properties      The properties object that was supplied to the [[h]] method that rendered this [[VNode]] the previous time.
	 * @param exitAnimation   The string that was passed to [[VirtualDomProperties.exitAnimation]].
	 * @param removeElement   Function that removes the element from the DOM.
	 *                        This argument is provided purely for convenience.
	 *                        You may use this function to remove the element when the animation is done.
	 */
	exit(element: Element, properties: VirtualDomProperties, exitAnimation: string, removeElement: () => void): void;
}

/**
 * Options that may be passed when creating the [[Projector]]
 */
export interface ProjectorOptions {
	/**
	 * A transition strategy to invoke when enterAnimation and exitAnimation properties are provided as strings.
	 * The module `cssTransitions` in the provided `css-transitions.js` file provides such a strategy.
	 * A transition strategy is not needed when enterAnimation and exitAnimation properties are provided as functions.
	 */
	readonly transitions?: TransitionStrategy;
	/**
	 * May be used to add vendor prefixes when applying inline styles when needed.
	 * This function is called when [[styles]] is used.
	 * This function should execute `domNode.style[styleName] = value` or do something smarter.
	 *
	 * @param domNode   The DOM Node that needs to receive the style
	 * @param styleName The name of the style that should be applied, for example `transform`.
	 * @param value     The value of this style, for example `rotate(45deg)`.
	 */
	styleApplyer?(domNode: HTMLElement, styleName: string, value: string): void;
}

/**
 * Options that influence how the DOM is rendered and updated.
 */
export interface ProjectionOptions extends ProjectorOptions {
	/**
	 * Only for internal use. Used for rendering SVG Nodes.
	 */
	readonly namespace?: string;
	/**
	 * May be used to intercept registration of event-handlers.
	 *
	 * Used by the [[Projector]] to wrap eventHandler-calls to call [[scheduleRender]] as well.
	 *
	 * @param propertyName             The name of the property to be assigned, for example onclick
	 * @param eventHandler             The function that was registered on the [[VNode]]
	 * @param domNode                  The real DOM element
	 * @param properties               The whole set of properties that was put on the VNode
	 * @returns                        The function that is to be placed on the DOM node as the event handler, instead of `eventHandler`.
	 */
	eventHandlerInterceptor?: (propertyName: string, eventHandler: Function, domNode: Node, properties: VirtualDomProperties) => Function | undefined;
}

/**
 * Represents a [[VNode]] tree that has been rendered to a real DOM tree.
 */
export interface Projection {
	/**
	 * The DOM node that is used as the root of this [[Projection]].
	 */
	readonly domNode: Element;
	/**
	 * Updates the real DOM to match the new virtual DOM tree.
	 * @param updatedDNode The updated virtual DOM tree. Note: The selector for the root of the [[VNode]] tree may not change.
	 */
	update(updatedDNode: DNode): void;
}

const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

// Utilities

const emptyArray: DNode[] = [];

let extend = <T>(base: T, overrides: any): T => {
	let result = {} as any;
	Object.keys(base).forEach(function(key) {
		result[key] = (base as any)[key];
	});
	if (overrides) {
		Object.keys(overrides).forEach((key) => {
			result[key] = overrides[key];
		});
	}
	return result;
};

// Hyperscript helper functions

let same = (dnode1: DNode, dnode2: DNode) => {
	if (isHNode(dnode1) && isHNode(dnode2)) {
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties && dnode2.properties) {
			if (dnode1.properties.key !== dnode2.properties.key) {
				return false;
			}
			return dnode1.properties.bind === dnode2.properties.bind;
		}
		return !dnode1.properties && !dnode2.properties;
	}
	else if (isWNode(dnode1) && isWNode(dnode2)) {
		if (dnode1.properties.key === dnode2.properties.key) {
			return true;
		}
		else if (dnode1.widgetConstructor === dnode2.widgetConstructor) {
			return true;
		}
	}
	return false;
};

let toTextHNode = (data: any): HNode => {
	return {
		tag: '',
		properties: {},
		children: emptyArray,
		text: data.toString(),
		domNode: undefined,
		type: HNODE
	};
};

let appendChildren = function(parentSelector: string, insertions: any[], main: DNode[]) {
	for (let i = 0, length = insertions.length; i < length; i++) {
		let item = insertions[i];
		if (Array.isArray(item)) {
			appendChildren(parentSelector, item, main);
		} else {
			if (item !== null && item !== undefined) {
				if (!item.hasOwnProperty('tag')) {
					item = toTextHNode(item);
				}
				main.push(item);
			}
		}
	}
};

// Render helper functions

let missingTransition = function() {
	throw new Error('Provide a transitions object to the projectionOptions to do animations');
};

const DEFAULT_PROJECTION_OPTIONS: ProjectionOptions = {
	namespace: undefined,
	eventHandlerInterceptor: undefined,
	styleApplyer: function(domNode: HTMLElement, styleName: string, value: string) {
		// Provides a hook to add vendor prefixes for browsers that still need it.
		(domNode.style as any)[styleName] = value;
	},
	transitions: {
		enter: missingTransition,
		exit: missingTransition
	}
};

let applyDefaultProjectionOptions = (projectorOptions?: ProjectionOptions) => {
	return extend(DEFAULT_PROJECTION_OPTIONS, projectorOptions);
};

let checkStyleValue = (styleValue: Object) => {
	if (typeof styleValue !== 'string') {
		throw new Error('Style values must be strings');
	}
};

let setProperties = function(domNode: Node, properties: VirtualDomProperties | undefined, projectionOptions: ProjectionOptions) {
	if (!properties) {
		return;
	}
	let eventHandlerInterceptor = projectionOptions.eventHandlerInterceptor;
	let propNames = Object.keys(properties);
	let propCount = propNames.length;
	for (let i = 0; i < propCount; i++) {
		let propName = propNames[i];
		/* tslint:disable:no-var-keyword: edge case */
		let propValue = properties[propName];
		/* tslint:enable:no-var-keyword */
		if (propName === 'className') {
			throw new Error('Property `className` is not supported, use `class`.');
		} else if (propName === 'class') {
			(propValue as string).split(/\s+/).forEach(token => (domNode as Element).classList.add(token));
		} else if (propName === 'classes') {
			// object with string keys and boolean values
			let classNames = Object.keys(propValue);
			let classNameCount = classNames.length;
			for (let j = 0; j < classNameCount; j++) {
				let className = classNames[j];
				if (propValue[className]) {
					(domNode as Element).classList.add(className);
				}
			}
		} else if (propName === 'styles') {
			// object with string keys and string (!) values
			let styleNames = Object.keys(propValue);
			let styleCount = styleNames.length;
			for (let j = 0; j < styleCount; j++) {
				let styleName = styleNames[j];
				let styleValue = propValue[styleName];
				if (styleValue) {
					checkStyleValue(styleValue);
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, styleValue);
				}
			}
		} else if (propName !== 'key' && propValue !== null && propValue !== undefined) {
			let type = typeof propValue;
			if (type === 'function') {
				if (propName.lastIndexOf('on', 0) === 0) { // lastIndexOf(,0)===0 -> startsWith
					if (eventHandlerInterceptor) {
						propValue = eventHandlerInterceptor(propName, propValue, domNode, properties); // intercept eventhandlers
					}
					if (propName === 'oninput') {
						(function() {
							// record the evt.target.value, because IE and Edge sometimes do a requestAnimationFrame between changing value and running oninput
							let oldPropValue = propValue;
							propValue = function(this: HTMLElement, evt: Event) {
								oldPropValue.apply(this, [evt]);
								(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value; // may be HTMLTextAreaElement as well
							};
						} ());
					}
					(domNode as any)[propName] = propValue;
				}
			} else if (type === 'string' && propName !== 'value' && propName !== 'innerHTML') {
				if (projectionOptions.namespace === NAMESPACE_SVG && propName === 'href') {
					(domNode as Element).setAttributeNS(NAMESPACE_XLINK, propName, propValue);
				} else {
					(domNode as Element).setAttribute(propName, propValue);
				}
			} else {
				(domNode as any)[propName] = propValue;
			}
		}
	}
};

let updateProperties = function(domNode: Node, previousProperties: VirtualDomProperties | undefined, properties: VirtualDomProperties | undefined, projectionOptions: ProjectionOptions) {
	if (!properties) {
		return;
	}
	let propertiesUpdated = false;
	let propNames = Object.keys(properties);
	let propCount = propNames.length;
	for (let i = 0; i < propCount; i++) {
		let propName = propNames[i];
		// assuming that properties will be nullified instead of missing is by design
		let propValue = properties[propName];
		let previousValue = previousProperties![propName];
		if (propName === 'class') {
			if (previousValue !== propValue) {
				throw new Error('`class` property may not be updated. Use the `classes` property for conditional css classes.');
			}
		} else if (propName === 'classes') {
			let classList = (domNode as Element).classList;
			let classNames = Object.keys(propValue);
			let classNameCount = classNames.length;
			for (let j = 0; j < classNameCount; j++) {
				let className = classNames[j];
				let on = !!propValue[className];
				let previousOn = !!previousValue[className];
				if (on === previousOn) {
					continue;
				}
				propertiesUpdated = true;
				if (on) {
					classList.add(className);
				} else {
					classList.remove(className);
				}
			}
		} else if (propName === 'styles') {
			let styleNames = Object.keys(propValue);
			let styleCount = styleNames.length;
			for (let j = 0; j < styleCount; j++) {
				let styleName = styleNames[j];
				let newStyleValue = propValue[styleName];
				let oldStyleValue = previousValue[styleName];
				if (newStyleValue === oldStyleValue) {
					continue;
				}
				propertiesUpdated = true;
				if (newStyleValue) {
					checkStyleValue(newStyleValue);
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, newStyleValue);
				} else {
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, '');
				}
			}
		} else {
			if (!propValue && typeof previousValue === 'string') {
				propValue = '';
			}
			if (propName === 'value') { // value can be manipulated by the user directly and using event.preventDefault() is not an option
				let domValue = (domNode as any)[propName];
				if ( // The edge cases are described in the tests
					domValue !== propValue // The 'value' in the DOM tree !== newValue
					&& ((domNode as any)['oninput-value']
						? domValue === (domNode as any)['oninput-value'] // If the last reported value to 'oninput' does not match domValue, do nothing and wait for oninput
						: propValue !== previousValue // Only update the value if the vdom changed
					)
				) {
					(domNode as any)[propName] = propValue; // Reset the value, even if the virtual DOM did not change
					(domNode as any)['oninput-value'] = undefined;
				} // else do not update the domNode, otherwise the cursor position would be changed
				if (propValue !== previousValue) {
					propertiesUpdated = true;
				}
			} else if (propValue !== previousValue) {
				let type = typeof propValue;
				if (type === 'function') {
					throw new Error('Functions may not be updated on subsequent renders (property: ' + propName +
						'). Hint: declare event handler functions outside the render() function.');
				}
				if (type === 'string' && propName !== 'innerHTML') {
					if (projectionOptions.namespace === NAMESPACE_SVG && propName === 'href') {
						(domNode as Element).setAttributeNS(NAMESPACE_XLINK, propName, propValue);
					} else if (propName === 'role' && propValue === '') {
						(domNode as any).removeAttribute(propName);
					} else {
						(domNode as Element).setAttribute(propName, propValue);
					}
				} else {
					if ((domNode as any)[propName] !== propValue) { // Comparison is here for side-effects in Edge with scrollLeft and scrollTop
						(domNode as any)[propName] = propValue;
					}
				}
				propertiesUpdated = true;
			}
		}
	}
	return propertiesUpdated;
};

let findIndexOfChild = function(children: DNode[], sameAs: DNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i], sameAs)) {
			return i;
		}
	}
	return -1;
};

let nodeAdded = function(dnode: DNode, transitions: TransitionStrategy) {
	if (isHNode(dnode) && dnode.properties) {
		let enterAnimation = dnode.properties.enterAnimation;
		if (enterAnimation) {
			if (typeof enterAnimation === 'function') {
				enterAnimation(dnode.domNode as Element, dnode.properties);
			} else {
				transitions.enter(dnode.domNode as Element, dnode.properties, enterAnimation as string);
			}
		}
	}
};

let nodeToRemove = function(dnode: DNode, transitions: TransitionStrategy) {

	if (isWNode(dnode)) {
		dnode.instance && dnode.instance.destroy();
		const rendered = dnode.rendered || emptyArray ;
		for (let i = 0; i < rendered.length; i++) {
			const child = rendered[i];
			if (isHNode(child)) {
				child.domNode!.parentNode!.removeChild(child.domNode!);
			}
		}

	}
	else if (isHNode(dnode)) {
		let domNode: Node = dnode.domNode!;
		/*if (dnode.properties) {
			let exitAnimation = dnode.properties.exitAnimation;
			if (exitAnimation) {
				(domNode as HTMLElement).style.pointerEvents = 'none';
				let removeDomNode = function() {
					if (domNode.parentNode) {
						domNode.parentNode.removeChild(domNode);
					}
				};
				if (typeof exitAnimation === 'function') {
					exitAnimation(domNode as Element, removeDomNode, dnode.properties);
					return;
				} else {
					transitions.exit(dnode.domNode as Element, dnode.properties, exitAnimation as string, removeDomNode);
					return;
				}
			}
		}*/
		if (domNode.parentNode) {
			domNode.parentNode.removeChild(domNode);
		}
	}

};

let checkDistinguishable = function(childNodes: DNode[], indexToCheck: number, parentDNode: DNode, operation: string) {

	let childNode = childNodes[indexToCheck];
	if (isHNode(childNode)) {
		if (childNode.tag === '') {
			return; // Text nodes need not be distinguishable
		}
		let properties = childNode.properties;
		let key = properties ? (properties.key === undefined ? properties.bind : properties.key) : undefined;
		if (!key) { // A key is just assumed to be unique
			for (let i = 0; i < childNodes.length; i++) {
				if (i !== indexToCheck) {
					let node = childNodes[i];
					if (same(node, childNode)) {
						if (operation === 'added') {
							throw new Error('parentDNode.tag' + ' had a ' + childNode.tag + ' child ' +
								'added, but there is now more than one. You must add unique key properties to make them distinguishable.');
						} else {
							throw new Error('parentDNode.tag' + ' had a ' + childNode.tag + ' child ' +
								'removed, but there were more than one. You must add unique key properties to make them distinguishable.');
						}
					}
				}
			}
		}
	}
};

/*let createDom: (dnode: DNode, parentNode: Node, insertBefore: Node | null | undefined, projectionOptions: ProjectionOptions) => void;*/
/*let updateDom: (previous: VNode, vnode: VNode, projectionOptions: ProjectionOptions) => boolean;*/

let updateChildren = function(dnode: DNode, domNode: Node, oldChildren: DNode[] | undefined, newChildren: DNode[] | undefined, projectionOptions: ProjectionOptions) {
	if (oldChildren === newChildren) {
		return false;
	}
	oldChildren = oldChildren || [];
	newChildren = newChildren || [];
	let oldChildrenLength = oldChildren.length;
	let newChildrenLength = newChildren.length;
	let transitions = projectionOptions.transitions!;

	let oldIndex = 0;
	let newIndex = 0;
	let i: number;
	let textUpdated = false;
	while (newIndex < newChildrenLength) {
		let oldChild = (oldIndex < oldChildrenLength) ? oldChildren[oldIndex] : undefined;
		let newChild = newChildren[newIndex];

		// think we should do this in v, h used to loop through children.
		if (typeof newChild === 'string') {
			newChild = toTextHNode(newChild);
			newChildren[newIndex] = newChild;
		}
		if ((newChild === null || newChild === undefined) && newIndex < newChildrenLength)  {
			newIndex++;
			continue;
		}
		if ((oldChild === null || oldChild === undefined) && oldIndex < oldChildrenLength) {
			oldIndex++;
			continue;
		}
		if (oldChild !== undefined && same(oldChild, newChild)) {
			textUpdated = updateDom(oldChild, newChild, projectionOptions, domNode) || textUpdated;
			oldIndex++;
		} else {
			let findOldIndex = findIndexOfChild(oldChildren, newChild, oldIndex + 1);
			if (findOldIndex >= 0) {
				// Remove preceding missing children
				for (i = oldIndex; i < findOldIndex; i++) {
					nodeToRemove(oldChildren[i], transitions);
					checkDistinguishable(oldChildren, i, dnode, 'removed');
				}
				textUpdated = updateDom(oldChildren[findOldIndex], newChild, projectionOptions, domNode) || textUpdated;
				oldIndex = findOldIndex + 1;
			} else {
				let insertBefore: HNode | undefined;
				if (oldIndex < oldChildrenLength) {
					insertBefore = oldChildren[oldIndex] as HNode;
				}

				createDom(newChild, domNode, insertBefore ? insertBefore.domNode : undefined, projectionOptions, isWNode(dnode) ? dnode.instance : undefined);
				nodeAdded(newChild, transitions);
				checkDistinguishable(newChildren, newIndex, dnode, 'added');
			}
		}
		newIndex++;
	}
	if (oldChildrenLength > oldIndex) {
		// Remove child fragments
		for (i = oldIndex; i < oldChildrenLength; i++) {
			nodeToRemove(oldChildren[i], transitions);
			checkDistinguishable(oldChildren, i, dnode, 'removed');
		}
	}
	return textUpdated;
};

let addChildren = function(domNode: Node, children: DNode[] | undefined, projectionOptions: ProjectionOptions, insertBefore?: any) {
	if (!children) {
		return;
	}
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		if (typeof child === 'string') {
			child = toTextHNode(child);
			children[i] = child;
		}
		createDom(child, domNode, insertBefore, projectionOptions, isWNode(child) ? child.instance : null);
	}
};

let initPropertiesAndChildren = function(domNode: Node, dnode: DNode, projectionOptions: ProjectionOptions) {
	if (isWNode(dnode)) {
		addChildren(domNode, dnode.rendered, projectionOptions);
	}
	else if (isHNode(dnode)) {
		addChildren(domNode, dnode.children, projectionOptions); // children before properties, needed for value property of <select>.
		if (dnode.text) {
			domNode.textContent = dnode.text;
		}
		setProperties(domNode, dnode.properties, projectionOptions);
		if (dnode.properties && dnode.properties.afterCreate) {
			dnode.properties.afterCreate.apply(dnode.properties.bind || dnode.properties, [domNode as Element, projectionOptions, dnode.tag, dnode.properties, dnode.children]);
		}
	}
};

const createDom = function(dnode: DNode, parentNode: any, insertBefore: any, projectionOptions: any, parentInstance: any) {
	let domNode: Node | undefined, i: number, c: string, start = 0, type: string, found: string;
	if (isWNode(dnode)) {
		// widget constructor or registry item
		let { widgetConstructor } = dnode as any;
		let instance: any;

		instance = new widgetConstructor();
		parentInstance && parentInstance.own(instance);
		parentInstance && instance.on('invalidate', () => {
			parentInstance.invalidate();
		});
		dnode.instance = instance;
		instance.__setCoreProperties__(dnode.coreProperties);
		instance.__setProperties__(dnode.properties);
		instance.__setChildren__(dnode.children);
		const rendered = instance.__render__();

		dnode.rendered = Array.isArray(rendered) ? rendered : [ rendered ];
		addChildren(parentNode, dnode.rendered, projectionOptions, insertBefore);
		// it's sync so the widget is updated/attached?
	}
	else if (isHNode(dnode)) {
		// I am string/null/undefined/HNode
		let hnodeSelector = dnode.tag;
		let doc = parentNode.ownerDocument;
		if (hnodeSelector === '') {
			domNode = dnode.domNode = doc.createTextNode(dnode.text!);
			if (insertBefore !== undefined) {
				parentNode.insertBefore(domNode, insertBefore);
			} else {
				parentNode.appendChild(domNode);
			}
		} else {
			for (i = 0; i <= hnodeSelector.length; ++i) {
				c = hnodeSelector.charAt(i);
				if (i === hnodeSelector.length || c === '.' || c === '#') {
					type = hnodeSelector.charAt(start - 1);
					found = hnodeSelector.slice(start, i);
					if (type === '.') {
						(domNode as HTMLElement).classList.add(found);
					} else if (type === '#') {
						(domNode as Element).id = found;
					} else {
						if (found === 'svg') {
							projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
						}
						if (projectionOptions.namespace !== undefined) {
							domNode = dnode.domNode = doc.createElementNS(projectionOptions.namespace, found);
						} else {
							domNode = dnode.domNode = (dnode.domNode || doc.createElement(found));
							if (found === 'input' && dnode.properties && dnode.properties.type !== undefined) {
								// IE8 and older don't support setting input type after the DOM Node has been added to the document
								(domNode as Element).setAttribute('type', dnode.properties.type);
							}
						}
						if (insertBefore !== undefined) {
							parentNode.insertBefore(domNode, insertBefore);
						} else if (domNode!.parentNode !== parentNode) {
							parentNode.appendChild(domNode);
						}
					}
					start = i + 1;
				}
			}
			initPropertiesAndChildren(domNode!, dnode, projectionOptions);
		}
	}
};

const updateDom = function(previous: any, dnode: DNode, projectionOptions: ProjectorOptions, parentNode: any) {
	if (previous === dnode || !dnode) {
		return false; // By contract, dnode objects may not be modified anymore after passing them to maquette
	}
	if (isWNode(dnode)) {
		previous.instance.__setCoreProperties__(dnode.coreProperties);
		previous.instance.__setProperties__(dnode.properties);
		previous.instance.__setChildren__(dnode.children);
		dnode.instance = previous.instance;
		const rendered = previous.instance.__render__();
		dnode.rendered = Array.isArray(rendered) ? rendered : [ rendered ];

		updateChildren(dnode, parentNode, previous.rendered, dnode.rendered, projectionOptions) || false;
	}
	else if (isHNode(dnode)) {
		let domNode = previous.domNode!;
		let textUpdated = false;
		let updated = false;
		if (dnode.tag === '') {
			if (dnode.text !== previous.text) {
				let newdnode = domNode.ownerDocument.createTextNode(dnode.text!);
				domNode.parentNode!.replaceChild(newdnode, domNode);
				dnode.domNode = newdnode;
				textUpdated = true;
				return textUpdated;
			}
		} else {
			if (dnode.tag.lastIndexOf('svg', 0) === 0) { // lastIndexOf(needle,0)===0 means StartsWith
				projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
			}
			if (previous.text !== dnode.text) {
				updated = true;
				if (dnode.text === undefined) {
					domNode.removeChild(domNode.firstChild!); // the only textnode presumably
				} else {
					domNode.textContent = dnode.text;
				}
			}
			updated = updateChildren(dnode, domNode, previous.children, dnode.children, projectionOptions) || updated;
			updated = updateProperties(domNode, previous.properties, dnode.properties, projectionOptions) || updated;
			if (dnode.properties && dnode.properties.afterUpdate) {
				dnode.properties.afterUpdate.apply(dnode.properties.bind || dnode.properties, [ domNode as Element, projectionOptions, dnode.tag, dnode.properties, dnode.children]);
			}
		}
		if (updated && dnode.properties && dnode.properties.updateAnimation) {
			dnode.properties.updateAnimation(domNode as Element, dnode.properties, previous.properties);
		}
		dnode.domNode = previous.domNode;
		return textUpdated;
	}
};

let createProjection = function(dnode: any, projectionOptions: ProjectionOptions): any {
	return {
		update: function(updatedVnode: HNode) {
			if (dnode.tag !== updatedVnode.tag) {
				throw new Error('The selector for the root VNode may not be changed. (consider using dom.merge and add one extra level to the virtual DOM)');
			}
			updateDom(dnode, updatedVnode, projectionOptions, dnode.domNode);
			dnode = updatedVnode;
		},
		domNode: (dnode as any).domNode as Element
	};
};

/**
 * Contains simple low-level utility functions to manipulate the real DOM.
 */
export let dom = {

	/**
	 * Creates a real DOM tree from `vnode`. The [[Projection]] object returned will contain the resulting DOM Node in
	 * its [[Projection.domNode|domNode]] property.
	 * This is a low-level method. Users will typically use a [[Projector]] instead.
	 * @param vnode - The root of the virtual DOM tree that was created using the [[h]] function. NOTE: [[VNode]]
	 * objects may only be rendered once.
	 * @param projectionOptions - Options to be used to create and update the projection.
	 * @returns The [[Projection]] which also contains the DOM Node that was created.
	 */
	/*create: function(vnode: VNode, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(vnode, document.createElement('div'), undefined, projectionOptions);
		return createProjection(vnode, projectionOptions);
	},*/

	/**
	 * Appends a new child node to the DOM which is generated from a [[VNode]].
	 * This is a low-level method. Users will typically use a [[Projector]] instead.
	 * @param parentNode - The parent node for the new child node.
	 * @param vnode - The root of the virtual DOM tree that was created using the [[h]] function. NOTE: [[VNode]]
	 * objects may only be rendered once.
	 * @param projectionOptions - Options to be used to create and update the [[Projection]].
	 * @returns The [[Projection]] that was created.
	 */
	append: function(parentNode: Element, dnode: DNode, projectionOptions?: ProjectionOptions): Projection {
		debugger;
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(dnode, parentNode, undefined, projectionOptions, null);
		return createProjection(dnode, projectionOptions);
	}

	/**
	 * Inserts a new DOM node which is generated from a [[VNode]].
	 * This is a low-level method. Users wil typically use a [[Projector]] instead.
	 * @param beforeNode - The node that the DOM Node is inserted before.
	 * @param vnode - The root of the virtual DOM tree that was created using the [[h]] function.
	 * NOTE: [[VNode]] objects may only be rendered once.
	 * @param projectionOptions - Options to be used to create and update the projection, see [[createProjector]].
	 * @returns The [[Projection]] that was created.
	 */
	/*insertBefore: function(beforeNode: Element, vnode: VNode, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(vnode, beforeNode.parentNode!, beforeNode, projectionOptions);
		return createProjection(vnode, projectionOptions);
	},*/

	/**
	 * Merges a new DOM node which is generated from a [[VNode]] with an existing DOM Node.
	 * This means that the virtual DOM and the real DOM will have one overlapping element.
	 * Therefore the selector for the root [[VNode]] will be ignored, but its properties and children will be applied to the Element provided.
	 * This is a low-level method. Users wil typically use a [[Projector]] instead.
	 * @param element - The existing element to adopt as the root of the new virtual DOM. Existing attributes and child nodes are preserved.
	 * @param vnode - The root of the virtual DOM tree that was created using the [[h]] function. NOTE: [[VNode]] objects
	 * may only be rendered once.
	 * @param projectionOptions - Options to be used to create and update the projection, see [[createProjector]].
	 * @returns The [[Projection]] that was created.
	 */
	/*merge: function(element: Element, vnode: VNode, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		vnode.domNode = element;
		initPropertiesAndChildren(element, vnode, projectionOptions);
		return createProjection(vnode, projectionOptions);
	},*/

	/**
	 * Replaces an existing DOM node with a node generated from a [[VNode]].
	 * This is a low-level method. Users will typically use a [[Projector]] instead.
	 * @param element - The node for the [[VNode]] to replace.
	 * @param vnode - The root of the virtual DOM tree that was created using the [[h]] function. NOTE: [[VNode]]
	 * objects may only be rendered once.
	 * @param projectionOptions - Options to be used to create and update the [[Projection]].
	 * @returns The [[Projection]] that was created.
	 */
	/*replace: function(element: Element, vnode: VNode, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(vnode, element.parentNode!, element, projectionOptions);
		element.parentNode!.removeChild(element);
		return createProjection(vnode, projectionOptions);
	}*/
};

/**
 * A CalculationCache object remembers the previous outcome of a calculation along with the inputs.
 * On subsequent calls the previous outcome is returned if the inputs are identical.
 * This object can be used to bypass both rendering and diffing of a virtual DOM subtree.
 * Instances of CalculationCache can be created using [[createCache]].
 *
 * @param <Result> The type of the value that is cached.
 */
export interface CalculationCache<Result> {
	/**
	 * Manually invalidates the cached outcome.
	 */
	invalidate(): void;
	/**
	 * If the inputs array matches the inputs array from the previous invocation, this method returns the result of the previous invocation.
	 * Otherwise, the calculation function is invoked and its result is cached and returned.
	 * Objects in the inputs array are compared using ===.
	 * @param inputs - Array of objects that are to be compared using === with the inputs from the previous invocation.
	 * These objects are assumed to be immutable primitive values.
	 * @param calculation - Function that takes zero arguments and returns an object (A [[VNode]] presumably) that can be cached.
	 */
	result(inputs: Object[], calculation: () => Result): Result;
}

/**
 * Creates a [[CalculationCache]] object, useful for caching [[VNode]] trees.
 * In practice, caching of [[VNode]] trees is not needed, because achieving 60 frames per second is almost never a problem.
 * For more information, see [[CalculationCache]].
 *
 * @param <Result> The type of the value that is cached.
 */
export let createCache = <Result>(): CalculationCache<Result> => {
	let cachedInputs: Object[] | undefined;
	let cachedOutcome: Result | undefined;
	return {

		invalidate: function() {
			cachedOutcome = undefined;
			cachedInputs = undefined;
		},

		result: function(inputs: Object[], calculation: () => Result) {
			if (cachedInputs) {
				for (let i = 0; i < inputs.length; i++) {
					if (cachedInputs[i] !== inputs[i]) {
						cachedOutcome = undefined;
					}
				}
			}
			if (cachedOutcome === undefined) {
				cachedOutcome = calculation();
				cachedInputs = inputs;
			}
			return cachedOutcome;
		}
	};
};

/**
 * Keeps an array of result objects synchronized with an array of source objects.
 * See {@link https://maquettejs.org/docs/arrays.html|Working with arrays}.
 *
 * Mapping provides a [[map]] function that updates its [[results]].
 * The [[map]] function can be called multiple times and the results will get created, removed and updated accordingly.
 * A Mapping can be used to keep an array of components (objects with a `renderMaquette` method) synchronized with an array of data.
 * Instances of Mapping can be created using [[createMapping]].
 *
 * @param <Source>   The type of source elements. Usually the data type.
 * @param <Target>   The type of target elements. Usually the component type.
 */
export interface Mapping<Source, Target> {
	/**
	 * The array of results. These results will be synchronized with the latest array of sources that were provided using [[map]].
	 */
	results: Array<Target>;
	/**
	 * Maps a new array of sources and updates [[results]].
	 *
	 * @param newSources   The new array of sources.
	 */
	map(newSources: Array<Source>): void;
}

/**
 * Creates a {@link Mapping} instance that keeps an array of result objects synchronized with an array of source objects.
 * See {@link https://maquettejs.org/docs/arrays.html|Working with arrays}.
 *
 * @param <Source>       The type of source items. A database-record for instance.
 * @param <Target>       The type of target items. A [[Component]] for instance.
 * @param getSourceKey   `function(source)` that must return a key to identify each source object. The result must either be a string or a number.
 * @param createResult   `function(source, index)` that must create a new result object from a given source. This function is identical
 *                       to the `callback` argument in `Array.map(callback)`.
 * @param updateResult   `function(source, target, index)` that updates a result to an updated source.
 */
export let createMapping = <Source, Target>(
	getSourceKey: (source: Source) => (string | number),
	createResult: (source: Source, index: number) => Target,
	updateResult: (source: Source, target: Target, index: number) => void): Mapping<Source, Target> => {
		let keys = [] as Object[];
		let results = [] as Target[];

		return {
			results: results,
			map: function(newSources: Source[]) {
				let newKeys = newSources.map(getSourceKey);
				let oldTargets = results.slice();
				let oldIndex = 0;
				for (let i = 0; i < newSources.length; i++) {
					let source = newSources[i];
					let sourceKey = newKeys[i];
					if (sourceKey === keys[oldIndex]) {
						results[i] = oldTargets[oldIndex];
						updateResult(source, oldTargets[oldIndex], i);
						oldIndex++;
					} else {
						let found = false;
						for (let j = 1; j < keys.length + 1; j++) {
							let searchIndex = (oldIndex + j) % keys.length;
							if (keys[searchIndex] === sourceKey) {
								results[i] = oldTargets[searchIndex];
								updateResult(newSources[i], oldTargets[searchIndex], i);
								oldIndex = searchIndex + 1;
								found = true;
								break;
							}
						}
						if (!found) {
							results[i] = createResult(source, i);
						}
					}
				}
				results.length = newSources.length;
				keys = newKeys;
			}
		};
	};
