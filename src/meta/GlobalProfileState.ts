import { z } from 'zod';
import * as fs from 'fs';

export const GlobalProfileSchema = z.object({
    metaCurrency: z.number().nonnegative().default(0),
    skillTrees: z.record(z.string(), z.number()).default({}), // e.g., 'miner_speed': 2
    accountMultipliers: z.record(z.string(), z.number()).default({}), // e.g., 'yield': 1.1
});

export type GlobalProfileType = z.infer<typeof GlobalProfileSchema>;

export class GlobalProfileState {
    private filePath: string;
    public data: GlobalProfileType;

    constructor(filePath: string) {
        this.filePath = filePath;
        this.data = this.load();
    }

    private load(): GlobalProfileType {
        try {
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(fileContent);
                return GlobalProfileSchema.parse(parsed);
            }
        } catch (e) {
            console.warn('[Meta] Failed to load or validate profile, starting fresh.');
        }
        return GlobalProfileSchema.parse({});
    }

    public save(): void {
        const validated = GlobalProfileSchema.parse(this.data);
        fs.writeFileSync(this.filePath, JSON.stringify(validated, null, 2), 'utf-8');
    }
}
