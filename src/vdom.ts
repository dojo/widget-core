import { Evented } from '@dojo/core/Evented';
import { DNode, HNode, VirtualDomProperties } from './interfaces';
import { isWNode, isHNode } from './d';

export interface TransitionStrategy {
	enter(element: Element, properties: VirtualDomProperties, enterAnimation: string): void;
	exit(element: Element, properties: VirtualDomProperties, exitAnimation: string, removeElement: () => void): void;
}

export interface ProjectorOptions {
	readonly transitions?: TransitionStrategy;
	styleApplyer?(domNode: HTMLElement, styleName: string, value: string): void;
	nodeEvent?: Evented;
}

export interface ProjectionOptions extends ProjectorOptions {
	readonly namespace?: string;
	eventHandlerInterceptor?: (propertyName: string, eventHandler: Function, domNode: Node, properties: VirtualDomProperties) => Function | undefined;
}

export interface Projection {
	readonly domNode: Element;
	update(updatedDNode: DNode): void;
}

const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

const emptyArray: DNode[] = [];

function extend<T>(base: T, overrides: any): T {
	const result = {} as any;
	Object.keys(base).forEach(function(key) {
		result[key] = (base as any)[key];
	});
	if (overrides) {
		Object.keys(overrides).forEach((key) => {
			result[key] = overrides[key];
		});
	}
	return result;
}

function same(dnode1: DNode, dnode2: DNode) {
	if (isHNode(dnode1) && isHNode(dnode2)) {
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties && dnode2.properties) {
			if (dnode1.properties.key !== dnode2.properties.key) {
				return false;
			}
		}
		return true;
	}
	else if (isWNode(dnode1) && isWNode(dnode2)) {
		if (dnode1.widgetConstructor !== dnode2.widgetConstructor) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	}
	return false;
}

function appendChildren(parentSelector: string, insertions: DNode[], main: DNode[]) {
	for (let i = 0, length = insertions.length; i < length; i++) {
		const item = insertions[i];
		if (Array.isArray(item)) {
			appendChildren(parentSelector, item, main);
		}
		else {
			if (item !== null && item !== undefined) {
				main.push(item);
			}
		}
	}
}

const missingTransition = function() {
	throw new Error('Provide a transitions object to the projectionOptions to do animations');
};

const DEFAULT_PROJECTION_OPTIONS: ProjectionOptions = {
	namespace: undefined,
	eventHandlerInterceptor: undefined,
	styleApplyer: function(domNode: HTMLElement, styleName: string, value: string) {
		(domNode.style as any)[styleName] = value;
	},
	transitions: {
		enter: missingTransition,
		exit: missingTransition
	}
};

function applyDefaultProjectionOptions(projectorOptions?: ProjectionOptions) {
	return extend(DEFAULT_PROJECTION_OPTIONS, projectorOptions);
}

function checkStyleValue(styleValue: Object) {
	if (typeof styleValue !== 'string') {
		throw new Error('Style values must be strings');
	}
}

function setProperties(domNode: Node, properties: VirtualDomProperties | undefined, projectionOptions: ProjectionOptions) {
	if (!properties) {
		return;
	}
	const eventHandlerInterceptor = projectionOptions.eventHandlerInterceptor;
	const propNames = Object.keys(properties);
	const propCount = propNames.length;
	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = properties[propName];
		if (propName === 'className') {
			throw new Error('Property `className` is not supported, use `class`.');
		}
		else if (propName === 'class') {
			(propValue as string).split(/\s+/).forEach(token => (domNode as Element).classList.add(token));
		}
		else if (propName === 'classes') {
			const classNames = Object.keys(propValue);
			const classNameCount = classNames.length;
			for (let j = 0; j < classNameCount; j++) {
				const className = classNames[j];
				if (propValue[className]) {
					(domNode as Element).classList.add(className);
				}
			}
		}
		else if (propName === 'styles') {
			const styleNames = Object.keys(propValue);
			const styleCount = styleNames.length;
			for (let j = 0; j < styleCount; j++) {
				const styleName = styleNames[j];
				const styleValue = propValue[styleName];
				if (styleValue) {
					checkStyleValue(styleValue);
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, styleValue);
				}
			}
		}
		else if (propName !== 'key' && propValue !== null && propValue !== undefined) {
			const type = typeof propValue;
			if (type === 'function') {
				if (propName.lastIndexOf('on', 0) === 0) {
					if (eventHandlerInterceptor) {
						propValue = eventHandlerInterceptor(propName, propValue, domNode, properties);
					}
					if (propName === 'oninput') {
						(function() {
							// record the evt.target.value, because IE and Edge sometimes do a requestAnimationFrame between changing value and running oninput
							const oldPropValue = propValue;
							propValue = function(this: HTMLElement, evt: Event) {
								oldPropValue.apply(this, [evt]);
								(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value; // may be HTMLTextAreaElement as well
							};
						} ());
					}
					(domNode as any)[propName] = propValue;
				}
			}
			else if (type === 'string' && propName !== 'value' && propName !== 'innerHTML') {
				if (projectionOptions.namespace === NAMESPACE_SVG && propName === 'href') {
					(domNode as Element).setAttributeNS(NAMESPACE_XLINK, propName, propValue);
				}
				else {
					(domNode as Element).setAttribute(propName, propValue);
				}
			}
			else {
				(domNode as any)[propName] = propValue;
			}
		}
	}
}

