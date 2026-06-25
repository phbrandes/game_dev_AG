import { GridMap } from '../core/GridMap.js';

export class SessionContext {
    public activeGrid: GridMap | null = null;
    public runInventory: Record<string, number> = {};
    public waveCount: number = 0;
    public score: number = 0;
    public isCoreBreached: boolean = false;

    public reset(): void {
        this.activeGrid = null;
        this.runInventory = {};
        this.waveCount = 0;
        this.score = 0;
        this.isCoreBreached = false;
    }
}
