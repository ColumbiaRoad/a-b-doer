import { readFileSync } from 'fs';

/**
 * Plugin that enables style modules to all style files if A/B doer configuration setting `modules` is enabled
 */
export function cssModules() {
	let config;

	const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)($|\\?)`;
	const cssLangRE = new RegExp(cssLangs);
	const cssLangModuleRE = new RegExp(`\\.module${cssLangs}`);
	const isCSSRequest = (request) => cssLangRE.test(request);
	const isCSSModuleRequest = (request) => cssLangModuleRE.test(request);

	const modules = new Map();

	return {
		enforce: 'pre',
		name: 'a-b-doer:css-modules',
		configResolved(_config) {
			config = _config;
		},
		async resolveId(source, importer, options) {
			const convertToModule =
				!isCSSModuleRequest(source) &&
				isCSSRequest(source) &&
				(config.abConfig.modules || (typeof config.abConfig.modules === 'function' && config.abConfig.modules(source)));

			if (convertToModule) {
				const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
				if (resolution?.id) {
					const parts = resolution.id.split('.');
					const ext = parts.pop();
					const newId = parts.join('.') + '.module.' + ext;
					modules.set(newId, resolution.id);
					return newId;
				}
			}
		},
		load(id) {
			const realID = modules.get(id);
			if (realID) {
				return readFileSync(realID, { encoding: 'utf-8' }).toString();
			}
		},
	};
}
