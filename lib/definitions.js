const SECRET = (() => {
    try {
        return require('../../private.json')
    } catch(e) {}
    try {
        return require('../../../private.json')
    } catch(e) {}
    return process.env
})()
const c = (() => {
    return require('../config/arrax.json');
})()
let shapeScoreScale = c.SHAPE_SCORE_SCALE || 1
// GUN DEFINITIONS
const combineStats = function(stats) {
    try {
        // Build a blank array of the appropiate length
        let data = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        for (let stat of stats) {
            for (let i = 0; i < data.length; i++) {
                data[i] *= stat[i]
            }
        }
        //data = data.map(r => Math.round(r * 100000000) / 100000000)
        return {
            reload:     data[0],
            recoil:     data[1],
            shudder:    data[2],
            size:       data[3],
            health:     data[4],
            damage:     data[5],
            pen:        data[6],
            speed:      data[7],
            maxSpeed:   data[8],
            range:      data[9],
            density:    data[10],
            spray:      data[11],
            resist:     data[12],
        };
    } catch(err) {
        console.log(err) ;
        console.log(JSON.stringify(stats));
    }
};
const skillSet = (() => {
    let skcnv = {
        rld: 0,
        pen: 1,
        str: 2,
        dam: 3,
        spd: 4,

        shi: 5,
        atk: 6,
        hlt: 7,
        rgn: 8,
        mob: 9,
    };
return args => {
    let skills = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let s in args) {
        if (!args.hasOwnProperty(s)) continue;
        skills[skcnv[s]] = Math.round(c.MAX_SKILL * args[s]);
    }
    return skills;
};
})();

