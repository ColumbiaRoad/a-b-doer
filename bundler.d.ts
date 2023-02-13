/**
 * Wrapper function for extending buildspec root or bundler properties.
 * @param callback Callback function which will be called with all config properties
 */
export function extendConfig(callback: (prevOption: any) => any): any;

type Plugin = (...args: any[]) => any;

type PluginsPattern = Plugin[] & {
	match(
		match: Record<string, any>,
		callback: (params: { plugin: Plugin; options: Record<string, any> }) => Plugin | null | Record<string, any>
	): PluginsPattern;
};
export function pluginsPattern(plugins: Plugin[]): PluginsPattern;
