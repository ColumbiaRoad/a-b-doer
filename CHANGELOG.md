# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.4.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.3.0...v1.4.0) (2021-04-29)


### Features

* Component syntax and re-render support. ([6b98a0d](https://github.com/ColumbiaRoad/a-b-doer/commit/6b98a0d679bae5d6a0f0cb8871539e8ffafa32b8))
* Possibility to add default value for the ref ([754fe1f](https://github.com/ColumbiaRoad/a-b-doer/commit/754fe1fa739dcb54869d7b69de3586dc5c359865))
* Upgraded all dependencies ([925c9a3](https://github.com/ColumbiaRoad/a-b-doer/commit/925c9a37c1d3a69a775701929397686bfddfbc63))


### Bug Fixes

* Do not clear previous items with dom query ([d7a4b2d](https://github.com/ColumbiaRoad/a-b-doer/commit/d7a4b2d13ad5f13fbd7ccc3d72f663bb3fb55746))
* Husky scripts ([9e5805f](https://github.com/ColumbiaRoad/a-b-doer/commit/9e5805f894ea0b1068d0f8d2676ca6bf3c1cd6f6))
* Keep props param up-to-date ([72d7643](https://github.com/ColumbiaRoad/a-b-doer/commit/72d7643ce7345766b4222452c53cdb1fca1eb55a))
* Puppeteer page.exposeFunction fix. ([6fc2a3f](https://github.com/ColumbiaRoad/a-b-doer/commit/6fc2a3ff5c01dc7a81bfb01790626d65043bfd00))
* Re-built puppeteer.js file ([3fda75c](https://github.com/ColumbiaRoad/a-b-doer/commit/3fda75c9df4dcecf22da13bba260446c4bab1cbb))
* Return the _pageBindings horror ([91ac001](https://github.com/ColumbiaRoad/a-b-doer/commit/91ac0012d515c1c29794d70a148fdc108f781e61))
* Set isOneOfBuildspecUrl again when page loads ([26f7a47](https://github.com/ColumbiaRoad/a-b-doer/commit/26f7a47749d02c429853e670f961342b657b5cdf))
* Updated the lock file ([005d39f](https://github.com/ColumbiaRoad/a-b-doer/commit/005d39f30f7eccb19850327862e342f1481f25a9))
* Use exposeFunction when exposing functions to window context ([1424c0a](https://github.com/ColumbiaRoad/a-b-doer/commit/1424c0ab9f47ae72d647831737599b186aa5229e))

## [1.3.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.2.1...v1.3.0) (2021-03-17)


### Features

* insertAfter utility, test fixes, moar debug ([d98fda0](https://github.com/ColumbiaRoad/a-b-doer/commit/d98fda08f7396a984f60a3fdf61f541515822406))
* Optional clear for dom utils ([0d72de0](https://github.com/ColumbiaRoad/a-b-doer/commit/0d72de01b1d33cd454caf157fab6f0c8dd6ab790))
* Support regex urls ([46a2bb5](https://github.com/ColumbiaRoad/a-b-doer/commit/46a2bb55165b08fee06c4cd329761ddf26f0eb1d))


### Bug Fixes

* Fix for rollup plugin replace config ([60a6c9d](https://github.com/ColumbiaRoad/a-b-doer/commit/60a6c9d281e0a6fbb36fdbc2b7adc8251b443c09))
* Select the correct part of the regex url ([7812782](https://github.com/ColumbiaRoad/a-b-doer/commit/7812782979e8543064b225eef3c9ea79526a64d7))
* Unified class and className props ([b9b1f79](https://github.com/ColumbiaRoad/a-b-doer/commit/b9b1f796bff9a52e8d4a9b6cb5a64db914b85a9a))

### [1.2.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.2.0...v1.2.1) (2021-02-23)


### Bug Fixes

* Fixed clearing of previous new element ([4f72760](https://github.com/ColumbiaRoad/a-b-doer/commit/4f72760562887059edafa8123f5aa8c7ea49993b))
* parent was not defined ([e8360b6](https://github.com/ColumbiaRoad/a-b-doer/commit/e8360b6d154953223ddab90ae1d261bcbdbd62f7))
* querySelectorAll returns always truthy value ([6f7db8b](https://github.com/ColumbiaRoad/a-b-doer/commit/6f7db8bf11c685e59c08fadf98fb6991aadff1f0))

## [1.2.0](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.1.1...v1.2.0) (2021-02-10)


### Features

* Debugging, support multiple test urls ([9383227](https://github.com/ColumbiaRoad/a-b-doer/commit/938322705ab1ee0529754c8a818e9b19860668e5))


### Bug Fixes

* Allow installing of extensions. ([974d47d](https://github.com/ColumbiaRoad/a-b-doer/commit/974d47d75115cb835fbfb4fc9f505c64ca18edde))
* Chrome devtools should be open initially. ([e94cfd9](https://github.com/ColumbiaRoad/a-b-doer/commit/e94cfd916919f073be0df1fdc672a935d21c6940))
* Current url check and url change listener ([dfbca82](https://github.com/ColumbiaRoad/a-b-doer/commit/dfbca82d3c85ce698c6745c9247c47c70f6fa773))
* HistoryChanges detection should be optional. ([c5e95ce](https://github.com/ColumbiaRoad/a-b-doer/commit/c5e95ce1880e311f6824d8fbd81328fc90dcf346))
* Replace TEST_ENV env always ([115e163](https://github.com/ColumbiaRoad/a-b-doer/commit/115e1639cc9dc395d367c4d5eb027870756b9bc4))
* Screenshot should also be a "preview" ([fb0f401](https://github.com/ColumbiaRoad/a-b-doer/commit/fb0f40196b1031d5533a7a8d705158066749a8ba))
* Screenshot url could also be an array ([7515926](https://github.com/ColumbiaRoad/a-b-doer/commit/75159262ac523da6a984f866cc3369e04abc74aa))
* Use innerHTML instead of innerText ([c40e0d1](https://github.com/ColumbiaRoad/a-b-doer/commit/c40e0d1792608925fb51e65867663ba54ca29a9b))

### [1.1.1](https://github.com/ColumbiaRoad/a-b-doer/compare/v1.1.0...v1.1.1) (2021-01-20)


### Bug Fixes

* Screenshot names should contain the entry ([7cbfc72](https://github.com/ColumbiaRoad/a-b-doer/commit/7cbfc727bec37028cd1f0a9a4583daf951c61b28))

## 1.1.0 (2021-01-19)


### Features

* possibility to alter bundler input config. ([69e2f33](https://github.com/ColumbiaRoad/a-b-doer/commit/69e2f3376afe0ea944bbe3f82ff43df07830f497))


### Bug Fixes

* accept only directories as buildspec paths ([6f621a9](https://github.com/ColumbiaRoad/a-b-doer/commit/6f621a9067a629923ce7d7aae262bf9ac4850ac3))
