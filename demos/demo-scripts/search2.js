/**
 * @file
 * @description This script handles the search functionality for the AblePlayer demo.
 * It sanitizes user input, strips punctuation, and conducts a search using the AblePlayer instance.
 * The search results are then displayed to the user.
 */

document.addEventListener("DOMContentLoaded", () => {
  const player = new AblePlayer(document.querySelector("#video1"));

  /**
   * Retrieves the user's search input.
   * @returns {string} The raw search input.
   */
  function getSearchInput() {
    return document.querySelector("#terms").value;
  }

  /**
   * Sanitizes the user input.
   * @param {string} input - The raw user input.
   * @returns {string} The sanitized input.
   */
  function sanitizeInput(input) {
    return DOMPurify.sanitize(input);
  }

  /**
   * Strips punctuation from the sanitized input.
   * @param {string} input - The sanitized input.
   * @returns {string} The input without punctuation.
   */
  function stripPunctuation(input) {
    const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    return input
      .split("")
      .filter((letter) => punctuation.indexOf(letter) === -1)
      .join("");
  }

  /**
   * Retrieves the ignore capitalization setting.
   * @returns {boolean} Whether to ignore capitalization in the search.
   */
  function getIgnoreCaps() {
    return document.querySelector("#ignorecaps").checked;
  }

  /**
   * Retrieves the user's selected language for the search.
   * @returns {string} The selected language.
   */
  function getSearchLang() {
    return document.querySelector("#lang").value;
  }

  /**
   * Makes the search results visible.
   */
  function displaySearchResults() {
    document.querySelector("#results-wrapper").style.display = "block";
  }

  /**
   * Handles the search functionality.
   * Retrieves user input, sanitizes it, strips punctuation, and performs a search.
   * @memberof AblePlayer
   */
  function handleSearch() {
    const rawSearch = getSearchInput();
    const cleanSearch = sanitizeInput(rawSearch);
    const finalSearch = stripPunctuation(cleanSearch);

    player.searchString = finalSearch;
    player.searchIgnoreCaps = getIgnoreCaps();
    player.searchLang = getSearchLang();

    player.showSearchResults();
    displaySearchResults();
  }

  /**
   * Handles the click event on the 'Go' button.
   * Retrieves user input, sanitizes it, and performs a search.
   * @memberof AblePlayer
   */
  document.querySelector("#go").addEventListener("click", handleSearch);
});