function updateProperties(domNode: Node, previousProperties: VirtualDomProperties | undefined, properties: VirtualDomProperties | undefined, projectionOptions: ProjectionOptions) {
	if (!properties) {
		return;
	}
	let propertiesUpdated = false;
	const propNames = Object.keys(properties);
	const propCount = propNames.length;
	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = properties[propName];
		const previousValue = previousProperties![propName];
		if (propName === 'class') {
			if (previousValue !== propValue) {
				throw new Error('`class` property may not be updated. Use the `classes` property for conditional css classes.');
			}
		}
		else if (propName === 'classes') {
			const classList = (domNode as Element).classList;
			const classNames = Object.keys(propValue);
			const classNameCount = classNames.length;
			for (let j = 0; j < classNameCount; j++) {
				const className = classNames[j];
				const on = !!propValue[className];
				const previousOn = !!previousValue[className];
				if (on === previousOn) {
					continue;
				}
				propertiesUpdated = true;
				if (on) {
					classList.add(className);
				}
				else {
					classList.remove(className);
				}
			}
		}
		else if (propName === 'styles') {
			const styleNames = Object.keys(propValue);
			const styleCount = styleNames.length;
			for (let j = 0; j < styleCount; j++) {
				const styleName = styleNames[j];
				const newStyleValue = propValue[styleName];
				const oldStyleValue = previousValue[styleName];
				if (newStyleValue === oldStyleValue) {
					continue;
				}
				propertiesUpdated = true;
				if (newStyleValue) {
					checkStyleValue(newStyleValue);
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, newStyleValue);
				}
				else {
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, '');
				}
			}
		}
		else {
			if (!propValue && typeof previousValue === 'string') {
				propValue = '';
			}
			if (propName === 'value') {
				const domValue = (domNode as any)[propName];
				if (
					domValue !== propValue
					&& ((domNode as any)['oninput-value']
						? domValue === (domNode as any)['oninput-value']
						: propValue !== previousValue
					)
				) {
					(domNode as any)[propName] = propValue;
					(domNode as any)['oninput-value'] = undefined;
				}
				if (propValue !== previousValue) {
					propertiesUpdated = true;
				}
			}
			else if (propValue !== previousValue) {
				const type = typeof propValue;
				if (type === 'function') {
					throw new Error('Functions may not be updated on subsequent renders (property: ' + propName +
						'). Hint: declare event handler functions outside the render() function.');
				}
				if (type === 'string' && propName !== 'innerHTML') {
					if (projectionOptions.namespace === NAMESPACE_SVG && propName === 'href') {
						(domNode as Element).setAttributeNS(NAMESPACE_XLINK, propName, propValue);
					}
					else if (propName === 'role' && propValue === '') {
						(domNode as any).removeAttribute(propName);
					}
					else {
						(domNode as Element).setAttribute(propName, propValue);
					}
				}
				else {
					if ((domNode as any)[propName] !== propValue) { // Comparison is here for side-effects in Edge with scrollLeft and scrollTop
						(domNode as any)[propName] = propValue;
					}
				}
				propertiesUpdated = true;
			}
		}
	}
	return propertiesUpdated;
}

function findIndexOfChild(children: DNode[], sameAs: DNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i], sameAs)) {
			return i;
		}
	}
	return -1;
}

function nodeAdded(dnode: DNode, transitions: TransitionStrategy) {
	if (isHNode(dnode) && dnode.properties) {
		const enterAnimation = dnode.properties.enterAnimation;
		if (enterAnimation) {
			if (typeof enterAnimation === 'function') {
				enterAnimation(dnode.domNode as Element, dnode.properties);
			}
			else {
				transitions.enter(dnode.domNode as Element, dnode.properties, enterAnimation as string);
			}
		}
	}
}

