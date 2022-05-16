import AccessiblePlayer from "./AccessiblePlayer.js";
import AccessibleDialog from "./AccessibleDialog.js";

export default class DragDrop{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    setControl( control ){
        this.control = control;
        return this;
    }

    setPreference( preferences ){
        this.preferences = preferences;
        return this;
    }

    // supported values of which: 'sign', 'transcript'
    // HTML5 Drag & Drop API enables moving elements to new locations in the DOM
    // Thats not our purpose; we're simply changing the visible position on-screen
    initDragDrop ( which ) {
        var thisObj, $window, $toolbar, windowName, $resizeHandle, resizeZIndex;

        thisObj = this;

        if (which === 'transcript') {
            $window = this.ablePlayer.$transcriptArea;
            windowName = 'transcript-window';
            $toolbar = this.ablePlayer.$transcriptToolbar;
        } else if (which === 'sign') {
            $window = this.ablePlayer.$signWindow;
            windowName = 'sign-window';
            $toolbar = this.ablePlayer.$signToolbar;
        }

        // add class to trigger change in cursor on hover
        //Orange don't authorize draggable
        //$toolbar.addClass('able-draggable');

        // add resize handle selector to bottom right corner
        $resizeHandle = $('<div>', {
            'class': 'able-resizable'
        });
        // assign z-index that's slightly higher than parent window
        resizeZIndex = parseInt($window.css('z-index')) + 100;
        $resizeHandle.css('z-index', resizeZIndex);
        // if ($window == this.$transcriptArea) {
        //   $resizeHandle.css('top', ($window[0].offsetHeight+$toolbar[0].offsetHeight)+'px');
        // }
        $window.append($resizeHandle);

        // add event listener to toolbar to start and end drag
        // other event listeners will be added when drag starts
        //Orange remove handle for moving toolbar
        // $toolbar.on('mousedown', function (event) {
        //   event.stopPropagation();
        //   if (!thisObj.windowMenuClickRegistered) {
        //     thisObj.windowMenuClickRegistered = true;
        //     thisObj.startMouseX = event.pageX;
        //     thisObj.startMouseY = event.pageY;
        //     thisObj.dragDevice = 'mouse';
        //     thisObj.startDrag(which, $window);
        //   }
        //   return false;
        // });
        // $toolbar.on('mouseup', function (event) {
        //   event.stopPropagation();
        //   if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
        //     thisObj.endDrag(which);
        //   }
        //   return false;
        // });

        // add event listeners for resizing
        $resizeHandle.on('mousedown', function (event) {
            console.log('$resizeHandle mousedown');
            event.stopPropagation();
            if (!thisObj.ablePlayer.windowMenuClickRegistered) {
                thisObj.ablePlayer.windowMenuClickRegistered = true;
                thisObj.ablePlayer.startMouseX = event.pageX;
                thisObj.ablePlayer.startMouseY = event.pageY;
                thisObj.startResize(which, $window);
                return false;
            }
        });
        $resizeHandle.on('mouseup', function (event) {
            console.log('$resizeHandle mouseup');
            event.stopPropagation();
            if (thisObj.ablePlayer.resizing) {
                thisObj.endResize(which);
            }
            return false;
        });

        // whenever a window is clicked, bring it to the foreground
        //Orange don't authorize to moove draggable
        // $window.on('click', function () {
        //   console.log('click draggable');
        //   if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
        //     thisObj.updateZIndex(which);
        //   }
        //   thisObj.finishingDrag = false;
        // });

        this.addWindowMenu(which, $window, windowName);
    };

