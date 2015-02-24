(function ($) {
  AblePlayer.prototype.getSupportedLangs = function() {
    // returns an array of languages for which AblePlayer has translation tables 
    var langs = ['en','de'];
    return langs;
  };

  AblePlayer.prototype.getTranslationText = function() { 
    // determine language, then get labels and prompts from corresponding translation file (in JSON)
    // finally, populate this.tt object with JSON data
    // return true if successful, otherwise false 
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
    thisObj = this;
    // get content of JSON file 
    $.getJSON(this.translationPath + this.lang + '.js',
              function(data, textStatus, jqxhr) { 
                if (textStatus === 'success') { 
                  thisObj.tt = data;
                  if (thisObj.debug) { 
                    console.log('Successfully assigned JSON data to trans');
                    console.log(thisObj.tt);           
                  }
                }
                else { 
                  return false; 
                }
              }
             ).then( 
               function(){ // success 
                 // resolve deferred variable
                 gettingText.resolve();  
               },
               function() { // failure 
                 return false; 
               }
             );
    return gettingText.promise(); 
  };
})(jQuery);
