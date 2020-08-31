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

# Test structure

Tests can be created to under any folder. All tests should at least have buildspec.json crated in test's own folder or its parent's folder.

```
tests/
	|- SomeTest/
	|		|- buildspec.json
	|		|- index.js (optional)
	|		|- styles.scss (optional)
	|
	|- SomeNestedTest
			|- buildspec.json
			|- NestedOne/
					|- index.js
			|- NestedTwo/
					|- index.js
```

## Test files

In JS files ES6, imports, etc are supported and also rollup will bundle and minify them. Styles should be created with SASS syntax (imports are supported as well).

## buildspec.json contents

```
{
	"url": "https://www.columbiaroad.com"
}
```
