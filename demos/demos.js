(function () {
	let curPage = window.location.pathname;
	curPage = curPage.substring( curPage.lastIndexOf('/') + 1 );
	let navPlaceholder = document.getElementById('navigation-placeholder')
	// Load target file layout block into position
	fetch('navigation.html')
		.then(response => response.text())
		.then(data => {
			navPlaceholder.innerHTML = data;
		})
		.then(() => {
			let activeDetails = navPlaceholder.querySelector('details:has(a[href="' + curPage + '"])');
			let activeLink = navPlaceholder.querySelector('a[href="' + curPage + '"]');
			if (activeLink) {
				activeLink.setAttribute('aria-current', 'page');
			}
			if (activeDetails) {
				activeDetails.open = true;
			}
			let links = navPlaceholder.querySelectorAll('a');
			links.forEach( link => {
				link.addEventListener( 'keyup', ( event ) => {
					if ( event.key == 'Escape' ) {
						let parentDetails = link.closest('details');
						parentDetails.open = false;
						parentDetails.querySelector('summary').focus();
					}
				});
			});
		})
		.catch(error => console.error('Error loading the HTML include component:', error));
})();