    addWindowMenu (which, $window, windowName) {

        var thisObj, $windowAlert, $newButton, $buttonIcon, buttonImgSrc, $buttonImg,
            $buttonLabel, tooltipId, $tooltip, $popup,
            label, position, buttonHeight, buttonWidth, tooltipY, tooltipX, tooltipStyle, tooltip,
            $optionList, radioName, options, i, $optionItem, option,
            radioId, $radioButton, $radioLabel;

        thisObj = this;

        // Add a Boolean that will be set to true temporarily if window button or a menu item is clicked
        // This will prevent the click event from also triggering a mousedown event on the toolbar
        // (which would unexpectedly send the window into drag mode)
        this.ablePlayer.windowMenuClickRegistered = false;

        // Add another Boolean that will be set to true temporarily when mouseup fires at the end of a drag
        // this will prevent the click event from being triggered
        this.ablePlayer.finishingDrag = false;

        // create an alert div and add it to window
        $windowAlert = $('<div role="alert"></div>');
        $windowAlert.addClass('able-alert');
        $windowAlert.hide();
        $windowAlert.appendTo(this.ablePlayer.$activeWindow);
        $windowAlert.css({
            top: $window.offset().top
        });

        // add button to draggable window which triggers a popup menu
        // for now, re-use preferences icon for this purpose
        $newButton = $('<button>', {
            'type': 'button',
            'tabindex': '0',
            'aria-label': this.ablePlayer.tt.windowButtonLabel,
            'class': 'able-button-handler-preferences'
        });
        if (this.ablePlayer.iconType === 'font') {
            $buttonIcon = $('<span>', {
                'class': 'icon-preferences',
                'aria-hidden': 'true'
            });
            $newButton.append($buttonIcon);
        } else if (this.ablePlayer.iconType === 'svg') {
            $buttonIcon = $('<span>', {
                'class': 'icon-preferences',
                'aria-hidden': 'true'
            });
            $newButton.append($buttonIcon);
        } else {
            // use image
            buttonImgSrc = this.ablePlayer.rootPath + 'button-icons/' + this.ablePlayer.toolbarIconColor + '/preferences.png';
            $buttonImg = $('<img>', {
                'src': buttonImgSrc,
                'alt': '',
                'role': 'presentation'
            });
            $newButton.append($buttonImg);
        }

        // add the visibly-hidden label for screen readers that don't support aria-label on the button
        $buttonLabel = $('<span>', {
            'class': 'able-clipped'
        }).text(this.ablePlayer.tt.windowButtonLabel);
        $newButton.append($buttonLabel);

        // add a tooltip that displays aria-label on mouseenter or focus
        tooltipId = this.ablePlayer.mediaId + '-' + windowName + '-tooltip';
        $tooltip = $('<div>', {
            'class': 'able-tooltip',
            'id': tooltipId
        }).hide();
        $newButton.on('mouseenter focus', function (event) {
            var label = $(this).attr('aria-label');
            // get position of this button
            var position = $(this).position();
            var buttonHeight = $(this).height();
            var buttonWidth = $(this).width();
            var tooltipY = position.top - buttonHeight - 5;
            var tooltipX = 0;
            var tooltipStyle = {
                left: '',
                right: tooltipX + 'px',
                top: tooltipY + 'px'
            };
            var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
            thisObj.ablePlayer.control.showTooltip(tooltip);
            $(this).on('mouseleave blur', function () {
                AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
            });
        });

        // add a popup menu
        $popup = this.ablePlayer.createPopup(windowName);
        $optionList = $('<ul></ul>');
        radioName = this.ablePlayer.mediaId + '-' + windowName + '-choice';

        options = [];
        // options.push({
        //   'name': 'move',
        //   'label': this.tt.windowMove
        // });
        options.push({
            'name': 'resize',
            'label': this.ablePlayer.tt.windowResize
        });
        for (i = 0; i < options.length; i++) {
            $optionItem = $('<li style="margin:0px;padding:0px"></li>');
            option = options[i];
            radioId = radioName + '-' + i;
            $radioButton = $('<input>', {
                'type': 'radio',
                'val': option.name,
                'name': radioName,
                'id': radioId
            });
            $radioLabel = $('<label>', {
                'for': radioId,
                'style': 'color:white;cursor:pointer;border-color:white;background-color:#757575',
            });
            $radioLabel.text(option.label);
            $radioButton.on('focus', function (e) {
                //Orange change class of Reidmmensionner, addClass more than removeClass
                $(this).parents('ul').children('li').addClass('able-focus');
                $(this).parent('li').addClass('able-focus');
            });
            $radioButton.on('click', function (e) {
                e.stopPropagation();
                if (!thisObj.ablePlayer.windowMenuClickRegistered && !thisObj.ablePlayer.finishingDrag) {
                    thisObj.ablePlayer.windowMenuClickRegistered = true;
                    thisObj.handleMenuChoice(which, $(this).val(), e.type);
                }
            });
            // due to an apparent bug (in jquery?) clicking the label
            // does not result in a click event on the associated radio button
            // Observed this in Firefox 45.0.2 and Chrome 50
            // It works fine on a simple test page so this could be an Able Player bug
            // Added the following as a workaround rather than mess with isolating the bug
            $radioLabel.on('click mousedown', function () {
                var clickedId = $(this).attr('for');
                $('#' + clickedId).click();
            })
            $optionItem.append($radioButton, $radioLabel);
            $optionList.append($optionItem);
            $radioLabel.css('margin', '0px');
        }
        $popup.append($optionList);
        $newButton.on('click mousedown keydown', function (e) {
            e.stopPropagation();
            if (!thisObj.ablePlayer.windowMenuClickRegistered && !thisObj.ablePlayer.finishingDrag) {
                // don't set windowMenuClickRegistered yet; that happens in handler function
                thisObj.handleWindowButtonClick(which, e);
            }
            thisObj.finishingDrag = false;
        });

        $popup.on('keydown', function (event) {
            // Escape key
            if (event.which === 27) {
                // Close Window Options Menu
                $newButton.focus();
                $popup.hide();
            }
        });

        // define vars and assemble all the parts
        if (which === 'transcript') {
            this.ablePlayer.$transcriptAlert = $windowAlert;
            this.ablePlayer.$transcriptPopupButton = $newButton;
            this.ablePlayer.$transcriptPopup = $popup;
            this.ablePlayer.$transcriptToolbar.append($windowAlert, $newButton, $tooltip, $popup);
        } else if (which === 'sign') {
            this.ablePlayer.$signAlert = $windowAlert;
            this.ablePlayer.$signPopupButton = $newButton;
            this.ablePlayer.$signPopup = $popup;
            this.ablePlayer.$signToolbar.append($windowAlert, $newButton, $tooltip, $popup);
        }
        this.addResizeDialog(which, $window);
    };

