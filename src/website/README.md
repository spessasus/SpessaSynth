## This is the website folder.

It contains the CSS, HTML and the frontend JavaScript for
the GUI, such as the renderer, keyboard, etc.

`css` folder contains all the CSS.

`js` folder contains all the frontend JavaScript.

`locale` folder contains the locale (languages and translations) and the locale manager.

Some of these could be reused in your project as they usually can work on their own
(like keyboard finds the div with id of `keyboard`),
so maybe give them a try!

Note: All these are not documented in the wiki as they are not part of the SpessaSynth library.
You're on your own!

Note 2: Pretty much all of these require a SpessaSynth instance to work, so they cannot be used for different synths
without large modifications.

Note 3: use `npm run build` to minify the code.