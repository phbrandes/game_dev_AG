import { type Point2D, type UUID, Orientation } from './Types.js';
import { ItemPayload } from './ItemPayload.js';

export abstract class GridEntity {
    public readonly id: UUID;
    public position: Point2D;
    public orientation: Orientation;

    constructor(id: UUID, position: Point2D, orientation: Orientation) {
        this.id = id;
        this.position = position;
        this.orientation = orientation;
    }

    public abstract canAcceptItem(itemType: string): boolean;
    public abstract transferItem(item: ItemPayload): void;
    
    public abstract sweepA(): void;
    public abstract sweepB(): void;
}
