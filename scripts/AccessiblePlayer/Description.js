export default class Description{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    // set default mode for delivering description (open vs closed)
    initDescription() {
        // The following variables are applicable to delivery of description:
        // prefDesc == 1 if user wants description (i.e., Description button is on); else 0
        // prefDescFormat == either 'video' or 'text' (as of v4.0.10, prefDescFormat is always 'video')
        // useDescFormat is the format actually used ('video' or 'text'), regardless of user preference
        // prevDescFormat is the value of useDescFormat before user toggled off description
        // prefDescPause == 1 to pause video when description starts; else 0
        // prefDescVisible == 1 to visibly show text-based description area; else 0
        // hasOpenDesc == true if a described version of video is available via data-desc-src attribute
        // hasClosedDesc == true if a description text track is available
        // descOn == true if description of either type is on
        // exposeTextDescriptions == true if text description is to be announced audibly; otherwise false

        var thisObj = this;
        if (this.ablePlayer.refreshingDesc) {
            this.ablePlayer.prevDescFormat = this.ablePlayer.useDescFormat;
        }
        else {
            this.ablePlayer.descFile = this.ablePlayer.$sources.first().attr('data-desc-src');
            if (typeof this.ablePlayer.descFile !== 'undefined') {
                this.ablePlayer.hasOpenDesc = true;
            }
            else {
                if (this.ablePlayer.youTubeDescId || this.ablePlayer.vimeoDescId) {
                    this.ablePlayer.hasOpenDesc = true;
                }
                else { // there are no open-described versions from any source
                    this.ablePlayer.hasOpenDesc = false;
                }
            }
        }

        // Set this.useDescFormat based on media availability & user preferences
        if (this.ablePlayer.prefDesc) {
            if (this.ablePlayer.hasOpenDesc && this.ablePlayer.hasClosedDesc) {
                // both formats are available. User gets their preference.
                this.ablePlayer.useDescFormat = this.ablePlayer.prefDescFormat;
                this.descOn = true;
            }
            else if (this.ablePlayer.hasOpenDesc) {
                this.ablePlayer.useDescFormat = 'video';
                this.ablePlayer.descOn = true;
            }
            else if (this.ablePlayer.hasClosedDesc) {
                this.ablePlayer.useDescFormat = 'text';
                this.ablePlayer.descOn = true;
            }
        }
        else {
            // prefDesc is not set for this user
            this.ablePlayer.useDescFormat = null;
            this.ablePlayer.descOn = false;
        }

        if (this.ablePlayer.useDescFormat === 'video') {
            // If text descriptions are also available, silence them
            this.ablePlayer.exposeTextDescriptions = false;
        }

        if (this.ablePlayer.descOn) {
            if (this.ablePlayer.useDescFormat === 'video') {
                if (!this.usingDescribedVersion()) {
                    // switched from non-described to described version
                    this.swapDescription();
                }
            }
            if (this.ablePlayer.hasClosedDesc) {
                if (this.ablePlayer.prefDescVisible) {
                    // make description text visible
                    // New in v4.0.10: Do this regardless of useDescFormat
                    this.ablePlayer.$descDiv.show();
                    this.ablePlayer.$descDiv.removeClass('able-clipped');
                }
                else {
                    // keep it visible to screen readers, but hide it visibly
                    this.ablePlayer.$descDiv.addClass('able-clipped');
                }
                if (!this.ablePlayer.swappingSrc) {
                    this.showDescription(this.ablePlayer.elapsed);
                }
            }
        }
        else { // description is off.
            if (this.ablePlayer.prevDescFormat === 'video') { // user has turned off described version of video
                if (this.usingDescribedVersion()) {
                    // user was using the described verion. Swap for non-described version
                    this.swapDescription();
                }
            }
            else if (this.ablePlayer.prevDescFormat === 'text') { // user has turned off text description
                // hide description div from everyone, including screen reader users
                this.ablePlayer.$descDiv.hide();
                this.ablePlayer.$descDiv.removeClass('able-clipped');
            }
        }
        this.refreshingDesc = false;
    };

    // Returns true if currently using audio description, false otherwise.
    usingAudioDescription() {

        if (this.player === 'youtube') {
            return (this.activeYouTubeId === this.youTubeDescId);
        } else {
            return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
        }
    };

    // swap described and non-described source media, depending on which is playing
    swapDescription() {
        var i, origSrc, descSrc, srcType;
        this.ablePlayer.swapTime = this.ablePlayer.elapsed;
        if (this.ablePlayer.descOn) {
            this.ablePlayer.control.showAlert(this.ablePlayer.tt.alertDescribedVersion);
        }
        else {
            this.ablePlayer.control.showAlert(this.ablePlayer.tt.alertNonDescribedVersion);
        }
        if (this.ablePlayer.player === 'html5') {

            if (this.usingDescribedVersion()) {
                for (i=0; i < this.ablePlayer.$sources.length; i++) {
                    // for all <source> elements, replace src with data-orig-src
                    origSrc = this.ablePlayer.$sources[i].getAttribute('data-orig-src');
                    srcType = this.ablePlayer.$sources[i].getAttribute('type');
                    if (origSrc) {
                        this.ablePlayer.$sources[i].setAttribute('src',origSrc);
                    }
                }
                this.ablePlayer.swappingSrc = true;
            }
            else {
                for (i=0; i < this.ablePlayer.$sources.length; i++) {
                    origSrc = this.ablePlayer.$sources[i].getAttribute('src');
                    descSrc = this.ablePlayer.$sources[i].getAttribute('data-desc-src');
                    srcType = this.ablePlayer.$sources[i].getAttribute('type');
                    if (descSrc) {
                        this.ablePlayer.$sources[i].setAttribute('src',descSrc);
                        this.ablePlayer.$sources[i].setAttribute('data-orig-src',origSrc);
                    }
                }
                this.swappingSrc = true;
            }

            // now reload the source file.
            if (this.ablePlayer.player === 'html5') {
                this.ablePlayer.media.load();
            }
        }
    };

    showDescription(now) {
        if (!this.ablePlayer.exposeTextDescriptions || this.ablePlayer.swappingSrc || !this.ablePlayer.descOn) {
            return;
        }
        var thisObj, i, cues, d, thisDescription, descText, msg;
        var flattenComponentForDescription = function (component) {
            var result = [];
            if (component.type === 'string') {
                result.push(component.value);
            }
            else {
                for (var i = 0; i < component.children.length; i++) {
                    result.push(flattenComponentForDescription(component.children[i]));
                }
            }
            return result.join('');
        };

        if (this.ablePlayer.selectedDescriptions) {
            cues = this.ablePlayer.selectedDescriptions.cues;
        }
        else if (this.ablePlayer.descriptions.length >= 1) {
            cues = this.ablePlayer.descriptions[0].cues;
        }
        else {
            cues = [];
        }
        for (d = 0; d < cues.length; d++) {
            if ((cues[d].start <= now) && (cues[d].end > now)) {
                thisDescription = d;
                break;
            }
        }
        if (typeof thisDescription !== 'undefined') {
            if (this.ablePlayer.currentDescription !== thisDescription) {
                // temporarily remove aria-live from $status in order to prevent description from being interrupted
                this.ablePlayer.$status.removeAttr('aria-live');
                descText = flattenComponentForDescription(cues[thisDescription].components);
                if (window.speechSynthesis) {
                    this.announceDescriptionText('description',descText);
                    if (this.ablePlayer.prefDescVisible) {
                        this.ablePlayer.$descDiv.html(descText).removeAttr('aria-live aria-atomic');
                    }
                }
                else {
                    this.ablePlayer.$descDiv.html(descText);
                }
                if (this.ablePlayer.prefDescPause && this.ablePlayer.exposeTextDescriptions) {
                    this.ablePlayer.control.pauseMedia();
                    this.ablePlayer.pausedForDescription = true;
                }
                this.ablePlayer.currentDescription = thisDescription;
            }
        }
        else {
            this.ablePlayer.$descDiv.html('');
            this.ablePlayer.currentDescription = -1;
            this.ablePlayer.$status.attr('aria-live','polite');
        }
    };

    //to delete
    /**
     * Associe les voices du Navigateur aux tracks du basePlayer
     * @returns {boolean}
     */
    getBrowserVoices() {
        var voices, descLangs, voiceLang, playerLang;
        if (window.speechSynthesis) {
            this.ablePlayer.synth = window.speechSynthesis;
            voices = this.ablePlayer.synth.getVoices();
            descLangs = this.getDescriptionLangs();
            if (voices.length > 0) {
                this.ablePlayer.descVoices = [];
                for (var i=0; i<voices.length; i++) {
                    voiceLang = voices[i].lang.substr(0,2).toLowerCase();
                    playerLang = this.ablePlayer.lang.substr(0,2).toLowerCase();
                    if (voiceLang === playerLang || (descLangs.indexOf(voiceLang) !== -1)) {
                        this.ablePlayer.descVoices.push(voices[i]);
                    }
                }
                if (!this.ablePlayer.descVoices.length) {
                    this.ablePlayer.descVoices = voices;
                }
            }
        }
        return false;
    }

    //to delete
    /**
     * retourne un tableau de langue pour des tracks definissant une description
     * returns an array of languages (from srclang atttributes)
     * @returns {[]}
     */
    getDescriptionLangs() {
        var descLangs = [];
        if (this.ablePlayer.tracks) {
            for (var i=0; i < this.ablePlayer.tracks.length; i++) {
                if (this.ablePlayer.tracks[i].kind === 'descriptions') {
                    descLangs.push(this.ablePlayer.tracks[i].language.substr(0,2).toLowerCase());
                }
            }
        }
        return descLangs;
    };

    //to delete
    // Called if user chooses a subtitle language for which there is a matching
    updateDescriptionVoice () {
        var voices, descVoice;
        if (!this.ablePlayer.descVoices) {
            this.getBrowserVoices();
            if (this.ablePlayer.descVoices) {
                this.ablePlayer.preference.rebuildDescPrefsForm();
            }
        }
        else if (!this.ablePlayer.$voiceSelectField) {
            this.ablePlayer.preference.rebuildDescPrefsForm();
        }

        descVoice = this.ablePlayer.selectedDescriptions.language;

        if (this.ablePlayer.synth) {
            voices = this.ablePlayer.synth.getVoices();
            if (voices.length > 0) {
                for (var i=0; i<voices.length; i++) {
                    if (voices[i].lang.substr(0,2).toLowerCase() === descVoice.substr(0,2).toLowerCase()) {
                        this.ablePlayer.prefDescVoice = voices[i].name;
                        if (this.ablePlayer.$voiceSelectField) {
                            this.ablePlayer.$voiceSelectField.val(this.ablePlayer.prefDescVoice);
                        }
                        break;
                    }
                }
            }
        }
    };

    //to delete
    // Returns true if currently using audio description, false otherwise.
    usingDescribedVersion () {
        if (this.ablePlayer.player !== 'youtube' || this.ablePlayer.player !== 'vimeo') {
            return (this.ablePlayer.$sources.first().attr('data-desc-src') === this.ablePlayer.$sources.first().attr('src'));
        }
    };

    //to delete
    // this function announces description text using speech synthesis
    announceDescriptionText(context, text) {
        var thisObj, speechTimeout, voiceName, i, voice, pitch, rate, volume, utterance;

        thisObj = this;
        var useFirstVoice = false;

        if (!this.ablePlayer.descVoices) {
            this.getBrowserVoices();
        }

        if (context === 'sample') {
            // get settings from form
            voiceName = $('#' + this.ablePlayer.mediaId + '_prefDescVoice').val();
            pitch = $('#' + this.ablePlayer.mediaId + '_prefDescPitch').val();
            rate = $('#' + this.ablePlayer.mediaId + '_prefDescRate').val();
            volume = $('#' + this.ablePlayer.mediaId + '_prefDescVolume').val();
        }
        else {
            // get settings from global prefs
            voiceName = this.ablePlayer.prefDescVoice;
            pitch = this.ablePlayer.prefDescPitch;
            rate = this.ablePlayer.prefDescRate;
            volume = this.ablePlayer.prefDescVolume;
        }

        // get the voice associated with the user's chosen voice name
        if (this.ablePlayer.descVoices) {
            if (this.ablePlayer.descVoices.length > 0) {
                if (useFirstVoice) {
                    voice = this.ablePlayer.descVoices[0];
                }
                else if (voiceName) {
                    // get the voice that matches user's preferred voiceName
                    for (i = 0; i < this.ablePlayer.descVoices.length; i++) {
                        if (this.ablePlayer.descVoices[i].name == voiceName) {
                            voice = this.ablePlayer.descVoices[i];
                            break;
                        }
                    }
                }
                if (typeof voice === 'undefined') {
                    voice = this.ablePlayer.descVoices[0];
                }

                utterance = new SpeechSynthesisUtterance();
                utterance.voice = voice;
                utterance.voiceURI = 'native';
                utterance.volume = volume;
                utterance.rate = rate;
                utterance.pitch = pitch;
                utterance.text = text;
                utterance.lang = this.ablePlayer.lang;
                utterance.onend = (e) => {
                    // do something after speaking
                    console.log('Finished speaking. That took ' + (e.elapsedTime/1000).toFixed(2) + ' seconds.');
                    if (context === 'description') {
                        if (this.ablePlayer.prefDescPause) {
                            if (this.ablePlayer.pausedForDescription && this.ablePlayer.exposeTextDescriptions) {
                                this.ablePlayer.control.playMedia();
                                this.ablePlayer.pausedForDescription = false;
                            }
                        }
                    }
                };
                utterance.onerror = function(e) {
                    // handle error
                    console.log('Web Speech API error',e);
                }
                this.ablePlayer.synth.speak(utterance);
            }
        }
    };


}