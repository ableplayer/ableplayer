// Load the pre-built UMD bundle of webvtt.js (see the webvtt target in rollup.config.js).
// The bundle treats jquery as external; supply the minimal stub it needs.
global.jQuery = { inArray: (val, arr) => arr.indexOf(val) };
const path = require('path');
const addWebvttFunctions = require(
  path.resolve(__dirname, '../../build/test/webvtt.umd.js')
);

function AblePlayer() {}
addWebvttFunctions(AblePlayer);

// Recursively collect all string-type text from a parsed cue component tree.
function collectText(node) {
  if (!node) return '';
  if (node.type === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(collectText).join('');
  }
  return '';
}

// Like collectText but preserves inline markup tags (v, b, i, u, c) in the
// output as VTT-style tag strings, so assertions can verify tag structure
// as well as text content.
function collectTagged(node) {
  if (!node) return '';
  if (node.type === 'string') return node.value;
  if (node.type === 'internal') {
    // Root container — just concatenate children.
    return node.children.map(collectTagged).join('');
  }
  const tag = node.type; // 'v', 'b', 'i', 'u', 'c', 'lang', etc.
  const annotation = node.value ? ` ${node.value}` : '';
  const inner = Array.isArray(node.children) ? node.children.map(collectTagged).join('') : '';
  return `<${tag}${annotation}>${inner}</${tag}>`;
}

// Uses `media/wwa_captions_en.vtt` at commit `d2ee4c0`, and
// adds corner cases: empty cues, cues only containing whitespace,
// cues separated by multiple lines (plus whitespace) and tags sitting on lines
// by themselves (with and without trailing space).
// The tests below verify that the parser can handle all of these cases correctly.
const WVT = `WEBVTT
kind: captions
lang: en

NOTE This VTT file includes a few extras:
- Meta data at the top (lines 2 and 3)
- The current comment block, identified with NOTE and surrounded by spaces
- cue settings at the end of the first timestamp
- A cue span at the start of the second cue payload
- (in this case, a "voice span" <v> identifying the speaker)
- A WebVTT cue settings list after the timestamp at 39.132
- Currently AblePlayer does not support these extra features
- but the parser needs to be able to filter them out
-
- Added on April 1, 2015 for testing purposes (these are both valid):
- A cue block with no content
- Multiple line breaks between some cue blocks
-
- More info in the WebVTT spec (still evolving):
- http://dev.w3.org/html5/webvtt

00:00:00.429 --> 00:00:09.165
[ music ]

00:00:09.165 --> 00:00:10.792
<v Narrator 1>
You <i>want</i> these people.

00:00:10.792 --> 00:00:13.759
They <b>order</b> your products,
<b>sign up</b> for your services,

00:00:13.759 --> 00:00:16.627
<v Narrator 2> 
<b>enroll</b>
     in your classes,
<b>read</b> your opinions,

00:00:16.627 --> 00:00:18.561
and <b>watch</b> your videos.


00:00:18.561 --> 00:00:24.165
<v Narrator 3> You'll never see them, but they know you-
through your website.

00:00:24.165 --> 00:00:25.891
Or maybe not.

00:00:25.891 --> 00:00:30.396

00:00:30.396 --> 00:00:32.363
but a vibrant
community of individuals

00:00:32.363 --> 00:00:35.297
with varying tastes,
styles, and abilities.

00:00:35.297 --> 00:00:36.900


         

00:00:39.132 --> 00:00:41.000 position:10%,start align:start size:35%
<v Terrill> It's important for
web designers and developers

00:00:41.000 --> 00:00:45.500
to realize that what they see
currently on their computer,

00:00:45.500 --> 00:00:49.264

00:00:49.264 --> 00:00:52.000
is not going to be necessarily
the same thing that everybody else sees.

`;

