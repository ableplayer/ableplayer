(function ($) {
  AblePlayer.prototype.getSupportedLangs = function() {
    // returns an array of languages for which AblePlayer has translation tables
    // Removing 'nl' as of 2.3.54, pending updates
    var langs = ['de','en','es','fr'];
    return langs;
  };

  AblePlayer.prototype.getTranslationText = function() {

    // determine language, then get labels and prompts from corresponding translation var
    var gettingText, lang, thisObj, msg;

    gettingText = $.Deferred();

    // override this.lang to language of the web page, if known and supported
    // otherwise this.lang will continue using default
    if (!this.forceLang) {
      if ($('body').attr('lang')) {
        lang = $('body').attr('lang');
      }
      else if ($('html').attr('lang')) {
        lang = $('html').attr('lang');
      }
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

    // in final build, all language variables are contatenated into this function below...
    // translation2.js is then contanenated onto the end to finish this function

