export const GameConfig = {
    // --- Tick Engine ---
    TICK_RATE: 10,
    TICK_STEP_MS: 100,

    // --- World ---
    MAP_WIDTH: 256,
    MAP_HEIGHT: 256,

    // --- Conveyor ---
    CONVEYOR_SPEED: 0.5,

    // --- Miner ---
    MINER_EXTRACTION_TICKS: 10,

    // --- Assembler ---
    ASSEMBLER_CRAFT_TICKS: 20,

    // --- Phase 4: Enemy Swarm ---
    BOID_HP: 100,
    BOID_SPEED: 0.1, // world units (tile units) per tick

    // --- Phase 4: Turret ---
    TURRET_RANGE: 5.0,           // tiles
    TURRET_FIRE_RATE_TICKS: 2,   // ticks between shots
    TURRET_DAMAGE: 50,
    TURRET_POWER_CONSUMPTION: 15,

    // --- Phase 4: Spatial Hash ---
    SPATIAL_HASH_CELL_SIZE: 3,   // world units per hash cell
} as const;
