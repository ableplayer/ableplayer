import $ from 'jquery';
import AblePlayer from './ableplayer-base';

function importAndGetTranslation(lang){
  var deferred = $.Deferred();
  switch(lang) {
    case 'ca':
      deferred.resolve(require('../translations/ca'));
      break;
    case 'de':
      deferred.resolve(require('../translations/de'));
      break;
    case 'es':
      deferred.resolve(require('../translations/es'));
      break;
    case 'fr':
      deferred.resolve(require('../translations/fr'));
      break;
    case 'he':
      deferred.resolve(require('../translations/he'));
      break;
    case 'it':
      deferred.resolve(require('../translations/it'));
      break;
    case 'ja':
      deferred.resolve(require('../translations/js'));
      break;
    case 'nb':
      deferred.resolve(require('../translations/nb'));
      break;
    case 'en':
    default:
      deferred.resolve(require('../translations/en'));
  }
  return deferred.promise();
}

AblePlayer.prototype.getSupportedLangs = function() {
  // returns an array of languages for which AblePlayer has translation tables
  // Removing 'nl' as of 2.3.54, pending updates
  var langs = ['ca','de','en','es','fr','he','it','ja','nb'];
  return langs;
};

AblePlayer.prototype.getTranslationText = function() {
  // determine language, then get labels and prompts from corresponding translation var
  var deferred, thisObj, lang, thisObj, msg, translationFile;
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
        msg = 'Language of web page (' + lang +') ';
        if ($.inArray(lang,this.getSupportedLangs()) !== -1) {
          // this is a supported lang
          msg += ' has a translation table available.';
          this.lang = lang;
        }
        else {
          msg += ' is not currently supported. Using default language (' + this.lang + ')';
        }
        if (this.debug) {
          console.log(msg);
        }
      }
    }
  }
  if (!this.searchLang) {
    this.searchLang = this.lang;
  }
  importAndGetTranslation(this.lang).then(function(result) {
    deferred.resolve(result);
  });
  return deferred.promise();
};


