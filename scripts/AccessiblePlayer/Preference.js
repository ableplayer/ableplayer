import AccessibleDialog from "./AccessibleDialog.js";
import Misc from "./Misc.js";

export default class Preference{


    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }


    /**
     * Ajoute les données dans les cookies du navigateur où sera éxécuté le Player
     * @param cookieValue
     */
    setCookie (cookieValue) {
        Cookies.set('Able-Player', cookieValue, {expires: 90});
    };

    /**
     * Retourne un cookie représenté par un objet après extraction sur le service Cookies du Navigateur
     * @returns {{preferences: {}, transcript: {}, sign: {}}}
     */
    getCookie() {
        var defaultCookie = {
            preferences: {},
            sign: {},
            transcript: {}
        };
        var cookie;
        try {
            cookie = JSON.parse(Cookies.get('Able-Player'));
        }
        catch (err) {
            Cookies.getJSON(defaultCookie);
            cookie = defaultCookie;
        }
        if (cookie) {
            return cookie;
        }
        else {
            return defaultCookie;
        }
    };

    setDefaultPref() {
        //disable all buttons
        console.log('setDefaultPref');
        $('#visionPlus').attr('aria-checked', 'false');
        $('#visionPlus').attr('aria-pressed', 'false');
        $('#visionPlus').removeClass('aria-no-checked');
        $('#sansVisionPlus').attr('aria-checked', 'false');
        $('#sansVisionPlus').attr('aria-pressed', 'false');
        $('#sansVisionPlus').removeClass('aria-no-checked');
        $('#auditionPlus').attr('aria-checked', 'false');
        $('#auditionPlus').attr('aria-pressed', 'false');
        $('#auditionPlus').removeClass('aria-no-checked');
        $('#lsfPlus').attr('aria-checked', 'false');
        $('#lsfPlus').attr('aria-pressed', 'false');
        $('#lsfPlus').removeClass('aria-no-checked');
        $('#defPlus').attr('aria-checked', 'false');
        $('#defPlus').attr('aria-pressed', 'false');
        $('#defPlus').removeClass('aria-no-checked');
        $('#conPlus').attr('aria-checked', 'false');
        $('#conPlus').attr('aria-pressed', 'false');
        $('#conPlus').removeClass('aria-no-checked');
        $('#profDef').attr('aria-checked', 'false');
        $('#profDef').attr('aria-pressed', 'false');
        $('#profDef').removeClass('aria-no-checked');


        $('.vplus').attr('aria-checked', 'false');
        $('.vplus').attr('aria-pressed', 'false');
        $('.vplus').removeClass('aria-no-checked');
        $('.svplus').attr('aria-checked', 'false');
        $('.svplus').attr('aria-pressed', 'false');
        $('.svplus').removeClass('aria-no-checked');
        $('.lsfplus').attr('aria-checked', 'false');
        $('.lsfplus').attr('aria-pressed', 'false');
        $('.lsfplus').removeClass('aria-no-checked');
        $('.conplus').attr('aria-checked', 'false');
        $('.conplus').attr('aria-pressed', 'false');
        $('.conplus').removeClass('aria-no-checked');
        $('.audplus').attr('aria-checked', 'false');
        $('.audplus').attr('aria-pressed', 'false');
        $('.audplus').removeClass('aria-no-checked');
        $('.profdef').attr('aria-checked', 'false');
        $('.profdef').attr('aria-pressed', 'false');
        $('.profdef').removeClass('aria-no-checked');


        //this.prefCaptionsFont = 'Helvetica Neue';
        this.ablePlayer.prefCaptionsFont = 'Arial';
        this.ablePlayer.prefCaptionsColor = 'white';
        this.ablePlayer.prefCaptionsBGColor = 'black';
        this.ablePlayer.prefCaptionsSize = '100%';
        //this.prefTRFont = 'Helvetica Neue';
        this.ablePlayer.prefTRFont = 'Arial';
        this.ablePlayer.prefTRColor = 'black';
        this.ablePlayer.prefFollowColor = '#FF6';
        this.ablePlayer.prefShadowType = '';
        this.ablePlayer.prefTRBGColor = 'white';
        this.ablePlayer.prefTRSize = '100%';
        this.ablePlayer.prefTranscript = 0;
        this.ablePlayer.prefSign = 0;
        this.ablePlayer.prefModeUsage = "profDef";
        this.ablePlayer.prefVidSize = 33;
        this.ablePlayer.prefTrSize = 66;
        this.ablePlayer.prefTranscriptOrientation = 'vertical';
        this.ablePlayer.prefColorButton = "colorDef";
        //$('#' + this.mediaId + '_' + 'prefCaptionsFont').val('Helvetica Neue');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsFont').val('Arial');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsColor').val('white');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsBGColor').val('black');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsSize').val('100%');
        //$('#' + this.mediaId + '_' + 'prefTRFont').val('Helvetica Neue');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRFont').val('Arial');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRColor').val('black');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefFollowColor').val('#FF6');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefShadowType').val('');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefColorButton').val('colorDef');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRBGColor').val('white');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRSize').val('100%');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTranscript').val('0');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefSign').val('0');//prefDesc
        $('#' + this.ablePlayer.mediaId + '_' + 'prefDesc').val('0');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefVidSize').val('33');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTrSize').val('66');
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTranscriptOrientation').val('vertical');
        this.updateCookie('prefCaptionsFont');
        this.updateCookie('prefVidSize');
        this.updateCookie('prefTrSize');
        this.updateCookie('prefTranscriptOrientation');
        this.updateCookie('prefCaptionsColor');
        this.updateCookie('prefCaptionsBGColor');
        this.updateCookie('prefCaptionsSize');
        this.updateCookie('prefTRFont');
        this.updateCookie('prefTRColor');
        this.updateCookie('prefFollowColor');
        this.updateCookie('prefShadowType');
        this.updateCookie('prefColorButton');
        this.updateCookie('prefTRBGColor');
        this.updateCookie('prefTRSize');
        this.updateCookie('prefTranscript');
        this.updateCookie('prefSign');
        this.updateCookie('prefModeUsage');
        this.updateCookie('prefDesc');
        $('.able-captions').css('font-family', this.ablePlayer.prefCaptionsFont);
        $('.able-captions').css('color', this.ablePlayer.prefCaptionsColor);
        $('.able-captions').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-captions-wrapper').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-captions').css('font-size', this.ablePlayer.prefCaptionsSize);
        $('.able-descriptions').css('font-family', this.ablePlayer.prefCaptionsFont);
        $('.able-descriptions').css('color', this.ablePlayer.prefCaptionsColor);
        $('.able-descriptions').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-descriptions').css('font-size', this.ablePlayer.prefCaptionsSize);
        $('.able-transcript-seekpoint').css('color', this.ablePlayer.prefTRColor);
        $('.able-transcript-seekpoint').css('background-color', this.ablePlayer.prefTRBGColor);
        $('.able-transcript-seekpoint').css('font-size', this.ablePlayer.prefTRSize);
        $('.able-transcript-seekpoint').css('font-family', this.ablePlayer.prefTRFont);
        $('.able-highlight').css('background', this.ablePlayer.prefFollowColor);
        $('.button').removeClass('whiteblue');
        $('.button').removeClass('bluewhite');
        $('.button').removeClass('yellowblue');
        $('.button').removeClass('blueyellow');
        $('.button').removeClass('whiteblack');
        $('.button').removeClass('blackwhite');
        $('i').removeClass('whiteblue');
        $('i').removeClass('bluewhite');
        $('i').removeClass('yellowblue');
        $('i').removeClass('blueyellow');
        $('i').removeClass('whiteblack');
        $('i').removeClass('blackwhite');
        $('.button').addClass('colorDef');
        $('i').addClass('colorDef');
        this.ablePlayer.$transcriptArea.hide();
        if (this.ablePlayer.$transcriptButton != undefined) {
            this.ablePlayer.$transcriptButton.addClass('buttonOff').attr('aria-label', this.ablePlayer.tt.showTranscript);
            this.ablePlayer.$transcriptButton.find('span.able-clipped').text(this.ablePlayer.tt.showTranscript);
        }
        this.ablePlayer.prefTranscript = 0;
        this.ablePlayer.$signWindow.hide();
        if (this.ablePlayer.$transcriptButton != undefined) {
            this.ablePlayer.$signButton.addClass('buttonOff').attr('aria-label', this.ablePlayer.tt.showSign);
            this.ablePlayer.$signButton.find('span.able-clipped').text(this.ablePlayer.tt.showSign);
        }
        this.ablePlayer.prefSign = 0;
        this.ablePlayer.prefDesc = 0;
        this.updateCookie('prefDesc');
        this.updateCookie('prefSign');
        this.refreshingDesc = true;
        this.ablePlayer.description.initDescription();
        this.ablePlayer.control.refreshControls();

        //default sub is FR
        //$('#subtitlesFR').click();

        clearInterval(this.ablePlayer.$timerOrange);
        $('#defPlus').removeClass('firstTime');

        //default options
        $('#audiodesc').attr('aria-checked', 'false');
        $('#audiodesc').removeClass('aria-no-checked');
        $('#audiodesc').children('span').text(this.ablePlayer.tt.audiodescact);
        $('#audiodesc').children('svg').children('line').css('display', 'block');
        $('#lsf').attr('aria-checked', 'false');
        $('#lsf').removeClass('aria-no-checked');
        $('#lsf').children('span').text(this.ablePlayer.tt.lsfact);
        $('#lsf').children('svg').children('line').css('display', 'block');
        $('#transcr').attr('aria-checked', 'false');
        $('#transcr').removeClass('aria-no-checked');
        $('#transcr').children('span').text(this.ablePlayer.tt.transcract);
        $('#transcr').children('svg').children('line').css('display', 'block');

        //reglages buttons default
        $('.controller-orange-textcolor button').each(function () {
            if (!$(this)[0].id.includes('whiteTextColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            } else {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            }
        });
        $('.controller-orange-bgcolor button').each(function () {
            if (!$(this)[0].id.includes('blackBGColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            } else {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });
        $('.controller-orange-followcolor button').each(function () {
            if (!$(this)[0].id.includes('yellowFollowColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            } else {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });
        $('.controller-orange-fontsize span').each(function () {
            if (!$(this)[0].textContent.includes('100%')) {
                $($(this)[0].parentElement).removeClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'false');
            } else {
                $($(this)[0].parentElement).addClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'true');
            }
        });
        $('.controller-orange-outfont span').each(function () {
            if (!$(this)[0].id.includes('outNo')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            } else {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });
        $('.controller-orange-font span').each(function () {
            if (!$(this)[0].id.includes('helvet')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            } else {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });


        //default contraste
        var vids = $(document.getElementsByTagName('video'));
        for (var i = 0; i < vids.length; i++) {
            $(vids[i]).css('filter', '');
            $(vids[i]).css('filter', '');
            $(vids[i]).css('background-color', 'transparent');
        }
        $('.vidcontr').attr('aria-checked', 'false');
        $('.vidcontr').attr('aria-label', this.ablePlayer.tt.vidcontrno);

        $('.vidcontr').text('');
        $('.vidcontr').removeClass('vidcontrno')
        $('.vidcontr').append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">" + this.ablePlayer.tt.vidcontrno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");


        //Maybe try to re-put video in the right side
        this.ablePlayer.$ableDiv.css('width', '100%');
        this.ablePlayer.$playerDiv.css('width', '100%');
        this.ablePlayer.$captionsWrapper.css('width', (this.ablePlayer.$playerDiv.width()) + 'px');
        $('.able-descriptions').css('width', (this.ablePlayer.$playerDiv.width()) + 'px');
        if (this.ablePlayer.$mediaContainer.find('video').find('source')[0].src.includes(this.ablePlayer.$sources.first().attr('data-sign-src'))) {
            if (this.getCookie()['preferences']['prefTranscript'] === 0) {
                this.ablePlayer.$ableDiv.css('width', '100%');
            } else {
                this.ablePlayer.$transcriptArea.css('top', '0px');
            }
            var svgVideoSrc = this.ablePlayer.$signWindow.find('video').find('source')[0].src;
            //put video sign in the second container
            this.ablePlayer.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
            this.ablePlayer.$mediaContainer.find('video')[0].load();
            //put video in the first containre
            this.ablePlayer.$signWindow.find('video').find('source')[0].src = this.ablePlayer.$sources.first().attr('data-sign-src');
            this.ablePlayer.$signWindow.find('video')[0].load();
        } else {

        }
        //Set volume to true if it is muted
        if (this.ablePlayer.volumeI.isMuted() === true) {
            this.ablePlayer.volumeI.handleMute();
            this.ablePlayer.volumeI.setVolume(this.ablePlayer.volumeI.getVolume());
        }

        //Resize Menu
        this.ablePlayer.control.resizeAccessMenu();
    };

    // called when a particular setting had been updated
    updateCookie( setting ) {
        var cookie, $window, windowPos, available, i, prefName;
        cookie = this.getCookie();
        if (setting === 'transcript' || setting === 'sign') {
            if (setting === 'transcript') {
                $window = this.ablePlayer.$transcriptArea;
                windowPos = $window.position();
                if (typeof cookie.transcript === 'undefined') {
                    cookie.transcript = {};
                }
                cookie.transcript['position'] = $window.css('position'); // either 'relative' or 'absolute'
                cookie.transcript['zindex'] = $window.css('z-index');
                cookie.transcript['top'] = windowPos.top;
                cookie.transcript['left'] = windowPos.left;
                cookie.transcript['width'] = $window.width();
                cookie.transcript['height'] = $window.height();
            }
            else if (setting === 'sign') {
                $window = this.ablePlayer.$signWindow;
                windowPos = $window.position();
                if (typeof cookie.sign === 'undefined') {
                    cookie.sign = {};
                }
                cookie.sign['position'] = $window.css('position'); // either 'relative' or 'absolute'
                cookie.sign['zindex'] = $window.css('z-index');
                cookie.sign['top'] = windowPos.top;
                cookie.sign['left'] = windowPos.left;
                cookie.sign['width'] = $window.width();
                cookie.sign['height'] = $window.height();
            }
        }
        else {
            available = this.getAvailablePreferences();
            for (i = 0; i < available.length; i++) {
                prefName = available[i]['name'];
                if (prefName == setting) {
                    cookie.preferences[prefName] = this.ablePlayer[prefName];
                }
            }
        }
        // Save updated cookie
        this.setCookie(cookie);
    };

    // return array of groups in the order in which they will appear
    getPreferencesGroups () {
        if (this.ablePlayer.mediaType === 'video') {
            return ['captions', 'descriptions', 'keyboard', 'transcript'];
        } else if (this.ablePlayer.mediaType === 'audio') {
            var groups = [];
            groups.push('keyboard');
            if (this.ablePlayer.lyricsMode) {
                groups.push('transcript');
            }
            return groups;
        }
    }

    /**
     * retourne un tableau de preferences (touches claviers + Transcriptions + Descriptions + Sous-titres)  associées au basePlayer
     * Return the list of currently available preferences.
     * @returns {[]}
     */
    getAvailablePreferences () {
        var prefs = [];

        //add new preferences Orange
        prefs.push({
            'name': 'prefModeUsage', //
            'label': 'prefModeUsage',
            'group': 'mode',
            'default': 'profDef'
        });

        //add new preferences Orange for vidSize
        prefs.push({
            'name': 'prefVidSize', //
            'label': 'prefVidSize',
            'group': '',
            'default': 33
        });

        prefs.push({
            'name': 'prefTrSize', //
            'label': 'prefTrSize',
            'group': '',
            'default': 66
        });

        //add new preferences Orange for prefTranscriptOrientation
        prefs.push({
            'name': 'prefTranscriptOrientation', //
            'label': 'prefTranscriptOrientation',
            'group': '',
            'default': 'horizontal'
        });

        // Modifier keys preferences
        prefs.push({
            'name': 'prefAltKey', // use alt key with shortcuts
            'label': this.ablePlayer.tt.prefAltKey,
            'group': 'keyboard',
            'default': 1
        });
        prefs.push({
            'name': 'prefCtrlKey', // use ctrl key with shortcuts
            'label': this.ablePlayer.tt.prefCtrlKey,
            'group': 'keyboard',
            'default': 1
        });
        prefs.push({
            'name': 'prefShiftKey',
            'label': this.ablePlayer.tt.prefShiftKey,
            'group': 'keyboard',
            'default': 0
        });

        // Transcript preferences
        prefs.push({
            'name': 'prefTranscript', // transcript default state
            'label': null,
            'group': 'transcript',
            'default': 0 // off because turning it on has a certain WOW factor
        });
        prefs.push({
            'name': 'prefHighlight', // highlight transcript as media plays
            'label': this.ablePlayer.tt.prefHighlight,
            'group': 'transcript',
            'default': 1 // on because many users can benefit
        });
        prefs.push({
            'name': 'prefAutoScrollTranscript',
            'label': null,
            'group': 'transcript',
            'default': 1
        });
        prefs.push({
            'name': 'prefTabbable', // tab-enable transcript
            'label': this.ablePlayer.tt.prefTabbable,
            'group': 'transcript',
            'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
        });

        if (this.ablePlayer.mediaType === 'video') {

            // Caption preferences
            prefs.push({
                'name': 'prefCaptions', // closed captions default state
                'label': null,
                'group': 'captions',
                'default': 0
            });
            /* // not supported yet
      prefs.push({
        'name': 'prefCaptionsStyle',
        'label': this.tt.prefCaptionsStyle,
        'group': 'captions',
        'default': this.tt.captionsStylePopOn
      });
*/
            prefs.push({
                'name': 'prefCaptionsPosition',
                'label': this.ablePlayer.tt.prefCaptionsPosition,
                'group': 'captions',
                'default': this.ablePlayer.defaultCaptionsPosition
            });
            prefs.push({
                'name': 'prefCaptionsFont',
                'label': this.ablePlayer.tt.prefCaptionsFont,
                'group': 'captions',
                'default': this.ablePlayer.tt.serif
            });
            prefs.push({
                'name': 'prefCaptionsSize',
                'label': this.ablePlayer.tt.prefCaptionsSize,
                'group': 'captions',
                'default': '125%'
            });
            prefs.push({
                'name': 'prefCaptionsColor',
                'label': this.ablePlayer.tt.prefCaptionsColor,
                'group': 'captions',
                'default': 'white'
            });
            prefs.push({
                'name': 'prefCaptionsBGColor',
                'label': this.ablePlayer.tt.prefCaptionsBGColor,
                'group': 'captions',
                'default': 'black'
            });
            prefs.push({
                'name': 'prefTRFont',
                'label': this.ablePlayer.tt.prefCaptionsFont,
                'group': 'other',
                'default': this.ablePlayer.tt.serif
            });
            prefs.push({
                'name': 'prefTRSize',
                'label': this.ablePlayer.tt.prefCaptionsSize,
                'group': 'other',
                'default': '100%'
            });
            prefs.push({
                'name': 'prefTRColor',
                'label': this.ablePlayer.tt.prefCaptionsColor,
                'group': 'other',
                'default': 'black'
            });
            prefs.push({
                'name': 'prefTRBGColor',
                'label': this.ablePlayer.tt.prefCaptionsBGColor,
                'group': 'other',
                'default': 'white'
            });
            prefs.push({
                'name': 'prefFollowColor',
                'label': this.ablePlayer.tt.prefCaptionsBGColor,
                'group': 'other',
                'default': '#FF6'
            });
            prefs.push({
                'name': 'prefShadowType',
                'label': this.ablePlayer.tt.prefCaptionsBGColor,
                'group': 'other',
                'default': ''
            });
            prefs.push({
                'name': 'prefCaptionsOpacity',
                'label': this.ablePlayer.tt.prefCaptionsOpacity,
                'group': 'captions',
                'default': '100%'
            });
            prefs.push({
                'name': 'prefColorButton',
                'label': this.ablePlayer.tt.prefCaptionsOpacity,
                'group': 'other',
                'default': 'colordef'
            });
            prefs.push({
                'name': 'prefAccessMenu',
                'label': this.ablePlayer.tt.prefCaptionsOpacity,
                'group': 'other',
                'default': 'false'
            });

            // Description preferences
            prefs.push({
                'name': 'prefDesc', // audio description default state
                'label': null,
                'group': 'descriptions',
                'default': 0 // off because users who don't need it might find it distracting
            });
            prefs.push({
                'name': 'prefDescFormat', // audio description default state
                'label': this.ablePlayer.tt.prefDescFormat,
                'group': 'descriptions',
                'default': 'video'
            });
            prefs.push({
                'name': 'prefDescPause', // automatically pause when closed description starts
                'label': this.ablePlayer.tt.prefDescPause,
                'group': 'descriptions',
                'default': 0 // off because it burdens user with restarting after every pause
            });
            prefs.push({
                'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
                'label': this.ablePlayer.tt.prefVisibleDesc,
                'group': 'descriptions',
                'default': 0 // 1 on because sighted users probably want to see this cool feature in action
            });

            // Video preferences without a category (not shown in Preferences dialogs)
            prefs.push({
                'name': 'prefSign', // open sign language window by default if avilable
                'label': null,
                'group': null,
                'default': 0 // off because clicking an icon to see the sign window has a powerful impact
            });

        }
        return prefs;
    };

    /**
     * charge les preferences pour le basePlayer dans le service Cookies du Navigateur
     * Load current/default preferences from cookie into the AccessiblePlayer object.
     */
    loadCurrentPreferences () {
        var available = this.getAvailablePreferences();
        var prefName, defaultValue;
        var cookie = this.getCookie();
        for (var ii = 0; ii < available.length; ii++) {
            prefName = available[ii]['name'];
            defaultValue = available[ii]['default'];
            if (cookie.preferences[prefName] !== undefined) {
                this.ablePlayer[prefName] = cookie.preferences[prefName];
            }
            else {
                cookie.preferences[prefName] = defaultValue;
                this.ablePlayer[prefName] = defaultValue;
            }
        }
        this.setCookie(cookie);
    };

    // Creates a preferences form and injects it.
    injectPrefsForm (form) {
        var thisObj, available, descLangs,
            $prefsDiv, formTitle, introText,
            $prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
            $fieldset, fieldsetClass, fieldsetId,
            $descFieldset1, $descLegend1,$descFieldset2, $descLegend2, $legend,
            thisPref, $thisDiv, thisClass, thisId, $thisLabel, $thisField,
            $div1,id1,$radio1,$label1,
            $div2,id2,$radio2,$label2,
            options,$thisOption,optionValue,optionText,sampleCapsDiv,
            changedPref,changedSpan,changedText,
            currentDescState,
            $kbHeading,$kbList,kbLabels,keys,kbListText,$kbListItem,
            dialog,saveButton,cancelButton;

        thisObj = this;
        available = this.getAvailablePreferences();

        // outer container, will be assigned role="dialog"
        $prefsDiv = $('<div>',{
            'class': 'able-prefs-form '
        });
        var customClass = 'able-prefs-form-' + form;
        $prefsDiv.addClass(customClass);

        // add intro
        if (form == 'captions') {
            formTitle = this.ablePlayer.tt.prefTitleCaptions;
            introText = this.ablePlayer.tt.prefIntroCaptions;
            // Uncomment the following line to include a cookie warning
            // Not included for now in order to cut down on unnecessary verbiage
            // introText += ' ' + this.tt.prefCookieWarning;
            $prefsIntro = $('<p>', {
                text: introText
            });
            $prefsDiv.append($prefsIntro);
        } else if (form == 'descriptions') {
            formTitle = this.ablePlayer.tt.prefTitleDescriptions;
            var $prefsIntro = $('<p>', {
                text: this.ablePlayer.tt.prefIntroDescription1
            });
            var $prefsIntroUL = $('<ul>');
            var $prefsIntroLI1 = $('<li>', {
                text: this.ablePlayer.tt.prefDescFormatOption1
            });
            var $prefsIntroLI2 = $('<li>', {
                text: this.ablePlayer.tt.prefDescFormatOption2
            });

            $prefsIntroUL.append($prefsIntroLI1, $prefsIntroLI2);
            if (this.ablePlayer.hasOpenDesc && this.ablePlayer.hasClosedDesc) {
                currentDescState = this.ablePlayer.tt.prefIntroDescription2 + ' ';
                currentDescState += '<strong>' + this.ablePlayer.tt.prefDescFormatOption1b + '</strong>';
                currentDescState += ' <em>' + this.ablePlayer.tt.and + '</em> <strong>' + this.ablePlayer.tt.prefDescFormatOption2b + '</strong>.';
            } else if (this.ablePlayer.hasOpenDesc) {
                currentDescState = this.ablePlayer.tt.prefIntroDescription2;
                currentDescState += ' <strong>' + this.ablePlayer.tt.prefDescFormatOption1b + '</strong>.';
            } else if (this.ablePlayer.hasClosedDesc) {
                currentDescState = this.ablePlayer.tt.prefIntroDescription2;
                currentDescState += ' <strong>' + this.ablePlayer.tt.prefDescFormatOption2b + '</strong>.';
            } else {
                currentDescState = this.ablePlayer.tt.prefIntroDescriptionNone;
            }
            $prefsIntroP2 = $('<p>', {
                html: currentDescState
            });

            p3Text = this.ablePlayer.tt.prefIntroDescription3;
            if (this.ablePlayer.hasOpenDesc || this.ablePlayer.hasClosedDesc) {
                p3Text += ' ' + this.ablePlayer.tt.prefIntroDescription4;
            }
            $prefsIntroP3 = $('<p>', {
                text: p3Text
            });

            $prefsDiv.append($prefsIntro, $prefsIntroUL, $prefsIntroP2, $prefsIntroP3);
        } else if (form == 'keyboard') {
            formTitle = this.ablePlayer.tt.prefTitleKeyboard;
            introText = this.ablePlayer.tt.prefIntroKeyboard1;
            introText += ' ' + this.ablePlayer.tt.prefIntroKeyboard2;
            introText += ' ' + this.ablePlayer.tt.prefIntroKeyboard3;
            $prefsIntro = $('<p>', {
                text: introText
            });
            $prefsDiv.append($prefsIntro);
        } else if (form == 'transcript') {
            formTitle = this.ablePlayer.tt.prefTitleTranscript;
            introText = this.ablePlayer.tt.prefIntroTranscript;
            // Uncomment the following line to include a cookie warning
            // Not included for now in order to cut down on unnecessary verbiage
            // introText += ' ' + this.tt.prefCookieWarning;
            $prefsIntro = $('<p>', {
                text: introText
            });
            $prefsDiv.append($prefsIntro);
        }

        if (form === 'descriptions') {
            // descriptions form has two field sets

            // Fieldset 1
            $descFieldset1 = $('<fieldset>');
            fieldsetClass = 'able-prefs-' + form + '1';
            fieldsetId = this.ablePlayer.mediaId + '-prefs-' + form + '1';
            $descFieldset1.addClass(fieldsetClass).attr('id', fieldsetId);
            $descLegend1 = $('<legend>' + this.ablePlayer.tt.prefDescFormat + '</legend>');
            $descFieldset1.append($descLegend1);

            // Fieldset 2
            $descFieldset2 = $('<fieldset>');
            fieldsetClass = 'able-prefs-' + form + '2';
            fieldsetId = this.ablePlayer.mediaId + '-prefs-' + form + '2';
            $descFieldset2.addClass(fieldsetClass).attr('id', fieldsetId);
            $descLegend2 = $('<legend>' + this.ablePlayer.tt.prefHeadingTextDescription + '</legend>');
            $descFieldset2.append($descLegend2);
        } else {
            // all other forms just have one fieldset
            $fieldset = $('<fieldset>');
            fieldsetClass = 'able-prefs-' + form;
            fieldsetId = this.ablePlayer.mediaId + '-prefs-' + form;
            $fieldset.addClass(fieldsetClass).attr('id', fieldsetId);
            if (form === 'keyboard') {
                $legend = $('<legend>' + this.ablePlayer.ablePlayer.tt.prefHeadingKeyboard1 + '</legend>');
                $fieldset.append($legend);
            }
        }
        for (i = 0; i < available.length; i++) {

            // only include prefs on the current form if they have a label
            if ((available[i]['group'] == form) && available[i]['label']) {

                thisPref = available[i]['name'];
                thisClass = 'able-' + thisPref;
                thisId = this.ablePlayer.mediaId + '_' + thisPref;
                if (thisPref !== 'prefDescFormat') {
                    $thisDiv = $('<div>').addClass(thisClass);
                }

                // Audio Description preferred format radio buttons
                if (thisPref == 'prefDescFormat') {

                    // option 1 radio button
                    $div1 = $('<div>');
                    id1 = thisId + '_1';
                    $label1 = $('<label>')
                        .attr('for', id1)
                        .text(Misc.capitalizeFirstLetter(this.ablePlayer.tt.prefDescFormatOption1))
                    $radio1 = $('<input>', {
                        type: 'radio',
                        name: thisPref,
                        id: id1,
                        value: 'video'
                    });
                    if (this.ablePlayer.prefDescFormat === 'video') {
                        $radio1.prop('checked', true);
                    }

                    $div1.append($radio1, $label1);

                    // option 2 radio button
                    $div2 = $('<div>');
                    id2 = thisId + '_2';
                    $label2 = $('<label>')
                        .attr('for', id2)
                        .text(Misc.capitalizeFirstLetter(this.ablePlayer.tt.prefDescFormatOption2));
                    $radio2 = $('<input>', {
                        type: 'radio',
                        name: thisPref,
                        id: id2,
                        value: 'text'
                    });
                    if (this.ablePlayer.prefDescFormat === 'text') {
                        $radio2.prop('checked', true);
                    }

                    $div2.append($radio2, $label2);
                } else if (form === 'captions') {
                    $thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
                    $thisField = $('<select>', {
                        name: thisPref,
                        id: thisId,
                    });
                    if (thisPref !== 'prefCaptions' && thisPref !== 'prefCaptionsStyle') {
                        // add a change handler that updates the style of the sample caption text
                        $thisField.change(function () {
                            changedPref = $(this).attr('name');
                            thisObj.caption.stylizeCaptions(thisObj.ablePlayer.$sampleCapsDiv, changedPref);
                        });
                    }
                    options = this.ablePlayer.caption.getCaptionsOptions(thisPref);
                    for (j = 0; j < options.length; j++) {
                        if (thisPref === 'prefCaptionsPosition') {
                            optionValue = options[j];
                            if (optionValue === 'overlay') {
                                optionText = this.ablePlayer.tt.captionsPositionOverlay;
                            } else if (optionValue === 'below') {
                                optionValue = options[j];
                                optionText = this.ablePlayer.tt.captionsPositionBelow;
                            }
                        } else if (thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
                            optionValue = options[j][0];
                            optionText = options[j][1];
                        } else if (thisPref === 'prefCaptionsOpacity') {
                            optionValue = options[j];
                            optionText = options[j];
                            if (optionValue === '0%') {
                                optionText += ' (' + this.ablePlayer.tt.transparent + ')';
                            } else if (optionValue === '100%') {
                                optionText += ' (' + this.ablePlayer.tt.solid + ')';
                            }
                        } else {
                            optionValue = options[j];
                            optionText = options[j];
                        }
                        $thisOption = $('<option>', {
                            value: optionValue,
                            text: optionText
                        });
                        if (this[thisPref] === optionValue) {
                            $thisOption.prop('selected', true);
                        }
                        $thisField.append($thisOption);
                    }
                    $thisDiv.append($thisLabel, $thisField);
                } else { // all other fields are checkboxes
                    $thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
                    $thisField = $('<input>', {
                        type: 'checkbox',
                        name: thisPref,
                        id: thisId,
                        value: 'true'
                    });
                    // check current active value for this preference
                    if (this.ablePlayer[thisPref] === 1) {
                        $thisField.prop('checked', true);
                    }
                    if (form === 'keyboard') {
                        // add a change handler that updates the list of current keyboard shortcuts
                        $thisField.change(function () {
                            changedPref = $(this).attr('name');
                            if (changedPref === 'prefAltKey') {
                                changedSpan = '.able-modkey-alt';
                                changedText = thisObj.ablePlayer.tt.prefAltKey + ' + ';
                            } else if (changedPref === 'prefCtrlKey') {
                                changedSpan = '.able-modkey-ctrl';
                                changedText = thisObj.ablePlayer.tt.prefCtrlKey + ' + ';
                            } else if (changedPref === 'prefShiftKey') {
                                changedSpan = '.able-modkey-shift';
                                changedText = thisObj.ablePlayer.tt.prefShiftKey + ' + ';
                            }
                            if ($(this).is(':checked')) {
                                $(changedSpan).text(changedText);
                            } else {
                                $(changedSpan).text('');
                            }
                        });
                    }
                    $thisDiv.append($thisField, $thisLabel);
                }
                if (form === 'descriptions') {
                    if (thisPref === 'prefDescFormat') {
                        $descFieldset1.append($div1, $div2);
                    } else {
                        $descFieldset2.append($thisDiv);
                    }
                } else {
                    $fieldset.append($thisDiv);
                }
            }
        }
        if (form === 'descriptions') {
            $prefsDiv.append($descFieldset1, $descFieldset2);
        } else {
            $prefsDiv.append($fieldset);
        }
        if (form === 'captions') {
            // add a sample closed caption div to prefs dialog
            if (this.ablePlayer.mediaType === 'video') {
                this.ablePlayer.$sampleCapsDiv = $('<div>', {
                    'class': 'able-captions-sample'
                }).text(this.ablePlayer.tt.sampleCaptionText);
                $prefsDiv.append(this.ablePlayer.$sampleCapsDiv);
                this.ablePlayer.caption.stylizeCaptions(this.ablePlayer.$sampleCapsDiv);
            }
        } else if (form === 'keyboard') {
            // add a current list of keyboard shortcuts
            $kbHeading = $('<h2>', {
                text: this.ablePlayer.tt.prefHeadingKeyboard2
            });
            $kbList = $('<ul>');
            // create arrays of kbLabels and keys
            kbLabels = [];
            keys = [];
            for (i = 0; i < this.ablePlayer.controls.length; i++) {
                if (this.ablePlayer.controls[i] === 'play') {
                    kbLabels.push(this.ablePlayer.tt.play + '/' + this.ablePlayer.tt.pause);
                    keys.push('p</span> <em>' + this.ablePlayer.tt.or + '</em> <span class="able-help-modifiers"> ' + this.ablePlayer.tt.spacebar);
                } else if (this.ablePlayer.controls[i] === 'restart') {
                    kbLabels.push(this.ablePlayer.tt.restart);
                    keys.push('s');
                } else if (this.ablePlayer.controls[i] === 'rewind') {
                    kbLabels.push(this.ablePlayer.tt.rewind);
                    keys.push('r');
                } else if (this.ablePlayer.controls[i] === 'forward') {
                    kbLabels.push(this.ablePlayer.tt.forward);
                    keys.push('f');
                } else if (this.ablePlayer.controls[i] === 'volume') {
                    kbLabels.push(this.ablePlayer.tt.volume);
                    keys.push('v</span> <em>' + this.ablePlayer.tt.or + '</em> <span class="able-modkey">1-9');
                    // mute toggle
                    kbLabels.push(this.tt.mute + '/' + this.ablePlayer.tt.unmute);
                    keys.push('m');
                } else if (this.ablePlayer.controls[i] === 'captions') {
                    if (this.ablePlayer.captions.length > 1) {
                        // caption button launches a Captions popup menu
                        kbLabels.push(this.ablePlayer.tt.captions);
                    } else {
                        // there is only one caption track
                        // therefore caption button is a toggle
                        if (this.ablePlayer.captionsOn) {
                            kbLabels.push(this.ablePlayer.tt.hideCaptions);
                        } else {
                            kbLabels.push(this.ablePlayer.tt.showCaptions);
                        }
                    }
                    keys.push('c');
                } else if (this.ablePlayer.controls[i] === 'descriptions') {
                    if (this.ablePlayer.descOn) {
                        kbLabels.push(this.ablePlayer.tt.turnOffDescriptions);
                    } else {
                        kbLabels.push(this.ablePlayer.tt.turnOnDescriptions);
                    }
                    keys.push('d');
                } else if (this.ablePlayer.controls[i] === 'prefs') {
                    kbLabels.push(this.ablePlayer.tt.preferences);
                    keys.push('e');
                } else if (this.ablePlayer.controls[i] === 'help') {
                    kbLabels.push(this.ablePlayer.tt.help);
                    keys.push('h');
                }
            }
            for (i = 0; i < keys.length; i++) {
                // alt
                kbListText = '<span class="able-modkey-alt">';
                if (this.ablePlayer.prefAltKey === 1) {
                    kbListText += this.ablePlayer.tt.prefAltKey + ' + ';
                }
                kbListText += '</span>';
                // ctrl
                kbListText += '<span class="able-modkey-ctrl">';
                if (this.ablePlayer.prefCtrlKey === 1) {
                    kbListText += this.ablePlayer.tt.prefCtrlKey + ' + ';
                }
                kbListText += '</span>';
                // shift
                kbListText += '<span class="able-modkey-shift">';
                if (this.ablePlayer.prefShiftKey === 1) {
                    kbListText += this.ablePlayer.tt.prefShiftKey + ' + ';
                }
                kbListText += '</span>';
                kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
                kbListText += ' = ' + kbLabels[i];
                $kbListItem = $('<li>', {
                    html: kbListText
                });
                $kbList.append($kbListItem);
            }
            // add Escape key
            kbListText = '<span class="able-modkey">' + this.ablePlayer.tt.escapeKey + '</span>';
            kbListText += ' = ' + this.ablePlayer.tt.escapeKeyFunction;
            $kbListItem = $('<li>', {
                html: kbListText
            });
            $kbList.append($kbListItem);
            // put it all together
            $prefsDiv.append($kbHeading, $kbList);
        }

        // $prefsDiv (dialog) must be appended to the BODY!
        // otherwise when aria-hidden="true" is applied to all background content
        // that will include an ancestor of the dialog,
        // which will render the dialog unreadable by screen readers
        $('body').append($prefsDiv);
        dialog = new AccessibleDialog($prefsDiv, this.ablePlayer.$prefsButton, 'dialog', formTitle, $prefsIntro, thisObj.ablePlayer.tt.closeButtonLabel, '32em');

        // Add save and cancel buttons.
        $prefsDiv.append('<hr>');
        saveButton = $('<button class="modal-button">' + this.ablePlayer.tt.save + '</button>');
        cancelButton = $('<button class="modal-button">' + this.ablePlayer.tt.cancel + '</button>');
        saveButton.click(function () {
            dialog.hide();
            thisObj.savePrefsFromForm();
        });
        cancelButton.click(function () {
            dialog.hide();
            thisObj.resetPrefsForm();
        });

        $prefsDiv.append(saveButton);
        $prefsDiv.append(cancelButton);

        // add global reference for future control
        if (form === 'captions') {
            this.ablePlayer.captionPrefsDialog = dialog;
        } else if (form === 'descriptions') {
            this.ablePlayer.descPrefsDialog = dialog;
        } else if (form === 'keyboard') {
            this.ablePlayer.keyboardPrefsDialog = dialog;
        } else if (form === 'transcript') {
            this.ablePlayer.transcriptPrefsDialog = dialog;
        }

        // Add click handler for dialog close button
        // (button is added in dialog.js)
        $('div.able-prefs-form button.modalCloseButton').click(function () {
            thisObj.resetPrefsForm();
        })
        // Add handler for escape key
        $('div.able-prefs-form').keydown(function (event) {
            if (event.which === 27) { // escape
                thisObj.resetPrefsForm();
            }
        });
    };

    // Reset preferences form with default values from cookie
    resetPrefsForm () {
        var cookie, available, i, prefName, prefId;
        cookie = this.getCookie();
        available = this.getAvailablePreferences();
        for (i=0; i<available.length; i++) {
            prefName = available[i]['name'];
            if (prefName === 'prefDescFormat') {
                if (this.ablePlayer[prefName] === 'text') {
                    $('input[value="text"]').prop('checked', true);
                } else {
                    $('input[value="video"]').prop('checked', true);
                }
            } else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
                // this is a caption-related select box
                $('select[name="' + prefName + '"]').val(cookie.preferences[prefName]);
            } else { // all others are checkboxes
                if (this.ablePlayer[prefName] === 1) {
                    $('input[name="' + prefName + '"]').prop('checked', true);
                } else {
                    $('input[name="' + prefName + '"]').prop('checked', false);
                }
            }
        }
        // also restore style of sample caption div
        this.ablePlayer.caption.stylizeCaptions(this.ablePlayer.$sampleCapsDiv);
    };

    // Return a prefs object constructed from the form.
    savePrefsFromForm () {
        var cookie, available, prefName, prefId, numChanges,
            numCapChanges, capSizeChanged, capSizeValue, newValue;

        numChanges = 0;
        numCapChanges = 0; // changes to caption-style-related preferences
        capSizeChanged = false;
        cookie = this.ablePlayer.preference.getCookie();
        available = this.getAvailablePreferences();
        for (var i = 0; i < available.length; i++) {
            // only prefs with labels are used in the Prefs form
            if (available[i]['label']) {
                var prefName = available[i]['name'];
                if (prefName == 'prefDescFormat') {
                    this.ablePlayer.prefDescFormat = $('input[name="' + prefName + '"]:checked').val();
                    if (this.ablePlayer.prefDescFormat !== cookie.preferences['prefDescFormat']) { // user changed setting
                        cookie.preferences['prefDescFormat'] = this.ablePlayer.prefDescFormat;
                        numChanges++;
                    }
                } else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
                    // this is one of the caption-related select fields
                    newValue = $('select[name="' + prefName + '"]').val();
                    if (cookie.preferences[prefName] !== newValue) { // user changed setting
                        cookie.preferences[prefName] = newValue;
                        // also update global var for this pref (for caption fields, not done elsewhere)
                        this.ablePlayer[prefName] = newValue;
                        numChanges++;
                        numCapChanges++;
                    }
                    if (prefName === 'prefCaptionsSize') {
                        capSizeChanged = true;
                        capSizeValue = newValue;
                    }
                } else { // all other fields are checkboxes
                    if ($('input[name="' + prefName + '"]').is(':checked')) {
                        cookie.preferences[prefName] = 1;
                        if (this.ablePlayer[prefName] === 1) {
                            // nothing has changed
                        } else {
                            // user has just turned this pref on
                            this.ablePlayer[prefName] = 1;
                            numChanges++;
                        }
                    } else { // thisPref is not checked
                        cookie.preferences[prefName] = 0;
                        if (this.ablePlayer[prefName] === 1) {
                            // user has just turned this pref off
                            this.ablePlayer[prefName] = 0;
                            numChanges++;
                        } else {
                            // nothing has chaged
                        }
                    }
                }
            }
        }
        if (numChanges > 0) {
            this.ablePlayer.preference.setCookie(cookie);
            this.ablePlayer.control.showAlert(this.ablePlayer.tt.prefSuccess);
        }
        else {
            this.ablePlayer.control.showAlert(this.ablePlayer.tt.prefNoChange);
        }
        if (this.ablePlayer.player === 'youtube' &&
            (typeof this.ablePlayer.usingYouTubeCaptions !== 'undefined' && this.ablePlayer.usingYouTubeCaptions) &&
            capSizeChanged) {
            // update font size of YouTube captions
            this.ablePlayer.youTubePlayer.setOption(this.ablePlayer.ytCaptionModule, 'fontSize', this.ablePlayer.translatePrefs('size', capSizeValue, 'youtube'));
        }
        this.updatePrefs();
        if (numCapChanges > 0) {
            this.ablePlayer.caption.stylizeCaptions(this.ablePlayer.$captionsDiv);
            // also apply same changes to descriptions, if present
            if (typeof this.ablePlayer.$descDiv !== 'undefined') {
                this.ablePlayer.caption.stylizeCaptions(this.ablePlayer.$descDiv);
            }
        }
    }

    // Updates player based on current prefs.  Safe to call multiple times.
    updatePrefs () {

        var modHelp;

        // modifier keys (update help text)
        if (this.ablePlayer.prefAltKey === 1) {
            modHelp = 'Alt + ';
        } else {
            modHelp = '';
        }
        if (this.ablePlayer.prefCtrlKey === 1) {
            modHelp += 'Control + ';
        }
        if (this.ablePlayer.prefShiftKey === 1) {
            modHelp += 'Shift + ';
        }
        $('.able-help-modifiers').text(modHelp);

        // tabbable transcript
        if (this.ablePlayer.prefTabbable === 1) {
            $('.able-transcript span.able-transcript-seekpoint').attr('tabindex', '0');
        } else {
            $('.able-transcript span.able-transcript-seekpoint').removeAttr('tabindex');
        }

        // transcript highlights
        if (this.ablePlayer.prefHighlight === 0) {
            // user doesn't want highlights; remove any existing highlights
            $('.able-transcript span').removeClass('able-highlight');
        }

        // Re-initialize caption and description in case relevant settings have changed
        this.ablePlayer.caption.updateCaption();
        this.ablePlayer.refreshingDesc = true;
        this.ablePlayer.description.initDescription();
    };

    // return true if user is holding down required modifier keys
    usingModifierKeys(e) {
        if ((this.ablePlayer.prefAltKey === 1) && !e.altKey) {
            return false;
        }
        if ((this.ablePlayer.prefCtrlKey === 1) && !e.ctrlKey) {
            return false;
        }
        if ((this.ablePlayer.prefShiftKey === 1) && !e.shiftKey) {
            return false;
        }
        return true;
    };

    //to delete
    rebuildDescPrefsForm() {
        var i, optionValue, optionText, $thisOption;
        this.ablePlayer.$voiceSelectField = $('#' + this.mediaId + '_prefDescVoice');
        for (i=0; i < this.ablePlayer.descVoices.length; i++) {
            optionValue = this.ablePlayer.descVoices[i].name;
            optionText = optionValue + ' (' + this.ablePlayer.descVoices[i].lang + ')';
            $thisOption = $('<option>',{
                value: optionValue,
                text: optionText
            });
            if (this.ablePlayer.prefDescVoice == optionValue) {
                $thisOption.prop('selected',true);
            }
            this.ablePlayer.$voiceSelectField.append($thisOption);
        }
    };

    //to delete
    makePrefsValueReadable(pref,value) {
        if (pref === 'prefDescPitch') {
            if (value === 0) {
                return this.ablePlayer.tt.prefDescPitch1;
            }
            else if (value === 0.5) {
                return this.ablePlayer.tt.prefDescPitch2;
            }
            else if (value === 1) {
                return this.ablePlayer.tt.prefDescPitch3;
            }
            else if (value === 1.5) {
                return this.ablePlayer.tt.prefDescPitch4;
            }
            else if (value === 2) {
                return this.ablePlayer.tt.prefDescPitch5;
            }
        }
        else if (pref === 'prefDescRate') {
            if (value === 0.7) {
                return 1;
            }
            else if (value === 0.8) {
                return 2;
            }
            else if (value === 0.9) {
                return 3;
            }
            else if (value === 1) {
                return 4;
            }
            else if (value === 1.1) {
                return 5;
            }
            else if (value === 1.2) {
                return 6;
            }
            else if (value === 1.5) {
                return 7;
            }
            else if (value === 2) {
                return 8;
            }
            else if (value === 2.5) {
                return 9;
            }
            else if (value === 3) {
                return 10;
            }
        }
        else if (pref === 'prefDescVolume') {
            // values range from 0.1 to 1.0
            return value * 10;
        }
        return value;
    };








}