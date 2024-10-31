import { transformSync } from '@babel/core';
import { createFilter } from '@rollup/pluginutils';
import prefreshBabelPlugin from '@prefresh/babel-plugin';
import { URL } from 'url';
import path from 'path';

/** @returns {import('vite').Plugin} */
export function customJsxPrefreshPlugin(options = {}) {
	const __filename = new URL('', import.meta.url).pathname;

	let shouldSkip = false;
	const filter = createFilter(options.include, options.exclude);
	let config = {};

	return {
		name: 'a-b-doer:prefresh',
		configResolved(_config) {
			config = _config;
			shouldSkip = config.command === 'build' || config.isProduction;
		},
		async transform(code, id, options) {
			if (shouldSkip || !/\.(t|j)sx?$/.test(id) || id.includes('node_modules') || id.includes('?worker') || !filter(id))
				return;

			const parserPlugins = [
				'jsx',
				'classProperties',
				'classPrivateProperties',
				'classPrivateMethods',
				/\.tsx?$/.test(id) && 'typescript',
				...(options.parserPlugins || []),
			].filter(Boolean);

			const result = transform(code, id, parserPlugins);
			const hasReg = /\$RefreshReg\$\(/.test(result.code);
			const hasSig = /\$RefreshSig\$\(/.test(result.code);

			// Check if there are jsx refresh properties made by babel plugin. If not, use manual hmr which just re-injects the code
			if (!hasSig && !hasReg) {
				if (config.server?.hmr === false) return code;
				const entryImportPath = config.abConfig.entryFile.replace(process.cwd(), '');
				return `${code}
        if (import.meta.hot) {
          import.meta.hot.accept(() => {
            try {
							console.log("%cReloading A/B injection", "color: cyan; text-shadow: 1px 1px 1px #000", "${entryImportPath}");
							import('${entryImportPath}?${Date.now()}').then(mod => mod?.default?.());
            } catch (e) {
              self.location.reload();
            }
          });
        }`;
			}

			const prefreshCore = await this.resolve('@prefresh/core', __filename);

			const prelude = `
        ${'import'} ${JSON.stringify(prefreshCore.id)};
        ${'import'} { flush as flushUpdates } from "${path.join(
				config.abConfig.libDir,
				'lib',
				'plugins',
				'custom-prefresh-utils.js'
			)}";

        let prevRefreshReg;
        let prevRefreshSig;

        if (import.meta.hot) {
          prevRefreshReg = self.$RefreshReg$ || (() => {});
          prevRefreshSig = self.$RefreshSig$ || (() => (type) => type);

          self.$RefreshReg$ = (type, id) => {
            self.__PREFRESH__.register(type, ${JSON.stringify(id)} + " " + id);
          };

          self.$RefreshSig$ = () => {
            let status = 'begin';
            let savedType;
            return (type, key, forceReset, getCustomHooks) => {
              if (!savedType) savedType = type;
              status = self.__PREFRESH__.sign(type || savedType, key, forceReset, getCustomHooks, status);
              return type;
            };
          };
        }
        `.replace(/[\n]+/gm, '');

			if (hasSig && !hasReg) {
				return {
					code: `${prelude}${result.code}`,
					map: result.map,
				};
			}

			return {
				code: `${prelude}${result.code}
        if (import.meta.hot) {
          self.$RefreshReg$ = prevRefreshReg;
          self.$RefreshSig$ = prevRefreshSig;
          import.meta.hot.accept((m) => {
            try {
              flushUpdates();
            } catch (e) {
              self.location.reload();
            }
          });
        }
      `,
				map: result.map,
			};
		},
	};
}

const transform = (code, path, plugins) =>
	transformSync(code, {
		plugins: [[prefreshBabelPlugin, { skipEnvCheck: true }]],
		parserOpts: {
			plugins,
		},
		ast: false,
		sourceMaps: true,
		sourceFileName: path,
		configFile: false,
		babelrc: false,
	});
