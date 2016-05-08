(function ($) {
  AblePlayer.prototype.updateCaption = function (time) {
    if (!this.usingYouTubeCaptions && (typeof this.$captionWrapper !== 'undefined')) {
      if (this.captionsOn) {
        this.$captionWrapper.show();
        this.showCaptions(time || this.getElapsed());
      }
      else if (this.$captionWrapper) {
        this.$captionWrapper.hide();
        this.prefCaptions = 0;
      }
    }
  };

  // Returns the function used when a caption is clicked in the captions menu.
  // Not called if user clicks "Captions off". Instead, that triggers getCaptionOffFunction()
  AblePlayer.prototype.getCaptionClickFunction = function (track) {
    var thisObj = this;
    return function () {
      thisObj.selectedCaptions = track;
      thisObj.captionLang = track.language;
      thisObj.currentCaption = -1;

      if (thisObj.usingYouTubeCaptions) {
        if (thisObj.captionsOn) {
          if (typeof thisObj.ytCaptionModule !== 'undefined') {
            // captions are already on. Just need to change the language
            thisObj.youTubePlayer.setOption(thisObj.ytCaptionModule, 'track', {'languageCode': thisObj.captionLang});
          }
          else {
            // need to wait for caption module to be loaded to change the language
            // caption module will be loaded after video starts playing, triggered by onApiChange event
            // at that point, thosObj.captionLang will be passed to the module as the default language
          }
        }
        else {
          // captions are off (i.e., captions module has been unloaded; need to reload it)
          // user's selected language will be reset after module has successfully loaded
          // (the onApiChange event will be fired -- see initialize.js > initYouTubePlayer())
          thisObj.resettingYouTubeCaptions = true;
          thisObj.youTubePlayer.loadModule(thisObj.ytCaptionModule);
        }
      }
      else {
        // Try and find a matching description track for rebuilding transcript
        for (var i in thisObj.descriptions) {
          if (thisObj.descriptions[i].language === track.language) {
            thisObj.selectedDescriptions = thisObj.descriptions[i];
            thisObj.currentDescription = -1;
          }
        }
        if (!this.swappingSrc) {
          thisObj.updateCaption();
          thisObj.showDescription(thisObj.getElapsed());
        }
      }
      thisObj.captionsOn = true;
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it (used in handleCaptionToggle())
      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
      // e.g., if user triggered button with Enter or mouse click, not spacebar
      setTimeout(function() {
        thisObj.hidingPopup = false;
      }, 100);
      thisObj.$ccButton.focus();

      // save preference to cookie
      thisObj.prefCaptions = 1;
      thisObj.updateCookie('prefCaptions');

      thisObj.refreshControls();
    }
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      if (thisObj.player == 'youtube') {
        thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
      }
      thisObj.captionsOn = false;
      thisObj.currentCaption = -1;
      // stopgap to prevent spacebar in Firefox from reopening popup
      // immediately after closing it (used in handleCaptionToggle())
      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      // Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
      // e.g., if user triggered button with Enter or mouse click, not spacebar
      setTimeout(function() {
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
  };

  AblePlayer.prototype.showCaptions = function(now) {
    var c, thisCaption, captionText;
    var cues;
    if (this.selectedCaptions) {
      cues = this.selectedCaptions.cues;
    }
    else if (this.captions.length >= 1) {
      cues = this.captions[0].cues;
    }
    else {
      cues = [];
    }
    for (c in cues) {
      if ((cues[c].start <= now) && (cues[c].end > now)) {
        thisCaption = c;
        break;
      }
    }
    if (typeof thisCaption !== 'undefined') {
      if (this.currentCaption !== thisCaption) {
        // it's time to load the new caption into the container div
        captionText = this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>');
        this.$captionDiv.html(captionText);
        this.currentCaption = thisCaption;
        if (captionText.length === 0) {
          // hide captionDiv; otherwise background-color is visible due to padding
          this.$captionDiv.css('display','none');
        }
        else {
          this.$captionDiv.css('display','inline-block');
        }
      }
    }
    else {
      this.$captionDiv.html('');
      this.currentCaption = -1;
    }
  };

  // Takes a cue and returns the caption text to display for it.
  AblePlayer.prototype.flattenCueForCaption = function (cue) {

    var result = [];

    var flattenComponent = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else if (component.type === 'v') {
        result.push('[' + component.value + ']');
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join('');
    }

    for (var ii in cue.components.children) {
      result.push(flattenComponent(cue.components.children[ii]));
    }
    return result.join('');
  };

  AblePlayer.prototype.getCaptionsOptions = function(pref) {

    var options = [];

    switch (pref) {

      case 'prefCaptionsFont':
        options[0] = this.tt.serif;
        options[1] = this.tt.sans;
        options[3] = this.tt.cursive;
        options[4] = this.tt.fantasy;
        options[2] = this.tt.monospace;
        break;

      case 'prefCaptionsColor':
      case 'prefCaptionsBGColor':
        // HTML color values must be in English
        options[0] = ['white',this.tt.white];
        options[1] = ['yellow',this.tt.yellow];
        options[2] = ['green',this.tt.green];
        options[3] = ['cyan',this.tt.cyan];
        options[4] = ['blue',this.tt.blue];
        options[5] = ['magenta',this.tt.magenta];
        options[6] = ['red',this.tt.red];
        options[7] = ['black',this.tt.black];
        break;

      case 'prefCaptionsSize':
        options[0] = '75%';
        options[1] = '100%';
        options[2] = '125%';
        options[3] = '150%';
        options[4] = '200%';
        break;

      case 'prefCaptionsOpacity':
        options[0] = '0% (' + this.tt.transparent + ')';
        options[1] = '25%';
        options[2] = '50%';
        options[3] = '75%';
        options[4] = '100% (' + this.tt.solid + ')';
        break;

      case 'prefCaptionsStyle':
        options[0] = this.tt.captionsStylePopOn;
        options[1] = this.tt.captionsStyleRollUp;
        break;

      case 'prefCaptionsPosition':
        options[0] = 'overlay';
        options[1] = 'below';
        break;

    }
    return options;
  };

  AblePlayer.prototype.translatePrefs = function(pref, value, outputFormat) {

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
  }

  AblePlayer.prototype.stylizeCaptions = function($element, pref) {

    // $element is the jQuery element containing the captions
    // this function handles stylizing of the sample caption text in the Prefs dialog
    // plus the actual production captions
    // TODO: consider applying the same user prefs to visible text-based description
    var property, newValue, opacity;

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
          newValue = parseFloat($('#' + this.mediaId + '_' + pref).val()) / 100.0;
        }
        else {
          newValue = $('#' + this.mediaId + '_' + pref).val();
        }
        $element.css(property, newValue);
      }
      else { // no property was specified, update all styles with current saved prefs
        opacity = parseFloat(this.prefCaptionsOpacity) / 100.0;
        $element.css({
          'font-family': this.prefCaptionsFont,
          'font-size': this.prefCaptionsSize,
          'color': this.prefCaptionsColor,
          'background-color': this.prefCaptionsBGColor,
          'opacity': opacity
        });
        if ($element === this.$captionDiv) {
          this.$captionWrapper.css('line-height',this.prefCaptionsSize);
        }
        if (this.prefCaptionsPosition === 'below') {
          // also need to add the background color to the wrapper div
          this.$captionWrapper.css({
            'background-color': this.prefCaptionsBGColor,
            'opacity': '1'
          });
        }
        else if (this.prefCaptionsPosition === 'overlay') {
          // no background color for overlay wrapper, captions are displayed in-line
          this.$captionWrapper.css({
            'background-color': 'transparent',
            'opacity': ''
          });
        }
        this.positionCaptions();
      }
    }
  };
  AblePlayer.prototype.positionCaptions = function(position) {

    // set caption position to either 'overlay' or 'below'
    // if position parameter was passed to this function, use that
    // otherwise use user preference
    if (typeof position === 'undefined') {
      position = this.prefCaptionsPosition;
    }
    if (typeof this.$captionWrapper !== 'undefined') {

      if (position == 'below') {
        this.$captionWrapper.removeClass('able-captions-overlay').addClass('able-captions-below');
        // also need to update in-line styles
        this.$captionWrapper.css({
          'background-color': this.prefCaptionsBGColor,
          'opacity': '1'
        });
      }
      else {
        this.$captionWrapper.removeClass('able-captions-below').addClass('able-captions-overlay');
        this.$captionWrapper.css({
          'background-color': 'transparent',
          'opacity': ''
        });
      }
    }
  };

})(jQuery);
