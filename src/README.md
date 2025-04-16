## The structure
- `website` - the application. This is the demo website and the Local Edition app with all the frontend code.
- `build` - this folder contains the build scripts.

## The two HTML files
One HTML file is at the top of the repository, called `index.html`.
This is the demo website and accessing it via any HTTP server should result in a working program.

The second one is `local_edition_index.html`.
This one is not intended to be accessed via an HTTP server,
instead it should be opened by running `npm start` at the root directory of the repo.

## Compiling
1. install dependencies: `npm install`
2. run the build script: `npm run build`
3. start the local edition: `npm start`