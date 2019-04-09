
(function ($) {
	AblePlayer.prototype.initVimeoPlayer = function () {

		var thisObj, deferred, promise, containerId, vimeoId, autoplay, videoDimensions, options;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		deferred.resolve();

		containerId = this.mediaId + '_vimeo';

		// add container to which Vimeo player iframe will be appended
		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		// if a described version is available && user prefers desription
		// init player using the described version
		if (this.vimeoDescId && this.prefDesc) {
			vimeoId = this.vimeoDescId;
		}
		else {
			vimeoId = this.vimeoId;
		}
		this.activeVimeoId = vimeoId;

		// Notes re. Vimeo Embed Options:
		// If a video is owned by a user with a paid Plus, PRO, or Business account,
		// setting the "background" option to "true" will hide the default controls.
		// It has no effect on videos owned by a free basic account owner (their controls cannot be hidden).
		// Also, setting "background" to "true" has a couple of side effects:
		// In addition to hiding the controls, it also autoplays and loops the video.
		// If the player is initialized with options to set both "autoplay" and "loop" to "false",
		// this does not override the "background" setting.
		// Passing this.autoplay and this.loop anyway, just in case it works someday
		// Meanwhile, workaround is to setup an event listener to immediately pause after video autoplays

		if (this.autoplay && this.okToPlay) {
			autoplay = 'true';
		}
		else {
			autoplay = 'false';
		}

		videoDimensions = this.getVimeoDimensions(this.activeVimeoId, containerId);
		if (videoDimensions) {
			this.vimeoWidth = videoDimensions[0];
			this.vimeoHeight = videoDimensions[1];
			this.aspectRatio = thisObj.ytWidth / thisObj.ytHeight;
		}
		else {
			// dimensions are initially unknown
			// sending null values to Vimeo results in a video that uses the default Vimeo dimensions
			// these can then be scraped from the iframe and applied to this.$ableWrapper
			this.vimeoWidth = null;
			this.vimeoHeight = null;
		}
		options = {
				id: vimeoId,
				width: this.vimeoWidth,
				background: true,
				autoplay: this.autoplay,
				loop: this.loop
		};

		this.vimeoPlayer = new Vimeo.Player(containerId, options);

		this.vimeoPlayer.ready().then(function() {

			if (!thisObj.hasPlaylist) {
				// remove the media element, since Vimeo replaces that with its own element in an iframe
				// this is handled differently for playlists. See buildplayer.js > cuePlaylistItem()
				thisObj.$media.remove();

				// define variables that will impact player setup

				// vimeoSupportsPlaybackRateChange
				// changing playbackRate is only supported if the video is hosted on a Pro or Business account
				// unfortunately there is no direct way to query for that information.
				// this.vimeoPlayer.getPlaybackRate() returns a value, regardless of account type
				// This is a hack:
				// Attempt to change the playbackRate. If it results in an error, assume changing playbackRate is not supported.
				// Supported playbackRate values are 0.5 to 2.
				thisObj.vimeoPlaybackRate = 1;
				thisObj.vimeoPlayer.setPlaybackRate(thisObj.vimeoPlaybackRate).then(function(playbackRate) {
				// playback rate was set
					thisObj.vimeoSupportsPlaybackRateChange = true;
				}).catch(function(error) {
					thisObj.vimeoSupportsPlaybackRateChange = false;
				});
				deferred.resolve();
			}
		});
		return promise;
	};

	AblePlayer.prototype.getVimeoPaused = function () {

		var deferred, promise;
		deferred = new $.Deferred();
		promise = deferred.promise();

		this.vimeoPlayer.getPaused().then(function (paused) {
			// paused is Boolean
			deferred.resolve(paused);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoEnded = function () {

		var deferred, promise;
		deferred = new $.Deferred();
		promise = deferred.promise();

		this.vimeoPlayer.getEnded().then(function (ended) {
			// ended is Boolean
			deferred.resolve(ended);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoState = function () {

		var thisObj, deferred, promise, promises, gettingPausedPromise, gettingEndedPromise;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();
		promises = [];

		gettingPausedPromise = this.vimeoPlayer.getPaused();
		gettingEndedPromise = this.vimeoPlayer.getEnded();

		promises.push(gettingPausedPromise);
		promises.push(gettingEndedPromise);

		gettingPausedPromise.then(function (paused) {
			deferred.resolve(paused);
		});
		gettingEndedPromise.then(function (ended) {
			deferred.resolve(ended);
		});
		$.when.apply($, promises).then(function () {
			deferred.resolve();
		});
		return promise;
	}

	AblePlayer.prototype.getVimeoDimensions = function (vimeoContainerId) {

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
			if (typeof $('#' + vimeoContainerId) !== 'undefined') {
				$iframe = $('#' + vimeoContainerId);
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

	AblePlayer.prototype.resizeVimeoPlayer = function(youTubeId, youTubeContainerId) {

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
			d = this.getYouTubeDimensions(youTubeId, youTubeContainerId);
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

	AblePlayer.prototype.setupVimeoCaptions = function () {

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

	AblePlayer.prototype.getVimeoCaptionTracks = function () {

		// get data via Vimeo Player API, and push data to this.captions
		// Note: Vimeo doesn't expose the caption cues themselves
		// so this.captions will only include metadata about caption tracks; not cues
		var deferred = new $.Deferred();
		var promise = deferred.promise();

		var thisObj, i, trackId, isDefaultTrack;

		thisObj = this;

		this.vimeoPlayer.getTextTracks().then(function(tracks) {

				// each Vimeo track includes the following:
				// label (local name of the language)
				// language (2-character code)
				// kind (captions or subtitles, as declared by video owner)
				// mode ('disabled' or 'showing')

				if (tracks.length) {

					// create a new button for each caption track
					for (i=0; i<tracks.length; i++) {

						thisObj.hasCaptions = true;
						thisObj.usingVimeoCaptions = true;
						if (thisObj.prefCaptions === 1) {
								thisObj.captionsOn = true;
						}
						else {
							thisObj.captionsOn = false;
						}
						// assign the default track based on language of the player
						if (tracks[i]['language'] === thisObj.lang) {
							isDefaultTrack = true;
						}
						else {
								isDefaultTrack = false;
						}
						thisObj.tracks.push({
								'kind': tracks[i]['kind'],
							'language': tracks[i]['language'],
							'label': tracks[i]['label'],
							'def': isDefaultTrack
						});
					}

					// setupPopups again with new captions array, replacing original
					thisObj.setupPopups('captions');
					deferred.resolve();
			 	}
			 	else {
						thisObj.hasCaptions = false;
					thisObj.usingVimeoCaptions = false;
					deferred.resolve();
				}
			});

		return promise;
	};

	AblePlayer.prototype.initVimeoCaptionModule = function () {
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

	AblePlayer.prototype.getVimeoPosterUrl = function (youTubeId, width) {

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
