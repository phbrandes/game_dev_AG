import { GridEntity } from '../core/GridEntity.js';
import { ItemPayload } from '../core/ItemPayload.js';
import { type Point2D, Orientation } from '../core/Types.js';
import { SpatialHashGrid } from '../core/SpatialHashGrid.js';
import { GameConfig } from '../core/GameConfig.js';
import type { IPowerNode } from '../core/PowerGridManager.js';
import type { EnemyBoid } from '../ai/EnemyBoid.js';

/**
 * TurretEntity — Task 4.3
 *
 * A GridEntity that participates in the TickScheduler two-phase sweep:
 *   sweepA: Acquire the nearest live boid within TURRET_RANGE. Decrement cooldown.
 *   sweepB: If a target was acquired and cooldown is 0, fire (applyDamage).
 *           Set cooldown to TURRET_FIRE_RATE_TICKS after each shot.
 *
 * Queries SpatialHashGrid — O(1) amortized per query regardless of total boid count.
 * Implements IPowerNode: consumes TURRET_POWER_CONSUMPTION per tick.
 * When powerRatio = 0 the turret is offline and cannot fire.
 */
export class TurretEntity extends GridEntity implements IPowerNode {
    public powerRatio: number = 1.0;
    private readonly spatialGrid: SpatialHashGrid<EnemyBoid>;
    private cooldownTicks: number = 0;
    private currentTarget: EnemyBoid | null = null;

    constructor(
        id: string,
        position: Point2D,
        orientation: Orientation,
        spatialGrid: SpatialHashGrid<EnemyBoid>,
    ) {
        super(id, position, orientation);
        this.spatialGrid = spatialGrid;
    }

    // ---- IPowerNode ----

    public getPowerDelta(): number {
        return -GameConfig.TURRET_POWER_CONSUMPTION;
    }

    public setPowerRatio(ratio: number): void {
        this.powerRatio = ratio;
    }

    // ---- GridEntity ----

    public canAcceptItem(_itemType: string): boolean {
        return false;
    }

    public transferItem(_item: ItemPayload): void {
        throw new Error(`[Logistics] TurretEntity at ${this.position.x},${this.position.y} cannot accept items.`);
    }

    /**
     * Sweep A — Inquiry phase.
     * Decrements cooldown and acquires the nearest live target.
     */
    public sweepA(): void {
        this.currentTarget = null;

        if (this.cooldownTicks > 0) {
            this.cooldownTicks--;
        }

        // Turrets aim from the center of their tile
        const centerX = this.position.x + 0.5;
        const centerY = this.position.y + 0.5;

        const nearest = this.spatialGrid.getNearestInRadius(
            centerX,
            centerY,
            GameConfig.TURRET_RANGE,
        );

        if (nearest !== null && !nearest.isDead) {
            this.currentTarget = nearest;
        }
    }

    /**
     * Sweep B — Commit phase.
     * Fires if a target was acquired, cooldown is 0, and the turret has power.
     */
    public sweepB(): void {
        if (this.currentTarget === null || this.cooldownTicks > 0 || this.powerRatio <= 0) {
            return;
        }

        if (this.currentTarget.isDead) {
            this.currentTarget = null;
            return;
        }

        this.currentTarget.applyDamage(GameConfig.TURRET_DAMAGE);
        this.cooldownTicks = GameConfig.TURRET_FIRE_RATE_TICKS;

        if (this.currentTarget.isDead) {
            this.currentTarget = null;
        }
    }
}