    addResizeDialog(which, $window) {

        var thisObj, $windowPopup, $windowButton,
            widthId, heightId, startingWidth, startingHeight, aspectRatio,
            $resizeForm, $resizeWrapper,
            $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel, $resizeWidthInputOld, $resizeWidthLabelOld,
            $resizeWidthPlus, $resizeWidthMoins,
            $resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel,
            tempWidth, tempHeight,
            $horizontalLogo, $horizontalButton, $verticalButton, $verticalLogo,
            $saveButton, $saveButtonOrange, $cancelButton, newWidth, newHeight, resizeDialog;

        thisObj = this;

        if (which === 'transcript') {
            $windowPopup = this.ablePlayer.$transcriptPopup;
            $windowButton = this.ablePlayer.$transcriptPopupButton;
        } else if (which === 'sign') {
            $windowPopup = this.ablePlayer.$signPopup;
            $windowButton = this.ablePlayer.$signPopupButton;
        }

        widthId = this.ablePlayer.mediaId + '-resize-' + which + '-width';
        heightId = this.ablePlayer.mediaId + '-resize-' + which + '-height';
        //startingWidth = $window.width();
        startingWidth = this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'];//Math.round($window.width() / $window.parent().width() * 100);
        //console.log($window.width() /$window.parent().width() * 100);
        startingHeight = $window.height();
        aspectRatio = startingWidth / startingHeight;

        $resizeForm = $('<div></div>', {
            'class': 'able-resize-form'
        });

        // inner container for all content, will be assigned to modal div's aria-describedby
        $resizeWrapper = $('<div style="text-align:center"></div>');

        // width field
        $resizeWidthDiv = $('<div class="resizeWidthDiv"></div>', {
            'style': 'display:inline-flex',
        });
        $resizeWidthInputOld = $('<input>', {
            'class': 'resizeWidthInputOld',
            'type': 'text',
            'id': widthId,
            'value': startingWidth
        });
        $resizeWidthLabelOld = $('<label>', {
            'class': 'resizeWidthLabelOld',
            'for': widthId
        }).text(this.ablePlayer.tt.width);
        $resizeWidthInput = $('<input>', {
            'type': 'number',
            'id': widthId,
            'value': startingWidth,
            'class': 'inputWidth resizeWidthInput',
            'max': 100,
            'min': 0,
            'step': 1,
            'aria-live': 'assertive'
        });
        //$resizeWidthInput.prop('readonly',true);
        $resizeWidthPlus = $('<button >', {
            'id': 'bPlus',
            'text': '+',
        });
        $resizeWidthMoins = $('<button>', {
            'id': 'bMoins',
            'text': '-',
        });
        // $resizeWidthLabel = $('<label>', {
        //   'for': widthId
        // }).text(this.tt.width);
        $resizeWidthLabelOld = $('<label>', {
            'class': 'resizeWidthLabelOld',
            'for': widthId,
        }).text(this.ablePlayer.tt.width);

        $resizeWidthLabel = $('<label>', {
            'class': 'resizeWidthLabel',
            'for': widthId,
            'style': 'font-size:22px',
        }).text('%');

        // height field
        $resizeHeightDiv = $('<div></div>', {
            'style': 'display:inline-flex',
        });
        $resizeHeightInput = $('<input>', {
            'type': 'text',
            'id': heightId,
            'class': 'resizeHeightInput',
            'value': startingHeight
        });
        $resizeHeightLabel = $('<label>', {
            'for': heightId,
            'class': 'resizeHeightLabel',
        }).text(this.ablePlayer.tt.height);

        //transcript fields
        $horizontalLogo = $('<img>', {
            'id': 'horizontalLogo',
            'src': 'button-icons/black/vertical.png',
            'height': 'auto',
        });
        $verticalLogo = $('<img>', {
            'id': 'verticalLogo',
            'src': 'button-icons/black/horizontal.png',
            'height': 'auto',
        });
        $horizontalButton = $('<button>', {
            'id': 'horizontalButton',
            'tabindex': '-1',
            'class': 'horizontalButton button',
            'text': this.ablePlayer.tt.horizontalButton
        });
        $verticalButton = $('<button>', {
            'id': 'verticalButton',
            'class': 'verticalButton button',
            'text': this.ablePlayer.tt.verticalButton
        });
        if (which === 'sign') {
            // make height a read-only field
            // and calculate its value based on width to preserve aspect ratio
            $resizeHeightInput.prop('readonly', true);
            $resizeWidthInput.on('input', function () {
                tempWidth = $(this).val();
                if (tempWidth > 100) {
                    tempWidth = 100;
                }
                tempHeight = Math.round(tempWidth / aspectRatio, 0);
                $resizeHeightInput.val(tempHeight);
                $resizeWidthInput.val(tempWidth);
            })
            $resizeWidthInput.on('change keyup mouseup', function () {
                tempWidth = $(this).val();
                if (tempWidth > 100) {
                    tempWidth = 100;
                }
                $('#' + widthId).val(tempWidth);
                $resizeWidthInput.val(tempWidth);
            })
        }

        $resizeWidthPlus.on('click', function () {
            var valPlusOne = parseInt($('#' + widthId).val()) + 1;
            $('#' + widthId).val(valPlusOne);
        });
        $resizeWidthMoins.on('click', function () {
            var valMoinsOne = parseInt($('#' + widthId).val()) - 1;
            $('#' + widthId).val(valMoinsOne);
        });

        $verticalButton.on('click', function () {
            thisObj.ablePlayer.prefTranscriptOrientation = 'vertical';
            thisObj.ablePlayer.preference.updateCookie('prefTranscriptOrientation');
            thisObj.ablePlayer.control.checkContextVidTranscr();
            resizeDialog.hide();
            $windowPopup.hide();
            $windowButton.focus();
            // if($('.able-sign-window').is(':visible') === false){
            //   $('.able-transcript-area').css('top','0px');
            //   $('.able').css('width','33%');
            //   $('.able-transcript-area').css('width','66%');
            //   $('.able-transcript-area').css('left','33%');
            // } else {
            //   $('.able-transcript-area').css('width',(thisObj.getCookie()['preferences']['prefVidSize'])+'%');
            //   $('.able-transcript-area').css('left',100-thisObj.getCookie()['preferences']['prefVidSize']+'%');
            //   $('.able-transcript-area').css('top',$('.video-accessible-sign').height()+'px');
            // }
            // resizeDialog.hide();
            // $windowPopup.hide();
            // $windowButton.focus();
            // thisObj.$playerDiv.css('width',(thisObj.$mediaContainer.width())+'px');
        });

        $horizontalButton.on('click', function () {
            thisObj.ablePlayer.prefTranscriptOrientation = 'horizontal';
            thisObj.ablePlayer.preference.updateCookie('prefTranscriptOrientation');
            thisObj.ablePlayer.control.checkContextVidTranscr();
            resizeDialog.hide();
            $windowPopup.hide();
            $windowButton.focus();
            // if($('.able-sign-window').is(':visible') === false){
            //   $('.able').css('width','100%');
            //   $('.able-transcript-area').css('width','100%');
            //   $('.able-transcript-area').css('left','0%');
            //   $('.able-transcript-area').css('top',$('.able').height()+'px');
            // } else {
            //   //$('.able').css('width','100%');
            //   console.log('change transcript to HORIZONTAL');
            //   $('.able-transcript-area').css('width','100%');
            //   $('.able-transcript-area').css('left','0%');
            //   $('.able-transcript-area').css('top',$('.able').height()+'px');
            // }
            // resizeDialog.hide();
            // $windowPopup.hide();
            // $windowButton.focus();
            // thisObj.$playerDiv.css('width',(thisObj.$ableWrapper.width())+'px');
        });

        // Add save and cancel buttons.
        $saveButton = $('<button class="modal-button saveButton" id="saveButton">' + this.ablePlayer.tt.save + '</button>');
        $saveButtonOrange = $('<button class="modal-button" id="saveButtonOrange">' + this.ablePlayer.tt.save + '</button>');
        $cancelButton = $('<button class="modal-button cancelButton" id="cancelButton">' + this.ablePlayer.tt.cancel + '</button>');

        $saveButtonOrange.on('click', function () {
            newWidth = $('#' + widthId).val();
            newHeight = $('#' + heightId).val();
            console.log("save O2 = " + newWidth + ' / ' + widthId);
            console.log("save O22 = " + newHeight);
            if (newWidth !== startingWidth || newHeight !== startingHeight) {
                console.log("OK reisize it ");
                console.log($window);
                $window.css({
                    'width': newWidth + '%',
                    'left': (100 - newWidth) + '%',
                    //'width': newWidth + 'px',
                    //'height': newHeight + 'px'
                });
                $('#' + thisObj.ablePlayer.mediaId + '_' + 'prefVidSize').val(newWidth);
                thisObj.ablePlayer.prefVidSize = newWidth;
                thisObj.ablePlayer.preference.updateCookie('prefVidSize');
                thisObj.ablePlayer.preference.updateCookie(which);
                $('.able').css('width', (100 - newWidth) + '%');
                $('.able-sign-window').css('width', (newWidth) + '%');
                $('.able-transcript-area').css('width', (newWidth) + '%');
                $('.able-transcript-area').css('left', (100 - newWidth) + '%');
                $('.able-transcript-area').css('top', $('.video-accessible').height() + 'px');
                for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                    var vidId = document.getElementsByClassName("video-accessible")[q].id;
                    console.log('foudn ' + vidId + ' -> ' + (newWidth / aspectRatio));
                    //document.getElementById(vidId+"-sign").style.maxHeight = (newHeight*aspectRatio)+"px";
                    //$('#'+vidId+'-sign').css('max-height',(newWidth/aspectRatio)+'px');
                    $('#' + vidId + '-sign').css('height', $('.video-accessible').height() + 'px');
                    thisObj.ablePlayer.$mediaContainer.find('video').css('height', thisObj.ablePlayer.$mediaContainer.css('height'));
                    thisObj.ablePlayer.$bigPlayButton.css('height', thisObj.ablePlayer.$mediaContainer.css('height'));
                }

                resizeDialog.hide();
                $windowPopup.hide();
                $windowButton.focus();
                thisObj.checkContextVidTranscr();
            }
        });
        $saveButton.on('click', function () {
            newWidth = $('#' + widthId).val();
            newHeight = $('#' + heightId).val();
            console.log("save O = " + newWidth);
            console.log("save O1 = " + newHeight);

            if (newWidth !== startingWidth || newHeight !== startingHeight) {
                $window.css({
                    'width': newWidth + 'px',
                    'height': newHeight + 'px'
                });

                // $('.able').css('width', (100 - newWidth) + '%');
                // $('.able-transcript-area').css('left', (100 - newWidth) + '%');
                // $('.able-sign-window').css('width', (newWidth) + '%');
                // $('.able-transcript-area').css('width', (newWidth) + '%');
                thisObj.ablePlayer.preference.updateCookie(which);
                resizeDialog.hide();
                $windowPopup.hide();
                $windowButton.focus();

            }
        });

