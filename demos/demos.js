(function () {
	// Load target file layout block into position
	fetch('navigation.html')
		.then(response => response.text())
		.then(data => {
			document.getElementById('navigation-placeholder').innerHTML = data;
		})
		.catch(error => console.error('Error loading the HTML include component:', error));
})();