const g = { // Gun info here
    stresstest:         [0.5,   0,     1,      0.1,    1,      1,      1,      3,      1,      3,      1,      0.01,   1],
    trap:               [40,    1,     0.1,    0.6,    1,      0.2,    1.1,    5,      1,      1,      1,      15,     3],
    swarm:              [36,    0.25,  0.05,   0.4,    1.2,    0.175,  1,      3.5,    1,      1,      1.4,    5,      1.3],
    drone:              [66,    0.25,  0.1,    0.6,    3.6,    0.4,    1,      2.5,    1,      1,      1,      0.1,    1],
    factory:            [72,    1,     0.1,    0.7,    2,      0.2,    1,      3,      1,      1,      1,      0.1,    1],
    basic:              [16,    1.4,   0.1,    1,      2,      0.2,    1,      4.5,    1,      1,      1,      15,     1],
    heal:               [16,    1.4,   0.1,    1,      1.5,   -0.1,    1,      4.5,    1,      1,      1,      15,     1],
    /***************** RELOAD RECOIL SHUDDER  SIZE   HEALTH  DAMAGE   PEN    SPEED    MAX    RANGE  DENSITY  SPRAY   RESIST  */
    blank:              [1,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    spam:           [1.1,   1,     1,      1.05,   1,      1.1,    1,      0.9,    0.7,    1,      1,      1,      1.05],
    minion:         [1,     1,     2,      1,      0.4,    0.4,    1.2,    1,      1,      0.75,   1,      2,      1],
    single:         [1.05,  1,     1,      1,      1,      1,      1,      1.05,   1,      1,      1,      1,      1],
    sniper:             [1.3,   1,     0.25,   1,      1,      1,      1,      1.2,    1.2,    1,      1.2,    0.25,   1.2],
    rifle:          [0.85,  0.8,   1.5,    1,      0.95,   0.9,    0.9,    1,      1,      1,      1,      1.5,    1],
    assass:         [1.5,   1,     0.25,   1,      1,      1,      1,      1.1,    1.1,    1,      1.1,    0.5,    1.1],
    hunter:         [1.5,   0.7,   1,      0.95,   0.9,    0.8,    1,      1.05,   0.8,    1,      1.2,    1,      1.15],
    hunter2:    [1,     1,     1,      0.9,    0.9,    0.85,   0.9,    1,      1,      1,      0.9,    1,      1],
    preda:      [1.3,   1,     1,      0.8,    1.35,   0.9,    1.2,    0.9,    0.9,    1,      1,      1,      1],
    snake:      [0.4,   1,     4,      1,      1.5,    0.9,    1.2,    0.2,    0.35,   1,      3,      6,      0.5],
    sidewind:   [1.5,   2,     1,      1,      1.8,    1.4,    1.2,    0.2,    0.6,    1,      1,      1,      1],
    snakeskin:  [0.6,   1,     2,      1,      0.5,    0.5,    1,      1,      0.2,    0.4,    1,      5,      1],
    mach:               [0.5,   0.8,   1.7,    1,      0.7,    0.75,   1,      1,      0.8,    1,      1,      2.5,    1],
    mini:           [1.25,  0.6,   1,      0.8,    0.55,   0.5,    1.3,    1.33,   1,      1,      1.25,   0.5,    1.1],
    stream:     [1.1,   0.6,   1,      1,      1,      0.65,   1,      1.24,   1,      1,      1,      1,      1],
    barricade:  [0.475, 1,     1,      1,      0.9,    1,      0.9,    1.1,    1,      0.5,    1,      1,      1],
    shotgun:        [8,     0.2,   1,      1.5,    1,      0.4,    0.7,    1.8,    0.6,    1,      1.2,    1.2,    1],
    vulc:           [1.1,   0.01,  1,      0.8,    0.3,    0.4,    0.36,   1.3,    1,      1,      1,      0.4,    1],
    flank:              [1,     1.2,   1,      1,      1.02,   0.81,   0.9,    1,      0.85,   1,      1.2,    1,      1],
    tri:            [1,     0.9,   1,      1,      1,      1,      1,      0.9,    0.9,    0.7,    1,      1,      1],
    trifront:   [1,     0.2,   1,      1,      1,      1,      1,      1.3,    1.1,    1.5,    1,      1,      1],
    thruster:   [1,     1.25,  2,      1,      0.5,    0.5,    0.7,    1,      1,      1,      1,      0.5,    0.7],
    auto: /*pure*/  [1.8,   0.75,  0.5,    0.8,    0.9,    0.6,    1.2,    1.1,    1,      0.8,    1.3,    1,      1.25],
    five:       [1.15,  1,     1,      1,      1,      1,      1,      1.05,   1.05,   1.1,    2,      1,      1],
    heavy3:     [0.92,  1,     1,      1,      1.085,  1.085,  1,      1,      1,      1,      1,      1,      1],
    autosnipe:  [2.73,  0.833, 0.25,   1.4,    0.86,   1.09,   1.06,   1.38,   1.62,   1,      2,      0.25,   1.56],
    /***************** RELOAD RECOIL SHUDDER  SIZE   HEALTH  DAMAGE   PEN    SPEED    MAX    RANGE  DENSITY  SPRAY   RESIST  */
    pound:              [2,     1.75,  1,      1,      1,      1.6,    1,      0.85,   0.8,    1,      1.6,    1,      1.15],
    destroy:        [2.1,   1.75,  0.5,    1,      1.7,    1.7,    1.2,    0.75,   0.5,    1,      1.6,    1,      3],
    anni:       [0.85,  1.2,   1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    hive:       [0.75,  0.3,   1,      0.8,    0.85,   0.5,    1.25,   1.05,   0.6,    1,      1,      1,      1],
    bees:       [1.8,   1,     1,      1.4,    1.3,    0.75,   0.6,    3,      1.5,    1,      0.25,   1,      1],
    arty:           [1.2,   0.75,  1,      0.9,    1,      1,      1,      1.15,   1.1,    1,      1.5,    1,      1],
    spreadmain: [25/32, 0.25,  0.5,    1,      0.7,    1,      1,      1.58,   0.95,   1,      1,      1,      1],
    spread:     [1.5,   1,     0.25,   1,      1.1,    1.1,    1,      0.85,   0.85,   1,      1,      0.25,   1],
    skim:       [1.325, 0.8,   0.8,    0.9,    1.33,   1,      1.8,    0.4,    0.4,    1.3,    1,      1,      1.1],
    twin:               [1,     0.5,   0.9,    1,      0.8,    0.875,  1,      1,      1,      1,      1,      1.2,    1],
    bent:           [1,     1,     0.8,    1,      0.8,    1,      0.8,    1,      1,      1,      0.8,    0.5,    1],
    bentdouble: [1,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    triple:         [1.2,   0.667, 0.9,    1,      0.8,    0.8,    0.91,   1,      1,      1,      1.1,    0.9,    0.95],
    quint:      [1.5,   0.667, 0.9,    1,      1,      1,      0.9,    1,      1,      1,      1.1,    0.9,    0.95],
    dual:       [3,     1,     0.8,    1,      1.35,   1,      1,      1.3,    1.1,    1,      1,      1,      1.25],
    penta:      [1,     1,     1,      1,      0.9,    0.81,   1,      1,      1,      1,      1,      1,      1],
    double:         [1,     1,     1,      1,      0.8,    0.8,    0.8,    1,      1,      1,      1,      1,      1],
    hewn:       [1.25,  1.5,   1,      1,      0.85,   0.85,   1,      1,      0.9,    1,      1,      1,      1],
    puregunner:     [1,     0.25,  1.5,    1.2,    1.4,    0.25,   1.25,   0.8,    0.65,   1,      1.5,    1.5,    1.2],
    machgun:    [0.6,   0.8,   2,      1,      1,      0.9,    1,      1.2,    0.8,    1,      1,      2.5,    1],
    hurricane:  [1,     1,     1,      1,      1.3,    1.3,    1.1,    1.5,    1.15,   1,      1,      1,      1],
    gunner:             [1.25,  0.25,  1.5,    1.1,    1,      0.35,   1.35,   0.9,    0.8,    1,      1.5,    1.5,    1.2],
    power:          [1,     1,     0.6,    1.2,    1,      1,      1.25,   2,      1.7,    1,      2,      0.5,    1.5],
    nail:       [0.85,  2.5,   1,      0.8,    1,      0.75,   1.1,    1,      1,      1,      2,      1,      1],
    fast:           [1,     1,     1,      1,      1,      1,      1,      1.2,    1,      1,      1,      1,      1],
    turret:             [2,     1,     1,      1,      0.6,    0.5,    0.5,    0.9,    0.9,    1,      0.1,    1,      1],
    /***************** RELOAD RECOIL SHUDDER  SIZE   HEALTH  DAMAGE   PEN    SPEED    MAX    RANGE  DENSITY  SPRAY   RESIST  */
    battle:             [1,     1,     1,      1,      1.2,    1.2,    1.1,    1,      0.85,   1,      1,      1,      1.1],
    carrier:        [1.1,   1,     1,      1,      1,      0.9,    1,      1.1,    1.1,    1.1,    1,      1,      1],
    hexatrap:           [1.2,   1,     1.25,   1,      1,      1,      1,      0.8,    1,      0.5,    1,      1,      1],
    block:              [1.1,   2,     0.2,    1.5,    2,      1,      1.135,  1.5,    2.5,    1.25,   1,      1,      1.25],
    construct:      [1.3,   1,     1,      0.9,    1,      1.45,   1,      0.87,   0.95,   1,      1,      1,      1],
    boomerang:      [0.8,   1,     1,      1,      1.1,    0.6,    1.5,    0.75,   0.75,   1.35,   1,      1,      1],
    quadtrap:       [1.1,   1,     1,      1,      0.9,    0.8,    0.9,    1.2,    1,      1,      1,      1,      1.1],
    over:               [1.25,  1,     1,      0.85,   0.7,    0.8,    1,      1,      0.9,    1,      2,      1,      1],
    meta:           [1,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    overdrive:      [1,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    weak:           [2,     1,     1,      1,      0.6,    0.6,    0.8,    0.5,    0.7,    0.25,   0.3,    1,      1],
    commander:      [3,     1,     1,      0.7,    0.4,    0.4,    0.5,    1,      1,      0.1,    0.5,    1,      1],
    sunchip:        [4,     1,     1,      1.4,    0.4,    0.35,   0.5,    0.8,    1,      1,      0.6,    1,      1],
    male:       [0.5,   1,     1,      1.05,   1.15,   1.15,   1.15,   0.8,    0.8,    1,      1.15,   1,      1],
    babyfactory:        [1.5,   1,     1,      1,      1,      1,      1,      1,      1.35,   1,      1,      1,      1],
    stronger:           [1,     1,     1,      1,      1.05,   1.05,   1,      1.1,    1,      1,      1,      1,      1],
    bitweak:            [1,     1,     1,      1,      0.95,   0.9,    1,      1,      1,      1,      1,      1,      1],
    lowpower:           [1,     1,     2,      1,      0.5,    0.5,    0.7,    1,      1,      1,      1,      0.5,    0.7],
    halfrecoil:         [1,     0.5,   1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    morerecoil:         [1,     1.15,  1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    muchmorerecoil:     [1,     1.35,  1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    lotsmorrecoil:      [1,     1.8,   1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    tonsmorrecoil:      [1,     4,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    opreload:           [0.1,   1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    doublereload:       [0.5,   1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    morereload:         [0.75,  1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    bitmorereload:      [0.875, 1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    fifthreload:        [5,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    thirdreload:        [3,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    halfreload:         [2,     1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    lessreload:         [1.5,   1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    threequartersrof:   [1.333, 1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    bitlessreload:      [1.05,  1,     1,      1,      1,      1,      1,      1,      1,      1,      1,      1,      1],
    morespeed:          [1,     1,     1,      1,      1,      1,      1,      1.3,    1.3,    1,      1,      1,      1],
    bitmorespeed:       [1,     1,     1,      1,      1,      1,      1,      1.1,    1.1,    1,      1,      1,      1],
    slow:               [1,     1,     1,      1,      1,      1,      1,      0.7,    0.7,    1,      1,      1,      1],
    notdense:           [1,     1,     1,      1,      1,      1,      1,      1,      1,      1,      0.1,    1,      1],
    halfrange:          [1,     1,     1,      1,      1,      1,      1,      1,      1,      0.5,    1,      1,      1],
    morerange:          [1,     1,     1,      1,      1,      1,      1,      1.75,   1.75,   1.25,   1,      1,      1],
    fake:               [1,     1,     1,   0.00001, 0.0001,   1,      1,   0.00001,   2,      0,      1,      1,      1],
    /***************** RELOAD RECOIL SHUDDER  SIZE   HEALTH  DAMAGE   PEN    SPEED    MAX    RANGE  DENSITY  SPRAY   RESIST  */
    bitop:              [1,     1,     1,      1.1,    3,      1.5,    1.5,    1.3,    1.3,   1.3,     1.3,    0.2,    1],
    op:                 [1,     1.1,   1,      1.1,   20,     20,     20,      5,      2,     1.4,     4,      0.1,    1],
    moreop:             [0.5,   0.5,   1,      1,    100,    100,    100,      1.5,    1.5,   1,       1,      0.5,    1],
    protectorswarm:     [2.5,   0,     1,      1,    500,      2,      1,      1,      1,     0.4,     10,     1,     10],
    protectordrone:     [0.5,   0,     1,      1,  75000,      5,      1,      1,      1,     1,       10,     0.1,   10],
    destroyDominator:   [4,     0,     1,      0.975,  8,      8,      6.25,   0.5,    1,     1,       1,      0.5,    1],
    gunnerDominator:    [0.65,  0,     1,      0.5,    1,      0.9,    1.2,    1.25,   1,     0.7,     1,      1.25,   1],
    trapperDominator:   [0.85,  0,     0.25,   1.1,    1,      1.2,    1.2,    0.6,    2,     0.7,     1,      0.5,    1],
    mothership:         [2,     1,     1,      1,      1.1,    1.1,    1.1,    0.6,    0.6,   15,      1,      1,      1.25],
    skimboss:           [1,     0.5,   1,      0.9,    1,      1,      1,      1,      1,     0.7,     1,      1,      1],
    summoner:           [0.35,  1,     1,      1.125,  0.25,   0.25,   0.15,   1,      1,     1,       0.8,    1,      1],
};

const dfltskl = 9;

// NAMES
const statnames = {
    smasher: 1,
    drone: 2,
    necro: 3,
    swarm: 4,
    trap: 5,
    generic: 6,
};
const gunCalcNames = {
    default: 0,
    bullet: 1,
    drone: 2,
    swarm: 3,
    fixedReload: 4,
    thruster: 5,
    sustained: 6,
    necro: 7,
    trap: 8,
};

// ENTITY DEFINITIONS
exports.genericEntity = {
    NAME: '',
    LABEL: 'Unknown Entity',
    TYPE: 'unknown',
    DAMAGE_CLASS: 0, // 0: def, 1: food, 2: tanks, 3: obstacles
    DANGER: 0,
    VALUE: 0,
    SHAPE: 0,
    COLOR: 16,
    INDEPENDENT: false,
    CONTROLLERS: ['doNothing'],
    HAS_NO_MASTER: false,
    MOTION_TYPE: 'glide', // motor, swarm, chase
    FACING_TYPE: 'toTarget', // turnWithSpeed, withMotion, looseWithMotion, toTarget, looseToTarget
    DRAW_HEALTH: false,
    DRAW_SELF: true,
    DAMAGE_EFFECTS: true,
    MOTION_EFFECTS: true,
    INTANGIBLE: false,
    ACCEPTS_SCORE: true,
    GIVE_KILL_MESSAGE: false,
    CAN_GO_OUTSIDE_ROOM: false,
    HITS_OWN_TYPE: 'hardLocal', // hard, repel, never, hardWithBuffer
    DIE_AT_LOW_SPEED: false,
    DIE_AT_RANGE: false,
    CLEAR_ON_MASTER_UPGRADE: false,
    PERSISTS_AFTER_DEATH: false,
    VARIES_IN_SIZE: false,
    HEALTH_WITH_LEVEL: true,
    CAN_BE_ON_LEADERBOARD: true,
    HAS_NO_RECOIL: false,
    BUFF_VS_FOOD: false,
    OBSTACLE: false,
    CRAVES_ATTENTION: false,
    NECRO: false,
    UPGRADES_TIER_1: [],
    UPGRADES_TIER_2: [],
    UPGRADES_TIER_3: [],
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    LEVEL: 0,
    SKILL_CAP: [dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl],
    GUNS: [],
    MAX_CHILDREN: 0,
    MAX_BACTERIA: 0,
    INVISIBLE: [0, 0],
    ALPHA: 1,
    SCOPE: false,
    BODY: {
        ACCELERATION: 1,
        SPEED: 0,
        HEALTH: 1,
        RESIST: 1,
        SHIELD: 0,
        REGEN: 0,
        DAMAGE: 1,
        PENETRATION: 1,

        RANGE: 0,
        FOV: 1,
        DENSITY: 1,
        STEALTH: 1,
        PUSHABILITY: 1,
        HETERO: 2,
    },
    FOOD: {
        LEVEL: -1,
    },
    LIFETIME: false
};

// FOOD
exports.food = {
    TYPE: 'food',
    DAMAGE_CLASS: 1,
    CONTROLLERS: ['moveInCircles'],
    HITS_OWN_TYPE: 'repel',
    MOTION_TYPE: 'drift',
    FACING_TYPE: 'turnWithSpeed',
    VARIES_IN_SIZE: true,
    BODY: {
        STEALTH: 30,
        PUSHABILITY: 1,
    },
    DAMAGE_EFFECTS: false,
    HEALTH_WITH_LEVEL: false,
};

const basePolygonDamage = 1;
const basePolygonHealth = 2;
exports.hugePentagon = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 5,
    },
    LABEL: 'Alpha Pentagon',
    VALUE: 15000 * shapeScoreScale,
    SHAPE: -5,
    SIZE: 58,
    COLOR: 14,
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 300 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        SHIELD: 40 * basePolygonHealth,
        REGEN: 0.6,
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true,
};
exports.bigPentagon = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 4,
    },
    LABEL: 'Beta Pentagon',
    VALUE: 2500 * shapeScoreScale,
    SHAPE: 5,
    SIZE: 30,
    COLOR: 14,
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 30,
        HEALTH: 50 * basePolygonHealth,
        RESIST: Math.pow(1.25, 2),
        SHIELD: 20 * basePolygonHealth,
        REGEN: 0.2,
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true,
};
exports.pentagon = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 3,
    },
    LABEL: 'Pentagon',
    VALUE: 400 * shapeScoreScale,
    SHAPE: 5,
    SIZE: 16,
    COLOR: 14,
    BODY: {
        DAMAGE: 1.5 * basePolygonDamage,
        DENSITY: 8,
        HEALTH: 10 * basePolygonHealth,
        RESIST: 1.25,
        PENETRATION: 1.1,
    },
    DRAW_HEALTH: true,
};
exports.triangle = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 2,
    },
    LABEL: 'Triangle',
    VALUE: 120 * shapeScoreScale,
    SHAPE: 3,
    SIZE: 9,
    COLOR: 2,
    BODY: {
        DAMAGE: basePolygonDamage,
        DENSITY: 6,
        HEALTH: 3 * basePolygonHealth,
        RESIST: 1.15,
        PENETRATION: 1.5,
    },
    DRAW_HEALTH: true,
};
exports.square = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 1,
    },
    LABEL: 'Square',
    VALUE: 30 * shapeScoreScale,
    SHAPE: 4,
    SIZE: 10,
    COLOR: 13,
    BODY: {
        DAMAGE: basePolygonDamage,
        DENSITY: 4,
        HEALTH: basePolygonHealth,
        PENETRATION: 2,
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
};
exports.egg = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 0,
    },
    LABEL: 'Egg',
    VALUE: 10 * shapeScoreScale,
    SHAPE: 0,
    SIZE: 5,
    COLOR: 6,
    INTANGIBLE: true,
    BODY: {
        DAMAGE: 0,
        DENSITY: 2,
        HEALTH: 0.0011,
        PUSHABILITY: 0,
    },
    DRAW_HEALTH: false,
};

exports.greenpentagon = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 3,
        SHINY: true,
    },
    LABEL: 'Pentagon',
    VALUE: 30000 * shapeScoreScale,
    SHAPE: 5,
    SIZE: 16,
    COLOR: 1,
    BODY: {
        DAMAGE: 3,
        DENSITY: 8,
        HEALTH: 200,
        RESIST: 1.25,
        PENETRATION: 1.1,
        ACCELERATION: 0.00375,
    },
    DRAW_HEALTH: true,
};
exports.greentriangle = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 2,
        SHINY: true,
    },
    LABEL: 'Triangle',
    VALUE: 7000 * shapeScoreScale,
    SHAPE: 3,
    SIZE: 9,
    COLOR: 1,
    BODY: {
        DAMAGE: 1,
        DENSITY: 6,
        HEALTH: 60,
        RESIST: 1.15,
        PENETRATION: 1.5,
        ACCELERATION: 0.0075,
    },
    DRAW_HEALTH: true,
};
exports.greensquare = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 1,
        SHINY: true,
    },
    LABEL: 'Square',
    VALUE: 2000 * shapeScoreScale,
    SHAPE: 4,
    SIZE: 10,
    COLOR: 1,
    BODY: {
        DAMAGE: 0.5,
        DENSITY: 4,
        HEALTH: 20,
        PENETRATION: 2,
        ACCELERATION: 0.005,
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
};

exports.gem = {
    PARENT: [exports.food],
    FOOD: {
        LEVEL: 0,
        SHINY: true,
    },
    LABEL: 'Gem',
    VALUE: 1000 * shapeScoreScale,
    SHAPE: 6,
    SIZE: 5,
    COLOR: 0,
    BODY: {
        DAMAGE: basePolygonDamage/4,
        DENSITY: 4,
        HEALTH: 10,
        PENETRATION: 2,
        RESIST: 2,
        PUSHABILITY: 0.25,
        ACCELERATION: 0.015,
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
};
exports.obstacle = {
    TYPE: 'wall',
    DAMAGE_CLASS: 1,
    LABEL: 'Rock',
    FACING_TYPE: 'turnWithSpeed',
    SHAPE: -9,
    BODY: {
        PUSHABILITY: 0,
        HEALTH: 10000,
        SHIELD: 10000,
        REGEN: 1000,
        DAMAGE: 1,
        RESIST: 100,
        STEALTH: 1,
    },
    VALUE: 0,
    SIZE: 60,
    COLOR: 16,
    VARIES_IN_SIZE: true,
    GIVE_KILL_MESSAGE: true,
    ACCEPTS_SCORE: false,
};
exports.babyObstacle = {
    PARENT: [exports.obstacle],
    SIZE: 25,
    SHAPE: -7,
    LABEL: 'Gravel',
};
exports.mazeObstacle = {
    PARENT: [exports.obstacle],
    LABEL: 'Wall',
    FACING_TYPE: '',
    SIZE: 50,
    VARIES_IN_SIZE: false,
    SHAPE: 4,
};

// WEAPONS
const wepHealthFactor = 0.5;
const wepDamageFactor = 1.5;
exports.bullet = {
    LABEL: 'Bullet',
    TYPE: 'bullet',
    ACCEPTS_SCORE: false,
    BODY: {
        PENETRATION: 1,
        SPEED: 3.75,
        RANGE: 90,
        DENSITY: 1.25,
        HEALTH: 0.33 * wepHealthFactor,
        DAMAGE: 4 * wepDamageFactor,
        PUSHABILITY: 0.3,
    },
    FACING_TYPE: 'smoothWithMotion',
    CAN_GO_OUTSIDE_ROOM: true,
    HITS_OWN_TYPE: 'never',
    // DIE_AT_LOW_SPEED: true,
    DIE_AT_RANGE: true,
};
exports.casing = {
    PARENT: [exports.bullet],
    LABEL: 'Shell',
    TYPE: 'swarm',
};

exports.swarm = {
    LABEL: 'Swarm Drone',
    TYPE: 'swarm',
    ACCEPTS_SCORE: false,
    SHAPE: 3, //SHAPE: 3
    MOTION_TYPE: 'swarm',
    FACING_TYPE: 'smoothWithMotion',
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    CRAVES_ATTENTION: true,
    BODY: {
        ACCELERATION: 3,
        PENETRATION: 1.5,
        HEALTH: 0.35 * wepHealthFactor,
        DAMAGE: 1.5 * wepDamageFactor,
        SPEED: 4.5,
        RESIST: 1.6,
        RANGE: 225,
        DENSITY: 12,
        PUSHABILITY: 0.5,
        FOV: 1.6,
    },
    HITS_OWN_TYPE: 'never',
    DIE_AT_RANGE: true,
    BUFF_VS_FOOD: true,
};
exports.bee = {
    PARENT: [exports.swarm],
    PERSISTS_AFTER_DEATH: true,
    SHAPE: 4,
    LABEL: 'Drone',
    HITS_OWN_TYPE: 'hardWithBuffer',
};
exports.autoswarm = {
    PARENT: [exports.swarm],
    AI: { farm: true, },
    INDEPENDENT: true,
};

exports.trap = {
    LABEL: 'Thrown Trap',
    TYPE: 'trap',
    ACCEPTS_SCORE: false,
    SHAPE: -3,
    MOTION_TYPE: 'glide', // def
    FACING_TYPE: 'turnWithSpeed',
    HITS_OWN_TYPE: 'push',
    DIE_AT_RANGE: true,
    BODY: {
        HEALTH: 1 * wepHealthFactor,
        DAMAGE: 2 * wepDamageFactor,
        RANGE: 450,
        DENSITY: 2.5,
        RESIST: 2.5,
        SPEED: 0,
    },
};
exports.block = {
    LABEL: 'Set Trap',
    PARENT: [exports.trap],
    SHAPE: -4,
    MOTION_TYPE: 'motor',
    CONTROLLERS: ['goToMasterTarget'],
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
};
exports.boomerang = {
    LABEL: 'Boomerang',
    PARENT: [exports.trap],
    CONTROLLERS: ['boomerang'],
    MOTION_TYPE: 'motor',
    HITS_OWN_TYPE: 'never',
    SHAPE: -5,
    BODY: {
        SPEED: 1.25,
        RANGE: 120,
    },
};

exports.drone = {
    LABEL: 'Drone',
    TYPE: 'drone',
    ACCEPTS_SCORE: false,
    DANGER: 2,
    CONTROL_RANGE: 0,
    SHAPE: 3,
    MOTION_TYPE: 'chase',
    FACING_TYPE: 'smoothToTarget',
    CONTROLLERS: [
        'nearestDifferentMaster',
        'canRepel',
        'mapTargetToGoal',
        'hangOutNearMaster'
    ],
    BODY: {
        PENETRATION: 1.2,
        PUSHABILITY: 0.6,
        ACCELERATION: 0.05,
        HEALTH: 0.6 * wepHealthFactor,
        DAMAGE: 1.25 * wepDamageFactor,
        SPEED: 3.8,
        RANGE: 200,
        DENSITY: 0.03,
        RESIST: 1.5,
        FOV: 0.5,
    },
    HITS_OWN_TYPE: 'hard',
    DRAW_HEALTH: false,
    CLEAR_ON_MASTER_UPGRADE: true,
    BUFF_VS_FOOD: true,
};
exports.sunchip = {
    PARENT: [exports.drone],
    SHAPE: 4,
    NECRO: true,
    HITS_OWN_TYPE: 'hard',
    BODY: {
        FOV: 0.6,
    },
    AI: {
        farm: true,
    },
    DRAW_HEALTH: false,
};
exports.autosunchip = {
    PARENT: [exports.sunchip],
    AI: {
        skynet: true,
        farm: true,
    },
    INDEPENDENT: true,
};
exports.spinmissile = {
    PARENT: [exports.bullet],
    LABEL: 'Missile',
    INDEPENDENT: true,
    BODY: {
        RANGE: 120,
    },
    FACING_TYPE: 'fastspin',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     8,      1,      0,     0,     0,     0,   ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.doublereload, g.lowpower, g.morereload, g.morespeed]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, }, {
        POSITION: [  14,     8,      1,      0,      0,     180,     0,  ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.doublereload, g.lowpower, g.morereload, g.morespeed]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, },
    ],
};
exports.missile = {
    PARENT: [exports.bullet],
    LABEL: 'Missile',
    INDEPENDENT: true,
    BODY: {
        RANGE: 120,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     6,      1,      0,     -2,     130,     0,   ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.doublereload, g.lowpower, g.muchmorerecoil, g.morespeed, g.morespeed]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, }, {
        POSITION: [  14,     6,      1,      0,      2,     230,     0,  ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.doublereload, g.lowpower, g.muchmorerecoil, g.morespeed, g.morespeed]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, },
    ],
};
exports.hypermissile = {
    BODY: {
        RANGE: 120,
    },
    PARENT: [exports.missile],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     6,      1,      0,     -2,     150,     0,   ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.morerecoil, g.lowpower, g.skimboss]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, }, {
        POSITION: [  14,     6,      1,      0,      2,     210,     0,   ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.morerecoil, g.lowpower, g.skimboss]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
            STAT_CALCULATOR: gunCalcNames.thruster,
        }, }, {
        POSITION: [  14,     6,      1,      0,     -2,      90,    0.5,  ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.morerecoil, g.lowpower, g.skimboss]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
        }, }, {
        POSITION: [  14,     6,      1,      0,      2,     270,    0.5,  ],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.skim, g.morerecoil, g.lowpower, g.skimboss]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
        }, },
    ],
};
exports.snake = {
    PARENT: [exports.bullet],
    LABEL: 'Snake',
    INDEPENDENT: true,
    BODY: {
        RANGE: 120,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,    12,     1.4,     8,      0,     180,    0,   ],
        PROPERTIES: {
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.thruster,
            SHOOT_SETTINGS: combineStats([
                g.basic, g.sniper, g.hunter, g.hunter2, g.snake, g.snakeskin,
            ]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
        }, }, {
        POSITION: [  10,    12,     0.8,     8,      0,     180,   0.5,  ],
        PROPERTIES: {
            AUTOFIRE: true,
            NEGATIVE_RECOIL: true,
            STAT_CALCULATOR: gunCalcNames.thruster,
            SHOOT_SETTINGS: combineStats([
                g.basic, g.sniper, g.hunter, g.hunter2, g.snake,
            ]),
            TYPE: [exports.bullet, { PERSISTS_AFTER_DEATH: true, }],
        }, },
    ],
};
exports.hive = {
    PARENT: [exports.bullet],
    LABEL: 'Hive',
    BODY: {
        RANGE: 90,
    },
    FACING_TYPE: 'turnWithSpeed',
    INDEPENDENT: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    9.5,    0.6,     7,      0,      108,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bees]),
            TYPE: exports.bee,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    9.5,    0.6,     7,      0,      180,    0.2,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bees]),
            TYPE: exports.bee,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    9.5,    0.6,     7,      0,      252,    0.4,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bees]),
            TYPE: exports.bee,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    9.5,    0.6,     7,      0,      324,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bees]),
            TYPE: exports.bee,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    9.5,    0.6,     7,      0,      36,     0.8,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bees]),
            TYPE: exports.bee,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, },
    ],
};

// TANK CLASSES
const base = {
    ACCELERATION: 1.6,
    SPEED: 5.25,
    HEALTH: 20,
    DAMAGE: 3,
    RESIST: 1,
    PENETRATION: 1.05,
    SHIELD: 3,
    REGEN: 0.025,
    FOV: 1,
    DENSITY: 0.9,
};
exports.genericTank = {
    LABEL: 'Unknown Class',
    TYPE: 'tank',
    DAMAGE_CLASS: 2,
    DANGER: 5,
    MOTION_TYPE: 'motor',
    FACING_TYPE: 'toTarget',
    SIZE: 12,
    MAX_CHILDREN: 0,
    DAMAGE_EFFECTS: false,
    BODY: { // def
        ACCELERATION: base.ACCELERATION,
        SPEED: base.SPEED,
        HEALTH: base.HEALTH,
        DAMAGE: base.DAMAGE,
        PENETRATION: base.PENETRATION,
        SHIELD: base.SHIELD,
        REGEN: base.REGEN,
        FOV: base.FOV,
        DENSITY: base.DENSITY,
        PUSHABILITY: 0.9,
        HETERO: 3,
    },
    GUNS: [],
    TURRETS: [],
    GIVE_KILL_MESSAGE: true,
    DRAW_HEALTH: true,
};
let gun = { };

