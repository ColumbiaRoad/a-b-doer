export const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)($|\\?)`;
export const cssLangRE = new RegExp(cssLangs);
export const cssLangModuleRE = new RegExp(`\\.module${cssLangs}`);
export const cssLangGlobalRE = new RegExp(`\\.global${cssLangs}`);
export const isCSSRequest = (request) => cssLangRE.test(request);
export const isCSSModuleRequest = (request) => cssLangModuleRE.test(request);
export const isCSSGlobalRequest = (request) => cssLangGlobalRE.test(request);

/**
 * Plugin that enables style modules to all style files if A/B doer configuration setting `modules` is enabled
 */
export function cssModules() {
	let config;

	return {
		enforce: 'pre',
		name: 'a-b-doer:css-modules',
		configResolved(_config) {
			config = _config;
		},
		async resolveId(source, importer, options) {
			const convertToModule =
				!isCSSModuleRequest(source) &&
				!isCSSGlobalRequest(source) &&
				isCSSRequest(source) &&
				(config.abConfig.modules || (typeof config.abConfig.modules === 'function' && config.abConfig.modules(source)));

			if (convertToModule) {
				const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
				if (resolution?.id) {
					const parts = resolution.id.split('.');
					const ext = parts.pop();
					return `${resolution.id}${resolution.id.includes('?') ? '&' : '?'}.module.${ext}`;
				}
			}
		},
	};
}
