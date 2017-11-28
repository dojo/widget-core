import global from '@dojo/shim/global';
import {
	CoreProperties,
	DefaultWidgetBaseInterface,
	DNode,
	HNode,
	WNode,
	ProjectionOptions,
	Projection,
	SupportedClassName,
	TransitionStrategy,
	VirtualDomProperties
} from './interfaces';
import { from as arrayFrom } from '@dojo/shim/array';
import { isWNode, isHNode, HNODE } from './d';
import { isWidgetBaseConstructor } from './Registry';
import WeakMap from '@dojo/shim/WeakMap';
import NodeHandler from './NodeHandler';
import RegistryHandler from './RegistryHandler';

const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

const emptyArray: (InternalWNode | InternalHNode)[] = [];

export type RenderResult = DNode<any> | DNode<any>[];

export interface InternalWNode extends WNode<DefaultWidgetBaseInterface> {

	/**
	 * The instance of the widget
	 */
	instance: DefaultWidgetBaseInterface;

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

	inserted?: boolean;

	/**
	 * Bag used to still decorate properties on a deferred properties callback
	 */
	decoratedDeferredProperties?: VirtualDomProperties;

	/**
	 * DOM element
	 */
	domNode?: Element | Text;
}

export type InternalDNode = InternalHNode | InternalWNode;

export interface WidgetData {
	onElementCreated: Function;
	onElementUpdated: Function;
	onDetach: () => void;
	onAttach: () => void;
	parentInvalidate?: Function;
	dirty: boolean;
	registry: () => RegistryHandler;
	nodeHandler: NodeHandler;
	coreProperties: CoreProperties;
	invalidate: Function;
}

export const widgetInstanceMap = new WeakMap<any, WidgetData>();

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

function getProjectionOptions(projectorOptions?: Partial<ProjectionOptions>): ProjectionOptions {
	const defaults = {
		namespace: undefined,
		styleApplyer: function(domNode: HTMLElement, styleName: string, value: string) {
			(domNode.style as any)[styleName] = value;
		},
		transitions: {
			enter: missingTransition,
			exit: missingTransition
		},
		deferredRenderCallbacks: [],
		afterRenderCallbacks: [],
		nodeMap: new WeakMap(),
		merge: false
	};
	return { ...defaults, ...projectorOptions } as ProjectionOptions;
}

function checkStyleValue(styleValue: Object) {
	if (typeof styleValue !== 'string') {
		throw new Error('Style values must be strings');
	}
}

function updateEvents(
	domNode: Node,
	propName: string,
	properties: VirtualDomProperties,
	projectionOptions: ProjectionOptions,
	previousProperties?: VirtualDomProperties
) {
	const previous = previousProperties || Object.create(null);
	const currentValue = properties[propName];
	const previousValue = previous[propName];

	const eventName = propName.substr(2);
	const eventMap = projectionOptions.nodeMap.get(domNode) || new WeakMap();

	if (previousValue) {
		const previousEvent = eventMap.get(previousValue);
		domNode.removeEventListener(eventName, previousEvent);
	}

	let callback = currentValue.bind(properties.bind);

	if (eventName === 'input') {
		callback = function(this: any, evt: Event) {
			currentValue.call(this, evt);
			(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value;
		}.bind(properties.bind);
	}

	domNode.addEventListener(eventName, callback);
	eventMap.set(currentValue, callback);
	projectionOptions.nodeMap.set(domNode, eventMap);
}

function addClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.add(classNames[i]);
		}
	}
}

function removeClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.remove(classNames[i]);
		}
	}
}