exports.policeLight1 = {
    PARENT: [exports.genericEntity],
    LABEL: 'Police Light',
    SHAPE: 6,
    COLOR: 21,
};
exports.policeLight2 = {
    PARENT: [exports.genericEntity],
    LABEL: 'Police Light',
    SHAPE: 4,
    COLOR: 22,
};
exports.policeLight3 = {
    PARENT: [exports.genericEntity],
    LABEL: 'Police Light',
    SHAPE: 4,
    COLOR: 23,
};
exports.policeLight4 = {
    PARENT: [exports.genericEntity],
    LABEL: 'Police Light',
    SHAPE: 6,
    COLOR: 24,
};
exports.autoTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    BODY: {
        FOV: 0.8
    },
    COLOR: 16,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.morerecoil, g.turret]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.droneAutoTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    BODY: {
        FOV: 0.8
    },
    COLOR: 16,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.morerecoil, g.turret, g.fifthreload, g.overdrive]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.machineAutoTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    COLOR: 16,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,    11,     1.3,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.morerecoil, g.turret, g.mach, g.slow]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.autoSmasherTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    COLOR: 16,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     6,      1,      0,      5,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.morerecoil, g.turret, g.mach, g.pound, g.doublereload]),
            TYPE: exports.bullet,
            STAT_CALCULATOR: gunCalcNames.fixedReload,
        }, }, {
        POSITION: [  20,     6,      1,      0,     -5,      0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.morerecoil, g.turret, g.mach, g.pound, g.doublereload]),
            TYPE: exports.bullet,
            STAT_CALCULATOR: gunCalcNames.fixedReload,
        }, },
    ],
};
exports.oldAutoSmasherTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    COLOR: 16,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     7,      1,      0,    -5.75,    0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.lotsmorrecoil, g.morereload]),
            TYPE: exports.bullet,
            STAT_CALCULATOR: gunCalcNames.fixedReload,
        }, }, {
        POSITION: [  20,     7,      1,      0,     5.75,    0,     0.5,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.lotsmorrecoil, g.morereload]),
            TYPE: exports.bullet,
            STAT_CALCULATOR: gunCalcNames.fixedReload,
        }, },
    ],
};
exports.spinTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Spinner Turret',
    COLOR: 16,
    CONTROLLERS: ['lmg'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,    3.5,     1,      0,        0,    0,     0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,   36,   0.1, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,   72,   0.2, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  108,   0.3, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  144,   0.4, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  180,   0.5, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  216,   0.6, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  252,   0.7, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  288,   0.8, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  324,   0.9, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane, g.halfreload, g.halfreload]),
            TYPE: exports.bullet,
        }, },
    ],
};

exports.auto3gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 3,
    },
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.auto]),
            TYPE: exports.bullet,
        }, }
    ],
};
exports.auto5gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 3,
    },
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,    11,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.auto, g.five]),
            TYPE: exports.bullet,
        }, }
    ],
};
exports.heavy3gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 2,
        SPEED: 0.9,
    },
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,    14,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.auto, g.heavy3]),
            TYPE: exports.bullet,
        }, }
    ],
};
exports.commanderGun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 3,
    },
    CONTROLLERS: ['nearestDifferentMaster'],
    COLOR: 16,
    MAX_CHILDREN: 6,
    AI: {
        NO_LEAD: true,
        view360: true,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   8,     14,    1.3,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.commander]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, },
    ],
};
exports.sniper3gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 5,
    },
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  27,     9,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.auto, g.autosnipe]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [   5,     9,     -1.5,    8,      0,      0,      0,   ],
    },
    ],
};
exports.bansheegun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    INDEPENDENT: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  26,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.auto, g.lessreload]),
            TYPE: exports.bullet,
        }, }
    ],
};
exports.auto4gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 2,
    },
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  16,     4,      1,      0,    -3.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.gunner, g.twin, g.power, g.slow, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,     4,      1,      0,     3.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.gunner, g.twin, g.power, g.slow, g.stronger]),
            TYPE: exports.bullet,
        }, }
    ],
};
exports.bigauto4gun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     5,      1,      0,    -4.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.gunner, g.twin, g.twin, g.power, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  14,     5,      1,      0,     4.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.gunner, g.twin, g.twin, g.power, g.halfreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,     5,      1,      0,      0,      0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.auto, g.gunner, g.twin, g.twin, g.power, g.halfreload]),
            TYPE: exports.bullet,
        }, }
    ],
};

exports.tribuildgun = {
    PARENT: [exports.genericTank],
    LABEL: '',
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,    16,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   2,    16,     1.1,     20,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.auto, g.bitweak]),
            TYPE: exports.block,
        }, },
    ],
};
exports.smasherBody = {
    LABEL: '',
    CONTROLLERS: ['spin'],
    COLOR: 9,
    SHAPE: 6,
    INDEPENDENT: true,
};
exports.buttonBody = {
    LABEL: '',
    CONTROLLERS: ['spin'],
    COLOR: 9,
    SHAPE: 8,
    INDEPENDENT: true,
};
exports.landmineBody = {
    LABEL: '',
    CONTROLLERS: ['fastspin'],
    COLOR: 9,
    SHAPE: 6,
    INDEPENDENT: true,
};
exports.spikeBody = {
    LABEL: '',
    CONTROLLERS: ['spin'],
    COLOR: 9,
    SHAPE: -4,
    INDEPENDENT: true,
};
exports.spikeBody1 = {
    LABEL: '',
    CONTROLLERS: ['fastspin'],
    COLOR: 9,
    SHAPE: 3,
    INDEPENDENT: true,
};
exports.spikeBody2 = {
    LABEL: '',
    CONTROLLERS: ['reversespin'],
    COLOR: 9,
    SHAPE: 3,
    INDEPENDENT: true,
};
exports.megasmashBody = {
    LABEL: '',
    CONTROLLERS: ['spin'],
    COLOR: 9,
    SHAPE: -6,
    INDEPENDENT: true,
};
exports.dominationBody = {
    LABEL: '',
    CONTROLLERS: ['dontTurn'],
    COLOR: 9,
    SHAPE: 6,
    INDEPENDENT: true,
};
exports.baseSwarmTurret = {
    PARENT: [exports.genericTank],
    LABEL: '',
    COLOR: 16,
    BODY: {
        FOV: 5,
    },
    CONTROLLERS: ['nearestDifferentMaster'],
    AI: {
        NO_LEAD: true,
        shapefriend: true,
    },
    INDEPENDENT: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,    4.5,    0.6,     7,      2,      0,     0.15, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.protectorswarm]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   5,    4.5,    0.6,     7,     -2,      0,     0.15, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.protectorswarm]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   5,    4.5,    0.6,    7.5,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.protectorswarm]),
            TYPE: [exports.swarm, { INDEPENDENT: true, AI: { shapefriend: true, }, }, ],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }
    ],
};
exports.baseGunTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Protector',
    BODY: {
        FOV: 5,
    },
    ACCEPTS_SCORE: false,
    CONTROLLERS: ['nearestDifferentMaster'],
    INDEPENDENT: true,
    COLOR: 16,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  12,    12,     1,       6,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.destroy]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  11,    13,     1,       6,      0,      0,     0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.destroy]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [   7,    13,    -1.3,     6,      0,      0,      0,   ],
    }
    ],
};
exports.baseProtector = {
    PARENT: [exports.genericTank],
    LABEL: 'Base',
    TYPE: 'fixed',
    SIZE: 64,
    DAMAGE_CLASS: 0,
    ACCEPTS_SCORE: false,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        spd: 1,
        str: 1,
    }),
    BODY: { // def
        RESIST: 100,
        SPEED: 0,
        HEALTH: 10000,
        DAMAGE: 10,
        PENETRATION: 0.25,
        SHIELD: 1000,
        REGEN: 100,
        FOV: 1,
        PUSHABILITY: 0,
        HETERO: 0,
    },
    CAN_BE_ON_LEADERBOARD: false,
    //CONTROLLERS: ['nearestDifferentMaster'],
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  25,     0,      0,      0,     360,  0],
        TYPE: exports.dominationBody,
    }, {
        POSITION: [  12,     7,      0,      45,     100,  0],
        TYPE: exports.baseSwarmTurret,
    }, {
        POSITION: [  12,     7,      0,     135,    100,  0],
        TYPE: exports.baseSwarmTurret,
    }, {
        POSITION: [  12,     7,      0,     225,    100,  0],
        TYPE: exports.baseSwarmTurret,
    }, {
        POSITION: [  12,     7,      0,     315,    100,  0],
        TYPE: exports.baseSwarmTurret,
    },
    ],
    GUNS: [ /***** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */ {
        POSITION: [  4.5,  11.5,   -1.3,     6,      0,      45,     0,   ], }, {
        POSITION: [  4.5,  11.5,   -1.3,     6,      0,     135,     0,   ], }, {
        POSITION: [  4.5,  11.5,   -1.3,     6,      0,     225,     0,   ], }, {
        POSITION: [  4.5,  11.5,   -1.3,     6,      0,     315,     0,   ], }, {
        POSITION: [  4.5,   8.5,   -1.5,     7,      0,      45,     0,   ], }, {
        POSITION: [  4.5,   8.5,   -1.5,     7,      0,     135,     0,   ], }, {
        POSITION: [  4.5,   8.5,   -1.5,     7,      0,     225,     0,   ], }, {
        POSITION: [  4.5,   8.5,   -1.5,     7,      0,     315,     0,   ], },
    ],
};
exports.baseDroneSpawner = {
    PARENT: [exports.genericTank],
    LABEL: 'Base',
    TYPE: 'fixed',
    SIZE: 20,
    DAMAGE_CLASS: 0,
    ACCEPTS_SCORE: false,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        spd: 1,
        str: 1,
    }),
    HITS_OWN_TYPE: 'never',
    BODY: { // def
        RESIST: 100,
        SPEED: 0,
        HEALTH: 10000,
        DAMAGE: 10,
        PENETRATION: 0.25,
        SHIELD: 1000,
        REGEN: 100,
        FOV: 0.7,
        PUSHABILITY: 0,
        HETERO: 0,
    },
    CAN_BE_ON_LEADERBOARD: false,
    INVISIBLE: [0, 0.1],
    AI: {
        shapefriend: true,
        parentView: true,
    },
    MAX_CHILDREN: 6,
    STAT_NAMES: statnames.drone,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [     6,     12,    1.2,     8,      0,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.protectordrone]),
            TYPE: [exports.drone, { AI: { shapefriend: true, parentView: true }, }, ],
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, }
    ],
};

exports.dominator = {
    PARENT: [exports.genericTank],
    LABEL: 'Dominator',
    TYPE: 'fixed',
    DANGER: 10,
    SIZE: 48,
    SKILL: skillSet({
        dam: 2,
        pen: 2,
        str: 1,
    }),
    BODY: {
        RESIST: 100,
        SPEED: 0,
        HEALTH: base.HEALTH * 10,
        DAMAGE: base.DAMAGE * 2,
        PENETRATION: 0.25,
        FOV: 0.7,
        PUSHABILITY: 0,
        HETERO: 0,
        REGEN: base.REGEN * 0.5,
    },
    CONTROLLERS: ['nearestDifferentMaster', 'spinWhenIdle'],
    TURRETS: [{
        POSITION: [22, 0, 0, 0, 360, 0],
        TYPE: exports.dominationBody,
    }],
    CAN_BE_ON_LEADERBOARD: false,
    GIVE_KILL_MESSAGE: false,
    ACCEPTS_SCORE: false,
};

exports.destroyerDominator = {
    PARENT: [exports.dominator],
    GUNS: [{
        POSITION: [15.25, 6.75, 1, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.destroyDominator]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [5, 6.75, -1.6, 6.75, 0, 0, 0],
    }],
};

exports.gunnerDominator = {
    PARENT: [exports.dominator],
    GUNS: [{
        POSITION: [14.25, 3, 1, 0, -2, 0, 0.5],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [14.25, 3, 1, 0, 2, 0, 0.5],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [15.85, 3, 1, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [5, 8.5, -1.6, 6.25, 0, 0, 0],
    }],
};

exports.trapperDominator = {
    PARENT: [exports.dominator],
    FACING_TYPE: 'autospin',
    GUNS: [{
        POSITION: [3.5, 3.75, 1, 8, 0, 0, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 45, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 45, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 90, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 90, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 135, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 135, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 180, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 225, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 225, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 270, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 270, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }, {
        POSITION: [3.5, 3.75, 1, 8, 0, 315, 0],
    }, {
        POSITION: [1.25, 3.75, 1.7, 12, 0, 315, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
            TYPE: exports.trap,
            AUTOFIRE: true,
        },
    }]
};


exports.minion = {
    PARENT: [exports.genericTank],
    LABEL: 'Minion',
    TYPE: 'drone',
    DAMAGE_CLASS: 0,
    HITS_OWN_TYPE: 'hardWithBuffer',
    FACING_TYPE: 'smoothToTarget',
    BODY: {
        FOV: 0.6,
        SPEED: 3,
        ACCELERATION: 0.4,
        HEALTH: 5,
        SHIELD: 0,
        DAMAGE: 1.2,
        RESIST: 1,
        PENETRATION: 1,
        DENSITY: 0.4,
    },
    DRAW_HEALTH: false,
    CLEAR_ON_MASTER_UPGRADE: true,
    GIVE_KILL_MESSAGE: false,
    CONTROLLERS: [
        'nearestDifferentMaster', 'mapAltToFire', 'minion', 'canRepel', 'hangOutNearMaster'],
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  17,     9,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.minion]),
            WAIT_TO_CYCLE: true,
            TYPE: exports.bullet,
        }, },
    ],
};
exports.pillboxTurret = {
    PARENT: [exports.genericTank],
    LABEL: '',
    COLOR: 16,
    BODY: {
        FOV: 1,
    },
    HAS_NO_RECOIL: true,
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,    11,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.minion, g.turret, g.power, g.auto, g.notdense]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.pillbox = {
    LABEL: 'Pillbox',
    PARENT: [exports.trap],
    SHAPE: -4,
    MOTION_TYPE: 'motor',
    CONTROLLERS: ['goToMasterTarget', 'nearestDifferentMaster'],
    INDEPENDENT: true,
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
    DIE_AT_RANGE: true,
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  11,     0,      0,      0,     360,  1],
        TYPE: exports.pillboxTurret,
    }
    ]
};
exports.skimturret = {
    PARENT: [exports.genericTank],
    BODY: {
        FOV: base.FOV * 3,
    },
    COLOR: 2,
    CONTROLLERS: ['canRepel', 'onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    LABEL: '',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  10,    14,    -0.5,     9,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.arty, g.arty, g.skim, g.skimboss, g.thirdreload]),
            TYPE: exports.hypermissile,
        }, }, {
        POSITION: [  17,    15,      1,      0,      0,      0,      0,  ],
    },
    ],
};

