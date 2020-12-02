# Prerequisites

Create config.json to project root with the following minimum settings:

```json
{
  "browser": "<insert browser executable path here>"
}
```

Browser executable path is probably in macOs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" and in Windows "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe". With unix-like (not macOs) systems you could check the path with command `which google-chrome` or something like it.

# Usage

Tests can be run with command `npm run build path/to/test/folder`

and with a watcher for file changes `npm run watch path/to/test/folder`

Command opens the test's URL in a browser and injects the built js and style files to site's DOM.

Built tests can be previewed with command `npm run preview path/to/test/folder`. If the folder contains multiple entries, all of them will be opened to the same browser.

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
HTML files can be imported like JS and Rollup creates a ejs template function from the file. Template can be rendered as string by calling the function, example below

```js
import tpl from './template.ejs'; // ./template.html is also okay

const domNode = document.createElement('div');

domNode.innerHTML = tpl({ text: 'Hello World' });
```

template.ejs content:

```html
<p><%= locals.text %></p>
```

Dom utils file contains helpers for adding the created element to dom. Those helpers tries to make sure that there would not be duplicate elements with same data-o attribute (created from test path or can be provided in buildspec file with id property)

JSX files are also supported but they do not support React stuff out of the box. There's a simple createElement utility which works with babel and transforms jsx to dom nodes. JSX support can be enabled from the test file by importing the 'jsx' lib. JSX lib should not require any polyfills but if your code needs them you can import corejs3 files individually in `lib/polyfills.js` and import that file in your script.

```js
import '@/lib/jsx';
import { append, getTestID, pollQuerySelector } from '@/utils/dom';
import SomeSvgImage from '@/images/some-svg-image.svg';
import './styles.scss';

import tpl from './template.jsx';

pollQuerySelector('html body', (target) => {
  append(tpl({ test: 1, id: getTestID() }), target);
});

// or

import Tpl from './template.jsx';

pollQuerySelector('html body', (target) => {
  append(<Tpl test="1" id={getTestID()} />, target);
});

// template.jsx
export default (props) => {
  return (
    <div data-o={props.id} onClick={() => console.log('testing')}>
      <h3>click me {props.test}</h3>
      <SomeSvgImage />
    </div>
  );
};
```

Test templates with `preact: true`

```js
import { render } from 'preact';
import { useState } from 'preact/hooks';
import clsx from 'clsx';
import styles from './styles.scss';

const MyComponent = (props) => {
  const { val } = props;
  const [value, setValue] = useState(val);

  return (
    <div class={{ [styles.active]: value > 1 }}>
      <button onClick={() => setValue(value + 1)}>Increment</button>
    </div>
  );
};

pollQuerySelector('html #app', (target) => {
  render(<MyComponent val={1} />, target);
});
```

## buildspec.json usage

These settings can also be used to override settings from global config.

### url

Type `string`

Web page url for the test.

### entry

Type `string` (optional)

Entry file for Rollup. Can be at least js or scss file.

### minify

Type `boolean` (optional)

Default `true`

Should the bundle be minified.

### modules

Type `boolean` (optional)

Default `true`

CSS/SCSS module support.

### preact

Type `boolean` (optional)

Default `false`

Should test script use preact? If true, 'h' will be imported automatically.

### chunkImages

Type `boolean | number | { size: number, include: Array<string | RegExp> | string | RegExp, exclude: Array<string | RegExp> | string | RegExp }` (optional)

Default `true` (true=150)

Splits imported base64 image strings into specific sized chunks which will be concatenated to one string. GTM has this limit for too long contiguous non-whitespace characters.

### Example

```json
{
  "url": "https://www.columbiaroad.com",
  "modules": false
}
```

## config.json usage

### browser

Type `string`

Path to browser excutable.

### userDataDir

Type `string` (optional)

User data directory for puppeteer chromium.

You can e.g. copy you bookmarks to file < userDataDir >/Default/Bookmark

You should add userData folder to your gitignore because it will be populated with Chromium profile stuff. You could also set global buildspec options here.

### Example

```json
{
  "browser": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "userDataDir": "./puppeteer"
}
```