describe('parseWebVTT – wwa_captions_en.vtt', () => {
  let player;
  let result;

  beforeAll(function () {
    player = new AblePlayer();
    result = player.parseWebVTT({ src: 'wwa_captions_en.vtt', text: WVT });
  });

  // ── cue count ────────────────────────────────────────────────────────────

  test('parses the correct total number of cues (including empty-content cues)', function () {
    // 15 timestamp blocks are present in the file
    expect(result.cues).toHaveLength(15);
  });

  // ── cue 1: plain text ────────────────────────────────────────────────────

  test('cue 1 – start time', function () {
    expect(result.cues[0].start).toBeCloseTo(0.429, 3);
  });

  test('cue 1 – end time', function () {
    expect(result.cues[0].end).toBeCloseTo(9.165, 3);
  });

  test('cue 1 – text content', function () {
    expect(collectText(result.cues[0].components)).toBe(`[ music ]`);
  });

  // ── cue 2: voice tag on its own line + italic span ───────────────────────

  test('cue 2 – start time', function () {
    expect(result.cues[1].start).toBeCloseTo(9.165, 3);
  });

  test('cue 2 – end time', function () {
    expect(result.cues[1].end).toBeCloseTo(10.792, 3);
  });

  test('cue 2 – markup including voice tag and italic span', function () {
    expect(collectTagged(result.cues[1].components)).toBe(
      `<v Narrator 1>
You <i>want</i> these people.</v>`
    );
  });

  // ── cue 3: bold spans ────────────────────────────────────────────────────

  test('cue 3 – start time', function () {
    expect(result.cues[2].start).toBeCloseTo(10.792, 3);
  });

  test('cue 3 – end time', function () {
    expect(result.cues[2].end).toBeCloseTo(13.759, 3);
  });

  test('cue 3 – markup with bold spans', function () {
    expect(collectTagged(result.cues[2].components)).toBe(
      `They <b>order</b> your products,
<b>sign up</b> for your services,`
    );
  });

  // ── cue 4: voice tag with trailing space + bold spans + indented line ────

  test('cue 4 – start time', function () {
    expect(result.cues[3].start).toBeCloseTo(13.759, 3);
  });

  test('cue 4 – end time', function () {
    expect(result.cues[3].end).toBeCloseTo(16.627, 3);
  });

  test('cue 4 – voice tag with trailing space does not truncate cue', function () {
    expect(collectTagged(result.cues[3].components)).toBe(
      `<v Narrator 2> 
<b>enroll</b>
     in your classes,
<b>read</b> your opinions,</v>`
    );
  });

  // ── cue 5 ────────────────────────────────────────────────────────────────

  test('cue 5 – start time', function () {
    expect(result.cues[4].start).toBeCloseTo(16.627, 3);
  });

  test('cue 5 – end time', function () {
    expect(result.cues[4].end).toBeCloseTo(18.561, 3);
  });

  test('cue 5 – text content', function () {
    expect(collectText(result.cues[4].components)).toBe(`and watch your videos.`);
  });

  // ── cue 6: multi-line payload + voice tag inline ─────────────────────────

  test('cue 6 – start time', function () {
    expect(result.cues[5].start).toBeCloseTo(18.561, 3);
  });

  test('cue 6 – end time', function () {
    expect(result.cues[5].end).toBeCloseTo(24.165, 3);
  });

  test('cue 6 – markup with inline voice tag', function () {
    expect(collectTagged(result.cues[5].components)).toBe(
      `<v Narrator 3> You'll never see them, but they know you-
through your website.</v>`
    );
  });

  // ── cue 7 ────────────────────────────────────────────────────────────────

  test('cue 7 – start time', function () {
    expect(result.cues[6].start).toBeCloseTo(24.165, 3);
  });

  test('cue 7 – end time', function () {
    expect(result.cues[6].end).toBeCloseTo(25.891, 3);
  });

  test('cue 7 – text content', function () {
    expect(collectText(result.cues[6].components)).toBe(`Or maybe not.`);
  });

  // ── cue 8: intentionally empty content ───────────────────────────────────

  test('cue 8 – start time', function () {
    expect(result.cues[7].start).toBeCloseTo(25.891, 3);
  });

  test('cue 8 – end time', function () {
    expect(result.cues[7].end).toBeCloseTo(30.396, 3);
  });

  // The VTT block has a blank line as its entire payload. The parser emits a
  // single newline node rather than nothing — consistent with cue 14 below.
  test('cue 8 – empty payload produces only a newline', function () {
    expect(collectText(result.cues[7].components)).toBe('\n');
  });

  // ── cue 9 ────────────────────────────────────────────────────────────────

  test('cue 9 – start time', function () {
    expect(result.cues[8].start).toBeCloseTo(30.396, 3);
  });

  test('cue 9 – end time', function () {
    expect(result.cues[8].end).toBeCloseTo(32.363, 3);
  });

  test('cue 9 – text spans both lines', function () {
    expect(collectText(result.cues[8].components)).toBe(
      `but a vibrant
community of individuals`
    );
  });

  // ── cue 10 ───────────────────────────────────────────────────────────────

  test('cue 10 – start time', function () {
    expect(result.cues[9].start).toBeCloseTo(32.363, 3);
  });

  test('cue 10 – end time', function () {
    expect(result.cues[9].end).toBeCloseTo(35.297, 3);
  });

  test('cue 10 – text content', function () {
    expect(collectText(result.cues[9].components)).toBe(
      `with varying tastes,
styles, and abilities.`
    );
  });

  // ── cue 11: whitespace-only content ──────────────────────────────────────

  test('cue 11 – start time', function () {
    expect(result.cues[10].start).toBeCloseTo(35.297, 3);
  });

  test('cue 11 – end time', function () {
    expect(result.cues[10].end).toBeCloseTo(36.900, 3);
  });

  // The VTT block payload is indented whitespace only. The parser strips those
  // lines entirely, producing '' — unlike the blank-line and truly-empty cases
  // (cues 8 and 14) which both produce '\n'.
  test('cue 11 – whitespace-only payload produces empty string', function () {
    expect(collectText(result.cues[10].components)).toBe(``);
  });

  // ── cue 12: cue settings (position / align / size) + voice tag ───────────

  test('cue 12 – start time', function () {
    expect(result.cues[11].start).toBeCloseTo(39.132, 3);
  });

  test('cue 12 – end time', function () {
    expect(result.cues[11].end).toBeCloseTo(41.000, 3);
  });

  test('cue 12 – cue settings are parsed without corrupting payload', function () {
    expect(collectTagged(result.cues[11].components)).toBe(
      `<v Terrill> It's important for
web designers and developers</v>`
    );
  });

  // ── cue 13 ───────────────────────────────────────────────────────────────

  test('cue 13 – start time', function () {
    expect(result.cues[12].start).toBeCloseTo(41.000, 3);
  });

  test('cue 13 – end time', function () {
    expect(result.cues[12].end).toBeCloseTo(45.500, 3);
  });

  test('cue 13 – text spans both lines', function () {
    expect(collectText(result.cues[12].components)).toBe(
      `to realize that what they see
currently on their computer,`
    );
  });

  // ── cue 14: truly empty content ──────────────────────────────────────────

  test('cue 14 – start time', function () {
    expect(result.cues[13].start).toBeCloseTo(45.500, 3);
  });

  test('cue 14 – end time', function () {
    expect(result.cues[13].end).toBeCloseTo(49.264, 3);
  });

  // No content at all between this timestamp and the next. The parser still
  // emits a single newline node — same result as the blank-line cue 8.
  test('cue 14 – truly empty payload produces only a newline', function () {
    expect(collectText(result.cues[13].components)).toBe(`\n`);
  });

  // ── cue 15 ───────────────────────────────────────────────────────────────

  test('cue 15 – start time', function () {
    expect(result.cues[14].start).toBeCloseTo(49.264, 3);
  });

  test('cue 15 – end time', function () {
    expect(result.cues[14].end).toBeCloseTo(52.000, 3);
  });

  test('cue 15 – text spans both lines', function () {
    expect(collectText(result.cues[14].components)).toBe(
      `is not going to be necessarily
the same thing that everybody else sees.`
    );
  });
});