function nodeToRemove(dnode: DNode, transitions: TransitionStrategy) {
	if (isWNode(dnode)) {
		dnode.instance && dnode.instance.destroy();
		const rendered = dnode.rendered || emptyArray ;
		for (let i = 0; i < rendered.length; i++) {
			const child = rendered[i];
			if (isHNode(child)) {
				child.domNode!.parentNode!.removeChild(child.domNode!);
			}
			else {
				nodeToRemove(child, transitions);
			}
		}
	}
	else {
		const domNode: Node = dnode.domNode!;
		if (dnode.properties) {
			const exitAnimation = dnode.properties.exitAnimation;
			if (exitAnimation) {
				(domNode as HTMLElement).style.pointerEvents = 'none';
				const removeDomNode = function() {
					if (domNode.parentNode) {
						domNode.parentNode.removeChild(domNode);
					}
				};
				if (typeof exitAnimation === 'function') {
					exitAnimation(domNode as Element, removeDomNode, dnode.properties);
					return;
				}
				else {
					transitions.exit(dnode.domNode as Element, dnode.properties, exitAnimation as string, removeDomNode);
					return;
				}
			}
		}
		if (domNode.parentNode) {
			domNode.parentNode.removeChild(domNode);
		}
	}
}

function checkDistinguishable(childNodes: DNode[], indexToCheck: number, parentDNode: DNode, operation: string) {
	const childNode = childNodes[indexToCheck];
	if (isHNode(childNode) && childNode.tag === '') {
		return; // Text nodes need not be distinguishable
	}
	const properties = childNode.properties;
	const key = properties && properties.key;

	if (!key) {
		for (let i = 0; i < childNodes.length; i++) {
			if (i !== indexToCheck) {
				const node = childNodes[i];
				if (same(node, childNode)) {
					if (isWNode(childNode)) {
						console.warn('key those widgets');
					}
					else {
						if (operation === 'added') {
							throw new Error((parentDNode as HNode).tag + ' had a ' + childNode.tag + ' child ' +
								'added, but there is now more than one. You must add unique key properties to make them distinguishable.');
						}
						else {
							throw new Error((parentDNode as HNode).tag + ' had a ' + childNode.tag + ' child ' +
								'removed, but there were more than one. You must add unique key properties to make them distinguishable.');
						}
					}
				}
			}
		}
	}
}

