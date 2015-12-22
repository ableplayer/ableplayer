(function ($) {
  
  AblePlayer.prototype.injectPlayerCode = function() { 
    // create and inject surrounding HTML structure 
    // If IOS: 
    //  If video: 
    //   IOS does not support any of the player's functionality 
    //   - everything plays in its own player 
    //   Therefore, AblePlayer is not loaded & all functionality is disabled 
    //   (this all determined. If this is IOS && video, this function is never called) 
    //  If audio: 
    //   HTML cannot be injected as a *parent* of the <audio> element 
    //   It is therefore injected *after* the <audio> element 
    //   This is only a problem in IOS 6 and earlier, 
    //   & is a known bug, fixed in IOS 7      
    
    var thisObj = this;

    // create $mediaContainer and $ableDiv and wrap them around the media element
    this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();        
    this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
    // width and height of this.$mediaContainer are not updated when switching to full screen 
    // However, I don't think they're needed at all. Commented out on 4/12/15, but 
    // preserved here just in case there are unanticipated problems... 
    /*    
    this.$mediaContainer.width(this.playerWidth);
    if (this.mediaType == 'video') {     
      this.$mediaContainer.height(this.playerHeight);
    }
    */
    this.$ableDiv.width(this.playerWidth);
    
    this.injectOffscreenHeading();
    
    // youtube adds its own big play button
    // if (this.mediaType === 'video' && this.player !== 'youtube') {
    if (this.mediaType === 'video') { 
      if (this.player !== 'youtube') {      
        this.injectBigPlayButton();
      }

      // add container that captions or description will be appended to
      // Note: new Jquery object must be assigned _after_ wrap, hence the temp vidcapContainer variable  
      var vidcapContainer = $('<div>',{ 
        'class' : 'able-vidcap-container'
      });
      this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();
    }
    
    this.injectPlayerControlArea();
    this.injectTextDescriptionArea();

    if (this.includeTranscript) {
      this.injectTranscriptArea();
      this.addTranscriptAreaEvents();
    }    

    this.injectAlert();
    this.injectPlaylist();
    // create the hidden form that will be triggered by a click on the Preferences button
    this.injectPrefsForm();        

  };

  AblePlayer.prototype.injectOffscreenHeading = function () {
    // Add offscreen heading to the media container.
    // To fine the nearest heading in the ancestor tree, 
    // loop over each parent of $ableDiv until a heading is found 
    // If multiple headings are found beneath a given parent, get the closest
    // The heading injected in $ableDiv is one level deeper than the closest heading 
    var headingType; 
    
    var $parents = this.$ableDiv.parents();
    $parents.each(function(){
      var $this = $(this); 
      var $thisHeadings = $this.find('h1, h2, h3, h4, h5, h6'); 
      var numHeadings = $thisHeadings.length;
      if(numHeadings){
        headingType = $thisHeadings.eq(numHeadings-1).prop('tagName');
        return false;
      }
    });
    if (typeof headingType === 'undefined') { 
      var headingType = 'h1';
    }
    else { 
      // Increment closest heading by one if less than 6.
      var headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
      headingType = 'h' + headingNumber.toString();
    }
    this.playerHeadingLevel = headingNumber;
    this.$headingDiv = $('<' + headingType + '>'); 
    this.$ableDiv.prepend(this.$headingDiv);
    this.$headingDiv.addClass('able-offscreen');
    this.$headingDiv.text(this.tt.playerHeading); 
    
  };

  AblePlayer.prototype.injectBigPlayButton = function () {
    this.$bigPlayButton = $('<button>', {
      'class': 'able-big-play-button icon-play',
      'aria-hidden': true,
      'tabindex': -1
    });

    var thisObj = this;
    this.$bigPlayButton.click(function () {
      thisObj.handlePlay();
    });

    this.$mediaContainer.prepend(this.$bigPlayButton);
  };

  AblePlayer.prototype.injectPlayerControlArea = function () {
    this.$playerDiv = $('<div>', {
      'class' : 'able-player',
      'role' : 'region',
      'aria-label' : this.mediaType + ' player'
    });
    this.$playerDiv.addClass('able-'+this.mediaType);

    // The default skin depends a bit on a Now Playing div 
    // so go ahead and add one 
    // However, it's only populated if this.showNowPlaying = true 
    this.$nowPlayingDiv = $('<div>',{
      'class' : 'able-now-playing',
      'role' : 'alert'
    });
    
    this.$controllerDiv = $('<div>',{
      'class' : 'able-controller'
    });
    this.$controllerDiv.addClass('able-' + this.iconColor + '-controls');    

    this.$statusBarDiv = $('<div>',{
      'class' : 'able-status-bar'
    });
    this.$timer = $('<span>',{
      'class' : 'able-timer'
    });
    this.$elapsedTimeContainer = $('<span>',{
      'class': 'able-elapsedTime',
      text: '0:00'
    });
    this.$durationContainer = $('<span>',{
      'class': 'able-duration'
    }); 
    this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);       

    this.$speed = $('<span>',{
      'class' : 'able-speed',
      'role' : 'alert'
    }).text(this.tt.speed + ': 1x'); 
    
    this.$status = $('<span>',{
      'class' : 'able-status',
      'role' : 'alert'
    });

    // Put everything together.
    this.$statusBarDiv.append(this.$timer, this.$speed, this.$status);
    this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
    this.$ableDiv.append(this.$playerDiv);
  };

  AblePlayer.prototype.injectTextDescriptionArea = function () {
    // create a div for exposing description
    // description will be exposed via role="alert" & announced by screen readers  
    this.$descDiv = $('<div>',{
      'class': 'able-descriptions',
      'role': 'alert'
    });
    // Start off with description hidden.
    this.$descDiv.hide();
    // TODO: Does this need to be changed when preference is changed?
    if (this.prefClosedDesc === 0 || this.prefVisibleDesc === 0) { 
      this.$descDiv.addClass('able-clipped');                
    }

    this.$ableDiv.append(this.$descDiv);
  };

  AblePlayer.prototype.injectTranscriptArea = function() {
    this.$transcriptArea = $('<div>', {
      'class': 'able-transcript-area'
    });
    
    this.$transcriptToolbar = $('<div>', {
      'class': 'able-transcript-toolbar'
    });
    
    this.$transcriptDiv = $('<div>', {
      'class' : 'able-transcript'
    });
    
    // Transcript toolbar content:
    this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
    this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);
    this.$transcriptLanguageSelect = $('<select id="transcript-language-select">');
    // Add a default "Unknown" option; this will be deleted later if there are any
    // elements with a language.
    this.$unknownTranscriptOption = $('<option val="unknown">' + this.tt.unknown + '</option>');
    this.$transcriptLanguageSelect.append(this.$unknownTranscriptOption);
    this.$transcriptLanguageSelect.prop('disabled', true);

    var floatRight = $('<div style="float: right;">');
    this.$transcriptLanguageSelectContainer = floatRight;
    
    floatRight.append($('<label for="transcript-language-select">' + this.tt.language + ': </label>'), this.$transcriptLanguageSelect);
    this.$transcriptToolbar.append(floatRight);
    
    this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

    // If client has provided separate transcript location, put it there instead.
    if (this.transcriptDivLocation) {
      $('#' + this.transcriptDivLocation).append(this.$transcriptArea);
    }
    else if (this.$ableColumnRight) {
      this.$ableColumnRight.prepend(this.$transcriptArea);
    }
    else {
      this.splitPlayerIntoColumns('transcript');
    }
        
    // If client has provided separate transcript location, override user's preference for hiding transcript
    if (!this.prefTranscript && !this.transcriptDivLocation) { 
      this.$transcriptArea.hide(); 
    }
  };

  AblePlayer.prototype.splitPlayerIntoColumns = function (feature) { 
    // feature is either 'transcript' or 'sign' 
    // if present, player is split into two column, with this feature in the right column
    this.$ableColumnLeft = this.$ableDiv.wrap('<div class="able-column-left">').parent();
    this.$ableColumnLeft.width(this.playerWidth);
    if (feature === 'transcript') {
      this.$transcriptArea.insertAfter(this.$ableColumnLeft);
      this.$ableColumnRight = this.$transcriptArea.wrap('<div class="able-column-right">').parent();
    }
    else if (feature == 'sign') { 
      this.$signArea.insertAfter(this.$ableColumnLeft);
      this.$ableColumnRight = this.$signArea.wrap('<div class="able-column-right">').parent();      
    }
    this.$ableColumnRight.width(this.playerWidth);
  };
  
  AblePlayer.prototype.injectAlert = function () {
    this.alertBox = $('<div role="alert"></div>');
    this.alertBox.addClass('able-alert');
    this.alertBox.appendTo(this.$ableDiv);
    this.alertBox.css({
      top: this.$mediaContainer.offset().top
    });

  };

  AblePlayer.prototype.injectPlaylist = function () {
    if (this.playlistEmbed === true) { 
      // move playlist into player, immediately before statusBarDiv
      var playlistClone = this.$playlistDom.clone();
      playlistClone.insertBefore(this.$statusBarDiv);          
      // Update to the new playlist copy.
      this.$playlist = playlistClone.find('li');
    }

    if (this.hasPlaylist && this.$sources.length === 0) { 
      // no source elements were provided. Construct them from the first playlist item
      this.initializing = true;
      this.swapSource(0);       
      // redefine this.$sources now that media contains one or more <source> elements
      this.$sources = this.$media.find('source');       
      if (this.debug) { 
        console.log('after initializing playlist, there are ' + this.$sources.length + ' media sources');
      }
    } 

  };
  
  AblePlayer.prototype.addTranscriptAreaEvents = function() {
    var thisObj = this;

    this.$autoScrollTranscriptCheckbox.click(function () {
      thisObj.handleTranscriptLockToggle(thisObj.$autoScrollTranscriptCheckbox.prop('checked'));
    });

    this.$transcriptDiv.bind('mousewheel DOMMouseScroll click scroll', function (event) {
      // Propagation is stopped in seekpoint click handler, so clicks are on the scrollbar
      // or outside of a seekpoint.
      if (!thisObj.scrollingTranscript) {
        thisObj.autoScrollTranscript = false;
        thisObj.refreshControls();
      }
      thisObj.scrollingTranscript = false;
    });

    this.$transcriptLanguageSelect.change(function () { 
      var language = thisObj.$transcriptLanguageSelect.val();
      for (var ii in thisObj.captions) {
        if (thisObj.captions[ii].language === language) {
          thisObj.transcriptCaptions = thisObj.captions[ii];
        }
      }
      for (var ii in thisObj.descriptions) {
        if (thisObj.descriptions[ii].language === language) {
          thisObj.transcriptDescriptions = thisObj.descriptions[ii];
        }
      }
      thisObj.updateTranscript();
    });
  };

  // Create popup div and append to player 
  // 'which' parameter is either 'captions', 'chapters', or 'X-window' (e.g., "sign-window")
  AblePlayer.prototype.createPopup = function (which) {
    
    var thisObj, $popup, $thisButton, $thisListItem, $prevButton, $nextButton, 
        selectedTrackIndex, selectedTrack;
    thisObj = this;
    $popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup' 
    });

    $popup.on('keydown',function (e) {
      $thisButton = $(this).find('input:focus');
      $thisListItem = $thisButton.parent();
      if ($thisListItem.is(':first-child')) {         
        // this is the first button
        $prevButton = $(this).find('input').last(); // wrap to bottom
        $nextButton = $thisListItem.next().find('input');
      }  
      else if ($thisListItem.is(':last-child')) { 
        // this is the last button 
        $prevButton = $thisListItem.prev().find('input'); 
        $nextButton = $(this).find('input').first(); // wrap to top         
      }
      else { 
        $prevButton = $thisListItem.prev().find('input'); 
        $nextButton = $thisListItem.next().find('input');        
      }
      if (e.which === 9) { // Tab
        if (e.shiftKey) { 
          $thisListItem.removeClass('able-focus');
          $prevButton.focus();          
          $prevButton.parent().addClass('able-focus');
        }
        else { 
          $thisListItem.removeClass('able-focus');
          $nextButton.focus();
          $nextButton.parent().addClass('able-focus');          
        }
      }
      else if (e.which === 40 || e.which === 39) { // down or right arrow
        $thisListItem.removeClass('able-focus');
        $nextButton.focus();
        $nextButton.parent().addClass('able-focus');        
      }
      else if (e.which == 38 || e.which === 37) { // up or left arrow
        $thisListItem.removeClass('able-focus');
        $prevButton.focus();
        $prevButton.parent().addClass('able-focus');        
      }
      else if (e.which === 32 || e.which === 13) { // space or enter
        $('input:focus').click();        
      }
      else if (e.which === 27) {  // Escape 
        $thisListItem.removeClass('able-focus');        
        thisObj.closePopups();
      }
      e.preventDefault();
    });
    this.$controllerDiv.append($popup);
    return $popup;
  };

  AblePlayer.prototype.closePopups = function () {
    if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
      this.chaptersPopup.hide();
      this.$chaptersButton.focus();
    }
    if (this.captionsPopup && this.captionsPopup.is(':visible')) {
      this.captionsPopup.hide();
      this.$ccButton.focus();
    }
    if (this.$windowPopup && this.$windowPopup.is(':visible')) {
      this.$windowPopup.hide();
      this.$windowButton.show().focus();
    }    
  };

  // Create and fill in the popup menu forms for various controls.
  AblePlayer.prototype.setupPopups = function () {
    
    var popups, thisObj, hasDefault, i, j, tracks, trackList, trackItem, track,  
        radioName, radioId, trackButton, trackLabel; 
    
    popups = [];     
    
    if (typeof this.ytCaptions !== 'undefined') { 
      // special call to this function for setting up a YouTube caption popup
      if (this.ytCaptions.length) { 
        popups.push('ytCaptions');
      }
      else { 
        return false;
      }
    }
    else { 
      if (this.captions.length > 0) { 
        popups.push('captions');
      }            
      if (this.chapters.length > 0) { 
        popups.push('chapters');
      }
    }
    if (popups.length > 0) { 
      thisObj = this;
      for (var i=0; i<popups.length; i++) {         
        var popup = popups[i];              
        hasDefault = false;
        if (popup == 'captions') {
          this.captionsPopup = this.createPopup('captions');
          tracks = this.captions;           
        }
        else if (popup == 'chapters') { 
          this.chaptersPopup = this.createPopup('chapters');
          tracks = this.chapters; 
        }
        else if (popup == 'ytCaptions') { 
          this.captionsPopup = this.createPopup('captions');
          tracks = this.ytCaptions;
        }
        var trackList = $('<ul></ul>');
        radioName = this.mediaId + '-' + popup + '-choice';
        for (j in tracks) {
          trackItem = $('<li></li>');
          track = tracks[j];          
          radioId = this.mediaId + '-' + popup + '-' + j;
          trackButton = $('<input>',{ 
            'type': 'radio',
            'val': j,
            'name': radioName,
            'id': radioId
          });
          if (track.def) { 
            trackButton.attr('checked','checked');            
            hasDefault = true;
          }          
          trackLabel = $('<label>',{ 
            'for': radioId
          });
          if (track.language !== 'undefined') { 
            trackButton.attr('lang',track.language);
          }
          if (popup == 'captions' || popup == 'ytCaptions') { 
            trackLabel.text(track.label || track.language);          
            trackButton.click(this.getCaptionClickFunction(track));
          }
          else if (popup == 'chapters') { 
            trackLabel.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
            var getClickFunction = function (time) {
              return function () {
                thisObj.seekTo(time);
                // stopgap to prevent spacebar in Firefox from reopening popup
                // immediately after closing it (used in handleChapters())
                thisObj.hidingPopup = true; 
                thisObj.chaptersPopup.hide();
                // Ensure stopgap gets cancelled if handleChapters() isn't called 
                // e.g., if user triggered button with Enter or mouse click, not spacebar 
                setTimeout(function() { 
                  thisObj.hidingPopup = false;
                }, 100);
                thisObj.$chaptersButton.focus();
              }
            }
            trackButton.on('click keypress',getClickFunction(track.start));
          }
          trackItem.append(trackButton,trackLabel);
          trackList.append(trackItem);      
        }
        if (popup == 'captions' || popup == 'ytCaptions') { 
          // add a captions off button 
          radioId = this.mediaId + '-captions-off'; 
          trackItem = $('<li></li>');
          trackButton = $('<input>',{ 
            'type': 'radio',
            'name': radioName,
            'id': radioId
          });
          trackLabel = $('<label>',{ 
            'for': radioId
          });
          trackLabel.text(this.tt.captionsOff);    
          if (this.prefCaptions === 0) { 
            trackButton.attr('checked','checked');
          }
          trackButton.click(this.getCaptionOffFunction());
          trackItem.append(trackButton,trackLabel);
          trackList.append(trackItem);          
        }
        if (!hasDefault) { 
          // check the first button 
          trackList.find('input').first().attr('checked','checked');          
        }
        if (popup == 'captions' || popup == 'ytCaptions') {
          this.captionsPopup.append(trackList);
        }
        else if (popup == 'chapters') { 
          this.chaptersPopup.append(trackList);
        }
      }
    }    
  };

  AblePlayer.prototype.provideFallback = function(reason) {             
    // provide ultimate fallback for users who are unable to play the media
    // reason is either 'No Support' or a specific error message     

    var fallback, fallbackText, fallbackContainer, showBrowserList, browsers, i, b, browserList, poster, posterImg;
    
    // use fallback content that's nested inside the HTML5 media element, if there is any
    // any content other than div, p, and ul is rejected 

    fallback = this.$media.find('div,p,ul');
    showBrowserList = false;

    if (fallback.length === 0) {       
      if (reason !== 'No Support' && typeof reason !== 'undefined') { 
        fallback = $('<p>').text(reason); 
      }
      else {
        fallbackText =  this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
        fallbackText += this.tt.fallbackError2 + ':';
        fallback = $('<p>').text(fallbackText);
        showBrowserList = true;         
      }  
    }
    fallbackContainer = $('<div>',{
      'class' : 'able-fallback',
      'role' : 'alert',
      'width' : this.playerWidth
    });
    this.$media.before(fallbackContainer);     
    fallbackContainer.html(fallback);  
    if (showBrowserList) { 
      browserList = $('<ul>');
      browsers = this.getSupportingBrowsers();
      for (i=0; i<browsers.length; i++) { 
        b = $('<li>');
        b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
        browserList.append(b);
      }
      fallbackContainer.append(browserList);      
    }
    
    // if there's a poster, show that as well 
    if (this.$media.attr('poster')) { 
      poster = this.$media.attr('poster'); 
      var posterImg = $('<img>',{
        'src' : poster,
        'alt' : "",
        'role': "presentation"
      });
      fallbackContainer.append(posterImg);      
    }
    
    // now remove the media element. 
    // It doesn't work anyway 
    this.$media.remove();     
  };
  
  AblePlayer.prototype.getSupportingBrowsers = function() { 
    
    var browsers = []; 
    browsers[0] = { 
      name:'Chrome', 
      minVersion: '31'
    };
    browsers[1] = { 
      name:'Firefox', 
      minVersion: '34'
    };
    browsers[2] = { 
      name:'Internet Explorer', 
      minVersion: '10'
    };
    browsers[3] = { 
      name:'Opera', 
      minVersion: '26'
    };
    browsers[4] = { 
      name:'Safari for Mac OS X', 
      minVersion: '7.1'
    };
    browsers[5] = { 
      name:'Safari for iOS', 
      minVersion: '7.1'
    };
    browsers[6] = { 
      name:'Android Browser', 
      minVersion: '4.1'
    };    
    browsers[7] = { 
      name:'Chrome for Android', 
      minVersion: '40' 
    };
    return browsers;
  }

  AblePlayer.prototype.addHelp = function() {   
    // create help text that will be displayed in a modal dialog 
    // if user clicks the Help button   
  
    var $helpDiv, $helpTextWrapper, $helpIntro, $helpDisclaimer, helpText, i, label, key, $okButton; 
  
    // outer container, will be assigned role="dialog"  
    $helpDiv = $('<div></div>',{ 
      'class': 'able-help-div'
    });
    
    // inner container for all text, will be assigned to modal div's aria-describedby 
    $helpTextWrapper = $('<div></div>');
    $helpIntro = $('<p></p>').text(this.tt.helpKeys);    
    $helpDisclaimer = $('<p></p>').text(this.tt.helpKeysDisclaimer);
    helpText = '<ul>\n';
    for (i=0; i<this.controls.length; i++) { 
      if (this.controls[i] === 'play') { 
        label = this.tt.play + '/' + this.tt.pause;
        key = 'p</span> <em>' + this.tt.or + '</em> <span class="able-help-modifiers"> ' + this.tt.spacebar;
      }
      else if (this.controls[i] === 'stop') { 
        label = this.tt.stop;
        key = 's';
      }
      else if (this.controls[i] === 'rewind') { 
        label = this.tt.rewind;
        key = 'r';
      }
      else if (this.controls[i] === 'forward') { 
        label = this.tt.forward;
        key = 'f';
      }
      else if (this.controls[i] === 'mute') { 
        label = this.tt.mute;
        key = 'm';
      }
      else if (this.controls[i] === 'volume-up') { 
        label = this.tt.volumeUp;
        key = 'u</span> <em>' + this.tt.or + '</em> <span class="able-help-modifiers">1-5';
      }
      else if (this.controls[i] === 'volume-down') { 
        label = this.tt.volumeDown;
        key = 'd</span> <em>' + this.tt.or + '</em> <span class="able-help-modifiers">1-5';
      }
      else if (this.controls[i] === 'captions') { 
        if (this.captions.length > 1) { 
          // caption button launches a Captions popup menu
          label = this.tt.captions;
        }        
        else { 
          // there is only one caption track
          // therefore caption button is a toggle
          if (this.captionsOn) { 
            label = this.tt.hideCaptions;
          }
          else { 
            label = this.tt.showCaptions;
          }
        }
        key = 'c';
      }
      else if (this.controls[i] === 'descriptions') { 
        if (this.descOn) {     
          label = this.tt.turnOffDescriptions;
        }
        else { 
          label = this.tt.turnOnDescriptions;
        }
        key = 'n';
      }
      else if (this.controls[i] === 'prefs') { 
        label = this.tt.preferences;
        key = 't';
      }
      else if (this.controls[i] === 'help') { 
        label = this.tt.help;
        key = 'h';
      }
      else { 
        label = false;
      }
      if (label) { 
        helpText += '<li><span class="able-help-modifiers">'; 
        if (this.prefAltKey === 1) { 
          helpText += this.tt.prefAltKey + ' + ';
        }
        if (this.prefCtrlKey === 1) { 
          helpText += this.tt.prefCtrlKey + ' + ';
        }
        if (this.prefShiftKey === 1) {
          helpText += this.tt.prefShiftKey + ' + ';
        }
        helpText += key + '</span> = ' + label + '</li>\n';
      }
    }
    helpText += '</ul>\n';
    
    // Now assemble all the parts   
    $helpTextWrapper.append($helpIntro, helpText, $helpDisclaimer);
    $helpDiv.append($helpTextWrapper);
    
    // must be appended to the BODY! 
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog, 
    // which will render the dialog unreadable by screen readers 
    $('body').append($helpDiv);

    // Tip from Billy Gregory at AHG2014: 
    // If dialog does not collect information, use role="alertdialog" 
    var dialog = new AccessibleDialog($helpDiv, 'alertdialog', this.tt.helpTitle, $helpTextWrapper, this.tt.closeButtonLabel, '40em');

    $helpDiv.append('<hr>');
    $okButton = $('<button>' + this.tt.ok + '</button>');
    $okButton.click(function () {
      dialog.hide();
    });

    $helpDiv.append($okButton);
    this.helpDialog = dialog;
  };

  // Calculates the layout for controls based on media and options.
  // Returns an object with keys 'ul', 'ur', 'bl', 'br' for upper-left, etc.
  // Each associated value is array of control names to put at that location.
  AblePlayer.prototype.calculateControlLayout = function () {
    // Removed rewind/forward in favor of seek bar.
    var controlLayout = {
      'ul': ['play','stop'],
      'ur': [],
      'bl': [],
      'br': []
    }
        
    if (this.useSlider) {
      controlLayout['ur'].push('rewind');
      controlLayout['ur'].push('seek');
      controlLayout['ur'].push('forward');
    }
    
    // Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
    var bll = [];
    // test for browser support for volume before displaying volume-related buttons 
    if (this.browserSupportsVolume()) { 
      bll.push('mute');
      bll.push('volume-up');
      bll.push('volume-down');
    }

    var blr = [];
    if (this.mediaType === 'video') { 
      if (this.hasCaptions) {
        blr.push('captions'); //closed captions
      }
      if (this.hasSignLanguage) { 
        blr.push('sign'); // sign language
      }
      if (this.hasOpenDesc || this.hasClosedDesc) { 
        blr.push('descriptions'); //audio description 
      }
    }

    if (this.includeTranscript && this.useTranscriptButton) {
      blr.push('transcript');
    }

    if (this.isPlaybackRateSupported()) {
      blr.push('slower'); 
      blr.push('faster');
    }

    if (this.mediaType === 'video' && this.hasChapters) {
      blr.push('chapters');
    }


    // Include the pipe only if we need to.
    if (bll.length > 0 && blr.length > 0) {
      controlLayout['bl'] = bll;
      controlLayout['bl'].push('pipe');
      controlLayout['bl'] = controlLayout['bl'].concat(blr);
    }
    else {
      controlLayout['bl'] = bll.concat(blr);
    }
        
    controlLayout['br'].push('preferences');
    controlLayout['br'].push('help');

    // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
    if (this.mediaType === 'video' && this.player !== 'jw') {
      controlLayout['br'].push('fullscreen');
    }

    return controlLayout;
  };

  AblePlayer.prototype.addControls = function() {   
    
    // determine which controls to show based on several factors: 
    // mediaType (audio vs video) 
    // availability of tracks (e.g., for closed captions & audio description) 
    // browser support (e.g., for sliders and speedButtons) 
    // user preferences (???)      
    // some controls are aligned on the left, and others on the right 
  
    var useSpeedButtons, useFullScreen, 
    i, j, controls, controllerSpan, tooltipId, tooltipDiv, tooltipX, tooltipY, control, 
    buttonImg, buttonImgSrc, buttonTitle, newButton, iconClass, buttonIcon,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle, 
    controllerStyles, vidcapStyles, captionLabel;  
    
    var thisObj = this;
    
    var baseSliderWidth = 100;

    // Initializes the layout into the this.controlLayout variable.
    var controlLayout = this.calculateControlLayout();
    
    var sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};

    // add an empty div to serve as a tooltip
    tooltipId = this.mediaId + '-tooltip';
    tooltipDiv = $('<div>',{
      'id': tooltipId,
      'class': 'able-tooltip' 
    });
    this.$controllerDiv.append(tooltipDiv);
    
    // step separately through left and right controls
    for (i = 0; i <= 3; i++) {
      controls = controlLayout[sectionByOrder[i]];
      if ((i % 2) === 0) {        
        controllerSpan = $('<span>',{
          'class': 'able-left-controls'
        });
      }
      else { 
        controllerSpan = $('<span>',{
          'class': 'able-right-controls'
        });
      }
      this.$controllerDiv.append(controllerSpan);
      
      for (j=0; j<controls.length; j++) { 
        control = controls[j];
        if (control === 'seek') { 
          var sliderDiv = $('<div class="able-seekbar"></div>');
          controllerSpan.append(sliderDiv);
          
          this.seekBar = new AccessibleSeekBar(sliderDiv, baseSliderWidth);
        }
        else if (control === 'pipe') {
          // TODO: Unify this with buttons somehow to avoid code duplication
          var pipe = $('<span>', {
            'tabindex': '-1',
            'aria-hidden': 'true'
          });
          if (this.iconType === 'font') {
            pipe.addClass('icon-pipe');
          }
          else {
            var pipeImg = $('<img>', {
              src: '../images/' + this.iconColor + '/pipe.png',
              alt: '',
              role: 'presentation'
            });
            pipe.append(pipeImg);
          }
          controllerSpan.append(pipe);
        }
        else {        
          // this control is a button 
          if (control === 'mute') { 
            buttonImgSrc = '../images/' + this.iconColor + '/volume-mute.png';
          }
          else if (control === 'fullscreen') { 
            buttonImgSrc = '../images/' + this.iconColor + '/fullscreen-expand.png';            
          }
          else { 
            buttonImgSrc = '../images/' + this.iconColor + '/' + control + '.png';
          }
          buttonTitle = this.getButtonTitle(control); 

          // icomoon documentation recommends the following markup for screen readers: 
          // 1. link element (or in our case, button). Nested inside this element: 
          // 2. span that contains the icon font (in our case, buttonIcon)
          // 3. span that contains a visually hidden label for screen readers (buttonLabel)
          // In addition, we are adding aria-label to the button (but not title) 
          // And if iconType === 'image', we are replacing #2 with an image (with alt="" and role="presentation")
          // This has been thoroughly tested and works well in all screen reader/browser combinations 
          // See https://github.com/ableplayer/ableplayer/issues/81

          newButton = $('<button>',{ 
            'type': 'button',
            'tabindex': '0',
            'aria-label': buttonTitle,
            'class': 'able-button-handler-' + control
          });        
          if (this.iconType === 'font') {
            iconClass = 'icon-' + control; 
            buttonIcon = $('<span>',{ 
              'class': iconClass,
              'aria-hidden': 'true'
            })               
            newButton.append(buttonIcon);
          }
          else { 
            // use images
            buttonImg = $('<img>',{ 
              'src': buttonImgSrc,
              'alt': '',
              'role': 'presentation'
            });
            newButton.append(buttonImg);
          }
          // add the visibly-hidden label for screen readers that don't support aria-label on the button
          var buttonLabel = $('<span>',{
            'class': 'able-clipped'
          }).text(buttonTitle);
          newButton.append(buttonLabel);
          // add an event listener that displays a tooltip on mouseenter or focus 
          newButton.on('mouseenter focus',function(event) { 
            var label = $(this).attr('aria-label');
            // get position of this button 
            var position = $(this).position(); 
            var buttonHeight = $(this).height();
            var buttonWidth = $(this).width();
            var tooltipY = position.top - buttonHeight - 15;
            var centerTooltip = true; 
            if ($(this).closest('span').hasClass('able-right-controls')) { 
              // this control is on the right side 
              if ($(this).is(':last-child')) { 
                // this is the last control on the right 
                // position tooltip using the "right" property 
                centerTooltip = false;
                // var tooltipX = thisObj.playerWidth - position.left - buttonWidth;
                var tooltipX = 0; 
                var tooltipStyle = { 
                  left: '',
                  right: tooltipX + 'px',
                  top: tooltipY + 'px'
                };
              }
            }
            else { 
              // this control is on the left side
              if ($(this).is(':first-child')) { 
                // this is the first control on the left
                centerTooltip = false;
                var tooltipX = position.left;
                var tooltipStyle = { 
                  left: tooltipX + 'px',
                  right: '',
                  top: tooltipY + 'px'
                };                
              }
            }
            if (centerTooltip) { 
              // populate tooltip, then calculate its width before showing it 
              var tooltipWidth = $('#' + tooltipId).text(label).width();
              // center the tooltip horizontally over the button
              var tooltipX = position.left - tooltipWidth/2;
              var tooltipStyle = { 
                left: tooltipX + 'px',
                right: '',
                top: tooltipY + 'px'
              };
            }
            var tooltip = $('#' + tooltipId).text(label).css(tooltipStyle);
            thisObj.showTooltip(tooltip); 
            $(this).on('mouseleave blur',function() { 
              $('#' + tooltipId).text('').hide();
            })
          });
          
          if (control === 'captions') { 
            if (!this.prefCaptions || this.prefCaptions !== 1) { 
              // captions are available, but user has them turned off 
              if (this.captions.length > 1) { 
                captionLabel = this.tt.captions;
              }
              else { 
                captionLabel = this.tt.showCaptions;
              }
              newButton.addClass('buttonOff').attr('title',captionLabel);
            }
          }
          else if (control === 'descriptions') {      
            if (!this.prefDesc || this.prefDesc !== 1) { 
              // user prefer non-audio described version 
              // Therefore, load media without description 
              // Description can be toggled on later with this button  
              newButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);              
            }         
          }
          
          controllerSpan.append(newButton);
          // create variables of buttons that are referenced throughout the class 
          if (control === 'play') { 
            this.$playpauseButton = newButton;
          }
          else if (control === 'captions') { 
            this.$ccButton = newButton;
          }
          else if (control === 'sign') { 
            this.$signButton = newButton;
          }
          else if (control === 'descriptions') {        
            this.$descButton = newButton; 
            // gray out description button if description is not active 
            if (!this.descOn) {  
              this.$descButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);
            }
          }
          else if (control === 'mute') { 
            this.$muteButton = newButton;
          }
          else if (control === 'transcript') {
            this.$transcriptButton = newButton;
            // gray out transcript button if transcript is not active 
            if (!(this.$transcriptDiv.is(':visible'))) {
              this.$transcriptButton.addClass('buttonOff').attr('title',this.tt.showTranscript);
            }
          }
          else if (control === 'fullscreen') {
            this.$fullscreenButton = newButton;
          }
          else if (control === 'chapters') {
            this.$chaptersButton = newButton;
          }
        }
      }
      if ((i % 2) == 1) {
        this.$controllerDiv.append('<div style="clear:both;"></div>');
      }
    }
  
    if (this.mediaType === 'video') { 
      // also set width and height of div.able-vidcap-container
      vidcapStyles = {
        'width': this.playerWidth+'px',
        'height': this.playerHeight+'px'
      }     
      if (this.$vidcapContainer) { 
        this.$vidcapContainer.css(vidcapStyles); 
      }   
      // also set width of the captions and descriptions containers 
      if (this.$captionDiv) { 
        this.$captionDiv.css('width',this.playerWidth+'px');
      }
      if (this.$descDiv) {
        this.$descDiv.css('width',this.playerWidth+'px');
      }
    }
    
    
    // combine left and right controls arrays for future reference 
    this.controls = [];
    for (var sec in controlLayout) {
      this.controls = this.controls.concat(controlLayout[sec]);
    }
    
    // construct help dialog that includes keystrokes for operating the included controls 
    this.addHelp();     
    // Update state-based display of controls.
    this.refreshControls();
  };

  // Change media player source file, for instance when moving to the next element in a playlist.
  // TODO: Add some sort of playlist support for tracks?
  AblePlayer.prototype.swapSource = function(sourceIndex) { 
    
    // replace default media source elements with those from playlist   
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
        sources[s] =  new Array('audio/mpeg',jwSource); 
        s++;
      }
      if ($newItem.attr('data-webm')) {
        sources[s] = new Array('audio/webm',$newItem.attr('data-webm'));
        s++; 
      }
      if ($newItem.attr('data-webma')) {
        sources[s] = new Array('audio/webm',$newItem.attr('data-webma')); 
        s++; 
      }
      if ($newItem.attr('data-ogg')) {
        sources[s] = new Array('audio/ogg',$newItem.attr('data-ogg')); 
        s++; 
      }
      if ($newItem.attr('data-oga')) {
        sources[s] = new Array('audio/ogg',$newItem.attr('data-oga')); 
        s++; 
      }
      if ($newItem.attr('data-wav')) {
        sources[s] = new Array('audio/wav',$newItem.attr('data-wav')); 
        s++; 
      }
    }
    else if (this.mediaType === 'video') { 
      if ($newItem.attr('data-mp4')) {
        jwSource = $newItem.attr('data-mp4'); // JW Player can play this 
        sources[s] =  new Array('video/mp4',jwSource); 
        s++; 
      }
      if ($newItem.attr('data-webm')) {
        sources[s] = new Array('video/webm',$newItem.attr('data-webm')); 
        s++; 
      }
      if ($newItem.attr('data-webmv')) {
        sources[s] = new Array('video/webm',$newItem.attr('data-webmv')); 
        s++; 
      }
      if ($newItem.attr('data-ogg')) {
        sources[s] = new Array('video/ogg',$newItem.attr('data-ogg')); 
        s++; 
      }   
      if ($newItem.attr('data-ogv')) {
        sources[s] = new Array('video/ogg',$newItem.attr('data-ogv')); 
        s++; 
      }   
    }     
    for (i=0; i<sources.length; i++) { 
      $newSource = $('<source>',{ 
        type: sources[i][0],
        src: sources[i][1] 
      });         
      this.$media.append($newSource);
    }
    
    // update playlist to indicate which item is playing 
    //$('.able-playlist li').removeClass('able-current');
    this.$playlist.removeClass('able-current');
    $newItem.addClass('able-current'); 
    
    // update Now Playing div 
    if (this.showNowPlaying === true) {
      nowPlayingSpan = $('<span>');
      if (typeof itemLang !== 'undefined') { 
        nowPlayingSpan.attr('lang',itemLang); 
      }
      nowPlayingSpan.html('<span>Selected track:</span>' + itemTitle); 
      this.$nowPlayingDiv.html(nowPlayingSpan);
    }
    
    // reload audio after sources have been updated
    // if this.swappingSrc is true, media will autoplay when ready
    if (this.initializing) { // this is the first track - user hasn't pressed play yet 
      this.swappingSrc = false; 
    }
    else { 
      this.swappingSrc = true; 
      if (this.player === 'html5') {
        this.media.load();
      }   
      else if (this.player === 'jw') { 
        this.jwPlayer.load({file: jwSource}); 
      }
      else if (this.player === 'youtube') {
        // Does nothing, can't swap source with youtube.
        // TODO: Anything we need to do to prevent this happening?
      }
    }
  };

  AblePlayer.prototype.getButtonTitle = function(control) { 
    
    var captionsCount; 
    
    if (control === 'playpause') { 
      return this.tt.play; 
    }
    else if (control === 'play') { 
      return this.tt.play; 
    }
    else if (control === 'pause') { 
      return this.tt.pause; 
    }
    else if (control === 'stop') { 
      return this.tt.stop; 
    }
    else if (control === 'rewind') { 
      return this.tt.rewind;
    }
    else if (control === 'forward') { 
      return this.tt.forward;
    }
    else if (control === 'captions') {  
      if (this.usingYouTubeCaptions) { 
        captionsCount = this.ytCaptions.length;
      }
      else { 
        captionsCount = this.captions.length; 
      }
      if (captionsCount > 1) { 
        return this.tt.captions;
      }
      else { 
        if (this.captionsOn) {
          return this.tt.hideCaptions;
        }
        else { 
          return this.tt.showCaptions;
        }                    
      }
    }   
    else if (control === 'descriptions') { 
      if (this.descOn) {
        return this.tt.turnOffDescriptions;
      }
      else { 
        return this.tt.turnOnDescriptions;
      }
    }
    else if (control === 'transcript') {  
      if (this.$transcriptDiv.is(':visible')) {
        return this.tt.hideTranscript;
      }
      else { 
        return this.tt.showTranscript;
      }
    }   
    else if (control === 'chapters') { 
      return this.tt.chapters;
    }
    else if (control === 'sign') { 
      return this.tt.sign;
    }
    else if (control === 'mute') { 
      if (this.getVolume() > 0) { 
        return this.tt.mute;
      }
      else { 
        return this.tt.unmute;
      }
    }
    else if (control === 'volume-up') { 
      return this.tt.volumeUp;
    }   
    else if (control === 'volume-down') { 
      return this.tt.volumeDown;
    }
    else if (control === 'faster') {
      return this.tt.faster;
    }
    else if (control === 'slower') {
      return this.tt.slower;
    }
    else if (control === 'preferences') { 
      return this.tt.preferences; 
    }
    else if (control === 'help') { 
      return this.tt.help; 
    }
    else { 
      // there should be no other controls, but just in case: 
      // return the name of the control with first letter in upper case 
      // ultimately will need to get a translated label from this.tt 
      if (this.debug) { 
        console.log('Found an untranslated label: ' + control);   
      }
      return control.charAt(0).toUpperCase() + control.slice(1);
    }   
  };


})(jQuery);
