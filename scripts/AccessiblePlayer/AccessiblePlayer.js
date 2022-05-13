import Misc from "./Misc.js";
import AccessiblePlayerFactory from "./AccessiblePlayerFactory.js";
import AccessibleSlider from "./AccessibleSlider.js";

export default class AccessiblePlayer {

    static nextIndex = 0;
    static youtubeIframeAPIReady = false;
    static loadingYoutubeIframeAPI = false;

    /**
     * Construct the Accessible Player Object
     * @param media
     */
    constructor(media) {
        this.media = media;
        this.build();
    }

    settInitialize(initialize) {
        this.initialize = initialize;
        return this;
    }

    setTranslation(translation) {
        this.translation = translation;
        return this;
    }

    setTranscript(transcript) {
        this.transcript = transcript;
        return this;
    }

    setControl(control) {
        this.control = control;
        return this;
    }

    setBrowser(browser) {
        this.browser = browser;
        return this;
    }

    setSign(sign) {
        this.sign = sign;
        return this;
    }

    setPreference(preference) {
        this.preference = preference;
        return this;
    }

    setDragDrop(dragDrop) {
        this.dragDrop = dragDrop;
        return this;
    }

    setDialog(dialog) {
        this.dialog = dialog;
        return this;
    }

    setWebVTT(webVTT) {
        this.webVTT = webVTT;
        return this;
    }

    setTrack(track) {
        this.track = track;
        return this;
    }

    setDescription(description) {
        this.description = description;
        return this;
    }

    setChapter(chapter) {
        this.chapter = chapter;
        return this;
    }

    setVolumeI(volumeI) {
        this.volumeI = volumeI;
        return this;
    }

    setCaption(caption) {
        this.caption = caption;
        return this;
    }

    setCustomEvent(customEvent) {
        this.customEvent = customEvent;
        return this;
    }

    setMetadata(metadata) {
        this.metadata = metadata;
        return this;
    }

    setVts(vts) {
        this.vts = vts;
        return this;
    }

    setSearch(searchI) {
        this.searchI = searchI;
        return this;
    }

    build() {
        let searchI = AccessiblePlayerFactory.getInstanceSearch().setAblePlayer(this);
        let vts = AccessiblePlayerFactory.getInstanceVts().setAblePlayer(this);
        let metadata = AccessiblePlayerFactory.getInstanceMetadata().setAblePlayer(this);
        let customEvent = AccessiblePlayerFactory.getInstanceCustomEvent().setAblePlayer(this);
        let description = AccessiblePlayerFactory.getInstanceDescription().setAblePlayer(this);
        let caption = AccessiblePlayerFactory.getInstanceCaption().setAblePlayer(this);
        let volumeI = AccessiblePlayerFactory.getInstanceVolume().setAblePlayer(this);
        let browser = AccessiblePlayerFactory.getInstanceBrowser().setAblePlayer(this);
        let preference = AccessiblePlayerFactory.getInstancePreference().setAblePlayer(this);
        let translation = AccessiblePlayerFactory.getInstanceTranslation().setAblePlayer(this);
        let control = AccessiblePlayerFactory.getInstanceControl().setAblePlayer(this).setPreference(preference);
        let dragDrop = AccessiblePlayerFactory.getInstanceDragDrop().setAblePlayer(this).setControl(control).setPreference(preference);
        let transcript = AccessiblePlayerFactory.getInstanceTranscript().setAblePlayer(this).setDragDrop(dragDrop);
        let sign = AccessiblePlayerFactory.getInstanceSign().setAblePlayer(this).setBrowser(browser).setDragDrop(dragDrop);
        //let dialog = AccessiblePlayerFactory.getInstanceDialog().setAblePlayer( this );
        let webVTT = AccessiblePlayerFactory.getInstanceWebVTT().setAblePlayer(this);
        let track = AccessiblePlayerFactory.getInstanceTrack().setAblePlayer(this).setWebVTT(webVTT);
        let initialize = AccessiblePlayerFactory.getInstanceInitialize().setAblePlayer(this).setBrowser(browser).setPreference(preference).setSign(sign).setDescription(description).setTranscript(transcript).setTrack(track).setControl(control).setVolumeI(volumeI);
        let chapter = AccessiblePlayerFactory.getInstanceChapter().setAblePlayer(this);
        this.settInitialize(initialize).setTranslation(translation).setTranscript(transcript).setControl(control).setPreference(preference).setBrowser(browser).setDragDrop(dragDrop).setSign(sign).setTrack(track).setWebVTT(webVTT).setDescription(description).setChapter(chapter).setVolumeI(volumeI).setCaption(caption).setCustomEvent(customEvent).setMetadata(metadata).setVts(vts).setSearch(searchI);
        this.initDefaultVariables(this.media);
    }

    static getInstance() {
        return this;
    }

    // inits default variables of The AccessiblePlayer
    async initDefaultVariables(media) {

        if ($(media).length === 0) {
            this.provideFallback();
            return;
        }

        if ($(media).attr('autoplay') !== undefined) {
            this.autoplay = true;
        } else {
            this.autoplay = false;
        }

        if ($(media).attr('loop') !== undefined) {
            this.loop = true;
        } else {
            this.loop = false;
        }

        if ($(media).attr('playsinline') !== undefined) {
            this.playsInline = '1';
        } else {
            this.playsInline = '0';
        }

        if ($(media).attr('poster')) {
            this.hasPoster = true;
        } else {
            this.hasPoster = false;
        }

        if ($(media).data('start-time') !== undefined && $.isNumeric($(media).data('start-time'))) {
            this.startTime = $(media).data('start-time');
        } else {
            this.startTime = 0;
        }

        if ($(media).data('root-path') !== undefined) {
            this.rootPath = $(media).data('root-path').replace(/\/?$/, '/');
        } else {
            this.rootPath = await this.initialize.getRootPath();

            this.defaultVolume = 7;
            if ($(media).data('volume') !== undefined && $(media).data('volume') !== "") {
                var volume = $(media).data('volume');
                if (volume >= 0 && volume <= 10) {
                    this.defaultVolume = volume;
                }
            }
            this.volume = this.defaultVolume;
            if ($(media).data('use-chapters-button') !== undefined && $(media).data('use-chapters-button') === false) {
                this.useChaptersButton = false;
            } else {
                this.useChaptersButton = true;
            }

            if ($(media).data('use-descriptions-button') !== undefined && $(media).data('use-descriptions-button') === false) {
                this.useDescriptionsButton = false;
            } else {
                this.useDescriptionsButton = true;
            }

            this.transcriptType = null;
            if ($(media).data('transcript-src') !== undefined) {
                this.transcriptSrc = $(media).data('transcript-src');
                if (await this.transcript.transcriptSrcHasRequiredParts()) {
                    this.transcriptType = 'manual';
                } else {
                    this.transcriptType = null;
                }
            } else if ($(media).find('track[kind="captions"], track[kind="subtitles"]').length > 0) {
                if ($(media).data('transcript-div') !== undefined && $(media).data('transcript-div') !== "") {
                    this.transcriptDivLocation = $(media).data('transcript-div');
                    this.transcriptType = 'external';
                } else if ($(media).data('include-transcript') !== undefined) {
                    if ($(media).data('include-transcript') !== false) {
                        this.transcriptType = 'popup';
                    }
                } else {
                    this.transcriptType = 'popup';
                }
            }

            if ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== false) {
                this.lyricsMode = true;
            } else {
                this.lyricsMode = false;
            }

            if ($(media).data('transcript-title') !== undefined && $(media).data('transcript-title') !== "") {
                this.transcriptTitle = $(media).data('transcript-title');
            } else {
                // do nothing. The default title will be defined later (see transcript.js)
            }

            if ($(media).data('captions-position') === 'overlay') {
                this.defaultCaptionsPosition = 'overlay';
            } else {
                this.defaultCaptionsPosition = 'below';
            }

            if ($(media).data('chapters-div') !== undefined && $(media).data('chapters-div') !== "") {
                this.chaptersDivLocation = $(media).data('chapters-div');
            }

            if ($(media).data('chapters-title') !== undefined) {
                this.chaptersTitle = $(media).data('chapters-title');
            }

            if ($(media).data('chapters-default') !== undefined && $(media).data('chapters-default') !== "") {
                this.defaultChapter = $(media).data('chapters-default');
            } else {
                this.defaultChapter = null;
            }

            if ($(media).data('prevnext-unit') === 'chapter' || $(media).data('prevnext-unit') === 'chapters') {
                this.prevNextUnit = 'chapter';
            } else if ($(media).data('prevnext-unit') === 'playlist') {
                this.prevNextUnit = 'playlist';
            } else {
                this.prevNextUnit = false;
            }

            if ($(media).data('speed-icons') === 'arrows') {
                this.speedIcons = 'arrows';
            } else {
                this.speedIcons = 'animals';
            }

            if ($(media).data('seekbar-scope') === 'chapter' || $(media).data('seekbar-scope') === 'chapters') {
                this.seekbarScope = 'chapter';
            } else {
                this.seekbarScope = 'video';
            }

            // YouTube
            if ($(media).data('youtube-id') !== undefined && $(media).data('youtube-id') !== "") {
                this.youTubeId = $(media).data('youtube-id');
            }

            if ($(media).data('youtube-desc-id') !== undefined && $(media).data('youtube-desc-id') !== "") {
                this.youTubeDescId = $(media).data('youtube-desc-id');
            }

            this.iconType = 'font';
            this.forceIconType = false;
            if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") {
                var iconType = $(media).data('icon-type');
                if (iconType === 'font' || iconType == 'image' || iconType == 'svg') {
                    this.iconType = iconType;
                    this.forceIconType = true;
                }
            }

            if ($(media).data('allow-fullscreen') !== undefined && $(media).data('allow-fullscreen') === false) {
                this.allowFullScreen = false;
            } else {
                this.allowFullScreen = true;
            }

            this.defaultSeekInterval = 10;
            this.useFixedSeekInterval = false;
            if ($(media).data('seek-interval') !== undefined && $(media).data('seek-interval') !== "") {
                var seekInterval = $(media).data('seek-interval');
                if (/^[1-9][0-9]*$/.test(seekInterval)) {
                    this.seekInterval = seekInterval;
                    this.useFixedSeekInterval = true;
                }
            }

            if ($(media).data('show-now-playing') !== undefined && $(media).data('show-now-playing') === false) {
                this.showNowPlaying = false;
            } else {
                this.showNowPlaying = true;
            }

            this.fallback = null;
            this.fallbackPath = null;
            this.testFallback = false;

            if ($(media).data('fallback') !== undefined && $(media).data('fallback') !== "") {
                var fallback = $(media).data('fallback');
                if (fallback === 'jw') {
                    this.fallback = fallback;
                }
            }

            if (this.fallback === 'jw') {

                if ($(media).data('fallback-path') !== undefined && $(media).data('fallback-path') !== false) {
                    this.fallbackPath = $(media).data('fallback-path');
                } else {
                    this.fallbackPath = this.rootPath + 'thirdparty/';
                }

                if ($(media).data('test-fallback') !== undefined && $(media).data('test-fallback') !== false) {
                    this.testFallback = true;
                }
            }

            this.lang = 'en';
            if ($(media).data('lang') !== undefined && $(media).data('lang') !== "") {
                let lang = $(media).data('lang').toLowerCase();
                if (lang.length == 2) {
                    this.lang = lang;
                }
            }

            if ($(media).data('force-lang') !== undefined && $(media).data('force-lang') !== false) {
                this.forceLang = true;
            } else {
                this.forceLang = false;
            }

            if ($(media).data('meta-type') !== undefined && $(media).data('meta-type') !== "") {
                this.metaType = $(media).data('meta-type');
            }

            if ($(media).data('meta-div') !== undefined && $(media).data('meta-div') !== "") {
                this.metaDiv = $(media).data('meta-div');
            }

            if ($(media).data('search') !== undefined && $(media).data('search') !== "") {
                if ($(media).data('search-div') !== undefined && $(media).data('search-div') !== "") {
                    this.searchString = $(media).data('search');
                    this.searchDiv = $(media).data('search-div');
                }
            }
            if ($(media).data('hide-controls') !== undefined && $(media).data('hide-controls') !== false) {
                this.hideControls = true;
            } else {
                this.hideControls = false;
            }

            this.initialize.setDefaults();
            this.ableIndex = AccessiblePlayer.nextIndex;
            AccessiblePlayer.nextIndex++
            this.title = $(media).attr('title');

            this.tt = {};

