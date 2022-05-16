import Misc from "./Misc.js";

export default class Sign{


    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    setBrowser( browser ){
        this.browser = browser;
        return this;
    }

    setDragDrop( dragDrop ){
        this.dragDrop = dragDrop;
        return this;
    }

    // Sign language is only currently supported in HTML5 basePlayer
    initSignLanguage() {
        // Sign language is only currently supported in HTML5 player, not fallback or YouTube
        if (this.ablePlayer.player === 'html5') {
            // check to see if there's a sign language video accompanying this video
            // check only the first source
            // If sign language is provided, it must be provided for all sources
            this.ablePlayer.signFile = this.ablePlayer.$sources.first().attr('data-sign-src');
            if (this.ablePlayer.signFile) {
                if (this.ablePlayer.debug) {
                    console.log('This video has an accompanying sign language video: ' + this.ablePlayer.signFile);
                }
                this.ablePlayer.hasSignLanguage = true;
                this.injectSignPlayerCode();
            } else {
                this.ablePlayer.hasSignLanguage = false;
            }
        }
        for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
            var vidId = document.getElementsByClassName("video-accessible")[q].id;
            document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function () {
                //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
                document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                console.log('initSignLanguage');
            }, false);
        }
        console.log('here change media height ' + this.ablePlayer.$mediaContainer.css('height'));
        this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('height'));
        this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.css('height'));
    };


    // create and inject surrounding HTML structure
    injectSignPlayerCode() {
        console.log('injectSignPlayerCode, media height :' + this.ablePlayer.$mediaContainer.height());

        var thisObj, signVideoId, signVideoWidth, i, signSrc, srcType, $signSource;

        thisObj = this;

        signVideoWidth = this.ablePlayer.getDefaultWidth('sign');

        signVideoId = this.ablePlayer.mediaId + '-sign';
        this.ablePlayer.$signVideo = $('<video>', {
            'id': signVideoId,
            'tabindex': '-1',
            'class': 'video-accessible-sign',
        });
        this.ablePlayer.signVideo = this.ablePlayer.$signVideo[0];
        // for each original <source>, add a <source> to the sign <video>
        for (i = 0; i < this.ablePlayer.$sources.length; i++) {
            signSrc = this.ablePlayer.$sources[i].getAttribute('data-sign-src');
            srcType = this.ablePlayer.$sources[i].getAttribute('type');
            if (signSrc) {
                $signSource = $('<source>', {
                    'src': signSrc,
                    'type': srcType
                });
                this.ablePlayer.$signVideo.append($signSource);
            } else {
                // source is missing a sign language version
                // can't include sign language
                this.ablePlayer.hasSignLanguage = false;
                break;
            }
        }

        this.ablePlayer.$signWindow = $('<div>', {
            'class': 'able-sign-window',
            'role': 'tab',
            'aria-label': this.ablePlayer.tt.sign,
            'tabindex': '0'
        });
        this.ablePlayer.$signToolbar = $('<div>', {
            'class': 'able-window-toolbar able-' + this.ablePlayer.toolbarIconColor + '-controls'
        });
        this.ablePlayer.$signToolbar.css('display', 'contents');

        this.ablePlayer.$signWindow.append(this.ablePlayer.$signToolbar, this.ablePlayer.$signVideo);

        this.ablePlayer.$ableWrapper.append(this.ablePlayer.$signWindow);

        // make it draggable
        this.ablePlayer.dragDrop.initDragDrop('sign');

        if (this.ablePlayer.prefSign === 1) {
            // sign window is on. Go ahead and position it and show it
            console.log('injectSignPlayerCode 2');
            this.ablePlayer.positionDraggableWindow('sign', this.ablePlayer.getDefaultWidth('sign'))
            if (this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                this.ablePlayer.$ableDiv.css('width', '67%');
                this.ablePlayer.$ableDiv.css('width', (100 - thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
                this.ablePlayer.$signWindow.css('width', '33%');
                this.ablePlayer.$signWindow.css('width', thisObj.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$signWindow.css('left', '66%');
                this.ablePlayer.$signWindow.css('left', (100 - thisObj.preference.getCookie()['preferences']['prefVidSize']) + '%');
                this.ablePlayer.$signWindow.css('position', 'absolute');
                this.ablePlayer.$signWindow.css('top', '0px');
                this.ablePlayer.$signWindow.css('margin', '0px');
                //put video sign in the first container
                var svgVideoSrc = this.ablePlayer.$mediaContainer.find('video').find('source')[0].src;
                this.ablePlayer.$mediaContainer.find('video').find('source')[0].src = this.ablePlayer.$sources.first().attr('data-sign-src');
                this.ablePlayer.$mediaContainer.find('video')[0].load();
                //put video in the second containre
                this.ablePlayer.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
                this.ablePlayer.$signWindow.find('video')[0].load();
                this.ablePlayer.$signWindow.find('video')[0].muted = true;
                this.ablePlayer.$mediaContainer.find('video')[0].muted = true;
                this.ablePlayer.$mediaContainer.css('background-color', 'lightgray');
                this.ablePlayer.$buttonSoundMute.attr('aria-pressed', 'false');
                this.ablePlayer.$buttonSoundMute.attr('aria-label', this.ablePlayer.tt.mute);
                this.ablePlayer.$buttonSoundMute.addClass('aria-no-checked');
                this.ablePlayer.$buttonHideVol.text('');
                this.ablePlayer.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">" + this.ablePlayer.tt.volume + " " + (parseInt(this.ablePlayer.volume) / 10 * 100) + "%</span>");
                this.ablePlayer.$buttonSoundMute.text('');
                this.ablePlayer.$buttonSoundMute.addClass('vmuteno')
                this.ablePlayer.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span style='margin-left:-25%'> " + this.tt.mute + "</span>");

                if (this.ablePlayer.prefTranscript === 1) {
                    // var takePadding = 0;
                    // if(parseInt(this.$signToolbar.css('padding').replace('px',''))){
                    //   takePadding = parseInt(this.$signToolbar.css('padding').replace('px',''));
                    // }
                    //this.$transcriptArea .css('top',(this.$signWindow.height()+this.$signToolbar.height()+takePadding)+'px');

                } else {
                    console.log('sign change playerDiv width, max width :' + this.ablePlayer.$ableWrapper.css('max-width') + ' / ' + this.ablePlayer.$ableWrapper.width());
                    this.ablePlayer.$playerDiv.css('width', (this.ablePlayer.$ableWrapper.width()) + 'px');
                    //this.$playerDiv.css('width',(this.$ableWrapper.css('max-width')));
                }
                //If sign window is visible, change it size due to size of first video
                // document.getElementById("video1").addEventListener('loadeddata', function() {
                //   document.getElementById("video1-sign").style.maxHeight = document.getElementById("video1").offsetHeight+"px";
                //   document.getElementById("video1-sign").style.backgroundColor = "black";

                // }, false);
                for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                    var vidId = document.getElementsByClassName("video-accessible")[q].id;
                    document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function () {
                        //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
                        document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                        document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                        console.log("for sign");
                        console.log(document.getElementById(vidId + "-sign").style.height);
                        document.getElementById(vidId + "-sign").addEventListener('ended', function () {
                            document.getElementById(vidId + "-sign").load();
                        });
                    }, false);
                }
                console.log('here change media height 2');
                this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('height'));
                this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.css('height'));

                $(window).resize(function () {
                    //console.log('sign window resize');
                    for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                        var vidId = document.getElementsByClassName("video-accessible")[q].id;
                        //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
                        document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                        document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                        //if (this.prefTranscript === 1) {
                        //document.getElementsByClassName("able-transcript-area")[0].style.top = document.getElementById(vidId).offsetHeight+"px";
                        //}
                    }
                    console.log('here change media height 3')
                    thisObj.ablePlayer.$mediaContainer.find('video').css('height', thisObj.ablePlayer.$mediaContainer.css('height'));
                    thisObj.ablePlayer.$bigPlayButton.css('height', thisObj.ablePlayer.$mediaContainer.css('height'));

                });

                if (this.ablePlayer.$signWindow.is(':visible') === false) {
                    console.log('La vidéo signée est visibible !!!');
                } else {
                    console.log(this.ablePlayer.$signWindow);
                }


                //this.$signWindow.css('width',this.$mediaContainer.width()+"px");
                //this.$signWindow.css('height',this.$vidcapContainer.height()+"px");

            }
        } else {
            this.ablePlayer.$signWindow.hide();
            // if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
            //   var svgVideoSrc = this.$signWindow.find('video').find('source')[0].src;
            //   //put video sign in the second container
            //   this.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
            //   this.$mediaContainer.find('video')[0].load();
            //   //put video in the first containre
            //   this.$signWindow.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
            //   this.$signWindow.find('video')[0].load();
            // }
        }
        this.ablePlayer.control.checkContextVidTranscr();
    };


}