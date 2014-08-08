
/* 
  // JavaScript for Able Player 
  
  // HTML5 Media API: 
  // http://www.w3.org/TR/html5/embedded-content-0.html#htmlmediaelement
  // W3C API Test Page: 
  // http://www.w3.org/2010/05/video/mediaevents.html
  
  // Uses JW Player as fallback 
  // JW Player configuration options: 
  // http://www.longtailvideo.com/support/jw-player/28839/embedding-the-player
  // (NOTE: some options are not documented, e.g., volume) 
  // JW Player API reference: 
  // http://www.longtailvideo.com/support/jw-player/28851/javascript-api-reference
  
*/

/*jslint node: true, browser: true, white: true, indent: 2, unparam: true, plusplus: true */
/*global $, jQuery */
"use strict";

// IE8 Compatibility
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}
// End IE8 Compatibility

$(document).ready(function () {
  $('video, audio').each(function (index, element) {
    if ($(element).data('able-player') !== undefined) {
      var includeTranscript = $(element).data('include-transcript');
      if (includeTranscript === undefined || includeTranscript === "")  {
        includeTranscript = true;
      }
      new AblePlayer($(this),
                     index,
                     $(element).data('start-time') || 0,
                     includeTranscript,
                     $(element).data('transcript-div'),
                     $(element).data('translation-dir') || '/translations/');
    }
  });
})

