import { Destroyable } from '@dojo/core/Destroyable';
import { Evented } from '@dojo/core/Evented';
import { EventObject, EventType } from '@dojo/core/interfaces';
import Map from '@dojo/shim/Map';
import WeakMap from '@dojo/shim/WeakMap';

/**
 * Generic constructor type
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Typed target event
 */
export interface TypedTargetEvent<T extends EventTarget, Y extends EventType = EventType> extends EventObject<Y> {
	target: T;
}

/*
 These are the event handlers.
 */
export type EventHandlerResult = boolean | void;

export interface EventHandler {
	(event?: Event): EventHandlerResult;
}

export interface FocusEventHandler {
	(event?: FocusEvent): EventHandlerResult;
}

export interface KeyboardEventHandler {
	(event?: KeyboardEvent): EventHandlerResult;
}

export interface MouseEventHandler {
	(event?: MouseEvent): EventHandlerResult;
}

export type BlurEventHandler = FocusEventHandler;
export type ChangeEventHandler = EventHandler;
export type ClickEventHandler = MouseEventHandler;
export type DoubleClickEventHandler = MouseEventHandler;
export type InputEventHandler = EventHandler;
export type KeyDownEventHandler = KeyboardEventHandler;
export type KeyPressEventHandler = KeyboardEventHandler;
export type KeyUpEventHandler = KeyboardEventHandler;
export type LoadEventHandler = EventHandler;
export type MouseDownEventHandler = MouseEventHandler;
export type MouseEnterEventHandler = MouseEventHandler;
export type MouseLeaveEventHandler = MouseEventHandler;
export type MouseMoveEventHandler = MouseEventHandler;
export type MouseOutEventHandler = MouseEventHandler;
export type MouseOverEventHandler = MouseEventHandler;
export type MouseUpEventHandler = MouseEventHandler;
export type MouseWheelEventHandler = (event?: MouseWheelEvent | WheelEvent) => EventHandlerResult;
export type ScrollEventHandler = (event?: UIEvent) => EventHandlerResult;
export type SubmitEventHandler = EventHandler;

export interface TransitionStrategy {
	enter(element: Element, properties: VirtualDomProperties, enterAnimation: string): void;
	exit(element: Element, properties: VirtualDomProperties, exitAnimation: string, removeElement: () => void): void;
}

export interface ProjectorOptions {
	readonly transitions?: TransitionStrategy;
	styleApplyer?(domNode: HTMLElement, styleName: string, value: string): void;
}

export interface ProjectionOptions extends ProjectorOptions {
	namespace?: string;
	deferredRenderCallbacks: Function [];
	afterRenderCallbacks: Function[];
	merge: boolean;
	sync: boolean;
	mergeElement?: Element;
	nodeMap: WeakMap<Node, WeakMap<Function, EventListener>>;
	rootNode: Element;
}

export interface Projection {
	readonly domNode: Element;
	update(updatedDNode: DNode | DNode[]): void;
}

export type SupportedClassName = string | null | undefined;

export type DeferredVirtualProperties = (inserted: boolean) => VirtualDomProperties;

/**
 * Animation controls are used to control the web animation that has been applied
 * to a vdom node.
 */
export interface AnimationControls {
	play?: boolean;
	onFinish?: () => void;
	onCancel?: () => void;
	reverse?: boolean;
	cancel?: boolean;
	finish?: boolean;
	playbackRate?: number;
	startTime?: number;
	currentTime?: number;
}

/**
 * Animation timing properties passed to a new KeyframeEffect.
 */
export interface AnimationTimingProperties {
	duration?: number;
	delay?: number;
	direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
	easing?: string;
	endDelay?: number;
	fill?: 'none' | 'forwards' | 'backwards' | 'both' | 'auto';
	iterations?: number;
	iterationStart?: number;
}

/**
 * Animation propertiues that can be passed as vdom property `animate`
 */
export interface AnimationProperties {
	id: string;
	effects: any[];
	controls?: AnimationControls;
	timing?: AnimationTimingProperties;
}

/**
 * Info returned by the `get` function on WebAnimation meta
 */
export interface AnimationInfo {
	currentTime: number;
	playState: 'idle' | 'pending' | 'running' | 'paused' | 'finished';
	playbackRate: number;
	startTime: number;
}

