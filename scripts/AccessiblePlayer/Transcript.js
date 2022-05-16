export default class Transcript{


    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    setDragDrop( dragDrop ){
        this.dragDrop = dragDrop;
        return this;
    }

    /**
     * Insere le HTML pour les transcriptions dans le DOM
     */
    injectTranscriptArea() {
        var thisObj = this;

        this.ablePlayer.$transcriptArea = $('<div>', {
            'class': 'able-transcript-area',
            'role': 'tab',
            'aria-label': this.ablePlayer.tt.transcriptTitle,
            'tabindex': '0'
        });

        this.ablePlayer.$transcriptToolbar = $('<div>', {
            'class': 'able-window-toolbar able-' + this.ablePlayer.toolbarIconColor + '-controls'
        });

        this.ablePlayer.$transcriptDiv = $('<div>', {
            'class': 'able-transcript'
        });

        // Transcript toolbar content:
        //Orange remove Defilement checkbox
        this.ablePlayer.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
        //this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);

        // Add field for selecting a transcript language
        // This will be deleted in initialize.js > recreatePlayer() if there are no languages
        this.ablePlayer.$transcriptLanguageSelect = $('<select id="transcript-language-select">');
        // Add a default "Unknown" option; this will be deleted later if there are any
        // elements with a language.
        this.ablePlayer.$unknownTranscriptOption = $('<option val="unknown">' + this.ablePlayer.tt.unknown + '</option>');
        this.ablePlayer.$transcriptLanguageSelect.append(this.ablePlayer.$unknownTranscriptOption);
        this.ablePlayer.$transcriptLanguageSelect.prop('disabled', true);

        var languageSelectWrapper = $('<div class="transcript-language-select-wrapper">');
        this.ablePlayer.$transcriptLanguageSelectContainer = languageSelectWrapper;

        languageSelectWrapper.append($('<label for="transcript-language-select">' + this.ablePlayer.tt.language + ': </label>'), this.ablePlayer.$transcriptLanguageSelect);
        //Orange remove langage
        //this.$transcriptToolbar.append(languageSelectWrapper);

        this.ablePlayer.$transcriptArea.append(this.ablePlayer.$transcriptToolbar, this.ablePlayer.$transcriptDiv);

        // If client has provided separate transcript location, put it there.
        // Otherwise append it to the body
        if (this.ablePlayer.transcriptDivLocation) {
            $('#' + this.ablePlayer.transcriptDivLocation).append(this.ablePlayer.$transcriptArea);
        } else {
            this.ablePlayer.$ableWrapper.append(this.ablePlayer.$transcriptArea);
        }

        // make it draggable (popup only; NOT external transcript)
        if (!this.ablePlayer.transcriptDivLocation) {
            this.ablePlayer.dragDrop.initDragDrop('transcript');
            console.log(this.ablePlayer.$media.height());
            console.log(this.ablePlayer.$mediaContainer.css('height'));
            console.log('here INIT transcript in transcript.js');
            if (this.ablePlayer.prefTranscript === 1) {
                // transcript is on. Go ahead and position it
                this.ablePlayer.positionDraggableWindow('transcript', this.ablePlayer.getDefaultWidth('transcript'));
                if (this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                    //(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%'
                    //this.$ableDiv.css('width','33%');
                    console.log(this.ablePlayer.$media.height());
                    console.log(this.ablePlayer.$mediaContainer.css('height'));
                    this.ablePlayer.$transcriptArea.css('width', '66%');
                    if (this.ablePlayer.prefSign === 1) {
                        this.ablePlayer.$ableDiv.css('width', (100 - thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
                        this.ablePlayer.$transcriptArea.css('width', (thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
                    }

                    this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$media.height() + 'px !important');
                    //this.$ableDiv.css('width',100-parseInt(this.getCookie()['preferences']['prefVidSize'])+'%');
                    this.ablePlayer.$transcriptToolbar.css('min-height', '28px');
                    this.ablePlayer.$transcriptArea.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                    this.ablePlayer.$transcriptArea.css('left', 100 - parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
                    this.ablePlayer.$transcriptArea.css('top', '0px');
                    //console.log(this.$mediaContainer.css('height').split("px")[0]+" : "+this.$transcriptToolbar.css('min-height').split("px")[0]);

                    var heightTranscriptArea = this.ablePlayer.$mediaContainer.css('height').split("px")[0] - this.ablePlayer.$transcriptToolbar.css('min-height').split("px")[0];
                    this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.css('height').split("px")[0] + 'px');
                    this.ablePlayer.$transcriptDiv.css('height', heightTranscriptArea - 5 + 'px');
                    this.ablePlayer.$transcriptArea.css('position', 'absolute');
                    //this.resizeAccessMenu();

                    // this.$transcriptArea .css('left','33%');
                    // if(this.prefSign === 1){
                    //   this.$transcriptArea .css('left',(100-thisObj.getCookie()['preferences']['prefVidSize'])+'%');
                    // }
                    // this.$transcriptArea .css('position','absolute');
                    // this.$transcriptArea .css('top','0px');
                    // if(this.$transcriptArea[0].offsetWidth<500){
                    //   this.$transcriptToolbar.css('min-height','28px');
                    // }
                }

            }
        }

        // if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
        //   if(this.$ableDiv.css('width') === '100%'){
        //     this.$ableDiv.css('width','33%');
        //   }
        //   // this.$ableDiv.css('width','33%');
        //   this.$transcriptArea .css('width','66%');
        //   this.$transcriptArea .css('left','33%');
        //   // this.$transcriptArea .css('position','absolute');
        //   //console.log($('.able-sign-window').css('top'));
        // }
        // If client has provided separate transcript location, override user's preference for hiding transcript
        if (!this.ablePlayer.prefTranscript && !this.ablePlayer.transcriptDivLocation) {
            this.ablePlayer.$transcriptArea.hide();
        }
    };

    addTranscriptAreaEvents() {
        this.ablePlayer.$autoScrollTranscriptCheckbox.click(() => {
            this.ablePlayer.control.handleTranscriptLockToggle(this.ablePlayer.$autoScrollTranscriptCheckbox.prop('checked'));
        });
        this.ablePlayer.$transcriptDiv.on('mousewheel DOMMouseScroll click scroll', (e) => {
            if (!this.ablePlayer.scrollingTranscript) {
                this.ablePlayer.autoScrollTranscript = false;
                this.ablePlayer.control.refreshControls();
            }
            this.ablePlayer.scrollingTranscript = false;
        });

        if (typeof this.ablePlayer.$transcriptLanguageSelect !== 'undefined') {

            this.ablePlayer.$transcriptLanguageSelect.on('click mousedown',function (e) {
                e.stopPropagation();
            });

            this.ablePlayer.$transcriptLanguageSelect.on('change',() => {

                var language = this.ablePlayer.$transcriptLanguageSelect.val();

                this.ablePlayer.control.syncTrackLanguages('transcript',language);
            });
        }
    };

    // check the external transcript to be sure it has all required components
    // return true or false
    transcriptSrcHasRequiredParts () {
        if ($('#' + this.ablePlayer.transcriptSrc).length) {
            this.ablePlayer.$transcriptArea = $('#' + this.ablePlayer.transcriptSrc);
            if (this.ablePlayer.$transcriptArea.find('.able-window-toolbar').length) {
                this.ablePlayer.$transcriptToolbar = this.ablePlayer.$transcriptArea.find('.able-window-toolbar').eq(0);
                if (this.ablePlayer.$transcriptArea.find('.able-transcript').length) {
                    this.ablePlayer.$transcriptDiv = this.ablePlayer.$transcriptArea.find('.able-transcript').eq(0);
                    if (this.ablePlayer.$transcriptArea.find('.able-transcript-seekpoint').length) {
                        this.ablePlayer.$transcriptSeekpoints = this.ablePlayer.$transcriptArea.find('.able-transcript-seekpoint');
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Insere unique le DOM des transcriptions manuelle sans la partie des textes
     */
    setupManualTranscript() {
        this.ablePlayer.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
        this.ablePlayer.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.ablePlayer.tt.autoScroll + ': </label>'), this.ablePlayer.$autoScrollTranscriptCheckbox);
    };

    updateTranscript () {

        if (!this.ablePlayer.transcriptType) {
            return;
        }

        if (this.ablePlayer.transcriptType === 'external' || this.ablePlayer.transcriptType === 'popup') {

            var chapters, captions, descriptions;

            // Language of transcript might be different than language of captions
            // But both are in sync by default
            if (this.ablePlayer.transcriptLang) {
                captions = this.ablePlayer.transcriptCaptions.cues;
            }
            else {
                if (this.ablePlayer.transcriptCaptions) {
                    this.transcriptLang = this.ablePlayer.transcriptCaptions.language;
                    captions = this.ablePlayer.transcriptCaptions.cues;
                }
                else if (this.ablePlayer.selectedCaptions) {
                    this.transcriptLang = this.ablePlayer.captionLang;
                    captions = this.ablePlayer.selectedCaptions.cues;
                }
            }

            // setup chapters
            if (this.ablePlayer.transcriptChapters) {
                chapters = this.ablePlayer.transcriptChapters.cues;
            }
            else if (this.ablePlayer.chapters.length > 0) {
                // Try and match the caption language.
                if (this.ablePlayer.transcriptLang) {
                    for (var i = 0; i < this.ablePlayer.chapters.length; i++) {
                        if (this.ablePlayer.chapters[i].language === this.ablePlayer.transcriptLang) {
                            chapters = this.ablePlayer.chapters[i].cues;
                        }
                    }
                }
                if (typeof chapters === 'undefined') {
                    chapters = this.ablePlayer.chapters[0].cues || [];
                }
            }

            // setup descriptions
            if (this.ablePlayer.transcriptDescriptions) {
                descriptions = this.ablePlayer.transcriptDescriptions.cues;
            }
            else if (this.ablePlayer.descriptions.length > 0) {
                // Try and match the caption language.
                if (this.ablePlayer.transcriptLang) {
                    for (var i = 0; i < this.ablePlayer.descriptions.length; i++) {
                        if (this.ablePlayer.descriptions[i].language === this.ablePlayer.transcriptLang) {
                            descriptions = this.ablePlayer.descriptions[i].cues;
                        }
                    }
                }
                if (!descriptions) {
                    descriptions = this.ablePlayer.descriptions[0].cues || [];
                }
            }

            var div = this.generateTranscript(chapters || [], captions || [], descriptions || []);

            this.ablePlayer.$transcriptDiv.html(div);
            // reset transcript selected <option> to this.transcriptLang
            if (this.ablePlayer.$transcriptLanguageSelect) {
                this.ablePlayer.$transcriptLanguageSelect.find('option:selected').prop('selected',false);
                this.ablePlayer.$transcriptLanguageSelect.find('option[lang=' + this.ablePlayer.transcriptLang + ']').prop('selected',true);
            }
        }

        var thisObj = this;

        // Make transcript tabbable if preference is turned on.
        if (this.ablePlayer.prefTabbable === 1) {
            $('.able-transcript span.able-transcript-seekpoint').attr('tabindex', '0');
        }

        if (this.ablePlayer.$transcriptArea.length > 0) {
            this.ablePlayer.$transcriptArea.find('span.able-transcript-seekpoint').click(function(e) {
                thisObj.ablePlayer.seekTrigger = 'transcript';
                var spanStart = parseFloat($(this).attr('data-start'));
                // Add a tiny amount so that we're inside the span.
                spanStart += .01;
                if (!thisObj.ablePlayer.seekingFromTranscript) {
                    thisObj.ablePlayer.seekingFromTranscript = true;
                    thisObj.ablePlayer.control.seekTo(spanStart);
                }
                else {
                    // don't seek a second time, but do reset var
                    thisObj.ablePlayer.seekingFromTranscript = false;
                }
            });
        }
    };

    // Show highlight in transcript marking current caption.
    highlightTranscript(currentTime) {

        if (!this.ablePlayer.transcriptType) {
            return;
        }

        var start, end, isChapterHeading;
        var thisObj = this;
        currentTime = parseFloat(currentTime);
        this.ablePlayer.$transcriptArea.find('span.able-transcript-caption').each(function () {
            start = parseFloat($(this).attr('data-start'));
            end = parseFloat($(this).attr('data-end'));
            if (currentTime >= start && currentTime <= end) {
                // move all previous highlights before adding one to current span
                $('.able-highlight').css('background', thisObj.ablePlayer.preference.getCookie()['preferences']['prefTRBGColor']);
                thisObj.ablePlayer.$transcriptArea.find('.able-highlight').removeClass('able-highlight');
                $(this).addClass('able-highlight');
                //console.log('able-highlight added '+thisObj.getCookie()['preferences']['prefFollowColor']);
                $('.able-highlight').css('background', thisObj.ablePlayer.preference.getCookie()['preferences']['prefFollowColor']);
                return false;
            }
        });
        thisObj.ablePlayer.currentHighlight = $('.able-highlight');
        if (thisObj.ablePlayer.currentHighlight.length === 0) {
            // Nothing highlighted.
            thisObj.ablePlayer.currentHighlight = null;
        }
    };

    generateTranscript(chapters, captions, descriptions) {
        var thisObj = this;
        var $main = $('<div class="able-transcript-container"></div>');
        var transcriptTitle;
        // set language for transcript container
        $main.attr('lang', this.ablePlayer.transcriptLang);

        if (typeof this.ablePlayer.transcriptTitle !== 'undefined') {
            transcriptTitle = this.ablePlayer.transcriptTitle;
        }
        else if (this.ablePlayer.lyricsMode) {
            transcriptTitle = this.ablePlayer.tt.lyricsTitle;
        }
        else {
            transcriptTitle = this.ablePlayer.tt.transcriptTitle;
        }

        if (typeof this.ablePlayer.transcriptDivLocation === 'undefined') {
            var headingNumber = this.ablePlayer.playerHeadingLevel;
            headingNumber += 1;
            var chapterHeadingNumber = headingNumber + 1;

            if (headingNumber <= 6) {
                var transcriptHeading = 'h' + headingNumber.toString();
            }
            else {
                var transcriptHeading = 'div';
            }
            // var transcriptHeadingTag = '<' + transcriptHeading + ' class="able-transcript-heading">';
            var $transcriptHeadingTag = $('<' + transcriptHeading + '>');
            $transcriptHeadingTag.addClass('able-transcript-heading');
            if (headingNumber > 6) {
                $transcriptHeadingTag.attr({
                    'role': 'heading',
                    'aria-level': headingNumber
                });
            }
            $transcriptHeadingTag.text(transcriptTitle);

            $transcriptHeadingTag.attr('lang', this.ablePlayer.lang);

            $main.append($transcriptHeadingTag);
        }

        var nextChapter = 0;
        var nextCap = 0;
        var nextDesc = 0;

        var addChapter = function(div, chap) {

            if (chapterHeadingNumber <= 6) {
                var chapterHeading = 'h' + chapterHeadingNumber.toString();
            }
            else {
                var chapterHeading = 'div';
            }

            var $chapterHeadingTag = $('<' + chapterHeading + '>',{
                'class': 'able-transcript-chapter-heading'
            });
            if (chapterHeadingNumber > 6) {
                $chapterHeadingTag.attr({
                    'role': 'heading',
                    'aria-level': chapterHeadingNumber
                });
            }

            var flattenComponentForChapter = function(comp) {

                var result = [];
                if (comp.type === 'string') {
                    result.push(comp.value);
                }
                else {
                    for (var i = 0; i < comp.children.length; i++) {
                        result = result.concat(flattenComponentForChapter(comp.children[i]));
                    }
                }
                return result;
            }

            var $chapSpan = $('<span>', {
                'class': 'able-transcript-seekpoint',
                'style': 'color:' + thisObj.ablePlayer.preference.getCookie()['preferences']['prefTRColor'] + ';background-color:' + thisObj.getCookie()['preferences']['prefTRBGColor'] + ';font-size:' + thisObj.getCookie()['preferences']['prefTRSize'] + ';font-family:' + thisObj.getCookie()['preferences']['prefTRFont']
            });
            for (var i = 0; i < chap.components.children.length; i++) {
                var results = flattenComponentForChapter(chap.components.children[i]);
                for (var jj = 0; jj < results.length; jj++) {
                    $chapSpan.append(results[jj]);
                }
            }
            $chapSpan.attr('data-start', chap.start.toString());
            $chapSpan.attr('data-end', chap.end.toString());
            $chapterHeadingTag.append($chapSpan);

            div.append($chapterHeadingTag);
        };

        var addDescription = (div, desc) => {
            var $descDiv = $('<div>', {
                'class': 'able-transcript-desc'
            });
            var $descHiddenSpan = $('<span>',{
                'class': 'able-hidden'
            });
            $descHiddenSpan.attr('lang', this.ablePlayer.lang);
            $descHiddenSpan.text(this.ablePlayer.tt.prefHeadingDescription + ': ');
            $descDiv.append($descHiddenSpan);

            var flattenComponentForDescription = function(comp) {

                var result = [];
                if (comp.type === 'string') {
                    result.push(comp.value);
                }
                else {
                    for (var i = 0; i < comp.children.length; i++) {
                        result = result.concat(flattenComponentForDescription(comp.children[i]));
                    }
                }
                return result;
            }

            var $descSpan = $('<span>', {
                'class': 'able-transcript-seekpoint',
                'style': 'color:' + thisObj.ablePlayer.preference.getCookie()['preferences']['prefTRColor'] + ';background-color:' + thisObj.getCookie()['preferences']['prefTRBGColor'] + ';font-size:' + thisObj.getCookie()['preferences']['prefTRSize'] + ';font-family:' + thisObj.getCookie()['preferences']['prefTRFont']
            });
            for (var i = 0; i < desc.components.children.length; i++) {
                var results = flattenComponentForDescription(desc.components.children[i]);
                for (var jj = 0; jj < results.length; jj++) {
                    $descSpan.append(results[jj]);
                }
            }
            $descSpan.attr('data-start', desc.start.toString());
            $descSpan.attr('data-end', desc.end.toString());
            $descDiv.append($descSpan);

            div.append($descDiv);
        };

        var addCaption = (div, cap) => {

            var $capSpan = $('<span>',{
                'class': 'able-transcript-seekpoint able-transcript-caption'
            });

            var flattenComponentForCaption = function(comp) {

                var result = [];

                var parts = 0;

                var flattenString = function (str) {

                    parts++;

                    var flatStr;
                    var result = [];
                    if (str === '') {
                        return result;
                    }

                    var openBracket = str.indexOf('[');
                    var closeBracket = str.indexOf(']');
                    var openParen = str.indexOf('(');
                    var closeParen = str.indexOf(')');

                    var hasBrackets = openBracket !== -1 && closeBracket !== -1;
                    var hasParens = openParen !== -1 && closeParen !== -1;

                    if ((hasParens && hasBrackets && openBracket < openParen) || hasBrackets) {
                        result = result.concat(flattenString(str.substring(0, openBracket)));
                        var $silentSpan = $('<span>', {
                            'class': 'able-unspoken'
                        });
                        $silentSpan.text(str.substring(openBracket, closeBracket + 1));
                        result.push($silentSpan);
                        result = result.concat(flattenString(str.substring(openParen, closeParen + 1)));
                    } else if (hasParens) {
                        result = result.concat(flattenString(str.substring(0, openParen)));
                        var $silentSpan = $('<span>', {
                            'class': 'able-unspoken'
                        });
                        $silentSpan.text(str.substring(openBracket, closeBracket + 1));
                        result.push($silentSpan);
                        result = result.concat(flattenString(str.substring(closeParen + 1)));
                    } else {
                        result.push(str);
                    }
                    return result;
                };

                if (comp.type === 'string') {
                    result = result.concat(flattenString(comp.value));
                }
                else if (comp.type === 'v') {
                    var $vSpan = $('<span>',{
                        'class': 'able-unspoken'
                    });
                    $vSpan.text('(' + comp.value + ')');
                    result.push($vSpan);
                    for (var i = 0; i < comp.children.length; i++) {
                        var subResults = flattenComponentForCaption(comp.children[i]);
                        for (var jj = 0; jj < subResults.length; jj++) {
                            result.push(subResults[jj]);
                        }
                    }
                }
                else if (comp.type === 'b' || comp.type === 'i') {
                    if (comp.type === 'b') {
                        var $tag = $('<strong>');
                    } else if (comp.type === 'i') {
                        var $tag = $('<em>');
                    }
                    for (var ii = 0; ii < comp.children.length; ii++) {
                        var subResults = flattenComponentForCaption(comp.children[ii]);
                        for (var jj = 0; jj < subResults.length; jj++) {
                            $tag.append(subResults[jj]);
                        }
                    }
                    if (comp.type === 'b' || comp.type == 'i') {
                        result.push($tag, ' ');
                    }
                } else {
                    for (var ii = 0; ii < comp.children.length; ii++) {
                        result = result.concat(flattenComponentForCaption(comp.children[ii]));
                    }
                }
                return result;
            };

            for (var ii = 0; ii < cap.components.children.length; ii++) {
                var results = flattenComponentForCaption(cap.components.children[ii]);
                for (var jj = 0; jj < results.length; jj++) {
                    var result = results[jj];
                    if (typeof result === 'string') {
                        if (thisObj.lyricsMode) {
                            // add <br> BETWEEN each caption and WITHIN each caption (if payload includes "\n")
                            result = result.replace('\n', '<br>') + '<br>';
                        } else {
                            // just add a space between captions
                            result += ' ';
                        }
                    }
                    $capSpan.append(result);
                }
            }
            $capSpan.attr('data-start', cap.start.toString());
            $capSpan.attr('data-end', cap.end.toString());
            div.append($capSpan);
            div.append(' \n');
        };

        // keep looping as long as any one of the three arrays has content
        while ((nextChapter < chapters.length) || (nextDesc < descriptions.length) || (nextCap < captions.length)) {

            if ((nextChapter < chapters.length) && (nextDesc < descriptions.length) && (nextCap < captions.length)) {
                // they all three have content
                var firstStart = Math.min(chapters[nextChapter].start, descriptions[nextDesc].start, captions[nextCap].start);
            } else if ((nextChapter < chapters.length) && (nextDesc < descriptions.length)) {
                // chapters & descriptions have content
                var firstStart = Math.min(chapters[nextChapter].start, descriptions[nextDesc].start);
            } else if ((nextChapter < chapters.length) && (nextCap < captions.length)) {
                // chapters & captions have content
                var firstStart = Math.min(chapters[nextChapter].start, captions[nextCap].start);
            } else if ((nextDesc < descriptions.length) && (nextCap < captions.length)) {
                // descriptions & captions have content
                var firstStart = Math.min(descriptions[nextDesc].start, captions[nextCap].start);
            } else {
                var firstStart = null;
            }
            if (firstStart !== null) {
                if (typeof chapters[nextChapter] !== 'undefined' && chapters[nextChapter].start === firstStart) {
                    addChapter($main, chapters[nextChapter]);
                    nextChapter += 1;
                } else if (typeof descriptions[nextDesc] !== 'undefined' && descriptions[nextDesc].start === firstStart) {
                    addDescription($main, descriptions[nextDesc]);
                    nextDesc += 1;
                } else {
                    addCaption($main, captions[nextCap]);
                    nextCap += 1;
                }
            } else {
                if (nextChapter < chapters.length) {
                    addChapter($main, chapters[nextChapter]);
                    nextChapter += 1;
                } else if (nextDesc < descriptions.length) {
                    addDescription($main, descriptions[nextDesc]);
                    nextDesc += 1;
                } else if (nextCap < captions.length) {
                    addCaption($main, captions[nextCap]);
                    nextCap += 1;
                }
            }
        }
        // organize transcript into blocks using [] and () as starting points
        var $components = $main.children();
        var spanCount = 0;
        var openBlock = true;
        $components.each(function () {
            if ($(this).hasClass('able-transcript-caption')) {
                if ($(this).text().indexOf('[') !== -1 || $(this).text().indexOf('(') !== -1) {
                    // this caption includes a bracket or parenth. Start a new block
                    // close the previous block first
                    if (spanCount > 0) {
                        $main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
                        spanCount = 0;
                    }
                }
                $(this).addClass('able-block-temp');
                spanCount++;
            } else {
                // this is not a caption. Close the caption block
                if (spanCount > 0) {
                    $main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
                    spanCount = 0;
                }
            }
        });
        return $main;
    };

    //to delete
    /**
     * insere le DOM des transcriptions dans le DOM principal
     * @returns Promise
     */
    setupTranscript () {
        var deferred = new $.Deferred();
        var promise = deferred.promise();
        if (!this.ablePlayer.transcriptType) {
            if (this.ablePlayer.captions.length && (!(this.ablePlayer.usingYouTubeCaptions || this.ablePlayer.usingVimeoCaptions))) {
                this.ablePlayer.transcriptType = 'popup';
            }
        }
        if (this.ablePlayer.transcriptType) {
            if (this.ablePlayer.transcriptType === 'popup' || this.ablePlayer.transcriptType === 'external') {
                this.injectTranscriptArea();
                deferred.resolve();
            }
            else if (this.ablePlayer.transcriptType === 'manual') {
                this.setupManualTranscript();
                deferred.resolve();
            }
        }
        else {
            deferred.resolve();
        }
        return promise;
    };















}