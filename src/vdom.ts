import global from '@dojo/shim/global';
import {
	CoreProperties,
	DNode,
	HNode,
	WNode,
	ProjectionOptions,
	Projection,
	TransitionStrategy,
	VirtualDomProperties
} from './interfaces';
import { from as arrayFrom } from '@dojo/shim/array';
import { isWNode, isHNode, HNODE } from './d';
import { WidgetBase } from './WidgetBase';
import { isWidgetBaseConstructor } from './Registry';

const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

const emptyArray: (InternalWNode | InternalHNode)[] = [];

export interface InternalWNode extends WNode<WidgetBase> {

	/**
	 * The instance of the widget
	 */
	instance: WidgetBase;

	/**
	 * The rendered DNodes from the instance
	 */
	rendered: InternalDNode[];

	/**
	 * Core properties that are used by the widget core system
	 */
	coreProperties: CoreProperties;

	/**
	 * Children for the WNode
	 */
	children: InternalDNode[];
}

export interface InternalHNode extends HNode {

	/**
	 * Children for the HNode
	 */
	children?: InternalDNode[];

	/**
	 * DOM element
	 */
	domNode?: Element | Text;
}

export type InternalDNode = InternalHNode | InternalWNode;

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

function same(dnode1: InternalDNode, dnode2: InternalDNode) {
	if (isHNode(dnode1) && isHNode(dnode2)) {
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
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
	},
	afterRenderCallbacks: [],
	merge: false
};

function applyDefaultProjectionOptions(projectorOptions?: Partial<ProjectionOptions>): ProjectionOptions {
	projectorOptions = extend(DEFAULT_PROJECTION_OPTIONS, projectorOptions);
	projectorOptions.afterRenderCallbacks = [];
	return projectorOptions as ProjectionOptions;
}

function checkStyleValue(styleValue: Object) {
	if (typeof styleValue !== 'string') {
		throw new Error('Style values must be strings');
	}
}

function setProperties(domNode: Node, properties: VirtualDomProperties, projectionOptions: ProjectionOptions) {
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

function updateProperties(
	domNode: Node,
	previousProperties: VirtualDomProperties,
	properties: VirtualDomProperties,
	projectionOptions: ProjectionOptions
) {
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
					throw new Error(`Functions may not be updated on subsequent renders (property: ${propName})`);
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

function findIndexOfChild(children: InternalDNode[], sameAs: InternalDNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i], sameAs)) {
			return i;
		}
	}
	return -1;
}

export function toTextHNode(data: any): InternalHNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		text: `${data}`,
		domNode: undefined,
		type: HNODE
	};
}

export function filterAndDecorateChildren(children: undefined | DNode | DNode[], instance: WidgetBase): InternalDNode[] {
	if (children === undefined) {
		return emptyArray;
	}
	children = Array.isArray(children) ? children : [ children ];

	for (let i = 0; i < children.length;) {
		const child = children[i] as InternalDNode;
		if (child === undefined || child === null) {
			children.splice(i, 1);
			continue;
		}
		else if (typeof child === 'string') {
			children[i] = toTextHNode(child);
		}
		else {
			if (isHNode(child)) {
				if (child.properties.bind === undefined) {
					(child.properties as any).bind = instance;
					if (child.children && child.children.length > 0) {
						filterAndDecorateChildren(child.children, instance);
					}
				}
			} else {
				if (!child.coreProperties) {
					child.coreProperties = {
						bind: instance,
						baseRegistry: instance.coreProperties.baseRegistry
					};
				}
				if (child.children && child.children.length > 0) {
					filterAndDecorateChildren(child.children, instance);
				}
			}
		}
		i++;
	}
	return children as InternalDNode[];
}

function hasRenderChanged(previousRendered: InternalDNode[], rendered: InternalDNode | InternalDNode[]): boolean {
	const arrayRender = Array.isArray(rendered);
	if (arrayRender) {
		return previousRendered !== rendered;
	}
	else {
		return Array.isArray(previousRendered) && previousRendered[0] !== rendered;
	}
}