            await this.translation.getTranslationText().then(() => {
                if (Misc.countProperties(this.tt) > 50) {
                    this.setup();
                } else {
                    this.provideFallback();
                }
            })

        }
    }


    /**
     * Reactive the DOM
     * @returns {Element}
     */
    static getActiveDOMElement() {
        var activeElement = document.activeElement;
        while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
            activeElement = activeElement.shadowRoot.activeElement;
        }
        return activeElement;
    }


    /**
     * Get element By ID
     * @param element
     * @param id
     * @returns {*|jQuery.fn.init|jQuery|HTMLElement}
     */
    static localGetElementById(element, id) {
        if (element.getRootNode) {
            return $(element.getRootNode().querySelector('#' + id));
        } else {
            return $(document.getElementById(id));
        }
    }

    /**
     * Crée un basePlayer basé sur le media ainsi que les controls personnalisés
     * Crée un basePlayer basé sur le media ainsi que les controls personnalisés
     */
    setup() {
        this.initialize.reinitialize().then(() => {
            if (!this.player) {
                this.provideFallback();
            } else {
                this.initialize.setupInstance().then(() => {
                    this.initialize.recreatePlayer();
                });
            }
        });
    }

    /**
     * Get Button Title From control of button
     * @param control
     * @returns {string|*|(() => void)|string}
     */
    getButtonTitle(control) {
        let captionsCount;
        if (control === 'playpause') {
            return this.tt.play;
        } else if (control === 'play') {
            return this.tt.play;
        } else if (control === 'pause') {
            return this.tt.pause;
        } else if (control === 'restart') {
            return this.tt.restart;
        } else if (control === 'previous') {
            return this.tt.prevTrack;
        } else if (control === 'next') {
            return this.tt.nextTrack;
        } else if (control === 'rewind') {
            return this.tt.rewind;
        } else if (control === 'forward') {
            return this.tt.forward;
        } else if (control === 'captions') {
            if (this.usingYouTubeCaptions) {
                captionsCount = this.ytCaptions.length;
            } else {
                captionsCount = this.captions.length;
            }
            if (captionsCount > 1) {
                return this.tt.captions;
            } else {
                if (this.captionsOn) {
                    return this.tt.hideCaptions;
                } else {
                    return this.tt.showCaptions;
                }
            }
        } else if (control === 'descriptions') {
            if (this.descOn) {
                return this.tt.turnOffDescriptions;
            } else {
                return this.tt.turnOnDescriptions;
            }
        } else if (control === 'transcript') {
            if (this.$transcriptDiv.is(':visible')) {
                return this.tt.hideTranscript;
            } else {
                return this.tt.showTranscript;
            }
        } else if (control === 'chapters') {
            return this.tt.chapters;
        } else if (control === 'sign') {
            return this.tt.sign;
        } else if (control === 'volume') {
            return this.tt.volume;
        } else if (control === 'faster') {
            return this.tt.faster;
        } else if (control === 'slower') {
            return this.tt.slower;
        } else if (control === 'preferences') {
            return this.tt.preferences;
        } else if (control === 'help') {
            // return this.tt.help;
        } else {
            if (this.debug) {
                console.log('Found an untranslated label: ' + control);
            }
            return control.charAt(0).toUpperCase() + control.slice(1);
        }
    }

    /**
     * insére le basePlayer et ses composants dans le DOM
     */
    injectPlayerCode() {
        var vidcapContainer;
        this.$wasShow = '';
        this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
        this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
        this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();
        //this.$ableWrapper.addClass('able-skin-' + this.skin);
        if (this.player !== 'youtube') {
            this.$ableWrapper.css({
                'max-width': this.playerMaxWidth + 'px'
            });
        }
        this.injectOffscreenHeading();
        if (this.mediaType === 'video') {
            if (this.iconType != 'image' && this.player !== 'youtube' ) {
                this.injectBigPlayButton();
            }
            vidcapContainer = $('<div>', {
                'class': 'able-vidcap-container'
            });
            this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();
        }
        this.injectPlayerControlArea();
        this.injectTextDescriptionArea();
        this.injectAlert();
        this.injectPlaylist();
    }

    /**
     * insère un titre dans le media
     * Inject an offscreen heading to the media container.
     */
    injectOffscreenHeading() {
        var headingType;
        if (this.playerHeadingLevel == '0') {
            // do NOT inject a heading (at author's request)
        } else {
            if (typeof this.playerHeadingLevel === 'undefined') {
                this.playerHeadingLevel = Misc.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
            }
            headingType = 'h' + this.playerHeadingLevel.toString();
            this.$headingDiv = $('<' + headingType + '>');
            this.$ableDiv.prepend(this.$headingDiv);
            this.$headingDiv.addClass('able-offscreen');
            this.$headingDiv.text(this.tt.playerHeading);
        }
    }


    /**
     * Insère le DOM du bouton dans le DOM du player
     */
    injectBigPlayButton() {
        this.$bigPlayButton = $('<button>', {
            'class': 'able-big-play-button icon-play',
            'aria-hidden': true,
            'tabindex': -1
        });
        this.$bigPlayButton.click(() => {
            this.control.handlePlay();
        });
        this.$mediaContainer.css('background-color', 'lightgray');
        this.$mediaContainer.append(this.$bigPlayButton);
    }

    /**
     * injecte les controles du Player dans le DOM
     */
    injectPlayerControlArea() {
        //Add playerOrange skins
        //OrangeLab add new playing button for linearisation
        this.$controllerOrangeDiv = $('<div>', {
            'class': 'controller-orange-main',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonCopySeekBar = $('<span>', {
            'id': 'copy-seek',
            'tabindex': '0',
            'class': 'buttonSeek'
        });

        this.$buttonCopyPlay = $('<button>', {
            'type': 'button',
            'id': 'copy-play',
            'tabindex': '0',
            'aria-label': this.tt.play,
            'aria-live': 'polite',
            'class': 'able-button-handler-play button play menuButton'
        });
        this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'</path></svg> <span id=\"spanPlay\" class='spanButton'>" + this.tt.play + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");

        this.$buttonForwardRewind = $('<div>', {
            'id': 'buttonForwardRewind',
            'class': 'able-buttons-div',
            'style': 'display:flex',
        });

        this.$buttonCopyForward = $('<button>', {
            'type': 'button',
            'id': 'copy-forward',
            'tabindex': '0',
            'aria-label': this.tt.forward,
            'class': 'able-button-handler-forward button forward'
        });
        this.$buttonCopyForward.append("<span>" + this.tt.forward + "</span><svg style='margin-left:10%' viewBox='0 0 20 20'><path d='M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z'</path></svg>");

        this.$buttonCopyRewind = $('<button>', {
            'type': 'button',
            'id': 'copy-rewind',
            'tabindex': '0',
            'aria-label': this.tt.rewind,
            'class': 'able-button-handler-rewind button rewind'
        });
        this.$buttonCopyRewind.append("<svg style='margin-right:10%' viewBox='0 0 20 20'><path d='M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z'</path></svg><span>" + this.tt.rewind + "</span>");
        this.$buttonForwardRewind.append(this.$buttonCopyRewind, this.$buttonCopyForward);
        this.$buttonCopyVolume = $('<button>', {
            'type': 'button',
            'role': 'menu',
            'id': 'show-volume',
            'tabindex': '0',
            'aria-label': this.tt.volume,
            'class': 'iconvol button volume menuButton'
        });
        this.$buttonCopyVolume.append("<svg style='float:left;margin-left:25%' viewBox='0 0 21 20'><path d='M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'>" + this.tt.volume + "</span><i class=\"arrow right\"></i>");


        this.$buttonVidcontr2 = $('<button>', {
            'type': 'button',
            'id': 'vidcontr2',
            'tabindex': '0',
            'aria-label': this.tt.vidcontr,
            'class': 'able-button-handler-forward button vidcontr menuButton',
            'aria-checked': 'false',
        });
        if (this.$sources.first().attr('data-sign-opt')) {
            this.$buttonVidcontr2.attr('aria-checked', 'false')
            this.$buttonVidcontr2.addClass('vidcontr')
            this.$buttonVidcontr2.removeClass('vidcontrno')
            this.$buttonVidcontr2.text('');
            this.$buttonVidcontr2.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">" + this.tt.vidcontrno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        } else {
            this.$buttonVidcontr2.prop("disabled", true);
        }
        this.$buttonSpeedsMain = $('<button>', {
            'type': 'button',
            'id': 'speedMain',
            'tabindex': '0',
            'aria-label': this.tt.speed,
            'class': 'normalIcon button speed menuButton'
        });
        this.$buttonSpeedsMain.append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + this.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonCopySettings = $('<button>', {
            'type': 'button',
            'id': 'show-settings',
            'tabindex': '0',
            'aria-label': this.tt.preferences,
            'class': 'iconsettings button settings buttonMore menuButton'
        });
        var svg = 'm 6.4715267,4.8146068 c 0,-0.6982433 0.5444396,-1.2649335 1.2152669,-1.2649335 0.6708273,0 1.2152668,0.5666902 1.2152668,1.2649335 0,0.6982434 -0.5444395,1.2649336 -1.2152668,1.2649336 -0.6708273,0 -1.2152669,-0.5666902 -1.2152669,-1.2649336 z M 9.3071494,7.7661184 13.479566,5.8931735 13.17899,5.109758 8.0918825,6.9228294 H 7.2817046 L 2.1945976,5.109758 1.8940216,5.8931735 6.0664378,7.7661184 v 3.3731566 l -1.6616749,5.59438 0.7575163,0.299367 2.3511363,-5.472103 h 0.3475663 l 2.3511362,5.472103 0.757517,-0.299367 -1.6616754,-5.59438 z';
        this.$buttonCopySettings.append("<svg style='float:left;margin-left:25%' viewBox='0 0 15 20'><circle cx='8' cy='10' r='8.5' stroke='black' stroke-width='1.5' fill='transparent'/><path d='" + svg + "'</path></svg><span class='spanButton'>" + this.tt.preferencesP + "</span><i class=\"arrow right\"></i>");

        this.$buttonCaptions = $('<button>', {
            'type': 'button',
            'id': 'subtitles',
            'tabindex': '0',
            'aria-label': 'Sous-titres',
            'class': 'button subtitles menuButton',
            'aria-checked': 'false',
        });
        this.$buttonCaptions.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 1.37,3.33 C 6.99,3.35 12.61,3.37 18.22,3.40M 2.54,4.25 C 2.54,4.25 17.35,4.25 17.35,4.25 17.88,4.24 18.56,4.29 18.54,3.90 18.53,3.51 17.85,2.82 17.35,2.82 17.35,2.82 2.54,2.82 2.54,2.82 2.01,2.83 1.60,3.16 1.62,3.55 1.63,3.94 2.03,4.24 2.54,4.25 Z M 1.19,18.83 C 1.19,18.83 2.56,18.83 2.56,18.83 2.61,18.69 1.26,15.41 1.25,10.98 1.25,6.69 2.60,2.77 2.56,2.70 2.56,2.70 1.19,2.70 1.19,2.70 1.14,2.84 -0.08,6.58 -0.08,11.01 -0.07,15.30 1.14,18.69 1.19,18.83 Z M 17.32,18.48 C 17.32,18.48 18.46,18.48 18.46,18.48 18.50,18.34 19.95,14.71 19.95,10.41 19.95,6.24 18.49,2.88 18.46,2.82 18.46,2.82 17.32,2.82 17.32,2.82 17.28,2.95 18.62,6.49 18.62,10.79 18.62,14.95 17.28,18.34 17.32,18.48 17.32,18.48 17.32,18.48 17.32,18.48 Z M 2.56,18.83 C 2.56,18.83 17.37,18.83 17.37,18.83 17.90,18.82 18.58,18.87 18.56,18.48 18.55,18.09 17.87,17.40 17.37,17.40 17.37,17.40 2.56,17.40 2.56,17.40 2.03,17.41 1.62,17.74 1.64,18.13 1.65,18.52 2.05,18.82 2.56,18.83 2.56,18.83 2.56,18.83 2.56,18.83 Z M 4.05,16.73 C 4.05,16.73 15.64,16.73 15.64,16.73 16.05,16.72 16.37,16.24 16.36,15.68 16.34,15.14 16.03,14.70 15.64,14.69 15.64,14.69 4.05,14.69 4.05,14.69 3.63,14.71 3.32,15.18 3.33,15.74 3.34,16.29 3.65,16.72 4.05,16.73 Z M 6.33,13.87 C 6.33,13.87 3.65,13.87 3.65,13.87 3.42,13.86 3.24,13.38 3.24,12.82 3.25,12.28 3.43,11.84 3.65,11.83 3.65,11.83 6.33,11.83 6.33,11.83 6.57,11.85 6.75,12.32 6.74,12.88 6.74,13.43 6.56,13.86 6.33,13.87 Z M 15.85,13.87 C 15.85,13.87 8.48,13.87 8.48,13.87 8.22,13.86 8.01,13.38 8.02,12.82 8.03,12.28 8.23,11.84 8.48,11.83 8.48,11.83 15.85,11.83 15.85,11.83 16.11,11.85 16.32,12.32 16.31,12.88 16.30,13.43 16.10,13.86 15.85,13.87 Z'</path></svg><span class='spanButton'>" + this.tt.captions + "</span><i class=\"arrow right\"></i>");


        this.$buttonFullscreen = $('<button>', {
            'type': 'button',
            'id': 'fullscreen',
            'tabindex': '0',
            'aria-label': this.tt.enterFullScreen,
            'class': 'able-button-handler-play button fullscreen menuButton'
        });
        this.$buttonFullscreen.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z'</path></svg><span id='spanFull' class='spanButton'>" + this.tt.fullScreen + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonAllParams = $('<button>', {
            'type': 'button',
            'id': 'allParams',
            'tabindex': '0',
            'aria-label': this.tt.allParams,
            'aria-checked': 'false',
            'class': 'button allParams menuButton'
        });
        this.$buttonAllParams.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z'</path></svg><span class='spanButton'>" + this.tt.allParams + "</span><i class=\"arrow right\"></i>");
        this.$controllerOrangeDiv.append(this.$buttonCopyPlay, this.$buttonForwardRewind, this.$buttonCopyVolume, this.$buttonFullscreen, this.$buttonCaptions, this.$buttonVidcontr2, this.$buttonSpeedsMain, this.$buttonAllParams, this.$buttonCopySettings);


        this.$controllerOrangeVolumeDiv = $('<div>', {
            'class': 'controller-orange-volume',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideVol = $('<button>', {
            'type': 'button',
            'id': 'hide-volume',
            'tabindex': '0',
            'aria-label': this.tt.back,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.volume + " " + (parseInt(this.volume) / 10 * 100) + "%</span>");

        this.$buttonSoundUp = $('<button>', {
            'type': 'button',
            'id': 'sound-up',
            'tabindex': '0',
            'aria-label': this.tt.vplus,
            'class': 'able-button-handler-play button volplus menuButton'
        });
        this.$buttonSoundUp.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span id=\"\" class='spanButton'>+ " + this.tt.vplus + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonSoundDown = $('<button>', {
            'type': 'button',
            'id': 'sound-down',
            'tabindex': '0',
            'aria-label': this.tt.vmoins,
            'class': 'able-button-handler-forward button vmoins menuButton'
        });
        this.$buttonSoundDown.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span id=\"\" class='spanButton' >- " + this.tt.vmoins + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonSoundMute = $('<button>', {
            'type': 'button',
            'id': 'sound-mute',
            'tabindex': '0',
            'aria-label': this.tt.unmute,
            'class': 'able-button-handler-forward button vmute menuButton'
        });
        this.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'> " + this.tt.unmute + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$controllerOrangeVolumeDiv.append(this.$buttonHideVol, this.$buttonSoundUp, this.$buttonSoundDown, this.$buttonSoundMute);
        this.$controllerOrangeVolumeDiv.attr('style', 'display:none');
        this.$controllerOrangeSubtitlesDiv = $('<div>', {
            'class': 'controller-orange-subtitles',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideSubT = $('<button>', {
            'type': 'button',
            'id': 'hide-subT',
            'tabindex': '0',
            'aria-label': this.tt.menu,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideSubT.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.menu + "</span>");
        this.$buttonActivateSub = $('<button>', {
            'type': 'button',
            'id': 'subt',
            'tabindex': '0',
            'disabled': 'true',
            'aria-pressed': 'false',
            'aria-label': this.tt.de_act_st_general,
            'class': 'able-button-handler-forward aria-no-checked button subt',
            'aria-checked': 'false',
        });
        this.$buttonActivateSub.append("<span id=\"\">" + this.tt.de_act_st_general + "</span></i>");
        this.$buttonSubML = $('<button>', {
            'type': 'button',
            'id': 'subtitlesML',
            'tabindex': '0',
            'aria-label': this.tt.act_st_ml,
            'aria-checked': 'false',
            'aria-pressed': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + this.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
        this.$buttonSubFR = $('<button>', {
            'type': 'button',
            'id': 'subtitlesFR',
            'tabindex': '0',
            'aria-label': this.tt.act_st_fr,
            'aria-checked': 'false',
            'aria-pressed': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSubFR.append("<span> " + this.tt.act_st_fr + "</span>");
        this.$buttonSubEN = $('<button>', {
            'type': 'button',
            'id': 'subtitlesEN',
            'tabindex': '0',
            'aria-label': this.tt.act_st_en,
            'aria-checked': 'false',
            'aria-pressed': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSubEN.append("<span> " + this.tt.act_st_en + "</span>");
        this.$buttonSubES = $('<button>', {
            'type': 'button',
            'id': 'subtitlesES',
            'tabindex': '0',
            'aria-label': this.tt.act_st_es,
            'aria-checked': 'false',
            'aria-pressed': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSubES.append("<span> " + this.tt.act_st_es + "</span>");
        this.$buttonSubPL = $('<button>', {
            'type': 'button',
            'id': 'subtitlesPL',
            'tabindex': '0',
            'aria-label': this.tt.act_st_pl,
            'aria-checked': 'false',
            'aria-pressed': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSubPL.append("<span> " + this.tt.act_st_pl + "</span>");
        this.$controllerOrangeSubtitlesDiv.append(this.$buttonHideSubT, this.$buttonSubML, this.$buttonSubFR, this.$buttonSubEN, this.$buttonSubES, this.$buttonSubPL);
        this.$controllerOrangeSubtitlesDiv.attr('style', 'display:none');
        this.$controllerOrangePerceptionDiv = $('<div>', {
            'class': 'controller-orange-perception',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHidePerception = $('<button>', {
            'type': 'button',
            'id': 'hide-perception',
            'tabindex': '0',
            'aria-label': this.tt.allParams,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHidePerception.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.allParams + "</span>");
        this.$divPerceptionLow = $('<div>', {
            'id': 'divPerceptionLow',
            'class': 'able-buttons-div',
            'style': 'display:flex',
        });
        this.$divPerceptionLowText = $('<button>', {
            'id': 'divPerceptionLowText',
            'class': 'button normalIcon menuButton colorDef',
            'disabled': 'true',
            'style': 'cursor:auto',
            'aria-live': 'polite',
            'aria-hidden': 'true',
            'text': '100%',
        });
        this.$divPerceptionHigh = $('<div>', {
            'id': 'divPerceptionHigh',
            'class': 'able-buttons-div',
            'style': 'display:flex',
        });
        this.$divPerceptionHighText = $('<button>', {
            'id': 'divPerceptionHighText',
            'class': 'button normalIcon menuButton colorDef',
            'disabled': 'true',
            'style': 'cursor:auto',
            'aria-live': 'polite',
            'aria-hidden': 'true',
            'text': '100%',
        });
        this.$buttonMoreLow = $('<button>', {
            'type': 'button',
            'id': 'buttonMoreLow',
            'tabindex': '0',
            'aria-label': this.tt.morelow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonMoreLow.append("<span> " + this.tt.morelow + "</span>");
        this.$buttonLessLow = $('<button>', {
            'type': 'button',
            'id': 'buttonLessLow',
            'tabindex': '0',
            'aria-label': this.tt.lesslow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonLessLow.append("<span> " + this.tt.lesslow + "</span>");
        this.$divPerceptionLow.append(this.$buttonLessLow, this.$divPerceptionLowText, this.$buttonMoreLow);
        this.$buttonMoreAcute = $('<button>', {
            'type': 'button',
            'id': 'buttonMoreAcute',
            'tabindex': '0',
            'aria-label': this.tt.moreacute,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonMoreAcute.append("<span> " + this.tt.moreacute + "</span>");
        this.$buttonLessAcute = $('<button>', {
            'type': 'button',
            'id': 'buttonLessAcute',
            'tabindex': '0',
            'aria-label': this.tt.lessacute,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonLessAcute.append("<span> " + this.tt.lessacute + "</span>");
        this.$divPerceptionHigh.append(this.$buttonLessAcute, this.$divPerceptionHighText, this.$buttonMoreAcute);
        this.$buttonDefaultPerception = $('<button>', {
            'type': 'button',
            'id': 'defaultPerception',
            'tabindex': '0',
            'aria-label': this.tt.defaultPerception,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonDefaultPerception.append("<span> " + this.tt.defaultPerception + "</span>");
        this.$controllerOrangePerceptionDiv.append(this.$buttonHidePerception, this.$divPerceptionLow, this.$divPerceptionHigh, this.$buttonDefaultPerception);
        this.$controllerOrangePerceptionDiv.attr('style', 'display:none');
        this.$controllerOrangeReglagesDiv = $('<div>', {
            'class': 'controller-orange-reglages',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideReglages = $('<button>', {
            'type': 'button',
            'id': 'hide-reglages',
            'tabindex': '0',
            'aria-label': this.tt.reglages,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideReglages.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.reglages + "</span>");
        this.$buttonTextColor = $('<button>', {
            'type': 'button',
            'id': 'textColor',
            'tabindex': '0',
            'aria-label': this.tt.textColor,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonTextColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.textColor + "</span><i class=\"arrow right\"></i>");
        this.$buttonBGColor = $('<button>', {
            'type': 'button',
            'id': 'bgColor',
            'tabindex': '0',
            'aria-label': this.tt.bgColor,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonBGColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.bgColor + "</span><i class=\"arrow right\"></i>");
        this.$buttonFollowColor = $('<button>', {
            'type': 'button',
            'id': 'followColor',
            'tabindex': '0',
            'aria-label': this.tt.followColor,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonFollowColor.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>" + this.tt.followColor + "</span><i class=\"arrow right\"></i>");
        this.$buttonFontSize = $('<button>', {
            'type': 'button',
            'id': 'fontSize',
            'tabindex': '0',
            'aria-label': this.tt.fontSize,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonFontSize.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.fontSize + "</span><i class=\"arrow right\"></i>");
        this.$buttonOutText = $('<button>', {
            'type': 'button',
            'id': 'outText',
            'tabindex': '0',
            'aria-label': this.tt.outText,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonOutText.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.outText + "</span><i class=\"arrow right\"></i>");
        this.$buttonTextStyle = $('<button>', {
            'type': 'button',
            'id': 'textStyle',
            'tabindex': '0',
            'aria-label': this.tt.textStyle,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonTextStyle.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.textStyle + "</span><i class=\"arrow right\"></i>");
        this.$buttonReglagesSettings = $('<button>', {
            'type': 'button',
            'id': 'reglagesSettings',
            'tabindex': '0',
            'aria-label': this.tt.reglagesSettings,
            'aria-checked': 'false',
            'class': 'button normalIcon menuButton'
        });
        this.$buttonReglagesSettings.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'> " + this.tt.reglagesSettings + "</span><i class=\"arrow right\"></i>");
        this.$controllerOrangeReglagesDiv.append(this.$buttonHideReglages, this.$buttonTextColor, this.$buttonBGColor, this.$buttonFollowColor, this.$buttonFontSize, this.$buttonOutText, this.$buttonTextStyle, this.$buttonReglagesSettings);
        this.$controllerOrangeReglagesDiv.attr('style', 'display:none');
        this.$controllerOrangeTextColorDiv = $('<div>', {
            'class': 'controller-orange-textcolor',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideTextColor = $('<button>', {
            'type': 'button',
            'id': 'hide-textColor',
            'tabindex': '0',
            'aria-label': this.tt.textColor,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideTextColor.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.textColor + "</span>");
        this.$buttonWhiteTextColor = $('<button>', {
            'type': 'button',
            'id': 'whiteTextColor',
            'tabindex': '0',
            'aria-label': this.tt.white,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonWhiteTextColor.append("<span> " + this.tt.white + "</span>");
        this.$buttonBlackTextColor = $('<button>', {
            'type': 'button',
            'id': 'blackTextColor',
            'tabindex': '0',
            'aria-label': this.tt.black,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlackTextColor.append("<span> " + this.tt.black + "</span>");
        this.$buttonRedTextColor = $('<button>', {
            'type': 'button',
            'id': 'redTextColor',
            'tabindex': '0',
            'aria-label': this.tt.red,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonRedTextColor.append("<span> " + this.tt.red + "</span>");
        this.$buttonGreenTextColor = $('<button>', {
            'type': 'button',
            'id': 'greenTextColor',
            'tabindex': '0',
            'aria-label': this.tt.green,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonGreenTextColor.append("<span> " + this.tt.green + "</span>");
        this.$buttonBlueTextColor = $('<button>', {
            'type': 'button',
            'id': 'blueTextColor',
            'tabindex': '0',
            'aria-label': this.tt.blue,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlueTextColor.append("<span> " + this.tt.blue + "</span>");
        this.$buttonYellowTextColor = $('<button>', {
            'type': 'button',
            'id': 'yellowTextColor',
            'tabindex': '0',
            'aria-label': this.tt.yellow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonYellowTextColor.append("<span> " + this.tt.yellow + "</span>");
        this.$buttonMagentaTextColor = $('<button>', {
            'type': 'button',
            'id': 'magentaTextColor',
            'tabindex': '0',
            'aria-label': this.tt.magenta,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonMagentaTextColor.append("<span> " + this.tt.magenta + "</span>");
        this.$buttonCyanTextColor = $('<button>', {
            'type': 'button',
            'id': 'cyanTextColor',
            'tabindex': '0',
            'aria-label': this.tt.cyan,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonCyanTextColor.append("<span> " + this.tt.cyan + "</span>");
        this.$controllerOrangeTextColorDiv.append(this.$buttonHideTextColor, this.$buttonWhiteTextColor, this.$buttonBlackTextColor, this.$buttonRedTextColor, this.$buttonGreenTextColor, this.$buttonBlueTextColor, this.$buttonYellowTextColor, this.$buttonMagentaTextColor, this.$buttonCyanTextColor);
        this.$controllerOrangeTextColorDiv.attr('style', 'display:none');
        this.$controllerOrangeBGColorDiv = $('<div>', {
            'class': 'controller-orange-bgcolor',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideBGColor = $('<button>', {
            'type': 'button',
            'id': 'hide-bgColor',
            'tabindex': '0',
            'aria-label': this.tt.bgColor,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideBGColor.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.bgColor + "</span>");
        this.$buttonWhiteBGColor = $('<button>', {
            'type': 'button',
            'id': 'whiteBGColor',
            'tabindex': '0',
            'aria-label': this.tt.white,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonWhiteBGColor.append("<span> " + this.tt.white + "</span>");
        this.$buttonBlackBGColor = $('<button>', {
            'type': 'button',
            'id': 'blackBGColor',
            'tabindex': '0',
            'aria-label': this.tt.black,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlackBGColor.append("<span> " + this.tt.black + "</span>");
        this.$buttonRedBGColor = $('<button>', {
            'type': 'button',
            'id': 'redBGColor',
            'tabindex': '0',
            'aria-label': this.tt.red,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonRedBGColor.append("<span> " + this.tt.red + "</span>");
        this.$buttonGreenBGColor = $('<button>', {
            'type': 'button',
            'id': 'greenBGColor',
            'tabindex': '0',
            'aria-label': this.tt.green,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonGreenBGColor.append("<span> " + this.tt.green + "</span>");
        this.$buttonBlueBGColor = $('<button>', {
            'type': 'button',
            'id': 'blueBGColor',
            'tabindex': '0',
            'aria-label': this.tt.blue,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlueBGColor.append("<span> " + this.tt.blue + "</span>");
        this.$buttonYellowBGColor = $('<button>', {
            'type': 'button',
            'id': 'yellowBGColor',
            'tabindex': '0',
            'aria-label': this.tt.yellow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonYellowBGColor.append("<span> " + this.tt.yellow + "</span>");
        this.$buttonMagentaBGColor = $('<button>', {
            'type': 'button',
            'id': 'magentaBGColor',
            'tabindex': '0',
            'aria-label': this.tt.magenta,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonMagentaBGColor.append("<span> " + this.tt.magenta + "</span>");
        this.$buttonCyanBGColor = $('<button>', {
            'type': 'button',
            'id': 'cyanBGColor',
            'tabindex': '0',
            'aria-label': this.tt.cyan,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonCyanBGColor.append("<span> " + this.tt.cyan + "</span>");
        this.$controllerOrangeBGColorDiv.append(this.$buttonHideBGColor, this.$buttonWhiteBGColor, this.$buttonBlackBGColor, this.$buttonRedBGColor, this.$buttonGreenBGColor, this.$buttonBlueBGColor, this.$buttonYellowBGColor, this.$buttonMagentaBGColor, this.$buttonCyanBGColor);
        this.$controllerOrangeBGColorDiv.attr('style', 'display:none');
        this.$controllerOrangeFollowColorDiv = $('<div>', {
            'class': 'controller-orange-followcolor',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideFollowColor = $('<button>', {
            'type': 'button',
            'id': 'hide-followColor',
            'tabindex': '0',
            'aria-label': this.tt.followColor,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideFollowColor.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.followColor + "</span>");
        this.$buttonWhiteFollowColor = $('<button>', {
            'type': 'button',
            'id': 'whiteFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.white,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonWhiteFollowColor.append("<span> " + this.tt.white + "</span>");
        this.$buttonBlackFollowColor = $('<button>', {
            'type': 'button',
            'id': 'blackFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.black,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlackFollowColor.append("<span> " + this.tt.black + "</span>");
        this.$buttonRedFollowColor = $('<button>', {
            'type': 'button',
            'id': 'redFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.red,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonRedFollowColor.append("<span> " + this.tt.red + "</span>");
        this.$buttonGreenFollowColor = $('<button>', {
            'type': 'button',
            'id': 'greenFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.green,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonGreenFollowColor.append("<span> " + this.tt.green + "</span>");
        this.$buttonBlueFollowColor = $('<button>', {
            'type': 'button',
            'id': 'blueFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.blue,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlueFollowColor.append("<span> " + this.tt.blue + "</span>");
        this.$buttonYellowFollowColor = $('<button>', {
            'type': 'button',
            'id': 'yellowFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.yellow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonYellowFollowColor.append("<span> " + this.tt.yellow + "</span>");
        this.$buttonMagentaFollowColor = $('<button>', {
            'type': 'button',
            'id': 'magentaFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.magenta,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonMagentaFollowColor.append("<span> " + this.tt.magenta + "</span>");
        this.$buttonCyanFollowColor = $('<button>', {
            'type': 'button',
            'id': 'cyanFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.cyan,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonCyanFollowColor.append("<span> " + this.tt.cyan + "</span>");
        this.$controllerOrangeFollowColorDiv.append(this.$buttonHideFollowColor, this.$buttonWhiteFollowColor, this.$buttonBlackFollowColor, this.$buttonRedFollowColor, this.$buttonGreenFollowColor, this.$buttonBlueFollowColor, this.$buttonYellowFollowColor, this.$buttonMagentaFollowColor, this.$buttonCyanFollowColor);
        this.$controllerOrangeFollowColorDiv.attr('style', 'display:none');
        this.$controllerOrangeOutTextDiv = $('<div>', {
            'class': 'controller-orange-outfont',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideout = $('<button>', {
            'type': 'button',
            'id': 'hide-out',
            'tabindex': '0',
            'aria-label': this.tt.outText,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideout.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.outText + "</span>");
        this.$buttonOutNo = $('<button>', {
            'type': 'button',
            'id': 'outNo',
            'tabindex': '0',
            'aria-label': this.tt.outNo,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonOutNo.append("<span>" + this.tt.outNo + "</span>");
        this.$buttonOutHigh = $('<button>', {
            'type': 'button',
            'id': 'outHigh',
            'tabindex': '0',
            'aria-label': this.tt.outHigh,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonOutHigh.append("<span>" + this.tt.outHigh + "</span>");
        this.$buttonOutEnforce = $('<button>', {
            'type': 'button',
            'id': 'outEnforce',
            'tabindex': '0',
            'aria-label': this.tt.outEnforce,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonOutEnforce.append("<span>" + this.tt.outEnforce + "</span>");
        this.$buttonOutUniform = $('<button>', {
            'type': 'button',
            'id': 'outUniform',
            'tabindex': '0',
            'aria-label': this.tt.outUniform,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonOutUniform.append("<span>" + this.tt.outUniform + "</span>");
        this.$buttonBlueFollowColor = $('<button>', {
            'type': 'button',
            'id': 'blueFollowColor',
            'tabindex': '0',
            'aria-label': this.tt.blue,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonBlueFollowColor.append("<span>" + this.tt.blue + "</span>");
        this.$buttonOutShadow = $('<button>', {
            'type': 'button',
            'id': 'outShadow',
            'tabindex': '0',
            'aria-label': this.tt.outShadow,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonOutShadow.append("<span>" + this.tt.outShadow + "</span>");
        this.$controllerOrangeOutTextDiv.append(this.$buttonHideout, this.$buttonOutNo, this.$buttonOutHigh, this.$buttonOutEnforce, this.$buttonOutUniform, this.$buttonOutShadow);
        this.$controllerOrangeOutTextDiv.attr('style', 'display:none');
        this.$controllerOrangeFontDiv = $('<div>', {
            'class': 'controller-orange-font',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideFont = $('<button>', {
            'type': 'button',
            'id': 'hide-font',
            'tabindex': '0',
            'aria-label': this.tt.textStyle + " " + this.tt.back,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideFont.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.textStyle + "</span>");
        this.$buttonHelvet = $('<button>', {
            'type': 'button',
            'id': 'helvet',
            'tabindex': '0',
            'aria-label': this.tt.helvet,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonHelvet.append("<span>" + this.tt.helvet + "</span>");

        this.$buttonConsola = $('<button>', {
            'type': 'button',
            'id': 'consola',
            'tabindex': '0',
            'aria-label': this.tt.consola,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonConsola.append("<span>" + this.tt.consola + "</span>");

        this.$buttonAccessDFA = $('<button>', {
            'type': 'button',
            'id': 'accessDFA',
            'tabindex': '0',
            'aria-label': this.tt.accessDFA,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonAccessDFA.append("<span>" + this.tt.accessDFA + "</span>");

        this.$buttonComic = $('<button>', {
            'type': 'button',
            'id': 'comic',
            'tabindex': '0',
            'aria-label': this.tt.comic,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonComic.append("<span>" + this.tt.comic + "</span>");

        this.$buttonArial = $('<button>', {
            'type': 'button',
            'id': 'arial',
            'tabindex': '0',
            'aria-label': this.tt.arial,
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$buttonArial.append("<span>" + this.tt.arial + "</span>");


        this.$controllerOrangeFontDiv.append(this.$buttonHideFont, this.$buttonHelvet, this.$buttonConsola, this.$buttonAccessDFA, this.$buttonComic, this.$buttonArial);
        this.$controllerOrangeFontDiv.attr('style', 'display:none');

        this.$controllerOrangeButtonColorDiv = $('<div>', {
            'class': 'controller-orange-butcol',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideButCol = $('<button>', {
            'type': 'button',
            'id': 'hide-butcol',
            'tabindex': '1',
            'aria-label': this.tt.reglagesSettings + " " + this.tt.back,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideButCol.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.reglagesSettings + "</span>");

        this.$buttonBlackWhite = $('<button>', {
            'type': 'button',
            'id': 'blackwhite',
            'tabindex': '1',
            'aria-label': this.tt.blackwhite,
            'aria-checked': 'false',
            'class': 'button normalIcon blackwhite settingsColor',
        });
        this.$buttonBlackWhite.append("<span>" + this.tt.blackwhite + "</span>");

        this.$buttonWhiteBlack = $('<button>', {
            'type': 'button',
            'id': 'whiteblack',
            'tabindex': '1',
            'aria-label': this.tt.whiteblack,
            'aria-checked': 'false',
            'class': 'button normalIcon whiteblack settingsColor'
        });
        this.$buttonWhiteBlack.append("<span>" + this.tt.whiteblack + "</span>");

        this.$buttonBlueYellow = $('<button>', {
            'type': 'button',
            'id': 'blueyellow',
            'tabindex': '1',
            'aria-label': this.tt.blueyellow,
            'aria-checked': 'false',
            'class': 'button normalIcon blueyellow settingsColor'
        });
        this.$buttonBlueYellow.append("<span>" + this.tt.blueyellow + "</span>");

        this.$buttonYellowBlue = $('<button>', {
            'type': 'button',
            'id': 'yellowblue',
            'tabindex': '1',
            'aria-label': this.tt.yellowblue,
            'aria-checked': 'false',
            'class': 'button normalIcon yellowblue settingsColor'
        });
        this.$buttonYellowBlue.append("<span>" + this.tt.yellowblue + "</span>");

        this.$buttonBlueWhite = $('<button>', {
            'type': 'button',
            'id': 'bluewhite',
            'tabindex': '1',
            'aria-label': this.tt.bluewhite,
            'aria-checked': 'false',
            'class': 'button normalIcon bluewhite settingsColor'
        });
        this.$buttonBlueWhite.append("<span>" + this.tt.bluewhite + "</span>");

        this.$buttonWhiteBlue = $('<button>', {
            'type': 'button',
            'id': 'whiteblue',
            'tabindex': '1',
            'aria-label': this.tt.whiteblue,
            'aria-checked': 'false',
            'class': 'button normalIcon whiteblue settingsColor'
        });
        this.$buttonWhiteBlue.append("<span>" + this.tt.whiteblue + "</span>");

        this.$buttonColorDef = $('<button>', {
            'type': 'button',
            'id': 'colordef',
            'tabindex': '1',
            'aria-label': this.tt.colordef,
            'aria-checked': 'false',
            'class': 'button normalIcon colordef settingsColor'
        });
        this.$buttonColorDef.append("<span>" + this.tt.colordef + "</span>");
        this.$controllerOrangeButtonColorDiv.append(this.$buttonHideButCol, this.$buttonBlackWhite, this.$buttonWhiteBlack, this.$buttonBlueYellow, this.$buttonYellowBlue, this.$buttonBlueWhite, this.$buttonWhiteBlue, this.$buttonColorDef);
        this.$controllerOrangeButtonColorDiv.attr('style', 'display:none');
        this.$controllerOrangeFontSizeDiv = $('<div>', {
            'class': 'controller-orange-fontsize',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHideFontSize = $('<button>', {
            'type': 'button',
            'id': 'hide-fontsize',
            'tabindex': '1',
            'aria-label': this.tt.fontSize,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideFontSize.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.fontSize + "</span>");
        this.$button50 = $('<button>', {
            'type': 'button',
            'id': 'button50',
            'tabindex': '1',
            'aria-label': 'cinquante pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button50.append("<span>" + "50%" + "</span>");
        this.$button75 = $('<button>', {
            'type': 'button',
            'id': 'button75',
            'tabindex': '1',
            'aria-label': "soixante quinze pourcent",
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button75.append("<span>" + "75%" + "</span>");
        this.$button100 = $('<button>', {
            'type': 'button',
            'id': 'button100',
            'tabindex': '1',
            'aria-label': "cent pourcent",
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button100.append("<span>" + "100%" + "</span>");
        this.$button125 = $('<button>', {
            'type': 'button',
            'id': 'button125',
            'tabindex': '1',
            'aria-label': 'cent vingt cinq pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button125.append("<span>" + "125%" + "</span>");
        this.$button150 = $('<button>', {
            'type': 'button',
            'id': 'button150',
            'tabindex': '1',
            'aria-label': 'cent cinquante pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button150.append("<span>" + "150%" + "</span>");
        this.$button175 = $('<button>', {
            'type': 'button',
            'id': 'button175',
            'tabindex': '1',
            'aria-label': 'cent soixante quinze pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button175.append("<span>" + "175%" + "</span>");
        this.$button200 = $('<button>', {
            'type': 'button',
            'id': 'button200',
            'tabindex': '1',
            'aria-label': 'deux cent pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button200.append("<span>" + "200%" + "</span>");
        this.$button300 = $('<button>', {
            'type': 'button',
            'id': 'button300',
            'tabindex': '1',
            'aria-label': 'trois cent pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button300.append("<span>" + "300%" + "</span>");
        this.$button400 = $('<button>', {
            'type': 'button',
            'id': 'button400',
            'tabindex': '1',
            'aria-label': 'quatre cent pourcent',
            'aria-checked': 'false',
            'class': 'button normalIcon'
        });
        this.$button400.append("<span>" + "400%" + "</span>");
        this.$controllerOrangeFontSizeDiv.append(this.$buttonHideFontSize, this.$button50, this.$button75, this.$button100, this.$button125, this.$button150, this.$button175, this.$button200, this.$button300, this.$button400);
        this.$controllerOrangeFontSizeDiv.attr('style', 'display:none');
        this.$controllerOrangePreferencesDiv = $('<div>', {
            'class': 'controller-orange-preferences',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        this.$buttonHidePrefT = $('<button>', {
            'type': 'button',
            'id': 'hide-prefT',
            'tabindex': '1',
            'aria-label': this.tt.menu,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHidePrefT.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.menu + "</span>");
        this.$buttonVisionPlus = $('<button>', {
            'type': 'button',
            'id': 'visionPlus',
            'tabindex': '1',
            'aria-label': this.tt.visionPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonVisionPlus.append("<span> " + this.tt.visionPlus + "</span>");
        this.$buttonSansVisionPlus = $('<button>', {
            'type': 'button',
            'id': 'sansVisionPlus',
            'tabindex': '1',
            'aria-label': this.tt.sansVisionPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonSansVisionPlus.append("<span> " + this.tt.sansVisionPlus + "</span>");
        this.$buttonAuditionPlus = $('<button>', {
            'type': 'button',
            'id': 'auditionPlus',
            'tabindex': '1',
            'aria-label': this.tt.auditionPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonAuditionPlus.append("<span> " + this.tt.auditionPlus + "</span>");
        this.$buttonLSFPlus = $('<button>', {
            'type': 'button',
            'id': 'lsfPlus',
            'tabindex': '1',
            'aria-label': this.tt.lsfPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonLSFPlus.append("<span> " + this.tt.lsfPlus + "</span>");
        this.$buttonDefPlus = $('<button>', {
            'type': 'button',
            'id': 'defPlus',
            'tabindex': '1',
            'aria-label': this.tt.defPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$timerOrange = null;
        this.$buttonDefPlus.append("<span> " + this.tt.defPlus + "</span>");
        this.$buttonConPlus = $('<button>', {
            'type': 'button',
            'id': 'conPlus',
            'tabindex': '1',
            'aria-label': this.tt.conPlus,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonConPlus.append("<span> " + this.tt.conPlus + "</span>");
        this.$buttonProfilDefaut = $('<button>', {
            'type': 'button',
            'id': 'profDef',
            'tabindex': '1',
            'aria-label': this.tt.profildef,
            'aria-checked': 'false',
            'class': 'able-button-handler-forward button'
        });
        this.$buttonProfilDefaut.append("<span> " + this.tt.profildef + "</span>");
        this.$controllerOrangePreferencesDiv.append(this.$buttonHidePrefT, this.$buttonVisionPlus, this.$buttonSansVisionPlus, this.$buttonAuditionPlus, this.$buttonLSFPlus, this.$buttonConPlus, this.$buttonProfilDefaut);//, this.$buttonAllParams);
        this.$controllerOrangePreferencesDiv.attr('style', 'display:none');
        this.$controllerOrangeSettingsDiv = $('<div>', {
            'class': 'controller-orange-settings',
            'aria-live': 'assertive',
            'tabindex': '-1',
            'aria-atomic': 'true'
        });
        this.$buttonHideSettings = $('<button>', {
            'type': 'button',
            'id': 'hide-settings',
            'tabindex': '1',
            'aria-label': this.tt.back,
            'class': 'able-button-handler-play button title'
        });
        this.$buttonHideSettings.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.menu + "</span>");
        this.$buttonSpeeds = $('<button>', {
            'type': 'button',
            'id': 'speed',
            'tabindex': '1',
            'aria-label': this.tt.speed,
            'class': 'normalIcon button speed menuButton'
        });
        this.$buttonSpeeds.append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">" + this.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonLSF = $('<button>', {
            'type': 'button',
            'id': 'lsf',
            'tabindex': '1',
            'aria-label': this.tt.sign,
            'class': 'able-button-handler-forward aria-no-checked button lsf menuButton',
            'aria-checked': 'false',
        });
        this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.sign + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonAudioDesc = $('<button>', {
            'type': 'button',
            'id': 'audiodesc',
            'tabindex': '1',
            'aria-label': this.tt.audiodesc,
            'class': 'able-button-handler-forward aria-no-checked button audiodesc menuButton',
            'aria-checked': 'false',
        });
        this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.audiodesc + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonTranscr = $('<button>', {
            'type': 'button',
            'id': 'transcr',
            'tabindex': '1',
            'aria-label': this.tt.prefMenuTranscript,
            'class': 'able-button-handler-forward button transcr menuButton',
            'aria-checked': 'false',
        });
        this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.transcract + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.$buttonVidcontr = $('<button>', {
            'type': 'button',
            'id': 'vidcontr',
            'tabindex': '1',
            'aria-label': this.tt.vidcontr,
            'class': 'able-button-handler-forward button vidcontrno menuButton',
            'aria-checked': 'false',
        });
        if (this.$sources.first().attr('data-sign-opt')) {
            this.$buttonVidcontr.attr('aria-checked', 'false')
            this.$buttonVidcontr.addClass('vidcontr')
            this.$buttonVidcontr.removeClass('vidcontrno')
            this.$buttonVidcontr.text('');
            this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">" + this.tt.vidcontrno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        } else {
            this.$buttonVidcontr.prop("disabled", true);
        }
        this.$buttonCaptionsParam = $('<button>', {
            'type': 'button',
            'id': 'subtitlesParam',
            'tabindex': '1',
            'aria-label': 'Sous-titres',
            'class': 'button subtitles menuButton',
            'aria-checked': 'false',
        });
        this.$buttonCaptionsParam.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M 1.37,3.33 C 6.99,3.35 12.61,3.37 18.22,3.40M 2.54,4.25 C 2.54,4.25 17.35,4.25 17.35,4.25 17.88,4.24 18.56,4.29 18.54,3.90 18.53,3.51 17.85,2.82 17.35,2.82 17.35,2.82 2.54,2.82 2.54,2.82 2.01,2.83 1.60,3.16 1.62,3.55 1.63,3.94 2.03,4.24 2.54,4.25 Z M 1.19,18.83 C 1.19,18.83 2.56,18.83 2.56,18.83 2.61,18.69 1.26,15.41 1.25,10.98 1.25,6.69 2.60,2.77 2.56,2.70 2.56,2.70 1.19,2.70 1.19,2.70 1.14,2.84 -0.08,6.58 -0.08,11.01 -0.07,15.30 1.14,18.69 1.19,18.83 Z M 17.32,18.48 C 17.32,18.48 18.46,18.48 18.46,18.48 18.50,18.34 19.95,14.71 19.95,10.41 19.95,6.24 18.49,2.88 18.46,2.82 18.46,2.82 17.32,2.82 17.32,2.82 17.28,2.95 18.62,6.49 18.62,10.79 18.62,14.95 17.28,18.34 17.32,18.48 17.32,18.48 17.32,18.48 17.32,18.48 Z M 2.56,18.83 C 2.56,18.83 17.37,18.83 17.37,18.83 17.90,18.82 18.58,18.87 18.56,18.48 18.55,18.09 17.87,17.40 17.37,17.40 17.37,17.40 2.56,17.40 2.56,17.40 2.03,17.41 1.62,17.74 1.64,18.13 1.65,18.52 2.05,18.82 2.56,18.83 2.56,18.83 2.56,18.83 2.56,18.83 Z M 4.05,16.73 C 4.05,16.73 15.64,16.73 15.64,16.73 16.05,16.72 16.37,16.24 16.36,15.68 16.34,15.14 16.03,14.70 15.64,14.69 15.64,14.69 4.05,14.69 4.05,14.69 3.63,14.71 3.32,15.18 3.33,15.74 3.34,16.29 3.65,16.72 4.05,16.73 Z M 6.33,13.87 C 6.33,13.87 3.65,13.87 3.65,13.87 3.42,13.86 3.24,13.38 3.24,12.82 3.25,12.28 3.43,11.84 3.65,11.83 3.65,11.83 6.33,11.83 6.33,11.83 6.57,11.85 6.75,12.32 6.74,12.88 6.74,13.43 6.56,13.86 6.33,13.87 Z M 15.85,13.87 C 15.85,13.87 8.48,13.87 8.48,13.87 8.22,13.86 8.01,13.38 8.02,12.82 8.03,12.28 8.23,11.84 8.48,11.83 8.48,11.83 15.85,11.83 15.85,11.83 16.11,11.85 16.32,12.32 16.31,12.88 16.30,13.43 16.10,13.86 15.85,13.87 Z'</path></svg><span class='spanButton'>" + this.tt.captions + "</span><i class=\"arrow right\"></i>");
        this.$buttonPerceptionParam = $('<button>', {
            'type': 'button',
            'id': 'perceptionParam',
            'tabindex': '1',
            'aria-label': 'Perception sonore',
            'class': 'button normalIcon menuButton',
            'aria-checked': 'false',
        });
        this.$buttonPerceptionParam.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>" + this.tt.perception + "</span><i class=\"arrow right\"></i>");
        this.$buttonReglageParam = $('<button>', {
            'type': 'button',
            'id': 'reglageParam',
            'tabindex': '1',
            'aria-label': 'Perception sonore',
            'class': 'button normalIcon menuButton',
            'aria-checked': 'false',
        });
        this.$buttonReglageParam.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton'>" + this.tt.reglages + "</span><i class=\"arrow right\"></i>");
        if (this.$sources.first().attr('data-sign-opt')) {
            this.$buttonVidcontr.attr('aria-checked', 'false')
            this.$buttonVidcontr.addClass('vidcontr')
            this.$buttonVidcontr.removeClass('vidcontrno')
            this.$buttonVidcontr.text('');
            this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">" + this.tt.vidcontrno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        } else {
            this.$buttonVidcontr.prop("disabled", true);
        }
        if (this.$sources.first().attr('data-sign-src')) {
            if (this.preference.getCookie()['preferences']['prefSign'] == 1) {
                this.$buttonLSF.addClass('aria-no-checked');
                this.$buttonLSF.attr('aria-checked', 'true');
                this.$buttonLSF.text('');
                this.$buttonLSF.addClass('lsfno')
                this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton' >" + this.tt.lsfno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            } else {
                this.$buttonLSF.removeClass('aria-no-checked')
                this.$buttonLSF.attr('aria-checked', 'false')
                this.$buttonLSF.text('');
                this.$buttonLSF.removeClass('lsfno')
                this.$buttonLSF.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.lsfact + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            }
        } else {
            this.$buttonLSF.prop("disabled", true);
        }
        if (this.transcriptType) {
            if (this.preference.getCookie()['preferences']['prefTranscript'] == 1) {
                this.$buttonTranscr.addClass('aria-no-checked')
                this.$buttonTranscr.attr('aria-checked', 'true')
                this.$buttonTranscr.children('span').remove();
                this.$buttonTranscr.children('span').text(this.tt.transcrno);
                this.$buttonTranscr.addClass('transcrno')
                //if(this.$buttonTranscr.children('svg').length == 0){
                this.$buttonTranscr.children('svg').remove();
                this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'" + this.tt.transcract + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                //}

            } else {
                this.$buttonTranscr.removeClass('aria-no-checked')
                this.$buttonTranscr.attr('aria-checked', 'false')
                this.$buttonTranscr.text('');
                this.$buttonTranscr.removeClass('transcrno')
                //if(this.$buttonTranscr.children('svg').length == 0){
                this.$buttonTranscr.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M 3.7966102,16.598445 V 2.1312475 q 0,-0.3613356 0.2486359,-0.6149187 0.2486359,-0.253583 0.6029223,-0.253583 H 11.741044 V 6.181285 q 0,0.3613356 0.248636,0.6149186 0.248636,0.2535831 0.602922,0.2535831 h 4.822584 v 9.5486583 q 0,0.361335 -0.248636,0.614918 -0.248636,0.253584 -0.602922,0.252773 H 4.6481684 q -0.3542864,0 -0.6029223,-0.253583 Q 3.7966102,16.95897 3.7966102,16.597635 Z m 3.404644,-2.893116 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126386 -0.07944,-0.208213 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208213 z m 0,-2.314654 q 0,0.126387 0.079436,0.208214 0.079436,0.08183 0.2041516,0.08102 H 13.72616 q 0.12392,0 0.204151,-0.08102 0.08023,-0.08102 0.07944,-0.208214 v -0.578461 q 0,-0.126387 -0.07944,-0.208214 -0.07944,-0.08183 -0.204151,-0.08102 H 7.4848422 q -0.1239208,0 -0.2041516,0.08102 -0.080231,0.08102 -0.079436,0.208214 z m 0,-2.3154645 q 0,0.1263864 0.079436,0.2082135 0.079436,0.081827 0.2041516,0.081017 H 13.72616 q 0.12392,0 0.204151,-0.081017 0.08023,-0.081017 0.07944,-0.2082135 V 8.4967494 q 0,-0.1263864 -0.07944,-0.2082135 -0.07944,-0.081827 -0.204151,-0.081017 H 7.4848422 q -0.1239208,0 -0.2041516,0.081017 -0.080231,0.081017 -0.079436,0.2082135 z M 12.875396,5.8928646 v -4.267973 q 0.195413,0.1263864 0.319334,0.253583 l 3.617534,3.689512 q 0.123921,0.1263865 0.248636,0.3256882 h -4.18471 z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.transcract + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                //}
            }
        } else {
            this.$buttonTranscr.prop("disabled", true);
        }

        if (this.transcriptType) {
            if (this.preference.getCookie()['preferences']['prefDesc'] == 1) {
                this.$buttonAudioDesc.addClass('aria-no-checked')
                this.$buttonAudioDesc.attr('aria-checked', 'true')
                this.$buttonAudioDesc.text('');
                this.$buttonAudioDesc.addClass('audiodescno')
                //this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><line x1='0' y1='0' x2='200' y2='200' style='display:none'/><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.audiodescno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");

            } else {
                this.$buttonAudioDesc.removeClass('aria-no-checked')
                this.$buttonAudioDesc.attr('aria-checked', 'false')
                this.$buttonAudioDesc.text('');
                this.$buttonAudioDesc.removeClass('audiodescno')
                //this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z'</path></svg><span id=\"\" class='spanButton'>"+this.tt.audiodescact+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                this.$buttonAudioDesc.append("<svg style='float:left;margin-left:25%' viewBox='0 0 30 20'><line x1='0' y1='0' x2='200' y2='200' style='display:block'/><path d='M 18.02,15.96 C 20.08,15.51 21.67,13.84 22.12,11.64 22.32,10.67 22.32,9.43 22.12,8.63 21.59,6.55 19.66,4.65 17.68,4.28 17.36,4.22 16.15,4.14 14.99,4.11 14.99,4.11 12.87,4.05 12.87,4.05 12.87,4.05 12.87,10.08 12.87,10.08 12.87,10.08 12.87,16.12 12.87,16.12 12.87,16.12 15.09,16.12 15.09,16.12 16.61,16.12 17.53,16.07 18.02,15.96 18.02,15.96 18.02,15.96 18.02,15.96 Z M 15.88,13.02 C 15.88,13.02 15.59,12.98 15.59,12.98 15.59,12.98 15.59,10.13 15.59,10.13 15.59,10.13 15.59,7.28 15.59,7.28 15.59,7.28 16.38,7.28 16.38,7.28 17.31,7.28 17.72,7.43 18.16,7.95 18.66,8.53 18.86,9.29 18.81,10.35 18.75,11.47 18.37,12.25 17.67,12.69 17.21,12.97 16.45,13.11 15.88,13.02 Z M 4.71,15.31 C 4.71,15.31 5.16,14.61 5.16,14.61 5.16,14.61 7.24,14.61 7.24,14.61 7.24,14.61 9.32,14.61 9.32,14.61 9.32,14.61 9.32,15.31 9.32,15.31 9.32,15.31 9.32,16.01 9.32,16.01 9.32,16.01 10.68,16.01 10.68,16.01 10.68,16.01 12.04,16.01 12.04,16.01 12.04,16.01 12.04,10.14 12.04,10.14 12.04,6.90 12.05,4.22 12.06,4.18 12.08,4.13 11.31,4.09 10.36,4.07 10.36,4.07 8.64,4.04 8.64,4.04 8.64,4.04 4.81,9.57 4.81,9.57 2.70,12.61 0.82,15.30 0.64,15.55 0.64,15.55 0.32,16.01 0.32,16.01 0.32,16.01 2.28,16.01 2.28,16.01 2.28,16.01 4.25,16.00 4.25,16.00 4.25,16.00 4.71,15.31 4.71,15.31 Z M 6.57,12.55 C 6.57,12.49 7.69,10.75 8.43,9.66 8.43,9.66 8.86,9.02 8.86,9.02 8.86,9.02 8.86,10.81 8.86,10.81 8.86,10.81 8.86,12.61 8.86,12.61 8.86,12.61 7.71,12.61 7.71,12.61 7.08,12.61 6.57,12.59 6.57,12.55 6.57,12.55 6.57,12.55 6.57,12.55 Z M 22.78,15.90 C 24.45,13.36 24.68,9.55 23.33,6.77 23.12,6.34 22.81,5.81 22.64,5.58 22.37,5.23 22.26,5.17 21.92,5.17 21.92,5.17 21.51,5.17 21.51,5.17 21.51,5.17 21.88,5.67 21.88,5.67 22.95,7.12 23.46,9.10 23.36,11.35 23.27,13.17 22.83,14.57 21.91,15.98 21.69,16.32 21.51,16.63 21.51,16.66 21.51,16.69 21.68,16.71 21.89,16.69 22.24,16.66 22.33,16.58 22.78,15.90 22.78,15.90 22.78,15.90 22.78,15.90 Z M 25.21,16.18 C 25.70,15.49 26.34,14.05 26.59,13.10 26.87,11.99 26.84,9.52 26.54,8.39 26.31,7.49 25.78,6.34 25.28,5.63 24.99,5.22 24.91,5.17 24.54,5.17 24.54,5.17 24.12,5.17 24.12,5.17 24.12,5.17 24.48,5.66 24.48,5.66 24.96,6.31 25.41,7.30 25.70,8.35 26.05,9.58 26.05,12.05 25.71,13.28 25.41,14.36 25.07,15.15 24.55,15.94 24.31,16.30 24.12,16.62 24.12,16.65 24.12,16.68 24.28,16.71 24.47,16.71 24.78,16.71 24.88,16.63 25.21,16.18 25.21,16.18 25.21,16.18 25.21,16.18 Z M 27.46,16.30 C 28.28,15.27 28.92,13.54 29.13,11.76 29.37,9.73 28.77,7.26 27.66,5.65 27.36,5.23 27.27,5.17 26.93,5.17 26.93,5.17 26.53,5.17 26.53,5.17 26.53,5.17 27.04,6.01 27.04,6.01 28.40,8.23 28.72,11.22 27.87,13.84 27.56,14.81 26.90,16.11 26.58,16.38 26.32,16.60 26.39,16.71 26.77,16.71 27.06,16.71 27.20,16.63 27.46,16.30 27.46,16.30 27.46,16.30 27.46,16.30 Z'</path></svg><span id=\"\" class='spanButton'>" + this.tt.audiodescact + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");

            }
        } else {
            this.$buttonAudioDesc.prop("disabled", true);
        }
        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'visionPlus') {
            this.$buttonVisionPlus.attr('aria-checked', 'true');
            this.$buttonVisionPlus.addClass('aria-no-checked');
            this.$buttonVidcontr.addClass('vidcontrno');
            this.$buttonVidcontr.attr('aria-label', this.tt.vidcontr);
            this.$buttonVidcontr.text('');
            this.$buttonVidcontr.append("<svg style='box-shadow:1px 1px 0px #aaa;float:left;margin-left:25%' class=\"captions\" ></svg><span id=\"\" span='classButton'>" + this.tt.vidcontr + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");

            this.$buttonVidcontr.attr('aria-checked', 'true');
            this.$buttonSpeedsMain.css('display', 'block');

            //Put vidcontr ON here
            //var vids = document.getElementsByTagName('video')
            this.$media.css('filter', 'grayscale(100%) contrast(150%)')
            //console.log(this.$media);

        }
        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus') {
            this.$buttonSansVisionPlus.attr('aria-checked', 'true');
            this.$buttonSansVisionPlus.addClass('aria-no-checked');
            this.$buttonSpeedsMain.css('display', 'block');
            if (this.preference.getCookie()['preferences']['prefDesc'] === 1) {
                this.$buttonAudioDesc.attr('aria-checked', 'true');
                this.$buttonAudioDesc.addClass('aria-no-checked');
                this.$buttonAudioDesc.children('span').text(this.tt.audiodescno);
            } else {
                this.$buttonAudioDesc.attr('aria-checked', 'false');
                this.$buttonAudioDesc.removeClass('aria-no-checked');
                this.$buttonAudioDesc.children('span').text(this.tt.audiodescact);
            }
        }
        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'auditionPlus') {
            this.$buttonAuditionPlus.attr('aria-checked', 'true');
            this.$buttonAuditionPlus.addClass('aria-no-checked');
        }
        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'lsfPlus') {
            console.log('lsfPlus en mode usage');
            this.$buttonLSFPlus.attr('aria-checked', 'true');
            this.$buttonLSFPlus.addClass('aria-no-checked');
            this.$buttonVidcontr2.css('display', 'block');
        }

        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'defPlus') {
            console.log('defPlus en mode usage');
            this.$buttonDefPlus.attr('aria-checked', 'false');
            this.$buttonDefPlus.addClass('firstTime');
            this.$buttonDefPlus.removeClass('aria-no-checked');
            setTimeout(function () {
                $('#defPlus').click();
            }, 3000);

        }

        if (this.preference.getCookie()['preferences']['prefModeUsage'] === 'conPlus') {
            console.log('conPlus en mode usage');
            this.$buttonConPlus.attr('aria-checked', 'true');
            this.$buttonConPlus.addClass('aria-no-checked');
            this.$buttonSpeedsMain.css('display', 'block');
            if (this.preference.getCookie()['preferences']['prefTranscript'] === 1) {
                this.$buttonTranscr.attr('aria-checked', 'true');
                this.$buttonTranscr.addClass('aria-no-checked');
                this.$buttonTranscr.children('span').text(this.tt.transcrno + '');
            } else {
                this.$buttonTranscr.attr('aria-checked', 'false');
                this.$buttonTranscr.removeClass('aria-no-checked');
                this.$buttonTranscr.children('span').text(this.tt.transcract + '');
            }

        }
        if (this.preference.getCookie()['preferences']['prefCaptionsColor'] != '') {
            var color = this.preference.getCookie()['preferences']['prefCaptionsColor'];
            $(this.$controllerOrangeTextColorDiv).children().each(function () {
                if ($(this)[0].id.includes(color)) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }
        if (this.preference.getCookie()['preferences']['prefCaptionsBGColor'] != '') {
            var color = this.preference.getCookie()['preferences']['prefCaptionsBGColor'];
            $(this.$controllerOrangeBGColorDiv).children().each(function () {
                if ($(this)[0].id.includes(color)) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }

        if (this.preference.getCookie()['preferences']['prefFollowColor'] != '' && this.preference.getCookie()['preferences']['prefFollowColor'] != '#FF6') {
            var color = this.preference.getCookie()['preferences']['prefFollowColor'];
            $(this.$controllerOrangeFollowColorDiv).children().each(function () {
                if ($(this)[0].id.includes(color)) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }

        if (this.preference.getCookie()['preferences']['prefVidSize'] != '' && this.preference.getCookie()['preferences']['prefVidSize'] != '66') {
            var prefVidSize = this.preference.getCookie()['preferences']['prefVidSize'];
            $(this.$controllerOrangeFollowColorDiv).children().each(function () {
                if ($(this)[0].id.includes(prefVidSize)) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }


        if (this.preference.getCookie()['preferences']['prefCaptionsSize'] != '') {
            var size = this.preference.getCookie()['preferences']['prefCaptionsSize'];
            $(this.$controllerOrangeFontSizeDiv).children().each(function () {
                if ($($(this)[0].children[0]).text() === size) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }


        if (this.preference.getCookie()['preferences']['prefShadowType'] != '') {
            var size = this.preference.getCookie()['preferences']['prefShadowType'];
            $(this.$controllerOrangeOutTextDiv).children().each(function () {
                if ($($(this)[0].children[0]).text() === size) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }

        if (this.preference.getCookie()['preferences']['prefCaptionsFont'] != '') {
            var size = this.preference.getCookie()['preferences']['prefCaptionsFont'];
            $(this.$controllerOrangeFontDiv).children().each(function () {
                if ($($(this)[0].children[0]).text() === size) {
                    $(this).addClass('aria-no-checked');
                    $(this).attr('aria-no-checked', 'true');
                }

            });
        }
        if (this.browser.userAgent.browser.name != 'Firefox') {
            this.$controllerOrangeSettingsDiv.append(this.$buttonHideSettings, this.$buttonSpeeds, this.$buttonCaptionsParam, this.$buttonLSF, this.$buttonAudioDesc, this.$buttonTranscr, this.$buttonVidcontr, this.$buttonPerceptionParam, this.$buttonReglageParam);
        } else {
            this.$controllerOrangeSettingsDiv.append(this.$buttonHideSettings, this.$buttonSpeeds, this.$buttonCaptionsParam, this.$buttonLSF, this.$buttonAudioDesc, this.$buttonTranscr, this.$buttonVidcontr, this.$buttonReglageParam);
        }

        this.$controllerOrangeSettingsDiv.attr('style', 'display:none');


        if (this.preference.getCookie()['preferences']['prefColorButton'] != '') {
            var color = this.preference.getCookie()['preferences']['prefColorButton'];
            $(this.$controllerOrangeButtonColorDiv).children().each(function () {
                if ($($(this)[0].children[0]).id === color) {
                    $(this).attr('aria-checked', 'true');
                }

            });
            $(this.$controllerOrangeDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeVolumeDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeVolumeDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeBGColorDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeBGColorDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeFollowColorDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeFollowColorDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeFontDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeFontDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeFontSizeDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeFontSizeDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeOutTextDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeOutTextDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangePerceptionDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangePerceptionDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangePreferencesDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangePreferencesDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeReglagesDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeReglagesDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeSettingsDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeSettingsDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeSubtitlesDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeSubtitlesDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });
            $(this.$controllerOrangeTextColorDiv).find('.button').each(function () {
                if ($(this).id != 'whiteblue' &&
                    $(this).id != 'bluewhite' &&
                    $(this).id != 'yellowblue' &&
                    $(this).id != 'blueyellow' &&
                    $(this).id != 'whiteblack' &&
                    $(this).id != 'blackwhite') {
                    $(this).removeClass('whiteblue');
                    $(this).removeClass('bluewhite');
                    $(this).removeClass('yellowblue');
                    $(this).removeClass('blueyellow');
                    $(this).removeClass('whiteblack');
                    $(this).removeClass('blackwhite');
                    $(this).addClass(color);
                }


            });
            $(this.$controllerOrangeTextColorDiv).find('i').each(function () {
                $(this).removeClass('whiteblue');
                $(this).removeClass('bluewhite');
                $(this).removeClass('yellowblue');
                $(this).removeClass('blueyellow');
                $(this).removeClass('whiteblack');
                $(this).removeClass('blackwhite');
                $(this).addClass(color);

            });


        }
        this.$playerDiv = $('<div>', {
            'class': 'able-player',
            'role': 'region',
            'aria-label': this.mediaType + ' player'
        });
        this.$playerDiv.addClass('able-' + this.mediaType);
        this.$nowPlayingDiv = $('<div>', {
            'class': 'able-now-playing',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });

        this.$controllerDiv = $('<div>', {
            'class': 'able-controller'
        });
        this.$controllerDiv.addClass('able-' + this.iconColor + '-controls');

        this.$controllerDivPlus = $('<div>', {
            'class': 'able-controller'
        });
        this.$controllerDivPlus.addClass('able-' + this.iconColor + '-controls');

        this.$statusBarDiv = $('<div>', {
            'class': 'able-status-bar',
            'style': 'display:none'
        });
        this.$timer = $('<span>', {
            'class': 'able-timer'
        });
        this.$elapsedTimeContainer = $('<span>', {
            'class': 'able-elapsedTime',
            text: '0:00'
        });
        this.$durationContainer = $('<span>', {
            'class': 'able-duration'
        });
        //Add copy for Orange container
        this.$elapsedTimeContainerOrange = $('<span>', {
            'style': 'width: 25%;margin-right: 15px',
            'class': 'able-elapsedTime',
            text: '0:00'
        });
        this.$setTimeOrange = $('<input>', {
            'style': 'width: 50%',
            'id': 'setTimeOrange',
            'type': 'text',
            'placeholder': 'Saisissez un instant précis'
        });
        this.$durationContainerOrange = $('<span>', {
            'style': 'width: 25%',
            'class': 'able-duration'
        });

        this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);

        this.$speed = $('<span>', {
            'class': 'able-speed',
            'aria-live': 'assertive'
        }).text(this.tt.speed + ': 1x');

        this.$status = $('<span>', {
            'class': 'able-status',
            'aria-live': 'polite'
        });

        //Orange add button to display accessible menu
        this.$accMenu = $('<span>', {
            'class': 'acc-menu',
            'id': 'acc-menu-id',
            'role': 'button',
            'tabindex': '1',
            'aria-label': 'Bouton affichage menu accessibilité',
            'aria-live': 'polite'
        }).text(this.tt.showAccMenu);

        //Orange check if menu accessible have to be deployed
        if (this.preference.getCookie()['preferences']['prefAccessMenu'] != '') {
            if (this.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                this.$accMenu.text(this.tt.maskAccMenu);
                //this.$controllerDiv.attr("style","display:none");
                this.$controllerDivPlus.attr("style", "display:none");
                this.$controllerOrangeDiv.attr("style", "display:block");
            } else {
                this.$accMenu.text(this.tt.showAccMenu);
                //this.$controllerDivPlus.attr("style","display:block");
                this.$controllerDiv.attr("style", "display:block");
                //this.$controllerDiv.attr("style","display:none");
                this.$controllerOrangeDiv.attr("style", "display:none");
            }
        }
        this.$statusBarDiv.append(this.$timer, this.$accMenu, this.$speed, this.$status);
        if (this.browser.userAgent.browser.name != 'Firefox') {
            this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv, this.$controllerOrangeDiv, this.$controllerOrangeVolumeDiv, this.$controllerOrangeSettingsDiv, this.$controllerOrangeSubtitlesDiv, this.$controllerOrangePreferencesDiv, this.$controllerOrangePerceptionDiv, this.$controllerOrangeReglagesDiv, this.$controllerOrangeTextColorDiv, this.$controllerOrangeBGColorDiv, this.$controllerOrangeFollowColorDiv, this.$controllerOrangeFontSizeDiv, this.$controllerOrangeOutTextDiv, this.$controllerOrangeFontDiv, this.$controllerOrangeButtonColorDiv);
        } else {
            this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv, this.$controllerOrangeDiv, this.$controllerOrangeVolumeDiv, this.$controllerOrangeSettingsDiv, this.$controllerOrangeSubtitlesDiv, this.$controllerOrangePreferencesDiv, this.$controllerOrangeReglagesDiv, this.$controllerOrangeTextColorDiv, this.$controllerOrangeBGColorDiv, this.$controllerOrangeFollowColorDiv, this.$controllerOrangeFontSizeDiv, this.$controllerOrangeOutTextDiv, this.$controllerOrangeFontDiv, this.$controllerOrangeButtonColorDiv);
        }

        this.$ableDiv.append(this.$playerDiv);
    };

    /**
     * insère une description dans le DOM pour le basePlayer
     */
    injectTextDescriptionArea() {
        this.$descDiv = $('<div>', {
            'class': 'able-descriptions',
            'aria-live': 'assertive',
            'aria-atomic': 'true',
            'width': this.$playerDiv.width() + 'px',
        });
        this.$descDiv.hide();
        this.$ableDiv.append(this.$descDiv);
    }

    /**
     * return default width of resizable elements
     */
    getDefaultWidth(which) {
        if (which === 'transcript') {
            return 450;
        } else if (which === 'sign') {
            return 400;
        }
    }

    positionDraggableWindow(which, width) {
        let cookie, cookiePos, $window, dragged, windowPos;
        cookie = this.preference.getCookie();
        if (which === 'transcript') {
            $window = this.$transcriptArea;
            if (typeof cookie.transcript !== 'undefined') {
                cookiePos = cookie.transcript;
            }
        } else if (which === 'sign') {
            $window = this.$signWindow;
            if (typeof cookie.transcript !== 'undefined') {
                cookiePos = cookie.sign;
            }
        }
        if (typeof cookiePos !== 'undefined' && !($.isEmptyObject(cookiePos))) {
            $window.css({
                'position': cookiePos['position'],
                'width': cookiePos['width'],
                'z-index': cookiePos['zindex']
            });
            if (cookiePos['position'] === 'absolute') {
                $window.css({
                    'top': cookiePos['top'],
                    'left': cookiePos['left']
                });
            }
            this.control.updateZIndex(which);
        } else {
            windowPos = this.getOptimumPosition(which, width);
            if (typeof width === 'undefined') {
                width = this.getDefaultWidth(which);
            }
            $window.css({
                'position': windowPos[0],
                'width': width,
                'z-index': windowPos[3]
            });
            if (windowPos[0] === 'absolute') {
                $window.css({
                    'top': windowPos[1] + 'px',
                    'left': windowPos[2] + 'px',
                });
            }
        }
    }

    /**
     * returns optimum position for targetWindow, as an array with the following structure:
     */
    getOptimumPosition(targetWindow, targetWidth) {
        var gap, position, ableWidth, ableHeight, ableOffset, ableTop, ableLeft,
            windowWidth, otherWindowWidth, zIndex;

        if (typeof targetWidth === 'undefined') {
            targetWidth = this.getDefaultWidth(targetWindow);
        }
        gap = 5;
        position = []; // position, top, left
        ableWidth = this.$ableDiv.width();
        ableHeight = this.$ableDiv.height();
        ableOffset = this.$ableDiv.offset();
        ableTop = ableOffset.top;
        ableLeft = ableOffset.left;
        windowWidth = $(window).width();
        otherWindowWidth = 0;
        if (targetWindow === 'transcript') {
            if (typeof this.$signWindow !== 'undefined') {
                if (this.$signWindow.is(':visible')) {
                    otherWindowWidth = this.$signWindow.width() + gap;
                }
            }
        } else if (targetWindow === 'sign') {
            if (typeof this.$transcriptArea !== 'undefined') {
                if (this.$transcriptArea.is(':visible')) {
                    otherWindowWidth = this.$transcriptArea.width() + gap;
                }
            }
        }
        if (targetWidth < (windowWidth - (ableLeft + ableWidth + gap + otherWindowWidth))) {
            position[0] = 'absolute';
            position[1] = 0;
            position[2] = ableWidth + otherWindowWidth + gap;
        } else if (targetWidth + gap < ableLeft) {
            position[0] = 'absolute';
            position[1] = 0;
            position[2] = ableLeft - targetWidth - gap;
        } else {
            position[0] = 'relative';
        }
        return position;
    }

    /**
     * recupère le poster prédéfini et le place dans la balise $element
     * get poster attribute from media element and append that as an img to $element
     * @param $element
     * @param context
     */
    injectPoster($element, context) {
        var poster, width, height;
        if (context === 'youtube') {
            if (typeof this.ytWidth !== 'undefined') {
                width = this.ytWidth;
                height = this.ytHeight;
            } else if (typeof this.playerMaxWidth !== 'undefined') {
                width = this.playerMaxWidth;
                height = this.playerMaxHeight;
            } else if (typeof this.playerWidth !== 'undefined') {
                width = this.playerWidth;
                height = this.playerHeight;
            }
        } else if (context === 'fallback') {
            width = '100%';
            height = 'auto';
        }

        if (this.$media.attr('poster')) {
            poster = this.$media.attr('poster');
            this.$posterImg = $('<img>', {
                'class': 'able-poster',
                'src': poster,
                'alt': "",
                'role': "presentation",
                'width': width,
                'height': height
            });
            $element.append(this.$posterImg);
        }
    }

    /**
     * insère une alerte du basePlayer dans le DOM
     */
    injectAlert() {
        var top;
        this.$alertBox = $('<div role="alert"></div>');
        this.$alertBox.addClass('able-alert');
        this.$alertBox.hide();
        this.$alertBox.appendTo(this.$ableDiv);
        if (this.mediaType == 'audio') {
            top = '-10';
        } else {
            top = Math.round(this.$mediaContainer.offset().top * 10) / 10;
        }
        this.$alertBox.css({
            top: top + 'px'
        });

        this.$srAlertBox = $('<div role="alert"></div>');
        this.$srAlertBox.addClass('able-screenreader-alert');
        this.$srAlertBox.appendTo(this.$ableDiv);
    }

    /**
     * Insère le tag pour le playlist dans le DOM
     */
    injectPlaylist() {
        if (this.playlistEmbed === true) {
            var playlistClone = this.$playlistDom.clone();
            playlistClone.insertBefore(this.$statusBarDiv);
            this.$playlist = playlistClone.find('li');
        }

        if (this.hasPlaylist && this.$sources.length === 0) {
            this.initializing = true;
            this.swapSource(0);
            this.$sources = this.$media.find('source');
        }
    }

    /**
     * Create popup menu and append to basePlayer
     * @param which
     * @param tracks
     * @returns {*}
     */
    createPopup(which, tracks) {
        let thisObj, $popup, whichMenu, $thisButton, $thisListItem, $prevButton, $nextButton,
            $thisItem, $prevItem, $nextItem, selectedTrackIndex, selectedTrack;
        thisObj = this;
        $popup = $('<div>', {
            'id': this.mediaId + '-' + which + '-menu',
            'class': 'able-popup',
            'z-index': '9000'
        }).hide();
        if (which == 'prefs') {
            $popup.attr('role', 'menu');
        }
        if (which === 'chapters' || which === 'prefs' || which === 'sign-window' || which === 'transcript-window') {
            $popup.addClass('able-popup-no-radio');
        }
        $popup.on('keydown', function (e) {
            whichMenu = $(this).attr('id').split('-')[1]; // 'prefs','captions' or 'chapters'
            if (whichMenu === 'prefs') { // pop-up menu is a list of menu items
                $thisItem = $(this).find('li:focus');
                if ($thisItem.is(':first-child')) {
                    // this is the first item in the menu
                    $prevItem = $(this).find('li').last(); // wrap to bottom
                    $nextItem = $thisItem.next();
                } else if ($thisItem.is(':last-child')) {
                    // this is the last Item
                    $prevItem = $thisItem.prev();
                    $nextItem = $(this).find('li').first(); // wrap to top
                } else {
                    $prevItem = $thisItem.prev();
                    $nextItem = $thisItem.next();
                }
                if (e.which === 9) { // Tab
                    if (e.shiftKey) {
                        $thisItem.removeClass('able-focus');
                        $prevItem.focus().addClass('able-focus');
                    } else {
                        $thisItem.removeClass('able-focus');
                        $nextItem.focus().addClass('able-focus');
                    }
                } else if (e.which === 40 || e.which === 39) { // down or right arrow
                    $thisItem.removeClass('able-focus');
                    $nextItem.focus().addClass('able-focus');
                } else if (e.which == 38 || e.which === 37) { // up or left arrow
                    $thisItem.removeClass('able-focus');
                    $prevItem.focus().addClass('able-focus');
                } else if (e.which === 32 || e.which === 13) { // space or enter
                    $thisItem.click();
                } else if (e.which === 27) {  // Escape
                    $thisItem.removeClass('able-focus');
                    thisObj.closePopups();
                }
                e.preventDefault();
            } else { // other than prefs, each other pop-up menu is a list of radio buttons
                $thisButton = $(this).find('input:focus');
                $thisListItem = $thisButton.parent();
                if ($thisListItem.is(':first-child')) {
                    // this is the first button
                    $prevButton = $(this).find('input').last(); // wrap to bottom
                    $nextButton = $thisListItem.next().find('input');
                } else if ($thisListItem.is(':last-child')) {
                    // this is the last button
                    $prevButton = $thisListItem.prev().find('input');
                    $nextButton = $(this).find('input').first(); // wrap to top
                } else {
                    $prevButton = $thisListItem.prev().find('input');
                    $nextButton = $thisListItem.next().find('input');
                }
                if (e.which === 9) { // Tab
                    if (e.shiftKey) {
                        $thisListItem.removeClass('able-focus');
                        $prevButton.focus();
                        $prevButton.parent().addClass('able-focus');
                    } else {
                        $thisListItem.removeClass('able-focus');
                        $nextButton.focus();
                        $nextButton.parent().addClass('able-focus');
                    }
                } else if (e.which === 40 || e.which === 39) { // down or right arrow
                    $thisListItem.removeClass('able-focus');
                    $nextButton.focus();
                    $nextButton.parent().addClass('able-focus');
                } else if (e.which == 38 || e.which === 37) { // up or left arrow
                    $thisListItem.removeClass('able-focus');
                    $prevButton.focus();
                    $prevButton.parent().addClass('able-focus');
                } else if (e.which === 32 || e.which === 13) { // space or enter
                    $thisListItem.find('input:focus').click();
                } else if (e.which === 27) {  // Escape
                    $thisListItem.removeClass('able-focus');
                    thisObj.closePopups();
                }
                e.preventDefault();
            }
        });
        this.$controllerDiv.append($popup);
        return $popup;
    }

    closePopups() {
        if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
            this.chaptersPopup.hide();
            this.$chaptersButton.focus();
        }
        if (this.captionsPopup && this.captionsPopup.is(':visible')) {
            this.captionsPopup.hide();
            this.$ccButton.focus();
        }
        if (this.accessPopup && this.accessPopup.is(':visible')) {
            this.accessPopup.hide();
            this.$accMenu.focus();
            $('.able-button-handler-accmenu').focus();
        }
        if (this.prefsPopup && this.prefsPopup.is(':visible')) {
            this.prefsPopup.hide();
            // restore menu items to their original state
            this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex', '-1');
            this.$prefsButton.focus();
        }
        if (this.$windowPopup && this.$windowPopup.is(':visible')) {
            this.$windowPopup.hide();
            this.$windowButton.show().focus();
        }
        if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
            this.$volumeSlider.hide().attr('aria-hidden', 'true');
            this.$volumeAlert.text(this.tt.volumeSliderClosed);
            this.$volumeButton.focus();
        }
    }

    /**
     * Create and fill in the popup menu forms for various controls.
     * @param which
     * @returns {*}
     */
    setupPopups(which) {
        var popups, thisObj, hasDefault, i, j,
            tracks, track, $trackButton, $trackLabel,
            radioName, radioId, $menu, $menuItem,
            prefCats, prefCat, prefLabel;

        popups = [];
        if (typeof which === 'undefined') {
            popups.push('prefs');
        }
        if (which === 'accmenu') {
            popups.push('accmenu');
        }

        if (which === 'captions' || (typeof which === 'undefined')) {
            if (typeof this.ytCaptions !== 'undefined') { // setup popup for YouTube captions
                if (this.ytCaptions.length) {
                    popups.push('ytCaptions');
                }
            } else { // setup popup for local captions
                if (this.captions.length > 0) {
                    popups.push('captions');
                }
            }
        }
        if (which === 'chapters' || (typeof which === 'undefined')) {
            if (this.chapters.length > 0 && this.useChaptersButton) {
                popups.push('chapters');
            }
        }

        if (popups.length > 0) {
            thisObj = this;
            for (var i = 0; i < popups.length; i++) {
                var popup = popups[i];
                hasDefault = false;
                if (popup == 'prefs') {
                    this.prefsPopup = this.createPopup('prefs');
                } else if (popup == 'accmenu') {
                    if (typeof this.accessPopup === 'undefined') {
                        this.accessPopup = this.createPopup('accmenu');
                    }
                } else if (popup == 'captions') {
                    if (typeof this.captionsPopup === 'undefined') {
                        this.captionsPopup = this.createPopup('captions');
                    }
                    tracks = this.captions;
                } else if (popup == 'chapters') {
                    if (typeof this.chaptersPopup === 'undefined') {
                        this.chaptersPopup = this.createPopup('chapters');
                    }
                    if (this.selectedChapters) {
                        tracks = this.selectedChapters.cues;
                    } else if (this.chapters.length >= 1) {
                        tracks = this.chapters[0].cues;
                    } else {
                        tracks = [];
                    }
                } else if (popup == 'ytCaptions') {
                    if (typeof this.captionsPopup === 'undefined') {
                        this.captionsPopup = this.createPopup('captions');
                    }
                    tracks = this.ytCaptions;
                }
                $menu = $('<ul></ul>');
                radioName = this.mediaId + '-' + popup + '-choice';
                if (popup === 'prefs') {
                    $menu.attr('role', 'presentation');
                    prefCats = this.preference.getPreferencesGroups();
                    for (j = 0; j < prefCats.length; j++) {
                        $menuItem = $('<li></li>', {
                            'role': 'menuitem',
                            'tabindex': '-1'
                        });
                        prefCat = prefCats[j];
                        if (prefCat === 'captions') {
                            $menuItem.text(this.tt.prefMenuCaptions);
                        } else if (prefCat === 'descriptions') {
                            $menuItem.text(this.tt.prefMenuDescriptions);
                        } else if (prefCat === 'keyboard') {
                            $menuItem.text(this.tt.prefMenuKeyboard);
                        } else if (prefCat === 'transcript') {
                            $menuItem.text(this.tt.prefMenuTranscript);
                        }
                        $menuItem.click(function (event) {
                            var whichPref = $(this).text();
                            thisObj.control.setFullscreen(false);
                            if (whichPref === 'Captions') {
                                thisObj.captionPrefsDialog.show();
                            } else if (whichPref === 'Descriptions') {
                                thisObj.descPrefsDialog.show();
                            } else if (whichPref === 'Keyboard') {
                                thisObj.keyboardPrefsDialog.show();
                            } else if (whichPref === 'Transcript') {
                                thisObj.transcriptPrefsDialog.show();
                            }
                            thisObj.closePopups();
                        });
                        $menu.append($menuItem);
                    }
                    this.prefsPopup.append($menu);
                } else if (popup === 'accmenu') {
                    var profils = ['Vision +', 'Sans vision +', 'LSF +', 'Concentration +', 'Audition +', 'Standard'];
                    var profilLabel = ['Choisir le profil optimisé pour la vision difficile', 'Choisir le profil optimisé pour l’absence de vision', 'Choisir le profil optimisé pour l’audition', 'Choisir le profil optimisé pour la concentration', 'Choisir le profil optimisé pour l\'audition', 'Choisir le profil Standard'];
                    var profilImgList = ['vplus', 'svplus', 'lsfplus', 'conplus', 'audplus', 'profdef'];
                    //$menu.attr('role','presentation');
                    var jChecked = 10;
                    for (j = 0; j < profils.length; j++) {
                        var profil = profils[j];
                        radioId = popup + '-' + j;
                        $menuItem = $('<li></li>');
                        $menuItem.css('cursor', 'pointer');
                        var profilImg = $('<span>', {
                            alt: '',
                            role: 'presentation',
                            class: 'popupAccess',
                            style: 'filter:invert(100%);margin-left:2%;margin-bottom:-1.5%;background-size:cover;width:1em;display:inline-block;height:1em;background-image: url(' + this.rootPath + 'button-icons/' + this.iconColor + '/' + profilImgList[j] + '.svg)',

                        });
                        $trackButton = $('<input>', {
                            'type': 'radio',
                            'val': j,
                            'name': profil,
                            'id': radioId,
                            'class': profilImgList[j],
                            'aria-label': profilLabel[j],
                        });
                        $trackLabel = $('<label>', {
                            'for': radioId
                        });
                        $trackLabel.css('cursor', 'pointer');
                        $trackLabel.css('min-width', '80%');
                        $trackLabel.text(profil);
                        $menuItem.on('click', function (event) {
                            console.log('on click menu item');
                            $(event.target).find('input').click();
                        });
                        $('.' + profilImgList[j]).on('click', function (event) {
                            thisObj.handleChangeProfil(profilImgList[j])
                        });
                        if ((this.prefModeUsage == 'visionPlus' && j == 0) || (this.prefModeUsage == 'sansVisionPlus' && j == 1) || (this.prefModeUsage == 'lsfPlus' && j == 2) || (this.prefModeUsage == 'conPlus' && j == 3) || (this.prefModeUsage == 'auditionPlus' && j == 4) || (this.prefModeUsage == 'profDef' && j == 5)) {
                            //$trackButton.prop('checked',true);
                            jChecked = j;
                        }
                        $menuItem.append($trackButton, profilImg, $trackLabel);
                        $menu.append($menuItem);
                        this.accessPopup.append($menu);
                        this.accessPopup.css('min-width', '40%');
                    }
                    this.accessPopup.find('input:radio[value=' + jChecked + ']').prop('checked', true)

                } else {
                    for (j = 0; j < tracks.length; j++) {
                        $menuItem = $('<li></li>');
                        $menuItem.css('cursor', 'pointer');
                        track = tracks[j];
                        radioId = this.mediaId + '-' + popup + '-' + j;
                        $trackButton = $('<input>', {
                            'type': 'radio',
                            'val': j,
                            'name': radioName,
                            'id': radioId
                        });
                        if (track.def) {
                            $trackButton.prop('checked', true);
                            hasDefault = true;
                        }
                        $trackLabel = $('<label>', {
                            'for': radioId
                        });
                        $trackLabel.css('cursor', 'pointer');
                        $trackLabel.css('min-width', '91%');
                        if (track.language !== 'undefined') {
                            $trackButton.attr('lang', track.language);
                        }
                        if (track.language === 'en') {
                            $('#subtitlesEN').click(this.caption.getCaptionClickFunction(track));
                        } else if (track.language === 'fr') {
                            $('#subtitlesFR').click(this.caption.getCaptionClickFunction(track));
                        } else if (track.language === 'es') {
                            $('#subtitlesES').click(this.caption.getCaptionClickFunction(track));
                        } else if (track.language === 'pl') {
                            $('#subtitlesPL').click(this.caption.getCaptionClickFunction(track));
                        } else if (track.language === 'ml') {
                            $('#subtitlesML').click(this.caption.getCaptionClickFunction(track));
                        }
                        //end
                        if (popup == 'captions' || popup == 'ytCaptions') {
                            $trackLabel.text(track.label || track.language);
                            //console.log("clic popup language : "+track.language);
                            $trackButton.click(this.caption.getCaptionClickFunction(track));
                            $menuItem.click(this.caption.getCaptionClickFunction(track));
                        } else if (popup == 'chapters') {
                            $trackLabel.text(this.caption.flattenCueForCaption(track) + ' - ' + Misc.formatSecondsAsColonTime(track.start));
                            var getClickFunction = function (time) {
                                return function () {
                                    thisObj.seekTrigger = 'chapter';
                                    thisObj.seekTo(time);
                                    thisObj.hidingPopup = true;
                                    thisObj.chaptersPopup.hide();
                                    setTimeout(function () {
                                        thisObj.hidingPopup = false;
                                    }, 100);
                                    thisObj.$chaptersButton.focus();
                                }
                            }
                            $trackButton.on('click keypress', getClickFunction(track.start));
                        }
                        $menuItem.append($trackButton, $trackLabel);
                        $menu.append($menuItem);
                    }
                    if (popup == 'captions' || popup == 'ytCaptions') {
                        // add a captions off button
                        radioId = this.mediaId + '-captions-off';
                        $menuItem = $('<li></li>');
                        $trackButton = $('<input>', {
                            'type': 'radio',
                            'name': radioName,
                            'id': radioId
                        });
                        $trackLabel = $('<label>', {
                            'for': radioId
                        });
                        $trackLabel.text(this.tt.captionsOff);
                        $trackLabel.css('cursor', 'pointer');
                        if (this.prefCaptions === 0) {
                            $trackButton.prop('checked', true);
                        }
                        $trackButton.click(this.caption.getCaptionOffFunction());
                        $menuItem.append($trackButton, $trackLabel);
                        $menu.append($menuItem);
                    }
                    if (!hasDefault) { // no 'default' attribute was specified on any <track>
                        if ((popup == 'captions' || popup == 'ytCaptions') && ($menu.find('input:radio[lang=' + this.captionLang + ']'))) {
                            $menu.find('input:radio[lang=' + this.captionLang + ']').prop('checked', true);
                        } else {
                            // check the first button
                            $menu.find('input').first().prop('checked', true);
                        }
                        //Orange set default sub lang
                        if (this.captionsOn) {
                            if (this.captionLang === 'en') {
                                $('#subtitlesEN').attr('aria-checked', 'true');
                                $('#subtitlesEN').addClass('aria-no-checked');
                                $('#subtitlesEN').attr('aria-pressed', 'true');
                                $('#subtitlesEN').text(thisObj.tt.de_act_st_en);
                                $('#subtitlesEN').addClass('subtno');
                            } else if (this.captionLang === 'fr') {
                                console.log(this.captionLang + ' !!!!!');
                                $('#subtitlesFR').attr('aria-checked', 'true');
                                $('#subtitlesFR').attr('aria-pressed', 'true');
                                $('#subtitlesFR').addClass('aria-no-checked');
                                $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
                                $('#subtitlesFR').addClass('subtno');
                            } else if (this.captionLang === 'es') {
                                $('#subtitlesES').attr('aria-checked', 'true');
                                $('#subtitlesES').attr('aria-pressed', 'true');
                                $('#subtitlesES').addClass('aria-no-checked');
                                $('#subtitlesES').text(thisObj.tt.de_act_st_es);
                                $('#subtitlesES').addClass('subtno');
                            } else if (this.captionLang === 'pl') {
                                $('#subtitlesPL').attr('aria-checked', 'true');
                                $('#subtitlesPL').attr('aria-pressed', 'true');
                                $('#subtitlesPL').addClass('aria-no-checked');
                                $('#subtitlesPL').text(thisObj.tt.de_act_st_pl);
                                $('#subtitlesPL').addClass('subtno');
                            } else if (this.captionLang === 'ml') {
                                $('#subtitlesML').attr('aria-checked', 'true');
                                $('#subtitlesML').attr('aria-pressed', 'true');
                                $('#subtitlesML').addClass('aria-no-checked');
                                $('#subtitlesML').text('');
                                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + this.tt.de_act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
                            } else {//fr is the default
                                console.log('default lg')
                                $('#subtitlesFR').attr('aria-checked', 'true');
                                $('#subtitlesFR').attr('aria-pressed', 'true');
                                $('#subtitlesFR').addClass('aria-no-checked');
                                $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
                                $('#subtitlesFR').addClass('subtno');
                            }
                            this.control.checkContextVidTranscr();
                        } else {
                            $menu.find('input').last().prop('checked', true);
                        }

                    }
                    if (popup === 'captions' || popup === 'ytCaptions') {
                        this.captionsPopup.html($menu);
                    } else if (popup === 'accmenu') {
                        this.accessPopup.html($menu);
                    } else if (popup === 'chapters') {
                        this.chaptersPopup.html($menu);
                    }
                }
            }
        }
    }

    /**
     *  Gère le message d'erreur en cas de mauvaise initialisation du basePlayer
     *   provide ultimate fallback for users who are unable to play the media
     *   If there is HTML content nested within the media element, display that
     *   Otherwise, display standard localized error text
     */
    provideFallback() {
        var $fallbackDiv, width, mediaClone, fallback, fallbackText,
            showBrowserList, browsers, i, b, browserList;
        showBrowserList = false;

        $fallbackDiv = $('<div>', {
            'class': 'able-fallback',
            'role': 'alert',
        });
        if (typeof this.playerMaxWidth !== 'undefined') {
            width = this.playerMaxWidth + 'px';
        } else if (this.$media.attr('width')) {
            width = parseInt(this.$media.attr('width'), 10) + 'px';
        } else {
            width = '100%';
        }
        $fallbackDiv.css('max-width', width);

        // use fallback content that's nested inside the HTML5 media element, if there is any
        mediaClone = this.$media.clone();
        $('source, track', mediaClone).remove();
        fallback = mediaClone.html().trim();
        if (fallback.length) {
            $fallbackDiv.html(fallback);
        } else {
            // use standard localized error message
            fallbackText = this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
            fallbackText += this.tt.fallbackError2 + ':';
            fallback = $('<p>').text(fallbackText);
            $fallbackDiv.html(fallback);
            showBrowserList = true;
        }

        if (showBrowserList) {
            browserList = $('<ul>');
            browsers = this.getSupportingBrowsers();
            for (i = 0; i < browsers.length; i++) {
                b = $('<li>');
                b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
                browserList.append(b);
            }
            $fallbackDiv.append(browserList);
        }

        // if there's a poster, show that as well
        this.injectPoster($fallbackDiv, 'fallback');

        // inject $fallbackDiv into the DOM and remove broken content
        if (typeof this.$ableWrapper !== 'undefined') {
            this.$ableWrapper.before($fallbackDiv);
            this.$ableWrapper.remove();
        } else if (typeof this.$media !== 'undefined') {
            this.$media.before($fallbackDiv);
            this.$media.remove();
        } else {
            $('body').prepend($fallbackDiv);
        }
    }

    /**
     * Retourne un tableau de navigateurs et de systèmes d'exploitation compatible ainsi que les versions
     * pour faire créer un basePlayer
     * @returns {[]}
     */
    getSupportingBrowsers() {
        var browsers = [];
        browsers[0] = {
            name: 'Chrome',
            minVersion: '31'
        };
        browsers[1] = {
            name: 'Firefox',
            minVersion: '34'
        };
        browsers[2] = {
            name: 'Internet Explorer',
            minVersion: '10'
        };
        browsers[3] = {
            name: 'Opera',
            minVersion: '26'
        };
        browsers[4] = {
            name: 'Safari for Mac OS X',
            minVersion: '7.1'
        };
        browsers[5] = {
            name: 'Safari for iOS',
            minVersion: '7.1'
        };
        browsers[6] = {
            name: 'Android Browser',
            minVersion: '4.1'
        };
        browsers[7] = {
            name: 'Chrome for Android',
            minVersion: '40'
        };
        return browsers;
    }

    /**
     * Calculates the layout for controls based on media and options.
     * @returns {{br: [], ul: [string], bl: [], ur: [string, string, string, string]}}
     */
    calculateControlLayout() {
        var controlLayout = {
            // 'ul': ['play','restart','rewind','forward'],
            'ul': ['play'],
            //'ur': ['seek'],
            'ur': ['seek', 'durationElapse', 'captions', 'fullscreen'],
            'bl': [],
            'br': []
        }

        // test for browser support for volume before displaying volume button
        if (this.browser.browserSupportsVolume()) {
            this.volumeButton = 'volume-' + this.volumeI.getVolumeName(this.volume);
            controlLayout['ul'].push('volume');
            controlLayout['ul'].push('accmenu');
            this.setupPopups('accmenu')
        } else {
            this.volume = false;
        }
        var bll = [];
        var blr = [];

        //Orange comment this in order to hide all functions
        // if (this.isPlaybackRateSupported()) {
        //   bll.push('slower');
        //   bll.push('faster');
        // }

        // if (this.mediaType === 'video') {
        //   if (this.hasCaptions) {
        //     bll.push('captions'); //closed captions
        //   }
        //   if (this.hasSignLanguage) {
        //     bll.push('sign'); // sign language
        //   }
        //   if ((this.hasOpenDesc || this.hasClosedDesc) && (this.useDescriptionsButton)) {
        //     bll.push('descriptions'); //audio description
        //   }
        // }
        // if (this.transcriptType === 'popup') {
        //   bll.push('transcript');
        // }

        // if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
        //   bll.push('chapters');
        // }

        // controlLayout['br'].push('preferences');

        // // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
        // if (this.mediaType === 'video' && this.allowFullScreen && this.player !== 'jw') {
        //   controlLayout['br'].push('fullscreen');
        // }

        // Include the pipe only if we need to.
        if (bll.length > 0 && blr.length > 0) {
            controlLayout['bl'] = bll;
            controlLayout['bl'].push('pipe');
            controlLayout['bl'] = controlLayout['bl'].concat(blr);
        } else {
            controlLayout['bl'] = bll.concat(blr);
        }

        return controlLayout;
    }

    /**
     * determine which controls to show based on several factors:
     */
    addControls() {
        var thisObj, baseSliderWidth, controlLayout, sectionByOrder, useSpeedButtons, useFullScreen,
            i, j, k, controls, $controllerSpan, $sliderDiv, $sliderDivOrange, $setTimeOrange, sliderLabel, duration,
            $pipe, $pipeImg, tooltipId, tooltipX, tooltipY, control,
            buttonImg, buttonImgSrc, buttonTitle, $newButton, iconClass, buttonIcon, buttonUse, svgPath,
            leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle,
            controllerStyles, vidcapStyles, captionLabel, popupMenuId;

        thisObj = this;
        baseSliderWidth = 100;
        controlLayout = this.calculateControlLayout();
        sectionByOrder = {0: 'ul', 1: 'ur', 2: 'bl', 3: 'br'};

        // add an empty div to serve as a tooltip
        tooltipId = this.mediaId + '-tooltip';
        this.$tooltipDiv = $('<div>', {
            'id': tooltipId,
            'class': 'able-tooltip',
        }).hide();
        this.$controllerDiv.append(this.$tooltipDiv);

        // step separately through left and right controls
        for (i = 0; i <= 3; i++) {
            controls = controlLayout[sectionByOrder[i]];
            if ((i % 2) === 0) {
                $controllerSpan = $('<div>', {
                    'class': 'able-left-controls'
                });
            } else {
                $controllerSpan = $('<div>', {
                    'class': 'able-right-controls'
                });
            }
            this.$controllerDiv.append($controllerSpan);
            for (j = 0; j < controls.length; j++) {
                control = controls[j];
                if (control === 'seek') {
                    $sliderDiv = $('<div class="able-seekbar"</div>');
                    sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
                    $controllerSpan.append($sliderDiv);
                    duration = this.control.getDuration();
                    if (duration == 0) {
                        duration = 100;
                    }
                    this.seekBar = new AccessibleSlider(this.mediaType, $sliderDiv, 'horizontal', baseSliderWidth, 0, duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
                } else if (control === 'durationElapse') {
                    $controllerSpan.append(this.$elapsedTimeContainer);
                } else if (control === 'pipe') {
                    $pipe = $('<span>', {
                        'tabindex': '-1',
                        'aria-hidden': 'true'
                    });
                    if (this.iconType === 'font') {
                        $pipe.addClass('icon-pipe');
                    } else {
                        $pipeImg = $('<img>', {
                            src: this.rootPath + 'button-icons/' + this.iconColor + '/pipe.png',
                            alt: '',
                            role: 'presentation'
                        });
                        $pipe.append($pipeImg);
                    }
                    $controllerSpan.append($pipe);
                } else {
                    // this control is a button
                    if (control === 'volume') {
                        buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + this.volumeButton + '.png';
                    }
                    if (control === 'acc-menu') {
                        buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/sign.png';
                    } else if (control === 'fullscreen') {
                        buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/fullscreen-expand.png';
                    } else if (control === 'slower') {
                        if (this.speedIcons === 'animals') {
                            buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/turtle.png';
                        } else {
                            buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/slower.png';
                        }
                    } else if (control === 'faster') {
                        if (this.speedIcons === 'animals') {
                            buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/rabbit.png';
                        } else {
                            buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/faster.png';
                        }
                    } else {
                        buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + control + '.png';
                    }
                    buttonTitle = this.getButtonTitle(control);
                    if (this.getButtonTitle(control) === 'Accmenu') {
                        buttonTitle = this.tt.accmenu;
                    }
                    $newButton = $('<button>', {
                        'type': 'button',
                        'tabindex': '0',
                        'aria-label': buttonTitle,
                        'class': 'able-button-handler-' + control
                    });
                    if (control === 'volume' || control === 'preferences') {
                        // This same ARIA for captions and chapters are added elsewhere
                        if (control == 'preferences') {
                            popupMenuId = this.mediaId + '-prefs-menu';
                        } else if (control === 'volume') {
                            popupMenuId = this.mediaId + '-volume-slider';
                        }
                        $newButton.attr({
                            'aria-controls': popupMenuId
                        });
                    }
                    if (this.iconType === 'font') {
                        if (control === 'volume') {
                            iconClass = 'icon-' + this.volumeButton;
                        } else if (control === 'slower') {
                            if (this.speedIcons === 'animals') {
                                iconClass = 'icon-turtle';
                            } else {
                                iconClass = 'icon-slower';
                            }
                        } else if (control === 'faster') {
                            if (this.speedIcons === 'animals') {
                                iconClass = 'icon-rabbit';
                            } else {
                                iconClass = 'icon-faster';
                            }
                        } else {
                            iconClass = 'icon-' + control;
                        }
                        buttonIcon = $('<span>', {
                            'class': iconClass,
                            'aria-hidden': 'true'
                        });
                        $newButton.append(buttonIcon);
                    } else if (this.iconType === 'svg') {
                        var svgData;
                        if (control === 'volume') {
                            svgData = this.initialize.getSvgData(this.volumeButton);

                        } else if (control === 'accmenu') {
                            svgData = this.initialize.getSvgData('accmenu');
                        } else if (control === 'fullscreen') {
                            svgData = this.initialize.getSvgData('fullscreen-expand');
                        } else if (control === 'slower') {
                            if (this.speedIcons === 'animals') {
                                svgData = this.initialize.getSvgData('turtle');
                            } else {
                                svgData = this.initialize.getSvgData('slower');
                            }
                        } else if (control === 'faster') {
                            if (this.speedIcons === 'animals') {
                                svgData = this.initialize.getSvgData('rabbit');
                            } else {
                                svgData = this.initialize.getSvgData('faster');
                            }
                        } else {
                            svgData = this.initialize.getSvgData(control);
                        }
                        buttonIcon = $('<svg>', {
                            'focusable': 'false',
                            'aria-hidden': 'true',
                            'viewBox': svgData[0]
                        });
                        svgPath = $('<path>', {
                            'd': svgData[1]
                        });
                        if (control === 'accmenu') {
                            var svgLine = "<circle cx='8' cy='10' r='9' stroke='white' stroke-width='1.5' fill='transparent'></circle>";
                            buttonIcon.append(svgLine);
                        }
                        if (control === 'volume') {
                            var svgLine = "<line x1='0' y1='0' x2='200' y2='200' id='volLine' style='display:none;stroke:white'/>";
                            buttonIcon.append(svgLine);
                        }
                        buttonIcon.append(svgPath);
                        $newButton.html(buttonIcon);
                        $newButton.html($newButton.html());
                    } else {
                        // use images
                        buttonImg = $('<img>', {
                            'src': buttonImgSrc,
                            'alt': '',
                            'role': 'presentation'
                        });
                        $newButton.append(buttonImg);
                    }
                    var buttonLabel = $('<span>', {
                        'class': 'able-clipped'
                    }).text(buttonTitle);
                    $newButton.append(buttonLabel);
                    $newButton.on('mouseenter focus', function (event) {
                        var label = $(this).attr('aria-label');
                        // get position of this button
                        var position = $(this).position();
                        var buttonHeight = $(this).height();
                        var buttonWidth = $(this).width();
                        var tooltipY = position.top - buttonHeight - 15;
                        var centerTooltip = true;
                        if ($(this).closest('div').hasClass('able-right-controls')) {
                            // this control is on the right side
                            if ($(this).closest('div').find('button:last').get(0) == $(this).get(0)) {
                                centerTooltip = false;
                                var tooltipX = 0;
                                var tooltipStyle = {
                                    left: '',
                                    right: tooltipX + 'px',
                                    top: tooltipY + 'px'
                                };
                            }
                        } else {
                            // this control is on the left side
                            if ($(this).is(':first-child')) {
                                // this is the first control on the left
                                centerTooltip = false;
                                var tooltipX = 0;//position.left;
                                var tooltipStyle = {
                                    left: tooltipX + 'px',
                                    right: '',
                                    top: tooltipY + 'px'
                                };
                            }
                        }
                        if (centerTooltip) {
                            var tooltipWidth = AccessiblePlayer.localGetElementById($newButton[0], tooltipId).text(label).width();
                            // center the tooltip horizontally over the button
                            var tooltipX = position.left - tooltipWidth / 2;
                            if (tooltipX < 0) {
                                tooltipX = 0;
                            }
                            var tooltipStyle = {
                                left: tooltipX + 'px',
                                right: '',
                                top: tooltipY + 'px',
                            };
                        }
                        var tooltip = AccessiblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
                        thisObj.control.showTooltip(tooltip);
                        $(this).on('mouseleave blur', function () {
                            AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
                        })
                    });

                    if (control === 'captions') {
                        if (!this.prefCaptions || this.prefCaptions !== 1) {
                            // captions are available, but user has them turned off
                            if (this.captions.length > 1) {
                                captionLabel = this.tt.captions;
                            } else {
                                captionLabel = this.tt.showCaptions;
                            }
                            $newButton.addClass('buttonOff').attr('title', captionLabel);
                        }
                    } else if (control === 'descriptions') {
                        if (!this.prefDesc || this.prefDesc !== 1) {
                            $newButton.addClass('buttonOff').attr('title', this.tt.turnOnDescriptions);
                        }
                    }
                    $controllerSpan.append($newButton);

                    // create variables of buttons that are referenced throughout the AblePlayer object
                    if (control === 'play') {
                        this.$playpauseButton = $newButton;
                    } else if (control === 'captions') {
                        this.$ccButton = $newButton;
                    }
                        // else if (control === 'acc-menu') {
                        //   this.$accMenu = $newButton;
                    // }
                    else if (control === 'sign') {
                        this.$signButton = $newButton;
                        // gray out sign button if sign language window is not active
                        if (!(this.$signWindow.is(':visible'))) {
                            this.$signButton.addClass('buttonOff');
                        }
                    } else if (control === 'descriptions') {
                        this.$descButton = $newButton;
                        // button will be enabled or disabled in description.js > initDescription()
                    } else if (control === 'mute') {
                        this.$muteButton = $newButton;
                    } else if (control === 'transcript') {
                        this.$transcriptButton = $newButton;
                        // gray out transcript button if transcript is not active
                        if (!(this.$transcriptDiv.is(':visible'))) {
                            this.$transcriptButton.addClass('buttonOff').attr('title', this.tt.showTranscript);
                        }
                    } else if (control === 'fullscreen') {
                        this.$fullscreenButton = $newButton;
                    } else if (control === 'chapters') {
                        this.$chaptersButton = $newButton;
                    } else if (control === 'preferences') {
                        this.$prefsButton = $newButton;
                    } else if (control === 'volume') {
                        this.$volumeButton = $newButton;
                    }
                }
                if (control === 'volume') {
                    // in addition to the volume button, add a hidden slider
                    this.volumeI.addVolumeSlider($controllerSpan);
                }
            }
            if ((i % 2) == 1) {
                this.$controllerDiv.append('<div style="clear:both;"></div>');
            }
        }

        if (this.mediaType === 'video') {

            if (typeof this.$captionsDiv !== 'undefined') {
                this.caption.stylizeCaptions(this.$captionsDiv);
            }
            if (typeof this.$descDiv !== 'undefined') {
                this.caption.stylizeCaptions(this.$descDiv);
            }

            //Orange init perception gain if media is video
            if (this.browser.userAgent.browser.name != 'Firefox') {
                var videoList = document.getElementsByTagName("video");
                //console.log(videoList);
                this.contextAudio = Array();
                this.lGain = Array();
                this.mGain = Array();
                this.hGain = Array();
                this.buffer = Array();
                this.actualLow = 100;
                this.actualHigh = 100;
                for (var q = 0; q < videoList.length; q++) {
                    this.volumeI.startAudioContext(videoList[q], q);
                }
                this.$buttonMoreLow.click(function () {
                    var videoList = document.getElementsByTagName("video");
                    if (thisObj.actualLow >= 0 && thisObj.actualLow <= 190) {
                        thisObj.actualLow = thisObj.actualLow + 10;
                        for (var q = 0; q < videoList.length; q++) {
                            thisObj.changeGain(thisObj.actualLow, 'lowGain', q);
                            thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
                        }
                    }
                });
                this.$buttonLessLow.click(function () {
                    var videoList = document.getElementsByTagName("video");
                    if (thisObj.actualLow >= 10 && thisObj.actualLow <= 200) {
                        //console.log(thisObj.actualLow);
                        thisObj.actualLow = thisObj.actualLow - 10;
                        for (var q = 0; q < videoList.length; q++) {
                            thisObj.changeGain(thisObj.actualLow, 'lowGain', q);
                            thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
                        }
                    }
                });
                this.$buttonMoreAcute.click(function () {
                    var videoList = document.getElementsByTagName("video");
                    if (thisObj.actualHigh >= 0 && thisObj.actualHigh <= 190) {
                        thisObj.actualHigh = thisObj.actualHigh + 10;
                        for (var q = 0; q < videoList.length; q++) {
                            thisObj.changeGain(thisObj.actualHigh, 'highGain', q);
                            thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
                        }
                    }
                });
                this.$buttonLessAcute.click(function () {
                    var videoList = document.getElementsByTagName("video");
                    if (thisObj.actualHigh >= 10 && thisObj.actualHigh <= 200) {
                        thisObj.actualHigh = thisObj.actualHigh - 10;
                        for (var q = 0; q < videoList.length; q++) {
                            thisObj.changeGain(thisObj.actualHigh, 'highGain', q);
                            thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
                        }
                    }
                });
                this.$buttonDefaultPerception.click(function () {
                    var videoList = document.getElementsByTagName("video");
                    for (var q = 0; q < videoList.length; q++) {
                        thisObj.changeGain(100, 'highGain', q);
                        thisObj.changeGain(100, 'lowGain', q);
                    }
                    thisObj.actualLow = 100;
                    thisObj.actualHigh = 100;
                    thisObj.$divPerceptionHighText[0].innerHTML = thisObj.actualHigh + '%';
                    thisObj.$divPerceptionLowText[0].innerHTML = thisObj.actualLow + '%';
                });
            }
        }
        this.controls = [];
        for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
            this.controls = this.controls.concat(controlLayout[sec]);
        }

        // Update state-based display of controls.
        this.control.resizeAccessMenu();
        this.control.refreshControls();
    }

    useSvg () {

        // Modified from IcoMoon.io svgxuse
        // @copyright Copyright (c) 2016 IcoMoon.io
        // @license   Licensed under MIT license
        // See https://github.com/Keyamoon/svgxuse
        // @version   1.1.16

        var cache = Object.create(null); // holds xhr objects to prevent multiple requests
        var checkUseElems,
            tid; // timeout id
        var debouncedCheck = function () {
            clearTimeout(tid);
            tid = setTimeout(checkUseElems, 100);
        };
        var unobserveChanges = function () {

        };
        var observeChanges = function () {
            var observer;
            window.addEventListener('resize', debouncedCheck, false);
            window.addEventListener('orientationchange', debouncedCheck, false);
            if (window.MutationObserver) {
                observer = new MutationObserver(debouncedCheck);
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true
                });
                unobserveChanges = function () {
                    try {
                        observer.disconnect();
                        window.removeEventListener('resize', debouncedCheck, false);
                        window.removeEventListener('orientationchange', debouncedCheck, false);
                    } catch (ignore) {
                    }
                };
            } else {
                document.documentElement.addEventListener('DOMSubtreeModified', debouncedCheck, false);
                unobserveChanges = function () {
                    document.documentElement.removeEventListener('DOMSubtreeModified', debouncedCheck, false);
                    window.removeEventListener('resize', debouncedCheck, false);
                    window.removeEventListener('orientationchange', debouncedCheck, false);
                };
            }
        };
        var xlinkNS = 'http://www.w3.org/1999/xlink';
        checkUseElems = function () {
            var base,
                bcr,
                fallback = '', // optional fallback URL in case no base path to SVG file was given and no symbol definition was found.
                hash,
                i,
                Request,
                inProgressCount = 0,
                isHidden,
                url,
                uses,
                xhr;
            if (window.XMLHttpRequest) {
                Request = new XMLHttpRequest();
                if (Request.withCredentials !== undefined) {
                    Request = XMLHttpRequest;
                } else {
                    Request = XDomainRequest || undefined;
                }
            }
            if (Request === undefined) {
                return;
            }

            function observeIfDone() {
                // If done with making changes, start watching for chagnes in DOM again
                inProgressCount -= 1;
                if (inProgressCount === 0) { // if all xhrs were resolved
                    observeChanges(); // watch for changes to DOM
                }
            }

            function attrUpdateFunc(spec) {
                return function () {
                    if (cache[spec.base] !== true) {
                        spec.useEl.setAttributeNS(xlinkNS, 'xlink:href', '#' + spec.hash);
                    }
                };
            }

            function onloadFunc(xhr) {
                return function () {
                    var body = document.body;
                    var x = document.createElement('x');
                    var svg;
                    xhr.onload = null;
                    x.innerHTML = xhr.responseText;
                    svg = x.getElementsByTagName('svg')[0];
                    if (svg) {
                        svg.setAttribute('aria-hidden', 'true');
                        svg.style.position = 'absolute';
                        svg.style.width = 0;
                        svg.style.height = 0;
                        svg.style.overflow = 'hidden';
                        body.insertBefore(svg, body.firstChild);
                    }
                    observeIfDone();
                };
            }

            function onErrorTimeout(xhr) {
                return function () {
                    xhr.onerror = null;
                    xhr.ontimeout = null;
                    observeIfDone();
                };
            }

            unobserveChanges();
            uses = document.getElementsByTagName('use');
            for (i = 0; i < uses.length; i += 1) {
                try {
                    bcr = uses[i].getBoundingClientRect();
                } catch (ignore) {
                    bcr = false;
                }
                url = uses[i].getAttributeNS(xlinkNS, 'href').split('#');
                base = url[0];
                hash = url[1];
                isHidden = bcr && bcr.left === 0 && bcr.right === 0 && bcr.top === 0 && bcr.bottom === 0;
                if (bcr && bcr.width === 0 && bcr.height === 0 && !isHidden) {
                    if (fallback && !base.length && hash && !document.getElementById(hash)) {
                        base = fallback;
                    }
                    if (base.length) {
                        xhr = cache[base];
                        if (xhr !== true) {
                            setTimeout(attrUpdateFunc({
                                useEl: uses[i],
                                base: base,
                                hash: hash
                            }), 0);
                        }
                        if (xhr === undefined) {
                            xhr = new Request();
                            cache[base] = xhr;
                            xhr.onload = onloadFunc(xhr);
                            xhr.onerror = onErrorTimeout(xhr);
                            xhr.ontimeout = onErrorTimeout(xhr);
                            xhr.open('GET', base);
                            xhr.send();
                            inProgressCount += 1;
                        }
                    }
                } else {
                    if (!isHidden) {
                        if (cache[base] === undefined) {
                            cache[base] = true;
                        } else if (cache[base].onload) {
                            cache[base].abort();
                            cache[base].onload = undefined;
                            cache[base] = true;
                        }
                    }
                }
            }
            uses = '';
            inProgressCount += 1;
            observeIfDone();
        };
    };

    /**
     * // Change media player source file, for instance when moving to the next element in a playlist.
     // NOTE: Swapping source for audio description is handled elsewhere;
     // see description.js > swapDescription()
     * @param sourceIndex
     */
    swapSource (sourceIndex) {
        var $newItem, itemTitle, itemLang, sources, s, jwSource, i, $newSource, nowPlayingSpan;

        this.$media.find('source').remove();
        $newItem = this.$playlist.eq(sourceIndex);
        itemTitle = $newItem.html();
        if ($newItem.attr('lang')) {
            itemLang = $newItem.attr('lang');
        }
        sources = [];
        s = 0; // index
        if (this.mediaType === 'audio') {
            if ($newItem.attr('data-mp3')) {
                jwSource = $newItem.attr('data-mp3'); // JW Player can play this
                sources[s] = ['audio/mpeg', jwSource];
                s++;
            }
            if ($newItem.attr('data-webm')) {
                sources[s] = ['audio/webm', $newItem.attr('data-webm')];
                s++;
            }
            if ($newItem.attr('data-webma')) {
                sources[s] = ['audio/webm', $newItem.attr('data-webma')];
                s++;
            }
            if ($newItem.attr('data-ogg')) {
                sources[s] = ['audio/ogg', $newItem.attr('data-ogg')];
                s++;
            }
            if ($newItem.attr('data-oga')) {
                sources[s] = ['audio/ogg', $newItem.attr('data-oga')];
                s++;
            }
            if ($newItem.attr('data-wav')) {
                sources[s] = ['audio/wav', $newItem.attr('data-wav')];
                s++;
            }
        } else if (this.mediaType === 'video') {
            if ($newItem.attr('data-mp4')) {
                jwSource = $newItem.attr('data-mp4'); // JW Player can play this
                sources[s] = ['video/mp4', jwSource];
                s++;
            }
            if ($newItem.attr('data-webm')) {
                sources[s] = ['video/webm', $newItem.attr('data-webm')];
                s++;
            }
            if ($newItem.attr('data-webmv')) {
                sources[s] = ['video/webm', $newItem.attr('data-webmv')];
                s++;
            }
            if ($newItem.attr('data-ogg')) {
                sources[s] = ['video/ogg', $newItem.attr('data-ogg')];
                s++;
            }
            if ($newItem.attr('data-ogv')) {
                sources[s] = ['video/ogg', $newItem.attr('data-ogv')];
                s++;
            }
        }
        for (i = 0; i < sources.length; i++) {
            $newSource = $('<source>', {
                type: sources[i][0],
                src: sources[i][1]
            });
            this.$media.append($newSource);
        }
        this.$playlist.removeClass('able-current');
        $newItem.addClass('able-current');

        // update Now Playing div
        if (this.showNowPlaying === true) {
            nowPlayingSpan = $('<span>');
            if (typeof itemLang !== 'undefined') {
                nowPlayingSpan.attr('lang', itemLang);
            }
            nowPlayingSpan.html('<span>Selected track:</span>' + itemTitle);
            this.$nowPlayingDiv.html(nowPlayingSpan);
        }

        // reload audio after sources have been updated
        // if this.swappingSrc is true, media will autoplay when ready
        if (this.initializing) { // this is the first track - user hasn't pressed play yet
            this.swappingSrc = false;
        } else {
            this.swappingSrc = true;
            if (this.player === 'html5') {
                this.media.load();
            } else if (this.player === 'jw') {
                this.jwPlayer.load({file: jwSource});
            } else if (this.player === 'youtube') {
            }
        }
    };

}