export interface VirtualDomProperties {
	/**
	 * The animation to perform when this node is added to an already existing parent.
	 * When this value is a string, you must pass a `projectionOptions.transitions` object when creating the
	 * projector using [[createProjector]].
	 * @param element - Element that was just added to the DOM.
	 * @param properties - The properties object that was supplied to the [[h]] method
	 */
	enterAnimation?: ((element: Element, properties?: VirtualDomProperties) => void) | string;
	/**
	 * The animation to perform when this node is removed while its parent remains.
	 * When this value is a string, you must pass a `projectionOptions.transitions` object when creating the projector using [[createProjector]].
	 * @param element - Element that ought to be removed from the DOM.
	 * @param removeElement - Function that removes the element from the DOM.
	 * This argument is provided purely for convenience.
	 * You may use this function to remove the element when the animation is done.
	 * @param properties - The properties object that was supplied to the [[v]] method that rendered this [[HNode]] the previous time.
	 */
	exitAnimation?: ((element: Element, removeElement: () => void, properties?: VirtualDomProperties) => void) | string;
	/**
	 * The animation to perform when the properties of this node change.
	 * This also includes attributes, styles, css classes. This callback is also invoked when node contains only text and that text changes.
	 * @param element - Element that was modified in the DOM.
	 * @param properties - The last properties object that was supplied to the [[h]] method
	 * @param previousProperties - The previous properties object that was supplied to the [[h]] method
	 */
	updateAnimation?: (element: Element, properties?: VirtualDomProperties, previousProperties?: VirtualDomProperties) => void;
	/**
	 * Bind should not be defined.
	 */
	readonly bind?: void;
	/**
	 * Used to uniquely identify a DOM node among siblings.
	 * A key is required when there are more children with the same selector and these children are added or removed dynamically.
	 * NOTE: this does not have to be a string or number, a [[Component]] Object for instance is also possible.
	 */
	readonly key?: string | number;
	/**
	 * An array of supported class names to be added to classList on a DOM node
	 */
	readonly classes?: SupportedClassName | SupportedClassName[];
	/**
	 * An object literal like `{height:'100px'}` which allows styles to be changed dynamically. All values must be strings.
	 */
	readonly styles?: { [index: string]: string | null | undefined };

	// Pointer Events
	onpointermove?(ev?: PointerEvent): boolean | void;
	onpointerdown?(ev?: PointerEvent): boolean | void;
	onpointerup?(ev?: PointerEvent): boolean | void;
	onpointerover?(ev?: PointerEvent): boolean | void;
	onpointerout?(ev?: PointerEvent): boolean | void;
	onpointerenter?(ev?: PointerEvent): boolean | void;
	onpointerleave?(ev?: PointerEvent): boolean | void;
	onpointercancel?(ev?: PointerEvent): boolean | void;
	// For Pointer Event Polyfill see: https://github.com/jquery/PEP
	readonly 'touch-action'?: string;
	// From Element
	ontouchcancel?(ev?: TouchEvent): boolean | void;
	ontouchend?(ev?: TouchEvent): boolean | void;
	ontouchmove?(ev?: TouchEvent): boolean | void;
	ontouchstart?(ev?: TouchEvent): boolean | void;
	// From HTMLFormElement
	readonly action?: string;
	readonly encoding?: string;
	readonly enctype?: string;
	readonly method?: string;
	readonly name?: string;
	readonly target?: string;
	// From HTMLElement
	onblur?(ev?: FocusEvent): boolean | void;
	onchange?(ev?: Event): boolean | void;
	onclick?(ev?: MouseEvent): boolean | void;
	ondblclick?(ev?: MouseEvent): boolean | void;
	onfocus?(ev?: FocusEvent): boolean | void;
	oninput?(ev?: Event): boolean | void;
	onkeydown?(ev?: KeyboardEvent): boolean | void;
	onkeypress?(ev?: KeyboardEvent): boolean | void;
	onkeyup?(ev?: KeyboardEvent): boolean | void;
	onload?(ev?: Event): boolean | void;
	onmousedown?(ev?: MouseEvent): boolean | void;
	onmouseenter?(ev?: MouseEvent): boolean | void;
	onmouseleave?(ev?: MouseEvent): boolean | void;
	onmousemove?(ev?: MouseEvent): boolean | void;
	onmouseout?(ev?: MouseEvent): boolean | void;
	onmouseover?(ev?: MouseEvent): boolean | void;
	onmouseup?(ev?: MouseEvent): boolean | void;
	onmousewheel?(ev?: WheelEvent | MouseWheelEvent): boolean | void;
	onscroll?(ev?: UIEvent): boolean | void;
	onsubmit?(ev?: Event): boolean | void;
	readonly spellcheck?: boolean;
	readonly tabIndex?: number;
	readonly disabled?: boolean;
	readonly title?: string;
	readonly accessKey?: string;
	readonly id?: string;
	// From HTMLInputElement
	readonly type?: string;
	readonly autocomplete?: string;
	readonly checked?: boolean;
	readonly placeholder?: string;
	readonly readOnly?: boolean;
	readonly src?: string;
	readonly value?: string;
	// From HTMLImageElement
	readonly alt?: string;
	readonly srcset?: string;
	/**
	 * Puts a non-interactive string of html inside the DOM node.
	 *
	 * Note: if you use innerHTML, cannot protect you from XSS vulnerabilities and you must make sure that the innerHTML value is safe.
	 */
	readonly innerHTML?: string;

