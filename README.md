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

## Usage examples, ejs templates

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

## Usage examples, jsx templates

JSX files are also supported but they do not support React stuff out of the box. There's a simple createElement utility which works with babel and transforms jsx to dom nodes. JSX support is done by custom lib but you don't have to import it because it is done automatically (if preact option is not set). JSX lib uses NodeList.forEach, Array.from and Promise (if "wait" prefixed utils are used) polyfills. If your code needs some other polyfills you can import corejs3 files individually in `lib/polyfills.js` which is imported by the jsx lib.

```js
import { append, pollQuerySelector } from '@/utils/dom';
import SomeSvgImage from '@/images/some-svg-image.svg';
import './styles.scss';

import { Tpl } from './template.jsx';

pollQuerySelector('html body', (target) => {
  append(Tpl({ test: 1 }), target);
});

// or

import { Tpl } from './template.jsx';

pollQuerySelector('html body', (target) => {
  const child = target.querySelector('.child');
  const AttrChild = target.querySelector('.attr-child');

  append(
    <Tpl test="1">
      {/* without extra attributes */}
      {child}
      {/* with altered attributes */}
      <AttrChild class="new-class" />
    </Tpl>,
    target
  );
});

// template.jsx
export const Tpl = (props) => {
  return (
    <div onClick={() => console.log('testing')}>
      <h3>click me {props.test}</h3>
      <SomeSvgImage />
    </div>
  );
};
```

## Utility functions

### pollQuerySelector

Type `(selector: string, callback: (node: HTMLElement) => void, wait?: number = 1000) => void`

Runs given query selector for every 100ms until the wait timeout (ms) has passed and calls the callback if selector returns something.

### pollQuerySelectorAll

Type `(selector: string, callback: (nodes: HTMLElement[]) => void, wait?: number = 1000) => void`

Runs given query selector for every 100ms until the wait timeout (ms) has passed and calls the callback if selector returns something.

### waitElement

Type `(selector: string, timeout?: number = 5000) => Promise<HTMLElement>`

Returns a promise which will be resolved if given selector is found. It runs the dom query every 100ms until the timeout (ms) has passed.

Note: polyfills Promise automatically

```js
import { waitElement } from '@/utils/dom';

(async () => {
  // Wait 10 seconds for window variable to be set.
  try {
    const node = await waitElement('.foo');
    console.log(node.attributes, node.parentElement);
  } catch (e) {
    // Do nothing.
  }
})();

// or without async/await
waitElement('.foo')
  .then(function (node) {
    console.log(node.attributes, node.parentElement);
  })
  .catch(function () {
    // Do nothing.
  });
```

### waitElements

Type `(selector: string, timeout?: number = 5000) => Promise<HTMLElement[]>`

Same as waitElement, but resolved value is always an array.

Note: polyfills Promise automatically

```js
import { waitElements } from '@/utils/dom';

(async () => {
  // Wait 10 seconds for window variable to be set.
  try {
    // Always an array
    const nodes = await waitElements('.foo');
    nodes.forEach((node) => {
      console.log(node.attributes, node.parentElement);
    });
  } catch (e) {
    // Do nothing.
  }
})();

// or without async/await
waitElements('.foo')
  .then(function (nodes) {
    nodes.forEach((node) => {
      console.log(node.attributes, node.parentElement);
    });
  })
  .catch(function () {
    // Do nothing.
  });
```

### waitFor

Type `(() => any, timeout?: number = 5000) => Promise<any>`

Returns a promise which will be resolved if given function returns truthy value. It calls the function every 100ms until the timeout (ms) has passed.

Note: polyfills Promise automatically

```js
import { waitFor } from '@/utils/dom';

(async () => {
  // Wait 10 seconds for window variable to be set.
  try {
    const someLazyVar = await waitFor(() => window.someLazyVar, 10000);
  } catch (e) {
    console.log('No var');
  }

  // Do something with the lazy variable
  console.log(someLazyVar);
})();

// or without async/await
waitFor(() => window.someLazyVar, 10000)
  .then(function (someLazyVar) {
    console.log(someLazyVar);
  })
  .catch(function () {
    console.log('No var');
  });
```

### ref (JSX only)

Type `() => { current: null }`

Ref function returns an object that has current property set to null. Useful when assigned to component prop which is required if you want to pass parent node to some child component.

```js
import { ref } from '@/lib/jsx';
import { append } from '@/utils/dom';

const node = ref();
append(
  <div ref={node}>
    <Sub node={node} />
  </div>,
  document.body
);
```

### hook (JSX only)

Hook function is only a shorthand for `setTimeout(() => {...}, 0)`. Without a timeout, the reference prop would be empty because all child elements are rendered before the parent element.

```js
import { ref, hook } from '@/lib/jsx';
import { append } from '@/utils/dom';

const node = ref();
append(
  <div ref={node}>
    <Sub node={node} />
  </div>,
  document.body
);

const Sub = (props) => {
  // node.current is null here
  const { node } = props;

  // Same as setTimeout without the timeout
  hook(() => {
    // Do something with the node
    console.log(node.current); // HTMLDivElement
  });

  return <span>Something</span>;
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

Should test script use preact? If true, 'h' will be imported automatically. Bundle size is approximately 5kb bigger (without preact/compat)

### chunkImages

Type `boolean | number | { size: number, include: Array<string | RegExp> | string | RegExp, exclude: Array<string | RegExp> | string | RegExp }` (optional)

Default `true` (true=150)

Splits imported base64 image strings into specific sized chunks which will be concatenated to one string. GTM has this limit for too long contiguous non-whitespace characters.

### id

Type `string` (optional)

Default `t-xxxxxxxx` (hash from test folder)

ID which is returned from getTestID() call. Is automatically used in data-o attributes.

---

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