function makeAuto(type, name = -1, options = {}) {
    let turret = { type: exports.autoTurret, size: 10, independent: true, };
    if (options.type != null) { turret.type = options.type; }
    if (options.size != null) { turret.size = options.size; }
    if (options.independent != null) { turret.independent = options.independent; }

    let output = JSON.parse(JSON.stringify(type));
    let autogun = {
        /*********  SIZE               X       Y     ANGLE    ARC */
        POSITION: [  turret.size,     0,      0,     180,    360,  1,],
        TYPE: [turret.type, { CONTROLLERS: ['nearestDifferentMaster'], INDEPENDENT: turret.independent, }],
    };
    if (type.GUNS != null) { output.GUNS = type.GUNS; }
    if (type.TURRETS == null) { output.TURRETS = [autogun]; }
    else { output.TURRETS = [...type.TURRETS, autogun]; }
    if (name === -1) { output.LABEL = 'Auto-' + type.LABEL; } else { output.LABEL = name; }
    output.DANGER = type.DANGER + 1;
    return output;
}
function makeHybrid(type, name = -1) {
    let output = JSON.parse(JSON.stringify(type));
    let spawner = {
        /********* LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,     12,    1.2,     8,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.weak]),
            TYPE: [exports.drone, { INDEPENDENT: true, }],
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: false,
            MAX_CHILDREN: 3,
        }, };
    if (type.TURRETS != null) { output.TURRETS = type.TURRETS; }
    if (type.GUNS == null) { output.GUNS = [spawner]; }
    else { output.GUNS = [...type.GUNS, spawner]; }
    if (name === -1) { output.LABEL = 'Hybrid ' + type.LABEL; } else { output.LABEL = name; }
    return output;
}

exports.basic = {
    PARENT: [exports.genericTank],
    LABEL: 'Basic',
    //CONTROLLERS: ['nearestDifferentMaster'],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: exports.bullet,
            LABEL: '',                  // def
            STAT_CALCULATOR: 0,         // def
            WAIT_TO_CYCLE: false,       // def
            AUTOFIRE: false,            // def
            SYNCS_SKILLS: false,        // def
            MAX_CHILDREN: 0,            // def
            ALT_FIRE: false,            // def
            NEGATIVE_RECOIL: false,     // def
        }, },
    ],
};
exports.single = {
    PARENT: [exports.genericTank],
    LABEL: 'Single',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.single]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  5.5,    8,    -1.8,    6.5,     0,      0,      0,   ],
    }
    ],
};
let smshskl = 12; //13;
exports.button = {
    PARENT: [exports.genericEntity],
    LABEL: 'Button',
    DANGER: 0,
    GIVE_KILL_MESSAGE: false,
    DRAW_HEALTH: false,
    ACCEPTS_SCORE: false,
    BODY: {
        SPEED: 0,
        DENSITY: base.DENSITY * 1000,
        HEALTH: base.HEALTH * 40,
        DAMAGE: base.DAMAGE / 40,
        PUSHABILITY: 0,
    },
    SIZE: 36,
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  21.5,   0,      0,      0,     360,  0,],
        TYPE: exports.buttonBody,
    }]
};
exports.smash = {
    PARENT: [exports.genericTank],
    LABEL: 'Smasher',
    DANGER: 6,
    BODY: {
        SPEED: base.SPEED * 1.1,
        FOV: base.FOV * 1.05,
        DENSITY: base.DENSITY * 2,
    },
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  21.5,   0,      0,      0,     360,  0,],
        TYPE: exports.smasherBody,
    }],
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl,],
    STAT_NAMES: statnames.smasher,
};
exports.megasmash = {
    PARENT: [exports.genericTank],
    LABEL: 'Mega-Smasher',
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 1.15,
        FOV: base.FOV * 1.1,
        DENSITY: base.DENSITY * 5,
    },
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl,],
    STAT_NAMES: statnames.smasher,
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  24,     0,      0,      0,     360,  0,],
        TYPE: exports.megasmashBody,
    }],
};
exports.landmine = {
    PARENT: [exports.genericTank],
    LABEL: 'Landmine',
    INVISIBLE: [0.06, 0.01],
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 1.1,
        FOV: base.FOV * 1.05,
        DENSITY: base.DENSITY * 2,
    },
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  21.5,   0,      0,      0,     360,  0,],
        TYPE: exports.smasherBody,
    }, { /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  21.5,   0,      0,      0,     360,  0,],
        TYPE: exports.landmineBody,
    }],
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl,],
    STAT_NAMES: statnames.smasher,
};
exports.spike = {
    PARENT: [exports.genericTank],
    LABEL: 'Spike',
    DANGER: 7,
    BODY: {
        DAMAGE: base.DAMAGE * 1.1,
        FOV: base.FOV * 1.05,
        DENSITY: base.DENSITY * 2,
    },
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl,],
    STAT_NAMES: statnames.smasher,
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [ 20.5,    0,      0,      0,     360,  0,],
        TYPE: exports.spikeBody,
    }, {
        POSITION: [ 20.5,    0,      0,     120,    360,  0,],
        TYPE: exports.spikeBody,
    }, {
        POSITION: [ 20.5,    0,      0,     240,    360,  0,],
        TYPE: exports.spikeBody,
    }],
};
exports.weirdspike = {
    PARENT: [exports.genericTank],
    LABEL: 'Spike',
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 1.1,
        DAMAGE: base.DAMAGE * 1.15,
        FOV: base.FOV * 1.05,
        DENSITY: base.DENSITY * 1.5,
    },
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl,],
    STAT_NAMES: statnames.smasher,
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [ 20.5,    0,      0,      0,     360,  0,],
        TYPE: exports.spikeBody1,
    }, {
        POSITION: [ 20.5,    0,      0,     180,    360,  0,],
        TYPE: exports.spikeBody2,
    }],
};
exports.autosmash = makeAuto(exports.smash, 'Auto-Smasher', { type: exports.autoSmasherTurret, size: 11, });
exports.autosmash.SKILL_CAP = [smshskl, smshskl, smshskl, smshskl, smshskl, smshskl, smshskl, smshskl, smshskl, smshskl,];

exports.twin = {
    PARENT: [exports.genericTank],
    LABEL: 'Twin',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bitweak, g.bitweak]),
            TYPE: exports.bullet,
        }, }, { /* LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bitweak, g.bitweak]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.gunner = {
    PARENT: [exports.genericTank],
    LABEL: 'Gunner',
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  12,    3.5,     1,      0,     7.25,    0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.fast]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  12,    3.5,     1,      0,    -7.25,    0,     0.75, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.fast]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,    3.5,     1,      0,     3.75,    0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.fast]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,    3.5,     1,      0,    -3.75,    0,     0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.fast]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.machinegunner = {
    PARENT: [exports.genericTank],
    LABEL: 'Machine Gunner',
    DANGER: 6,
    BODY: {
        SPEED: base.SPEED * 0.9,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     3,     4.0,    -3,      5,      0,     0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.machgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  14,     3,     4.0,    -3,     -5,      0,     0.8,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.machgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  14,     3,     4.0,     0,     2.5,     0,     0.4,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.machgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  14,     3,     4.0,     0,    -2.5,     0,     0.2,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.machgun]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  14,     3,     4.0,     3,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.machgun]),
            TYPE: exports.bullet,
        }, },
    ]
};
exports.autogunner = makeAuto(exports.gunner);
exports.nailgun = {
    PARENT: [exports.genericTank],
    LABEL: 'Nailgun',
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.1,
        SPEED: base.SPEED * 0.9,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     2,      1,      0,    -2.5,     0,     0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.nail]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     2,      1,      0,     2.5,     0,     0.75, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.nail]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     2,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.nail]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  5.5,    8,    -1.8,    6.5,     0,      0,      0,   ],
    },
    ],
};
exports.hurricane = {
    PARENT: [exports.genericTank],
    LABEL: 'Cyclone',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,    3.5,     1,      0,        0,    0,     0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,   30,   0.5, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,   60,  0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,   90,  0.75, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  120,     0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  150,   0.5, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  180,  0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  210,  0.75, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  240,     0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  270,   0.5, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  300,  0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  15,    3.5,     1,      0,        0,  330,  0.75, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.puregunner, g.hurricane]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.vulcan = {
    PARENT: [exports.genericTank],
    LABEL: 'Vulcan',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    GUNS: [{ /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [30, 1.5, 1, 0, -4.5, 0, 0.0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, -4.5, 0, 0.9, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 4.5, 0, 0.4, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 4.5, 0, 0.5, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, -2.5, 0, 0.1, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 2.5, 0, 0.3, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 2.5, 0, 0.6, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, -2.5, 0, 0.8, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 0, 0, 0.2, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [30, 1.5, 1, 0, 0, 0, 0.7, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.vulc]),
            TYPE: exports.bullet,
        },
    }, {
        POSITION: [12, 14, 1, 0, 0, 0, 0, ],
    }, {
        POSITION: [5, 14, 1, 20, 0, 0, 0, ],
    }, ],
};
exports.lmg = {
    PARENT: [exports.genericTank],
    LABEL: 'Literally a Machine Gun',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,     8,      1,      0,      0,      0,      0, ],
    }], // g.mach
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  10,    14,      0,      0,     360,    1],
        TYPE: exports.spinTurret,
    }]
};
exports.double = {
    PARENT: [exports.genericTank],
    LABEL: 'Double Twin',
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,     5.5,    180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,    180,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.tripletwin = {
    PARENT: [exports.genericTank],
    LABEL: 'Triple Twin',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,     5.5,    120,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,    120,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,     5.5,    240,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,    240,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.double]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.autodouble = makeAuto(exports.double, 'Auto-Double');
exports.split = {
    PARENT: [exports.genericTank],
    LABEL: 'Hewn Double',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.8,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     8,      1,      0,     5.5,     25,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.double, g.hewn, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,    -5.5,    -25,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.double, g.hewn, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double, g.hewn, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double, g.hewn, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,     5.5,    180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double, g.hewn]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,    180,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.double, g.hewn]),
            TYPE: exports.bullet,
        }, },
    ],
};

exports.bent = {
    PARENT: [exports.genericTank],
    LABEL: 'Triple Shot',
    DANGER: 6,
    BODY: {
        SPEED: base.SPEED * 0.9,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     8,      1,      0,     -2,    -20,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,      2,     20,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  22,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.bentdouble = {
    PARENT: [exports.genericTank],
    LABEL: 'Bent Double',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     8,      1,      0,     -1,     -25,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,      1,      25,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  22,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,     -1,     155,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,      1,    -155,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  22,     8,      1,      0,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.bentdouble]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.penta = {
    PARENT: [exports.genericTank],
    LABEL: 'Penta Shot',
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 0.85,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  16,     8,      1,      0,     -3,    -30,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.penta]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,     8,      1,      0,      3,     30,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.penta]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,     -2,    -15,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.penta]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,      2,     15,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.penta]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  22,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.bent, g.penta]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.benthybrid = makeHybrid(exports.bent, 'Bent Hybrid');

exports.triple = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.05,
    },
    LABEL: 'Triplet',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    10,      1,      0,      5,      0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,    10,      1,      0,     -5,      0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  21,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.quint = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.1,
    },
    LABEL: 'Quintuplet',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  16,    10,      1,      0,     -5,      0,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple, g.quint]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  16,    10,      1,      0,      5,      0,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple, g.quint]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,    10,      1,      0,     -3,      0,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple, g.quint]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  19,    10,      1,      0,      3,      0,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple, g.quint]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  22,    10,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triple, g.quint]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.dual = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.8,
        FOV: base.FOV * 1.1,
    },
    LABEL: 'Dual',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     7,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual, g.lowpower]),
            TYPE: exports.bullet,
            LABEL: 'Small',
        }, }, {
        POSITION: [  18,     7,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual, g.lowpower]),
            TYPE: exports.bullet,
            LABEL: 'Small',
        }, }, {
        POSITION: [  16,    8.5,     1,      0,     5.5,     0,      0.15,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  16,    8.5,     1,      0,    -5.5,     0,     0.65,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual]),
            TYPE: exports.bullet,
        }, },
    ],
};

exports.sniper = {
    PARENT: [exports.genericTank],
    LABEL: 'Sniper',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,    8.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.rifle = {
    PARENT: [exports.genericTank],
    LABEL: 'Rifle',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,    10.5,    1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [  24,     7,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.musket = {
    PARENT: [exports.genericTank],
    LABEL: 'Musket',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [ 15.5,  19.5,     1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [  18,     7,     1,       0,      4.15,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.twin, g.rifle, g.bitweak]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     7,     1,       0,     -4.15,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper,g.twin,  g.rifle, g.bitweak]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.armsman = {
    PARENT: [exports.genericTank],
    LABEL: 'Armsman',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,    10.5,    1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [  24,     7,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  13,    8.5,     1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,    8.5,    1.7,    13,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.assassin = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    LABEL: 'Assassin',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.6,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.35,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  27,    8.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assass]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [   5,    8.5,    -1.6,    8,      0,      0,      0,   ],
    },
    ],
};
exports.stalker = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Stalker',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.55,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.35,
    },
    INVISIBLE: [0.08, 0.03],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  27,    8.5,     -2,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assass]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.ranger = {
    PARENT: [exports.genericTank],
    LABEL: 'Ranger',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.5,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.45,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  32,    8.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assass]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [   5,    8.5,    -1.6,    8,      0,      0,      0,   ],
    },
    ],
};
exports.autoass = makeAuto(exports.assassin, "Auto-Assassin");

exports.hunter = {
    PARENT: [exports.genericTank],
    LABEL: 'Hunter',
    DANGER: 6,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.25,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunter2]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  21,    12,      1,      0,      0,      0,     0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.preda = {
    PARENT: [exports.genericTank],
    LABEL: 'Predator',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.3,
    },
    SCOPE: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunter2, g.hunter2, g.preda]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  21,    12,      1,      0,      0,      0,     0.15, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunter2, g.preda]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,    16,      1,      0,      0,      0,     0.3,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.preda]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.poach = makeHybrid(exports.hunter, 'Poacher');
exports.sidewind = {
    PARENT: [exports.genericTank],
    LABEL: 'Sidewinder',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.3,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  10,    11,    -0.5,    14,      0,      0,      0,  ],
    }, {
        POSITION: [  21,    12,    -1.1,     0,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewind]),
            TYPE: exports.snake,
            STAT_CALCULATOR: gunCalcNames.sustained,
        }, },
    ],
};

exports.director = {
    PARENT: [exports.genericTank],
    LABEL: 'Director',
    STAT_NAMES: statnames.drone,
    DANGER: 5,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        FOV: base.FOV * 1.05,
    },
    MAX_CHILDREN: 5,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, },
    ],
};
exports.manager = {
    PARENT: [exports.genericTank],
    LABEL: 'Manager',
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.6,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.1,
    },
    INVISIBLE: [0.08, 0.03],
    MAX_CHILDREN: 8,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.doublereload]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, },
    ],
};
exports.commander = {
    PARENT: [exports.genericTank],
    LABEL: 'Commander',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        FOV: base.FOV * 1.15,
    },
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  16,     1,      0,      0,      0, 0],
        TYPE: [exports.commanderGun, { INDEPENDENT: true, }],
    }, {
        POSITION: [  16,     1,      0,     120,     0, 0],
        TYPE: exports.commanderGun,
    }, {
        POSITION: [  16,     1,      0,     240,     0, 0],
        TYPE: exports.commanderGun,
    },
    ],
};

exports.overseer = {
    PARENT: [exports.genericTank],
    LABEL: 'Overseer',
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.1,
    },
    MAX_CHILDREN: 8,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   6,     12,    1.2,     8,      0,    270,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, },
    ],
};
exports.autodrone = makeAuto(exports.drone, 'Auto-Drone', { type: exports.droneAutoTurret, size: 9 })
exports.overdrivesquare = {
    PARENT: [exports.genericEntity],
    LABEL: 'Drive Square',
    SHAPE: 4,
    SIZE: 10,
};
exports.overdrive = {
    PARENT: [exports.genericTank],
    LABEL: 'Overdrive',
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.1,
    },
    MAX_CHILDREN: 8,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.overdrive]),
            TYPE: exports.autodrone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   6,     12,    1.2,     8,      0,    270,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.overdrive]),
            TYPE: exports.autodrone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, },
    ],
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  9,     0,      0,      0,     360,    1],
        TYPE: exports.overdrivesquare,
    }],
};
exports.overlord = {
    PARENT: [exports.genericTank],
    LABEL: 'Overlord',
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.1,
    },
    MAX_CHILDREN: 8,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   6,     12,    1.2,     8,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   6,     12,    1.2,     8,      0,     270,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   6,     12,    1.2,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
        }, },
    ],
};
exports.overtrap = {
    PARENT: [exports.genericTank],
    LABEL: 'Overtrapper',
    DANGER: 7,
    STAT_NAMES: statnames.generic,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.6,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     11,    1.2,     8,      0,     125,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [   6,     11,    1.2,     8,      0,     235,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [  14,     8,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   4,     8,     1.5,    14,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.banshee = {
    PARENT: [exports.genericTank],
    LABEL: 'Banshee',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.65,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.1,
    },
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  10,     8,      0,      0,      80, 0],
        TYPE: exports.bansheegun,
    }, {
        POSITION: [  10,     8,      0,     120,     80, 0],
        TYPE: exports.bansheegun,
    }, {
        POSITION: [  10,     8,      0,     240,     80, 0],
        TYPE: exports.bansheegun,
    },
    ],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     11,    1.2,     8,      0,      60,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [   6,     11,    1.2,     8,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [   6,     11,    1.2,     8,      0,     300,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, },
    ]
};
exports.autoover = makeAuto(exports.overseer);
exports.overgunner = {
    PARENT: [exports.genericTank],
    LABEL: 'Overgunner',
    DANGER: 7,
    STAT_NAMES: statnames.generic,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.1,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     11,    1.2,     8,      0,     125,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [   6,     11,    1.2,     8,      0,     235,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.meta]),
            TYPE: exports.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.drone,
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 2,
        }, }, {
        POSITION: [  19,     2,      1,      0,    -2.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.slow, g.flank, g.lotsmorrecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     2,      1,      0,     2.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.slow, g.flank, g.lotsmorrecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  12,    11,      1,      0,      0,      0,      0,   ],
    },
    ],
};

function makeSwarmSpawner(guntype) {
    return {
        PARENT: [exports.genericTank],
        LABEL: '',
        BODY: {
            FOV: 2,
        },
        CONTROLLERS: ['nearestDifferentMaster'],
        COLOR: 16,
        AI: {
            NO_LEAD: true,
            view360: true,
        },
        GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
            POSITION: [  14,     15,    0.6,    14,      0,      0,      0,   ],
            PROPERTIES: {
                SHOOT_SETTINGS: guntype,
                TYPE: exports.swarm,
                STAT_CALCULATOR: gunCalcNames.swarm,
            }, }
        ],
    };
}
exports.cruiserGun = makeSwarmSpawner(combineStats([g.swarm]));
exports.cruiser = {
    PARENT: [exports.genericTank],
    LABEL: 'Cruiser',
    DANGER: 6,
    FACING_TYPE: 'locksFacing',
    STAT_NAMES: statnames.swarm,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.8,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    7.5,    0.6,     7,      4,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,     -4,      0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, },
    ],
};
exports.battleship = {
    PARENT: [exports.genericTank],
    LABEL: 'Battleship',
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: 'locksFacing',
    BODY: {
        ACCELERATION: base.ACCELERATION,
        FOV: base.FOV * 1.25,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    7.5,    0.6,     7,      4,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.battle]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
            LABEL: 'Guided'
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,     -4,     90,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: [exports.autoswarm],
            STAT_CALCULATOR: gunCalcNames.swarm,
            LABEL: 'Autonomous',
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      4,     270,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: [exports.autoswarm],
            STAT_CALCULATOR: gunCalcNames.swarm,
            LABEL: 'Autonomous',
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,     -4,     270,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.battle]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
            LABEL: 'Guided'
        }, },
    ],
};
exports.carrier = {
    PARENT: [exports.genericTank],
    LABEL: 'Carrier',
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: 'locksFacing',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.8,
        FOV: base.FOV * 1.25,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    7.5,    0.6,     7,      -2,    -30,    0.5,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.battle, g.carrier]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      2,      30,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.battle, g.carrier]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      0,       0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.battle, g.carrier]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }
    ],
};
exports.fortress = {
    PARENT: [exports.genericTank],
    LABEL: 'Fortress',
    DANGER: 7,
    STAT_NAMES: statnames.generic,
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    7.5,    0.6,     7,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.stronger]),
            TYPE: [exports.swarm, { CONTROLLERS: ['canRepel'] }],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      0,     120,    1/3,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.stronger]),
            TYPE: [exports.swarm, { CONTROLLERS: ['canRepel'] }],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      0,     240,    2/3,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.stronger]),
            TYPE: [exports.swarm, { CONTROLLERS: ['canRepel'] }],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [  14,     9,      1,      0,      0,     60,      0,   ],
    }, {
        POSITION: [   4,     9,     1.5,    14,      0,     60,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.halfrange, g.slow]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  14,     9,      1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,     9,     1.5,    14,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.halfrange, g.slow]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  14,     9,      1,      0,      0,     300,     0,   ],
    }, {
        POSITION: [   4,     9,     1.5,    14,      0,     300,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.halfrange, g.slow]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};

exports.underseer = {
    PARENT: [exports.genericTank],
    LABEL: 'Underseer',
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.1,
    },
    NECRO: true,
    SHAPE: 4,
    MAX_CHILDREN: 14,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,     12,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
        }, }, {
        POSITION: [   5,     12,    1.2,     8,      0,     270,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
        }, },
    ],
};
exports.necromancer = {
    PARENT: [exports.genericTank],
    LABEL: 'Necromancer',
    DANGER: 7,
    STAT_NAMES: statnames.necro,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.1,
    },
    SHAPE: 4,
    FACING_TYPE: 'autospin',
    MAX_CHILDREN: 20,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,     12,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
        }, }, {
        POSITION: [   5,     12,    1.2,     8,      0,     270,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
        }, }, {
        POSITION: [   5,     12,    1.2,     8,      0,      0,     0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.weak, g.doublereload]),
            TYPE: exports.autosunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            MAX_CHILDREN: 4,
            STAT_CALCULATOR: gunCalcNames.necro,
            LABEL: 'Guard',
        }, }, {
        POSITION: [   5,     12,    1.2,     8,      0,     180,    0.75  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.weak, g.doublereload]),
            TYPE: exports.autosunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            MAX_CHILDREN: 4,
            STAT_CALCULATOR: gunCalcNames.necro,
            LABEL: 'Guard',
        }, },
    ],
};
exports.maleficitor = {
    PARENT: [exports.genericTank],
    LABEL: 'Maleficitor',
    DANGER: 7,
    STAT_NAMES: statnames.necro,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.1,
    },
    SHAPE: 4,
    MAX_CHILDREN: 20,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,     12,    1.2,     8,      0,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.male]),
            TYPE: [exports.sunchip, {
                INVISIBLE: [0.06, 0.03],
            }],
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
        }, },
    ],
};

exports.lilfact = {
    PARENT: [exports.genericTank],
    LABEL: 'Spawner',
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: {
        SPEED: base.SPEED * 0.8,
        ACCELERATION: base.ACCELERATION * 0.5,
        FOV: 1.1,
    },
    GUNS: [ { /**** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  4.5,    10,      1,     10.5,    0,      0,      0,   ],
    }, {
        POSITION: [   1,     12,      1,      15,     0,      0,      0,   ],
        PROPERTIES: {
            MAX_CHILDREN: 4,
            SHOOT_SETTINGS: combineStats([g.factory, g.babyfactory]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
        }, }, {
        POSITION: [  3.5,    12,      1,      8,      0,      0,      0,   ],
    }
    ],
};
exports.lilfactauto = makeAuto(exports.lilfact, 'Auto-Spawner');
exports.factory = {
    PARENT: [exports.genericTank],
    LABEL: 'Factory',
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: 1.1,
    },
    MAX_CHILDREN: 6,
    GUNS: [ { /**** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,     11,      1,      10.5,   0,      0,      0,   ],
    }, {
        POSITION: [   2,     14,      1,      15.5,   0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
        }, }, {
        POSITION: [   4,     14,      1,      8,      0,      0,      0,   ],
    }
    ],
};

exports.machine = {
    PARENT: [exports.genericTank],
    LABEL: 'Machine Gun',
    GUNS: [ {    /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [    12,     10,     1.4,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.spray = {
    PARENT: [exports.genericTank],
    LABEL: 'Sprayer',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  23,     7,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.lowpower, g.mach, g.morerecoil, g.bitlessreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  12,    10,     1.4,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.bitlessreload]),
            TYPE: exports.bullet,
        }, },
    ],
};

exports.mini = {
    PARENT: [exports.genericTank],
    LABEL: 'Minigun',
    DANGER: 6,
    BODY: {
        FOV: 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  22,     8,      1,      0,      0,      0,      0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  20,     8,      1,      0,      0,      0,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,      0,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.stream = {
    PARENT: [exports.genericTank],
    LABEL: 'Streamliner',
    DANGER: 7,
    BODY: {
        FOV: 1.3,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  25,     8,      1,      0,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  23,     8,      1,      0,      0,      0,     0.2, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  21,     8,      1,      0,      0,      0,     0.4, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     8,      1,      0,      0,      0,     0.6, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, },  {
        POSITION: [  17,     8,      1,      0,      0,      0,     0.8, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.hybridmini = makeHybrid(exports.mini, "Crop Duster");
exports.minitrap = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    LABEL: 'Barricade',
    STAT_NAMES: statnames.trap,
    BODY: {
        FOV: 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,     8,      1,      0,      0,      0,      0, ],
    }, {
        POSITION: [   4,     8,     1.3,     22,     0,      0,      0, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.mini, g.barricade]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [   4,     8,     1.3,     18,     0,      0,    0.333, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.mini, g.barricade]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [   4,     8,     1.3,     14,     0,      0,    0.667, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.mini, g.barricade]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};

exports.pound = {
    PARENT: [exports.genericTank],
    DANGER: 5,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.8,
    },
    LABEL: 'Pounder',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,    12,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.destroy = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
    },
    LABEL: 'Destroyer',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  21,    14,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.anni = {
    PARENT: [exports.genericTank],
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
    },
    LABEL: 'Annihilator',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [ 20.5,  19.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, g.anni]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.hiveshooter = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.75,
        SPEED: base.SPEED * 0.8,
    },
    LABEL: 'Swarmer',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,    14,     -1.2,    5,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, g.hive]),
            TYPE: exports.hive,
        }, }, {
        POSITION: [  15,    12,      1,      5,      0,      0,      0,   ],
    }
    ],
};
exports.hybrid = makeHybrid(exports.destroy, 'Hybrid');
exports.shotgun = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Shotgun',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ /***** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */ {
        POSITION: [  4,      3,      1,     11,     -3,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  4,      3,      1,     11,      3,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  4,      4,      1,     13,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [  1,      4,      1,     12,     -1,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [  1,      4,      1,     11,      1,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [  1,      3,      1,     13,     -1,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  1,      3,      1,     13,      1,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  1,      2,      1,     13,      2,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [  1,      2,      1,     13,     -2,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [ 15,     14,      1,     6,       0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mach, g.shotgun, g.fake]),
            TYPE: exports.casing,
        }, }, {
        POSITION: [  8,     14,    -1.3,    4,       0,      0,      0,   ], }
    ],
};

exports.builder = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    LABEL: 'Builder',
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    12,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   2,    12,     1.1,     18,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block]),
            TYPE: exports.block,
        }, },
    ],
};
exports.engineer = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Engineer',
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: base.SPEED * 0.75,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,    11,      1,     10.5,     0,      0,      0,   ],
    }, {
        POSITION: [   3,    14,      1,     15.5,     0,      0,      0,   ],
    }, {
        POSITION: [   2,    14,     1.3,     18,      0,      0,      0,   ],
        PROPERTIES: {
            MAX_CHILDREN: 6,
            DESTROY_OLDEST_CHILD: true,
            SHOOT_SETTINGS: combineStats([g.trap, g.block]),
            TYPE: exports.pillbox,
            SYNCS_SKILLS: true,
        }, }, {
        POSITION: [   4,    14,      1,      8,      0,      0,      0,   ]
    }
    ],
};
exports.construct = {
    PARENT: [exports.genericTank],
    LABEL: 'Constructor',
    STAT_NAMES: statnames.trap,
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.5,
        SPEED: base.SPEED * 0.7,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    18,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   2,    18,     1.2,     18,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.construct]),
            TYPE: exports.block,
        }, },
    ],
};
exports.autobuilder = makeAuto(exports.builder);
exports.conq = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Conqueror',
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: base.SPEED * 0.85,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  21,    14,      1,      0,      0,     180,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.destroy, g.lessreload]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,    12,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   2,    12,     1.1,     18,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block]),
            TYPE: exports.block,
        }, },
    ],
};
exports.bentboomer = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Boomer',
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   8,    10,      1,      8,     -2,     -35,     0,   ],
    }, {
        POSITION: [   8,    10,      1,      8,      2,      35,     0,   ],
    }, {
        POSITION: [   2,    10,     1.3,     16,    -2,     -35,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.fast, g.twin, g.stronger]),
            TYPE: exports.boomerang,
        }, }, {
        POSITION: [   2,    10,     1.3,     16,     2,      35,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.fast, g.twin, g.stronger]),
            TYPE: exports.boomerang,
        }, },
    ],
};
exports.boomer = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Boomer',
    STAT_NAMES: statnames.trap,
    FACING_TYPE: 'locksFacing',
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   5,    10,      1,      14,     0,      0,      0,   ],
    }, {
        POSITION: [   6,    10,    -1.5,      7,     0,      0,      0,   ],
    }, {
        //POSITION: [  12,    15,      1,      0,      0,      0,      0,   ],
        //    }, {
        POSITION: [   2,    10,     1.3,     18,     0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.boomerang]),
            TYPE: exports.boomerang,
        }, },
    ],
};
exports.quadtrapper = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Quad-Builder',
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.15,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,     6,      1,      0,      0,     45,      0,   ],
    }, {
        POSITION: [   2,     6,     1.1,     14,     0,     45,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.quadtrap]),
            TYPE: exports.block,
        }, }, {
        POSITION: [  14,     6,      1,      0,      0,     135,     0,   ],
    }, {
        POSITION: [   2,     6,     1.1,     14,     0,     135,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.quadtrap]),
            TYPE: exports.block,
        }, }, {
        POSITION: [  14,     6,      1,      0,      0,     225,     0,   ],
    }, {
        POSITION: [   2,     6,     1.1,     14,     0,     225,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.quadtrap]),
            TYPE: exports.block,
        }, }, {
        POSITION: [  14,     6,      1,      0,      0,     315,     0,   ],
    }, {
        POSITION: [   2,     6,     1.1,     14,     0,     315,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.block, g.quadtrap]),
            TYPE: exports.block,
        }, },
    ],
};

