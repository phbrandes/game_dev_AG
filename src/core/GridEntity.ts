import { Point2D, UUID, Orientation } from './Types';

export abstract class GridEntity {
    public readonly id: UUID;
    public position: Point2D;
    public orientation: Orientation;

    constructor(id: UUID, position: Point2D, orientation: Orientation) {
        this.id = id;
        this.position = position;
        this.orientation = orientation;
    }

    public abstract tick(): void;
}
