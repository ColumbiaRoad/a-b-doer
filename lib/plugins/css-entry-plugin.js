import path from 'path';

export function cssEntryPlugin() {
	let config;

	return {
		apply: 'build',
		enforce: 'post',
		name: 'a-b-doer:css-entry-plugin',
		configResolved(_config) {
			config = _config;
		},
		async renderChunk(code) {
			const intro = config.build?.rollupOptions?.output?.intro;
			const vityStyleVar = 'var __vite_style__';
			// Manually alter __vite_style__ declaration because it doesn't work well with into.
			// Move possible intro to be defined before vite style variable
			if (intro && code.includes(vityStyleVar)) {
				code = code.replace(intro, '').replace(vityStyleVar, intro + vityStyleVar);
			}
			// Inject dataset attribute to Vite's style tag
			return code.replace(
				'__vite_style__.textContent',
				`__vite_style__.dataset.id="${config.abConfig.TEST_ID || ''}";__vite_style__.textContent`
			);
		},
		async generateBundle(opts, bundle) {
			const { abConfig } = config;

			const bundleKeys = Object.keys(bundle);
			const jsAssets = bundleKeys.filter(
				(i) =>
					bundle[i].type == 'chunk' &&
					bundle[i].fileName.match(/.[cm]?js$/) != null &&
					!bundle[i].fileName.includes('polyfill')
			);

			// Support style entries
			if (!jsAssets[0] && bundleKeys[0] && abConfig.stylesOnly) {
				// With styles only and extract css, remove the js main chunk
				if (abConfig.extractCss || abConfig.stylesOnly) {
					const mainKey = bundleKeys[0];
					// Delete JS bundle
					delete bundle[mainKey];
					// Rename style bundle
					if (mainKey.endsWith('.css')) {
						bundle[bundleKeys[1]].fileName = mainKey;
						bundle[bundleKeys[1]].name = mainKey;
					}
				}
				// Create a proper javascript file from the css chunk
				else {
					const newKey = `${path.basename(bundleKeys[0], '.css')}.js`;
					bundle[newKey] = bundle[bundleKeys[0]];
					bundle[newKey].fileName = newKey;
					delete bundle[bundleKeys[0]];
					jsAssets[0] = newKey;
				}
			}
		},
	};
}
