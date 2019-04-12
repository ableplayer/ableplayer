
(function ($) {
	AblePlayer.prototype.initYouTubePlayer = function () {

		var thisObj, deferred, promise, youTubeId, googleApiPromise, json;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		// if a described version is available && user prefers desription
		// init player using the described version
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}
		this.activeYouTubeId = youTubeId;
		if (AblePlayer.youtubeIframeAPIReady) {
			// Script already loaded and ready.
			this.finalizeYoutubeInit().then(function() {
				deferred.resolve();
			});
		}
		else {
			// Has another player already started loading the script? If so, abort...
			if (!AblePlayer.loadingYoutubeIframeAPI) {
				$.getScript('https://www.youtube.com/iframe_api').fail(function () {
					deferred.fail();
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youtubeIframeAPIReady', function () {
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
		// For Able Player, init player with value of 0
		// and will turn them on or off after player is initialized
		// based on availability of local tracks and user's Able Player prefs
		ccLoadPolicy = 0;

		videoDimensions = this.getYouTubeDimensions(this.activeYouTubeId, containerId);
		if (videoDimensions) {
			this.ytWidth = videoDimensions[0];
			this.ytHeight = videoDimensions[1];
			this.aspectRatio = thisObj.ytWidth / thisObj.ytHeight;
		}
		else {
			// dimensions are initially unknown
			// sending null values to YouTube results in a video that uses the default YouTube dimensions
			// these can then be scraped from the iframe and applied to this.$ableWrapper
			this.ytWidth = null;
			this.ytHeight = null;
		}

		if (this.okToPlay) {
			autoplay = 1;
		}
		else {
			autoplay = 0;
		}

		// NOTE: YouTube is changing the following parameters on or after Sep 25, 2018:
		// rel - No longer able to prevent YouTube from showing related videos
		//			value of 0 now limits related videos to video's same channel
		// showinfo - No longer supported (previously, value of 0 hid title, share, & watch later buttons
		// Documentation https://developers.google.com/youtube/player_parameters

		this.youTubePlayer = new YT.Player(containerId, {
			videoId: this.activeYouTubeId,
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			width: this.ytWidth,
			height: this.ytHeight,
			playerVars: {
				autoplay: autoplay,
				enablejsapi: 1,
				disableKb: 1, // disable keyboard shortcuts, using our own
				playsinline: this.playsInline,
				start: this.startTime,
				controls: 0, // no controls, using our own
				cc_load_policy: ccLoadPolicy,
				hl: this.lang, // use the default language UI
				modestbranding: 1, // no YouTube logo in controller
				rel: 0, // do not show related videos when video ends
				html5: 1, // force html5 if browser supports it (undocumented parameter; 0 does NOT force Flash)
				iv_load_policy: 3 // do not show video annotations
			},
			events: {
				onReady: function () {
					if (thisObj.swappingSrc) {
						// swap is now complete
						thisObj.swappingSrc = false;
						thisObj.cueingPlaylistItem = false;
						if (thisObj.playing) {
							// resume playing
							thisObj.playMedia();
						}
					}
					if (thisObj.userClickedPlaylist) {
						thisObj.userClickedPlaylist = false; // reset
					}
					if (typeof thisObj.aspectRatio === 'undefined') {
						thisObj.resizeYouTubePlayer(thisObj.activeYouTubeId, containerId);
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
				},
				onPlaybackQualityChange: function () {
					// do something
				},
				onApiChange: function (x) {
					// As of Able Player v2.2.23, we are now getting caption data via the YouTube Data API
					// prior to calling initYouTubePlayer()
					// Previously we got caption data via the YouTube iFrame API, and doing so was an awful mess.
					// onApiChange fires to indicate that the player has loaded (or unloaded) a module with exposed API methods
					// it isn't fired until the video starts playing
					// if captions are available for this video (automated captions don't count)
					// the 'captions' (or 'cc') module is loaded. If no captions are available, this event never fires
					// So, to trigger this event we had to play the video briefly, then pause, then reset.
					// During that brief moment of playback, the onApiChange event was fired and we could setup captions
					// The 'captions' and 'cc' modules are very different, and have different data and methods
					// NOW, in v2.2.23, we still need to initialize the caption modules in order to control captions
					// but we don't have to do that on load in order to get caption data
					// Instead, we can wait until the video starts playing normally, then retrieve the modules
					thisObj.initYouTubeCaptionModule();
				}
			}
		});

		this.injectPoster(this.$mediaContainer, 'youtube');
		if (!this.hasPlaylist) {
			// remove the media element, since YouTube replaces that with its own element in an iframe
			// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
			this.$media.remove();
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeDimensions = function (youTubeContainerId) {

		// get dimensions of YouTube video, return array with width & height
		// Sources, in order of priority:
		// 1. The width and height attributes on <video>
		// 2. YouTube (not yet supported; can't seem to get this data via YouTube Data API without OAuth!)

		var d, url, $iframe, width, height;

		d = [];

		if (typeof this.playerMaxWidth !== 'undefined') {
			d[0] = this.playerMaxWidth;
			// optional: set height as well; not required though since YouTube will adjust height to match width
			if (typeof this.playerMaxHeight !== 'undefined') {
				d[1] = this.playerMaxHeight;
			}
			return d;
		}
		else {
			if (typeof $('#' + youTubeContainerId) !== 'undefined') {
				$iframe = $('#' + youTubeContainerId);
				width = $iframe.width();
				height = $iframe.height();
				if (width > 0 && height > 0) {
					d[0] = width;
					d[1] = height;
					return d;
				}
			}
		}
		return false;
	};

	AblePlayer.prototype.resizeYouTubePlayer = function(youTubeId, youTubeContainerId) {

		// called after player is ready, if youTube dimensions were previously unknown
		// Now need to get them from the iframe element that YouTube injected
		// and resize Able Player to match
		var d, width, height;
		if (typeof this.aspectRatio !== 'undefined') {
			// video dimensions have already been collected
			if (this.restoringAfterFullScreen) {
				// restore using saved values
				if (this.youTubePlayer) {
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
				this.restoringAfterFullScreen = false;
			}
			else {
				// recalculate with new wrapper size
				width = this.$ableWrapper.parent().width();
				height = Math.round(width / this.aspectRatio);
				this.$ableWrapper.css({
					'max-width': width + 'px',
					'width': ''
				});
				this.youTubePlayer.setSize(width, height);
				if (this.fullscreen) {
					this.youTubePlayer.setSize(width, height);
				}
				else {
					// resizing due to a change in window size, not full screen
					this.youTubePlayer.setSize(this.ytWidth, this.ytHeight);
				}
			}
		}
		else {
			d = this.getYouTubeDimensions(youTubeContainerId);
			if (d) {
				width = d[0];
				height = d[1];
				if (width > 0 && height > 0) {
					this.aspectRatio = width / height;
					this.ytWidth = width;
					this.ytHeight = height;
					if (width !== this.$ableWrapper.width()) {
						// now that we've retrieved YouTube's default width,
						// need to adjust to fit the current player wrapper
						width = this.$ableWrapper.width();
						height = Math.round(width / this.aspectRatio);
						if (this.youTubePlayer) {
							this.youTubePlayer.setSize(width, height);
						}
					}
				}
			}
		}
	};

	AblePlayer.prototype.setupYouTubeCaptions = function () {

		// called from setupAltCaptions if player is YouTube and there are no <track> captions

		// use YouTube Data API to get caption data from YouTube
		// function is called only if these conditions are met:
		// 1. this.player === 'youtube'
		// 2. there are no <track> elements with kind="captions"
		// 3. youTubeDataApiKey is defined

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, googleApiPromise, youTubeId, i;

		thisObj = this;

		// if a described version is available && user prefers desription
		// Use the described version, and get its captions
		if (this.youTubeDescId && this.prefDesc) {
			youTubeId = this.youTubeDescId;
		}
		else {
			youTubeId = this.youTubeId;
		}

		if (typeof youTubeDataAPIKey !== 'undefined') {
			// Wait until Google Client API is loaded
			// When loaded, it sets global var googleApiReady to true

			// Thanks to Paul Tavares for $.doWhen()
			// https://gist.github.com/purtuga/8257269
			$.doWhen({
				when: function(){
					return googleApiReady;
				},
				interval: 100, // ms
				attempts: 1000
			})
			.done(function(){
					deferred.resolve();
			})
			.fail(function(){
				console.log('Unable to initialize Google API. YouTube captions are currently unavailable.');
			});
		}
		else {
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.waitForGapi = function () {

		// wait for Google API to initialize

		var thisObj, deferred, promise, maxWaitTime, maxTries, tries, timer, interval;

		thisObj = this;
		deferred = new $.Deferred();
		promise = deferred.promise();
		maxWaitTime = 5000; // 5 seconds
		maxTries = 100; // number of tries during maxWaitTime
		tries = 0;
		interval = Math.floor(maxWaitTime/maxTries);

		timer = setInterval(function() {
			tries++;
			if (googleApiReady || tries >= maxTries) {
				clearInterval(timer);
				if (googleApiReady) { // success!
					deferred.resolve(true);
				}
				else { // tired of waiting
					deferred.resolve(false);
				}
			}
			else {
				thisObj.waitForGapi();
			}
		}, interval);
		return promise;
	};

	AblePlayer.prototype.getYouTubeCaptionTracks = function (youTubeId) {

		// get data via YouTube Data API, and push data to this.captions
		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, useGoogleApi, i, trackId, trackLang, trackName, trackLabel, trackKind, isDraft, isDefaultTrack;

		thisObj = this;

		if (typeof youTubeDataAPIKey !== 'undefined') {
			this.waitForGapi().then(function(waitResult) {

				useGoogleApi = waitResult;

				// useGoogleApi returns false if API failed to initalize after max wait time
				// Proceed only if true. Otherwise can still use fallback method (see else loop below)
				if (useGoogleApi === true) {
					gapi.client.setApiKey(youTubeDataAPIKey);
					gapi.client
						.load('youtube', 'v3')
						.then(function() {
							var request = gapi.client.youtube.captions.list({
								'part': 'id, snippet',
								'videoId': youTubeId
							});
							request.then(function(json) {
								if (json.result.items.length) { // video has captions!
									thisObj.hasCaptions = true;
									thisObj.usingYouTubeCaptions = true;
									if (thisObj.prefCaptions === 1) {
										thisObj.captionsOn = true;
									}
									else {
										thisObj.captionsOn = false;
									}
									// Step through results and add them to cues array
									for (i=0; i < json.result.items.length; i++) {
										trackName = json.result.items[i].snippet.name; // usually seems to be empty
										trackLang = json.result.items[i].snippet.language;
										trackKind = json.result.items[i].snippet.trackKind; // ASR, standard, forced
										isDraft = json.result.items[i].snippet.isDraft; // Boolean
										// Other variables that could potentially be collected from snippet:
										// isCC - Boolean, always seems to be false
										// isLarge - Boolean
										// isEasyReader - Boolean
										// isAutoSynced	 Boolean
										// status - string, always seems to be "serving"

										var srcUrl = thisObj.getYouTubeTimedTextUrl(youTubeId,trackName,trackLang);
										if (trackKind !== 'ASR' && !isDraft) {

											if (trackName !== '') {
												 trackLabel = trackName;
											}
											else {
												 // if track name is empty (it always seems to be), assign a label based on trackLang
												 trackLabel = thisObj.getLanguageName(trackLang);
											}

											// assign the default track based on language of the player
											if (trackLang === thisObj.lang) {
												isDefaultTrack = true;
											}
											else {
												isDefaultTrack = false;
											}
											thisObj.tracks.push({
												'kind': 'captions',
												'src': srcUrl,
												'language': trackLang,
												'label': trackLabel,
												'def': isDefaultTrack
											});
										}
									}
									// setupPopups again with new captions array, replacing original
									thisObj.setupPopups('captions');
									deferred.resolve();
								}
								else {
									thisObj.hasCaptions = false;
									thisObj.usingYouTubeCaptions = false;
									deferred.resolve();
								}
							}, function (reason) {
								// If video has no captions, YouTube returns an error.
								// Should still proceed, but with captions disabled
								// The specific error, if needed: reason.result.error.message
								// If no captions, the error is: "The video identified by the <code>videoId</code> parameter could not be found."
								console.log('Error retrieving captions.');
								console.log('Check your video on YouTube to be sure captions are available and published.');
								thisObj.hasCaptions = false;
								thisObj.usingYouTubeCaptions = false;
								deferred.resolve();
							});
						})
				}
				else {
					// googleAPi never loaded.
					this.getYouTubeCaptionTracks2(youTubeId).then(function() {
						deferred.resolve();
					});
				}
			});
		}
		else {
			// web owner hasn't provided a Google API key
			// attempt to get YouTube captions via the backup method
			this.getYouTubeCaptionTracks2(youTubeId).then(function() {
				deferred.resolve();
			});
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeCaptionTracks2 = function (youTubeId) {

	 	// Use alternative backup method of getting caption tracks from YouTube
	 	// and pushing them to this.captions
	 	// Called from getYouTubeCaptionTracks if no Google API key is defined
	 	// or if Google API failed to initiatlize
	 	// This method seems to be undocumented, but is referenced on StackOverflow
	 	// We'll use that as a fallback but it could break at any moment

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, useGoogleApi, i, trackId, trackLang, trackName, trackLabel, trackKind, isDraft, isDefaultTrack;

		thisObj = this;

		$.ajax({
			type: 'get',
			url: 'https://www.youtube.com/api/timedtext?type=list&v=' + youTubeId,
			dataType: 'xml',
			success: function(xml) {
				var $tracks = $(xml).find('track');
				if ($tracks.length > 0) {	 // video has captions!
					thisObj.hasCaptions = true;
					thisObj.usingYouTubeCaptions = true;
					if (thisObj.prefCaptions === 1) {
						thisObj.captionsOn = true;
					}
					else {
						thisObj.captionsOn = false;
					}
					// Step through results and add them to tracks array
					$tracks.each(function() {
						trackId = $(this).attr('id');
						trackLang = $(this).attr('lang_code');
						if ($(this).attr('name') !== '') {
							trackName = $(this).attr('name');
							trackLabel = trackName;
						}
						else {
							// @name is typically null except for default track
							// but lang_translated seems to be reliable
							trackName = '';
							trackLabel = $(this).attr('lang_translated');
						}
						if (trackLabel === '') {
							trackLabel = thisObj.getLanguageName(trackLang);
						}
						// assign the default track based on language of the player
						if (trackLang === thisObj.lang) {
							isDefaultTrack = true;
						}
						else {
							isDefaultTrack = false;
						}

						// Build URL for retrieving WebVTT source via YouTube's timedtext API
						var srcUrl = thisObj.getYouTubeTimedTextUrl(youTubeId,trackName,trackLang);
						thisObj.tracks.push({
							'kind': 'captions',
							'src': srcUrl,
							'language': trackLang,
							'label': trackLabel,
							'def': isDefaultTrack
						});

					});
					// setupPopups again with new captions array, replacing original
					thisObj.setupPopups('captions');
					deferred.resolve();
				}
				else {
					thisObj.hasCaptions = false;
					thisObj.usingYouTubeCaptions = false;
					deferred.resolve();
				}
			},
			error: function(xhr, status) {
				console.log('Error retrieving YouTube caption data for video ' + youTubeId);
				deferred.resolve();
			}
		});
		return promise;
	};

	AblePlayer.prototype.getYouTubeTimedTextUrl = function (youTubeId, trackName, trackLang) {

		// return URL for retrieving WebVTT source via YouTube's timedtext API
		// Note: This API seems to be undocumented, and could break anytime
		var url = 'https://www.youtube.com/api/timedtext?fmt=vtt';
		url += '&v=' + youTubeId;
		url += '&lang=' + trackLang;
		// if track has a value in the name field, it's *required* in the URL
		if (trackName !== '') {
			url += '&name=' + trackName;
		}
		return url;
	};


	AblePlayer.prototype.getYouTubeCaptionCues = function (youTubeId) {

		var deferred, promise, thisObj;

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		thisObj = this;

		this.tracks = [];
		this.tracks.push({
			'kind': 'captions',
			'src': 'some_file.vtt',
			'language': 'en',
			'label': 'Fake English captions'
		});

		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.initYouTubeCaptionModule = function () {

		// This function is called when YouTube onApiChange event fires
		// to indicate that the player has loaded (or unloaded) a module with exposed API methods
		// it isn't fired until the video starts playing
		// and only fires if captions are available for this video (automated captions don't count)
		// If no captions are available, onApichange event never fires & this function is never called

		// YouTube iFrame API documentation is incomplete related to captions
		// Found undocumented features on user forums and by playing around
		// Details are here: http://terrillthompson.com/blog/648
		// Summary:
		// User might get either the AS3 (Flash) or HTML5 YouTube player
		// The API uses a different caption module for each player (AS3 = 'cc'; HTML5 = 'captions')
		// There are differences in the data and methods available through these modules
		// This function therefore is used to determine which captions module is being used
		// If it's a known module, this.ytCaptionModule will be used elsewhere to control captions
		var options, fontSize, displaySettings;

		options = this.youTubePlayer.getOptions();
		if (options.length) {
			for (var i=0; i<options.length; i++) {
				if (options[i] == 'cc') { // this is the AS3 (Flash) player
					this.ytCaptionModule = 'cc';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
				else if (options[i] == 'captions') { // this is the HTML5 player
					this.ytCaptionModule = 'captions';
					if (!this.hasCaptions) {
						// there are captions available via other sources (e.g., <track>)
						// so use these
						this.hasCaptions = true;
						this.usingYouTubeCaptions = true;
					}
					break;
				}
			}
			if (typeof this.ytCaptionModule !== 'undefined') {
				if (this.usingYouTubeCaptions) {
					// set default languaage
					this.youTubePlayer.setOption(this.ytCaptionModule, 'track', {'languageCode': this.captionLang});
					// set font size using Able Player prefs (values are -1, 0, 1, 2, and 3, where 0 is default)
					this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',this.prefCaptionsSize,'youtube'));
					// ideally could set other display options too, but no others seem to be supported by setOption()
				}
				else {
					// now that we know which cc module was loaded, unload it!
					// we don't want it if we're using local <track> elements for captions
					this.youTubePlayer.unloadModule(this.ytCaptionModule)
				}
			}
		}
		else {
			// no modules were loaded onApiChange
			// unfortunately, gonna have to disable captions if we can't control them
			this.hasCaptions = false;
			this.usingYouTubeCaptions = false;
		}
		this.refreshControls('captions');
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

})(jQuery);
