# Prerequisites

Create config.json to project root with the following minimum settings:

```
{
	"browser": "<insert browser executable path here>"
}
```

Browser executable path is probably in macOs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" and in Windows "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe". With unix-like (not macOs) systems you could check the path with command `which google-chrome` or something like it.

# Usage

Tests can be run with command `npm run build path/to/test/folder`

and with a watcher for file changes `npm run watch path/to/test/folder`

Command opens the test's URL in a browser and injects the built js and style files to site's DOM.

# Test structure

Tests can be created to under any folder. All tests should at least have buildspec.json created in test's own folder or its parent's folder.

```
tests/
	|- SomeTest/
	|	|- buildspec.json
	|	|- index.js (default)
	|	|- styles.scss
	|
	|- SomeNestedTest
		|- buildspec.json
		|- NestedOne/
			|- index.js
		|- NestedTwo/
			|- index.js
```

## Test files

In JS files ES6, imports, etc are supported and also Rollup will bundle and minify them. Styles should be created with SCSS/SASS syntax (imports are supported as well). If js file is the bundle entry, then styles should be imported in that file `import "./styles.scss"` and Rollup will handle it.

By default, JS supports nullish coalescing and optional chaining.

If you're more familiar with path aliases in import calls, there is path alias for `@/*` which points to root so it can be used like this `import { pollQuerySelector } from '@/utils/dom';`. Also any other import from any folder at root will work without first adding it to path aliases.

## buildspec.json contents

### Supported properties

| Property |  Type  | Description                                            | Optional |
| -------- | :----: | ------------------------------------------------------ | :------: |
| url      | string | Web page url for the test                              |  false   |
| entry    | string | Entry file for Rollup. Can be at least js or scss file |   true   |

### Example

```
{
	"url": "https://www.columbiaroad.com"
}
```
