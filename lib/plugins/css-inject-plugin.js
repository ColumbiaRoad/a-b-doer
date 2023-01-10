import path from 'path';

export function cssInjectedByJsPlugin() {
	let cssToInject = '';
	let config;

	return {
		apply: 'build',
		enforce: 'post',
		name: 'a-b-doer:css-in-js-plugin',
		configResolved(_config) {
			config = _config;
		},
		async generateBundle(opts, bundle) {
			const { abConfig } = config;

			const bundleKeys = Object.keys(bundle);
			const cssAssets = bundleKeys.filter((i) => bundle[i].type == 'asset' && bundle[i].fileName.endsWith('.css'));
			const jsAssets = bundleKeys.filter(
				(i) =>
					bundle[i].type == 'chunk' &&
					bundle[i].fileName.match(/.[cm]?js$/) != null &&
					!bundle[i].fileName.includes('polyfill')
			);

			// Support style entries
			if (!jsAssets[0] && bundleKeys[0] && abConfig.stylesOnly) {
				// With styles only and extract css, remove the js main chunk
				if (abConfig.extractCss) {
					delete bundle[bundleKeys[0]];
				}
				// Create a proper javascript file from the css chunk
				else {
					const newKey = path.basename(bundleKeys[0], '.css') + '.js';
					bundle[newKey] = bundle[bundleKeys[0]];
					bundle[newKey].fileName = newKey;
					delete bundle[bundleKeys[0]];
					jsAssets[0] = newKey;
				}
			}

			if (!abConfig.extractCss) {
				const allCssCode = cssAssets.reduce((previousValue, cssName) => {
					const cssAsset = bundle[cssName];
					const result = previousValue + cssAsset.source;
					delete bundle[cssName];
					return result;
				}, '');

				if (allCssCode.length > 0) {
					cssToInject = allCssCode;
				}

				if (cssToInject) {
					const jsAsset = bundle[jsAssets[0]];

					const appCode = jsAsset.code;
					jsAsset.code =
						/* prettier-ignore */
						"!(function(){" +
						"var __a,__s,__f=function(){" +
							"if(__a){return;}" +
							"__a=1;" +
							"__s=document.createElement('style');__s.dataset.id='"+abConfig.TEST_ID+"',__s.innerHTML='" +
							cssToInject.replace(/([\r\n\s]+)/g, ' ').replace(/'/g, "\\'") +
							"';" +
							"document.head.appendChild(__s);" +
						"};" +
						(abConfig.appendStyles ? "__f();" : "window._addStyles=__f;") +
					"})();"
					+ appCode;
				}
			}
		},
	};
}
