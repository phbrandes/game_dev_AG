import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionContext } from '../src/meta/SessionContext.js';
import { GlobalProfileState } from '../src/meta/GlobalProfileState.js';
import { SessionHarvester } from '../src/meta/SessionHarvester.js';
import { GridMap } from '../src/core/GridMap.js';
import * as fs from 'fs';

const TEMP_PROFILE_PATH = './tmp_test_profile.json';

describe('Phase 5: Roguelike Meta-Progression', () => {
    beforeEach(() => {
        if (fs.existsSync(TEMP_PROFILE_PATH)) {
            fs.unlinkSync(TEMP_PROFILE_PATH);
        }
    });

    afterEach(() => {
        if (fs.existsSync(TEMP_PROFILE_PATH)) {
            fs.unlinkSync(TEMP_PROFILE_PATH);
        }
    });

    it('Task 5.1: SessionContext volatile store resets correctly', () => {
        const session = new SessionContext();
        session.activeGrid = new GridMap(10, 10);
        session.runInventory['IRON'] = 50;
        session.waveCount = 10;
        session.score = 5000;
        session.isCoreBreached = true;

        session.reset();

        expect(session.activeGrid).toBeNull();
        expect(session.runInventory).toEqual({});
        expect(session.waveCount).toBe(0);
        expect(session.score).toBe(0);
        expect(session.isCoreBreached).toBe(false);
    });

    it('Task 5.2: GlobalProfileState uses Zod to validate and persist JSON', () => {
        const profile = new GlobalProfileState(TEMP_PROFILE_PATH);
        
        // Starts fresh with defaults
        expect(profile.data.metaCurrency).toBe(0);
        expect(profile.data.skillTrees).toEqual({});
        
        // Modify and save
        profile.data.metaCurrency = 150;
        profile.data.skillTrees['miner_speed'] = 2;
        profile.save();
        
        // Verify it was written to disk
        expect(fs.existsSync(TEMP_PROFILE_PATH)).toBe(true);
        const rawJson = fs.readFileSync(TEMP_PROFILE_PATH, 'utf-8');
        expect(JSON.parse(rawJson).metaCurrency).toBe(150);

        // Load into a new instance
        const profile2 = new GlobalProfileState(TEMP_PROFILE_PATH);
        expect(profile2.data.metaCurrency).toBe(150);
        expect(profile2.data.skillTrees['miner_speed']).toBe(2);
    });

    it('Task 5.3: SessionHarvester converts score to currency on breach and resets session', () => {
        const session = new SessionContext();
        session.score = 1500;
        session.waveCount = 3;
        session.activeGrid = new GridMap(5, 5);
        
        const profile = new GlobalProfileState(TEMP_PROFILE_PATH);
        profile.data.metaCurrency = 50;
        
        // If core is not breached, harvester does nothing
        SessionHarvester.execute(session, profile);
        expect(profile.data.metaCurrency).toBe(50);
        expect(session.score).toBe(1500); // Session not reset

        // Breach the core
        session.isCoreBreached = true;
        SessionHarvester.execute(session, profile);
        
        // Score: 1500 -> 10% = 150 currency added to 50 = 200
        expect(profile.data.metaCurrency).toBe(200);
        
        // Session should be reset
        expect(session.score).toBe(0);
        expect(session.isCoreBreached).toBe(false);
        expect(session.waveCount).toBe(0);
        expect(session.activeGrid).toBeNull();
    });
});