        $cancelButton.on('click', function () {
            resizeDialog.hide();
            $windowPopup.hide();
            $windowButton.focus();
            var oldV = parseInt(thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize']);
            $('#' + widthId).val(oldV);
            $('#' + widthId).attr('value', oldV);
            $('#' + widthId).attr('defaultValue', oldV);
            $resizeWidthInput.val(oldV);
            document.getElementById(widthId).value = oldV + "";
        });

        // Now assemble all the parts
        if (which === 'sign') {
            $resizeWidthDiv.append($resizeWidthLabelOld, $resizeWidthInputOld);
            $resizeWidthDiv.append($resizeWidthMoins, $resizeWidthInput, $resizeWidthLabel, $resizeWidthPlus);
            $resizeHeightDiv.append($resizeHeightLabel, $resizeHeightInput);
            $resizeWrapper.append($resizeWidthDiv, $resizeHeightDiv);
            $resizeForm.append($resizeWrapper, '<hr>', $saveButton, $saveButtonOrange, $cancelButton);

        }
        if (which === 'transcript') {
            /*if(this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
		$resizeWidthDiv.append($horizontalLogo, $horizontalButton);
		$resizeHeightDiv.append($verticalLogo, $verticalButton);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeForm.append($resizeWrapper);
	  } else {*/
            $resizeWidthDiv.append($horizontalLogo, $horizontalButton);
            $resizeHeightDiv.append($verticalLogo, $verticalButton);
            $resizeWidthDiv.append($resizeWidthLabelOld, $resizeWidthInputOld);
            $resizeHeightDiv.append($resizeHeightLabel, $resizeHeightInput);
            $resizeWrapper.append($resizeWidthDiv, $resizeHeightDiv);
            $resizeForm.append($resizeWrapper, '<hr>', $saveButton, $cancelButton);
            //}
        }


        // must be appended to the BODY!
        // otherwise when aria-hidden="true" is applied to all background content
        // that will include an ancestor of the dialog,
        // which will render the dialog unreadable by screen readers
        $('body').append($resizeForm);
        var title;
        if (which === 'sign') {
            title = this.ablePlayer.tt.windowResizeHeading;
        } else {
            title = this.ablePlayer.tt.windowResizeHeadingTR;
        }
        resizeDialog = new AccessibleDialog($resizeForm, $windowButton, 'alert', title, $resizeWrapper, this.ablePlayer.tt.closeButtonLabel, '20em');
        if (which === 'transcript') {
            this.ablePlayer.transcriptResizeDialog = resizeDialog;
            $(this.ablePlayer.transcriptResizeDialog.modal[0].firstChild).css('display', 'none');
        } else if (which === 'sign') {
            this.ablePlayer.signResizeDialog = resizeDialog;
            $(this.ablePlayer.signResizeDialog.modal[0].firstChild).css('display', 'none');
        }
    };

