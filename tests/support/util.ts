import loadCldrData from '@dojo/i18n/cldr/load';
import { systemLocale } from '@dojo/i18n/i18n';

/**
 * Load into Globalize.js all CLDR data for the specified locales.
 */
export function fetchCldrData(): Promise<void[]> {
	return Promise.all([
		loadCldrData({
			main: {
				[systemLocale]: {}
			}
		}),
		loadCldrData([ 'cldr-data/supplemental/likelySubtags.json' ])
	]);
}
