
(function ($) {
	AblePlayer.prototype.initYouTubePlayer = function () {

		var thisObj, deferred, promise, youTubeId, googleApiPromise, json;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		this.youTubePlayerReady = false; 

		// if a described version is available && user prefers desription
		// init player using the described version
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}
		this.activeYouTubeId = youTubeId;
		if (AblePlayer.youTubeIframeAPIReady) {
			// Script already loaded and ready.
			thisObj.finalizeYoutubeInit().then(function() {
				deferred.resolve();
			});
		}
		else {
			// Has another player already started loading the script? If so, abort...
			if (!AblePlayer.loadingYouTubeIframeAPI) {
				$.getScript('https://www.youtube.com/iframe_api').fail(function () {
					deferred.fail();
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeInit = function () {

		// This is called once we're sure the Youtube iFrame API is loaded -- see above

		var deferred, promise, thisObj, containerId, ccLoadPolicy, videoDimensions, autoplay;

		deferred = new $.Deferred();
		promise = deferred.promise();

		thisObj = this;

		containerId = this.mediaId + '_youtube';

		this.$mediaContainer.prepend($('<div>').attr('id', containerId));
		// NOTE: Tried the following in place of the above in January 2016
		// because in some cases two videos were being added to the DOM
		// However, once v2.2.23 was fairly stable, unable to reproduce that problem
		// so maybe it's not an issue. This is preserved here temporarily, just in case it's needed...
		// thisObj.$mediaContainer.html($('<div>').attr('id', containerId));

		// cc_load_policy:
		// 0 - show captions depending on user's preference on YouTube
		// 1 - show captions by default, even if the user has turned them off
		// IMPORTANT: This *must* be set to 1 or some browsers 
		// fail to load any texttracks (observed in Chrome, not in Firefox) 
		ccLoadPolicy = 1;

		if (this.okToPlay) {
			autoplay = 1;
		}
		else {
			autoplay = 0;
		}

		// Documentation https://developers.google.com/youtube/player_parameters

		if (typeof this.captionLang == 'undefined') { 
			// init using the default player lang
			this.captionLang = this.lang; 
		}
		this.youTubePlayer = new YT.Player(containerId, {
			videoId: this.activeYouTubeId,
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				enablejsapi: 1,
				disableKb: 1, // disable keyboard shortcuts, using our own
				playsinline: this.playsInline,
				start: this.startTime,
				controls: 0, // no controls, using our own
				cc_load_policy: ccLoadPolicy,
				cc_lang_pref: this.captionLang, // set the caption language 
				hl: this.lang, // set the UI language to match Able Player 
				modestbranding: 1, // no YouTube logo in controller
				rel: 0, // when video ends, show only related videos from same channel (1 shows any)
				iv_load_policy: 3 // do not show video annotations
			},
			events: {
				onReady: function () {
					thisObj.youTubePlayerReady = true; 
					if (!thisObj.playerWidth || !thisObj.playerHeight) { 
						thisObj.getYouTubeDimensions();
					}
					if (thisObj.playerWidth && thisObj.playerHeight) { 
						thisObj.youTubePlayer.setSize(thisObj.playerWidth,thisObj.playerHeight);
						thisObj.$ableWrapper.css({
							'width': thisObj.playerWidth + 'px'
						});
					}
					if (thisObj.swappingSrc) {
						// swap is now complete
						thisObj.swappingSrc = false;
						thisObj.restoreFocus();
						thisObj.cueingPlaylistItem = false;
						if (thisObj.playing || thisObj.okToPlay) {
							// resume playing
							thisObj.playMedia();
						}
					}
					if (thisObj.userClickedPlaylist) {
						thisObj.userClickedPlaylist = false; // reset
					}
					if (thisObj.recreatingPlayer) { 
						thisObj.recreatingPlayer = false; // reset
					}
					deferred.resolve();
				},
				onError: function (x) {
					deferred.fail();
				},
				onStateChange: function (x) {				
					thisObj.getPlayerState().then(function(playerState) {
						// values of playerState: 'playing','paused','buffering','ended'
						if (playerState === 'playing') {
							thisObj.playing = true;
							thisObj.startedPlaying = true;
							thisObj.paused = false;
						}
						else if (playerState == 'ended') {
							thisObj.onMediaComplete();
						}
						else {
							thisObj.playing = false;
							thisObj.paused = true;
						}
						if (thisObj.stoppingYouTube && playerState === 'paused') {
							if (typeof thisObj.$posterImg !== 'undefined') {
								thisObj.$posterImg.show();
							}
							thisObj.stoppingYouTube = false;
							thisObj.seeking = false;
							thisObj.playing = false;
							thisObj.paused = true;
						}
					});
					// If caption tracks are hosted locally, but are also available on YouTube,
					// we need to turn them off on YouTube or there will be redundant captions 
					// This is the most reliable event on which to unload the caption module 
					if (thisObj.player === 'youtube' && !thisObj.usingYouTubeCaptions) { 						
						if (thisObj.youTubePlayer.getOptions('captions')) { 							
							thisObj.youTubePlayer.unloadModule('captions');
						}
					}			 			
				},
				onPlaybackQualityChange: function () {
					// do something
				},
			}
		});
		if (!this.hasPlaylist) {
			// remove the media element, since YouTube replaces that with its own element in an iframe
			// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
			this.$media.remove();
		}		
		return promise;
	};

	AblePlayer.prototype.getYouTubeDimensions = function (youTubeContainerId) {

		// The YouTube iframe API does not have a getSize() of equivalent method 
		// so, need to get dimensions from YouTube's iframe 

		var $iframe, width, height; 

		$iframe = this.$ableWrapper.find('iframe'); 
		if (typeof $iframe !== 'undefined') {
			if ($iframe.prop('width')) { 
				width = $iframe.prop('width');			
				if ($iframe.prop('height')) { 
					height = $iframe.prop('height');
					this.resizePlayer(width,height); 
				}
			}
		}
	};

	AblePlayer.prototype.getYouTubeCaptionTracks = function (youTubeId) {

		// get data via YouTube IFrame Player API, and push data to this.tracks & this.captions
		// NOTE: Caption tracks are not available through the IFrame Player API 
		// until AFTER the video has started playing. 
		// Therefore, this function plays the video briefly in order to load the captions module
		// then stops the video and collects the data needed to build the cc menu 
		// This is stupid, but seemingly unavoidable. 
		// Caption tracks could be obtained through the YouTube Data API 
		// but this required authors to have a Google API key, 
		// which would complicate Able Player installation 

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, ytTracks, i, trackLang, trackLabel, isDefaultTrack;

		thisObj = this;
		
		if (!this.youTubePlayer.getOption('captions','tracklist')) { 

			// no tracks were found, probably because the captions module hasn't loaded  
			// play video briefly (required in order to load the captions module) 
			// and after the apiChange event is triggered, try again to retreive tracks
			this.youTubePlayer.addEventListener('onApiChange',function(x) { 

				// getDuration() also requires video to play briefly 
				// so, let's set that while we're here 				
				thisObj.duration = thisObj.youTubePlayer.getDuration();				

				if (thisObj.loadingYouTubeCaptions) { 				
					// loadingYouTubeCaptions is a stopgap in case onApiChange is called more than once 
					ytTracks = thisObj.youTubePlayer.getOption('captions','tracklist');					
					if (!thisObj.okToPlay) { 
						// Don't stopVideo() - that cancels loading 
						// Just pause 
						// No need to seekTo(0) - so little time has passed it isn't noticeable to the user 
						thisObj.youTubePlayer.pauseVideo(); 
					}
					if (ytTracks && ytTracks.length) { 
						// Step through ytTracks and add them to global tracks array
						// Note: Unlike YouTube Data API, the IFrame Player API only returns 
						// tracks that are published, and does NOT include ASR captions 
						// So, no additional filtering is required 
						for (i=0; i < ytTracks.length; i++) {
							trackLang = ytTracks[i].languageCode; 
							trackLabel = ytTracks[i].languageName; // displayName and languageName seem to always have the same value
							isDefaultTrack = false; 
							if (typeof thisObj.captionLang !== 'undefined') { 
								if (trackLang === thisObj.captionLang) {
									isDefaultTrack = true;						
								}
							}
							else if (typeof thisObj.lang !== 'undefined') { 
								if (trackLang === thisObj.lang) {
									isDefaultTrack = true;						
								}
							}
							thisObj.tracks.push({
								'kind': 'captions',
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack
							});
							thisObj.captions.push({
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack,
								'cues': null
							});							
						}
						thisObj.hasCaptions = true;
						// setupPopups again with new captions array, replacing original
						thisObj.setupPopups('captions');				
					}
					else { 
						// there are no YouTube captions 
						thisObj.usingYouTubeCaptions = false; 
						thisObj.hasCaptions = false;
					}
					thisObj.loadingYouTubeCaptions = false; 
					if (thisObj.okToPlay) { 
						thisObj.youTubePlayer.playVideo();
					}
				}
				if (thisObj.captionLangPending) { 
					// user selected a new caption language prior to playback starting 
					// set it now 
					thisObj.youTubePlayer.setOption('captions', 'track', {'languageCode': thisObj.captionLangPending});
					thisObj.captionLangPending = null; 
				}
				if (typeof thisObj.prefCaptionsSize !== 'undefined') { 
					// set the default caption size 
					// this doesn't work until the captions module is loaded 
					thisObj.youTubePlayer.setOption('captions','fontSize',thisObj.translatePrefs('size',thisObj.prefCaptionsSize,'youtube'));
				}
				deferred.resolve();
			});
			// Trigger the above event listener by briefly playing the video 		
			this.loadingYouTubeCaptions = true; 	
			this.youTubePlayer.playVideo();		
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeTimedTextUrl = function (youTubeId, trackName, trackLang) {

		// return URL for retrieving WebVTT source via YouTube's timedtext API
		// Note: This API seems to be undocumented, and could break anytime
		// UPDATE: Google removed this API on November 10, 2021 
		// This function is no longer called, but is preserved here for reference 
		var url = 'https://www.youtube.com/api/timedtext?fmt=vtt';
		url += '&v=' + youTubeId;
		url += '&lang=' + trackLang;
		// if track has a value in the name field, it's *required* in the URL
		if (trackName !== '') {
			url += '&name=' + trackName;
		}
		return url;
	};

	AblePlayer.prototype.getYouTubePosterUrl = function (youTubeId, width) {

			 // return a URL for retrieving a YouTube poster image
			 // supported values of width: 120, 320, 480, 640

			 var url = 'https://img.youtube.com/vi/' + youTubeId;
			 if (width == '120') {
				 // default (small) thumbnail, 120 x 90
				 return url + '/default.jpg';
			 }
			 else if (width == '320') {
				 // medium quality thumbnail, 320 x 180
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '480') {
				 // high quality thumbnail, 480 x 360
				 return url + '/hqdefault.jpg';
			 }
			 else if (width == '640') {
				 // standard definition poster image, 640 x 480
				 return url + '/sddefault.jpg';
			 }
			 return false;
	};

	AblePlayer.prototype.getYouTubeId = function (url) {

		// return a YouTube ID, extracted from a full YouTube URL
		// Supported URL patterns (with http or https): 
		// https://youtu.be/xxx
		// https://www.youtube.com/watch?v=xxx
		// https://www.youtube.com/embed/xxx

		// in all supported patterns, the id is the last 11 characters 
		var idStartPos, id; 

		if (url.indexOf('youtu') !== -1) { 
			// this is a full Youtube URL 
			url = url.trim(); 
			idStartPos = url.length - 11; 
			id = url.substring(idStartPos); 
			return id; 
		}
		else { 
			return url; 
		}
};

})(jQuery);
