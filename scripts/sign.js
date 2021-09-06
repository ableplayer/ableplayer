(function ($) {
	AblePlayer.prototype.initSignLanguage = function() {

		// Sign language is only currently supported in HTML5 player, not YouTube or Vimeo
		if (this.player === 'html5') {
			// check to see if there's a sign language video accompanying this video
			// check only the first source
			// If sign language is provided, it must be provided for all sources
			this.signFile = this.$sources.first().attr('data-sign-src');
			if (this.signFile) {
				if (this.isIOS()) {
					// IOS does not allow multiple videos to play simultaneously
					// Therefore, sign language as rendered by Able Player unfortunately won't work
					this.hasSignLanguage = false;
					if (this.debug) {
						console.log('Sign language has been disabled due to IOS restrictions');
					}
				}
				else {
					if (this.debug) {
						console.log('This video has an accompanying sign language video: ' + this.signFile);
					}
					this.hasSignLanguage = true;
					this.injectSignPlayerCode();
				}
			}
			else {
				this.hasSignLanguage = false;
			}
		}
		else {
			this.hasSignLanguage = false;
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		// create and inject surrounding HTML structure

		var thisObj, signVideoId, signVideoWidth, i, signSrc, srcType, $signSource;

		thisObj = this;

		signVideoWidth = this.getDefaultWidth('sign');

		signVideoId = this.mediaId + '-sign';
		this.$signVideo = $('<video>',{
			'id' : signVideoId,
			'tabindex' : '-1'
		});
		this.signVideo = this.$signVideo[0];
		// for each original <source>, add a <source> to the sign <video>
		for (i=0; i < this.$sources.length; i++) {
			signSrc = this.$sources[i].getAttribute('data-sign-src');
			srcType = this.$sources[i].getAttribute('type');
			if (signSrc) {
				$signSource = $('<source>',{
					'src' : signSrc,
					'type' : srcType
				});
				this.$signVideo.append($signSource);
			}
			else {
				// source is missing a sign language version
				// can't include sign language
				this.hasSignLanguage = false;
				break;
			}
		}

		this.$signWindow = $('<div>',{
			'class' : 'able-sign-window',
			'role': 'dialog',
			'aria-label': this.tt.sign
		});
		this.$signToolbar = $('<div>',{
			'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
		});

		this.$signWindow.append(this.$signToolbar, this.$signVideo);

		this.$ableWrapper.append(this.$signWindow);

		// make it draggable
		this.initDragDrop('sign');

		if (this.prefSign === 1) {
			// sign window is on. Go ahead and position it and show it
			this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
		}
		else {
			this.$signWindow.hide();
		}
	};

})(jQuery);
