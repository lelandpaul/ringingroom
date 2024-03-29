// Set up audio objects for the main ringing_room script
//
// the towerbell audio object
export const tower = new Howl({
    src: [
        "static/audio/tower.ogg",
        "static/audio/tower.m4a",
        "static/audio/tower.mp3",
        "static/audio/tower.ac3",
    ],
    sprite: {
        0: [0, 2612.3809523809523],
        1: [4000, 2120.612244897959],
        2: [8000, 2383.5600907029484],
        3: [16000, 2534.195011337868],
        4: [20000, 2518.548752834466],
        5: [24000, 2581.1337868480705],
        6: [28000, 2588.9569160997753],
        7: [36000, 2565.4875283446686],
        8: [40000, 2588.9569160997753],
        9: [44000, 2557.664399092971],
        "2sharp": [12000, 2248.639455782314],
        "6flat": [32000, 2725.215419501133],
        E: [48000, 2581.1337868480705],
        T: [52000, 2588.9569160997753],
        e1: [56000, 1879.931972789116],
        e2: [59000, 1880.113378684804],
        e3: [62000, 1883.3560090702974],
        e4: [65000, 1876.9387755101975],
    },
});

// the handbell audio object
export const hand = new Howl({
    src: [
        "static/audio/hand.ogg",
        "static/audio/hand.m4a",
        "static/audio/hand.mp3",
        "static/audio/hand.ac3",
    ],
    volume: 0.2,
    sprite: {
        1: [0, 1070.2721088435374],
        0: [3000, 1411.2244897959183],
        E: [6000, 1453.2199546485263],
        T: [9000, 1377.2335600907031],
        A: [12000, 1392.4716553287979],
        B: [15000, 1386.1451247165526],
        C: [18000, 1389.5464852607695],
        D: [21000, 1412.086167800453],
        2: [24000, 1247.6417233560078],
        3: [27000, 1290.702947845805],
        4: [30000, 1376.3265306122462],
        5: [33000, 1466.3492063492072],
        "6f": [36000, 1421.609977324266],
        6: [39000, 1437.0975056689374],
        7: [42000, 1451.7233560090688],
        8: [45000, 1471.337868480724],
        9: [48000, 1438.2312925170097],
    },
});

export const muffled = new Howl({
    src: [
        "static/audio/muffled.ogg",
        "static/audio/muffled.m4a",
        "static/audio/muffled.mp3",
        "static/audio/muffled.ac3",
    ],
    volume: 0.3,
    sprite: {
        1: [0, 1875.0113378684807],
        2: [12000, 1875.0113378684805],
        3: [18000, 1875.0113378684823],
        4: [21000, 1875.0113378684823],
        5: [24000, 1875.0113378684823],
        6: [27000, 1875.0113378684823],
        7: [30000, 1875.0113378684823],
        8: [33000, 1875.0113378684787],
        9: [36000, 1875.0113378684787],
        0: [3000, 1875.0113378684805],
        E: [6000, 1875.0113378684805],
        T: [9000, 1875.0113378684805],
        "2sharp": [15000, 1875.0113378684823],
        e1: [39000, 1875.0113378684787],
        e2: [42000, 1875.0113378684787],
        e3: [45000, 1875.0113378684787],
        e4: [48000, 1875.0113378684787],
    },
});

export const cow = new Howl({
    src: [
        "static/audio/cow.ogg",
        "static/audio/cow.m4a",
        "static/audio/cow.mp3",
        "static/audio/cow.ac3",
    ],
    sprite: {
        1: [0, 530.9977324263039],
        2: [16000, 530.9977324263037],
        3: [18000, 530.9977324263037],
        4: [20000, 530.9977324263037],
        5: [22000, 530.9977324263037],
        6: [24000, 530.9977324263037],
        7: [26000, 530.9977324263037],
        8: [28000, 530.9977324263037],
        9: [30000, 530.9977324263037],
        10: [2000, 530.9977324263037],
        11: [4000, 530.9977324263037],
        12: [6000, 530.9977324263037],
        13: [8000, 530.9977324263037],
        14: [10000, 530.9977324263037],
        15: [12000, 530.9977324263037],
        16: [14000, 927.9818594104316],
    },
});

export const calls = new Howl({
    src: [
        "static/audio/calls.ogg",
        "static/audio/calls.m4a",
        "static/audio/calls.mp3",
        "static/audio/calls.ac3",
    ],
    volume: 0.2,
    sprite: {
        ALL: [0, 654.6938775510204],
        BOB: [2000, 396.8480725623582],
        CHANGE: [4000, 824.6258503401363],
        GO: [6000, 1009.773242630386],
        LOOK: [9000, 3155.2607709750564],
        ROUNDS: [14000, 746.1678004535148],
        SINGLE: [16000, 582.8798185941047],
        SORRY: [18000, 691.2698412698397],
        STAND: [20000, 1228.9342403628111],
    },
});

// A mapping from audio names to audio objects and image prefixes
export const audio_types = {
    Tower: tower,
    Hand: hand,
    Muffled: muffled,
    Cow: cow,
    image_prefix: {
        Tower: "t-",
        Hand: "h-",
        Cow: "c-",
    },
};

// A mapping from call text to call audio trigger
export const call_types = {
    "That's all": "ALL",
    Bob: "BOB",
    "Change method": "CHANGE",
    Go: "GO",
    "Look to": "LOOK",
    Rounds: "ROUNDS",
    Single: "SINGLE",
    "Sorry!": "SORRY",
    "Stand next": "STAND",
};

// What sounds do you play on different numbers of bells? (Allows for ringing the front 8)
export const bell_mappings = {
    Tower: {
        4: ["5", "6", "7", "8"],
        5: ["4", "5", "6", "7", "8"],
        6: ["3", "4", "5", "6", "7", "8"],
        8: ["1", "2sharp", "3", "4", "5", "6", "7", "8"],
        10: ["3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        14: [
            "e3",
            "e4",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
        ],
        16: [
            "e1",
            "e2",
            "e3",
            "e4",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
        ],
    },
    Hand: {
        4: ["9", "0", "E", "T"],
        5: ["8", "9", "0", "E", "T"],
        6: ["7", "8", "9", "0", "E", "T"],
        8: ["5", "6", "7", "8", "9", "0", "E", "T"],
        10: ["3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        14: [
            "3",
            "4",
            "5",
            "6f",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
            "A",
            "B",
            "C",
            "D",
        ],
        16: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6f",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
            "A",
            "B",
            "C",
            "D",
        ],
    },
    Muffled: {
        4: ["5", "6", "7", "8"],
        5: ["4", "5", "6", "7", "8"],
        6: ["3", "4", "5", "6", "7", "8"],
        8: ["1", "2sharp", "3", "4", "5", "6", "7", "8"],
        10: ["3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        12: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "E", "T"],
        14: [
            "e3",
            "e4",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
        ],
        16: [
            "e1",
            "e2",
            "e3",
            "e4",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "0",
            "E",
            "T",
        ],
    },
    Cow: {
        4: ["13", "14", "15", "16"],
        5: ["12", "13", "14", "15", "16"],
        6: ["11", "12", "13", "14", "15", "16"],
        8: ["9", "10", "11", "12", "13", "14", "15", "16"],
        10: ["7", "8", "9", "10", "11", "12", "13", "14", "15", "16"],
        12: ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"],
        14: [
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
        ],
        16: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
        ],
    },
};