function nodeAdded(dnode: InternalDNode, transitions: TransitionStrategy) {
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

function nodeToRemove(dnode: InternalDNode, transitions: TransitionStrategy, projectionOptions: ProjectionOptions) {
	if (isWNode(dnode)) {
		projectionOptions.afterRenderCallbacks.push(dnode.instance.destroy.bind(dnode.instance));
		const rendered = dnode.rendered || emptyArray ;
		for (let i = 0; i < rendered.length; i++) {
			const child = rendered[i];
			if (isHNode(child)) {
				child.domNode!.parentNode!.removeChild(child.domNode!);
			}
			else {
				nodeToRemove(child, transitions, projectionOptions);
			}
		}
	}
	else {
		const domNode = dnode.domNode;
		const properties = dnode.properties;
		const exitAnimation = properties.exitAnimation;
		if (properties && exitAnimation) {
			(domNode as HTMLElement).style.pointerEvents = 'none';
			const removeDomNode = function() {
				domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
			};
			if (typeof exitAnimation === 'function') {
				exitAnimation(domNode as Element, removeDomNode, properties);
				return;
			}
			else {
				transitions.exit(dnode.domNode as Element, properties, exitAnimation as string, removeDomNode);
				return;
			}
		}
		domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
	}
}

function checkDistinguishable(childNodes: InternalDNode[], indexToCheck: number, parentDNode: InternalDNode, operation: string) {
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
						const widgetName = (childNode.widgetConstructor as any).name;
						let errorMsg = 'It is recommended to provide a unique \'key\' property when using the same widget multiple times as siblings';

						if (widgetName) {
							errorMsg = `It is recommended to provide a unique 'key' property when using the same widget (${widgetName}) multiple times as siblings`;
						}
						console.warn(errorMsg);
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

function updateChildren(
	dnode: InternalDNode,
	domNode: Node,
	oldChildren: InternalDNode[],
	newChildren: InternalDNode[],
	parentInstance: WidgetBase,
	projectionOptions: ProjectionOptions
) {
	oldChildren = oldChildren || emptyArray;
	newChildren = newChildren;
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
			textUpdated = updateDom(oldChild, newChild, projectionOptions, domNode, parentInstance) || textUpdated;
			oldIndex++;
		}
		else {
			const findOldIndex = findIndexOfChild(oldChildren, newChild, oldIndex + 1);
			if (findOldIndex >= 0) {
				for (i = oldIndex; i < findOldIndex; i++) {
					nodeToRemove(oldChildren[i], transitions, projectionOptions);
					checkDistinguishable(oldChildren, i, dnode, 'removed');
				}
				textUpdated = updateDom(oldChildren[findOldIndex], newChild, projectionOptions, domNode, parentInstance) || textUpdated;
				oldIndex = findOldIndex + 1;
			}
			else {
				let insertBefore: Node | undefined = undefined;
				let child: InternalDNode = oldChildren[oldIndex];
				if (child) {
					while (insertBefore === undefined) {
						if (isWNode(child)) {
							child = child.rendered[0];
						}
						else {
							insertBefore = child.domNode;
						}
					}
				}

				createDom(newChild, domNode, insertBefore, projectionOptions, parentInstance);
				nodeAdded(newChild, transitions);
				checkDistinguishable(newChildren, newIndex, dnode, 'added');
			}
		}
		newIndex++;
	}
	if (oldChildrenLength > oldIndex) {
		// Remove child fragments
		for (i = oldIndex; i < oldChildrenLength; i++) {
			nodeToRemove(oldChildren[i], transitions, projectionOptions);
			checkDistinguishable(oldChildren, i, dnode, 'removed');
		}
	}
	return textUpdated;
}

function addChildren(
	domNode: Node,
	children: InternalDNode[] | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: WidgetBase,
	insertBefore: undefined | Node = undefined,
	childNodes?: Node[]
) {
	if (children === undefined) {
		return;
	}

	if (projectionOptions.merge && childNodes === undefined) {
		childNodes = arrayFrom(domNode.childNodes);
	}

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (isHNode(child)) {
			if (projectionOptions.merge) {
				const domElement = childNodes ? childNodes.shift() as HTMLElement : undefined;
				if (domElement && domElement.tagName === (child.tag.toUpperCase() || undefined)) {
					child.domNode = domElement;
				}
			}
			createDom(child, domNode, insertBefore, projectionOptions, parentInstance);
		}
		else {
			createDom(child, domNode, insertBefore, projectionOptions, parentInstance, childNodes);
		}
	}
}

