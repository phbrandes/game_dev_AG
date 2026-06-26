import { GridEntity } from '../core/GridEntity.js';
import { ItemPayload } from '../core/ItemPayload.js';
import { type Point2D, type UUID, Orientation, generateUUID } from '../core/Types.js';
import { TickScheduler } from '../core/TickScheduler.js';
import { GameConfig } from '../core/GameConfig.js';
import type { IPowerNode } from '../core/PowerGridManager.js';

export enum MinerState {
    IDLE,
    EXTRACTING,
    OUTPUT_BLOCKED
}

export class MinerEntity extends GridEntity implements IPowerNode {
    public state: MinerState = MinerState.IDLE;
    public powerRatio: number = 1.0;
    
    public extractionProgress: number = 0;
    public outputBuffer: ItemPayload | null = null;
    private canOutput: boolean = false;
    private oreType: string | null;

    constructor(id: UUID, position: Point2D, orientation: Orientation, oreType: string | null = null) {
        super(id, position, orientation);
        this.oreType = oreType;
        if (this.oreType) {
            this.state = MinerState.EXTRACTING;
        }
    }

    public getPowerDelta(): number {
        return -10; // consumes 10 power
    }

    public setPowerRatio(ratio: number): void {
        this.powerRatio = ratio;
    }

    public canAcceptItem(itemType: string): boolean {
        return false;
    }

    public transferItem(item: ItemPayload): void {
        throw new Error(`[Logistics] Miners cannot accept items.`);
    }

    private getNeighborPos(): Point2D {
        switch (this.orientation) {
            case Orientation.North: return { x: this.position.x, y: this.position.y - 1 };
            case Orientation.East: return { x: this.position.x + 1, y: this.position.y };
            case Orientation.South: return { x: this.position.x, y: this.position.y + 1 };
            case Orientation.West: return { x: this.position.x - 1, y: this.position.y };
        }
    }

    public sweepA(): void {
        this.canOutput = false;
        
        if (this.outputBuffer) {
            const neighborPos = this.getNeighborPos();
            const neighbor = TickScheduler.getInstance().getEntityAt(neighborPos.x, neighborPos.y);
            if (neighbor && neighbor.canAcceptItem(this.outputBuffer.typeId)) {
                this.canOutput = true;
            }
        }
    }

    public sweepB(): void {
        if (!this.oreType) {
            this.state = MinerState.IDLE;
            return;
        }

        if (this.outputBuffer) {
            if (this.canOutput) {
                const neighborPos = this.getNeighborPos();
                const neighbor = TickScheduler.getInstance().getEntityAt(neighborPos.x, neighborPos.y);
                if (neighbor) {
                    neighbor.transferItem(this.outputBuffer);
                    this.outputBuffer = null;
                    this.state = MinerState.EXTRACTING;
                }
            } else {
                this.state = MinerState.OUTPUT_BLOCKED;
            }
        }

        if (!this.outputBuffer && this.state !== MinerState.OUTPUT_BLOCKED) {
            this.state = MinerState.EXTRACTING;
            this.extractionProgress += this.powerRatio;
            
            if (this.extractionProgress >= GameConfig.MINER_EXTRACTION_TICKS) {
                this.extractionProgress -= GameConfig.MINER_EXTRACTION_TICKS;
                this.outputBuffer = new ItemPayload(this.oreType, generateUUID());
            }
        }
    }
}
