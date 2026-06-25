import { GridEntity } from '../core/GridEntity.js';
import { ItemPayload } from '../core/ItemPayload.js';
import { type Point2D, Orientation } from '../core/Types.js';
import { TickScheduler } from '../core/TickScheduler.js';
import { GameConfig } from '../core/GameConfig.js';

export class ConveyorEntity extends GridEntity {
    private slots: (ItemPayload | null)[] = [null, null, null];
    private canMove: boolean[] = [false, false, false];

    public canAcceptItem(itemType: string): boolean {
        return this.slots[0] === null;
    }

    public transferItem(item: ItemPayload): void {
        if (this.slots[0] !== null) {
            throw new Error(`[Logistics] Handshake failed at ${this.position.x},${this.position.y}: EntrySlot occupied.`);
        }
        item.subTileProgress = 0.0;
        this.slots[0] = item;
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
        // Exit Slot (2)
        const exitItem = this.slots[2];
        this.canMove[2] = false;
        if (exitItem) {
            if (exitItem.subTileProgress >= 1.0) {
                const neighborPos = this.getNeighborPos();
                const neighbor = TickScheduler.getInstance().getEntityAt(neighborPos.x, neighborPos.y);
                if (neighbor && neighbor.canAcceptItem(exitItem.typeId)) {
                    this.canMove[2] = true;
                }
            } else {
                this.canMove[2] = true;
            }
        }

        // Center Slot (1)
        const centerItem = this.slots[1];
        this.canMove[1] = false;
        if (centerItem) {
            if (centerItem.subTileProgress >= 1.0) {
                if (!this.slots[2] || this.canMove[2]) {
                    this.canMove[1] = true;
                }
            } else {
                this.canMove[1] = true;
            }
        }

        // Entry Slot (0)
        const entryItem = this.slots[0];
        this.canMove[0] = false;
        if (entryItem) {
            if (entryItem.subTileProgress >= 1.0) {
                if (!this.slots[1] || this.canMove[1]) {
                    this.canMove[0] = true;
                }
            } else {
                this.canMove[0] = true;
            }
        }
    }

    public sweepB(): void {
        const speed = GameConfig.CONVEYOR_SPEED;

        // Process Exit Slot (2)
        const exitItem = this.slots[2];
        if (exitItem && this.canMove[2]) {
            if (exitItem.subTileProgress >= 1.0) {
                const neighborPos = this.getNeighborPos();
                const neighbor = TickScheduler.getInstance().getEntityAt(neighborPos.x, neighborPos.y);
                if (neighbor) {
                    neighbor.transferItem(exitItem);
                    this.slots[2] = null;
                }
            } else {
                exitItem.subTileProgress += speed;
            }
        }

        // Process Center Slot (1)
        const centerItem = this.slots[1];
        if (centerItem && this.canMove[1]) {
            if (centerItem.subTileProgress >= 1.0) {
                this.slots[2] = centerItem;
                this.slots[1] = null;
                centerItem.subTileProgress = 0.0;
            } else {
                centerItem.subTileProgress += speed;
            }
        }

        // Process Entry Slot (0)
        const entryItem = this.slots[0];
        if (entryItem && this.canMove[0]) {
            if (entryItem.subTileProgress >= 1.0) {
                this.slots[1] = entryItem;
                this.slots[0] = null;
                entryItem.subTileProgress = 0.0;
            } else {
                entryItem.subTileProgress += speed;
            }
        }
    }

    // For tests
    public getSlots() {
        return this.slots;
    }
}
