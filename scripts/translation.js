(function ($) {
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
			'pt-br' : 'Brazilian Portuguese',
			'sv'    : 'Swedish',
			'tr'    : 'Turkish',
			'zh-tw' : 'Chinese (Taiwan)'
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
		var deferred, thisObj, supportedLangs, docLang, translationFile, i,	similarLangFound;
		deferred = new this.defer();
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); // returns an array

		if (this.lang) { // a data-lang attribute is included on the media element
			if ( Object.hasOwn( supportedLangs,this.lang ) ) {
				// the specified language is not supported
				if ( this.lang.indexOf('-') == 2 ) {
					// this is a localized lang attribute (e.g., fr-CA)
					// try the parent language, given the first two characters
					// if parent lang is supported. Use that, else null.
					this.lang = ( Object.hasOwn(supportedLangs,this.lang.substring(0,2)) !== -1 ) ? this.lang.substring(0,2) : null;
				} else {
					// this is not a localized language.
					// but maybe there's a similar localized language supported
					// that has the same parent?
					similarLangFound = false;
					for ( const [key,value] of Object.entries(supportedLangs) ) {
						if ( key.substring(0,2) == this.lang ) {
							this.lang = supportedLangs[i];
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
				if ( Object.hasOwn( supportedLangs,docLang ) ) {
					// the document language is supported
					this.lang = docLang;
				} else {
					// the document language is not supported
					if (docLang.indexOf('-') == 2) {
						// this is a localized lang attribute (e.g., fr-CA)
						// try the parent language, given the first two characters
						if ( Object.hasOwn(supportedLangs,docLang.substring(0,2)) ) {
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
		translationFile = this.rootPath + 'translations/' + this.lang + '.json';
		fetch(translationFile)
			.then( response => {
				return response.json();
			})
			.then( data => {
				thisObj.tt = data;
				thisObj.translationFiles = true;
				deferred.resolve();
			})
			.catch( error => {
				console.log( "Error: Translation files should be updated to JSON." + error,translationFile);
				translationFile = thisObj.rootPath + 'translations/' + thisObj.lang + '.js';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisObj.tt = data;
						thisObj.translationFiles = true;
						deferred.resolve();
					})
					.catch( error => {
						console.log( "Error: Unable to load translation file:", translationFile);
						thisObj.tt = {};
						thisObj.translationFiles = false;
						deferred.resolve();
					});
			});
		return deferred.promise();
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
			var thisObj, supportedLangs, thisLang, translationFile, thisText, translation;

			supportedLangs = this.getSupportedLangs();
			thisObj = this;

			this.sampleText = [];
			for ( const [key,value] of Object.entries(supportedLangs) ) {
				translationFile = this.rootPath + 'translations/' + key + '.json';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisText = data.sampleDescriptionText;
						translation = {'lang':thisLang, 'text': thisText};
						thisObj.sampleText.push(translation);
					});
			}
		}
	};

})(jQuery);
