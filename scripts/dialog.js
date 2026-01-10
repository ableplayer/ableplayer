(function ($) {
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	// Based on the incredible accessible modal dialog.
	window.AccessibleDialog = function( modalDiv, $returnElement, title, closeButtonLabel) {

		this.title = title;
		this.closeButtonLabel = closeButtonLabel;
		this.focusedElementBeforeModal = $returnElement;
		this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
		var thisObj = this;
		var modal = modalDiv;
		this.modal = modal;

		modal.addClass('able-modal-dialog');

		var closeButton = $('<button>',{
				'class': 'modalCloseButton',
				'title': thisObj.closeButtonLabel,
				'aria-label': thisObj.closeButtonLabel
		}).text('×');
		closeButton.on( 'keydown', function (e) {
			if (e.key === ' ') {
				thisObj.hide();
			}
		}).on( 'click', function () {
			thisObj.hide();
		});

		var titleH1 = $('<h1></h1>');
		titleH1.attr('id', 'modalTitle-' + this.baseId);
		titleH1.text(title);
		this.titleH1 = titleH1;

		modal.attr({
			'aria-labelledby': 'modalTitle-' + this.baseId,
		});
		var modalHeader = $( '<div>', {
			'class': 'able-modal-header'
		});
		modalHeader.prepend(titleH1);
		modalHeader.prepend(closeButton);
		modal.prepend(modalHeader);

		modal.attr({
			'aria-hidden': 'true',
			'role': 'dialog',
			'aria-modal': 'true'
		});

		modal.on( 'keydown', function (e) {
			if (e.key === 'Escape') {
				thisObj.hide();
				e.preventDefault();
			} else if (e.key === 'Tab') {
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
						focusable.get(focusable.length - 1).trigger('focus');
						e.preventDefault();
					}
				} else {
					if (currentIndex === focusable.length - 1) {
						focusable.get(0).trigger('focus');
						e.preventDefault();
					}
				}
			}
			e.stopPropagation();
		});

		if ( $( 'body' ).hasClass( 'able-modal-active' ) ) {
			$( 'body > *') .not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
			$( 'body' ).removeClass( 'able-modal-active' );
		}
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
				thisObj.hide();
			});
		}

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('inert', true);
		$( 'body' ).addClass( 'able-modal-active' );

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
			thisObj.modal.find('button.modalCloseButton').first().trigger('focus');
		}, 300);
	};

	AccessibleDialog.prototype.hide = function () {
		if (this.overlay) {
			this.overlay.css('display', 'none');
		}
		this.modal.css('display', 'none');
		this.modal.attr('aria-hidden', 'true');
		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
		$( 'body' ).removeClass( 'able-modal-active' );

		this.focusedElementBeforeModal.trigger('focus');
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
