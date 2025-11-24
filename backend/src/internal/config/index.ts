import loadConfig from "./config.js";

export const config = loadConfig();

export type { Config, DatabaseConfig } from "./config.js";

export default config;