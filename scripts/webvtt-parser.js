// See section 4.1 of dev.w3.org/html5/webvtt for format details.
function parseWebVTT(text) {
    // Normalize line ends to \n.
    text.replace("\r\n", "\n").replace("\r", "\n");
    // Remove any cue tags.
    text.replace( /<.*?>/g, '' )

    var parserState = {
	text: text,
	error: null,
	metadata: {},
	cues: []
    };

    try {
	act(parseState, parseFileBody);
    }
    catch (err) {
    }

    return parserState;
}

function actList(state, list) {
    var results = [];
    for (var ii in list) {
	results.push(act(state, list[ii]));
    }
}

// Applies the action and checks for errors.
function act(state, action) {
    var val = action(state);
    if (state.error !== null) {
	throw new Exception(state.error);
    }
    return val;
}

function cut(state, length) {
    var returnText = state.text.substring(0, length);
    state.text = state.text.substring(length);
    return returnText;
}

function cutLine(state, length) {
    var nextEOL = state.text.index("\n");
    var returnText;
    if (nextEOL === -1) {
	returnText = state.text;
	state.text = "";
    }
    else {
	returnText = state.text.substring(0, nextEOL);
	state.text = state.text.substring(nextEOL + 1);
    }
    return returnText;
}

function peekLine(state) {
    var nextEOL = state.text.index("\n");
    if (nextEOL === -1) {
	return state.text;
    }
    else {
	return state.text.substring(0, index);
    }
}

function parseFileBody(state) {
    actList(state, [
	eatOptionalBOM,
	eatSignature,
	eatSingleSpaceOrTab,
	eatUntilEOLInclusive,
	parseMetadataHeaders,
	eatAtLeast1EmptyLines
	parseCuesAndComments]);
}

// Parses all metadata headers until a cue is discovered.
function parseMetadataHeaders(state) {
    while (true) {
	var nextLine = peekLine(state);
	if (nextLine.index("-->") !== -1) {
	    return;
	}
	else {
	    var keyValue = act(state, getKeyValue);
	    state.metadata[keyValue[0]] = keyValue[1];
	    act(state, eatUntilEOLInclusive);
	}
    }
}

function nextSpaceOrNewline(s) {
    var possible = [];
    var spaceIndex = s.index(" ");
    if (spaceIndex >= 0) {
	possible.push(spaceIndex);
    }
    var tabIndex = s.index("\t");
    if (tabIndex >= 0) {
	possible.push(tabIndex);
    }
    var lineIndex = s.index("\n");
    if (lineIndex >= 0) {
	possible.push(lineIndex);
    }

    return Math.max.apply(null, possible);
}

