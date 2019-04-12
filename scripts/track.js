(function ($) {
	// Loads files referenced in track elements, and performs appropriate setup.
	// For example, captions and text descriptions.
	// This will be called whenever the player is recreated.
	// Added in v2.2.23: Also handles YouTube caption tracks

	AblePlayer.prototype.setupTracks = function() {

		var thisObj, deferred, promise, loadingPromises, loadingPromise, i, tracks, track;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		loadingPromises = [];

		this.captions = [];
		this.captionLabels = [];
		this.descriptions = [];
		this.chapters = [];
		this.meta = [];

		if ($('#able-vts').length) {
			// Page includes a container for a VTS instance
			this.vtsTracks = [];
			this.hasVts = true;
		}
		else {
			this.hasVts = false;
		}

		this.getTracks().then(function() {

			tracks = thisObj.tracks;

			if (thisObj.player === 'youtube') {
				// If captions have been loaded into the captions array (either from YouTube or a local source),
				// we no longer have a need to use YouTube captions
				// TODO: Consider whether this is the right place to make this decision
				// Probably better to make it when cues are identified from YouTube caption sources
				if (tracks.length) {
					thisObj.usingYouTubeCaptions = false;
				}
			}

			for (i=0; i < tracks.length; i++) {

				track = tracks[i];

				var kind = track.kind;
				var trackLang = track.language;
				var trackLabel = track.label;

				if (!track.src) {
					if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
						// skip all the hullabaloo and go straight to setupCaptions
						thisObj.setupCaptions(track,trackLang,trackLabel);
					}
					else {
						// Nothing to load!
						// Skip this track; move on to next i
					}
					continue;
				}

				var trackSrc = track.src;

				loadingPromise = thisObj.loadTextObject(trackSrc); // resolves with src, trackText
				loadingPromises.push(loadingPromise);

				loadingPromise.then((function (track, kind) {

					var trackSrc = track.src;
					var trackLang = track.language;
					var trackLabel = track.label;

					return function (trackSrc, trackText) { // these are the two vars returned from loadTextObject

						var trackContents = trackText;
						var cues = thisObj.parseWebVTT(trackSrc, trackContents).cues;

						if (thisObj.hasVts) {
							 // setupVtsTracks() is in vts.js
							thisObj.setupVtsTracks(kind, trackLang, trackLabel, trackSrc, trackContents);
						}

						if (kind === 'captions' || kind === 'subtitles') {
							thisObj.setupCaptions(track, trackLang, trackLabel, cues);
						}
						else if (kind === 'descriptions') {
							thisObj.setupDescriptions(track, cues, trackLang);
						}
						else if (kind === 'chapters') {
							thisObj.setupChapters(track, cues, trackLang);
						}
						else if (kind === 'metadata') {
							thisObj.setupMetadata(track, cues);
						}
					}
				})(track, kind));
			}
			$.when.apply($, loadingPromises).then(function () {
				deferred.resolve();
			});
		});

		return promise;
	};

	AblePlayer.prototype.getTracks = function() {

		// define an array tracks with the following structure:
		// kind - string, e.g. "captions", "descriptions"
		// src - string, URL of WebVTT source file
		// language - string, lang code
		// label - string to display, e.g., in CC menu
		// def - Boolean, true if this is the default track
		// cues - array with startTime, endTime, and payload

		var thisObj, deferred, promise, captionTracks, trackLang, trackLabel, isDefault;

		thisObj = this;

		deferred = new $.Deferred();
		promise = deferred.promise();

		this.$tracks = this.$media.find('track');
		this.tracks = [];

		if (this.$tracks.length) {

			// create object from HTML5 tracks
			this.$tracks.each(function() {

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

				if ($(this).attr('default')) {
					isDefault = true;
				}
				else if (trackLang === thisObj.lang) {
					// There is no @default attribute,
					// but this is the user's/browser's default language
					// so make it the default caption track
					isDefault = true;
				}
				else {
					isDefault = false;
				}

				if (isDefault) {
					// this.captionLang will also be the default language for non-caption tracks
					thisObj.captionLang = trackLang;
				}

				thisObj.tracks.push({
					'kind': $(this).attr('kind'),
					'src': $(this).attr('src'),
					'language': trackLang,
					'label': trackLabel,
					'def': isDefault
				});
			});
		}

		// check to see if any HTML caption or subitle tracks were found.
		captionTracks = this.$media.find('track[kind="captions"],track[kind="subtitles"]');
		if (captionTracks.length) {
			// HTML captions or subtitles were found. Use those.
			deferred.resolve();
		}
		else {
			// if this is a youtube or vimeo player, check there for captions/subtitles
			if (this.player === 'youtube') {
				this.getYouTubeCaptionTracks(this.youTubeId).then(function() {
					deferred.resolve();
				});
			}
			else if (this.player === 'vimeo') {
				this.getVimeoCaptionTracks().then(function() {
					deferred.resolve();
				});
			}
			else {
				// this is neither YouTube nor Vimeo
				// there just ain't no caption tracks
				deferred.resolve();
			}
		}
		return promise;
	};

	AblePlayer.prototype.setupCaptions = function (track, trackLang, trackLabel, cues) {

		var thisObj, inserted, i, capLabel;

		thisObj = this;

		if (typeof cues === 'undefined') {
			cues = null;
		}

		this.hasCaptions = true;

		// Remove 'default' attribute from all <track> elements
		// This data has already been saved to this.tracks
		// and some browsers will display the default captions, despite all standard efforts to suppress them
		this.$media.find('track').removeAttr('default');

		// caption cues from WebVTT are used to build a transcript for both audio and video
		// but captions are currently only supported for video
		if (this.mediaType === 'video') {

			if (!(this.usingYouTubeCaptions || this.usingVimeoCaptions)) {
				// create a pair of nested divs for displaying captions
				// includes aria-hidden="true" because otherwise
				// captions being added and removed causes sporadic changes to focus in JAWS
				// (not a problem in NVDA or VoiceOver)
				if (!this.$captionsDiv) {
					this.$captionsDiv = $('<div>',{
						'class': 'able-captions',
					});
					this.$captionsWrapper = $('<div>',{
						'class': 'able-captions-wrapper',
						'aria-hidden': 'true'
					}).hide();
					if (this.prefCaptionsPosition === 'below') {
						this.$captionsWrapper.addClass('able-captions-below');
					}
					else {
						this.$captionsWrapper.addClass('able-captions-overlay');
					}
					this.$captionsWrapper.append(this.$captionsDiv);
					this.$vidcapContainer.append(this.$captionsWrapper);
				}
			}
		}

		this.currentCaption = -1;
		if (this.prefCaptions === 1) {
			// Captions default to on.
			this.captionsOn = true;
		}
		else {
			this.captionsOn = false;
		}
		if (this.captions.length === 0) { // this is the first
			this.captions.push({
				'cues': cues,
				'language': trackLang,
				'label': trackLabel,
				'def': track.def
			});
			this.captionLabels.push(trackLabel);
		}
		else { // there are already tracks in the array
			inserted = false;
			for (i = 0; i < this.captions.length; i++) {
				capLabel = this.captionLabels[i];
				if (trackLabel.toLowerCase() < this.captionLabels[i].toLowerCase()) {
					// insert before track i
					this.captions.splice(i,0,{
						'cues': cues,
						'language': trackLang,
						'label': trackLabel,
						'def': track.def
					});
					this.captionLabels.splice(i,0,trackLabel);
					inserted = true;
					break;
				}
			}
			if (!inserted) {
				// just add track to the end
				this.captions.push({
					'cues': cues,
					'language': trackLang,
					'label': trackLabel,
					'def': track.def
				});
				this.captionLabels.push(trackLabel);
			}
		}
	};

	AblePlayer.prototype.setupDescriptions = function (track, cues, trackLang) {

		// called via setupTracks() only if there is track with kind="descriptions"
		// prepares for delivery of text description , in case it's needed
		// whether and how it's delivered is controlled within description.js > initDescription()

		this.hasClosedDesc = true;
		this.currentDescription = -1;
		this.descriptions.push({
			cues: cues,
			language: trackLang
		});
	};

	AblePlayer.prototype.setupChapters = function (track, cues, trackLang) {

		// NOTE: WebVTT supports nested timestamps (to form an outline)
		// This is not currently supported.

		this.hasChapters = true;

		this.chapters.push({
			cues: cues,
			language: trackLang
		});
	};

	AblePlayer.prototype.setupMetadata = function(track, cues) {

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
		}
		else if (this.metaType === 'selector') {
			this.hasMeta = true;
			this.visibleSelectors = [];
			this.meta = cues;
		}
	};

	AblePlayer.prototype.loadTextObject = function(src) {

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
		$tempDiv = $('<div>',{
			style: 'display:none'
		});
		$tempDiv.load(src, function (trackText, status, req) {
			if (status === 'error') {
				if (thisObj.debug) {
					console.log ('error reading file ' + src + ': ' + status);
				}
				deferred.fail();
			}
			else {
				deferred.resolve(src, trackText);
			}
			$tempDiv.remove();
		});
		return promise;
	};

	AblePlayer.prototype.setupAltCaptions = function() {

		// setup captions from an alternative source (not <track> elements)
		// only do this if no <track> captions are provided
		// currently supports: YouTube, Vimeo
		var deferred = new $.Deferred();
		var promise = deferred.promise();
		if (this.captions.length === 0) {
			if (this.player === 'youtube' && this.usingYouTubeCaptions) {
				this.setupYouTubeCaptions().done(function() {
					deferred.resolve();
				});
			}
			else if (this.player === 'vimeo' && this.usingVimeoCaptions) {
				this.setupVimeoCaptions().done(function() {
					deferred.resolve();
				});
			}

			else {
				// repeat for other alt sources once supported (e.g., Vimeo, DailyMotion)
				deferred.resolve();
			}
		}
		else { // there are <track> captions, so no need for alt source captions
			deferred.resolve();
		}
		return promise;
	};

})(jQuery);
