type ConfigOption = Record<string, any> | undefined;

/**
 * Wrapper function for extending buildspec root or bundler properties.
 * @param callback Callback function which will be called with all config properties
 */
export function extendConfig(callback: (prevOptions: ConfigOption) => ConfigOption): ConfigOption;