	/**
	 * Everything that is not explicitly listed (properties and attributes that are either uncommon or custom).
	 */
	readonly [index: string]: any;
}

/**
 * Type of the `WidgetRegistry` label
 */
export type RegistryLabel = string | symbol;

/**
 * Base widget properties
 */
export interface WidgetProperties {

	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key?: string | number;
}

/**
 * Widget properties that require a key
 */
export interface KeyedWidgetProperties extends WidgetProperties {

	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key: string | number;
}

/**
 *
 */
interface CoreProperties {

	/**
	 * The default registry for the projection
	 */
	baseRegistry: any;

	/**
	 * The scope used to bind functions
	 */
	bind: any;
}

/**
 * Wrapper for v
 */
export interface HNode {
	/**
	 * Specified children
	 */
	children?: DNode[];

	/**
	 * HNode properties
	 */
	properties: VirtualDomProperties;

	/**
	 * Deferred callback for HNode properties
	 */
	deferredPropertiesCallback?: DeferredVirtualProperties;

	/**
	 * The tag of the HNode
	 */
	tag: string;

	/**
	 * The type of node
	 */
	type: symbol;

	/**
	 * Text node string
	 */
	text?: string;
}

/**
 * Wrapper for `w`
 */
export interface WNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface> {
	/**
	 * Constructor to create a widget or string constructor label
	 */
	widgetConstructor: Constructor<W> | RegistryLabel;

	/**
	 * Properties to set against a widget instance
	 */
	properties: W['properties'];

	/**
	 * DNode children
	 */
	children: DNode[];

	/**
	 * The type of node
	 */
	type: symbol;
}

/**
 * union type for all possible return types from render
 */
export type DNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface> = HNode | WNode<W> | undefined | null | string;

/**
 * Property Change record for specific property diff functions
 */
export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

export interface DiffPropertyFunction {
	(previousProperty: any, newProperty: any): PropertyChangeRecord;
}

export interface DiffPropertyReaction {
	(previousProperties: any, newProperties: any): void;
}

/**
 * WidgetBase constructor type
 */
export type WidgetBaseConstructor<
	P extends WidgetProperties = WidgetProperties,
	C extends DNode = DNode> = Constructor<WidgetBaseInterface<P, C>>;

export interface DefaultWidgetBaseInterface extends WidgetBaseInterface<WidgetProperties, DNode> {}

/**
 * The interface for WidgetBase
 */
export interface WidgetBaseInterface<
	P = WidgetProperties,
	C extends DNode = DNode> {

	/**
	 * Widget properties
	 */
	readonly properties: P & WidgetProperties;

	/**
	 * Returns the widget's children
	 */
	readonly children: (C | null)[];

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	__setProperties__(properties: P & { [index: string]: any }): void;

	/**
	 * Sets core properties on the widget.
	 *
	 * @param coreProperties The core properties
	 */
	__setCoreProperties__(coreProperties?: CoreProperties): any;

	/**
	 * Sets the widget's children
	 */
	__setChildren__(children: (C | null)[]): void;

	/**
	 * Main internal function for dealing with widget rendering
	 */
	__render__(): DNode | DNode[];
}

/**
 * Meta Base type
 */
export interface WidgetMetaBase extends Destroyable {
	has(key: string | number): boolean;
	afterRender(): void;
}

/**
 * Meta Base constructor type
 */
export interface WidgetMetaConstructor<T extends WidgetMetaBase> {
	new (properties: WidgetMetaProperties): T;
}

export interface NodeHandlerInterface extends Evented {
	get(key: string | number): Element | undefined;
	has(key: string | number): boolean;
	add(element: Element, key: string): void;
	addRoot(element: Element, key: string): void;
	addProjector(element: Element, properties: VirtualDomProperties): void;
	clear(): void;
}

/**
 * Properties passed to meta Base constructors
 */
export interface WidgetMetaProperties {
	invalidate: () => void;
	nodeHandler: NodeHandlerInterface;
	bind: WidgetBaseInterface;
}

export interface Render {
	(): DNode | DNode[];
}

/**
 * Interface for beforeRender function
 */
export interface BeforeRender {
	(renderFunc: Render, properties: WidgetProperties, children: DNode[]): Render | undefined;
}

/**
 * Interface for afterRender function
 */
export interface AfterRender {
	(dNode: DNode | DNode []): DNode | DNode[];
}

/**
 * Interface for beforeProperties function
 */
export interface BeforeProperties<P = any> {
	(properties: P): P;
}
