(function ($) {
  // See section 4.1 of dev.w3.org/html5/webvtt for format details.
  AblePlayer.prototype.parseWebVTT = function(srcFile,text) {

    // Normalize line ends to \n.
    text = text.replace(/(\r\n|\n|\r)/g,'\n');

    var parserState = {
      src: srcFile,
      text: text,
      error: null,
      metadata: {},
      cues: [],
      line: 1,
      column: 1
    };

    try {
      act(parserState, parseFileBody);
    }
    catch (err) {
      var errString = 'Invalid WebVTT file: ' + parserState.src + '\n';
      errString += 'Line: ' + parserState.line + ', ';
      errString += 'Column: ' + parserState.column + '\n';
      errString += err;
      if (console.warn) {
        console.warn(errString);
      }
      else if (console.log) {
        console.log(errString);
      }
    }
    return parserState;
  }

  function actList(state, list) {
    var results = [];
    for (var ii = 0; ii < list.length; ii++) {
      results.push(act(state, list[ii]));
    }
    return results;
  }

  // Applies the action and checks for errors.
  function act(state, action) {
    var val = action(state);
    if (state.error !== null) {
      throw state.error;
    }
    return val;
  }

  function updatePosition(state, cutText) {
    for (var ii = 0; ii < cutText.length; ii++) {
      if (cutText[ii] === '\n') {
        state.column = 1;
        state.line += 1;
      }
      else {
        state.column += 1;
      }
    }
  }

  function cut(state, length) {
    var returnText = state.text.substring(0, length);
    updatePosition(state, returnText);
    state.text = state.text.substring(length);
    return returnText;
  }

  function cutLine(state, length) {
    var nextEOL = state.text.indexOf('\n');
    var returnText;
    if (nextEOL === -1) {
      returnText = state.text;
      updatePosition(state, returnText);
      state.text = '';
    }
    else {
      returnText = state.text.substring(0, nextEOL);
      updatePosition(state, returnText + '\n');
      state.text = state.text.substring(nextEOL + 1);
    }
    return returnText;
  }

  function peekLine(state) {
    var nextEOL = state.text.indexOf('\n');
    if (nextEOL === -1) {
      return state.text;
    }
    else {
      return state.text.substring(0, nextEOL);
    }
  }

  function parseFileBody(state) {
    actList(state, [
      eatOptionalBOM,
      eatSignature]);
    var c = state.text[0];
    if (c === ' ' || c === '\t' || c === '\n') {
      actList(state, [
        eatUntilEOLInclusive,
        parseMetadataHeaders,
        eatAtLeast1EmptyLines,
        parseCuesAndComments]);
    }
    else {
      state.error = "WEBVTT signature not followed by whitespace.";
    }
  }

  // Parses all metadata headers until a cue is discovered.
  function parseMetadataHeaders(state) {
    while (true) {
      var nextLine = peekLine(state);
      if (nextLine.indexOf('-->') !== -1) {
        return;
      }
      else if (nextLine.length === 0) {
        return;
      }
      else {
        var keyValue = act(state, getMetadataKeyValue);
        state.metadata[keyValue[0]] = keyValue[1];
        act(state, eatUntilEOLInclusive);
      }
    }
  }

  function nextSpaceOrNewline(s) {
    var possible = [];
    var spaceIndex = s.indexOf(' ');
    if (spaceIndex >= 0) {
      possible.push(spaceIndex);
    }
    var tabIndex = s.indexOf('\t');
    if (tabIndex >= 0) {
      possible.push(tabIndex);
    }
    var lineIndex = s.indexOf('\n');
    if (lineIndex >= 0) {
      possible.push(lineIndex);
    }

    return Math.min.apply(null, possible);
  }

  function getMetadataKeyValue(state) {
    var next = state.text.indexOf('\n');
    var pair = cut(state, next);
    var colon = pair.indexOf(':');
    if (colon === -1) {
      state.error = 'Missing colon.';
      return;
    }
    else {
      var pairName = pair.substring(0, colon);
      var pairValue = pair.substring(colon + 1);
      return [pairName, pairValue];
    }
  }

  function getSettingsKeyValue(state) {
    var next = nextSpaceOrNewline(state.text);
    var pair = cut(state, next);
    var colon = pair.indexOf(':');
    if (colon === -1) {
      state.error = 'Missing colon.';
      return;
    }
    else {
      var pairName = pair.substring(0, colon);
      var pairValue = pair.substring(colon + 1);
      return [pairName, pairValue];
    }
  }

  function parseCuesAndComments(state) {
    while (true) {
      var nextLine = peekLine(state);
      // If NOTE is not on a line all its own, it must be followed by a space or tab.
      if (nextLine.indexOf('NOTE') === 0 && ((nextLine.length === 4) || (nextLine[4] === ' ') || (nextLine[4] === '\t'))) {
        actList(state, [eatComment, eatEmptyLines]);
      }
      else if ($.trim(nextLine).length === 0 && state.text.length > 0) {
        act(state, eatEmptyLines);
      }
      else if ($.trim(nextLine).length > 0) {
        act(state, parseCue);
      }
      else {
        // Everythings parsed!
        return;
      }
    }
  }

  function parseCue(state) {

    var nextLine = peekLine(state);
    var cueId;
    var errString;

    if(nextLine.indexOf('-->') === -1) {
    	cueId = cutLine(state);
    	nextLine = peekLine(state);
    	if(nextLine.indexOf('-->') === -1) {
        errString = 'Invalid WebVTT file: ' + state.src + '\n';
        errString += 'Line: ' + state.line + ', ';
        errString += 'Column: ' + state.column + '\n';
        errString += 'Expected cue timing for cueId \''+cueId+'\' but found: ' + nextLine + '\n';
        if (console.warn) {
          console.warn(errString);
        }
        else if (console.log) {
          console.log(errString);
        }
        return; // Return leaving line for parseCuesAndComments to handle
    	}
    }

    var cueTimings = actList(state, [getTiming,
                                     eatAtLeast1SpacesOrTabs,
                                     eatArrow,
                                     eatAtLeast1SpacesOrTabs,
                                     getTiming]);

    var startTime = cueTimings[0];
    var endTime = cueTimings[4];
    if (startTime >= endTime) {
      state.error = 'Start time is not sooner than end time.';
      return;
    }

    act(state, eatSpacesOrTabs);
    var cueSettings = act(state, getCueSettings);
    // Cut the newline.
    cut(state, 1);
    var components = act(state, getCuePayload);

    if (typeof cueId === 'undefined') {
      cueId = state.cues.length + 1;
    }
    state.cues.push({
      id: cueId,
      start: startTime,
      end: endTime,
      settings: cueSettings,
      components: components
    });
  }

  function getCueSettings(state) {
    var cueSettings = {};
    while (state.text.length > 0 && state.text[0] !== '\n') {
      var keyValue = act(state, getSettingsKeyValue);
      cueSettings[keyValue[0]] = keyValue[1];
      act(state, eatSpacesOrTabs);
    }
    return cueSettings;
  }

  function getCuePayload(state) {
    // Parser based on instructions in draft.
    var result = {type: 'internal', tagName: '', value: '', classes: [], annotation: '', parent: null, children: [], language: ''};
    var current = result;
    var languageStack = [];
    while (state.text.length > 0) {
      var nextLine = peekLine(state);
      if (nextLine.indexOf('-->') !== -1 || /^\s*$/.test(nextLine)) {
        break; // Handle empty cues
      }
      // Have to separately detect double-lines ending cue due to our non-standard parsing.
      // TODO: Redo outer algorithm to conform to W3 spec?
      if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
        cut(state, 2);
        break;
      }

      var token = getCueToken(state);
      // We'll use the tokens themselves as objects where possible.
      if (token.type === 'string') {
        current.children.push(token);
      }
      else if (token.type === 'startTag') {
        token.type = token.tagName;
        // Define token.parent; added by Terrill to fix bug end 'endTag' loop
        token.parent = current;
        if ($.inArray(token.tagName, ['i', 'b', 'u', 'ruby']) !== -1) {
          if (languageStack.length > 0) {
            current.language = languageStack[languageStack.length - 1];
          }
          current.children.push(token);
          current = token;
        }
        else if (token.tagName === 'rt' && current.tagName === 'ruby') {
          if (languageStack.length > 0) {
            current.language = languageStack[languageStack.length - 1];
          }
          current.children.push(token);
          current = token;
        }
        else if (token.tagName === 'c') {
          token.value = token.annotation;
          if (languageStack.length > 0) {
            current.language = languageStack[languageStack.length - 1];
          }
          current.children.push(token);
          current = token;
        }
        else if (token.tagName === 'v') {
          token.value = token.annotation;
          if (languageStack.length > 0) {
            current.language = languageStack[languageStack.length - 1];
          }
          current.children.push(token);
          current = token;
        }
        else if (token.tagName === 'lang') {
          languageStack.push(token.annotation);
          if (languageStack.length > 0) {
            current.language = languageStack[languageStack.length - 1];
          }
          current.children.push(token);
          current = token;
        }
      }
      else if (token.type === 'endTag') {
        if (token.tagName === current.type && $.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v']) !== -1) {
          // NOTE from Terrill: This was resulting in an error because current.parent was undefined
          // Fixed (I think) by assigning current token to token.parent in 'startTag' loop
          current = current.parent;
        }
        else if (token.tagName === 'lang' && current.type === 'lang') {
          current = current.parent;
          languageStack.pop();
        }
        else if (token.tagName === 'ruby' && current.type === 'rt') {
          current = current.parent.parent;
        }
      }
      else if (token.type === 'timestampTag') {
        var tempState = {
          text: token.value,
          error: null,
          metadata: {},
          cues: [],
          line: 1,
          column: 1
        };
        try {
          var timing = act(tempState, getTiming);
          if (tempState.text.length === 0) {
            token.value = timing;
            current.push(token);
          }
        }
        catch (err) {
        }
      }
    }
    return result;
  }

  // Gets a single cue token; uses the method in the w3 specification.
  function getCueToken(state) {
    var tokenState = 'data';
    var result = [];
    var buffer = '';
    var token = {type: '', tagName: '', value: '', classes: [], annotation: '', children: []}

    while (true) {
      var c;
      // Double newlines indicate end of token.
      if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
        c = '\u0004';
      }
      else if (state.text.length > 0) {
        c = state.text[0];
      }
      else {
        // End of file.
        c = '\u0004';
      }
      if (tokenState === 'data') {
        if (c === '&') {
          buffer = '&';
          tokenState = 'escape';
        }
        else if (c === '<') {
          if (result.length === 0) {
            tokenState = 'tag';
          }
          else {
            token.type = 'string';
            token.value = result.join('');
            return token;
          }
        }
        else if (c === '\u0004') {
          return {type: 'string', value: result.join('')};
        }
        else {
          result.push(c);
        }
      }
      else if (tokenState === 'escape') {
        if (c === '&') {
          result.push(buffer);
          buffer = '&';
        }
        else if (c.match(/[0-9a-z]/)) {
          buffer += c;
        }
        else if (c === ';') {
          if (buffer === '&amp') {
            result.push('&');
          }
          else if (buffer === '&lt') {
            result.push('<');
          }
          else if (buffer === '&gt') {
            result.push('>');
          }
          else if (buffer === '&lrm') {
            result.push('\u200e');
          }
          else if (buffer === '&rlm') {
            result.push('\u200f');
          }
          else if (buffer === '&nbsp') {
            result.push('\u00a0');
          }
          else {
            result.push(buffer);
            result.push(';');
          }
          tokenState = 'data';
        }
        else if (c === '<' || c === '\u0004') {
          result.push(buffer);
          token.type = 'string';
          token.value = result.join('');
          return token;
        }
        else if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') { // Handle unescaped & chars as strings
          result.push(buffer);
          token.type = 'string';
          token.value = result.join('');
          return token;
        }
        else {
          result.push(buffer);
          tokenState = 'data';
        }
      }
      else if (tokenState === 'tag') {
        if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') {
          tokenState = 'startTagAnnotation';
        }
        else if (c === '.') {
          tokenState = 'startTagClass';
        }
        else if (c === '/') {
          tokenState = 'endTag';
        }
        else if (c.match('[0-9]')) {
          tokenState = 'timestampTag';
          result.push(c);
        }
        else if (c === '>') {
          cut(state, 1);
          break;
        }
        else if (c === '\u0004') {
          token.tagName = '';
          token.type = 'startTag';
          return token;
        }
        else {
          result.push(c);
          tokenState = 'startTag';
        }
      }
      else if (tokenState === 'startTag') {
        if (c === '\t' || c === '\u000c' || c === ' ') {
          tokenState = 'startTagAnnotation';
        }
        else if (c === '\n') {
          buffer = c;
          tokenState = 'startTagAnnotation';
        }
        else if (c === '.') {
          tokenState = 'startTagClass';
        }
        else if (c === '>') {
          cut(state, 1);
          token.tagName = result.join('');
          token.type = 'startTag';
          return token;
        }
        else if (c === '\u0004') {
          token.tagName = result.join('');
          token.type = 'startTag';
          return token;
        }
        else {
          result.push(c);
        }
      }
      else if (tokenState === 'startTagClass') {
        if (c === '\t' || c === '\u000c' || c === ' ') {
          token.classes.push(buffer);
          buffer = '';
          tokenState = 'startTagAnnotation';
        }
        else if (c === '\n') {
          token.classes.push(buffer);
          buffer = c;
          tokenState = 'startTagAnnotation';
        }
        else if (c === '.') {
          token.classes.push(buffer);
          buffer = "";
        }
        else if (c === '>') {
          cut(state, 1);
          token.classes.push(buffer);
          token.type = 'startTag';
          token.tagName = result.join('');
          return token;
        }
        else if (c === '\u0004') {
          token.classes.push(buffer);
          token.type = 'startTag';
          token.tagName = result.join('');
          return token;
        }
        else {
          buffer += 'c';
        }
      }
      else if (tokenState === 'startTagAnnotation') {
        if (c === '>') {
          cut(state, 1);
          buffer = $.trim(buffer).replace(/ +/, ' ');
          token.type = 'startTag';
          token.tagName = result.join('');
          token.annotation = buffer;
          return token;
        }
        else if (c === '\u0004') {
          buffer = $.trim(buffer).replace(/ +/, ' ');
          token.type = 'startTag';
          token.tagName = result.join('');
          token.annotation = buffer;
          return token;
        }
        else {
          buffer += c;
        }
      }
      else if (tokenState === 'endTag') {
        if (c === '>') {
          cut(state, 1);
          token.type = 'endTag';
          token.tagName = result.join('');
          return token;
        }
        else if (c === '\u0004') {
          token.type = 'endTag';
          token.tagName = result.join('');
          return token;
        }
        else {
          result.push(c);
        }
      }
      else if (tokenState === 'timestampTag') {
        if (c === '>') {
          cut(state, 1);
          token.type = 'timestampTag';
          token.name = result.join('');
          return token;
        }
        else if (c === '\u0004') {
          token.type = 'timestampTag';
          token.name = result.join('');
          return token;
        }
        else {
          result.push(c);
        }
      }
      else {
        throw 'Unknown tokenState ' + tokenState;
      }

      cut(state, 1);
    }
  }

  function eatComment(state) {
    // Cut the NOTE line.
    var noteLine = cutLine(state);
    if (noteLine.indexOf('-->') !== -1) {
      state.error = 'Invalid syntax: --> in NOTE line.';
      return;
    }
    while (true) {
      var nextLine = peekLine(state);
      if ($.trim(nextLine).length === 0) {
        // End of comment.
        return;
      }
      else if (nextLine.indexOf('-->') !== -1) {
        state.error = 'Invalid syntax: --> in comment.';
        return;
      }
      else {
        cutLine(state);
      }
    }
  }

  // Initial byte order mark.
  function eatOptionalBOM(state) {
    if (state.text[0] === '\ufeff') {
      cut(state, 1);
    }

  }

  // "WEBVTT" string.
  function eatSignature(state) {
    if (state.text.substring(0,6) === 'WEBVTT') {
      cut(state, 6);
    }
    else {
      state.error = 'Invalid signature.';
    }
  }

  function eatArrow(state) {
    if (state.text.length < 3 || state.text.substring(0,3) !== '-->') {
      state.error = 'Missing -->';
    }
    else {
      cut(state, 3);
    }
  }

  function eatSingleSpaceOrTab(state) {
    if (state.text[0] === '\t' || state.text[0] === ' ') {
      cut(state, 1);
    }
    else {
      state.error = 'Missing space.';
    }
  }

  function eatSpacesOrTabs(state) {
    while (state.text[0] === '\t' || state.text[0] === ' ') {
      cut(state, 1);
    }
  }

  function eatAtLeast1SpacesOrTabs(state) {
    var numEaten = 0;
    while (state.text[0] === '\t' || state.text[0] === ' ') {
      cut(state, 1);
      numEaten += 1;
    }
    if (numEaten === 0) {
      state.error = 'Missing space.';
    }
  }

  function eatUntilEOLInclusive(state) {
    var nextEOL = state.text.indexOf('\n');
    if (nextEOL === -1) {
      state.error = 'Missing EOL.';
    }
    else {
      cut(state, nextEOL + 1);
    }
  }

  function eatEmptyLines(state) {
    while (state.text.length > 0) {
      var nextLine = peekLine(state);
      if ($.trim(nextLine).length === 0) {
        cutLine(state);
      }
      else {
        break;
      }
    }
  }

  // Eats empty lines, but throws an error if there's not at least one.
  function eatAtLeast1EmptyLines(state) {
    var linesEaten = 0;
    while (state.text.length > 0) {
      var nextLine = peekLine(state);
      if ($.trim(nextLine).length === 0) {
        cutLine(state);
        linesEaten += 1;
      }
      else {
        break;
      }
    }
    if (linesEaten === 0) {
      state.error = 'Missing empty line.';
    }
  }

  function getTiming(state) {
    var nextSpace = nextSpaceOrNewline(state.text);
    if (nextSpace === -1) {
      state.error('Missing timing.');
      return;
    }
    var timestamp = cut(state, nextSpace);

    var results = /((\d\d):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);

    if (!results) {
      state.error = 'Unable to parse timestamp';
      return;
    }
    var time = 0;
    var hours = results[2];
    var minutes = results[4];

    if (minutes) {
      if (parseInt(minutes, 10) > 59) {
        state.error = 'Invalid minute range';
        return;
      }
      if (hours) {
        time += 3600 * parseInt(hours, 10);
      }
      time += 60 * parseInt(minutes, 10);
      var seconds = results[5];
      if (parseInt(seconds, 10) > 59) {
        state.error = 'Invalid second range';
        return;
      }

      time += parseInt(seconds, 10);
      time += parseInt(results[6], 10) / 1000;
    }
    else {
      time += parseInt(results[7], 10);
      time += parseInt(results[8], 10) / 1000;
    }

    return time;
  }
})(jQuery);
