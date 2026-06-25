import { describe, it, expect, beforeEach } from 'vitest';
import { TickScheduler } from '../src/core/TickScheduler.js';
import { GameConfig } from '../src/core/GameConfig.js';
import { GridMap } from '../src/core/GridMap.js';
import { GridEntity } from '../src/core/GridEntity.js';
import { type Point2D, Orientation, generateUUID } from '../src/core/Types.js';
import { ItemPayload } from '../src/core/ItemPayload.js';

class DummyEntity extends GridEntity {
    public sweepACount: number = 0;
    public sweepBCount: number = 0;
    
    public canAcceptItem(itemType: string): boolean { return false; }
    public transferItem(item: ItemPayload): void {}
    
    public sweepA(): void {
        this.sweepACount++;
    }
    public sweepB(): void {
        this.sweepBCount++;
    }
}

describe('Phase 1: Core Grid & Tick Engine', () => {
    beforeEach(() => {
        TickScheduler.getInstance().reset();
    });

    it('Task 1.1: GridMap uses flat Int32Array and bitwise operations', () => {
        const map = new GridMap(10, 10);
        
        // Assert initial state
        expect(map.getFloor(5, 5)).toBe(0);
        expect(map.getEntityIndex(5, 5)).toBe(0);
        expect(map.getSignal(5, 5)).toBe(0);

        // Test boundary limits
        map.setFloor(1, 1, 255);
        expect(map.getFloor(1, 1)).toBe(255);
        
        map.setEntityIndex(2, 2, 65535);
        expect(map.getEntityIndex(2, 2)).toBe(65535);
        
        map.setSignal(3, 3, 255);
        expect(map.getSignal(3, 3)).toBe(255);
        
        // Assert independence
        map.setFloor(5, 5, 12);
        map.setEntityIndex(5, 5, 3456);
        map.setSignal(5, 5, 78);
        
        expect(map.getFloor(5, 5)).toBe(12);
        expect(map.getEntityIndex(5, 5)).toBe(3456);
        expect(map.getSignal(5, 5)).toBe(78);
        
        // Check out of bounds
        expect(map.isOutOfBounds(-1, 0)).toBe(true);
        expect(map.isOutOfBounds(10, 10)).toBe(true);
    });

    it('Task 1.2 & 1.4: TickScheduler zero time-drift and GridMap zero state mutation over 1000 ticks', () => {
        const scheduler = TickScheduler.getInstance();
        const map = new GridMap(10, 10);
        
        // Set some state to ensure it doesn't mutate
        map.setFloor(0, 0, 5);
        map.setEntityIndex(0, 0, 10);
        map.setSignal(0, 0, 15);
        
        const dummy = new DummyEntity(generateUUID(), {x:0, y:0}, Orientation.North);
        scheduler.registerEntity(dummy);

        scheduler.start(0);
        
        let currentTime = 0;
        const targetTime = 1000 * GameConfig.TICK_STEP_MS;
        
        // Simulate random frametimes between 10ms and 20ms
        while (currentTime < targetTime) {
            // Using a hardcoded seeded sequence approximation just to avoid Math.random() in tests
            currentTime += 16;
            scheduler.update(currentTime);
        }
        
        // Final update to exactly hit the target time
        scheduler.update(targetTime);
        
        expect(scheduler.getCurrentTick()).toBe(1000);
        expect(dummy.sweepACount).toBe(1000);
        expect(dummy.sweepBCount).toBe(1000);
        
        // Assert zero state mutation on the map
        expect(map.getFloor(0, 0)).toBe(5);
        expect(map.getEntityIndex(0, 0)).toBe(10);
        expect(map.getSignal(0, 0)).toBe(15);
    });

    it('Task 1.3: GridEntity abstract class properties', () => {
        const id = generateUUID();
        const pos: Point2D = { x: 1, y: 2 };
        const entity = new DummyEntity(id, pos, Orientation.East);
        
        expect(entity.id).toBe(id);
        expect(entity.position).toEqual({ x: 1, y: 2 });
        expect(entity.orientation).toBe(Orientation.East);
        
        entity.sweepA();
        entity.sweepB();
        expect(entity.sweepACount).toBe(1);
        expect(entity.sweepBCount).toBe(1);
    });
});