function initPropertiesAndChildren(
	domNode: Node,
	dnode: InternalHNode,
	parentInstance: WidgetBase,
	projectionOptions: ProjectionOptions
) {
	addChildren(domNode, dnode.children, projectionOptions, parentInstance, undefined);
	setProperties(domNode, dnode.properties, projectionOptions);
	if (dnode.properties.key) {
		projectionOptions.afterRenderCallbacks.push(() => {
			parentInstance.emit({ type: 'element-created', key: dnode.properties.key, element: domNode });
		});
	}
}

function createDom(
	dnode: InternalDNode,
	parentNode: Node,
	insertBefore: Node | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: WidgetBase,
	childNodes?: Node[]
) {
	let domNode: Node | undefined;
	if (isWNode(dnode)) {
		let { widgetConstructor } = dnode;
		if (!isWidgetBaseConstructor(widgetConstructor)) {
			const item = parentInstance.registry.get<WidgetBase>(widgetConstructor);
			if (item === null) {
				return;
			}
			widgetConstructor = item;
		}
		const instance = new widgetConstructor();
		parentInstance.own(instance);
		instance.own(instance.on('invalidated', () => {
			parentInstance.invalidate();
		}));
		dnode.instance = instance;
		instance.__setCoreProperties__(dnode.coreProperties);
		instance.__setChildren__(dnode.children);
		instance.__setProperties__(dnode.properties);
		const rendered = instance.__render__();
		if (rendered) {
			const filteredRendered = filterAndDecorateChildren(rendered, instance as WidgetBase);
			dnode.rendered = filteredRendered;
			addChildren(parentNode, filteredRendered, projectionOptions, instance as WidgetBase, insertBefore, childNodes);
		}
		projectionOptions.afterRenderCallbacks.push(() => {
			parentInstance.emit({ type: 'widget-created' });
		});
	}
	else {
		const doc = parentNode.ownerDocument;
		if (dnode.tag === '') {
			if (dnode.domNode !== undefined) {
				const newDomNode = dnode.domNode.ownerDocument.createTextNode(dnode.text!);
				dnode.domNode.parentNode!.replaceChild(newDomNode, dnode.domNode);
				dnode.domNode = newDomNode;
			}
			else {
				domNode = dnode.domNode = doc.createTextNode(dnode.text!);
				if (insertBefore !== undefined) {
					parentNode.insertBefore(domNode, insertBefore);
				}
				else {
					parentNode.appendChild(domNode);
				}
			}
		}
		else {
			if (dnode.domNode === undefined) {
				if (dnode.tag === 'svg') {
					projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
				}
				if (projectionOptions.namespace !== undefined) {
					domNode = dnode.domNode = doc.createElementNS(projectionOptions.namespace, dnode.tag);
				}
				else {
					domNode = dnode.domNode = (dnode.domNode || doc.createElement(dnode.tag));
				}
			}
			else {
				domNode = dnode.domNode;
			}
			if (insertBefore !== undefined) {
				parentNode.insertBefore(domNode, insertBefore);
			}
			else if (domNode!.parentNode !== parentNode) {
				parentNode.appendChild(domNode);
			}
			initPropertiesAndChildren(domNode!, dnode, parentInstance, projectionOptions);
		}
	}
}

function updateDom(previous: any, dnode: InternalDNode, projectionOptions: ProjectionOptions, parentNode: Node, parentInstance: WidgetBase) {
	if (previous === dnode) {
		return false;
	}
	if (isWNode(dnode)) {
		const { instance, rendered: previousRendered } = previous;
		if (instance && previousRendered) {
			instance.__setCoreProperties__(dnode.coreProperties);
			instance.__setChildren__(dnode.children);
			instance.__setProperties__(dnode.properties);
			dnode.instance = instance;
			const rendered = instance.__render__();
			dnode.rendered = filterAndDecorateChildren(rendered, instance);
			if (hasRenderChanged(previousRendered, rendered)) {
				updateChildren(dnode, parentNode, previousRendered, dnode.rendered, instance, projectionOptions);
				projectionOptions.afterRenderCallbacks.push(() => {
					parentInstance.emit({ type: 'widget-updated' });
				});
			}
		}
		else {
			createDom(dnode, parentNode, undefined, projectionOptions, parentInstance);
		}
	}
	else {
		const domNode = previous.domNode!;
		let textUpdated = false;
		let updated = false;
		if (dnode.tag === '') {
			if (dnode.text !== previous.text) {
				const newDomNode = domNode.ownerDocument.createTextNode(dnode.text!);
				domNode.parentNode!.replaceChild(newDomNode, domNode);
				dnode.domNode = newDomNode;
				textUpdated = true;
				return textUpdated;
			}
		}
		else {
			if (dnode.tag.lastIndexOf('svg', 0) === 0) {
				projectionOptions = extend(projectionOptions, { namespace: NAMESPACE_SVG });
			}
			if (previous.children !== dnode.children) {
				const children = filterAndDecorateChildren(dnode.children, parentInstance);
				dnode.children = children;
				updated = updateChildren(dnode, domNode, previous.children, children, parentInstance, projectionOptions) || updated;
			}
			updated = updateProperties(domNode, previous.properties, dnode.properties, projectionOptions) || updated;

			if (dnode.properties.key) {
				projectionOptions.afterRenderCallbacks.push(() => {
					parentInstance.emit({ type: 'element-updated', key: dnode.properties.key, element: domNode });
				});
			}
		}
		if (updated && dnode.properties && dnode.properties.updateAnimation) {
			dnode.properties.updateAnimation(domNode as Element, dnode.properties, previous.properties);
		}
		dnode.domNode = previous.domNode;
		return textUpdated;
	}
}

