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

    var thisObj, vidcapContainer, prefsGroups, i;
    thisObj = this;

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
      vidcapContainer = $('<div>',{
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
  };

  AblePlayer.prototype.injectOffscreenHeading = function () {
    // Add offscreen heading to the media container.
    // The heading injected in $ableDiv is one level deeper than the closest parent heading
    // as determined by getNextHeadingLevel()
    var headingType;
    this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
    headingType = 'h' + this.playerHeadingLevel.toString();
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
      'aria-live' : 'polite'
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
    // It will be exposed conditionally within description.js > initDescription()
    this.$descDiv.hide();
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

  AblePlayer.prototype.populateChaptersDiv = function() {

    var thisObj, headingLevel, headingType, headingId, $chaptersHeading,
      $chaptersNav, $chaptersList, $chapterItem, $chapterButton,
      i, itemId, chapter, buttonId, hasDefault,
      getClickFunction, $clickedItem, $chaptersList, thisChapterIndex;

    thisObj = this;

    if ($('#' + this.chaptersDivLocation)) {
      this.$chaptersDiv = $('#' + this.chaptersDivLocation);
      this.$chaptersDiv.addClass('able-chapters-div');

      // add optional header
      if (this.chaptersTitle) {
        headingLevel = this.getNextHeadingLevel(this.$chaptersDiv);
        headingType = 'h' + headingLevel.toString();
        headingId = this.mediaId + '-chapters-heading';
        $chaptersHeading = $('<' + headingType + '>', {
          'class': 'able-chapters-heading',
          'id': headingId
        }).text(this.chaptersTitle);
        this.$chaptersDiv.append($chaptersHeading);
      }

      $chaptersNav = $('<nav>');
      if (this.chaptersTitle) {
        $chaptersNav.attr('aria-labelledby',headingId);
      }
      else {
        $chaptersNav.attr('aria-label',this.tt.chapters);
      }

      $chaptersList = $('<ul>');
      for (i in this.chapters) {
        chapter = this.chapters[i];
        itemId = this.mediaId + '-chapters-' + i; // TODO: Maybe not needed???
        $chapterItem = $('<li></li>');
        $chapterButton = $('<button>',{
          'type': 'button',
          'val': i
        }).text(this.flattenCueForCaption(chapter));

        // add event listeners
        getClickFunction = function (time) {
          return function () {
            $clickedItem = $(this).closest('li');
            $chaptersList = $(this).closest('ul').find('li');
            thisChapterIndex = $chaptersList.index($clickedItem);
            $chaptersList.removeClass('able-current-chapter').attr('aria-selected','');
            $clickedItem.addClass('able-current-chapter').attr('aria-selected','true');
            thisObj.currentChapter = thisObj.chapters[thisChapterIndex];
            thisObj.seekTo(time);
          }
        };
        $chapterButton.on('click',getClickFunction(chapter.start)); // works with Enter too
        $chapterButton.on('focus',function() {
          $(this).closest('ul').find('li').removeClass('able-focus');
          $(this).closest('li').addClass('able-focus');
        });
        $chapterItem.on('hover',function() {
          $(this).closest('ul').find('li').removeClass('able-focus');
          $(this).addClass('able-focus');
        });
        $chapterItem.on('mouseleave',function() {
          $(this).removeClass('able-focus');
        });
        $chapterButton.on('blur',function() {
          $(this).closest('li').removeClass('able-focus');
        });

        // put it all together
        $chapterItem.append($chapterButton);
        $chaptersList.append($chapterItem);
        if (this.defaultChapter == chapter.id) {
          $chapterButton.attr('aria-selected','true').parent('li').addClass('able-current-chapter');
          hasDefault = true;
        }
      }
    }
    if (!hasDefault) {
      // select the first button
      $chaptersList.find('button').first().attr('aria-selected','true')
        .parent('li').addClass('able-current-chapter');
    }
    $chaptersNav.append($chaptersList);
    this.$chaptersDiv.append($chaptersNav);
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

  AblePlayer.prototype.injectPoster = function ($element) {

    // get poster attribute from media element and append that as an img to $element
    // currently only applies to YouTube and fallback
    var poster;

    if (this.$media.attr('poster')) {
      poster = this.$media.attr('poster');
      this.$posterImg = $('<img>',{
        'class': 'able-poster',
        'src' : poster,
        'alt' : "",
        'role': "presentation",
        'width': this.playerWidth,
        'height': this.playerHeight
      });
      $element.append(this.$posterImg);
    }
  }

  AblePlayer.prototype.injectAlert = function () {

    // inject two alerts, one visible for all users and one for screen reader users only

    var top;

    this.$alertBox = $('<div role="alert"></div>');
    this.$alertBox.addClass('able-alert');
    this.$alertBox.appendTo(this.$ableDiv);
    if (this.mediaType == 'audio') {
      top = -10;
    }
    else {
      top = Math.round(this.$mediaContainer.offset().top * 10) / 10;
    }
    this.$alertBox.css({
      top: top + 'px'
    });

    this.$srAlertBox = $('<div role="alert"></div>');
    this.$srAlertBox.addClass('able-screenreader-alert');
    this.$srAlertBox.appendTo(this.$ableDiv);
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
  // 'which' parameter is either 'captions', 'chapters', 'prefs', or 'X-window' (e.g., "sign-window")
  AblePlayer.prototype.createPopup = function (which) {
    var thisObj, $popup, $thisButton, $thisListItem, $prevButton, $nextButton,
        selectedTrackIndex, selectedTrack;
    thisObj = this;
    $popup = $('<div>',{
      'id': this.mediaId + '-' + which + '-menu',
      'class': 'able-popup'
    });
    if (which == 'chapters' || which == 'prefs') {
      $popup.addClass('able-popup-no-radio');
    }
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
    if (this.prefsPopup && this.prefsPopup.is(':visible')) {
      this.prefsPopup.hide();
      this.$prefsButton.focus();
    }
    if (this.$windowPopup && this.$windowPopup.is(':visible')) {
      this.$windowPopup.hide();
      this.$windowButton.show().focus();
    }
    if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
      this.$volumeSlider.hide().attr('aria-hidden','true');
      this.$volumeAlert.text(this.tt.volumeSliderClosed);
      this.$volumeButton.focus();
    }
  };

  AblePlayer.prototype.setupPopups = function (which) {
    // Create and fill in the popup menu forms for various controls.
    // parameter 'which' is passed if refreshing content of an existing popup ('captions' or 'chapters')

    var popups, thisObj, hasDefault, i, j,
        tracks, trackList, trackItem, track,
        radioName, radioId, trackButton, trackLabel,
        prefCats, prefCat, prefLabel;

    popups = [];
    if (typeof which === 'undefined') {
      popups.push('prefs');
    }

    if (which === 'captions' || (typeof which === 'undefined')) {
      if (typeof this.ytCaptions !== 'undefined') { // setup popup for YouTube captions
        if (this.ytCaptions.length) {
          popups.push('ytCaptions');
        }
      }
      else { // setup popup for local captions
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
      for (var i=0; i<popups.length; i++) {
        var popup = popups[i];
        hasDefault = false;
        if (popup == 'prefs') {
          this.prefsPopup = this.createPopup('prefs');
        }
        else if (popup == 'captions') {
          if (typeof this.captionsPopup === 'undefined') {
            this.captionsPopup = this.createPopup('captions');
          }
          tracks = this.captions;
        }
        else if (popup == 'chapters') {
          if (typeof this.chaptersPopup === 'undefined') {
            this.chaptersPopup = this.createPopup('chapters');
          }
          tracks = this.chapters;
        }
        else if (popup == 'ytCaptions') {
          if (typeof this.captionsPopup === 'undefined') {
            this.captionsPopup = this.createPopup('captions');
          }
          tracks = this.ytCaptions;
        }
        var trackList = $('<ul></ul>');
        radioName = this.mediaId + '-' + popup + '-choice';
        if (popup === 'prefs') {
          prefCats = this.getPreferencesGroups();
          for (j in prefCats) {
            trackItem = $('<li></li>');
            prefCat = prefCats[j];
            if (prefCat === 'captions') {
              prefLabel = this.tt.prefMenuCaptions;
            }
            else if (prefCat === 'descriptions') {
              prefLabel = this.tt.prefMenuDescriptions;
            }
            else if (prefCat === 'keyboard') {
              prefLabel = this.tt.prefMenuKeyboard;
            }
            else if (prefCat === 'transcript') {
              prefLabel = this.tt.prefMenuTranscript;
            }
            radioId = this.mediaId + '-' + popup + '-' + j;
            trackButton = $('<input>',{
              'type': 'radio',
              'val': prefCat,
              'name': radioName,
              'id': radioId
            });
            trackLabel = $('<label>',{
              'for': radioId
            });
            trackLabel.text(prefLabel);
            trackButton.click(function(event) {
              var whichPref = $(this).attr('value');
              thisObj.setFullscreen(false);
              if (whichPref === 'captions') {
                thisObj.captionPrefsDialog.show();
              }
              else if (whichPref === 'descriptions') {
                thisObj.descPrefsDialog.show();
              }
              else if (whichPref === 'keyboard') {
                thisObj.keyboardPrefsDialog.show();
              }
              else if (whichPref === 'transcript') {
                thisObj.transcriptPrefsDialog.show();
              }
              thisObj.closePopups();
            });
            trackItem.append(trackButton,trackLabel);
            trackList.append(trackItem);
          }
          this.prefsPopup.append(trackList);
        }
        else {
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
          if (popup === 'captions' || popup === 'ytCaptions') {
            this.captionsPopup.html(trackList);
          }
          else if (popup === 'chapters') {
            this.chaptersPopup.html(trackList);
          }
        }
      }
    }
  };

  AblePlayer.prototype.provideFallback = function(reason) {
    // provide ultimate fallback for users who are unable to play the media
    // reason is either 'No Support' or a specific error message

    var fallback, fallbackText, $fallbackContainer, showBrowserList, browsers, i, b, browserList;

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
    $fallbackContainer = $('<div>',{
      'class' : 'able-fallback',
      'role' : 'alert',
      'width' : this.playerWidth
    });
    this.$media.before($fallbackContainer);
    $fallbackContainer.html(fallback);
    if (showBrowserList) {
      browserList = $('<ul>');
      browsers = this.getSupportingBrowsers();
      for (i=0; i<browsers.length; i++) {
        b = $('<li>');
        b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
        browserList.append(b);
      }
      $fallbackContainer.append(browserList);
    }

    // if there's a poster, show that as well
    this.injectPoster($fallbackContainer);

    // now remove the media element.
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

    // test for browser support for volume before displaying volume button
    if (this.browserSupportsVolume()) {
      // volume buttons are: 'mute','volume-soft','volume-medium','volume-loud'
      // previously supported button were: 'volume-up','volume-down'
      this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
      controlLayout['ur'].push('volume');
    }
    else {
      this.volume = false;
    }

    // Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
    var bll = [];
    var blr = [];

    if (this.isPlaybackRateSupported()) {
      bll.push('slower');
      bll.push('faster');
    }

    if (this.mediaType === 'video') {
      if (this.hasCaptions) {
        bll.push('captions'); //closed captions
      }
      if (this.hasSignLanguage) {
        bll.push('sign'); // sign language
      }
      if (this.hasOpenDesc || this.hasClosedDesc) {
        bll.push('descriptions'); //audio description
      }
    }

    if (this.includeTranscript && this.useTranscriptButton) {
      bll.push('transcript');
    }

    if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
      bll.push('chapters');
    }

    controlLayout['br'].push('preferences');
    // Help button eliminated in v2.3.4 - help text combined into Preferences dialog
    // controlLayout['br'].push('help');

    // TODO: JW currently has a bug with fullscreen, anything that can be done about this?
    if (this.mediaType === 'video' && this.player !== 'jw') {
      controlLayout['br'].push('fullscreen');
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
    i, j, k, controls, controllerSpan, tooltipId, tooltipX, tooltipY, control,
    buttonImg, buttonImgSrc, buttonTitle, newButton, iconClass, buttonIcon,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle,
    controllerStyles, vidcapStyles, captionLabel, popupMenuId;

    var thisObj = this;

    var baseSliderWidth = 100;

    // Initializes the layout into the this.controlLayout variable.
    var controlLayout = this.calculateControlLayout();

    var sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};

    // add an empty div to serve as a tooltip
    tooltipId = this.mediaId + '-tooltip';
    this.$tooltipDiv = $('<div>',{
      'id': tooltipId,
      'class': 'able-tooltip'
    });
    this.$controllerDiv.append(this.$tooltipDiv);

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
          if (control === 'volume') {
            buttonImgSrc = '../images/' + this.iconColor + '/' + this.volumeButton + '.png';
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
          if (control === 'volume' || control === 'preferences') {
            // This same ARIA for captions and chapters are added elsewhere
            if (control == 'preferences') {
              popupMenuId = this.mediaId + '-prefs-menu';
            }
            else if (control === 'volume') {
              popupMenuId = this.mediaId + '-volume-slider';
            }
            newButton.attr({
//              'aria-haspopup': 'true',
              'aria-controls': popupMenuId
            });
          }
          if (this.iconType === 'font') {
            if (control === 'volume') {
              iconClass = 'icon-' + this.volumeButton;
            }
            else {
              iconClass = 'icon-' + control;
            }
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

          // create variables of buttons that are referenced throughout the AblePlayer object
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
            // button will be enabled or disabled in description.js > initDescription()
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
          else if (control === 'preferences') {
            this.$prefsButton = newButton;
          }
          else if (control === 'volume') {
            this.$volumeButton = newButton;
          }
        }
        if (control === 'volume') {
          // in addition to the volume button, add a hidden slider
          this.addVolumeSlider(controllerSpan);
        }
      }
      if ((i % 2) == 1) {
        this.$controllerDiv.append('<div style="clear:both;"></div>');
      }
    }

    if (this.mediaType === 'video') {
      // As of v 2.3.4, no longer adding width and height on this.$vidCapContainer
      // CAN'T constrain the height if this.prefCaptionsPosition === 'below'
      // because the caption div below the video needs to be able to expand as needed
      // Checked the new setting in Firefox, Chrome, & IE and it seems to work w/o width & height
      /*
      // set width and height of div.able-vidcap-container
      vidcapStyles = {
        'width': this.playerWidth+'px',
        'height': this.playerHeight+'px'
      }
      if (this.$vidcapContainer) {
        this.$vidcapContainer.css(vidcapStyles);
      }
      */
      if (this.$captionDiv) {
        // set width of the captions container
        this.$captionDiv.css('width',this.playerWidth+'px');
        // stylize captions based on user prefs
        this.stylizeCaptions(this.$captionDiv);
      }
    }

    // combine left and right controls arrays for future reference
    this.controls = [];
    for (var sec in controlLayout) {
      this.controls = this.controls.concat(controlLayout[sec]);
    }

    // Update state-based display of controls.
    this.refreshControls();
  };

  AblePlayer.prototype.swapSource = function(sourceIndex) {

    // Change media player source file, for instance when moving to the next element in a playlist.
    // NOTE: Swapping source for audio description is handled elsewhere;
    // see description.js > swapDescription()

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
    else if (control === 'volume') {
      return this.tt.volume;
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
      // return this.tt.help;
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