// Construct an AblePlayer object 
// Parameters are: 
// media - jQuery selector or element identifying the media.
// umpIndex - the index of this Able Player instance (if page includes only one player, umpIndex = 0) 
// startTime - the time at which to begin playing the media       
function AblePlayer(media, umpIndex, startTime, includeTranscript, transcriptDiv, translationDir) {

  /* 
   *
   * USER DEFINED VARIABLES
   *
   */

  // Debug - set to true to write messages to console; otherwise false
  this.debug = false;

  // Volume range is 0 to 1. Don't crank it to avoid overpowering screen readers
  this.volume = 0.5;

  // Default video height and width 
  // Can be overwritten with height and width attributes on HTML <video> element
  this.playerWidth = 480;
  this.playerHeight = 360; 

  // Button color 
  // Media controller background color can be customized in ump.css 
  // Choose 'white' if your controller has a dark background, 'black' if a light background
  // Use a contrast checker to ensure your color scheme has sufficient contrast
  // e.g., http://www.paciellogroup.com/resources/contrastAnalyser
  this.iconColor = 'white';

  // Icon type 
  // By default, AblePlayer uses scalable icomoon fonts for the player controls 
  // and falls back to images if the user has a custom style sheet that overrides font-family 
  // set this to 'image' to always use images for player controls; otherwise leave set to 'font'
  this.iconType = 'font';   
  
  // Browsers that don't support seekbar sliders will use rewind and forward buttons 
  // seekInterval = Number of seconds to seek forward or back with these buttons    
  this.seekInterval = 10;

  // In UMP's predecessor (AAP) progress sliders were included in supporting browsers 
  // However, this results in an inconsistent interface across browsers 
  // most notably, Firefox as of 16.x still did not support input[type="range"] (i.e., sliders)
  // The following variable can be used in the future to add conditional slider support if desired
  // Note that the related code has not been updated for UMP. 
  // Therefore, this should NOT be set to true at this point. 
  this.useSlider = true;
  
  // showNowPlaying - set to true to show 'Now Playing:' plus title of current track above player 
  // Otherwise set to false 
  // This is only used when there is a playlist 
  this.showNowPlaying = true;

  // fallback - set to 'jw' if implementation includes JW Player as fallback 
  // JW Player is licensed separately 
  // JW Player files must be included in thirdparty folder 
  // JW Player will be loaded as needed in browsers that don't support HTML5 media 
  // No other fallback solution is supported at this time
  // If NOT using JW Player, set to false. An error message will be displayed if browser can't play the media.  
  this.fallback = 'jw'; 
  
  // testFallback - set to true to force browser to use the fallback player (for testing)
        // Note: JW Player does not support offline playback (a Flash restriction)
        // Therefore testing must be performed on a web server 
  this.testFallback = false;
    
  // loop - if true, will start again at top after last item in playlist has ended
  // NOTE: This is not fully supported yet - needs work 
  this.loop = true; 
  
  // lang - default language of the player
  this.lang = 'en'; 
  
  // langOverride - set to true to reset this.lang to language of the web page, if detectable  
  // set to false to force player to use this.lang
  this.langOverride = true; 

  /* 
   *
   * END USER DEFINED VARIABLES
   *
   */

  // if F12 Developer Tools aren't open in IE (through 9, no longer a problen in IE10)
  // console.log causes an error - can't use debug without a console to log messages to 
  if (! window.console) { 
    this.debug = false;
  }

  if (transcriptDiv) {
    this.transcriptDivLocation = transcriptDiv;
  }

  if (includeTranscript) {
    this.includeTranscript = true;
  }
  else {
    this.includeTranscript = false;
  }

  if (startTime) { 
    this.startTime = startTime; 
  }
  else { 
    this.startTime = 0;
  }

  if (umpIndex) {
    this.umpIndex = umpIndex;
  }
  else { 
    this.umpIndex = 0;
  }

  if ($(media).attr('id')) {
    this.mediaId = $(media).attr('id');
  }
  else {
    this.mediaId = "ableMediaId_" + this.umpIndex;
    $(media).attr('id', this.mediaId);
  }

  this.translationDir = translationDir || '/translations/';

  // populate translation object with localized versions of all labels and prompts 
  // use defer method to defer additional processing until text is retrieved    
  this.tt = []; 
  var thisObj = this;
  $.when(this.getText()).then(
    function () { 
      if (thisObj.countProperties(thisObj.tt) > 50) { 
        // close enough to ensure that most text variables are populated 
        thisObj.setup();
      } 
      else { 
        // can't continue loading player with no text
        console.log('ERROR: Failed to load translation table');         
      }
    }
  );
}
AblePlayer.prototype.setup = function() { 
  if (this.debug && this.startTime > 0) { 
    console.log('Will start media at ' + startTime + ' seconds');
  }
  this.startedPlaying = false;
  this.autoScrollTranscript = true;

  // be sure media exists, and is a valid type       
  if ($('#' + this.mediaId)) { 
    // an element exists with this mediaId
    this.$media = $('#' + this.mediaId); // jquery object 
    this.media = this.$media[0]; // html element
    if (this.$media.is('audio')) { 
      this.mediaType = 'audio';
    }
    else if (this.$media.is('video')) { 
      this.mediaType = 'video';
    }
    else { 
      this.mediaType = this.$media.get(0).tagName;
      if (this.debug) { 
        console.log('You initialized Able Player with ' + this.mediaId + ', which is a ' + this.mediaType + ' element.'); 
        console.log('Able Player only works with HTML audio or video elements.');
      }
    }
    
    if (this.mediaType === 'audio' || this.mediaType === 'video') { 
      
      // Don't use custom AblePlayer interface for IOS video 
      // IOS always plays video in its own player - don't know a way around that  
//      if (this.mediaType === 'video' && this.isIOS()) { 
      if (false) {
        // do nothing 
        // *could* perhaps build in support for user preferances & described versions  
        if (this.debug) { 
          console.log ('Stopping here. IOS will handle your video.');
        }
      }
      else {       
        // get data from source elements
        this.$sources = this.$media.find('source');       
        if (this.debug) { 
          console.log('found ' + this.$sources.length + ' media sources');
        }
        
        // get playlist for this media element   
        this.getPlaylist();
        
        // determine which player can play media, and define this.player 
        this.getPlayer(); 
        
        if (this.player) {
          
          // do a bunch of stuff to setup player 
          this.getIconType();
          this.getDimensions();
          this.getPrefs();
          this.injectPlayerCode();          
          if (this.iconType === 'image') {
            this.setButtons();
          }
          this.setupAlert();
          this.initPlaylist();
          
          // initialize player to support captions &/or description (from track elements)
          this.initTracks();
          
          // initialize description based on available sources + user prefs 
          this.initDescription(); 
          
          this.initializing = false;
          
          
          if (this.player === 'html5') { 
            if (this.initPlayer('html5')) { 
              this.addControls(this.mediaType);  
              this.addEventListeners();
            }
          }
          else if (this.player === 'jw') { 
            // attempt to load jwplayer script
            var thisObj = this;
            // TODO: Allow dynamically setting thirdparty folder.
            $.getScript('../thirdparty/jwplayer.js') 
              .done(function( script, textStatus ) {
                if (thisObj.debug) {
                  console.log ('Successfully loaded the JW Player');
                }
                if (thisObj.initPlayer('jw')) { 
                  thisObj.addControls(thisObj.mediaType);  
                  thisObj.addEventListeners();
                }
              })
              .fail(function( jqxhr, preferences, exception ) {
                if (thisObj.debug) { 
                  console.log ('Unable to load JW Player.');
                }
                thisObj.player = null;
                return;
              });
          }
          if (this.debug && this.player) { 
            console.log ('Using the ' + this.player + ' media player');
          }

          // After done messing with the player, this is necessary to fix playback on iOS
          if (this.isIOS()) { 
            this.$media[0].load();
          }
        }        
        else { 
          // no player can play this media
          this.provideFallback(); 
        }
      } // end else if this is not IOS video 
    } // end if mediaId matches an audio or video element 
    else { 
      if (this.debug) {
        console.log('The element with id ' + this.mediaId + ' is a ' + this.mediaType + ' element.');
        console.log('Expecting an audio or video element.'); 
      }        
    } 
  } // end if no media is found that matches mediaId 
  else { 
    if (this.debug) {
      console.log('No media was found with an id of ' + this.mediaId + '.'); 
    }
  }
}; 
AblePlayer.prototype.getSupportedLangs = function() { 

  // returns an array of languages for which AblePlayer has translation tables 
  var langs = ['en'];
  return langs;
};
AblePlayer.prototype.getText = function() { 

  // determine language, then get labels and prompts from corresponding translation file (in JSON)
  // finally, populate this.tt object with JSON data
  // return true if successful, otherwise false 
  var gettingText, lang, thisObj, msg; 

  gettingText = $.Deferred(); 
  
  // override this.lang to language of the web page, if known and supported
  // otherwise this.lang will continue using default    
  if (this.langOverride) {   
    if ($('body').attr('lang')) { 
      lang = $('body').attr('lang');
    }
    else if ($('html').attr('lang')) { 
      lang = $('html').attr('lang');
    }    
    if (lang !== this.lang) {
      msg = 'Language of web page (' + lang +') ';
      if ($.inArray(lang,this.getSupportedLangs()) !== -1) { 
        // this is a supported lang
        msg += ' has a translation table available.';
        this.lang = lang; 
      }
      else { 
        msg += ' is not currently supported. Using default language (' + this.lang + ')';
      }
      if (this.debug) {
        console.log(msg);
      }
    }
  } 
  thisObj = this;
  // get content of JSON file 
  $.getJSON(this.translationDir + this.lang + '.js',
    function(data, textStatus, jqxhr) { 
      if (textStatus === 'success') { 
        thisObj.tt = data;
        if (thisObj.debug) { 
          console.log('Successfully assigned JSON data to trans');
          console.log(thisObj.tt);           
        }
      }
      else { 
        return false; 
      }
    }
  ).then( 
    function(){ // success 
      // resolve deferred variable
      gettingText.resolve();  
    },
    function() { // failure 
      return false; 
    }
  );
  return gettingText.promise(); 
};  
AblePlayer.prototype.getPlayer = function() { 

  // Determine which player to use, if any 
  // return 'html5', 'jw' or null 
  
  var i, sourceType, $newItem;
  if (this.testFallback || 
      ((this.isUserAgent('msie 7') || this.isUserAgent('msie 8') || this.isUserAgent('msie 9')) && this.mediaType === 'video') ||
      (this.isIOS() && !this.isIOS(7))) {
    // the user wants to test the fallback player, or  
    // the user is using IE9, which has buggy implementation of HTML5 video 
    // e.g., plays only a few seconds of MP4 than stops and resets to 0
    // even in native HTML player with no JavaScript 
    // Couldn't figure out a solution to this problem - IE10 fixes it. Meanwhile, use JW for IE9 video 
    if (this.fallback === 'jw') {            
      // be sure JW Player can play the provided source 
      // until confirmed, set this.player = null
      this.player = null;
      if (this.$sources.length > 0) { // this media has one or more <source> elements
        for (i = 0; i < this.$sources.length; i++) { 
          sourceType = this.$sources[i].getAttribute('type'); 
          //if ((this.mediaType === 'video' && sourceType === 'video/mp4') || 
          //  (this.mediaType === 'audio' && sourceType === 'audio/mpeg')) { 
              // JW Player can play this 
              this.player = 'jw';
              this.mediaFile = this.$sources[i].getAttribute('src');
              return;
          //}
        }
      }
      else if (this.playlistSize > 0) { 
        // see if the first item in the playlist is a type JW player an play 
        $newItem = this.$playlist.eq(0);
        // check data-* attributes for a type JW can play  
        if (this.mediaType === 'audio') { 
          if ($newItem.attr('data-mp3')) { 
            this.player = 'jw';
            this.mediaFile = $newItem.attr('data-mp3'); 
            return;
          }
        }
        else if (this.mediaType === 'video') {
          if ($newItem.attr('data-mp4')) { 
            this.player = 'jw';
            this.mediaFile = $newItem.attr('data-mp4'); 
            return;
          }
        }
      }
      else { 
        // there is no source, nor playlist 
        this.player = null;
      }
    }
    else { 
      this.player = null;
    }
  }
  else if (this.media.canPlayType) {
    this.player = 'html5';
  }
  else { 
    this.player = null;
  }
};
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
  
  // create $mediaContainer and $umpDiv and wrap them around the media element
  this.$mediaContainer = this.$media.wrap('<div class="ump-media-container"></div>').parent();        
  this.$umpDiv = this.$mediaContainer.wrap('<div class="ump"></div>').parent();
    
  this.$playerDiv = $('<div>', {
    'class' : 'ump-player',
    'role' : 'region',
    'aria-label' : this.mediaType + ' player'
  });
  this.$playerDiv.addClass('ump-'+this.mediaType);

  // create a div for exposing description
  // description will be exposed via role="alert" & announced by screen readers  
  this.$descDiv = $('<div>',{
    'class': 'ump-descriptions',
    'role': 'alert'
  });
  // Start off with description hidden.
  this.$descDiv.hide();
  // TODO: Does this need to be changed when preference is changed?
  if (this.prefClosedDesc === 0 || this.prefVisibleDesc === 0) { 
    this.$descDiv.addClass('ump-clipped');                
  }

  if (this.includeTranscript) {
    this.$transcriptArea = $('<div>', {
      'class': 'ump-transcript-area'
    });
      
    this.$transcriptToolbar = $('<div>', {
      'class': 'ump-transcript-toolbar'
    });

    this.$transcriptDiv = $('<div>', {
      'class' : 'ump-transcript'
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

    // Transcript toolbar content:
    this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
    this.$autoScrollTranscriptCheckbox.click(function () {
      thisObj.handleTranscriptLockToggle(thisObj.$autoScrollTranscriptCheckbox.prop('checked'));
    });
    this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">Auto scroll</label>'), this.$autoScrollTranscriptCheckbox);

    this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);
  }

  // The default skin depends a bit on a Now Playing div 
  // so go ahead and add one 
  // However, it's only populated if this.showNowPlaying = true 
  this.$nowPlayingDiv = $('<div>',{
    'class' : 'ump-now-playing',
    'role' : 'alert'
  });
  
  this.$controllerDiv = $('<div>',{
    'class' : 'ump-controller'
  });
  
  this.$statusBarDiv = $('<div>',{
    'class' : 'ump-status-bar'
  });
  this.$timer = $('<span>',{
    'class' : 'ump-timer'
  });
  this.$status = $('<span>',{
    'class' : 'ump-status',
    'role' : 'alert'
  });
  this.$statusBarDiv.append(this.$timer).append(this.$status);
  
  // append new divs to $playerDiv
  this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
  
  // and finally, append playerDiv to umpDiv  
  this.$umpDiv.append(this.$playerDiv, this.$descDiv);
  
  if (this.includeTranscript) {
    // If client has provided separate transcript location, put it there instead.
    if (this.transcriptDivLocation) {
      $(this.transcriptDivLocation).append(this.$transcriptArea);
    }
    else {
      // TODO: Is this always what we want?
      // Place adjacent to player.
      this.$umpDiv.width(this.$umpDiv.width() * 2);
      this.$umpColumnLeft = this.$umpDiv.children().wrapAll('<div class="ump-column-left">').parent();
      this.$umpDiv.append(this.$transcriptArea);
      this.$transcriptArea.wrap('<div class="ump-column-right">');
    }
  }
  
  // oh, and also add div for displaying alerts and error messages 
  this.$alertDiv = $('<div>',{
    'class' : 'ump-alert-div',
    'role' : 'alert'
  });   
  this.$umpDiv.after(this.$alertDiv);
  
  // Can't get computed style in webkit until after controllerDiv has been added to the DOM     
  this.getBestColor(this.$controllerDiv); // getBestColor() defines this.iconColor
  this.$controllerDiv.addClass('ump-' + this.iconColor + '-controls');
};
AblePlayer.prototype.initTracks = function() { 

  var vidcapContainer, i, track, kind;
         
  // check for tracks (e.g., captions, description)
  this.$tracks = this.$media.find('track'); 
  if (this.$tracks.length > 0) { 
    if (this.mediaType === 'video') { 
      // add container that captions or description will be appended to
      // Note: new Jquery object must be assigned _after_ wrap, hence the temp vidcapContainer variable  
      vidcapContainer = $('<div>',{ 
        'class' : 'ump-vidcap-container'
      });
      this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();  
      // this.$umpDiv.prepend(vidcapContainer);
    }
    // UMP currently only supports one caption and one description track 
    for (i=0; i<this.$tracks.length; i++) { 
      track = this.$tracks[i];
      kind = track.getAttribute('kind');
      if (kind === 'captions') { 
        this.hasCaptions = true;
        // create a div for displaying captions  
        // includes aria-hidden="true" because otherwise 
        // captions being added and removed causes sporadic changes to focus in JAWS
        // (not a problem in NVDA or VoiceOver)
        this.$captionDiv = $('<div>',{
          'class': 'ump-captions',
          'aria-hidden': 'true' 
        });
        this.$vidcapContainer.append(this.$captionDiv);
        this.captions = []; //temp array for storing data from source file
        this.currentCaption = -1;
        if (this.prefCaptions === 1) { 
          // user wants to see captions
          this.captionsOn = true; 
        }
        else { 
          this.captionsOn = false;
        }
        this.captionsStarted = false; 
        // go ahead and setup captions in case they're needed 
        // even if user doesn't want to see them 
        this.setupTimedText('captions',track);
      }
      else if (kind === 'descriptions') {
        // prepare closed description, even if user doesn't prefer it 
        // this way it's available if needed 
        this.hasClosedDesc = true;
        // Display the description div.
        this.$descDiv.show();
        this.descriptions = []; //temp array for storing data from source file
        this.currentDescription = -1;
        if ((this.prefDesc === 1) && (this.prefClosedDesc === 1)) { 
          this.closedDescOn = true; 
        }
        this.setupTimedText('descriptions',track);
      }
      else if (kind === 'subtitles') { 
        // not yet supported, but data from source file is available in this array 
        this.subtitles = []; 
        this.currentSubtitle = -1; 
        // NOTE: subtitles could alternatively be stored in captions array 
      }
      else if (kind === 'chapters') { 
        // not yet supported, but data from source file is available in this array 
        this.chapters = []; 
        this.currentChapter = -1; 
        // NOTE: WebVTT supports nested timestamps (to form an outline) 
        // setupTimedText() cannot currently handle this 
      }
      else if (kind === 'metadata') { 
        // not yet supported, but data from source file is available in this array 
        this.metadata = []; 
        this.currentMetadata = -1; 
      }
    }
  }
};
AblePlayer.prototype.getPlaylist = function() { 

  // find a matching playlist and set this.hasPlaylist
  // if there is one, also set this.$playlist, this.$playlistSize, this.$playlistIndex, & this.$playlistEmbed

  var thisObj, dataEmbedded;
  
  this.hasPlaylist = false; // will change to true if a matching playlist is found

  thisObj = this;
  $('.ump-playlist').each(function() { 
    if ($(this).attr('data-player') === thisObj.mediaId) { 
      // this is the playlist for the current player 
      thisObj.hasPlaylist = true;        
      thisObj.$playlist = $(this).find('li');
      // add tabindex to each list item 
      thisObj.$playlist.attr('tabindex','0');
      thisObj.playlistSize = thisObj.$playlist.length;
      thisObj.playlistIndex = 0;        
      dataEmbedded = $(this).attr('data-embedded');
      if (typeof dataEmbedded !== 'undefined' && dataEmbedded !== false) {
        // embed playlist within player 
        thisObj.playlistEmbed = true;             
      }
      else { 
        thisObj.playlistEmbed = false;
      }
    }
  }); 
};
AblePlayer.prototype.initPlaylist = function() { 

  if (this.playlistEmbed === true) { 
    // move playlist into player, immediately before statusBarDiv
    this.$playlist.parent().insertBefore(this.$statusBarDiv);          
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
AblePlayer.prototype.initPlayer = function(player) { 

  // player is either 'html' or 'jw' 
  // might ultimately support others too, e.g., 'youtube' 
  
  var poster, jwHeight, i, sourceType;            

  // set the default volume  
  if (this.player === 'html5') { 
    this.media.volume = this.volume;
  }
  else if (this.player === 'jw') { 
    // Default is 1 to 10, but JW Player uses 0 to 100 for volume. Need to convert
    this.volume = this.volume * 100; 
  }      

  // get vars from HTML5 code, and use them to initialize jwplayer 
  if (this.mediaType === 'video') {
    poster = this.$media.attr('poster');
  }
 
  if (this.player === 'jw') {
    // add an id to div.ump-media-container (JW Player needs this) 
    this.jwId = this.mediaId + '_fallback';            
    this.$mediaContainer.attr('id',this.jwId);

    if (this.mediaType === 'audio') { 
      // JW Player always shows its own controls if height <= 40 
      // Must set height to 0 to hide them 
      // My bug report: 
      // http://www.longtailvideo.com/support/forums/jw-player/setup-issues-and-embedding/29814
      jwHeight = '0px';   
    }
    var sources = [];
    $.each(this.$sources, function (ii, source) {
      sources.push({file: $(source).attr('src')});      
    });

    if (this.mediaType === 'video') { 
      this.jwPlayer = jwplayer(this.jwId).setup({
        playlist: [{
          sources: sources
        }],
        // TODO: allow dynamically setting thirdparty folder
        flashplayer: '../thirdparty/jwplayer.flash.swf',
        html5player: '../thirdparty/jwplayer.html5.js',
        image: poster, 
        controls: false,
        volume: this.volume,
        height: this.playerHeight,
        width: this.playerWidth,
        fallback: false, 
        primary: 'flash',
        wmode: 'transparent' // necessary to get HTML captions to appear as overlay 
      });
    }
    else { // if this is an audio player
      this.jwPlayer = jwplayer(this.jwId).setup({
        playlist: [{
          sources: sources
        }],
        flashplayer: '../thirdparty/jwplayer.flash.swf',
        html5player: '../thirdparty/jwplayer.html5.js',
        controls: false,
        volume: this.volume,
        height: jwHeight,
        fallback: false, 
        primary: 'flash'
      });                             
    }

    // remove the media element - we're done with it
    // keeping it would cause too many potential problems with HTML5 & JW event listeners both firing
    this.$media.remove();           
  }

  // synch elapsedTime with startTime      
  this.elapsedTime = this.startTime;

  // define mediaFile, descFile, and hasOpenDesc 
  // TODO: Remove?
/*  for (i = 0; i < this.$sources.length; i++) {
    sourceType = this.$sources[i].getAttribute('type');
    if (this.media.canPlayType(sourceType)) {
      this.mediaFile = this.$sources[i].getAttribute('src'); 
      this.descFile = this.$sources[i].getAttribute('data-desc-src');       
      if (this.descFile) { 
        this.hasOpenDesc = true;         
      }
      else { 
        this.hasOpenDesc = false;
      }
    }
  }*/
        
  // If using open description (as determined previously based on prefs & availability) 
  // swap media file now 
  this.initializing = true;
  if (this.openDescOn === true) { 
    this.swapDescription();
  }
  this.initializing = false;
  
  if (this.mediaType === 'video') { 
    // Eventually add support for synchronized sign language video 
    this.hasSignLanguage = false; //if true, adds a non-functional button to control bar 
  }     
  return true;  
}; 
AblePlayer.prototype.provideFallback = function() { 
          
  // provide ultimate fallback for users with no HTML media support, nor JW Player support 
  // this could be links to download the media file(s) 
  // but for now is just a message   
  
  var msg, msgContainer; 
  
  msg = this.tt['errorNoPlay'] + ' ' + this.tt[this.mediaType] + '. ';
  msgContainer = $('<div>',{
    'class' : 'ump-fallback',
    'role' : 'alert'
  });
  this.$media.before(msgContainer);     
  msgContainer.text(msg);  
};
AblePlayer.prototype.getDimensions = function() { 

  // override default dimensions with width and height attributes of media element, if present
  if (this.$media.attr('width')) { 
    this.playerWidth = this.$media.attr('width');
    if (this.$media.attr('height')) { 
      this.playerHeight = this.$media.attr('height');
    }
  }
};
AblePlayer.prototype.setButtons = function() { 

  this.playButtonImg = '../images/media-play-' +  this.iconColor + '.png';
  this.pauseButtonImg = '../images/media-pause-' +  this.iconColor + '.png';
  this.rewindButtonImg = '../images/media-rewind-' +  this.iconColor + '.png';
  this.forwardButtonImg = '../images/media-forward-' +  this.iconColor + '.png';
  this.slowerButtonImg = '../images/media-slower-' +  this.iconColor + '.png';
  this.fasterButtonImg = '../images/media-faster-' +  this.iconColor + '.png';
  this.muteButtonImg = '../images/media-mute-' +  this.iconColor + '.png';
  this.volumeButtonImg = '../images/media-volume-' +  this.iconColor + '.png';
  this.volumeUpButtonImg = '../images/media-volumeUp-' +  this.iconColor + '.png';
  this.volumeDownButtonImg = '../images/media-volumeDown-' +  this.iconColor + '.png';
  this.ccButtonImg = '../images/media-captions-' +  this.iconColor + '.png';
  this.transcriptButtonImg = '../images/media-transcript-' +  this.iconColor + '.png';
  this.descriptionButtonImg = '../images/media-descriptions-' +  this.iconColor + '.png';
  this.signButtonImg = '../images/media-sign-' +  this.iconColor + '.png';
  this.fullscreenButtonImg = '../images/media-fullscreen-' +  this.iconColor + '.png';
  this.prefsButtonImg = '../images/media-prefs-' +  this.iconColor + '.png';
  this.helpButtonImg = '../images/media-help-' +  this.iconColor + '.png';
};
AblePlayer.prototype.initDescription = function() { 

  // set default mode for delivering description (open vs closed) 
  // based on availability and user preference        

  // first, check to see if there's an open-described version of this video  
  // checks only the first source 
  // Therefore, if a described version is provided, 
  // it must be provided for all sources  
  this.descFile = this.$sources.first().attr('data-desc-src');
  if (this.descFile) { 
    if (this.debug) {
      console.log('This video has a described version: ' + this.descFile);      
    }
    this.hasOpenDesc = true;             
  }
  else { 
    if (this.debug) {
      console.log('This video does not have a described version');      
    }
    this.hasOpenDesc = false;              
  } 
  // now compare prefs with available sources  
  if (this.prefDesc === 1) { 
    // user prefers description 
    if (this.hasOpenDesc === true && this.hasClosedDesc === true) { 
      // both open and closed description are available. 
      if (this.prefClosedDesc === 1) { 
        // user prefers closed description 
        this.useDescType = 'closed';
        this.openDescOn = false;
        this.closedDescOn = true;
      }
      else { 
        this.useDescType = 'open';
        this.openDescOn = true;
        this.closedDescOn = false;
      }
    }
    else if (this.hasOpenDesc === true) { 
      // only open description is available
      this.useDescType = 'open';
      this.openDescOn = true;
      this.closedDescOn = false;
    }
    else if (this.hasClosedDesc === true) { 
      // only closed description is available 
      if (this.prefClosedDesc === 1) { 
        this.useDescType = 'closed';
        this.openDescOn = false;
        this.closedDescOn = true;
      }
      else { 
        // user does not want closed description
        this.useDescType = null;
        this.openDescOn = false;
        this.closedDescOn = false;
      }
    }
    else { 
      // no description is available
      this.useDescType = null;
      this.openDescOn = false;
      this.closedDescOn = false;
    }
  }
  else { 
    // user does not prefer description 
    this.useDescType = null;
    this.openDescOn = false;
    this.closedDescOn = false;
  }
  if (this.debug) { 
    this.debugDescription();
  }
};
AblePlayer.prototype.addPrefsForm = function() { 

  var prefsDiv, introText, prefsIntro, 
    featuresFieldset, featuresLegend, 
    keysFieldset, keysLegend, 
    i, thisPref, thisDiv, thisId, thisLabel, thisCheckbox, 
    thisObj; 

  thisObj = this;
  // define all the parts
  prefsDiv = $('<div>',{ 
    'class': 'ump-prefs-form',
    role: 'form'
  });
  introText = '<p>Saving your preferences requires cookies.</p>\n';
    
  prefsIntro = $('<p>',{ 
    html: introText
  });

  featuresFieldset = $('<fieldset>');
  featuresLegend = $('<legend>Features</legend>');      
  featuresFieldset.append(featuresLegend);  

  keysFieldset = $('<fieldset>');
  keysLegend = $('<legend>Modifier Keys</legend>');       
  keysFieldset.append(keysLegend);  

  for (i=0; i<this.prefs.length; i++) { 
    thisPref = this.prefs[i]['name'];
    thisDiv = $('<div>');
    thisId = this.mediaId + '_' + thisPref;   
    thisLabel = $('<label for="' + thisId + '"> ' + this.prefs[i]['label'] + '</label>');
    thisCheckbox = $('<input>',{
      type: 'checkbox',
      name: thisPref,
      id: thisId,
      value: 'true'
    });
    thisDiv.append(thisCheckbox).append(thisLabel);
    // check current active value for this preference 
    if (this[thisPref] === 1) { 
      thisCheckbox.prop('checked',true);
    }     
    if (i === 0 || i === 1) { // this is a key preference
      keysFieldset.append(thisDiv);     
    }
    else { // this is a feature preference
      featuresFieldset.append(thisDiv);
    }     
  }
  // Now assemble all the parts   
  prefsDiv
    .append(prefsIntro)
    .append(keysFieldset);
  if (this.mediaType === 'video') { 
    prefsDiv
      .append(featuresFieldset);
  }         
  this.$umpDiv.append(prefsDiv); 

  var dialog = new AccessibleDialog(prefsDiv, 'Preferences', 'Modal dialog of player preferences.', '25em');

  // Add save and cancel buttons.
  prefsDiv.append('<hr>');
  var saveButton = $('<button>Save</button>');
  var cancelButton = $('<button>Cancel</button>');
  saveButton.click(function () {
    dialog.hide();
    thisObj.savePrefs();
  });
  cancelButton.click(function () {
    dialog.hide();
  });

  prefsDiv.append(saveButton);
  prefsDiv.append(cancelButton);
  this.prefsDialog = dialog;
};

AblePlayer.prototype.addHelp = function() {   
  // create help text that will be displayed in a JQuery-UI dialog 
  // if user clicks the Help button   
  
  var helpText, i, label, key, helpDiv; 
  
  helpText = '<p>' + this.tt.helpKeys + '</p>\n';
  helpText += '<ul>\n';
  for (i=0; i<this.controls.length; i++) { 
    if (this.controls[i] === 'play') { 
      label = this.tt.play + '/' + this.tt.pause;
      key = 'p </b><em>' + this.tt.or + '</em><b> ' + this.tt.spacebar;
    }
    else if (this.controls[i] === 'stop') { 
      label = this.tt.stop;
      key = 's';
    }
    else if (this.controls[i] === 'rewind') { 
      label = this.tt.rewind + ' ' + this.seekInterval + ' ' + this.tt.seconds;
      key = 'r';
    }
    else if (this.controls[i] === 'forward') { 
      label = this.tt.forward + ' ' + this.seekInterval + ' ' + this.tt.seconds;
      key = 'f';
    }
    else if (this.controls[i] === 'mute') { 
      label = this.tt.mute;
      key = 'm';
    }
    else if (this.controls[i] === 'volumeUp') { 
      label = this.tt.volumeUp;
      key = 'u </b><em>' + this.tt.or + '</em><b> 1-5';
    }
    else if (this.controls[i] === 'volumeDown') { 
      label = this.tt.volumeDown;
      key = 'd </b><em>' + this.tt.or + '</em><b> 1-5';
    }
    else if (this.controls[i] === 'captions') { 
      label = this.tt.toggle + ' ' + this.tt.captions;
      key = 'c';
    }
    else if (this.controls[i] === 'descriptions') { 
      label = this.tt.toggle + ' ' + this.tt.descriptions;
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
      helpText += '<li><b><span class="ump-help-modifiers">'; 
      if (this.prefAltKey === 1) { 
        helpText += 'Alt + ';
      }
      if (this.prefCtrlKey === 1) { 
        helpText += 'Control + ';
      }
      helpText += '</span>' + key + '</b> = ' + label + '</li>\n';
    }
  }
  helpText += '</ul>\n';
  helpText += '<p>' + this.tt.helpKeysDisclaimer + '</p>\n';

  helpDiv = $('<div>',{ 
    'class': 'ump-help-div',
    'html': helpText
  });
  this.$umpDiv.append(helpDiv); 
    

  var dialog = new AccessibleDialog(helpDiv, this.tt.helpTitle, 'Modal dialog of help information.', '40em');

  helpDiv.append('<hr>');
  var okButton = $('<button>' + this.tt.ok + '</button>');
  okButton.click(function () {
    dialog.hide();
  });

  helpDiv.append(okButton);
  this.helpDialog = dialog;
};
AblePlayer.prototype.setCookie = function(cookieValue) { 
  if ($.isFunction($.cookie)) { 
    // set cookie that expires in 90 days 
    $.cookie('Able-Player',cookieValue,90);  
  }
};
AblePlayer.prototype.getCookie = function() { 
  if ($.isFunction($.cookie)) { 
    return $.cookie('Able-Player');
  }
};
AblePlayer.prototype.getPrefs = function() { 

  // defines the User Preferences array and set default user variables 
  // get prefs from cookie if one exists; otherwise use defaults 
  // store prefs to cookie for future reference
  
  var cookie, cookieLength, i, thisPref, thisValue, defaultValue;
  
  this.prefs = [];

  // modifier keys preferences apply to both audio and video 
  this.prefs[0] = [];
  this.prefs[0]['name'] = 'prefAltKey'; // use alt key with shortcuts 
  this.prefs[0]['label'] = this.tt.prefAltKey;
  this.prefs[0]['default'] = 0; // off because currently not capturing this reliably across all browsers

  this.prefs[1] = [];
  this.prefs[1]['name'] = 'prefCtrlKey'; // use ctrl key with shortcuts
  this.prefs[1]['label'] = this.tt.prefCtrlKey;
  this.prefs[1]['default'] = 0;  // // off because currently not capturing this reliably across all browsers

  if (this.mediaType === 'video') { // features prefs apply only to video

    this.prefs[2] = [];
    this.prefs[2]['name'] = 'prefCaptions'; // closed captions default state 
    this.prefs[2]['label'] = this.tt.prefCaptions;
    this.prefs[2]['default'] = 1; // on because many users can benefit

    this.prefs[3] = [];
    this.prefs[3]['name'] = 'prefDesc'; // audio description default state 
    this.prefs[3]['label'] = this.tt.prefDesc;
    this.prefs[3]['default'] = 0; // off because users who don't need it might find it distracting

    this.prefs[4] = [];
    this.prefs[4]['name'] = 'prefClosedDesc'; // use closed description if available
    this.prefs[4]['label'] = this.tt.prefClosedDesc;
    this.prefs[4]['default'] = 0; // off because experimental

    this.prefs[5] = [];
    this.prefs[5]['name'] = 'prefVisibleDesc'; // visibly show closed description (if avilable and used)
    this.prefs[5]['label'] = this.tt.prefVisibleDesc;
    this.prefs[5]['default'] = 1; // on because sighted users probably want to see this cool feature in action 
    
    this.prefs[6] = [];
    this.prefs[6]['name'] = 'prefHighlight'; // highlight transcript as media plays
    this.prefs[6]['label'] = this.tt.prefHighlight;
    this.prefs[6]['default'] = 1; // on because many users can benefit

    this.prefs[7] = [];
    this.prefs[7]['name'] = 'prefTabbable'; // tab-enable transcript 
    this.prefs[7]['label'] = this.tt.prefTabbable;
    this.prefs[7]['default'] = 0; // off because if users don't need it, it impedes tabbing elsewhere on the page
  }
  else { 

    this.prefs[2] = [];
    this.prefs[2]['name'] = 'prefHighlight'; // highlight transcript as media plays
    this.prefs[2]['label'] = this.tt.prefHighlight;
    this.prefs[2]['default'] = 1; // on because many users can benefit

    this.prefs[3] = [];
    this.prefs[3]['name'] = 'prefTabbable'; // tab-enable transcript 
    this.prefs[3]['label'] = this.tt.prefTabbable;
    this.prefs[3]['default'] = 0; // off because if users don't need it, it impedes tabbing elsewhere on the page    
  }
    
  // see if user has prefs stored in a cookie   
  cookieLength = this.prefs.length;
  cookie = this.getCookie();
  if (typeof cookie === 'string') { 
    if (cookie.length === cookieLength) { 
      for (i=0; i<cookieLength; i++) { 
        thisPref = this.prefs[i]['name'];
        thisValue = parseInt(cookie.substr(i,1)); // cookie is a sting ("1" or "0"), convert to integer
        // the following defines all pref variables, e.g., this.prefCaptions, this.prefDesc 
        this[thisPref] = thisValue; 
      }
    }
    else { // cookie is wrong size. Use defaults
      cookie = false;
    }
  }
  if (!cookie) { 
    cookie = '';
    for (i=0; i<this.prefs.length; i++) { 
      thisPref = this.prefs[i]['name'];
      defaultValue = this.prefs[i]['default'];
      cookie += defaultValue;
      this[thisPref] = defaultValue; 
    }
    this.setCookie(cookie);     
  }
};
AblePlayer.prototype.savePrefs = function() { 
  // called when user saves the Preferences form
  // update cookie with new value 
  
  var numChanges, cookie, i, thisPref, modHelp;  

  numChanges = 0;
  cookie = '';
  for (i=0; i<this.prefs.length; i++) {
    thisPref = this.prefs[i]['name'];
    if ($('input[name="' + thisPref + '"]').is(':checked')) { 
      cookie += '1';
      if (this[thisPref] === 1) { 
        // nothing has changed 
      }
      else { 
        // user has just turned this pref on  
        this[thisPref] = 1;
        numChanges++;
      }     
    }
    else { // thisPref is not checked
      cookie += '0';
      if (this[thisPref] === 1) { 
        // user has just turned this pref off 
        this[thisPref] = 0;
        numChanges++;
      }
      else { 
        // nothing has chaged
      }     
    }
  }
  if (numChanges > 0) {     
    this.setCookie(cookie);     
    // make changes to current envivoronment based on new prefs 

    // modifier keys (update help text) 
    if (this.prefAltKey === 1) { 
      modHelp = 'Alt + ';
    }
    else { 
      modHelp = '';
    }
    if (this.prefCtrlKey === 1) { 
      modHelp += 'Control + ';
    }
    $('.ump-help-modifiers').text(modHelp);     

    // description visibility 
    if (this.prefVisibleDesc === 1) { 
      $('.ump-descriptions').removeClass('ump-clipped');      
    }
    else { 
      $('.ump-descriptions').addClass('ump-clipped');     
    }
    this.showAlert(this.tt.preferencesuccess);
      
    // tabbable transcript 
    if (this.prefTabbable === 1) { 
      $('.ump-transcript span.ump-transcript-seekpoint').attr('tabindex','0');     
    } 
    else { 
      $('.ump-transcript span.ump-transcript-seekpoint').removeAttr('tabindex');
    }
  } 
  else { 
    this.showAlert(this.tt.prefNoChange);   
  }
};
AblePlayer.prototype.setupAlert = function() { 
  var alertElement = $('.ump-alert-div');
  var dialog = new AccessibleDialog(alertElement, this.tt.done + '.', 'Modal dialog alert.');
  this.alertBox = $('<div></div>');
  
  alertElement.append(this.alertBox);
  alertElement.append('<hr>');
  var okButton = $('<button>' + this.tt.ok + '</button>');
  okButton.click(function () {
    dialog.hide();
  });

  alertElement.append(okButton);
  this.alertDialog = dialog;
};

AblePlayer.prototype.showAlert = function(msg) { 
  this.alertBox.text(msg);
  this.alertDialog.show();
};

AblePlayer.prototype.updateTranscript = function() {
  // Update transcript.
  var div = generateTranscript(this.captions || [], this.descriptions || []);
  this.$transcriptDiv.html(div);

  var thisObj = this;

  // Make transcript tabbable if preference is turned on.
  if (this.prefTabbable === 1) { 
    $('.ump-transcript span.ump-transcript-seekpoint').attr('tabindex','0');
  }     

  // handle clicks on text within transcript 
  // Note #1: Only one transcript per page is supported
  // Note #2: Pressing Enter on an element that is not natively clickable does NOT trigger click() 
  // Forcing this elsewhere, in the keyboard handler section  
  if ($('.ump-transcript').length > 0) {  
    $('.ump-transcript span.ump-transcript-seekpoint').click(function(event) { 
      var spanStart = $(this).attr('data-start');
      if (thisObj.player === 'html5') { 
        thisObj.seekTo(spanStart);
      }
      else { 
        // jw player 
        jwplayer(thisObj.jwId).seek(spanStart);
      }
      // change play button to pause button
      thisObj.$playpauseButton.attr('title',thisObj.tt.pause); 
      if (thisObj.controllerFont === 'icomoon') {
        thisObj.$playpauseButton.find('span').removeClass('icon-play').addClass('icon-pause'); 
      }
      else { 
        thisObj.$playpauseButton.find('img').attr('src',thisObj.pauseButtonImg); 
      }
      
      // A hack for now: this keeps clicks on seekpoints from unlocking the scrollbar.
      event.stopPropagation();
    });
  }
}

// Resizes all relevant player attributes.
AblePlayer.prototype.resizePlayer = function (width, height) {
  this.$media.height(height);
  this.$media.width(width);
  this.$captionDiv.width(width);
  this.$descDiv.width(width);
  if (this.$vidcapContainer) {
    this.$vidcapContainer.height(height);
    this.$vidcapContainer.width(width); 
  }

  if (this.jwPlayer) {
    this.jwPlayer.resize(width, height);
  }

  if (this.resizeSeekBar) {
    this.seekBar.setWidth(width - this.widthUsedBeforeSeekBar);
  }
};

AblePlayer.prototype.addEventListeners = function() { 

  var thisObj, whichButton, thisElement; 
  
  // Save the current object context in thisObj for use with inner functions.
  thisObj = this;

  // Appropriately resize media player for full screen.
  $(window).resize(function () {
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        thisObj.modalFullscreenActive) {
      var newHeight = $(window).height() - thisObj.$playerDiv.height() - thisObj.$descDiv.height();
      thisObj.resizePlayer($(window).width(), newHeight);
    }
    else {
      thisObj.resizePlayer(thisObj.playerWidth, thisObj.playerHeight);
    }
  });

  // Handle seek bar events.
  this.seekBar.bodyDiv.on('startTracking', function (event) {
    thisObj.pauseMedia();
  }).on('tracking', function (event, position) {
    thisObj.refreshControls();
  }).on('stopTracking', function (event, position) {
    // Seek will automatically call play.
    thisObj.seekTo(position);
  });

  // handle clicks on player buttons 
  this.$controllerDiv.find('button').click(function(){  
    whichButton = $(this).attr('class').split(' ')[0].substr(19); 
    if (whichButton === 'play') { 
      thisObj.handlePlay();
    }
    else if (whichButton === 'stop') { 
      thisObj.handleStop();
    }
    else if (whichButton === 'rewind') { 
      thisObj.handleRewind();
    }
    else if (whichButton === 'forward') { 
      thisObj.handleForward();        
    }
    else if (whichButton === 'mute') { 
      thisObj.handleMute();
    }
    else if (whichButton === 'volumeUp') { 
      thisObj.handleVolume('up');
    }
    else if (whichButton === 'volumeDown') { 
      thisObj.handleVolume('down');
    }
    else if (whichButton === 'faster') { // experimental. Not currently used
      thisObj.handleSpeed('faster');
    }
    else if (whichButton === 'slower') { // experimental. Not currently used
      thisObj.handleSpeed('slower');
    }     
    else if (whichButton === 'captions') { 
      thisObj.handleCaptionToggle();
    }
    else if (whichButton === 'descriptions') { 
      thisObj.handleDescriptionToggle();
    }
    else if (whichButton.substr(0,4) === 'sign') { 
      // not yet supported
    }
    else if (whichButton === 'preferences') { 
      thisObj.handlePrefsClick();
    }
    else if (whichButton === 'help') { 
      thisObj.handleHelpClick();
    }
    else if (whichButton === 'transcript') {
      thisObj.handleTranscriptToggle();
    }
    else if (whichButton === 'fullscreen') {
      thisObj.handleFullscreenToggle();
    }
  });
    
  // handle keystrokes (using DHTML Style Guide recommended key combinations) 
  // http://dev.aol.com/dhtml_style_guide/#mediaplayer
  // Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
  // NOTE #1: Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
  // The rest are reasonable best choices  
  // NOTE #2: If there are multiple players on a single page, keystroke handlers 
  // are only bound to the FIRST player 
  if (this.umpIndex === 0) { 
    $(window).keypress(function(e) {    
      if (e.which === 32) { // spacebar = play/pause
        thisObj.handlePlay();
      }
      else if (e.which === 112) { // p = play/pause        
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handlePlay();
        }
      }
      else if (e.which === 115) { // s = stop 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleStop();
        }
      }
      else if (e.which === 109) { // m = mute 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleMute();
        }
      }
      else if (e.which === 117) { // u = volume up 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleVolume('up');
        }
      }
      else if (e.which === 100) { // d = volume down 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleVolume('down');
        }
      }
      else if (e.which >= 49 && e.which <= 53) { // set volume 1-5
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleVolume(e.which);
        }
      }
      else if (e.which === 99) { // c = caption toggle 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleCaptionToggle();      
        }
      }
      else if (e.which === 102) { // f = forward 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleForward();
        }
      }
      else if (e.which === 114) { // r = rewind (could use B for back???) 
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleRewind();
        }
      }
      else if (e.which === 110) { // n = narration (description)
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleDescriptionToggle();
        }
      }     
      else if (e.which === 104) { // h = help
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleHelpClick();
        }
      }     
      else if (e.which === 116) { // t = preferences
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handlePrefsClick();
        }
      }     
      else if (e.which === 104) { // h = help
        if (thisObj.usingModifierKeys(e)) { 
          thisObj.handleHelpClick();
        }
      }     
      else if (e.which === 13) { // Enter 
        thisElement = $(document.activeElement);
        if (thisElement.prop('tagName') === 'SPAN') { 
          // register a click on this SPAN 
          // if it's a transcript span the transcript span click handler will take over
          thisElement.click();
        }
        else if (thisElement.prop('tagName') === 'LI') { 
          thisElement.click();
        }
      }
    });
  }
    
  // handle clicks on playlist items
  if (this.$playlist) {
    this.$playlist.click(function() { 
      thisObj.playlistIndex = $(this).index();
      thisObj.swapSource(thisObj.playlistIndex);  
    });
  }

  // add listeners for media events 
  if (this.player === 'html5') {
    // NOTE: iOS does not support autoplay, 
    // and no events are triggered until media begins to play 
    this.$media
      .on('emptied',function() { 
        if (thisObj.debug) { 
          console.log('media has been emptied');        
        }
      })        
      .on('loadedmetadata',function() {
        if (thisObj.debug) {
          console.log('meta data has loaded');  
        }
        thisObj.onMediaNewSourceLoad();
      })
      .on('canplay',function() { 
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('canplaythrough',function() { 
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          // try again, if seeking failed on canplay
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('playing',function() { 
        thisObj.refreshControls();
      })
      .on('ended',function() {
        thisObj.onMediaComplete();
      })
      .on('waiting',function() { 
        thisObj.refreshControls();
      })
      .on('durationchange',function() { 
        // Display new duration.
        thisObj.refreshControls();
      })
      .on('timeupdate',function() { 
        thisObj.onMediaUpdateTime();
      })
      .on('play',function() { 
        if (thisObj.debug) { 
          console.log('media play event');        
        }
      })
      .on('pause',function() { 
        thisObj.onMediaPause();
      })
      .on('ratechange',function() { 
        if (thisObj.debug) { 
          console.log('media ratechange');        
        }
      })
      .on('volumechange',function() { 
        if (thisObj.debug) { 
          console.log('media volume change');       
        }
      })
      .on('error',function() { 
        if (thisObj.debug) { 
          switch (thisObj.media.error.code) { 
            case 1: 
              console.log('HTML5 Media Error: MEDIA_ERR_ABORTED');
              break;
            case 2: 
              console.log('HTML5 Media Error: MEDIA_ERR_NETWORK ');
              break;
            case 3: 
              console.log('HTML5 Media Error: MEDIA_ERR_DECODE ');
              break;
            case 4: 
              console.log('HTML5 Media Error: MEDIA_ERR_SRC_NOT_SUPPORTED ');
              break;
          }
        }
      });
  }
  else { 
    // add listeners for JW Player events 
    jwplayer(thisObj.jwId)
      .onTime(function() {
        thisObj.onMediaUpdateTime();
      })
      .onComplete(function() {
        thisObj.onMediaComplete();
      })
      .onReady(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onReady event fired');
        }
        // remove JW Player from tab order. 
        // We don't want users tabbing into the Flash object and getting trapped
        $('#' + thisObj.jwId).removeAttr('tabindex'); 

        if (thisObj.startTime > 0) { 
          // UMP has been initialized with a startTime 
          // e.g., from a search result or link in a transcript
          // ONE TIME ONLY - set currentTime to startTime and begin playing
          if (!thisObj.startedPlaying) {          
            // JW Player doesn't download media until it's needed  
            // Therefore, can't seek() until video has started playing 
            // This is why seek() works with Forward and Back buttons, but not with startTime 
            // The following is a hack: Start and immediately stop the player. 
            // This triggers a media download, which enables seek() to work. 
            // http pseudo-streaming would probably be a better solution, but isn't supported yet...
            // jwplayer(thisObj.jwId).play(true);
            // jwplayer(thisObj.jwId).play(false);
            // jwplayer(thisObj.jwId).seek(thisObj.startTime);
            thisObj.startedPlaying = true;
          }
        }

        thisObj.refreshControls();
      })
      .onSeek(function(event) { 
        // this is called when user scrubs ahead or back 
        // but not when seek() is called - OR IS IT???
        // After the target offset is reached, JW Player automatically plays media at that point  
        if (thisObj.debug) { 
          console.log('Seeking to ' + event.position + '; target: ' + event.offset);          
        }

        thisObj.refreshControls();
      })
      .onPlay(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onPlay event fired');
        }

        thisObj.refreshControls();
      })
      .onPause(function() { 
        thisObj.onMediaPause();
      })
      .onBuffer(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onBuffer event fired');
        }       
        thisObj.refreshControls();
      })
      .onIdle(function(e) { 
        if (thisObj.debug) { 
          console.log('JW Player onIdle event fired');
        }

        thisObj.refreshControls();
      })
      .onMeta(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onMeta event fired');
        }       
      })
      .onPlaylist(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onPlaylist event fired');
        }

        // Playlist change includes new media source.
        thisObj.onMediaNewSourceLoad();
      });
  }   
};

