
(function ($) {
	AblePlayer.prototype.initVimeoPlayer = function () {

		var thisObj, deferred, promise, containerId, vimeoId, autoplay, videoDimensions, options;
		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

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
		// setting the "controls" option to "false" will hide the default controls, without hiding captions.
		// This is a new option from Vimeo; previously used "background:true" to hide the controller,
		// but that had unwanted side effects:
		//  - In addition to hiding the controls, it also hides captions
		//  - It automatically autoplays (initializing the player with autoplay:false does not override this)
		//  - It automatically loops (but this can be overridden by initializing the player with loop:false)
		//  - It automatically sets volume to 0 (not sure if this can be overridden, since no longer using the background option)

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
			controls: false
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

		// get dimensions of Vimeo video, return array with width & height

		var d, url, $iframe, width, height;

		d = [];

		if (typeof this.playerMaxWidth !== 'undefined') {
			d[0] = this.playerMaxWidth;
			// optional: set height as well; not required though since Vimeo will adjust height to match width
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
					thisObj.captions = thisObj.tracks; 
					thisObj.hasCaptions = true;

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

})(jQuery);
