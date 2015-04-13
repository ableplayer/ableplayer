(function ($) {
  
  AblePlayer.prototype.initDragDrop = function ( $element ) {

    // Accessible Drag & Drop based on these resources: 
    // Accessible Drag and Drop Using WAI-ARIA 
    // http://dev.opera.com/articles/accessible-drag-and-drop/
    // Accessible Drag and Drop script on quirksmode 
    // http://www.quirksmode.org/js/this.html
    var thisObj = this;

    this.$activeWindow = $element;
    
    // able-sign-window is currently the only draggable window, 
    // but this functionality could ultimately be extended to other windows    
    if ($element.is('.able-sign-window')) { 
      this.windowName = 'sign-window';
    }    
    this.addWindowMenu();    
  };
  
  AblePlayer.prototype.addWindowMenu = function() { 

    var thisObj = this; 
    
    // add alert div to window 
    this.$windowAlert = $('<div role="alert"></div>');
    this.$windowAlert.addClass('able-alert');
    this.$windowAlert.appendTo(this.$activeWindow);
    this.$windowAlert.css({
      top: this.$activeWindow.offset().top
    });
    
    // add button to draggable window which triggers a popup menu 
    // for now, re-use preferences icon for this purpose
    var $newButton = $('<button>',{ 
      'type': 'button',
      'tabindex': '0',
      'aria-label': this.tt.windowButtonLabel,
      'class': 'able-button-handler-preferences' 
    });        
    if (this.iconType === 'font') {
      var $buttonIcon = $('<span>',{ 
        'class': 'icon-preferences',
        'aria-hidden': 'true'
      });               
      $newButton.append($buttonIcon);
    }
    else { 
      // use image
      var buttonImgSrc = '../images/' + this.iconColor + '/preferences.png';
      var $buttonImg = $('<img>',{ 
        'src': buttonImgSrc,
        'alt': '',
        'role': 'presentation'
      });
      $newButton.append($buttonImg);
    }
    
    // add the visibly-hidden label for screen readers that don't support aria-label on the button
    var $buttonLabel = $('<span>',{
      'class': 'able-clipped'
    }).text(this.tt.windowButtonLabel);
    $newButton.append($buttonLabel);

    // add an event listener that displays a tooltip on mouseenter or focus 
    var tooltipId = this.mediaId + '-' + this.windowName + '-tooltip';
    var $tooltip = $('<div>',{ 
      'class' : 'able-tooltip',
      'id' : tooltipId
    });      
    $newButton.on('mouseenter focus',function(event) {       
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
      var tooltip = $('#' + tooltipId).text(label).css(tooltipStyle); 
      thisObj.showTooltip(tooltip);
      $(this).on('mouseleave blur',function() { 
        $('#' + tooltipId).text('').hide();
      });
    });

    this.addResizeDialog();
    
    // add a popup menu 
    var $popup = this.createPopup(this.windowName);
    var $optionList = $('<ul></ul>');
    var radioName = this.mediaId + '-' + this.windowName + '-choice';
    if (this.windowName == 'sign-window') { 
      var options = []; 
      options.push({
        'name': 'move',
        'label': this.tt.windowMove
      });
      options.push({
        'name': 'resize',
        'label': this.tt.windowResize
      });
      if (this.$activeWindow.css('z-index') > 0) { 
        options.push({
          'name': 'sendBack',
          'label': this.tt.windowSendBack
        });
      }
      else { 
        options.push({
          'name': 'bringTop',
          'label': this.tt.windowBringTop
        });        
      }
      for (var i in options) {
        var $optionItem = $('<li></li>');
        var option = options[i];    
        var radioId = radioName + '-' + i;
        var $radioButton = $('<input>',{ 
          'type': 'radio',
          'val': option.name,
          'name': radioName,
          'id': radioId
        });
        var $radioLabel = $('<label>',{ 
          'for': radioId
        });
        $radioLabel.text(option.label);          
        $radioButton.on('click keypress',function(e) {
          e.preventDefault();
          thisObj.handleMenuChoice($(this).val());
        });
        $optionItem.append($radioButton,$radioLabel);
        $optionList.append($optionItem);
      }      
    } 
    $popup.append($optionList);
    $newButton.on('click keydown',function(e) {   
      thisObj.handleWindowButtonClick(e);          
    });
    this.$activeWindow.append($newButton,$tooltip,$popup);    
    this.$windowButton = $newButton;
    this.$windowPopup = $popup;    
  };
  
  AblePlayer.prototype.addResizeDialog = function () { 
    
    var thisObj = this; 
    var widthId = this.mediaId + '-resize-width';
    var heightId = this.mediaId + '-resize-height'; 
    var startingWidth = this.$activeWindow.width();
    var startingHeight = this.$activeWindow.height();
    
    var $resizeForm = $('<div></div>',{
      'class' : 'able-resize-form'
    }); 
    
    // inner container for all content, will be assigned to modal div's aria-describedby 
    var $resizeWrapper = $('<div></div>');

    // width field
    var $resizeWidthDiv = $('<div></div>');    
    var $resizeWidthInput = $('<input>',{ 
      'type': 'text',
      'id': widthId,
      'value': startingWidth      
    });
    var $resizeWidthLabel = $('<label>',{ 
      'for': widthId
    }).text(this.tt.width);

    /* // Don't prompt for height 
      
    // height field
    var $resizeHeightDiv = $('<div></div>');    
    var $resizeHeightInput = $('<input>',{ 
      'type': 'text',
      'id': heightId,
      'value': this.$activeWindow.height()      
    });
    var $resizeHeightLabel = $('<label>',{ 
      'for': heightId
    }).text(this.tt.height);
    */
    
    // Add save and cancel buttons.
    var $saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
    var $cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
    $saveButton.click(function () {
      var newWidth = $('#' + widthId).val(); 
      if (newWidth !== startingWidth) { 
        // var newHeight = Math.round(newWidth * (startingHeight/startingWidth),0);
        thisObj.$activeWindow.css('width',newWidth);
        thisObj.$activeWindow.find('video').css({
          'width' : newWidth + 'px'
          //'height' : newHeight + 'px'
        });
      }
      thisObj.resizeDialog.hide();
      thisObj.$windowPopup.hide();
      thisObj.$windowButton.show().focus();
    });
    $cancelButton.click(function () {
      dialog.hide();
    });

    // Now assemble all the parts   
    $resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
    // $resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
    $resizeWrapper.append($resizeWidthDiv);
    $resizeForm.append($resizeWrapper,'<hr>',$saveButton,$cancelButton);
    
    // must be appended to the BODY! 
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog, 
    // which will render the dialog unreadable by screen readers 
    $('body').append($resizeForm);
    this.resizeDialog = new AccessibleDialog($resizeForm, 'alert', this.tt.windowResizeHeading, $resizeWrapper, this.tt.closeButtonLabel, '20em');
  };
  
  AblePlayer.prototype.handleWindowButtonClick = function (e) { 

    if (e.which > 1) { 
      // user pressed a key 
      if (!(e.which === 32 || e.which === 13)) { 
        // this was not Enter or space. Ignore it 
        return false;
      }  
    } 
       
    if (this.hidingPopup) { 
      // stopgap to prevent keydown from reopening popup
      // immediately after closing it 
      this.hidingPopup = false;      
      return false; 
    }
    
    this.$windowButton.hide();
    this.$windowPopup.show();
    // Focus on the checked button, if any buttons are checked 
    // Otherwise, focus on the first button 
    this.$windowPopup.find('li').removeClass('able-focus');
    if (this.$windowPopup.find('input:checked').val()) { 
      this.$windowPopup.find('input:checked').focus().parent().addClass('able-focus');
    }
    else { 
      this.$windowPopup.find('input').first().focus().parent().addClass('able-focus');
    }
    e.preventDefault();
  };
  
  AblePlayer.prototype.handleMenuChoice = function ( choice ) { 

    var thisObj = this;
    if (choice == 'move') { 
      this.showAlert(this.tt.windowMoveAlert,'sign');
      thisObj.startDrag(); 
      this.$windowPopup.hide().parent().focus(); 
    }
    else if (choice == 'resize') { 
      this.resizeDialog.show();
      this.showAlert(this.tt.windowResizeAlert,'sign');
    }
    else if (choice == 'sendBack') { 
      this.$activeWindow.css('z-index','0');
      // this has the side-effect of making the popup unclickable       
      this.$windowPopup.css('z-index','4000').hide(); 
      this.$windowButton.show().focus();
      this.showAlert(this.tt.windowSendBackAlert,'sign');
      // change content of radio button       
      var $thisRadio = this.$windowPopup.find('input:last'); 
      $thisRadio.val('bringTop'); 
      $thisRadio.next('label').text(this.tt.windowBringTop);
    }
    else if (choice == 'bringTop') { 
      this.$activeWindow.css({
        'z-index':'4000'
      });
      this.$windowPopup.hide(); 
      this.$windowButton.show().focus();
      this.showAlert(this.tt.windowBringTopAlert,'sign');                  
      // change content of radio button       
      var $thisRadio = this.$windowPopup.find('input:last'); 
      $thisRadio.val('sendBack'); 
      $thisRadio.next('label').text(this.tt.windowSendBack);      
    }    
  };
  
  AblePlayer.prototype.startDrag = function() { 

    var thisObj, startPos, newX, newY;
    thisObj = this;
    
    // prepare element for dragging
    this.$activeWindow.addClass('able-drag').css({
      'position': 'absolute',
      'top': this.dragStartY + 'px',
      'left': this.dragStartX + 'px'
    });

    // get starting position of element
    startPos = this.$activeWindow.offset();
    this.dragStartX = this.dXKeys = startPos.left;
    this.dragStartY = this.dYKeys = startPos.top;     
    
    // add listeners 
    $(document).on('mousedown',function(e) { 
      thisObj.dragging = true; 
      
    // get starting position of mouse 
      thisObj.startMouseX = e.pageX;
      thisObj.startMouseY = e.pageY;    
      // get offset between mouse position and top left corner of draggable element
      thisObj.dragOffsetX = thisObj.startMouseX - thisObj.dragStartX;
      thisObj.dragOffsetY = thisObj.startMouseY - thisObj.dragStartY;
    });

    $(document).on('mousemove',function(e) { 
      if (thisObj.dragging) { 
        // calculate new top left based on current mouse position - offset 
        newX = e.pageX - thisObj.dragOffsetX;
        newY = e.pageY - thisObj.dragOffsetY;
        thisObj.resetDraggedObject( newX, newY );
      }
    });
    
    $(document).on('mouseup',function() { 
      if (thisObj.dragging) {
        // finalize the drop
        thisObj.dragEnd();
      }
    });

    this.startingDrag = true;    
    this.$activeWindow.on('keydown',function(e) { 
      thisObj.dragKeys(e);
    });    
    
    return false;
  };

  AblePlayer.prototype.dragKeys = function(e) {

    var key, keySpeed;    
    // stopgap to prevent firing on initial Enter or space 
    // that selected "Move" from menu 
    if (this.startingDrag) { 
      this.startingDrag = false; 
      return false;
    }
    key = e.which; 
    keySpeed = 10; // pixels per keypress event

    switch (key) {
		  case 37:	// left
      case 63234:
			  this.dXKeys -= keySpeed;
        break;
      case 38:	// up
      case 63232:
				this.dYKeys -= keySpeed;
        break;
      case 39:	// right
      case 63235:
				this.dXKeys += keySpeed;
        break;
      case 40:	// down
      case 63233:
				this.dYKeys += keySpeed;
        break;
      case 13: 	// enter
      case 27: 	// escape
				this.dragEnd();
        return false;
      default:      
				return false;
		}		
    this.resetDraggedObject(this.dXKeys,this.dYKeys);
    if (e.preventDefault) {
  		e.preventDefault();
    }
    return false;
  };
  AblePlayer.prototype.resetDraggedObject = function ( x, y) {
    this.$activeWindow.css({ 
      'left': x + 'px',
      'top': y + 'px'
    });
  },
  AblePlayer.prototype.dragEnd = function() {
    $(document).off('mousemove mouseup');
    this.$activeWindow.off('keydown').removeClass('able-drag'); 
    // stopgap to prevent spacebar in Firefox from reopening popup
    // immediately after closing it (used in handleWindowButtonClick())
    this.hidingPopup = true; 
    this.$windowPopup.hide();
    // Ensure stopgap gets cancelled if handleWindowButtonClick() isn't called 
    // e.g., if user triggered button with Enter or mouse click, not spacebar 
    setTimeout(function() { 
      this.hidingPopup = false;
    }, 100);
    this.$windowButton.show().focus();
    this.dragging = false;
  };
  
})(jQuery);
