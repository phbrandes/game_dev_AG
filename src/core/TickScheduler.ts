import { GameConfig } from './GameConfig';

export class TickScheduler {
    private static instance: TickScheduler;

    private accumulatedTime: number = 0;
    private lastTime: number = 0;
    private isRunning: boolean = false;
    private currentTick: number = 0;

    private tickHandlers: Set<() => void> = new Set();

    private constructor() {}

    public static getInstance(): TickScheduler {
        if (!TickScheduler.instance) {
            TickScheduler.instance = new TickScheduler();
        }
        return TickScheduler.instance;
    }

    public start(initialTime: number): void {
        this.lastTime = initialTime;
        this.isRunning = true;
    }

    public stop(): void {
        this.isRunning = false;
    }

    public update(currentTime: number): void {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulatedTime += deltaTime;

        while (this.accumulatedTime >= GameConfig.TICK_STEP_MS) {
            this.executeTick();
            this.accumulatedTime -= GameConfig.TICK_STEP_MS;
        }
    }

    private executeTick(): void {
        this.currentTick++;
        for (const handler of this.tickHandlers) {
            handler();
        }
    }

    public registerHandler(handler: () => void): void {
        this.tickHandlers.add(handler);
    }

    public removeHandler(handler: () => void): void {
        this.tickHandlers.delete(handler);
    }

    public getCurrentTick(): number {
        return this.currentTick;
    }

    public reset(): void {
        this.accumulatedTime = 0;
        this.lastTime = 0;
        this.currentTick = 0;
        this.isRunning = false;
        this.tickHandlers.clear();
    }
}
