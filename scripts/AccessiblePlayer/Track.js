import Langs from "./Langs.js";

export default class Track{


    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    setWebVTT( webVTT ){
        this.webVTT = webVTT;
        return this;
    }

    /**
     * ajoute des sous-titres ( captions ) et des descritions et des chapters et des meta-donnees au basePlayer depuis les tracks et captions
     * @returns Promise
     */
    setupTracks () {
        var deferred, promise, loadingPromises, loadingPromise, i, tracks, track;
        deferred = new $.Deferred();
        promise = deferred.promise();

        loadingPromises = [];
        this.$tracks = this.ablePlayer.$media.find('track');

        this.captions = [];
        this.captionLabels = [];
        this.descriptions = [];
        this.chapters = [];
        this.meta = [];

        for (var ii = 0; ii < this.$tracks.length; ii++) {
            var track = this.$tracks[ii];
            var kind = track.getAttribute('kind');
            var trackSrc = track.getAttribute('src');

            var isDefaultTrack = track.getAttribute('default');

            if (!trackSrc) {
                // Nothing to load!
                continue;
            }

            var loadingPromise = this.loadTextObject(trackSrc);
            loadingPromises.push(loadingPromise);
            loadingPromise.then((track, kind) => {
                return function (trackSrc, trackText) {
                    var cues = this.ablePlayer.webVTT.parseWebVTT(trackSrc, trackText).cues;
                    if (kind === 'captions' || kind === 'subtitles') {
                        this.setupCaptions(track, cues);
                    } else if (kind === 'descriptions') {
                        this.ablePlayer.setupDescriptions(track, cues);
                    } else if (kind === 'chapters') {
                        this.ablePlayer.setupChapters(track, cues);
                    } else if (kind === 'metadata') {
                        this.ablePlayer.setupMetadata(track, cues);
                    }
                }
            })(track, kind);
        }

        $.when.apply($, loadingPromises).then(function () {
            deferred.resolve();
        });

        return promise;
    };

