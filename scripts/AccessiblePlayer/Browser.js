export default class Browser{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    /**
     * Retourne le type de la plateforme du navigateur et les caractéristiques du navigateur du basePlayer
     * this function defines a userAgent array that can be used to query for common browsers and OSs
     */
    getUserAgent() {
        this.ablePlayer.userAgent = {};
        this.ablePlayer.userAgent.browser = {};

        // Test for common browsers
        if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
            this.ablePlayer.userAgent.browser.name = 'Firefox';
            this.ablePlayer.userAgent.browser.version = RegExp.$1; // capture x.x portion
        } else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) { //test for MSIE x.x (IE10 or lower)
            this.ablePlayer.userAgent.browser.name = 'Internet Explorer';
            this.ablePlayer.userAgent.browser.version = RegExp.$1;
        } else if (/Trident.*rv[ :]*(\d+\.\d+)/.test(navigator.userAgent)) { // test for IE11 or higher
            this.ablePlayer.userAgent.browser.name = 'Internet Explorer';
            this.ablePlayer.userAgent.browser.version = RegExp.$1;
        } else if (/Edge[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { // test for MS Edge
            this.ablePlayer.userAgent.browser.name = 'Edge';
            this.ablePlayer.userAgent.browser.version = RegExp.$1;
        } else if (/OPR\/(\d+\.\d+)/i.test(navigator.userAgent)) { // Opera 15 or over
            this.ablePlayer.userAgent.browser.name = 'Opera';
            this.ablePlayer.userAgent.browser.version = RegExp.$1;
        } else if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
            this.ablePlayer.userAgent.browser.name = 'Chrome';
            if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                this.ablePlayer.userAgent.browser.version = RegExp.$1;
            }
        } else if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) {
            this.ablePlayer.userAgent.browser.name = 'Safari';
            if (/Version[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                this.ablePlayer.userAgent.browser.version = RegExp.$1;
            }
        } else {
            this.ablePlayer.userAgent.browser.name = 'Unknown';
            this.ablePlayer.userAgent.browser.version = 'Unknown';
        }

        // Now test for common operating systems
        if (window.navigator.userAgent.indexOf("Windows NT 6.2") != -1) {
            this.ablePlayer.userAgent.os = "Windows 8";
        } else if (window.navigator.userAgent.indexOf("Windows NT 6.1") != -1) {
            this.ablePlayer.userAgent.os = "Windows 7";
        } else if (window.navigator.userAgent.indexOf("Windows NT 6.0") != -1) {
            this.ablePlayer.userAgent.os = "Windows Vista";
        } else if (window.navigator.userAgent.indexOf("Windows NT 5.1") != -1) {
            this.ablePlayer.userAgent.os = "Windows XP";
        } else if (window.navigator.userAgent.indexOf("Windows NT 5.0") != -1) {
            this.ablePlayer.userAgent.os = "Windows 2000";
        } else if (window.navigator.userAgent.indexOf("Mac") != -1) {
            this.ablePlayer.userAgent.os = "Mac/iOS";
        } else if (window.navigator.userAgent.indexOf("X11") != -1) {
            this.ablePlayer.userAgent.os = "UNIX";
        } else if (window.navigator.userAgent.indexOf("Linux") != -1) {
            this.ablePlayer.userAgent.os = "Linux";
        }
        if (this.ablePlayer.debug) {
            console.log('User agent:' + navigator.userAgent);
            console.log('Vendor: ' + navigator.vendor);
            console.log('Browser: ' + this.ablePlayer.userAgent.browser.name);
            console.log('Version: ' + this.ablePlayer.userAgent.browser.version);
            console.log('OS: ' + this.ablePlayer.userAgent.os);
        }
    };

    /**
     * Teste la compatibilité entre le navigateur du basePlayer et la recommandation which
     * @param which
     * @returns {boolean}
     */
    isUserAgent (which) {

        var userAgent = navigator.userAgent.toLowerCase();
        if (this.ablePlayer.debug) {
            console.log('User agent: ' + userAgent);
        }
        if (userAgent.indexOf(which.toLowerCase()) !== -1) {
            return true;
        }
        else {
            return false;
        }
    };

    /**
     * Retourne vrai si le navigateur est sur une plateforme IOS
     * @param version
     * @returns {boolean}
     */
    isIOS (version) {
        var userAgent, iOS;
        userAgent = navigator.userAgent.toLowerCase();
        iOS = /ipad|iphone|ipod/.exec(userAgent);
        if (iOS) {
            if (typeof version !== 'undefined') {
                if (userAgent.indexOf('os ' + version) !== -1) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    };

    /**
     * test for volume support from the os
     * @returns {boolean}
     */
    browserSupportsVolume () {
        var userAgent, noVolume;
        userAgent = navigator.userAgent.toLowerCase();
        noVolume = /ipad|iphone|ipod|android|blackberry|windows ce|windows phone|webos|playbook/.exec(userAgent);
        if (noVolume) {
            if (noVolume[0] === 'android' && /firefox/.test(userAgent)) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return true;
        }
    };

    /**
     * Teste si l'interface supporte le plein ecran
     * @returns {*}
     */
    nativeFullscreenSupported () {
        if (this.player === 'jw') {
            // JW player flash has problems with native fullscreen.
            return false;
        }
        return document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled;
    };


}