// Media events
AblePlayer.prototype.onMediaUpdateTime = function () {
  if (this.startTime && !this.startedPlaying) { 
    // try seeking again, if seeking failed on canplay or canplaythrough
    this.seekTo(this.startTime);
  }       

  // show captions, even for JW Player.
  // We're doing this ourself because JW Player's caption support is not great 
  // e.g., there's no way to toggle JW captions via the JavaScript API  
  if (this.captionsOn) { 
    this.showCaptions();
  }

  // show highlight in transcript 
  if (this.prefHighlight === 1) {
    this.highlightTranscript(this.getElapsed()); 
  }

  if (this.player === 'html5') {
    if (this.closedDescOn && this.useDescType === 'closed') { 
      this.showDescription();
    }
  }
  else { // JW player
    // show description 
    // Using our own description solutions rather than JW Player's MP3 solution 
    // JW's solution, though innovative, doesn't seem to be a high priority for JW devlopers
    if (this.closedDescOn) { 
      this.showDescription();
    }    
  }

  this.refreshControls();
}

AblePlayer.prototype.onMediaPause = function () {
  if (this.debug) { 
    console.log('media pause event');       
  }
}

AblePlayer.prototype.onMediaComplete = function () {
  // if there's a playlist, advance to next item and start playing  
  if (this.hasPlaylist) { 
    if (this.playlistIndex === (this.playlistSize - 1)) { 
      // this is the last track in the playlist
      if (this.loop) { 
        this.playlistIndex = 0;              
        this.swapSource(0);
      }             
    }
    else { 
      // this is not the last track. Play the next one. 
      this.playlistIndex++;
      this.swapSource(this.playlistIndex)
    }
  }

  this.refreshControls();
}