function createProjection(dnode: InternalHNode, parentInstance: WidgetBase, projectionOptions: ProjectionOptions): Projection {
	return {
		update: function(updatedHNode: HNode) {
			if (dnode.tag !== updatedHNode.tag) {
				throw new Error('The tag for the root HNode may not be changed. (consider using dom.merge and add one extra level to the virtual DOM)');
			}
			updatedHNode.children = filterAndDecorateChildren(updatedHNode.children, parentInstance);
			updateDom(dnode, updatedHNode as InternalHNode, projectionOptions, dnode.domNode as Element, parentInstance);
			projectionOptions.afterRenderCallbacks.push(() => {
				parentInstance.emit({ type: 'widget-created' });
			});

			if (global.requestIdleCallback) {
				global.requestIdleCallback(() => {
					while (projectionOptions.afterRenderCallbacks.length) {
						const callback = projectionOptions.afterRenderCallbacks.shift();
						callback && callback();
					}
				});
			}
			else {
				setTimeout(() => {
					while (projectionOptions.afterRenderCallbacks.length) {
						const callback = projectionOptions.afterRenderCallbacks.shift();
						callback && callback();
					}
				});
			}

			dnode = updatedHNode as InternalHNode;
		},
		domNode: dnode.domNode as Element
	};
}

export const dom = {
	create: function(hNode: HNode, instance: WidgetBase<any, any>, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = applyDefaultProjectionOptions(projectionOptions);
		const decoratedNode = filterAndDecorateChildren(hNode, instance)[0] as InternalHNode;
		createDom(decoratedNode, document.createElement('div'), undefined, finalProjectorOptions, instance);
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instance.emit({ type: 'widget-created' });
		});
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		else {
			setTimeout(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	append: function(parentNode: Element, hNode: HNode, instance: WidgetBase<any, any>, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = applyDefaultProjectionOptions(projectionOptions);
		const decoratedNode = filterAndDecorateChildren(hNode, instance)[0] as InternalHNode;
		createDom(decoratedNode, parentNode, undefined, finalProjectorOptions, instance);
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instance.emit({ type: 'widget-created' });
		});
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		else {
			setTimeout(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	merge: function(element: Element, hNode: HNode, instance: WidgetBase<any, any>, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = applyDefaultProjectionOptions(projectionOptions);
		finalProjectorOptions.merge = true;
		const decoratedNode = filterAndDecorateChildren(hNode, instance)[0] as InternalHNode;
		decoratedNode.domNode = element;
		initPropertiesAndChildren(element, decoratedNode, instance, finalProjectorOptions);
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instance.emit({ type: 'widget-created' });
		});
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		else {
			setTimeout(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	replace: function(element: Element, hNode: HNode, instance: WidgetBase<any, any>, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = applyDefaultProjectionOptions(projectionOptions);
		const decoratedNode = filterAndDecorateChildren(hNode, instance)[0] as InternalHNode;
		createDom(decoratedNode, element.parentNode!, element, finalProjectorOptions, instance);
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instance.emit({ type: 'widget-created' });
		});
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		else {
			setTimeout(() => {
				while (finalProjectorOptions.afterRenderCallbacks.length) {
					const callback = finalProjectorOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
		element.parentNode!.removeChild(element);
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	}
};