exports.artillery = {
    PARENT: [exports.genericTank],
    DANGER: 6,
    LABEL: 'Artillery',
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  17,     3,      1,      0,     -6,     -7,     0.25,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  17,     3,      1,      0,      6,      7,     0.75,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  19,     12,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.arty]),
            TYPE: exports.bullet,
            LABEL: 'Heavy',
        }, },
    ],
};
exports.mortar = {
    PARENT: [exports.genericTank],
    LABEL: 'Mortar',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  13,     3,      1,      0,     -8,     -7,     0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  13,     3,      1,      0,      8,      7,     0.8,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  17,     3,      1,      0,     -6,     -7,     0.2,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  17,     3,      1,      0,      6,      7,     0.4,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin]),
            TYPE: exports.bullet,
            LABEL: 'Secondary',
        }, }, {
        POSITION: [  19,     12,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.arty]),
            TYPE: exports.bullet,
            LABEL: 'Heavy',
        }, },
    ],
};
exports.skimmer = {
    PARENT: [exports.genericTank],
    BODY: {
        FOV: base.FOV * 1.15,
    },
    LABEL: 'Skimmer',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  10,    14,    -0.5,     9,      0,      0,      0,  ],
    }, {
        POSITION: [  17,    15,      1,      0,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.arty, g.arty, g.skim]),
            TYPE: exports.missile,
            STAT_CALCULATOR: gunCalcNames.sustained,
        }, },
    ],
};
exports.spinner = {
    PARENT: [exports.genericTank],
    BODY: {
        FOV: base.FOV * 1.1,
    },
    LABEL: 'Twister',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  10,    13,    -0.5,     9,      0,      0,      0,  ],
    }, {
        POSITION: [  17,    14,      -1.4,      0,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.arty, g.arty, g.skim, g.morerange, g.threequartersrof]),
            TYPE: exports.spinmissile,
            STAT_CALCULATOR: gunCalcNames.sustained,
        }, },
    ],
};
exports.spread = {
    PARENT: [exports.genericTank],
    LABEL: 'Spreadshot',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  13,     4,      1,      0,    -0.8,    -75,    5/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [ 14.5,    4,      1,      0,    -1.0,    -60,    4/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  16,     4,      1,      0,    -1.6,    -45,    3/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [ 17.5,    4,      1,      0,    -2.4,    -30,    2/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  19,     4,      1,      0,    -3.0,    -15,    1/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  13,     4,      1,      0,     0.8,     75,    5/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [ 14.5,    4,      1,      0,     1.0,     60,    4/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  16,     4,      1,      0,     1.6,     45,    3/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [ 17.5,    4,      1,      0,     2.4,     30,    2/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  19,     4,      1,      0,     3.0,     15,    1/6,    ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.arty, g.twin, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Spread',
        }, }, {
        POSITION: [  13,    10,     1.3,     8,      0,      0,      0,     ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.spreadmain, g.spread]),
            TYPE: exports.bullet,
            LABEL: 'Pounder',
        }, },
    ],
};
exports.eagle = {
    PARENT: [exports.genericTank],
    LABEL: 'Eagle',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,    12,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound]),
            TYPE: exports.bullet,
            LABEL: 'Pounder',
            ALT_FIRE: true,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     150,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     210,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     180,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};

