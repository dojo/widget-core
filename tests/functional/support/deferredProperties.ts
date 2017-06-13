import { v, w } from '../../../src/d';
import { DNode, WidgetProperties } from '../../../src/interfaces';
import { ProjectorMixin } from '../../../src/mixins/Projector';
import { asyncProperty, diffProperty, WidgetBase } from '../../../src/WidgetBase';
import { Base as MetaBase } from '../../../src/meta/Base';
import { Dimensions } from '../../../src/meta/Dimensions';
import { auto } from '../../../src/diff';

interface AccordionProperties extends WidgetProperties {
	panels: {
		label: string;
		node: DNode;
	}[];
}

interface AccordionPanelProperties extends WidgetProperties {
	title: string;
	content: DNode;
	index: number;
	selected: boolean;
	onClick: (index: number) => void;
}

class Animation extends MetaBase {
	animate(key: string, animations: any[], duration = 500) {
		this.requireNode(key);

		const node = this.nodes.get(key);

		if (node) {
			(<any> node).animate(animations, {duration});
		}
	}
}

class AccordionPanel extends WidgetBase<AccordionPanelProperties> {
	private _heightCache: number | undefined = undefined;

	private _onClick() {
		const {onClick, index} = this.properties;

		onClick && onClick(index);
	}

	@diffProperty('selected', auto)
	protected _selectedChanged(previousProperties: AccordionPanelProperties, newProperties: AccordionPanelProperties) {
		const { selected: newSelected = false } = newProperties;
		const { selected: oldSelected = false } = previousProperties;
		const { index } = this.properties;
		const contentKey = `content-${index}`;
		const contentHeight = this._heightCache;

		if (contentHeight !== undefined) {
			if (!oldSelected && newSelected) {
				this.meta(Animation).animate(contentKey, [
					{height: 0},
					{height: contentHeight + 'px'}
				], 250);
			} else if (oldSelected && !newSelected) {
				this.meta(Animation).animate(contentKey, [
					{height: contentHeight + 'px'},
					{height: 0}
				], 250);
			}
		}
	}

	render() {
		const {selected, title, content, index} = this.properties;
		const contentKey = `content-${index}`;

		return v('li', {key: `panel-${index}`, 'classes': {selected: selected}}, [
			v('div', {'class': 'title', onclick: this._onClick}, [title]),
			v('div', {
				'class': 'content',
				key: contentKey,
				styles: {
					height: asyncProperty(() => {
						let height = this._heightCache;

						if (height === undefined) {
							const dim = this.meta(Dimensions).get(contentKey);
							height = dim.size.height;
							this._heightCache = height;
						}

						return (selected ? height : 0) + 'px';
					})
				}
			}, [v('div', { 'class': 'padded' }, [content])])
		]);
	}
}

class Accordion extends WidgetBase<AccordionProperties> {
	private _selectedPanel = 0;
	private _indexBase = 0;

	private _onPanelTitleClick = (index: number) => {
		this._selectedPanel = index - this._indexBase;
		this.invalidate();
	}

	@diffProperty('panels', auto)
	protected _onPanelsUpdated(previousProperties: AccordionProperties) {
		this._indexBase += (previousProperties.panels || []).length;
		this._selectedPanel = 0;
	}

	render() {
		return v('div.accordion', [
			v('ul', [
					this.properties.panels.map((panel, index) => w(AccordionPanel, {
						key: `panel-${this._indexBase + index}`,
						selected: this._selectedPanel === index,
						index: this._indexBase + index,
						onClick: this._onPanelTitleClick,
						title: panel.label,
						content: panel.node
					}))
				]
			)
		]);
	}
}

const projector = new (ProjectorMixin(Accordion))();
projector.setProperties({
	panels: [
		{
			label: 'Dummy text',
			node: v('div', ['panel 1 is awesome! panel 1 is awesome! panel 1 is awesome! panel 1 is awesome! panel 1 is awesome! panel 1 is awesome! panel 1 is awesome!'])
		},
		{
			label: 'I\'ve got a lovely bunch of coconuts',
			node: v('div', [`Ive got a lovely bunch of coconuts
There they are, all standing in a row
Big ones, small ones, some as big as your head
Give them a twist a flick of the wrist
Thats what the showman said`])
		},
		{
			label: 'Tip Toe Through the Tuplics',
			node: v('div', [`Tiptoe through the window
By the window, that is where I'll be
Come tiptoe through the tulips with me
Oh, tiptoe from the garden
By the garden of the willow tree
And tiptoe through the tulips with me`])
		},
		{
			label: 'Panelception',
			node: w(Accordion, {
				panels: [
					{
						label: 'P1',
						node: v('div', ['Panel 1'])
					},
					{
						label: 'P2',
						node: v('div', ['Panel 2'])
					}
				]
			})
		}
	]
});
projector.append(document.getElementById('content-area')!);

document.getElementById('change-button')!.addEventListener('click', () => {
	projector.setProperties({
		panels: [
			{
				label: 'Herpy Derpy',
				node: v('div', ['Such pannels, much wow!'])
			},
			{
				label: 'I\'ve got a lovely bunch of coconts',
				node: v('div', [`fruit loops and butter cups!`])
			}
		]
	});
});