function updateChildren(dnode: DNode, domNode: Node, oldChildren: DNode[] | undefined, newChildren: DNode[] | undefined, projectionOptions: ProjectionOptions) {
	if (oldChildren === newChildren) {
		return false;
	}
	oldChildren = oldChildren || emptyArray;
	newChildren = newChildren || emptyArray;
	const oldChildrenLength = oldChildren.length;
	const newChildrenLength = newChildren.length;
	const transitions = projectionOptions.transitions!;

	let oldIndex = 0;
	let newIndex = 0;
	let i: number;
	let textUpdated = false;
	while (newIndex < newChildrenLength) {
		const oldChild = (oldIndex < oldChildrenLength) ? oldChildren[oldIndex] : undefined;
		const newChild = newChildren[newIndex];

		if (oldChild !== undefined && same(oldChild, newChild)) {
			textUpdated = updateDom(oldChild, newChild, projectionOptions, domNode) || textUpdated;
			oldIndex++;
		}
		else {
			const findOldIndex = findIndexOfChild(oldChildren, newChild, oldIndex + 1);
			if (findOldIndex >= 0) {
				for (i = oldIndex; i < findOldIndex; i++) {
					nodeToRemove(oldChildren[i], transitions);
					checkDistinguishable(oldChildren, i, dnode, 'removed');
				}
				textUpdated = updateDom(oldChildren[findOldIndex], newChild, projectionOptions, domNode) || textUpdated;
				oldIndex = findOldIndex + 1;
			}
			else {
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
}

function addChildren(domNode: Node, children: DNode[] | undefined, projectionOptions: ProjectionOptions, insertBefore?: Node) {
	if (!children) {
		return;
	}
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		createDom(child, domNode, insertBefore, projectionOptions, isWNode(child) ? child.instance : undefined);
	}
}

function initPropertiesAndChildren(domNode: Node, dnode: DNode, projectionOptions: ProjectionOptions) {
	if (isWNode(dnode)) {
		addChildren(domNode, dnode.rendered, projectionOptions);
	}
	else {
		addChildren(domNode, dnode.children, projectionOptions); // children before properties, needed for value property of <select>.
		if (dnode.text) {
			domNode.textContent = dnode.text;
		}
		setProperties(domNode, dnode.properties, projectionOptions);
		if (dnode.properties && dnode.properties.afterCreate) {
			dnode.properties.afterCreate.apply(dnode.properties.bind || dnode.properties, [domNode as Element, projectionOptions, dnode.tag, dnode.properties, dnode.children]);
		}
	}
}

function createDom(dnode: DNode, parentNode: Node, insertBefore: Node | undefined, projectionOptions: ProjectionOptions, parentInstance: any) {
	let domNode: Node | undefined;
	if (isWNode(dnode)) {
		// widget constructor or registry item
		const { widgetConstructor } = dnode as any;
		const instance = new widgetConstructor();
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
	}
	else {
		const hnodeSelector = dnode.tag;
		const doc = parentNode.ownerDocument;
		if (hnodeSelector === '') {
			domNode = dnode.domNode = doc.createTextNode(dnode.text!);
			if (insertBefore !== undefined) {
				parentNode.insertBefore(domNode, insertBefore);
			}
			else {
				parentNode.appendChild(domNode);
			}
		}
		else {
			if (hnodeSelector === 'svg') {
				projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
			}
			if (projectionOptions.namespace !== undefined) {
				domNode = dnode.domNode = doc.createElementNS(projectionOptions.namespace, hnodeSelector);
			}
			else {
				domNode = dnode.domNode = (dnode.domNode || doc.createElement(hnodeSelector));
			}
			if (insertBefore !== undefined) {
				parentNode.insertBefore(domNode, insertBefore);
			}
			else if (domNode!.parentNode !== parentNode) {
				parentNode.appendChild(domNode);
			}
			initPropertiesAndChildren(domNode!, dnode, projectionOptions);
		}
	}
}

function updateDom(previous: any, dnode: DNode, projectionOptions: ProjectorOptions, parentNode: Node) {
	if (previous === dnode) {
		return false;
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
	else {
		const domNode = previous.domNode!;
		let textUpdated = false;
		let updated = false;
		if (dnode.tag === '') {
			if (dnode.text !== previous.text) {
				const newdnode = domNode.ownerDocument.createTextNode(dnode.text!);
				domNode.parentNode!.replaceChild(newdnode, domNode);
				dnode.domNode = newdnode;
				textUpdated = true;
				return textUpdated;
			}
		}
		else {
			if (dnode.tag.lastIndexOf('svg', 0) === 0) {
				projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
			}
			if (previous.text !== dnode.text) {
				updated = true;
				if (dnode.text === undefined) {
					domNode.removeChild(domNode.firstChild!);
				}
				else {
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
}

function createProjection(dnode: HNode, projectionOptions: ProjectionOptions): Projection {
	return {
		update: function(updatedVnode: HNode) {
			if (dnode.tag !== updatedVnode.tag) {
				throw new Error('The tag for the root VNode may not be changed. (consider using dom.merge and add one extra level to the virtual DOM)');
			}
			updateDom(dnode, updatedVnode, projectionOptions, dnode.domNode as Element);
			dnode = updatedVnode;
		},
		domNode: dnode.domNode as Element
	};
}

export const dom = {
	create: function(hnode: HNode, instance: any, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(hnode, document.createElement('div'), undefined, projectionOptions, instance);
		return createProjection(hnode, projectionOptions);
	},
	append: function(parentNode: Element, hnode: HNode, instance: any, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(hnode, parentNode, undefined, projectionOptions, instance);
		return createProjection(hnode, projectionOptions);
	},
	insertBefore: function(beforeNode: Element, hnode: HNode, instance: any, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(hnode, beforeNode.parentNode!, beforeNode, projectionOptions, instance);
		return createProjection(hnode, projectionOptions);
	},
	merge: function(element: Element, hnode: HNode, instance: any, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		hnode.domNode = element;
		initPropertiesAndChildren(element, hnode, projectionOptions);
		return createProjection(hnode, projectionOptions);
	},
	replace: function(element: Element, hnode: HNode, instance: any, projectionOptions?: ProjectionOptions): Projection {
		projectionOptions = applyDefaultProjectionOptions(projectionOptions);
		createDom(hnode, element.parentNode!, element, projectionOptions, instance);
		element.parentNode!.removeChild(element);
		return createProjection(hnode, projectionOptions);
	}
};
