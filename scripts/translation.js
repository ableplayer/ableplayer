(function ($) {
	AblePlayer.prototype.getSupportedLangs = function() {
		// returns an array of languages for which AblePlayer has translation tables
		var langs = ['ca','de','en','es','fr','he','it','ja','nb','nl','pt-br','tr','zh-tw'];
		return langs;
	};

	AblePlayer.prototype.getTranslationText = function() {
		// determine language, then get labels and prompts from corresponding translation var
		var deferred, thisObj, lang, thisObj, msg, translationFile, collapsedLang;
		deferred = $.Deferred();

		thisObj = this;
		// get language of the web page, if specified
		if ($('body').attr('lang')) {
			lang = $('body').attr('lang');
		}
		else if ($('html').attr('lang')) {
			lang = $('html').attr('lang');
		}
		else {
			lang = null;
		}

		// override this.lang to language of the web page, if known and supported
		// otherwise this.lang will continue using default
		if (!this.forceLang) {
			if (lang) {
				if (lang !== this.lang) {
					if ($.inArray(lang,this.getSupportedLangs()) !== -1) {
						// this is a supported lang
						this.lang = lang;
					}
					else {
						msg = lang + ' is not currently supported. Using default language (' + this.lang + ')';
						if (this.debug) {
							console.log(msg);
						}
					}
				}
			}
		}
		if (!this.searchLang) {
			this.searchLang = this.lang;
		}
		translationFile = this.rootPath + 'translations/' + this.lang + '.js';
		this.importTranslationFile(translationFile).then(function(result) {
			collapsedLang = thisObj.lang.replace('-','');
			thisObj.tt = eval(collapsedLang);
			deferred.resolve();
		});
		return deferred.promise();
	};

	AblePlayer.prototype.importTranslationFile = function(translationFile) {

		var deferred = $.Deferred();
		$.getScript(translationFile)
			.done(function(translationVar,textStatus) {
				// translation file successfully retrieved
				deferred.resolve(translationVar);
			})
			.fail(function(jqxhr, settings, exception) {
				deferred.fail();
				// error retrieving file
				// TODO: handle this
			});
		return deferred.promise();
	};

})(jQuery);