AblePlayer.prototype.onMediaNewSourceLoad = function () {
  if (this.swappingSrc === true) { 
    // new source file has just been loaded 
    // should be able to play 
    if (this.player === 'html5') {
      this.media.play();
    }
    else if (this.player === 'jw') {
      var player = this.jwPlayer;
      // Seems to be a bug in JW player, where this doesn't work when fired immediately.
      // Thus have to use a setTimeout
      setTimeout(function () {
        player.play(true);
      }, 500);
    }
    this.swappingSrc = false; // swapping is finished
    this.refreshControls();
  }
}

// End Media events

AblePlayer.prototype.addControls = function() {   
  // determine which controls to show based on several factors: 
  // mediaType (audio vs video) 
  // availability of tracks (e.g., for closed captions & audio description) 
  // browser support (e.g., for sliders and speedButtons) 
  // user preferences (???)      
  // some controls are aligned on the left, and others on the right 
  
  var buttonWidth, leftControls, rightControls, useSpeedButtons, useFullScreen, 
    i, j, controls, controllerSpan, control, 
    buttonImg, buttonImgSrc, buttonTitle, newButton, iconClass, buttonIcon,
    leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle, 
    controllerStyles, vidcapStyles;  

  var baseSliderWidth = 100;
  buttonWidth = 40; // in pixels, including margins, padding + cusion for outline 

  // Removed rewind/forward in favor of seek bar.
  var controlLayout = {
    'ul': ['play','stop' /*,'rewind','forward'*/],
    'ur': [],
    'bl': [],
    'br': []
  }

  var controlsEnabled = [];

  if (this.$media.playbackRate) {     
    // browser supports playbackRate! 
    // so far, confirmed that Chrome 23.x supports faster playback without sound (i.e., fast forward)
    // IE 9 and Opera 12.1 support faster playback (with sound!)  
    // Firefox 13.x does not support it at all 
    // No browser supports slower playback (unless I'm misunderstanding this feature)
    // According to the HTML5 spec: 
    // "If the effective playback rate is positive or zero, then the direction of playback is forwards. "
    // "Otherwise, it is backwards." 
    // So, I'm concluding that no browsers support backwards playback 
    useSpeedButtons = false; // until better understood &/or supported, not using
  }
  else { 
    useSpeedButtons = false;
  }
  if (useSpeedButtons) { 
    controlLayout['ul'].push('slower'); 
    controlLayout['ul'].push('faster');
  }

  if (this.useSlider) {
    controlLayout['ur'].push('seek');
  }
    
  rightControls = [];
  if (this.mediaType === 'video') { 
    if (this.hasCaptions) {
      controlLayout['bl'].push('captions'); //closed captions
    }
    if (this.hasOpenDesc || this.hasClosedDesc) { 
      controlLayout['bl'].push('descriptions'); //audio description 
    }
    if (this.hasSignLanguage) { 
      controlLayout['bl'].push('sign'); // sign language
    }
  }
  if (this.includeTranscript) {
    controlLayout['bl'].push('transcript');
  }
  // test for browser support for volume before displaying volume-related buttons 
  if (this.browserSupportsVolume()) { 
    controlLayout['bl'].push('mute');
    controlLayout['bl'].push('volumeUp');
    controlLayout['bl'].push('volumeDown'); 
  }
  if (this.mediaType === 'video') { 
    controlLayout['bl'].push('fullscreen');
  }
  controlLayout['br'].push('preferences');
  // create the hidden form that will be triggered by a click on the Preferences button
  this.addPrefsForm();        

  controlLayout['br'].push('help');
  

  var sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};
  // now step separately through left and right controls
  var lastWidth = 0;
  var widthUsed = 0;
  for (i = 0; i <= 3; i++) {
    controls = controlLayout[sectionByOrder[i]];
    if ((i % 2) === 0) {        
      controllerSpan = $('<span>',{
        'class': 'ump-left-controls'
      });
    }
    else { 
      controllerSpan = $('<span>',{
        'class': 'ump-right-controls'
      });
    }
    for (j=0; j<controls.length; j++) { 
      control = controls[j];
      if (control === 'seek') { 
        var sliderDiv = $('<div class="ump-seekbar"></div>');
        controllerSpan.append(sliderDiv);

        var width;
        if ((i % 2) === 0) {
          width = Math.min(baseSliderWidth, this.playerWidth - widthUsed - 50);
          this.resizeSeekBar = false;
        }
        else {
          // When on right hand side, consume available width.
          width = this.playerWidth - widthUsed - 50;
          this.resizeSeekBar = true;
          // We store this for later to assist in resizing without having to recalculate button widths.
          // Only the slider changes sizes on resizing, and only if it's on the right hand side.
          this.widthUsedBeforeSeekBar = widthUsed;
        }
        widthUsed += width;
        this.seekBar = new AccessibleSeekBar(sliderDiv, width);
      }
      else {
        widthUsed += buttonWidth;
        // this control is a button 
        buttonImgSrc = 'images/media-' + control + '-' + this.iconColor + '.png';
        buttonTitle = this.getButtonTitle(control); 
        newButton = $('<button>',{ 
          'type': 'button',
          'tabindex': '0',
          'title': buttonTitle,
          'class': 'ump-button-handler-' + control
        });        
        if (this.iconType === 'font') { 
          // add span for icon fonts 
          if (control === 'mute') { 
            if (this.volume > 0) { 
              iconClass = 'icon-volume';
            }
            else { 
              iconClass = 'icon-mute';
            }
          }
          else { 
            iconClass = 'icon-' + control;
          }
          buttonIcon = $('<span>',{ 
            'class': iconClass,
            'aria-hidden': 'true'
          })   
/*        // this is recommended for a11y in the documentation 
          // but we have title on the container <button>, so I don't think this is needed
          var buttonLabel = $('<span>',{
            'class': 'ump-clipped'
          }).text(buttonTitle);
          newButton.append(buttonIcon,buttonLabel);
*/          

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
        if (control === 'captions') { 
          if (!this.prefCaptions || this.prefCaptions !== 1) { 
            // captions are available, but user has them turned off 
            newButton.addClass('buttonOff').attr('title',this.tt.turnOn + ' ' + this.tt.captions);
          }
        }
        else if (control === 'descriptions') {      
          if (!this.prefDesc || this.prefDesc !== 1) { 
            // user prefer non-audio described version 
            // Therefore, load media without description 
            // Description can be toggled on later with this button  
            newButton.addClass('buttonOff').attr('title',this.tt.turnOn + ' ' + this.tt.descriptions);              
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
        else if (control === 'descriptions') {        
          this.$descButton = newButton; 
          // gray out description button if description is not active 
          if (!(this.openDescOn || this.closedDescOn)) {  
            this.$descButton.addClass('buttonOff').attr('title',this.tt.turnOn + ' ' + this.tt.descriptions);
          }
        }
        else if (control === 'mute') { 
          this.$muteButton = newButton;
        }
        else if (control === 'transcript') {
          this.$transcriptButton = newButton;
        }
        else if (control === 'fullscreen') {
          this.$fullscreenButton = newButton;
        }
      }
    }
    this.$controllerDiv.append(controllerSpan);
    if ((i % 2) == 1) {
      this.$controllerDiv.append('<div style="clear:both;"></div>');
      var width = widthUsed - lastWidth - 10;
      //controllerSpan.css('width', width);
      widthUsed = 0;
      lastWidth = width;
    }
    else {
      var width = widthUsed;
      //controllerSpan.css('width', width);
      widthUsed += 10;
      lastWidth = width;
    }
  }

  // calculate widths of left and right controls
/*  leftWidth = 0;
  for (var ii in leftControls) {
    leftWidth += controlWidths[leftControls[ii]];
  }

  rightWidth = 0;
  for (var ii in rightControls) {
    rightWidth += controlWidths[rightControls[ii]];
  }
  totalWidth = leftWidth + rightWidth;
  if (totalWidth <= this.playerWidth) { 
    // express left and right width in pixels 
    leftWidthStyle = leftWidth + 'px';
    rightWidthStyle = rightWidth + 'px';    
  }    
  else { 
    // express left and right width as a percentage 
    leftWidthStyle = Math.floor((leftWidth/totalWidth)*100) + '%';
    rightWidthStyle = Math.floor((rightWidth/totalWidth)*100) + '%';
    // reduce button size to fit container ??? 
    // or wrap buttons onto new line ??? 
  }*/

  //$('.ump-left-controls').css('width',leftWidth);       
  //$('.ump-right-controls').css('width',rightWidth);       
  
  if (this.mediaType === 'video') { 
    // also set width and height of div.ump-vidcap-container
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
  else { 
    // set controller to combined width of all controls
    // plus 10px separation between left and right controls
  }

  this.$controllerDiv.css('min-height', Math.ceil(i / 2) * 28);
    
  // also add a timer to the status bar
  this.$elapsedTimeContainer = $('<span>',{
    'class': 'ump-elapsedTime',
    text: '0:00'
  });
  this.$durationContainer = $('<span>',{
    'class': 'ump-duration'
  }); 
  this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);       
  
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

AblePlayer.prototype.getIconType = function() { 
  // returns either "font" or "image" 
  // create a temporary play span and check to see if button has font-family == "icomoon" (the default) 
  // if it doesn't, user has a custom style sheet and icon fonts will not display properly 
  // use images as fallback 

  var $tempButton;
     
  // Note: webkit doesn't return calculated styles unless element has been added to the DOM 
  // and is visible; use clip method to satisfy this need yet hide it  
  $tempButton = $('<span>',{ 
    'class': 'icon-play ump-clipped'
  });
  $('body').append($tempButton);

  if (this.iconType === 'font') {   
    // check to be sure user can display icomoon fonts 
    // if not, fall back to images 
    if (window.getComputedStyle) {
      // the following retrieves the computed value of font-family
      // tested in Firefox with "Allow pages to choose their own fonts" unchecked - works! 
      // tested in IE with user-defined style sheet enables - works! 
      // It does NOT account for users who have "ignore font styles on web pages" checked in IE 
      // There is no known way to check for that 
      this.controllerFont = window.getComputedStyle($tempButton.get(0), null).getPropertyValue('font-family');
      if (this.controllerFont) {
        this.controllerFont = this.controllerFont.replace(/["']/g, ''); // strip out single or double quotes 
        if (this.controllerFont === 'icomoon') { 
          this.iconType = 'font';
        }
        else { 
          this.iconType = 'image';
        }
      }
      else { 
        this.iconType = 'image';
      }
    }
    else { // IE 8 and earlier  
      // There is no known way to detect computed font in IE8 and earlier  
      // The following retrieves the value from the style sheet, not the computed font 
      // this.controllerFont = $tempButton.get(0).currentStyle.fontFamily;
      // It will therefore return "icomoon", even if the user is overriding that with a custom style sheet 
      // To be safe, use images   
      this.iconType = 'image';
    }
  }
  if (this.debug) {
    console.log('Using ' + this.iconType + 's for player controls');
    if (this.iconType === 'font') { 
      console.log('User font for controller is ' + this.controllerFont);
    }
  }
  $tempButton.remove();
};
AblePlayer.prototype.getBestColor = function($element) { 
  // TODO: Icon color is currently always white when not using images.
  // Using white here as well for consistency.
  // Remove?
  this.iconColor = 'white';
  return;

  // determine best color (white or black) based on computed background color of jQuery object $element
  // This overrides default iconColor if there is too little contrast due to:  
  // - user having enabled high contrast mode 
  // - user having a custom style sheet that overwrites author's background color 
  // - author has made a bad design decision that compromises contrast (NOT ALLOWED)
  var e, bgColor, regex, useCurrentStyle, colorsOnly, red, green, blue, grayscale; 
  
  e = $element.get(0);
  if (window.getComputedStyle) { // most browsers 
    bgColor = window.getComputedStyle(e, null).getPropertyValue('background-color');
  }
  else { // IE 8 and earlier 
    // use default colors specified in CSS 
    // There is no known way to check for computed styles (i.e., Windows high contrast mode) in IE8 and earlier   
    // Can get current style as defined in CSS, and hope user hasn't overriden them 
    // Also, the color could be expressed in any valid CSS format. Need to convert to RGB to calculate lightness 
    bgColor = e.currentStyle.backgroundColor;
    if (bgColor.indexOf('rgb') === -1) { 
      // this is not an RGB value
      // is it a valid hex value with 3 or 6 characters preceded by #?  
      regex = /.#([0-9a-f]{3}|[0-9a-f]{6})$/i;
      if (regex.test(bgColor)) { 
        // this is a hex value. Convert to RGB 
        bgColor = this.colorHexToRGB(bgColor);
      }
      else if (this.colorNameToHex(bgColor) != false ) {
        // this is a color name 
        bgColor = this.colorHexToRGB(this.colorNameToHex(bgColor));
      }
      else { 
        bgColor = false;
      }
    }
  }
  if (bgColor) { 
    // split RGB value into individual colors
    colorsOnly = bgColor.substring(bgColor.indexOf('(') + 1, bgColor.lastIndexOf(')')).split(/,\s*/);
    red = colorsOnly[0];
    green = colorsOnly[1];
    blue = colorsOnly[2];
    // convert to grayscale (one value, range = 0-255) using the luminosity method
    // http://www.johndcook.com/blog/2009/08/24/algorithms-convert-color-grayscale/
    grayscale = (red * 0.21) + (green * 0.72) + (blue * 0.07); 
    if (grayscale < 128) { 
      // background is dark. Use white buttons
      this.iconColor = 'white';
    }     
    else { 
      // background is light. Use black buttons
      this.iconColor = 'black';
    }
  }
  else { 
    // unable to determine background color. Internet stats favor black... 
    this.iconColor = 'black';
  }
};
AblePlayer.prototype.getIconHexValue =  function(control) { 
  // returns hex value of character in icomoon font
  // may not actually be needde
  switch (control) { 
    case 'play': 
      return '&#xe600';
    case 'pause': 
      return '&#xe601';
    case 'stop': 
      return '&#xe602';
    case 'rewind': 
      return '&#xe603';
    case 'forward': 
      return '&#xe604';
    case 'toStart': 
      return '&#xe605';
    case 'toEnd': 
      return '&#xe606';
    case 'previous': 
      return '&#xe607';
    case 'next': 
      return '&#xe608';
    case 'captions': 
      return '&#xe609';
    case 'sign': 
      return '&#xe60a';
    case 'descriptions': 
      return '&#xe60b';
    case 'volume': 
      return '&#xe60c';
    case 'mute': 
      return '&#xe60d';
    case 'volumeUp': 
      return '&#xe60e';
    case 'volumeDown': 
      return '&#xe60f';
    case 'preferences': 
      return '&#xe610';
    case 'help': 
      return '&#xe611';
    case 'fullscreen': 
      return '&#xe612';
  }   
  return false;
};
AblePlayer.prototype.isUserAgent = function(which) {

  var userAgent; 
  
  userAgent = navigator.userAgent.toLowerCase();
  if (this.debug) { 
    console.log('User agent: ' + userAgent);
  }  
  if (userAgent.indexOf(which) !== -1) {
    return true;
  } 
  else {
    return false;
  }
};
AblePlayer.prototype.isIOS = function(version) { 

  // return true if this is IOS  
  // if version is provided check for a particular version  

  var userAgent, iOS; 
  
  userAgent = navigator.userAgent.toLowerCase();
  iOS = /ipad|iphone|ipod/.exec(userAgent);
  if (iOS) { 
    if (typeof version !== 'undefined') {
      if (userAgent.indexOf('os ' + version) !== -1) { 
        // this is the target version of iOS
        return true;
      }
      else {
        return false;
      }
    }
    else { 
      // no version was specified 
      return true;
    }
  }
  else { 
    // this is not IOS
    return false;
  }
};
AblePlayer.prototype.browserSupportsVolume = function() { 

  // ideally we could test for volume support 
  // However, that doesn't seem to be reliable 
  // http://stackoverflow.com/questions/12301435/html5-video-tag-volume-support

  var userAgent, noVolume; 
  
  userAgent = navigator.userAgent.toLowerCase();
  noVolume = /ipad|iphone|ipod|android|blackberry|windows ce|windows phone|webos|playbook/.exec(userAgent);
  if (noVolume) {
    if (noVolume[0] === 'android' && /firefox/.test(userAgent)) {
      // Firefox on android DOES support changing the volume:
      return true;
    }
    else {
      return false;
    }
  }
  else { 
    // as far as we know, this userAgent supports volume control 
    return true; 
  }
};
AblePlayer.prototype.handlePlay = function(e) { 
  var playerState; 
  
  if (this.player === 'html5') {       
    if (this.media.paused || this.media.ended) { 
      this.media.play();
    } 
    else { 
      // audio is playing. Pause it
      this.media.pause(); 
    }
  }
  else { 
    // jw player
    playerState = jwplayer(this.jwId).getState();
    if (playerState === 'IDLE' || playerState === 'PAUSED') { 
      jwplayer(this.jwId).play(); 
    }
    else { // playerState is 'PLAYING' or 'BUFFERING'. Pause it
      jwplayer(this.jwId).pause(); 
    }
  } 

  this.refreshControls();
};

AblePlayer.prototype.handleStop = function() { 
  if (this.player === 'html5') {             
    // reset media
    this.media.pause(true); 
    this.media.currentTime = 0;
  }
  else { 
    // jw player
    // Instead of calling stop (which unloads the media file), pause and seek to 0 mimicing HTML5 behavior.
    this.jwPlayer.pause(true);
    this.jwPlayer.seek(0);
  }     

  this.refreshControls();
};
AblePlayer.prototype.handleRewind = function() { 

  var targetTime; 
  
  if (this.player === 'html5') {             
    targetTime = this.media.currentTime - this.seekInterval;    
    if (targetTime < 0) {
      this.media.currentTime = 0;
    }
    else {
      this.media.currentTime = targetTime;
    }
  }
  else { 
    // jw player                    
    targetTime = jwplayer(this.jwId).getPosition() - this.seekInterval;     
    if (targetTime < 0) {
      jwplayer(this.jwId).seek(0);
    }
    else {
      jwplayer(this.jwId).seek(targetTime);
    }
  } 
};
AblePlayer.prototype.handleForward = function() { 

  var targetTime; 
  
  if (this.player === 'html5') {             
    targetTime = this.media.currentTime + this.seekInterval;    
    if (targetTime > this.getDuration()) {
      // targetTime would advance beyond the end. Just advance to the end.
      this.media.currentTime = this.getDuration();
    }
    else {
      this.media.currentTime = targetTime;
    }
  }
  else { 
    // jw player                    
    targetTime = jwplayer(this.jwId).getPosition() + this.seekInterval;     
    if (targetTime > this.getDuration()) {
      // targetTime would advance beyond the end. Just advance to the end.
      jwplayer(this.jwId).seek(this.getDuration());
    }
    else {
      jwplayer(this.jwId).seek(targetTime);
    }
  } 
};
AblePlayer.prototype.handleMute = function() { 
  if (this.player === 'html5') {             
    if (this.media.muted) { // unmute
      this.media.muted = false; 
      // change button
      this.$muteButton.attr('title',this.tt.mute); 
      if (this.controllerFont === 'icomoon') {
        this.$muteButton.find('span').removeClass('icon-mute').addClass('icon-volume'); 
      }
      else { 
        this.$muteButton.find('img').attr('src',this.volumeButtonImg); 
      }
      // restore volume to its previous setting
      this.media.volume = this.volume;
    }
    else { // mute 
      this.media.muted = true; 
      // change mute button
      this.$muteButton.attr('title',this.tt.unmute); 
      if (this.controllerFont === 'icomoon') {
        this.$muteButton.find('span').removeClass('icon-volume').addClass('icon-mute'); 
      }
      else { 
        this.$muteButton.find('img').attr('src',this.muteButtonImg); 
      }
    }
  }
  else { 
    // jw player
    if (jwplayer(this.jwId).getMute()) { // true if muted. unmute
      jwplayer(this.jwId).setMute(false); 
      // change button
      this.$muteButton.attr('title',this.tt.mute); 
      if (this.controllerFont === 'icomoon') {
        this.$muteButton.find('span').removeClass('icon-mute').addClass('icon-volume'); 
      }
      else { 
        this.$muteButton.find('img').attr('src',this.volumeButtonImg); 
      }
      // restore volume to its previous setting
      jwplayer(this.jwId).setVolume(this.volume);
    }
    else { // mute 
      jwplayer(this.jwId).setMute(true); 
      // change mute button
      this.$muteButton.attr('title',this.tt.unmute); 
      if (this.controllerFont === 'icomoon') {
        this.$muteButton.find('span').removeClass('icon-volume').addClass('icon-mute'); 
      }
      else { 
        this.$muteButton.find('img').attr('src',this.muteButtonImg); 
      }
    }
  } 
};
AblePlayer.prototype.handleVolume = function(direction) {   
  // direction is either 'up', 'down' or an integer 1-5
  if (this.player === 'html5') {             
    // volume is a range between 0 and 1 
    // up and down increments/decrements by 0.1 
    if (direction === 'up') {    
      if (this.media.muted) { // unmute
        this.media.muted = false; 
        // change button
        this.$muteButton.attr('title',this.tt.mute); 
        if (this.controllerFont === 'icomoon') {
          this.$muteButton.find('span').removeClass('icon-mute').addClass('icon-volume'); 
        }
        else { 
          this.$muteButton.find('img').attr('src',this.volumeButtonImg); 
        }
      }
      if (this.volume < 0.9) {        
        this.volume = Math.round((this.volume + 0.1) * 10) / 10;
      }
      else {
        this.volume = 1;
      }
      this.media.volume = this.volume;        
    }
    else if (direction === 'down') { 
      if (this.volume > 0.1) {        
        this.volume = Math.round((this.volume - 0.1) * 10) / 10;
      }
      else {
        this.volume = 0;
        this.media.muted = true;
        // change button
        this.$muteButton.attr('title',this.tt.unmute); 
        if (this.controllerFont === 'icomoon') {
          this.$muteButton.find('span').removeClass('icon-volume').addClass('icon-mute'); 
        }
        else { 
          this.$muteButton.find('img').attr('src',this.muteButtonImg); 
        }
      }
    }
    else if (direction >= 49 || direction <= 53) { 
      this.volume = (direction-48) * 0.2;
    }
    this.media.volume = this.volume;        
  }
  else { 
    // jw player
    // volume is a range between 0 and 100 
    // up and down increments/decrements by 10 
    if (direction === 'up') {
      if (jwplayer(this.jwId).getMute()) { // currently muted. unmute
        jwplayer(this.jwId).setMute(false); 
        // change button
        this.$muteButton.attr('title',this.tt.mute); 
        if (this.controllerFont === 'icomoon') {
          this.$muteButton.find('span').removeClass('icon-mute').addClass('icon-volume'); 
        }
        else { 
          this.$muteButton.find('img').attr('src',this.volumeButtonImg); 
        }
      }
      if (this.volume < 90) {       
        this.volume = this.volume + 10;
      }
      else {
        this.volume = 100;
      }         
    }
    else if (direction === 'down') { 
      if (this.volume > 10) {       
        this.volume = this.volume - 10;
      }
      else {
        this.volume = 0;
        jwplayer(this.jwId).setMute(true); 
        // change button
        this.$muteButton.attr('title',this.tt.unmute); 
        if (this.controllerFont === 'icomoon') {
          this.$muteButton.find('span').removeClass('icon-volume').addClass('icon-mute'); 
        }
        else { 
          this.$muteButton.find('img').attr('src',this.muteButtonImg); 
        }
      }     
    }
    else if (direction >= 49 || direction <= 53) { 
      this.volume = (direction-48) * 20;
    }
    jwplayer(this.jwId).setVolume(this.volume);       
  }
};
AblePlayer.prototype.handleSpeed = function(direction) { 

  // playback speed is support by HTML5, but not supported well by browsers 
  // currently experimenting with this feature 

  var targetSpeed; 
  
  if (direction === 'faster') { 
    targetSpeed = this.media.playbackRate + 1;
  }
  else if (direction === 'slower') { 
    targetSpeed = this.media.playbackRate - 1;
  }
  this.media.playbackRate = targetSpeed;
};
AblePlayer.prototype.handleCaptionToggle = function() { 

  if (this.captionsOn === true) { 
    // captions are on. Turn them off. 
    this.captionsOn = false;
    this.$captionDiv.hide();
    this.$ccButton.addClass('buttonOff').attr('title',this.tt.show + ' ' + this.tt.captions);
  }
  else { 
    // captions are off. Turn them on. 
    this.captionsOn = true;
    this.$captionDiv.show();
    this.$ccButton.removeClass('buttonOff').attr('title',this.tt.hide + ' ' + this.tt.captions);          
  }
};
AblePlayer.prototype.handleDescriptionToggle = function() { 
  var useDescType; 
  
  if (this.debug) { 
    console.log('toggling description');
    this.debugDescription();
  }

  if (this.hasOpenDesc && this.hasClosedDesc) { 
    // both open and closed description are available. 
    if (this.prefClosedDesc === 1) { 
      // user prefers closed description 
      if (this.closedDescOn === true) { 
        // closed descriptions are on. Turn them off 
        this.closedDescOn = false;
        this.$descDiv.hide(); 
      }
      else { 
        // closed descriptions are off. Turn them on 
        this.closedDescOn = true;
        this.$descDiv.show(); 
      }
    }
    else { 
      // user prefers open description, and it's available 
      this.swapDescription();
    }
  }
  else if (this.hasOpenDesc) { 
    // only open description is available
    if (this.openDescOn) { 
       // open description is on. Turn it off (swap to non-described video)
      this. openDescOn = false;
    }
    else { 
      // open description is off. Turn it on (swap to described version)
      this. openDescOn = true;
    }
    this.swapDescription();
  } 
  else if (this.hasClosedDesc) { 
    // only closed description is available
    useDescType = 'closed';
    if (this.closedDescOn === true) { 
      // closed descriptions are on. Turn them off 
      this.closedDescOn = false;
      this.$descDiv.hide(); 
    }
    else { 
      // closed descriptions are off. Turn them on 
      this.closedDescOn = true; 
      this.$descDiv.show();      
      if (this.prefVisibleDesc === 1) { 
        this.$descDiv.removeClass('ump-clipped'); 
      } 
    }
  }
  this.refreshControls();
};
AblePlayer.prototype.handlePrefsClick = function() { 
  this.prefsDialog.show();
};
AblePlayer.prototype.handleHelpClick = function() { 
  this.helpDialog.show();
};

AblePlayer.prototype.handleTranscriptToggle = function () {
  if (this.$transcriptDiv.is(':visible')) {
    this.$transcriptArea.hide();
    this.$transcriptButton.addClass('buttonOff').attr('title',this.tt.show + ' transcript');
  }
  else {
    this.$transcriptArea.show();
    this.$transcriptButton.removeClass('buttonOff').attr('title',this.tt.hide + ' transcript');
  }
};

AblePlayer.prototype.handleFullscreenToggle = function () {
  var thisObj = this;
  var $el;
  if (this.$umpColumnLeft) {
    // If there's two columns (player + transcript), only expand the lefthand column.
    $el = this.$umpColumnLeft;
  }
  else {
    $el = this.$umpDiv;
  }
  var el = $el[0];

  if (this.nativeFullscreenSupported()) {
    // Note: many varying names for options for browser compatibility.
    // Exit if already in fullscreen.
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.webkitCurrentFullScreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
      else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }

    // If not in full screen, initialize it.
    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
    else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
    else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    }
    else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  }
  else {
    // Non-native fullscreen support through modal dialog.

    // Create dialog on first run through.
    if (!this.fullscreenDialog) {
      var dialogDiv = $('<div>');
      this.fullscreenDialog = new AccessibleDialog(dialogDiv, 'Fullscreen dialog', 'Fullscreen video player', '100%', true, function () { thisObj.handleFullscreenToggle() });
      this.$umpDiv.append(dialogDiv);
    }

    // Track whether paused/playing before moving element; moving the element can stop playback.
    var wasPaused = this.isPaused();

    if (!this.modalFullscreenActive) {
      this.modalFullscreenActive = true;
      this.fullscreenDialog.show();

      // Move player element into fullscreen dialog, then show.
      // Put a placeholder element where player was.
      this.$modalFullscreenPlaceholder = $('<div class="placeholder">');
      this.$modalFullscreenPlaceholder.insertAfter($el);
      $el.appendTo(this.fullscreenDialog.modal);

      // Column left css is 50% by default; set to 100% for full screen.
      if ($el === this.$umpColumnLeft) {
        $el.width('100%');
      }
      var newHeight = $(window).height() - this.$playerDiv.height() - this.$descDiv.height();
      this.resizePlayer($(window).width(), newHeight);

    }
    else {
      this.modalFullscreenActive = false;
      if ($el === this.$umpColumnLeft) {
        $el.width('50%');
      }
      $el.insertAfter(this.$modalFullscreenPlaceholder);
      this.$modalFullscreenPlaceholder.remove();
      this.fullscreenDialog.hide();
      this.resizePlayer(this.playerWidth, this.playerHeight);
    }

    // TODO: JW Player freezes after being moved on iPads (instead of being reset as in most browsers)
    // Need to call setup again after moving?

    // Resume playback if moving stopped it.
    if (!wasPaused && this.isPaused()) {
      if (this.player === 'html5') {
        this.media.play(true);
      }
      else if (this.player === 'jw') {
        this.jwPlayer.play(true);
      }
    }
  }
};

AblePlayer.prototype.nativeFullscreenSupported = function () {
  return document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled;
}

AblePlayer.prototype.handleTranscriptLockToggle = function (val) {
  this.autoScrollTranscript = val;
  this.refreshControls();
};

AblePlayer.prototype.getButtonTitle = function(control) { 
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
    return this.tt.rewind + ' ' + this.seekInterval + ' ' + this.tt.seconds;
  }
  else if (control === 'forward') { 
    return this.tt.forward + ' ' + this.seekInterval + ' ' + this.tt.seconds;
  }
  else if (control === 'captions') {  
    if (this.captionsOn) {
      return this.tt.hide + ' ' + this.tt.captions;
    }
    else { 
      return this.tt.show + ' ' + this.tt.captions;
    }
  }   
  else if (control === 'descriptions') { 
    if (this.closedDescOn) {
      return this.tt.turnOff + ' ' + this.tt.descriptions;
    }
    else { 
      return this.tt.turnOn + ' ' + this.tt.descriptions;
    }
  }   
  else if (control === 'sign') { // not yet supported 
    return this.tt.sign;
  }
  else if (control === 'mute') { 
    if (this.volume > 0) { 
      return this.tt.mute;
    }
    else { 
      return this.tt.unmute;
    }
  }
  else if (control === 'volumeUp') { 
    return this.tt.volumeUp;
  }   
  else if (control === 'volumeDown') { 
    return this.tt.volumeDown;
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
AblePlayer.prototype.seekTo = function (newTime) { 
  if (this.player === 'html5') {
    var seekable;
  
    this.startTime = newTime;
    // Check HTML5 media "seekable" property to be sure media is seekable to startTime
    seekable = this.media.seekable;
    if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) { 
      // startTime is seekable. Seek to startTime, then start playing
      // Unless startTime == seekable.end(0), since then it will actually set the time to the start of the video.  In this case, do so but don't keep playing.
      this.media.currentTime = this.startTime;
      if (seekable.end(0) !== this.startTime) {
        this.media.play(true);
        this.startedPlaying = true;
      }
    } 
  }
  else { // jw player
    this.jwPlayer.play(true);
    this.jwPlayer.seek(newTime);
    this.startedPlaying = true;
  }

  this.refreshControls();
};

AblePlayer.prototype.getDuration = function () {
  var duration;
  if (this.player === 'html5') {
    duration = this.media.duration;
  }
  else if (this.player === 'jw') {
    duration = this.jwPlayer.getDuration();
  }

  if (duration === undefined || isNaN(duration) || duration === -1) {
    return 0;
  }
  return duration;
};

AblePlayer.prototype.getElapsed = function () {
  var position;
  if (this.player === 'html5') {
    position = this.media.currentTime;
  }
  else if (this.player === 'jw') {
    if (this.jwPlayer.getState() === 'IDLE') {
      return 0;
    }
    position = this.jwPlayer.getPosition();
  }

  if (position === undefined || isNaN(position) || position === -1) {
    return 0;
  }
  return position;
};

AblePlayer.prototype.getPlayerState = function () {
  if (this.player === 'html5') {
    if (this.media.paused) {
      if (this.getElapsed() === 0) {
        return 'stopped';
      }
      else if (this.media.ended) {
        return 'ended';
      }
      else {
        return 'paused';
      }
    }
    else if (this.media.readyState !== 4) {
      return 'buffering';
    }
    else {
      return 'playing';
    }
  }
  else if (this.player === 'jw') {
    if (this.jwPlayer.getState() === 'PAUSED' || this.jwPlayer.getState() === 'IDLE' || this.jwPlayer.getState() === undefined) {
      if (this.getElapsed() === 0) {
        return 'stopped';
      }
      else if (this.getElapsed() === this.getDuration()) {
        return 'ended';
      }
      else {
        return 'paused';
      }
    }
    else if (this.jwPlayer.getState() === 'BUFFERING') {
      return 'buffering';
    }
    else if (this.jwPlayer.getState() === 'PLAYING') {
      return 'playing';
    }
  }
}

AblePlayer.prototype.isPaused = function () {
  var state = this.getPlayerState();
  return state === 'paused' || state === 'stopped' || state === 'ended';
};

AblePlayer.prototype.pauseMedia = function () {
  if (this.player === 'html5') {
    this.media.pause(true);
  }
  else if (this.player === 'jw') {
    this.jwPlayer.pause(true);
  }
};

// Right now, update the seekBar values based on current duration and time.
// Later, move all non-destructive control updates based on state into this function?
AblePlayer.prototype.refreshControls = function() {
  var duration = this.getDuration();
  var elapsed = this.getElapsed();

  if (this.seekBar) {
    this.seekBar.setDuration(duration);
    if (!this.seekBar.tracking) {
      this.seekBar.setPosition(elapsed);
    }
  }

  // Update time display.
  var dMinutes = Math.floor(duration / 60);
  var dSeconds = Math.floor(duration % 60);
  if (dSeconds < 10) { 
    dSeconds = '0' + dSeconds;
  }

  var displayElapsed;
  // When seeking, display the seek bar time instead of the actual elapsed time.
  if (this.seekBar.tracking) {
    displayElapsed = this.seekBar.lastTrackPosition;
  }
  else {
    displayElapsed = elapsed;
  }

  var eMinutes = Math.floor(displayElapsed / 60);
  var eSeconds = Math.floor(displayElapsed % 60);
  if (eSeconds < 10) {
    eSeconds = '0' + eSeconds;
  }

  this.$durationContainer.text(' / ' + dMinutes + ':' + dSeconds);
  this.$elapsedTimeContainer.text(eMinutes + ':' + eSeconds);

  // TODO: Re-add status lines for various loading states?
  var textByState = {
    'stopped': this.tt.statusStopped,
    'paused': this.tt.statusPaused,
    'playing': this.tt.statusPlaying,
    'buffering': this.tt.statusBuffering,
    'ended': this.tt.statusEnd
  }

  this.$status.text(textByState[this.getPlayerState()]);

  // Don't change play/pause button display while using the seek bar.
  if (!this.seekBar.tracking) {
    if (this.isPaused()) {

      this.$playpauseButton.attr('title',this.tt.play); 
      
      if (this.controllerFont === 'icomoon') {
        this.$playpauseButton.find('span').removeClass('icon-pause').addClass('icon-play'); 
      }
      else { 
        this.$playpauseButton.find('img').attr('src',this.playButtonImg); 
      }
    }
    else {
      this.$playpauseButton.attr('title',this.tt.pause); 
      
      if (this.controllerFont === 'icomoon') {
        this.$playpauseButton.find('span').removeClass('icon-play').addClass('icon-pause'); 
      }
      else { 
        this.$playpauseButton.find('img').attr('src',this.pauseButtonImg); 
      }
    }
  }

  // Update buttons on/off display.
  if (this.$descButton) { 
    if (this.openDescOn || this.closedDescOn) { 
      this.$descButton.removeClass('buttonOff').attr('title',this.tt.turnOff + ' ' + this.tt.descriptions);
    }
    else { 
      this.$descButton.addClass('buttonOff').attr('title',this.tt.turnOn + ' ' + this.tt.descriptions);            
    }
  }


  // TODO: Move all button updates here.
  if (this.autoScrollTranscript !== this.$autoScrollTranscriptCheckbox.prop('checked')) {
    this.$autoScrollTranscriptCheckbox.prop('checked', this.autoScrollTranscript);
  }


  // If transcript locked, scroll transcript to current highlight location.
  if (this.autoScrollTranscript && this.currentHighlight) {
    var newTop = Math.floor($('.ump-transcript').scrollTop() +
                            $(this.currentHighlight).position().top -
                            ($('.ump-transcript').height() / 2) +
                            ($(this.currentHighlight).height() / 2));
    if (newTop !== Math.floor($('.ump-transcript').scrollTop())) {
      // Set a flag to ignore the coming scroll event.
      this.scrollingTranscript = true;
      $('.ump-transcript').scrollTop(newTop);
    }
  }
};

AblePlayer.prototype.setupTimedText = function(kind,track) {  

  var trackSrc, trackLang, $tempDiv, thisObj, 
    cues, c, cue, timeValues, start, end, cueText, i; 
  
  // Only supports timed text in VTT format
  trackSrc = track.getAttribute('src');
  trackLang = track.getAttribute('srclang');
  if (trackSrc) { 
    // create a temp div for holding track data
    $tempDiv = $('<div>',{ 
      style: 'display:none'
    });
    // Save the current object context in thisObj for use with inner functions.
    var thisObj = this; 

    // load  file and store captions into array 
    $tempDiv.load(trackSrc, function (trackText, status, req) { 
      if (status === 'error') { 
        if (thisObj.debug) {
          console.log ('error reading ' + kind + ' file:' + status);
        }
      }
      else {
        var cues = parseWebVTT(trackText).cues;
        if (kind === 'captions') {
          thisObj.captions = cues;
        }
        else if (kind === 'descriptions') {
          thisObj.descriptions = cues;
        }
        else if (kind === 'subtitles') {
          thisObj.subtitles = cues;
        }
        else if (kind === 'chapters') {
          thisObj.chapters = cues;
        }
        else if (kind === 'metadata') {
          thisObj.metadata = cues;
        }

        thisObj.updateTranscript();
/*
        //stanardize on \n for eol character
        trackText = thisObj.strip(trackText.replace(/\r\n|\r|\n/g, '\n'));
        cues = trackText.split('\n\n'); //creates an array
        for (c in cues) {
          cue = cues[c].split('\n');
          if (cue.length >= 2) { // cue must have one timestamp line + at least one cue text line
            if (cue[0].indexOf(' --> ') !== -1) { // first line of block includes a timestamp 
              timeValues = cue[0].split(' --> ');
              start = thisObj.strip(timeValues[0]);
              end = thisObj.strip(timeValues[1]);
              if (end.indexOf(' ') !== -1) { 
                // this end value includes a cue property. 
                // Remove it. Eventually support it  
                end = end.substr(0,end.indexOf(' '));
              }
              
              cueText = cue[1].replace( /<.*?>/g, '' ); // strip out any cue span tags (always in angle brackets <>) 
              if (cue.length > 2) {
                for (i=2; i<cue.length; i++) { 
                  cueText += '<br/>'+cue[i].replace( /<.*?>/g, '' );
                }
              }
              if (typeof cueText !== 'undefined') {
                if (cueText.length > 1) { 
                  start = thisObj.toSeconds(start);
                  end = thisObj.toSeconds(end);
                  if (kind === 'captions') { 
                    thisObj.captions.push({'start':start,'end':end,'text':cueText});      
                  }
                  else if (kind === 'descriptions') { 
                    thisObj.descriptions.push({'start':start,'end':end,'text':cueText});                   
                  }
                  else if (kind === 'subtitles') { 
                    thisObj.subtitles.push({'start':start,'end':end,'text':cueText});                   
                  }
                  else if (kind === 'chapters') { 
                    thisObj.chapters.push({'start':start,'end':end,'text':cueText});                   
                  }
                  else if (kind === 'metadata') { 
                    thisObj.metadata.push({'start':start,'end':end,'text':cueText});                   
                  }
                }
              }
            }
          }*/
      }
    });
  }
  //done with temp div. Can remove it now. 
  $tempDiv.remove();    
};

// Takes a cue and returns the caption text to display for it.
AblePlayer.prototype.flattenCueForCaption = function (cue) {
  var result = [];

  var flattenComponent = function (component) {
    var result = [];
    if (component.type === 'string') {
      result.push(component.value);
    }
    else if (component.type === 'voice') {
      result.push('[' + component.value + ']');
      for (var ii in component.children) {
        flattenComponent(component.children[ii]);
      }
    }
    else {
      for (var ii in component.children) {
        flattenComponent(component.children[ii]);
      }
    }
    return result.join('');
  }

  for (var ii in cue.components.children) {
    result.push(flattenComponent(cue.components.children[ii]));
  }

  return result.join('');
}

AblePlayer.prototype.showCaptions = function() { 

  var now, c, thisCaption; 
  
  if (this.player === 'html5') {
    now = this.media.currentTime;
  }
  else { // jw player
    now = jwplayer(this.jwId).getPosition();
  }
  for (c in this.captions) {
    if ((this.captions[c].start <= now) && (this.captions[c].end > now)) {      
      thisCaption = c;
      break;
    }
  }
  if (typeof thisCaption !== 'undefined') {  
    if (!this.captionsStarted) { 
      //this is the first caption
      this.$captionDiv.show();
      this.captionsStarted = true;
    }     
    if (this.currentCaption !== thisCaption) { 
      // it's time to load the new caption into the container div 
      this.$captionDiv.html(this.flattenCueForCaption(this.captions[thisCaption]));
      this.currentCaption = thisCaption;
    } 
  }
  else {     
    this.$captionDiv.html('');
    this.currentCaption = -1;
  } 
};
AblePlayer.prototype.showDescription = function() { 

  // there's a lot of redundancy between this function and showCaptions 
  // Trying to combine them ended up in a mess though. Keeping as is for now. 

  var now, d, thisDescription;

  var flattenComponentForDescription = function (component) {
    var result = [];
    if (component.type === 'string') {
      result.push(component.value);
    }
    else {
      for (var ii in component.children) {
        result.push(flattenComponentForDescription(component.children[ii]));
      }
    }
    return result.join('');
  }
  
  if (this.player === 'html5') {
    now = this.media.currentTime;
  }
  else { // jw player
    now = jwplayer(this.jwId).getPosition();
  }
  for (d in this.descriptions) {
    if ((this.descriptions[d].start <= now) && (this.descriptions[d].end > now)) {      
      thisDescription = d;
      break;
    }
  }
  if (typeof thisDescription !== 'undefined') {  
    if (this.currentDescription !== thisDescription) { 
      // load the new description into the container div 
      this.$descDiv.html(flattenComponentForDescription(this.descriptions[thisDescription].components));
      this.currentDescription = thisDescription;
      if (this.$descDiv.is(':hidden')) { 
        this.$descDiv.show();
      }
    } 
  }
  else {     
    this.$descDiv.html('');
    this.currentDescription = -1;
  } 
};
AblePlayer.prototype.swapDescription = function() { 

  // swap described and non-described source media, depending on which is playing
  // this function is only called in two circumstances: 
  // 1. Swapping to described version when initializing player (based on user prefs & availability)
  // 2. User is toggling description 

  var i, origSrc, descSrc, srcType, jwSourceIndex, newSource;

  if (this.initializing || this.openDescOn === false) {
    for (i=0; i < this.$sources.length; i++) { 
      // for all <source> elements, replace src with data-desc-src (if one exists)
      // then store original source in a new data-orig-src attribute 
      origSrc = this.$sources[i].getAttribute('src');
      descSrc = this.$sources[i].getAttribute('data-desc-src'); 
      srcType = this.$sources[i].getAttribute('type');
      if (descSrc) {
        this.$sources[i].setAttribute('src',descSrc);
        this.$sources[i].setAttribute('data-orig-src',origSrc);
      }       
      if (srcType === 'video/mp4') { 
        jwSourceIndex = i;
      }       
    }
    this.openDescOn = true;
    if (this.initializing) { // user hasn't pressed play yet 
      this.swappingSrc = false; 
    }
    else { 
      this.swappingSrc = true; 
    }
  }   
  else { 
    // the described version is currently playing
    // swap back to the original 
    for (i=0; i < this.$sources.length; i++) { 
      // for all <source> elements, replace src with data-orig-src
      origSrc = this.$sources[i].getAttribute('data-orig-src');
      srcType = this.$sources[i].getAttribute('type');        
      if (origSrc) {
        this.$sources[i].setAttribute('src',origSrc);
      }       
      if (srcType === 'video/mp4') { 
        jwSourceIndex = i;
      }
    }
    this.openDescOn = false;
    // No need to check for this.initializing 
    // This function is only called during initialization 
    // if swapping from non-described to described
    this.swappingSrc = true; 
  }
  // now reload the player 
  if (this.player === 'html5') {
    this.media.load();
  }
  else { 
    newSource = this.$sources[jwSourceIndex].getAttribute('src');
    this.jwPlayer.load({file: newSource}); 
  }
};
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
  //$('.ump-playlist li').removeClass('ump-current');
  this.$playlist.removeClass('ump-current');
  $newItem.addClass('ump-current'); 
    
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
    else { 
      this.jwPlayer.load({file: jwSource}); 
    }
  }
};
AblePlayer.prototype.toSeconds = function(t) {

  var s, p, i; 
  
  s = 0.0;
  if (t) {
    p = t.split(':');
    for (i=0; i < p.length; i++) {
      s = s * 60 + parseFloat(p[i].replace(',', '.'));
    }
  }
  return s;
};
AblePlayer.prototype.strip = function(s) { 
  if (s) { 
    return s.replace(/^\s+|\s+$/g, '');
  }
};
AblePlayer.prototype.playAtTime = function(seconds) { 
  //seeking = true;
  //seekVideo(seconds);
};
AblePlayer.prototype.highlightTranscript = function (currentTime) { 

  //show highlight in transcript marking current caption
  var start, end; 
  var thisObj = this;

  currentTime = parseFloat(currentTime);

  // Highlight the current transcript item.
  $('.ump-transcript span.ump-transcript-caption').each(function() { 
    start = parseFloat($(this).attr('data-start'));
    end = parseFloat($(this).attr('data-end'));
    if (currentTime >= start && currentTime <= end) { 
      // move all previous highlights before adding one to current span
      $('.ump-highlight').removeClass('ump-highlight');
      $(this).addClass('ump-highlight');
      return false;
    }
  });
  thisObj.currentHighlight = $('.ump-highlight');
  if (thisObj.currentHighlight.length === 0) {
    // Nothing highlighted.
    thisObj.currentHighlight = null;
  }
};
AblePlayer.prototype.usingModifierKeys = function(e) { 
  // return true if user is holding down required modifier keys 
  if ((this.prefAltKey === 1) && !e.altKey) { 
    return false;
  } 
  if ((this.prefCtrlKey === 1) && !e.ctrlKey) { 
    return false;
  }
  return true; 
};
AblePlayer.prototype.debugDescription = function(e) { 
  // description is a bit confusing due to the number of variables involved
  // this function can be called to assist in troubleshooting
  // it writes the current value of all related variables to the console
  console.log('hasOpenDesc: ' + this.hasOpenDesc);
  console.log('hasClosedDesc: ' + this.hasOpenDesc);
  console.log('prefDesc: ' + this.prefDesc);
  console.log('prefClosedDesc: ' + this.prefClosedDesc);
  console.log('prefVisibleDesc: ' + this.prefVisibleDesc);
  console.log('closedDescOn: ' + this.closedDescOn);
  console.log('openDescOn: ' + this.openDescOn);
  console.log('useDescType: ' + this.useDescType);  
};
AblePlayer.prototype.colorNameToHex = function(color) { 
  var colors = {
    "aliceblue": "#f0f8ff",
    "antiquewhite": "#faebd7",
    "aqua": "#00ffff",
    "aquamarine": "#7fffd4",
    "azure": "#f0ffff",
    "beige": "#f5f5dc",
    "bisque": "#ffe4c4",
    "black": "#000000",
    "blanchedalmond": "#ffebcd",
    "blue": "#0000ff",
    "blueviolet": "#8a2be2",
    "brown": "#a52a2a",
    "burlywood": "#deb887",
    "cadetblue": "#5f9ea0",
    "chartreuse": "#7fff00",
    "chocolate": "#d2691e",
    "coral": "#ff7f50",
    "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc",
    "crimson": "#dc143c",
    "cyan": "#00ffff",
    "darkblue": "#00008b",
    "darkcyan": "#008b8b",
    "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9",
    "darkgreen": "#006400",
    "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b",
    "darkolivegreen": "#556b2f",
    "darkorange": "#ff8c00",
    "darkorchid": "#9932cc",
    "darkred": "#8b0000",
    "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f",
    "darkslateblue": "#483d8b",
    "darkslategray": "#2f4f4f",
    "darkturquoise": "#00ced1",
    "darkviolet": "#9400d3",
    "deeppink": "#ff1493",
    "deepskyblue": "#00bfff",
    "dimgray": "#696969",
    "dodgerblue": "#1e90ff",
    "firebrick": "#b22222",
    "floralwhite": "#fffaf0",
    "forestgreen": "#228b22",
    "fuchsia": "#ff00ff",
    "gainsboro": "#dcdcdc",
    "ghostwhite": "#f8f8ff",
    "gold": "#ffd700",
    "goldenrod": "#daa520",
    "gray": "#808080",
    "green": "#008000",
    "greenyellow": "#adff2f",
    "honeydew": "#f0fff0",
    "hotpink": "#ff69b4",
    "indianred ": "#cd5c5c",
    "indigo": "#4b0082",
    "ivory": "#fffff0",
    "khaki": "#f0e68c",
    "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5",
    "lawngreen": "#7cfc00",
    "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6",
    "lightcoral": "#f08080",
    "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2",
    "lightgrey": "#d3d3d3",
    "lightgreen": "#90ee90",
    "lightpink": "#ffb6c1",
    "lightsalmon": "#ffa07a",
    "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa",
    "lightslategray": "#778899",
    "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0",
    "lime": "#00ff00",
    "limegreen": "#32cd32",
    "linen": "#faf0e6",
    "magenta": "#ff00ff",
    "maroon": "#800000",
    "mediumaquamarine": "#66cdaa",
    "mediumblue": "#0000cd",
    "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370d8",
    "mediumseagreen": "#3cb371",
    "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a",
    "mediumturquoise": "#48d1cc",
    "mediumvioletred": "#c71585",
    "midnightblue": "#191970",
    "mintcream": "#f5fffa",
    "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5",
    "navajowhite": "#ffdead",
    "navy": "#000080",
    "oldlace": "#fdf5e6",
    "olive": "#808000",
    "olivedrab": "#6b8e23",
    "orange": "#ffa500",
    "orangered": "#ff4500",
    "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa",
    "palegreen": "#98fb98",
    "paleturquoise": "#afeeee",
    "palevioletred": "#d87093",
    "papayawhip": "#ffefd5",
    "peachpuff": "#ffdab9",
    "peru": "#cd853f",
    "pink": "#ffc0cb",
    "plum": "#dda0dd",
    "powderblue": "#b0e0e6",
    "purple": "#800080",
    "red": "#ff0000",
    "rosybrown": "#bc8f8f",
    "royalblue": "#4169e1",
    "saddlebrown": "#8b4513",
    "salmon": "#fa8072",
    "sandybrown": "#f4a460",
    "seagreen": "#2e8b57",
    "seashell": "#fff5ee",
    "sienna": "#a0522d",
    "silver": "#c0c0c0",
    "skyblue": "#87ceeb",
    "slateblue": "#6a5acd",
    "slategray": "#708090",
    "snow": "#fffafa",
    "springgreen": "#00ff7f",
    "steelblue": "#4682b4",
    "tan": "#d2b48c",
    "teal": "#008080",
    "thistle": "#d8bfd8",
    "tomato": "#ff6347",
    "turquoise": "#40e0d0",
    "violet": "#ee82ee",
    "wheat": "#f5deb3",
    "white": "#ffffff",
    "whitesmoke": "#f5f5f5",
    "yellow": "#ffff00",
    "yellowgreen": "#9acd32"
  };
  if (typeof colors[color.toLowerCase()] !== 'undefined') { 
    return colors[color.toLowerCase()];
  }
  return false;
};
AblePlayer.prototype.colorHexToRGB = function(color) { 
  var r, g, b;
  if (color.charAt(0) === '#') {
    color = color.substr(1);
  }
  r = color.charAt(0) + color.charAt(1);
  g = color.charAt(2) + color.charAt(3);
  b = color.charAt(4) + color.charAt(5);
  r = parseInt(r, 16);
  g = parseInt(g, 16);
  b = parseInt(b, 16);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
};
AblePlayer.prototype.countProperties = function(obj) { 
 
  // returns the number of properties in an object 
  var count, prop; 
  count = 0;
  for (prop in obj) {
    if (obj.hasOwnProperty(prop)) { 
      ++count;
    }
  }
  return count;
};


// See section 4.1 of dev.w3.org/html5/webvtt for format details.
function parseWebVTT(text) {
  // Normalize line ends to \n.
  text.replace('\r\n', '\n').replace('\r', '\n');
  
  var parserState = {
    text: text,
    error: null,
    metadata: {},
    cues: [],
    line: 1,
    column: 1
  };

  try {
    act(parserState, parseFileBody);
  }
  catch (err) {
    console.log('Line: ' + parserState.line + '\nColumn: ' + parserState.column);
    console.log(err);
  }

  return parserState;
}

function actList(state, list) {
  var results = [];
  for (var ii in list) {
    results.push(act(state, list[ii]));
  }
  return results;
}

// Applies the action and checks for errors.
function act(state, action) {
  var val = action(state);
  if (state.error !== null) {
    throw state.error;
  }
  return val;
}

function updatePosition(state, cutText) {
  for (var ii in cutText) {
    if (cutText[ii] === '\n') {
      state.column = 1;
      state.line += 1;
    }
    else {
      state.column += 1;
    }
  }
}

function cut(state, length) {
  var returnText = state.text.substring(0, length);
  updatePosition(state, returnText);
  state.text = state.text.substring(length);
  return returnText;
}

function cutLine(state, length) {
  var nextEOL = state.text.indexOf('\n');
  var returnText;
  if (nextEOL === -1) {
    returnText = state.text;
    updatePosition(state, returnText);
    state.text = '';
  }
  else {
    returnText = state.text.substring(0, nextEOL);
    updatePosition(state, returnText + '\n');
    state.text = state.text.substring(nextEOL + 1);
  }
  return returnText;
}

function peekLine(state) {
  var nextEOL = state.text.indexOf('\n');
  if (nextEOL === -1) {
    return state.text;
  }
  else {
    return state.text.substring(0, nextEOL);
  }
}

function parseFileBody(state) {
  actList(state, [
    eatOptionalBOM,
    eatSignature,
    eatSingleSpaceOrTab,
    eatUntilEOLInclusive,
    parseMetadataHeaders,
    eatAtLeast1EmptyLines,
    parseCuesAndComments]);
}

// Parses all metadata headers until a cue is discovered.
function parseMetadataHeaders(state) {
  while (true) {
    var nextLine = peekLine(state);
    if (nextLine.indexOf('-->') !== -1) {
      return;
    }
    else if (nextLine.length === 0) {
      return;
    }
    else {
      var keyValue = act(state, getKeyValue);
      state.metadata[keyValue[0]] = keyValue[1];
      act(state, eatUntilEOLInclusive);
    }
  }
}

function nextSpaceOrNewline(s) {
  var possible = [];
  var spaceIndex = s.indexOf(' ');
  if (spaceIndex >= 0) {
    possible.push(spaceIndex);
  }
  var tabIndex = s.indexOf('\t');
  if (tabIndex >= 0) {
    possible.push(tabIndex);
  }
  var lineIndex = s.indexOf('\n');
  if (lineIndex >= 0) {
    possible.push(lineIndex);
  }
  
  return Math.min.apply(null, possible);
}

function getKeyValue(state) {
  var next = nextSpaceOrNewline(state.text);
  var pair = cut(state, next);
  var colon = pair.indexOf(':');
  if (colon === -1) {
    state.error = 'Missing colon.';
    return;
  }
  else {
    var pairName = pair.substring(0, colon);
    var pairValue = pair.substring(colon + 1);
    return [pairName, pairValue];
  }
}

function parseCuesAndComments(state) {
  while (true) {
    var nextLine = peekLine(state);
    // If NOTE is not on a line all its own, it must be followed by a space or tab.
    if (nextLine.indexOf('NOTE') === 0 && ((nextLine.length === 4) || (nextLine[4] === ' ') || (nextLine[4] === '\t'))) {
      actList(state, [eatComment, eatEmptyLines]);
    }
    else if (nextLine.trim().length !== 0) {
      parseCue(state);
    }
    else {
      // Everythings parsed!
      return;
    }
  }
}

function parseCue(state) {
  var nextLine = peekLine(state);
  var cueId;
  if (nextLine.indexOf('-->') === -1) {
    cueId = cutLine(state);
  }
  var cueTimings = actList(state, [getTiming, 
                                   eatAtLeast1SpacesOrTabs,
                                   eatArrow,
                                   eatAtLeast1SpacesOrTabs,
                                   getTiming]);
  var startTime = cueTimings[0];
  var endTime = cueTimings[4];
  if (startTime >= endTime) {
    state.error = 'Start time is not sooner than end time.';
    return;
  }
  
  act(state, eatSpacesOrTabs);
  var cueSettings = act(state, getCueSettings);
  // Cut the newline.
  cut(state, 1);
  var components = act(state, getCuePayload);
  
  state.cues.push({
    id: cueId,
    start: startTime,
    end: endTime,
    settings: cueSettings,
    components: components
  });
}

function getCueSettings(state) {
  var cueSettings = {};
  while (state.text.length > 0 && state.text[0] !== '\n') {
    var keyValue = act(state, getKeyValue);
    cueSettings[keyValue[0]] = keyValue[1];
    act(state, eatSpacesOrTabs);
  }
  return cueSettings;
}


function getCuePayload(state) {
  // Parser based on instructions in draft.
  var result = {type: 'internal', tagName: '', value: '', classes: [], annotation: '', parent: null, children: [], language: ''};
  var current = result;
  var languageStack = [];
  while (state.text.length > 0) {
    var nextLine = peekLine(state);
    if (nextLine.indexOf('-->') !== -1) {
      break;
    }

    var token = getCueToken(state);
    // We'll use the tokens themselves as objects where possible.
    if (token.type === 'string') {
      current.children.push(token);
    }
    else if (token.type === 'startTag') {
      token.type = token.tagName;
      if (['c', 'i', 'b', 'u', 'ruby'].indexOf(token.tagName) !== -1) {
        if (languageStack.length > 0) {
          current.language = languageStack[languageStack.length - 1];
        }
        current.children.push(token);
        current = token;
      }
      else if (token.tagName === 'rt' && current.tagName === 'ruby') {
        if (languageStack.length > 0) {
          current.language = languageStack[languageStack.length - 1];
        }
        current.children.push(token);
        current = token;
      }
      else if (token.tagName === 'v') {
        token.value = token.annotation;
        if (languageStack.length > 0) {
          current.language = languageStack[languageStack.length - 1];
        }
        current.children.push(token);
        current = token;
      }
      else if (token.tagName === 'lang') {
        languageStack.push(token.annotation);
        if (languageStack.length > 0) {
          current.language = languageStack[languageStack.length - 1];
        }
        current.children.push(token);
        current = token;
      }
    }
    else if (token.type === 'endTag') {
      if (token.tagName === current.type && ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v'].indexOf(token.tagName) !== -1) {
        current = current.parent;
      }
      else if (token.tagName === 'lang' && current.type === 'lang') {
        current = current.parent;
        languageStack.pop();
      }
      else if (token.tagName === 'ruby' && current.type === 'rt') {
        current = current.parent.parent;
      }
    }
    else if (token.type === 'timestampTag') {
      var tempState = {
        text: token.value,
        error: null,
        metadata: {},
        cues: [],
        line: 1,
        column: 1
      };
      try {
        var timing = act(tempState, getTiming);
        if (tempState.text.length === 0) {
          token.value = timing;
          current.push(token);
        }
      }
      catch (err) {
      }
    }
  }
  
  return result;
}

// Gets a single cue token; uses the method in the w3 specification.
function getCueToken(state) {
  var tokenState = 'data';
  var result = [];
  var buffer = '';
  var token = {type: '', tagName: '', value: '', classes: [], annotation: '', children: []}

  while (true) {
    var c;
    // Double newlines indicate end of token.
    if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
      cut(state, 2);
      c = '\u0004';
    }
    else if (state.text.length > 0) {
      c = state.text[0];
    }
    else {
      // End of file.
      c = '\u0004';
    }

    if (tokenState === 'data') {
      if (c === '&') {
        buffer = '&';
      }
      else if (c === '<') {
        if (result.length === 0) {
          tokenState = 'tag';
        }
        else {
          token.type = 'string';
          token.value = result.join('');
          return token;
        }
      }
      else if (c === '\u0004') {
        return {type: 'string', value: result.join('')};
      }
      else {
        result.push(c);
      }
    }
    else if (tokenState === 'escape') {
      if (c === '&') {
        result.push(buffer);
        buffer = '&';
      }
      else if (c.match(/[0-9a-z]/)) {
        buffer += c;
      }
      else if (c === ';') {
        if (buffer === '&amp') {
          result.push('&');
        }
        else if (buffer === '&lt') {
          result.push('<');
        }
        else if (buffer === '&gt') {
          result.push('>');
        }
        else if (buffer === '&lrm') {
          result.push('\u200e');
        }
        else if (buffer === '&rlm') {
          result.push('\u200f');
        }
        else if (buffer === '&nbsp') {
          result.push('\u00a0');
        }
        else {
          result.push(buffer);
          result.push(';');
        }
        tokenState = 'data';
      }
      else if (c === '<' || c === '\u0004') {
        result.push(buffer);
        token.type = 'string';
        token.value = result.join('');
        return token;
      }
      else {
        result.push(buffer);
        tokenState = 'data';
      }
    }
    else if (tokenState === 'tag') {
      if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') {
        tokenState = 'startTagAnnotation';
      }
      else if (c === '.') {
        tokenState = 'startTagClass';
      }
      else if (c === '/') {
        tokenState = 'endTag';
      }
      else if (c.match('[0-9]')) {
        tokenState = 'timestampTag';
        result.push(c);
      }
      else if (c === '>') {
        cut(state, 1);
        break;
      }
      else if (c === '\u0004') {
        token.tagName = '';
        token.type = 'startTag';
        return token;
      }
      else {
        result.push(c);
        tokenState = 'startTag';
      }
    }
    else if (tokenState === 'startTag') {
      if (c === '\t' || c === '\u000c' || c === ' ') {
        tokenState = 'startTagAnnotation';
      }
      else if (c === '\n') {
        buffer = c;
        tokenState = 'startTagAnnotation';
      }
      else if (c === '.') {
        tokenState = 'startTagClass';
      }
      else if (c === '>') {
        cut(state, 1);
        token.tagName = result.join('');
        token.type = 'startTag';
        return token;
      }
      else if (c === '\u0004') {
        token.tagName = result.join('');
        token.type = 'startTag';
        return token;
      }
      else {
        result.push(c);
      }
    }
    else if (tokenState === 'startTagClass') {
      if (c === '\t' || c === '\u000c' || c === ' ') {
        token.classes.push(buffer);
        buffer = '';
        tokenState = 'startTagAnnotation';
      }
      else if (c === '\n') {
        token.classes.push(buffer);
        buffer = c;
        tokenState = 'startTagAnnotation';
      }
      else if (c === '.') {
        token.classes.push(buffer);
        buffer = "";
      }
      else if (c === '>') {
        cut(state, 1);
        token.classes.push(buffer);
        token.type = 'startTag';
        token.tagName = result.join('');
        return token;
      }
      else if (c === '\u0004') {
        token.classes.push(buffer);
        token.type = 'startTag';
        token.tagName = result.join('');
        return token;
      }
      else {
        buffer += 'c';
      }
    }
    else if (tokenState === 'startTagAnnotation') {
      if (c === '>') {
        cut(state, 1);
        buffer = buffer.trim().replace(/ +/, ' ');
        token.type = 'startTag';
        token.tagName = result.join('');
        token.annotation = buffer;
        return token;
      }
      else if (c === '\u0004') {
        buffer = buffer.trim().replace(/ +/, ' ');
        token.type = 'startTag';
        token.tagName = result.join('');
        token.annotation = buffer;
        return token;
      }
      else {
        buffer += c;
      }
    }
    else if (tokenState === 'endTag') {
      if (c === '>') {
        cut(state, 1);
        token.type = 'endTag';
        token.tagName = result.join('');
        return token;
      }
      else if (c === '\u0004') {
        token.type = 'endTag';
        token.tagName = result.join('');
        return token;
      }
      else {
        result.push(c);
      }
    }
    else if (tokenState === 'timestampTag') {
      if (c === '>') {
        cut(state, 1);
        token.type = 'timestampTag';
        token.name = result.join('');
        return token;
      }
      else if (c === '\u0004') {
        token.type = 'timestampTag';
        token.name = result.join('');
        return token;
      }
      else {
        result.push(c);
      }
    }
    else {
      throw 'Unknown tokenState ' + tokenState;
    }

    cut(state, 1);
  }
}

