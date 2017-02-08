import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

registerSuite({
	name: 'cssTransitions',

	'-active gets appended to enter/exit animations by default'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./support/cssAnimations.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).finished;
			}, undefined, 5000), undefined)
			.execute(function () {
				return {
					startOpacity: (<any> window).startOpacity,
					endOpacity: (<any> window).endOpacity,
					fadeOpacity: (<any> window).fadeOutOpacity,
					elementGone: (<any> window).elementGone
				};
			})
			.then((props: any) => {
				assert.isBelow(props.startOpacity, 1);
				assert.isAbove(props.startOpacity, 0);

				assert.isAbove(props.endOpacity, 0.75);

				assert.isBelow(props.fadeOpacity, 1);
				assert.isAbove(props.fadeOpacity, 0);

				assert.isTrue(props.elementGone);
			});
	},

	'enter/exit animations can be customized'(this: any) {
		return this.remote
			.get((<any> require).toUrl('./support/cssAnimations-custom.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).finished;
			}, undefined, 5000), undefined)
			.execute(function () {
				return {
					startOpacity: (<any> window).startOpacity,
					endOpacity: (<any> window).endOpacity,
					fadeOpacity: (<any> window).fadeOutOpacity,
					elementGone: (<any> window).elementGone
				};
			})
			.then((props: any) => {
				assert.isBelow(props.startOpacity, 1);
				assert.isAbove(props.startOpacity, 0);

				assert.isAbove(props.endOpacity, 0.75);

				assert.isBelow(props.fadeOpacity, 1);
				assert.isAbove(props.fadeOpacity, 0);

				assert.isTrue(props.elementGone);
			});
	}

});