    /**
     * insère les sous-titres dans le DOM grace aux tracks,
     * @param track
     * @param trackLang
     * @param trackLabel
     * @param cues
     */
    setupCaptions(track, trackLang, trackLabel, cues) {
        this.ablePlayer.hasCaptions = true;
        var trackLang = track.getAttribute('srclang') || this.ablePlayer.lang;
        var trackLabel = track.getAttribute('label') || Langs.getLanguageName(trackLang);
        if (typeof track.getAttribute('default') == 'string') {
            var isDefaultTrack = true;
            track.removeAttribute('default');
        } else {
            var isDefaultTrack = false;
        }
        if (this.ablePlayer.mediaType === 'video') {
            if (!this.ablePlayer.$captionsDiv) {
                this.ablePlayer.$captionsDiv = $('<div>', {
                    'class': 'able-captions',
                });
                if (this.ablePlayer.preference.getCookie()['preferences']['prefModeUsage'] === 'auditionPlus') {
                    this.ablePlayer.$captionsDiv.addClass('audplus');
                }
                this.ablePlayer.$captionsWrapper = $('<div>', {
                    'class': 'able-captions-wrapper',
                    'aria-hidden': 'true',
                    'width': (this.ablePlayer.$playerDiv.width()) + 'px',
                }).hide();
                if (this.ablePlayer.prefCaptionsPosition === 'below') {
                    this.ablePlayer.$captionsWrapper.addClass('able-captions-below');
                } else {
                    this.ablePlayer.$captionsWrapper.addClass('able-captions-overlay');
                }
                this.ablePlayer.$captionsWrapper.append(this.ablePlayer.$captionsDiv);
                this.ablePlayer.$vidcapContainer.append(this.ablePlayer.$captionsWrapper);
            }
        }

        this.currentCaption = -1;
        if (this.ablePlayer.prefCaptions === 1) {
            // Captions default to on.
            this.captionsOn = true;
            $('#subt').attr('aria-pressed', 'true');
            $('#subt').attr('aria-label', this.ablePlayer.tt.de_act_st_label);
            $('#subt').addClass('aria-no-checked');
            $('#subt').text('');
            //$('#subt').addClass('subtno')
            $('#subt').prop('disabled', false);
            $('#subt').append("<span id=\"\">" + this.ablePlayer.tt.de_act_st_general + "</span>");
        } else {
            $('#subt').prop('disabled', true);
            this.ablePlayer.captionsOn = false;
        }

        if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {
            // Remove the "Unknown" option from the select box.
            if (this.ablePlayer.$unknownTranscriptOption) {
                this.ablePlayer.$unknownTranscriptOption.remove();
                this.ablePlayer.$unknownTranscriptOption = null;
            }
            var option = $('<option></option>', {
                value: trackLang,
                lang: trackLang
            }).text(trackLabel);
        }
        // alphabetize tracks by label
        if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {
            var options = this.ablePlayer.$transcriptLanguageSelect.find('option');
        }
        if (this.ablePlayer.captions.length === 0) { // this is the first
            this.ablePlayer.captions.push({
                'cues': cues,
                'language': trackLang,
                'label': trackLabel,
                'def': isDefaultTrack
            });
            if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {
                if (isDefaultTrack) {
                    option.prop('selected', true);
                }
                this.ablePlayer.$transcriptLanguageSelect.append(option);
            }
            this.ablePlayer.captionLabels.push(trackLabel);
        } else { // there are already tracks in the array
            var inserted = false;
            for (var i = 0; i < this.ablePlayer.captions.length; i++) {
                var capLabel = this.ablePlayer.captionLabels[i];
                if (trackLabel.toLowerCase() < this.ablePlayer.captionLabels[i].toLowerCase()) {
                    // insert before track i
                    this.ablePlayer.captions.splice(i, 0, {
                        'cues': cues,
                        'language': trackLang,
                        'label': trackLabel,
                        'def': isDefaultTrack
                    });
                    if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {
                        if (isDefaultTrack) {
                            option.prop('selected', true);
                        }
                        option.insertBefore(options.eq(i));
                    }
                    this.ablePlayer.captionLabels.splice(i, 0, trackLabel);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                // just add track to the end
                this.ablePlayer.captions.push({
                    'cues': cues,
                    'language': trackLang,
                    'label': trackLabel,
                    'def': isDefaultTrack
                });
                if (this.ablePlayer.transcriptType === 'external' || this.ablePlayers.transcriptType === 'popup') {
                    if (isDefaultTrack) {
                        option.prop('selected', true);
                    }
                    this.ablePlayer.$transcriptLanguageSelect.append(option);
                }
                this.ablePlayer.captionLabels.push(trackLabel);
            }
        }
        if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {
            if (this.ablePlayer.$transcriptLanguageSelect.find('option').length > 1) {
                // More than one option now, so enable the select.
                this.ablePlayer.$transcriptLanguageSelect.prop('disabled', false);
            }
        }
    };

    /**
     * Ajoute une description
     * @param track
     * @param cues
     * @param trackLang
     */
    setupDescriptions (track, cues, trackLang) {
        var trackLang = track.getAttribute('srclang') || this.ablePlayer.lang;
        this.ablePlayer.hasClosedDesc = true;
        this.ablePlayer.currentDescription = -1;
        this.ablePlayer.descriptions.push({
            cues: cues,
            language: trackLang
        });
    };

    /**
     * Ajoute un chapitre
     * @param track
     * @param cues
     * @param trackLang
     */
    setupChapters(track, cues, trackLang) {
        var trackLang = track.getAttribute('srclang') || this.ablePlayer.lang;
        this.ablePlayer.hasChapters = true;
        this.ablePlayer.chapters.push({
            cues: cues,
            language: trackLang
        });
    };

    /**
     * Ajoute des Meta-Données
     * @param track
     * @param cues
     */
    setupMetadata(track, cues) {
        if (this.ablePlayer.metaType === 'text') {
            if (this.ablePlayer.metaDiv) {
                if ($('#' + this.ablePlayer.metaDiv)) {
                    // container exists
                    this.ablePlayer.$metaDiv = $('#' + this.ablePlayer.metaDiv);
                    this.ablePlayer.hasMeta = true;
                    this.ablePlayer.meta = cues;
                }
            }
        }
        else if (this.ablePlayer.metaType === 'selector') {
            this.ablePlayer.hasMeta = true;
            this.ablePlayer.visibleSelectors = [];
            this.ablePlayer.meta = cues;
        }
    };

    /**
     * renvoie le track sous forme de texte associé à la source
     * @param src
     * @returns
     */
    loadTextObject (src) {
        var deferred, promise, $tempDiv;
        deferred = new $.Deferred();
        promise = deferred.promise();

        $tempDiv = $('<div>',{
            style: 'display:none'
        });
        $tempDiv.load(src,(trackText, status, req) => {
            if (status === 'error') {
                if (this.ablePlayer.debug) {
                    console.log ('error reading file ' + src + ': ' + status);
                }
                deferred.reject(src);
            }
            else {
                deferred.resolve(src, trackText);
            }
            $tempDiv.remove();
        });
        return promise;
    };

    // setup captions from an alternative source (not <track> elements)
    setupAltCaptions () {
        var deferred = new $.Deferred();
        var promise = deferred.promise();

        if (this.ablePlayer.captions.length === 0) {
            if (this.ablePlayer.player === 'youtube' && typeof youTubeDataAPIKey !== 'undefined') {
                /*this.setupYouTubeCaptions().done(function () {
                    deferred.resolve();
                });*/
            } else {
                // repeat for other alt sources once supported (e.g., Vimeo, DailyMotion)
                deferred.resolve();
            }
        } else { // there are <track> captions, so no need for alt source captions
            deferred.resolve();
        }
        return promise;
    };

    //delete
    /**
     * retourne une liste de Tracks associée au media et defini la langue de ce track et pour les caption aussi
     * define an array tracks
     * @returns Promise
     */
    getTracks() {
        var thisObj, deferred, promise, captionTracks, trackLang, trackLabel, isDefault,
            i, j, capLabel, inserted;
        thisObj = this.ablePlayer;
        deferred = new $.Deferred();
        promise = deferred.promise();

        this.ablePlayer.$tracks = this.ablePlayer.$media.find('track');
        this.ablePlayer.tracks = [];
        captionTracks = [];
        this.ablePlayer.captions = [];

        if (this.ablePlayer.$tracks.length) {
            this.ablePlayer.$tracks.each(function() {
                if ($(this).attr('srclang')) {
                    trackLang = $(this).attr('srclang');
                }
                else {
                    trackLang = thisObj.lang;
                }
                if ($(this).attr('label')) {
                    trackLabel = $(this).attr('label');
                }
                else {
                    trackLabel = Langs.getLanguageName(trackLang);
                }

                if ($(this).attr('default')) {
                    isDefault = true;
                }
                else if (trackLang === thisObj.lang) {
                    isDefault = true;
                }
                else {
                    isDefault = false;
                }

                if (isDefault) {
                    thisObj.captionLang = trackLang;
                }

                thisObj.tracks.push({
                    'kind': $(this).attr('kind'),
                    'src': $(this).attr('src'),
                    'language': trackLang,
                    'label': trackLabel,
                    'def': isDefault
                });

                if ($(this).attr('kind') === 'captions' || $(this).attr('kind') == 'subtitles') {
                    captionTracks.push({
                        'kind': $(this).attr('kind'),
                        'src': $(this).attr('src'),
                        'language': trackLang,
                        'label': trackLabel,
                        'def': isDefault
                    });
                }
            });
        }

        if (captionTracks.length) {
            this.ablePlayer.usingYouTubeCaptions = false;
            this.ablePlayer.usingVimeoCaptions = false;
            for (i = 0; i < captionTracks.length; i++) {
                if (this.ablePlayer.captions.length === 0) {
                    this.ablePlayer.captions.push({
                        'language': captionTracks[i].language,
                        'label': captionTracks[i].label,
                        'def': captionTracks[i].def
                    });
                }
                else {
                    inserted = false;
                    for (j = 0; j < this.ablePlayer.captions.length; j++) {
                        capLabel = captionTracks[i].label;
                        if (capLabel.toLowerCase() < this.ablePlayer.captions[j].label.toLowerCase()) {
                            this.ablePlayer.captions.splice(j,0,{
                                'language': captionTracks[i].language,
                                'label': captionTracks[i].label,
                                'def': captionTracks[i].def
                            });
                            inserted = true;
                            break;
                        }
                    }
                    if (!inserted) {
                        this.ablePlayer.captions.push({
                            'language': captionTracks[i].language,
                            'label': captionTracks[i].label,
                            'def': captionTracks[i].def
                        });
                    }
                }
            }
            deferred.resolve();
        }
        else {
            if (this.ablePlayer.player === 'youtube') {
                //
            }
            else if (this.ablePlayer.player === 'vimeo') {
                //
            }
            else {
                this.ablePlayer.hasCaptions = false;
                deferred.resolve();
            }
        }
        return promise;
    };














}