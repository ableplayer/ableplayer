(function ($) {
	AblePlayer.prototype.initSignLanguage = function() {
		this.hasSignLanguage = false;
		// Sign language is only currently supported in HTML5 player and YouTube.
		var hasLocalSrc = ( this.$sources.first().attr('data-sign-src') !== undefined && this.$sources.first().attr('data-sign-src') !== "" );
		// YouTube src can either be on a `source` element or on the `video` element.
		var hasRemoteSrc = ( this.$media.data('youtube-sign-src') !== undefined && this.$media.data('youtube-sign-src') !== "" );
		var hasRemoteSource = ( this.$sources.first().attr('data-youtube-sign-src') !== undefined && this.$sources.first().attr('data-youtube-sign-src') !== '' );
		if ( ! this.isIOS() && ( hasLocalSrc || hasRemoteSrc || hasRemoteSource ) && ( this.player === 'html5' || this.player === 'youtube' ) ) {
			// check to see if there's a sign language video accompanying this video
			// check only the first source
			// If sign language is provided, it must be provided for all sources
			let ytSignSrc = this.youTubeSignId ?? DOMPurify.sanitize( this.$sources.first().attr('data-youtube-sign-src') );
			let signSrc = DOMPurify.sanitize( this.$sources.first().attr('data-sign-src') );
			let signVideo = DOMPurify.sanitize( this.$media.data('youtube-sign-src') );
			this.signFile = (hasLocalSrc ) ? signSrc : false;
			if ( hasRemoteSrc ) {
				this.signYoutubeId = signVideo;
			} else if ( hasRemoteSource ) {
				this.signYoutubeId = ytSignSrc;
			}
			if ( this.signFile || this.signYoutubeId ) {
				if (this.isIOS()) {
					// iOS does not allow multiple videos to play simultaneously
					// Therefore, sign language as rendered by Able Player unfortunately won't work
					if (this.debug) {
						console.log('Sign language has been disabled due to iOS restrictions');
					}
				} else {
					if (this.debug) {
						console.log('This video has an accompanying sign language video: ' + this.signFile);
					}
					this.hasSignLanguage = true;
					this.injectSignPlayerCode();
				}
			}
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		// create and inject surrounding HTML structure
		var thisObj, signVideoId, i, signSrc, srcType, $signSource;

		thisObj = this;
		signVideoId = this.mediaId + '-sign';

		if ( this.signFile || this.signYoutubeId ) {
			if ( null !== this.$signDivLocation ) {
				this.$signDivLocation.addClass( 'able-sign-window able-fixed' );
				this.$signWindow = this.$signDivLocation;
			} else {
				this.$signWindow = $('<div>',{
					'class' : 'able-sign-window',
					'role': 'dialog',
					'aria-label': this.translate( 'sign', 'Sign language' )
				});
				this.$signToolbar = $('<div>',{
					'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
				});
				this.$signWindow.append(this.$signToolbar);
			}

			this.$ableWrapper.append(this.$signWindow);
		}

		if ( this.signFile ) {
			this.$signVideo = $('<video>',{
				'id' : signVideoId,
				'tabindex' : '-1',
				'muted' : true,
			});
			this.signVideo = this.$signVideo[0];

			if ( this.signFile ) {
				$signSource = $('<source>',{
					'src' : this.signFile,
					'type' : 'video/' + this.signFile.substr(-3)
				});
				this.$signVideo.append($signSource);
			} else {
				// for each original <source>, add a <source> to the sign <video>
				for (i=0; i < this.$sources.length; i++) {
					signSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-sign-src') );
					srcType = this.$sources[i].getAttribute('type');
					if (signSrc) {
						$signSource = $('<source>',{
							'src' : signSrc,
							'type' : srcType
						});
						this.$signVideo.append($signSource);
					} else {
						// source is missing a sign language version
						// can't include sign language
						this.hasSignLanguage = false;
						return;
					}
				}
			}
			this.$signWindow.append( this.$signVideo );
		} else if ( this.signYoutubeId ) {
			this.signYoutube = this.initYouTubeSignPlayer();
		}

		// make it draggable
		if ( null === this.$signDivLocation ) {
			this.initDragDrop('sign');
		}

		if (this.prefSign === 1) {
			// sign window is on. Go ahead and position it and show it
			if ( null === this.$signDivLocation ) {
				this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
			}
		} else {
			this.$signWindow.hide();
		}
	};


	AblePlayer.prototype.initYouTubeSignPlayer = function () {

		var thisObj, deferred, promise;
		thisObj = this;
		deferred = new this.defer();
		promise = deferred.promise();

		this.youTubeSignPlayerReady = false;

		if (AblePlayer.youTubeIframeAPIReady) {
			// Script already loaded and ready.
			thisObj.finalizeYoutubeSignInit().then(function() {
				deferred.resolve();
			});
		} else {
			// Has another player already started loading the script? If so, abort...
			if ( ! AblePlayer.loadingYouTubeIframeAPI ) {
				thisObj.getScript('https://www.youtube.com/iframe_api', function () {
					console.log( 'YouTube API loaded' );
				});
			}

			// Otherwise, keeping waiting for script load event...
			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeSignInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeSignInit = function () {

		// This is called once we're sure the Youtube iFrame API is loaded -- see above
		var deferred, promise, thisObj, containerId, ccLoadPolicy, autoplay;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		containerId = this.mediaId + '_youtube_sign';

		this.$signWindow.append($('<div>').attr('id', containerId));
		autoplay = (this.okToPlay) ? 1 : 0;

		// Documentation https://developers.google.com/youtube/player_parameters
		this.youTubeSignPlayer = new YT.Player(containerId, {
			videoId: this.getYouTubeId(this.signYoutubeId),
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				cc_lang_pref: this.captionLang, // set the caption language
				cc_load_policy: 0,
				controls: 0, // no controls, using our own
				disableKb: 1, // disable keyboard shortcuts, using our own
				enablejsapi: 1,
				hl: this.lang, // set the UI language to match Able Player
				iv_load_policy: 3, // do not show video annotations
				origin: window.location.origin,
				playsinline: this.playsInline,
				rel: 0, // when video ends, show only related videos from same channel (1 shows any)
				start: this.startTime
			},
			events: {
				onReady: function (player) {
					player.target.mute();
					player.target.unloadModule( 'captions' );
					thisObj.youTubeSignPlayerReady = true;

					deferred.resolve();
				},
				onError: function (x) {
					deferred.reject();
				},
				onStateChange: function (x) {
					thisObj.getPlayerState().then(function() {
						// no actions
					});
				},
				onApiChange: function() {
					// No actions
				},
				onPlaybackQualityChange: function () {
					// no actions
				},
			}
		});

		return promise;
	};

})(jQuery);
