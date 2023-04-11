/**
 * Wrapper function for extending buildspec root or bundler properties.
 * @param callback Callback function which will be called with all config properties
 */
export function extendConfig(callback: (prevOption: any) => any): any;

/**
 * Creates a plugins array that has pattern matching function for changing plugin properties
 * @param plugins Array of plugin functions
 */
export class PluginsPattern<T extends Plugin> extends Array<T> {
	static create(items: T): PluginsPattern<T>;
	match(
		match: Record<string, any>,
		callback: (params: { plugin: Plugin; options: Record<string, any> }) => Plugin | null
	): PluginsPattern<T>;
}
