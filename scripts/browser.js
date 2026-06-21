function addBrowserFunctions(AblePlayer) {

	AblePlayer.prototype.isIOS = function(version) {

		// return true if this is iOS
		// if version is provided check for a particular version

		var userAgent, iOS;

		userAgent = navigator.userAgent.toLowerCase();
		iOS = /ipad|iphone|ipod/.exec(userAgent);
		if (iOS) {
			if (typeof version !== 'undefined') {
				if (userAgent.indexOf('os ' + version) !== -1) {
					// this is the target version of iOS
					return true;
				} else {
					return false;
				}
			} else {
				// no version was specified
				return true;
			}
		} else {
			// this is not iOS
			return false;
		}
	};

	AblePlayer.prototype.browserSupportsVolume = function() {

		// To test whether the browser supports changing the volume,
		// create a new audio element and try setting the volume to something other than 1.
		// Then, retrieve the current setting to see if it preserved it.
		// This doesn't work in iOS by design: https://developer.apple.com/documentation/avfoundation/avplayer/volume

		var audio, testVolume;

		if (this.isIOS()) {
			return false;
		}

		testVolume = 0.9;  // any value between 0.1 and 0.9
		audio = new Audio();
		audio.volume = testVolume;

		return ( audio.volume === testVolume );
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled || document.webkitFullscreenEnabled;
	};

}

export default addBrowserFunctions;
