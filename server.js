/* jslint node: true */
"use strict";

const sort = require('fast-sort');
const crypto = require('crypto');
const https = require('https');
const cluster = require('cluster');
const fork = require('child_process').fork;
const os = require('os');
const cpus = os.cpus().length;
const util = require('./lib/util');
const EventEmitter = require('events');
util.log('Server CPU count ' + cpus);
let Discord
try {
    Discord = require('discord.js')
} catch (e) {
    const DummyObject = () => {
        const handlers = {
            get: () => DummyObject(),
            set: () => true,
            construct: () => DummyObject()
        }

        return new Proxy(DummyObject, handlers);
    }
    Discord = DummyObject()
}
const Module = require('module')
const inspect = require('util').inspect

// const RemoteWorker = require('./rsmx.js')
const SECRET = (() => {
    let id = process.argv[2]
    if (id) {
        try {
            return require(`../private-${ id }.json`)
        } catch(e) {}
        try {
            return require(`../../private-${ id }.json`)
        } catch(e) {}
    }
    try {
        return require('../private.json')
    } catch(e) {}
    try {
        return require('../../private.json')
    } catch(e) {}
    try {
        return require('./private.json');
    } catch(e) {}
    return process.env
})()
const c = require(`./config/${ SECRET.NAME }.json`)

const ROOT = SECRET.ROOT || ''

let ROOMSPEED = c.gameSpeed;

const ran = require('./lib/random')
const hshg = require('./lib/hshg')

// Let's get a cheaper array removal thing
Array.prototype.remove = index => {
    return util.remove(this, index);
}

const arrasmark = {
    active: true,
}

let webhooks = {
    keys: {
    },
    buffer: '',
    send(data) {
        let path = webhooks.keys[c.NAME]
        let req = https.request({
            hostname: 'discordapp.com',
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, () => {})
        req.write(JSON.stringify({ content: data.trim() }))
        req.end()
    },
    log(data) {
        data = (data || '') + ''
        if (data.length > 1500) return
        if (webhooks.buffer.length + 1 + data.length > 2000) {
            webhooks.send(webhooks.buffer)
            webhooks.buffer = ''
        }
        webhooks.buffer += '\n' + data
    },
}
let accessTable = {
    root: [
        '239162248990294017', // CX#6768
        '267777987796008960', // Syncinus#4829
        '262031707295711233', // ampdot#6081
    ],
    dev: [
        '242024762010763266', // ZeZo#1023
        '280483169772240897', // Limit#7456
        '257571043852419082', // Skrialik#0420
        '342038795757027329', // Titan#1471
    ],
    beta: [
        '298569359683616769', // neph#5159
        '308096389194186755', // Road#6943
        '345346351875358721', // EternalFrost#0955
        '217542099132743681', // PokeSvorlds#0299
        '340270483838599168', // Astra#1657

        '181829457852628993', // KoleOBlack#1004
        '411924557910245406', // moouse#3099

        '115148165128257544', // Ɦﻉɭɭƈคፕ#1505
        '242828908741918721', // Jimmy#3523
        '284422213862424589', // S3CR3T#4280

        '314381785100320768', // 〔𒁈〕᮰ᮺᮄᮋᮟ᮷#1350
        '375837262501642251', // Redchicken1234#2605
        '423568118015721475', // CancelX#3351
    ],
    donator: [
        '18062501',
        '18071802',
        '102167500237594624', // Jackson#6409
        '273145338506903552', // VarixDog#2202
    ],
    patron: [
        '359074747897872385', // !- DISTRAY -!#9097
    ],
}

let calculateAccess = id => {
    if (accessTable.root.indexOf(id) !== -1) return 3
    switch (c.IS_BETA) {
        case 0:
            break
        case 1:
            if (accessTable.dev.indexOf(id) !== -1) return 2
            if (accessTable.beta.indexOf(id) !== -1) return 1
            break
        case 2:
            if (accessTable.dev.indexOf(id) !== -1) return 2
            if (accessTable.beta.indexOf(id) !== -1) return 2
            if (accessTable.donator.indexOf(id) !== -1) return 2
            if (accessTable.patron.indexOf(id) !== -1) return 1
            break
    }
    return 0
}

let runHash = id => {
    let hash = crypto.createHash('sha256')
    hash.update(id + ':' + ROOT)
    return id + '$' + hash.digest('hex')
}

if (ROOT) {
    const TOKEN_CTX = Buffer.from('LzlLG8a9jcCq4sLOEOXj7mLMQ0B/49++zc9nFTe7HOBU74r392VCZ9CNpd7fn0vcLNT+TJ+B5La3Ew0=', 'base64')
    const KEY = crypto.createHash('sha256').update(ROOT).digest()
    const IV = '40VLVpzyETYOqg1A'
    let d = crypto.createDecipheriv('aes-256-ctr', KEY, IV)
    d.write(TOKEN_CTX)
    const TOKEN = d.read().toString()
}

let fps = 0
const dirtyCheck = (p, r) => entitiesToAvoid.some(e => Math.abs(p.physics.position[0] - e.physics.position[0]) < r + e.size() && Math.abs(p.physics.position[1] - e.physics.position[1]) < r + e.size())
const createRoom = c => {
    let teamCount = +c.MODE.charAt(0) || 0
    let room = {
        name: c.NAME,
        lastCycle: undefined,
        nextCycle: undefined,
        cycleSpeed: 1000 / ROOMSPEED / 25,
        networkSpeed: 1000 / c.networkUpdateFactor,
        width: c.WIDTH,
        height: c.HEIGHT,
        setup: c.ROOM_SETUP,
        xgrid: c.ROOM_SETUP[0].length,
        ygrid: c.ROOM_SETUP.length,
        xgridWidth: c.WIDTH / c.ROOM_SETUP[0].length,
        ygridHeight: c.HEIGHT / c.ROOM_SETUP.length,
        gameMode: c.MODE,
        skillBoost: c.SKILL_BOOST,
        scale: {
            square: c.WIDTH * c.HEIGHT / 100000000,
            linear: Math.sqrt(c.WIDTH * c.HEIGHT / 100000000),
        },
        maxFood: c.WIDTH * c.HEIGHT / 100000 * c.FOOD_AMOUNT,
        isInRoom: location => {
            return location[0] >= 0 && location[0] < c.WIDTH && location[1] >= 0 && location[1] < c.HEIGHT
        },
        lifetime: [],
        singles: [],
        chats: [],
        topPlayerID: -1,
        partyLinks: teamCount > 1 ? Array(teamCount).fill().map((_, i) => 1000 * (i + 1) + Math.floor(1000 * Math.random())) : [],
    }
    room.findType = (...type) => {
        let output = []
        for (let j = 0; j < room.setup.length; j++) {
            let row = room.setup[j]
            for (let i = 0; i < row.length; i++) {
                if (type.indexOf(row[i]) !== -1) {
                    output.push({
                        x: (i + 0.5) / room.xgrid * room.width,
                        y: (j + 0.5) / room.ygrid * room.height,
                        id: i * room.xgrid + j
                    })
                }
            }
        }
        room[type[0]] = output
    }
    room.findType('nest')
    room.findType('norm', 'mot1', 'mot2', 'mot3', 'mot4')
    room.findType('mot1')
    room.findType('mot2')
    room.findType('mot3')
    room.findType('mot4')
    room.findType('bas1', 'bap1', 'bad1')
    room.findType('bas2', 'bap2', 'bad2')
    room.findType('bas3', 'bap3', 'bad3')
    room.findType('bas4', 'bap4', 'bad4')
    room.findType('bap1')
    room.findType('bap2')
    room.findType('bap3')
    room.findType('bap4')
    room.findType('bad1')
    room.findType('bad2')
    room.findType('bad3')
    room.findType('bad4')
    room.findType('domx')
    room.findType('roid')
    room.findType('rock')
    room.findType('wall')
    room.findType('edge')
    room.findType('port')
    room.findType('dor1')
    room.findType('ctr1')
    room.nestFoodAmount = 1.5 * Math.sqrt(room.nest.length) / room.xgrid / room.ygrid
    room.random = () => {
        return [
            ran.irandom(room.width),
            ran.irandom(room.height),
        ]
    }
    room.randomType = type => {
        let selection = room[type][ran.irandom(room[type].length-1)]
        return [
            ran.irandom(0.5*room.width/room.xgrid) * ran.choose([-1, 1]) + selection.x,
            ran.irandom(0.5*room.height/room.ygrid) * ran.choose([-1, 1])  + selection.y,
        ]
    }
    room.gauss = clustering => {
        let output
        do {
            output = [
                ran.gauss(room.width/2, room.height/clustering),
                ran.gauss(room.width/2, room.height/clustering),
            ]
        } while (!room.isInRoom(output))
    }
    room.gaussInverse = clustering => {
        let output
        do {
            output = [
                ran.gaussInverse(0, room.width, clustering),
                ran.gaussInverse(0, room.height, clustering),
            ]
        } while (!room.isInRoom(output))
        return output
    }
    room.gaussRing = (radius, clustering) => {
        let output
        do {
            output = ran.gaussRing(room.width * radius, clustering)
            output = [
                output[0] + room.width/2,
                output[1] + room.height/2,
            ]
        } while (!room.isInRoom(output))
        return output
    }
    room.roomAt = location => {
        if (!room.isInRoom(location)) return false
        let x = Math.floor(location[0] * room.xgrid / room.width)
        let y = Math.floor(location[1] * room.ygrid / room.height)
        return {
            x: (x + 0.5) / room.xgrid * room.width,
            y: (y + 0.5) / room.ygrid * room.height,
            id: x * room.xgrid + y
        }
    }
    room.isIn = (type, location) => {
        if (!room.isInRoom(location)) return false
        let a = Math.floor(location[1] * room.ygrid / room.height)
        let b = Math.floor(location[0] * room.xgrid / room.width)
        return type === room.setup[a][b]
    }
    room.isInNorm = location => {
        if (room.isInRoom(location)) {
            let a = Math.floor(location[1] * room.ygrid / room.height)
            let b = Math.floor(location[0] * room.xgrid / room.width)
            let v = room.setup[a][b]
            return v !== 'norm' && v !== 'roid' && v !== 'rock' && v !== 'wall' && v !== 'edge'
        } else {
            return false
        }
    }
    room.gaussType = (type, clustering) => {
        let selection = room[type][ran.irandom(room[type].length-1)]
        let location = {}
        do {
            location = [
                ran.gauss(selection.x, room.width/room.xgrid/clustering),
                ran.gauss(selection.y, room.height/room.ygrid/clustering),
            ]
        } while (!room.isIn(type, location))
        return location
    }
    room.setType = (type, location) => {
        if (!room.isInRoom(location)) return false
        let a = Math.floor(location[1] * room.ygrid / room.height)
        let b = Math.floor(location[0] * room.xgrid / room.width)
        room.setup[a][b] = type;
        Sockets.SocketFunctions.BroadcastRoom();
        //sockets.broadcastRoom()
    }
    room.checkType = (check) => {
        room[check].length > 0;
    }

    util.log(`Room ${ room.name }:${ room.gameMode }: (size ${ room.width }x${ room.height }) initialized. Max food: ${ room.maxFood }, max nest food: ${ room.maxFood * room.nestFoodAmount }.`)
    webhooks.log('-'.repeat(100))
    webhooks.log(`Room \`\`${ room.name }:${ room.gameMode }:\`\` (size ${ room.width }x${ room.height }) initialized.`)
    return room
}

let room = createRoom(c)

function nearest(array, location, test) {
    if (!array.length)
        return
    let priority = Infinity, lowest
    if (test) {
        for (let instance of array) {
            let x = instance.physics.position[0] - location[0]
            let y = instance.physics.position[1] - location[1]
            let d = x * x + y * y
            if (d < priority && test(instance, d)) {
                priority = d
                lowest = instance
            }
        }
    } else {
        for (let instance of array) {
            let x = instance.physics.position[0] - location[0]
            let y = instance.physics.position[1] - location[1]
            let d = x * x + y * y
            if (d < priority) {
                priority = d
                lowest = instance
            }
        }
    }
    return lowest
}


function timeOfImpact(p, v, s) {
    // Requires relative position and velocity to aiming point
    let a = s * s - (v[0] * v[0] + v[1] * v[1])
    let b = p[0] * v[0] + p[1] * v[1]
    let c = p[0] * p[0] + p[1] * p[1]

    let d = b * b + a * c

    let t = 0
    if (d >= 0) {
        t = Math.max(0, (b + Math.sqrt(d)) / a)
    }

    return t*0.9
}

// Get class definitions and index them
const ClassIndices = [];
let Class = (() => {
    let def = require('./lib/definitions'),
        i = 0;
    for (let k in def) {
        if (!def.hasOwnProperty(k)) continue;
        def[k].index = i++;
        ClassIndices.push(def[k]);
    }
    return def
})();

const lazyRealSizes = (() => {
    let o = [1, 1, 1];
    for (let i = 3; i < 256; i++) {
        // We say that the real size of a 0-gon, 1-gon, 2-gon is one, then push the real sizes of triangles, squares, etc...
        o.push(
            Math.sqrt((2 * Math.PI / i) * (1 / Math.sin(2 * Math.PI / i)))
        );
    }
    return o;
})();

// Shared math functions
const getLength = (x, y) => {
    return Math.sqrt(x * x + y * y);
    //return Math.sqrt(x ** 2 + y ** 2);
};
const getDirection = (x, y) => {
    return Math.atan2(y, x);
};

//
const DEGTORAD = Math.PI / 180;
const RADTODEG = 180 / Math.PI;
const NULLVECTOR = [0, 0];
let ENTITYID = 0;
let VIEWID = 0;
let TIMESTEP = 1;
let ELAPSED = 0;

//const ID_STORAGE = [0];

/*
const property = (data, index, initial = NaN) => {
  if (initial !== NaN) data[index] = initial;
  return {
    get: (element = -1) => (element !== -1) ? data[index][element] : data[index],
    set: (value, element = -1) => (element !== -1) ? data[index][element] = value : data[index] = value,
  }
}

const boolProperty = (data, index, initial = NaN) => {
  if (initial !== NaN) data[index] = initial >> 0;
  return {
    get: () => (data[index]),
    set: (value) => (data[index] = (value >> 0)),
  }
}

const stringProperty = (data, index, initial = NaN) => {
  if (initial !== NaN) {
    let length = initial.length;
    let overlap = -(Math.abs(index + length - data.length));
    if (overlap > 0) {
      // we have to resize the array to work
      let newLength = data.length + overlap;
      let newBuffer
    } else {
      for (let i = index; i < length; i++) {
        data[i] = initial.charCodeAt(i);
      }
    }
  }
}
*/

//const biggerBuffer = (buffer, newsize) => { let newBuffer = Buffer.alloc(newsize); newBuffer.copy(buffer); return newBuffer; };

/*
const property = (data, index, initial = NaN, set = (data, index, value) => data.write(value, index), get = (data, index) => data[index]) => {
  if (index > data.length) data = biggerBuffer(data, index);
  if (initial !== NaN) set(data, index, initial);

  return {
    get: () => get(data, index),
    set: (value) => set(data, index, value),
  }
}
*/

/*
const property = (data, index, initial) => {
  data[index] = initial >> 0;

  return {
    get: () => data[index],
    set: (value) => data[index] = value >> 0,
    add: (value) => data[index] = data[index]   + value >> 0,
    sub: (value) => data[index] = data[index]   - value >> 0,
    mul: (value) => data[index] = data[index]   * value >> 0,
    div: (value) => data[index] = data[index]   / value >> 0,
    mod: (value) => data[index] = data[index]   % value >> 0,
    exp: (value) => data[index] = data[index]  ** value >> 0,
    lsh: (value) => data[index] = data[index]  << value >> 0,
    rsh: (value) => data[index] = data[index]  >> value >> 0,
    urs: (value) => data[index] = data[index] >>> value >> 0,
    and: (value) => data[index] = data[index]   & value >> 0,
    xor: (value) => data[index] = data[index]   ^ value >> 0,
    _or: (value) => data[index] = data[index]   | value >> 0,
  }
}

const arrayProperty = (data, indexList, initial) => {
  //let get = null;
  //let set = null;
  let grab = null;
  let change = null;
  let length = 0;
  let iMod = null;
    if (Array.isArray(indexList)) {
      for (let i = 0; i < indexList.length; i++) {
        data[indexList[i]] = initial[i] >> 0;
        length++;
      }
      //get = (element) => data[indexList[element]];
      //set = (element, value) => data[indexList[element]] = value >> 0;
      grab = () => { let arr = []; for (let i = 0; i < length; i++) arr.push(data[indexList[i]]); return arr; };
      change = (value) => { if (value <= length) for (let i = 0; i < value.length; i++) data[indexList[i]] = value[i]; else null; };
      iMod = (element) => indexList[element];
    } else {
      for (let i = indexList; i < initial.length; i++) {
        data[i] = initial[i] >> 0;
        length++;
      }
      //get = (element) => data[indexList + element];
      //set = (element, value) => data[indexList + element] = value >> 0;
      grab = () => data.slice(indexList + length);
      change = (value) => (value.length <= length) ? data.set(value, indexList) : null;
      iMod = (element) => indexList + element;
    }

  return {
    get: (element = -1) => (element !== -1) ? data[iMod(element)] : grab(),
    set: (value, element = -1) => (element !== -1) ? data[iMod(element)] = value >> 0 : change(value),
    add: (value, element) => data[iMod(element)] = data[iMod(element)]   + value >> 0,
    sub: (value, element) => data[iMod(element)] = data[iMod(element)]   - value >> 0,
    mul: (value, element) => data[iMod(element)] = data[iMod(element)]   * value >> 0,
    div: (value, element) => data[iMod(element)] = data[iMod(element)]   / value >> 0,
    mod: (value, element) => data[iMod(element)] = data[iMod(element)]   % value >> 0,
    exp: (value, element) => data[iMod(element)] = data[iMod(element)]  ** value >> 0,
    lsh: (value, element) => data[iMod(element)] = data[iMod(element)]  << value >> 0,
    rsh: (value, element) => data[iMod(element)] = data[iMod(element)]  >> value >> 0,
    urs: (value, element) => data[iMod(element)] = data[iMod(element)] >>> value >> 0,
    and: (value, element) => data[iMod(element)] = data[iMod(element)]   & value >> 0,
    xor: (value, element) => data[iMod(element)] = data[iMod(element)]   ^ value >> 0,
    _or: (value, element) => data[iMod(element)] = data[iMod(element)]   | value >> 0,
  }
}

/*
const objectProperty = (data, indexList = 0, initial) => {
  let keys = initial.keys();
  let values = initial.values();
  let get = null;
  let set = null;
    if (Array.isArray(indexList)) {
      for (let i = 0; i < indexList.length; i++) {
        data[indexList][i] = values[i] >> 0;
      }
      get = (element) => data[indexList[element]];
      set = (element, value) => data[indexList[element]] = value >> 0;
    } else {
      for (let i = indexList; i < initial.length; i++) {
        data[i] = values[i] >> 0;
      }
      get = (element) => data[indexList + element];
      set = (element, value) => data[indexList + element] = value >> 0;
    }

  return {
    get: (name) => get(keys.indexOf(name)),
    set: (name, value) => set(keys.indexOf(name)),
  }
}


const objectProperty = (data, indexList, initial) => {
  let keys = initial.keys();
  let values = initial.values();
  //let get = null;
  //let set = null;
  let iMod = null;
  let grab = null;
  let change = null;
  let length = 0;
    if (Array.isArray(indexList)) {
      for (let i = 0; i < indexList.length; i++) {
        data[indexList[i]] = initial[i] >> 0;
        length++;
      }
      //get = (element) => data[indexList[element]];
      //set = (element, value) => data[indexList[element]] = value >> 0;
      grab = () => { let obj = {}; for (let i = 0; i < length; i++) obj[keys[i]] = data[indexList[i]]; return obj; };
      change = (value) => { if (value <= length) { for (let i = 0; i < value.length; i++) data[indexList[i]] = value[i]; let newKeys = value.keys(); keys.splice(0, newKeys.length, ...newKeys); } else return null; };
      iMod = (element) => indexList[keys.indexOf(element)];
    } else {
      for (let i = indexList; i < initial.length; i++) {
        data[i] = initial[i] >> 0;
        length++;
      }
      //get = (element) => data[indexList + element];
      //set = (element, value) => data[indexList + element] = value >> 0;
      grab = () => data.slice(indexList + initial.length).reduce((obj, value, index) => ({...obj, [keys[index]]: value}), {});
      change = (value) => (value.length <= length) ? () => { data.set(value, indexList); let newKeys = value.keys(); keys.splice(0, newKeys.length, ...newKeys); } : null;
      iMod = (element) => indexList + keys.indexOf(element);
    }

  return {
    get: (element = -1) => (element !== -1) ? data[iMod(element)] : grab(),
    set: (value, element = -1) => (element !== -1) ? data[iMod(element)] = value : change(value),
    add: (value, element) => data[iMod(element)] = data[iMod(element)]   + value >> 0,
    sub: (value, element) => data[iMod(element)] = data[iMod(element)]   - value >> 0,
    mul: (value, element) => data[iMod(element)] = data[iMod(element)]   * value >> 0,
    div: (value, element) => data[iMod(element)] = data[iMod(element)]   / value >> 0,
    mod: (value, element) => data[iMod(element)] = data[iMod(element)]   % value >> 0,
    exp: (value, element) => data[iMod(element)] = data[iMod(element)]  ** value >> 0,
    lsh: (value, element) => data[iMod(element)] = data[iMod(element)]  << value >> 0,
    rsh: (value, element) => data[iMod(element)] = data[iMod(element)]  >> value >> 0,
    urs: (value, element) => data[iMod(element)] = data[iMod(element)] >>> value >> 0,
    and: (value, element) => data[iMod(element)] = data[iMod(element)]   & value >> 0,
    xor: (value, element) => data[iMod(element)] = data[iMod(element)]   ^ value >> 0,
    _or: (value, element) => data[iMod(element)] = data[iMod(element)]   | value >> 0,
  }
}
*/

/*
Javascript update = Javascript("(() => {
      const apply = (f, x) => { return (x < 0) ? 1 / (1 - x * f) : f * x + 1; };
      const curves = (() => {
        const make = (x) => { return Math.log(4 * x + 1) / Math.log(5); };
        let length = c.MAX_SKILL * 2;
        let storedValues = new Array(length);
        for (let i = 0; i < length; i++) {
          storedValues[i] = make(i / c.MAX_SKILL);
        }
        return storedValues;
      })();
      return () => {
        for (let i = 0; i < 10; i++) {
          if (entityData.skills.raw.get(i) > entityData.skills.caps.get(i)) {
            entityData.skills.points.set(entityData.skills.points.get() + entityData.skills.raw.get(i) - entityData.skills.caps.get(i));
            entityData.skills.raw.set(entityData.skills.caps.get(i), i);
          }
        }

        entityData.skills.real.set(Math.pow(0.5, curves[entityData.skills.raw.get(skc.rld)]), skc.rld);
        entityData.skills.real.set(apply(2.5, curves[entityData.skills.raw.get(skc.pen)]), skc.pen);
        entityData.skills.real.set(apply(2, curves[entityData.skills.raw.get(skc.str)]), skc.str);
        entityData.skills.real.set(apply(3, curves[entityData.skills.raw.get(skc.dam)]), skc.dam);
        entityData.skills.real.set(0.5 + apply(1.5, curves[entityData.skills.raw.get(skc.spd)]), skc.spd);

        entityData.skills.real.set(apply(0.5, curves[entityData.skills.raw.get(skc.rld)]), skc.accel);
        entityData.skills.real.set(0.5 * curves[entityData.skills.raw.get(skc.str)] + 2.5 * curves[entityData.skills.raw.get(skc.pen)], skc.rst);
        entityData.skills.real.set(curves[entityData.skills.raw.get(skc.pen)], skc.ghost);

        entityData.skills.real.set(c.GLASS_HEALTH_FACTOR * apply(3 / c.GLASS_HEALTH_FACTOR - 1, curves[entityData.skills.raw.get(skc.shi)]), skc.shi);
        entityData.skills.real.set(apply(1, curves[entityData.skills.raw.get(skc.atk)]), skc.atk);
        entityData.skills.real.set(c.GLASS_HEALTH_FACTOR * apply(2 / c.GLASS_HEALTH_FACTOR - 1, curves[entityData.skills.raw.get(skc.hlt)]), skc.hlt);
        entityData.skills.real.set(apply(0.8, curves[entityData.skills.raw.get(skc.mob)]), skc.mob);
        entityData.skills.real.set(apply(25, curves[entityData.skills.raw.get(skc.rgn)]), skc.rgn);

        entityData.skills.real.set(0.3 * (0.5 * curves[entityData.skills.raw.get(skc.atk)] + 0.5 * curves[entityData.skills.raw.get(skc.hlt)] + curves[entityData.skills.raw.get(skc.rgn)]), skc.brst);
      }
    })();");
    Javascript change = Javascript("(index, levels) => {
      if (entityData.skills.points.get() && entityData.skills.raw.get(index) < entityData.skills.caps.get(index)) {
        entityData.skills.raw.set(entityData.skills.raw.get(index) + levels);
        entityData.skills.update();
        //entityData.skills.flagged.set()
      }
    }");
    Javascript set = Javascript("(values) => {
      for (let i = 0; i < values.length; i++) {
        entityData.skills.raw.set(values[i], i);
      }
      entityData.skills.update();
    }");
    Javascript setCaps = Javascript("(values) => {
      for (let i = 0; i < values.length; i++) {
        entityData.skills.caps.set(values[i], i);
      }
      entityData.skills.update();
    }");
    Javascript levelToPoint = Javascript("(() => {
      const templevelers = [
        1,  2,  3,  4,  5,  6,  7,  8,  9,  10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        31, 32, 33, 34, 35, 36, 38, 40, 42, 44,
      ];

      const levelers = new Array(c.SKILL_CAP);
      for (let i=0; i < c.SKILL_CAP + 1; i++) levelers[i] = templevelers.indexOf(i) !== -1;
      return levelers;
    })();");
    Javascript levelToScore = Javascript("(() => {
      let tempArray = [];
      for (let i=0; i < c.SKILL_CAP + 1; i++)
        tempArray[i] = Math.ceil(1.8 * Math.pow(i + 1, 1.8) - 2 * i + 1);
      return tempArray;
    })();");
    Javascript maintain = Javascript("(() => {
      return () => {
        if (entityData.skills.level < c.SKILL_CAP) {
          let didstuff = true;
          while (entityData.skills.score.get() - entityData.skills.deduction.get() >= entityData.skills.levelToScore[entityData.skills.level.get()]) {
            entityData.skills.deduction.set(entityData.skills.deduction.get() + entityData.skills.levelToScore[entityData.skills.level.get()]);
            entityData.skills.level.set(entityData.level.skills.get() + 1);
            entityData.skills.points.set(entityData.skills.point.get() + entityData.skills.levelToPoint[entityData.skills.level.get()]);
            entityData.skills.canUpgrade.set(entityData.skills.canUpgrade.get() || entityData.skills.level.get() == c.TIER_1 || entityData.skills.level.get() == c.TIER_2 || entityData.skills.level.get() == c.TIER_3);
            entityData.skills.update();
            didStuff = true;
          }
          if (didStuff) {
            entityData.skills.update();
            return true;
          }
        }
        return false;
      }
    })();");
    Javascript amount = Javascript("(skill) => {
      return entityData.skills.raw.get(skc[skill]);
    }");
    Javascript upgrade = Javascript("(stat) => {
      if (entityData.skills.points.get() && entityData.skills.amount(stat) < entityData.skills.cap(stat)) {
        entityData.skills.change(skc[stat], 1);
        entityData.skills.point.set(entityData.skills.points.get() - 1);
        return true;
      }
      return false;
    }");
*/

/*
    Javascript addKiller = Javascript("(killer) => entityData.killers.push(killer);");
*/

/*
@flag("dv") struct HealthBox
{
    float amount, max;
    Javascript set = Javascript("(health) => { entityData.health.amount.set((entityData.health.max.get()) ? entityData.health.amount.get() / entityData.health.max.get() * health : health; entityData.health.max.set(health); }");
    Javascript getDamage = Javascript("(amount, capped = true) => { return (capped) ? Math.min(amount, entityData.health.amount.get()) : amount; }");
    Javascript dealDamage = Javascript("(amount) => entityData.health.amount.set(entityData.health.amount.get() - entityData.health.getDamage(amount, true);");
    Javascript getDisplay = Javascript("() => entityData.health.amount.get() / entityData.health.max.get();");
    Javascript getRatio = Javascript("() => (entityData.health.max.get()) ? util.clamp(1 - Math.pow(entityData.health.amount.get()) / entityData.health.max.get() - 1, 4), 0, 1) : 0;");
    Javascript regenerate = Javascript("(boost) => { entityData.health.amount.set(entityData.health.amount.get() + entityData.health.max.get() / 10 / 60 / 2.5 + boost); entityData.health.amount.set(Math.min(entityData.health.amount.get(), entityData.health.max.get()));");
};
@flag("dv") struct ShieldBox
{
    float amount, max, regen;
    Javascript set = Javascript("(health, regeneration = 0) => { entityData.shield.amount.set((entityData.shield.max.get()) ? entityData.shield.amount.get() / entityData.shield.max.get() * health : health; entityData.shield.max.set(health);  entityData.shield.regen.set(regeneration); }");
    Javascript getDamage = Javascript("(amount, capped = true) => { const permeability = (entityData.shield.max.get()) ? util.clamp(entityData.shield.amount.get() / entityData.shield.max.get(), 0, 1) : 0; return (capped) ? Math.min(entityData.shield.amount.get() * permeability, entityData.shield.amount.get()) : entityData.shield.amount.get() * permeability; }");
    Javascript dealDamage = Javascript("(amount) => entityData.shield.amount.set(entityData.shield.amount.get() - entityData.shield.getDamage(amount, true));");
    Javascript getDisplay = Javascript("() => entityData.shield.amount.get() / entityData.shield.max.get();");
    Javascript getRatio = Javascript("() => (entityData.shield.max.get()) ? util.clamp(1 - Math.pow(entityData.shield.amount.get()) / entityData.shield.max.get() - 1, 4), 0, 1) : 0;");
    Javascript getPermeability = Javascript("() => (entityData.shield.max.get()) ? util.clamp(entityData.shield.amount.get() / entityData.shield.max.get(), 0, 1) : 0;");
    Javascript regenerate = Javascript("(boost) => { const r = util.clamp(entityData.shield.amount.get() / entityData.max.amount.get(), 0, 1); if (!r) entityData.shield.amount.set(0.0001); else if (r === 1) entityData.shield.amount.set(entityData.shield.max.get()); else { entityData.shield.amount.set(entityData.shield.amount.get() + entityData.shield.regen.get() * Math.exp(-50 * Math.pow(Math.sqrt(0.5 * r) - 0.4, 2)) / 3 + r * max / 10 / 15 + boost); entityData.shield.amount.set(Math.min(entityData.shield.amount.get(), entityData.shield.max.get())); } }");
};
*/

/*
 Javascript accelerate = Javascript("(force, direction) => { entityData.physics.acceleration.set(entityData.physics.acceleration.get(0) + Math.cos(direction * DEGTORAD) * force, 0); entityData.physics.acceleration.set(entityData.physics.acceleration.get(1) + Math.sin(direction * DEGTORAD) * force, 1); }");
  Javascript shove = Javascript("(x, y) => { entityData.physics.velocity.set(entityData.physics.velocity.get(0) + x, 0); entityData.physics.velocity.set(entityData.physics.velocity.get(1) + y, 1); }");
*/

/*
    Javascript addChild = Javascript("(child) => entityData.family.children.push(child);");
    Javascript removeChild = Javascript("(child) => util.removeSequential(entityData.family.children, entityData.family.children.indexOf(child));");
*/

/*
const experimentalEntity = (() => {
  const data = [
    new bitset, // bits
    null, // static references
    null, // dynamic references
    [] // multi references
  ];

  const entityData = { };

  const load = (fallback, val) => (val == null) ? fallback : val;
  // all this stuff here is set to undefined upon
  // entity completion to be garbage collected
  //let process = [], staticIntegerLength = 0, staticFloatLength = 0, multiLength = 0, bitLength = 0;
  //let process_static = (f, index, value) => {
  //  (f) ? staticFloatLength += 1 : staticIntegerLength += 1;
  //  process.push(f);
  //  process.push(index);
  //  process.push(value);
  //}


  const static_reference = (f, index, initial) => {
    if (Array.isArray(initial)) {
      for (let i = 0; i < initial.length; i++) {
        process_static(f, index + i, initial[i]);
      }
    } else {
      process_static(f, index, initial);
    }
    let fN = f >> 0;
    return {
      get: (element = NaN) => (element === NaN) ? data.static[fN][index] : data.static[fN][index + element],
      set: (value, element = NaN) => (element === NaN) ? data.static[fN][index] = value >> 0 : data.static[fN][index + element] = value >> 0
    }
  }

  const dynamic_reference = (f, index, initial) => {
    //if (initial !== NaN) {
      //data.dynamic[index] = initial >> 0;
      //process_dynamic(index, initial);
    //}
    let fN = f >> 0;
    return {
      get: (element = NaN) => (element === NaN) ? data.dynamic[fN][index] : data.dynamic[fN][index + element],
      set: (value, element = NaN) => (element === NaN) ? data.dynamic[fN][index] = value >> 0 : data.dynamic[fN][index + element] = value >> 0
    }
  }

  const bit_reference = (bit, initial) => {
    data.bits.set(bit, initial >> 0);
    bitLength += 1;

    return {
      get: () => data.bits.get(bit),
      set: (value) => data.bits.set(bit >> 0)
    }
  }

  const multi_reference = (index, value) => {
    let len = index - data.multi.length;
    if (len > 0) {
      while (len--) {
        data.multi.push(0);
      }
    }
    multiLength += 1;
    data.multi[index] = value;
    return {
      get: (value, item = NaN) => (item !== NaN) ? data.multi[index][item] : data.multi[index],
      set: (value, item = NaN) => (item !== NaN) ? data.multi[index][item] = value : data.multi[index] = value,
    }
  }

  const value_reference_string = (value, encoding = 'utf8') => {
    let index = data.values.length + 1;
    data.values.push(Buffer.from(value, encoding));
    return {
      get: () => data.values[index].toString(),
      set: (value) => data.values[index] = Buffer.from(value),
      getRaw: () => data.values[index],
      resize: (size) => { let newBuffer = Buffer.alloc(size); newBuffer.copy(data.values[index]); data.values[index] = newBuffer; },
      length: () => data.values[index].length,
      byteLength: () => data.values[index].byteLength,
      write: (data, offset = 0, vEncoding = 'utf8') => data.values[index].write(data, offset, vEncoding)
    }
  }

  const define = ((def) => {
    const check = (val) => (val !== null && val !== undefined);

    return (def) => {
      if (!check(entityData.attributes)) entityData.attributes = {};
      const obj = entityData.attributes;

      // last static integer value = 9
      // last bit value = 9
      // last static float value = 8
      // last multi length = 16
      if (!check(obj.size)) {
        obj.size = 1;
      }

      if (check(def.index)) obj.index = static_reference(false, 10, def.index);
      if (check(def.NAME)) obj.name = value_reference_string(def.NAME); //false; // something happens here to the data.values and we encode the string into a UInt8Array
      if (check(def.LABEL)) obj.label = value_reference_string(def.LABEL);
      if (check(def.TYPE)) obj.type = value_reference_string(def.TYPE); // still the same thing
      if (check(def.SHAPE)) obj.shape = static_reference(false, 11, typeof def.SHAPE === 'number' ? Math.floor(def.shape) : 0);
      if (check(def.COLOR)) entityData.color.set(def.COLOR);
      if (check(def.CONTROLLERS)) {
        entityData.controllers.set([]);
        for (let i = 0; i < def.CONTROLLERS.length; i++) {
          //entityData.controllers.addPredefined(def.CONTROLLERS[i]);
        }
      }
      if (check(def.MOTION_TYPE)) {
        entityData.motionType = multi_reference(17, def.MOTION_TYPE);
        // do nothing yet
      }
      if (check(def.FACING_TYPE)) {
        entityData.facingType = multi_reference(18, def.FACING_TYPE);
      }
      if (check(def.BROADCAST_MESSAGE)) obj.creationMessage = value_reference_string(def.BROADCAST_MESSAGE); // STILL THE SAME THING
      if (check(def.DAMAGE_CLASS)) obj.damageClass = static_reference(false, 12, def.DAMAGE_CLASS); // S.T.I.L.L THE SAME THING
      if (check(def.STAT_NAMES)) obj.skillNames = multi_reference(19, def.STAT_NAMES);
      if (check(def.DANGER)) obj.dangerValue = static_reference(false, 13, def.DANGER);

      if (check(def.DRAW_HEALTH)) obj.settings.drawHealth = bit_reference(10, def.DRAW_HEALTH);
      if (check(def.DRAW_SELF)) obj.settings.drawShape = bit_reference(11, def.DRAW_SELF);
      if (check(def.DAMAGE_EFFECTS)) obj.settings.damageEffects = bit_reference(12, def.DAMAGE_EFFECTS);
      if (check(def.RATIO_EFFECTS)) obj.settings.ratioEffects = bit_reference(13, def.RATIO_EFFECTS);
      if (check(def.MOTION_EFFECTS)) obj.settings.motionEffects = bit_reference(14, def.MOTION_EFFECTS);
      if (check(def.ACCEPTS_SCORE)) obj.settings.acceptsScore = bit_reference(15, def.ACCEPTS_SCORE);
      //if (check(def.NAME)) obj.name = static_reference(false, 11, def.NAME);
    }
  })();

  return (x, y, master = NaN) => {
    //let staticIntegerLength = 0, staticFloatLength = 0, bitLength = 0, multiLength = 0;

    // creation time
    entityData.creationTime = util.time();

    // status box creation
    entityData.status = {
      ghost: bit_reference(0, false),
      //grid: static_reference(1, false),
      invuln: bit_reference(2, false),
      protect: bit_reference(3, false)
    };
    //bitLength += 4;

    // kill box creation
    entityData.kills = {
      killers: multi_reference(0, []),
      solo: static_reference(false, 0, 0),
      assist: static_reference(false, 1, 0),
      boss: static_reference(false, 2, 0)
    }
    //multiLength += 1;
    //staticIntegerLength += 3;

    // identifiers creation
    let id = ++ENTITYID;
    entityData.identifiers = {
      id: static_reference(false, 3, id),
      team: static_reference(false, 4, id)
    }
    //staticIntegerLength += 2;

    // health creation
    entityData.health = {
      amount: static_reference(true, 0, 1),
      max: static_reference(true, 1, 1),
      set: (health) => {
        data.static[1][0] = (data.static[1][1]) ? data.static[1][0] / data.static[1][1] * health : health;
        data.static[1][1] = health;
      },
      dealDamage: (amount) => data.static[1][0] = data.static[1][0] - Math.min(amount, data.static[1][0]),
      getDisplay: () => data.static[1][0] / data.static[1][1],
      getRatio: () => (data.static[1][1]) ? util.clamp(1 - Math.pow(data.static[1][0] / data.static[1][1] - 1, 4), 0, 1) : 0,
      getDamage: (amount, capped = true) => { return capped ? Math.min(amount, data.static[1][0]) : amount; },
      regenerate: (boost) => {
        data.static[1][0] += data.static[1][1] / 10 / 60 / 2.5 + boost;
        data.static[1][0] = Math.min(data.static[1][0], data.static[1][1]);
      }
    }
    //staticFloatLength += 2;

    // this is the entities shield
    entityData.shield = {
      amount: static_reference(true, 2, 1),
      max: static_reference(true, 3, 1),
      regeneration: static_reference(true, 4, 1),
      set: (health, regeneration = 0) => {
        data.static[1][2] = (data.static[1][3]) ? data.static[1][2] / data.static[1][3] * health : health;
        data.static[1][3] = health;
        data.static[1][4] = regeneration;
      },
      dealDamage: (amount) => data.static[1][2] = data.static[1][2] - (() => {
        const permeability = (data.static[1][3]) ? util.clamp(data.static[1][2] / data.static[1][3], 0, 1) : 0;
        return amount * permeability;
      }),
      getDisplay: () => data.static[1][2] / data.static[1][3],
      getRatio: () => (data.static[1][2]) ? util.clamp(1 - Math.pow(data.static[1][2] / data.static[1][3] - 1, 4), 0, 1) : 0,
      getDamage: (amount, capped = true) => {
        const permeability = (data.static[1][3]) ? util.clamp(data.static[1][2] / data.static[1][3], 0, 1) : 0;
        return (capped) ?
          Math.min(amount * permeability, data.static[1][2])
          : amount * permeability;
      },
      getPermeability: () => (data.static[1][3]) ? util.clamp(data.static[1][2] / data.static[1][3], 0, 1) : 0,
      regenerate: (boost) => {
        const r = util.clamp(data.static[1][2] / data.static[1][3], 0, 1);
        if (!r) data.static[1][2] = 0.0001;
        else if (r === 1) data.static[1][2] = data.static[1][3];
        else {
          data.static[1][2] += data.static[1][4] * Math.exp(-50 * Math.pow(Math.sqrt(0.5 * r) - 0.4, 2)) / 3 + r * data.static[1][3] / 10 / 15 + boost;
          data.static[1][2] = Math.min(data.static[1][2], data.static[1][3]);
        }
      }
    }
    //staticFloatLength += 2;

    // the entities control
    entityData.control = {
      target: multi_reference(0, [0, 0]),
      goal: multi_reference(1, [0, 0]),
      main: bit_reference(4, false),
      alt: bit_reference(5, false),
      fire: bit_reference(6, false),
      power: static_reference(false, 5, 0)
    }
    //multiLength += 2;
    //bitLength += 3;
    //staticIntegerLength += 1;

    // the entities physics
    entityData.physics = {
      position: multi_reference(2, [0, 0]),
      velocity: multi_reference(3, [0, 0]),
      acceleration: multi_reference(4, [0, 0]),
      facing: static_reference(true, 5, 0),
      vfacing: static_reference(true, 6, 0),
      damp: static_reference(true, 7, 0.05),
      maxSpeed: static_reference(true, 8, 0),
      accelerate: (force, direction) => {
        data.multi[4][0] += Math.cos(direction * DEGTORAD) * force;
        data.multi[4][1] += Math.sin(direction * DEGTORAD) * force;
      },
      shove: (x, y) => {
        data.multi[3][0] += x;
        data.multi[3][1] += y;
      }
    }
    //multiLength += 3;
    //staticFloatLength += 4;

    // the entities controllers
    entityData.controllers = {
      controllers: multi_reference(5, []),
      addController: (controller) => {
        if (Array.isArray(controller)) {
          data.multi[5] = controller.concat(data.multi[5]);
        } else {
          data.milti[5].unshift(controller);
        }
      },
      addPredefined: (controller) => {
        data.multi[5].unshift(EntityFunctions.Predefined.Controller(controller));
      },
      removeController: () => null,
      get: () => data.multi[5],
      set: (value) => data.multi[5] = value
    }
    //multiLength += 1;

    // the entities family
    entityData.family = {
      master: multi_reference(6, null),
      source: multi_reference(7, null),
      parent: multi_reference(8, null),
      children: multi_reference(9, []),
      addChild: (child) => data.multi[9].push(child),
      removeChild: (child) => util.removeSequential(data.multi[9], data.multi[9].indexOf(child))
    }
    //multiLength += 4;

    // the entities bindings
    entityData.bindings = {
      bond: multi_reference(10, null),
      bound: multi_reference(11, null),
      firingArc: multi_reference(12, null),
      defineFiringArc: () => data.multi[12] = [0, 0]
    }
    //multiLength += 3;

    entityData.autoOverride = bit_reference(7, 0)
    entityData.autoFire = bit_reference(8, 0);
    entityData.autoSpin = bit_reference(9, 0);

    entityData.deref = [];



    entityData.dereference = () => {
      for (let i = 0; i < entityData.deref.length; i++) {
        entityData.deref[i]();
      }
    }

            // Get values
    entityData.size = () => {
        if (entityData.bindings.bond.get() === null) return (entityData.attributes.coreSize.get() || entityData.attributes.size.get()) * (1 + entityData.skills.level.get() / 45);
        return entityData.bindings.bond.get().size() * entityData.bindings.bound.get().size;
    }

    entityData.mass = () => {
      return entityData.attributes.density.get() * (entityData.size() * entityData.size() + 1);
    }

    entityData.realSize = () => {
      return entityData.size() * lazyRealSizes[Math.abs(entityData.attributes.shape)];
    }

    entityData.m = () => {
      return [(entityData.physics.velocity.get(0) + entityData.physics.acceleration.get(0)) / ROOMSPEED,
              (entityData.physics.velocity.get(1) + entityData.physics.acceleration.get(1)) / ROOMSPEED];
    }

    entityData.isDead = () => {
      return (entityData.health.amount.get() <= 0);
    }

    entityData.sendMessage = (message) => {
      return 1; // dummy mode
    }

    entityData.color = static_reference(false, 9, 0);

    entityData.flattenedPhoto = multi_reference(13, null);
    entityData.photo = multi_reference(14, null);
    entityData.player = multi_reference(15, null);
    entityData.mockup = multi_reference(16, null);

    define(Class.genericEntity);
    console.log(entityData);

  }
})();
*/

//let b = experimentalEntity(10, 10);

/*
const property = (data, index, initial) => arrProperty(data, index, initial), arrayProperty = (data, index, initial) => arrProperty(data, index, initial), objectProperty = (data, index, initial) => arrProperty(data, index, initial);

const arrProperty = (data, index, initial) => {
  data[index] = initial;

  return {
    get: (element = -1) => (element !== -1) ? data[index][element] : data[index],
    set: (value, element = -1) => (element !== -1) ? data[index][element] = value : data[index] = value,
    access: (property, element = -1) => (element !== -1) ? data[index][element][property] : data[index][property],
    apply: (property, params = [], element = -1) => (element !== -1) ? data[index][element][property](...params) : data[index][property](...params),
    add: (value, element = -1) => (element !== -1) ? data[index][element] += value : data[index] += value,
    sub: (value, element = -1) => (element !== -1) ? data[index][element] -= value : data[index] -= value,
    mul: (value, element = -1) => (element !== -1) ? data[index][element] *= value : data[index] *= value,
    div: (value, element = -1) => (element !== -1) ? data[index][element] /= value : data[index] /= value,
    mod: (value, element = -1) => (element !== -1) ? data[index][element] %= value : data[index] %= value,
    exp: (value, element = -1) => (element !== -1) ? data[index][element] **= value : data[index] **= value,
    lsh: (value, element = -1) => (element !== -1) ? data[index][element] <<= value : data[index] <<= value,
    rsh: (value, element = -1) => (element !== -1) ? data[index][element] >>= value : data[index] >>= value,
    urs: (value, element = -1) => (element !== -1) ? data[index][element] >>>= value : data[index] >>>= value,
    and: (value, element = -1) => (element !== -1) ? data[index][element] &= value : data[index] &= value,
    xor: (value, element = -1) => (element !== -1) ? data[index][element] ^= value : data[index] ^= value,
    _or: (value, element = -1) => (element !== -1) ? data[index][element] |= value : data[index] |= value,
  }
}

const objProperty = (data, name, initial) => {
  data[name] = initial;

  return {
    get: (element = -1) => (element !== -1) ? data[name][element] : data[name],
    set: (value, element = -1) => (element !== -1) ? data[name][element] = value : data[name] = value,
    add: (value, element = -1) => (element !== -1) ? data[name][element] += value >> 0 : data[name] += value,
    access: (property, element = -1) => (element !== -1) ? data[name][element][property] : data[name][property],
    apply: (property, params = [], element = -1) => (element !== -1) ? data[name][element][property](...params) : data[name][property](...params),
    sub: (value, element = -1) => (element !== -1) ? data[name][element] -= value >> 0 : data[name] -= value,
    mul: (value, element = -1) => (element !== -1) ? data[name][element] *= value >> 0 : data[name] *= value,
    div: (value, element = -1) => (element !== -1) ? data[name][element] /= value >> 0 : data[name] /= value,
    mod: (value, element = -1) => (element !== -1) ? data[name][element] %= value >> 0 : data[name] %= value,
    exp: (value, element = -1) => (element !== -1) ? data[name][element] **= value >> 0 : data[name] **= value,
    lsh: (value, element = -1) => (element !== -1) ? data[name][element] <<= value >> 0 : data[name] <<= value,
    rsh: (value, element = -1) => (element !== -1) ? data[name][element] >>= value >> 0 : data[name] >>= value,
    urs: (value, element = -1) => (element !== -1) ? data[name][element] >>>= value >> 0 : data[name] >>>= value,
    and: (value, element = -1) => (element !== -1) ? data[name][element] &= value >> 0 : data[name] &= value,
    xor: (value, element = -1) => (element !== -1) ? data[name][element] ^= value >> 0 : data[name] ^= value,
    _or: (value, element = -1) => (element !== -1) ? data[name][element] |= value >> 0 : data[name] |= value,
  }
}
*/

const property = (object, name, data, index, initial = NaN) => {
    if (initial !== NaN) data[index] = initial;

    Object.defineProperty(object, name, {
        configurable: true,
        get: () => data[index],
        set: (v) => data[index] = v
    });
}

const multidata_property = (object, name, data, index, initial = NaN) => {
    if (initial !== NaN) {
        for (let i = 0; i < data.length; i++) {
            data[i][index[i]] = initial;
        }
    }

    Object.defineProperty(object, name, {
        configurable: true,
        get: () => data[0][index[0]],
        set: (v) => {
            for (let i = 0; i < data.length; i++) {
                data[i][index[i]] = v;
            }
        }
    });
}

const referenceProperty = (object, name, data, index, refObject, refProperty, initial = NaN) => {
    if (!isNaN(initial)) data[index] = initial;
    const settingMode = (Array.isArray(refProperty)) ? 1 : 0;

    Object.defineProperty(object, name, {
        configurable: true,
        get: () => data[index],
        set: (v) => {
            data[index] = v;
            if (settingMode === 1) {
                for (let i = 0; i < refProperty.length; i++) {
                    refObject[refProperty[i]] = v;
                }
            } else if (settingMode === 0) {
                refObject[refProperty] = v;
            }
        }
    });
}

const functionResetReferenceProperty = (object, name, data, index, refObject, refProperty, func, initial = NaN, ...funcparams) => {
    if (initial !== NaN) data[index] = initial;
    const settingMode = (Array.isArray(refProperty)) ? 1 : 0;
    const funcSetMode = (Array.isArray(func)) ? 1 : 0;

    Object.defineProperty(object, name, {
        configurable: true,
        get: () => data[index],
        set: (v) => {
            data[index] = v;
            if (settingMode === 1) {
                for (let i = 0; i < refProperty.length; i++) {
                    if (funcSetMode === 1) {
                        refObject[refProperty[i]] = func[i](...funcparams);
                    } else {
                        refObject[refProperty[i]] = func(...funcparams);
                    }
                }
            } else if (settingMode === 0) {
                if (funcSetMode === 1) {
                    refObject[refProperty] = func[0](...funcparams);
                } else {
                    refObject[refProperty] = func(...funcparams);
                }
            }
        }
    });
}

const arrayProperty = (object, name, data, index, initial = NaN) => {
    if (initial !== NaN) data[index] = initial;
    let arrayChangeHandler = {
        get: function(target, property) {
            return target[property];
        },
        set: function(target, property, value, receiver) {
            target[property] = value;

            return true;
        }
    }

    let proxyArray = new Proxy(data[index], arrayChangeHandler);
    Object.defineProperty(object, name, {
        configurable: true,
        get: () => proxyArray,
        set: (v) => {
            data[index] = v;
            if (v != null) {
                proxyArray = new Proxy(data[index], arrayChangeHandler);
            } else {
                proxyArray = null;
            }
        }
    });
    return proxyArray;
}
const multidata_arrayProperty = (object, name, data, index, initial = NaN) => {
    if (initial !== NaN) {
        for (let i = 0; i < data.length; i++) {
            data[i][index[i]] = initial;
        }
    }
    let arrayChangeHandler = {
        get: function(target, property) {
            //return target[property];
            return data[0][index[0]][property];
        },
        set: function(target, property, value, receiver) {
            for (let i = 0; i < data.length; i++) {
                data[i][index[i]][property] = value;
            }
            //target[property] = value;

            return true;
        }
    }

    let proxyArray = new Proxy(new Array(data[0][index[0]].length), arrayChangeHandler);
    Object.defineProperty(object, name, {
        configurable: true,
        get: () => proxyArray,
        set: (v) => {
            for (let i = 0; i < data.length; i++) {
                data[i][index[i]] = v;
            }
            if (v != null) {
                proxyArray = new Proxy(new Array(v.length), arrayChangeHandler);
            } else {
                proxyArray = null;
            }
        }
    });
    return proxyArray;
}
const arrayReferenceProperty = (object, name, data, index, refObject, refProperties, initial = NaN) => {
    if (initial !== NaN) data[index] = initial;
    let arrayChangeHandler = {
        get: function(target, property) {
            return target[property];
        },
        set: function(target, property, value, receiver) {
            target[property] = value;
            //refObject[refProperty] = value;
            refObject[refProperties[property]] = value;

            return true;
        }
    }

    let proxyArray = new Proxy(data[index], arrayChangeHandler);
    Object.defineProperty(object, name, {
        configurable: true,
        get: () => proxyArray,
        set: (v) => {
            data[index] = v;
            if (v != null) {
                proxyArray = new Proxy(data[index], arrayChangeHandler);
            } else {
                proxyArray = null;
            }
        }
    });
    return proxyArray;
}
const objectProperty = (object, name, data, index, initial) => arrayProperty(object, name, data, index, initial);

const arrProperty = (object, name, data, index, initial) => {
    data[index] = initial;
    if (initial != null && typeof initial === 'object') {
        arrayProperty(object, name, data, index, initial);
    } else {
        property(object, name, data, index, initial);
    }
}
const objProperty = (object, name, data, index, initial) => arrProperty(object, name, data, index, initial);

/*
const makeADSEntity = (() => {
  return (x, y, definition, requirements) => {
    const entityData = {
      MODULES: []
    };

    let requirementKeys = Object.keys(requirements);
    for (let i = 0; i < requirements.length; i++) {
      let key = requirementKeys[i];
      entityData[key] = requirements[key];
      if (requirements[key].__EXECUTION__ != null) {
        requirements[key].__EXECUTION__(entityData);
        delete entityData[key].__EXECUTION__;
      }
    }

    for (let i = 0; i < definition.MODULES.length; i++) {
      let module = definition.MODULES[i];
      entityData[module.name] = module.handler;
      entityData.MODULES.push(module);
    }

    return entityData;
  }
})();
*/

const makeEntity = (() => {
    const _data = [],
        entityData = { },
        __a = { // Pooled data
            int: [],
            float: [],
            str: [],
        };
    // The value loader
    const load = (fallback, val) => { return (val == null) ? fallback : val; };
    // A status container creator
    const newStatusBox = (() => {
        /*
        const attribute = (status, id, index, inital) => {
            status[index] += id * inital;
            return {
                get: () => { return status[index] & id; },
                set: bool => {
                    if (bool) status[index] = status[index] | id;
                    else status[index] = status[index] & ~id;
                },
            };
        };
        */
        return () => {
            //let status = [0];
            _data.push([]);
            const data = _data[_data.length - 1];
            //let status = new ArrayBuffer(
            const obj = {};
            /*
                ghost: attribute(status, 1, 0, false),
                inGrid: attribute(status, 2, 0, false),
                invuln: attribute(status, 4, 0, false),
                protect: attribute(status, 5, 0, false),
                */
            property(obj, 'ghost', data, 0, false),
                property(obj, 'inGrid', data, 1, false),
                property(obj, 'invlun', data, 2, false),
                property(obj, 'protect', data, 3, false);
            return obj;
        };
    })();

    // A kills container creator
    const newKillBox = () => {
        _data.push([0, 0, 0, []]);
        const data = _data[_data.length - 1];
        const obj = {};
        obj.get = () => data.flat(),
            //addSolo: () => data[0]++,
            //addAssist: () => data[1]++,
            //addBoss: () => data[2]++,
            //getSolo: () => data[0],
            //getAssist: () => data[1],
            //getBoss: () => data[2],
            //setSolo: (solo) => { data[0] = solo; },
            //setAssist: (assist) => { data[1] = assist; },
            //setBoss: (boss) => { data[2] = boss; },
            obj.addKiller = (killer) => data[3].push(killer),
            property(obj, 'solo', data, 0, 0),
            property(obj, 'assist', data, 1, 0),
            property(obj, 'boss', data, 2, 0),
            arrayProperty(obj, 'killers', data, 3, []);
        //_set: ({solo = data[0], assist = data[1], boss = data[2], killers = killers}) => {
        //  data[0] = solo,
        //  data[1] = assist,
        //  data[2] = boss,
        //  killers = killers;
        //}
        return obj;
    };

    // A health bar creator
    const healthTypes = (() => {
        // Static-type functions
        const regenerateStatic = (data, boost) => {
            const amount = data[0], max = data[1];
            data[0] += max / 10 / 60 / 2.5 + boost;
            data[0] = Math.min(data[0], max);
        };
        const getStaticDamage = (data, amount, capped) => {
            let d = (capped) ? Math.min(amount, data[0]) : amount;
            return d;
        };
        const setStatic = (data, health) => {
            const amount = data[0], max = data[1];
            //console.log(data);
            data[0] = (max) ? amount / max * health : health;
            data[1] = health;
        }
        // Dynamic-type functions
        const regenerateDynamic = (data, boost) => {
            const amount = data[0], max = data[1], regen = data[2];
            const r = util.clamp(amount / max, 0, 1);
            if (!r) {
                data[0] = 0.0001;
            } else if (r === 1) {
                data[0] = max;
            } else {
                data[0] += regen * Math.exp(-50 * Math.pow(Math.sqrt(0.5 * r) - 0.4, 2)) / 3 + r * max / 10 / 15 + boost;
                data[0] = Math.min(data[0], max);
            }
        }
        const getDynamicDamage = (data, amount, capped) => {
            const permeability = (data[1]) ? util.clamp(data[0] / data[1], 0, 1) : 0;
            let d = (capped) ? Math.min(amount * permeability, data[0]) : amount * permeability;
            return d;
        }
        const setDynamic = (data, health, regeneration = 0) => {
            const amount = data[0], max = data[1], regen = data[2];
            data[0] = (max) ? amount / max * health : health;
            data[1] = health;
            data[2] = regeneration;
        }
        const getStaticDelta = (data, amount) => {
            return amount;
        }
        const getDynamicDelta = (data, amount) => {
            return ((data[1]) ? util.clamp(data[0] / data[1], 0, 1) : 0) * amount;
        }
        // Shared functions
        const getRatio = (data) => {
            return data[1] ? util.clamp(1 - Math.pow(data[0] / data[1] - 1, 4), 0, 1) : 0;
        }
        const getDisplay = (data) => {
            let h = (data[0] / data[1]);
            //if (isNaN(h)) h = 1; oldserver has nan health things aswell
            return h;
        }
        const flatGetDisplay = (data, r = false) => {
            //let h = 255 * ((r) ? Math.round(data[0] / data[1]) : Math.ceil(data[0] / data[1]));
            let h = (r) ? Math.round(255 * getDisplay(data)) : Math.ceil(255 * getDisplay(data));
            //if (isNaN(h)) h = 255; read above get displayer
            return h;
        }
        return {
            newStatic: (health, resist = 0) => {
                _data.push([health, health, resist]);
                const data = _data[_data.length - 1];
                const obj = {};
                obj.restore = (amount, max) => { data[0] = amount; data[1] = max; },
                    obj.set = (health) => {
                        setStatic(data, health)
                        entityData.photo.health = flatGetDisplay(data);
                    },
                    obj.dealDamage = (amount) => {
                        data[0] -= getStaticDamage(data, amount, true);
                        entityData.photo.health = flatGetDisplay(data);
                    },
                    //getAmount: () => { return data[0]; },
                    //setAmount: (amount) => { data[0] = amount; },
                    //getMax: () => { return data[1]; },
                    //setMax: (max) => { data[1] = max; },
                    functionResetReferenceProperty(obj, 'amount', data, 0, entityData.photo, 'health', flatGetDisplay, health, data),
                    functionResetReferenceProperty(obj, 'max', data, 1, entityData.photo, 'health', flatGetDisplay, health, data),
                    property(obj, 'resist', data, 2, resist),
                    obj.getDisplay = () => getDisplay(data),
                    obj.flatGetDisplay = () => flatGetDisplay(data),
                    obj.getRatio = () => getRatio(data),
                    obj.getDamage = (amount, capped = true) => getStaticDamage(data, amount, capped),
                    obj.regenerate = (boost) => {
                        regenerateStatic(data, boost);
                        entityData.photo.health = flatGetDisplay(data);
                    },
                    obj.getHealthDelta = (amount) => getStaticDelta(data, amount);
                //_set: ({amount = data[0], max = data[1]}) => {
                //  data[0] = amount,
                //  data[1] = max;
                //},
                /*
                    get amount() {
                      return data[0];
                    },
                    set amount(value) {
                      data[0] = value;
                    },
                    get max() {
                      return data[1];
                    },
                    set max(value) {
                      data[1] = value;
                    },
                    */
                return obj;
            },
            newDynamic: (health, regeneration = 0) => {
                _data.push([health, health, regeneration]);
                const data = _data[_data.length - 1];
                const obj = {};
                obj.restore = (amount, max, regeneration) => { data[0] = amount; data[1] = max; data[2] = regeneration; },
                    obj.set = (health, regeneration) => {
                        setDynamic(data, health, regeneration);
                        entityData.photo.shield = flatGetDisplay(data, true);
                    },
                    obj.dealDamage = (amount) => {
                        data[0] -= getDynamicDamage(data, amount, true);
                        entityData.photo.shield = flatGetDisplay(data, true);
                    },
                    //getAmount: () => data[0],
                    //setAmount: (amount) => { data[0] = amount; },
                    //getMax: () => data[1],
                    //setMax: (max) => { data[1] = max; },
                    //getRegen: () => data[2],
                    //setRegen: (regen) => { data[2] = regen; },
                    functionResetReferenceProperty(obj, 'amount', data, 0, entityData.photo, 'shield', flatGetDisplay, health, data, true),
                    functionResetReferenceProperty(obj, 'max', data, 1, entityData.photo, 'shield', flatGetDisplay, health, data, true),
                    property(obj, 'regen', data, 2, regeneration),
                    obj.getDisplay = () => getDisplay(data),
                    obj.flatGetDisplay = () => flatGetDisplay(data, true),
                    obj.getRatio = () => getRatio(data),
                    obj.getDamage = (amount, capped = true) => getDynamicDamage(data, amount, capped),
                    obj.getPermeability = () => (data[1]) ? util.clamp(data[0] / data[1], 0, 1) : 0,
                    obj.regenerate = (boost) => {
                        regenerateDynamic(data, boost);
                        entityData.photo.shield = flatGetDisplay(data, true);
                    },
                    obj.getHealthDelta = (amount) => getDynamicDelta(data, amount);
                //_set: ({amount = data[0], max = data[1], regen = data[2]}) => {
                //  data[0] = amount,
                //  data[1] = max,
                //  data[2] = regen;
                //},
                /*
                    get amount() {
                      return data[0];
                    },
                    set amount(value) {
                      data[0] = value;
                    },
                    get max() {
                      return data[1];
                    },
                    set max(value) {
                      data[1] = value;
                    },
                    get regen() {
                      return data[2];
                    },
                    set regen(value) {
                      data[2] = value;
                    },
                    get permeability() {
                      return (data[1]) ? util.clamp(data[0] / data[1], 0, 1) : 0
                    }
                    */
                return obj;
            },
        };
    })();
    // The skills container creator
    // Index references
    const skc = {
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
        acl: 10,
        rst: 11,
        brst: 12,
        ghost: 13,
    };
    const newSkills = (() => {
        const apply = (f, x) => { return (x<0) ? 1 / (1 - x * f) : f * x + 1; };
        const curves = (() => {
            const make = x => { return Math.log(4*x + 1) / Math.log(5); };
            let length = c.MAX_SKILL*2;
            let storedValues = new Array(length);
            for (let i=0; i<length; i++) { storedValues[i] = make(i / c.MAX_SKILL); }
            return storedValues;
        })();
        // The big update method
        const update = (() => {
            // Some math functions
            return (data) => {
                // Reset it if it's past the cap
                for (let i=0; i<10; i++) {
                    if (data.raw[i] > data.caps[i]) {
                        data.points += data.raw[i] - data.caps[i];
                        data.raw[i] = data.caps[i];
                    }
                }
                // Refresh all the stuff
                // Bullet stats
                data.real[skc.rld] = Math.pow(0.5, curves[data.raw[skc.rld]]);
                data.real[skc.pen] = apply(2.5, curves[data.raw[skc.pen]]);
                data.real[skc.str] = apply(2, curves[data.raw[skc.str]]);
                data.real[skc.dam] = apply(3, curves[data.raw[skc.dam]]);
                data.real[skc.spd] = 0.5 + apply(1.5, curves[data.raw[skc.spd]]);
                // Misc bullet stats
                data.real[skc.acl] = apply(0.5, curves[data.raw[skc.rld]]);
                data.real[skc.rst] = 0.5 * curves[data.raw[skc.str]] + 2.5 * curves[data.raw[skc.pen]];
                data.real[skc.ghost] = curves[data.raw[skc.pen]];
                // Body stats
                data.real[skc.shi] = c.GLASS_HEALTH_FACTOR * apply(3 / c.GLASS_HEALTH_FACTOR - 1, curves[data.raw[skc.shi]]);
                data.real[skc.atk] = apply(1, curves[data.raw[skc.atk]]);
                data.real[skc.hlt] = c.GLASS_HEALTH_FACTOR * apply(2 / c.GLASS_HEALTH_FACTOR - 1, curves[data.raw[skc.hlt]]);
                data.real[skc.mob] = apply(0.8, curves[data.raw[skc.mob]]);
                data.real[skc.rgn] = apply(25, curves[data.raw[skc.rgn]]);
                // Misc body stats
                data.real[skc.brst] = 0.3 * (0.5 * curves[data.raw[skc.atk]] + 0.5 * curves[data.raw[skc.hlt]] + curves[data.raw[skc.rgn]]);
            };
        })();
        const calculateRealSkills = (raw) => {
            const data = raw.slice().concat([0, 0, 0, 0]);
            data[skc.rld] = Math.pow(0.5, curves[raw[skc.rld]]);
            data[skc.pen] = apply(2.5, curves[raw[skc.pen]]);
            data[skc.str] = apply(2, curves[raw[skc.str]]);
            data[skc.dam] = apply(3, curves[raw[skc.dam]]);
            data[skc.spd] = 0.5 + apply(1.5, curves[raw[skc.spd]]);
            // Misc bullet stats
            data[skc.acl] = apply(0.5, curves[raw[skc.rld]]);
            data[skc.rst] = 0.5 * curves[data.raw[skc.str]] + 2.5 * curves[raw[skc.pen]];
            data[skc.ghost] = curves[raw[skc.pen]];
            // Body stats
            data[skc.shi] = c.GLASS_HEALTH_FACTOR * apply(3 / c.GLASS_HEALTH_FACTOR - 1, curves[raw[skc.shi]]);
            data[skc.atk] = apply(1, curves[raw[skc.atk]]);
            data[skc.hlt] = c.GLASS_HEALTH_FACTOR * apply(2 / c.GLASS_HEALTH_FACTOR - 1, curves[raw[skc.hlt]]);
            data[skc.mob] = apply(0.8, curves[raw[skc.mob]]);
            data[skc.rgn] = apply(25, curves[raw[skc.rgn]]);
            // Misc body stats
            data[skc.brst] = 0.3 * (0.5 * curves[raw[skc.atk]] + 0.5 * curves[raw[skc.hlt]] + curves[raw[skc.rgn]]);
            return data;
        }
        // Modification methods
        const change = (data, index, levels) => {
            if (data.points && data.raw[index] < data.caps[index]) {
                data.raw[index] += levels;
                data.flagged[skc[index]] = true;
                update(data);
            }
        };
        const setAll = (data, values) => {
            for (let i=0; i<10; i++) {
                data.raw[i] = values[i];
            }
            update(data);
        };
        const setCaps = (data, values) => {
            for (let i=0; i<10; i++) {
                data.caps[i] = values[i];
            }
            update(data);
        };
        const levelToPoint = (() => {
            const templevelers = [
                1,  2,  3,  4,  5,  6,  7,  8,  9,  10,
                11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
                31, 32, 33, 34, 35, 36, 38, 40, 42, 44,
            ];
            // Generate the real level array check thingy
            const levelers = new Array(c.SKILL_CAP);
            for (let i=0; i < c.SKILL_CAP + 1; i++) levelers[i] = templevelers.indexOf(i) !== -1;
            return levelers;
        })();
        const levelToScore = (() => {
            let tempArray = new Array(c.SKILL_CAP);
            for (let i=0; i < c.SKILL_CAP + 1; i++)
                tempArray[i] = Math.ceil(1.8 * Math.pow(i + 1, 1.8) - 2 * i + 1);
            return tempArray;
        })();
        const upgradeTiers = (() => {
            let upgrades = [];
            for (let i = 0; i < c.SKILL_CAP; i++) {
                upgrades.push(0);
            }
            let keys = Object.keys(c);
            let tiers = [];
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].startsWith('TIER_')) {
                    tiers.push(c[keys[i]]);
                }
            }
            for (let i = 0; i < c.SKILL_CAP + 1; i++)
                (tiers.includes(i)) ? upgrades[i] = 1: upgrades[i] = 0;
            return upgrades;
        })();
        const maintain = (() => {
            return (data) => {
                for (let i = 0; i < 10; i++) {
                    data.flagged[i] = false;
                }
                if (data.level < c.SKILL_CAP) {
                    let didStuff = false;
                    while (data.score - data.deduction >= levelToScore[data.level]) {
                        data.deduction += levelToScore[data.level];
                        data.level++;
                        entityData.photo.level = data.level;
                        entityData.photo.size = entityData.size();
                        entityData.photo.rsize = entityData.realSize();
                        data.points += levelToPoint[data.level];
                        //data.canUpgrade = data.canUpgrade || data.level == c.TIER_1 || data.level == c.TIER_2 || data.level == c.TIER_3;
                        //let upgradeTiers =
                        data.canUpgrade = upgradeTiers[data.level];
                        update(data);
                        //return true;
                        didStuff = true;
                    }
                    if (didStuff) {
                        update(data);
                        return true;
                    }
                }
                return false;
            };
        })();
        const returnSkills = data => {
            for (let i=0; i<10; i++) {
                __a.int[i] = data.raw[i];
            }
            return __a.int;
        };
        const amount = (data, skill) => {
            return data.raw[skc[skill]];
        };
        const upgrade = (data, stat) => {
            if (data.points && amount(data, stat) < cap(data, stat)) {
                change(data, skc[stat], 1);
                data.points--;
                return true;
            }
            return false;
        };
        const cap = (data, skill, real = false) => {
            if (!real && data.level < c.SKILL_SOFT_CAP) {
                return Math.round(data.caps[skc[skill]] * c.SOFT_MAX_SKILL);
            }
            return data.caps[skc[skill]];
        }
        const set = (data, skill, value) => {
            data.raw[skill] = value;
        }

        return (raw = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) => {
            _data.push({
                raw: raw,
                flagged: [false, false, false, false, false, false, false, false, false, false],
                caps: [c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL,
                    c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL],
                real: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                points: 0,
                score: 0,
                deduction: 0,
                level: 0,
                canUpgrade: false,
                name: [
                    'Reload',
                    'Bullet Penetration',
                    'Bullet Health',
                    'Bullet Damage',
                    'Bullet Speed',
                    'Shield Capacity',
                    'Body Damage',
                    'Max Health',
                    'Shield Regeneration',
                    'Movement Speed',
                ]
            });
            const data = _data[_data.length - 1];
            const obj = {};
            obj.change = (skill, levels) => change(data, skc[skill], levels),
                obj.changeIndex = (skill, levels) => change(data, skill, levels),
                obj.setIndex = (skill, value) => set(data, skill, value),
                obj.set = (values) => setAll(data, values),
                obj.setCaps = values => setCaps(data, values),
                obj.maintain = () => maintain(data),
                obj.update = () => update(data),
                obj.get = (skl) => data.real[skc[skl]],
                obj.getAll = (nocopy = true) => (nocopy) ? data.raw : data.raw.slice(),
                obj.getAllReal = (nocopy = true) => (nocopy) ? data.real : data.real.slice(),
                obj.getAllCaps = (nocopy = true) => (nocopy) ? data.caps : data.caps.slice(),
                obj.findReal = (raw) => calculateRealSkills(raw),
                //getPoints: () => data.points,
                //getScore: () => data.score,
                //getDeduction: () => data.deduction,
                //getLevel: () => data.level,
                //setPoints: (points) => { data.points = points; },
                //setScore: (score) => { data.score = score; },
                //setDeduction: (deduction) => { data.deduction = deduction; },
                //setLevel: (level) => { data.level = level; },
                property(obj, 'points', data, 'points', 0),
                referenceProperty(obj, 'score', data, 'score', entityData.photo, 'score', 0),
                property(obj, 'deduction', data, 'deduction', 0),
                functionResetReferenceProperty(obj, 'level', data, 'level', entityData.photo, ['size', 'rsize'], [entityData.size, entityData.realSize], 0),
                //_set: ({points = data.points, score = data.score, deduction = data.deduction, level = data.level}) => {
                //data.points = points,
                //data.score = score,
                //data.deduction = deduction,
                //data.level = level;
                //},
                obj.upgradable = () => data.canUpgrade,
                obj.flagged = () => data.flagged,
                obj.cap = (skill, real = false) => cap(data, skill, real),
                obj.upgrade = (stat) => upgrade(data, stat),
                obj.amount = (skill) => amount(data, skill),
                obj.title = (skill) => data.name[skc[skill]],
                obj.names = () => data.name,
                obj.setNames = (names) => data.name = names,
                obj.reset = () => {
                    set(data, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                    data.points = 0;
                    data.score = 0;
                    data.deduction = 0;
                    data.level = 0;
                    entityData.photo.level = 0;
                    entityData.photo.score = 0;
                    data.canUpgrade = false;
                },
                obj.levelScore = () => levelToScore[data.level] || Math.ceil(1.8 * Math.pow(data.level + 1, 1.8) - 2 * data.level + 1),
                obj.levelPoints = () => levelToPoint[data.level] || 0,
                obj.progress = () => (levelToPoint[data.level] || 0) ? (data.score - data.deduction) / levelToPoint[data.level] : 0,
                obj.grab = (index) => data.raw[index];
            return obj;
        };
    })();

    const getPredefinedController = (controllerdef, body = entityData) => {
        let player = entityData.player;
        let controller = [
            () => null, // think
            false, // acceptsFromTop
        ];
        //if (player !== null) {
        //  controller.push(player);
        //}

        // base predefined controllers, with
        // ADS this will look in a predefined
        // controller list for the controllers
        // module in order to do this properly
        switch (controllerdef) {
            case 'doNothing': {
                controller[1] = false;
                controller[0] = () => {
                    return {
                        goal: [
                            body.physics.position[0],
                            body.physics.position[1],
                        ],
                        main: false,
                        fire: false,
                        alt: false
                    }
                }
            } break;
            case 'moveInCircles': {
                controller[1] = false;
                controller.push(ran.irandom(10) + 3);
                controller.push([
                    body.physics.position[0] + 10 * Math.cos(-body.physics.facing),
                    body.physics.position[1] + 10 * Math.sin(-body.physics.facing)
                ]);
                controller[0] = () => {
                    if (!(--controller[2])) {
                        controller[2] = 10;
                        controller[3] = [
                            body.physics.position[0] + 10 * Math.cos(-body.physics.facing),
                            body.physics.position[1] + 10 * Math.sin(-body.physics.facing)
                        ];
                    }
                    return {
                        goal: controller[3]
                    }
                }
            } break;
            case 'listenToPlayer': {
                controller[1] = false;
                controller[0] = () => {
                    let targ = [
                        player.target[0],
                        player.target[1]
                    ];
                    if (player.command.autoSpin) {
                        let kk = Math.atan2(entityData.control.target[1], entityData.control.target[0]) + 0.02;
                        targ = [
                            100 * Math.cos(kk),
                            100 * Math.sin(kk)
                        ];
                    } else if (false /* reverse tank */) {

                    }
                    if (entityData.status.invuln) {
                        if (player.command.right || player.command.left || player.command.up || player.command.down || player.command.lmb) {
                            entityData.status.invuln = false;
                        }
                    }
                    entityData.autoOverride = player.command.autoOverride;
                    let left = player.command.lmb;
                    let right = player.command.rmb;
                    if (player.command.reverseMouse) {
                        let temp = right;
                        right = left;
                        left = temp;
                    }
                    left = player.command.autoFire || left;
                    return {
                        target: targ,
                        goal: [
                            entityData.physics.position[0] + player.command.right - player.command.left,
                            entityData.physics.position[1] + player.command.down - player.command.up
                        ],
                        fire: left,
                        main: left || player.command.autoSpin,
                        alt: right,
                        // reverse tank
                    }
                }
            } break;
            case 'mapTargetToGoal': {
                controller[1] = true;
                controller[0] = (input) => {
                    if (input.main || input.alt) {
                        const thing = {
                            goal: [
                                input.target[0] + body.physics.position[0],
                                input.target[1] + body.physics.position[1]
                            ],
                            power: 1
                        }
                        return thing;
                    }
                }
            } break;
            case 'boomerang': {
                controller[1] = true;
                controller.push(0); // r
                controller.push(entityData); // b
                controller.push(controller[3].family.master); // m
                controller.push(false); // turnover
                controller.push(10 * util.getDistance([0, 0], [body.family.master.control.target[0], body.family.master.control.target[1]]));
                controller.push([
                    3 * body.family.master.control.target[0] + body.family.master.physics.position[0],
                    3 * body.family.master.control.target[1] + body.family.master.physics.position[1]
                ]);
                controller[0] = () => {
                    if (controller[3].attributes.range > controller[2]) {
                        controller[2] = controller[3].attributes.range;
                    }
                    let t = 1;
                    if (!controller[5]) {
                        if (controller[2] && controller[3].attributes.range < controller[2] * 0.5) {
                            controller[5] = true;
                        }
                        return {
                            goal: controller[7],
                            power: t
                        }
                    } else {
                        return {
                            goal: [
                                controller[4].physics.position[0],
                                controller[4].physics.position[1]
                            ],
                            power: t
                        }
                    }
                }
            } break;
            case 'goToMasterTarget': {
                controller[1] = true;
                controller.push([
                    entityData.family.master.control.target[0] + entityData.family.master.physics.position[0],
                    entityData.family.master.control.target[1] + entityData.family.master.physics.position[1]
                ]);
                controller.push(5);
                controller[0] = () => {
                    if (controller[3]) {
                        if (util.getDistance([entityData.physics.position[0], entityData.physics.position[1]], controller[2]) < 1) {
                            controller[3]--;
                        }
                        return {
                            goal: [
                                controller[2][0],
                                controller[2][1]
                            ]
                        }
                    }
                }
            } break;
            case 'canRepel': {
                controller[1] = true;
                controller[0] = (input) => {
                    if (input.alt && input.target) {
                        //let x = entityData.family.master.get().family.master.get().physics.position.get(0);
                        //let y = entityData.family.master.get().family.master.get().physics.position.get(0);
                        // wtf why did we even calculate those still?
                        return {
                            target: [
                                input.target[0],
                                input.target[1]
                            ],
                            main: true
                        }
                    }
                }
            } break;
            case 'alwaysFire': {
                controller[1] = true;
                controller[0] = () => {
                    return {
                        fire: true
                    }
                }
            } break;
            case 'targetSelf': {
                controller[1] = true;
                controller[0] = () => {
                    return {
                        main: true,
                        target: [0, 0]
                    }
                }
            } break;
            case 'mapAltToFire': {
                controller[1] = true;
                controller[0] = (input) => {
                    if (input.alt) {
                        return {
                            fire: true
                        }
                    }
                }
            } break;
            case 'onlyAcceptInArc': {
                controller[1] = true;
                controller[0] = (input) => {
                    if (input.target && body.bindings.firingArc != null) {
                        if (Math.abs(util.angleDifference(Math.atan2(input.target[1], input.target[0]), body.bindings.firingArc[0])) >= body.bindings.firingArc[1]) {
                            return {
                                fire: false,
                                main: false,
                                alt: false
                            }
                        }
                    }
                }
            } break;
            case 'nearestDifferentMaster': {
                controller[1] = true;
                controller.push((range) => {
                    let m = [body.physics.position[0], body.physics.position[1]],
                        mm = [body.family.master.physics.position[0], body.family.master.physics.position[1]],
                        mostDangerous = 0,
                        sqrRange = range * range,
                        sqrRangeMaster = range * range * 4 / 3,
                        keepTarget = false;

                    let out = entities.filter((e) => {
                        return (e.health.amount > 0) &&
                            (!e.status.invuln) &&
                            (e.family.master.team !== body.family.master.family.master.team) &&
                            (e.family.master.team !== -101) &&
                            // alpha > 0.5
                            (e.attributes.type === 'tank' || e.attributes.type === 'crasher' || e.attributes.type === 'fixed' || (!body.attributes.aiSettings.shapefriend && e.attributes.type === 'food')) &&
                            (body.attributes.aiSettings.parentView || ((e.physics.position[0] - m[0]) ** 2 < sqrRange && (e.physics.position[1] - m[1]) ** 2 < sqrRange)) &&
                            (body.attributes.aiSettings.skynet || ((e.physics.position[0] - mm[0]) ** 2 < sqrRangeMaster && (e.physics.position[1] - mm[1]) ** 2 < sqrRangeMaster));
                    }).filter((e) => {
                        if (body.bindings.firingArc != null || body.attributes.aiSettings.view360 ||
                            Math.abs(util.angleDifference(util.getDirection([body.physics.position[0], body.physics.position[1]], [e.physics.position[0], e.physics.position[1]]),
                                body.bindings.firingArc[0])) < body.bindings.firingArc[1])
                            mostDangerous = Math.max(e.attributes.dangerValue, mostDangerous);
                        return true;
                    }).filter((e) => {
                        if (body.attributes.aiSettings.farm || e.attributes.dangerValue == mostDangerous) {
                            if (targetLock && e.identifiers.id === targetLock.identifiers.id) keepTarget = true;
                            return true;
                        }
                        return false;
                    });

                    if (!keepTarget) targetLock = undefined;
                    return out;
                });
                let targetLock = undefined,
                    tick = ran.irandom(30),
                    lead = 0,
                    validTargets = controller[2](body.attributes.fov),
                    oldHealth = body.health.getDisplay();
                controller[0] = (input) => {
                    // body alpha < 0.5 return {}

                    if (input.main || input.alt || body.family.master.autoOverride) {
                        targetLock = undefined; return {};
                    }

                    let tracking = body.attributes.topSpeed,
                        range = body.attributes.fov;

                    for (let i = 0; i < body.guns.length; i++) {
                        if (body.guns[i].canShoot()) {
                            let v = body.guns[i].getTracking();
                            tracking = v[0];
                            range = Math.min(range, v[0] * v[1]);
                            break;
                        }
                    }

                    if (targetLock) {
                        let m = [body.physics.position[0], body.physics.position[1]],
                            mm = [body.family.master.physics.position[0], body.family.master.physics.position[1]],
                            sqrRange = range * range,
                            sqrRangeMaster = range * range * 4 / 3,
                            e = targetLock;
                        if ((e.health.amount > 0) &&
                            (!e.status.invuln) &&
                            (e.family.master.team !== body.family.master.family.master.team) &&
                            (e.family.master.team !== -101) &&
                            // alpha > 0.5
                            (e.attributes.type === 'tank' || e.attributes.type === 'crasher' || e.attributes.type === 'fixed' || (!body.attributes.aiSettings.shapefriend && e.attributes.type === 'food')) &&
                            (body.attributes.aiSettings.parentView || ((e.physics.position[0] - m[0]) ** 2 < sqrRange && (e.physics.position[1] - m[1]) ** 2 < sqrRange)) &&
                            (body.attributes.aiSettings.skynet || ((e.physics.position[0] - mm[0]) ** 2 < sqrRangeMaster && (e.physics.position[1] - mm[1]) ** 2 < sqrRangeMaster))) {

                        } else {
                            targetLock = undefined;
                            tick = 100;
                        }
                    }

                    if (tick++ > 15 * ROOMSPEED) {
                        tick = 0;
                        validTargets = controller[2](range);

                        if (targetLock && validTargets.indexOf(targetLock) !== -1) {
                            targetLock = undefined;
                        }

                        if (targetLock == null && validTargets.length) {
                            targetLock = (validTargets.length === 1) ? validTargets[0] : nearest(validTargets, [body.physics.position[0], body.physics.position[1]]);
                            tick = -90;
                        }
                    }

                    if (targetLock != null) {
                        let radial = [targetLock.physics.velocity[0], targetLock.physics.velocity[1]];
                        let diff = [targetLock.physics.position[0] - body.physics.position[0], targetLock.physics.position[1] - body.physics.position[1]];

                        if (tick % 4 === 0) {
                            lead = 0;

                            if (!body.attributes.aiSettings.chase) {
                                let toi = timeOfImpact(diff, radial, tracking);
                                lead = toi;
                            }
                        }

                        return {
                            target: [
                                diff[0] + lead * radial[0],
                                diff[1] + lead * radial[1]
                            ],
                            fire: true,
                            main: true
                        }
                    }
                    return {};
                }
            } break;
            case 'spin': {
                let a = 0;
                controller[1] = true;
                controller[0] = (input) => {
                    a += 0.04;
                    let offset = 0;
                    if (body.bindings.bond != null) {
                        offset = body.bindings.bound.angle;
                    }
                    let target = [
                        Math.cos(a + offset),
                        Math.sin(a + offset)
                    ];
                    return {
                        target: target,
                        main: true
                    }
                }
            } break;
            case 'fastspin': {
                let a = 0;
                controller[1] = true;
                controller[0] = (input) => {
                    a += 0.08;
                    let offset = 0;
                    if (body.bindings.bond != null) {
                        offset = body.bindings.bound.angle;
                    }
                    return {
                        target: [
                            Math.cos(a + offset),
                            Math.sin(a + offset)
                        ],
                        main: true
                    }
                }
            } break;
            case 'reversespin': {
                let a = 0;
                controller[1] = true;
                controller[0] = (input) => {
                    a -= 0.05;
                    let offset = 0;
                    if (body.bindings.bond != null) {
                        offset = body.bindings.bound.angle;
                    }
                    return {
                        target: [
                            Math.cos(a + offset),
                            Math.sin(a + offset)
                        ],
                        main: true
                    }
                }
            } break;
            case 'fleeAtLowHealth': {
                controller[1] = true;
                controller.push(util.clamp(ran.gauss(0.7, 0.15), 0.1, 0.9));
                controller[0] = (input) => {
                    if (input.fire && input.target != null && body.health.amount < body.health.max * controller[2]) {
                        return {
                            goal: [
                                body.physics.position[0] - input.target[0],
                                body.physics.position[1] - input.target[1]
                            ]
                        };
                    }
                }
            } break;
            case 'minion': {
                controller[1] = true;
                controller.push(1);
                controller[0] = (input) => {
                    if (body.attributes.aiSettings.reverseDirection && ran.chance(0.005)) { controller[2] = -1 * controller[2]; };
                    if (input.target != null && (input.alt || input.main)) {
                        let sizeFactor = Math.sqrt(body.family.master.size() / body.family.master.attributes.size),
                            leash = 82 * sizeFactor,
                            orbit = 140 * sizeFactor,
                            repel = 142 * sizeFactor,
                            goal,
                            power = 1,
                            target = [input.target[0], input.target[1]];
                        if (input.alt) {
                            if (getLength(target[0], target[1]) < leash) {
                                goal = [
                                    body.physics.position[0] + target[0],
                                    body.physics.position[1] + target[1]
                                ];
                            } else if (getLength(target[0], target[1]) < repel) {
                                let dir = -controller[2] * getDirection(target[0], target[1]) + Math.PI / 5;
                                goal = [
                                    body.physics.position[0] + Math.cos(dir),
                                    body.physics.position[1] + Math.sin(dir)
                                ];
                            } else {
                                goal = [
                                    body.physics.position[0] - target[0],
                                    body.physics.position[1] - target[1]
                                ];
                            }
                        } else if (input.main) {
                            let dir = controller[2] * getDirection(target[0], target[1]) + 0.01;
                            goal = [
                                body.physics.position[0] + target[0] - orbit * Math.cos(dir),
                                body.physics.position[1] + target[1] - orbit * Math.sin(dir)
                            ];
                            if (Math.abs(getLength(target[0], target[1]) - orbit) < body.size() * 2) {
                                power = 0.7;
                            }
                        }
                        return {
                            goal: goal,
                            power: power
                        }
                    }
                }
            } break;
            default: {
                // if we throw here we frick up a lot of stuff right now but later it should be added
            }
        }

        return controller;
    }


    /*const getPredefinedController = (() => {
      let think = null;

      return (controller, body, player = null) => {
        let think = null;
        let acceptsFromTop = false;


        switch(controller) {
          case 'listenToPlayer':
            think = () => {
              let targ = [player.target[0],
                          player.target[1]];
              if (player.command.autospin) {
                let kk = Math.atan2(body.get('control.target', 1), body.get('control.target', 0)) + 0.02;
                targ[0] = 100 * Math.cos(kk);
                targ[1] = 100 * Math.sin(kk);
              }

              if (body.get('invincible')) {
                if (player.command.right || player.command.left || player.command.up || player.command.down || player.command.lmb) {
                  body.set('invincible', false);
                }
              }

              body.set('autoOverride', player.command.autooverride);

              return {
                target: targ,
                goal: [body.get('physics.position', 0) + player.command.right - player.command.left,
                       body.get('physics.position', 1) + player.command.down - player.command.up],
                fire: player.command.lmb || player.command.autofire,
                main: player.command.lmb || player.command.autospin || player.command.autofire,
                alt: player.command.rmb,
              }
            }
            break;
        }

        return think;
      }
    });*/

    /*
    const updateController = (name, input = null) => {
      return call(entityData, 'controllers.' + name, input);
    }
    */

    //const updateController = (name, input = null) => {
    //
    //}

    // A gun
    const newGun = (() => {
        /*const interpret = (() => {
                            const out = {
                                SPEED: 0.0,
                                HEALTH: 0.0,
                                RESIST: 0.0,
                                DAMAGE: 0.0,
                                PENETRATION: 0.0,
                                RANGE: 0.0,
                                DENSITY: 0.0,
                                PUSHABILITY: 0.0,
                                HETERO: 0.0,
                            };
                            return gun => {
                                const shoot = gun.properties.settings;
                                const sk = gun.body.skills.getAllReal();
                                // Defaults
                                out.SPEED = shoot.maxSpeed * sk[skc.spd];
                                out.HEALTH = shoot.health * sk[skc.str];
                                out.RESIST = shoot.resist + sk[skc.rst];
                                out.DAMAGE = shoot.damage * sk[skc.dam];
                                out.PENETRATION = Math.max(1, shoot.pen * sk[skc.pen]);
                                out.RANGE = shoot.range / Math.sqrt(sk[skc.spd]);
                                out.DENSITY = shoot.density * sk[skc.pen] * sk[skc.pen];
                                out.PUSHABILITY = 1 / sk[skc.pen];
                                out.HETERO = 3 - 2.8 * sk[skc.ghost];
                                // Special cases
                                switch (gun.properties.calculator) {
                                case 0: break;
                                case 5: // THRUSTER
                                    gun.physics[3] = shoot.recoil * Math.sqrt(sk[skc.rld] * sk[skc.spd]);
                                    break;
                                case 6: // SUSTAINED
                                    out.RANGE = shoot.range;
                                    break;
                                case 3: // SWARM
                                    out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk[skc.pen] - 1) + 1));
                                    out.HEALTH /= shoot.pen * sk[skc.pen];
                                    break;
                                case 8: // TRAP
                                    out.PUSHABILITY = 1 / Math.pow(sk[skc.pen], 0.5);
                                    out.RANGE = shoot.range;
                                    break;
                                case 7: // NECRO
                                case 2: // DRONE
                                    out.PUSHABILITY = 1;
                                    out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk[skc.pen] - 1) + 1));
                                    out.HEALTH = (shoot.health * sk[skc.str]) / Math.pow(sk[skc.pen], 0.8);
                                    out.DAMAGE = shoot.damage * sk[skc.dam] * shoot.pen * sk[skc.pen];
                                    out.RANGE = shoot.range;
                                    break;
                                }
                                // Go through and make sure we respect its natural properties
                                for (let property in out) {
                                    if (gun.properties.bullet.stats[property] == null || !out.hasOwnProperty(property)) continue;
                                    out[property] *= gun.properties.bullet.stats[property];
                                }
                                return out;
                            };
              })();*/

        const live = (() => {
            const doRecoil = (gun, canShoot) => {
                let motion = gun.physics[0], position = gun.physics[1];
                if (motion) {
                    position += (motion);
                    motion -= 0.25 * position / ROOMSPEED;
                    if (position < 0) { position = 0; motion = -motion; }
                    if (motion > 0) motion *= 0.75;
                    //gun.physics[0] -= 0.25 * gun.physics[1] / ROOMSPEED;
                    //gun.physics[1] += gun.physics[0];
                    //if (gun.physics[1] < 0) {
                    //  gun.physics[1] = 0;
                    //  gun.physics[0] = -gun.physics[0];
                    //}
                    //if (gun.physics[0] > 0) {
                    //  gun.physics[0] *= 0.75;
                    //}
                }
                if (canShoot && !gun.properties.settings.hasNoRecoil) {
                    //if (gun.physics[0] > 0) gun.body.physics.accelerate(
                    //    -gun.physics[1] * gun.physics[2] /*trueRecoil*/ * 0.045 / ROOMSPEED,
                    //    gun.body.physics.facing.get() + gun.mechanics.angle
                    //);
                    if (gun.physics[0] > 0) {
                        let force = -gun.physics[1] * gun.physics[3] * 0.045 / ROOMSPEED; // 0.045 normally
                        let direction = gun.body.physics.facing + gun.mechanics.angle;
                        gun.body.physics.acceleration[0] += force * Math.cos(direction);
                        gun.body.physics.acceleration[1] += force * Math.sin(direction);
                        //gun.body.physics.shove(applied[0], applied[1]);
                    }
                }
                gun.physics[0] = motion; gun.physics[1] = position;
            };

            const doLive = (() => {
                // The shooting function
                const fire = (() => {
                    const bulletInit = (() => {
                        const interpret = (() => {
                            const out = {
                                SPEED: 0.0,
                                HEALTH: 0.0,
                                RESIST: 0.0,
                                DAMAGE: 0.0,
                                PENETRATION: 0.0,
                                RANGE: 0.0,
                                DENSITY: 0.0,
                                PUSHABILITY: 0.0,
                                HETERO: 0.0,
                            };
                            return (gun) => {
                                const shoot = gun.properties.settings;
                                const sk = (gun.properties.skills) ? gun.body.skills.findReal(gun.properties.skills) : gun.body.skills.getAllReal();
                                // Defaults
                                out.SPEED = shoot.maxSpeed * sk[skc.spd];
                                out.HEALTH = shoot.health * sk[skc.str];
                                out.RESIST = shoot.resist + sk[skc.rst];
                                out.DAMAGE = shoot.damage * sk[skc.dam];
                                out.PENETRATION = Math.max(1, shoot.pen * sk[skc.pen]);
                                out.RANGE = shoot.range / Math.sqrt(sk[skc.spd]);
                                out.DENSITY = shoot.density * sk[skc.pen] * sk[skc.pen];
                                out.PUSHABILITY = 1 / sk[skc.pen];
                                out.HETERO = 3 - 2.8 * sk[skc.ghost];
                                // Special cases
                                switch (gun.properties.calculator) {
                                    case 0: break;
                                    case 5: // THRUSTER
                                        gun.physics[3] = shoot.recoil * Math.sqrt(sk[skc.rld] * sk[skc.spd]);
                                        break;
                                    case 6: // SUSTAINED
                                        out.RANGE = shoot.range;
                                        break;
                                    case 3: // SWARM
                                        out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk[skc.pen] - 1) + 1));
                                        out.HEALTH /= shoot.pen * sk[skc.pen];
                                        break;
                                    case 8: // TRAP
                                        out.PUSHABILITY = 1 / Math.pow(sk[skc.pen], 0.5);
                                        out.RANGE = shoot.range;
                                        break;
                                    case 7: // NECRO
                                    case 2: // DRONE
                                        out.PUSHABILITY = 1;
                                        out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk[skc.pen] - 1) + 1));
                                        out.HEALTH = (shoot.health * sk[skc.str]) / Math.pow(sk[skc.pen], 0.8);
                                        out.DAMAGE = shoot.damage * sk[skc.dam] * shoot.pen * sk[skc.pen];
                                        out.RANGE = shoot.range;
                                        break;
                                }
                                // Go through and make sure we respect its natural properties
                                for (let property in out) {
                                    if (gun.properties.bullet.stats[property] == null || !out.hasOwnProperty(property)) continue;
                                    out[property] *= gun.properties.bullet.stats[property];
                                }
                                return out;
                            };
                        })();
                        const necroFunction = (gun, mancer, host) => {
                            const body = gun.body, props = gun.properties;
                            //const reloadFactor = body.getSkills()[0];
                            const reloadFactor = body.skills.grab(0);
                            const permission = props.countsOwnKids ?
                                props.countsOwnKids > gun.children.length * reloadFactor :
                                body.attributes.maxChildren ?
                                    body.attributes.maxChildren > body.family.children * reloadFactor :
                                    true;

                            if (permission) {
                                __a.float[0] = host.physics.facing;
                                __a.float[1] = host.size();
                                // Reset it as much as possible
                                host.define(Class.genericEntity);
                                // Turn it
                                bulletInit(gun, host);
                                // Init it with stuff
                                //host.identifiers.setTeam(mancer.identifiers.getTeam());
                                //host.identifiers._set({team:mancer.identifiers.getTeam()});
                                //host.family._set({master:mancer.family.getMaster()});
                                host.identifiers.team = mancer.identifiers.team;
                                host.family.master = mancer.family.master;
                                host.color = mancer.color;
                                //host.physics._set({facing:__a.float[0]});
                                host.physics.facing = __a.float[0];
                                host.attributes.size = __a.float[1];
                                host.health.amount = host.health.max;
                                //host.health._set({amount:host.health.getMax()});
                                /*
                                host.family.setMaster(mancer.family.getReadable().master);
                                host.color = mancer.color;
                                host.setFacing(__a.float[0]);
                                host.setSize(__a.float[1]);
                                host.fullHeal();
                                */
                                return true;
                            }
                            return false;
                        };
                        return (gun, o) => {
                            const body = gun.body, props = gun.properties;
                            // Define it by its natural properties
                            //props.bullet.types.forEach(type => { o.define(type); });
                            for (let i = 0; i < props.bullet.types.length; i++) {
                                o.define(props.bullet.types[i]);
                            }

                            let skill = body.skills.getAll(false);
                            skill[5] = skill[6] = skill[7] = skill[8] = skill[9] = 0;
                            // Pass the gun attributes
                            o.define({
                                BODY: interpret(gun),
                                SIZE: body.size() * gun.mechanics.width * props.settings.size / 2 ,
                                LABEL: entityData.family.master.attributes.label + (props.label === '' ? '' : ' ' + props.label) + ' ' + o.attributes.label,
                            });
                            o.color = body.color;

                            gun.children.push(o);
                            if (body.attributes.maxChildren) {
                                body.family.addChild(o);
                                o.family.parent = body;
                            }

                            if (props.countsOwnKids) {
                                //o.family.parent.set() set to gun or something
                            }
                            /*
                            if (props.countsOwnKids) {
                              gun.children.push(o);
                              o.family.parent.set(body);
                            } else if (body.attributes.maxChildren) {
                              gun.children.push(o);
                              o.family.parent.set(body);
                              body.family.addChild(o);
                            }
                            */

                            o.family.source = body;
                            o.physics.facing = getDirection(o.physics.velocity[0], o.physics.velocity[1]);

                            // Prepare to pass gun skills
                            //o.assignSkills(skill);
                            o.skills.set(skill);
                            // Keep track of it and give it the function it needs to remove itself upon death
                            //gun.children.push(o);
                            //o.addDerefFunction(() => util.remove(gun.children, gun.children.indexOf(o)));
                            //o.deref.push(() => util.remove(gun.children, gun.children.indexOf(o)));
                            o.deref.push(() => body.family.removeChild(o));
                            o.deref.push(() => util.remove(gun.children, gun.children.indexOf(o)));
                            //o.addDerefFunction((() => body.removeChild(o)));
                            // Set the source
                            //o.family.setSource(body);
                            // Necromancers' crap
                            if (props.calculator === 7) o.necro = host => necroFunction(gun, o, host);
                            // Otherwise
                            //console.log(o.physics);
                            //console.log(o.physics.position);
                            //console.log(o.physics.position.get(0));

                            //EntityFunctions.refresh(o);
                            //EntityFunctions.life(o);
                            //o.refreshBodyAttributes();
                            //o.life();
                        };
                    })();
                    return (gun, x, y, sk) => {
                        const body = gun.body, props = gun.properties, physics = gun.physics, mech = gun.mechanics;
                        //const sk = body.skills.getAll();
                        // Recoil
                        gun.lastShot[0] = util.time();
                        gun.lastShot[1] = 3 * Math.log(Math.sqrt(sk[skc.spd]) + physics[3] + 1) + 1;
                        physics[0] += gun.lastShot[1];
                        // Find inaccuracy
                        let ss, sd;
                        do {
                            ss = ran.gauss(0, Math.sqrt(props.settings.shudder));
                        } while (Math.abs(ss) >= props.settings.shudder * 2);
                        do {
                            sd = ran.gauss(0, props.settings.spray * props.settings.shudder);
                        } while (Math.abs(sd) >= props.settings.spray / 2);
                        sd *= Math.PI / 180;
                        // Find speed
                        const speed = ((props.negRecoil ? -1 : 1) * props.settings.speed * c.runSpeed * sk[skc.spd] * (1 + ss)); //(1 + ss);
                        let sx = speed * Math.cos(mech.angle + body.physics.facing + sd),
                            sy = speed * Math.sin(mech.angle + body.physics.facing + sd);
                        // Boost it if we should
                        let velocity = [body.physics.velocity[0], body.physics.velocity[1]];
                        let vlen = getLength(velocity[0], velocity[1]);
                        if (vlen) {
                            //let slen = getLength(sx, sy);
                            //let extraBoost = Math.max(0, sx * velocity[0] + sy * velocity[1]) / vlen / slen;
                            //if (extraBoost) {
                            //  sx += vlen * extraBoost * sx / slen;
                            //  sy += vlen * extraBoost * sy / slen;
                            //}
                            //let slen = getLength(sx, sy);
                            let slen = getLength(sx, sy);
                            let extraBoost = Math.max(0, sx * velocity[0] + sy * velocity[1]);
                            if (extraBoost) {
                                extraBoost /= slen * slen;
                                sx += extraBoost * sx;
                                sy += extraBoost * sy;
                            }
                        }
                        // Create the bullet
                        const position = [body.physics.position[0], body.physics.position[1]], size = body.size();
                        //const o = makeEntity()(
                        //    position[0] + size * x - sx,
                        //    position[1] + size * y - sy
                        //);
                        const o = entity(
                            position[0] + size * x - sx,
                            position[1] + size * y - sy,
                            gun.body.family.master.family.master
                        );
                        //o.physics.velocity.set(sx, 0); o.physics.velocity.set(sy, 1);
                        o.physics.shove(sx, sy);
                        bulletInit(gun, o);
                        o.attributes.coreSize = o.attributes.size;
                        EntityFunctions.refresh(o);
                        //EntityFunctions.life(o);
                        //const destination = EntityFunctions.apply(o.attributes.range, [sx, sy]);
                        //o.physics.destination.set(o.physics.position.get(0) + destination[0], 0); o.physics.destination.set(o.physics.position.get(1) + destination[1], 1);
                    };
                })();
                // The actual update function
                return gun => {
                    // Live
                    const body = gun.body, props = gun.properties, physics = gun.physics, mech = gun.mechanics;
                    const sk = (props.skills) ? body.skills.findReal(props.skills) : body.skills.getAllReal();
                    // Decides what to do based on child-counting settings
                    let permission = !body.status.invuln && ((gun.properties.destroyOldestChild) || ((props.countsOwnKids) ?
                        (props.countsOwnKids > gun.children.length * ((props.calculator === 7) ? sk[skc.rld] : 1)) :
                        (body.attributes.maxChildren) ? (body.family.children.length * ((props.calculator) === 7 ? sk[skc.rld] : 1) < body.attributes.maxChildren) :
                            true));

                    //if (gun.properties.destroyOldestChild && !permission) {
                    //  permission = true;
                    //}
                    //console.log('things');
                    //console.log('value of permission ' + permission);

                    // Cycle up if we should
                    if (permission || !props.waitToCycle) {
                        if (physics[2] < 1) {
                            physics[2] += 1 / props.settings.reload / ROOMSPEED / ((props.calculator === 7 || props.calculator === 4) ? 1 : sk[skc.rld]);
                        }
                    }

                    // Firing routines
                    if (permission && (props.autofire || ((props.altFire) ? body.control.alt : body.control.fire))) {
                        if (physics[2] >= 1) {
                            // Find the middle-end of the gun barrel
                            const gx =
                                mech.offset * Math.cos(mech.direction + mech.angle + body.physics.facing) +
                                (1.5 * (mech.length) - mech.width * props.settings.size / 2) * Math.cos(mech.angle + body.physics.facing);
                            const gy =
                                mech.offset * Math.sin(mech.direction + mech.angle + body.physics.facing) +
                                (1.5 * (mech.length) - mech.width * props.settings.size / 2) * Math.sin(mech.angle + body.physics.facing);

                            // Shoot, multiple times in a tick if needed
                            while (permission && physics[2] >= 1) {
                                fire(gun, gx, gy, sk);
                                // Figure out if we may still shoot
                                permission = props.countsOwnKids ?
                                    props.countsOwnKids > gun.children.length * (props.calculator === 7 ? sk[skc.rld] : 1) :
                                    body.attributes.maxChildren ? body.family.children.length  * (props.calculator === 7 ? sk[skc.rld] : 1) < body.attributes.maxChildren :
                                        true;
                                // Cycle down
                                physics[2] -= 1;
                            }  // If we're not shooting, only cycle up to where we'll have the proper firing delay
                        }
                    } else if (physics[2] > !props.waitToCycle - mech.delay) {
                        physics[2] = !props.waitToCycle - mech.delay;
                    }
                    gun.physics[2] = physics[2];
                    if (gun.properties.destroyOldestChild) {
                        let remove = gun.children.length - gun.properties.countsOwnKids;
                        for (let i = 0; i < remove; i++) {
                            let oldest = gun.children[i];
                            if (oldest) {
                                EntityFunctions.kill(oldest);
                            }
                        }
                    }
                }
            })();
            // The life function
            return (gun, canShoot = true) => {
                doRecoil(gun, canShoot);
                if (canShoot) {
                    doLive(gun);
                }
            };
        })();
        const getTracking = gun => {
            //const speed = gun.body.getSkills()[skc.spd];
            //const speed = gun.body.get('spd');
            const speed = gun.body.skills.grab([skc.spd]);
            __a.float[0] = c.runSpeed * speed * gun.properties.settings.maxSpeed * gun.properties.bullet.stats.SPEED;
            __a.float[1] = speed * gun.properties.settings.range * gun.properties.bullet.stats.RANGE;
            return __a.float;
        };
        return (body, info) => {
            const isInert = info.PROPERTIES === (null || undefined);
            const properties = isInert ? null : {
                settings: info.PROPERTIES.SHOOT_SETTINGS,
                label: load('', info.PROPERTIES.LABEL),
                autofire: load(false, info.PROPERTIES.AUTOFIRE),
                altFire: load(false, info.PROPERTIES.ALT_FIRE),
                calculator: load(0, info.PROPERTIES.STAT_CALCULATOR),
                waitToCycle: load(false, info.PROPERTIES.WAIT_TO_CYCLE),
                countsOwnKids: load(false, info.PROPERTIES.MAX_CHILDREN),
                syncsSkills: load(false, info.PROPERTIES.SYNCS_SKILLS),
                negRecoil: load(false, info.PROPERTIES.NEGATIVE_RECOIL),
                destroyOldestChild: load(false, info.PROPERTIES.DESTROY_OLDEST_CHILD),
                skills: load(null, info.PROPERTIES.BULLET_STATS),
                bullet: (() => {
                    //let types = (Array.isArray(info.PROPERTIES.TYPE)) ? info.PROPERTIES.TYPE.splice() : [info.PROPERTIES.TYPE];
                    let types = [];
                    if (Array.isArray(info.PROPERTIES.TYPE)) {
                        types = info.PROPERTIES.TYPE.slice();
                    } else {
                        types = [info.PROPERTIES.TYPE];
                    }
                    let stats = {};

                    /*
                    types.forEach(function setStats(type) {
                        if (type.PARENT != null) { // Make sure we load from the parents first
                            for (let i=0; i<type.PARENT.length; i++) setStats(type.PARENT[i]);
                        }
                        if (type.BODY != null) { // Get values if they exist
                            for (let index in type.BODY) stats[index] = type.BODY[index];
                        }
                    });
                    */

                    function setStats(type) {
                        if (type.PARENT != null) { // Make sure we load from the parents first
                            for (let i=0; i<type.PARENT.length; i++) setStats(type.PARENT[i]);
                        }
                        if (type.BODY != null) { // Get values if they exist
                            for (let index in type.BODY) stats[index] = type.BODY[index];
                        }
                    }

                    for (let type of types) {
                        setStats(type);
                    }

                    return { types: types, stats: stats };
                })()
            };
            const _position = info.POSITION;
            const gun = {
                body: body,
                mechanics: {
                    length: _position[0] / 10,
                    width: _position[1] / 10,
                    aspect: _position[2],
                    direction: getDirection(_position[3], _position[4]),
                    offset: getLength(_position[3], _position[4]) / 10,
                    angle: _position[5] * DEGTORAD,
                    delay: _position[6],
                },
                properties: properties,
                lastShot: [0, 0.0],
                physics: /*isInert ? null :*/ [
                    0.0, // motion
                    0.0, // position
                    //!properties.waitToCycle - _position[6], // cycle
                    //properties.settings.recoil, // trueRecoil
                ],
                children: [],
            };
            if (!isInert) {
                gun.physics.push(!properties.waitToCycle - _position[6]);
                gun.physics.push(properties.settings.recoil);
            }
            return {
                mechanics: () => gun.mechanics,
                properties: () => gun.properties,
                lastShot: () => [...gun.lastShot],
                physics: () => gun.physics,
                children: () => gun.children,
                canShoot: () => isInert,
                getTracking: isInert ? () => {
                    return [0, 0];
                } : () => getTracking(gun),
                syncChildren: () => null,
                live: () => (isInert) ? live(gun, false) : live(gun, true),
            };
        };
    });

    // build some object identitifers
    const newIdentifiers = () => {
        let id = ++ENTITYID;
        _data.push([id, id]);
        const data = _data[_data.length - 1];
        const obj = {};
        //return {
        //getID: () => data[0],
        //getTeam: () => data[1],
        //setID: (id) => { data[0] = id; },
        //setTeam: (team) => { data[1] = team; },
        referenceProperty(obj, 'id', data, 0, entityData.photo, 'id', id),
            property(obj, 'team', data, 1, id);

        entityData.photo.id = data[0];
        //_set: ({id = data[0], team = data[0]}) => {
        //data[0] = id,
        //data[1] = team;
        //}
        return obj;
    }

    const newControl = () => {
        // target, goal, main, alt, and fire, power
        _data.push([[0, 0], [0, 0], false, false, false, 0]);
        const data = _data[_data.length - 1];
        const obj = {};
        obj.get = () => {
            return {
                target: data[0],
                goal: data[1],
                main: data[2],
                alt: data[3],
                fire: data[4],
                power: data[5]
            };
        },
            //getTarget: () => data[0],
            //setTarget: (target) => { data[0] = target; },
            arrayProperty(obj, 'target', data, 0, [0, 0]),
            //getGoal: () => data[1],
            //setGoal: (goal) => { data[1] = goal; },
            arrayProperty(obj, 'goal', data, 1, [0, 0]),
            //getKeys: () => data[2],
            //setKeys: (keys) => { data[2] = keys; },
            //getMain: () => data[3][0],
            //setMain: (main) => { data[3][0] = main; },
            //getAlt: () => data[3][1],
            //setAlt: (alt) => { data[3][1] = alt; },
            //getFire: () => data[3][2],
            //setFire: (fire) => { data[3][2] = fire; },
            property(obj, 'main', data, 2, false),
            property(obj, 'alt', data, 3, false),
            property(obj, 'fire', data, 4, false),
            property(obj, 'power', data, 5, 0);
        //getPower: () => data[4],
        //setPower: (power) => { data[4] = power; },
        //_set: ({target, goal, main, alt, fire, power}) => {
        // die
        //}
        return obj;
    }

    const newPhysics = () => {
        // position, velocity, acceleration, facing + vfacing, dampening, maxSpeed
        //const data = [[0, 0], [0, 0], [0, 0], 0, 0, 0.05, 0, [0, 0], 0];
        _data.push([[0, 0], [0, 0], [0, 0], 0, 0, 0.05, 0, [0, 0], 0, 0, 0]);
        const data = _data[_data.length - 1];
        const accelerate = (force, direction) => {
            data[2][0] += Math.cos(direction * DEGTORAD) * force,
                data[2][1] += Math.sin(direction * DEGTORAD) * force;
        }
        const shove = (x, y) => {
            data[1][0] += x,
                data[1][1] += y;
        }
        const obj = {};
        //move: () => null,
        //face: () => null,
        //getPosition: () => data[0],
        //setPosition: (position) => { data[0] = position; },
        //getVelocity: () => data[1],
        //setVelocity: (velocity) => { data[1] = velocity; },
        //getAcceleration: () => data[2],
        //setAcceleration: (acceleration) => { data[2] = acceleration; },
        //getFacings: () => data[3],
        //setFacings: (facings) => { data[3] = facings; },
        //getFacing: () => data[3][0],
        //setFacing: (facing) => { data[3][0] = facing; },
        //getvFacing: () => data[3][1],
        //setvFacing: (vfacing) => { data[3][1] = vfacing; },
        //getDamp: () => data[4],
        //setDamp: (damp) => { data[4] = damp; },
        //getMaxSpeed: () => data[5],
        //setMaxSpeed: (maxSpeed) => { data[5] = maxSpeed; },
        arrayReferenceProperty(obj, 'position', data, 0, entityData.photo, ['x', 'y'], [0, 0]),
            arrayReferenceProperty(obj, 'velocity', data, 1, entityData.photo, ['vx', 'vy'], [0, 0]),
            arrayProperty(obj, 'acceleration', data, 2, [0, 0]),
            referenceProperty(obj, 'facing', data, 3, entityData.photo, 'facing', 0),
            referenceProperty(obj, 'vfacing', data, 4, entityData.photo, 'vfacing', 0),
            referenceProperty(obj, 'damp', data, 5, entityData.photo, 'damp', 0.05),
            referenceProperty(obj, 'maxSpeed', data, 6, entityData.photo, 'maxSpeed', 0),
            arrayReferenceProperty(obj, 'camera', data, 7, entityData.photo, ['cx', 'cy'], [0, 0]);
        property(obj, 'step', data, 8, 0);
        //_set: ({position = data[0], velocity = data[1], acceleration = data[2], facing = data[3][0], vfacing = data[3][1], damp = data[4], maxSpeed = data[5]}) => {
        // advertising campaign
        //},
        obj.accelerate = (force, direction) => accelerate(force, direction),
            obj.shove = (x, y) => shove(x, y);
        return obj;
    }

    // controller format [acceptsFromTop, think]
    const newControllers = () => {
        _data.push([]);
        let controllers = _data[_data.length - 1];
        const addController = (controller) => {
            if (Array.isArray(controller)) {
                controllers = controller.concat(controllers);
            } else {
                controllers.unshift(controller);
            }
        }
        const removeController = (name) => {
            //controllers.remove(controller);
            controllers.remove(controllers.findIndex(e => e[0] === name));
        }
        const addPredefined = (predefined, player = null) => {
            controllers.unshift(getPredefinedController(predefined));
        }
        const obj = {};
        obj.addController = (controller) => addController(controller),
            obj.addPredefined = (predefined) => addPredefined(predefined),
            obj.removeController = (name) => removeController(name),
            obj.get = () => controllers,
            obj.set = (value) => controllers = value;
        return obj;
        //setControllers: (newControllers) => controllers = newControllers,
        //getControllers: () => controllers,
    }

    const newFamily = () => {
        // master, source, parent, children
        _data.push([null, null, null, []]);
        const data = _data[_data.length - 1];
        //const data = [null, null, null, []];
        const addChild = (child) => {
            data[3].push(child);
        }
        const removeChild = (child) => {
            //util.remove(data[3], data[3].indexOf(child));
            util.removeSequential(data[3], data[3].indexOf(child));
        }
        const obj = {};
        //setMaster: (master) => { data[0] = master; },
        //setSource: (source) => { data[1] = source; },
        //setParent: (parent) => { data[2] = parent; },
        //getMaster: () => data[0],
        //getSource: () => data[1],
        //getParent: () => data[2],
        //getChildren: () => data[3],
        //addChild: (child) => addChild(child),
        //removeChild: (child) => removeChild(child),
        arrProperty(obj, 'master', data, 0, null),
            arrProperty(obj, 'source', data, 1, null),
            arrProperty(obj, 'parent', data, 2, null),
            arrProperty(obj, 'children', data, 3, []),
            obj.addChild = (child) => addChild(child),
            obj.removeChild = (child) => removeChild(child);
        return obj;
        //_set: ({master = data[0], source = data[1], parent = data[2], children = data[3]}) => {
        //  data[0] = master,
        //  data[1] = source,
        //  data[2] = parent,
        //  data[3] = children;
        //}
    }

    const newBindings = () => {
        _data.push([null, {
            size: 0,
            angle: 0,
            direction: 0,
            offset: 0,
            arc: 0,
            layer: 0,
        }, [0, 0]]);
        const data = _data[_data.length - 1];
        const obj = {};
        //getBond: () => data[0],
        //getBound: () => data[1],
        //setBond: (bond) => { data[0] = bond; },
        //setBound: (bound) => {data[1] = bound; },
        arrProperty(obj, 'bond', data, 0, null),
            arrProperty(obj, 'bound', data, 1, null),
            arrProperty(obj, 'firingArc', data, 2, null),
            obj.defineFiringArc = () => data[2] = [0, 0],
            obj.defineBound =  () => data[1] = {
                size: 0,
                angle: 0,
                direction: 0,
                offset: 0,
                arc: 0,
                layer: 0,
            }
        return obj;
        //modifyBound: (name, value) => { data[1][name] = value; },
        //_set: ({bond = data[0], bound = data[1]}) => {
        //  data[0] = bond,
        //  data[1] = bound;
        //}
    }

    const getPredefinedMove = (predefined) => {

        let g = [0, 0],
            gactive = false,
            engine = [0, 0],
            a = 0;

        const reset = (setG = true) => {
            if (setG) {
                g = [
                    entityData.control.goal[0] - entityData.physics.position[0],
                    entityData.control.goal[1] - entityData.physics.position[1]
                ],
                    gactive = (g[0] !== 0 || g[1] !== 0);
            }
            engine = [
                0,
                0,
            ],
                a = entityData.attributes.acceleration / ROOMSPEED;
        }

        const apply = () => {
            entityData.physics.acceleration[0] += engine[0] * entityData.control.power;
            entityData.physics.acceleration[1] += engine[1] * entityData.control.power;
        }

        let move = () => null;

        switch (predefined) {
            case 'glide': {
                move = () => {
                    reset(false);
                    entityData.physics.maxSpeed = entityData.attributes.topSpeed;
                    entityData.physics.damp = 0.05;
                    apply();
                }
            } break;
            case 'motor': {
                move = () => {
                    reset(true);
                    entityData.physics.maxSpeed = 0;
                    if (entityData.attributes.topSpeed) {
                        entityData.physics.damp = a / entityData.attributes.topSpeed;
                    }
                    if (gactive) {
                        let len = getLength(g[0], g[1]);
                        engine = [
                            a * g[0] / len,
                            a * g[1] / len
                        ];
                    }
                    apply();
                }
            } break;
            case 'swarm': {
                move = () => {
                    reset();
                    entityData.physics.maxSpeed = entityData.attributes.topSpeed;
                    let l = util.getDistance([0, 0], g) + 1;
                    if (gactive && l > entityData.size()) {
                        let desiredxspeed = entityData.attributes.topSpeed * g[0] / l,
                            desiredyspeed = entityData.attributes.topSpeed * g[1] / l,
                            turning = Math.sqrt((entityData.attributes.topSpeed * Math.max(1, entityData.attributes.range) + 1) / a);
                        engine = [
                            (desiredxspeed - entityData.physics.velocity[0]) / Math.max(5, turning),
                            (desiredyspeed - entityData.physics.velocity[1]) / Math.max(5, turning)
                        ];
                    } else {
                        if (getLength(entityData.physics.velocity[0], entityData.physics.velocity[1]) < entityData.attributes.topSpeed) {
                            engine = [
                                entityData.physics.velocity[0] * a / 20,
                                entityData.physics.velocity[1] * a / 20
                            ];
                        }
                    }
                    apply();
                }
            } break;
            case 'chase': {
                move = () => {
                    reset();
                    if (gactive) {
                        let l = util.getDistance([0, 0], g);
                        if (l > entityData.size() * 2) {
                            entityData.physics.maxSpeed = entityData.attributes.topSpeed;
                            let desiredxspeed = entityData.attributes.topSpeed * g[0] / l,
                                desiredyspeed = entityData.attributes.topSpeed * g[1] / l;
                            engine = [
                                (desiredxspeed - entityData.physics.velocity[0]) * a,
                                (desiredyspeed - entityData.physics.velocity[1]) * a
                            ];
                        } else {
                            entityData.physics.maxSpeed = 0;
                        }
                    } else {
                        entityData.physics.maxSpeed = 0;
                    }
                    apply();
                }
            } break;
            case 'drift': {
                move = () => {
                    reset();
                    entityData.physics.maxSpeed = 0;
                    engine = [
                        g[0] * a,
                        g[1] * a
                    ];
                    apply();
                }
            } break;
            case 'bound': {
                move = () => {
                    reset(false);
                    let ref = entityData.bindings.bond;
                    entityData.physics.position[0] = (ref.physics.position[0] + ref.size() * entityData.bindings.bound.offset * Math.cos(entityData.bindings.bound.direction + entityData.bindings.bound.angle + ref.physics.facing));
                    entityData.physics.position[1] = (ref.physics.position[1] + ref.size() * entityData.bindings.bound.offset * Math.sin(entityData.bindings.bound.direction + entityData.bindings.bound.angle + ref.physics.facing));
                    ref.physics.velocity[0] += entityData.bindings.bound.size * entityData.physics.acceleration[0];
                    ref.physics.velocity[1] += entityData.bindings.bound.size * entityData.physics.acceleration[1];
                    entityData.bindings.firingArc[0] = ref.physics.facing + entityData.bindings.bound.angle; entityData.bindings.firingArc[1] = entityData.bindings.bound.arc / 2;
                    entityData.physics.acceleration[0] = 0; entityData.physics.acceleration[1] = 0;
                    entityData.blend = ref.blend;
                    apply();
                }
            } break;
            default : {
                console.log('Unknown move');
                // unknown move
            } break;
        }
        return move;

    }

    const getPredefinedFace = (predefined) =>  {
        const TAU = 2 * Math.PI;
        let t = [0, 0],
            tactive = false,
            oldFacing = 0;
        let face = () => null;
        const reset = () => {
            t = [entityData.control.target[0], entityData.control.target[1]],
                tactive = (t[0] !== 0 || t[1] !== 0),
                oldFacing = entityData.physics.facing;
        }
        const apply = () => {
            entityData.physics.facing = (entityData.physics.facing % TAU + TAU) % TAU;
            entityData.physics.vfacing = util.angleDifference(oldFacing, entityData.physics.facing) * ROOMSPEED;
        }

        switch (predefined) {
            case 'autospin': {
                face = () => {
                    reset();
                    entityData.physics.facing += 0.02 / ROOMSPEED;
                    apply();
                }
            } break;
            case 'fastspin': {
                face = () => {
                    reset();
                    entityData.physics.facing += 0.1 / ROOMSPEED;
                    apply();
                }
            } break;
            case 'turnWithSpeed': {
                face = () => {
                    reset();
                    entityData.physics.facing += getLength(entityData.physics.velocity[0], entityData.physics.velocity[1]) / 90 * Math.PI / ROOMSPEED;
                    apply();
                }
            } break;
            case 'withMotion': {
                face = () => {
                    reset();
                    entityData.physics.facing = getDirection(entityData.physics.velocity[0], entityData.physics.velocity[1]);
                    apply();
                }
            } break;
            case 'smoothWithMotion':
            case 'looseWithMotion': {
                face = () => {
                    reset();
                    entityData.physics.facing += util.loopSmooth(entityData.physics.facing, getDirection(entityData.physics.velocity[0], entityData.physics.velocity[1]), 4 / ROOMSPEED);
                    apply();
                }
            } break;
            case 'withTarget':
            case 'toTarget': {
                face = () => {
                    reset();
                    entityData.physics.facing = Math.atan2(t[1], t[0]);
                    apply();
                }
            } break;
            case 'locksFacing': {
                face = () => {
                    reset();
                    if (!entityData.control.alt) {
                        entityData.physics.facing = Math.atan2(t[1], t[0]);
                    }
                    apply();
                }
            } break;
            case 'looseWithTarget':
            case 'looseToTarget':
            case 'smoothToTarget': {
                face = () => {
                    reset();
                    entityData.physics.facing += util.loopSmooth(entityData.physics.facing, Math.atan2(t[1], t[0]), 4 / ROOMSPEED);
                    apply();
                }
            } break;
            case 'bound': {
                face = () => {
                    reset();
                    let givenangle;
                    if (entityData.control.main) {
                        givenangle = Math.atan2(t[1], t[0]);
                        let diff = util.angleDifference(givenangle, entityData.bindings.firingArc[0]);
                        if (Math.abs(diff) >= entityData.bindings.firingArc[1]) {
                            givenangle = entityData.bindings.firingArc[0];
                        }
                    } else {
                        givenangle = entityData.bindings.firingArc[0];
                    }
                    entityData.physics.facing += util.loopSmooth(entityData.physics.facing, givenangle, 4 / ROOMSPEED);
                    apply();
                }
            } break;
            default: {
                // unknown face
            } break;
        }
        return face;

    }

    // The attributes object
    /*const Attributes = () => {
        //const obj
        return {
            physical: {
                acceleration: 0,
                topSpeed: 0,
                penetration: 0,
                damage: 0,
                fov: 0,
                density: 0,
                stealth: 0,
                pushability: 0,
                range: 0,
            },
            settings: {
                drawHealth: entityData.attributes.settings.drawHealth,
                drawShape: entityData.attributes.settings.drawShape,
                damageEffects: entityData.attributes.settings.damageEffects,
                ratioEffects: entityData.attributes.settings.ratioEffects,
                motionEffects: entityData.attributes.settings.motionEffects,
                acceptsScore: entityData.attributes.settings.acceptsScore,
                givesKillMessage: entityData.attributes.settings.givesKillMessage,
                canGoOutsideRoom: entityData.attributes.settings.canGoOutsideRoom,
                hitsOwnType: entityData.attributes.settings.hitsOwnType,
                diesAtLowSpeed: entityData.attributes.settings.diesAtLowSpeed,
                diesAtRange: entityData.attributes.settings.diesAtRange,
                independent: entityData.attributes.settings.independent,
                persistsAfterDeath: entityData.attributes.settings.persistsAfterDeath,
                clearOnMasterUpgrade: entityData.attributes.settings.clearOnMasterUpgrade,
                healthWithLevel: entityData.attributes.settings.health,
                isObstacle: entityData.attributes.settings.isObstacle,
                isNecromancer: entityData.attributes.settings.isNecromancer,
                hasNoRecoil: entityData.attributes.settings.hasNoRecoil,
                cravesAttention: entityData.attributes.settings.cravesAttention,
                buffVsFood: entityData.attributes.settings.buffVsFood,
                leaderboardable: entityData.attributes.settings.leaderboardable,
                reloadToAcceleration: entityData.attributes.settings.reloadToAcceleration,
                variesInSize: entityData.attributes.settings.variesInSize,
                isFood: entityData.attributes.settings.isFood,
                isIntangable: entityData.attributes.settings.isIntangable,
            },
            body: {
                acceleration: entityData.attributes.acceleration,
                speed: entityData.attributes.speed,
                health: entityData.attributes.health,
                resist: entityData.attributes.resist,
                shield: entityData.attributes.shield,
                regen: entityData.attributes.regen,
                damage: entityData.attributes.damage,
                penetration: entityData.attributes.penetration,
                fov: entityData.attributes.fov,
                range: entityData.attributes.range,
                density: entityData.attributes.density,
                stealth: entityData.attributes.stealth,
                pushability: entityData.attributes.pushability,
                heteroMultiplier: entityData.attributes.heteroMultiplier,
            },
            aiSettings: {
                farm: entityData.attributes.aiSettings.farm,
                blind: entityData.attributes.aiSettings.blind,
                chase: entityData.attributes.aiSettings.chase,
                skynet: entityData.attributes.aiSettings.skynet,
                view360: entityData.attributes.aiSettings.view360,
                reverseDirection: entityData.attributes.aiSettings.reverseDirection,
                shapefriend: entityData.attributes.aiSettings.shapefriend,
            },
            index: entityData.attributes.index,
            mockup: entityData.attributes.mockup,
            label: entityData.attributes.label,
            type: entityData.attributes.type,
            shape: entityData.attributes.shape,
            color: entityData.attributes.color,
            size: entityData.attributes.size,
            coreSize: entityData.attributes.coreSize,
            motionType: entityData.attributes.motionType,
            facingType: entityData.attributes.facingType,
            damageClass: 0,
            skillNames: entityData.attributes.skillNames,
            dangerValue: 1,
            squiggle: entityData.attributes.squiggle,
            upgrades: entityData.attributes.upgrades,
            maxChildren: entityData.attributes.maxChildren,
            creationMessage: '',
            controllers: entityData.attributes.controllers,
        }
    };*/


    const newAttributes = (() => {
        _data.push([0, '', '', '', 0, 0, '', '', 0, 0, 0, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, 0, [], 0, 0, [], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 0, 0, false, 0]);
        const data = _data[_data.length - 1];
        const obj = {};
        referenceProperty(obj, 'index', data, 0, entityData.photo, 'index', 0),
            referenceProperty(obj, 'name', data, 1, entityData.photo, 'name', ''),
            property(obj, 'label', data, 2, ''),
            property(obj, 'type', data, 3, 'unknown'),
            property(obj, 'shape', data, 4, 0),
            property(obj, 'color', data, 5, 0),
            property(obj, 'facingType', data, 6, ''),
            property(obj, 'motionType', data, 7, ''),
            property(obj, 'damageClass', data, 8, 0),
            property(obj, 'skillNames', data, 9, 0),
            property(obj, 'dangerValue', data, 10, 0),
            obj.settings = {},
            property(obj.settings, 'drawHealth', data, 11, false),
            property(obj.settings, 'drawShape', data, 12, false),
            property(obj.settings, 'damageEffects', data, 13, false),
            property(obj.settings, 'ratioEffects', data, 14, false),
            property(obj.settings, 'acceptsScore', data, 15, false),
            property(obj.settings, 'givesKillMessage', data, 16, false),
            property(obj.settings, 'canGoOutsideRoom', data, 17, false),
            property(obj.settings, 'hitsOwnType', data, 18, false),
            property(obj.settings, 'diesAtLowSpeed', data, 19, false),
            property(obj.settings, 'diesAtRange', data, 20, false),
            property(obj.settings, 'independent', data, 21, false),
            property(obj.settings, 'persistsAfterDeath', data, 22, false),
            property(obj.settings, 'clearOnMasterUpgrade', data, 23, false),
            property(obj.settings, 'health', data, 24, false),
            property(obj.settings, 'isObstacle', data, 25, false),
            property(obj.settings, 'isNecromancer', data, 26, false),
            property(obj.settings, 'hasNoRecoil', data, 27, false),
            property(obj.settings, 'cravesAttention', data, 28, false),
            property(obj.settings, 'buffVsFood', data, 29, false),
            property(obj.settings, 'leaderboardable', data, 30, false),
            property(obj.settings, 'reloadToAcceleration', data, 31, false),
            property(obj.settings, 'isIntangable', data, 32, false),
            property(obj.settings, 'variesInSize', data, 33, false),
            obj.aiSettings = {},
            property(obj.aiSettings, 'chase', data, 34, false),
            property(obj.aiSettings, 'skynet', data, 35, false),
            property(obj.aiSettings, 'blind', data, 36, false),
            property(obj.aiSettings, 'farm', data, 37, false),
            property(obj.aiSettings, 'view360', data, 38, false),
            property(obj.aiSettings, 'reverseDirection', data, 39, false),
            property(obj.aiSettings, 'shapeFriend', data, 40, false),
            property(obj, 'squiggle', data, 41, 0),
            //arrayProperty(obj, 'upgrades', data, 42, []),
            functionResetReferenceProperty(obj, 'size', data, 43, entityData.photo, ['size', 'rsize'], [entityData.size, entityData.realSize], 1),
            functionResetReferenceProperty(obj, 'coreSize', data, 44, entityData.photo, ['size', 'rsize'], [entityData.size, entityData.realSize], null),
            arrayProperty(obj, 'abilities', data, 45, []),
            property(obj, 'maxChildren', data, 46, 0),
            property(obj, 'acceleration_Base', data, 47, 0),
            property(obj, 'acceleration', data, 48, 0),
            property(obj, 'speed_Base', data, 49, 0),
            property(obj, 'topSpeed', data, 50, 0),
            property(obj, 'health_Base', data, 51, 0),
            property(obj, 'resist_Base', data, 52, 0),
            property(obj, 'shield_Base', data, 53, 0),
            property(obj, 'regen_Base', data, 54, 0),
            property(obj, 'damage_Base', data, 55, 0),
            property(obj, 'damage', data, 56, 0),
            property(obj, 'penetration_Base', data, 57, 0),
            property(obj, 'penetration', data, 58, 0),
            property(obj, 'fov_Base', data, 59, 0),
            property(obj, 'fov', data, 60, 0),
            property(obj, 'range_Base', data, 61, 0),
            property(obj, 'range', data, 62, 0),
            property(obj, 'shock_absorb_Base', data, 63, 0),
            property(obj, 'shock_absorb', data, 64, 0),
            property(obj, 'density_Base', data, 65, 0),
            property(obj, 'density', data, 66, 0),
            property(obj, 'stealth_Base', data, 67, 0),
            property(obj, 'stealth', data, 68, 0),
            property(obj, 'pushability_Base', data, 69, 0),
            property(obj, 'pushability', data, 70, 0),
            property(obj, 'heteroMultiplier_Base', data, 71, 0),
            property(obj, 'heteroMultiplier', data, 72, 0),
            property(obj, 'lifetime', data, 73),
            property(obj, 'creationMessage', data, 74),
            obj.food = {},
            property(obj.food, 'level', data, 75),
            property(obj.food, 'countup', data, 76),
            property(obj.food, 'shiny', data, 77),
            property(obj, 'damageType', data, 78),
            obj.upgradesLoadup = (upgrades) => {
                arrayProperty(obj, 'upgrades', data, 42, upgrades);
            };
        return obj;
    });
    // A definer
    const define = (() => {
        const check = (val) => {
            return (val != null);
        };

        const loadin = (object, val, name) => {
            if (check(val)) {
                object[name] = val;
            }
        }

        return (def) => {
            const obj = entityData.attributes;
            //let def = Class.basic;
            if (def.PARENT != null) {
                for (let i = 0; i < def.PARENT.length; i++) {
                    define(def.PARENT[i]);
                }
            }

            //if (check(def.index)) obj.index.set(def.index);// = def.index; //else obj.index = null;
            //if (check(def.NAME)) obj.name = def.NAME; //else obj.name = '';
            //if (check(def.LABEL)) obj.label = def.LABEL; //else obj.label = 'Unknown Tank';
            //if (check(def.TYPE)) obj.type = def.TYPE; //else obj.type = 'unknown';
            //if (check(def.SHAPE)) {
            //  obj.shape = typeof def.SHAPE === 'number' ? def.SHAPE : 0; //else obj.shape = 0;
            //  obj.shapeData = def.SHAPE;
            //}
            if (check(def.COLOR)) {
                entityData.color = def.COLOR;
            }
            entityData.defined.push(def.index);
            loadin(obj, def.index, 'index'),
                loadin(obj, def.NAME, 'name'),
                loadin(obj, def.LABEL, 'label'),
                loadin(obj, def.TYPE, 'type'),
                loadin(obj, ((typeof def.SHAPE === 'number') ? def.SHAPE : 0), 'shape');
            if (check(def.SHAPE)) {
                entityData.shape = def.SHAPE;
            }
            if (check(def.CONTROLLERS)) {
                //def.CONTROLLERS.forEach((ioName) => {
                //    entityData.controllers.addPredefined(ioName);
                //});
                let newControllers = [];
                for (let i = 0; i < def.CONTROLLERS.length; i++) {
                    let controller = def.CONTROLLERS[i];
                    if (typeof controller === 'string') {
                        newControllers.push(getPredefinedController(controller));
                    } else {
                        newControllers.push(controller);
                    }
                }
                entityData.controllers.addController(newControllers);
            }
            if (check(def.MOTION_TYPE)) {
                obj.motionType = def.MOTION_TYPE;
                if (typeof obj.motionType === 'string') {
                    entityData.move = getPredefinedMove(obj.motionType);
                } else if (typeof obj.motionType === 'function') {
                    entityData.move = obj.motionType;
                }
            }
            if (check(def.FACING_TYPE)) {
                obj.facingType = def.FACING_TYPE;
                if (typeof obj.facingType === 'string') {
                    entityData.face = getPredefinedFace(obj.facingType);
                } else if (typeof obj.facingType === 'function') {
                    entityData.face = obj.facingType;
                }
            }
            loadin(obj, def.BROADCAST_MESSAGE, 'creationMessage'),
                loadin(obj, def.DAMAGE_CLASS, 'damageClass'),
                loadin(obj, def.DAMAGE_TYPE, 'damageType'),
                loadin(obj, def.STAT_NAMES, 'skillNames'),
                loadin(obj, def.DANGER, 'dangerValue');

            // Settings
            /*
            if (check(def.DRAW_HEALTH)) obj.settings.drawHealth = def.DRAW_HEALTH;
            if (check(def.DRAW_SELF)) obj.settings.drawShape = def.DRAW_SELF;
            if (check(def.DAMAGE_EFFECTS)) obj.settings.damageEffects = def.DAMAGE_EFFECTS;
            if (check(def.RATIO_EFFECTS)) obj.settings.ratioEffects = def.RATIO_EFFECTS;
            if (check(def.MOTION_EFFECTS)) obj.settings.motionEffects = def.MOTION_EFFECTS;
            if (check(def.ACCEPTS_SCORE)) obj.settings.acceptsScore = def.ACCEPTS_SCORE;
            if (check(def.GIVE_KILL_MESSAGE)) obj.settings.givesKillMessage = def.GIVE_KILL_MESSAGE;
            if (check(def.CAN_GO_OUTSIDE_ROOM)) obj.settings.canGoOutsideRoom = def.CAN_GO_OUTSIDE_ROOM;
            if (check(def.HITS_OWN_TYPE)) obj.settings.hitsOwnType = def.HITS_OWN_TYPE;
            if (check(def.DIE_AT_LOW_SPEED)) obj.settings.diesAtLowSpeed = def.DIE_AT_LOW_SPEED;
            if (check(def.DIE_AT_RANGE)) obj.settings.diesAtRange = def.DIE_AT_RANGE;
            if (check(def.INDEPENDENT)) obj.settings.independent = def.INDEPENDENT;
            if (check(def.PERSISTS_AFTER_DEATH)) obj.settings.persistsAfterDeath = def.PERSISTS_AFTER_DEATH;
            if (check(def.CLEAR_ON_MASTER_UPGRADE)) obj.settings.clearOnMasterUpgrade = def.CLEAR_ON_MASTER_UPGRADE;
            if (check(def.HEALTH_WITH_LEVEL)) obj.settings.health = def.HEALTH_WITH_LEVEL;
            if (check(def.OBSTACLE)) obj.settings.isObstacle = def.OBSTACLE;
            if (check(def.NECRO)) obj.settings.isNecromancer = def.NECRO;
            if (check(def.HAS_NO_RECOIL)) obj.settings.hasNoRecoil = def.HAS_NO_RECOIL;
            if (check(def.CRAVES_ATTENTION)) obj.settings.cravesAttention = def.CRAVES_ATTENTION;
            if (check(def.BUFF_VS_FOOD)) obj.settings.buffVsFood = def.BUFF_VS_FOOD;
            if (check(def.CAN_BE_ON_LEADERBOARD)) obj.settings.leaderboardable = def.CAN_BE_ON_LEADERBOARD;
            if (check(def.IS_SMASHER)) obj.settings.reloadToAcceleration = def.IS_SMASHER;
            if (check(def.INTANGIBLE)) obj.settings.isIntangable = def.INTANGIBLE;
            if (check(def.VARIES_IN_SIZE)) obj.settings.variesInSize = def.VARIES_IN_SIZE;
            */
            loadin(obj.settings, def.DRAW_HEALTH, 'drawHealth'),
                loadin(obj.settings, def.DRAW_SELF, 'drawShape'),
                loadin(obj.settings, def.DAMAGE_EFFECTS, 'damageEffects'),
                loadin(obj.settings, def.RATIO_EFFECTS, 'ratioEffect'),
                loadin(obj.settings, def.ACCEPTS_SCORE, 'acceptsScore'),
                loadin(obj.settings, def.GIVE_KILL_MESSAGE, 'givesKillMessage'),
                loadin(obj.settings, def.CAN_GO_OUTSIDE_ROOM, 'canGoOutsideRoom'),
                loadin(obj.settings, def.HITS_OWN_TYPE, 'hitsOwnType'),
                loadin(obj.settings, def.DIE_AT_LOW_SPEED, 'diesAtLowSpeed'),
                loadin(obj.settings, def.DIE_AT_RANGE, 'diesAtRange'),
                loadin(obj.settings, def.INDEPENDENT, 'independent'),
                loadin(obj.settings, def.PERSISTS_AFTER_DEATH, 'persistsAfterDeath'),
                loadin(obj.settings, def.CLEAR_ON_MASTER_UPGRADE, 'clearOnMasterUpgrade'),
                loadin(obj.settings, def.HEALTH_WITH_LEVEL, 'health'),
                loadin(obj.settings, def.OBSTACLE, 'isObstacle'),
                loadin(obj.settings, def.NECRO, 'isNecromancer'),
                loadin(obj.settings, def.HAS_NO_RECOIL, 'hasNoRecoil'),
                loadin(obj.settings, def.CRAVES_ATTENTION, 'cravesAttention'),
                loadin(obj.settings, def.BUFF_VS_FOOD, 'buffVsFood'),
                loadin(obj.settings, def.CAN_BE_ON_LEADERBOARD, 'leaderboardable'),
                loadin(obj.settings, def.IS_SMASHER, 'reloadToAcceleration'),
                loadin(obj.settings, def.INTANGIBLE, 'isIntangable'),
                loadin(obj.settings, def.VARIES_IN_SIZE, 'variesInSize');
            // AI settings
            if (check(def.AI)) {
                //if (check(def.AI.NO_LEAD)) obj.aiSettings.chase = def.AI.NO_LEAD;
                //if (check(def.AI.SKYNET)) obj.aiSettings.skynet = def.AI.SKYNET;
                //if (check(def.AI.BLIND)) obj.aiSettings.blind = def.AI.BLIND;
                //if (check(def.AI.FARMER)) obj.aiSettings.farm = def.AI.FARMER;
                //if (check(def.AI.FULL_VIEW)) obj.aiSettings.view360 = def.AI.FULL_VIEW;
                //if (check(def.AI.STRAFE)) obj.aiSettings.reverseDirection = def.AI.STRAFE;
                //if (check(def.AI.LIKES_SHAPES)) obj.aiSettings.shapefriend = def.AI.LIKES_SHAPES;
                loadin(obj.aiSettings, def.AI.NO_LEAD, 'chase'),
                    loadin(obj.aiSettings, def.AI.SKYNET, 'skynet'),
                    loadin(obj.aiSettings, def.AI.BLIND, 'blind'),
                    loadin(obj.aiSettings, def.AI.FARMER, 'farm'),
                    loadin(obj.aiSettings, def.AI.FULL_VIEW, 'view360'),
                    loadin(obj.aiSettings, def.AI.STRAFE, 'reverseDirection'),
                    loadin(obj.aiSettings, def.AI.LIKES_SHAPES, 'shapeFriend');
            }
            // Squiggle
            obj.squiggle = (obj.settings.variesInSize) ? ran.randomRange(0.8, 1.2) : 1;
            // Upgrades stuff
            if (def.RESET_UPGRADES) obj.upgradesLoadup([]);
            /*
            if (check(def.UPGRADES_TIER_1))
                def.UPGRADES_TIER_1.forEach(e => {
                    obj.upgrades.push({ class: e, level: c.TIER_1, index: e.index,});
                });
            if (check(def.UPGRADES_TIER_2))
                def.UPGRADES_TIER_2.forEach(e => {
                    obj.upgrades.push({ class: e, level: c.TIER_2, index: e.index,});
                });
            if (check(def.UPGRADES_TIER_3))
                def.UPGRADES_TIER_3.forEach(e => {
                    obj.upgrades.push({ class: e, level: c.TIER_3, index: e.index,});
                });
            */
            let keys = Object.keys(def);
            let upgradeArrays = [];
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].startsWith('UPGRADES_')) {
                    let points = keys[i].split('_'),
                        level = c[points[1] + '_' + points[2]],
                        tier = parseInt(points[2]),
                        arr = def[keys[i]],
                        upgradeArray = [level, tier, arr];
                    upgradeArrays.push(upgradeArray);
                    //upgradeArrays.push([]);
                    //for (let j = 0; j < arr.length; j++) {
                    //  upgradeArrays[i].push(arr[j]);
                    //  upgradeArrays[i].push(level);
                    //}
                }
            }

            upgradeArrays.sort();

            const upgrades = [];
            for (let i = 0; i < upgradeArrays.length; i++) {
                let level = upgradeArrays[i][0];
                let tier = upgradeArrays[i][1];
                for (let e of upgradeArrays[i][2]) {
                    upgrades.push({ class: e, tier: tier, level: level, index: e.index });
                }
                //for (let j = 0; j < upgradeArrays[i].length; j) {
                //  let e = upgradeArrays[i][j];
                //  obj.upgrades.push({ class: e, level: level, index: e.index });
                //}
            }
            obj.upgradesLoadup(upgrades);
            //loadin(obj, upgrades, 'upgrades');

            //if (def.SIZE != null) {
            //    obj.size = def.SIZE * obj.squiggle;
            //    if (obj.coreSize == null || obj.coreSize == undefined) { obj.coreSize = obj.SIZE; }
            //}
            if (def.SIZE != null) {
                obj.size = def.SIZE * obj.squiggle;
                if (obj.coreSize == null) { obj.coreSize = obj.size; }
            }

            //if (def.ALT_ABILITIES != null) {
            //    obj.abilities = def.ALT_ABILITIES;
            //}
            loadin(obj, def.ALT_ABILITIES, 'abilities');

            //if (def.MAX_CHILDREN != null) {
            //    obj.maxChildren = def.MAX_CHILDREN;
            //}
            loadin(obj, def.MAX_CHILDREN, 'maxChildren');
            //if (def.FOOD != null) {
            ////    if (def.FOOD.LEVEL != null) {
            //        this.foodLevel = def.FOOD.LEVEL;
            //        this.foodCountup = 0;
            //    }
            //}
            if (def.BODY != null) {
                /*
                if (def.BODY.ACCELERATION != null) {
                    obj.acceleration_Base = def.BODY.ACCELERATION;
                    obj.acceleration = obj.acceleration_Base;
                }
                if (def.BODY.SPEED != null) {
                    obj.speed_Base = def.BODY.SPEED;
                    obj.topSpeed = obj.speed_Base;
                }
                if (def.BODY.HEALTH != null) {
                    obj.health_Base = def.BODY.HEALTH;
                }
                if (def.BODY.RESIST != null) {
                    obj.resist_Base = def.BODY.RESIST;
                    //obj.resist = obj.resist_Base;
                }
                if (def.BODY.SHIELD != null) {
                    obj.shield_Base = def.BODY.SHIELD;
                    //obj.shield = obj.shield_Base;
                }
                if (def.BODY.REGEN != null) {
                    obj.regen_Base = def.BODY.REGEN;
                    //obj.regen = obj.regen_Base;
                }
                if (def.BODY.DAMAGE != null) {
                    obj.damage_Base = def.BODY.DAMAGE;
                    obj.damage = obj.damage_Base;
                }
                if (def.BODY.PENETRATION != null) {
                    obj.penetration_Base = def.BODY.PENETRATION;
                    obj.penetration = obj.penetration_Base;
                }
                if (def.BODY.FOV != null) {
                    obj.fov_Base = def.BODY.FOV;
                    obj.fov = obj.fov_Base;
                }
                if (def.BODY.RANGE != null) {
                    obj.range_Base = def.BODY.RANGE;
                    obj.range = obj.range_Base;
                }
                if (def.BODY.SHOCK_ABSORB != null) {
                    obj.shock_absorb_Base = def.BODY.SHOCK_ABSORB;
                    obj.shock_absorb = obj.shock_Base;
                }
                if (def.BODY.DENSITY != null) {
                    obj.density_Base = def.BODY.DENSITY;
                    obj.density = obj.density_Base;
                }
                if (def.BODY.STEALTH != null) {
                    obj.stealth_Base = def.BODY.STEALTH;
                    obj.stealth = obj.stealth_Base;
                }
                if (def.BODY.PUSHABILITY != null) {
                    obj.pushability_Base = def.BODY.PUSHABILITY;
                    obj.pushability = obj.pushability_Base;
                }
                if (def.BODY.HETERO != null) {
                    obj.heteroMultiplier_Base = def.BODY.HETERO;
                    obj.heteroMultiplier = obj.heteroMultiplier_Base;
                }
                */
                loadin(obj, def.BODY.ACCELERATION, 'acceleration_Base'),
                    loadin(obj, def.BODY.ACCELERATION, 'acceleration'),
                    loadin(obj, def.BODY.SPEED, 'speed_Base'),
                    loadin(obj, def.BODY.SPEED, 'topSpeed'),
                    loadin(obj, def.BODY.HEALTH, 'health_Base'),
                    loadin(obj, def.BODY.RESIST, 'resist_Base'),
                    loadin(obj, def.BODY.SHIELD, 'shield_Base'),
                    loadin(obj, def.BODY.REGEN, 'regen_Base'),
                    loadin(obj, def.BODY.DAMAGE, 'damage_Base'),
                    loadin(obj, def.BODY.DAMAGE, 'damage'),
                    loadin(obj, def.BODY.PENETRATION, 'penetration_Base'),
                    loadin(obj, def.BODY.PENETRATION, 'penetration'),
                    loadin(obj, def.BODY.FOV, 'fov_Base'),
                    loadin(obj, def.BODY.FOV, 'fov'),
                    loadin(obj, def.BODY.RANGE, 'range_Base'),
                    loadin(obj, def.BODY.RANGE, 'range'),
                    loadin(obj, def.BODY.SHOCK_ABSORB, 'shock_absorb_Base'),
                    loadin(obj, def.BODY.SHOCK_ABSORB, 'shock_absorb'),
                    loadin(obj, def.BODY.DENSITY, 'density_Base'),
                    loadin(obj, def.BODY.DENSITY, 'density'),
                    loadin(obj, def.BODY.STEALTH, 'stealth_Base'),
                    loadin(obj, def.BODY.STEALTH, 'stealth'),
                    loadin(obj, def.BODY.PUSHABILITY, 'pushability_Base'),
                    loadin(obj, def.BODY.PUSHABILITY, 'pushability'),
                    loadin(obj, def.BODY.HETERO, 'heteroMultiplier_Base'),
                    loadin(obj, def.BODY.HETERO, 'heteroMultiplier');
                EntityFunctions.refresh(entityData);
            }

            if (def.GUNS != null) {
                let newGuns = [];
                //def.GUNS.forEach((gundef) => {
                //newGuns.push(new Gun(this, gundef));
                //});
                //const oldLength = entityData.guns.length;
                for (let i = 0; i < def.GUNS.length; i++) {
                    let gundef = def.GUNS[i];
                    newGuns.push(newGun()(entityData, gundef));
                }
                //entityData.guns = newGuns;
                /*
                if (oldLength !== entityData.guns.length) {
                  const gunsIndex = entityData.flattenedPhotoGuns[0];
                  entityData.flattenedPhoto[gunsIndex] = entityData.guns.length;
                  if (oldLength < entityData.guns.length) {
                    for (let i = 0; i < entityData.guns.length - oldLength; i++) {
                      entityData.flattenedPhotoGuns[1] += 2;
                      for (let i = 0; i < 2; i++) {
                        entityData.flattenedPhoto.splice(gunsIndex + 1, 0, 0);
                      }
                      entityData.flattenedPhotoTurrets[0] += 2;
                    }
                  } else if (oldLength > entityData.guns.length) {
                    for (let i = 0; i < oldLength - entityData.guns.length; i++) {
                      entityData.flattenedPhoto.splice(gunsIndex + 1, 2);
                      entityData.flattenedPhotoGuns[1] -= 2;
                      entityData.flattenedPhotoTurrets[0] -= 2;
                    }
                  }
                }
                */
                entityData.flattenedPhoto.splice(entityData.flattenedPhotoGuns[0] + 1, entityData.flattenedPhotoGuns[1]);
                entityData.flattenedPhoto[entityData.flattenedPhotoGuns[0]] = newGuns.length;
                entityData.flattenedPhotoGuns[1] = 0;

                for (let i = 0; i < newGuns.length; i++) {
                    for (let j = 0; j < 2; j++) {
                        entityData.flattenedPhoto.splice(entityData.flattenedPhotoGuns[0] + 1, 0, 0);
                    }
                    entityData.flattenedPhotoGuns[1] += 2;
                }
                entityData.flattenedPhotoTurrets[0] = entityData.flattenedPhotoGuns[0] + entityData.flattenedPhotoGuns[1] + 1;
                entityData.guns = newGuns;
            }

            if (def.TURRETS != null) {
                for (let i = 0; i < entityData.turrets.length; i++) {
                    EntityFunctions.destroy(entityData.turrets[i]);
                }

                entityData.turrets = [];
                for (let i = 0; i < def.TURRETS.length; i++) {
                    let tur = def.TURRETS[i];
                    let o = entity(entityData.physics.position[0], entityData.physics.position[1], entityData);
                    if (Array.isArray(tur.TYPE)) {
                        for (let j = 0; j < tur.TYPE.length; j++) {
                            o.define(tur.TYPE[j]);
                        }
                    } else {
                        o.define(tur.TYPE);
                    }
                    EntityFunctions.bind(o, tur.POSITION, entityData);
                }

                entityData.flattenedPhoto.splice(entityData.flattenedPhotoTurrets[0] + 1);
                entityData.flattenedPhoto[entityData.flattenedPhotoTurrets[0]] = entityData.turrets.length;
                entityData.flattenedPhotoTurrets[1] = 0;
                if (entityData.turrets.length > 0) {
                    for (let i = 0; i < entityData.turrets.length; i++) {
                        for (let j = 0; j < entityData.turrets[i].flattenedPhoto.length; j++) {
                            entityData.flattenedPhoto.push(0);
                            entityData.flattenedPhotoTurrets[1] += 1;
                        }
                    }
                }

                /*
              const turretsIndex = entityData.flattenedPhotoTurrets[0];
              entityData.flattenedPhoto.splice(turretsIndex + 1);
              entityData.flattenedPhoto[turretsIndex] = entityData.turrets.length;
              entityData.flattenedPhotoTurrets[1] = 0;
              for (let i = 0; i < entityData.turrets.length; i++) {
                for (let j = 0; j < entityData.turrets[i].flattenedPhoto.length; j++) {
                  entityData.flattenedPhoto.push(entityData.turrets[i].flattenedPhoto[j]);
                  entityData.flattenedPhotoTurrets[1]++;
                }
              }
              */

                /*
              for (let i = 0; i < entityData.turrets.length; i++) {
                EntityFunctions.destroy(entityData.turrets[i]);
              }
              entityData.turrets = [];
              for (let i = 0; i < def.TURRETS.length; i++) {
                let o = entity(entityData.physics.position.get(0), entityData.physics.position.get(1), entityData.family.master.get());
                if (Array.isArray(def.TYPE)) {
                  for (let j = 0; j < def.TYPE.length; j++) {
                    o.define(def.TYPE[j]);
                  }
                } else {
                  o.define(def.TYPE);
                }
              }
              */
            }

            if (def.VALUE != null) {
                entityData.skills.score = Math.max(entityData.skills.score, def.VALUE * obj.squiggle);
            }

            if (def.LIFETIME != null) {
                obj.lifetime = def.LIFETIME;
            }

            if (def.FOOD != null) {
                if (def.FOOD.LEVEL != null) {
                    obj.food.level = def.FOOD.LEVEL;
                    obj.food.countup = 0;
                }
                if (def.FOOD.SHINY != null) {
                    obj.food.shiny = def.FOOD.SHINY;
                }
            }


            if (def.SKILL != null && def.SKILL != []) {
                if (def.SKILL.length != 10) {
                    throw('Inappropiate skill raws.');
                }
                for (let i = 0; i < 9; i++) {
                    entityData.skills.setIndex(i, def.SKILL[i]);
                    //   __a.int.length = 10;
                    //   __a.int[i] = def.SKILL[i];
                }
                //entityData.skills.set(__a.int);
            }
            if (check(def.LEVEL)) {
                if (def.LEVEL === -1) {
                    entityData.skills.reset();
                }
                while (entityData.skills.level < c.SKILL_CHEAT_CAP && entityData.skills.level < def.LEVEL) {
                    entityData.skills.score += entityData.skills.levelScore();
                    //entityData.skills.score.set(entityData.skills.score.get() + entityData.skills.levelScore());
                    entityData.skills.maintain();
                }

                EntityFunctions.refresh(entityData);
                //this.refreshBodyAttributes();
            }
            if (def.SKILL_CAP != null && def.SKILL_CAP != []) {
                if (def.SKILL_CAP.length != 10) {
                    throw('Inappropiate skill caps.');
                }
                entityData.skills.setCaps(def.SKILL_CAP);
                //obj.skill.setCaps(def.SKILL_CAP);
            }
            if (def.mockup != null) {
                entityData.mockup = def.mockup;
            }

            if (def.TYPE != null) {
                entityData.photo.type = 0 + entityData.turret * 0x01 + entityData.attributes.settings.drawHealth * 0x02 + (def.TYPE === 'tank') * 0x04;
                entityData.photo.layer = (entityData.bindings.bond != null) ? entityData.bindings.bound.layer :
                    (def.TYPE === 'wall') ? 11 :
                        (def.TYPE === 'food') ? 10 :
                            (def.TYPE === 'tank') ? 5 :
                                (def.TYPE === 'crasher') ? 1 :
                                    0;
                entityData.flattenedPhotoReferences();
            }
        }
    })();

    const HotReload = () => {
        const savedSkills = [entityData.skills.getAll(false), entityData.skills.getAllCaps(false), entityData.skill.score, entityData.skills.points, entityData.skills.level, entityData.skills.deduction, entityData.skills.names().slice()];
        const savedHealth = [[entityData.health.amount, entityData.health.max], [entityData.shield.amount, entityData.shield.max, entityData.shield.regeneration]];
        const savedControllers = entityData.controllers.get().slice();
        for (let i = 0; i < entityData.defined.length; i++) {
            const definition = ClassIndices[entityData.defined[i]];
            entityData.define(definition);
        }
        entityData.skills.set(savedSkills[0]);
        entityData.skills.setCaps(savedSkills[1]);
        entityData.skills.score = savedSkills[2];
        entityData.skills.points = savedSkills[3];
        entityData.skills.level = savedSkills[4];
        entityData.skills.deduction = savedSkills[5];
        entityData.skills.setNames(savedSkills[6]);
        entityData.skills.update();
        entityData.health.restore(savedHealth[0]);
        entityData.shield.restore(savedHealth[1]);
        entityData.controllers.set(savedControllers);
    }



    // Return the constructor
    return (x, y, master = 'this') => {
        // All these things
        //entityData.flattenedPhoto = null;
        //entityData.turret = false;
        //entityData.photo = null;
        _data.push([]);
        const data = _data[_data.length - 1];
        data.length = 28;
        arrayProperty(entityData, 'photoData', data, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 0, [], [], 0, 0]);
        arrayProperty(entityData, 'flattenedPhoto', data, 1, []);
        //entityData.photoData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 0, [], []];
        //entityData.flattenedPhoto = [];
        //entityData.oldFlattenedPhoto = [];

        objectProperty(entityData, 'photo', data, 2, {});
        //entityData.photo = { };
        entityData.reload = () => HotReload();
        entityData.definePhotoProperties = () => {
                property(entityData.photo, 'type', entityData.photoData, 0, 0),
                property(entityData.photo, 'id', entityData.photoData, 1, 0),
                property(entityData.photo, 'index', entityData.photoData, 2, 0),
                property(entityData.photo, 'x', entityData.photoData, 3, 0),
                property(entityData.photo, 'y', entityData.photoData, 4, 0),
                property(entityData.photo, 'cx', entityData.photoData, 5, 0),
                property(entityData.photo, 'cy', entityData.photoData, 6, 0),
                property(entityData.photo, 'vx', entityData.photoData, 7, 0),
                property(entityData.photo, 'vy', entityData.photoData, 8, 0),
                property(entityData.photo, 'size', entityData.photoData, 9, 0),
                property(entityData.photo, 'rsize', entityData.photoData, 10, 0),
                property(entityData.photo, 'status', entityData.photoData, 11, 0),
                property(entityData.photo, 'health', entityData.photoData, 12, 0),
                property(entityData.photo, 'shield', entityData.photoData, 13, 0),
                property(entityData.photo, 'alpha', entityData.photoData, 14, 0),
                property(entityData.photo, 'facing', entityData.photoData, 15, 0),
                property(entityData.photo, 'vfacing', entityData.photoData, 16, 0),
                property(entityData.photo, 'twiggle', entityData.photoData, 17, 0),
                property(entityData.photo, 'layer', entityData.photoData, 18, 0),
                property(entityData.photo, 'color', entityData.photoData, 19, 0),
                property(entityData.photo, 'name', entityData.photoData, 20, ''),
                property(entityData.photo, 'score', entityData.photoData, 21, 0),
                arrayProperty(entityData.photo, 'guns', entityData.photoData, 22, []),
                arrayProperty(entityData.photo, 'turrets', entityData.photoData, 23, []);
                property(entityData.photo, 'maxSpeed', entityData.photoData, 24, 0);
                property(entityData.photo, 'damp', entityData.photoData, 25, 0);
        }

        entityData.flattenedPhotoGuns = [0, 0];
        entityData.flattenedPhotoTurrets = [0, 0];
        entityData.flattenedPhotoReferences = () => {
            let length = 1, type = entityData.photo.type;
            entityData.flattenedPhoto.length = length;
            multidata_property(entityData.photo, 'type', [entityData.photoData, entityData.flattenedPhoto], [0, 0], entityData.photoData[0]);
            if (type & 0x01) {
                length += 2;
                entityData.flattenedPhoto.length = length;
                multidata_property(entityData.photo, 'facing', [entityData.photoData, entityData.flattenedPhoto], [15, 1], entityData.photoData[15]),
                    multidata_property(entityData.photo, 'layer', [entityData.photoData, entityData.flattenedPhoto], [18, 2], entityData.photoData[18]);
            } else {
                length += 17;
                entityData.flattenedPhoto.length = length;
                multidata_property(entityData.photo, 'id', [entityData.photoData, entityData.flattenedPhoto], [1, 1], entityData.photoData[1]),
                    multidata_property(entityData.photo, 'index', [entityData.photoData, entityData.flattenedPhoto], [2, 2], entityData.photoData[2]),
                    multidata_property(entityData.photo, 'x', [entityData.photoData, entityData.flattenedPhoto], [3, 3], entityData.photoData[3]),
                    multidata_property(entityData.photo, 'y', [entityData.photoData, entityData.flattenedPhoto], [4, 4], entityData.photoData[4]),
                    multidata_property(entityData.photo, 'vx', [entityData.photoData, entityData.flattenedPhoto], [7, 5], entityData.photoData[7]),
                    multidata_property(entityData.photo, 'vy', [entityData.photoData, entityData.flattenedPhoto], [8, 6], entityData.photoData[8]),
                    multidata_property(entityData.photo, 'size', [entityData.photoData, entityData.flattenedPhoto], [9, 7], entityData.photoData[9]),
                    multidata_property(entityData.photo, 'facing', [entityData.photoData, entityData.flattenedPhoto], [15, 8], entityData.photoData[15]),
                    multidata_property(entityData.photo, 'vfacing', [entityData.photoData, entityData.flattenedPhoto], [16, 9], entityData.photoData[16]),
                    multidata_property(entityData.photo, 'twiggle', [entityData.photoData, entityData.flattenedPhoto], [17, 10], entityData.photoData[17]),
                    multidata_property(entityData.photo, 'layer', [entityData.photoData, entityData.flattenedPhoto], [18, 11], entityData.photoData[18]),
                    multidata_property(entityData.photo, 'color', [entityData.photoData, entityData.flattenedPhoto], [19, 12], entityData.photoData[19]),
                    multidata_property(entityData.photo, 'health', [entityData.photoData, entityData.flattenedPhoto], [12, 13], entityData.photoData[12]),
                    multidata_property(entityData.photo, 'shield', [entityData.photoData, entityData.flattenedPhoto], [13, 14], entityData.photoData[13]),
                    multidata_property(entityData.photo, 'alpha', [entityData.photoData, entityData.flattenedPhoto], [14, 15], entityData.photoData[14]);
                multidata_property(entityData.photo, 'maxSpeed', [entityData.photoData, entityData.flattenedPhoto], [24, 16], entityData.photoData[24]);
                multidata_property(entityData.photo, 'damp', [entityData.photoData, entityData.flattenedPhoto], [25, 17], entityData.photoData[25]);
            }
            if (type & 0x04) {
                length += 2;
                entityData.flattenedPhoto.length = length;
                multidata_property(entityData.photo, 'name', [entityData.photoData, entityData.flattenedPhoto], [20, length - 2], entityData.photoData[20]),
                    multidata_property(entityData.photo, 'score', [entityData.photoData, entityData.flattenedPhoto], [21, length - 1], entityData.photoData[21]);
            }

            //length += 2;
            //entityData.flattenedPhoto.length = length;
            //entityData.flattenedPhoto[length - 2] = [];
            //entityData.flattenedPhoto[length - 1] = [];
            //multidata_arrayProperty(entityData.photo, 'guns', [entityData.photoData, entityData.flattenedPhoto], [22, length - 2], entityData.photoData[22]),
            //multidata_arrayProperty(entityData.photo, 'turrets', [entityData.photoData, entityData.flattenedPhoto], [23, length - 1], entityData.photoData[23]);
            const gunslength = entityData.guns.length;
            const turretslength = entityData.turrets.length;

            entityData.flattenedPhoto.push(gunslength);
            entityData.flattenedPhotoGuns[0] = length;
            length += 1;


            /*
              length += 1;
              for (let i = 0; i < gunslength; i++) {
                entityData.flattenedPhotoGuns[1] += 1;
                entityData.flattenedPhoto.push(entityData.guns[i].lastShot()[0]);
                entityData.flattenedPhoto.push(entityData.guns[i].lastShot()[1]);
                length += 2;
              }*/

            entityData.flattenedPhoto.push(turretslength);
            entityData.flattenedPhotoTurrets[0] = length;
            length += 1;
        }

        entityData.definePhotoProperties();

        /*entityData.photo = {
              type: null,
              id: null,
              index: null,
              x: null,
              y: null,
              cx: null,
              cy: null,
              vx: null,
              vy: null,
              size: null,
              rsize: null,
              status: 1,
              health: null,
              shield: null,
              alpha: 1,
              facing: null,
              vfacing: null,
              twiggle: null,
              layer: null,
              color: null,
              name: null,
              score: null,
              guns: null,
              turrets: null
            };*/

        property(entityData, 'turret', data, 4, false);
        //entityData.turret = false;

        entityData.size = () => {
            if (entityData.bindings.bond == null) return (entityData.attributes.coreSize || entityData.attributes.size) * (1 + entityData.skills.level / 45);
            return entityData.bindings.bond.size() * entityData.bindings.bound.size;
        }

        entityData.mass = () => {
            return entityData.attributes.density * (entityData.size() * entityData.size() + 1);
        }

        entityData.realSize = () => {
            return entityData.size() * lazyRealSizes[Math.abs(entityData.attributes.shape)];
        }

        property(entityData, 'creationTime', data, 5, util.time());
        objectProperty(entityData, 'attributes', data, 6, newAttributes());
        objectProperty(entityData, 'status', data, 7, newStatusBox());
        objectProperty(entityData, 'kills', data, 8, newKillBox());
        objectProperty(entityData, 'skills', data, 9, newSkills());
        objectProperty(entityData, 'identifiers', data, 10, newIdentifiers());
        objectProperty(entityData, 'health', data, 11, healthTypes.newStatic(1));
        objectProperty(entityData, 'shield', data, 12, healthTypes.newDynamic(1));
        objectProperty(entityData, 'control', data, 13, newControl());
        objectProperty(entityData, 'physics', data, 14, newPhysics());
        objectProperty(entityData, 'controllers', data, 15, newControllers());
        objectProperty(entityData, 'family', data, 16, newFamily());
        objectProperty(entityData, 'bindings', data, 17, newBindings());
        property(entityData, 'autoOverride', data, 18, false);
        property(entityData, 'autoFire', data, 19, false);
        property(entityData, 'autoSpin', data, 20, false);
        arrayProperty(entityData, 'deref', data, 21, []);
        entityData.predefinedMove = (predefined) => getPredefinedMove(predefined);
        entityData.predefinedFace = (predefined) => getPredefinedFace(predefined);
        property(entityData, 'shape', data, 21, 0);
        arrayProperty(entityData, 'views', data, 22, []);
        objectProperty(entityData, 'AABB', data, 23, {
            size: 0,
            active: true,
            data: {},
            timer: ran.irandom(15)
        });


        /*
            entityData.creationTime = util.time();
            entityData.attributes = newAttributes();
            entityData.status = newStatusBox();
            entityData.kills = newKillBox();
            entityData.skills = newSkills();
            entityData.identifiers = newIdentifiers();
            entityData.health = healthTypes.newStatic(1);
            entityData.shield = healthTypes.newDynamic(1);
            entityData.control = newControl();
            entityData.physics = newPhysics();
            entityData.controllers = newControllers();
            entityData.family = newFamily();
            entityData.bindings = newBindings();
            entityData.autoOverride = false;
            entityData.autoFire = false;
            entityData.autoSpin = false;
            entityData.deref = [];
            entityData.predefinedMove = getPredefinedMove;
            entityData.predefinedFace = getPredefinedFace;
            entityData.shape = 0;
            entityData.views = [];
            entityData.AABB = {
              size: 0,
              active: true,
              data: {},
              timer: ran.irandom(15)
            };
            */

        entityData.dereference = () => {
            for (let i = 0; i < entityData.deref.length; i++) {
                entityData.deref[i]();
            }
        }

        // Get values

        entityData.m_x = () => (entityData.physics.velocity[0] + entityData.physics.acceleration[0]) / ROOMSPEED;

        entityData.m_y = () => (entityData.physics.velocity[1] + entityData.physics.acceleration[1]) / ROOMSPEED;

        entityData.getAABB = () => EntityFunctions.ghandler.AABB.get(entityData);

        entityData.isDead = () => {
            return (entityData.health.amount <= 0);
        }

        entityData.sendMessage = (message) => {
            return 1; // dummy mode
        }

        arrayProperty(entityData, 'collisions', data, 24, []);
        property(entityData, 'damage', data, 25, []);

        //entityData.collisions = [];
        //entityData.damage = 0;
        let color = 0;
        Object.defineProperty(entityData, 'color', {
            get: () => color,
            set: (v) => { color= v; entityData.photo.color = v; }
        });
        //entityData.color = 0;


        entityData.move = () => null;
        entityData.face = () => null;

        arrayProperty(entityData, 'guns', data, 25, []);
        arrayProperty(entityData, 'turrets', data, 26, []);
        property(entityData, 'blend', data, 27, 0);
        arrayProperty(entityData, 'defined', data, 28, []);
        entityData.player = null;
        //entityData.guns = [];
        //entityData.turrets = [];

        //entityData.blend = 0;
        //entityData.player = null;

        entityData.define = (def) => define(def);

        //entityData.physics._set({position:[x,y]});
        //entityData.family._set({master:(master==='this')?entityData:master,source:entityData,parent:entityData});
        entityData.physics.position[0] = x; entityData.physics.position[1] = y;
        entityData.physics.camera[0] = x; entityData.physics.camera[1] = y;
        //entityData.physics.endpoint.set(entityData.physics.position.get(0), 0); entityData.physics.endpoint.set(entityData.physics.position.get(1), 1);
        //entityData.physics.destination.set(entityData.physics.endpoint.get(0), 0); entityData.physics.destination.set(entityData.physics.endpoint.get(1), 1);
        entityData.family.master = (master != 'this') ? master : entityData;
        entityData.family.source = entityData;
        entityData.family.parent = entityData;
        //entityData.identifiers.setTeam(entityData.family.getMaster().identifiers.getTeam());
        entityData.identifiers.team = entityData.family.master.identifiers.team;
        entityData.define(Class.genericEntity);

        entityData.photo.type = 0 + entityData.turret * 0x01 + entityData.attributes.settings.drawHealth * 0x02 + (entityData.attributes.type === 'tank') * 0x04;
        entityData.photo.id = entityData.identifiers.id;
        entityData.photo.index = entityData.attributes.index;
        entityData.photo.x = entityData.physics.position[0];
        entityData.photo.y = entityData.physics.position[1];
        entityData.photo.cx = entityData.physics.camera[0];
        entityData.photo.cy = entityData.physics.camera[1];
        entityData.photo.vx = entityData.physics.velocity[0];
        entityData.photo.vy = entityData.physics.velocity[1];
        entityData.photo.size = entityData.size();
        entityData.photo.rsize = entityData.realSize();
        entityData.photo.status = 1;
        entityData.photo.health = entityData.health.flatGetDisplay();
        entityData.photo.shield = entityData.shield.flatGetDisplay();
        entityData.photo.alpha = 255 * 1;
        entityData.photo.facing = entityData.physics.facing;
        entityData.photo.vfacing = entityData.physics.vfacing;
        entityData.photo.twiggle = 0;
        entityData.photo.layer = (entityData.bindings.bond != null) ? entityData.bindings.bound.layer :
            (entityData.attributes.type === 'wall') ? 11 :
                (entityData.attributes.type === 'food') ? 10 :
                    (entityData.attributes.type === 'tank') ? 5 :
                        (entityData.attributes.type === 'crasher') ? 1 :
                            0;
        entityData.photo.color = entityData.color;
        entityData.photo.name = entityData.attributes.name;
        entityData.photo.score = entityData.skills.score;
        entityData.photo.guns = [entityData.photo.guns.length].concat(entityData.guns.map((g) => g.lastShot()));
        entityData.photo.turrets = [entityData.photo.turrets.length].concat(entityData.turrets.map((t) => t.flattenedPhoto));
        entityData.photo.maxSpeed = entityData.physics.maxSpeed;
        entityData.photo.damp = entityData.physics.damp;

        return entityData;
    };
});

const entity = (x, y, master = 'this') => {
    let e = makeEntity()(x, y, master);
    entities.push(e);
    for (let i = 0; i < views.length; i++) {
        EntityFunctions.remap(e, views[i]);
    }
    //EntityFunctions.remap(e);
    //for (let i = 0; i < views.length; i++) {
    //  views[i].add(e);
    //}
    EntityFunctions.ghandler.AABB.update(e, true);
    EntityFunctions.ghandler.export(e);
    return e;
}

let entitiesToAvoid = [];
let entities = [];
let grid = new hshg.HSHG();
let views = [];
let purgeEntities = () => { entities = entities.filter(e => !e.status.ghost); };


// these are the entity functions
// and its in this format to be
// compatible with ads and be
// capable of modification,
// these are also the things that
// need to be the same between
// entities which is why stuff
// like move isnt here because
// thats defined by the entity
// definition itself
const EntityFunctions = { };

EntityFunctions.ghandler = (() => {
    function getLongestEdge(x1, y1, x2, y2) {
        return Math.max(
            Math.abs(x2 - x1),
            Math.abs(y2 - y1)
        );
    }

    return {
        update: (entity) => {
            if (entity.health.amount <= 0) return 0;

            if (!entity.AABB.active) {
                EntityFunctions.ghandler.remove(entity);

                if (entity.attributes.settings.diesAtRange) EntityFunctions.kill(entity);

                if (!(entity.AABB.timer--)) entity.AABB.active = true;
            } else {
                EntityFunctions.ghandler.export(entity);
                entity.AABB.timer = 15;
                entity.AABB.active = views.some((v) => v.check(entity, 0.6));
            }
        },
        check: (entity) => (entity.AABB.active),
        export: (entity) => {
            if (!entity.inGrid && entity.bindings.bond == null) {
                grid.addObject(entity);
                entity.inGrid = true;
            }
        },
        remove: (entity) => {
            if (entity.inGrid) {
                grid.removeObject(entity);
                entity.inGrid = false;
            }
        },
        AABB: {
            get: (entity) => {
                return entity.AABB.data;
            },
            update: (entity, active) => {
                if (entity.bindings.bond != null) return 0;
                if (!active) { entity.AABB.data.active = false; return 0; };

                let x1 = Math.min(entity.physics.position[0], entity.physics.position[0] + entity.physics.velocity[0] + entity.physics.acceleration[0]) - entity.realSize() - 5;
                let y1 = Math.min(entity.physics.position[1], entity.physics.position[1] + entity.physics.velocity[1] + entity.physics.acceleration[1]) - entity.realSize() - 5;
                let x2 = Math.min(entity.physics.position[0], entity.physics.position[0] + entity.physics.velocity[0] + entity.physics.acceleration[0]) + entity.realSize() + 5;
                let y2 = Math.min(entity.physics.position[1], entity.physics.position[1] + entity.physics.velocity[1] + entity.physics.acceleration[1]) + entity.realSize() + 5;

                let size = getLongestEdge(x1, y1, x2, y2);
                let sizeDiff = entity.AABB.size / size;

                entity.AABB.data = {
                    min: [x1, y1],
                    max: [x2, y2],
                    active: true,
                    size: size
                }

                if (sizeDiff > Math.SQRT2 || sizeDiff < Math.SQRT1_2) {
                    EntityFunctions.ghandler.remove(entity); EntityFunctions.ghandler.export(entity);
                    entity.AABB.size = entity.AABB.data.size;
                }
            }
        }
    }
})();

EntityFunctions.refresh = (entity) => {
    let speedReduce = entity.size() / (entity.attributes.coreSize || entity.attributes.size);

    entity.attributes.acceleration = c.runSpeed * entity.attributes.acceleration_Base / speedReduce;
    if (entity.attributes.settings.reloadToAcceleration) {
        entity.attributes.acceleration *= entity.skills.get('acl');
    }

    entity.attributes.topSpeed = c.runSpeed * entity.attributes.speed_Base * entity.skills.get('mob') / speedReduce;
    if (entity.attributes.settings.reloadToAcceleration) {
        entity.attributes.topSpeed /= Math.sqrt(entity.skills.get('acl'));
    }

    entity.health.set(
        (((entity.attributes.settings.health) ? 2 * entity.skills.level : 0) + entity.attributes.health_Base) * (entity.skills.get('hlt'))
    );

    entity.health.resist = 1 - 1 / Math.max(1, entity.attributes.resist_Base + entity.skills.get('brst'));

    entity.shield.set(
        (((entity.attributes.settings.health) ? 0.6 * entity.skills.level : 0) + entity.attributes.shield_Base) * entity.skills.get('shi'),
        Math.max(0, ((((entity.attributes.settings.health) ? 0.006 * entity.skills.level : 0) + 1) * entity.attributes.regen_Base) * entity.skills.get('rgn'))
    );

    entity.attributes.damage = entity.attributes.damage_Base * (1 + entity.skills.get('atk'));

    entity.attributes.penetration = entity.attributes.penetration_Base + 1.5 * (entity.skills.get('brst') + 0.8 * (entity.skills.get('atk') - 1));

    if (!entity.attributes.settings.diesAtRange || !entity.attributes.range) {
        entity.attributes.range = entity.attributes.range_Base;
    }

    entity.attributes.fov = entity.attributes.fov_Base * 250 * Math.sqrt(entity.size()) * (1 + 0.003 * entity.skills.level);

    entity.attributes.density = (1 + 0.08 * entity.skills.level) * entity.attributes.density_Base;

    entity.attributes.stealth = entity.attributes.stealth_Base;

    entity.attributes.pushability = entity.attributes.pushability_Base;
}

let z = 0.00001;
let d = 0.005;
let k = Math.exp(room.cycleSpeed * Math.log(z) / d);
let ef = (1 - k);

EntityFunctions.physics = (entity) => {
    if (entity.physics.acceleration[0] == null && entity.physics.acceleration[1] == null) {
        util.error(entity.attributes.label);
        util.error(entity);
        entity.physics.acceleration[0] = 0; entity.physics.acceleration[1] = 0;
        entity.physics.velocity[0] = 0; entity.physics.velocity[1] = 0;
        throw 'Void Error!';
    }

    entity.physics.velocity[0] += entity.physics.acceleration[0]; entity.physics.velocity[1] += entity.physics.acceleration[1];
    entity.physics.acceleration[0] = 0; entity.physics.acceleration[1] = 0;

    entity.physics.step = 1;
    if (c.NEW_INTERPOLATION) {
        let v = ROOMSPEED * (ELAPSED / room.cycleSpeed);
        //let m = [entity.physics.position[0] + entity.physics.velocity[0], entity.physics.position[1] + entity.physics.velocity[1]];
        //let delta = [m[0] - entity.physics.position[0], m[1] - entity.physics.position[1]];
        //let tv = getLength(delta[0], delta[1]);
        //let dir = getDirection(delta[0], delta[1]);
        let dir = getDirection(entity.physics.velocity[0], entity.physics.velocity[1]);
        let tv = getLength(entity.physics.velocity[0], entity.physics.velocity[1]);
        v = k * v + ef * tv * (ELAPSED / room.cycleSpeed);
        //entity.physics.position[0] += v * Math.cos(dir);
        //entity.physics.position[1] += v * Math.sin(dir);
        entity.physics.position[0] += entity.physics.step * v * Math.cos(dir);
        entity.physics.position[1] += entity.physics.step * v * Math.sin(dir);
    } else {
        entity.physics.position[0] += entity.physics.step * entity.physics.velocity[0] * (ELAPSED / room.cycleSpeed) * 1.5;
        entity.physics.position[1] += entity.physics.step * entity.physics.velocity[1] * (ELAPSED / room.cycleSpeed) * 1.5;
    }
}

EntityFunctions.friction = (entity) => {
    let motion = getLength(entity.physics.velocity[0], entity.physics.velocity[1]);
    let excess = motion - entity.physics.maxSpeed;
    if (excess > 0 && entity.physics.damp != 0) {
        let rk = entity.physics.damp / ROOMSPEED;
        let drag = excess / (rk + 1);
        let finalVelocity = (entity.physics.maxSpeed + drag);
        if (c.NEW_INTERPOLATION) {
            let resistance = (ELAPSED / room.cycleSpeed) * ((motion - finalVelocity) / (1 + (motion / drag))) * 1.3;
            //let dir = getDirection(entity.physics.velocity[0], entity.physics.velocity[1]);
            //let reduction = [resistance * Math.cos(dir), resistance * Math.sin(dir)];
            entity.physics.velocity[0] -= resistance * entity.physics.velocity[0] / motion; //Math.cos(dir); //reduction[0] * 1.3;
            entity.physics.velocity[1] -= resistance * entity.physics.velocity[1] / motion; //Math.sin(dir); //reduction[1] * 1.3;
        } else {
            entity.physics.velocity[0] = (finalVelocity * entity.physics.velocity[0] / motion);
            entity.physics.velocity[1] = (finalVelocity * entity.physics.velocity[1] / motion);
        }
    }
}

EntityFunctions.look = (entity) => {
    /*
  let distance = util.getDistance(entity.physics.position, entity.physics.camera);
  if (distance > 0) {
    let dir = getDirection(entity.physics.position[0] - entity.physics.camera[0], entity.physics.position[1] - entity.physics.camera[1]);
    let v = k + ef * (distance / (entity.size() / ((entity.attributes.coreSize || entity.attributes.size) / 1.95736)));
    entity.physics.camera[0] += v * Math.cos(dir);
    entity.physics.camera[1] += v * Math.sin(dir);
  }
  */
    entity.physics.camera[0] = entity.physics.position[0];
    entity.physics.camera[1] = entity.physics.position[1];
}

EntityFunctions.skillUp = (entity, stat) => {
    let suc = entity.skills.upgrade(stat);
    if (suc) {
        EntityFunctions.refresh(entity);
        // for all the guns sync the children
        for (let i = 0; i < entity.guns.length; i++) {
            let gun = entity.guns[i];
            gun.syncChildren();
        }
    }
    return suc;
}

EntityFunctions.upgrade = (entity, number) => {
    // upgrade the entity
    if (number < entity.attributes.upgrades.length && entity.skills.level >= entity.attributes.upgrades[number].level) {
        const save = entity.attributes.upgrades[number].class;
        entity.attributes.upgrades = [];
        entity.define(save);
        entity.sendMessage('You have upgraded to ' + entity.attributes.label);

        for (let i = 0; i < entities.length; i++) {
            let instance = entities[i];
            if (instance.attributes.settings.clearOnMasterUpgrade) {
                if (instance.family.master.identifiers.id === entity.identifiers.id) {
                    EntityFunctions.kill(entities[i]);
                }
            }
        }

        entity.skills.update();
        EntityFunctions.refresh(entity);
    } else {
        console.log("A tank tried to upgrade but wasn't at the right level");
    }
}

EntityFunctions.protect = (entity) => {
    // protecc the lil man
}

EntityFunctions.camera = (entity, tur = false) => {
    let twiggle = 0;
    if (entity.attributes.facingType === 'autospin' || (entity.attributes.facingType === 'locksFacing' && entity.control.alt)) {
        twiggle |= 1;
    }
    // reverse tank means twiggle |= 2
    let out = {
        type: 0 + tur * 0x01 + entity.attributes.settings.drawHealth * 0x02 + (entity.attributes.type === 'tank') * 0x04,
        id: entity.identifiers.id,
        index: entity.attributes.index,
        x: entity.physics.position[0],
        y: entity.physics.position[1],
        cx: entity.physics.camera[0],
        cy: entity.physics.camera[1],
        vx: entity.physics.velocity[0],
        vy: entity.physics.velocity[1],
        size: entity.size(),
        rsize: entity.realSize(),
        status: 1,
        health: entity.health.getDisplay(),
        shield: entity.shield.getDisplay(),
        alpha: 1,
        facing: entity.physics.facing,
        vfacing: entity.physics.vfacing,
        twiggle,
        layer: (entity.bindings.bond != null) ? entity.bindings.bound.layer :
            (entity.attributes.type === 'wall') ? 11 :
                (entity.attributes.type === 'food') ? 10 :
                    (entity.attributes.type === 'tank') ? 5 :
                        (entity.attributes.type === 'crasher') ? 1 :
                            0,
        color: entity.color,
        name: entity.attributes.name,
        score: entity.skills.score,
        guns: entity.guns.map((gun) => gun.lastShot()),
        turrets: entity.turrets.map((turret) => EntityFunctions.camera(turret, true))
    }

    return out;
}

EntityFunctions.record = (entity) => {
    //entity.flattenedPhoto = null;
    //entity.photo = (entity.attributes.settings.drawShape) ? EntityFunctions.camera(entity) : null;
    //entity.photo.guns = [entity.guns.length].concat(entity.guns.map((gun) => gun.lastShot()).flat()).flat(),
    //entity.photo.turrets = [entity.turrets.length].concat(entity.turrets.map((turret) => turret.flattenedPhoto).flat()).flat();
    entity.flattenedPhoto[entity.flattenedPhotoGuns[0]] = entity.guns.length;
    for (let i = entity.flattenedPhotoGuns[0] + 1, j = 0; i < entity.flattenedPhotoGuns[0] + entity.flattenedPhotoGuns[1] + 1; i += 2, j++) {
        entity.flattenedPhoto[i] = entity.guns[j].lastShot()[0];
        entity.flattenedPhoto[i + 1] = entity.guns[j].lastShot()[1];
    }

    entity.flattenedPhoto[entity.flattenedPhotoTurrets[0]] = entity.turrets.length;
    let remaining = entity.flattenedPhotoTurrets[1], index = entity.flattenedPhotoTurrets[0] + 1;
    for (let i = 0; i < entity.turrets.length; i++) {
        const size = entity.turrets[i].flattenedPhoto.length;
        for (let j = index, k = 0; j < index + size; j++, k++) {
            entity.flattenedPhoto[j] = entity.turrets[i].flattenedPhoto[k];
        }
        index += size;
        remaining -= size;
    }
    //if (remaining > 0) {
    //  throw new Error('INCOMPLETE TURRET READINGs');
    //}

    //if (currentIndex !== entity.flattenedPhotoTurrets[0] + entity.flattenedPhotoTurrets[1]) {
    //  throw new Error('Number of turrets not equal to specified turret amount ' + currentIndex + ' ' + entity.flattenedPhotoTurrets[0] + entity.flattenedPhotoTurrets[1]);
    //}


    //entity.photo.health = entity.health.flatGetDisplay();
    //entity.photo.shield = entity.shield.flatGetDisplay();
    //entity.flattenedPhoto[entity.flattenedPhoto.length - 2] = entity.photo.guns;
    //entity.flattenedPhoto[entity.flattenedPhoto.length - 1] = entity.photo.turrets;
    let twiggle = 0;
    if (entity.attributes.facingType === 'autospin' || (entity.attributes.facingType === 'locksFacing' && entity.control.alt)) {
        twiggle |= 1;
    }
    if (entity.control.reverseTank) {
        twiggle |= 2;
    }
    entity.photo.twiggle = twiggle;
}

EntityFunctions.damageMultiplier = (entity) => {
    if (entity.attributes.type === 'swarm') {
        return 0.25 + 1.5 * util.clamp(entity.attributes.range / (entity.attributes.range_Base + 1), 0, 1);
    } else {
        return 1;
    }
}

EntityFunctions.kill = (entity) => {
    entity.health.amount = -1;
}

EntityFunctions.destroy = (entity) => {
    if (entity.status.protect) util.remove(entitiesToAvoid, entitiesToAvoid.indexOf(entity));
    //for (let v of views) v.remove(entity);
    //for (let i = 0; i < views.length; i++) {
    //  views[i].remove(entity);
    //}


    /*
  for (let i = 0; i < views.length; i++) {
    if (entity.views.includes(views[i].viewID()) || views[i].find(entity.flattenedPhoto) || views[i].findID(entity.identifiers.id)) {
      views[i].remove(entity.flattenedPhoto);
      views[i].removeID(entity.identifiers.id);
      util.remove(entity.views, entity.views.indexOf(views[i].viewID()));
      util.log(entity.views.includes(views[i].viewID()));
      util.log(views[i].find(entity.flattenedPhoto));
      util.log(views[i].findID(entity.identifiers.id));
      util.log('Removed ' + (entity.attributes.name || ran.chooseBotName()) + ' the ' + entity.attributes.label + ' from views.');
    }
  }
  */

    if (entity.family.parent != null) {
        //let removed = util.remove(entity.family.getParent().family.getChildren(), entity.family.getParent().family.getChildren().indexOf(entity));
        //entity.family.parent.get().family.removeChild(entity.family.parent.get().family.children.indexOf(entity));
        //entity.family.parent.get().family.removeChild(entity.family.parent.get().family.children.get().indexOf(entity));
        entity.family.parent.family.removeChild(entity.family.parent.family.children.indexOf(entity));
    }

    for (let instance of entities) {
        if (instance.family.source.identifiers.id === entity.identifiers.id) {
            if (instance.attributes.settings.persistsAfterDeath) {
                //instance.family.setSource(instance);
                instance.family.source = instance;
                if (instance.attributes.settings.persistsAfterDeath === 'always') continue;
            } else {
                EntityFunctions.kill(instance);
            }
        }

        if (instance.family.parent && instance.family.parent.identifiers.id === entity.identifiers.id) {
            instance.family.parent = null;
        }

        if (instance.family.master.identifiers.id === entity.identifiers.id) {
            EntityFunctions.kill(instance);
            instance.family.master = instance;
        }
    }

    for (let i = 0; i < entity.turrets.length; i++) {
        EntityFunctions.destroy(entity.turrets[i]);
    }

    EntityFunctions.ghandler.remove(entity);
    entity.status.ghost = true;

    for (let i = 0; i < views.length; i++) {
        EntityFunctions.remap(entity, views[i]);
    }
    entity.dereference();
    //for (const deref of entity.deref) {
    //  deref();
    //}
}

// this might work funky so i will fix it up later
EntityFunctions.life = (entity) => {
    const remapTarget = (i, ref, self) => {
        if (i.target == null || (!i.main && !i.alt)) return;
        const remap = [
            i.target[0]/*.get(0)*/ + ref.physics.position[0] - self.physics.position[0],
            i.target[1]/*.get(1)*/ + ref.physics.position[1] - self.physics.position[1]
        ];
        return remap;
    }

    if (entity.attributes.size != entity.attributes.coreSize) {
        entity.attributes.coreSize = entity.attributes.coreSize * 0.99 + entity.attributes.size * 0.01;
        if (Math.abs(entity.attributes.coreSize - entity.attributes.size) < 0.1) entity.attributes.coreSize = entity.attributes.size;
        EntityFunctions.refresh(entity);
    }

    let faucet = (entity.attributes.settings.independent || entity.family.source == null || entity.family.source === entity) ? {} : entity.family.source.control;
    let b = {
        target: remapTarget(faucet, entity.family.source, entity),
        goal: undefined,
        fire: faucet.fire,
        main: faucet.main,
        alt: faucet.alt,
        power: undefined,
    }

    //if (entity.attributes.label.includes('Swarm Drone')) {
    //  console.log('b');
    //  console.log(b);
    //}

    // invisibility

    if (entity.attributes.settings.cravesAttention && !faucet.main && entity.attributes.range) {
        entity.attributes.range--;
    }

    for (let AI of entity.controllers.get()) {
        let a = AI[0](b);
        //if (entity.attributes.label.includes('Swarm Drone')) {
        //  console.log('a');
        //  console.log(a);
        //}

        //console.log(a);
        if (!a) continue;
        if (AI[1]) {
            if (a.target)
                b.target = a.target;
            if (a.goal)
                b.goal = a.goal;
            if (a.fire)
                b.fire = a.fire;
            if (a.main)
                b.main = a.main;
            if (a.alt)
                b.alt = a.alt;
            if (a.power)
                b.power = a.power;
            if (a.reverseTank)
                b.reverseTank = a.reverseTank;
        } else {
            if (a.target && !b.target)
                b.target = a.target;
            if (a.goal && !b.goal)
                b.goal = a.goal;
            if (a.fire && !b.fire)
                b.fire = a.fire;
            if (a.main && !b.main)
                b.main = a.main;
            if (a.alt && !b.alt)
                b.alt = a.alt;
            if (a.power && !b.power)
                b.power = a.power;
            if (a.reverseTank && !b.reverseTank)
                b.reverseTank = a.reverseTank;
        }
    }

    //entity.control.target.set((b.target == null) ? entity.control.target.get() : b.target);
    if (b.target) {
        entity.control.target = b.target;
    }
    entity.control.goal = b.goal;
    entity.control.fire = b.fire;
    entity.control.main = b.main;
    entity.control.alt = b.alt;
    entity.control.power = ((b.power == null) ? 1 : b.power);

    entity.move();
    entity.face();

    for (let i = 0; i < entity.guns.length; i++) {
        entity.guns[i].live();
    }

    for (let i = 0; i < entity.turrets.length; i++) {
        EntityFunctions.life(entity.turrets[i]);
    }

    if (entity.skills.maintain()) {
        EntityFunctions.refresh(entity);
    }
}

EntityFunctions.survival = (entity) => {
    if (entity.status.invuln) {
        entity.damage = 0;
        return 0;
    }

    if (entity.attributes.settings.diesAtRange) {
        entity.attributes.range -= 1 / ROOMSPEED;
        if (entity.attributes.range < 0) {
            EntityFunctions.kill(entity);
        }
    }

    if (entity.attributes.settings.diesAtLowSpeed) {
        if (!entity.collisions.length && getLength(entity.physics.velocity[0], entity.physics.velocity[1]) < entity.attributes.topSpeed / 2) {
            entity.health.amount = entity.health.amount - entity.health.getDamage(1 / ROOMSPEED);
        }
    }


    //if (entity.damage > 0 && entity.attributes.type === 'tank') {
    //  console.log('some damage ' + entity.damage);
    //}

    if (entity.damage > 0) {
        if (entity.shield.max) {
            let shieldDamage = entity.shield.getDamage(entity.damage);
            entity.damage -= shieldDamage;
            entity.shield.amount -= shieldDamage;
            //entity.photo.shield = entity.shield.flatGetDisplay();
        }
        if (entity.damage > 0) {
            let healthDamage = entity.health.getDamage(entity.damage);
            entity.blend = 1;
            entity.health.amount -= healthDamage;
            //entity.photo.health = entity.health.flatGetDisplay();
        }
    }
    entity.damage = 0;

    if (entity.health.amount <= 0) {
        let killers = [], killTools = [], notJustFood = false;
        let killText = "You have died";

        entity.sendMessage(killText);

        return 1;
    }

    return 0;
}

EntityFunctions.constraint = (entity) => {

}

EntityFunctions.become = (entity, player) => {
    entity.player = player;
    entity.controllers.addPredefined('listenToPlayer');
    entity.sendMessage = (content) => {
        player.socket.talk('m', content);
    }
}

EntityFunctions.bind = (entity, position, bond) => {
    entity.bindings.bond = bond;
    entity.family.source = bond;
    bond.turrets.push(entity);
    entity.turret = true;
    entity.skills = bond.skills;
    entity.attributes.label = bond.attributes.label + ' ' + entity.attributes.label;

    EntityFunctions.ghandler.remove(entity);
    entity.attributes.settings.drawShape = false;

    entity.bindings.defineBound();
    entity.bindings.bound.size = position[0] / 20;
    let _off = [position[1], position[2]];
    let _angle = position[3] * Math.PI / 180;
    entity.bindings.bound.angle = _angle;
    entity.bindings.bound.direction = getDirection(_off[0], _off[1]);
    entity.bindings.bound.offset = getLength(_off[0], _off[1]) / 10;
    entity.bindings.bound.arc = position[4] * Math.PI / 180;
    entity.bindings.bound.layer = position[5];
    entity.bindings.defineFiringArc();

    entity.physics.facing = bond.physics.facing + _angle;
    entity.attributes.facingType = 'bound';
    entity.attributes.motionType = 'bound';
    entity.face = entity.predefinedFace('bound');
    entity.move = entity.predefinedMove('bound');
    entity.photo.size = entity.size();
    entity.photo.rsize = entity.realSize();

    entity.photo.layer = entity.bindings.bound.layer;

    entity.move();
}

/*
async function AsyncEngine(entity) {
  //if (EntityFunctions.survival(entity)) {
  //  EntityFunctions.destroy(entity);
  //  return 0;
  //}

  const promise = (entityfunction) => {
    return new Promise((resolve, reject) => {
      try {
        const func = entityfunction(entity);
        if (func) {
          resolve(func);
        } else {
          resolve(true);
        }
      } catch(err) {
        reject(new Error(err));
      }
    });
  }

  //const physics = promise((e) => { if (entity.bindings.bond.get() == null) EntityFunctions.physics(entity); return 1; });
  //const life = promise((e) => { EntityFunctions.life(entity); return 1; });
  //const constraint = promise((e) => { EntityFunctions.constraint(entity); return 1; });
  //const friction = promise((e) => { EntityFunctions.friction(entity); return 1; });

  //const record = promise((e) => { EntityFunctions.record(entity); return 1; });

  await Promise.all([
    (async() => { await promise((e) => { if (entity.bindings.bond.get() == null) EntityFunctions.physics(entity); return 1; }); }),
    (async() => { await promise((e) => { EntityFunctions.life(entity); return 1; }); }),
    (async() => { await promise((e) => { EntityFunctions.constraint(entity); return 1; }); }),
    (async() => { await promise((e) => { EntityFunctions.friction(entity); return 1; }); })
  ]);

  await promise((e) => { EntityFunctions.record(entity); return 1; });
  return 1;
}
*/

EntityFunctions.remap = (entity, view) => {
    if (entity.views.includes(view.viewID())) {
        if (!view.check(entity) || !entity.attributes.settings.drawShape || entity.status.ghost) {
            view.remove(entity.identifiers.id);
            entity.views.splice(entity.views.indexOf(view.viewID()), 1);
        } else {
            view.update(entity.flattenedPhoto, entity.identifiers.id);
        }
    } else {
        if (view.check(entity) && entity.attributes.settings.drawShape && !entity.status.ghost) {
            view.add(entity.flattenedPhoto, entity.identifiers.id);
            entity.views.push(view.viewID());
        }
    }
}

EntityFunctions.update = (entity) => {

    // activation

    /*
  if (EntityFunctions.survival(entity)) {
    EntityFunctions.destroy(entity);
  } else {
    if (entity.bindings.bond.get() == null) {
      EntityFunctions.physics(entity);
    }

    EntityFunctions.life(entity);
    EntityFunctions.friction(entity);
    //EntityFunctions.constraint(entity);
    EntityFunctions.record(entity);
  }
  */

    if (EntityFunctions.survival(entity)) {
        EntityFunctions.destroy(entity);
    } else {
        if (entity.bindings.bond == null) {
            EntityFunctions.physics(entity);
        }
        EntityFunctions.life(entity),
            EntityFunctions.friction(entity),
            EntityFunctions.constraint(entity);
        EntityFunctions.look(entity);
        EntityFunctions.record(entity);
        for (let i = 0; i < views.length; i++) {
            EntityFunctions.remap(entity, views[i]);
        }
    }

    /*
  await new Promise((resolve, reject) => {
    try {
      if (EntityFunctions.survival(entity)) {
        EntityFunctions.destroy(entity);
        resolve(false);
      }
      resolve(true);
    } catch(err) {
      reject(err);
    }
  }).then((async(value) => {
  if (value == true) {

  await Promise.all([new Promise((resolve, reject) => {
    try {
      if (entity.bindings.bond == null) {
        EntityFunctions.physics(entity);
      }
      resolve(true);
    } catch(err) {
      reject(err);
    }
  }), new Promise((resolve, reject) => {
    try {
      EntityFunctions.life(entity);
      resolve(true);
    } catch(err) {
        reject(err);
    }
  }), new Promise((resolve, reject) => {
    try {
      EntityFunctions.friction(entity);
      resolve(true);
    } catch(err) {
        reject(err);
    }
  }), new Promise((resolve, reject) => {
    try {
      EntityFunctions.constraint(entity);
      resolve(true);
    } catch(err) {
        reject(err);
    }
  }), new Promise((resolve, reject) => {
    try {
      EntityFunctions.look(entity);
      resolve(true);
    } catch(err) {
        reject(err);
    }
  }), new Promise((resolve, reject) => {
    try {
      EntityFunctions.remap(entity);
      resolve(true);
    } catch(err) {
        reject(err);
    }
  })]).then((success) => {
    // continue
  }, (rejected) => {
    util.error(rejected);
    throw new Error(rejected);
  });

  await Promise.all([new Promise((resolve, reject) => {
    try {
    EntityFunctions.record(entity);
    resolve(true);
    } catch(err) {
    reject(err);
    }
  })]).then((success) => null, (rejected) => { util.error(rejected); throw new Error(rejected); });

  } else {
    // The entity has died
  }

  }), (rejected) => {
    util.error(rejected);
    throw new Error(rejected);
  });
  */

    entity.collisions = [];
}

EntityFunctions.activate = (entity) => {
    if (entity != null) {

        entity.collisions = [];
        EntityFunctions.ghandler.update(entity);
        EntityFunctions.ghandler.AABB.update(entity, EntityFunctions.ghandler.check(entity));
    } else {
        util.error('A NULL ENTITY TRIED TO GET UPDATED IN THE COLLISION GRID');
    }
}


const fs = require('fs')
let files = {
    '/server.js': fs.readFileSync('./server.js').toString(),
    '/lib/definitions.js': fs.readFileSync('./lib/definitions.js').toString(),
}

/*const createMockupJsonData = () => {
        const rounder = (val) => {
            if (Math.abs(val) < 0.00001) val = 0
            return +val.toPrecision(6)
        }
        // Define mocking up functions
        const getMockup = (e, positionInfo) => {
            return {
                index: e.attributes.index,
                name: e.attributes.label,
                x: rounder(e.physics.position.get(0)),
                y: rounder(e.physics.position.get(1)),
                color: e.color,
                shape: e.attributes.shape,
                size: rounder(e.size()),
                realSize: rounder(e.realSize()),
                facing: rounder(e.physics.facing.get()),
                layer: e.layer,
                statnames: e.attributes.settings.skillNames,
                position: positionInfo,
                upgrades: e.attributes.upgrades.map(r => ({ tier: r.level, index: r.index })),
                guns: e.guns.map((gun) => {
                    return {
                        offset: rounder(gun.mechanics().offset),
                        direction: rounder(gun.mechanics().direction),
                        length: rounder(gun.mechanics().length),
                        width: rounder(gun.mechanics().width),
                        aspect: rounder(gun.mechanics().aspect),
                        angle: rounder(gun.mechanics().angle),
                    }
                }),
                turrets: e.turrets.map((t) => {
                    let out = getMockup(t, {});
                    out.sizeFactor = rounder(t.bindings.bound.get('size'));
                    out.offset = rounder(t.bindings.bound.get('offset'));
                    out.direction = rounder(t.bindings.bound.get('direction'));
                    out.layer = rounder(t.bindings.bound.get('layer'));
                    out.angle = rounder(t.bindings.bound.get('angle'));
                    return out;
                }),
            }
        }
        function getDimensions(entities) {
            /* Ritter's Algorithm (Okay it got serious modified for how we start it)
            * 1) Add all the ends of the guns to our list of points needed to be bounded and a couple points for the body of the tank..

            let endpoints = []
            let pointDisplay = []
            let pushEndpoints = function(model, scale, focus={ x: 0, y: 0 }, rot=0) {
                let s = Math.abs(model.attributes.shape)
                let z = lazyRealSizes[s]
                if (z === 1) { // Body (octagon if circle)
                    for (let i=0; i<2; i+=0.5) {
                        endpoints.push({x: focus.x + scale * Math.cos(i*Math.PI), y: focus.y + scale * Math.sin(i*Math.PI)})
                    }
                } else { // Body (otherwise vertices)
                    for (let i=(s%2)?0:Math.PI/s; i<s; i++) {
                        let theta = (i / s) * 2 * Math.PI
                        endpoints.push({x: focus.x + scale * z * Math.cos(theta), y: focus.y + scale * z * Math.sin(theta)})
                    }
                }
                for (let gun of model.guns) {
                    let h = (gun.mechanics().aspect > 0) ? scale * gun.mechanics().width / 2 * gun.mechanics().aspect : scale * gun.mechanics().width / 2
                    let r = Math.atan2(h, scale * gun.mechanics().length) + rot
                    let l = Math.sqrt(scale * scale * gun.mechanics().length * gun.mechanics().length + h * h)
                    let x = focus.x + scale * gun.mechanics().offset * Math.cos(gun.mechanics().direction + gun.mechanics().angle + rot)
                    let y = focus.y + scale * gun.mechanics().offset * Math.sin(gun.mechanics().direction + gun.mechanics().angle + rot);
                    endpoints.push({
                        x: x + l * Math.cos(gun.mechanics().angle + r),
                        y: y + l * Math.sin(gun.mechanics().angle + r),
                    })
                    endpoints.push({
                        x: x + l * Math.cos(gun.mechanics().angle - r),
                        y: y + l * Math.sin(gun.mechanics().angle - r),
                    })
                    pointDisplay.push({
                        x: x + l * Math.cos(gun.mechanics().angle + r),
                        y: y + l * Math.sin(gun.mechanics().angle + r),
                    });
                    pointDisplay.push({
                        x: x + l * Math.cos(gun.mechanics().angle - r),
                        y: y + l * Math.sin(gun.mechanics().angle - r),
                    })
                }

                for (let turret of model.turrets) {
                    pushEndpoints(
                        turret, turret.bindings.bound.get('size'),
                        { x: turret.bindings.bound.get('offset') * Math.cos(turret.bindings.bound.get('angle')), y: turret.bindings.bound.get('offset') * Math.sin(turret.bindings.bound.get('angle')) },
                        turret.bindings.bound.get('angle')
                    )
                }

            }
            pushEndpoints(entities, 1)
            // 2) Find their mass center
            let massCenter = { x: 0, y: 0 }
            /*for (let point of endpoints) {
                massCenter.x += point.x
                massCenter.y += point.y
            }
            massCenter.x /= endpoints.length
            massCenter.y /= endpoints.length;
            // 3) Choose three different points (hopefully ones very far from each other)
            let chooseFurthestAndRemove = function(furthestFrom) {
                let index = 0
                if (furthestFrom !== -1) {
                    let priority = 0
                    for (let i=0; i<endpoints.length; i++) {
                        let thisPoint = endpoints[i]
                        let x = thisPoint.x - furthestFrom.x
                        let y = thisPoint.y - furthestFrom.y
                        let p = x * x + y * y
                        if (p > priority) {
                          priority = p
                          index = i
                        }
                    }
                }
                let output = endpoints[index]
                endpoints.splice(index, 1)
                return output
            }
            let point1 = chooseFurthestAndRemove(massCenter); // Choose the point furthest from the mass center
            let point2 = chooseFurthestAndRemove(point1); // And the point furthest from that
            // And the point which maximizes the area of our triangle (a loose look at this one)
            let chooseBiggestTriangleAndRemove = function(point1, point2) {
                let bigest = 0
                let index = 0
                for (let i=0; i<endpoints.length; i++) {
                    let thisPoint = endpoints[i]
                    let x1 = thisPoint.x - point1.x
                    let y1 = thisPoint.y - point1.y
                    let x2 = thisPoint.x - point2.x
                    let y2 = thisPoint.y - point2.y
                        /* We need neither to calculate the last part of the triangle
                        * (because it's always the same) nor divide by 2 to get the
                        * actual area (because we're just comparing it)
                        // 1/x1 * x1 + x2 * x2 + y1 * y1 + y2 * y2
                    let p = x1 * x1 + x2 * x2 + y1 * y1 + y2 * y2
                    if (p > bigest) {
                      bigest = p
                      index = i
                    }
                }
                let output = endpoints[index]
                endpoints.splice(index, 1)
                return output
            }
            let point3 = chooseBiggestTriangleAndRemove(point1, point2)
            // 4) Define our first enclosing circle as the one which seperates these three furthest points
            function circleOfThreePoints(p1, p2, p3) {
                let x1 = p1.x
                let y1 = p1.y
                let x2 = p2.x
                let y2 = p2.y
                let x3 = p3.x
                let y3 = p3.y
                let denom =
                    x1 * (y2 - y3) -
                    y1 * (x2 - x3) +
                    x2 * y3 -
                    x3 * y2
                let xy1 = x1*x1 + y1*y1
                let xy2 = x2*x2 + y2*y2
                let xy3 = x3*x3 + y3*y3
                let x = ( // Numerator
                    xy1 * (y2 - y3) +
                    xy2 * (y3 - y1) +
                    xy3 * (y1 - y2)
                ) / (2 * denom)
                let y = ( // Numerator
                    xy1 * (x3 - x2) +
                    xy2 * (x1 - x3) +
                    xy3 * (x2 - x1)
                ) / (2 * denom)
                let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2))
                let r2 = Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2))
                let r3 = Math.sqrt(Math.pow(x - x3, 2) + Math.pow(y - y3, 2))
                //if (r !== r2 || r !== r3) {
                    //util.log('somethings fucky')
                //}
                return { x: x, y: y, radius: r };
            }
            let c = circleOfThreePoints(point1, point2, point3)
            pointDisplay = [
                { x: rounder(point1.x), y: rounder(point1.y), },
                { x: rounder(point2.x), y: rounder(point2.y), },
                { x: rounder(point3.x), y: rounder(point3.y), },
            ]
            let centerOfCircle = { x: c.x, y: c.y }
            let radiusOfCircle = c.radius
            // 5) Check to see if we enclosed everything
            function checkingFunction() {
                for(let i=endpoints.length; i>0; i--) {
                    // Select the one furthest from the center of our circle and remove it
                    point1 = chooseFurthestAndRemove(centerOfCircle)
                    //let vectorFromPointToCircleCenter = new Vector(centerOfCircle.x - point1.x, centerOfCircle.y - point1.y)
                    let vectorFromPointToCircleCenter = { x: centerOfCircle.x - point1.x, y: centerOfCircle.y - point1.y };
                    // 6) If we're still outside of this circle build a new circle which encloses the old circle and the new point
                    if (getLength(vectorFromPointToCircleCenter.x, vectorFromPointToCircleCenter.y) > radiusOfCircle) {
                        pointDisplay.push({ x: rounder(point1.x), y: rounder(point1.y), })
                        // Define our new point as the far side of the cirle
                        let dir = vectorFromPointToCircleCenter.direction
                        point2 = {
                            x: centerOfCircle.x + radiusOfCircle * Math.cos(dir),
                            y: centerOfCircle.y + radiusOfCircle * Math.sin(dir),
                        }
                        break
                    }
                }
                // False if we checked everything, true if we didn't
                return !!endpoints.length
            }
            while (checkingFunction()) { // 7) Repeat until we enclose everything
                centerOfCircle = {
                    x: (point1.x + point2.x) / 2,
                    y: (point1.y + point2.y) / 2,
                }
                radiusOfCircle = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)) / 2
            }
            // 8) Since this algorithm isn't perfect but we know our shapes are bilaterally symmetrical, we bind this circle along the x-axis to make it behave better
            return {
                middle: { x: rounder(centerOfCircle.x), y: 0 },
                axis: rounder(radiusOfCircle * 2),
                points: pointDisplay,
            }
        }
        // Save them
        let mockupData = []
        for (let k in Class) {
            try {
                if (!Class.hasOwnProperty(k)) continue
                let type = Class[k];
                // Create a reference entities which we'll then take an image of.
                //let temptank = new Entity({x: 0, y: 0})
                let temptank = entity(0, 0);
                temptank.define(type)
                temptank.attributes.name = type.LABEL; // Rename it (for the upgrades menu).
                // Fetch the mockup.
                type.mockup = {
                    body: EntityFunctions.camera(temptank, true),
                    position: getDimensions(temptank),
                }
                // This is to pass the size information about the mockup that we didn't have until we created the mockup
                type.mockup.body.position = type.mockup.position
                // Add the new data to the thing.
                mockupData.push(getMockup(temptank, type.mockup.position))
                // Kill the reference entities.
                EntityFunctions.destroy(temptank);
            } catch(error) {
                util.error(error.stack)
                util.error(k)
                util.error(Class[k])
                throw error;
            }
        }
        // Remove them
        purgeEntities()
        // Build the function to return
        util.log('Mockup data generated!')
        return JSON.stringify(mockupData)
    };*/
const createMockupJsonData = () => {
    function rounder(val) {
        if (Math.abs(val) < 0.00001) val = 0
        return +val.toPrecision(6)
    }
    // Define mocking up functions
    function getMockup(e, positionInfo) {
        return {
            index: e.attributes.index,
            name: e.attributes.label,
            x: rounder(e.physics.position[0]),
            y: rounder(e.physics.position[1]),
            color: e.color,
            shape: e.shape,
            size: rounder(e.size()),
            realSize: rounder(e.realSize()),
            facing: rounder(e.physics.facing),
            layer: e.layer,
            statnames: e.attributes.skillNames,
            position: positionInfo,
            upgrades: e.attributes.upgrades.map(r => ({tier:r.tier,index:r.index})),
            guns: e.guns.map(function(gun) {
                return {
                    offset: rounder(gun.mechanics().offset),
                    direction: rounder(gun.mechanics().direction),
                    length: rounder(gun.mechanics().length),
                    width: rounder(gun.mechanics().width),
                    aspect: rounder(gun.mechanics().aspect),
                    angle: rounder(gun.mechanics().angle),
                }
            }),
            turrets: e.turrets.map(function(t) {
                let out = getMockup(t, {})
                out.sizeFactor = rounder(t.bindings.bound.size)
                out.offset = rounder(t.bindings.bound.offset)
                out.direction = rounder(t.bindings.bound.direction)
                out.layer = rounder(t.bindings.bound.layer)
                out.angle = rounder(t.bindings.bound.angle)
                return out
            }),
        }
    }
    function getDimensions(entities) {
        /* Ritter's Algorithm (Okay it got serious modified for how we start it)
            * 1) Add all the ends of the guns to our list of points needed to be bounded and a couple points for the body of the tank..
            */
        let endpoints = []
        let pointDisplay = []
        let pushEndpoints = function(model, scale, focus={ x: 0, y: 0 }, rot=0) {
            let s = Math.abs(model.attributes.shape)
            let z = lazyRealSizes[s]
            if (z === 1) { // Body (octagon if circle)
                for (let i=0; i<2; i+=0.5) {
                    endpoints.push({x: focus.x + scale * Math.cos(i*Math.PI), y: focus.y + scale * Math.sin(i*Math.PI)})
                }
            } else { // Body (otherwise vertices)
                for (let i=(s%2)?0:Math.PI/s; i<s; i++) {
                    let theta = (i / s) * 2 * Math.PI
                    endpoints.push({x: focus.x + scale * z * Math.cos(theta), y: focus.y + scale * z * Math.sin(theta)})
                }
            }
            for (let gun of model.guns) {
                let h = (gun.mechanics().aspect > 0) ? scale * gun.mechanics().width / 2 * gun.mechanics().aspect : scale * gun.mechanics().width / 2
                let r = Math.atan2(h, scale * gun.mechanics().length) + rot
                let l = Math.sqrt(scale * scale * gun.mechanics().length * gun.mechanics().length + h * h)
                let x = focus.x + scale * gun.mechanics().offset * Math.cos(gun.mechanics().direction + gun.mechanics().angle + rot)
                let y = focus.y + scale * gun.mechanics().offset * Math.sin(gun.mechanics().direction + gun.mechanics().angle + rot);
                endpoints.push({
                    x: x + l * Math.cos(gun.mechanics().angle + r),
                    y: y + l * Math.sin(gun.mechanics().angle + r),
                })
                endpoints.push({
                    x: x + l * Math.cos(gun.mechanics().angle - r),
                    y: y + l * Math.sin(gun.mechanics().angle - r),
                })
                pointDisplay.push({
                    x: x + l * Math.cos(gun.mechanics().angle + r),
                    y: y + l * Math.sin(gun.mechanics().angle + r),
                });
                pointDisplay.push({
                    x: x + l * Math.cos(gun.mechanics().angle - r),
                    y: y + l * Math.sin(gun.mechanics().angle - r),
                })
            }
            for (let turret of model.turrets) {
                pushEndpoints(
                    turret, turret.bindings.bound.size,
                    { x: turret.bindings.bound.offset * Math.cos(turret.bindings.bound.angle), y: turret.bindings.bound.offset * Math.sin(turret.bindings.bound.angle) },
                    turret.bindings.bound.angle
                )
            }
        }
        pushEndpoints(entities, 1)
        // 2) Find their mass center
        let massCenter = { x: 0, y: 0 }
        /*for (let point of endpoints) {
                massCenter.x += point.x
                massCenter.y += point.y
            }
            massCenter.x /= endpoints.length
            massCenter.y /= endpoints.length;*/
        // 3) Choose three different points (hopefully ones very far from each other)
        let chooseFurthestAndRemove = function(furthestFrom) {
            let index = 0
            if (furthestFrom !== -1) {
                let priority = 0
                for (let i=0; i<endpoints.length; i++) {
                    let thisPoint = endpoints[i]
                    let x = thisPoint.x - furthestFrom.x
                    let y = thisPoint.y - furthestFrom.y
                    let p = x * x + y * y
                    if (p > priority) {
                        priority = p
                        index = i
                    }
                }
            }
            let output = endpoints[index]
            endpoints.splice(index, 1)
            return output
        }
        let point1 = chooseFurthestAndRemove(massCenter); // Choose the point furthest from the mass center
        let point2 = chooseFurthestAndRemove(point1); // And the point furthest from that
        // And the point which maximizes the area of our triangle (a loose look at this one)
        let chooseBiggestTriangleAndRemove = function(point1, point2) {
            let bigest = 0
            let index = 0
            for (let i=0; i<endpoints.length; i++) {
                let thisPoint = endpoints[i]
                let x1 = thisPoint.x - point1.x
                let y1 = thisPoint.y - point1.y
                let x2 = thisPoint.x - point2.x
                let y2 = thisPoint.y - point2.y
                /* We need neither to calculate the last part of the triangle
                        * (because it's always the same) nor divide by 2 to get the
                        * actual area (because we're just comparing it)
                        */ // 1/x1 * x1 + x2 * x2 + y1 * y1 + y2 * y2
                let p = x1 * x1 + x2 * x2 + y1 * y1 + y2 * y2
                if (p > bigest) {
                    bigest = p
                    index = i
                }
            }
            let output = endpoints[index]
            endpoints.splice(index, 1)
            return output
        }
        let point3 = chooseBiggestTriangleAndRemove(point1, point2)
        // 4) Define our first enclosing circle as the one which seperates these three furthest points
        function circleOfThreePoints(p1, p2, p3) {
            let x1 = p1.x
            let y1 = p1.y
            let x2 = p2.x
            let y2 = p2.y
            let x3 = p3.x
            let y3 = p3.y
            let denom =
                x1 * (y2 - y3) -
                y1 * (x2 - x3) +
                x2 * y3 -
                x3 * y2
            let xy1 = x1*x1 + y1*y1
            let xy2 = x2*x2 + y2*y2
            let xy3 = x3*x3 + y3*y3
            let x = ( // Numerator
                xy1 * (y2 - y3) +
                xy2 * (y3 - y1) +
                xy3 * (y1 - y2)
            ) / (2 * denom)
            let y = ( // Numerator
                xy1 * (x3 - x2) +
                xy2 * (x1 - x3) +
                xy3 * (x2 - x1)
            ) / (2 * denom)
            let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2))
            let r2 = Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2))
            let r3 = Math.sqrt(Math.pow(x - x3, 2) + Math.pow(y - y3, 2))
            //if (r !== r2 || r !== r3) {
            //util.log('somethings fucky')
            //}
            return { x: x, y: y, radius: r };
        }
        let c = circleOfThreePoints(point1, point2, point3)
        pointDisplay = [
            { x: rounder(point1.x), y: rounder(point1.y), },
            { x: rounder(point2.x), y: rounder(point2.y), },
            { x: rounder(point3.x), y: rounder(point3.y), },
        ]
        let centerOfCircle = { x: c.x, y: c.y }
        let radiusOfCircle = c.radius
        // 5) Check to see if we enclosed everything
        function checkingFunction() {
            for(let i=endpoints.length; i>0; i--) {
                // Select the one furthest from the center of our circle and remove it
                point1 = chooseFurthestAndRemove(centerOfCircle)
                let vectorFromPointToCircleCenter = { x: centerOfCircle.x - point1.x, y: centerOfCircle.y - point1.y };
                // 6) If we're still outside of this circle build a new circle which encloses the old circle and the new point
                if (getLength(vectorFromPointToCircleCenter.x, vectorFromPointToCircleCenter.y) > radiusOfCircle) {
                    pointDisplay.push({ x: rounder(point1.x), y: rounder(point1.y), })
                    // Define our new point as the far side of the cirle
                    let dir = getDirection(vectorFromPointToCircleCenter.x, vectorFromPointToCircleCenter.y);
                    point2 = {
                        x: centerOfCircle.x + radiusOfCircle * Math.cos(dir),
                        y: centerOfCircle.y + radiusOfCircle * Math.sin(dir),
                    }
                    break
                }
            }
            // False if we checked everything, true if we didn't
            return Boolean(endpoints.length)
        }
        while (checkingFunction()) { // 7) Repeat until we enclose everything
            centerOfCircle = {
                x: (point1.x + point2.x) / 2,
                y: (point1.y + point2.y) / 2,
            }
            radiusOfCircle = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)) / 2
        }
        // 8) Since this algorithm isn't perfect but we know our shapes are bilaterally symmetrical, we bind this circle along the x-axis to make it behave better
        return {
            middle: { x: rounder(centerOfCircle.x), y: 0 },
            axis: rounder(radiusOfCircle * 2),
            points: pointDisplay,
        }
    }
    // Save them
    let mockupData = []
    for (let k in Class) {
        try {
            if (!Class.hasOwnProperty(k)) continue
            let type = Class[k];
            // Create a reference entities which we'll then take an image of.
            let temptank = entity(0, 0);
            temptank.define(type)
            temptank.attributes.name = type.LABEL; // Rename it (for the upgrades menu).
            // Fetch the mockup.
            type.mockup = {
                body: EntityFunctions.camera(temptank, true),
                position: getDimensions(temptank),
            }
            // This is to pass the size information about the mockup that we didn't have until we created the mockup
            type.mockup.body.position = type.mockup.position
            // Add the new data to the thing.
            let mockup = getMockup(temptank, type.mockup.position);
            mockupData.push(mockup);
            // Kill the reference entities.
            EntityFunctions.destroy(temptank);
        } catch(error) {
            util.error(error.stack)
            util.error(k)
            util.error(Class[k])
            throw error;
        }
    }
    // Remove them
    purgeEntities()
    // Build the function to return
    util.log('Mockup data generated!')
    return JSON.stringify(mockupData)
};



const getMockupJsonData = () => {
    // this is the moment you wish JS had gotos
    const invalidCacheError = Symbol()
    const definitionshash = crypto.createHash('sha256').update(files['/lib/definitions.js']).digest('base64')
    try {
        if (!fs.existsSync('./lib/.mockups.json'))
            throw invalidCacheError
        const cachedData = JSON.parse(fs.readFileSync('./lib/.mockups.json').toString())
        if (definitionshash === cachedData[0]) {
            util.log('Mockup data loaded from cache.')
            return cachedData[1]
        } else {
            throw invalidCacheError
        }
    } catch (e) {
        if (e !== invalidCacheError) {
            util.warn(e)
        }
        const mockups = createMockupJsonData(definitionshash)
        const data = JSON.stringify([definitionshash, mockups])
        fs.writeFile('./lib/.mockups.json', data, () => util.warn)
        return mockups
    }
}

let mockupJsonData = createMockupJsonData();
let mockupJsonEtag = '"' + crypto.createHash('sha256').update(mockupJsonData).digest('base64').substring(0, 43) + '"';

//const mockupJsonData = getMockupJsonData(); const mockupJsonEtag = '"' + crypto.createHash('sha256').update(mockupJsonData).digest('base64').substring(0, 43) + '"';
/*
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const PORT = SECRET.PORT || 8080;
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static middleware
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/*', (req, res, next) => {
	res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.send(err.message || 'Internal server error');
});

server.listen(PORT, () => {
	console.log('Server is live on PORT:', PORT);
});
*/

// data id system

const Sockets = {
    protocol: require('./lib/fasttalk'),
    clients: [],
    players: [],
    disconnections: [],
    banned: {
        // nobody yet but somebody at some point probably
    },
    suspicious: {},
    connected: {},
    SocketFunctions: {},
};


Sockets.New = (socket, req) => {
    const spawnPlayer = (() => {
        const newgui = (() => {
            // This is because I love to cheat
            // Define a little thing that should automatically keep
            // track of whether or not it needs to be updated
            function floppy(value = null) {
                let flagged = true
                return {
                    // The update method
                    update: (newValue) => {
                        let eh = false
                        if (value == null) { eh = true; }
                        else {
                            if (typeof newValue !== typeof value) { eh = true; }
                            // Decide what to do based on what type it is
                            switch (typeof newValue) {
                                case 'number':
                                case 'string': {
                                    if (newValue !== value) { eh = true; }
                                } break
                                case 'object': {
                                    if (Array.isArray(newValue)) {
                                        if (newValue.length !== value.length) { eh = true; }
                                        else {
                                            for (let i=0, len=newValue.length; i<len; i++) {
                                                if (newValue[i] !== value[i]) eh = true
                                            }
                                        }
                                        break
                                    }
                                } // jshint ignore:line
                                default:
                                    util.error(newValue);
                                    throw new Error('Unsupported type for a floppyvar!')
                            }
                        }
                        // Update if neeeded
                        if (eh) {
                            flagged = true
                            value = newValue
                        }
                    },
                    // The return method
                    publish: () => {
                        if (flagged && value != null) {
                            flagged = false
                            return value
                        }
                    },
                }
            }
            // This keeps track of the skills container
            const container = (player) => {
                //const skillTitles = [], skillNames = ['atk', 'hlt', 'spd', 'str', 'pen', 'dam', 'rld', 'mob', 'rgn', 'shi'],
                //      skillIndex = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
                //      skillInterface = [];
                //const skillsBuffer = new ArrayBuffer(skillNames.length * 2);
                //const skillData = new Uint8Array(skillsBuffer);
                //const skill = (index) => {
                //  return {
                //    change: (cap, trueCap) => {
                //      skillData[index] = cap;
                //      skillData[index + 1] = trueCap;
                //    },
                //    publish: () => {
                //      return [skillData[index], skillData[index + 1]];
                //    }
                //  }
                //}
                //let out = [];
                //
                //for (let i = 0; i < skillNames.length; i++) {
                //  skillTitles.push(skillNames[i]);
                //  skillInterface.push(skill(skillIndex[i]));
                //}


                let vars = [],
                    skills = player.body.skills,
                    out = [],
                    statnames = ['atk', 'hlt', 'spd', 'str', 'pen', 'dam', 'rld', 'mob', 'rgn', 'shi']
                // Load everything (b/c I'm too lazy to do it manually)
                for (let i = 0; i < 30; i++)
                    vars.push(floppy())


                return {
                    update: () => {
                        //const skills = player.body.get().skills;

                        let needsupdate = false, i = 0
                        // Update the things
                        for (let i = 0; i < statnames.length; i++) {
                            let a = statnames[i];
                            //if (flagged[i]) {
                            vars[i++].update(skills.title(a))
                            vars[i++].update(skills.cap(a))
                            vars[i++].update(skills.cap(a, true))
                            //}
                        }
                        /* This is a forEach and not a find because we need
                                * each floppy cyles or if there's multiple changes
                                * (there will be), we'll end up pushing a bunch of
                                * excessive updates long after the first and only
                                * needed one as it slowly hits each updated value
				*/

                        for (let e of vars)
                            if (e.publish() != null)
                                needsupdate = true

                        if (needsupdate) {
                            // Update everything
                            for (let a of statnames) {
                                out.push(skills.title(a))
                                out.push(skills.cap(a))
                                out.push(skills.cap(a, true))
                            }
                        }

                        //for (let i = 0; i < flagged.length; i++) {
                        //  if (flagged[i]) {
                        //    skillTitles[i] = skills.title(skillNames[i]);
                        //    skillInterface[i].change(skills.cap(skillNames[i]), skills.cap(skillNames[i], true));
                        //  }
                        //}

                        //for (let i = 0; i < 10; i++) {
                        //  out.push(skillTitles[i]);
                        //  const publish = skillInterface[i].publish();
                        //  out.push(publish[0]);
                        //  out.push(publish[1]);
                        //}
                    },
                    /* The reason these are seperate is because if we can
                            * can only update when the body exists, we might have
                            * a situation where we update and it's non-trivial
                            * so we need to publish but then the body dies and so
                            * we're forever sending repeated data when we don't
                            * need to. This way we can flag it as already sent
                            * regardless of if we had an update cycle.
			    */

                    publish: () => {
                        if (out.length) { let o = out.splice(0, out.length); out = []; return o; }
                    },
                }
            }
            // This makes a number for transmission
            const getstuff = (s) => {
                let val = (s.amount('atk') * 0x1)
                    + (s.amount('hlt') * 0x10)
                    + (s.amount('spd') * 0x100)
                    + (s.amount('str') * 0x1000)
                    + (s.amount('pen') * 0x10000)
                    + (s.amount('dam') * 0x100000)
                    + (s.amount('rld') * 0x1000000)
                    + (s.amount('mob') * 0x10000000)
                    + (s.amount('rgn') * 0x100000000)
                    + (s.amount('shi') * 0x1000000000)
                return val.toString(36)
            }
            // These are the methods
            const update = (gui) => {
                let b = gui.master.body;
                // We can't run if we don't have a body to look at
                if (!b || !b.identifiers) return 0
                gui.bodyid = b.identifiers.id;
                // Update most things
                gui.fps.update(fps)
                gui.color.update(gui.master.teamColor)
                gui.label.update(b.attributes.index)
                gui.score.update(b.skills.score)
                gui.points.update(b.skills.points)
                // Update the upgrades
                //for (let e of b.attributes.upgrades) {
                //    if (b.skills.level >= e.level) {
                //        upgrades.push(e.index)
                //    }
                //}
                let upgrades = []
                for (let i = 0; i < b.attributes.upgrades.length; i++) {
                    if (b.skills.level >= b.attributes.upgrades[i].level) {
                        upgrades.push(b.attributes.upgrades[i].index);
                    }
                }
                gui.upgrades.update(upgrades)
                // Update the stats and skills
                gui.stats.update();
                gui.skills.update(getstuff(b.skills))
                // Update physics
                gui.accel.update(b.attributes.acceleration)
                gui.topSpeed.update(b.attributes.topSpeed);
                gui.maxSpeed.update(b.physics.maxSpeed);
                gui.party.update(room.partyLinks[-b.identifiers.team - 1] || 0)
            }
            const publish = (gui) => {
                let o = {
                    fps: gui.fps.publish(),
                    label: gui.label.publish(),
                    score: gui.score.publish(),
                    points: gui.points.publish(),
                    upgrades: gui.upgrades.publish(),
                    color: gui.color.publish(),
                    statsdata: gui.stats.publish(),
                    skills: gui.skills.publish(),
                    accel: gui.accel.publish(),
                    party: gui.party.publish(),
                    topSpeed: gui.topSpeed.publish(),
                    maxSpeed: gui.maxSpeed.publish()
                }
                // Encode which we'll be updating and capture those values only
                let id = 0
                let out = []
                if (o.fps != null)      { id |= 0x0001; out.push(o.fps || 1); }
                if (o.label != null)    { id |= 0x0002; out.push(o.label, o.color || gui.master.teamColor, gui.bodyid); }
                if (o.score != null)    { id |= 0x0004; out.push(o.score); }
                if (o.points != null)   { id |= 0x0008; out.push(o.points); }
                if (o.upgrades != null) { id |= 0x0010; out.push(o.upgrades.length, ...o.upgrades); }
                if (o.statsdata != null){ id |= 0x0020; out.push(...o.statsdata); }
                if (o.skills != null)   { id |= 0x0040; out.push(o.skills); }
                if (o.accel != null)    { id |= 0x0080; out.push(o.accel); }
                if (o.party != null)    { id |= 0x0100; out.push(o.party); }
                if (o.topSpeed != null) { id |= 0x0200; out.push(o.topSpeed); }
                if (o.maxSpeed != null) { id |= 0x0400; out.push(o.maxSpeed); }
                out.unshift(id);
                // Output it
                return out
            }
            // This is the gui creator
            return (player) => {
                // This is the protected gui data
                let gui = {
                    master: player,
                    fps: floppy(),
                    label: floppy(),
                    score: floppy(),
                    points: floppy(),
                    upgrades: floppy(),
                    color: floppy(),
                    skills: floppy(),
                    party: floppy(),
                    accel: floppy(),
                    topSpeed: floppy(),
                    maxSpeed: floppy(),
                    stats: container(player),
                    bodyid: -1,
                }
                // This is the gui itself
                return {
                    update: () => update(gui),
                    publish: () => publish(gui),
                }
            }
        })()

        const newCommand = () => {
            const data = [false, false, false, false, false, false, false, false, false, false, false];
            const toggleMod = (toggle, value = null) => {
                let number = 0;
                if (toggle.toLowerCase() === 'autofire') {
                    number = 7;
                }
                if (toggle.toLowerCase() === 'autospin') {
                    number = 8;
                }
                if (toggle.toLowerCase() === 'autooverride') {
                    number = 9;
                }
                if (toggle.toLowerCase() === 'reversetank') {
                    number = 10;
                }
                if (toggle.toLowerCase() === 'reversemouse') {
                    number = 11;
                }
                if (value !== null) {
                    data[number] = value;
                }
                return data[number];
            }
            const obj = {};
            //getUp: () => data[0],
            //setUp: (up) => data[0] = up,
            property(obj, 'up', data, 0, false),
                //getDown: () => data[1],
                //setDown: (down) => data[1] = down,
                property(obj, 'down', data, 1, false),
                //getLeft: () => data[2],
                //setLeft: (left) => data[2] = left,
                property(obj, 'left', data, 2, false),
                //getRight: () => data[3],
                //setRight: (right) => data[3] = right,
                property(obj, 'right', data, 3, false),
                //getLMB: () => data[4],
                //setLMB: (lmb) => data[4] = lmb,
                property(obj, 'lmb', data, 4, false),
                //getMMB: () => data[5],
                //setMMB: (mmb) => data[5] = mmb,
                property(obj, 'mmb', data, 5, false),
                //getRMB: () => data[6],
                //setRMB: (rmb) => data[6] = rmb,
                property(obj, 'rmb', data, 6, false),
                //getAutoFire: () => data[7],
                //setAutoFire: (autofire) => data[7] = autofire,
                property(obj, 'autoFire', data, 7, false),
                //getAutoSpin: () => data[8],
                //setAutoSpin: (autospin) => data[8] = autospin,
                property(obj, 'autoSpin', data, 8, false),
                //getAutoOverride: () => data[9],
                //setAutoOverride: (autooverride) => data[9] = autooverride,
                property(obj, 'autoOverride', data, 9, false),
                //getReverseTank: () => data[10],
                //setReverseTank: (reversetank) => data[10] = reversetank,
                property(obj, 'reverseTank', data, 10, false),
                //getReverseMouse: () => data[11],
                //setReverseMouse: (reversemouse) => data[11] = reversemouse,
                property(obj, 'reverseMouse', data, 11, false),
                obj.swapToggle = (toggle, value) => toggleMod(toggle, value),
                obj.checkToggle = (toggle) => toggleMod(toggle);
            return obj;
        }

        const newRecords = () => {
            return (() => {
                let begin = util.time();
                return (player) => {
                    util.log(`${ player.body.attributes.name } died: ${ player.body.skills.score } points, ${ player.body.kills.solo } kills, ${ player.body.kills.assist } assists, ${ player.body.kills.boss } bosses`)
                    return [
                        player.body.skills.score,
                        Math.floor((util.time() - begin) / 1000),
                        player.body.kills.solo,
                        player.body.kills.assist,
                        player.body.kills.boss,
                        player.body.kills.killers.length,
                        ...player.body.kills.killers,
                    ]
                }
            })();
        }

        const newPlayer = () => {
            // team, body, teamColor, target, gui, socket, viewID
            let gui = null;
            const data = [null, null, null, null, null, null];
            const obj = {};
            //getTeam: () => data[0],
            //setTeam: (team) => data[0] = team,
            property(obj, 'team', data, 0, -1),
                //getBody: () => data[1],
                //setBody: (body) => data[1] = body,
                objectProperty(obj, 'body', data, 1, {}),
                //getTeamColor: () => data[2],
                //setTeamColor: (teamColor) => data[2] = teamColor,
                property(obj, 'teamColor', data, 2, 0),
                //getTarget: () => data[3],
                //setTarget: (target) => data[3] = target,
                arrayProperty(obj, 'target', data, 3, []),
                obj.command = newCommand(),
                obj.records = newRecords(),
                //getGUI: () => data[4],
                //setGUI: (gui) => data[4] = gui,
                //updateGUI: () => data[4].update(),
                //publishGUI: () => data[4].publish(),
                //gui: arrProperty(data, 4, null),
                //getSocket: () => data[5],
                //setSocket: (socket) => data[5] = socket,
                //objectProperty(obj, 'socket', data, 4, {}),
                property(obj, 'socket', data, 4, {}),
                //getViewID: () => data[6],
                //setViewID: (viewid) => data[6] = viewid,
                property(obj, 'viewID', data, 5, 0),
                obj.guiDefine = (newGUI) => gui = newGUI,
                obj.guiUpdate = () => gui.update(),
                obj.guiPublish =  () => gui.publish(),
                obj.guiGet = () => gui;
            //bodySendMessage: (message) => (data[1] !== null) ? data[1].sendMessage(message) : null,
            //bodyUpgrade: (number) => (data[1] !== null) ? EntityFunctions.upgrade(data[1], number) : null,
            //bodySkillUpgrade: (stat) => (data[1] !== null) ? EntityFunctions.skillUp(data[1], stat) : null,
            return obj;
        }

        return (socket, name, score) => {
            // team, body, teamColor, target, command, records, gui, socket,
            let player = newPlayer(), loc = [0, 0];

            player.team = socket.rememberedTeam;
            if (room.gameMode[0] === '2' || room.gameMode[0] === '3' || room.gameMode[0] === '4') {
                let teams = parseInt(room.gameMode[0]),
                    census = [];
                for (let i = 0; i < teams; i++) {
                    census.push(0);
                }

                for (let i = 0; i < Sockets.players.length; i++) {
                    census[Sockets.players[i].team]++;
                }

                let possibilities = [],
                    min = Infinity;
                for (let i = 0; i < teams; i++) {
                    if (census[i] < min) {
                        min = census[i];
                        possibilities = [];
                    }
                    if (census[i] === min) {
                        possibilities.push(i);
                    }
                }

                if (player.team === -1) {
                    player.team = ran.choose(possibilities) + 1;
                }
                let max = 25;

                if (room['bas' + player.team].length) {
                    do {
                        loc = room.randomType('bas' + player.team);
                    } while (dirtyCheck(loc, 60) && max--);
                } else {
                    do {
                        loc = room.gaussInverse(5);
                    } while (dirtyCheck(loc, 60) && max--);
                }
            } else {
                let max = 25;
                player.team = 0;
                do { loc = room.gaussInverse(5); } while (dirtyCheck(loc, 300) && max-- > 0);
            }

            let filter = Sockets.disconnections.filter(r => r.ip === socket.ip[0] && !r.body.health.amount <= 0);
            let saveState = 'die'; // we are not doing saving yet and i might make an option to disable it because i hate it due to me not being able to switch my tank
            let body;
            if (filter.length) {
                let recover = filter[0];
                util.remove(Sockets.disconnections, Sockets.disconnections.indexOf(recover));
                body = recover.body;
                player.team = -body.identifiers.team;
            } else if (room.lifetime.length) {
                body = room.lifetime.shift();
                player.team = -body.identifiers.team;
            } else {
                //body = makeEntity()(loc[0], loc[1]);
                body = entity(loc[0], loc[1]);
                EntityFunctions.protect(body);
                body.define(Class.basic);
                body.attributes.name = name;
                body.status.invuln = true;
                body.skills.score = score;
                setTimeout(() => body.status.invuln = false, 30e3);
            }
            body.skills.maintain();
            socket.rememberedTeam = player.team;
            player.body = body;

            switch (room.gameMode[0]) {
                case '2':
                case '3':
                case '4': {
                    body.identifiers.team = -player.team;
                    body.color = [10, 11, 12, 15][player.team -1];
                } break;
                default: {
                    body.color = 12;
                    if (room.gameMode !== 'duo') {
                        // (c.RANDOM_COLORS) ?
                        // ran.choose([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) : 12
                    } else if (room.singles.length === 0) {
                        room.singles.push(body);
                        body.deref.push(() => {
                            let i = room.singles.indexOf(body);
                            if (i !== -1) {
                                room.singles.splice(i, 1);
                            }
                        });
                    } else {
                        let mate = room.singles.shift();
                        body.identifiers.team = mate.identifiers.team;
                        player.team = -mate.identifiers.team;
                        body.deref.push(() => {
                            if (body !== null) {
                                room.singles.push(mate);
                                mate.deref.push(() => {
                                    let i = room.singles.indexOf(mate);
                                    if (i !== -1) {
                                        room.singles.remove(i);
                                    }
                                });
                            }
                        });
                        mate.deref.push(() => {
                            if (body !== null) {
                                room.singles.push(body);
                                body.deref.push(() => {
                                    let i = room.singles.indexOf(body);
                                    if (i !== -1) {
                                        room.singles.remove(i);
                                    }
                                });
                            }
                        });
                    }

                } break;
            }

            // this is to stop the frick ton of problems that occur to skills without this
            body.skills.reset();

            player.teamColor = (!c.RANDOM_COLORS && (room.gameMode === 'ffa' || room.gameMode === 'duo')) ? 10 : body.color;

            player.target = [0, 0];

            //let newg = newgui(player);
            //player.gui.set(newgui(player));
            player.guiDefine(newgui(player));
            //console.log(player.guiBuildNew());
            player.socket = socket;
            Sockets.players.push(player);
            socket.camera.x = body.physics.position[0]; socket.camera.y = body.physics.position[1]; socket.camera.fov = 2000;
            socket.status.spawned = true;
            EntityFunctions.become(body, player);
            body.sendMessage('You have spawned in! Welcome to the game.');
            body.sendMessage('You will be invincible until you move, shoot, or 3e30 seconds pass');
            if (c.SKILL_CHEAT_CAP > 0) {
                body.sendMessage("Press 'N' to level up instantly until level " + c.SKILL_CHEAT_CAP);
            }

            socket.talk('c', socket.camera.x, socket.camera.y, socket.camera.fov);
            return player;
        }
    })();
    const newStatus = () => {
        const data = [false, 0, true, 0, 0, false, true, util.time()];
        const obj = {};
        //getVerified: () => data[0],
        //setVerified: (verified) => data[0] = verified,
        property(obj, 'verified', data, 0, false),
            //getReceiving: () => data[1],
            //setReceiving: (receiving) => data[1] = receiving,
            property(obj, 'receiving', data, 1, 0),
            //getDeceased: () => data[2],
            //setDeceased: (deceased) => data[2] = deceased,
            property(obj, 'deceased', data, 2, true),
            //getSpawnScore: () => data[3],
            //setSpawnScore: (spawnScore) => data[3] = spawnScore,
            property(obj, 'spawnScore', data, 3, 0),
            //getRequests: () => data[4],
            //setRequests: (requests) => data[4] = requests,
            property(obj, 'requests', data, 4, 0),
            //getSpawned: () => data[5],
            //setSpawned: (spawned) => data[5] = spawned,
            property(obj, 'spawned', data, 5, false),
            //getFullLeaderboard: () => data[6],
            //setFullLeaderboard: (fullLeaderboard) => data[6] = fullLeaderboard,
            property(obj, 'fullLeaderboard', data, 6, true),
            //getLastHeartbeat: () => data[7],
            //setLastHeartbeat: (lastHeartbeat) => data[7] = lastHeartbeat,
            property(obj, 'lastHeartbeat', data, 7, util.time());
        return obj;
    }

    const newCamera = () => {
        const data = [0, 0, 0, 0, util.time(), 0, 2000, 0];
        const obj = {};
        //getX: () => data[0],
        //setX: (x) => data[0] = x,
        property(obj, 'x', data, 0, 0),
            //getY: () => data[1],
            //setY: (y) => data[1] = y,
            property(obj, 'y', data, 1, 0),
            //getVX: () => data[2],
            //setVX: (vx) => data[2] = vx,
            property(obj, 'vx', data, 2, 0),
            //getVY: () => data[3],
            //setVY: (vy) => data[3] = vy,
            property(obj, 'vy', data, 3, 0),
            //getLastUpdate: () => data[4],
            //setLastUpdate: (lastUpdate) => data[4] = lastUpdate,
            property(obj, 'lastUpdate', data, 4, util.time()),
            //getLastDowndate: () => data[5],
            //setLastDowndate: (lastDowndate) => data[5] = lastDowndate,
            property(obj, 'lastDowndate', data, 5, 0),
            //getFOV: () => data[6],
            //setFOV: (fov) => data[6] = fov,
            property(obj, 'fov', data, 6, 2000),
            property(obj, 'ping', data, 7, 0);
        return obj;
    }

    const makeView = (() => {
        /*const flatten = (data) => {
      let output = [data.type];

      if (data.type & 0x01) {
        output.push(
          data.facing, // 1: facing
          data.layer,  // 2: layer
        );
      } else {
        output.push(
          data.id,
          data.index,
          data.x,
          data.y,
          data.vx,
          data.vy,
          data.size,
          data.facing,
          data.vfacing,
          data.twiggle,
          data.layer,
          data.color,
          Math.ceil(255 * data.health),
          Math.round(255 * data.shield),
          Math.round(255 * data.alpha),
        );
        if (data.type & 0x04) {
          output.push(
            data.name,
            data.score,
          );
        }
      }

      let gundata = [data.guns.length];
      for (let i = 0; i < data.guns.length; i++) {
        let lastShot = data.guns[i];
        gundata.push(lastShot[0], lastShot[1]);
      }
      output.push(...gundata);

      let turdata = [data.turrets.length];
      for (let i = 0; i < data.turrets.length; i++) {
        let turret = data.turrets[i];
        turdata.push(...flatten(turret));
      }
      output.push(...turdata);

      return output;
    }*/

        const perspective = (e, player, data) => {
            if (player.body != null && player.body.identifiers != null) {
                if (player.body.identifiers.team === e.family.master.identifiers.team) {
                    data = data.slice();
                    data[12] = player.teamColor;

                    if (player.command.autoSpin) {
                        data[10] = 1;
                    } else if (player.command.reverseTank) {
                        data[10] = 2;
                    }
                }
            }
            return data;
        }

        const check = (camera, obj) => {
            return Math.abs(obj.physics.position[0] - camera.x) < camera.fov * 0.6 + 1.5 * obj.size() + 100 &&
                Math.abs(obj.physics.position[1] - camera.y) < camera.fov * 0.6 + 0.5625 + 1.5 * obj.size() + 100;
        }

        const confirm = (camera, obj) => {
            return Math.abs(obj.physics.position[0] - camera.x) < camera.fov / 2 + 1.5 * obj.size() &&
                Math.abs(obj.physics.position[1] - camera.y) < camera.fov / 2 * (9 / 16) + 1.5 * obj.size();
        }

        return (socket) => {
            //let lastVisibleUpdate = 0;
            //let x = -1000;
            //let y = -1000;
            //let fov = 0;
            //let nearby = [];
            // x, y fov
            let physics = [-1000, -1000, 0],
                visible = [],
                items = [],
                count = 0,
                viewid = VIEWID++;

            const organize = (index, size) => {
                for (let i = 0; i < items.length; i += 2) {
                    const info = items[i + 1];
                    if (info[0] > index) {
                        info[0] -= size;
                    }
                }
            }

            const o = {
                viewID: () => viewid,
                check: (e) => check(socket.camera, e),
                cycle: () => socket.loops.cycle(),
                add: (ff, id) => {
                    const item = [visible.length, ff.length];
                    for (let i = 0; i < ff.length; i++) {
                        visible.push(ff[i]);
                    }
                    items.push(id, item);
                    count++;
                },
                update: (ff, id) => {
                    const index = items.indexOf(id);
                    if (index !== -1) {
                        if (items[index + 1][1] !== ff.length) {
                            const c = items[index + 1][1] - ff.length;
                            if (c > 0) {
                                visible.splice(items[index + 1][0] + ff.length, c);
                            } else if (c < 0) {
                                for (let i = 0; i < -c; i++) {
                                    visible.splice(items[index + 1][0] + items[index + 1][1] + 1, 0, 0);
                                }
                            }
                            organize(items[index + 1][0], c);
                            items[index + 1][1] = ff.length;
                        }
                        for (let i = 0; i < ff.length; i++) {
                            visible[items[index + 1][0] + i] = ff[i];
                        }
                    } else {
                        util.error(viewid);
                        util.error(id);
                        throw new Error('Trying to update an entity which is not in view!');
                    }
                },
                remove: (id) => {
                    const index = items.indexOf(id);
                    if (index !== -1) {
                        visible.splice(items[index + 1][0], items[index + 1][1]);
                        organize(items[index + 1][0], items[index + 1][1]);
                        items.splice(index, 2);
                        count--;
                    }
                },
                //confirm: (e) => confirm(socket.camera, e),
                prepare: () => {
                    socket.status.receiving += 1;

                    if (socket.player.body != null) {
                        if (socket.player.body.health.amount <= 0) {
                            socket.status.spawnScore = Math.min(socket.player.body.skills.score * 2 / 3, 39454);
                            socket.talk('F', ...socket.player.records(socket.player));
                            socket.player.body = null;
                            socket.status.deceased = true;
                        } else {
                            if (physics[0] != socket.player.body.physics.camera[0] || physics[1] != socket.player.body.physics.camera[1]) {
                                socket.camera.x = socket.player.body.photo.cx,
                                    socket.camera.y = socket.player.body.photo.cy,
                                    socket.camera.vx = socket.player.body.photo.vx,
                                    socket.camera.vy = socket.player.body.photo.vy,
                                    physics[0] = socket.player.body.physics.camera[0];
                                physics[1] = socket.player.body.physics.camera[1];
                            }

                            if (physics[2] != socket.player.body.attributes.fov) {
                                socket.camera.fov += Math.max((socket.player.body.attributes.fov - socket.camera.fov) / 30, socket.player.body.attributes.fov - socket.camera.fov);
                                physics[2] = socket.camera.fov;
                            }

                            //if (physics[2] != socket.player.body.attributes.fov) {
                            //  socket.camera.fov = socket.camera.fov + Math.max((socket.player.body.attributes.fov - socket.camera.fov) / 30, socket.player.body.attributes.fov - socket.camera.fov);
                            //  physics[2] = socket.player.body.attributes.fov;
                            //}

                            if (socket.player.viewID != socket.player.body.identifiers.id) {
                                socket.player.viewID = socket.player.body.identifiers.id;
                            }
                        }
                    }
                    if (socket.player.body == null) {
                        if (physics[2] != 2000) {
                            socket.camera.fov += Math.max((2000 - socket.camera.fov) / 30, 2000 - socket.camera.fov);
                            physics[2] = socket.camera.fov;
                        }
                    }

                    socket.player.guiUpdate();

                    const output = ['u', room.lastCycle, physics[0], physics[1], physics[2], socket.camera.vx, socket.camera.vy].concat(socket.player.guiPublish().concat([count].concat(visible)));

                    return output;
                },
            }
            views.push(o);
            return o;
        }
    })();

    let ip = (req.headers['x-forwarded-for'] || '').split(', ').map(r => r.trim()).filter(r => r.length);
    if (req.connection.remoteAddress) {
        ip.push(req.connection.remoteAddress.replace(/^.*:/, ''));
    }

    if (ip == null) {
        console.log('Some connecting socket got really fricked up');
        socket.terminate();
    }

    for (let i = 0; i < ip.length; i++) {
        if (Sockets.banned[ip[i]]) {
            socket.terminate();
            return 1;
        }
    }

    let n = Sockets.connected[ip[0]];
    if (n) {
        if (n => 2 && ip[0] !== '1' && !arrasmark.active) {
            util.warn('Too many connections from the ip [' + ip.join(', ') + ']');
            socket.terminate();
            return 1;
        } else Sockets.connected[ip[0]]++;
    } else Sockets.connected[ip[0]] = 1;

    util.log(ip.join(', ') + ' is attempting to connect...');
    const data = [ip, 0, null, 0, 0, false, 0]

    //socket.getIP = () => data[0];
    arrProperty(socket, 'ip', data, 0, ip);
    socket.binaryType = 'arraybuffer',
        //socket.getPrivelage = () => data[1];
        //socket.setPrivelage = (privelage) => data[1] = privelage;
        arrProperty(socket, 'privelage', data, 1, 0);
    //socket.getIdentity = () => data[3];
    //socket.setIdentity = (identity) => data[3] = identity;
    arrProperty(socket, 'identity', data, 3, null);
    //socket.getTrack = () => data[4];
    //socket.setTrack = (track) => data[4] = track;
    arrProperty(socket, 'track', data, 4, 0);
    property(socket, 'anon', data, 5, false);
    property(socket, 'rememberedTeam', data, 6, -1);
    socket.player = { camera: {} },
        socket.status = newStatus();
    socket.camera = newCamera();

    arrProperty(socket, 'view', data, 2, 0);
    socket.makeView = () => { socket.view = makeView(socket); };
    socket.makeView();
    //console.log(socket.view.get());

    //socket.viewGaze = () => data[2].gaze();
    socket.ban = () => Sockets.SocketFunctions.Ban(socket);
    socket.kick = (reason) => Sockets.SocketFunctions.Kick(socket, reason);
    socket.talk = (...message) => Sockets.SocketFunctions.Talk(socket, false, ...message);
    socket.debugTalk = (...message) => Sockets.SocketFunctions.Talk(socket, true, ...message)
    socket.lastWords = (...message) => Sockets.SocketFunctions.LastWords(socket, ...message);
    socket.spawn = (name, score) => spawnPlayer(socket, name, score);

    socket.loops = (() => {
        let start = false;

        socket.uplink = () => {
            if (start) {
                if (socket.loops.frames.length > 0) {
                    const frame = socket.loops.frames.shift();
                    socket.talk.apply(socket, frame[1]);
                    socket.camera.lastUpdate = util.time();
                }
            }
        }


        socket.cycle = () => {
            if (start) {
                socket.loops.frames.push([util.time(), socket.view.prepare()]);
                setTimeout(socket.uplink, c.networkFallbackTime);
            }
        }

        function startup(time) {
            start = true;
        }

        let trafficMonitoring = setInterval(() => Sockets.SocketFunctions.Traffic(socket), 1500);
        Sockets.SocketFunctions.BroadcastLB_MM.subscribe(socket);
        let socketUpdating = setInterval(() => Sockets.SocketFunctions.SocketUpdate(socket), 500);

        return {
            frames: [],
            start: (time) => startup(time),
            cycle: () => socket.cycle(),
            update: () => socket.uplink(),
            schedule: () => socket.view.schedule(),
            terminate: () => {
                clearTimeout(trafficMonitoring),
                    Sockets.SocketFunctions.BroadcastLB_MM.unsubscribe(socket);
                clearTimeout(socketUpdating);
                start = false;
            }
        }
    })();

    //socket.start = (time => setTimeout(() => socket.loops.setExportation(), time);

    socket.begin = (time) => socket.loops.start(time);
    socket.update = () => socket.loops.update();

    /*
  socket.refresher = (() => {
    let updating = false;
    let trafficMonitoring = setInterval(() => Sockets.SocketFunctions.Traffic(socket), 1500);
    Sockets.SocketFunctions.BroadcastLB_MM.subscribe(socket);
    let socketUpdating = setInterval(() => Sockets.SocketFunctions.SocketUpdate(socket), 500);


    function nextUpdateTime() {
      // PING INCORPORATION COMING SOON + MULTIPLE UPDATE THINGS
      //if (!(socket.status.receiving < c.networkFrontLog)) t = c.networkFallbackTime;
      console.log(t);
      return t;
    }



    function update() {
      socket.view.gaze();

      if (updating) {
        //Timer.setTimeout(update, '', nextUpdateTime() + 'm');
        setTimeout(() => process.nextTick(update), nextUpdateTime());
      }
    }

    let o = {
      updating: (time) => setTimeout(() => { updating = true; update(); }, time),
      triggerUpdate: (time) => setTimeout(() => process.nextTick(socket.view.gaze), time),
      terminate: () => {
        updating = false;
        clearTimeout(socketUpdating);
        Sockets.SocketFunctions.BroadcastLB_MM.unsubscribe(socket);
        clearTimeout(trafficMonitoring);
      }
    }

    return o;
  })();
  */

    //socket.begin = (time) => socket.refresher.updating(time);
    //socket.update = (time) => socket.refresher.triggerUpdate(time);

    socket.on('message', message => Sockets.SocketFunctions.Incoming(socket, message));
    socket.on('close', () => { socket.loops.terminate(); Sockets.SocketFunctions.Close(socket); });
    socket.on('error', e => { util.log('[ERROR]:'); util.error(e); });

    Sockets.clients.push(socket);
    util.log('[INFO] New socket opened with ip ', socket.ip.join(', '));
    //socket.on('close', () => {
    //socket.on('message', message => Sockets.Incoming

    return socket;
}

Sockets.SocketFunctions.Broadcast = (message) => {
    for (let socket of Sockets.clients) {
        socket.talk('m', message);
    }
}

Sockets.SocketFunctions.BroadcastRoom = () => {
    for (let socket of Sockets.clients) {
        socket.talk('r', room.width, room.height, JSON.stringify(c.ROOM_SETUP));
    }
}

Sockets.SocketFunctions.Close = (socket) => {
    Sockets.connected[socket.ip[0]]--;
    if (Sockets.connected[socket.ip[0]] >= 0) {
        util.log(socket.ip.join(', ') + ' disconnected');
    } else {
        util.log('Ghost ' + socket.ip.join(', ') + 'disconnected');
        Sockets.connected[socket.ip[0]] = 0;
    }
    let player = socket.player,
        index = Sockets.players.indexOf(player);

    if (index !== -1) {
        if (player.body != null) {
            if (player.body.lifetime) {
                room.lifetime.push(player.body);
            } else {
                let disc = { body: player.body, ip: socket.ip[0] };
                Sockets.disconnections.push(disc);
                EntityFunctions.destroy(player.body);
            }
        }
    }

    util.remove(views, views.indexOf(socket.view));
    util.remove(Sockets.clients, Sockets.clients.indexOf(socket));
}

Sockets.SocketFunctions.Ban = (socket) => {
    console.log('Banned ' + socket.ip[0]);
}

Sockets.SocketFunctions.Kick = (socket, reason) => {
    console.log('Kicked ' + socket.ip[0] + ' for reason ' + reason);
    socket.send(Sockets.protocol.encode(['k']), { binary: true });
}

Sockets.SocketFunctions.Talk = (socket, debug, ...message) => {
    if (socket.readyState === socket.OPEN) {
        if (debug) {
            console.log(...message);
        }
        //let type = message[0];
        //if (type === 'w') socket.stream[0] |= 0x0001;
        //if (type === 'R') socket.stream[0] |= 0x0002;
        //if (type === 'r') socket.stream[0] |= 0x0004;
        //if (type === 'e') socket.stream[0] |= 0x0008;
        //if (type === 'c') socket.stream[0] |= 0x0010;
        //if (type === 'S') socket.stream[0] |= 0x0020;
        //if (type === 'm') socket.stream[0] |= 0x0040;
        //if (type === 'u') socket.stream[0] |= 0x0080;
        //if (type === 'b') socket.stream[0] |= 0x0100;
        //if (type === 'p') socket.stream[0] |= 0x0200;
        //if (type === 'F') socket.stream[0] |= 0x0400;
        //if (type === 'K') socket.stream[0] |= 0x0800;
        //console.log('Sending data...');
        socket.send(Sockets.protocol.encode(message), { binary: true });
    }
}

Sockets.SocketFunctions.LastWords = (socket, ...message) => {
    if (socket.readyState === socket.OPEN) {
        socket.send(Sockets.protocol.encode(message), { binary: true }, () => setTimeout(() => socket.terminate(), 1000));
    }
}

Sockets.SocketFunctions.Traffic = (socket) => {
    let strikes = 0;

    return () => {
        if (util.time() - socket.status.lastHeartbeat > c.maxHeartbeatInterval) {
            socket.kick('Heartbeat lost'); return 0;
        }

        if (socket.status.requests > 50) {
            strikes++;
        } else {
            strikes = 0;
        }

        if (strikes > 3) {
            socket.kick('Socket traffic volume violation'); return 0;
        }

        socket.status.requests = 0;
    }
}

let errorVerbose = false;
let verboseOutput = 'Loaded in verbose for: ';
let addVerbose = (thing) => verboseOutput = verboseOutput.concat(thing + ', ');
const verbose = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
];

for (let i = 0; i < c.verbose.length; i++) {
    let v = c.verbose[i];
    addVerbose(v);
    switch (v) {
        case 'error':
            errorVerbose = true;
            break;
        case 'key':
            verbose[0] = true;
            break;
        case 'spawn':
            verbose[1] = true;
            break;
        case 'clocksync':
            verbose[2] = true;
            break;
        case 'ping':
            verbose[3] = true;
            break;
        case 'downlink':
            verbose[4] = true;
            break;
        case 'tracker':
            verbose[5] = true;
            break;
        case 'command':
            verbose[6] = true;
            break;
        case 'toggle':
            verbose[7] = true;
            break;
        case 'upgrade':
            verbose[8] = true;
            break;
        case 'skillup':
            verbose[9] = true;
            break;
        case 'desync':
            verbose[10] = true;
            break;
        case 'all':
            errorVerbose = true;
            verbose.fill(true);
            break;
        case 'all-error':
            verbose.fill(true);
            break;
    }
}

if (verboseOutput.length !== 23) {
    verboseOutput = verboseOutput.substring(0, verboseOutput.length - 2);
    util.log(verboseOutput);
} else {
    util.log('Loaded in verbose for nothing');
}

Sockets.SocketFunctions.Incoming = (socket, data) => {
    if (!(data instanceof ArrayBuffer)) { socket.kick('Non-binary packet'); return 1; };

    let m = Sockets.protocol.decode(data);

    if (m === -1) { socket.kick('Malformed packet'); return 1; };
    socket.status.requests += 1;

    /*
  let packets = [];
  let packet = [];

  for (let i = 0; i < _m.length; i++) {
    if (_m[i] === '_') { // new system
      packets.push(packet);
      packet = [];
    } else {
      packet.push(_m[i]);
      if (i == _m.length - 1) { // old system + new system
        packets.push(packet);
        packet = [];
      }
    }
  }
  */

    let player = socket.player;

    //for (let i = 0; i < packets.length; i++) {
    //let m = _m;
    if (typeof m[0] !== 'string') {
        util.error(m);
        util.error(m[0]);
        throw "Fricked up packet";
    }

    switch (m.shift()) {
        case 'k': {
            //socket.start();
            if (verbose[0] === true) console.log('The client has sent us a key request');
            if (m.length > 1) { socket.kick('Ill-sized key request'); return 1; };
            // arena closed
            if (m.length === 0) {
                if (verbose[0] === true) console.log('No key was provided');
                util.log('[INFO] A socket was connected');
            } else if (m.length === 1) {
                if (typeof m[0] !== 'string') { socket.kick('Ill-typed key request'); return 1; };
                let key = m[0].trim();
                let parts = key.split('$');
                let id = parts[0];
                if (verbose[0] === true) console.log('They provided the key ' + key);
                util.log('[INFO] A socket was connected with the token ' + key);
                if (parts.length === 2 && runHash(id) === key) {
                    let p = calculateAccess(id);
                    let user = null;
                    socket.identity = ((user) ? user.username : 'some lil tester man');
                    socket.privilege = p;
                    util.log('[INFO] ' + socket.identity + ' connected, who has level ' + socket.privilege + ' beta tester.');
                }
            }
            if (c.IS_BETA === 2 && socket.privilege === 0) {
                //socket.lastWords('w', false, 'This server seems to be private');
                socket.send(Sockets.protocol.encode(['w', false, 'This server seems to be private.']), { binary: true });
            } else {
                socket.send(Sockets.protocol.encode(['w', true]), { binary: true });
                //socket.talk('w', true);
            }
            util.log('Clients: ' + Sockets.clients.length);
        } break;
        case 's': {
            if (verbose[1] === true) console.log('The client has sent us a spawn request');
            if (!socket.status.deceased) { socket.kick('Trying to spawn while already alive'); return 1; };
            if (m.length !== 2) { socket.kick('Ill-sized spawn request'); return 1; };
            // arena closed

            let name = m[0], needsRoom = m[1];

            if (typeof name !== 'string' || typeof needsRoom !== 'number' || needsRoom !== Math.floor(needsRoom) || needsRoom < -1) { socket.kick('Bad spawn request'); return 1; };
            if (name.length > 36) { socket.kick('Overly-long name'); return 1; };
            if (verbose[1] === true) console.log('Their name is ' + name + ' and they ' + ((needsRoom) ? 'do' : "don't") + ' need a room');

            name = name.replace(/[\x00\u200B\u200E\u200F\u202A-\u202E\uFDFD\uFFFD-\uFFFF]/g, '');

            if (socket.identity) {
                // do the log thing
            }

            socket.status.deceased = false;

            //if (Sockets.players.indexOf(socket.player) !== -1) { Sockets.players.remove(Sockets.players.indexOf(socket.player)); };
            //if (views.indexOf(socket.view) !== -1) { views.remove(views.indexOf(socket.view)); socket.makeView(); };
            if (Sockets.players.indexOf(socket.player) !== 1) { util.remove(Sockets.players, Sockets.players.indexOf(socket.player)); };
            if (views.indexOf(socket.view) !== -1) { util.remove(views, views.indexOf(socket.view)); socket.makeView(); };

            if (needsRoom !== -1) {
                if (needsRoom !== 0) {
                    let team = room.partyLinks.indexOf(needsRoom);
                    if (team === -1) {
                        socket.talk('m', 'Invalid party link');
                    } else {
                        socket.rememberedTeam = team + 1;
                        // set the remembered team
                    }
                }
                socket.talk(
                    'R',
                    room.width,
                    room.height,
                    JSON.stringify(c.ROOM_SETUP),
                    JSON.stringify(util.serverStartTime),
                    ROOMSPEED
                );
            }

            socket.player = socket.spawn(name, socket.status.spawnScore);
            //socket.update(1750);
            socket.begin(0);

            util.log(`[INFO] ${ m[0] } ${ needsRoom !== -1 ? 'joined' : 'rejoined' } the game! IP: ${ socket.ip[0] } Players: ${ Sockets.players.length }`);
        } break;
        case 'S': {
            if (verbose[2] === true) console.log('The client has sent us a clock syncing packet');
            if (m.length !== 1) { socket.kick('Ill-sized sync packet'); return 1; };

            let syncTick = m[0];
            if (verbose[2] === true) console.log("It's sync tick is " + syncTick);

            if (typeof syncTick !== 'number') { socket.kick('Wierd sync packet'); return 1; };

            socket.talk('S', syncTick, util.time());
        } break;
        case 'p': {
            if (verbose[3] === true) console.log('The client has sent us a ping packet');
            if (m.length !== 1) { socket.kick('Ill-sized ping'); return 1; };

            let ping = m[0];
            if (verbose[3] === true) console.log('The ping of this is ' + ping);

            if (typeof ping !== 'number') { socket.kick('Wierd ping'); return 1; };

            socket.talk('p', m[0]);
            socket.status.lastHeartbeat = util.time();
        } break;
        case 'd': {
            if (verbose[4] === true) console.log('The client has sent us a downlink packet');
            if (m.length !== 1) { socket.kick('Ill-sized downlink'); return 1; };

            let time = m[0];
            if (verbose[4] === true) console.log('The time value on this is ' + time);

            if (typeof time !== 'number') { socket.kick('Bad downlink'); return 1; };

            socket.status.receiving = 0;
            socket.camera.ping = util.time() - time;

            setTimeout(socket.uplink,
                Math.max(0, room.nextCycle - util.time(), room.networkSpeed - (socket.camera.lastUpdate - socket.camera.lastDowndate))
            );
            socket.camera.lastDowndate = util.time();
        } break;
        case 'T': {
            if (verbose[5] === true) console.log('The client has sent as a tracker packet');
            if (m.length !== 1) { socket.kick('Ill-sized tracker'); return 1; };
            util.log('Evaluation result');
            util.log(m[0]);
            socket.track = m[0];
        } break;
        case 'C': {
            if (verbose[6] === true) console.log('The client has sent us a command packet');
            if (m.length !== 3) { socket.kick('Ill-sized command packet'); };

            let target = [m[0], m[1]],
                commands = m[2];

            if (typeof target[0] !== 'number' || typeof target[1] !== 'number' || typeof commands !== 'number') { socket.kick('Wierd downlink'); return 1; };
            if (commands >= 255) { socket.kick('Malformed command packet'); return 1; };
            if (verbose[6] === true) console.log('The target of this is ' + target + ' and the commands data it sent is ' + commands);

            if (player.target != null) {
                player.target[0] = target[0], player.target[1] = target[1];
            }

            if (player.command != null && player.body != null) {
                player.command.up = (commands & 1);
                player.command.down = (commands & 2) >> 1;
                player.command.left = (commands & 4) >> 2;
                player.command.right = (commands & 8) >> 3;
                player.command.lmb = (commands & 16) >> 4;
                player.command.mmb = (commands & 32) >> 5;
                player.command.rmb = (commands & 64) >> 6;
            }

            // socket timeout set commands
        } break;
        case 't': {
            if (verbose[7] === true) console.log('The client sent us a toggle change packet');
            if (m.length !== 1) { socket.kick('Ill-sized toggle'); return 1; };
            console.log('toggle');
            console.log(m);

            let given = '', human = '',
                tog = m[0];
            if (verbose[7] === true) console.log('The toggle id number is ' + tog);

            if (typeof tog !== 'number') { socket.kick('Wierd toggle'); return 1; };

            switch (tog) {
                case 0: human = 'Autospin'; given = 'autospin'; break;
                case 1: human = 'Autofire'; given = 'autofire'; break;
                case 2: human = 'Override'; given = 'autooverride'; break;
                case 3: human = 'Reverse mouse'; given = 'reversemouse'; break;
                case 4: human = 'Reverse tank'; given = 'reversetank'; break;
                default: socket.kick('Bad toggle'); return 1; break;
            }

            if (player.command != null && player.body != null) {
                player.command.swapToggle(given, !player.command.checkToggle(given));

                player.body.sendMessage((human + ' ') + ((player.command.checkToggle(given)) ? 'enabled' : 'disabled'));
            }
        } break;
        case 'U': {
            if (verbose[8] === true) console.log('The client has sent us an upgrade packet');
            if (m.length !== 1) { socket.kick('Ill-sized upgrade request'); return 1; };
            console.log('upgrade');

            let number = m[0];
            if (verbose[8] === true) console.log('The id of this upgrade is ' + number);

            if (typeof number !== 'number' || number < 0) { socket.kick('Bad upgrade request'); return 1; };

            if (player.body != null) {
                //player.body.apply('upgrade', number);
                EntityFunctions.upgrade(player.body, number);
                player.guiUpdate();
                //player.gui.apply('update');
            }
        } break;
        case 'x': {
            if (verbose[9] === true) console.log('The client has sent us a skill upgrade packet');
            if (m.length !== 1) { socket.kick('Ill-sized skill request'); return 1; };
            let number = m[0], stat = '';
            if (verbose[9] === true) console.log('The number of this is ' + number);

            switch (number) {
                case 0: stat = 'atk'; break;
                case 1: stat = 'hlt'; break;
                case 2: stat = 'spd'; break;
                case 3: stat = 'str'; break;
                case 4: stat = 'pen'; break;
                case 5: stat = 'dam'; break;
                case 6: stat = 'rld'; break;
                case 7: stat = 'mob'; break;
                case 8: stat = 'rgn'; break;
                case 9: stat = 'shi'; break;
                default: socket.kick('Unknown skill upgrade request'); return 1; break;
            }

            if (player.body != null) {
                //player.body.apply('skillUp', (stat));
                EntityFunctions.skillUp(player.body, stat);
                player.guiUpdate();
                //player.gui.apply('update');
            }
        } break;
        case 'z': {
            if (verbose[10] === true) console.log('The client has sent us a leaderboard-desync packet');
            if (m.length !== 0) { socket.kick('Ill-sized leaderboard-desync request'); return 1; };

            socket.status.fullLeaderboard = true;
        } break;
        case 'L': {
            if (m.length !== 0) { socket.kick('Ill-sized level up request'); return 1; }

            if (player.body != null) {
                if (socket.privilege >= 3 || player.body.skills.level < c.SKILL_CHEAT_CAP) {
                    player.body.skills.score += player.body.skills.levelScore();
                    player.body.skills.maintain();
                    EntityFunctions.refresh(player.body);
                }
            }
        } break;
        case 'K': {
            if (m.length !== 0) { socket.kick('Ill-sized suicide request'); return 1; };

            if (player.body != null) {
                player.body.status.invuln = false;
                EntityFunctions.kill(player.body);
            }
        } break;
        case '0': {
            if (m.length !== 0) { socket.kick('Ill-sized developer request'); return 1; };

            if (socket.player.body != null && socket.privilege !== 0) {
                socket.player.body.identity = socket.identity;
                for (let i = 0; i < entities.length; i++) {
                    if (entities[i].attributes.settings.clearOnMasterUpgrade && entities[i].family.master.identifiers.id === socket.player.body.identifiers.id) {
                        EntityFunctions.kill(entities[i]);
                    }
                }
            }

            socket.player.body.skills.update();
            EntityFunctions.refresh(socket.player.body);
            if (socket.privilege <= 2) {
                for (let i = 0; i < socket.player.body.family.children.length; i++) {
                    EntityFunctions.kill(socket.player.body.family.children[i]);
                }
                socket.player.body.define(Class.betaTester);
                socket.talk('m', 'Here are the beta tanks');
            } else if (socket.privilege <= 3) {
                if (socket.player.body.attributes.name.startsWith('\u200B')) {
                    socket.player.body.define(Class.developer);
                } else if (socket.player.body.attributes.label === 'Booster') {
                    socket.player.body.define(Class.boosterUndercover);
                    for (let i = 0; i < entities.length; i++) {
                        if (util.getDistance(socket.player.body.physics.position, entities[i].physics.position) < 40000) {
                            entities[i].sendMessage('WOOP WOOP! That\'s the sound of da police!');
                        }
                    }
                } else {
                    socket.player.body.define({
                        INVISIBLE: [0.06, 0.01],
                        SKILL: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
                        BODY: {
                            HEALTH: 160,
                            FOV: 3,
                            SPEED: 7
                        },
                        CAN_GO_OUTSIDE_ROOM: true
                    });
                }
                if (!socket.player.body.attributes.name.startsWith('\u200B\u200B')) {
                    socket.player.body.attributes.name = '\u200B' + socket.player.body.attributes.name;
                }
                if (c.IS_BETA !== 2) {
                    socket.player.body.attributes.leaderboardable = false;
                    socket.talk('m', 'Friendly reminder: Please do not repeatedly kill others with an overpowered tank.');
                }
            }
        } break;
        default: {
            console.log(m);
            socket.kick('Bad packet index'); return 1;
        } break;
    }
}

Sockets.SocketFunctions.HotReload = () => {
    for (let i = 0; i < Sockets.clients.length; i++) {
        Sockets.clients[i].talk('W');
    }
}

Sockets.SocketFunctions.BroadcastLB_MM = (() => {
    /*
  let readlb;

  const getMinimap = (() => {
    let all = [
      [], // walls
      [], // players
      [], // minibosses
    ];
    let updateMaze = () => {
      let walls = all[0] = [];
      for (let i = 0; i < entities.length; i++) {
        let my = entities[i];
        if (my.attributes.type === 'wall' && /* alpha  1) {
          all[0].push(
            my.attributes.shape === 4 ? 2 : 1,
            my.identifiers.id,
            util.clamp(Math.floor(256 * my.physics.position[0] / room.width), 0, 255),
            util.clamp(Math.floor(256 * my.physics.position[1] / room.width), 0, 255),
            my.color,
            Math.round(my.attributes.size)
          );
        }
      }
    }
    setTimeout(updateMaze, 2500);
    setTimeout(updateMaze, 10000);
    setInterval(() => {
      let minimaps = all[1] = { [1]: [], [2]: [], [3]: [], [4]: [] };
      let minibosses = all[2] = [];
      for (let i = 0; i < entities.length; i++) {
        let my = entities[i];
        if (my.attributes.type === 'miniboss') {
          all[2].push(
            0,
            my.identifiers.id,
            util.clamp(Math.floor(256 * my.physics.position[0] / room.width), 0, 255),
            util.clamp(Math.floor(256 * my.physics.position[1] / room.width), 0, 255),
            my.color
          );
        } else if (my.attributes.type === 'tank' && -1 >= my.identifiers.team && my.identifiers.team >= -4 && my.family.master === my) {
          minimaps[-my.identifiers.team].push(
            0,
            my.identifiers.id,
            util.clamp(Math.floor(256 * my.physics.position[0] / room.width), 0, 255),
            util.clamp(Math.floor(256 * my.physics.position[1] / room.width), 0, 255),
            my.color
          );
        }
      }
  }, 250)
  return all;
  })();

  const getLeaderboard = (() => {
    let lb = [
      [], // full
      [], // updates
    ];

    let list = [];

    const listify = (instance) => {
      if (instance.attributes.settings.leaderboardable && instance.attributes.settings.drawShape && (instance.attributes.type === 'tank' || instance.kills.solo || instance.kills.assist)) {
        list.push(instance);
      }
    }

    let flatten = (() => {
      const leaderboard = {};

      const indices = (() => {
        let data = [], removed = [];

        return {
          flag: () => {
            for (let i = 0; i < data.length; i++) {
              data[i].status = -1;
            }
            if (data == null) { data = []; };
          },
          cull: () => {
            removed = [];
            data = data.filter(index => {
              let doit = index.status === -1;
              if (doit) {
                removed.push(index.id);
              }
              return !doit;
            });
            return removed;
          },
          add: (id) => {
            data.push({ id: id, status: 1 });
          },
          stabilize: (id) => {
            data.find(index => {
              return index.id === id;
            }).status = 0;
          }
        }
    })();

    const process = (() => {
      const barColor = (entry) => {
        switch (entry.identifiers.team) {
          case -100: return entry.color;
          case -1: return 10;
          case -2: return 11;
          case -3: return 12;
          case -4: return 15;
          default: {
            if (room.gameMode[0] === '2' || room.gameMode[0] === '3' || room.gameMode[0] === '4') {
              return entry.color;
            }
            return 11;
          }
        }
      }

      const getFull = (entry) => {
        return [
          entry.identifiers.id,
          Math.round(entry.skills.score),
          entry.attributes.index,
          entry.attributes.name,
          entry.color,
          barColor(entry)
        ];
      }

      return {
        normal: (entry) => {
          let id = entry.identifiers.id,
              score = Math.round(entry.skills.score);
          let lb = leaderboard['_' + id];
          if (lb != null) {
            indices.stabilize(id);

            if (lb.score !== score || lb.index !== entry.attributes.index) {
              lb.score = score;
              lb.index = entry.attributes.index;

              return [
                id,
                score,
                entry.index
              ];
            }
          } else {
            indices.add(id);
            leaderboard['_' + id] = {
              score: score,
              name: entry.attributes.name,
              index: entry.attributes.index,
              color: entry.color,
              bar: barColor(entry)
            }

            return getFull(entry);
          }
        },
        full: (entry) => getFull(entry)
      }
    })();

    return (data) => {
      indices.flag();

      let orders = data.map(process.normal).filter(e => e),
          refresh = data.map(process.full).filter(e => e),
          flatorders = [],
          flatrefresh = [];
      for (let i = 0; i < orders.length; i++) {
        flatorders.push(...orders[i]);
      }
      for (let i = 0; i < refresh.length; i++) {
        flatrefresh.push(...refresh[i]);
      }

      let removed = indices.cull();

      for (let i = 0; i < removed.length; i++) {
        delete leaderboard['_' + removed[i]];
      }

      return {
        updates: [removed.length, ...removed, orders.length, ...flatorders],
        full: [-1, refresh.length, ...flatrefresh]
      }
    }
  })();

  return () => {
    list = [];

    for (let i = 0; i < entities.length; i++) {
      listify(entities[i]);
    }

    let topTen = [];
    for (let i = 0; i < 10 && list.length; i++) {
      let top, is = 0;
      for (let j = 0; j < list.length; j++) {
        let val = list[j].skills.score;
          if (val > is) {
            is = val;
            top = j;
          }
      }

      if (is === 0) {
        break;
      }

      topTen.push(list[top]);
      list.splice(top, 1);
    }
    room.topPlayerID = (topTen.length) ? topTen[0].identifiers.id : -1;
    lb = flatten(topTen);

    return full => full ? lb.full : lb.updates;
  }
})();

setInterval(() => readlb = getLeaderboard(), 1000);
readlb = getLeaderboard();

return socket => {
  if (socket.status.spawned) {
    //let { walls, players, minibosses } = getMinimap;
    let mm = getMinimap;
    let walls = mm[0], players = mm[1], minibosses = mm[2];
    let lb = readlb(socket.status.fullLeaderboard);
    socket.status.fullLeaderboard = false;
    //socket.talk('b', ...walls, ...(players[socket.player.team.get()] || []), ...minibosses, -1, ...lb);
  }
}
*/
    function getBarColor(entry) {
        switch (entry.identifiers.team) {
            case -100: return entry.color;
            case -1: return 10;
            case -2: return 11;
            case -3: return 12;
            case -4: return 15;
            default: return ((room.gameMode[0] === '2' || room.gameMode[0] === '3' || room.gameMode[0] === '4') ? entry.color : 11);
        }
    }

    function Delta(_dataLength, _finder) {
        let dataLength = _dataLength,
            finder = _finder,
            now = finder();

        return {
            update: function() {
                let old = now;
                now = finder();

                let oldIndex = 0,
                    nowIndex = 0,
                    updates = [],
                    updatesLength = 0,
                    deletes = [],
                    deletesLength = 0;

                while (oldIndex < old.length && nowIndex < now.length) {
                    let oldElement = old[oldIndex],
                        nowElement = now[nowIndex];

                    if (oldElement.id === nowElement.id) {
                        nowIndex++;
                        oldIndex++;

                        let updated = false;
                        for (let i = 0; i < dataLength; i++) {
                            if (oldElement.data[i] !== nowElement.data[i]) {
                                updated = true;
                                break;
                            }
                        }

                        if (updated) {
                            updates.push(nowElement.id, ...nowElement.data);
                            updatesLength++;
                        }
                    } else if (oldElement.id < nowElement.id) {
                        deletes.push(oldElement.id);
                        deletesLength++;
                        oldIndex++;
                    } else {
                        updates.push(nowElement.id, ...nowElement.data);
                        updatesLength++;
                        nowIndex++;
                    }
                }

                for (let i = oldIndex; i < old.length; i++) {
                    deletes.push(old[i].id);
                    deletesLength++;
                }

                for (let i = nowIndex; i < now.length; i++) {
                    updates.push(now[i].id, ...now[i].data);
                    updatesLength++;
                }

                let reset = [0, now.length];
                for (let i = 0; i < now.length; i++) {
                    reset.push(now[i].id, ...now[i].data);
                }
                let update = [deletesLength, ...deletes, updatesLength, ...updates];
                return { reset, update };
            }
        }
    }

    const minimapAll = Delta(5, function() {
        let all = [];
        for (let i = 0; i < entities.length; i++) {
            let my = entities[i];
            if ((my.attributes.type === 'wall' && /*alpha*/ 1) || my.attributes.type === 'miniboss' || (my.attributes.type === 'tank' && my.attributes.lifetime)) {
                all.push({
                    id: my.identifiers.id,
                    data: [
                        (my.attributes.type === 'wall') ? (my.attributes.shape === 4) ? 2 : 1 : 0,
                        util.clamp(Math.floor(256 * my.physics.position[0] / room.width),  0, 255),
                        util.clamp(Math.floor(256 * my.physics.position[1] / room.height), 0, 255),
                        my.color,
                        Math.round(my.attributes.size)
                    ]
                });
            }
        }
        return all;
    });

    const minimapTeams = [1, 2, 3, 4].map((team) => Delta(3, function() {
        let all = [];
        for (let i = 0; i < entities.length; i++) {
            let my = entities[i];
            if (my.type === 'tank' && my.team === -team && my.family.master === my && !my.attributes.lifetime) {
                all.push({
                    id: my.identifiers.id,
                    data: [
                        util.clamp(Math.floor(256 * my.physics.position[0] / room.width),  0, 255),
                        util.clamp(Math.floor(256 * my.physics.position[1] / room.height), 0, 255),
                        my.color
                    ]
                });
            }
        }
        return all;
    }));

    const leaderboard = Delta(5, function() {
        let list = [];
        for (let i = 0; i < entities.length; i++) {
            let instance = entities[i];
            if (instance.attributes.settings.leaderboardable && instance.attributes.settings.drawShape && (instance.attributes.type === 'tank' || instance.kills.solo || instance.kills.assist)) {
                list.push(instance);
            }
        }

        let topTen = [];
        for (let i = 0; i < 10 && list.length; i++) {
            let top, is = 0;
            for (let j = 0; j < list.length; j++) {
                let val = list[j].skills.score;
                if (val > is) {
                    is = val;
                    top = j;
                }
            }

            if (is === 0) break;
            let entry = list[top];
            topTen.push({
                id: entry.identifiers.id,
                data: [
                    Math.round(entry.skills.score),
                    entry.attributes.index,
                    entry.attributes.name,
                    entry.color,
                    getBarColor(entry)
                ]
            });
            list.splice(top, 1);
        }
        room.topPlayerID = (topTen.length) ? topTen[0].id : -1;

        return topTen.sort((a, b) => a.id - b.id);
    });

    let subscribers = [];
    function update() {
        let minimapUpdate = minimapAll.update(),
            minimapTeamUpdates = minimapTeams.map((r) => r.update()),
            leaderBoardUpdate = leaderboard.update();
        for (let i = 0; i < subscribers.length; i++) {
            let socket = subscribers[i];
            if (!socket.status.spawned) continue;
            let team = minimapTeamUpdates[socket.player.team - 1];
            if (socket.status.fullLeaderboard) {
                socket.talk('b',
                    ...minimapUpdate.reset,
                    ...((team) ? team.reset : [0, 0]),
                    ...((socket.anon) ? [0, 0] : leaderBoardUpdate.update)
                );
                socket.status.fullLeaderboard = false;
            } else {
                socket.talk('b',
                    ...minimapUpdate.update,
                    ...((team) ? team.update : [0, 0]),
                    ...((socket.anon) ? [0, 0] : leaderBoardUpdate.update)
                );
            }
        }
    }
    setInterval(update, 250);

    return {
        subscribe: function(socket) {
            subscribers.push(socket);
        },
        unsubscribe: function(socket) {
            let i = subscribers.indexOf(socket);
            if (i !== -1) {
                util.remove(subscribers, i);
            }
        }
    }
})();

Sockets.SocketFunctions.SocketUpdate = (socket) => {
    // minimap and leaderboard stuff which doesnt exist right now

    let time = util.time();

    for (let socket of Sockets.clients) {
        // the sockets timeout check thing
        if (time - socket.status.lastHeartbeat > c.maxHeartbeatInterval) socket.kick('Lost heartbeat');
    }
}

//let SERVER_WORKER = false, LOOP_WORKER = false;
//if (cluster.isMaster) {
//  let WebServerWorker = cluster.fork({WorkerName: 'serverworker'}), LoopHandlerWorker = cluster.fork({WorkerName: 'loopworker'});
//
//  cluster.on('exit', function(worker, code, signal) {
//    if (worker === WebServerWorker) WebServerWorker = cluster.fork({WorkerName: 'serverworker'});
//    if (worker === LoopHandlerWorker) LoopHandlerWorker = cluster.fork({WorkerName: 'loopworker'});
//  });
//} else {
//  if (process.env.WorkerName === 'serverworker') {
//    SERVER_WORKER = true;
//  }
//  if (process.env.WorkerName === 'loopworker') {
//    LOOP_WORKER = true;
//  }
//}

const http = require('http'),
    http2 = require('http2'),
    url = require('url'),
    WebSocket = require('ws');
    /*credentials = {
        key: fs.readFileSync('key.pem', 'utf8'),
        cert: fs.readFileSync('cert.pem', 'utf8')
    };*/

const { PerformanceObserver, performance } = require('perf_hooks');

//if (SERVER_WORKER) {
let server = http.createServer((req, res) => {
    let { pathname } = url.parse(req.url)
    let ip = (req.headers['x-forwarded-for'] || '').split(',').map(r => r.trim()).filter(r => r.length)
    if (req.connection.remoteAddress)
        ip.push(req.connection.remoteAddress.replace(/^.*:/, ''))
    util.log("Responding to HTTP request " + pathname + " from " + ip)
    let path = pathname.replace(/\/+$/, '')
    switch (path) {
        case '':
            res.writeHead(200)
            res.end('<!DOCTYPE html>Mkay.')
            break
        case '/probe':
            res.writeHead(200)
            let data = {
                up: true,
                name: room.name,
                ok: fps === 1,
                speed: fps,
                clients: Sockets.clients.length,
                uptime: process.uptime(),
                mode: room.gameMode,
            }
            res.end(JSON.stringify(data))
            break
        case '/mockups.json':
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cache-Control', 'public, max-age=2592000, no-cache')
            res.setHeader('ETag', mockupJsonEtag)

            if (req.headers['if-none-match'] !== mockupJsonEtag) {
                res.writeHead(200)
                res.end(mockupJsonData)
            } else {
                res.writeHead(304)
                res.end()
            }
            break
        case '/server.js':
        case '/lib/definitions.js':
            let key = Buffer.from((req.headers.authorization || '').split(' ')[1] || '', 'base64').toString().replace(/^[^]*:/g, '')
            let parts = key.split('$')
            let id = parts[0]
            let access = 3;
            if (access >= 2) {
                let code = files[path]
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                res.writeHead(200)
                res.end(`
          <!DOCTYPE html>
          <head>
            <style>
            html, body {
              margin: 0;
              overflow: hidden;
              height: 100%;
              width: 100%;
            }
            #editor, #patch {
              height: 100%;
              font-size: 14px;
            }
            #editor {
              width: 60%;
              float: left;
            }
            #patch {
              width: 40%;
              float: right;
            }
            ::-webkit-scrollbar {
              width: 0.5em;
            }
            ::-webkit-scrollbar-track {
              box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
            }
            ::-webkit-scrollbar-thumb {
              background: rgba(100, 100, 100, 0.8);
            }
            ::-webkit-scrollbar-corner,
            ::-webkit-scrollbar-thumb:window-inactive {
              background: rgba(100, 100, 100, 0.4);
            }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js"></script>
            <script src="https://rawcdn.githack.com/qiao/difflib.js/e11553ba3e303e2db206d04c95f8e51c5692ca28/dist/difflib-browser.js"></script>
          </head>
          <body>
            <div id="editor"><code></div>
            <div id="patch"></div>
            <script>
            let createEditor = id => {
              var editor = ace.edit(id)
              editor.setTheme('ace/theme/tomorrow_night')
              editor.setReadOnly(true)
              editor.setFadeFoldWidgets(true)
              var session = editor.getSession()
              session.setMode('ace/mode/javascript')
              session.setUseWrapMode(true)
              session.setTabSize(2)
              return editor
            }
            let editor = createEditor('editor')
            let patch = createEditor('patch')
            let from = editor.getValue().split('\\n')
            editor.setReadOnly(false)
            editor.getSession().on('change', () =>  {
              patch.getSession().setMode('ace/mode/diff')
              patch.setValue(difflib.unifiedDiff(from, editor.getValue().split('\\n'), {
                fromfile: '${ path }~',
                tofile: '${ path }',
                lineterm: '',
              }).join('\\n'), 1)
            })
            editor.commands.addCommand({
              name: 'save',
              exec: () => {
                let body = editor.getValue()
                fetch('/patch${ path }', {
                  method: 'post',
                  body,
                  headers: { 'content-type': 'application/javascript' }
                }).then(r => r.text()).then(text => {
                  patch.getSession().setMode('ace/mode/text')
                  patch.setValue(text, 1)
                  if (!text)
                    from = body.split('\\n')
                });
              },
              bindKey: { mac: 'cmd-shift-s', win: 'ctrl-shift-s' },
            })
            </script>
          </body>
        `.trim().split('\n').map(r => r.trim()).join('\n').split('<code>').join(code))
            } else {
                res.writeHead(401, { 'WWW-Authenticate': `Basic realm="${ path }"` })
                res.end('HTTP Error 401 Unauthorized: Access is denied')
            }
            break
        case '/patch/lib/definitions.js': {
            let key = Buffer.from((req.headers.authorization || '').split(' ')[1] || '', 'base64').toString().replace(/^[^]*:/g, '')
            let parts = key.split('$')
            let id = parts[0]
            let access = 3;
            if (access < 3) {
                res.writeHead(401, { 'WWW-Authenticate': `Basic realm="${ path }"` })
                res.end('HTTP Error 401 Unauthorized: Access is denied')
            } else if (req.method !== 'POST') {
                res.writeHead(400)
                res.end()
            } else {
                let jsString = ''
                req.on('data', data => jsString += data)
                req.on('end', () => {
                    try {
                        let filename = __dirname + '/lib/definitions.js'
                        let module = new Module(filename)
                        module.filename = filename
                        module._compile(jsString, filename)
                        let def = module.exports
                        let i = 0
                        for (let k in def) {
                            if (!def.hasOwnProperty(k)) continue
                            def[k].index = i++
                            ClassIndexes[def[k].index] = def[k];
                        }
                        Class = def

                        if (c.HOT_RELOAD != null && c.HOT_RELOAD > 0) {
                            const reload = (dots) => {
                                let file = "";
                                for (let i = 0; i < dots; i++) file += '.';
                                let newwrite = './lib/' + file + '.' + 'definitions.js';
                                file = './lib/' + file + 'definitions.js';
                                if (fs.existsSync(file)) {
                                    util.log('Backup written to ' + newwrite);
                                    fs.writeFileSync(newwrite, fs.readFileSync(file), 'utf-8');
                                }
                            }

                            let i = 0;
                            do {
                                reload(i);
                                i++;
                            } while(i < c.HOT_RELOAD);
                        }

                        fs.writeFileSync('./lib/definitions.js', jsString, 'utf-8');
                        let info = fs.readFileSync('./lib/definitions.js');
                        if (info == jsString) {
                            util.log('Definitions.js Written');
                        } else {
                            util.error('Failed to write to definitions.js');
                        }

                        mockupJsonData = getMockupJsonData()
                        mockupJsonEtag = '"' + crypto.createHash('sha256').update(mockupJsonData).digest('base64').substring(0, 43) + '"'
                        const defs = Object.values(Class);
                        for (let i = 0; i < entities.length; i++) {
                            entities[i].reload();
                        }
                        Sockets.SocketFunctions.HotReload();
                        res.writeHead(204)
                        res.end()
                    } catch(e) {
                        res.writeHead(200)
                        res.end(e.stack)
                    }
                })
            }
        }
            break;
        case '/shutdown': {
            for (let i = 0; i < Sockets.clients.length; i++) {
                Sockets.clients[i].talk('R');
            }
            res.writeHead(204);
            res.end();
        } break;
        default:
            res.writeHead(404)
            res.end()
    }
})

server.listen(SECRET.PORT || 8080, function httpListening() {
    util.log((new Date()) + ". Server listening on port " + server.address().port)
})

// websocket server
new WebSocket.Server({ server }).on('connection', Sockets.New);
//}

const Collisions = { };

Collisions.Simple = (my, n) => {
    let diff = (1 + util.getDistance(my.physics.position, n.physics.position) / 2) * ROOMSPEED
    let a = (my.attributes.settings.isIntangable) ? 1 : my.attributes.pushability,
        b = (n.attributes.settings.isIntangable) ? 1 : n.attributes.pushability,
        c = 0.05 * (my.physics.position[0] - n.physics.position[0]) / diff,
        d = 0.05 * (my.physics.position[1] - n.physics.position[1]) / diff
    my.physics.acceleration[0] += a / (b + 0.3) * c
    my.physics.acceleration[1] += a / (b + 0.3) * d
    n.physics.acceleration[0] -= b / (a + 0.3) * c
    n.physics.acceleration[0] -= b / (a + 0.3) * d

}

Collisions.Firm = (my, n, buffer) => {
    let item1 = [my.physics.position[0] + my.m_x()[0], my.physics.position[1] + my.m_y()[1]] //{ x: my.x + my.m_x, y: my.y + my.m_y, }
    let item2 = [n.physics.position[0] + n.m_x()[0], n.physics.position[1] + n.m_y()[1]]
    let dist = util.getDistance(item1, item2)
    let s1 = Math.max(getLength(my.physics.velocity[0], my.physics.velocity[1]), my.attributes.topSpeed)
    let s2 = Math.max(getLength(n.physics.velocity[0], n.physics.velocity[1]), n.attributes.topSpeed)
    let strike1, strike2
    if (buffer > 0 && dist <= my.realSize() + n.realSize() + buffer) {
        let repel = (my.attributes.acceleration + n.attributes.acceleration) * (my.realSize() + n.realSize() + buffer - dist) / buffer / ROOMSPEED
        my.physics.acceleration[0] += repel * (item1[0] - item2[0]) / dist
        my.physics.acceleration[1] += repel * (item1[1] - item2[1]) / dist
        n.physics.acceleration[0] -= repel * (item1[0] - item2[0]) / dist
        n.physics.acceleration[0] -= repel * (item1[1] - item2[1]) / dist
    }
    while (dist <= my.realSize() + n.realSize() && !(strike1 && strike2)) {
        strike1 = false; strike2 = false
        if (getLength(my.physics.velocity[0], my.physics.velocity[1]) <= s1) {
            my.physics.velocity[0] -= 0.05 * (item2[0] - item1[0]) / dist / ROOMSPEED
            my.physics.velocity[1] -= 0.05 * (item2[1] - item1[1]) / dist / ROOMSPEED
        } else { strike1 = true; }
        if (getLength(n.physics.velocity[0], n.physics.velocity[1]) <= s2) {
            n.physics.velocity[0] += 0.05 * (item2[0] - item1[0]) / dist / ROOMSPEED
            n.physics.velocity[1] += 0.05 * (item2[1] - item1[1]) / dist / ROOMSPEED
        } else { strike2 = true; }
        item1 = [my.physics.position[0] + my.m_x()[0], my.physics.position[1] + my.m_y()[1]]
        item2 = [n.physics.position[0] + n.m_x()[0], n.physics.position[1] + n.m_y()[1]]
        dist = util.getDistance(item1, item2);
    }
}

Collisions.Spike = (my, n) => {
    let diff = (1 + util.getDistance(my.physics.position, n.physics.position) / 2) * ROOMSPEED;
    let a = (my.attributes.settings.isIntangable) ? 1 : my.attributes.pushability,
        b = (n.attributes.settings.isIntangable) ? 1 : n.attributes.pushability,
        c = 15 * (my.physics.position[0] - n.physics.position[0]) / diff,
        d = 15 * (my.physics.position[1] - n.physics.position[1]) / diff,
        e = Math.min(getLength(my.physics.velocity[0], my.physics.velocity[1]), 3),
        f = Math.min(getLength(n.physics.velocity[0], n.physics.velocity[1]), 3)
    my.physics.acceleration[0] += a / (b + 0.3) * c * e
    my.physics.acceleration[1] += a / (b + 0.3) * d * e
    n.physics.acceleration[0] -= b / (a + 0.3) * c * f
    n.physics.acceleration[1] -= b / (a + 0.3) * d * f
}

Collisions.Reflect = (wall, bounce) => {
    if (bounce.attributes.type === 'crasher') return;
    if (bounce.physics.position[0] + bounce.size() < wall.physics.position[0] - wall.size()
        || bounce.physics.position[0] - bounce.size() > wall.physics.position[0] + wall.size()
        || bounce.physics.position[1] + bounce.size() < wall.physics.position[1] - wall.size()
        || bounce.physics.position[1] - bounce.size() > wall.physics.position[1] + wall.size()) return 0
    if (wall.attributes.settings.isIntangable) return 0
    let bounceBy = bounce.attributes.type === 'tank' ? 1.0 : bounce.attributes.type === 'miniboss' ? 2.5 : 0.1

    // cases:
    // top     C T T T C
    // exposed L I T I R
    //         L L X R R
    // exposed L I B I R
    // bottom  C B B B C
    // C = corner with check
    // I = corner inverse
    // X = push toward nearest side

    let left = bounce.physics.position[0] < wall.physics.position[0] - wall.size()
    let right = bounce.physics.position[0] > wall.physics.position[0] + wall.size()
    let top = bounce.physics.position[1] < wall.physics.position[1] - wall.size()
    let bottom = bounce.physics.position[1] > wall.physics.position[1] + wall.size()

    let leftExposed = bounce.physics.position[0] - bounce.size < wall.physics.position[0] - wall.size
    let rightExposed = bounce.physics.position[0] + bounce.size > wall.physics.position[0] + wall.size
    let topExposed = bounce.physics.position[1] - bounce.size < wall.y - wall.size
    let bottomExposed = bounce.physics.position[1] + bounce.size > wall.y + wall.size

    let intersected = true

    if (left && right) {
        left = right = false
    }
    if (top && bottom) {
        top = bottom = false
    }
    if (leftExposed && rightExposed) {
        leftExposed = rightExposed = false
    }
    if (topExposed && bottomExposed) {
        topExposed = bottomExposed = false
    }
    if ((left && !top && !bottom) || (leftExposed && !topExposed && !bottomExposed)) {
        bounce.physics.acceleration[0] -= (bounce.physics.position[0] + bounce.size() - wall.physics.position[0] + wall.size()) * bounceBy
    } else if ((right && !top && !bottom) || (rightExposed && !topExposed && !bottomExposed)) {
        bounce.physics.acceleration[0] -= (bounce.physics.position[0] - bounce.size() - wall.physics.position[0] - wall.size()) * bounceBy
    } else if ((top && !left && !right) || (topExposed && !leftExposed && !rightExposed)) {
        bounce.physics.acceleration[1] -= (bounce.physics.position[1] + bounce.size() - wall.physics.position[1] + wall.size()) * bounceBy
    } else if ((bottom && !left && !right) || (bottomExposed && !leftExposed && !rightExposed)) {
        bounce.physics.acceleration[1] -= (bounce.physics.position[1] - bounce.size() - wall.physics.position[1] - wall.size()) * bounceBy
    } else {
        let x = leftExposed ? -wall.size() : rightExposed ? wall.size() : 0
        let y = topExposed ? -wall.size() : bottomExposed ? wall.size() : 0

        //let point = new Vector(wall.x + x - bounce.x, wall.y + y - bounce.y)
        let point = [wall.physics.position[0] + x - bounce.physics.position[0], wall.physics.position[1] + y - bounce.physics.position[1]];

        if (!x || !y) {
            if (bounce.physics.position[0] + bounce.physics.position[1] < wall.physics.position[0] + wall.physics.position[1]) { // top left
                if (bounce.physics.position[0] - bounce.physics.position[1] < wall.physics.position[0] - wall.physics.position[1]) { // bottom left
                    bounce.physics.acceleration[0] -= (bounce.physics.position[0] + bounce.size() - wall.physics.position[0] + wall.size()) * bounceBy
                } else { // top right
                    bounce.physics.acceleration[1] -= (bounce.physics.position[1] + bounce.size() - wall.physics.position[1] + wall.size()) * bounceBy
                }
            } else { // bottom right
                if (bounce.physics.position[0] - bounce.physics.position[1] < wall.physics.position[0] - wall.physics.position[1]) { // bottom left
                    bounce.physics.acceleration[1] -= (bounce.physics.position[1] - bounce.size() - wall.physics.position[1] - wall.size()) * bounceBy
                } else { // top right
                    bounce.physics.acceleration[0] -= (bounce.physics.position[0] - bounce.size() - wall.physics.position[0] - wall.size()) * bounceBy
                }
            }
        } else if (!(left || right || top || bottom)) {
            let force = (bounce.size() / getLength(point[0], point[1]) - 1) * bounceBy / 2
            bounce.physics.acceleration[0] += point[0] * force
            bounce.physics.acceleration[1] += point[1] * force
        } else if (/*point.isShorterThan(bounce.size)*/(point[0] * point[0] + point[1] * point[1] <= bounce.size() * bounce.size())) {
            //let force = (bounce.size - point.length) / point.length * bounceBy
            // once to get collision amount, once to norm
            let force = (bounce.size() / getLength(point[0], point[1]) - 1) * bounceBy / 2 // simplified
            bounce.physics.acceleration[0] -= point[0] * force
            bounce.physics.acceleration[1] -= point[1] * force
        } else {
            intersected = false
        }
    }

    if (intersected) {
        //bounce.collisionArray.push(wall)
        bounce.collisions.push(wall);
        if (bounce.attributes.type !== 'food' && bounce.attributes.type !== 'tank' && bounce.attributes.type !== 'miniboss') {
            EntityFunctions.kill(bounce);
        }
    }
}



Collisions.Advanced = (my, n, doDamage, doHeal, doInelastic, nIsFirmCollide = 0) => {
    // Prepare to check
    let tock = Math.min(my.physics.step, n.physics.step),
        combinedRadius = n.size() + my.size(),
        motion = {
            _me: [my.m_x(), my.m_y()], //new Vector(my.m_x, my.m_y),
            _n: [n.m_x(), n.m_y()] //new Vector(n.m_x, n.m_y),
        },
        delt = [
            tock * (motion._me[0] - motion._n[0]),
            tock * (motion._me[1] - motion._n[1])
        ],
        diff = [my.physics.position[0] - n.physics.position[0], my.physics.position[1] - n.physics.position[1]],
        dir = [(n.physics.position[0] - my.physics.position[0]) / getLength(diff[0], diff[1]), (n.physics.position[1] - my.physics.position[1]) / getLength(diff[0], diff[1])],
        component = Math.max(0, dir[0] * delt[0] + dir[1] * delt[1])

    if (component >= getLength(diff[0], diff[1]) - combinedRadius) { // A simple check
        // A more complex check
        let goahead = false,
            tmin = 1 - tock,
            tmax = 1,
            A =     delt[0] * delt[0] +     delt[1] * delt[1],
            B = 2 * delt[0] * diff[0] + 2 * delt[1] * diff[1],
            C = diff[0] * diff[0] + diff[1] * diff[1] - combinedRadius * combinedRadius,
            det = B * B - (4 * A * C),
            t

        if (!A || det < 0 || C < 0) { // This shall catch mathematical errors
            t = 0
            if (C < 0) { // We have already hit without moving
                goahead = true
            }
        } else {
            let t1 = (-B - Math.sqrt(det)) / (2*A),
                t2 = (-B + Math.sqrt(det)) / (2*A);
            if (t1 < tmin || t1 > tmax) { // 1 is out of range
                if (t2 < tmin || t2 > tmax) { // 2 is out of range
                    t = false
                } else { // 1 is out of range but 2 isn't
                    t = t2; goahead = true
                }
            } else { // 1 is in range
                if (t2 >= tmin && t2 <= tmax) { // They're both in range!
                    t = Math.min(t1, t2); goahead = true; // That means it passed in and then out again.  Let's use when it's going in
                } else { // Only 1 is in range
                    t = t1; goahead = true
                }
            }
        }
        /********* PROCEED ********/
        if (goahead) {
            // Add to record
            //my.collisionArray.push(n)
            //n.collisionArray.push(my)
            my.collisions.push(n);
            n.collisions.push(my);
            if (t) { // Only if we still need to find the collision
                // Step to where the collision occured
                my.physics.position[0] += motion._me[0] * t
                my.physics.position[1] += motion._me[1] * t
                n.physics.position[0] += motion._n[0] * t
                n.physics.position[1] += motion._n[1] * t

                my.physics.step -= t
                n.physics.step -= t

                // Update things
                //diff = new Vector(my.x - n.x, my.y - n.y)
                //dir = new Vector((n.x - my.x) / diff.length, (n.y - my.y) / diff.length);
                diff[0] = my.physics.position[0] - n.physics.position[0];
                diff[1] = my.physics.position[1] - n.physics.position[1];
                component = Math.max(0, dir[0] * delt[0] + dir[1] * delt[1])
            }
            let componentNorm = component / getLength(delt[0], delt[1])
            /************ APPLY COLLISION ***********/
                // Prepare some things
            let deathFactor = {
                    _me: 1,
                    _n: 1,
                },
                accelerationFactor = (getLength(delt[0], delt[1])) ? (
                    (combinedRadius / 4) / (Math.floor(combinedRadius / getLength(delt[0], delt[1])) + 1)
                ) : (
                    0.001
                ),
                depth = {
                    _me: util.clamp((combinedRadius - getLength(diff[0], diff[1])) / (2 * my.size()), 0, 1), //1: I am totally within it
                    _n: util.clamp((combinedRadius - getLength(diff[0], diff[1])) / (2 * n.size()), 0, 1), //1: It is totally within me
                },
                combinedDepth = {
                    up: depth._me * depth._n,
                    down: (1-depth._me) * (1-depth._n),
                },
                pen = {
                    _me: {
                        sqr: my.attributes.penetration * my.attributes.penetration,
                        sqrt: Math.sqrt(my.attributes.penetration),
                    },
                    _n: {
                        sqr: n.attributes.penetration * n.attributes.penetration,
                        sqrt: Math.sqrt(n.attributes.penetration),
                    },
                },
                savedHealthRatio = {
                    _me: my.health.getRatio(),
                    _n: n.health.getRatio(),
                }
            if ((doDamage && (my.attributes.damage > 0 || n.attributes.damage > 0)) ||
                (doHeal && (my.attributes.damage < 0 || n.attributes.damage < 0))) {
                /********** DO DAMAGE *********/
                let bail = false
                if (my.attributes.shape === n.attributes.shape && my.attributes.settings.isNecromancer && n.attributes.type === 'food') {
                    bail = my.necro(n)
                } else if (my.attributes.shape === n.attributes.shape && n.attributes.settings.isNecromancer && my.attributes.type === 'food') {
                    bail = n.necro(my)
                }
                if (!bail) {
                    // Calculate base damage
                    let resistDiff = my.health.resist - n.health.resist,
                        damage = {
                            _me:
                                c.DAMAGE_CONSTANT *
                                my.attributes.damage *
                                (1 + resistDiff) *
                                (1 + n.attributes.heteroMultiplier * (my.attributes.damageClass === n.attributes.damageClass)) *
                                ((my.attributes.settings.buffVsFood && n.attributes.damageType === 1) ? 3 : 1 ) *
                                EntityFunctions.damageMultiplier(my),
                            _n:
                                c.DAMAGE_CONSTANT *
                                n.attributes.damage *
                                (1 - resistDiff) *
                                (1 + my.attributes.heteroMultiplier * (my.attributes.damageClass === n.attributes.damageClass)) *
                                ((n.attributes.settings.buffVsFood && my.attributes.damageType === 1) ? 3 : 1) *
                                EntityFunctions.damageMultiplier(n),
                        }
                    // Advanced damage calculations
                    if (my.attributes.settings.damageEffects) {
                        damage._me *=
                            accelerationFactor *
                            (1 + (componentNorm - 1) * (1 - depth._n) / my.attributes.penetration) *
                            (1 + pen._n.sqrt * depth._n - depth._n) / pen._n.sqrt;
                    }
                    if (n.attributes.settings.damageEffects) {
                        damage._n *=
                            accelerationFactor *
                            (1 + (componentNorm - 1) * (1 - depth._me) / n.attributes.penetration) *
                            (1 + pen._me.sqrt * depth._me - depth._me) / pen._me.sqrt;
                    }
                    // Find out if you'll die in this cycle, and if so how much damage you are able to do to the other target
                    let damageToApply = {
                        _me: damage._me,
                        _n: damage._n,
                    }
                    if (n.shield.max) {
                        damageToApply._me -= n.shield.getDamage(damageToApply._me)
                    }
                    if (my.shield.max) {
                        damageToApply._n -= my.shield.getDamage(damageToApply._n)
                    }
                    let stuff = my.health.getHealthDelta(damageToApply._n)
                    deathFactor._me = (stuff > my.health.amount) ? my.health.amount / stuff : 1
                    stuff = n.health.getHealthDelta(damageToApply._me)
                    deathFactor._n = (stuff > n.health.amount) ? n.health.amount / stuff : 1

                    // Now apply it
                    if ((doDamage && n.attributes.damage > 0) || (doHeal && n.attributes.damage < 0))
                        my.damage += damage._n * deathFactor._n
                    if ((doDamage && my.attributes.damage > 0) || (doHeal && my.attributes.damage < 0))
                        n.damage += damage._me * deathFactor._me
                }
            }
            /************* DO MOTION ***********/
            if (nIsFirmCollide < 0) {
                nIsFirmCollide *= -0.5
                my.physics.acceleration[0] -= nIsFirmCollide * component * dir[0]
                my.physics.acceleration[1] -= nIsFirmCollide * component * dir[1]
                n.physics.acceleration[0] += nIsFirmCollide * component * dir[0]
                n.physics.acceleration[1] += nIsFirmCollide * component * dir[1]
            } else if (nIsFirmCollide > 0) {
                n.physics.acceleration[0] += nIsFirmCollide * (component * dir[0] + combinedDepth.up)
                n.physics.acceleration[1] += nIsFirmCollide * (component * dir[1] + combinedDepth.up)
            } else {
                // Calculate the impulse of the collision
                let elasticity = 2 - 4 * Math.atan(my.attributes.penetration * n.attributes.penetration) / Math.PI;
                if (doInelastic && my.attributes.settings.motionEffects && n.attributes.settings.motionEffects) {
                    elasticity *= savedHealthRatio._me / pen._me.sqrt + savedHealthRatio._n / pen._n.sqrt
                } else {
                    elasticity *= 2
                }
                let spring = 2 * Math.sqrt(savedHealthRatio._me * savedHealthRatio._n) / ROOMSPEED,
                    elasticImpulse =
                        combinedDepth.down * combinedDepth.down *
                        elasticity * component *
                        my.mass() * n.mass() / (my.mass() + n.mass()),
                    springImpulse =
                        spring * combinedDepth.up,
                    impulse = -(elasticImpulse + springImpulse) * (1 - my.attributes.settings.isIntangable) * (1 - n.attributes.settings.isIntangable),
                    force = [
                        impulse * dir[0],
                        impulse * dir[1],
                    ],
                    modifiers = {
                        _me: my.attributes.pushability / my.mass() * deathFactor._n,
                        _n: n.attributes.pushability / n.mass() * deathFactor._me,
                    }
                // Apply impulse as force
                my.physics.acceleration[0] += c.KNOCKBACK_CONSTANT * modifiers._me * force[0]
                my.physics.acceleration[1] += c.KNOCKBACK_CONSTANT * modifiers._me * force[1]
                n.physics.acceleration[0] -= c.KNOCKBACK_CONSTANT * modifiers._n * force[0]
                n.physics.acceleration[1] -= c.KNOCKBACK_CONSTANT * modifiers._n * force[1]
            }
        }
    }
}

Collisions.Check = (instance, other) => {
    if (instance.status.isGhost || other.status.isGhost) {
        let ghost = (instance.status.isGhost) ? instance : other;
        util.error('GHOST FOUND');
        util.error(ghost.attributes.label);
        util.error('position: ' + ghost.physics.position[0] + ',' + ghost.physics.position[1]);
        util.error('collisions: ' + '[' + ghost.collisions.toString() + ']');
        util.error('health: ' + ghost.health.amount);
        if (grid.checkInHSHG(ghost)) {
            util.warn('Ghost removed.');
            grid.removeObject(ghost);
        }
        return false;
    }
    if (!EntityFunctions.ghandler.check(instance) && !EntityFunctions.ghandler.check(other)) { util.warn('Tried to collide with an inactive instance.'); return false; };
    if (instance == null || other == null) { util.error('A NULL ENTITY WAS TRYING TO COLLIDE'); return false; }

    return true;
}

Collisions.Collision = (instance, other) => {
    if (instance.attributes.type === 'wall' || other.attributes.type === 'wall') {
        if (instance.attributes.type === 'wall' && other.attributes.type === 'wall') return;
        let wall = instance.type === 'wall' ? instance : other,
            entity = instance.type === 'wall' ? other : instance;
        if (wall.attributes.shape === 4) {
            Collisions.Reflect(wall, entity);
        } else if (wall.attributes.shape === 0) {
            //Collisions.Moon(wall, entity);
        } else {
            let a = entity.attributes.type === 'bullet' ?
                1 + 10 / (getLength(entity.physics.velocity[0], entity.physics.velocity[1]) + 10) :
                1;
            Collisions.Advanced(wall, entity, false, false, false, a);
        }
    } else if (instance.attributes.type === 'fixed' || other.attributes.type === 'fixed') {
        if (instance.attributes.type === 'fixed' && other.attributes.type === 'fixed') return;
        if (instance.identifiers.team === other.identifiers.team && (instance.attributes.settings.hitsOwnType === 'never' || other.attributes.settings.hitsOwnType === 'never')) return;
        if (instance.attributes.type === 'fixed') {
            Collisions.Advanced(instance, other, instance.identifiers.team !== other.identifiers.team, instance.identifiers.team === other.identifiers.team, false, 1);
        } else {
            Collisions.Advanced(other, instance, instance.identifiers.team !== other.identifiers.team, instance.identifiers.team === other.identifiers.team, false, 1);
        }
    } else if ((instance.attributes.type === 'crasher' && other.attributes.type === 'food') || (other.attributes.type === 'crasher' && instance.attributes.type === 'food')) {
        Collisions.Firm(instance, other);
    } else if (instance.identifiers.team !== other.identifiers.team) {
        Collisions.Advanced(instance, other, true, false, true);
    } else if (instance.identifiers.team === other.identifiers.team && (instance.damage < 0 || other.damage < 0)) {
        Collisions.Advanced(instance, other, true, true, true);
    } else if (instance.attributes.settings.hitsOwnType === 'never' || other.attributes.settings.hitsOwnType === 'never') {
    } else if (instance.attributes.settings.hitsOwnType === other.attributes.settings.hitsOwnType) {
        switch(instance.attributes.settings.hitsOwnType) {
            case 'push': {
                Collisions.Advanced(instance, other, false, true, false);
            } break;
            case 'hardLocal':
            case 'hard': {
                Collisions.Firm(instance, other);
            } break;
            case 'spike': {
                Collisions.Spike(instance, other);
            } break;
            case 'hardWithBuffer': {
                Collisions.Firm(instance, other, 30);
            } break;
            case 'repel': {
                Collisions.Simple(instance, other);
            } break;
        }
    }
}


Collisions.Handler = (collision) => {
    let instance = collision[0],
        other = collision[1];

    if (Collisions.Check) {
        Collisions.Collision(instance, other);
    }
}

const Loops = { };

Loops.Game = (() => {
    return () => {
        //let entityliveupdates = [],
        //    entityactivationupdates = [];
        for (let i = 0; i < entities.length; i++) {
            /*
      entityliveupdates.push(new Promise((resolve, reject) => {
        try {
          EntityFunctions.update(entities[i]);
          resolve(true);
        } catch(err) {
          reject(err);
        }
      }));

      entityactivationupdates.push(new Promise((resolve, reject) => {
        try {
          EntityFunctions.activate(entities[i]);
          resolve(true);
        } catch(err) {
          reject(err);
        }
      }));
      */

            EntityFunctions.activate(entities[i]);
        }

        //Promise.all(entityactivationupdates).then((values) => { }).catch((err) => { throw new Error(err); });

        if (entities.length > 1) {
            grid.update();

            let query = grid.queryForCollisionPairs();
            for (let i = 0; i < query.length; i++) {
                Collisions.Handler(query[i]);
            }
        }

        for (let i = 0; i < entities.length; i++) {
            EntityFunctions.update(entities[i]);
        }


        //Promise.all(entityliveupdates).then((values) => { }).catch((err) => { throw new Error(err); });

        //Promise.all(entityliveupdates).then((values) => { }).catch((err) => { throw new Error(err); });

        room.lastCycle = util.time();

        purgeEntities();
        for (let i = 0; i < views.length; i++) {
            views[i].cycle();
        }
    }
})();


Loops.Maintain = (() => {
    // Place obstacles
    /*
    let placeRoids = () => {
      let count = 0
      function placeRoid(type, entityClass) {
        let position
        let max = 20
        do {
          position = room.randomType(type);
        } while (dirtyCheck(position, 10 + entityClass.SIZE) && max-- > 0)
        let o = new Entity(position)
        o.define(entityClass)
        o.team = -101
        o.facing = ran.randomAngle()
        o.protect()
        o.life()
        count++;
      }
      // Start placing them
      let roidcount = room.roid.length * room.width * room.height / room.xgrid / room.ygrid / 50000 / 1.5
      let rockcount = room.rock.length * room.width * room.height / room.xgrid / room.ygrid / 250000 / 1.5
      for (let i=Math.ceil(roidcount); i; i--) { placeRoid('roid', Class.obstacle); }
      for (let i=Math.ceil(roidcount * 0.3); i; i--) { placeRoid('roid', Class.babyObstacle); }
      for (let i=Math.ceil(rockcount * 0.8); i; i--) { placeRoid('rock', Class.obstacle); }
      for (let i=Math.ceil(rockcount * 0.5); i; i--) { placeRoid('rock', Class.babyObstacle); }
      util.log('Placing ' + count + ' obstacles!')
    }
    placeRoids()


    let placeMoon = () => {
      let o = new Entity({ x: room.width / 2, y: room.height / 2 })
      o.define(Class.moonObstacle)
      o.team = -101
      o.facing = ran.randomAngle()
      o.protect()
      o.life()
      util.log('Placing moon!')
    }

    //placeMoon()

    let placeWalls = () => {
      let count = 0
      for (let loc of room['wall']) {
        let o = new Entity(loc)
        o.define(Class.mazeObstacle)
        o.SIZE = (room.xgridWidth + room.ygridHeight) / 4
        o.team = -101
        o.protect()
        o.life()
        count++;
      }
      util.log('Placing ' + count + ' walls!')
    }
    placeWalls()
    if (c.SPAWN_MAZE_WALLS) new MazeGenerator(c.SPAWN_MAZE_WALLS === 2).start().place()
    for (let loc of room['dor1']) {
      let d = new Entity(loc)
      d.define(Class.mazeObstacle)
      d.SIZE = (room.xgridWidth + room.ygridHeight) / 4
      d.team = -101
      d.intangibility = true
      d.alpha = 0.2
      d.protect()
      d.life()
      let buttons = []
      let makeButtons = open => {
        for (let loc of room['ctr1']) {
          let o = new Entity(loc)
          o.define(Class.button)
          o.pushability = o.PUSHABILITY = 0
          o.team = -101
          o.color = open ? 12 : 11 // <- green, red -> 12
          o.ondead = () => {
            if (open) {
              d.intangibility = true
              d.alpha = 0.2
            } else {
              d.intangibility = false
              d.alpha = 1
            }
            for (let b of buttons)
              if (b != o) {
                b.ondead = null
                b.destroy()
              }
            buttons = []
            makeButtons(!open)
          }
          buttons.push(o)
        }
      }
      makeButtons(false)
    }
    */


    // Spawning functions
    let spawnBosses = (() => {
        let timer = 1000
        const bossSpawn = (classArray, number, nameClass, typeOfLocation = 'norm', begin = number === 1 ? 'A visitor is coming.' : 'Visitors are coming.') => {
            let names = ran.chooseBossName(nameClass, number)
            let chosenOnes = ran.chooseN(classArray, number)
            let arrival = ''
            if (number === 1) {
                arrival = names[0] + ' has arrived.';
            } else {
                for (let i = 0; i < number - 2; i++) arrival += names[i] + ', '
                arrival += names[number - 2] + ', and ' + names[number - 1] + ' have arrived.'
            }
            Sockets.SocketFunctions.Broadcast(begin)
            for (let i = 0; i < number; i++) {
                setTimeout(() => {
                    let spot, max = 20
                    do {
                        spot = room.randomType(typeOfLocation)
                    } while (dirtyCheck(spot, 600) && max-- > 0)
                    //let o = new Entity(spot)
                    //    o.define(chosenOnes.pop())
                    //   o.team = -100
                    //   o.name = names.pop()
                    let o = entity(spot[0], spot[1]);
                    o.define(chosenOnes.pop());
                    o.identifiers.team = -100;
                    o.identifiers.name = names.pop();
                }, ran.randomRange(10000, 14000))
            }
            // Wrap things up.
            setTimeout(() => Sockets.SocketFunctions.Broadcast(arrival), 12000)
            util.log('[SPAWN] ' + arrival)
        }
        return census => {
            if (timer > 3000 && ran.chance((timer - 3000) / 6000)) {
                util.log('[SPAWN] Preparing to spawn...')
                timer = 0
                switch (ran.chooseChance(3, 1, 9, 3)) {
                    case 0:
                        Sockets.SocketFunctions.Broadcast('A strange trembling...')
                        bossSpawn([Class.palisade, Class.summoner, Class.skimboss], 1, 'a')
                        break
                    case 1:
                        Sockets.SocketFunctions.Broadcast('A strange trembling....')
                        bossSpawn([Class.palisade, Class.summoner, Class.skimboss], 2, 'a')
                        break
                    case 2:
                        bossSpawn([Class.elite_destroyer, Class.elite_gunner, Class.elite_sprayer], 1, 'a', 'nest')
                        break
                    case 3:
                        bossSpawn([Class.elite_destroyer, Class.elite_gunner, Class.elite_sprayer], 2, 'a', 'nest')
                        break
                }
                // Set the timeout for the spawn functions
            } else if (!census.miniboss) timer++
        }
    })()
    let spawnCrasher = census => {
        if (ran.chance(1 - census.crasher / room.maxFood / room.nestFoodAmount)) {
            let spot, max = 20
            let sentry = ran.dice(80)
            do { spot = room.randomType('nest'); } while (dirtyCheck(spot, sentry ? 450 : 150) && max-- > 0)
            let type = sentry ? ran.choose([Class.sentryGun, Class.sentrySwarm, Class.sentryTrap]) : Class.crasher
            //let o = new Entity(spot)
            let o = entity(spot[0], spot[1]);
            o.define(type)
            o.identifiers.team = -100;
        }
    }
    // The NPC function
    let makenpcs = (() => {
        // Make base protectors if needed.
        for (let team = 1; team < 5; team++) {
            for (let loc of room['bap' + team]) {
                //let o = new Entity(loc)
                let o = entity(loc[0], loc[1]);
                o.define(Class.baseProtector)
                o.identifiers.team = -team;
                o.color = [10, 11, 12, 15][team-1]
            }
            for (let loc of room['bad' + team]) {
                //let o = new Entity(loc)
                let o = entity(loc[0], loc[1]);
                o.define(Class.baseDroneSpawner)
                o.identifiers.team = -team;
                o.color = [10, 11, 12, 15][team-1]
            }
            //for (let loc of room['mot' + team]) {
            //createMom(loc, team)
            //}
        }
        //let doms = ran.chooseN([Class.destroyerDominator, Class.destroyerDominator, Class.gunnerDominator, Class.gunnerDominator, Class.trapperDominator, Class.trapperDominator], 5)
        //for (let loc of room['domx']) {
        //createDom(loc, 0, doms.shift())
        //}

        // Return the spawning function
        let bots = []
        return () => {
            let census = {
                crasher: 0,
                miniboss: 0,
                tank: 0,
            };
            let npcs = entities.map(function npcCensus(instance) {
                if (census[instance.type] != null) {
                    census[instance.type]++
                    return instance
                }
            }).filter(e => e);
            // Spawning
            //spawnCrasher(census)
            spawnBosses(census)
            // Bots
            if (bots.length < c.BOTS && ran.chance(1 - bots.length / c.BOTS)) {
                //let o = new Entity(room.random())
                let rng = room.random();
                let o = entity(rng[0], rng[1]);
                o.color = 17
                o.define(Class.bot)
                o.define(Class.basic)
                o.attributes.name += ran.chooseBotName()
                //o.refreshBodyAttributes()
                EntityFunctions.refresh(o);
                o.color = 17
                let to = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                let need = 47
                while (need > 0) {
                    let r = Math.floor(Math.random() * 10)
                    if (to[r] < 9) {
                        to[r]++
                        need--
                    }
                }
                o.skill = to;
                bots.push(o)
            }
            // Remove dead ones
            bots = bots.filter(e => !(e.health.amount <= 0))
            // Slowly upgrade them
            for (let o of bots) {
                if (o.skills.level < 45) {
                    o.skills.score += 100;
                    o.skills.maintain()
                }
                if (o.attributes.upgrades.length && o.skills.upgradable()) {
                    EntityFunctions.upgrade(o, Math.floor(Math.random() * 9))
                }
            }
        }
    })()
    // The big food function
    let makefood = (() => {
        let food = [], foodSpawners = []
        // The two essential functions
        function getFoodClass(level) {
            let a = null
            switch (level) {
                case 0: a = Class.egg; break
                case 1: a = Class.square; break
                case 2: a = Class.triangle; break
                case 3: a = Class.pentagon; break
                case 4: a = Class.bigPentagon; break
                case 5: a = Class.hugePentagon; break
                default: throw('bad food level')
            }
            a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1)
            return a
        }
        function getGreenFoodClass(level) {
            let a = null
            switch (level) {
                case 0: a = Class.gem; break
                case 1: a = Class.greensquare; break
                case 2: a = Class.greentriangle; break
                case 3: a = Class.greenpentagon; break
                case 4: a = Class.bigPentagon; break
                case 5: a = Class.hugePentagon; break
                default: throw('bad food level')
            }
            a.BODY.ACCELERATION = 0.015 / (a.FOOD.LEVEL + 1)
            return a
        }
        let placeNewFood = (position, scatter, level, allowInNest = false) => {
            let o = nearest(food, position);
            let mitosis = false
            let seed = false
            // Find the nearest food and determine if we can do anything with it
            if (o != null) {
                for (let i=50; i>0; i--) {
                    if (scatter === -1 || util.getDistance(position, o.physics.position) < scatter) {
                        if (ran.dice((o.attributes.food.level + 1) * (o.attributes.food.level + 1))) {
                            mitosis = true; break
                        } else {
                            seed = true; break
                        }
                    }
                }
            }
            let new_o
            // Decide what to do
            if (scatter !== -1 || mitosis || seed) {
                // Splitting
                if (o != null && (mitosis || seed) && room.isIn('nest', o) === allowInNest) {
                    let levelToMake = (mitosis) ? o.attributes.food.level : level,
                        place = [
                            o.physics.position[0] + o.size() * Math.cos(o.physics.facing),
                            o.physics.position[0] + o.size() * Math.sin(o.physics.facing),
                        ]
                    //new_o = new Entity(place)
                    new_o = entity(place[0], place[1]);
                    new_o.define(getFoodClass(levelToMake))
                }
                // Brand new
                else if (room.isIn('nest', position) === allowInNest && !dirtyCheck(position, 30)) {
                    //new_o = new Entity(position)
                    new_o = entity(position[0], position[1]);
                    new_o.define(getFoodClass(level))
                } else return
                if (ran.chance(0.00002)) new_o.define(getGreenFoodClass(level))
                new_o.identifiers.team = -100;
                new_o.physics.facing = ran.randomAngle();
                food.push(new_o)
                return new_o
            }
        }
        // Define foodspawners
        class FoodSpawner {
            constructor() {
                this.foodToMake = Math.ceil(Math.abs(ran.gauss(0, room.scale.linear*80)))
                this.size = Math.sqrt(this.foodToMake) * 25

                // Determine where we ought to go
                let position = {}; let o
                do {
                    position = room.gaussRing(1/3, 20);
                    o = placeNewFood(position, this.size, Math.round(Math.random()))
                } while (o == null)

                // Produce a few more
                for (let i=Math.ceil(Math.abs(ran.gauss(0, 4))); i<=0; i--) {
                    placeNewFood(o, this.size, Math.round(Math.random()))
                }

                // Set location
                this.x = o.physics.position[0];
                this.y = o.physics.position[1];
                //util.debug('FoodSpawner placed at ('+this.x+', '+this.y+'). Set to produce '+this.foodToMake+' food.')
            }
            rot() {
                if (--this.foodToMake < 0) {
                    //util.debug('FoodSpawner rotted, respawning.')
                    util.remove(foodSpawners, foodSpawners.indexOf(this))
                    foodSpawners.push(new FoodSpawner())
                }
            }
        }
        // Add them
        foodSpawners.push(new FoodSpawner())
        foodSpawners.push(new FoodSpawner())
        foodSpawners.push(new FoodSpawner())
        foodSpawners.push(new FoodSpawner())
        // Food making functions
        let makeGroupedFood = () => { // Create grouped food
            // Choose a location around a spawner
            let spawner = foodSpawners[ran.irandom(foodSpawners.length - 1)],
                bubble = ran.gaussRing(spawner.size, 1/4)
            placeNewFood([spawner.x + bubble[0], spawner.y + bubble[1]], -1, Math.round(Math.random()))
            spawner.rot()
        }
        let makeDistributedFood = () => { // Distribute food everywhere
            //util.debug('Creating new distributed food.')
            let spot = {}
            do { spot = room.gaussRing(1/2, 2); } while (room.isInNorm(spot))
            placeNewFood(spot, 0.01 * room.width, Math.round(Math.random()))
        }
        let makeCornerFood = () => { // Distribute food in the corners
            let spot = {}
            do { spot = room.gaussInverse(5); } while (room.isInNorm(spot))
            placeNewFood(spot, 0.05 * room.width, Math.round(Math.random()))
        }
        let makeNestFood = () => { // Make nest pentagons
            if (room.checkType('nest')) {
                let spot = room.randomType('nest')
                placeNewFood(spot, 0.01 * room.width, 3, true)
            }
        }
        // Return the full function
        return () => {
            // Find and understand all food
            let census = {
                [0]: 0, // Egg
                [1]: 0, // Square
                [2]: 0, // Triangle
                [3]: 0, // Penta
                [4]: 0, // Beta
                [5]: 0, // Alpha
                [6]: 0,
                tank: 0,
                sum: 0,
            }
            let censusNest = {
                [0]: 0, // Egg
                [1]: 0, // Square
                [2]: 0, // Triangle
                [3]: 0, // Penta
                [4]: 0, // Beta
                [5]: 0, // Alpha
                [6]: 0,
                sum: 0,
            }
            // Do the censusNest
            /*food = entities.map((instance) => {
                if (instance.attributes.type === 'tank') {
                    census.tank++
                } else if (instance.attributes.food.level > -1) {
                    if (room.isIn('nest', instance.physics.position)) { censusNest.sum++; censusNest[instance.attributes.food.level]++; }
                    else { census.sum++; census[instance.attributes.food.level]++; }
                    return instance
                }
            }).filter(e => e)*/
            let food = [];
            for (let i = 0; i < entities.length; i++) {
                if (entities[i].attributes.type === 'tank') {
                    census.tank++;
                } else if (entities[i].attributes.food.level > -1) {
                    if (room.isIn('nest', entities[i].physics.position)) { censusNest.sum++; censusNest[entities[i].attributes.food.level]++; }
                    else { census.sum++; census[entities[i].attributes.food.level]++; }
                    food.push(entities[i]);
                }
            }
            // Sum it up
            let maxFood = 1 + room.maxFood + 15 * census.tank;
            let maxNestFood = 1 + room.maxFood * room.nestFoodAmount
            let foodAmount = census.sum
            let nestFoodAmount = censusNest.sum
            for (let spawner of foodSpawners)
                if (ran.chance(1 - foodAmount/maxFood))
                    spawner.rot()
            while (ran.chance(0.8 * (1 - foodAmount * foodAmount / maxFood / maxFood))) {
                switch (ran.chooseChance(10, 2, 1)) {
                    case 0: makeGroupedFood(); break
                    case 1: makeDistributedFood(); break
                    case 2: makeCornerFood(); break
                }
            }
            while (ran.chance(0.5 * (1 - nestFoodAmount * nestFoodAmount / maxNestFood / maxNestFood))) makeNestFood()
            if (!food.length) return 0
            for (let i=Math.ceil(food.length / 100); i>0; i--) {
                let o = food[Math.floor(Math.random() * food.length)], // A random food instance
                    oldId = -1000
                // Bounce 6 times
                for (let j=0; j<6; j++) {
                    // Find the nearest one that's not the last one
                    o = nearest(food, o.physics.position, (i) => i !== o)
                    // Configure for the nest if needed
                    let proportions = c.FOOD,
                        cens = census,
                        amount = foodAmount;
                    if (room.isIn('nest', o.physics.position)) {
                        proportions = c.FOOD_NEST
                        cens = censusNest
                        amount = nestFoodAmount
                    }
                    // Upgrade stuff
                    o.attributes.food.countup += Math.ceil(Math.abs(ran.gauss(0, 10)))
                    while (o.attributes.food.countup >= (o.attributes.food.level + 1) * 100) {
                        o.attributes.food.countup -= (o.attributes.food.level + 1) * 100
                        if (o.attributes.food.level < 5 && ran.chance(1 - cens[o.attributes.food.level + 1] / amount / proportions[o.attributes.food.level])) {
                            if (o.attributes.food.shiny) {
                                o.define(getGreenFoodClass(o.attributes.food.level + 1))
                            } else {
                                o.define(getFoodClass(o.attributes.food.level + 1))
                            }
                        }
                    }
                }
            }
        }
    })()
    // Define food and food spawning
    return () => {
        // Do stuff
        //if (!arenaClosed) {
        makenpcs();
        makefood();
        //}
        // Regen health and update the grid
        for (let i = 0; i < entities.length; i++) {
            if (entities[i].shield.max) {
                entities[i].shield.regenerate();
            }
            if (entities[i].health.amount) {
                entities[i].health.regenerate(entities[i].shield.max && entities[i].shield.max === entities[i].shield.amount);
            }
        }

        //for (let instance of entities) {
        //    if (instance.shield.max)
        //        instance.shield.regenerate()
        //    if (instance.health.amount)
        //        instance.health.regenerate(instance.shield.max && instance.shield.max === instance.shield.amount)
        //}
    }
})();


function Chat(maximum, removal = 1) {
    let messages = [], users = [], userid = 0;
    function broadcast() {
        const formatted = [];
        for (let i = 0; i < messages.length; i++) {
            formatted.push(messages[i][2], `${messages[i][0].body.attributes.name}: ${messages[i][1]}`);
        }
        // broadcast the formatted things
        return formatted;
    }

    return {
        users: () => users,
        messages: () => messages,
        user: (player) => {
            return users.push([player, userid++]);
        },
        post: (user, message, color) => {
            if (messages.length > maximum) {
                while (messages.length > maximum) {
                    messages.shift();
                }
            }
            messages.push([user, message, color]);
        },
        broadcast: () => broadcast(),
        update: () => {
            broadcast();

        }
    };
}

Loops.Chat = (() => {
    const C = Chat(3);
    return () => {

    }
})();

const nanotimer = require('nanotimer');
const Timer = new nanotimer();
const Expected = 1000 / c.gameSpeed / 25;
const Predicted = room.cycleSpeed;
const MaxOffset = 16;

Loops.Handler = () => {

    const correction = -3;
    let current = util.time(), previous = util.time(), alpha = 0;

    function GameExecution() {
        current = util.time(), ELAPSED = current - previous;
        alpha = (ELAPSED > Expected) ? Expected / ELAPSED : 1;
        ROOMSPEED = c.gameSpeed * alpha;

        Loops.Game();
        const elapsed = (current - previous) / 10, Delay = Math.max(0, (room.cycleSpeed) - elapsed), dms = Delay - correction;
        previous = current;
        if (dms <= 16) {
            setImmediate(() => process.nextTick(GameExecution));
            room.nextCycle = util.time();
        } else {
            Timer.setTimeout(() => process.nextTick(GameExecution), '', dms + 'm');
            room.nextCycle = util.time() + dms;
        }
    }

    GameExecution();
    //setInterval(Loops.Chat, 250);
    setInterval(Loops.Maintain, 200);
}

//const memored = require('memored');
//const EventEmitter = require('events');
//const denodeify = require('denodeify');
// loop handler
//if (LOOP_WORKER) {
Loops.Handler();
//}

/*
const workers = [];
cluster.setupMaster({
  exec: 'worker.js'
});

let t = 0;

  function buildWorker() {
    let worker = cluster.fork();
    worker._active = false;
    worker._emitter = new EventEmitter();
    worker.tasks = [];
    worker.callbacks = [];
    worker.execute = async function() {
      if (worker.tasks.length > 0) {
        worker._active = true;
        worker.send(worker.tasks.pop());
        const exit = denodeify(worker.on.bind(worker, 'message'));
        await exit;
        worker._active = false;
        worker.execute();
      } else {
        worker._active = false;
      }
    }
    worker.task = (info, callback, async = false) => {
      function task() {
        worker.tasks.push(info);
        worker.callbacks.push(callback);
        worker.execute();
      }
      if (async) {
        return new Promise((resolve, reject) => {
          try {
            task();
            resolve(true);
          } catch(err) {
          reject(err);
          }
        });
      } else {
        task();
      }
    }
    worker.schedule = (event, callback) => {
      return worker._emitter.on.bind(event, callback);
    }
    worker.on('message', (info) => {
      worker._emitter.emit(worker.callbacks.pop(), info);
    });

    workers.push(worker);
  }

for (let i = 0; i < cpus; i++) {
  buildWorker();
}
cluster.on('exit', (worker, code, signal) => {
  workers[workers.indexOf(worker)] = buildWorker();
});
*/
