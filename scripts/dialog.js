(function ($) {
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	// Based on the incredible accessible modal dialog.
	window.AccessibleDialog = function(modalDiv, $returnElement, dialogRole, isModal, title, $descDiv, closeButtonLabel, width, fullscreen, escapeHook) {

		this.title = title;
		this.closeButtonLabel = closeButtonLabel;
		this.focusedElementBeforeModal = $returnElement;
		this.escapeHook = escapeHook;
		this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
		var thisObj = this;
		var modal = modalDiv;
		this.modal = modal;
		modal.css({
			'width': width || '50%'
		});
		modal.addClass('able-modal-dialog');

		if (!fullscreen) {
			var closeButton = $('<button>',{
				 'class': 'modalCloseButton',
				 'title': thisObj.closeButtonLabel,
				 'aria-label': thisObj.closeButtonLabel
			}).text('X');
			closeButton.keydown(function (e) {
				// Space key down
				if (e.which === 32) {
					thisObj.hide();
				}
			}).click(function () {
				thisObj.hide();
			});

			var titleH1 = $('<h1></h1>');
			titleH1.attr('id', 'modalTitle-' + this.baseId);
			titleH1.css('text-align', 'center');
			titleH1.text(title);
			this.titleH1 = titleH1; 

			modal.attr({
				'aria-labelledby': 'modalTitle-' + this.baseId,
			});
			modal.prepend(titleH1);
			modal.prepend(closeButton);
		}

		modal.attr({
			'aria-hidden': 'true',
			'role': dialogRole,
		});
		if (isModal) { 
			modal.attr('aria-modal','true');
		}

		modal.keydown(function (e) {
			// Escape
			if (e.which === 27) {
				if (thisObj.escapeHook) {
					thisObj.escapeHook(e, this);
				}
				else {
					thisObj.hide();
					e.preventDefault();
				}
			}
			// Tab
			else if (e.which === 9) {
				// Manually loop tab navigation inside the modal.
				var parts = modal.find('*');
				var focusable = parts.filter(focusableElementsSelector).filter(':visible');

				if (focusable.length === 0) {
					return;
				}

				var focused = $(':focus');
				var currentIndex = focusable.index(focused);
				if (e.shiftKey) {
					// If backwards from first element, go to last.
					if (currentIndex === 0) {
						focusable.get(focusable.length - 1).focus();
						e.preventDefault();
					}
				}
				else {
					if (currentIndex === focusable.length - 1) {
						focusable.get(0).focus();
						e.preventDefault();
					}
				}
			}
			e.stopPropagation();
		});

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('aria-hidden');
	};

	AccessibleDialog.prototype.show = function () {
		if (!this.overlay) {
			// Generate overlay.
			var overlay = $('<div></div>').attr({
				 'class': 'able-modal-overlay',
				 'tabindex': '-1'
			});
			this.overlay = overlay;
			$('body').append(overlay);

			// Keep from moving focus out of dialog when clicking outside of it.
			overlay.on('mousedown.accessibleModal', function (e) {
				e.preventDefault();
			});
		}

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('aria-hidden', 'true');

		this.overlay.css('display', 'block');
		this.modal.css('display', 'block');
		this.modal.attr({
			'aria-hidden': 'false',
			'tabindex': '-1'
		});

		var focusable = this.modal.find("*").filter(focusableElementsSelector).filter(':visible');
		if (focusable.length === 0) {
			this.focusedElementBeforeModal.blur();
		}
		var thisObj = this;
		setTimeout(function () {
			// set focus on the first focusable element
			thisObj.modal.find('button.modalCloseButton').first().focus();
		}, 300);
	};

	AccessibleDialog.prototype.hide = function () {
		if (this.overlay) {
			this.overlay.css('display', 'none');
		}
		this.modal.css('display', 'none');
		this.modal.attr('aria-hidden', 'true');
		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('aria-hidden');

		this.focusedElementBeforeModal.focus();
	};

	AccessibleDialog.prototype.getInputs = function () {

		// return an array of input elements within this dialog
		if (this.modal) {
			var inputs = this.modal.find('input');
			return inputs;
		}
		return false;
	};

})(jQuery);
