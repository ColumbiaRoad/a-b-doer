import { isCSSModuleRequest, isCSSRequest } from './css-modules-plugin';

/**
 * Plugin that enables HMR for all style modules
 */
export function cssModulesServe() {
	let config;

	const isModule = (id) =>
		(isCSSRequest(id) || isCSSModuleRequest(id)) &&
		(config?.abConfig?.modules || (typeof config?.abConfig?.modules === 'function' && config.abConfig.modules(id)));

	return {
		enforce: 'post',
		name: 'a-b-doer:css-modules-server',
		configResolved(_config) {
			config = _config;
		},
		apply: 'serve',
		transform(src, id) {
			if (isModule(id)) {
				return {
					code: `${src}\nimport.meta.hot.accept()`,
				};
			}
		},
		handleHotUpdate(context) {
			const { modules } = context;
			modules.forEach((module) => {
				if (isModule(module.id)) {
					module.isSelfAccepting = true;
				}
			});
		},
	};
}
