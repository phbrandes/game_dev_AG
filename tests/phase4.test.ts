import { describe, it, expect, beforeEach } from 'vitest';
import { TickScheduler } from '../src/core/TickScheduler.js';
import { GameConfig } from '../src/core/GameConfig.js';
import { GridMap } from '../src/core/GridMap.js';
import { Orientation, generateUUID } from '../src/core/Types.js';
import { SeededPRNG } from '../src/core/SeededPRNG.js';
import { SpatialHashGrid } from '../src/core/SpatialHashGrid.js';
import { FlowFieldService } from '../src/ai/FlowFieldService.js';
import { EnemyBoid } from '../src/ai/EnemyBoid.js';
import { SwarmManager } from '../src/ai/SwarmManager.js';
import { TurretEntity } from '../src/logistics/TurretEntity.js';

describe('Phase 4: Enemy Swarm AI & Defense Turrets', () => {
    beforeEach(() => {
        TickScheduler.getInstance().reset();
    });

    it('Task 4.1: FlowFieldService BFS produces correct cost and integration vectors', () => {
        // 5x5 grid, Player Core at center (2, 2)
        const grid = new GridMap(5, 5);
        const flowField = new FlowFieldService(grid);
        flowField.setCorePosition({ x: 2, y: 2 });
        flowField.rebuild();

        // Core tile cost = 0
        expect(flowField.getCostAt(2, 2)).toBe(0);

        // Immediate cardinal neighbors = cost 1
        expect(flowField.getCostAt(1, 2)).toBe(1);
        expect(flowField.getCostAt(3, 2)).toBe(1);
        expect(flowField.getCostAt(2, 1)).toBe(1);
        expect(flowField.getCostAt(2, 3)).toBe(1);

        // Corner cells = 4 BFS steps
        expect(flowField.getCostAt(0, 0)).toBe(4);
        expect(flowField.getCostAt(4, 4)).toBe(4);

        // Integration vector west of core must point East (toward core)
        const vecWest = flowField.getVectorAt(1, 2);
        expect(vecWest.dx).toBe(1);
        expect(vecWest.dy).toBe(0);

        // Integration vector north of core must point South (toward core)
        const vecNorth = flowField.getVectorAt(2, 1);
        expect(vecNorth.dx).toBe(0);
        expect(vecNorth.dy).toBe(1);

        // Core tile itself has a zero vector (already at destination)
        const coreVec = flowField.getVectorAt(2, 2);
        expect(coreVec.dx).toBe(0);
        expect(coreVec.dy).toBe(0);

        // Out-of-bounds returns zero vector without throwing
        const oobVec = flowField.getVectorAt(-1, 99);
        expect(oobVec.dx).toBe(0);
        expect(oobVec.dy).toBe(0);
    });

    it('Task 4.2: SwarmManager moves boids deterministically following the flow field', () => {
        const prng = new SeededPRNG('TEST_SEED');

        // 10x1 corridor, core at the far-right end (9, 0)
        const grid = new GridMap(10, 1);
        const flowField = new FlowFieldService(grid);
        flowField.setCorePosition({ x: 9, y: 0 });
        flowField.rebuild();

        const spatialGrid = new SpatialHashGrid<EnemyBoid>(GameConfig.SPATIAL_HASH_CELL_SIZE);
        const swarm = new SwarmManager(flowField, spatialGrid, prng);

        // Spawn boid at the left side
        const boid = swarm.spawnBoid(0.5, 0.0, GameConfig.BOID_HP);
        const initialX = boid.worldX;

        // Run 10 ticks; boid must advance eastward
        for (let i = 0; i < 10; i++) {
            swarm.tick();
        }

        // Boid advanced toward the core
        expect(boid.worldX).toBeGreaterThan(initialX);
        expect(boid.isDead).toBe(false);

        // Boid remains tracked
        expect(swarm.getBoids().length).toBe(1);

        // Spatial grid reflects the new position
        const nearbyBoids = spatialGrid.query(boid.worldX, boid.worldY, 0.5);
        expect(nearbyBoids).toContain(boid);
    });

    it('Task 4.3: TurretEntity acquires target via O(1) SpatialHashGrid and respects fire-rate cooldown', () => {
        const scheduler = TickScheduler.getInstance();
        const spatialGrid = new SpatialHashGrid<EnemyBoid>(GameConfig.SPATIAL_HASH_CELL_SIZE);

        const turret = new TurretEntity(
            generateUUID(), { x: 5, y: 5 }, Orientation.North, spatialGrid
        );
        scheduler.registerEntity(turret);

        // Place a boid within turret range
        const boid = new EnemyBoid(5.5, 5.5, GameConfig.BOID_HP);
        spatialGrid.insert(boid);

        scheduler.start(0);

        // Tick 1: sweepA acquires target (cooldown=0), sweepB fires
        scheduler.update(100);
        expect(boid.hp).toBe(GameConfig.BOID_HP - GameConfig.TURRET_DAMAGE);

        // Tick 2: cooldown is still active — no shot
        scheduler.update(200);
        expect(boid.hp).toBe(GameConfig.BOID_HP - GameConfig.TURRET_DAMAGE);

        // Tick 3: cooldown expires, turret fires again
        scheduler.update(300);
        expect(boid.hp).toBe(GameConfig.BOID_HP - GameConfig.TURRET_DAMAGE * 2);

        // Boid beyond range is NOT targeted
        const farBoid = new EnemyBoid(99.0, 99.0, GameConfig.BOID_HP);
        spatialGrid.insert(farBoid);
        const hpBeforeFar = farBoid.hp;
        scheduler.update(400);
        scheduler.update(500);
        scheduler.update(600);
        expect(farBoid.hp).toBe(hpBeforeFar);
    });

    it('Task 4.4: applyDamage lifecycle and SwarmManager garbage collection sweep', () => {
        const prng = new SeededPRNG('TEST_SEED');
        const grid = new GridMap(5, 5);
        const flowField = new FlowFieldService(grid);
        flowField.setCorePosition({ x: 2, y: 2 });
        flowField.rebuild();

        const spatialGrid = new SpatialHashGrid<EnemyBoid>(GameConfig.SPATIAL_HASH_CELL_SIZE);
        const swarm = new SwarmManager(flowField, spatialGrid, prng);

        // Spawn two boids: one fragile, one sturdy
        const weakBoid = swarm.spawnBoid(1.0, 1.0, 10);
        const strongBoid = swarm.spawnBoid(3.0, 3.0, 100);
        expect(swarm.getBoids().length).toBe(2);

        // applyDamage clamps HP to 0 and sets isDead
        weakBoid.applyDamage(999);
        expect(weakBoid.hp).toBe(0);
        expect(weakBoid.isDead).toBe(true);

        // Surviving boid: partial damage, not dead
        strongBoid.applyDamage(40);
        expect(strongBoid.hp).toBe(60);
        expect(strongBoid.isDead).toBe(false);

        // One tick triggers garbage collection
        swarm.tick();

        // Dead boid evicted; only strong boid remains
        expect(swarm.getBoids().length).toBe(1);
        expect(swarm.getBoids()[0]).toBe(strongBoid);

        // Dead boid removed from spatial grid
        const queryResult = spatialGrid.query(1.0, 1.0, 1.0);
        const hasDeadBoid = queryResult.some(b => b === weakBoid);
        expect(hasDeadBoid).toBe(false);
    });
});
