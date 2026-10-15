import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile();

export const MODEL = "deepseek/deepseek-v4.1-flash";
