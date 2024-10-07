## The structure
The two folders represent the two main things that is spessasynth:
- `spessasynth_lib` - the library. This is what the NPM package contains.
- `website` - the application. This is the demo website and the Local Edition app with all of the frontend code.

## The two HTML files
One HTML file is at the top of the repository, called `index.html`.
This is the demo website and accessing it via any HTTP server should result in a working program.

The second one is `local_edition_index.html`.
This one is not intended to be accessed via a HTTP server,
instead it should be opened by running `npm start` at the root directory of the repo.

## Compiling

Make sure you have `esbuild` globally installed:

`npm install -g esbuild`

### lib
SpessaSynth's worklet processor needs to be compiled using `synthetizer/worklet_system/minify_processor.sh`
Simply call the script and the `worklet_processor.min.js` should get updated.

### app

The app also has its own minifying script:
`website/minify_website.sh`. It automatically calls `minify_processor.sh` too, so there's no need to call it every time.

## Bypassing the compilation
Local Edition is used for debugging, hence it's possible to directly use the javascript code instead of the minified versions:

### Bypass frontend minification
It can be done by editing `local_edition_index.html`:

From
```html
<script src='website/minified/local_main.min.js' type='module'></script> <!-- Here the magic happens ;) -->
<!--  <script src='website/js/main/local_main.js' type="module"></script>-->
```
to
```html
<!-- <script src='website/minified/local_main.min.js' type='module'></script>  Here the magic happens ;) -->
<script src='website/js/main/local_main.js' type="module"></script>
```
Then perform a hard reload. (`ctrl + shift + R`)

This will cause the page to load all the frontend code natively, bypassing the minified version.

### Bypass library minification
`js/manager/manager.js` must be edited.
Change
```js
const ENABLE_DEBUG = false;
```
to
```js
const ENABLE_DEBUG = true;
```
And perform a hard reload.
If the frontend is using minified code, make sure to recompile.

This will cause the library to be used directly instead of using only `worklet_processor.min.js`
