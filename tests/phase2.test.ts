import { describe, it, expect, beforeEach } from 'vitest';
import { TickScheduler } from '../src/core/TickScheduler.js';
import { GameConfig } from '../src/core/GameConfig.js';
import { ConveyorEntity } from '../src/logistics/ConveyorEntity.js';
import { ItemPayload } from '../src/core/ItemPayload.js';
import { type Point2D, Orientation, generateUUID } from '../src/core/Types.js';

describe('Phase 2: Conveyor Queues & Item Handshakes', () => {
    beforeEach(() => {
        TickScheduler.getInstance().reset();
    });

    it('Task 2.1: ItemPayload properties and subTileProgress clamp', () => {
        const id = generateUUID();
        const payload = new ItemPayload('IRON_ORE', id);
        
        expect(payload.typeId).toBe('IRON_ORE');
        expect(payload.instanceId).toBe(id);
        
        payload.subTileProgress = 0.5;
        expect(payload.subTileProgress).toBe(0.5);
        
        payload.subTileProgress = 1.5;
        expect(payload.subTileProgress).toBe(1.0); // clamped
        
        payload.subTileProgress = -0.5;
        expect(payload.subTileProgress).toBe(0.0); // clamped
    });

    it('Task 2.2 & 2.3: ConveyorEntity manages slots and canAcceptItem', () => {
        const conveyor = new ConveyorEntity(generateUUID(), {x: 0, y: 0}, Orientation.North);
        
        // Initial state
        expect(conveyor.canAcceptItem('IRON_ORE')).toBe(true);
        
        const payload = new ItemPayload('IRON_ORE', generateUUID());
        conveyor.transferItem(payload);
        
        // Entry slot occupied
        expect(conveyor.canAcceptItem('IRON_ORE')).toBe(false);
        expect(() => {
            conveyor.transferItem(new ItemPayload('COPPER_ORE', generateUUID()));
        }).toThrow(/EntrySlot occupied/);
    });

    it('Task 2.4: TickScheduler Sweep A and Sweep B for Conveyor mechanics', () => {
        const scheduler = TickScheduler.getInstance();
        
        const c1 = new ConveyorEntity(generateUUID(), {x: 0, y: 1}, Orientation.North); // Points to (0,0)
        const c2 = new ConveyorEntity(generateUUID(), {x: 0, y: 0}, Orientation.North); // Points to (0,-1)
        
        scheduler.registerEntity(c1);
        scheduler.registerEntity(c2);
        
        const item1 = new ItemPayload('IRON_ORE', generateUUID());
        c1.transferItem(item1);
        
        expect(c1.getSlots()[0]).toBe(item1);
        
        // Tick until item reaches Center slot
        // Speed is 0.5, so 2 ticks should reach 1.0, 3rd tick will move to Center
        scheduler.start(0);
        
        scheduler.update(100); // Tick 1: subTileProgress = 0.5
        expect(item1.subTileProgress).toBe(0.5);
        expect(c1.getSlots()[0]).toBe(item1);
        
        scheduler.update(200); // Tick 2: subTileProgress = 1.0
        expect(item1.subTileProgress).toBe(1.0);
        expect(c1.getSlots()[0]).toBe(item1);
        
        scheduler.update(300); // Tick 3: Moves to Center (slot 1) and progress reset to 0
        expect(c1.getSlots()[0]).toBe(null);
        expect(c1.getSlots()[1]).toBe(item1);
        expect(item1.subTileProgress).toBe(0.0);
        
        scheduler.update(400); // Tick 4: Center progress = 0.5
        scheduler.update(500); // Tick 5: Center progress = 1.0
        scheduler.update(600); // Tick 6: Moves to Exit (slot 2)
        expect(c1.getSlots()[1]).toBe(null);
        expect(c1.getSlots()[2]).toBe(item1);
        
        scheduler.update(700); // Tick 7: Exit progress = 0.5
        scheduler.update(800); // Tick 8: Exit progress = 1.0
        scheduler.update(900); // Tick 9: Moves to c2 Entry (slot 0)
        
        expect(c1.getSlots()[2]).toBe(null);
        expect(c2.getSlots()[0]).toBe(item1);
        expect(item1.subTileProgress).toBe(0.0);
        
        // Add another item behind it while it moves
        const item2 = new ItemPayload('COPPER_ORE', generateUUID());
        c1.transferItem(item2); // c1 entry is empty now
        
        // Now if c2 entry stops, c1 should block
        item1.subTileProgress = 1.0;
        const blocker = new ConveyorEntity(generateUUID(), {x: 0, y: -1}, Orientation.North);
        scheduler.registerEntity(blocker);
        const item3 = new ItemPayload('COAL', generateUUID());
        blocker.transferItem(item3); // Entry is occupied
        // So c2 can't accept item1
        
        // Let's manually move items into blocked states
        item1.subTileProgress = 1.0; 
        c2.getSlots()[0] = null;
        c2.getSlots()[2] = item1; // Put item1 in c2 Exit
        
        const item4 = new ItemPayload('STONE', generateUUID());
        item4.subTileProgress = 1.0;
        c2.getSlots()[1] = item4; // Put item4 in c2 Center
        
        scheduler.update(1000); // Tick 10
        // Blocker entry is occupied, so c2 exit item1 cannot move.
        // Since c2 exit item1 cannot move, c2 center item4 cannot move.
        expect(item1.subTileProgress).toBe(1.0);
        expect(c2.getSlots()[2]).toBe(item1);
        expect(item4.subTileProgress).toBe(1.0);
        expect(c2.getSlots()[1]).toBe(item4);
    });
});
