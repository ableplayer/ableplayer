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

		// ideally we could test for volume support
		// However, that doesn't seem to be reliable
		// http://stackoverflow.com/questions/12301435/html5-video-tag-volume-support

		var userAgent, noVolume;

		userAgent = navigator.userAgent.toLowerCase();
		noVolume = /ipad|iphone|ipod|android|blackberry|windows ce|windows phone|webos|playbook/.exec(userAgent);
		if (noVolume) {
			if (noVolume[0] === 'android' && /firefox/.test(userAgent)) {
				// Firefox on android DOES support changing the volume:
				return true;
			}
			else {
				return false;
			}
		}
		else {
			// as far as we know, this userAgent supports volume control
			return true;
		}
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.mozFullscreenEnabled ||
			document.msFullscreenEnabled;
	};

})(jQuery);