exports.flank = {
    PARENT: [exports.genericTank],
    LABEL: 'Flank Guard',
    BODY: {
        SPEED: base.SPEED * 1.1,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     120,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     240,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.hexa = {
    PARENT: [exports.genericTank],
    LABEL: 'Hexa Tank',
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     120,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     240,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,      60,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     180,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     300,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.stronger]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.octo = {
    PARENT: [exports.genericTank],
    LABEL: 'Octo Tank',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,      90,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     270,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,      45,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     135,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     225,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     315,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.spam]),
            TYPE: exports.bullet,
        }, },
    ],
};
exports.heptatrap = (() => {
    let a = 360/7, d = 1/7;
return {
    PARENT: [exports.genericTank],
    LABEL: 'Septa-Trapper',
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 0.8,
    },
    STAT_NAMES: statnames.trap,
    HAS_NO_RECOIL: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,     7,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,      a,     4*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,      a,     4*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     2*a,    1*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     2*a,    1*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     3*a,    5*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     3*a,    5*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     4*a,    2*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     4*a,    2*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     5*a,    6*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     5*a,    6*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     6*a,    3*d,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     6*a,    3*d,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap, g.bitmorereload]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
})();
exports.hexatrap = makeAuto({
    PARENT: [exports.genericTank],
    LABEL: 'Hexa-Trapper',
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 0.8,
    },
    STAT_NAMES: statnames.trap,
    HAS_NO_RECOIL: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,     7,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     60,     0.5,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     60,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     120,     0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     120,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     180,    0.5,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     180,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     240,     0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     240,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,     300,    0.5,  ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,     300,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
}, 'Hexa-Trapper');

exports.tri = {
    PARENT: [exports.genericTank],
    LABEL: 'Tri-Angle',
    BODY: {
        HEALTH: base.HEALTH * 0.9,
        SHIELD: base.SHIELD * 0.9,
        DENSITY: base.DENSITY * 0.6,
    },
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront, g.tonsmorrecoil]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     150,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     210,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};
exports.booster = {
    PARENT: [exports.genericTank],
    LABEL: 'Booster',
    BODY: {
        HEALTH: base.HEALTH * 0.8,
        SHIELD: base.SHIELD * 0.8,
        DENSITY: base.DENSITY * 0.2,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront, g.muchmorerecoil]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [  13,     8,      1,      0,     -1,     135,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  13,     8,      1,      0,      1,     225,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     145,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     215,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};
exports.fighter = {
    PARENT: [exports.genericTank],
    LABEL: 'Fighter',
    BODY: {
        DENSITY: base.DENSITY * 0.6,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [  16,     8,      1,      0,     -1,      90,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront]),
            TYPE: exports.bullet,
            LABEL: 'Side',
        }, }, {
        POSITION: [  16,     8,      1,      0,      1,     -90,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront]),
            TYPE: exports.bullet,
            LABEL: 'Side',
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     150,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     210,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};
exports.brutalizer = {
    PARENT: [exports.genericTank],
    LABEL: 'Surfer',
    BODY: {
        DENSITY: base.DENSITY * 0.6,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,     -1,      90,     0.5,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: [exports.autoswarm],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [   7,    7.5,    0.6,     7,      1,     -90,     0.5,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: [exports.autoswarm],
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     150,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     210,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};
exports.bomber = {
    PARENT: [exports.genericTank],
    LABEL: 'Bomber',
    BODY: {
        DENSITY: base.DENSITY * 0.6,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     130,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri]),
            TYPE: exports.bullet,
            LABEL: 'Wing',
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     230,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri]),
            TYPE: exports.bullet,
            LABEL: 'Wing',
        }, }, {
        POSITION: [  14,     8,      1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,     8,     1.5,    14,      0,     180,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.morerecoil]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.autotri = makeAuto(exports.tri);
exports.autotri.BODY = {
    SPEED: base.SPEED,
};
exports.falcon = {
    PARENT: [exports.genericTank],
    LABEL: 'Falcon',
    DANGER: 7,
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.9,
        FOV: base.FOV * 1.2,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  27,    8.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assass, g.lessreload]),
            TYPE: exports.bullet,
            LABEL: 'Assassin',
            ALT_FIRE: true,
        }, }, {
        POSITION: [   5,    8.5,   -1.6,     8,      0,      0,      0,   ],
    }, {
        POSITION: [  16,     8,      1,      0,      0,     150,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     210,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  18,     8,      1,      0,      0,     180,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster, g.halfrecoil]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
};

exports.auto3 = {
    PARENT: [exports.genericTank],
    LABEL: 'Auto-3',
    DANGER: 6,
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  11,     8,      0,      0,     190, 0],
        TYPE: exports.auto3gun,
    }, {
        POSITION: [  11,     8,      0,     120,    190, 0],
        TYPE: exports.auto3gun,
    }, {
        POSITION: [  11,     8,      0,     240,    190, 0],
        TYPE: exports.auto3gun,
    },
    ],
};
exports.auto5 = {
    PARENT: [exports.genericTank],
    LABEL: 'Auto-5',
    DANGER: 7,
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  11,     8,      0,      0,     190, 0],
        TYPE: exports.auto5gun,
    }, {
        POSITION: [  11,     8,      0,      72,    190, 0],
        TYPE: exports.auto5gun,
    }, {
        POSITION: [  11,     8,      0,     144,    190, 0],
        TYPE: exports.auto5gun,
    }, {
        POSITION: [  11,     8,      0,     216,    190, 0],
        TYPE: exports.auto5gun,
    }, {
        POSITION: [  11,     8,      0,     288,    190, 0],
        TYPE: exports.auto5gun,
    },
    ],
};
exports.heavy3 = {
    BODY: {
        SPEED: base.SPEED * 0.95,
    },
    PARENT: [exports.genericTank],
    LABEL: 'Mega-3',
    DANGER: 7,
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  14,     8,      0,      0,     190, 0],
        TYPE: exports.heavy3gun,
    }, {
        POSITION: [  14,     8,      0,     120,    190, 0],
        TYPE: exports.heavy3gun,
    }, {
        POSITION: [  14,     8,      0,     240,    190, 0],
        TYPE: exports.heavy3gun,
    },
    ],
};
exports.tribuild = {
    LABEL: 'Architect',
    BODY: {
        SPEED: base.SPEED * 1.1,
    },
    PARENT: [exports.genericTank],
    DANGER: 6,
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  12,     8,      0,      0,     190, 0],
        TYPE: exports.tribuildgun,
    }, {
        POSITION: [  12,     8,      0,     120,    190, 0],
        TYPE: exports.tribuildgun,
    }, {
        POSITION: [  12,     8,      0,     240,    190, 0],
        TYPE: exports.tribuildgun,
    },
    ],
};
exports.sniper3 = {
    PARENT: [exports.genericTank],
    DANGER: 7,
    LABEL: 'Sniper-3',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.6,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.25,
    },
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  13,     8,      0,      0,     170, 0],
        TYPE: exports.sniper3gun,
    }, {
        POSITION: [  13,     8,      0,     120,    170, 0],
        TYPE: exports.sniper3gun,
    }, {
        POSITION: [  13,     8,      0,     240,    170, 0],
        TYPE: exports.sniper3gun,
    },
    ],
};
exports.auto4 = {
    PARENT: [exports.genericTank],
    DANGER: 5,
    LABEL: 'Auto-4',
    FACING_TYPE: 'autospin',
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  13,     6,      0,      45,    160, 0],
        TYPE: exports.auto4gun,
    }, {
        POSITION: [  13,     6,      0,     135,    160, 0],
        TYPE: exports.auto4gun,
    }, {
        POSITION: [  13,     6,      0,     225,    160, 0],
        TYPE: exports.auto4gun,
    }, {
        POSITION: [  13,     6,      0,     315,    160, 0],
        TYPE: exports.auto4gun,
    },
    ],
};

exports.flanktrap = {
    PARENT: [exports.genericTank],
    LABEL: 'Trap Guard',
    STAT_NAMES: statnames.generic,
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  13,     8,      1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,     8,     1.7,    13,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.twintrap = {
    PARENT: [exports.genericTank],
    LABEL: 'Bulwark',
    STAT_NAMES: statnames.generic,
    DANGER: 6,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,     8,      1,      0,     5.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.twin, g.bitmorespeed]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  13,     8,      1,      0,     5.5,    190,     0,   ],
    }, {
        POSITION: [   4,     8,     1.7,    13,     5.5,    190,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  20,     8,      1,      0,    -5.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.flank, g.twin, g.bitmorespeed]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  13,     8,      1,      0,    -5.5,    170,    0.5,  ],
    }, {
        POSITION: [   4,     8,     1.7,    13,    -5.5,    170,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.guntrap = {
    PARENT: [exports.genericTank],
    LABEL: 'Gunner Trapper',
    DANGER: 7,
    STAT_NAMES: statnames.generic,
    BODY: {
        FOV: base.FOV * 1.25,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  19,     2,      1,      0,    -2.5,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.tonsmorrecoil, g.lotsmorrecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  19,     2,      1,      0,     2.5,     0,     0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.power, g.twin, g.tonsmorrecoil, g.lotsmorrecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  12,    11,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [  13,    11,      1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,    11,     1.7,    13,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.fast, g.halfrecoil]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.bushwhack = {
    PARENT: [exports.genericTank],
    LABEL: 'Bushwhacker',
    BODY: {
        ACCELERATION: base.ACCELERATION * 0.7,
        FOV: base.FOV * 1.2,
    },
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  24,    8.5,     1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.morerecoil]),
            TYPE: exports.bullet,
        }, }, {
        POSITION: [  13,    8.5,     1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,    8.5,    1.7,    13,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
};
exports.trapper = {
    PARENT: [exports.genericTank],
    LABEL: 'Trapper',
    STAT_NAMES: statnames.trap,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,     7,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
}
exports.tritrapper = {
    PARENT: [exports.genericTank],
    LABEL: 'Tri-Trapper',
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  15,     7,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.bitweak]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,    120,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,    120,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.bitweak]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, }, {
        POSITION: [  15,     7,      1,      0,      0,    240,      0,   ],
    }, {
        POSITION: [   3,     7,     1.7,    15,      0,    240,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.bitweak]),
            TYPE: exports.trap, STAT_CALCULATOR: gunCalcNames.trap,
        }, },
    ],
}
exports.heal = {
    PARENT: [exports.genericTank],
    LABEL: 'Healer',
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  10,    11,    -0.5,    14,      0,      0,      0,  ],
    }, {
        POSITION: [  21,    12,    -1.1,     0,      0,      0,      0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.heal]),
            TYPE: exports.bullet,
            STAT_CALCULATOR: gunCalcNames.sustained,
        }, },
    ],
};
exports.bacteria = {
    PARENT: [exports.genericTank],
    LABEL: 'Bacteria',
    DANGER: 7,
    CONTROLLERS: [
        'canRepel',
        'mapTargetToGoal',
    ],
    BODY: {
        /*PENETRATION: 1.2,
            PUSHABILITY: 0.6,
            ACCELERATION: 0.05,
            HEALTH: 0.6 * wepHealthFactor,
            DAMAGE: 1.25 * wepDamageFactor,
            SPEED: 3.8,
            RANGE: 200,
            DENSITY: 0.03,
            RESIST: 1.5,*/
        FOV: 2,
    },
    HITS_OWN_TYPE: 'hard',
    PERSISTS_AFTER_DEATH: 'always',
    MAX_BACTERIA: 16,
};
exports.bacteria.GUNS = [
    { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  5,     32,      1,      0,      0,      0,      1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone]),
            TYPE: exports.bacteria,
            STAT_CALCULATOR: gunCalcNames.sustained,
        }, },
],
    exports.arenaCloser = {
        PARENT: [exports.genericTank],
        LABEL: 'Arena Closer',
        NAME: 'Arena Closer',
        DANGER: 20,
        SIZE: 80,
        SKILL: skillSet({
            dam: 1,
            pen: 1,
            str: 1,
        }),
        BODY: { // def
            SHIELD: 1000000,
            REGEN: 100000,
            HEALTH: 1000000,
            DAMAGE: 50,
            DENSITY: 30,
            FOV: 10,
            SPEED: 8,
        },
        AI: {},
        GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
            POSITION: [  14,    10,       1,     0,      0,      0,      0,   ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, g.moreop]),
                TYPE: exports.bullet,
            }, },
        ],
        CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
        DRAW_HEALTH: false,
        CAN_GO_OUTSIDE_ROOM: true,
        CAN_BE_ON_LEADERBOARD: false,
        ACCEPTS_SCORE: false,
    };

exports.rocket = {
    LABEL: 'Rocket',
    TYPE: 'bullet',
    ACCEPTS_SCORE: false,
    SHAPE: [
        [-2, -1],
        [0, -1],
        [1, 0],
        [0, 1],
        [-2, 1],
    ],
    BODY: {
        PENETRATION: 1,
        SPEED: 3.75,
        RANGE: 90,
        DENSITY: 1.25,
        HEALTH: 0.33 * wepHealthFactor,
        DAMAGE: 4 * wepDamageFactor,
        PUSHABILITY: 0.3,
    },
    FACING_TYPE: 'smoothWithMotion',
    CAN_GO_OUTSIDE_ROOM: true,
    HITS_OWN_TYPE: 'never',
    DIE_AT_RANGE: true,
};

exports.developer = {
    PARENT: [exports.genericTank],
    LABEL: 'The Developer',
    DANGER: 12,
    INVISIBLE: [0, 0],
    ALPHA: 1,
    RESET_UPGRADES: true,
    SHAPE: [
        [-1, -0.8],
        [-0.8, -1],
        [0.8, -1],
        [1, -0.8],
        [0.2, 0],
        [1, 0.8],
        [0.8, 1],
        [-0.8, 1],
        [-1, 0.8],
    ],
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    BODY: { // def
        SHIELD: 1000000,
        REGEN: 100000,
        HEALTH: 1000000,
        DAMAGE: 10,
        DENSITY: 20,
        FOV: 5,
        SPEED: 25,
    },
    CAN_GO_OUTSIDE_ROOM: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    10,    -1.4,     0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.op, g.opreload]),
            TYPE: [exports.rocket, { SHAPE: 5, }],
        }, },
    ],
};
exports.developer2 = {
    PARENT: [exports.genericTank],
    LABEL: 'Developer B',
    DANGER: 12,
    INVISIBLE: [0, 0],
    ALPHA: 1,
    RESET_UPGRADES: true,
    SHAPE: [
        [-1, -0.8],
        [-0.8, -1],
        [0.8, -1],
        [1, -0.8],
        [0.2, 0],
        [1, 0.8],
        [0.8, 1],
        [-0.8, 1],
        [-1, 0.8],
    ],
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    BODY: { // def
        SHIELD: 1000000,
        REGEN: 100000,
        HEALTH: 1000000,
        DAMAGE: 10,
        DENSITY: 20,
        FOV: 5,
        SPEED: 25,
    },
    CAN_GO_OUTSIDE_ROOM: true,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    10,    -1.4,     0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.op, g.opreload]),
            TYPE: [exports.rocket, { SHAPE: 5, }],
        }, },
    ],
};

exports.boosterUndercover = {
    PARENT: [exports.booster],
    LABEL: 'Undercover Cop',
    NAME: 'TEAM POLICE',
    BODY: {
        HEALTH: base.HEALTH * 8,
        DENSITY: base.DENSITY * 4,
        SPEED: base.SPEED * 1.3,
        FOV: 3,
    },
    SKILL: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    DANGER: 7,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,     8,      1,      0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.trifront, g.bitop]),
            TYPE: exports.bullet,
            LABEL: 'Front',
        }, }, {
        POSITION: [  13,     8,      1,      0,     -1,     135,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  13,     8,      1,      0,      1,     225,    0.6,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     145,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, }, {
        POSITION: [  16,     8,      1,      0,      0,     215,    0.1,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flank, g.tri, g.thruster]),
            TYPE: exports.bullet,
            LABEL: gunCalcNames.thruster,
        }, },
    ],
    TURRETS: [{ /** SIZE     X       Y     ANGLE    ARC */
        POSITION: [  6,      0,      8,      0,      0,  1],
        TYPE: exports.policeLight1,
    }, {
        POSITION: [  6,      0,     -8,      0,      0,  1],
        TYPE: exports.policeLight4,
    }, {
        POSITION: [  6,      0,      3,      0,      0,  1],
        TYPE: exports.policeLight2,
    }, {
        POSITION: [  6,      0,     -3,      0,      0,  1],
        TYPE: exports.policeLight3,
    }],
};

exports.god = {
    PARENT: [exports.genericTank],
    LABEL: 'Manager',
    INVISIBLE: [0, 0.1],
    ALPHA: 0,
    DANGER: 13,
    RESET_UPGRADES: true,
    BODY: { // def
        SHIELD: 100000,
        REGEN: 100000,
        HEALTH: 100000,
        DAMAGE: 0,
        DENSITY: 1,
        FOV: 6,
        SPEED: 20,
    },
    AI: { skynet: true },
    STAT_NAMES: statnames.drone,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [     6,     12,    1.2,     8,      0,     0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.over, g.moreop, g.opreload, g.morespeed]),
            TYPE: exports.drone,
            SYNCS_SKILLS: true,
            MAX_CHILDREN: 20,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, }
    ],
    ACCEPTS_SCORE: false,
    HITS_OWN_TYPE: 'never',
    INTANGIBLE: true,
    CAN_BE_ON_LEADERBOARD: false,
    CAN_GO_OUTSIDE_ROOM: true,
};