// Parses a single metadata header; assumes the next line is a metadata header.
function getKeyValue(state) {
    var next = nextSpaceOrNewline(state.text);
    var pair = cut(state, next);
    cut(state, 1);
    var colon = pair.index(":");
    if (colon === -1) {
	state.error = "Missing colon.";
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
	if (nextLine.startswith("NOTE") && ((nextLine.length === 4) || (nextLine[5] === " ") || (nextLine[5] === "\t"))) {
	    actList(state, [eatComment, eatEmptyLines]);
	}
	else if (nextLine.trim().length !== 0) {
	    parseCue(state);
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
    if (nextLine.index("-->") === -1) {
	cueId = cutLine(state);
    }
    var cueTimings = actList(state, [getTiming, 
				     eatAtLEast1SpacesOrTabs,
				     eatArrow,
				     eatAtLeast1SpacesOrTabs,
				     getTiming]);
    var startTime = cueTimings[0];
    var endTime = cueTimings[4];
    if (startTime >= endTime) {
	state.error = "Start time is not sooner than end time.";
	return;
    }

    act(state, eatSpacesOrTabs);
    var cueSettings = act(state, getCueSettings);
    // Cut the newline.
    cut(state, 1);
    var payload = act(state, getCuePayload);

    state.cues.push({
	id: cueId,
	start: startTime,
	end: endTime,
	settings: cueSettings,
	payload: payload
    });
}

function getCueSettings(state) {
    var cueSettings = {};
    while (state.text.length > 0 && state.text[0] !== "\n") {
	var keyValue = act(state, getKeyValue);
	cueSettings[keyValue[0]] = keyValue[1];
    }
    return cueSettings;
}


function getCuePayload(state) {
    var contents = [];
    while (state.text.length > 0) {
	var nextLine = peekLine(state);
	if (nextLine.index("-->") !== -!) {
	    break;
	}
	contents.push(nextLine);
    }
    return contents.join("\n");
}

function eatComment(state) {
    // Cut the NOTE line.
    var noteLine = cutLine(state);
    if (noteLine.index("-->") !== -1) {
	state.error = "Invalid syntax: --> in NOTE line.";
	return;
    }
    while (true) {
	var nextLine = peekLine(state);
	if (nextLine.trim().length === 0) {
	    // End of comment.
	    return;
	}
	else if (nextLine.index("-->") !== -1) {
	    state.error = "Invalid syntax: --> in comment.";
	    return;
	}
	else {
	    cutLine(state);
	}
    }
}

// Initial byte order mark.
function eatOptionalBOM(state) {
    if (state.text[0] === "\ufeff") {
	cut(state, 1);
    }

}

// "WEBVTT" string.
function eatSignature(state) {
    if (state.text.substring(0,6) === "WEBVTT") {
	cut(state, 6);
    }
    else {
	state.error = "Invalid signature.";
    }
}

function eatArrow(state) {
    if (state.text.length < 3 || state.text.substring(0,3) !== "-->") {
	state.error = "Missing -->";
    }
    else {
	cut(state, 3);
    }
}

function eatSingleSpaceOrTab(state) {
    if (state.text[0] === "\t" || state.text[0] === " ") {
	cut(state, 1);
    }
    else {
	state.error = "Missing space.";
    }
}

function eatSpacesOrTabs(state) {
    while (state.text[0] === "\t" || state.text[0] === " ") {
	cut(state, 1);
    }
}

function eatAtLeast1SpacesOrTabs(state) {
    var numEaten = 0;
    while (state.text[0] === "\t" || state.text[0] === " ") {
	cut(state, 1);
	numEaten += 1;
    }
    if (numEaten === 0) {
	state.error = "Missing space.";
    }
}

function eatUntilEOLInclusive(state) {
    var nextEOL = state.text.index("\n");
    if (nextEOL === -1) {
	state.error = "Missing EOL.";
    }
    else {
	cut(state, index + 1);
    }
}

function eatEmptyLines(state) {
    while (state.text.length > 0) {
	var nextLine = peekLine(state);
	if (nextLine.trim().length === 0) {
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
	if (nextLine.trim().length === 0) {
	    cutLine(state);
	    linesEaten += 1;
	}
	else {
	    break;
	}
    }
    if (linesEaten === 0) {
	state.error = "Missing empty line.";
    }
}

function getTiming(state) {
    var nextSpace = nextSpaceOrNewline(state.text);
    if (nextSpace === -1) {
	state.error("Missing timing.");
	return;
    }

    results = /((\d\d):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);
    
    if (!results) {
	state.error("Unable to parse timestamp.");
    }
    var time = 0;
    var hours = results[2];
    var minutes = results[4];

    if (minutes) {
	if (int(minutes) > 59) {
	    state.error = "Invalid minute range.";
	    return;
	}
	if (hours) {
	    time += 3600 * int(hours);
	}
	time += 60 * int(minutes);
	var seconds = results[5];
	if (int(seconds) > 59) {
	    state.error = "Invalid second range.";
	    return;
	}

	time += int(seconds);
	time += int(results[6] / 1000);
    }
    else {
	time += int(results[7]);
	time += int(results[8]) / 1000;
    }

    return time;
}
