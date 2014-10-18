(function () {
  var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

  // Based on the incredible accessible modal dialog.
  window.AccessibleDialog = function(modalDiv, title, description, width, fullscreen, escapeHook) {
    this.title = title;
    this.description = description;
    this.escapeHook = escapeHook;
    this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
  
    var thisObj = this;
    var modal = modalDiv;
    this.modal = modal;
    modal.css({
      width: width || '50%',
      'margin-left': 'auto',
      'margin-right': 'auto',
      'z-index': 6000,
      position: 'fixed',
      left: 0,
      right: 0,
      top: (fullscreen ? '0' : '25%'),
      display: 'none'
    });
    modal.addClass('modalDialog');

    if (!fullscreen) {
      var closeButton = $('<button>',{
         'class': 'modalCloseButton',
         'title': 'Close dialog'
      }).text('X');
      closeButton.keydown(function (event) {
        // Space key down
        if (event.which === 32) {
          thisObj.hide();
        }
      }).click(function () {
        thisObj.hide();
      });
      
      var titleH1 = $('<h1></h1>');
      titleH1.attr('id', 'modalTitle-' + this.baseId);
      titleH1.css('text-align', 'center');
      titleH1.text(title);
      
      modal.attr('aria-labelledby', 'modalTitle-' + this.baseId);
      
      modal.prepend(titleH1);
      modal.prepend(closeButton);
    }


    var descriptionDiv = $('<div></div>');
    descriptionDiv.attr('id', 'modalDescription-' + this.baseId);
    descriptionDiv.text(description);
    // Move off-screen.
    descriptionDiv.css({
      position: 'absolute',
      left: '-999px',
      width: '1px',
      height: '1px',
      top: 'auto'
    });


    modal.prepend(descriptionDiv);
    
    modal.attr('aria-hidden', 'true');
    modal.attr('aria-describedby', 'modalDescription-' + this.baseId);
    modal.attr('role', 'dialog');
    
    modal.keydown(function (event) {
      // Escape
      if (event.which === 27) {
        if (thisObj.escapeHook) {
          thisObj.escapeHook(event, this);
        }
        else {
          thisObj.hide();
          event.preventDefault();
        }
      }
      // Tab
      else if (event.which === 9) {
        // Manually loop tab navigation inside the modal.
        var parts = modal.find('*');
        var focusable = parts.filter(focusableElementsSelector).filter(':visible');
        
        if (focusable.length === 0) {
          return;
        }
        
        var focused = $(':focus');
        var currentIndex = focusable.index(focused);
        if (event.shiftKey) {
          // If backwards from first element, go to last.
          if (currentIndex === 0) {
            focusable.get(focusable.length - 1).focus();
            event.preventDefault();
          }
        }
        else {
          if (currentIndex === focusable.length - 1) {
            focusable.get(0).focus();
            event.preventDefault();
          }
        }
      }
      event.stopPropagation();
    });
    
    $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'false');
  };
  
  AccessibleDialog.prototype.show = function () {
    if (!this.overlay) {
      // Generate overlay.
      var overlay = $('<div class="modalOverlay"></div>');
      overlay.attr('tabindex', '-1');
      this.overlay = overlay;
      overlay.css({
        width: '100%',
        height: '100%',
        'z-index': 5000,
        'background-color': '#000',
        opacity: 0.5,
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'none',
        margin: 0,
        padding: 0
      });
      $('body').append(overlay);
      
      // Keep from moving focus out of dialog when clicking outside of it.
      overlay.on('mousedown.accessibleModal', function (event) {
        event.preventDefault();
      });
    }
    
    $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'true');
    
    this.overlay.css('display', 'block');
    this.modal.css('display', 'block');
    this.modal.attr('aria-hidden', 'false');
    
    this.focusedElementBeforeModal = $(':focus');
    var focusable = this.modal.find("*").filter(focusableElementsSelector).filter(':visible');
    if (focusable.length === 0) {
      this.focusedElementBeforeModal.blur();
    }
    var thisObj = this;
    setTimeout(function () {
      thisObj.modal.find('input').first().focus();
    }, 300);
  };

  AccessibleDialog.prototype.hide = function () {
    if (this.overlay) {
      this.overlay.css('display', 'none');
    }
    this.modal.css('display', 'none');
    this.modal.attr('aria-hidden', 'true');
    $('body > *').not('modalOverlay').not('modalDialog').attr('aria-hidden', 'false');
    
    this.focusedElementBeforeModal.focus();
  };
})();