    handleWindowButtonClick(which, e) {

        var thisObj = this, $windowPopup, $windowButton, $toolbar, popupTop;

        if (e.type === 'keydown') {
            // user pressed a key
            if (e.which === 32 || e.which === 13 || e.which === 27) {
                // this was Enter, space, or escape
                this.ablePlayer.windowMenuClickRegistered = true;
            } else {
                return false;
            }
        } else {
            // this was a mouse event
            this.ablePlayer.windowMenuClickRegistered = true;
        }
        if (which === 'transcript') {
            $windowPopup = this.ablePlayer.$transcriptPopup;
            $windowButton = this.ablePlayer.$transcriptPopupButton;
            $toolbar = this.ablePlayer.$transcriptToolbar;
        } else if (which === 'sign') {
            $windowPopup = this.ablePlayer.$signPopup;
            $windowButton = this.ablePlayer.$signPopupButton;
            $toolbar = this.ablePlayer.$signToolbar;
        }

        if ($windowPopup.is(':visible')) {
            $windowPopup.hide(200, '', () => {
                this.ablePlayer.windowMenuClickRegistered = false; // reset
            });
            $windowPopup.find('li').removeClass('able-focus');
            $windowButton.focus();
        } else {
            // first, be sure window is on top
            this.ablePlayer.control.updateZIndex(which);
            popupTop = $windowButton.position().top + $windowButton.outerHeight();
            $windowPopup.css('top', popupTop);
            $windowPopup.show(200, '', function () {
                $(this).find('input').first().focus().parent().addClass('able-focus, focus-visible');
                $(this).find('label').first().addClass('able-focus, focus-visible');
                $(this).find('label').first().focus();
                thisObj.ablePlayer.windowMenuClickRegistered = false; // reset
            });
        }
    };

