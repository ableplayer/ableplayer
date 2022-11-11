(function ($) {

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

		// To test whether the browser supports changing the volume, 
			// create a new audio element and try setting the volume to something other than 1. 
			// Then, retrieve the current setting to see if it preserved it. 

			// Unfortunately, this doesn't work in iOS. In 2022, our tests yield the same results as reported here:  
			// https://stackoverflow.com/questions/72861253/how-do-i-detect-if-a-browser-does-not-support-changing-html-audio-volume

			// So, unfortunately we have to resort to sniffing for iOS  
			// before testing for support in other browsers 
			var audio, testVolume; 
 
			if (this.isIOS()) { 
				return false; 
			}

			testVolume = 0.9;  // any value between 0.1 and 0.9 
			audio = new Audio();
      audio.volume = testVolume;
			if (audio.volume === testVolume) { 
				return true; 
			} 
			else { 
				return false; 
			}
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.mozFullscreenEnabled ||
			document.msFullscreenEnabled;
	};

})(jQuery);