function eatComment(state) {
  // Cut the NOTE line.
  var noteLine = cutLine(state);
  if (noteLine.indexOf('-->') !== -1) {
    state.error = 'Invalid syntax: --> in NOTE line.';
    return;
  }
  while (true) {
    var nextLine = peekLine(state);
    if (nextLine.trim().length === 0) {
      // End of comment.
      return;
    }
    else if (nextLine.indexOf('-->') !== -1) {
      state.error = 'Invalid syntax: --> in comment.';
      return;
    }
    else {
      cutLine(state);
    }
  }
}

// Initial byte order mark.
function eatOptionalBOM(state) {
  if (state.text[0] === '\ufeff') {
    cut(state, 1);
  }
  
}

// "WEBVTT" string.
function eatSignature(state) {
  if (state.text.substring(0,6) === 'WEBVTT') {
    cut(state, 6);
  }
  else {
    state.error = 'Invalid signature.';
  }
}

function eatArrow(state) {
  if (state.text.length < 3 || state.text.substring(0,3) !== '-->') {
    state.error = 'Missing -->';
  }
  else {
    cut(state, 3);
  }
}

function eatSingleSpaceOrTab(state) {
  if (state.text[0] === '\t' || state.text[0] === ' ') {
    cut(state, 1);
  }
  else {
    state.error = 'Missing space.';
  }
}

