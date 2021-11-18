![A/B doer](https://github.com/ColumbiaRoad/a-b-doer/blob/master/ab-doer.png?raw=true)

Utility library which makes developing of A/B test variants easier (maybe) and also tries to solve some Google Optimize and Tag Manager related issues. One reason for this is also that you don't have to use any online editors to create those variants. Supports e.g. JSX templates with custom JSX parser. You can enable preact for more advanced tests, but those tests outputs a little bit larger bundles (~5kb) and it could be an issue (at least in Optimize).

---

# Installing

```
npm i a-b-doer --save-dev

# or with yarn

yarn add a-b-doer --dev
```

# Prerequisites

Create config.json (or config.js) to project root with the following minimum settings:

```json
{
  "browser": "<insert browser executable path here>"
}
```

Browser executable path is probably in macOs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" and in Windows "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe". With unix-like (not macOs) systems you could check the path with command `which google-chrome` or something like it.

If you're using javascript configuration, then the file should export the config object

```js
module.exports = {
  browser: '<insert browser executable path here>',
};
```

# Usage

Tests can be developed with command `abdo watch path/to/test/folder`. Command opens the test's URL in a browser and injects the built js and style files to site's DOM. This command also starts a file watcher for the folder and refreshes the browser on file changes.

If you want to just build the test without opening the browser `abdo build path/to/test/folder`

Tests can be previewed with command `abdo preview path/to/test/folder`. If the folder contains multiple entries, all of them will be opened to the same browser.

You can build all tests from a folder with command `abdo build-all path/to/test/folder`

Take screenshots for every variant with command `abdo screenshot path/to/test/folder`. If path matches multiple tests/variants, screenshot will be taken from every variant + originals. Screenshots will be saved under the build folder of the test

You can add these commands to package.json scripts

```
{
  ...
  scripts: {
    "build": "abdo build",
    "build-all": "abdo build-all",
    "start": "abdo watch",
    "preview": "abdo preview",
    "screenshot": "abdo screenshot"
  }
}
```

# Test structure

Tests can be created to under any folder. All tests should at least have buildspec.json (or buildspec.js) created in test's own folder or its parent folder.

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

## Usage examples, jsx templates

JSX files are also supported and you can create custom components with either functional style or class style syntax. Custom component syntax is like in preact but implemented in much simpler way. This means that all hooks and component render cycle methods are not implemented (if you need them, use preact). This library uses a simple createElement utility which works with babel and transforms jsx to virtual nodes that'll be rendered automatically to DOM nodes when they're added to DOM with library's own DOM utilities.

```js
import { append, pollQuerySelector, Component } from 'a-b-doer';
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
import { useState, useEffect } from 'a-b-doer/hooks';
export const Tpl = (props) => {
  useEffect(() => {
    console.log('Mounted');
    return () => {
      console.log('Unmounted');
    };
  }, []);
  const [state, setState] = useState({});
  return (
    <div onClick={() => console.log('testing')}>
      <h3>click me {props.test}</h3>
      <SomeSvgImage />
    </div>
  );
};
// OR with class syntax
export class Tpl extends Component {
  componentDidMount() {
    this.setState({ foo: 1 });
    console.log('Mounted');
  }
  componentDidUpdate(prevProps) {
    console.log('Updated', prevProps);
  }
  componentWillUnmount() {
    console.log('Unmounted');
  }
  render() {
    console.log(this.state);
    return (
      <div onClick={() => console.log('testing')}>
        <h3>click me {this.props.test}</h3>
        <SomeSvgImage />
      </div>
    );
  }
}
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

## Polyfills

This lib uses NodeList.forEach, Array.from and Promise (if "wait" prefixed utils are used) polyfills if [browserlist config](https://github.com/browserslist/browserslist) contains `ie 11`.

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

### useRef

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

const componentRef = useRef();
append(
  <SomeFunctionalComponent ref={componentRef} fooProp={1} barProp={"a"} />
  document.body
);
```

### useEffect

Effect hook that'll be called after component render. If useEffect call returns a function, it will be called when component leaves from DOM (like in preact)

### useState

State hook for creating stateful values. This hook retuns a stateful value and a function to update it (like in preact).

### useHook (deprecated)

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

Type `string | Array<string>`

Web page url(s) for the test. If this is an array, the first proper url will be the main url which is opened when the code changes. Puppeteer will watch navigation events for these urls and load the assets when the url matches one of these. URL can also be RegExp like string which starts and ends with `/`. RegExp url cannot be the only url.

### entry

Type `string` (optional)

Entry file for Rollup. Can be at least js or scss file.

### buildDir

Type `string` (optional)

Default `.build`

Output directory for Rollup.

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

### activationEvent

Type `string` (optional)

Use dataLayer event to activate the test in watch and preview modes. By default this is empty and the test will be acticated on DOM load.

Example:

```json
{
  ...
  "activationEvent": "optimize.activate.mytest",
  ...
}
```

Activate the test by calling dataLayer.push({ event: "optimize.activate.mytest" }) manually or with e.g. Google Tag Manager.

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

### historyChanges

Type `Boolean` (optional)

Default `true`

Should preview and watcher detect when URL is changed with history API? If true, and URL changes back to the test URL A/B doer will append tested assets to the DOM.

### debug

Type `Boolean` (optional)

Default `false`

Adds some extra logging for debug

### appendStyles

Type `Boolean` (optional)

Default `true`

Should bundle file append styles to head automatically. If `false` styles can be added manually by calling `window._addStyles()`

---

### Example buildspec.json

```json
{
  "url": ["https://www.columbiaroad.com", "/https?:\\/\\/www\\.columbiaroad\\.com/"],
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

### include and exclude

Type `string | RegExp | Array[String|RegExp]` (optional)

A valid picomatch pattern, or array of patterns. If options.include is omitted or has zero length, filter will return true by default. Otherwise, an ID must match one or more of the picomatch patterns, and must not match any of the options.exclude patterns.

Note that picomatch patterns are very similar to minimatch patterns.

With this you can e.g. exclude js files that are in the same folder as buildspec.json but is not a variant.

### devtools

Type `boolean` (optional)

Default `true`

Is devtools open when browser opens

### sourcemap

Type `boolean` (optional)

Default `true`

Inlines source maps to the bundle with local file urls. This works only in watch mode.

### Example config.json

```json
{
  "browser": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "userDataDir": "./puppeteer"
}
```

### Advanced example config.js with custom bundler options

```js
const fooPlugin = require('rollup-foo-plugin');

/*
Supported plugins for array format are currently.
Note, changing the configuration for these plugins might break something.

alias,
babel,
commonjs,
image,
inline-svg,
node-resolve,
replace,
styles,
svg-hyperscript,
preact-debug
*/

module.exports = {
  browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  userDataDir: './puppeteer',
  exclude: ['**/components/**/*', '**/src/**/*'],
  bundler: {
    plugins: [
      // Add extra entry to alias plugin configuration
      [
        'alias',
        (options) => ({
          ...options,
          entries: [...options.entries, { find: 'something', replacement: '@/foo' }],
        }),
      ],
      // Override rollup image plugin configuration
      [
        'image',
        {
          exclude: ['**/*.svg', '**/*.png'],
        },
      ],
      // Add extra input plugin to rollup configuration
      fooPlugin({ foo: 1 }),
    ],
    output: {
      // Some super options for bundler output
    },
  },
};
```

#### Hashed file names

You can turn on hashed file names by setting bundler option `{ output: { entryFileNames: "[name].[hash].js" } }`. `assetFileNames` option will be same as `entryFileNames` if not explicitly set to something else so both js and css file names will be in the format set by `entryFileNames`.

If A/B Doer finds entryFileNames option with a hash tag, it will clear the build directory before each build.

## EJS support (removed from default config)

EJS is no longer supported by default because the used ejs library is not actively maintained anymore, but you can add it easily to your config if needed.

run `npm install rollup-plugin-ejs --save-dev`

Update config.js:

```js
import ejs from 'rollup-plugin-ejs';

module.exports = {
  // ...
  bundler: {
    plugins: [
      // ...
      ejs({
        include: ['**/*.ejs'],
      }),
    ],
  },
};
```

```js
import tpl from './template.ejs'; // ./template.html is also okay

const domNode = document.createElement('div');

domNode.innerHTML = tpl({ text: 'Hello World' });
```

template.ejs content:

```html
<p><%= locals.text %></p>
```

The lib exports some helpers for adding the created element to dom. Those helpers tries to make sure that there would not be duplicate elements with same data-o attribute (created from test path or can be provided in buildspec file with id property)
