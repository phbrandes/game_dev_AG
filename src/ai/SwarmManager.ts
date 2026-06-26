import { EnemyBoid } from './EnemyBoid.js';
import { FlowFieldService } from './FlowFieldService.js';
import { SpatialHashGrid } from '../core/SpatialHashGrid.js';
import { SeededPRNG } from '../core/SeededPRNG.js';
import { GameConfig } from '../core/GameConfig.js';

/**
 * SwarmManager — Task 4.2
 *
 * Manages the packed array of live EnemyBoids. Each tick:
 *   1. Removes each boid from SpatialHashGrid (old position).
 *   2. Reads the FlowField vector at the boid's current tile.
 *   3. Advances worldX/worldY by BOID_SPEED.
 *   4. Re-inserts boid into SpatialHashGrid (new position).
 *   5. Garbage-collects dead boids.
 *
 * Receives a SeededPRNG for any future procedural nudges (velocity variance,
 * spawn jitter). Math.random() is strictly forbidden.
 *
 * Not a GridEntity — called externally (same pattern as PowerGridManager).
 */
export class SwarmManager {
    private boids: EnemyBoid[] = [];
    private readonly flowField: FlowFieldService;
    private readonly spatialGrid: SpatialHashGrid<EnemyBoid>;
    private readonly prng: SeededPRNG;

    constructor(
        flowField: FlowFieldService,
        spatialGrid: SpatialHashGrid<EnemyBoid>,
        prng: SeededPRNG,
    ) {
        this.flowField = flowField;
        this.spatialGrid = spatialGrid;
        this.prng = prng;
    }

    /** Spawn a new boid at the given world position and register it in the spatial grid. */
    public spawnBoid(worldX: number, worldY: number, hp: number = GameConfig.BOID_HP): EnemyBoid {
        const boid = new EnemyBoid(worldX, worldY, hp);
        this.boids.push(boid);
        this.spatialGrid.insert(boid);
        return boid;
    }

    /** Advance simulation by one tick: move all boids then collect the dead. */
    public tick(): void {
        this.moveBoids();
        this.garbageCollect();
    }

    private moveBoids(): void {
        for (const boid of this.boids) {
            if (boid.isDead) continue;

            // Must remove before mutating worldX/worldY to keep grid consistent
            this.spatialGrid.remove(boid);

            const tileX = Math.floor(boid.worldX);
            const tileY = Math.floor(boid.worldY);
            const vec = this.flowField.getVectorAt(tileX, tileY);

            boid.worldX += vec.dx * GameConfig.BOID_SPEED;
            boid.worldY += vec.dy * GameConfig.BOID_SPEED;

            this.spatialGrid.insert(boid);
        }
    }

    /** Remove dead boids from the tracked array and the spatial grid (Task 4.4). */
    private garbageCollect(): void {
        const living: EnemyBoid[] = [];
        for (const boid of this.boids) {
            if (boid.isDead) {
                this.spatialGrid.remove(boid);
            } else {
                living.push(boid);
            }
        }
        this.boids = living;
    }

    public getBoids(): readonly EnemyBoid[] {
        return this.boids;
    }

    public getBoidCount(): number {
        return this.boids.length;
    }
}
