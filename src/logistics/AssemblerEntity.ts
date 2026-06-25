import { GridEntity } from '../core/GridEntity.js';
import { ItemPayload } from '../core/ItemPayload.js';
import { type Point2D, Orientation, generateUUID } from '../core/Types.js';
import { TickScheduler } from '../core/TickScheduler.js';
import { GameConfig } from '../core/GameConfig.js';
import type { IPowerNode } from '../core/PowerGridManager.js';

export enum AssemblerState {
    IDLE,
    CRAFTING,
    OUTPUT_BLOCKED
}

export interface Recipe {
    inputs: Record<string, number>;
    output: string;
}

export class AssemblerEntity extends GridEntity implements IPowerNode {
    public state: AssemblerState = AssemblerState.IDLE;
    public powerRatio: number = 1.0;
    
    public inventory: Record<string, number> = {};
    public recipe: Recipe | null = null;
    
    public craftingProgress: number = 0;
    public outputBuffer: ItemPayload | null = null;
    private canOutput: boolean = false;

    constructor(id: string, position: Point2D, orientation: Orientation) {
        super(id, position, orientation);
    }

    public getPowerDelta(): number {
        return -20; // consumes 20 power
    }

    public setPowerRatio(ratio: number): void {
        this.powerRatio = ratio;
    }

    public setRecipe(recipe: Recipe) {
        this.recipe = recipe;
        this.craftingProgress = 0;
        this.state = AssemblerState.IDLE;
    }

    public canAcceptItem(itemType: string): boolean {
        if (!this.recipe) return false;
        
        // Check if the item is part of the recipe inputs
        const requiredAmount = this.recipe.inputs[itemType];
        if (!requiredAmount) return false;
        
        // We could limit inventory size, but for now we just accept if it's a valid input
        const currentAmount = this.inventory[itemType] || 0;
        return currentAmount < requiredAmount * 10; // Cap inventory at 10x recipe to prevent infinite buffering
    }

    public transferItem(item: ItemPayload): void {
        if (!this.canAcceptItem(item.typeId)) {
            throw new Error(`[Logistics] Assembler Handshake failed at ${this.position.x},${this.position.y}. Cannot accept ${item.typeId}.`);
        }
        
        this.inventory[item.typeId] = (this.inventory[item.typeId] || 0) + 1;
    }

    private getNeighborPos(): Point2D {
        switch (this.orientation) {
            case Orientation.North: return { x: this.position.x, y: this.position.y - 1 };
            case Orientation.East: return { x: this.position.x + 1, y: this.position.y };
            case Orientation.South: return { x: this.position.x, y: this.position.y + 1 };
            case Orientation.West: return { x: this.position.x - 1, y: this.position.y };
        }
    }

    private hasInputs(): boolean {
        if (!this.recipe) return false;
        for (const [type, amount] of Object.entries(this.recipe.inputs)) {
            if ((this.inventory[type] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    private consumeInputs(): void {
        if (!this.recipe) return;
        for (const [type, amount] of Object.entries(this.recipe.inputs)) {
            this.inventory[type] -= amount;
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
        if (!this.recipe) {
            this.state = AssemblerState.IDLE;
            return;
        }

        // Try to output
        if (this.outputBuffer) {
            if (this.canOutput) {
                const neighborPos = this.getNeighborPos();
                const neighbor = TickScheduler.getInstance().getEntityAt(neighborPos.x, neighborPos.y);
                if (neighbor) {
                    neighbor.transferItem(this.outputBuffer);
                    this.outputBuffer = null;
                    this.state = AssemblerState.IDLE;
                }
            } else {
                this.state = AssemblerState.OUTPUT_BLOCKED;
            }
        }

        // Crafting logic
        if (!this.outputBuffer) {
            if (this.state === AssemblerState.IDLE && this.hasInputs()) {
                this.consumeInputs();
                this.state = AssemblerState.CRAFTING;
            }

            if (this.state === AssemblerState.CRAFTING) {
                this.craftingProgress += this.powerRatio;
                
                if (this.craftingProgress >= GameConfig.ASSEMBLER_CRAFT_TICKS) {
                    this.craftingProgress -= GameConfig.ASSEMBLER_CRAFT_TICKS;
                    this.outputBuffer = new ItemPayload(this.recipe.output, generateUUID());
                    // Go to idle immediately; next tick will decide if we output or block
                    this.state = AssemblerState.IDLE; 
                }
            }
        }
    }
}
