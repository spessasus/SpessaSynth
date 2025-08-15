import path from "path";
import fs from "fs/promises";
import { type ConfigFile, DEFAULT_CONFIG_FILE } from "./saved_settings.ts";

const configPath = path.join(import.meta.dirname, "./config.json");

export class LocalEditionConfig {
    public readonly config: ConfigFile;

    private constructor(conf: ConfigFile) {
        this.config = conf;
    }

    public static async initialize(): Promise<LocalEditionConfig> {
        try {
            const configJSON = await fs.readFile(configPath, "utf-8");
            return new LocalEditionConfig(JSON.parse(configJSON) as ConfigFile);
        } catch (e) {
            console.warn("Invalid config file:", e);
            return new LocalEditionConfig({ ...DEFAULT_CONFIG_FILE });
        }
    }

    public async flush() {
        await fs.writeFile(configPath, JSON.stringify(this.config), "utf-8");
    }
}
