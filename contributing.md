# Contributing to Able Player

There are many ways to contribute to Able Player, and we welcome and appreciate your help! Here are some options:

## Support Able Player Financially

Able Player is maintained for free by Joe Dolson. Your financial support is greatly appreciated! [Learn how to contribute][donate].

## Contribute to Code

### Request Changes

If you spot bugs or have feature requests, please submit them to the [Issues][issues] queue. Before submitting a request, please search open and closed issues to see whether a request has already been suggested.

### Submit Code

- All development happens on the [develop branch][develop]. This is often many commits ahead of the main branch, so please work from *develop*, and submit pull requests to that branch.
- Please omit files in the `build` directory from Pull Requests.
- Avoid combining refactoring or reformatting with functional changes.

We particularly appreciate help with any issues in the Issues queue that have been flagged with "help wanted".

## Translate Able Player

If you are multilingual, please consider translating Able Player into another language! All labels, prompts, messages, and help text for each language maintained in a single file, contained in the */translations* directory.

Copy the `en.json` source file, then replace the English version of the text with your translation. If a string doesn't need to be changed for your language, it can be omitted from the file.

[Existing translations][]

## Building the Able Player source

The source JavaScript files for Able Player are in the */scripts* directory, and the source CSS files are in the */styles* directory. These source files are ultimately combined into several different files (in the */build* directory) using [npm][], [Grunt][], and [Rollup][].

```sh
# Install Grunt globally
npm install -g grunt-cli

# Install project dependencies
npm install

# Build CSS and JS
npm run build
```

The npm and Grunt build process is defined by the *Gruntfile.js* and *package.json* files. (Note that the **version number** is specified in *package.json*, and must be updated when a new version is released).

Starting in 5.0.0, which migrated Able Player from IIFE to ES modules, most of the building is instead done by Rollup. Grunt's concatenation bundling was sufficient for combining a series of IIFEs, but ES modules require more complex handling. As of 2026, Rollup is the tool of choice for this task. Grunt is still the overall task manager, since CSS minification is still needed, as well as a new step to generate TypeScript type definitions.

Files created by the build process are put into the */build* directory:

- **build/ableplayer.js** -
  the default build of *ableplayer.js*. Useful for debugging.
- **build/ableplayer.dist.js** -
  a build of *ableplayer.js* without console logging
- **build/ableplayer.min.js** -
  a minified version of the *dist* file
- **build/ableplayer.esm.js** -
  The ES module build of Able Player. For use in application bundles produced by Vite, webpack, or similar.
- **build/ableplayer.min.css** -
  a minified combined version of all Able Player CSS files
- **build/separate-dompurify/ directory** -
   same files as above, except DOMPurify is provided as a separate file rather than bundled to give the option of loading the library separately or using a CDN-hosted version.

Starting in 5.0.0, all bundles now include source maps. These are helpful for debugging. Include them alongside the bundles, to see the original `/scripts` files instead of the `/build` output, when using browser debuggers.

Also in 5.0.0, we build TypeScript type definitions, to aid IDE development with the ES module bundle.

- **build/ableplayer.esm.d.ts** - Type definitions
- **build/ableplayer.esm.d.ts.map** - Source map to improve "go to definition" behavior in IDEs

## Automated Testing

Able Player uses [Jest][] to run automated tests. Tests are found in `scripts/__tests__`. Currently, the test suite is fairly small, but expanding the test suite is a high priority.

```sh
# Run Test Suite
npm test
```

The suite runs headless and needs no local server: the browser-based tests intercept their own navigation. To watch the browser while debugging, run `HEADFUL=1 npm test`.

Please run the test suite against your changes to ensure there are no unexpected changes.

## Code of Conduct

All contributors to Able Player are expected to follow our [published Code of Conduct](https://github.com/ableplayer/ableplayer/blob/main/code-of-conduct.md).

  [Rollup]: https://rollupjs.org/
  [Grunt]: https://gruntjs.com/
  [issues]: https://github.com/ableplayer/ableplayer/issues
  [npm]: https://www.npmjs.com/
  [develop]: https://github.com/ableplayer/ableplayer/tree/develop
  [donate]: https://www.joedolson.com/donate/
  [Existing translations]: https://github.com/ableplayer/ableplayer/blob/develop/translations/
  [Jest]: https://jestjs.io/
