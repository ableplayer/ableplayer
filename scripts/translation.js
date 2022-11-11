(function ($) {
	AblePlayer.prototype.getSupportedLangs = function() {
		// returns an array of languages for which AblePlayer has translation tables
		var langs = ['ca','cs','da','de','en','es','fr','he','id','it','ja','nb','nl','pt','pt-br','sv','tr','zh-tw'];
		return langs;
	};

	AblePlayer.prototype.getTranslationText = function() {

		// determine language, then get labels and prompts from corresponding translation var

		var deferred, thisObj, supportedLangs, docLang, msg, translationFile, collapsedLang, i, 
			similarLangFound;
		deferred = $.Deferred();
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); // returns an array

		if (this.lang) { // a data-lang attribute is included on the media element
			if ($.inArray(this.lang,supportedLangs) === -1) {
				// the specified language is not supported
				if (this.lang.indexOf('-') == 2) {
					// this is a localized lang attribute (e.g., fr-CA)
					// try the parent language, given the first two characters
					if ($.inArray(this.lang.substring(0,2),supportedLangs) !== -1) {
						// parent lang is supported. Use that.
						this.lang = this.lang.substring(0,2);
					}
					else {
						// the parent language is not supported either
						// unable to use the specified language
						this.lang = null;
					}
				}
				else {
					// this is not a localized language.
					// but maybe there's a similar localized language supported  
					// that has the same parent?  
					similarLangFound = false; 
					i = 0; 
					while (i < supportedLangs.length) { 
						if (supportedLangs[i].substring(0,2) == this.lang) { 
							this.lang = supportedLangs[i]; 				
							similarLangFound = true; 
						}
						i++; 
					}
					if (!similarLangFound) { 
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
			}
			else if ($('html').attr('lang')) {
				docLang = $('html').attr('lang').toLowerCase();
			}
			else {
				docLang = null;
			}
			if (docLang) {
				if ($.inArray(docLang,supportedLangs) !== -1) {
					// the document language is supported
					this.lang = docLang;
				}
				else {
					// the document language is not supported
					if (docLang.indexOf('-') == 2) {
						// this is a localized lang attribute (e.g., fr-CA)
						// try the parent language, given the first two characters
						if ($.inArray(docLang.substring(0,2),supportedLangs) !== -1) {
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
		translationFile = this.rootPath + 'translations/' + this.lang + '.js';
		$.getJSON(translationFile, function(data) {
			// success!
			thisObj.tt = data; 
			deferred.resolve(); 
		})
		.fail(function() {
			console.log( "Critical Error: Unable to load translation file:",translationFile);			
			thisObj.provideFallback();
			deferred.fail();
		})
		return deferred.promise();
	};

	AblePlayer.prototype.getSampleDescriptionText = function() {

		// Create an array of sample description text in all languages 
		// This needs to be readily available for testing different voices 
		// in the Description Preferences dialog 
		var thisObj, supportedLangs, i, thisLang, translationFile, thisText, translation; 
		
		supportedLangs = this.getSupportedLangs(); 

		thisObj = this; 

		this.sampleText = []; 
		for (i=0; i < supportedLangs.length; i++) { 
			translationFile = this.rootPath + 'translations/' + supportedLangs[i] + '.js';
			$.getJSON(translationFile, thisLang, (function(thisLang) {
					return function(data) { 
						thisText = data.sampleDescriptionText; 
						translation = {'lang':thisLang, 'text': thisText}; 
						thisObj.sampleText.push(translation); 						
					};
			}(supportedLangs[i])) // pass lang to callback function 
			); 				 
		}
	};

})(jQuery);