    handleMenuChoice(which, choice, e) {

        var thisObj, $window, $windowPopup, $windowButton, resizeDialog;
        thisObj = this;
        if (which === 'transcript') {
            $window = this.ablePlayer.$transcriptArea;
            $windowPopup = this.ablePlayer.$transcriptPopup;
            $windowButton = this.ablePlayer.$transcriptPopupButton;
            resizeDialog = this.ablePlayer.transcriptResizeDialog;
        }
        else if (which === 'sign') {
            $window = this.ablePlayer.$signWindow;
            $windowPopup = this.ablePlayer.$signPopup;
            $windowButton = this.ablePlayer.$signPopupButton;
            resizeDialog = this.ablePlayer.signResizeDialog;
        }

        // hide the popup menu, and reset the Boolean
        $windowPopup.hide('fast', () => {
            this.ablePlayer.windowMenuClickRegistered = false; // reset
        });
        $windowButton.focus();

        if (choice === 'move') {
            if (!this.ablePlayer.control.showedAlert(which)) {
                this.ablePlayer.control.showAlert(this.ablePlayer.tt.windowMoveAlert, which);
                if (which === 'transcript') {
                    this.ablePlayer.showedTranscriptAlert = true;
                } else if (which === 'sign') {
                    this.ablePlayer.showedSignAlert = true;
                }
            }
            if (eventType === 'keydown') {
                this.ablePlayer.dragDevice = 'keyboard';
            } else {
                this.ablePlayer.dragDevice = 'mouse';
            }
            this.startDrag(which, $window);
            $windowPopup.hide().parent().focus();
        } else if (choice == 'resize') {
            // resize through the menu uses a form, not drag
            console.log('choice');
            console.log(this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu']);
            //resizeDialog.show();
            resizeDialog.show(200, '', function () {
                console.log('showhosoj');
                $('#horizontalButton').addClass('able-focus');
                //thisObj.windowMenuClickRegistered = false; // reset
            });
            $('#video1-resize-sign-width').addClass('able-focus');
            document.getElementById('video1-resize-sign-width').focus();
            $('#video1-resize-sign-width').get(0).focus();
            setTimeout(function () {
                $('#video1-resize-sign-width').focus();
            }, 420); // After 420 ms
            console.log('afetr show');
            if (this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                if (which === 'sign') {
                    //update value in resize
                    console.log(parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']));
                    resizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0].value = parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']);
                    resizeDialog.modal[0].getElementsByClassName("resizeWidthInputOld")[0].value = parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']);

                    $('#saveButtonOrange').css('display', 'block');
                    $('#saveButton').css('display', 'none');
                    $('.saveButton').css('display', 'none');
                    $('.cancelButton').css('display', 'block');


                    $('.resizeWidthLabelOld').css('display', 'none');
                    $('.resizeWidthInputOld').css('display', 'none');
                    $('#resizeWidthLabel').css('display', 'block');
                    $('.resizeWidthLabel').css('display', 'block');
                    $('.resizeWidthDiv').css('display', 'inline-flex');
                    $('.resizeWidthInput').css('display', 'block');
                    $('.resizeHeightLabel').css('display', 'none');
                    $('.resizeHeightInput').css('display', 'none');


                    $('#bPlus').css('display', 'block');
                    $('#bPlus').css('width', '17%');
                    $('#bMoins').css('display', 'block');
                    $('#bMoins').css('width', '17%');
                } else if (which === 'transcript') {
                    $('.resizeWidthLabelOld').css('display', 'none');
                    $('.resizeWidthInputOld').css('display', 'none');
                    $('#resizeWidthLabel').css('display', 'block');
                    $('.resizeWidthLabel').css('display', 'block');
                    $('.resizeWidthDiv').css('display', 'inline-flex');
                    $('.resizeWidthInput').css('display', 'block');
                    $('.resizeHeightLabel').css('display', 'none');
                    $('.resizeHeightInput').css('display', 'none');

                    $('#saveButtonOrange').css('display', 'none');
                    $('#saveButton').css('display', 'none');
                    $('.saveButton').css('display', 'none');
                    $('.cancelButton').css('display', 'none');

                    $('#horizontalButton').css('display', 'block');
                    $('#horizontalLogo').css('display', 'block');
                    $('#verticalLogo').css('display', 'block');
                    $('#verticalButton').css('display', 'block');
                }


            } else {
                if (which === 'sign') {
                    $('#saveButtonOrange').css('display', 'none');
                    $('#saveButton').css('display', 'block');

                    $('.resizeWidthLabelOld').css('display', 'block');
                    $('.resizeWidthInputOld').css('display', 'block');
                    $('.resizeWidthDiv').css('display', 'inline-flex');
                    $('#resizeWidthLabel').css('display', 'none');
                    $('.resizeWidthLabel').css('display', 'none');
                    $('.resizeWidthInput').css('display', 'none');


                    $('#bPlus').css('display', 'none');
                    $('#bMoins').css('display', 'none');


                    $('.resizeHeightLabel').css('display', 'block');
                    $('.resizeHeightInput').css('display', 'block');
                } else if (which === 'transcript') {
                    $('.resizeWidthLabelOld').css('display', 'block');
                    $('.resizeWidthInputOld').css('display', 'block');
                    $('#resizeWidthLabel').css('display', 'none');
                    $('.resizeWidthLabel').css('display', 'block');
                    $('.resizeWidthDiv').css('display', 'inline-flex');
                    $('.resizeWidthInput').css('display', 'block');
                    $('.resizeHeightLabel').css('display', 'block');
                    $('.resizeHeightInput').css('display', 'block');

                    $('#saveButtonOrange').css('display', 'block');
                    $('#saveButton').css('display', 'block');
                    $('.saveButton').css('display', 'block');
                    $('.cancelButton').css('display', 'block');

                    $('#horizontalButton').css('display', 'none');
                    $('#horizontalLogo').css('display', 'none');
                    $('#verticalLogo').css('display', 'none');
                    $('#verticalButton').css('display', 'none');
                }
            }
        }
    };

    startDrag (which, $element) {

        var thisObj, $windowPopup, zIndex, startPos, newX, newY;
        thisObj = this;

        this.ablePlayer.$activeWindow = $element;
        this.ablePlayer.dragging = true;

        if (which === 'transcript') {
            $windowPopup = this.ablePlayer.$transcriptPopup;
        } else if (which === 'sign') {
            $windowPopup = this.ablePlayer.$signPopup;
        }

        if (!this.ablePlayer.control.showedAlert(which)) {
            this.ablePlayer.control.showAlert(this.ablePlayer.tt.windowMoveAlert, which);
            if (which === 'transcript') {
                this.ablePlayer.showedTranscriptAlert = true;
            } else if (which === 'sign') {
                this.ablePlayer.showedSignAlert = true;
            }
        }

        // if window's popup menu is open, close it
        if ($windowPopup.is(':visible')) {
            $windowPopup.hide();
        }

        // be sure this window is on top
        this.ablePlayer.control.updateZIndex(which);

        // get starting position of element
        startPos = this.ablePlayer.$activeWindow.position();
        this.ablePlayer.dragStartX = startPos.left;
        this.ablePlayer.dragStartY = startPos.top;

        if (typeof this.ablePlayer.startMouseX === 'undefined') {
            this.ablePlayer.dragDevice = 'keyboard';
            this.ablePlayer.dragKeyX = this.ablePlayer.dragStartX;
            this.ablePlayer.dragKeyY = this.ablePlayer.dragStartY;
            // add stopgap to prevent the Enter that triggered startDrag() from also triggering dragEnd()
            this.ablePlayer.startingDrag = true;
        } else {
            this.ablePlayer.dragDevice = 'mouse';
            // get offset between mouse position and top left corner of draggable element
            this.ablePlayerdragOffsetX = this.ablePlayer.startMouseX - this.ablePlayer.dragStartX;
            this.ablePlayer.dragOffsetY = this.ablePlayer.startMouseY - this.ablePlayer.dragStartY;
        }

        // prepare element for dragging
        this.ablePlayer.$activeWindow.addClass('able-drag').ablePlayer.css({
            'position': 'absolute',
            'top': this.ablePlayer.dragStartY + 'px',
            'left': this.ablePlayer.dragStartX + 'px'
        }).focus();

        // add device-specific event listeners
        if (this.ablePlayer.dragDevice === 'mouse') {
            $(document).on('mousemove', (e) => {
                if (this.ablePlayer.dragging) {
                    // calculate new top left based on current mouse position - offset
                    newX = e.pageX - this.ablePlayer.dragOffsetX;
                    newY = e.pageY - this.ablePlayer.dragOffsetY;
                    this.resetDraggedObject(newX, newY);
                }
            });
        } else if (this.ablePlayer.dragDevice === 'keyboard') {
            this.ablePlayer.$activeWindow.on('keydown', (e) => {
                if (this.ablePlayer.dragging) {
                    this.dragKeys(which, e);
                }
            });
        }
        return false;
    };

    dragKeys(which, e) {
        var key, keySpeed;
        if (this.ablePlayer.startingDrag) {
            this.ablePlayer.startingDrag = false;
            return false;
        }
        key = e.which;
        keySpeed = 10;

        switch (key) {
            case 37:	// left
            case 63234:
                this.ablePlayer.dragKeyX -= keySpeed;
                break;
            case 38:	// up
            case 63232:
                this.ablePlayer.dragKeyY -= keySpeed;
                break;
            case 39:	// right
            case 63235:
                this.ablePlayer.dragKeyX += keySpeed;
                break;
            case 40:	// down
            case 63233:
                this.ablePlayer.dragKeyY += keySpeed;
                break;
            case 13: 	// enter
            case 27: 	// escape
                this.endDrag(which);
                return false;
            default:
                return false;
        }
        this.resetDraggedObject(this.ablePlayer.dragKeyX,this.ablePlayer.dragKeyY);
        if (e.preventDefault) {
            e.preventDefault();
        }
        return false;
    };

    resetDraggedObject( x, y) {
        this.ablePlayer.$activeWindow.css({
            'left': x + 'px',
            'top': y + 'px'
        });
    };

    resizeObject( which, width, height ) {

        var innerHeight;
        // which is either 'transcript' or 'sign'
        this.ablePlayer.$activeWindow.css({
            'width': width + 'px',
            'height': height + 'px'
        });
        if (which === 'transcript') {
            innerHeight = height - 50;
            this.ablePlayer.$transcriptDiv.css('height', innerHeight + 'px');
        }
    };

    endDrag(which) {
        var $windowButton;
        if (which === 'transcript') {
            $windowButton = this.ablePlayer.$transcriptPopupButton;
        }
        else if (which === 'sign') {
            $windowButton = this.ablePlayer.$signPopupButton;
        }

        $(document).off('mousemove mouseup touchmove touchup');
        this.ablePlayer.$activeWindow.off('keydown').removeClass('able-drag');

        if (this.ablePlayer.dragDevice === 'keyboard') {
            $windowButton.focus();
        }
        this.ablePlayer.dragging = false;
        this.preferences.updateCookie(which);
        this.ablePlayer.startMouseX = undefined;
        this.ablePlayer.startMouseY = undefined;
        this.ablePlayer.windowMenuClickRegistered = false;
        this.ablePlayer.finishingDrag = true;
        setTimeout(() => {
            this.ablePlayer.finishingDrag = false;
        }, 100);
    };

    startResize(which, $element) {

        var $windowPopup, zIndex, startPos, newWidth, newHeight;
        this.ablePlayer.$activeWindow = $element;
        this.ablePlayer.resizing = true;

        if (which === 'transcript') {
            $windowPopup = this.ablePlayer.$transcriptPopup;
            this.ablePlayer.$activeWindow = this.ablePlayer.$mediaContainer.find('video');
        }
        else if (which === 'sign') {
            $windowPopup = this.ablePlayer.$signPopup;
            this.ablePlayer.$activeWindow = this.ablePlayer.$mediaContainer.find('video');
        }

        // if window's popup menu is open, close it & place focus on button (???)
        if ($windowPopup.is(':visible')) {
            $windowPopup.hide().parent().focus();
        }

        // get starting width and height
        startPos = this.ablePlayer.$activeWindow.position();
        this.ablePlayer.dragKeyX = this.ablePlayer.dragStartX;
        this.ablePlayer.dragKeyY = this.ablePlayer.dragStartY;
        this.ablePlayer.dragStartWidth = this.ablePlayer.$activeWindow.width();
        this.ablePlayer.dragStartHeight = this.ablePlayer.$activeWindow.height();

        this.ablePlayer.mediaVideoWidth = this.ablePlayer.$mediaContainer.find('video').width();
        this.ablePlayer.mediaVideoHeight = this.ablePlayer.$mediaContainer.find('video').height();
        // add event listeners
        $(document).on('mousemove',  (e) => {
            if (this.ablePlayer.resizing) {
                console.log('mousemove dragdrop');
                // calculate new width and height based on changes to mouse position
                newWidth = this.ablePlayer.dragStartWidth + (e.pageX - this.ablePlayer.startMouseX);
                newHeight = this.ablePlayer.dragStartHeight + (e.pageY - this.ablePlayer.startMouseY);
                var newMediaWidth = this.ablePlayer.mediaVideoWidth + newWidth;
                var oldWidth = this.ablePlayer.$signWindow.css('width').split('px')[0];
                var oldWidthPD = this.ablePlayer.$playerDiv.css('width').split('px')[0];
                //prevent not to be outside the div
                if (Math.round((100 - ((100 - (newWidth * 100 / oldWidthPD))))) > 95) {
                    newWidth = this.ablePlayer.$activeWindow.css('width').split('px')[0];
                }

                if (Math.round((100 - ((100 - (this.ablePlayer.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD))))) <= 95) {
                    this.resizeObject(which, newWidth, this.ablePlayer.$activeWindow.css('height'), newMediaWidth, this.ablePlayer.mediaVideoHeight);
                    // thisObj.$signWindow.css('width',(100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))+'%')
                    // thisObj.$signWindow.css('left',((thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))+'%')
                    // thisObj.$signWindow.css('height',thisObj.$activeWindow.css('height'));

                    //NEW TEST to act the same way as the button
                    this.ablePlayer.$signWindow.css({
                        'width': (100 - (this.ablePlayer.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD)) + '%',
                        'left': (100 - ((100 - (this.ablePlayer.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD)))) + '%',
                    });
                    //impossible if context 5
                    if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] != 1 || this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] != 1) {
                        console.log('not context 5');
                        //thisObj.$transcriptArea.css('width', ((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD))) + '%');
                        //thisObj.$transcriptArea.css('left', (((100-(thisObj.$activeWindow.css('width').split('px')[0]*100/oldWidthPD)))) + '%');
                        //$('.able-transcript-area').css('top',thisObj.$activeWindow.css('height'));
                        thisObj.$transcriptArea.css({
                            'width': (100 - (thisObj.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD)) + '%',
                            'left': (100 - ((100 - (thisObj.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD)))) + '%',
                        });
                    }
                    $('#' + this.ablePlayer.mediaId + '_' + 'prefVidSize').val((this.ablePlayer.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD));
                    thisObj.prefVidSize = (100 - (thisObj.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD));
                    for (var q = 0; q < $('.inputWidth').length; q++) {
                        if ($('.inputWidth')[q].value == this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) {
                            $('.inputWidth')[q].value = (this.ablePlayer.prefVidSize);
                        }
                    }
                    this.ablePlayer.prefTrSize = this.ablePlayer.prefVidSize;
                    this.ablePlayer.preference.updateCookie('prefVidSize');
                    this.ablePlayer.preference.updateCookie(which);
                    this.ablePlayer.preference.updateCookie('prefTrSize');
                    this.ablePlayer.preference.updateCookie(which);
                    this.ablePlayer.$ableDiv.css('width', (100 - ((100 - (this.ablePlayer.$activeWindow.css('width').split('px')[0] * 100 / oldWidthPD)))) + '%');

                    for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                        var vidId = document.getElementsByClassName("video-accessible")[q].id;
                        //document.getElementById(vidId+"-sign").style.maxHeight = (newHeight*aspectRatio)+"px";
                        //$('#'+vidId+'-sign').css('max-height',(newWidth/aspectRatio)+'px');
                        //console.log(thisObj.$mediaContainer.css('height').split('px')[0]+2+"px");
                        $('#' + vidId + '-sign').css('height', this.ablePlayer.$mediaContainer.css('height').split('px')[0] + 10 + "px");
                    }
                    this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('height'));
                    this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.css('height'));
                }


            }
        });
        $(document).on('mouseup', (e) => {
            console.log('mouseup on document');
            e.stopPropagation();
            if (this.ablePlayer.resizing) {
                this.endResize(which);
            }
        });
        return false;
    };

    endResize(which) {
        var $windowButton;
        if (which === 'transcript') {
            $windowButton = this.ablePlayer.$transcriptPopupButton;
        }
        else if (which === 'sign') {
            $windowButton = this.ablePlayer.$signPopupButton;
        }
        $(document).off('mousemove mouseup touchmove touchup');
        this.ablePlayer.$activeWindow.off('keydown');
        $windowButton.show().focus();
        this.ablePlayer.resizing = false;
        this.ablePlayer.$activeWindow.removeClass('able-resize');
        this.preferences.updateCookie(which);
        this.ablePlayer.windowMenuClickRegistered = false;
        this.ablePlayer.finishingDrag = true;
        setTimeout(() => {
            this.ablePlayer.finishingDrag = false;
        }, 100);
    };





}