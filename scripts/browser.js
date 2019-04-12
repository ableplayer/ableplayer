(function ($) {

	AblePlayer.prototype.getUserAgent = function() {

		// Whenever possible we avoid browser sniffing. Better to do feature detection.
		// However, in case it's needed...
		// this function defines a userAgent array that can be used to query for common browsers and OSs
		// NOTE: This would be much simpler with jQuery.browser but that was removed from jQuery 1.9
		// http://api.jquery.com/jQuery.browser/
		this.userAgent = {};
		this.userAgent.browser = {};

		// Test for common browsers
		if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)){ //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
			this.userAgent.browser.name = 'Firefox';
			this.userAgent.browser.version = RegExp.$1; // capture x.x portion
		}
		else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) { //test for MSIE x.x (IE10 or lower)
			this.userAgent.browser.name = 'Internet Explorer';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Trident.*rv[ :]*(\d+\.\d+)/.test(navigator.userAgent)) { // test for IE11 or higher
			this.userAgent.browser.name = 'Internet Explorer';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Edge[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { // test for MS Edge
			this.userAgent.browser.name = 'Edge';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/OPR\/(\d+\.\d+)/i.test(navigator.userAgent)) { // Opera 15 or over
			this.userAgent.browser.name = 'Opera';
			this.userAgent.browser.version = RegExp.$1;
		}
		else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
			this.userAgent.browser.name = 'Chrome';
			if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
				this.userAgent.browser.version = RegExp.$1;
			}
		}
		else if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
			this.userAgent.browser.name = 'Safari';
			if (/Version[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
				this.userAgent.browser.version = RegExp.$1;
			}
		}
		else {
			this.userAgent.browser.name = 'Unknown';
			this.userAgent.browser.version = 'Unknown';
		}

		// Now test for common operating systems
		if (window.navigator.userAgent.indexOf("Windows NT 6.2") != -1) {
			this.userAgent.os = "Windows 8";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 6.1") != -1) {
			this.userAgent.os = "Windows 7";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 6.0") != -1) {
			this.userAgent.os = "Windows Vista";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 5.1") != -1) {
			this.userAgent.os = "Windows XP";
		}
		else if (window.navigator.userAgent.indexOf("Windows NT 5.0") != -1) {
			this.userAgent.os = "Windows 2000";
		}
		else if (window.navigator.userAgent.indexOf("Mac")!=-1) {
			this.userAgent.os = "Mac/iOS";
		}
		else if (window.navigator.userAgent.indexOf("X11")!=-1) {
			this.userAgent.os = "UNIX";
		}
		else if (window.navigator.userAgent.indexOf("Linux")!=-1) {
			this.userAgent.os = "Linux";
		}
		if (this.debug) {
			console.log('User agent:' + navigator.userAgent);
			console.log('Vendor: ' + navigator.vendor);
			console.log('Browser: ' + this.userAgent.browser.name);
			console.log('Version: ' + this.userAgent.browser.version);
			console.log('OS: ' + this.userAgent.os);
		}
	};

	AblePlayer.prototype.isUserAgent = function(which) {

		var userAgent = navigator.userAgent.toLowerCase();
		if (this.debug) {
			console.log('User agent: ' + userAgent);
		}
		if (userAgent.indexOf(which.toLowerCase()) !== -1) {
			return true;
		}
		else {
			return false;
		}
	};

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
			document.mozFullScreenEnabled ||
			document.msFullscreenEnabled;
	};

})(jQuery);
