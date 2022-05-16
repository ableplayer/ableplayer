export default class Caption{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    updateCaption (time) {
        if (!this.ablePlayer.usingYouTubeCaptions && (typeof this.ablePlayer.$captionsWrapper !== 'undefined')) {
            if (this.ablePlayer.captionsOn) {
                this.ablePlayer.$captionsWrapper.show();
                this.showCaptions(time || this.ablePlayer.control.getElapsed());
            }
            else if (this.ablePlayer.$captionsWrapper) {
                this.ablePlayer.$captionsWrapper.hide();
                this.ablePlayer.prefCaptions = 0;
            }
        }
    };

    //to delete
    /*setCaptionsOn(state, lang) {
        var thisObj = this;
        if (state == true) {
            var captions;
            if (thisObj.captions.length) {
                captions = thisObj.captions;
            } else if (thisObj.ytCaptions.length) {
                captions = thisObj.ytCaptions;
            } else {
                captions = [];
            }
            thisObj.captionsOn = true;
            thisObj.prefCaptions = 1;
            thisObj.updateCookie('prefCaptions');
            if (thisObj.usingYouTubeCaptions) {
                if (typeof thisObj.ytCaptionModule !== 'undefined') {
                    thisObj.youTubePlayer.loadModule(thisObj.ytCaptionModule);
                }
            } else {
                thisObj.$captionsWrapper.show();
            }
            for (var i = 0; i < captions.length; i++) {
                if (captions[i].def === true || captions[i].language == lang) { // this is the default language
                    thisObj.selectedCaptions = captions[i];
                }
            }
            //thisObj.selectedCaptions = thisObj.captions[0];
            if (thisObj.descriptions.length >= 0) {
                thisObj.selectedDescriptions = thisObj.descriptions[0];
            }

        } else {
            for (var q = 0; q < $(thisObj.captionsPopup.find('input')).length; q++) {
                if ($($(thisObj.captionsPopup.find('input'))[q]).attr('lang') == undefined) {
                    $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", true);
                }
            }
            thisObj.captionsOn = false;
            thisObj.currentCaption = -1;
            // stopgap to prevent spacebar in Firefox from reopening popup
            // immediately after closing it (used in handleCaptionToggle())
            thisObj.hidingPopup = true;
            thisObj.captionsPopup.hide();
            // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
            // e.g., if user triggered button with Enter or mouse click, not spacebar
            setTimeout(function () {
                thisObj.hidingPopup = false;
            }, 100);
            thisObj.$ccButton.focus();

            // save preference to cookie
            thisObj.prefCaptions = 0;
            thisObj.updateCookie('prefCaptions');
            if (!this.swappingSrc) {
                thisObj.refreshControls();
                thisObj.updateCaption();
            }
        }
    }*/

    // Returns the function used when a caption is clicked in the captions menu.
    getCaptionClickFunction (track) {
        var thisObj = this.ablePlayer;
        return  () => {
            this.ablePlayer.selectedCaptions = track;
            this.ablePlayer.captionLang = track.language;
            this.ablePlayer.currentCaption = -1;
            if (this.ablePlayer.usingYouTubeCaptions) {
                /*if (thisObj.captionsOn) {
                    // Two things must be true in order for setOption() to work:
                    // The YouTube caption module must be loaded
                    // and the video must have started playing
                    if (thisObj.youTubePlayer.getOptions('captions') && thisObj.startedPlaying) {
                        thisObj.youTubePlayer.setOption('captions', 'track', {'languageCode': thisObj.captionLang});
                    }
                    else {
                        // the two conditions were not met
                        // try again to set the language after onApiChange event is triggered
                        // meanwhile, the following variable will hold the value
                        thisObj.captionLangPending = thisObj.captionLang;
                    }
                }
                else {
                    if (thisObj.youTubePlayer.getOptions('captions')) {
                        thisObj.youTubePlayer.setOption('captions', 'track', {'languageCode': thisObj.captionLang});
                    }
                    else {
                        thisObj.youTubePlayer.loadModule('captions');
                        thisObj.captionLangPending = thisObj.captionLang;
                    }
                }*/
            }
            else { // using local track elements for captions/subtitles
                this.ablePlayer.control.syncTrackLanguages('captions',this.ablePlayer.captionLang);
                if (!this.ablePlayer.swappingSrc) {
                    this.ablePlayer.caption.updateCaption(this.ablePlayer.elapsed);
                    this.ablePlayer.description.showDescription(this.ablePlayer.control.getElapsed());
                }
            }
            this.ablePlayer.hidingPopup = true;
            this.ablePlayer.captionsPopup.hide();
            setTimeout(() => {
                thisObj.hidingPopup = false;
            }, 100);
            this.ablePlayer.$ccButton.focus();

            //Orange synch with able buttons
            console.log('captions Lang');
            if (thisObj.captionLang === 'en') {
                if (thisObj.$buttonSubEN.attr('aria-pressed') == 'true') {
                    thisObj.setCaptionsOn(false, thisObj.captionLang);
                    thisObj.$buttonSubEN.attr('aria-checked', 'false');
                    thisObj.$buttonSubEN.attr('aria-pressed', 'false');
                    thisObj.$buttonSubEN.removeClass('aria-no-checked');
                    thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);
                    thisObj.$buttonSubEN.removeClass('subtno');
                } else {
                    thisObj.setCaptionsOn(true, thisObj.captionLang);
                    thisObj.$buttonSubEN.attr('aria-checked', 'true');
                    thisObj.$buttonSubEN.attr('aria-pressed', 'true');
                    thisObj.$buttonSubEN.addClass('aria-no-checked');
                    thisObj.$buttonSubEN.text(thisObj.tt.de_act_st_en);
                    thisObj.$buttonSubEN.addClass('subtno');
                }


                thisObj.$buttonSubFR.attr('aria-checked', 'false');
                thisObj.$buttonSubFR.attr('aria-pressed', 'false');
                thisObj.$buttonSubFR.removeClass('aria-no-checked');
                thisObj.$buttonSubFR.removeClass('subtno');
                thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

                thisObj.$buttonSubML.attr('aria-checked', 'false');
                thisObj.$buttonSubML.attr('aria-pressed', 'false');
                thisObj.$buttonSubML.removeClass('aria-no-checked');
                thisObj.$buttonSubML.removeClass('subtno');
                thisObj.$buttonSubML.text('');
                //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");


                thisObj.$buttonSubPL.attr('aria-checked', 'false');
                thisObj.$buttonSubPL.attr('aria-pressed', 'false');
                thisObj.$buttonSubPL.removeClass('aria-no-checked');
                thisObj.$buttonSubPL.removeClass('subtno');
                thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

                thisObj.$buttonSubES.attr('aria-checked', 'false');
                thisObj.$buttonSubES.attr('aria-pressed', 'false');
                thisObj.$buttonSubES.removeClass('aria-no-checked');
                thisObj.$buttonSubES.removeClass('subtno');
                thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
            } else if (thisObj.captionLang === 'fr') {
                console.log(thisObj.$buttonSubFR.attr('aria-pressed'));
                console.log('is captions On ?' + thisObj.captionsOn);
                if (thisObj.$buttonSubFR.attr('aria-pressed') == 'true') {
                    thisObj.setCaptionsOn(false, thisObj.captionLang);
                    console.log('ONOFF ');
                    thisObj.$buttonSubFR.attr('aria-checked', 'false');
                    thisObj.$buttonSubFR.attr('aria-pressed', 'false');
                    thisObj.$buttonSubFR.removeClass('aria-no-checked');
                    thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);
                    thisObj.$buttonSubFR.removeClass('subtno');
                } else {
                    thisObj.setCaptionsOn(true, thisObj.captionLang);
                    thisObj.$buttonSubFR.attr('aria-checked', 'true');
                    thisObj.$buttonSubFR.attr('aria-pressed', 'true');
                    thisObj.$buttonSubFR.addClass('aria-no-checked');
                    thisObj.$buttonSubFR.text(thisObj.tt.de_act_st_fr);
                    thisObj.$buttonSubFR.addClass('subtno');
                }

                thisObj.$buttonSubML.attr('aria-checked', 'false');
                thisObj.$buttonSubML.attr('aria-pressed', 'false');
                thisObj.$buttonSubML.removeClass('aria-no-checked');
                thisObj.$buttonSubML.removeClass('subtno');
                thisObj.$buttonSubML.text('');
                thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
                //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");

                thisObj.$buttonSubEN.attr('aria-checked', 'false');
                thisObj.$buttonSubEN.attr('aria-pressed', 'false');
                thisObj.$buttonSubEN.removeClass('aria-no-checked');
                thisObj.$buttonSubEN.removeClass('subtno');
                thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

                thisObj.$buttonSubPL.attr('aria-checked', 'false');
                thisObj.$buttonSubPL.attr('aria-pressed', 'false');
                thisObj.$buttonSubPL.removeClass('aria-no-checked');
                thisObj.$buttonSubPL.removeClass('subtno');
                thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

                thisObj.$buttonSubES.attr('aria-checked', 'false');
                thisObj.$buttonSubES.attr('aria-pressed', 'false');
                thisObj.$buttonSubES.removeClass('aria-no-checked');
                thisObj.$buttonSubES.removeClass('subtno');
                thisObj.$buttonSubES.text(thisObj.tt.act_st_es);


            } else if (thisObj.captionLang === 'es') {
                if (thisObj.$buttonSubES.attr('aria-pressed') == 'true') {
                    thisObj.setCaptionsOn(false, thisObj.captionLang);
                    thisObj.$buttonSubES.attr('aria-checked', 'false');
                    thisObj.$buttonSubES.attr('aria-pressed', 'false');
                    thisObj.$buttonSubES.removeClass('aria-no-checked');
                    thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
                    thisObj.$buttonSubES.removeClass('subtno');
                } else {
                    thisObj.setCaptionsOn(true, thisObj.captionLang);
                    thisObj.$buttonSubES.attr('aria-checked', 'true');
                    thisObj.$buttonSubES.attr('aria-pressed', 'true');
                    thisObj.$buttonSubES.addClass('aria-no-checked');
                    thisObj.$buttonSubES.text(thisObj.tt.de_act_st_es);
                    thisObj.$buttonSubES.addClass('subtno');
                }


                thisObj.$buttonSubML.attr('aria-checked', 'false');
                thisObj.$buttonSubML.attr('aria-pressed', 'false');
                thisObj.$buttonSubML.removeClass('aria-no-checked');
                thisObj.$buttonSubML.removeClass('subtno');
                thisObj.$buttonSubML.text('');
                thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
                //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");

                thisObj.$buttonSubFR.attr('aria-checked', 'false');
                thisObj.$buttonSubFR.attr('aria-pressed', 'false');
                thisObj.$buttonSubFR.removeClass('aria-no-checked');
                thisObj.$buttonSubFR.removeClass('subtno');
                thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

                thisObj.$buttonSubEN.attr('aria-checked', 'false');
                thisObj.$buttonSubEN.attr('aria-pressed', 'false');
                thisObj.$buttonSubEN.removeClass('aria-no-checked');
                thisObj.$buttonSubEN.removeClass('subtno');
                thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

                $('#subtitlesPL').attr('aria-checked', 'false');
                $('#subtitlesPL').attr('aria-pressed', 'false');
                $('#subtitlesPL').removeClass('aria-no-checked');
                $('#subtitlesPL').removeClass('subtno');
                $('#subtitlesPL').text(thisObj.tt.act_st_pl);
            } else if (thisObj.captionLang === 'pl') {
                if (thisObj.$buttonSubPL.attr('aria-pressed') == 'true') {
                    thisObj.setCaptionsOn(false, thisObj.captionLang);
                    thisObj.$buttonSubPL.attr('aria-checked', 'false');
                    thisObj.$buttonSubPL.attr('aria-pressed', 'false');
                    thisObj.$buttonSubPL.removeClass('aria-no-checked');
                    thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);
                    thisObj.$buttonSubPL.removeClass('subtno');
                } else {
                    thisObj.setCaptionsOn(true, thisObj.captionLang);
                    thisObj.$buttonSubPL.attr('aria-checked', 'true');
                    thisObj.$buttonSubPL.attr('aria-pressed', 'true');
                    thisObj.$buttonSubPL.addClass('aria-no-checked');
                    thisObj.$buttonSubPL.text(thisObj.tt.de_act_st_pl);
                    thisObj.$buttonSubPL.addClass('subtno');
                }
                // $('#subtitlesPL').attr('aria-checked','true');
                // $('#subtitlesPL').attr('aria-pressed','true');
                // $('#subtitlesPL').addClass('aria-no-checked');
                // $('#subtitlesPL').text(thisObj.tt.de_act_st_pl);
                // $('#subtitlesPL').addClass('subtno');

                thisObj.$buttonSubML.attr('aria-checked', 'false');
                thisObj.$buttonSubML.attr('aria-pressed', 'false');
                thisObj.$buttonSubML.removeClass('aria-no-checked');
                thisObj.$buttonSubML.removeClass('subtno');
                thisObj.$buttonSubML.text('');
                thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
                //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");

                thisObj.$buttonSubFR.attr('aria-checked', 'false');
                thisObj.$buttonSubFR.attr('aria-pressed', 'false');
                thisObj.$buttonSubFR.removeClass('aria-no-checked');
                thisObj.$buttonSubFR.removeClass('subtno');
                thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

                thisObj.$buttonSubEN.attr('aria-checked', 'false');
                thisObj.$buttonSubEN.attr('aria-pressed', 'false');
                thisObj.$buttonSubEN.removeClass('aria-no-checked');
                thisObj.$buttonSubEN.removeClass('subtno');
                thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

                thisObj.$buttonSubES.attr('aria-checked', 'false');
                thisObj.$buttonSubES.attr('aria-pressed', 'false');
                thisObj.$buttonSubES.removeClass('aria-no-checked');
                thisObj.$buttonSubES.removeClass('subtno');
                thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
            } else if (thisObj.captionLang === 'ml') {
                console.log('captionLang is ML');
                if (thisObj.$buttonSubML.attr('aria-pressed') == 'true') {
                    thisObj.setCaptionsOn(false, thisObj.captionLang);
                    thisObj.$buttonSubML.attr('aria-checked', 'false');
                    thisObj.$buttonSubML.attr('aria-pressed', 'false');
                    thisObj.$buttonSubML.removeClass('aria-no-checked');
                    thisObj.$buttonSubML.text('');
                    thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                    //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                } else {
                    thisObj.setCaptionsOn(true, thisObj.captionLang);
                    thisObj.$buttonSubML.attr('aria-checked', 'true');
                    thisObj.$buttonSubML.attr('aria-pressed', 'true');
                    thisObj.$buttonSubML.addClass('aria-no-checked');
                    thisObj.$buttonSubML.text('');
                    thisObj.$buttonSubML.append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.de_act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");
                    //thisObj.$buttonSubML.append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
                }
                // $('#subtitlesML').attr('aria-checked','true');
                // $('#subtitlesML').attr('aria-pressed','true');
                // $('#subtitlesML').addClass('aria-no-checked');
                // $('#subtitlesML').text('');
                // $('#subtitlesML').append("<span id=\"\">"+thisObj.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
                // //$('#subtitlesML').addClass('subtno');

                thisObj.$buttonSubPL.attr('aria-checked', 'false');
                thisObj.$buttonSubPL.attr('aria-pressed', 'false');
                thisObj.$buttonSubPL.removeClass('aria-no-checked');
                thisObj.$buttonSubPL.removeClass('subtno');
                thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

                thisObj.$buttonSubFR.attr('aria-checked', 'false');
                thisObj.$buttonSubFR.attr('aria-pressed', 'false');
                thisObj.$buttonSubFR.removeClass('aria-no-checked');
                thisObj.$buttonSubFR.removeClass('subtno');
                thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

                thisObj.$buttonSubEN.attr('aria-checked', 'false');
                thisObj.$buttonSubEN.attr('aria-pressed', 'false');
                thisObj.$buttonSubEN.removeClass('aria-no-checked');
                thisObj.$buttonSubEN.removeClass('subtno');
                thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

                thisObj.$buttonSubES.attr('aria-checked', 'false');
                thisObj.$buttonSubES.attr('aria-pressed', 'false');
                thisObj.$buttonSubES.removeClass('aria-no-checked');
                thisObj.$buttonSubES.removeClass('subtno');
                thisObj.$buttonSubES.text(thisObj.tt.act_st_es);
            }
            $('#subt').attr('aria-checked', 'true');
            $('#subt').attr('aria-pressed', 'true');
            $('#subt').addClass('aria-no-checked');
            $('#subt').text('');
            //$('#subt').addClass('subtno')
            $('#subt').prop('disabled', false);
            $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

            // save preference to cookie
            thisObj.prefCaptions = 1;
            thisObj.preference.updateCookie('prefCaptions');

            for (var q = 0; q < $(thisObj.captionsPopup.find('input')).length; q++) {
                if ($($(thisObj.captionsPopup.find('input'))[q]).attr('lang') == thisObj.captionLang) {
                    //console.log('Bingo : '+$($(thisObj.captionsPopup.find('input'))[q]).attr('lang'));
                    $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", true);
                } else {
                    $($(thisObj.captionsPopup.find('input'))[q]).prop("checked", false);
                }
            }
            if (thisObj.captionsOn == false) {
                thisObj.captionsPopup.find('input').last().prop('checked', true);
            }

            this.ablePlayer.control.refreshControls();
            this.ablePlayer.control.checkContextVidTranscr();
        }
    };

    getCaptionOffFunction () {
        var thisObj = this.ablePlayer;
        return () => {
            if (this.ablePlayer.player == 'youtube') {
                thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
            }
            //11/12/2020 try just to click on activated language
            if (thisObj.selectedCaptions.language == 'fr' && thisObj.captionsOn == true) {
                thisObj.$buttonSubFR.click();
                console.log(thisObj.captionsPopup);
                console.log(thisObj.captionsPopup.find('input').last());
                thisObj.captionsPopup.find('input').last().prop('checked', true);
            } else if (thisObj.selectedCaptions.language == 'es' && thisObj.captionsOn == true) {
                thisObj.$buttonSubES.click();
            } else if (thisObj.selectedCaptions.language == 'pl' && thisObj.captionsOn == true) {
                thisObj.$buttonSubPL.click();
            } else if (thisObj.selectedCaptions.language == 'ml' && thisObj.captionsOn == true) {
                thisObj.$buttonSubML.click();
            } else if (thisObj.selectedCaptions.language == 'en' && thisObj.captionsOn == true) {
                thisObj.$buttonSubEN.click();
                //thisObj.captionsPopup.$menu.find('input').last().prop('checked',true);
            } else {
                thisObj.captionsOn = false;
                thisObj.currentCaption = -1;
                // stopgap to prevent spacebar in Firefox from reopening popup
                // immediately after closing it (used in handleCaptionToggle())
                thisObj.hidingPopup = true;
                thisObj.captionsPopup.hide();
                // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
                // e.g., if user triggered button with Enter or mouse click, not spacebar
                setTimeout(function () {
                    thisObj.hidingPopup = false;
                }, 100);
                thisObj.$ccButton.focus();

                // save preference to cookie
                thisObj.prefCaptions = 0;
                thisObj.preference.updateCookie('prefCaptions');
                if (!this.ablePlayer.swappingSrc) {
                    thisObj.control.refreshControls();
                    thisObj.updateCaption();
                }

                $('#subt').attr('aria-checked', 'false');
                $('#subt').removeClass('aria-no-checked');
                $('#subt').text('');
                $('#subt').removeClass('subtno');
                $('#subt').attr('disabled', true);
                $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

                thisObj.$buttonSubFR.attr('aria-checked', 'false');
                thisObj.$buttonSubFR.removeClass('aria-no-checked');
                thisObj.$buttonSubFR.removeClass('subtno');
                thisObj.$buttonSubFR.text(thisObj.tt.act_st_fr);

                thisObj.$buttonSubEN.attr('aria-checked', 'false');
                thisObj.$buttonSubEN.removeClass('aria-no-checked');
                thisObj.$buttonSubEN.removeClass('subtno');
                thisObj.$buttonSubEN.text(thisObj.tt.act_st_en);

                thisObj.$buttonSubES.attr('aria-checked', 'false');
                thisObj.$buttonSubES.removeClass('aria-no-checked');
                thisObj.$buttonSubES.removeClass('subtno');
                thisObj.$buttonSubES.text(thisObj.tt.act_st_es);

                thisObj.$buttonSubPL.attr('aria-checked', 'false');
                thisObj.$buttonSubPL.removeClass('aria-no-checked');
                thisObj.$buttonSubPL.removeClass('subtno');
                thisObj.$buttonSubPL.text(thisObj.tt.act_st_pl);

                thisObj.$buttonSubML.attr('aria-checked', 'false');
                thisObj.$buttonSubML.removeClass('aria-no-checked');
                thisObj.$buttonSubML.removeClass('subtno');
                thisObj.$buttonSubML.text(thisObj.tt.act_st_ml);

                thisObj.control.checkContextVidTranscr();
            }
        }
    };

    showCaptions(now) {

        var c, thisCaption, captionText;
        var cues;
        if (this.ablePlayer.selectedCaptions) {
            cues = this.ablePlayer.selectedCaptions.cues;
        }
        else if (this.ablePlayer.captions.length >= 1) {
            cues = this.ablePlayer.captions[0].cues;
        }
        else {
            cues = [];
        }
        for (c = 0; c < cues.length; c++) {
            if ((cues[c].start <= now) && (cues[c].end > now)) {
                thisCaption = c;
                break;
            }
        }
        if (typeof thisCaption !== 'undefined') {
            if (this.ablePlayer.currentCaption !== thisCaption) {
                // it's time to load the new caption into the container div
                captionText = this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>');
                this.ablePlayer.$captionsDiv.html(captionText);
                this.ablePlayer.currentCaption = thisCaption;
                if (captionText.length === 0) {
                    // hide captionsDiv; otherwise background-color is visible due to padding
                    this.ablePlayer.$captionsDiv.css('display','none');
                }
                else {
                    this.ablePlayer.$captionsDiv.css('display','inline-block');
                }
            }
        }
        else {
            this.ablePlayer.$captionsDiv.html('');
            this.ablePlayer.currentCaption = -1;
        }
    };

    // Takes a cue and returns the caption text to display
    flattenCueForCaption (cue) {
        var result = [];
        var flattenComponent = function (component) {
            var result = [], ii, iq;
            if (component.type === 'string') {
                result.push(component.value);
            }
            else if (component.type === 'v') {
                result.push('(' + component.value + ')');
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
            }
            else if (component.type === 'i') {
                result.push('<em>');
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
                result.push('</em>');
            } else if (component.type === 'c') {
                var classes = "";
                for (iq = 0; iq < component.classes.length; iq++) {
                    if (component.classes[iq] === 'speakerInScreen' || component.classes[iq] === 'noise'
                        || component.classes[iq] === 'music' || component.classes[iq] === 'speakerOutScreen'
                        || component.classes[iq] === 'voiceOff' || component.classes[iq] === 'translateLg') {//auditionPlus
                        //if($('#auditionPlus').attr('aria-pressed') === 'true' ){
                        classes = classes + component.classes[iq] + " ";
                        //}
                    } else {
                        classes = classes + component.classes[iq] + ",";
                    }

                }
                result.push('<span class="' + classes + '">');
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
                result.push('</span>');
            }
            else if (component.type === 'b') {
                result.push('<strong>');
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
                result.push('</strong>');
            }
            else {
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
            }
            return result.join('');
        };

        if (typeof cue.components !== 'undefined') {
            for (var ii = 0; ii < cue.components.children.length; ii++) {
                result.push(flattenComponent(cue.components.children[ii]));
            }
        }
        return result.join('');
    };

    getCaptionsOptions (pref) {

        var options = [];

        switch (pref) {

            case 'prefCaptionsFont':
                options[0] = this.ablePlayer.tt.serif;
                options[1] = this.ablePlayer.tt.sans;
                options[2] = this.ablePlayer.tt.cursive;
                options[3] = this.ablePlayer.tt.fantasy;
                options[4] = this.ablePlayer.tt.monospace;
                break;

            case 'prefCaptionsColor':
            case 'prefCaptionsBGColor':
                options[0] = ['white',this.ablePlayer.tt.white];
                options[1] = ['yellow',this.ablePlayer.tt.yellow];
                options[2] = ['green',this.ablePlayer.tt.green];
                options[3] = ['cyan',this.ablePlayer.tt.cyan];
                options[4] = ['blue',this.ablePlayer.tt.blue];
                options[5] = ['magenta',this.ablePlayer.tt.magenta];
                options[6] = ['red',this.ablePlayer.tt.red];
                options[7] = ['black',this.ablePlayer.tt.black];
                break;

            case 'prefCaptionsSize':
                options[0] = '75%';
                options[1] = '100%';
                options[2] = '125%';
                options[3] = '150%';
                options[4] = '200%';
                break;

            case 'prefCaptionsOpacity':
                options[0] = '0%';
                options[1] = '25%';
                options[2] = '50%';
                options[3] = '75%';
                options[4] = '100%';
                break;

            case 'prefCaptionsStyle':
                options[0] = this.ablePlayer.tt.captionsStylePopOn;
                options[1] = this.ablePlayer.tt.captionsStyleRollUp;
                break;

            case 'prefCaptionsPosition':
                options[0] = 'overlay';
                options[1] = 'below';
                break;

        }
        return options;
    };

    //to delete
    /*translatePrefs (pref, value, outputFormat) {

        // translate current value of pref to a value supported by outputformat
        if (outputFormat == 'youtube') {
            if (pref === 'size') {
                // YouTube font sizes are a range from -1 to 3 (0 = default)
                switch (value) {
                    case '75%':
                        return -1;
                    case '100%':
                        return 0;
                    case '125%':
                        return 1;
                    case '150%':
                        return 2;
                    case '200%':
                        return 3;
                }
            }
        }
        return false;
    }*/

    // this function handles stylizing of the sample caption text in the Prefs dialog
    stylizeCaptions($element, pref) {
        // TODO: consider applying the same user prefs to visible text-based description
        var property, newValue, opacity, lineHeight;

        if (typeof $element !== 'undefined') {
            if (pref == 'prefCaptionsPosition') {
                this.positionCaptions();
            }
            else if (typeof pref !== 'undefined') {
                // just change the one property that user just changed
                if (pref === 'prefCaptionsFont') {
                    property = 'font-family';
                }
                else if (pref === 'prefCaptionsSize') {
                    property = 'font-size';
                }
                else if (pref === 'prefCaptionsColor') {
                    property = 'color';
                }
                else if (pref === 'prefCaptionsBGColor') {
                    property = 'background-color';
                }
                else if (pref === 'prefCaptionsOpacity') {
                    property = 'opacity';
                }
                if (pref === 'prefCaptionsOpacity') {
                    newValue = parseFloat($('#' + this.ablePlayer.mediaId + '_' + pref).val()) / 100.0;
                }
                else {
                    newValue = $('#' + this.ablePlayer.mediaId + '_' + pref).val();
                }
                $element.css(property, newValue);
            }
            else { // no property was specified, update all styles with current saved prefs
                opacity = parseFloat(this.ablePlayer.prefCaptionsOpacity) / 100.0;
                var textShadow = '';
                if (this.ablePlayer.prefShadowType === this.ablePlayer.tt.outHigh) {
                    textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
                } else if (this.ablePlayer.prefShadowType === this.ablePlayer.tt.outEnforce) {
                    textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
                } else if (this.ablePlayer.prefShadowType === this.ablePlayer.tt.outUniform) {
                    textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
                } else if (this.ablePlayer.prefShadowType === this.ablePlayer.tt.outShadow) {
                    textShadow = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
                }
                $element.css({
                    'font-family': this.ablePlayer.prefCaptionsFont,
                    'font-size': this.ablePlayer.prefCaptionsSize,
                    'color': this.ablePlayer.prefCaptionsColor,
                    'background-color': this.ablePlayer.prefCaptionsBGColor,
                    'opacity': opacity,
                    'text-shadow': textShadow
                });
                if ($element === this.ablePlayer.$captionsDiv) {
                    if (typeof this.ablePlayer.$captionsWrapper !== 'undefined') {
                        lineHeight = parseInt(this.ablePlayer.prefCaptionsSize, 10) + 25;
                        this.ablePlayer.$captionsWrapper.css('line-height', lineHeight + '%');
                    }
                }
                if (this.ablePlayer.prefCaptionsPosition === 'below') {
                    // also need to add the background color to the wrapper div
                    if (typeof this.ablePlayer.$captionsWrapper !== 'undefined') {
                        this.ablePlayer.$captionsWrapper.css({
                            'background-color': this.ablePlayer.prefCaptionsBGColor,
                            'opacity': '1'
                        });
                    }
                } else if (this.ablePlayer.prefCaptionsPosition === 'overlay') {
                    // no background color for overlay wrapper, captions are displayed in-line
                    if (typeof this.ablePlayer.$captionsWrapper !== 'undefined') {
                        this.ablePlayer.$captionsWrapper.css({
                            'background-color': 'transparent',
                            'opacity': ''
                        });
                    }
                }
                this.positionCaptions();
            }
        }
    };

    positionCaptions (position) {
        if (typeof position === 'undefined') {
            position = this.ablePlayer.prefCaptionsPosition;
        }
        if (typeof this.ablePlayer.$captionsWrapper !== 'undefined') {

            if (position == 'below') {
                this.ablePlayer.$captionsWrapper.removeClass('able-captions-overlay').addClass('able-captions-below');
                // also need to update in-line styles
                this.ablePlayer.$captionsWrapper.css({
                    'background-color': this.ablePlayer.prefCaptionsBGColor,
                    'opacity': '1'
                });
            }
            else {
                this.ablePlayer.$captionsWrapper.removeClass('able-captions-below').addClass('able-captions-overlay');
                this.ablePlayer.$captionsWrapper.css({
                    'background-color': 'transparent',
                    'opacity': ''
                });
            }
        }
    };

    //to delete
    updateCaptionsMenu (lang) {
        this.ablePlayer.captionsPopup.find('li').attr('aria-checked','false');
        if (typeof lang === 'undefined') {
            // check the last menu item (captions off)
            this.ablePlayer.captionsPopup.find('li').last().attr('aria-checked','true');
        }
        else {
            // check the newly selected lang
            this.ablePlayer.captionsPopup.find('li[lang=' + lang + ']').attr('aria-checked','true');
        }
    };






}