exports.spectator = {
    PARENT: [exports.genericTank],
    LABEL: 'Spectator',
    INVISIBLE: [0, 0.1],
    ALPHA: 0,
    DANGER: 0,
    RESET_UPGRADES: true,
    BODY: { // def
        SHIELD: 100000,
        REGEN: 100000,
        HEALTH: 100000,
        DAMAGE: 0,
        DENSITY: 1,
        FOV: 6,
        SPEED: 20,
    },
    ACCEPTS_SCORE: false,
    HITS_OWN_TYPE: 'never',
    INTANGIBLE: true,
    CAN_BE_ON_LEADERBOARD: false,
    CAN_GO_OUTSIDE_ROOM: true,
};
exports.ak47 = {
    PARENT: [exports.genericTank],
    LABEL: 'School Shooter',
    RESET_UPGRADES: true,
    INVISIBLE: [0, 0],
    ALPHA: 1,
    SHAPE: 'm 7.93294,0.3852 c -0.0125,-0.025 -0.01,-0.2325 -0.01,-0.2325 l -0.0025,-0.105 -0.1025,0.0025 -0.095,0.2025 -0.095,0.145 c 0,0 -0.37496,0.0082 -0.535,0.005 -0.25,-0.005 -0.3925,-0.1425 -0.3925,-0.1425 l -0.0075,-0.095 -0.815,-0.005 c 0,0 0.005,-0.035 -0.015,-0.04 -0.02,-0.005 -0.99,-0.0025 -0.99,-0.0025 l -0.015,-0.0325 c 0,0 -0.1625,0 -0.2025,0.0025 -0.04,0.0025 -0.0875,0.055 -0.12,0.06 -0.0325,0.005 -0.1125,0.0025 -0.1125,0.0025 L 4.42044,0.0127 4.29794,0.0102 c 0,0 -0.005,0.05 0,0.115 -0.215,0 -1.80008,0.0032 -1.8775,0.0075 -0.045,0.0025 -0.09184,0.0296 -0.11302,0.05188 -0.02356,0.02476 -0.03814,0.06458 -0.03948,0.08562 -0.0675,0.005 -0.0825,0.0175 -0.12,0.055 -0.0375,0.0375 -0.03,0.125 -0.03,0.125 0,0 -0.57478,0.07816 -0.625,0.08 -0.16482,0.00598 -0.1125,-0.07 -0.3025,-0.05 -0.1014,0.01066 -1.09,0.125 -1.115,0.125 -0.025,0 -0.08438,0.01132 -0.0625,0.075 0.08812,0.25652 0.11084,0.58902 0.1025,0.69 -0.01078,0.13054 0.4025,-0.06 0.9225,-0.215 0.52,-0.155 1.095,-0.37 1.095,-0.37 0,0 0.05824,0.03246 0.0875,0.1025 0.02988,0.07156 0.0225,0.1575 0.0225,0.1575 0,0 -0.19,0.445 -0.24,0.52 -0.05,0.075 0.03,0.08 0.03,0.08 l 0.34,0.0925 c 0.035,0.00836 0.05582,-0.0025 0.06582,-0.03832 0.01532,-0.05488 0.02336,-0.27168 0.06336,-0.33168 0.04,-0.06 0.2175,-0.2675 0.2175,-0.2675 h 0.75832 l -0.00082,-0.31168 c 0,0 0.0025,0.01168 0.04914,0.005 0,0.80296 0.67824,1.48692 0.89502,1.59918 0.05768,0.02988 0.075,-0.005 0.09,-0.0325 0.015,-0.0275 0.18832,-0.30664 0.215,-0.36 0.02666,-0.05332 0.05332,-0.07332 -0.02668,-0.12664 C 4.0857,1.46426 4.10294,0.7702 4.10294,0.7702 c 0,0 0.285,-0.005 0.3175,-0.0025 0.0325,0.0025 0.13982,0.09734 0.1975,0.0975 0.23206,0.00074 0.2725,-0.1125 0.4475,-0.115 0.08006,-0.00114 0.9275,0 0.9275,0 v -0.1475 l 2.0025,0.0025 0.0025,-0.1975 c 0,0 -0.0525,0.0025 -0.065,-0.0225 z m -5.17634,0.66116 0.00134,-0.25164 0.5175,0.0025 c -0.02058,0.00796 0.0225,0.245 0.0225,0.245 l -0.54134,0.00414 z',
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  20,   1.5,      1,     50,      5,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.op, g.opreload]),
            TYPE: [exports.rocket, { SHAPE: 5, }],
        }, },
    ],
};
exports.betaTester = {
    PARENT: [exports.genericTank],
    LABEL: 'Beta Tester A',
    RESET_UPGRADES: true,
    INVISIBLE: [0, 0],
    ALPHA: 1,
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    10,    -1.4,     0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: [exports.bullet, { SHAPE: 5, }],
        }, },
    ],
};
exports.betaTester2 = {
    PARENT: [exports.genericTank],
    LABEL: 'Beta Tester B',
    RESET_UPGRADES: true,
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  18,    10,    -1.4,     0,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: [exports.bullet, { SHAPE: 5, }],
        }, },
    ],
};

// NPCS:
exports.crasher = {
    TYPE: 'crasher',
    LABEL: 'Crasher',
    COLOR: 5,
    SHAPE: 3,
    SIZE: 5,
    VALUE: 60,
    VARIES_IN_SIZE: true,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true, },
    BODY: {
        SPEED: 5,
        ACCELERATION: 1.4,
        HEALTH: 0.1,
        DAMAGE: 1.5,
        PENETRATION: 2,
        DENSITY: 0.5,
        PUSHABILITY: 0.25,
        RESIST: 1,
    },
    MOTION_TYPE: 'motor',
    FACING_TYPE: 'smoothWithMotion',
    HITS_OWN_TYPE: 'hard',
    HAS_NO_MASTER: true,
    DRAW_HEALTH: true,
};
exports.trapTurret = {
    PARENT: [exports.genericTank],
    LABEL: 'Turret',
    BODY: {
        FOV: 0.5,
    },
    INDEPENDENT: true,
    CONTROLLERS: ['nearestDifferentMaster'],
    COLOR: 16,
    AI: {
        view360: true,
    },
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  16,    14,      1,      0,      0,      0,      0,   ],
    }, {
        POSITION: [   4,    14,     1.8,    16,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.lowpower, g.fast, g.halfreload]),
            TYPE: exports.trap,
            STAT_CALCULATOR: gunCalcNames.trap,
            AUTOFIRE: true,
        }, },
    ],
};
exports.sentry = {
    PARENT: [exports.genericTank],
    TYPE: 'crasher',
    LABEL: 'Sentry',
    DANGER: 3,
    COLOR: 5,
    SHAPE: 3,
    SIZE: 10,
    VALUE: 5000,
    VARIES_IN_SIZE: true,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    AI: { NO_LEAD: true, },
    BODY: {
        FOV: 0.5,
        ACCELERATION: 1.1,
        DAMAGE: base.DAMAGE * 2,
        HEALTH: base.HEALTH * 4,
        SPEED: base.SPEED * 0.3,
    },
    MOTION_TYPE: 'motor',
    FACING_TYPE: 'smoothToTarget',
    HITS_OWN_TYPE: 'hard',
    HAS_NO_MASTER: true,
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true,
};
exports.sentrySwarm = {
    PARENT: [exports.sentry],
    DANGER: 3,
    GUNS: [{
        POSITION: [    7,    14,    0.6,     7,     0,    180,     0,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.morerecoil]),
            TYPE: exports.swarm,
            STAT_CALCULATOR: gunCalcNames.swarm,
        }, },
    ],
};
exports.sentryGun = makeAuto(exports.sentry, 'Sentry', { type: exports.heavy3gun, size: 12, });
exports.sentryTrap = makeAuto(exports.sentry, 'Sentry', { type: exports.trapTurret, size: 12, });

exports.miniboss = {
    PARENT: [exports.genericTank],
    TYPE: 'miniboss',
    DANGER: 6,
    SKILL: skillSet({
        rld: 0.7,
        dam: 0.5,
        pen: 0.8,
        str: 0.8,
        spd: 0.2,
        atk: 0.3,
        hlt: 1,
        shi: 0.7,
        rgn: 0.7,
        mob: 0,
    }),
    LEVEL: 45,
    CONTROLLERS: ['nearestDifferentMaster', 'minion', 'canRepel'],
    AI: { NO_LEAD: true, },
    FACING_TYPE: 'autospin',
    HITS_OWN_TYPE: 'hard',
    BROADCAST_MESSAGE: 'A visitor has left!',
};
exports.summoner = {
    PARENT: [exports.miniboss],
    LABEL: 'Summoner',
    DANGER: 8,
    SHAPE: 4,
    COLOR: 13,
    SIZE: 25,
    MAX_CHILDREN: 28,
    FACING_TYPE: 'autospin',
    VARIES_IN_SIZE: true,
    VALUE: 200000,
    BODY: {
        FOV: 0.9,
        SPEED: base.SPEED * 0.1,
        HEALTH: base.HEALTH * 7,
        DAMAGE: base.DAMAGE * 2.6
    },
    SKILL: skillSet({
        atk: 0.2,
        hlt: 1,
        spd: 0.3,
        str: 0.6,
        pen: 0.6,
        dam: 0.5,
        rld: 1,
        rgn: 0.2,
        shi: 0.2
    }),
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [ 3.5,   8.65,    1.2,     8,      0,     90,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [ 3.5,   8.65,    1.2,     8,      0,     270,    0.5,  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [ 3.5,   8.65,    1.2,     8,      0,      0,     0.25, ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [ 3.5,   8.65,    1.2,     8,      0,     180,    0.75  ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner]),
            TYPE: exports.sunchip,
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: gunCalcNames.necro,
            WAIT_TO_CYCLE: true,
        }, },
    ],
};
exports.skimboss = {
    PARENT: [exports.miniboss],
    LABEL: 'Elite Skimmer',
    DANGER: 8,
    SHAPE: 3,
    COLOR: 2,
    SIZE: 30,
    FACING_TYPE: 'autospin',
    VARIES_IN_SIZE: true,
    VALUE: 250000,
    BODY: {
        FOV: 1.4,
        SPEED: base.SPEED * 0.05,
        HEALTH: base.HEALTH * 11,
        SHIELD: base.SHIELD,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 2.5,
    },
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  15,     5,      0,     60,     170, 0],
        TYPE: exports.skimturret,
    }, {
        POSITION: [  15,     5,      0,     180,    170, 0],
        TYPE: exports.skimturret,
    }, {
        POSITION: [  15,     5,      0,     300,    170, 0],
        TYPE: exports.skimturret,
    },
    ],
};
exports.crasherSpawner = {
    PARENT: [exports.genericTank],
    LABEL: 'Spawned',
    STAT_NAMES: statnames.drone,
    CONTROLLERS: ['nearestDifferentMaster'],
    COLOR: 5,
    INDEPENDENT: true,
    AI: { chase: true, },
    MAX_CHILDREN: 4,
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   6,     12,    1.2,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.weak, g.weak]),
            TYPE: [exports.drone, { LABEL: 'Crasher', VARIES_IN_SIZE: true, DRAW_HEALTH: true }],
            SYNCS_SKILLS: true,
            AUTOFIRE: true,
            STAT_CALCULATOR: gunCalcNames.drone,
        }, },
    ],
};
exports.elite = {
    PARENT: [exports.miniboss],
    LABEL: 'Elite Crasher',
    COLOR: 5,
    SHAPE: 3,
    SIZE: 25,
    VARIES_IN_SIZE: true,
    VALUE: 150000,
    BODY: {
        FOV: 1.25,
        SPEED: base.SPEED * 0.1,
        HEALTH: base.HEALTH * 7,
        SHIELD: base.SHIELD,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 2.5,
    },
    SKILL: skillSet({
        rld: 0.5,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 0.5,
        atk: 0,
        hlt: 1,
        shi: 0,
        rgn: 0,
        mob: 0,
    }),
};
exports.elite_destroyer = {
    PARENT: [exports.elite],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [    5,    16,     1,      6,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.pound, g.destroy]),
            TYPE: exports.bullet,
            LABEL: 'Devastator',
        }, }, {
        POSITION: [    5,    16,     1,      6,      0,      60,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.pound, g.destroy]),
            TYPE: exports.bullet,
            LABEL: 'Devastator',
        }, }, {
        POSITION: [    5,    16,     1,      6,      0,     -60,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pound, g.pound, g.destroy]),
            TYPE: exports.bullet,
            LABEL: 'Devastator',
        }, },
    ],
    TURRETS: [{
        /*********  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  11,     0,      0,     180,    360,   0, ],
        TYPE: [exports.crasherSpawner]
    }, {
        POSITION: [  11,     0,      0,      60,    360,   0, ],
        TYPE: [exports.crasherSpawner]
    }, {
        POSITION: [  11,     0,      0,     -60,    360,   0, ],
        TYPE: [exports.crasherSpawner]
    }, {
        POSITION: [  11,     0,      0,       0,    360,   1, ],
        TYPE: [exports.bigauto4gun, { INDEPENDENT: true, COLOR: 5, }]
    },
    ],
};
exports.elite_gunner = {
    PARENT: [exports.elite],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [  14,    16,      1,      0,      0,     180,     0,   ],
    }, {
        POSITION: [   4,    16,     1.5,    14,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.hexatrap]),
            TYPE: [exports.pillbox, { INDEPENDENT: true, }],
        }, }, {
        POSITION: [   6,    14,     -2,      2,      0,      60,     0,   ],
    }, {
        POSITION: [   6,    14,     -2,      2,      0,     300,     0,   ],
    }
    ],
    AI: { NO_LEAD: false, },
    TURRETS: [{
        /*********  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  14,     8,      0,     60,     180,   0, ],
        TYPE: [exports.auto4gun],
    }, {
        POSITION: [  14,     8,      0,     300,    180,   0, ],
        TYPE: [exports.auto4gun],
    }],
};
exports.elite_sprayer = {
    PARENT: [exports.elite],
    SKILL: skillSet({
        rld: 0.3,
        dam: 0.5,
        pen: 0.5,
        str: 0.5,
        spd: 0.3,
        atk: 0,
        hlt: 1,
        shi: 0,
        rgn: 0,
        mob: 0,
    }),
    AI: { NO_LEAD: false, },
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [  14,     6,      0,     180,     190, 0],
        TYPE: [exports.spray, { COLOR: 5, }],
    }, {
        POSITION: [  14,     6,      0,      60,    190, 0],
        TYPE: [exports.spray, { COLOR: 5, }],
    }, {
        POSITION: [  14,     6,      0,     -60,    190, 0],
        TYPE: [exports.spray, { COLOR: 5, }],
    },
    ],
};

exports.palisade = {
    PARENT: [exports.miniboss],
    LABEL: 'Rogue Palisade',
    COLOR: 17,
    SHAPE: 6,
    SIZE: 30,
    VALUE: 500000,
    BODY: {
        FOV: 1.5,
        SPEED: base.SPEED * 0.05,
        HEALTH: base.HEALTH * 15,
        SHIELD: base.SHIELD * 3,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 2.5,
    },
    SKILL: skillSet({
        rld: 0,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 0,
        atk: 0,
        hlt: 1,
        shi: 0,
        rgn: 0,
        mob: 0,
    }),
    GUNS: [ { /**** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   4,      6,    -1.6,     8,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   4,      6,    -1.6,     8,      0,     60,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   4,      6,    -1.6,     8,      0,     120,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   4,      6,    -1.6,     8,      0,     180,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   4,      6,    -1.6,     8,      0,     240,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, }, {
        POSITION: [   4,      6,    -1.6,     8,      0,     300,     0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.factory, g.pound, g.thirdreload]),
            TYPE: exports.minion,
            STAT_CALCULATOR: gunCalcNames.drone,
            AUTOFIRE: true,
            MAX_CHILDREN: 2,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true,
        }, },
    ],
    TURRETS: [{ /*  SIZE     X       Y     ANGLE    ARC */
        POSITION: [   5,    10,      0,      30,    110, 0],
        TYPE: exports.trapTurret,
    }, {
        POSITION: [   5,    10,      0,      90,    110, 0],
        TYPE: exports.trapTurret,
    }, {
        POSITION: [   5,    10,      0,     150,    110, 0],
        TYPE: exports.trapTurret,
    }, {
        POSITION: [   5,    10,      0,     210,    110, 0],
        TYPE: exports.trapTurret,
    }, {
        POSITION: [   5,    10,      0,     270,    110, 0],
        TYPE: exports.trapTurret,
    }, {
        POSITION: [   5,    10,      0,     330,    110, 0],
        TYPE: exports.trapTurret,
    },
    ],
}

let mothershipProperties = {
    MAX_CHILDREN: 2,
    SHOOT_SETTINGS: combineStats([g.drone, g.over, g.mothership]),
    TYPE: exports.drone,
    AUTOFIRE: true,
    SYNCS_SKILLS: true,
    STAT_CALCULATOR: gunCalcNames.drone,
    WAIT_TO_CYCLE: true
};

