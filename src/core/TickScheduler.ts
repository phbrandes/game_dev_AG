import { GameConfig } from './GameConfig.js';
import { GridEntity } from './GridEntity.js';

export class TickScheduler {
    private static instance: TickScheduler;

    private accumulatedTime: number = 0;
    private lastTime: number = 0;
    private isRunning: boolean = false;
    private currentTick: number = 0;

    private entities: Set<GridEntity> = new Set();

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
        
        // Sweep A: Inquiry/Handshake
        for (const entity of this.entities) {
            entity.sweepA();
        }

        // Sweep B: Physical memory commit
        for (const entity of this.entities) {
            entity.sweepB();
        }
    }

    public registerEntity(entity: GridEntity): void {
        this.entities.add(entity);
    }

    public removeEntity(entity: GridEntity): void {
        this.entities.delete(entity);
    }

    public getEntityAt(x: number, y: number): GridEntity | undefined {
        for (const entity of this.entities) {
            if (entity.position.x === x && entity.position.y === y) {
                return entity;
            }
        }
        return undefined;
    }

    public getCurrentTick(): number {
        return this.currentTick;
    }

    public reset(): void {
        this.accumulatedTime = 0;
        this.lastTime = 0;
        this.currentTick = 0;
        this.isRunning = false;
        this.entities.clear();
    }
}