function eatSpacesOrTabs(state) {
  while (state.text[0] === '\t' || state.text[0] === ' ') {
    cut(state, 1);
  }
}

function eatAtLeast1SpacesOrTabs(state) {
  var numEaten = 0;
  while (state.text[0] === '\t' || state.text[0] === ' ') {
    cut(state, 1);
    numEaten += 1;
  }
  if (numEaten === 0) {
    state.error = 'Missing space.';
  }
}

function eatUntilEOLInclusive(state) {
  var nextEOL = state.text.indexOf('\n');
  if (nextEOL === -1) {
    state.error = 'Missing EOL.';
  }
  else {
    cut(state, nextEOL + 1);
  }
}

function eatEmptyLines(state) {
  while (state.text.length > 0) {
    var nextLine = peekLine(state);
    if (nextLine.trim().length === 0) {
      cutLine(state);
    }
    else {
      break;
    }
  }
}

// Eats empty lines, but throws an error if there's not at least one.
function eatAtLeast1EmptyLines(state) {
  var linesEaten = 0;
  while (state.text.length > 0) {
    var nextLine = peekLine(state);
    if (nextLine.trim().length === 0) {
      cutLine(state);
      linesEaten += 1;
    }
    else {
      break;
    }
  }
  if (linesEaten === 0) {
    state.error = 'Missing empty line.';
  }
}

