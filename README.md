![A/B doer](https://raw.githubusercontent.com/ColumbiaRoad/a-b-doer/main/ab-doer.png)

Utility library which makes developing of A/B test variants easier (maybe) and you don't have to use any online editors to create those variants. The lib supports JSX templates with custom JSX parser. Output size is tried to be minimal, e.g. following test is just 5.1kb when minified, and 4.1kb without class component, namespace, class + className prop, extended types support (see option `features`):

```js
import { append } from 'a-b-doer';
import { useState } from 'a-b-doer/hooks';
const Foo = () => {
  const [inc, setInc] = useState(1);
  return <div onClick={() => setInc(inc + 1)}>{inc}</div>;
};
append(<Foo />, document.body);
```

You can enable preact for more advanced tests, but those tests outputs a little bit larger bundles (adds at least ~5kb, the example above is 10.2kb with preact when `append` is replaced with `render`) and it could be an issue if bundle size is very limited

---

# Installing

```
npm i a-b-doer --save-dev

# or with yarn

yarn add a-b-doer --dev
```

# Prerequisites

Create abd.config.json (or abd.config.js) to project root with the following minimum settings:

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

In JS files ES6, imports, etc are supported and also Vite will bundle and minify them. By default styles can be created with SCSS/SASS/CSS (imports are supported as well). Vite supports other formats as well, but you must add required modules/config for them. If js file is the bundle entry, then styles should be imported in that file `import "./styles.scss"` and Vite will handle it.

By default, JS supports nullish coalescing and optional chaining.

If you're more familiar with path aliases in import calls, there is path alias for `@/*` which points to root so it can be used like this `import SVGIcon from '@/icons/FooIcon.svg';`.

## Usage examples, jsx templates

JSX files are also supported and you can create custom components with either functional style or class style syntax. Custom component syntax is like in preact but implemented in much simpler way. This means that all hooks and component render cycle methods are not implemented (if you need them, use preact). This library uses a simple createElement utility which works with babel and transforms jsx to virtual nodes that'll be rendered automatically to DOM nodes when they're added to DOM with library's own DOM utilities.

The lib handles element attributes as is and does not do any camelCase to hyphenated conversion to them. Also some namespaced attributes are supported by default.

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

### Namespace attributes

Supported attribute namespaces by default are these:

```js
{
  svg: '2000/svg',
  xlink: '1999/xlink',
  xmlns: '2000/xmlns/',
}
```

If namespace doesn't start with http, it will be prefixed with `http://www.w3.org/`. You can extend this support by overriding window.\_\_namespaces or by modifying the namespace object. Namespaced attribute will first be splitted in half and if the second part has a own namespace, it will be used and otherwise the attribute prefix will be used as searched namespace key.

## Polyfills

This lib uses NodeList.forEach, Array.from and Promise (if "wait" prefixed utils are used) polyfills if [browserlist config](https://github.com/browserslist/browserslist) contains `ie 11`.

## DOM Utilities for queries

### pollQuerySelector

Type `(selector: string | Selector, callback: (node: HTMLElement) => void, wait?: number = 5000) => void`

Runs given query selector for every 100ms until the wait timeout (ms) has passed and calls the callback if selector returns something.

### pollQuerySelectorAll

Type `(selector: string | Selector, callback: (nodes: HTMLElement[]) => void, wait?: number = 5000) => void`

Runs given query selector for every 100ms until the wait timeout (ms) has passed and calls the callback if selector returns something.

### createSelector (alias cs)

Type `(domNode: HTMLElement, selector: string) => Selector`

Creates a selector that can be used e.g. inside of another pollQuerySelector. This is useful if you don't want to use document as a selector scope.

```js
import { createSelector, pollQuerySelector } from 'a-b-doer';

// Poll .selector class in document scope
pollQuerySelector('.selector', (target) => {
  // Do something
  // ...
  // Poll img element in .selector class scope
  pollQuerySelector(createSelector(target, 'img'), (img) => {
    // Do something with the img
  });
});
```

### waitElement

Type `(selector: string | Selector, timeout?: number = 5000) => Promise<HTMLElement>`

Returns a promise which will be resolved if given selector is found. It runs the dom query every 100ms until the timeout (ms) has passed.

Note: polyfills Promise automatically

```js
import { waitElement } from 'a-b-doer';

(async () => {
  // Wait 5 seconds for element to be visible in the DOM
  const node = await waitElement('.foo');
  if (node) {
    console.log(node.attributes, node.parentElement);
  }
})();

// or without async/await
waitElement('.foo').then(function (node) {
  console.log(node.attributes, node.parentElement);
});
```

### waitElements

Type `(selector: string | Selector, timeout?: number = 5000) => Promise<NodeListOf<HTMLElement> | []>`

Same as waitElement, but resolved value is always an array.

Note: polyfills Promise automatically

```js
import { waitElements } from 'a-b-doer';

(async () => {
  // Always an array
  const nodes = await waitElements('.foo');
  nodes.forEach((node) => {
    console.log(node.attributes, node.parentElement);
  });
})();

// or without async/await
waitElements('.foo').then(function (nodes) {
  nodes.forEach((node) => {
    console.log(node.attributes, node.parentElement);
  });
});
```

### waitFor

Type `(() => any, timeout?: number = 5000) => Promise<any | undefined>`

Returns a promise which will be resolved if given function returns truthy value. It calls the function every 100ms until the timeout (ms) has passed.

Note: polyfills Promise automatically

```js
import { waitFor } from 'a-b-doer';

(async () => {
  // Wait 10 seconds for window variable to be set.
  const someLazyVar = await waitFor(() => window.someLazyVar, 10000);
  // Do something with the lazy variable. Return value is undefined if the window variable is not found in given time frame.
  console.log(someLazyVar);
})();

// or without async/await
waitFor(() => window.someLazyVar, 10000).then(function (someLazyVar) {
  console.log(someLazyVar);
});
```

### setDefaultTimeout

Type `(timeout: number) => void`

Sets the default timeout for all poll/wait dom utilities (default timeout is 5000 ms)

### setDefaultPollDelay

Type `(timeout: number) => void`

Sets the default delay between polls for all poll/wait dom utilities (default delay is 100 ms)

## DOM Utilities for adding an element

The lib exports some helpers for adding the created element to dom. Those helpers tries to make sure that there would not be duplicate elements with same data-o attribute (created from test path or can be provided in buildspec file with id property)

### append

Inserts JSX or DOM node after the last child of given parent DOM node

### prepend

Inserts JSX or DOM node before the first child given parent DOM node

### insertBefore

Inserts JSX or DOM node in the children list of given target's parent, just before the target

### insertAfter

Inserts JSX or DOM node in the children list of given target's parent, just after the target

## Hooks

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

Effect hook that'll be called after component render. If useEffect call returns a function, it will be called when component leaves from DOM (like in preact).
If component is so called root component and has either a return value in useEffect or componentWillUnmount method, it will be called when the root element was removed from DOM (by any interaction). All sub components has the same functionality but the DOM node removal must happen by some component logic in parent components.

```js
import { append } from 'a-b-doer';
import { useEffect } from 'a-b-doer/hooks';

const SomeFunctionalComponent = (props) => {
  useEffect({} => {
    console.log("Do something when element was added to DOM.")
    return () => {
      console.log("Do something when element was removed from DOM.")
    }
  }, [])

   useEffect({} => {
    console.log("Do something when foo changes.")
  }, [props.foo])

  return <div>Foo</div>
}

append(
  <SomeFunctionalComponent ref={componentRef} foo={1} />
  document.body
);
```

### useState

State hook for creating stateful values. This hook retuns a stateful value and a function to update it (like in preact).

```js
import { append } from 'a-b-doer';
import { useState } from 'a-b-doer/hooks';

const SomeFunctionalComponent = (props) => {
  const [value, setValue] = useState(0);
  return <a onClick={() = setValue(value + 1)}>Click {value}</a>
}

append(
  <SomeFunctionalComponent ref={componentRef} foo={1} />
  document.body
);
```

## buildspec.json usage

These settings can also be used to override settings from global config.

### url

Type `string | Array<string>`

Web page url(s) for the test. If this is an array, the first proper url will be the main url which is opened when the code changes. Puppeteer will watch navigation events for these urls and load the assets when the url matches one of these. URL can also be RegExp like string which starts and ends with `/`. RegExp url cannot be the only url.

### entry

Type `string` (optional)

Entry file for Vite. Can be at least js or scss file.

### buildDir

Type `string` (optional)

Default `.build`

Output directory for Vite.

### entry

Type `string` (optional)

Entry file for Vite. Can be at least js or scss file.

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

### chunks

Type `boolean`

Default `false`

Enabled support of manual code splitting and produces chunks in ES module format. Following example creates two chunks where there's the lib code in one chunk and all component code in another. Note, chunking requires an export for the main code. It can be default or named. If there's both, the default export will be used otherwise the first named export.

```js
import { append, pollQuerySelector, waitElement } from 'a-b-doer';

export default async () => {
  pollQuerySelector('#wrapper', (target) => {
    import('./src/TestComponent').then(({ default: TestComponent }) => {
      append(<TestComponent />, target);
    });
  });

  // OR

  const target = await waitElement('#wrapper');
  const { default: TestComponent } = await import('./src/TestComponent');
  append(<TestComponent />, target);
};
```

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

### features

Type `Object` (optional)

Default `{ classes: true, className: true, namespace: true, jsx: 'auto', hooks: 'auto' }`

- classes: Support class component syntax
- className: Populate className with class prop and class prop with className
- namespace: Support namespace attributes and elements. Some namespaces are defined by default
- jsx: Support jsx syntax
- hooks: Support functional component hooks, e.g. useState
- extendedVnodes: Support custom types for JSX VNodes, those are DOM Element and HTML string

You can manually control which parts of the code should be left out by terser on minification. Supported options are listed above, but only `jsx` and `hooks` supports also `auto` mode which means that their values are determined by the usage. Setting some feature to `false` will tell to terser that those code blocks are dead and can be dropped. Setting some feature to `true` will always include those codes to the bundle.

---

### Example buildspec.json

```json
{
  "url": ["https://www.columbiaroad.com", "/https?:\\/\\/www\\.columbiaroad\\.com/"],
  "modules": false
}
```

## abd.config.json usage

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

### toolbar

Type `boolean | (page: puppeteer.Page, config: a-b-doer.config, initial: boolean) => string` (optional)

Default `false`

Shows closable toolbar on bottom of the screen. Toolbars contains useful utils like page screenshot. You can add custom html to the toolbar by defining this as a function which returns a HTML string.

### browserArgs

Type `string[]` (optional)

Default `[]`

Extra browser args for Puppeteer

### Example abd.config.json

```json
{
  "browser": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "userDataDir": "./puppeteer"
}
```

### modules

Type `boolean | (id: string) => boolean` (optional)

Default `true`

Load style files as modules. When enabled, all style files with `global.` in filename will be loaded as "global" (without hashed properties)

### Advanced example config.js with custom bundler options

```js
import fooPlugin from 'vite-foo-plugin';
import { extendConfig, PluginsPattern } from 'a-b-doer/bundler';

/*
Supported plugins for pattern match are currently:
a-b-doer:preact-debug
a-b-doer:css-entry-plugin
a-b-doer:css-modules
a-b-doer:css-modules-serve
replace
replace2
vite-plugin-svgr

Note, changing the configuration for these plugins might break something.
*/

export default {
  browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  userDataDir: './puppeteer',
  exclude: ['**/components/**/*', '**/src/**/*'],
  // Override vite config
  bundler: {
    // Add extra entry to alias config
    resolve: extendConfig((config = {}) => ({
      ...config,
      alias: [{ find: 'some-library', replacement: 'some-other-library' }, ...(config.alias || [])],
    })),
    plugins: extendConfig((plugins) =>
      new PluginsPattern(plugins) // or PluginsPattern.create(plugins)
        // Add extra entries to replace plugin
        .match({ name: 'replace' }, ({ plugin, options }) =>
          plugin({
            ...options,
            values: {
              ...options.values,
              'process.env.SOME': 2,
              '##OTHER##': '2',
            },
          })
        )
        // Remove a default plugin
        .match({ name: 'preact-debug' }, () => null),
        // Add extra input plugin to Vite configuration
        .concat(fooPlugin({ foo: 1 }))
    ),
    output: {
      // Some super options for bundler output
    },
  },
};
```

#### Hashed file names

You can turn on hashed file names by setting bundler option `{ output: { entryFileNames: "[name].[hash].js" } }`. `assetFileNames` option will be same as `entryFileNames` if not explicitly set to something else so both js and css file names will be in the format set by `entryFileNames`.

If A/B Doer finds entryFileNames option with a hash tag, it will clear the build directory before each build.

## Events

### onBefore

Type `(page: Page) => void` (optional)

Run an async function after the page is created and before any variant codes or events has been created. This is the correct place to attach own listeners to the page.

### onLoad

Type `(page: Page) => void` (optional)

Run an async function after the page has loaded with the variant asset code. This will be run after `page.goto` has finished loading and just before taking the screenshot.

### Example

```js
module.exports = {
  url: 'https://example.com',
  // Assign custom page events before navigation.
  onBefore: async (page) => {
    page.on('domcontentloaded', () => console.log('domcontentloaded was loaded'));
  },
  // Check element count after the page has finished loading with the variant asset code.
  onLoad: async (page) => {
    const foo = await page.evaluate(() => document.querySelectorAll('.foo').length);
  },
};
```

# Screenshots

## config.screenshot

Type `Object` (optional)

Following options to control Puppeteer before taking the screenshots.

### waitFor

Type `number | string | function` (optional)

Tell Puppeteer to wait something before taking the screenshot.

### waitForOptions

Type `Object` (optional)

Puppeteer waitFor<Function|Timeout|Selector> function options, see https://pptr.dev/#?product=Puppeteer&version=v11.0.0&show=api-pagewaitforselectororfunctionortimeout-options-args

### type

Type `string` (optional)

Specify screenshot type, can be either jpeg, png or webp. Defaults to 'png'.

### quality

Type `number` (optional)

The quality of the image, between 0-100. Not applicable to png images.

### fullPage

Type `boolean` (optional)

Default `true`

When true, takes a screenshot of the full scrollable page.

### clip

Type `Object` (optional)

An object which specifies clipping region of the page. Should have the following fields:

- x `number` x-coordinate of top-left corner of clip area
- y `number` y-coordinate of top-left corner of clip area
- width `number` width of clipping area
- height `number` height of clipping area

### omitBackground

Type `boolean` (optional)

Hides default white background and allows capturing screenshots with transparency. Defaults to false.

### encoding

Type `string` (optional)

The encoding of the image, can be either base64 or binary. Defaults to binary.

### captureBeyondViewport

Type `boolean` (optional)

When true, captures screenshot beyond the viewport. Whe false, falls back to old behaviour, and cuts the screenshot by the viewport size. Defaults to true.

## Screenshot events

### onBefore

See events.onBefore

Extra onBefore event for screenshots. Will be runned after the main onBefore

### onLoad

See events.onLoad

Extra onLoad event for screenshots. Will be runned after the main onLoad

### Example buildspec.js with screenshot options

```js
import gobalConfig from '../abd.config.js';

export default {
  browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  userDataDir: './puppeteer',
  onLoad: async (page) => {
    console.log('Do something on preview and on screenshot');
  },
  screenshot: {
    ...gobalConfig.screenshot,
    waitFor: 1000,
    onLoad: async (page) => {
      console.log('Do this only on screenshot');
      gobalConfig.screenshot.onLoad(page);
      await page.evaluate(() => {
        document.querySelectorAll('.something').forEach((node) => node.remove());
      });
    },
  },
};
```

## Screenshot cli commands

- `--build or -b` Force rebuild, otherwise already built bundle will be used (if there is one).
- `--url="https://example.com"` or `--url=1` or `-u "https://example.com"` Force specific url. If the value is a number, puppeteer will use url found from that index in buildspec url array.
- `--name=someName` or `-n someName` Name for the screenshot. It will be part of the screenshot image name. Default value is the entry file name with an extension.
- Any option from screenshot config can be overridden by cli command argument, e.g. `--waitFor=1000`
