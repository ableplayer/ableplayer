export default class Volume{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    addVolumeSlider($div) {
        var thisObj, volumeSliderId, volumeHelpId, x, y, volumePct;

        thisObj = this;

        // define a few variables
        volumeSliderId = this.ablePlayer.mediaId + '-volume-slider';
        volumeHelpId = this.ablePlayer.mediaId + '-volume-help';
        this.ablePlayer.volumeTrackHeight = 70; // must match CSS height for .able-volume-slider
        this.ablePlayer.volumeHeadHeight = 7; // must match CSS height for .able-volume-head
        this.ablePlayer.volumeTickHeight = this.ablePlayer.volumeTrackHeight / 10;

        this.ablePlayer.$volumeSlider = $('<div>', {
            'id': volumeSliderId,
            'class': 'able-volume-slider',
            'aria-hidden': 'true'
        }).hide();
        this.ablePlayer.$volumeSliderTooltip = $('<div>', {
            'class': 'able-tooltip',
            'role': 'tooltip'
        }).hide();
        this.ablePlayer.$volumeSliderTrack = $('<div>', {
            'class': 'able-volume-track'
        });
        this.ablePlayer.$volumeSliderTrackOn = $('<div>', {
            'class': 'able-volume-track able-volume-track-on'
        });
        this.ablePlayer.$volumeSliderHead = $('<div>', {
            'class': 'able-volume-head',
            'role': 'slider',
            'aria-orientation': 'vertical',
            'aria-label': this.ablePlayer.tt.volumeUpDown,
            'aria-valuemin': 0,
            'aria-valuemax': 10,
            'aria-valuenow': this.ablePlayer.volume,
            'tabindex': -1
        });
        this.ablePlayer.$volumeSliderTrack.append(this.ablePlayer.$volumeSliderTrackOn, this.ablePlayer.$volumeSliderHead);
        this.ablePlayer.$volumeAlert = $('<div>', {
            'class': 'able-offscreen',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        volumePct = parseInt(thisObj.ablePlayer.volume) / 10 * 100;
        this.ablePlayer.$volumeHelp = $('<div>', {
            'id': volumeHelpId,
            'class': 'able-volume-help'
        }).text(volumePct + '%, ' + this.ablePlayer.tt.volumeHelp);
        this.ablePlayer.$volumeButton.attr({
            'aria-describedby': volumeHelpId
        });
        this.ablePlayer.$volumeSlider.append(this.ablePlayer.$volumeSliderTooltip, this.ablePlayer.$volumeSliderTrack, this.ablePlayer.$volumeAlert, this.ablePlayer.$volumeHelp)
        $div.append(this.ablePlayer.$volumeSlider);

        this.refreshVolumeSlider(this.ablePlayer.volume);

        this.ablePlayer.$volumeSlider.on('click', function (event) {
            console.log('Volumeslider clic');
            var y = event.pageY;
            var top = event.pageY - thisObj.ablePlayer.$volumeSliderHead.offset().top;
            // if(top<0){
            //   thisObj.handleVolume('up');
            // } else if(top>0) {
            //   thisObj.handleVolume('down');
            // }
            //thisObj.volumeHeadPositionTop = $(this).offset().top;
            event.preventDefault();
            if (thisObj.isMuted() && thisObj.getVolume() != 0) {
                thisObj.handleMute();
            }
            if (thisObj.ablePlayer.volumeHeadPositionTop == undefined) {
                thisObj.ablePlayer.volumeHeadPositionTop = thisObj.ablePlayer.$volumeSliderHead.offset().top;
            }
            var diff, direction, ticksDiff, newVolume, maxedOut;
            var diff = thisObj.ablePlayer.volumeHeadPositionTop - y;

            if (Math.abs(diff) > thisObj.ablePlayer.volumeTickHeight) {
                if (diff > 0) {
                    direction = 'up';
                } else {
                    direction = 'down';
                }
                if (direction == 'up' && thisObj.ablePlayer.volume == 10) {
                    // can't go any higher

                } else if (direction == 'down' && thisObj.ablePlayer.volume == 0) {
                    // can't go any lower

                } else {
                    ticksDiff = Math.round(Math.abs(diff) / thisObj.ablePlayer.volumeTickHeight);
                    if (direction == 'up') {
                        newVolume = thisObj.ablePlayer.volume + ticksDiff;
                        if (newVolume > 10) {
                            newVolume = 10;
                        }
                    } else { // direction is down
                        newVolume = thisObj.ablePlayer.volume - ticksDiff;
                        if (newVolume < 0) {
                            newVolume = 0;
                        }
                    }
                    thisObj.setVolume(newVolume); // this.volume will be updated after volumechange event fires (event.js)
                    thisObj.refreshVolumeSlider(newVolume);
                    thisObj.refreshVolumeButton(newVolume);
                    thisObj.ablePlayer.volumeHeadPositionTop = y;
                }
            }

        });

        // add event listeners
        this.ablePlayer.$volumeSliderHead.on('mousedown', function (event) {
            console.log('volumeSliderHead mousedown');
            if (thisObj.isMuted() && thisObj.getVolume() != 0) {
                thisObj.handleMute();
            }
            event.preventDefault(); // prevent text selection (implications?)
            thisObj.ablePlayer.draggingVolume = true;
            thisObj.ablePlayer.volumeHeadPositionTop = $(this).offset().top;
        });

        // prevent dragging after mouseup as mouseup not detected over iframe (YouTube)
        this.ablePlayer.$mediaContainer.on('mouseover', function (event) {
            if (thisObj.ablePlayer.player == 'youtube') {
                thisObj.ablePlayer.draggingVolume = false;
            }
        });

        $(document).on('mouseup', function (event) {
            thisObj.ablePlayer.draggingVolume = false;
        });

        $(document).on('mousemove', function (event) {
            if (thisObj.ablePlayer.draggingVolume) {
                x = event.pageX;
                y = event.pageY;
                thisObj.moveVolumeHead(y);
            }
        });

        this.ablePlayer.$volumeSliderHead.on('keydown', function (event) {
            // Left arrow or down arrow
            if (event.which === 37 || event.which === 40) {
                thisObj.handleVolume('down');
            }
            // Right arrow or up arrow
            else if (event.which === 39 || event.which === 38) {
                thisObj.handleVolume('up');
            }
            // Escape key or Enter key
            else if (event.which === 27 || event.which === 13) {
                // close popup
                if (thisObj.ablePlayer.$volumeSlider.is(':visible')) {
                    thisObj.hideVolumePopup();
                } else {
                    thisObj.showVolumePopup();
                }
            } else {
                return;
            }
            event.preventDefault();
        });
    };

    // adjust slider position based on current volume
    refreshVolumeSlider (volume) {
        var volumePct, volumePctText;
        volumePct = (volume/10) * 100;
        volumePctText = volumePct + '%';

        var trackOnHeight, trackOnTop, headTop;
        trackOnHeight = volume * this.ablePlayer.volumeTickHeight;
        trackOnTop = this.ablePlayer.volumeTrackHeight - trackOnHeight;
        headTop = trackOnTop - this.ablePlayer.volumeHeadHeight;

        this.ablePlayer.$volumeSliderTrackOn.css({
            'height': trackOnHeight + 'px',
            'top': trackOnTop + 'px'
        });
        this.ablePlayer.$volumeSliderHead.attr({
            'aria-valuenow': volume,
            'aria-valuetext': volumePctText
        });
        this.ablePlayer.$volumeSliderHead.css({
            'top': headTop + 'px'
        });
        this.ablePlayer.$volumeAlert.text(volumePct + '%');
    };

    refreshVolumeButton (volume) {
        var volumeName, volumePct, volumeLabel, volumeIconClass, volumeImg, newSvgData;
        volumeName = this.getVolumeName(volume);
        volumePct = (volume/10) * 100;
        volumeLabel = this.ablePlayer.tt.volume + ' ' + volumePct + '%';
        if (volumePct == 0) {
            $('#volLine').show();
        } else {
            $('#volLine').hide();
        }

        if (this.ablePlayer.iconType === 'font') {
            volumeIconClass = 'icon-volume-' + volumeName;
            this.ablePlayer.$volumeButton.find('span').first().removeClass().addClass(volumeIconClass);
            this.ablePlayer.$volumeButton.find('span.able-clipped').text(volumeLabel);
        }
        else if (this.ablePlayer.iconType === 'image') {
            volumeImg = this.ablePlayer.imgPath + 'volume-' + volumeName + '.png';
            this.ablePlayer.$volumeButton.find('img').attr('src',volumeImg);
        }
    };

    moveVolumeHead(y) {
        var direction, ticksDiff, newVolume;
        var diff = this.ablePlayer.volumeHeadPositionTop - y;
        if (Math.abs(diff) > this.ablePlayer.volumeTickHeight) {
            if (diff > 0) {
                direction = 'up';
            }
            else {
                direction = 'down';
            }
            if (direction == 'up' && this.ablePlayer.volume == 10) {
                // can't go any higher
                return;
            }
            else if (direction == 'down' && this.ablePlayer.volume == 0) {
                // can't go any lower
                return;
            }
            else {
                ticksDiff = Math.round(Math.abs(diff) / this.ablePlayer.volumeTickHeight);
                if (direction == 'up') {
                    newVolume = this.ablePlayer.volume + ticksDiff;
                    if (newVolume > 10) {
                        newVolume = 10;
                    }
                }
                else { // direction is down
                    newVolume = this.ablePlayer.volume - ticksDiff;
                    if (newVolume < 0) {
                        newVolume = 0;
                    }
                }
                this.setVolume(newVolume); // this.volume will be updated after volumechange event fires (event.js)
                this.refreshVolumeSlider(newVolume);
                this.refreshVolumeButton(newVolume);
                this.ablePlayer.volumeHeadPositionTop = y;
            }
        }
    };

    handleVolume (direction) {
        var volume;

        if (typeof direction === 'undefined') {
            if (this.ablePlayer.$volumeSlider.is(':visible')) {
                this.hideVolumePopup();
            }
            else {
                if (!this.ablePlayer.closingVolume) {
                    this.showVolumePopup();
                }
            }
            return;
        }

        if (direction >= 49 && direction <= 57) {
            volume = direction - 48;
        }
        else {
            volume = this.getVolume();

            if (direction === 'up' && volume < 10) {
                volume += 1;
            }
            else if (direction === 'down' && volume > 0) {
                volume -= 1;
            }
        }

        if (this.isMuted() && volume > 0) {
            this.setMute(false);
        }
        else if (volume === 0) {
            this.setMute(true);
            $('#hide-volume').text('');
            $('#orange-volume').css('display:block');
            $('#orange-volume').text(this.ablePlayer.tt.volume + ' ' + (parseInt(volume) / 10 * 100) + '%');
            $('#orange-volume').css('display:none');
            $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(volume) / 10 * 100) + "%</span>");
            if ((parseInt(volume) / 10 * 100) == 0 && $('#sound-mute').text() == ' ' + this.ablePlayer.tt.unmute) {
                $('#sound-mute').click();
            }
        }
        else {
            this.ablePlayer.signVideo.muted = false;
            this.ablePlayer.media.muted = false;
            $('#hide-volume').text('');
            var audio = new Audio('button-icons/TOASTBEL.mp3');
            audio.volume = parseInt(volume) / 10;
            audio.play();
            $('#orange-volume').css('display:block');
            $('#orange-volume').text(this.ablePlayer.tt.volume + ' ' + (parseInt(volume) / 10 * 100) + '%');
            $('#orange-volume').css('display:none');
            $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(volume) / 10 * 100) + "%</span>");
            if ((parseInt(volume) / 10 * 100) > 0 && $('#sound-mute').text() == ' ' + this.ablePlayer.tt.mute) {
                $('#sound-mute').click();

            }
            this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
            this.refreshVolumeSlider(volume);
            this.refreshVolumeButton(volume);
        }
    };

    handleMute () {
        if (this.isMuted() || (this.ablePlayer.signVideo.muted && this.ablePlayer.media.muted)) {
            this.setMute(false);
        } else {
            this.setMute(true);
        }
    };

    showVolumePopup() {
        this.ablePlayer.closePopups();
        this.ablePlayer.$tooltipDiv.hide();
        this.ablePlayer.$volumeSlider.show().attr('aria-hidden','false');
        this.ablePlayer.$volumeSliderHead.attr('tabindex','0').focus();
    };

    hideVolumePopup () {
        this.ablePlayer.$volumeSlider.hide().attr('aria-hidden','true');
        this.ablePlayer.$volumeSliderHead.attr('tabindex','-1');
        this.ablePlayer.$volumeButton.focus();
    };

    isMuted () {
        if (this.ablePlayer.player === 'html5') {
            return this.ablePlayer.media.muted;
        }
    };

    setMute (mute) {
        if (mute) {
            //console.log("set button on mute");
            // save current volume so it can be restored after unmute
            this.ablePlayer.lastVolume = this.ablePlayer.volume;
            this.ablePlayer.volume = 0;
            $('#sound-mute').attr('aria-pressed', 'false');
            $('#sound-mute').attr('aria-label', this.ablePlayer.tt.mute);
            $('#sound-mute').addClass('aria-no-checked');
            $('#hide-volume').text('');
            $('#orange-volume').css('display:block');
            $('#orange-volume').text(this.ablePlayer.tt.volume + ' ' + (parseInt(this.ablePlayer.volume) / 10 * 100) + '%');
            $('#orange-volume').css('display:none');
            $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(this.ablePlayer.volume) / 10 * 100) + "%</span>");
            $('#sound-mute').text('');
            $('#sound-mute').addClass('vmuteno')
            $('#sound-mute').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span class='spanButton'> " + this.ablePlayer.tt.mute + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        } else { // restore to previous volume
            //console.log("unmute volume and button");
            if (typeof this.ablePlayer.lastVolume !== 'undefined') {
                this.ablePlayer.volume = this.ablePlayer.lastVolume;
                //console.log("last volume = "+this.lastVolume);
                $('#sound-mute').attr('aria-pressed', 'true');
                $('#sound-mute').attr('aria-label', this.ablePlayer.tt.unmute);
                $('#sound-mute').removeClass('aria-no-checked');
                $('#hide-volume').text('');
                $('#orange-volume').css('display:block');
                $('#orange-volume').text(this.ablePlayer.tt.volume + ' ' + (parseInt(this.ablePlayer.volume) / 10 * 100) + '%');
                $('#orange-volume').css('display:none');
                $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(this.ablePlayer.volume) / 10 * 100) + "%</span>");
                $('#sound-mute').text('');
                $('#sound-mute').removeClass('vmuteno')
                $('#sound-mute').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z'</path></svg><span class='spanButton'> " + this.ablePlayer.tt.unmute + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");

            }
        }

        if (this.ablePlayer.player === 'html5') {
            this.ablePlayer.media.muted = mute;
            this.ablePlayer.signVideo.muted = mute;
            this.ablePlayer.signVideo.volume = this.ablePlayer.media.volume;
        }
        this.refreshVolumeSlider(this.ablePlayer.volume);
        this.refreshVolumeButton(this.ablePlayer.volume);
    };

    /**
     * set volume from 1 to 10
     * @param volume
     */
    setVolume (volume) {
        console.log("setVolume to " + volume);
        $('#hide-volume').text('');
        if (this.ablePlayer.media.muted && this.ablePlayer.signVideo.muted) {
            $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + 0 + "%</span>");
            this.refreshVolumeSlider(0);
            this.refreshVolumeButton(0);
        } else {
            $('#hide-volume').append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(volume) / 10 * 100) + "%</span>");

        }
        if (this.ablePlayer.player === 'html5') {
            this.ablePlayer.media.volume = volume / 10;
            if (this.ablePlayer.hasSignLanguage && this.ablePlayer.signVideo) {
                this.ablePlayer.signVideo.volume = this.ablePlayer.media.volume; // always mute
            }
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            this.ablePlayer.jwPlayer.setVolume(volume * 10);
        } else if (this.ablePlayer.player === 'youtube') {
            this.ablePlayer.youTubePlayer.setVolume(volume * 10);
            this.volume = volume;
        }

        this.lastVolume = volume;
    }

    // return volume using common audio control scale 1 to 10
    getVolume (volume) {
        if (this.ablePlayer.player === 'html5') {
            // uses 0 to 1 scale
            return this.ablePlayer.media.volume * 10;
        }
    };

    // returns 'mute','soft','medium', or 'loud' depending on volume level
    getVolumeName (volume) {
        if (volume == 0) {
            return 'mute';
        }
        else if (volume == 10) {
            return 'loud';
        }
        else if (volume < 5) {
            return 'soft';
        }
        else {
            return 'medium';
        }
    };

    //For Orange, add perception
    startAudioContext (mediaElement, number) {
        console.log('startAudioContext for ');
        console.log(mediaElement);
        var AudioContext = window.AudioContext // Default
            || window.webkitAudioContext // Safari and old versions of Chrome
            || false;
        this.ablePlayer.contextAudio[number] = new AudioContext;
        this.ablePlayer.contextAudio[number].suspend();
        //var mediaElement = document.getElementById('player');
        var sourceNode = this.ablePlayer.contextAudio[number].createMediaElementSource(mediaElement);
        // EQ Properties
        //
        var gainDb = -40.0;
        var bandSplit = [360, 3600];

        var hBand = this.ablePlayer.contextAudio[number].createBiquadFilter();
        hBand.type = "lowshelf";
        hBand.frequency.value = bandSplit[0];
        hBand.gain.value = gainDb;

        var hInvert = this.ablePlayer.contextAudio[number].createGain();
        hInvert.gain.value = -1.0;

        var mBand = this.ablePlayer.contextAudio[number].createGain();

        // var buffer = this.contextAudio[number].createBuffer(1, 22050, 44100);
        // console.log(buffer);

        var lBand = this.ablePlayer.contextAudio[number].createBiquadFilter();
        lBand.type = "highshelf";
        lBand.frequency.value = bandSplit[1];
        lBand.gain.value = gainDb;

        var lInvert = this.ablePlayer.contextAudio[number].createGain();
        lInvert.gain.value = -1.0;

        // this.pbRate[number] = this.contextAudio[number].createBuffer(2, this.contextAudio[number].sampleRate * 30, this.contextAudio[number].sampleRate);
        // this.pbRate[number].playbackRate = 1.0;
        // //buffer.connect(this.contextAudio[number].destination);

        // var source = this.contextAudio[number].createBufferSource();
        // // set the buffer in the AudioBufferSourceNode
        // source.buffer = this.pbRate[number];
        // // connect the AudioBufferSourceNode to the
        // // destination so we can hear the sound
        // source.connect(this.contextAudio[number].destination);

        sourceNode.connect(lBand);
        sourceNode.connect(mBand);
        sourceNode.connect(hBand);

        hBand.connect(hInvert);
        lBand.connect(lInvert);

        hInvert.connect(mBand);
        lInvert.connect(mBand);

        this.ablePlayer.lGain[number] = this.ablePlayer.contextAudio[number].createGain();
        this.ablePlayer.mGain[number] = this.ablePlayer.contextAudio[number].createGain();
        this.ablePlayer.hGain[number] = this.ablePlayer.contextAudio[number].createGain();

        lBand.connect(this.ablePlayer.lGain[number]);
        mBand.connect(this.ablePlayer.mGain[number]);
        hBand.connect(this.ablePlayer.hGain[number]);

        var sum = this.ablePlayer.contextAudio[number].createGain();
        this.ablePlayer.lGain[number].connect(sum);
        this.ablePlayer.mGain[number].connect(sum);
        this.ablePlayer.hGain[number].connect(sum);
        sum.connect(this.ablePlayer.contextAudio[number].destination);
    }

    changeGain (string, type, number) {
        this.ablePlayer.contextAudio[number].resume();

        var value = parseFloat(string) / 100.0;

        switch (type) {
            case 'lowGain':
                this.ablePlayer.lGain[number].gain.value = value;
                break;
            case 'midGain':
                this.ablePlayer.mGain[number].gain.value = value;
                break;
            case 'highGain':
                this.ablePlayer.hGain[number].gain.value = value;
                break;
        }
    }

















}