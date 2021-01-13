![A/B doer](https://github.com/ColumbiaRoad/a-b-doer/blob/master/ab-doer.png?raw=true)

Utility library which makes developing of A/B test variants easier (maybe) and also tries to solve some Google Optimize and Tag Manager related issues. One reason for this is also that you don't have to use any online editors to create those variants. Supports e.g. JSX templates with custom JSX parser which outputs real DOM nodes. You can enable preact for more advanced tests with states etc. but those tests outputs a little bit larger bundles (~5kb) and it could be an issue (at least in Optimize)

---

# Prerequisites

Create config.json to project root with the following minimum settings:

```json
{
  "browser": "<insert browser executable path here>"
}
```

Browser executable path is probably in macOs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" and in Windows "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe". With unix-like (not macOs) systems you could check the path with command `which google-chrome` or something like it.

# Usage

Tests can be developed with command `abdo watch path/to/test/folder`. Command opens the test's URL in a browser and injects the built js and style files to site's DOM. This command also starts a file watcher for the folder and refreshes the browser on file changes.

If you want to just build the test without opening the browser `abdo build path/to/test/folder`

Tests can be previewed with command `abdo preview path/to/test/folder`. If the folder contains multiple entries, all of them will be opened to the same browser.

You can build all tests from a folder with command `abdo build-all path/to/test/folder`

Take screenshots for every variant with command `abdo screenshot path/to/test/folder`. If path matches multiple tests/variants, screenshot will be taken from every variant + originals. Screenshots will be saved under the build folder of the test

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

In JS files ES6, imports, etc are supported and also Rollup will bundle and minify them. Styles can be created with SCSS/SASS/CSS/LESS (imports are supported as well). If js file is the bundle entry, then styles should be imported in that file `import "./styles.scss"` and Rollup will handle it.

By default, JS supports nullish coalescing and optional chaining.

If you're more familiar with path aliases in import calls, there is path alias for `@/*` which points to root so it can be used like this `import { SVGIcon } from '@/icons/FooIcon.svg';`.
HTML files can be imported like JS and Rollup creates ejs template function from the file. Template can be rendered as string by calling the function, example below

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

This lib exports some helpers for adding the created element to dom. Those helpers tries to make sure that there would not be duplicate elements with same data-o attribute (created from test path or can be provided in buildspec file with id property)

## Usage examples, jsx templates

JSX files are also supported but they do not support React stuff out of the box. There's a simple createElement utility which works with babel and transforms jsx to dom nodes. JSX support is done by custom lib but you don't have to import it because it is done automatically (if preact option is not set). JSX lib uses NodeList.forEach, Array.from and Promise (if "wait" prefixed utils are used) polyfills.

```js
import { append, pollQuerySelector } from 'a-b-doer';
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
import { waitElement } from 'a-b-doer';

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
import { waitElements } from 'a-b-doer';

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
import { waitFor } from 'a-b-doer';

(async () => {
  // Wait 10 seconds for window variable to be set.
  try {
    const someLazyVar = await waitFor(() => window.someLazyVar, 10000);
    // Do something with the lazy variable
    console.log(someLazyVar);
  } catch (e) {
    console.log('No var');
  }
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

### useRef (JSX only)

Type `() => { current: null }`

useRef function returns an object that has current property set to null. Useful when assigned to component prop which is required if you want to pass parent node to some child component.

```js
import { append } from 'a-b-doer';
import { useRef } from 'a-b-doer/hooks';

const node = useRef();
append(
  <div ref={node}>
    <Sub node={node} />
  </div>,
  document.body
);
```

### useHook (JSX only)

useHook function is only a shorthand for `setTimeout(() => {...}, 0)`. Without a timeout, the reference prop would be empty because all child elements are rendered before the parent element.

```js
import { append } from 'a-b-doer';
import { useRef, useHook } from 'a-b-doer/hooks';

const node = useRef();
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
  useHook(() => {
    // Do something with the node
    console.log(node.current); // HTMLDivElement
  });

  return <span>Something</span>;
};
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

### windowSize

Type `Array<number>` (optional)

Default `[1920, 1080]`

Window dimension in pixels (width, height).

---

### Example buildspec.json

```json
{
  "url": "https://www.columbiaroad.com",
  "modules": false
}
```

## config.json usage

Global config file for all tests. This is a great place to configure all global buildspec options.

### browser

Type `string`

Path to browser excutable.

### userDataDir

Type `string` (optional)

User data directory for puppeteer chromium.

You can e.g. copy you bookmarks to file < userDataDir >/Default/Bookmark

You should add userData folder to your gitignore because it will be populated with Chromium profile stuff.

### Example config.json

```json
{
  "browser": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "userDataDir": "./puppeteer"
}
```