let mothershipAutoProperties = {
    MAX_CHILDREN: 2,
    SHOOT_SETTINGS: combineStats([g.drone, g.over, g.mothership]),
    TYPE: [exports.drone, {
        AI: {
            skynet: true,
        },
        INDEPENDENT: true,
    }],
    AUTOFIRE: true,
    SYNCS_SKILLS: true,
    STAT_CALCULATOR: gunCalcNames.drone,
    WAIT_TO_CYCLE: true
};

exports.mothership = {
    PARENT: [exports.genericTank],
    LABEL: 'Mothership',
    NAME: 'Mothership',
    DANGER: 7,
    SHAPE: 16,
    SIZE: 50,
    STAT_NAMES: statnames.drone,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1,
        atk: 1,
        hlt: 1,
        shi: 1,
        rgn: 1,
        mob: 1,
    }),
    VALUE: 400000,
    BODY: {
        REGEN: 0,
        FOV: 2.4,
        SHIELD: 0,
        ACCELERATION: 0.5,
        SPEED: 1,
        HEALTH: 500,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
    },
    GUNS: [{
        POSITION: [4.3, 3.1, 1.2, 8, 0, 22.5, 1],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 45, 0.0625],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 67.5, 0.9375],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 90, 0.125],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 112.5, 0.875],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 135, 0.1875],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 157.5, 0.8125],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 180, 0.25],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 202.5, 0.75],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 225, 0.3125],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 247.5, 0.6875],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 270, 0.375],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 292.5, 0.625],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 315, 0.4375],
        PROPERTIES: mothershipAutoProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 337.5, 0.5625],
        PROPERTIES: mothershipProperties
    }, {
        POSITION: [4.3, 3.1, 1.2, 8, 0, 360, 0.5],
        PROPERTIES: mothershipAutoProperties
    }],
    LIFETIME: true
};

exports.Turkey_Iris = {
    PARENT: [exports.genericTank],
    LABEL: '',
    COLOR: 19,
};

exports.Turkey_Eye = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 3,
    },
    FACING_TYPE: 'toTarget',
    COLOR: 18,
    TURRETS: [ { /****  SIZE      X       Y     ANGLE    ARC  LAYER */
        POSITION: [    10.75,     1,      0,        0,   -15,   1, ],
        TYPE: exports.Turkey_Iris,
    }
    ],
};

exports.Turkey_Head = {
    PARENT: [exports.genericTank],
    LABEL: '',
    BODY: {
        FOV: 2,
    },
    CONTROLLERS: ['onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'],
    TURRETS: [ {/*** SIZE      X       Y     ANGLE      ARC  LAYER */
        POSITION: [  6.5,   5.97,    -5.07,      0,      -15, 1],
        TYPE: exports.Turkey_Eye,
    }, {
        POSITION: [  6.5,   5.97,     5.07,      0,      -15, 1],
        TYPE: exports.Turkey_Eye,
    },
    ],
    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [ 19.81,  8.09,   -1.76,  5.48,      0,      0,      0,   ],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.mini, g.stream]),
            TYPE: exports.bullet,
        }, },
    ],
};

let TurkeyProperties = {
    MAX_CHILDREN: 4,
    SHOOT_SETTINGS: combineStats([g.drone, g.over, g.mothership]),
    TYPE: exports.drone,
    AUTOFIRE: true,
    SYNCS_SKILLS: true,
    STAT_CALCULATOR: gunCalcNames.drone,
    WAIT_TO_CYCLE: true
};

let TurkeyAutoProperties = {
    MAX_CHILDREN: 4,
    SHOOT_SETTINGS: combineStats([g.drone, g.over, g.mothership]),
    TYPE: [exports.drone, {
        AI: {
            skynet: true,
        },
        INDEPENDENT: true,
    }],
    AUTOFIRE: true,
    SYNCS_SKILLS: true,
    STAT_CALCULATOR: gunCalcNames.drone,
    WAIT_TO_CYCLE: true
};

exports.Turkey_Mothership = {
    PARENT: [exports.genericTank],
    LABEL: 'Turkey',
    NAME: 'Turkey',
    DANGER: 7,
    SHAPE: 16,
    SIZE: 50,
    STAT_NAMES: statnames.drone,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1,
        atk: 1,
        hlt: 1,
        shi: 1,
        rgn: 1,
        mob: 1,
    }),
    VALUE: 400000,
    BODY: {
        REGEN: 0,
        FOV: 2.4,
        SHIELD: 0,
        ACCELERATION: 0.5,
        SPEED: 1,
        HEALTH: 500,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
    },
    LIFETIME: true,
    TURRETS: [ {/******  SIZE      X       Y     ANGLE    ARC  LAYER */
        POSITION: [     10.76,  8.75,      0,        0,   -15,    1],
        TYPE: [exports.Turkey_Head,
            {CONTROLLERS: ['onlyAcceptInArc', 'mapAltToFire', 'nearestDifferentMaster'] }],
    },],
    GUNS: [ {/***** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [ 18.00,  4.69,     1,    0,      0,     135,    2/3,],
        PROPERTIES: TurkeyAutoProperties,
    }, {
        POSITION: [ 20.96,  6.69,     1,    0,      0,   157.5,    1/3,],
        PROPERTIES: TurkeyProperties,
    }, {
        POSITION: [ 18.00,  4.69,     1,    0,     0,      225,    2/3,],
        PROPERTIES: TurkeyAutoProperties,
    }, {
        POSITION: [ 20.96,  6.69,     1,    0,      0,   202.5,    1/3,],
        PROPERTIES: TurkeyProperties,
    }, {
        POSITION: [ 24.09,  8.69,     1,    0,      0,     180,      0,],
        PROPERTIES: TurkeyAutoProperties,
    }, {
        POSITION: [ 24.09,  8.69,     1,    0,      0,     180,      0,],
        PROPERTIES: TurkeyAutoProperties,
    }, {
        POSITION: [  4,     5,      1,     10,      0,     105,    0.1,],
        PROPERTIES: TurkeyProperties,
    }, {
        POSITION: [  4,     5,      1,     10,      0,    -105,    0.1,],
        PROPERTIES: TurkeyProperties,
    },
    ],
};
exports.bot = {
    FACING_TYPE: 'looseToTarget',
    BODY: {
        SIZE: 10,
    },
    //COLOR: 17,
    CONTROLLERS: [
        'nearestDifferentMaster', 'mapAltToFire', 'minion', 'fleeAtLowHealth'
    ],
    AI: { STRAFE: true, },
};

exports.ball = {
    PARENT: [exports.genericEntity],
    LABEL: 'Ball',
    COLOR: 3,
    SIZE: 55,
    DAMAGE_EFFECTS: false,
    GIVE_KILL_MESSAGE: false,
    DRAW_HEALTH: false,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    BODY: { // def
        SHIELD: 100000,
        REGEN: 10000,
        HEALTH: 100000,
        DAMAGE: base.DAMAGE * 10,
        DENSITY: 0.1,
        FOV: 1,
        SPEED: base.SPEED,
        PUSHABILITY: 1,
    },
};

exports.ballBlue = {
    PARENT: [exports.ball],
    LABEL: 'Blue Ball',
    COLOR: 10,
};

exports.ballGreen = {
    PARENT: [exports.ball],
    LABEL: 'Green Ball',
    COLOR: 11,
};

exports.ballRed = {
    PARENT: [exports.ball],
    LABEL: 'Red Ball',
    COLOR: 12,
};

exports.ballMagenta = {
    PARENT: [exports.ball],
    LABEL: 'Magenta Ball',
    COLOR: 15,
};

exports.stresstester = {
    PARENT: [exports.genericTank],
    LABEL: 'STRESSER',
    DANGER: 17,
    LEVEL: 60,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: 'locksFacing',
    BODY: {
        FOV: 1.3,
        SPEED: base.SPEED * 0.9,
        HEALTH: base.HEALTH * 1.3,
        SHIELD: base.SHIELD * 1.3,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 0.6,
    },

    GUNS: [ { /*** LENGTH  WIDTH   ASPECT    X       Y     ANGLE   DELAY */
        POSITION: [   7,    15,    0.6,     7,      0,     90,      0,   ],

        PROPERTIES: {

            SHOOT_SETTINGS: combineStats([g.stresstest, g.battle]),

            TYPE: exports.swarm,

            STAT_CALCULATOR: gunCalcNames.swarm,

            LABEL: 'Guided'

        }, }, {

        POSITION: [   7,    15,    0.6,     7,     0,     270,    0,  ],

        PROPERTIES: {

            SHOOT_SETTINGS: combineStats([g.stresstest, g.battle]),

            TYPE: exports.swarm,

            STAT_CALCULATOR: gunCalcNames.swarm,

            LABEL: 'Guided'

        }, },
    ],

};

exports.ball.UPGRADES_TIER_1 = [exports.ballBlue, exports.ballGreen, exports.ballRed, exports.ballMagenta];

// UPGRADE PATHS
exports.developer.UPGRADES_TIER_1 = [
    exports.basic,
    exports.developer2,
    exports.betaTester,
    exports.spectator,
    exports.god,
    exports.palisade,
    exports.dominator,
    exports.bacteria,
];
exports.developer2.UPGRADES_TIER_1 = [
    exports.basic,
    exports.developer,
    exports.lmg,
    exports.mothership,
    exports.Turkey_Mothership,
    exports.ak47,
];
exports.dominator.UPGRADES_TIER_1 = [
    exports.destroyerDominator,
    exports.gunnerDominator,
    exports.trapperDominator,
    exports.baseDroneSpawner,
    exports.baseProtector,
]

exports.betaTester.UPGRADES_TIER_1 = [
    exports.basic,
    exports.betaTester2,
    exports.heal,
    exports.commander,
    exports.sniper3,
    exports.armsman,
];

exports.betaTester2.UPGRADES_TIER_1 = [
    exports.basic,
    exports.betaTester,
    exports.bentboomer,
    exports.vulcan,
    exports.quadtrapper,
    exports.quint,
    exports.spectator,
];

exports.palisade.UPGRADES_TIER_1 = [
    exports.elite_destroyer,
    exports.elite_gunner,
    exports.elite_sprayer,
    exports.sentrySwarm,
    exports.sentryGun,
    exports.sentryTrap,
    exports.skimboss,
    exports.summoner,
    exports.arenaCloser,
    exports.miniboss
];

exports.basic.UPGRADES_TIER_1 = [exports.twin, exports.sniper, exports.machine, exports.flank, exports.director, exports.pound, exports.trapper];
exports.basic.UPGRADES_TIER_3 = [exports.single];

exports.basic.UPGRADES_TIER_2 = [exports.smash];
exports.smash.UPGRADES_TIER_3 = [exports.megasmash, exports.spike, exports.autosmash, exports.landmine];

exports.twin.UPGRADES_TIER_2 = [exports.double, exports.bent, exports.gunner, exports.hexa];
exports.twin.UPGRADES_TIER_3 = [exports.dual, exports.twintrap, exports.musket];
exports.double.UPGRADES_TIER_3 = [exports.tripletwin, exports.split, exports.autodouble, exports.bentdouble];
exports.bent.UPGRADES_TIER_3 = [exports.penta, exports.spread, exports.benthybrid, exports.bentdouble, exports.triple];
exports.gunner.UPGRADES_TIER_3 = [exports.autogunner, exports.nailgun, exports.auto4, exports.machinegunner, exports.guntrap, exports.hurricane, exports.overgunner];

exports.sniper.UPGRADES_TIER_2 = [exports.assassin, exports.hunter, exports.mini, exports.rifle];
exports.sniper.UPGRADES_TIER_3 = [exports.bushwhack];
exports.assassin.UPGRADES_TIER_3 = [exports.ranger, exports.falcon, exports.stalker, exports.autoass];
exports.hunter.UPGRADES_TIER_3 = [exports.preda, exports.poach, exports.sidewind, exports.dual];
exports.rifle.UPGRADES_TIER_3 = [exports.musket];

exports.machine.UPGRADES_TIER_2 = [exports.artillery, exports.mini, exports.gunner];
exports.machine.UPGRADES_TIER_3 = [exports.spray];
exports.artillery.UPGRADES_TIER_3 = [exports.mortar, exports.spread, exports.skimmer, exports.spinner];
exports.mini.UPGRADES_TIER_3 = [exports.stream, exports.nailgun, exports.hybridmini, exports.minitrap];

exports.pound.UPGRADES_TIER_2 = [exports.destroy, exports.builder, exports.artillery]
exports.pound.UPGRADES_TIER_3 = [exports.shotgun, exports.eagle];
exports.destroy.UPGRADES_TIER_3 = [exports.conq, exports.anni, exports.hybrid, exports.construct, exports.hiveshooter];

exports.flank.UPGRADES_TIER_2 = [exports.hexa, exports.tri, exports.auto3, exports.flanktrap, exports.tritrapper];
exports.flank.UPGRADES_TIER_3 = [exports.tribuild];
exports.tri.UPGRADES_TIER_3 = [exports.fighter, exports.booster, exports.falcon, exports.bomber, exports.autotri, exports.brutalizer, exports.eagle];
exports.hexa.UPGRADES_TIER_3 = [exports.octo, exports.hurricane, exports.hexatrap];
exports.auto3.UPGRADES_TIER_3 = [exports.auto5, exports.heavy3, exports.auto4, exports.banshee];
exports.flanktrap.UPGRADES_TIER_3 = [exports.bushwhack, exports.guntrap, exports.bomber, exports.conq, exports.twintrap];

exports.director.UPGRADES_TIER_2 = [exports.overseer, exports.cruiser, exports.underseer, exports.lilfact];
exports.director.UPGRADES_TIER_3 = [exports.manager];
exports.overseer.UPGRADES_TIER_3 = [exports.overlord, exports.overtrap, exports.overgunner, exports.banshee, exports.autoover, exports.overdrive];
exports.underseer.UPGRADES_TIER_3 = [exports.necromancer, exports.maleficitor];
exports.cruiser.UPGRADES_TIER_3 = [exports.carrier, exports.battleship, exports.fortress];
exports.lilfact.UPGRADES_TIER_3 = [exports.factory, exports.lilfactauto];

exports.trapper.UPGRADES_TIER_2 = [exports.builder, exports.tritrapper, exports.flanktrap];
exports.trapper.UPGRADES_TIER_3 = [exports.minitrap, exports.overtrap];
exports.builder.UPGRADES_TIER_3 = [exports.construct, exports.autobuilder, exports.engineer, exports.boomer, exports.tribuild, exports.conq];
exports.tritrapper.UPGRADES_TIER_3 = [exports.fortress, exports.hexatrap, exports.heptatrap, exports.tribuild];

/*exports.smash.UPGRADES_TIER_3 = [exports.megasmash, exports.spike, exports.autosmash];

    exports.twin.UPGRADES_TIER_2 = [exports.double, exports.bent, exports.triple, exports.hexa];
        exports.double.UPGRADES_TIER_3 = [exports.tripletwin, exports.autodouble];
        exports.bent.UPGRADES_TIER_3 = [exports.penta, exports.benthybrid];
        exports.triple.UPGRADES_TIER_3 = [exports.quint];

    exports.sniper.UPGRADES_TIER_2 = [exports.assassin, exports.overseer, exports.hunter, exports.builder];
        exports.assassin.UPGRADES_TIER_3 = [exports.ranger];
        exports.overseer.UPGRADES_TIER_3 = [exports.overlord, exports.battleship
            , exports.overtrap, exports.necromancer, exports.factory, exports.fortress];
        exports.hunter.UPGRADES_TIER_3 = [exports.preda, exports.poach];
        exports.builder.UPGRADES_TIER_3 = [exports.construct, exports.autobuilder];

    exports.machine.UPGRADES_TIER_2 = [exports.destroy, exports.gunner, exports.artillery];
        exports.destroy.UPGRADES_TIER_3 = [exports.anni, exports.hybrid];
        exports.gunner.UPGRADES_TIER_3 = [exports.autogunner, exports.mortar, exports.stream];
        exports.artillery.UPGRADES_TIER_3 = [exports.mortar, exports.spread, exports.skimmer];
        exports.machine.UPGRADES_TIER_3 = [exports.spray];

    exports.flank.UPGRADES_TIER_2 = [exports.hexa, exports.tri, exports.auto3, exports.flanktrap];
        exports.hexa.UPGRADES_TIER_3 = [exports.octo];
        exports.tri.UPGRADES_TIER_3 = [exports.booster, exports.fighter, exports.bomber, exports.autotri];
        exports.auto3.UPGRADES_TIER_3 = [exports.auto5, exports.heavy3];
        exports.flanktrap.UPGRADES_TIER_3 = [exports.guntrap, exports.fortress, exports.bomber];*/
