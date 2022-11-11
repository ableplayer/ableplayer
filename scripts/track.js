(function ($) {
	// Loads files referenced in track elements, and performs appropriate setup.
	// For example, captions and text descriptions.
	// This will be called whenever the player is recreated.
	// Added in v2.2.23: Also handles YouTube caption tracks

	AblePlayer.prototype.setupTracks = function () {

		var thisObj, deferred, promise, loadingPromises, loadingPromise,
			i, tracks, track, kind;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		loadingPromises = [];

		if ($('#able-vts').length) {
			// Page includes a container for a VTS instance
			this.vtsTracks = [];
			this.hasVts = true;
		} else {
			this.hasVts = false;
		}

		// Source array for populating the above arrays 
		// varies, depending on whether there are dedicated description tracks 
		if (this.hasDescTracks && this.descOn) {
			tracks = this.altTracks;
		} else {
			tracks = this.tracks;
		}
		for (i = 0; i < tracks.length; i++) {

			track = tracks[i];
			kind = track.kind;

			if (!track.src) {
				if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
					// skip all the hullabaloo and go straight to setupCaptions
					thisObj.setupCaptions(track);
				} else {
					// Nothing to load!
					// Skip this track; move on to next i
				}				
				continue;
			}
			var trackSrc = track.src;
			loadingPromise = this.loadTextObject(track.src); // resolves with src, trackText
			loadingPromises.push(loadingPromise.catch(function (src) {
				console.warn('Failed to load captions track from ' + src);
			}));
			loadingPromise.then((function (track, kind) {
				var trackSrc = track.src;
				var trackLang = track.language;
				var trackLabel = track.label;
				var trackDesc = track.desc;

				return function (trackSrc, trackText) {
					// these are the two vars returned from loadTextObject

					var trackContents = trackText;
					var cues = thisObj.parseWebVTT(trackSrc, trackContents).cues;
					if (thisObj.hasVts) {

						// setupVtsTracks() is in vts.js
						thisObj.setupVtsTracks(kind, trackLang, trackDesc, trackLabel, trackSrc, trackContents);
					}
					if (kind === 'captions' || kind === 'subtitles') {
						thisObj.setupCaptions(track, cues);
					} else if (kind === 'descriptions') {
						thisObj.setupDescriptions(track, cues);
					} else if (kind === 'chapters') {
						thisObj.setupChapters(track, cues);
					} else if (kind === 'metadata') {
						thisObj.setupMetadata(track, cues);
					}
				}
			})(track, kind));
		}
		if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
			deferred.resolve(); 
		}
		else { 			
			$.when.apply($, loadingPromises).then(function () {
				deferred.resolve();
			});
		}
		return promise;
	};

	AblePlayer.prototype.getTracks = function () {
		
		// define an array tracks with the following structure:
		// kind - string, e.g. "captions", "descriptions"
		// src - string, URL of WebVTT source file
		// language - string, lang code
		// label - string to display, e.g., in CC menu
		// def - Boolean, true if this is the default track
		// cues - array with startTime, endTime, and payload
		// desc - Boolean, true if track includes a data-desc attribute

		var thisObj, deferred, promise, captionTracks, altCaptionTracks,
			trackLang, trackLabel, isDefault, forDesc, hasDefault, hasTrackInDefLang,
			trackFound, i, j, capLabel, inserted;

		thisObj = this;
		hasDefault = false; 

		deferred = new $.Deferred();
		promise = deferred.promise();

		this.$tracks = this.$media.find('track');
		this.tracks = []; // only includes tracks that do NOT have data-desc
		this.altTracks = []; // only includes tracks that DO have data-desc 

		// Arrays for each kind, to be populated later  
		this.captions = [];
		this.descriptions = [];
		this.chapters = [];
		this.meta = [];

		this.hasCaptionsTrack = false; // will change to true if one or more tracks has kind="captions"
		this.hasDescTracks = false; // will change to true if one or more tracks has data-desc

		if (this.$tracks.length) {			

			this.usingYouTubeCaptions = false; 
			// create object from HTML5 tracks
			this.$tracks.each(function (index, element) {

				if ($(this).attr('kind') === 'captions') {
					thisObj.hasCaptionsTrack = true; 
				}
				else if ($(this).attr('kind') === 'descriptions') {
					thisObj.hasClosedDesc = true; 
				}

				// srcLang should always be included with <track>, but HTML5 spec doesn't require it
				// if not provided, assume track is the same language as the default player language
				if ($(this).attr('srclang')) {
					trackLang = $(this).attr('srclang');
				} 
				else {
					trackLang = thisObj.lang;
				}
				if ($(this).attr('label')) {
					trackLabel = $(this).attr('label');
				} 
				else {
					trackLabel = thisObj.getLanguageName(trackLang);
				}

				if (typeof $(this).attr('default') !== 'undefined' && !hasDefault) {	
					isDefault = true;
					hasDefault = true; 
				} 
				else if (trackLang === thisObj.lang) {
					// this track is in the default lang of the player 
					// save this for later 
					// if there is no other default track specified 
					// this will be the default 
					hasTrackInDefLang = true; 
					isDefault = false; // for now; this could change if there's no default attribute					
				}
				else {
					isDefault = false;
				}
				if (isDefault) {
					// this.captionLang will also be the default language for non-caption tracks
					thisObj.captionLang = trackLang;
				}

				if ($(this).data('desc') !== undefined) {
					forDesc = true;
					thisObj.hasDescTracks = true;
				} 
				else {
					forDesc = false;
				}
				if (forDesc) {
					thisObj.altTracks.push({
						'kind': $(this).attr('kind'),
						'src': $(this).attr('src'),
						'language': trackLang,
						'label': trackLabel,
						'def': isDefault,
						'desc': forDesc
					});
				} else {
					thisObj.tracks.push({
						'kind': $(this).attr('kind'),
						'src': $(this).attr('src'),
						'language': trackLang,
						'label': trackLabel,
						'def': isDefault,
						'desc': forDesc
					});
				}

				if (index == thisObj.$tracks.length - 1) {
					// This is the last track. 
					if (!hasDefault) { 
						if (hasTrackInDefLang) { 
							thisObj.captionLang = thisObj.lang; 
							trackFound = false; 									
							i = 0; 
							while (i < thisObj.tracks.length && !trackFound) { 
								if (thisObj.tracks[i]['language'] === thisObj.lang) { 
									thisObj.tracks[i]['def'] = true; 
									trackFound = true; 
								}
								i++; 
							}
						}
						else { 
							// use the first track 
							thisObj.tracks[0]['def'] = true; 
							thisObj.captionLang = thisObj.tracks[0]['language']; 
						}
					}
					// Remove 'default' attribute from all <track> elements
					// This data has already been saved to this.tracks
					// and some browsers will display the default captions, 
					// despite all standard efforts to suppress them
					thisObj.$media.find('track').removeAttr('default'); 
				}
			});
		}
		if (!this.$tracks.length || !this.hasCaptionsTrack) { 
			// this media has no track elements 
			// if this is a youtube or vimeo player, check there for captions/subtitles
			if (this.player === 'youtube') {
				this.getYouTubeCaptionTracks(this.youTubeId).then(function() {
					if (thisObj.hasCaptions) { 
						thisObj.usingYouTubeCaptions = true; 
						if (thisObj.$captionsWrapper) {
							thisObj.$captionsWrapper.remove();
						}
					}					
					deferred.resolve();
				});
			}
			else if (this.player === 'vimeo') {
				this.getVimeoCaptionTracks().then(function() {
					if (thisObj.hasCaptions) { 
						thisObj.usingVimeoCaptions = true; 
						if (thisObj.$captionsWrapper) {
							thisObj.$captionsWrapper.remove();
						}
					}
					deferred.resolve();
				});
			}
			else {
				// this is neither YouTube nor Vimeo
				// there just ain't no tracks (captions or otherwise)
				this.hasCaptions = false; 
				if (thisObj.$captionsWrapper) {
					thisObj.$captionsWrapper.remove();
				}
				deferred.resolve();
			}
		}
		else { 
			// there is at least one track with kind="captions" 
			deferred.resolve(); 

		}
		return promise;

	};

	AblePlayer.prototype.setupCaptions = function (track, cues) {

		// Setup player for display of captions (one track at a time)
		var thisObj, captions, inserted, i, capLabel;

		// Insert track into captions array 
		// in its proper alphabetical sequence by label  
		if (typeof cues === 'undefined') {
			cues = null;
		}

		if (this.usingYouTubeCaptions || this.usingVimeoCaptions) { 
			// this.captions has already been populated 
			// For YouTube, this happens in youtube.js > getYouTubeCaptionTracks()
			// For VImeo, this happens in vimeo.js > getVimeoCaptionTracks() 
			// So, nothing to do here... 
		}
		else { 

			if (this.captions.length === 0) { // this is the first	
				this.captions.push({
					'language': track.language,
					'label': track.label,
					'def': track.def,
					'cues': cues
				});
			} 
			else { // there are already captions in the array			
				inserted = false;
				for (i = 0; i < this.captions.length; i++) {
					capLabel = track.label;
					if (capLabel.toLowerCase() < this.captions[i].label.toLowerCase()) {
						// insert before track i
						this.captions.splice(i, 0, {
							'language': track.language,
							'label': track.label,
							'def': track.def,
							'cues': cues
						});
						inserted = true;
						break;
					}
				}
				if (!inserted) {
					// just add track to the end
					this.captions.push({
						'language': track.language,
						'label': track.label,
						'def': track.def,
						'cues': cues
					});
				}	
			}
		}

		// there are captions available 
		this.hasCaptions = true;
		this.currentCaption = -1; 
		if (this.prefCaptions === 1) {
			this.captionsOn = true;
		} else if (this.prefCaptions === 0) {
			this.captionsOn = false;
		} else {
			// user has no prefs. Use default state.
			if (this.defaultStateCaptions === 1) {
				this.captionsOn = true;
			} else {
				this.captionsOn = false;
			}
		}
		if (this.mediaType === 'audio' && this.captionsOn) {
			this.$captionsContainer.removeClass('captions-off');
		}

		if (!this.$captionsWrapper || 
			(this.$captionsWrapper && !($.contains(this.$ableDiv[0], this.$captionsWrapper[0])))) {
			// captionsWrapper either doesn't exist, or exists in an orphaned state 
			// Either way, it needs to be rebuilt...  
			this.$captionsDiv = $('<div>', {
				'class': 'able-captions',
			});
			this.$captionsWrapper = $('<div>', {
				'class': 'able-captions-wrapper',
				'aria-hidden': 'true'
			}).hide();
			if (this.prefCaptionsPosition === 'below') {
				this.$captionsWrapper.addClass('able-captions-below');
			} else {
				this.$captionsWrapper.addClass('able-captions-overlay');
			}
			this.$captionsWrapper.append(this.$captionsDiv);
			this.$captionsContainer.append(this.$captionsWrapper);
		}
	};

	AblePlayer.prototype.setupDescriptions = function (track, cues) {

		// called via setupTracks() only if there is track with kind="descriptions"
		// prepares for delivery of text description , in case it's needed
		// whether and how it's delivered is controlled within description.js > initDescription()

		this.hasClosedDesc = true;
		this.currentDescription = -1;
		this.descriptions.push({
			cues: cues,
			language: track.language
		});
	};

	AblePlayer.prototype.setupChapters = function (track, cues) {

		// NOTE: WebVTT supports nested timestamps (to form an outline)
		// This is not currently supported.

		this.hasChapters = true;
		this.chapters.push({
			cues: cues,
			language: track.language
		});
	};

	AblePlayer.prototype.setupMetadata = function (track, cues, trackDesc) {

		if (this.metaType === 'text') {
			// Metadata is only supported if data-meta-div is provided
			// The player does not display metadata internally
			if (this.metaDiv) {
				if ($('#' + this.metaDiv)) {
					// container exists
					this.$metaDiv = $('#' + this.metaDiv);
					this.hasMeta = true;
					this.meta = cues;
				}
			}
		} else if (this.metaType === 'selector') {
			this.hasMeta = true;
			this.visibleSelectors = [];
			this.meta = cues;
		}
	};

	AblePlayer.prototype.loadTextObject = function (src) {

		// TODO: Incorporate the following function, moved from setupTracks()
		// convert XMl/TTML captions file
		/*
		if (thisObj.useTtml && (trackSrc.endsWith('.xml') || trackText.startsWith('<?xml'))) {
			trackContents = thisObj.ttml2webvtt(trackText);
		}
		*/
		var deferred, promise, thisObj, $tempDiv;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		// create a temp div for holding data
		$tempDiv = $('<div>', {
			style: 'display:none'
		});
		$tempDiv.load(src, function (trackText, status, req) {
			if (status === 'error') {
				if (thisObj.debug) {
					console.log('error reading file ' + src + ': ' + status);
				}
				deferred.reject(src);
			} else {
				deferred.resolve(src, trackText);
			}
			$tempDiv.remove();
		});
		return promise;
	};

})(jQuery);