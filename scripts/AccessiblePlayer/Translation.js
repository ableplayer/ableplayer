export default class Translation{

    setAblePlayer( value ){
        this.ablePlayer = value;
        return this;
    }

    /**
     * cette fontrion renvoie un tableau de langue sous forme encodée xx ou xx-xx
     * @returns {string[]}
     */
    getSupportedLangs() {
        var langs = ['ca','cs','de','en','es','fr','he','id','it','ja','nb','nl','pt-br','sv','tr','zh-tw'];
        return langs;
    };

    /**
     * cette fonction initialise le prop de translation tt du basePlayer pour les popups en fonction de la langue lang
     * @returns {Promise<null>}
     */
    async getTranslationText() {
        // determine language, then get labels and prompts from corresponding translation var
        var deferred, thisObj, lang, thisObj, msg, translationFile;
        thisObj = this;

        // override this.lang to language of the web page, if known and supported
        // otherwise this.lang will continue using default
        if (!this.ablePlayer.forceLang) {
            if ($('body').attr('lang')) {
                lang = $('body').attr('lang');
            } else if ($('html').attr('lang')) {
                lang = $('html').attr('lang');
            }
            if (lang !== this.ablePlayer.lang) {
                msg = 'Language of web page (' + lang + ') ';
                if ($.inArray(lang, this.getSupportedLangs()) !== -1) {
                    // this is a supported lang
                    msg += ' has a translation table available.';
                    this.ablePlayer.lang = lang;
                } else {
                    msg += ' is not currently supported. Using default language (' + this.ablePlayer.lang + ')';
                }
                if (this.ablePlayer.debug) {
                    console.log(msg);
                }
            }
        }
        translationFile = this.ablePlayer.rootPath + 'translations/' + this.ablePlayer.lang + '.js';
        await this.importTranslationFile(translationFile).then(function (result) {
            thisObj.ablePlayer.tt = JSON.parse(result) //eval(thisObj.ablePlayer.lang);
            return thisObj.ablePlayer.tt;
        });
        return null;
    };

    async importTranslationFile (translationFile) {
        await $.getScript(translationFile)
            .done(function (translationVar, textStatus) {
                return translationVar;
            });
        return null
    };


}