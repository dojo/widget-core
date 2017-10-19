import loadCldrData from '@dojo/i18n/cldr/load';
import { systemLocale } from '@dojo/i18n/i18n';
import likelySubtags from './likelySubtags';

/**
 * Load into Globalize.js all CLDR data for the specified locales.
 */
export async function fetchCldrData(): Promise<void> {
	await Promise.all([
		// this weird dummy load is needed by i18n right now
		loadCldrData({
			main: {
				[systemLocale]: {}
			}
		}),
		loadCldrData(likelySubtags)
	]);
}