function setProperties(domNode: Element, properties: VirtualDomProperties, projectionOptions: ProjectionOptions) {
	const propNames = Object.keys(properties);
	const propCount = propNames.length;
	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = properties[propName];
		if (propName === 'classes') {
			const currentClasses = Array.isArray(propValue) ? propValue : [ propValue ];
			if (!(domNode as Element).className) {
				(domNode as Element).className = currentClasses.join(' ').trim();
			}
			else {
				for (let i = 0; i < currentClasses.length; i++) {
					addClasses(domNode as Element, currentClasses[i]);
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
			if (type === 'function' && propName.lastIndexOf('on', 0) === 0) {
				updateEvents(domNode, propName, properties, projectionOptions);
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

function removeOrphanedEvents(
	domNode: Element,
	previousProperties: VirtualDomProperties,
	properties: VirtualDomProperties,
	projectionOptions: ProjectionOptions
) {
	const eventMap = projectionOptions.nodeMap.get(domNode);
	if (eventMap) {
		Object.keys(previousProperties).forEach((propName) => {
			if (propName.substr(0, 2) === 'on' && !properties[propName]) {
				const eventCallback = eventMap.get(previousProperties[propName]);
				if (eventCallback) {
					domNode.removeEventListener(propName.substr(2), eventCallback);
				}
			}
		});
	}
}

function updateProperties(
	domNode: Element,
	previousProperties: VirtualDomProperties,
	properties: VirtualDomProperties,
	projectionOptions: ProjectionOptions
) {
	let propertiesUpdated = false;
	const propNames = Object.keys(properties);
	const propCount = propNames.length;
	if (propNames.indexOf('classes') === -1 && previousProperties.classes) {
		if (Array.isArray(previousProperties.classes)) {
			for (let i = 0; i < previousProperties.classes.length; i++) {
				removeClasses(domNode, previousProperties.classes[i]);
			}
		}
		else {
			removeClasses(domNode, previousProperties.classes);
		}
	}

	removeOrphanedEvents(domNode, previousProperties, properties, projectionOptions);

	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = properties[propName];
		const previousValue = previousProperties![propName];
		if (propName === 'classes') {
			const previousClasses = Array.isArray(previousValue) ? previousValue : [ previousValue ];
			const currentClasses = Array.isArray(propValue) ? propValue : [ propValue ];
			if (previousClasses && previousClasses.length > 0) {
				if (!propValue || propValue.length === 0) {
					for (let i = 0; i < previousClasses.length; i++) {
						removeClasses(domNode, previousClasses[i]);
					}
				}
				else {
					const newClasses: (null | undefined | string)[] = [ ...currentClasses ];
					for (let i = 0; i < previousClasses.length; i++) {
						const previousClassName = previousClasses[i];
						if (previousClassName) {
							const classIndex = newClasses.indexOf(previousClassName);
							if (classIndex === -1) {
								removeClasses(domNode, previousClassName);
							}
							else {
								newClasses.splice(classIndex, 1);
							}
						}
					}
					for (let i = 0; i < newClasses.length; i++) {
						addClasses(domNode, newClasses[i]);
					}
				}
			}
			else {
				for (let i = 0; i < currentClasses.length; i++) {
					addClasses(domNode, currentClasses[i]);
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
				if (type === 'function' && propName.lastIndexOf('on', 0) === 0) {
					updateEvents(domNode, propName, properties, projectionOptions, previousProperties);
				}
				else if (type === 'string' && propName !== 'innerHTML') {
					if (projectionOptions.namespace === NAMESPACE_SVG && propName === 'href') {
						domNode.setAttributeNS(NAMESPACE_XLINK, propName, propValue);
					}
					else if (propName === 'role' && propValue === '') {
						domNode.removeAttribute(propName);
					}
					else {
						domNode.setAttribute(propName, propValue);
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

export function toParentHNode(domNode: Element): InternalHNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		domNode,
		type: HNODE
	};
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

export function filterAndDecorateChildren(children: undefined | DNode | DNode[], instance: DefaultWidgetBaseInterface): InternalDNode[] {
	if (children === undefined) {
		return emptyArray;
	}
	children = Array.isArray(children) ? children : [ children ];

	for (let i = 0; i < children.length; ) {
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
			}
			else {
				if (!child.coreProperties) {
					const instanceData = widgetInstanceMap.get(instance)!;
					child.coreProperties = {
						bind: instance,
						baseRegistry: instanceData.coreProperties.baseRegistry
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

function callOnDetach(dNodes: InternalDNode | InternalDNode[], parentInstance: DefaultWidgetBaseInterface): void {
	dNodes = Array.isArray(dNodes) ? dNodes : [ dNodes ];
	for (let i = 0; i < dNodes.length; i++) {
		const dNode = dNodes[i];
		if (isWNode(dNode)) {
			callOnDetach(dNode.rendered, dNode.instance);
			const instanceData = widgetInstanceMap.get(dNode.instance)!;
			instanceData.onDetach();
		}
		else {
			if (dNode.children) {
				callOnDetach(dNode.children as InternalDNode[], parentInstance);
			}
		}
	}
}

function nodeToRemove(dnode: InternalDNode, transitions: TransitionStrategy, projectionOptions: ProjectionOptions) {
	if (isWNode(dnode)) {
		const rendered = dnode.rendered || emptyArray;
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

function checkDistinguishable(
	childNodes: InternalDNode[],
	indexToCheck: number,
	parentInstance: DefaultWidgetBaseInterface
) {
	const childNode = childNodes[indexToCheck];
	if (isHNode(childNode) && childNode.tag === '') {
		return; // Text nodes need not be distinguishable
	}
	const { key } = childNode.properties;

	if (key === undefined || key === null) {
		for (let i = 0; i < childNodes.length; i++) {
			if (i !== indexToCheck) {
				const node = childNodes[i];
				if (same(node, childNode)) {
					let nodeIdentifier: string;
					const parentName = (parentInstance as any).constructor.name || 'unknown';
					if (isWNode(childNode)) {
						nodeIdentifier = (childNode.widgetConstructor as any).name || 'unknown';
					}
					else {
						nodeIdentifier = childNode.tag;
					}

					console.warn(`A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${nodeIdentifier}) multiple times as siblings`);
					break;
				}
			}
		}
	}
}

function updateChildren(
	parentHNode: InternalHNode,
	oldChildren: InternalDNode[],
	newChildren: InternalDNode[],
	parentInstance: DefaultWidgetBaseInterface,
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
			textUpdated = updateDom(oldChild, newChild, projectionOptions, parentHNode, parentInstance) || textUpdated;
			oldIndex++;
		}
		else {
			const findOldIndex = findIndexOfChild(oldChildren, newChild, oldIndex + 1);
			if (findOldIndex >= 0) {
				for (i = oldIndex; i < findOldIndex; i++) {
					const oldChild = oldChildren[i];
					const indexToCheck = i;
					projectionOptions.afterRenderCallbacks.push(() => {
						callOnDetach(oldChild, parentInstance);
						checkDistinguishable(oldChildren, indexToCheck, parentInstance);
					});
					nodeToRemove(oldChildren[i], transitions, projectionOptions);
				}
				textUpdated = updateDom(oldChildren[findOldIndex], newChild, projectionOptions, parentHNode, parentInstance) || textUpdated;
				oldIndex = findOldIndex + 1;
			}
			else {
				let insertBefore: Element | Text | undefined = undefined;
				let child: InternalDNode = oldChildren[oldIndex];
				if (child) {
					let nextIndex = oldIndex + 1;
					while (insertBefore === undefined) {
						if (isWNode(child)) {
							if (child.rendered) {
								child = child.rendered[0];
							}
							else if (oldChildren[nextIndex]) {
								child = oldChildren[nextIndex];
								nextIndex++;
							}
							else {
								break;
							}
						}
						else {
							insertBefore = child.domNode;
						}
					}
				}

				createDom(newChild, parentHNode, insertBefore, projectionOptions, parentInstance);
				nodeAdded(newChild, transitions);
				const indexToCheck = newIndex;
				projectionOptions.afterRenderCallbacks.push(() => {
					checkDistinguishable(newChildren, indexToCheck, parentInstance);
				});
			}
		}
		newIndex++;
	}
	if (oldChildrenLength > oldIndex) {
		// Remove child fragments
		for (i = oldIndex; i < oldChildrenLength; i++) {
			const oldChild = oldChildren[i];
			const indexToCheck = i;
			projectionOptions.afterRenderCallbacks.push(() => {
				callOnDetach(oldChild, parentInstance);
				checkDistinguishable(oldChildren, indexToCheck, parentInstance);
			});
			nodeToRemove(oldChildren[i], transitions, projectionOptions);
		}
	}
	return textUpdated;
}

function addChildren(
	parentHNode: InternalHNode,
	children: InternalDNode[] | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: DefaultWidgetBaseInterface,
	insertBefore: Element | Text | undefined = undefined,
	childNodes?: (Element | Text)[]
) {
	if (children === undefined) {
		return;
	}

	if (projectionOptions.merge && childNodes === undefined) {
		childNodes = arrayFrom(parentHNode.domNode!.childNodes) as (Element | Text)[];
	}

	for (let i = 0; i < children.length; i++) {
		const child = children[i];

		if (isHNode(child)) {
			if (projectionOptions.merge && childNodes) {
				let domElement: Element | undefined = undefined;
				while (child.domNode === undefined && childNodes.length > 0) {
					domElement = childNodes.shift() as Element;
					if (domElement && domElement.tagName === (child.tag.toUpperCase() || undefined)) {
						child.domNode = domElement;
					}
				}
			}
			createDom(child, parentHNode, insertBefore, projectionOptions, parentInstance);
		}
		else {
			createDom(child, parentHNode, insertBefore, projectionOptions, parentInstance, childNodes);
		}
	}
}

function initPropertiesAndChildren(
	domNode: Element,
	dnode: InternalHNode,
	parentInstance: DefaultWidgetBaseInterface,
	projectionOptions: ProjectionOptions
) {
	addChildren(dnode, dnode.children, projectionOptions, parentInstance, undefined);
	if (typeof dnode.deferredPropertiesCallback === 'function') {
		addDeferredProperties(dnode, projectionOptions);
	}
	setProperties(domNode, dnode.properties, projectionOptions);
	if (dnode.properties.key !== null && dnode.properties.key !== undefined) {
		const instanceData = widgetInstanceMap.get(parentInstance)!;
		instanceData.nodeHandler.add(domNode as HTMLElement, `${dnode.properties.key}`);
		projectionOptions.afterRenderCallbacks.push(() => {
			instanceData.onElementCreated(domNode as HTMLElement, dnode.properties.key!);
		});
	}
	dnode.inserted = true;
}

function createDom(
	dnode: InternalDNode,
	parentHNode: InternalHNode,
	insertBefore: Element | Text | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: DefaultWidgetBaseInterface,
	childNodes?: (Element | Text)[]
) {
	let domNode: Element | Text | undefined;
	if (isWNode(dnode)) {
		let { widgetConstructor } = dnode;
		const parentInstanceData = widgetInstanceMap.get(parentInstance)!;
		if (!isWidgetBaseConstructor<DefaultWidgetBaseInterface>(widgetConstructor)) {
			const item = parentInstanceData.registry().get<DefaultWidgetBaseInterface>(widgetConstructor);
			if (item === null) {
				return;
			}
			widgetConstructor = item;
		}
		const instance = new widgetConstructor();
		dnode.instance = instance;
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.parentInvalidate = parentInstanceData.invalidate;
		instance.__setCoreProperties__(dnode.coreProperties);
		instance.__setChildren__(dnode.children);
		instance.__setProperties__(dnode.properties);
		const rendered = instance.__render__();
		if (rendered) {
			const filteredRendered = filterAndDecorateChildren(rendered, instance);
			dnode.rendered = filteredRendered;
			addChildren(parentHNode, filteredRendered, projectionOptions, instance, insertBefore, childNodes);
		}
		instanceData.nodeHandler.addRoot();
		projectionOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
	}
	else {
		if (projectionOptions.merge && projectionOptions.mergeElement !== undefined) {
			domNode = dnode.domNode = projectionOptions.mergeElement;
			projectionOptions.mergeElement = undefined;
			initPropertiesAndChildren(domNode!, dnode, parentInstance, projectionOptions);
			return;
		}
		const doc = parentHNode.domNode!.ownerDocument;
		if (dnode.tag === '') {
			if (dnode.domNode !== undefined) {
				const newDomNode = dnode.domNode.ownerDocument.createTextNode(dnode.text!);
				dnode.domNode.parentNode!.replaceChild(newDomNode, dnode.domNode);
				dnode.domNode = newDomNode;
			}
			else {
				domNode = dnode.domNode = doc.createTextNode(dnode.text!);
				if (insertBefore !== undefined) {
					parentHNode.domNode!.insertBefore(domNode, insertBefore);
				}
				else {
					parentHNode.domNode!.appendChild(domNode);
				}
			}
		}
		else {
			if (dnode.domNode === undefined) {
				if (dnode.tag === 'svg') {
					projectionOptions = { ...projectionOptions, ...{ namespace: NAMESPACE_SVG } };
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
				parentHNode.domNode!.insertBefore(domNode, insertBefore);
			}
			else if (domNode!.parentNode !== parentHNode.domNode!) {
				parentHNode.domNode!.appendChild(domNode);
			}
			initPropertiesAndChildren(domNode! as Element, dnode, parentInstance, projectionOptions);
		}
	}
}

function updateDom(previous: any, dnode: InternalDNode, projectionOptions: ProjectionOptions, parentHNode: InternalHNode, parentInstance: DefaultWidgetBaseInterface) {
	if (isWNode(dnode)) {
		const { instance, rendered: previousRendered } = previous;
		if (instance && previousRendered) {
			const instanceData = widgetInstanceMap.get(instance)!;
			instance.__setCoreProperties__(dnode.coreProperties);
			instance.__setChildren__(dnode.children);
			instance.__setProperties__(dnode.properties);
			dnode.instance = instance;
			if (instanceData.dirty === true) {
				const rendered = instance.__render__();
				dnode.rendered = filterAndDecorateChildren(rendered, instance);
				updateChildren(parentHNode, previousRendered, dnode.rendered, instance, projectionOptions);
			}
			else {
				dnode.rendered = previousRendered;
			}
			instanceData.nodeHandler.addRoot();
		}
		else {
			createDom(dnode, parentHNode, undefined, projectionOptions, parentInstance);
		}
	}
	else {
		if (previous === dnode) {
			return false;
		}
		const domNode = dnode.domNode = previous.domNode;
		let textUpdated = false;
		let updated = false;
		dnode.inserted = previous.inserted;
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
				projectionOptions = { ...projectionOptions, ...{ namespace: NAMESPACE_SVG } };
			}
			if (previous.children !== dnode.children) {
				const children = filterAndDecorateChildren(dnode.children, parentInstance);
				dnode.children = children;
				updated = updateChildren(dnode, previous.children, children, parentInstance, projectionOptions) || updated;
			}

			if (typeof dnode.deferredPropertiesCallback === 'function') {
				addDeferredProperties(dnode, projectionOptions);
			}

			updated = updateProperties(domNode, previous.properties, dnode.properties, projectionOptions) || updated;

			if (dnode.properties.key !== null && dnode.properties.key !== undefined) {
				const instanceData = widgetInstanceMap.get(parentInstance)!;
				instanceData.nodeHandler.add(domNode, `${dnode.properties.key}`);
				projectionOptions.afterRenderCallbacks.push(() => {
					instanceData.onElementUpdated(domNode as HTMLElement, dnode.properties.key!);
				});
			}
		}
		if (updated && dnode.properties && dnode.properties.updateAnimation) {
			dnode.properties.updateAnimation(domNode as Element, dnode.properties, previous.properties);
		}
		return textUpdated;
	}
}

function addDeferredProperties(hnode: InternalHNode, projectionOptions: ProjectionOptions) {
	// transfer any properties that have been passed - as these must be decorated properties
	hnode.decoratedDeferredProperties = hnode.properties;
	const properties = hnode.deferredPropertiesCallback!(!!hnode.inserted);
	hnode.properties = { ...properties, ...hnode.decoratedDeferredProperties };
	projectionOptions.deferredRenderCallbacks.push(() => {
		const properties = {
			...hnode.deferredPropertiesCallback!(!!hnode.inserted),
			...hnode.decoratedDeferredProperties
		};
		updateProperties(hnode.domNode! as Element, hnode.properties, properties, projectionOptions);
		hnode.properties = properties;
	});
}

function runDeferredRenderCallbacks(projectionOptions: ProjectionOptions) {
	if (projectionOptions.deferredRenderCallbacks.length) {
		if (projectionOptions.sync) {
			while (projectionOptions.deferredRenderCallbacks.length) {
				const callback = projectionOptions.deferredRenderCallbacks.shift();
				callback && callback();
			}
		}
		else {
			global.requestAnimationFrame(() => {
				while (projectionOptions.deferredRenderCallbacks.length) {
					const callback = projectionOptions.deferredRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
	}
}

function runAfterRenderCallbacks(projectionOptions: ProjectionOptions) {
	if (projectionOptions.sync) {
		while (projectionOptions.afterRenderCallbacks.length) {
			const callback = projectionOptions.afterRenderCallbacks.shift();
			callback && callback();
		}
	}
	else {
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
	}
}

function createProjection(dnode: InternalDNode | InternalDNode[], parentInstance: DefaultWidgetBaseInterface, projectionOptions: ProjectionOptions): Projection {
	let projectionDNode = Array.isArray(dnode) ? dnode : [ dnode ];
	projectionOptions.merge = false;
	return {
		update: function(updatedDNode: RenderResult) {
			let domNode = projectionOptions.rootNode;

			updatedDNode = filterAndDecorateChildren(updatedDNode, parentInstance);
			updateChildren(toParentHNode(domNode), projectionDNode, updatedDNode as InternalDNode[], parentInstance, projectionOptions);
			const instanceData = widgetInstanceMap.get(parentInstance)!;
			instanceData.nodeHandler.addRoot();
			runDeferredRenderCallbacks(projectionOptions);
			runAfterRenderCallbacks(projectionOptions);
			projectionDNode = updatedDNode as InternalDNode[];
		},
		domNode: projectionOptions.rootNode
	};
}

export const dom = {
	create: function(dNode: RenderResult, instance: DefaultWidgetBaseInterface, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = getProjectionOptions(projectionOptions);
		const rootNode = document.createElement('div');
		finalProjectorOptions.rootNode = rootNode;
		const decoratedNode = filterAndDecorateChildren(dNode, instance);
		addChildren(toParentHNode(finalProjectorOptions.rootNode), decoratedNode, finalProjectorOptions, instance, undefined);
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.nodeHandler.addRoot();
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
		runDeferredRenderCallbacks(finalProjectorOptions);
		runAfterRenderCallbacks(finalProjectorOptions);
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	append: function(parentNode: Element, dNode: RenderResult, instance: DefaultWidgetBaseInterface, projectionOptions?: Partial<ProjectionOptions>): Projection {
		const finalProjectorOptions = getProjectionOptions(projectionOptions);
		finalProjectorOptions.rootNode = parentNode;
		const decoratedNode = filterAndDecorateChildren(dNode, instance);
		addChildren(toParentHNode(finalProjectorOptions.rootNode), decoratedNode, finalProjectorOptions, instance, undefined);
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.nodeHandler.addRoot();
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
		runDeferredRenderCallbacks(finalProjectorOptions);
		runAfterRenderCallbacks(finalProjectorOptions);
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	merge: function(element: Element, dNode: RenderResult, instance: DefaultWidgetBaseInterface, projectionOptions?: Partial<ProjectionOptions>): Projection {
		if (Array.isArray(dNode)) {
			throw new Error('Unable to merge an array of nodes. (consider adding one extra level to the virtual DOM)');
		}
		const finalProjectorOptions = getProjectionOptions(projectionOptions);
		finalProjectorOptions.merge = true;
		finalProjectorOptions.mergeElement = element;
		finalProjectorOptions.rootNode = element.parentNode as Element;
		const decoratedNode = filterAndDecorateChildren(dNode, instance)[0] as InternalHNode;
		createDom(decoratedNode, toParentHNode(finalProjectorOptions.rootNode), undefined, finalProjectorOptions, instance);
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.nodeHandler.addRoot();
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
		runDeferredRenderCallbacks(finalProjectorOptions);
		runAfterRenderCallbacks(finalProjectorOptions);
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	},
	replace: function(element: Element, dNode: RenderResult, instance: DefaultWidgetBaseInterface, projectionOptions?: Partial<ProjectionOptions>): Projection {
		if (Array.isArray(dNode)) {
			throw new Error('Unable to replace a node with an array of nodes. (consider adding one extra level to the virtual DOM)');
		}
		const finalProjectorOptions = getProjectionOptions(projectionOptions);
		const decoratedNode = filterAndDecorateChildren(dNode, instance)[0] as InternalHNode;
		finalProjectorOptions.rootNode = element.parentNode! as Element;
		createDom(decoratedNode, toParentHNode(finalProjectorOptions.rootNode), element, finalProjectorOptions, instance);
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.nodeHandler.addRoot();
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
		runDeferredRenderCallbacks(finalProjectorOptions);
		runAfterRenderCallbacks(finalProjectorOptions);
		element.parentNode!.removeChild(element);
		return createProjection(decoratedNode, instance, finalProjectorOptions);
	}
};
