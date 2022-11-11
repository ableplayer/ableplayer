
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

		if (this.okToPlay) {
			autoplay = 'true';
		}
		else {
			autoplay = 'false';
		}

		if (this.playerWidth) {			
			if (this.vimeoUrlHasParams) { 
				// use url param, not id 
				options = {
					url: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			}
			else { 
				options = {
					id: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			}
		}
		else { 
			// initialize without width & set width later 
			if (this.vimeoUrlHasParams) { 
				options = {
					url: vimeoId,
					controls: false
				}
			}
			else { 
				options = {
					id: vimeoId,
					controls: false
				}
			}
		}

		this.vimeoPlayer = new Vimeo.Player(containerId, options);

		this.vimeoPlayer.ready().then(function() {
			// add tabindex -1 on iframe so vimeo frame cannot be focused on
			$('#'+containerId).children('iframe').attr({
				'tabindex': '-1',
				'aria-hidden': true
			});

			// get video's intrinsic size and initiate player dimensions
			thisObj.vimeoPlayer.getVideoWidth().then(function(width) {						
				if (width) { 
					// also get height 
					thisObj.vimeoPlayer.getVideoHeight().then(function(height) {	
						if (height) { 								
							thisObj.resizePlayer(width,height); 								
						}
					});														
				}
			}).catch(function(error) {
				// an error occurred getting height or width 
				// TODO: Test this to see how gracefully it organically recovers 
			});

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

	AblePlayer.prototype.getVimeoPosterUrl = function (vimeoId, width) {

		// this is a placeholder, copied from getYouTubePosterUrl()
		// Vimeo doesn't seem to have anything similar, 
		// nor does it seem to be possible to get the poster via the Vimeo API
		// Vimeo playlist support (with thumbnail images) may require use of data-poster 

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

	AblePlayer.prototype.getVimeoId = function (url) {
		
		// return a Vimeo ID, extracted from a full Vimeo URL
		// Supported URL patterns are anything containing 'vimeo.com'
		//  and ending with a '/' followed by the ID. 
		// (Vimeo IDs do not have predicatable lengths)
		
		// Update: If URL contains parameters, return the full url 
		// This will need to be passed to the Vimeo Player API 
		// as a url parameter, not as an id parameter		 
		this.vimeoUrlHasParams = false; 
	
		var idStartPos, id; 

		if (typeof url === 'number') { 
			// this is likely already a vimeo ID 
			return url; 
		}
		else if (url.indexOf('vimeo.com') !== -1) { 
			// this is a full Vimeo URL 
			if (url.indexOf('?') !== -1) { 
				// URL contains parameters 
				this.vimeoUrlHasParams = true; 
				return url; 
			}
			else { 			
				url = url.trim(); 
				idStartPos = url.lastIndexOf('/') + 1; 
				id = url.substring(idStartPos); 
				return id; 
			}
		}
		else { 
			return url; 
		}
};	

})(jQuery);
