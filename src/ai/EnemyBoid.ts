import { type UUID, generateUUID } from '../core/Types.js';
import type { ISpatialEntity } from '../core/SpatialHashGrid.js';
import { GameConfig } from '../core/GameConfig.js';

/**
 * EnemyBoid — pure data record representing a single enemy unit.
 * Implements ISpatialEntity so it can be registered in SpatialHashGrid.
 * No rendering state. No Node/DOM references.
 */
export class EnemyBoid implements ISpatialEntity {
    public readonly instanceId: UUID;
    public worldX: number;
    public worldY: number;
    public hp: number;
    public readonly maxHp: number;
    public isDead: boolean = false;

    constructor(worldX: number, worldY: number, hp: number = GameConfig.BOID_HP) {
        this.instanceId = generateUUID();
        this.worldX = worldX;
        this.worldY = worldY;
        this.hp = hp;
        this.maxHp = hp;
    }

    /**
     * Reduces HP by amount. Clamps to 0 and sets isDead flag.
     * This is the canonical entry point for all damage application (Task 4.4).
     */
    public applyDamage(amount: number): void {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
    }
}
