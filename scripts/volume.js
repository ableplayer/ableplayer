(function ($) {

	AblePlayer.prototype.addVolumeSlider = function($div) {

		// Prior to v4.4.64, we were using a custom-build vertical volunme slider 
		// Changed to input type="range" because it's standard and gaining more widespread support 
		// including screen reader support  
		// TODO: Improve presentation of vertical slider. That requires some CSS finesse.  

		var thisObj, volumeSliderId, volumeHelpId, volumePct, tickLabelsId, $tickLabels, i, $tickOption, tickLabel;

		thisObj = this;

		// define a few variables
		volumeSliderId = this.mediaId + '-volume-slider';
		volumeHelpId = this.mediaId + '-volume-help';
		tickLabelsId = this.mediaId + '-volume-tick-labels';

		this.$volumeSlider = $('<div>',{
			'id': volumeSliderId,
			'class': 'able-volume-slider',
			'aria-hidden': 'true'
		}).hide();
		this.$volumeSliderTooltip = $('<div>',{
			'class': 'able-tooltip',
			'role': 'tooltip'
		}).hide();
		this.$volumeRange = $('<input>',{ 
			'type': 'range',
			'min': '0',
			'max': '10',
			'step': '1',
			'orient': 'vertical', // non-standard, but required for Firefox 
			'aria-label': this.tt.volumeUpDown,
			'value': this.volume
			// 'list': tickLabelsId // Uncomment this to use tickLabels (see note below)
		});
		volumePct = parseInt(thisObj.volume) / 10 * 100;
		this.$volumeHelp = $('<div>',{
			'id': volumeHelpId,
			'class': 'able-volume-help',
			'aria-live': 'polite'
		}).text(volumePct + '%');
		this.$volumeButton.attr({
			'aria-describedby': volumeHelpId
		});
		$tickLabels = $('<datalist>',{
			'id': tickLabelsId
		}); 
		for (i = 0; i <= 10; i++) { 
			if (i === 0) { 
				tickLabel = this.tt.mute; 
			}
			else { 
				tickLabel = (i * 10) + '%'; 
			}
			$tickOption = $('<option>',{ 
				'value': i, 
				'label': tickLabel
			})
			$tickLabels.append($tickOption); 
		}		
		this.$volumeSlider.append(this.$volumeSliderTooltip,this.$volumeRange,this.$volumeHelp);
		// To add $tickLabels, use the following line of code to replace the one above 
		// and uncommnet the 'list' property in the definition of this.$volumeRange above 
		// As of Nov 2022, this feature is not supported by any screen reader 
		// this.$volumeSlider.append(this.$volumeSliderTooltip,this.$volumeRange,this.$volumeHelp,$tickLabels);

		$div.append(this.$volumeSlider);

		// add event listeners
		this.$volumeRange.on('change',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});

		this.$volumeRange.on('input',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});
			
		this.$volumeRange.on('keydown',function (e) {

			// Escape key or Enter key or Tab key
			if (e.which === 27 || e.which === 13 || e.which === 9) {
				// close popup
				if (thisObj.$volumeSlider.is(':visible')) {
					thisObj.closingVolume = true; // stopgap
					thisObj.hideVolumePopup();
				}
				else {
					if (!thisObj.closingVolume) {
						thisObj.showVolumePopup();
					}
				}
			}
			else {
				return;
			}
		});
	};

	AblePlayer.prototype.refreshVolumeHelp = function(volume) {

		// make adjustments based on current volume
		var volumePct;
		volumePct = (volume/10) * 100;

		// Update help text 
		if (this.$volumeHelp) { 
			this.$volumeHelp.text(volumePct + '%'); 
		}

		// Update the default value of the volume slider input field 
		// This doesn't seem to be necessary; browsers remember the previous setting during a session 
		// but this is a fallback in case they don't 
		this.$volumeRange.attr('value',volume);   
	};

	AblePlayer.prototype.refreshVolumeButton = function(volume) {

		var volumeName, volumePct, volumeLabel, volumeIconClass, volumeImg, newSvgData;

		volumeName = this.getVolumeName(volume);
		volumePct = (volume/10) * 100;
		volumeLabel = this.tt.volume + ' ' + volumePct + '%';

		if (this.iconType === 'font') {
			volumeIconClass = 'icon-volume-' + volumeName;
			this.$volumeButton.find('span').first().removeClass().addClass(volumeIconClass);
			this.$volumeButton.find('span.able-clipped').text(volumeLabel);
		}
		else if (this.iconType === 'image') {
			volumeImg = this.imgPath + 'volume-' + volumeName + '.png';
			this.$volumeButton.find('img').attr('src',volumeImg);
		}
		else if (this.iconType === 'svg') {
			if (volumeName !== 'mute') {
				volumeName = 'volume-' + volumeName;
			}
			newSvgData = this.getSvgData(volumeName);
			this.$volumeButton.find('svg').attr('viewBox',newSvgData[0]);
			this.$volumeButton.find('path').attr('d',newSvgData[1]);
		}
	};

	AblePlayer.prototype.handleVolumeButtonClick = function() {

		if (this.$volumeSlider.is(':visible')) {
			this.hideVolumePopup();			
		}
		else {
			this.showVolumePopup();
		}
	}; 

	AblePlayer.prototype.handleVolumeKeystroke = function(keycode) {

		// keycode is an ASCII key code 49-57 (numeric keys 1-9), 
		// keyboard shortcuts for changing volume 

		var volume; 

		if (keycode >= 49 && keycode <= 57) {
			volume = keycode - 48;
		}
		else { 
			return false; 
		}

		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		}
		else if (volume === 0) {
			this.setMute(true);
		}
		else {
			this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	}; 


	AblePlayer.prototype.handleVolumeChange = function(volume) {

		// handle volume change using the volume input slider  

		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		}
		else if (volume === 0) {
			this.setMute(true);
		}
		else {
			this.setVolume(volume); // this.volume will be updated after volumechange event fires (event.js)
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	};

	AblePlayer.prototype.handleMute = function() {

		if (this.isMuted()) {
			this.setMute(false);
		}
		else {
			this.setMute(true);
		}
	};

	AblePlayer.prototype.showVolumePopup = function() {

		this.closePopups();
		this.$tooltipDiv.hide();
		this.$volumeSlider.show().attr('aria-hidden','false');
		this.$volumeButton.attr('aria-expanded','true');
		this.$volumeButton.focus(); // for screen reader expanded state to be read
		this.waitThenFocus(this.$volumeRange);
	};

	AblePlayer.prototype.hideVolumePopup = function() {

		var thisObj = this;

		this.$volumeSlider.hide().attr('aria-hidden','true');
		this.$volumeButton.attr('aria-expanded','false').focus();
		// wait a second before resetting stopgap var
		// otherwise the keypress used to close volume popup will trigger the volume button
		setTimeout(function() {
			thisObj.closingVolume = false;
		}, 1000);
	};

	AblePlayer.prototype.isMuted = function () {

		if (this.player === 'html5') {
			return this.media.muted;
		}
		else if (this.player === 'youtube') {
			return this.youTubePlayer.isMuted();
		}
	};

	AblePlayer.prototype.setMute = function(mute) {

		// mute is either true (muting) or false (unmuting)
		if (mute) {
			// save current volume so it can be restored after unmute
			this.lastVolume = this.volume;
			this.volume = 0;
		}
		else { // restore to previous volume
			if (typeof this.lastVolume !== 'undefined') {
				this.volume = this.lastVolume;
			}
		}

		if (this.player === 'html5') {
			this.media.muted = mute;
		}
		else if (this.player === 'youtube') {
			if (mute) {
				this.youTubePlayer.mute();
			}
			else {
				this.youTubePlayer.unMute();
			}
		}
		this.setVolume(this.volume); 
		this.refreshVolumeHelp(this.volume);
		this.refreshVolumeButton(this.volume);
	};

	AblePlayer.prototype.setVolume = function (volume) {

		// volume is 1 to 10
		// convert as needed depending on player

		var newVolume; 

		if (this.player === 'html5') {
			// volume is 0 to 1
			newVolume = volume / 10; 
			this.media.volume = newVolume;
			
			if (this.hasSignLanguage && this.signVideo) {
				this.signVideo.volume = 0; // always mute
			}
		}
		else if (this.player === 'youtube') {
			// volume is 0 to 100
			newVolume = volume * 10; 
			this.youTubePlayer.setVolume(newVolume);
			this.volume = volume;
		}
		else if (this.player === 'vimeo') {
			// volume is 0 to 1
			newVolume = volume / 10; 
			this.vimeoPlayer.setVolume(newVolume).then(function() {
				// setVolume finished.
				// could do something here
				// successful completion also fires a 'volumechange' event (see event.js)
			});
		}
		this.lastVolume = volume;
	};

	AblePlayer.prototype.getVolume = function (volume) {

		// return volume using common audio control scale 1 to 10
		if (this.player === 'html5') {
			// uses 0 to 1 scale
			return this.media.volume * 10;
		}
		else if (this.player === 'youtube') {
			// uses 0 to 100 scale
			if (this.youTubePlayerReady) { 
				return this.youTubePlayer.getVolume() / 10;
			}
		}
		if (this.player === 'vimeo') {
			// uses 0 to 1 scale
			// this.vimeoPlayer.getVolume() takes too long to resolve with a value
			// Just use variable that's already been defined (should be the same value anyway)
			return this.volume;
		}
	};

	AblePlayer.prototype.getVolumeName = function (volume) {

		// returns 'mute','soft','medium', or 'loud' depending on volume level
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

})(jQuery);
