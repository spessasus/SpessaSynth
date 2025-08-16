import path from "path";
import fs from "fs/promises";
import { type ConfigFile, DEFAULT_CONFIG_FILE } from "./saved_settings.ts";
import { fillWithDefaults } from "../js/utils/fill_with_defaults.ts";

const configPath = path.join(import.meta.dirname, "./config.json");

export class LocalEditionConfig {
    public readonly config: ConfigFile;

    private constructor(conf: ConfigFile) {
        this.config = conf;
    }

    public static async initialize(): Promise<LocalEditionConfig> {
        let configJSON: string;
        try {
            configJSON = await fs.readFile(configPath, "utf-8");
        } catch {
            console.info("Unable to read the config file, creating a new one");
            const c = new LocalEditionConfig(DEFAULT_CONFIG_FILE);
            await c.flush();
            return c;
        }
        try {
            const conf = JSON.parse(configJSON) as Partial<ConfigFile>;
            return new LocalEditionConfig(
                fillWithDefaults(conf, DEFAULT_CONFIG_FILE)
            );
        } catch (e) {
            console.warn("Invalid config file:", e);
            return new LocalEditionConfig({ ...DEFAULT_CONFIG_FILE });
        }
    }

    public async flush() {
        await fs.writeFile(configPath, JSON.stringify(this.config), "utf-8");
    }
}
