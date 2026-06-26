import type { Point2D } from '../core/Types.js';
import { GridMap } from '../core/GridMap.js';

export type FlowVector = { readonly dx: number; readonly dy: number };

const ZERO_VECTOR: FlowVector = Object.freeze({ dx: 0, dy: 0 });

// Cardinal neighbor offsets: N, E, S, W
const NEIGHBORS: ReadonlyArray<Readonly<Point2D>> = Object.freeze([
    { x:  0, y: -1 },
    { x:  1, y:  0 },
    { x:  0, y:  1 },
    { x: -1, y:  0 },
]);

/**
 * FlowFieldService — Task 4.1
 *
 * Produces a Cost Field (BFS distance from Player Core) and an Integration
 * Field (per-cell direction vector pointing toward the lowest-cost neighbor).
 * Enemies read getVectorAt() to determine their next movement direction.
 *
 * Pure data service. No rendering references. Rebuild is O(W * H).
 */
export class FlowFieldService {
    private readonly gridMap: GridMap;
    private readonly costField: Float32Array;
    private readonly integrationField: FlowVector[];
    private corePos: Point2D = { x: 0, y: 0 };
    private isBuilt: boolean = false;

    constructor(gridMap: GridMap) {
        this.gridMap = gridMap;
        const size = gridMap.width * gridMap.height;
        this.costField = new Float32Array(size).fill(Infinity);
        this.integrationField = Array.from({ length: size }, () => ({ dx: 0, dy: 0 }));
    }

    public setCorePosition(pos: Point2D): void {
        this.corePos = { ...pos };
        this.isBuilt = false;
    }

    /** BFS outward from the Player Core, then compute integration vectors. */
    public rebuild(): void {
        const { width } = this.gridMap;
        this.costField.fill(Infinity);

        const coreIdx = this.corePos.y * width + this.corePos.x;
        this.costField[coreIdx] = 0;

        // Iterative BFS using a plain array as a queue (head pointer avoids O(n) shift)
        const queue: number[] = [coreIdx];
        let head = 0;

        while (head < queue.length) {
            // Non-null assertion: head < queue.length guarantees the element exists.
            const idx = queue[head++]!;
            const x = idx % width;
            const y = Math.floor(idx / width);
            const nextCost = this.costField[idx]! + 1;

            for (const n of NEIGHBORS) {
                const nx = x + n.x;
                const ny = y + n.y;
                if (this.gridMap.isOutOfBounds(nx, ny)) continue;
                const nIdx = ny * width + nx;
                if (this.costField[nIdx] !== Infinity) continue;
                this.costField[nIdx] = nextCost;
                queue.push(nIdx);
            }
        }

        this.computeIntegrationVectors();
        this.isBuilt = true;
    }

    /** For each cell, find the neighbor with the lowest cost and store its direction. */
    private computeIntegrationVectors(): void {
        const { width, height } = this.gridMap;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const myCost = this.costField[idx];

                if (myCost === Infinity) {
                    this.integrationField[idx] = ZERO_VECTOR;
                    continue;
                }

                let bestCost = myCost;
                let bdx = 0;
                let bdy = 0;

                for (const n of NEIGHBORS) {
                    const nx = x + n.x;
                    const ny = y + n.y;
                    if (this.gridMap.isOutOfBounds(nx, ny)) continue;
                    // isOutOfBounds already checked above; element is guaranteed to exist.
                    const nCost = this.costField[ny * width + nx]!;
                    if (nCost < bestCost) {
                        bestCost = nCost;
                        bdx = n.x;
                        bdy = n.y;
                    }
                }

                this.integrationField[idx] = { dx: bdx, dy: bdy };
            }
        }
    }

    /** Returns the pre-computed integration vector for a tile. Safe for out-of-bounds. */
    public getVectorAt(tileX: number, tileY: number): FlowVector {
        if (this.gridMap.isOutOfBounds(tileX, tileY) || !this.isBuilt) {
            return ZERO_VECTOR;
        }
        // isOutOfBounds guard ensures index is within bounds.
        return this.integrationField[tileY * this.gridMap.width + tileX]!;
    }

    /** Returns BFS cost for a tile. Returns Infinity if unreachable or out-of-bounds. */
    public getCostAt(tileX: number, tileY: number): number {
        if (this.gridMap.isOutOfBounds(tileX, tileY)) return Infinity;
        // isOutOfBounds guard ensures index is within bounds.
        return this.costField[tileY * this.gridMap.width + tileX]!;
    }
}
