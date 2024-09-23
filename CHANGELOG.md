# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [5.0.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v5.0.0...v5.0.1) (2024-09-23)

## [5.0.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v4.1.0...v5.0.0) (2024-09-06)

### ⚠ BREAKING CHANGES

Config system has been majorly rewritten and the syntax is now different.

Old bundler system Rollup has been replaced with Vite which means the bundler configuration syntax is not different. Vite also uses Rollup on build releases so some of possible old Rollup configuration could be possible to use in `build.rollupOptions` property.

- Dev toolbar is now inside of a shadow dom

### Features

- Vite as bundler

## [4.1.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v4.0.0...v4.1.0) (2022-10-13)

### Features

- New utils and tweaks ([#32](https://github.com/ColumbiaRoad/a-b-doer/issues/32)) ([768a97b](https://github.com/ColumbiaRoad/a-b-doer/commit/768a97b8b507650e064806e62bc6ca441345aaeb))

### Bug Fixes

- Upgraded deps ([e15677a](https://github.com/ColumbiaRoad/a-b-doer/commit/e15677a277e5be9956e2af7254f22ef0d1174e49))

## [4.0.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v3.1.2...v4.0.0) (2022-06-16)

### ⚠ BREAKING CHANGES

- Poll utils have now the same timeout as wait utils, 5000ms
  Wait utils no longer throws an error on timeout aka calls a promise reject but for now on they return a sane result that must be validated in the code
  waitFor evaluates for any value that is not undefined. Previous check was a truthy check
- Swithed to SystemJS because AMD output wasn't consistent with larger bundles.
  Dropped injection of own chunk loader
- Make watch faster by skipping bundle write and by reducing build delay

### Features

- Added script loading support for the amd loader ([c795f6d](https://github.com/ColumbiaRoad/a-b-doer/commit/c795f6dc6e0e19419e06c6078c165a0822e53f52))
- Configurable timeout for dom utilities ([04d74ee](https://github.com/ColumbiaRoad/a-b-doer/commit/04d74ee51d288a17ecec48ba440f577ab01d95d8))
- Use esbuild plugin for ts bundling instead of typescript plugin ([#29](https://github.com/ColumbiaRoad/a-b-doer/issues/29)) ([57960ab](https://github.com/ColumbiaRoad/a-b-doer/commit/57960abb61dc118bf006628e4d65d9f925718f32))
- Toolbar for development ([72d7cba](https://github.com/ColumbiaRoad/a-b-doer/commit/72d7cbaea13c1ad05cb6a2d1d2c73f17860135ff)), closes [#30](https://github.com/ColumbiaRoad/a-b-doer/issues/30)

### Bug Fixes

- AMD resolve fixes ([a7e8ad6](https://github.com/ColumbiaRoad/a-b-doer/commit/a7e8ad603b0e8f2ea54a5c56f6500e3044969090))
- preact/debug stopped working, use devtools ([4a09b37](https://github.com/ColumbiaRoad/a-b-doer/commit/4a09b37debb3305cc0a1ec4ba11da8a71fafe2ee))
- Workaround for the cases where page.goto does not complete and reload happens ([899f665](https://github.com/ColumbiaRoad/a-b-doer/commit/899f665b353a65e42e1782161e8b4330d86f32b0))

### [3.1.2](https://github.com/ColumbiaRoad/a-b-doer/compare/v3.1.0...v3.1.2) (2022-03-10)

### Bug Fixes

- Clean previous assets from dom on history changestate event ([ecd263a](https://github.com/ColumbiaRoad/a-b-doer/commit/ecd263a512ea49fc17ed31916c3386f938edd070))
- History change events were broken and replace state wasn't implemented ([c332b00](https://github.com/ColumbiaRoad/a-b-doer/commit/c332b00b40d3d10a1e6c791c47f5fba7f49e0516))
- Less error prone checker for test urls ([8616cf7](https://github.com/ColumbiaRoad/a-b-doer/commit/8616cf7468a119c2de5fc3ad1d8ad1080ea89cfc))

### [3.1.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v3.1.0...v3.1.1) (2022-02-21)

### Bug Fixes

- Added missing import ([5eb0f34](https://github.com/ColumbiaRoad/a-b-doer/commit/5eb0f3448befe5f1b24eaf406c6b284dccf5b8dc))

### Bug Fixes

- Clean previous assets from dom on history changestate event ([ecd263a](https://github.com/ColumbiaRoad/a-b-doer/commit/ecd263a512ea49fc17ed31916c3386f938edd070))
- History change events were broken and replace state wasn't implemented ([c332b00](https://github.com/ColumbiaRoad/a-b-doer/commit/c332b00b40d3d10a1e6c791c47f5fba7f49e0516))
- Less error prone checker for test urls ([8616cf7](https://github.com/ColumbiaRoad/a-b-doer/commit/8616cf7468a119c2de5fc3ad1d8ad1080ea89cfc))

## [3.1.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v3.0.1...v3.1.0) (2022-02-15)

### ⚠ BREAKING CHANGES

- Use ES modules everywhere

### Features

- Added some useful events ([1b7cea8](https://github.com/ColumbiaRoad/a-b-doer/commit/1b7cea83148af4165000ef9284e540084ab88173))
- Allow features to be left out ([6b3244e](https://github.com/ColumbiaRoad/a-b-doer/commit/6b3244e30dd3085fe12d1797ed861e84b28b6efe))
- Even smaller bundles with arrow functions. Added possibility to drop className support ([6bd0d55](https://github.com/ColumbiaRoad/a-b-doer/commit/6bd0d550d09de6d2ae581728435498bbbadf7672))
- Extra options for waiting and evaluating functions before screenshots ([0c62421](https://github.com/ColumbiaRoad/a-b-doer/commit/0c62421496d778b500c10d40c3eebfbaf8f913d8))
- Use ES modules everywhere ([8028275](https://github.com/ColumbiaRoad/a-b-doer/commit/8028275b57a30fea66b98d53fe21c3f20fbbdec3))

### Bug Fixes

- boolean values for form elements, fixed patching ([c344dc8](https://github.com/ColumbiaRoad/a-b-doer/commit/c344dc89078ebace625d9b498a5231766eb256dd))
- Clear all previous listeners when opening the page again, stay on current page on reload if the url is one of the test urls ([461bce6](https://github.com/ColumbiaRoad/a-b-doer/commit/461bce67854eccf21e22d338589e1d1e7b99e2d1))
- Do not treeshake module side effects because it breaks polyfills, return the dom node from render call ([1e6d2bd](https://github.com/ColumbiaRoad/a-b-doer/commit/1e6d2bd5a7ec0f7682ffff52eee6114871b597dc))
- Fixed major flaws from rendering/dom logic. ([6f5d950](https://github.com/ColumbiaRoad/a-b-doer/commit/6f5d950b26b9dc271d8970bb52babe3a6f9cc825))
- Fixed typings to match actual return values ([f2b1755](https://github.com/ColumbiaRoad/a-b-doer/commit/f2b17550d96c58a29fb72f5a4a067b54fe9248c4))
- Possible fix for navigation timeout error ([56af062](https://github.com/ColumbiaRoad/a-b-doer/commit/56af062f06aa72d46ecdbdcaedfd7f01d0bb5d2f))
- Windows file path support ([c492277](https://github.com/ColumbiaRoad/a-b-doer/commit/c4922770cb01328128232133383bbf1673a4abc5))

### [3.0.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v3.0.0...v3.0.1) (2021-12-22)

### Bug Fixes

- Better clearing for previous nodes ([a9e10aa](https://github.com/ColumbiaRoad/a-b-doer/commit/a9e10aaae7685c8f1c84af1bdeabca2abbec2136))
- Fixed element re-order bug. ([951238c](https://github.com/ColumbiaRoad/a-b-doer/commit/951238cddf8f390053afaceb462abc6adf43ef48))

## [3.0.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v2.0.0...v3.0.0) (2021-12-10)

### ⚠ BREAKING CHANGES

- class prop should overrule className
- Removed EJS support (less npm audit errors)
- Logic change from DOM nodes to custom nodes that needs to be rendered to DOM Nodes.

### Features

- Basic attribute namespace support ([a0a0707](https://github.com/ColumbiaRoad/a-b-doer/commit/a0a070738210ae71de06586443100dd50b452821))
- Chunks option ([7586170](https://github.com/ColumbiaRoad/a-b-doer/commit/7586170cdcc2a5779de53d58681245b249399294))
- class prop should overrule className ([2e304f0](https://github.com/ColumbiaRoad/a-b-doer/commit/2e304f07e7cc76cf0753e5f4bddcb2c31f3b541b))
- Custom activation event ([3472aa9](https://github.com/ColumbiaRoad/a-b-doer/commit/3472aa95746333e991b5f3d2acdafb5768ccd91d))
- dangerouslySetInnerHTML support ([324738c](https://github.com/ColumbiaRoad/a-b-doer/commit/324738ce4789e9d8472287a5e45ec98240e722e1))
- Logic change from DOM nodes to custom nodes that needs to be rendered to DOM Nodes. ([29fb1c8](https://github.com/ColumbiaRoad/a-b-doer/commit/29fb1c8577279ca120e6e297bdd790d07b4bf60e))
- Module typings ([819817f](https://github.com/ColumbiaRoad/a-b-doer/commit/819817f7545b172d0b84ffa5bef5c8b4fd9ddb44))
- Print output sizes after build ([721c63b](https://github.com/ColumbiaRoad/a-b-doer/commit/721c63b64cf5a3de98f4ca3cf77cb94e1c4df884))
- Removed EJS support (less npm audit errors) ([24bfa1f](https://github.com/ColumbiaRoad/a-b-doer/commit/24bfa1faac3d1a4f17f9c94cbbb833b31a3bac21))
- Typescript support ([e1e9978](https://github.com/ColumbiaRoad/a-b-doer/commit/e1e9978727fdade9abdad38d7e922c46b0bd1988))

### Bug Fixes

- Allow HTML element as VNode type ([96f6d53](https://github.com/ColumbiaRoad/a-b-doer/commit/96f6d5377402ad574948224a31e517dd95a736b1))
- Better flatten for nested array children. ([7db36bc](https://github.com/ColumbiaRoad/a-b-doer/commit/7db36bc3937ecd2d911250bc768c6f4a9f35c201))
- Fixed typos, forced "no comments" ([6c8f463](https://github.com/ColumbiaRoad/a-b-doer/commit/6c8f463fc3432b1e50807d4a29178e7364badd19))
- Moved probably test related alias from main to test config ([5c7b5dd](https://github.com/ColumbiaRoad/a-b-doer/commit/5c7b5ddb81acd680ebf8dd2e5039a3cab51656aa))
- Path for test id hash was too short and ids clashed ([31d2dfb](https://github.com/ColumbiaRoad/a-b-doer/commit/31d2dfbe7a5baaa0e0f2c63b509fdb0913e79e9e))
- Remove class component from dom, reduced bundle size :D ([3bd0f15](https://github.com/ColumbiaRoad/a-b-doer/commit/3bd0f152031e145f32fbc9bf6c46b3661f71c443))
- Update component props on update (duh) ([3913e73](https://github.com/ColumbiaRoad/a-b-doer/commit/3913e73a87bca74d7d8016c63b6a31c996dd38ba))

## [2.0.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.4.1...v2.0.0) (2021-10-05)

### ⚠ BREAKING CHANGES

- In watch mode the output is not minified if not explicitly specified

### Features

- Hashed file name support. Support also bundlespec.js ([066335d](https://github.com/ColumbiaRoad/a-b-doer/commit/066335d5da3b21e569523edc6c3dc1dcea8b0ea6))
- Minify is tied to watch mode by default ([e760c61](https://github.com/ColumbiaRoad/a-b-doer/commit/e760c6173a096a41073d1a5bbe6285b2401ea96e))
- Possibility to control if styles should be added automatically, basic support for custom bundler output options ([30a4e82](https://github.com/ColumbiaRoad/a-b-doer/commit/30a4e82c8051d10cd162198ac19616a9737cf75e))
- Preact.debug module, faster bundle time without synced file access ([3ff885e](https://github.com/ColumbiaRoad/a-b-doer/commit/3ff885ed48518edebd0555bc39e6f542e8ce995e))
- Support custom build directory ([e0335ad](https://github.com/ColumbiaRoad/a-b-doer/commit/e0335ad22193a0310ff2925729898255f1853185))
- Support source maps (enabled by default) ([5a3c2c8](https://github.com/ColumbiaRoad/a-b-doer/commit/5a3c2c81614a5954bac17ea163961b791faa00e9))
- Watch also buildspec files ([dc6a32d](https://github.com/ColumbiaRoad/a-b-doer/commit/dc6a32d9c7790ee3520b5e9325cdc1d6d1303e44))

### Bug Fixes

- Assign env variables more globally ([07163cf](https://github.com/ColumbiaRoad/a-b-doer/commit/07163cf1c8489d49ce622026e94d2421513894d0))
- Correct way to check preact entry. ([f08120f](https://github.com/ColumbiaRoad/a-b-doer/commit/f08120f651e74a85de5d29c094511fd1b466fab2))
- Force bundle IIFE to return boolean (for CDN) ([0ea74cc](https://github.com/ColumbiaRoad/a-b-doer/commit/0ea74cca0a85fcea1d6269d3616032e2837b5043))
- Parse env variable before using ([2cbc7c1](https://github.com/ColumbiaRoad/a-b-doer/commit/2cbc7c1aff7b2744f2b5239397b1ca8590cdd93c))

### [1.4.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.4.0...v1.4.1) (2021-08-04)

### Bug Fixes

- Can't use plugins array as is with splice ([64b43a3](https://github.com/ColumbiaRoad/a-b-doer/commit/64b43a378e7ffd97637fe45e8b9716463270c86b))

## [1.4.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.3.0...v1.4.0) (2021-04-29)

### Features

- Component syntax and re-render support. ([6b98a0d](https://github.com/ColumbiaRoad/a-b-doer/commit/6b98a0d679bae5d6a0f0cb8871539e8ffafa32b8))
- Possibility to add default value for the ref ([754fe1f](https://github.com/ColumbiaRoad/a-b-doer/commit/754fe1fa739dcb54869d7b69de3586dc5c359865))
- Upgraded all dependencies ([925c9a3](https://github.com/ColumbiaRoad/a-b-doer/commit/925c9a37c1d3a69a775701929397686bfddfbc63))

### Bug Fixes

- Do not clear previous items with dom query ([d7a4b2d](https://github.com/ColumbiaRoad/a-b-doer/commit/d7a4b2d13ad5f13fbd7ccc3d72f663bb3fb55746))
- Husky scripts ([9e5805f](https://github.com/ColumbiaRoad/a-b-doer/commit/9e5805f894ea0b1068d0f8d2676ca6bf3c1cd6f6))
- Keep props param up-to-date ([72d7643](https://github.com/ColumbiaRoad/a-b-doer/commit/72d7643ce7345766b4222452c53cdb1fca1eb55a))
- Puppeteer page.exposeFunction fix. ([6fc2a3f](https://github.com/ColumbiaRoad/a-b-doer/commit/6fc2a3ff5c01dc7a81bfb01790626d65043bfd00))
- Re-built puppeteer.js file ([3fda75c](https://github.com/ColumbiaRoad/a-b-doer/commit/3fda75c9df4dcecf22da13bba260446c4bab1cbb))
- Return the \_pageBindings horror ([91ac001](https://github.com/ColumbiaRoad/a-b-doer/commit/91ac0012d515c1c29794d70a148fdc108f781e61))
- Set isOneOfBuildspecUrl again when page loads ([26f7a47](https://github.com/ColumbiaRoad/a-b-doer/commit/26f7a47749d02c429853e670f961342b657b5cdf))
- Updated the lock file ([005d39f](https://github.com/ColumbiaRoad/a-b-doer/commit/005d39f30f7eccb19850327862e342f1481f25a9))
- Use exposeFunction when exposing functions to window context ([1424c0a](https://github.com/ColumbiaRoad/a-b-doer/commit/1424c0ab9f47ae72d647831737599b186aa5229e))

## [1.3.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.2.1...v1.3.0) (2021-03-17)

### Features

- insertAfter utility, test fixes, moar debug ([d98fda0](https://github.com/ColumbiaRoad/a-b-doer/commit/d98fda08f7396a984f60a3fdf61f541515822406))
- Optional clear for dom utils ([0d72de0](https://github.com/ColumbiaRoad/a-b-doer/commit/0d72de01b1d33cd454caf157fab6f0c8dd6ab790))
- Support regex urls ([46a2bb5](https://github.com/ColumbiaRoad/a-b-doer/commit/46a2bb55165b08fee06c4cd329761ddf26f0eb1d))

### Bug Fixes

- Fix for rollup plugin replace config ([60a6c9d](https://github.com/ColumbiaRoad/a-b-doer/commit/60a6c9d281e0a6fbb36fdbc2b7adc8251b443c09))
- Select the correct part of the regex url ([7812782](https://github.com/ColumbiaRoad/a-b-doer/commit/7812782979e8543064b225eef3c9ea79526a64d7))
- Unified class and className props ([b9b1f79](https://github.com/ColumbiaRoad/a-b-doer/commit/b9b1f796bff9a52e8d4a9b6cb5a64db914b85a9a))

### [1.2.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.2.0...v1.2.1) (2021-02-23)

### Bug Fixes

- Fixed clearing of previous new element ([4f72760](https://github.com/ColumbiaRoad/a-b-doer/commit/4f72760562887059edafa8123f5aa8c7ea49993b))
- parent was not defined ([e8360b6](https://github.com/ColumbiaRoad/a-b-doer/commit/e8360b6d154953223ddab90ae1d261bcbdbd62f7))
- querySelectorAll returns always truthy value ([6f7db8b](https://github.com/ColumbiaRoad/a-b-doer/commit/6f7db8bf11c685e59c08fadf98fb6991aadff1f0))

## [1.2.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.1.1...v1.2.0) (2021-02-10)

### Features

- Debugging, support multiple test urls ([9383227](https://github.com/ColumbiaRoad/a-b-doer/commit/938322705ab1ee0529754c8a818e9b19860668e5))

### Bug Fixes

- Allow installing of extensions. ([974d47d](https://github.com/ColumbiaRoad/a-b-doer/commit/974d47d75115cb835fbfb4fc9f505c64ca18edde))
- Chrome devtools should be open initially. ([e94cfd9](https://github.com/ColumbiaRoad/a-b-doer/commit/e94cfd916919f073be0df1fdc672a935d21c6940))
- Current url check and url change listener ([dfbca82](https://github.com/ColumbiaRoad/a-b-doer/commit/dfbca82d3c85ce698c6745c9247c47c70f6fa773))
- HistoryChanges detection should be optional. ([c5e95ce](https://github.com/ColumbiaRoad/a-b-doer/commit/c5e95ce1880e311f6824d8fbd81328fc90dcf346))
- Replace TEST_ENV env always ([115e163](https://github.com/ColumbiaRoad/a-b-doer/commit/115e1639cc9dc395d367c4d5eb027870756b9bc4))
- Screenshot should also be a "preview" ([fb0f401](https://github.com/ColumbiaRoad/a-b-doer/commit/fb0f40196b1031d5533a7a8d705158066749a8ba))
- Screenshot url could also be an array ([7515926](https://github.com/ColumbiaRoad/a-b-doer/commit/75159262ac523da6a984f866cc3369e04abc74aa))
- Use innerHTML instead of innerText ([c40e0d1](https://github.com/ColumbiaRoad/a-b-doer/commit/c40e0d1792608925fb51e65867663ba54ca29a9b))

### [1.1.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.1.0...v1.1.1) (2021-01-20)

### Bug Fixes

- Screenshot names should contain the entry ([7cbfc72](https://github.com/ColumbiaRoad/a-b-doer/commit/7cbfc727bec37028cd1f0a9a4583daf951c61b28))

## 1.1.0 (2021-01-19)

### Features

- possibility to alter bundler input config. ([69e2f33](https://github.com/ColumbiaRoad/a-b-doer/commit/69e2f3376afe0ea944bbe3f82ff43df07830f497))

### Bug Fixes

- accept only directories as buildspec paths ([6f621a9](https://github.com/ColumbiaRoad/a-b-doer/commit/6f621a9067a629923ce7d7aae262bf9ac4850ac3))
