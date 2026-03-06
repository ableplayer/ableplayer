import $ from 'jquery';
import ca from '../translations/ca.json';
import cs from '../translations/cs.json';
import da from '../translations/da.json';
import de from '../translations/de.json';
import en from '../translations/en.json';
import es from '../translations/es.json';
import fr from '../translations/fr.json';
import he from '../translations/he.json';
import id from '../translations/id.json';
import it from '../translations/it.json';
import ja from '../translations/ja.json';
import ms from '../translations/ms.json';
import nb from '../translations/nb.json';
import nl from '../translations/nl.json';
import pl from '../translations/pl.json';
import pt_br from '../translations/pt-br.json';
import pt from '../translations/pt.json';
import sv from '../translations/sv.json';
import tr from '../translations/tr.json';
import zh_tw from '../translations/zh-tw.json';

const moduleFromTag = {
	ca,
	cs,
	da,
	de,
	en,
	es,
	fr,
	he,
	id,
	it,
	ja,
	ms,
	nb,
	nl,
	pl,
	pt,
	'pt-BR': pt_br,
	sv,
	tr,
	'zh-TW': zh_tw,
}

function addTranslationFunctions(AblePlayer) {
	AblePlayer.prototype.getSupportedLangs = function() {
		// returns an array of languages for which AblePlayer has translation tables
		var langs = {
			'ca'    : 'Catalan',
			'cs'    : 'Czech',
			'da'    : 'Danish',
			'de'    : 'German',
			'en'    : 'English',
			'es'    : 'Spanish',
			'fr'    : 'French',
			'he'    : 'Hebrew',
			'id'    : 'Indonesian',
			'it'    : 'Italian',
			'ja'    : 'Japanese',
			'ms'    : 'Malay',
			'nb'    : 'Norwegian Bokmål',
			'nl'    : 'Dutch',
			'pl'    : 'Polish',
			'pt'    : 'Portuguese',
			'pt-BR' : 'Brazilian Portuguese',
			'sv'    : 'Swedish',
			'tr'    : 'Turkish',
			'zh-TW' : 'Chinese (Taiwan)'
		};

		return langs;
	};

	/**
	 * Fetch a translated string if it exists.
	 *
	 * @param {string} key JSON key to locate translated string.
	 * @param {string} fallback Default language if no translation found.
	 * @param {Array} args Ordered array of arguments to replace in string.
	 * @returns
	 */
	AblePlayer.prototype.translate = function( key, fallback, args = Array() ) {
		let translation = '';
		if ( this.tt[ key ] ) {
			translation = this.tt[ key ];
		} else {
			translation = fallback;
		}
		if ( args.length > 0 ) {
			args.forEach( ( val, index ) => {
				let ref = index + 1;
				translation = translation.replace( '%' + ref, val );
			});
		}

		return translation;
	}

	AblePlayer.prototype.getTranslationText = function() {

		// determine language, then get labels and prompts from corresponding translation var
		var thisObj, supportedLangs, docLang, similarLangFound;
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); // returns an array

		if (this.lang) { // a data-lang attribute is included on the media element
			if ( Object.prototype.hasOwnProperty.call( supportedLangs,this.lang ) ) {
				// the specified language is not supported
				if ( this.lang.indexOf('-') == 2 ) {
					// this is a localized lang attribute (e.g., fr-CA)
					// try the parent language, given the first two characters
					// if parent lang is supported. Use that, else null.
					this.lang = ( Object.prototype.hasOwnProperty.call(supportedLangs,this.lang.substring(0,2)) !== -1 ) ? this.lang.substring(0,2) : null;
				} else {
					// this is not a localized language.
					// but maybe there's a similar localized language supported
					// that has the same parent?
					similarLangFound = false;
					for ( const [key,value] of Object.entries(supportedLangs) ) {
						if ( key.substring(0,2) == this.lang ) {
							this.lang = value;
							similarLangFound = true;
						}
					}
					if ( !similarLangFound ) {
						// language requested via data-lang is not supported
						this.lang = null;
					}
				}
			}
		}

		if (!this.lang) {
			// try the language of the web page, if specified
			if ($('body').attr('lang')) {
				docLang = $('body').attr('lang').toLowerCase();
			} else if ($('html').attr('lang')) {
				docLang = $('html').attr('lang').toLowerCase();
			} else {
				docLang = null;
			}
			if (docLang) {
				if ( Object.prototype.hasOwnProperty.call( supportedLangs,docLang ) ) {
					// the document language is supported
					this.lang = docLang;
				} else {
					// the document language is not supported
					if (docLang.indexOf('-') == 2) {
						// this is a localized lang attribute (e.g., fr-CA)
						// try the parent language, given the first two characters
						if ( Object.prototype.hasOwnProperty.call(supportedLangs,docLang.substring(0,2)) ) {
							// the parent language is supported. use that.
							this.lang = docLang.substring(0,2);
						}
					}
				}
			}
		}

		if (!this.lang) {
			// No supported language has been specified by any means
			// Fallback to English
			this.lang = 'en';
		}

		if (!this.searchLang) {
			this.searchLang = this.lang;
		}
		const ttModule = moduleFromTag[this.lang];
		if (!ttModule) {
			console.log( "Error: Unable to load translation module for language:", this.lang);
			thisObj.tt = {};
			thisObj.translationFiles = false;
		} else {
			thisObj.tt = ttModule;
			thisObj.translationFiles = true;
		}
	};

	AblePlayer.prototype.getSampleDescriptionText = function() {
		if ( ! this.translationFiles ) {
			this.sampleText = [];
			let translation = { 'lang':'en', 'text': this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) };
			this.sampleText.push(translation);
		} else {
			// Create an array of sample description text in all languages
			// This needs to be readily available for testing different voices
			// in the Description Preferences dialog
			var supportedLangs, thisText, translation;

			supportedLangs = this.getSupportedLangs();

			this.sampleText = [];
			for ( const [tag,name] of Object.entries(supportedLangs) ) {
				const ttModule = moduleFromTag[tag];
				thisText = ttModule.sampleDescriptionText;
				translation = {'lang':name, 'text': thisText};
				this.sampleText.push(translation);
			}
		}
	};

}

export default addTranslationFunctions;