function getTiming(state) {
  var nextSpace = nextSpaceOrNewline(state.text);
  if (nextSpace === -1) {
    state.error('Missing timing.');
    return;
  }
  var timestamp = cut(state, nextSpace);
  
  var results = /((\d\d):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);
  
  if (!results) {
    state.error = 'Unable to parse timestamp.';
    return;
  }
  var time = 0;
  var hours = results[2];
  var minutes = results[4];
  
  if (minutes) {
    if (parseInt(minutes) > 59) {
      state.error = 'Invalid minute range.';
      return;
    }
    if (hours) {
      time += 3600 * parseInt(hours);
    }
    time += 60 * parseInt(minutes);
    var seconds = results[5];
    if (parseInt(seconds) > 59) {
      state.error = 'Invalid second range.';
      return;
    }
    
    time += parseInt(seconds);
    time += parseInt(results[6]) / 1000;
  }
  else {
    time += parseInt(results[7]);
    time += parseInt(results[8]) / 1000;
  }
  
  return time;
}

function generateTranscript(captions, descriptions) {
  var main = $('<div class="ump-transcript-container"></div>');

  // TODO: Make scrolling optional?

  main.append('<h2>Transcript</h2>');

  var nextCap = 0;
  var nextDesc = 0;  

  var addDescription = function(div, desc) {
    var descDiv = $('<div class="ump-desc"><span class="hidden">Description: </span></div>');

    var flattenComponentForDescription = function(comp) {
      var result = [];
      if (comp.type === 'string') {
        result.push(comp.value);
      }
      else {
        for (var ii in comp.children) {
          result = result.concat(flattenComponentForDescription(comp.children[ii]));
        }
      }
      return result;
    }

    var descSpan = $('<span class="ump-transcript-seekpoint"></span>');
    for (var ii in desc.components.children) {
      var results = flattenComponentForDescription(desc.components.children[ii]);
      for (var jj in results) {
        descSpan.append(results[jj]);
      }
    }
    descSpan.attr('data-start', desc.start.toString());
    descSpan.attr('data-end', desc.end.toString());
    descDiv.append(descSpan);

    div.append(descDiv);
  };

  var addCaption = function(div, cap) {
    var capSpan = $('<span class="ump-transcript-seekpoint ump-transcript-caption"></span>');

    var flattenComponentForCaption = function(comp) {
      var result = [];
      var flattenString = function (str) {
        var result = [];
        if (str === '') {
          return result;
        }
        var openBracket = str.indexOf('[');
        var closeBracket = str.indexOf(']');
        var openParen = str.indexOf('(');
        var closeParen = str.indexOf(')');

        var hasBrackets = openBracket !== -1 && closeBracket !== -1;
        var hasParens = openParen !== -1 && closeParen !== -1;

        if ((hasParens && hasBrackets && openBracket < openParen) || hasBrackets) {
          result = result.concat(flattenString(str.substring(0, openBracket)));
          result.push($('<div></div><span class="ump-unspoken">' + str.substring(openBracket, closeBracket + 1) + '</span>'));
          result = result.concat(flattenString(str.substring(closeBracket + 1)));
        }
        else if (hasParens) {
          result = result.concat(flattenString(str.substring(0, openParen)));
          result.push($('<div></div><span class="ump-unspoken">' + str.substring(openParen, closeParen + 1) + '</span>'));
          result = result.concat(flattenString(str.substring(closeParen + 1)));
        }
        else {
          result.push(str);
        }
        return result;
      }

      if (comp.type === 'string') {
        result = result.concat(flattenString(comp.value));
      }
      else if (comp.type === 'v') {
        var vSpan = $('<div></div><span class="ump-unspoken">[' + comp.value + ']</span>');
        result.push(vSpan);
        for (var ii in comp.children) {
          var subResults = flattenComponentForCaption(comp.children[ii]);
          for (var jj in subResults) {
            result.push(subResults[jj]);
          }
        }
      }
      else {
        for (var ii in comp.children) {
          result = result.concat(flattenComponentForCaption(comp.children[ii]));
        }
      }
      return result;
    }


    for (var ii in cap.components.children) {
      var results = flattenComponentForCaption(cap.components.children[ii]);
      for (var jj in results) {
        capSpan.append(results[jj]);
      }
    }

    capSpan.attr('data-start', cap.start.toString());
    capSpan.attr('data-end', cap.end.toString());
    div.append(capSpan);
    div.append('\n');
  };

  while ((nextCap < captions.length) || (nextDesc < descriptions.length)) {
    if ((nextCap < captions.length) && (nextDesc < descriptions.length)) {
      if (descriptions[nextDesc].start <= captions[nextCap].start) {
        addDescription(main, descriptions[nextDesc]);
        nextDesc += 1;
      }
      else {
        addCaption(main, captions[nextCap]);
        nextCap += 1;
      }
    }
    else if (nextCap < captions.length) {
      addCaption(main, captions[nextCap]);
      nextCap += 1;
    }
    else if (nextDesc < descriptions.length) {
      addDescription(main, descriptions[nextDesc]);
      nextDesc += 1;
    }
  }

  return main;
}


