/**
 * SpatialHashGrid — O(1) amortized spatial queries.
 * Partitions world-space into fixed-size cells. Entities register
 * by world position. Query returns all entities within a radius.
 *
 * Generic over any type that exposes worldX/worldY coordinates.
 */

export interface ISpatialEntity {
    worldX: number;
    worldY: number;
}

export class SpatialHashGrid<T extends ISpatialEntity> {
    private readonly cellSize: number;
    private readonly cells: Map<number, Set<T>> = new Map();

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    private toCellCoord(world: number): number {
        return Math.floor(world / this.cellSize);
    }

    // Offset by large value so negative cell coords stay positive integers.
    private hash(cellX: number, cellY: number): number {
        const cx = cellX + 10000;
        const cy = cellY + 10000;
        return cx * 100000 + cy;
    }

    private hashForWorld(worldX: number, worldY: number): number {
        return this.hash(this.toCellCoord(worldX), this.toCellCoord(worldY));
    }

    public insert(entity: T): void {
        const h = this.hashForWorld(entity.worldX, entity.worldY);
        if (!this.cells.has(h)) {
            this.cells.set(h, new Set());
        }
        this.cells.get(h)!.add(entity);
    }

    /** Remove entity from the cell matching its CURRENT worldX/worldY. */
    public remove(entity: T): void {
        const h = this.hashForWorld(entity.worldX, entity.worldY);
        this.cells.get(h)?.delete(entity);
    }

    /** Return all entities whose world position falls within radius of (centerX, centerY). */
    public query(centerX: number, centerY: number, radius: number): T[] {
        const result: T[] = [];
        const minCX = this.toCellCoord(centerX - radius);
        const maxCX = this.toCellCoord(centerX + radius);
        const minCY = this.toCellCoord(centerY - radius);
        const maxCY = this.toCellCoord(centerY + radius);
        const r2 = radius * radius;

        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                const cell = this.cells.get(this.hash(cx, cy));
                if (!cell) continue;
                for (const entity of cell) {
                    const dx = entity.worldX - centerX;
                    const dy = entity.worldY - centerY;
                    if (dx * dx + dy * dy <= r2) {
                        result.push(entity);
                    }
                }
            }
        }
        return result;
    }

    /** Return the single nearest entity within radius, or null if none. */
    public getNearestInRadius(centerX: number, centerY: number, radius: number): T | null {
        const candidates = this.query(centerX, centerY, radius);
        let nearest: T | null = null;
        let minDist2 = Infinity;
        for (const entity of candidates) {
            const dx = entity.worldX - centerX;
            const dy = entity.worldY - centerY;
            const d2 = dx * dx + dy * dy;
            if (d2 < minDist2) {
                minDist2 = d2;
                nearest = entity;
            }
        }
        return nearest;
    }

    public clear(): void {
        this.cells.clear();
    }
}