var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

// Based on the incredible accessible modal dialog.
function AccessibleDialog(modalDiv, title, description, width, fullscreen, escapeHook) {
  this.title = title;
  this.description = description;
  this.escapeHook = escapeHook;
  
  var thisObj = this;
  var modal = modalDiv;
  this.modal = modal;
  modal.css({
    width: width || '50%',
    'margin-left': 'auto',
    'margin-right': 'auto',
    'z-index': 2000,
    position: 'fixed',
    left: 0,
    right: 0,
    top: (fullscreen ? '0' : '25%'),
    display: 'none'
  });
  modal.addClass('modalDialog');

  if (!fullscreen) {
    var closeButton = $('<a class="modalCloseButton" href="javascript:void(0)" title="Close modal dialog">X</a>');
    closeButton.css({
      float: 'right',
      position: 'absolute',
      top: '10px',
      left: '95%'
    });
    closeButton.keydown(function (event) {
      // Space key down
      if (event.which === 32) {
        thisObj.hide();
      }
    }).click(function () {
      thisObj.hide();
    });
    modal.prepend(closeButton);

    var titleH1 = $('<h1 id="modalTitle"></h1>');
    titleH1.css('text-align', 'center');
    titleH1.text(title);
    
    modal.prepend(titleH1);
    modal.attr('aria-labelledby', 'modalTitle');
  }


  var descriptionDiv = $('<div id="modalDescription"></div>');
  descriptionDiv.text(description);
  // Move off-screen.
  descriptionDiv.css({
    position: 'absolute',
    left: '-999px',
    width: '1px',
    height: '1px',
    top: 'auto'
  });


  modal.prepend(descriptionDiv);

  modal.attr('aria-hidden', 'true');
  modal.attr('aria-describedby', 'modalDescription');
  modal.attr('role', 'dialog');

  modal.keydown(function (event) {
    // Escape
    if (event.which === 27) {
      if (thisObj.escapeHook) {
        thisObj.escapeHook(event, this);
      }
      else {
        thisObj.hide();
        event.preventDefault();
      }
    }
    // Tab
    else if (event.which === 9) {
      // Manually loop tab navigation inside the modal.
      var parts = modal.find('*');
      var focusable = parts.filter(focusableElementsSelector).filter(':visible');

      if (focusable.length === 0) {
        return;
      }

      var focused = $(':focus');
      var currentIndex = focusable.index(focused);
      if (event.shiftKey) {
        // If backwards from first element, go to last.
        if (currentIndex === 0) {
          focusable.get(focusable.length - 1).focus();
          event.preventDefault();
        }
      }
      else {
        if (currentIndex === focusable.length - 1) {
          focusable.get(0).focus();
          event.preventDefault();
        }
      }
    }
  });

  $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'false');
}

AccessibleDialog.prototype.show = function () {
  if (!this.overlay) {
    // Generate overlay.
    var overlay = $('<div class="modalOverlay"></div>');
    overlay.attr('tabindex', '-1');
    this.overlay = overlay;
    overlay.css({
      width: '100%',
      height: '100%',
      'z-index': 1500,
      'background-color': '#000',
      opacity: 0.5,
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'none',
      margin: 0,
      padding: 0
    });
    $('body').append(overlay);

    // Keep from moving focus out of dialog when clicking outside of it.
    overlay.on('mousedown.accessibleModal', function (event) {
      event.preventDefault();
    });
  }



  $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'true');
  this.overlay.css('display', 'block');
  this.modal.css('display', 'block');
  this.modal.attr('aria-hidden', 'false');

  this.focusedElementBeforeModal = $(':focus');
  var focusable = this.modal.find("*").filter(focusableElementsSelector).filter(':visible');
  if (focusable.length === 0) {
    this.focusedElementBeforeModal.blur();
  }
  focusable.first().focus();

};

AccessibleDialog.prototype.hide = function () {
  if (this.overlay) {
    this.overlay.css('display', 'none');
  }
  this.modal.css('display', 'none');
  this.modal.attr('aria-hidden', 'true');
  $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'false');

  this.focusedElementBeforeModal.focus();
};





// Events:
//   startTracking(event, position)
//   tracking(event, position)
//   stopTracking(event, position)


function AccessibleSeekBar(div, width) {
  var thisObj = this;

  // Initialize some variables.
  this.position = 0; // Note: position does not change while tracking.
  this.tracking = false;
  this.trackDevice = null; // 'mouse' or 'keyboard'
  this.keyTrackPosition = 0;
  this.lastTrackPosition = 0;
  this.nextStep = 1;
  this.inertiaCount = 0;

  this.bodyDiv = $(div);

  // Add a loaded indicator and a seek head.
  this.loadedDiv = $('<div></div>');
  this.seekHead = $('<div class="able-seek-head"></div>');
  // Make head focusable.
  this.seekHead.attr('tabindex', '0');
  // Since head is focusable, it gets the aria roles/titles.
  this.seekHead.attr('role', 'slider');
  this.seekHead.attr('aria-value-min', 0);

  this.timeTooltip = $('<div>');
  this.bodyDiv.append(this.timeTooltip);
  
  this.timeTooltip.attr('role', 'tooltip');
  this.timeTooltip.css({
    position: 'absolute',
    padding: '10px',
    'border-color': 'black',
    'border-width': '1px',
    'background-color': '#CCCCCC',
    '-webkit-border-radius': '5px',
    '-moz-border-radius': '5px',
    'border-radius': '5px',
    display: 'none'
  });

  this.bodyDiv.append(this.loadedDiv);
  this.bodyDiv.append(this.seekHead);

  this.bodyDiv.wrap('<div></div>');
  this.wrapperDiv = this.bodyDiv.parent();

  var radius = '5px';
  this.wrapperDiv.width(width);
  this.wrapperDiv.css({
    'display': 'inline-block',
    'vertical-align': 'middle'
  });

  this.bodyDiv.css({
    'position': 'relative',
    'height': '0.5em',
    'border': '1px solid',
    'border-radius': radius,
    '-webkit-border-radius': radius,
    '-moz-border-radius': radius,
    '-o-border-radius': radius,
    'background-color': '#666666',
    'margin': '0 20px'
  });

  this.loadedDiv.width(0);
  this.loadedDiv.css({
    'display': 'inline-block',
    'position': 'relative',
    'left': 0,
    'height': '0.5em',
    'border-radius': radius,
    '-webkit-border-radius': radius,
    '-moz-border-radius': radius,
    '-o-border-radius': radius,
    'background-color': '#CCCCCC'
  });

  this.seekHead.css({
    'display': 'inline-block',
    'position': 'relative',
    'left': 0,
    'top': '-0.35em',
    'height': '1.2em',
    'width': '1em',
    'border': '1px solid',
    'background-color': '#555555'
  });

  // Set a default duration.  User should call this and change it.
  this.setDuration(100);

  this.seekHead.hover(function (event) {
    thisObj.seekHead.css('background-color', '#777777');
    thisObj.overHead = true;
    thisObj.refreshTooltip();
  }, function (event) {
    thisObj.seekHead.css('background-color', '#555555');
    thisObj.overHead = false;

    if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
    }
    thisObj.refreshTooltip();
  });

  this.seekHead.mousemove(function (event) {
    if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.trackHeadAtPageX(event.pageX);
    }
  });

  this.bodyDiv.hover(function () {
    thisObj.overBody = true;
    thisObj.refreshTooltip();
  }, function (event) {
    thisObj.overBody = false;
    thisObj.overBodyMousePos = null;
    thisObj.refreshTooltip();

    if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
    }
  });

  this.bodyDiv.mousemove(function (event) {
    thisObj.overBodyMousePos = {
      x: event.pageX,
      y: event.pageY
    };
    if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.trackHeadAtPageX(event.pageX);
    }
    thisObj.refreshTooltip();
  });

  this.bodyDiv.mousedown(function (event) {
    thisObj.startTracking('mouse', thisObj.pageXToPosition(event.pageX));
    thisObj.trackHeadAtPageX(event.pageX);
    if (!thisObj.seekHead.is(':focus')) {
      thisObj.seekHead.focus();
    }
    event.preventDefault();
  });

  this.seekHead.mousedown(function (event) {
    thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
    if (!thisObj.bodyDiv.is(':focus')) {
      thisObj.bodyDiv.focus();
    }
    event.preventDefault();
  });

  this.bodyDiv.mouseup(function (event) {
    if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
    }
  })

  this.seekHead.mouseup(function (event) {
    if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
      thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
    }
  });

  this.bodyDiv.keydown(function (event) {
    // Home
    if (event.which === 36) {
      thisObj.trackImmediatelyTo(0);
    }
    // End
    else if (event.which === 35) {
      thisObj.trackImmediatelyTo(thisObj.duration);
    }
    // Left arrow or down arrow
    else if (event.which === 37 || event.which === 40) {
      thisObj.arrowKeyDown(-1);
    }
    // Right arrow or up arrow
    else if (event.which === 39 || event.which === 38) {
      thisObj.arrowKeyDown(1);
    }
    else {
      return;
    }
    event.preventDefault();
  });

  this.bodyDiv.keyup(function (event) {
    if (event.which === 35 || event.which === 36 || event.which === 37 || event.which === 38 || event.which === 39 || event.which === 40) {
      if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
        thisObj.stopTracking(thisObj.keyTrackPosition);
      }
      event.preventDefault();
    }
  });
}

AccessibleSeekBar.prototype.arrowKeyDown = function (multiplier) {
  if (this.tracking && this.trackDevice === 'keyboard') {
    this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
    this.inertiaCount += 1;
    if (this.inertiaCount === 20) {
      this.inertiaCount = 0;
      this.nextStep *= 2;
    }
    this.trackHeadAtPosition(this.keyTrackPosition);
  }
  else {
    this.nextStep = 1;
    this.inertiaCount = 0;
    this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
    this.startTracking('keyboard', this.keyTrackPosition);
    this.trackHeadAtPosition(this.keyTrackPosition);
  }
};

AccessibleSeekBar.prototype.pageXToPosition = function (pageX) {
  var offset = pageX - this.bodyDiv.offset().left;
  var position = this.duration * (offset / this.bodyDiv.width());
  return this.boundPos(position);
};

AccessibleSeekBar.prototype.boundPos = function (position) {
  return Math.max(0, Math.min(position, this.duration));
}

AccessibleSeekBar.prototype.setDuration = function (duration) {
  if (duration !== this.duration) {
    this.duration = duration;
    this.resetHeadLocation();
    this.seekHead.attr('aria-value-max', duration);
  }
};

AccessibleSeekBar.prototype.setWidth = function (width) {
  this.wrapperDiv.width(width);
  this.resetHeadLocation();
};

// Stops tracking, sets the head location to the current position.
AccessibleSeekBar.prototype.resetHeadLocation = function () {
  var ratio = this.position / this.duration;
  var center = this.bodyDiv.width() * ratio;
  this.seekHead.css('left', center - (this.seekHead.width() / 2));

  if (this.tracking) {
    this.stopTracking(this.position);
  }
};

AccessibleSeekBar.prototype.setPosition = function (position) {
  this.position = position;
  this.resetHeadLocation();
  this.refreshTooltip();
}

AccessibleSeekBar.prototype.startTracking = function (device, position) {
  this.trackDevice = device;
  this.tracking = true;
  this.bodyDiv.trigger('startTracking', [position]);
};

AccessibleSeekBar.prototype.stopTracking = function (position) {
  this.trackDevice = null;
  this.tracking = false;
  this.bodyDiv.trigger('stopTracking', [position]);
  this.setPosition(position);
};

AccessibleSeekBar.prototype.trackHeadAtPageX = function (pageX) {
  var position = this.pageXToPosition(pageX);
  var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
  newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
  this.lastTrackPosition = position;
  this.seekHead.css('left', newLeft);
  this.reportTrackAtPosition(position);
};

AccessibleSeekBar.prototype.trackHeadAtPosition = function (position) {
  var ratio = position / this.duration;
  var center = this.bodyDiv.width() * ratio;
  this.lastTrackPosition = position;
  this.seekHead.css('left', center - (this.seekHead.width() / 2));
  this.reportTrackAtPosition(position);
};

AccessibleSeekBar.prototype.reportTrackAtPosition = function (position) {
  this.bodyDiv.trigger('tracking', [position]);

  // TODO: Localize, move to another function.
  var pMinutes = Math.floor(position / 60);
  var pSeconds = Math.floor(position % 60);
  var dMinutes = Math.floor(this.duration / 60);
  var dSeconds = Math.floor(this.duration % 60);

  var pMinuteWord = pMinutes === 1 ? 'minute' : 'minutes';
  var pSecondWord = pSeconds === 1 ? 'second' : 'seconds';

  var descriptionText = pMinutes +
    ' ' + pMinuteWord +
    ', ' + pSeconds +
    ' ' + pSecondWord;

  this.seekHead.attr('title', descriptionText);
  this.seekHead.attr('aria-value-text', descriptionText);
  this.seekHead.attr('aria-valuenow', position);
}

AccessibleSeekBar.prototype.trackImmediatelyTo = function (position) {
  this.startTracking('keyboard', position);
  this.trackHeadAtPosition(position);
  this.keyTrackPosition = position;
};

AccessibleSeekBar.prototype.refreshTooltip = function () {
  if (this.overHead) {
    if (this.tracking) {
      this.timeTooltip.text(this.positionToStr(this.lastTrackPosition));
    }
    else {
      this.timeTooltip.text(this.positionToStr(this.position));
    }
    this.timeTooltip.show();
    this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2), 0);
  }
  else if (this.overBody && this.overBodyMousePos) {
    this.timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
    this.timeTooltip.show();
    this.setTooltipPosition(this.overBodyMousePos.x - this.bodyDiv.offset().left, this.overBodyMousePos.y - this.bodyDiv.offset().top);
  }
  else {
    this.timeTooltip.hide();
  }
};

AccessibleSeekBar.prototype.setTooltipPosition = function (x, y) {
  this.timeTooltip.css({
    width: this.timeTooltip.width(),
    height: this.timeTooltip.height(),
    left: x - (this.timeTooltip.width() / 2) - 10,
    top: this.seekHead.height()
  });
}

AccessibleSeekBar.prototype.positionToStr = function (position) {
  var minutes = Math.floor(position / 60);
  var seconds = Math.floor(position % 60);

  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  return minutes + ':' + seconds;
}
