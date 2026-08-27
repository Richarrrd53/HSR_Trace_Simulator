const PATHS = ["毀滅", "巡獵", "智識", "同諧", "虛無", "存護", "豐饒", "記憶", "歡愉"];

const STANDARD_TYPES = ["普攻", "戰技", "終結技", "秘技", "天賦", "額外能力", "屬性加成"];
const MEMORY_TYPES = ["普攻", "戰技", "終結技", "秘技", "天賦", "憶靈技", "憶靈天賦", "額外能力", "屬性加成"];
const ELATION_TYPES = ["普攻", "戰技", "終結技", "秘技", "天賦", "歡愉技", "額外能力", "屬性加成"];

const img_dic = {
    "毀滅": "Path_Destruction.webp",
    "巡獵": "Path_The_Hunt.webp",
    "智識": "Path_Erudition.webp",
    "同諧": "Path_Harmony.webp",
    "虛無": "Path_Nihility.webp",
    "存護": "Path_Preservation.webp",
    "豐饒": "Path_Abundance.webp",
    "記憶": "Path_Remembrance.webp",
    "歡愉": "Path_Elation.webp",
};

const soundClick = new Audio("./sound/click.mp3");
const soundCancel = new Audio("./sound/cancel.mp3");
const soundNode = new Audio("./sound/node.mp3");
soundClick.preload = "auto";
soundCancel.preload = "auto";
soundNode.preload = "auto";

function playSound(audio) {
    if (!audio) return;
    try {
        const sound = audio.cloneNode();
        sound.volume = 0.6;
        sound.play().catch(() => {});
    } catch (e) {
        // ignore autoplay restriction errors
    }
}

function playClickSound() {
    playSound(soundClick);
}

function playCancelSound() {
    playSound(soundCancel);
}

function playNodeSound() {
    playSound(soundNode);
}

const pathIconMediumDic = {
    "毀滅": "Icon_Path_Destruction_Medium.webp",
    "巡獵": "Icon_Path_The_Hunt_Medium.webp",
    "智識": "Icon_Path_Erudition_Medium.webp",
    "同諧": "Icon_Path_Harmony_Medium.webp",
    "虛無": "Icon_Path_Nihility_Medium.webp",
    "存護": "Icon_Path_Preservation_Medium.webp",
    "豐饒": "Icon_Path_Abundance_Medium.webp",
    "記憶": "Icon_Path_Remembrance_Medium.webp",
    "歡愉": "Icon_Path_Elation_Medium.webp",
};

const imageCache = {};
function preloadPathImages() {
    Object.entries(img_dic).forEach(([path, file]) => {
        const img = new Image();
        img.src = `./img/${file}`;
        imageCache[file] = img;
    });
    Object.entries(pathIconMediumDic).forEach(([path, file]) => {
        const img = new Image();
        img.src = `./img/${file}`;
        imageCache[file] = img;
    });
    PATHS.forEach(p => {
        const img = new Image();
        img.src = `./img/${encodeURIComponent(p)}.png`;
        imageCache[p] = img;
    });
    const bgImg = new Image();
    bgImg.src = "./img/BG.png";
    imageCache["BG.png"] = bgImg;
}
preloadPathImages();

function baseNodes(extra = []) {
    return [
        ["n0", "屬性加成", 50, 8, "minor"],
        ["talent", "天賦", 50, 22, "major"],
        ["basic", "普攻", 33, 35, "major"],
        ["ult", "終結技", 50, 39, "major"],
        ["skill", "戰技", 67, 35, "major"],
        ["s1", "屬性加成", 24, 50, "minor"], ["s2", "屬性加成", 76, 50, "minor"],
        ["tech", "秘技", 50, 61, "major"],
        ["a1", "額外能力", 34, 73, "major"], ["a2", "額外能力", 66, 73, "major"],
        ["s3", "屬性加成", 25, 81, "minor"], ["s4", "屬性加成", 75, 81, "minor"],
        ["a3", "額外能力", 50, 88, "major"],
        ...extra
    ];
}

const DEBUG_TRACE = false;

function tracePoint(xPercent, yPercent) {
    return {
        x: Number(xPercent) * 10,
        y: Number(yPercent) * 10
    };
}

function getNodePoint(node) {
    return tracePoint(node[2], node[3]);
}

function makeEdgePath(edge, byId) {
    const a = byId[edge.from];
    const b = byId[edge.to];

    if (!a || !b) return null;

    const p1 = getNodePoint(a);
    const p2 = getNodePoint(b);

    if (edge.type === "line" || !edge.type) {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    if (edge.type === "curve") {
        const control = tracePoint(edge.control[0], edge.control[1]);
        return `M ${p1.x} ${p1.y} Q ${control.x} ${control.y} ${p2.x} ${p2.y}`;
    }

    if (edge.type === "bezier") {
        const c1 = tracePoint(edge.c1[0], edge.c1[1]);
        const c2 = tracePoint(edge.c2[0], edge.c2[1]);
        return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
    }

    return null;
}

function renderDebugPoint(svg, point, label) {
    const pt = tracePoint(point[0], point[1]);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pt.x);
    circle.setAttribute("cy", pt.y);
    circle.setAttribute("r", 5);
    circle.setAttribute("class", "debug-point");
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pt.x);
    text.setAttribute("y", pt.y - 7);
    text.setAttribute("class", "debug-text");
    text.textContent = label;
    svg.appendChild(text);
}

const layouts = {
    "毀滅": {
        nodes: [
            ["topC", "屬性加成", 50, 60/7, "minor"], ["topL", "屬性加成", 228/7, 90/7, "minor"], ["topR", "屬性加成", 472/7, 90/7, "minor"],
            ["coreTop", "額外能力", 50, 152/7, "special"], ["talent", "天賦", 50, 242/7, "major"],
            ["basic", "普攻", 228/7, 334/7, "major"], ["ult", "終結技", 50, 366/7, "major"], ["skill", "戰技", 472/7, 334/7, "major"],
            ["l1", "屬性加成", 138/7, 302/7, "minor"], ["l2", "屬性加成", 46/7, 396/7, "minor"], ["l3", "屬性加成", 138/7, 486/7, "minor"],
            ["r1", "屬性加成", 562/7, 302/7, "minor"], ["r2", "屬性加成", 654/7, 396/7, "minor"], ["r3", "屬性加成", 562/7, 486/7, "minor"],
            ["tech", "秘技", 50, 516/7, "major"], ["coreL", "額外能力", 226/7, 578/7, "special"], ["coreR", "額外能力", 470/7, 578/7, "special"],
            ["bottom", "屬性加成", 50, 608/7, "minor"]
        ],
        edges: [
            { from: "topL", to: "topR", type: "bezier", c1: [39, 7], c2: [61, 7] },
            { from: "topC", to: "bottom", type: "line" },

            { from: "basic", to: "skill", type: "curve", control: [50, 56] },
            { from: "l1", to: "l2", type: "line" },
            { from: "l2", to: "l3", type: "line" },
            { from: "r1", to: "r2", type: "line" },
            { from: "r2", to: "r3", type: "line" },
            { from: "coreL", to: "l3", type: "line" },
            { from: "coreR", to: "r3", type: "line" },
            { from: "coreL", to: "coreR", type: "curve", control: [50, 450/7] }
        ]
    },
    "智識": {
        nodes: [
            ["top", "額外能力", 50, 94/7, "special"], ["tl", "屬性加成", 198/7, 122/7, "minor"], ["tr", "屬性加成", 502/7, 122/7, "minor"],
            ["talent", "天賦", 50, 216/7, "major"],
            ["extraL", "額外能力", 136/7, 366/7, "special"], ["basic", "普攻", 230/7, 366/7, "major"], ["ult", "終結技", 50, 366/7, "major"], ["skill", "戰技", 472/7, 366/7, "major"], ["extraR", "額外能力", 562/7, 366/7, "special"],
            ["l1", "屬性加成", 76/7, 274/7, "minor"], ["l2", "屬性加成", 46/7, 366/7, "minor"], ["l3", "屬性加成", 76/7, 458/7, "minor"],
            ["r1", "屬性加成", 622/7, 274/7, "minor"], ["r2", "屬性加成", 652/7, 366/7, "minor"], ["r3", "屬性加成", 622/7, 458/7, "minor"],
            ["tech", "秘技", 50, 578/7, "major"], ["bl", "屬性加成", 228/7, 548/7, "minor"], ["br", "屬性加成", 472/7, 548/7, "minor"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "bezier", c1: [198/7, 94/7], c2: [502/7, 94/7] },
            { from: "top", to: "tech", type: "line" },
            { from: "l2", to: "r2", type: "line" },
            { from: "l1", to: "l3", type: "bezier", c1: [5, 45], c2: [5, 60] },
            { from: "r1", to: "r3", type: "bezier", c1: [95, 45], c2: [95, 60] },
            { from: "bl", to: "br", type: "bezier", c1: [41, 578/7+2], c2: [59, 578/7+2] },
        ]
    },
    "同諧": {
        nodes: [
            ["top", "屬性加成", 50, 60/7, "minor"], ["tl", "屬性加成", 228/7, 90/7, "minor"], ["tr", "屬性加成", 472/7, 90/7, "minor"],
            ["coreTop", "額外能力", 50, 152/7, "special"], ["talent", "天賦", 50, 272/7, "major"],
            ["basic", "普攻", 230/7, 306/7, "major"], ["skill", "戰技", 472/7, 306/7, "major"], ["ult", "終結技", 50, 396/7, "major"],
            ["extraL", "額外能力", 106/7, 396/7, "special"], ["extraR", "額外能力", 624/7, 396/7, "special"],
            ["l1", "屬性加成", 136/7, 244/7, "minor"], ["l2", "屬性加成", 46/7, 304/7, "minor"],
            ["r1", "屬性加成", 472/7, 426/7, "minor"], ["r2", "屬性加成", 564/7, 488/7, "minor"],
            ["tech", "秘技", 50, 520/7, "major"], ["bl", "屬性加成", 228/7, 580/7, "minor"], ["bc", "屬性加成", 50, 610/7, "minor"], ["br", "屬性加成", 472/7, 580/7, "minor"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "bezier", c1: [39, 7], c2: [61, 7] },
            { from: "top", to: "bc", type: "line" },
            { from: "extraL", to: "l2", type: "line" },
            { from: "l2", to: "l1", type: "line" },
            { from: "extraR", to: "r2", type: "line" },
            { from: "r2", to: "r1", type: "line" },
            { from: "extraL", to: "extraR", type: "curve", control: [50, 22] },
            { from: "bl", to: "br", type: "bezier", c1: [39, 89], c2: [61, 89] }
        ]
    },
    "歡愉": {
        nodes: [
            ["elation", "歡愉技", 50, 102/7, "elation"],
            ["basic", "普攻", 234/7, 146/7, "major"], ["skill", "戰技", 466/7, 146/7, "major"],
            ["extraL", "額外能力", 124/7, 218/7, "special"], ["ult", "終結技", 50, 238/7, "major"], ["extraR", "額外能力", 576/7, 218/7, "special"],
            ["talent", "天賦", 50, 355/7, "major"],
            ["l1", "屬性加成", 76/7, 327/7, "minor"], ["l2", "屬性加成", 172/7, 370/7, "minor"], ["l3", "屬性加成", 95/7, 433/7, "minor"],
            ["r1", "屬性加成", 624/7, 327/7, "minor"], ["r2", "屬性加成", 528/7, 370/7, "minor"], ["r3", "屬性加成", 605/7, 433/7, "minor"],
            ["tech", "秘技", 50, 472/7, "major"], ["tl", "屬性加乘", 240/7, 447/7, "minor"], ["tr", "屬性加乘", 460/7, 447/7, "minor"],
            ["bottom", "額外能力", 50, 604/7, "special"], ["bl", "屬性加乘", 253/7, 604/7, "minor"], ["br", "屬性加乘", 447/7, 604/7, "minor"],
        ],
        edges: [
            { from: "ult", to: "bottom", type: "line" },
            { from: "bl", to: "br", type: "line" },
            { from: "l2", to: "l3", type: "line" },
            { from: "r2", to: "r3", type: "line" },
            { from: "basic", to: "l3", type: "curve", control: [28/7, 218/7]},
            { from: "skill", to: "r3", type: "curve", control: [652/7, 218/7]},
            { from: "ult", to: "basic", type: "curve", control: [40, 135/7] },
            { from: "ult", to: "skill", type: "curve", control: [60, 135/7] },
            { from: "tl", to: "tr", type: "curve", control: [50, 472/7 + 4] },
        ]
    },
    "巡獵": {
        nodes: [
            ["top", "屬性加成", 50, 60/7, "minor"], ["tl", "屬性加成", 228/7, 90/7, "minor"], ["tr", "屬性加成", 472/7, 90/7, "minor"],
            ["extraTop", "額外能力", 50, 152/7, "special"], ["talent", "天賦", 50, 242/7, "major"],
            ["basic", "普攻", 230/7, 340/7, "major"], ["ult", "終結技", 50, 366/7, "major"], ["skill", "戰技", 472/7, 340/7, "major"],
            ["l1", "屬性加成", 138/7, 244/7, "minor"], ["l2", "屬性加成", 46/7, 304/7, "minor"], ["l3", "屬性加成", 138/7, 394/7, "minor"],
            ["r1", "屬性加成", 562/7, 244/7, "minor"], ["r2", "屬性加成", 654/7, 304/7, "minor"], ["r3", "屬性加成", 562/7, 394/7, "minor"],
            ["extraL", "額外能力", 228/7, 486/7, "special"], ["tech", "秘技", 50, 456/7, "major"], ["extraR", "額外能力", 472/7, 486/7, "special"],
            ["bottom", "屬性加成", 50, 608/7, "minor"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "curve", control: [50, 30/7] },
            { from: "top", to: "bottom", type: "line" },
            { from: "l2", to: "extraL", type: "line" },
            { from: "r2", to: "extraR", type: "line" },
            { from: "basic", to: "l1", type: "line" },
            { from: "skill", to: "r1", type: "line" },
            { from: "basic", to: "skill", type: "curve", control: [50, 400/7] },
            { from: "extraL", to: "extraR", type: "curve", control: [50, 426/7] },
        ]
    },
    "虛無": {
        nodes: [
            ["top", "額外能力", 50, 90/7, "special"], ["tl", "屬性加成", 228/7, 122/7, "minor"], ["tr", "屬性加成", 472/7, 122/7, "minor"],
            ["talent", "天賦", 50, 184/7, "major"],
            ["extraL", "額外能力", 138/7, 244/7, "special"], ["extraR", "額外能力", 564/7, 244/7, "special"],
            ["basic", "普攻", 228/7, 334/7, "major"], ["ult", "終結技", 50, 304/7, "major"], ["skill", "戰技", 472/7, 334/7, "major"],
            ["l1", "屬性加成", 46/7, 334/7, "minor"], ["l2", "屬性加成", 138/7, 426/7, "minor"], ["l3", "屬性加成", 228/7, 518/7, "minor"],
            ["r1", "屬性加成", 656/7, 334/7, "minor"], ["r2", "屬性加成", 564/7, 426/7, "minor"], ["r3", "屬性加成", 472/7, 518/7, "minor"],
            ["tech", "秘技", 50, 426/7, "major"], ["bc", "屬性加成", 50, 518/7, "minor"], ["bottom", "屬性加成", 50, 608/7, "minor"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "curve", control: [50, 60/7] },
            { from: "top", to: "bottom", type: "line" },
            { from: "basic", to: "skill", type: "curve", control: [50, 274/7] },
            { from: "extraL", to: "basic", type: "line" },
            { from: "skill", to: "extraR", type: "line" },
            { from: "extraL", to: "l1", type: "line" },
            { from: "l1", to: "l3", type: "line" },
            { from: "extraR", to: "r1", type: "line" },
            { from: "r1", to: "r3", type: "line" },
        ]
    },
    "豐饒": {
        nodes: [
            ["top", "額外能力", 50, 90/7, "special"], ["tl", "屬性加成", 228/7, 122/7, "minor"], ["tr", "屬性加成", 472/7, 122/7, "minor"],
            ["talent", "天賦", 50, 244/7, "major"],
            ["basic", "普攻", 228/7, 334/7, "major"], ["ult", "終結技", 50, 364/7, "major"], ["skill", "戰技", 472/7, 334/7, "major"],
            ["l1", "屬性加成", 136/7, 274/7, "minor"], ["l2", "屬性加成", 46/7, 364/7, "minor"], ["l3", "屬性加成", 106/7, 456/7, "minor"],
            ["r1", "屬性加成", 564/7, 274/7, "minor"], ["r2", "屬性加成", 656/7, 364/7, "minor"], ["r3", "屬性加成", 594/7, 456/7, "minor"],
            ["tech", "秘技", 50, 486/7, "major"], ["extraL", "額外能力", 198/7, 548/7, "special"], ["extraR", "額外能力", 502/7, 548/7, "special"],
            ["bl", "屬性加成", 288/7, 608/7, "minor"], ["jBottom", "", 50, 588/7, "junction"], ["br", "屬性加成", 410/7, 608/7, "minor"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "curve", control: [50, 60/7]},
            { from: "top", to: "jBottom", type: "line" },
            { from: "basic", to: "skill", type: "curve", control: [50, 55] },
            { from: "ult", to: "tech", type: "line" },
            { from: "l1", to: "l2", type: "line" },
            { from: "l3", to: "l2", type: "line" },
            { from: "extraL", to: "l3", type: "line" },
            { from: "r1", to: "r2", type: "line" },
            { from: "r3", to: "r2", type: "line" },
            { from: "extraR", to: "r3", type: "line" },
            { from: "extraL", to: "extraR", type: "curve", control: [50, 426/7] },
            { from: "bl", to: "br", type: "curve", control: [50, 568/7] }
        ]
    },
    "記憶": {
        nodes: [
            ["topL", "屬性加成", 170/7, 133/7, "minor"], ["topC", "屬性加成", 284/7, 77/7, "minor"], ["topR", "屬性加成", 425/7, 76/7, "minor"],
            ["extraTop", "額外能力", 218/7, 208/7, "special"],
            ["memTalent", "憶靈天賦", 50, 180/7, "rememb"], ["memSkill", "憶靈技", 50, 325/7, "rememb"],
            ["l1", "屬性加成", 91/7, 229/7, "minor"], ["l2", "屬性加成", 66/7, 337/7, "minor"], ["l3", "屬性加成", 91/7, 451/7, "minor"],
            ["tech", "秘技", 161/7, 337/7, "major"], ["basic", "普攻", 218/7, 458/7, "major"], ["ult", "終結技", 50, 510/7, "major"], ["skill", "戰技", 478/7, 458/7, "major"], ["talent", "天賦", 533/7, 337/7, "major"],
            ["extraR", "額外能力", 636/7, 337/7, "special"], ["r1", "屬性加成", 610/7, 229/7, "minor"], ["r2", "屬性加成", 610/7, 451/7, "minor"],
            ["bottom", "額外能力", 50, 610/7, "special"], ["bl", "屬性加成", 245/7, 592/7, "minor"], ["br", "屬性加成", 455/7, 592/7, "minor"]
        ],
        edges: [
            { from: "memTalent", to: "memSkill", type: "line" },
            { from: "topL", to: "topR", type: "curve", control: [290/7, 50/7] },
            { from: "extraTop", to: "topL", type: "line" },
            { from: "tech", to: "l2", type: "line" },
            { from: "l1", to: "l3", type: "curve", control: [40/7, 337/7] },
            { from: "ult", to: "bottom", type: "line" },
            { from: "bl", to: "br", type: "curve", control: [50, 630/7] },
            { from: "talent", to: "extraR", type: "line" },
            { from: "r1", to: "r2", type: "curve", control: [666/7, 337/7] },
            { from: "extraTop", to: "tech", type: "curve", control: [160/7, 255/7] },
            { from: "tech", to: "basic", type: "curve", control: [165/7, 409/7] },
            { from: "basic", to: "ult", type: "curve", control: [274/7, 510/7] },
            { from: "ult", to: "skill", type: "curve", control: [425/7, 510/7] },
            { from: "skill", to: "talent", type: "curve", control: [534/7, 411/7] }
        ]
    },
    "存護": {
        nodes: [
            ["top", "屬性加成", 50, 60/7, "minor"], ["tl", "屬性加成", 228/7, 90/7, "minor"], ["tr", "屬性加成", 472/7, 90/7, "minor"],
            ["extraTop", "額外能力", 50, 152/7, "special"], ["talent", "天賦", 50, 242/7, "major"],
            ["basic", "普攻", 230/7, 396/7, "major"], ["ult", "終結技", 50, 366/7, "major"], ["skill", "戰技", 472/7, 396/7, "major"],
            ["upperL", "屬性加成", 138/7, 302/7, "minor"], ["upperR", "屬性加成", 562/7, 302/7, "minor"],
            ["lowL1", "屬性加成", 78/7, 486/7, "minor"], ["lowL2", "屬性加成", 138/7, 548/7, "minor"],
            ["lowR1", "屬性加成", 622/7, 486/7, "minor"], ["lowR2", "屬性加成", 562/7, 548/7, "minor"],
            ["tech", "秘技", 50, 486/7, "major"], ["bottom", "屬性加成", 50, 578/7, "minor"], ["extraL", "額外能力", 198/7, 608/7, "special"], ["extraR", "額外能力", 502/7, 608/7, "special"]
        ],
        edges: [
            { from: "tl", to: "tr", type: "curve", control: [50, 30/7] },
            { from: "top", to: "bottom", type: "line" },
            { from: "basic", to: "skill", type: "curve", control: [50, 336/7] },
            { from: "extraL", to: "extraR", type: "curve", control: [50, 548/7] },
            { from: "lowL1", to: "extraL", type: "line" },
            { from: "lowR1", to: "extraR", type: "line" },
            { from: "basic", to: "upperL", type: "line" },
            { from: "skill", to: "upperR", type: "line" },
        ]
    }
};

function fieldsForPath(path) {
    if (path === "記憶") return MEMORY_TYPES;
    if (path === "歡愉") return ELATION_TYPES;
    return STANDARD_TYPES;
}

function defaultNodeData(tuple) {
    return {
        id: tuple[0],
        type: tuple[1],
        name: "",
        description: "",
        icon: "",
        tag: "",
        energy: "",
        energyCost: "",
        toughness: "",
        skills: [
            { name: "", description: "", icon: "", tag: "", energy: "", energyCost: "", toughness: "" }
        ]
    };
}
function freshCharacter(name, path) {
    const nodes = {};
    layouts[path].nodes.forEach(n => { if (n[4] !== "junction") nodes[n[0]] = defaultNodeData(n) });
    return { id: "ch_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), name, path, background: "", nodes };
}

const defaultCharacters = PATHS.map(p => {
    const c = freshCharacter(p, p);
    c.id = `demo-${p}`;
    return c;
});

let appState = {
    version: 4,
    currentCharacterId: defaultCharacters[0].id,
    characters: defaultCharacters
};

const $ = s => document.querySelector(s);
const tree = $("#tree"), drawer = $("#drawer"), traceGroup = $("#traceGroup");
const viewPane = $("#viewPane"), editPane = $("#editPane");
let selectedNodeId = null;

function currentCharacter() {
    return appState.characters.find(c => c.id === appState.currentCharacterId) || appState.characters[0];
}
function ensurePathNodes(c) {
    const template = layouts[c.path];
    const allowed = new Set(template.nodes.filter(n => n[4] !== "junction").map(n => n[0]));
    for (const t of template.nodes) {
        if (t[4] === "junction") continue;
        if (!c.nodes[t[0]]) c.nodes[t[0]] = defaultNodeData(t);
        const node = c.nodes[t[0]];
        node.type = node.type || t[1];
        if (!node.skills || !Array.isArray(node.skills) || node.skills.length === 0) {
            node.skills = [{
                name: node.name || "",
                description: node.description || "",
                icon: node.icon || "",
                tag: node.tag || "",
                energy: node.energy || "",
                energyCost: node.energyCost || "",
                toughness: node.toughness || ""
            }];
        }
    }
    Object.keys(c.nodes).forEach(k => { if (!allowed.has(k)) delete c.nodes[k] });
}
function initSelects() {
    if ($("#newCharacterPath")) {
        $("#newCharacterPath").innerHTML = PATHS.map(p => `<option value="${p}">${p}</option>`).join("");
    }
    refreshCharacterSelect();
}
function getCharacterDisplayName(x) {
    if (!x) return "";
    const name = (x.name || "").trim() || x.path || "未命名";
    const path = x.path || "";
    if (!path) return name;
    if (name.endsWith(`(${path})`) || name.endsWith(`（${path}）`)) {
        return name;
    }
    return `${name} (${path})`;
}

function refreshCharacterSelect() {
    const c = currentCharacter();
    const tabsContainer = $("#characterTabs");
    if (tabsContainer) {
        if (!tabsContainer.dataset.wheelBound) {
            tabsContainer.dataset.wheelBound = "true";
            tabsContainer.addEventListener("wheel", (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    tabsContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }

        tabsContainer.innerHTML = appState.characters.map(x => {
            const iconFile = pathIconMediumDic[x.path] || "";
            const iconHTML = iconFile ? `<img class="char-tab-icon" src="./img/${iconFile}" alt="${escapeHTML(x.path)}">` : "";
            const isActive = x.id === c.id ? "active" : "";
            const label = getCharacterDisplayName(x);
            return `<button type="button" class="char-tab ${isActive}" data-id="${x.id}" title="${escapeHTML(label)}">${iconHTML}<span>${escapeHTML(x.name)}</span></button>`;
        }).join("");

        tabsContainer.querySelectorAll(".char-tab").forEach(tab => {
            tab.onclick = () => {
                const targetId = tab.dataset.id;
                if (appState.currentCharacterId === targetId) return;
                appState.currentCharacterId = targetId;
                playNodeSound();
                selectedNodeId = null;
                refreshCharacterSelect();
                renderTree();
                closeDrawer();
                setStatus(`已切換至角色「${getCharacterDisplayName(currentCharacter())}」`);
            };
        });
    }
    if ($("#pathTag")) $("#pathTag").textContent = c.path;
}
function escapeHTML(s = "") { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])) }
function nodeTuple(id) { return layouts[currentCharacter().path].nodes.find(n => n[0] === id) }

function formatSkillDescription(text = "") {
    if (!text) return "";
    let escaped = escapeHTML(text);

    // 1. Highlight slash values like 20%/40%, 100/200, 1.5%/3.0%, +20%/+40% (uses var(--color-highlight))
    escaped = escaped.replace(/(?:(?:\+|-)?\d+(?:\.\d+)?%?\s*\/\s*)+(?:\+|-)?\d+(?:\.\d+)?%?/g, match => {
        return `<span class="text-highlight">${match}</span>`;
    });

    // 2. Element damage colors (uses var(--color-*) defined in :root)
    const elementClassMap = {
        "雷屬性": "elem-lightning", "雷属性": "elem-lightning",
        "風屬性": "elem-wind", "风属性": "elem-wind",
        "冰屬性": "elem-ice", "冰属性": "elem-ice",
        "火屬性": "elem-fire", "火属性": "elem-fire",
        "物理屬性": "elem-physical", "物理属性": "elem-physical",
        "虛數屬性": "elem-imaginary", "虚数属性": "elem-imaginary",
        "量子屬性": "elem-quantum", "量子属性": "elem-quantum"
    };

    const elemPattern = /(雷[屬属]性|風[屬属]性|风[屬属]性|冰[屬属]性|火[屬属]性|物理[屬属]性|虛數[屬属]性|虚数[屬属]性|量子[屬属]性)(?=(?:[屬属]性)?(?:傷害|伤害))/g;

    escaped = escaped.replace(elemPattern, (match) => {
        const cls = elementClassMap[match] || "elem-lightning";
        return `<span class="${cls}">${match}</span>`;
    });

    return escaped;
}

function hasEnteredSkill(d) {
    if (!d) return false;
    if (d.name && d.name.trim()) return true;
    if (d.description && d.description.trim()) return true;
    if (d.skills && Array.isArray(d.skills)) {
        return d.skills.some(s =>
            (s.name && s.name.trim()) ||
            (s.description && s.description.trim()) ||
            (s.tag && s.tag.trim()) ||
            (s.energyCost && s.energyCost.trim()) ||
            (s.energy && s.energy.trim()) ||
            (s.toughness && s.toughness.trim())
        );
    }
    return false;
}

function getNodeAbbr(nodeType, nodeId, path) {
    if (!nodeType) return "";
    if (nodeType === "額外能力") {
        const layout = layouts[path];
        if (layout && layout.nodes) {
            const extraNodes = layout.nodes.filter(n => n[1] === "額外能力");
            const idx = extraNodes.findIndex(n => n[0] === nodeId);
            return `Ex${idx >= 0 ? idx + 1 : 1}`;
        }
        return "Ex";
    }
    const map = {
        "普攻": "普",
        "戰技": "戰",
        "終結技": "終",
        "天賦": "天",
        "秘技": "秘",
        "歡愉技": "歡",
        "憶靈技": "憶",
        "憶靈天賦": "賦",
        "屬性加成": "屬"
    };
    return map[nodeType] || nodeType.slice(0, 1);
}

function renderTree() {
    const c = currentCharacter(); ensurePathNodes(c);
    const tg = $("#traceGroup");
    const pathIcon = $("#path-icon");
    tg.querySelectorAll(".node").forEach(n => n.remove());

    const bgUrl = c.background || (c.path ? `${img_dic[c.path]}` : "");
    if (pathIcon){
        pathIcon.src = bgUrl ? `./img/${bgUrl}` : "none";
        pathIcon.className = `path-icon ${img_dic[c.path].split('.')[0].replace('Path_', '')}`
        pathIcon.style.transition = "scale 0s cubic-bezier(.4,0,.2,1)";
        pathIcon.style.scale = 1.1;
        pathIcon.style.opacity = 0.25;
        setTimeout(() => {
            pathIcon.style.transition = "scale 0.5s cubic-bezier(.4,0,.2,1)";
            pathIcon.style.scale = 1;
            pathIcon.style.opacity = 0.5;
        }, 10);
    } 

    const lines = document.getElementById("lines");
    if (lines) {
        lines.innerHTML = "";
        const layout = layouts[c.path];
        const byId = Object.fromEntries(layout.nodes.map(node => [node[0], node]));
        if (!byId.tl && byId.topL) byId.tl = byId.topL;
        if (!byId.tr && byId.topR) byId.tr = byId.topR;
        if (!byId.top && byId.topC) byId.top = byId.topC;
        if (!byId.l1 && byId.upperL) byId.l1 = byId.upperL;
        if (!byId.r1 && byId.upperR) byId.r1 = byId.upperR;
        if (!byId.extraL && byId.tech) byId.extraL = byId.tech;

        if (layout.edges && Array.isArray(layout.edges)) {
            layout.edges.forEach(edge => {
                const d = makeEdgePath(edge, byId);
                if (!d) return;

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", d);
                path.setAttribute("class", "trace-line");
                lines.appendChild(path);

                if (DEBUG_TRACE) {
                    if (edge.type === "curve" && edge.control) {
                        renderDebugPoint(lines, edge.control, "C");
                    } else if (edge.type === "bezier") {
                        if (edge.c1) renderDebugPoint(lines, edge.c1, "C1");
                        if (edge.c2) renderDebugPoint(lines, edge.c2, "C2");
                    }
                }
            });
        }
    }

    layouts[c.path].nodes.forEach(t => {
        if (t[4] === "junction") return;
        const d = c.nodes[t[0]];
        const el = document.createElement("div");
        el.className = "node " + (t[4] === "major" ? "major" : t[4] === "special" ? "special" : t[4] === "elation" ? "elation" : t[4] === "rememb" ? "rememb" : "");
        el.style.left = t[2] + "%";
        el.style.top = t[3] + "%";
        el.dataset.id = t[0];
        const primaryIcon = (d.skills && d.skills[0] && d.skills[0].icon) || d.icon;
        const hasSkill = hasEnteredSkill(d);

        if (primaryIcon) {
            el.innerHTML = `<div class="node-icon" style="-webkit-mask-image: url('${primaryIcon}'); mask-image: url('${primaryIcon}');"></div>`;
        } else if (hasSkill) {
            const abbr = getNodeAbbr(d.type || t[1], t[0], c.path);
            el.innerHTML = `<span class="node-abbr">${escapeHTML(abbr)}</span>`;
        } else {
            el.innerHTML = `<span class="node-placeholder"></span>`;
        }

        if (t[4] !== "minor") el.insertAdjacentHTML("beforeend", `<span class="node-label">${escapeHTML(d.type)}</span>`);
        el.addEventListener("click", e => { e.stopPropagation(); selectNode(t[0]) });
        tg.appendChild(el);
    });
    if (selectedNodeId && c.nodes[selectedNodeId]) selectNode(selectedNodeId, false); else closeDrawer();
}
function selectNode(id, open = true) {
    selectedNodeId = id;
    const tg = $("#traceGroup");
    tg.querySelectorAll(".node").forEach(n => n.classList.toggle("active", n.dataset.id === id));
    renderView(); renderEdit();
    if (open) {
        drawer.classList.add("open");
        tree.classList.add("drawer-open");
    }
}
function closeDrawer() {
    selectedNodeId = null;
    drawer.classList.remove("open");
    tree.classList.remove("drawer-open");
    const tg = $("#traceGroup");
    if (tg) tg.querySelectorAll(".node").forEach(n => n.classList.remove("active"));
}
function renderView() {
    const c = currentCharacter(), d = c.nodes[selectedNodeId];
    if (!d) { viewPane.innerHTML = ""; return }

    const skills = (d.skills && Array.isArray(d.skills) && d.skills.length > 0) ? d.skills : [{
        name: d.name || "",
        description: d.description || "",
        icon: d.icon || "",
        tag: d.tag || "",
        energy: d.energy || "",
        energyCost: d.energyCost || "",
        toughness: d.toughness || ""
    }];

    const headerHTML = `
      <div class="node-view-header">
        <div class="node-type-capsule">${escapeHTML(d.type || "技能")}</div>
      </div>
    `;

    const hideTagTypes = ["額外能力", "屬性加成", "屬性加乘"];
    const shouldHideTag = hideTagTypes.includes(d.type);

    const cardsHTML = skills.map((skill, index) => {
        const rawName = (skill.name || "").trim();
        const displayName = rawName || "未命名技能";
        const rawTag = (skill.tag || "").trim();
        const displayTag = shouldHideTag ? "" : (rawTag ? (rawTag.startsWith("[") ? rawTag : `[${rawTag}]`) : `[${d.type || "技能"}]`);
        const iconSrc = skill.icon || d.icon;
        const energyCostVal = skill.energyCost || (index === 0 ? d.energyCost : "");

        return `
        <div class="skill-card">
          <div class="skill-head">
            ${iconSrc ? `
              <div class="skill-preview">
                <img src="${iconSrc}" alt="">
              </div>
            ` : ""}
            <div class="skill-name">${escapeHTML(displayName)}</div>
          </div>

          ${(displayTag || energyCostVal || skill.energy) ? `
          <div class="skill-subrow">
            ${displayTag ? `<div class="skill-tag">${escapeHTML(displayTag)}</div>` : `<div></div>`}
            <div class="skill-badges-group">
              ${energyCostVal ? `<div class="skill-energy-cost-badge">能量消耗: ${escapeHTML(energyCostVal)}</div>` : ""}
              ${skill.energy ? `<div class="skill-energy-badge">能量恢復: ${escapeHTML(skill.energy)}</div>` : ""}
            </div>
          </div>
          ` : ""}

          ${skill.toughness ? `
            <div class="skill-toughness-bar">
              <span class="toughness-label">削韌值</span>
              <span class="toughness-val">${escapeHTML(skill.toughness)}</span>
            </div>
          ` : ""}

          <div class="skill-desc">${formatSkillDescription(skill.description || "技能敘述尚未填寫。")}</div>
        </div>
        `;
    }).join("");

    viewPane.innerHTML = headerHTML + cardsHTML;
}
function saveFormToMemory(d) {
    if (!editPane || !d.skills) return;
    d.skills.forEach((skill, i) => {
        const nameInput = editPane.querySelector(`.f-skill-name[data-index="${i}"]`);
        const tagInput = editPane.querySelector(`.f-skill-tag[data-index="${i}"]`);
        const energyCostInput = editPane.querySelector(`.f-skill-energy-cost[data-index="${i}"]`);
        const energyInput = editPane.querySelector(`.f-skill-energy[data-index="${i}"]`);
        const toughnessInput = editPane.querySelector(`.f-skill-toughness[data-index="${i}"]`);
        const descInput = editPane.querySelector(`.f-skill-desc[data-index="${i}"]`);

        if (nameInput) skill.name = nameInput.value;
        if (tagInput) skill.tag = tagInput.value;
        if (energyCostInput) skill.energyCost = energyCostInput.value;
        if (energyInput) skill.energy = energyInput.value;
        if (toughnessInput) skill.toughness = toughnessInput.value;
        if (descInput) skill.description = descInput.value;
    });
}
function renderEdit() {
    const c = currentCharacter(), d = c.nodes[selectedNodeId];
    if (!d) { editPane.innerHTML = ""; return }
    const types = fieldsForPath(c.path);
    const isUltimate = d.type === "終結技";

    if (!d.skills || !Array.isArray(d.skills) || d.skills.length === 0) {
        d.skills = [{
            name: d.name || "",
            description: d.description || "",
            icon: d.icon || "",
            tag: d.tag || "",
            energy: d.energy || "",
            energyCost: d.energyCost || "",
            toughness: d.toughness || ""
        }];
    }

    const skillsHTML = d.skills.map((skill, i) => `
        <div class="edit-skill-block" data-index="${i}">
            <div class="edit-skill-header">
                <span class="skill-index-badge">技能 #${i + 1}</span>
                ${d.skills.length > 1 ? `<button type="button" class="btn-delete-skill" data-del-index="${i}">刪除此技能</button>` : ""}
            </div>
            <div class="form-row">
                <label>技能名稱</label>
                <input class="f-skill-name" data-index="${i}" value="${escapeHTML(skill.name)}" placeholder="例如：盡情取悅本王吧">
            </div>
            <div class="form-row">
                <label>技能圖示（以 Data URL 存入 JSON）</label>
                <div class="filebox">
                    <input type="file" class="f-skill-icon-file" data-index="${i}" accept="image/*">
                    <button type="button" class="btn-clear-icon" data-index="${i}">清除</button>
                </div>
                ${skill.icon ? `<div class="edit-icon-thumb"><img src="${skill.icon}" alt="預覽"></div>` : ""}
            </div>
            <div class="form-row">
                <label>技能標籤 / 類型補充</label>
                <input class="f-skill-tag" data-index="${i}" value="${escapeHTML(skill.tag)}" placeholder="例如：群攻、強化、單攻">
            </div>
            ${isUltimate ? `
            <div class="row3">
                <div class="form-row">
                    <label>能量消耗</label>
                    <input class="f-skill-energy-cost" data-index="${i}" value="${escapeHTML(skill.energyCost || "")}" placeholder="例如：120">
                </div>
                <div class="form-row">
                    <label>能量恢復</label>
                    <input class="f-skill-energy" data-index="${i}" value="${escapeHTML(skill.energy)}" placeholder="例如：5">
                </div>
                <div class="form-row">
                    <label>削韌值</label>
                    <input class="f-skill-toughness" data-index="${i}" value="${escapeHTML(skill.toughness)}" placeholder="例如：60">
                </div>
            </div>
            ` : `
            <div class="row2">
                <div class="form-row">
                    <label>能量恢復</label>
                    <input class="f-skill-energy" data-index="${i}" value="${escapeHTML(skill.energy)}" placeholder="例如：10">
                </div>
                <div class="form-row">
                    <label>削韌值</label>
                    <input class="f-skill-toughness" data-index="${i}" value="${escapeHTML(skill.toughness)}" placeholder="例如：20">
                </div>
            </div>
            `}
            <div class="form-row">
                <label>技能敘述（數值如 20%/40% 自動橘色顯示，屬性傷害如 雷屬性傷害 自動著色）</label>
                <textarea class="f-skill-desc" data-index="${i}" placeholder="輸入技能效果...">${escapeHTML(skill.description)}</textarea>
            </div>
        </div>
    `).join("");

    editPane.innerHTML = `
        <div class="panel-title">${escapeHTML(c.path)}・節點資料編輯</div>
        <div class="form-row"><label>節點類型</label>
            <select id="fType">${types.map(x => `<option ${x === d.type ? "selected" : ""}>${x}</option>`).join("")}</select>
        </div>
        <div class="edit-skills-container">
            ${skillsHTML}
        </div>
        <button type="button" id="btnAddSkill" class="btn-add-skill">＋ 新增技能項目</button>
        <div class="edit-actions">
            <button id="saveSkill"><span class="v"><svg fill="#000000" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64px" height="64px" viewBox="0 0 335.765 335.765" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracurrentColorerCarrier" stroke-linecurrentcap="round" stroke-linejoin="round"></g><g id="SVGRepo_icurrentColoronCarrier"> <g> <g> <polygon points="311.757,41.803 107.573,245.96 23.986,162.364 0,186.393 107.573,293.962 335.765,65.795 "></polygon> </g> </g> </g></svg></span>套用變更</button>
        </div>
    `;

    $("#fType").onchange = (e) => {
        saveFormToMemory(d);
        d.type = e.target.value;
        renderEdit();
    };

    $("#btnAddSkill").onclick = () => {
        saveFormToMemory(d);
        d.skills.push({ name: "", description: "", icon: "", tag: "", energy: "", energyCost: "", toughness: "" });
        renderEdit();
    };

    editPane.querySelectorAll(".btn-delete-skill").forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.target.dataset.delIndex, 10);
            saveFormToMemory(d);
            if (d.skills.length > 1) {
                d.skills.splice(idx, 1);
                renderEdit();
            }
        };
    });

    editPane.querySelectorAll(".f-skill-icon-file").forEach(input => {
        input.onchange = (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            const file = e.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = () => {
                saveFormToMemory(d);
                d.skills[idx].icon = r.result;
                renderEdit();
                setStatus("技能圖示已加入");
            };
            r.readAsDataURL(file);
        };
    });

    editPane.querySelectorAll(".btn-clear-icon").forEach(btn => {
        btn.onclick = (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            saveFormToMemory(d);
            d.skills[idx].icon = "";
            renderEdit();
        };
    });

    $("#saveSkill").onclick = () => {
        saveFormToMemory(d);
        d.type = $("#fType").value;
        if (d.skills.length > 0) {
            d.name = d.skills[0].name;
            d.icon = d.skills[0].icon;
            d.tag = d.skills[0].tag;
            d.energyCost = d.skills[0].energyCost || "";
            d.energy = d.skills[0].energy;
            d.toughness = d.skills[0].toughness;
            d.description = d.skills[0].description;
        }
        renderTree();
        selectNode(d.id);
        switchTab("view");
        setStatus("技能資料已更新");
    };
}
function switchTab(tab) {
    const edit = tab === "edit";
    $("#viewTab").classList.toggle("active", !edit); $("#editTab").classList.toggle("active", edit);
    viewPane.classList.toggle("hidden", edit); editPane.classList.toggle("hidden", !edit);
}
function setStatus(s) { $("#status").textContent = s; clearTimeout(setStatus.t); setStatus.t = setTimeout(() => $("#status").textContent = "點擊節點查看；點擊背景收起面板", 2600) }

$("#viewTab").onclick = () => switchTab("view");
$("#editTab").onclick = () => switchTab("edit");
$("#editSelectedBtn").onclick = () => {
    if (!selectedNodeId) { setStatus("請先選擇一個行跡節點"); return }
    drawer.classList.add("open");
    tree.classList.add("drawer-open");
    switchTab("edit");
};
// Sound effect triggers for clicks and cancellations
document.addEventListener("click", (e) => {
    // 1. 取消 / 關閉 / 返回動作 -> cancel.mp3
    const cancelTarget = e.target.closest("#cancelAddCharacter, #cancelImportConfirm, .btn-cancel, [data-action='cancel']");
    if (cancelTarget) {
        playCancelSound();
        return;
    }

    // 2. 切換角色的按鈕點擊本身不播放 click.mp3（切換時由 tab.onclick 觸發 node.mp3，避免產生兩次重複音效）
    if (e.target.closest(".char-tab")) {
        return;
    }

    // 3. 行跡節點 -> node.mp3
    const nodeTarget = e.target.closest(".node");
    if (nodeTarget) {
        playNodeSound();
        return;
    }

    // 4. 一般點擊元件（按鈕、工具列檔案上傳 label、抽屜頁籤等） -> click.mp3
    const clickTarget = e.target.closest("button, .toolbar label, .filebox label, .drawer-tabs button, select");
    if (clickTarget) {
        playClickSound();
        return;
    }
}, true);

tree.addEventListener("click", e => {
    if (e.target.closest(".node")) return;
    if (drawer.classList.contains("open") || selectedNodeId) {
        playCancelSound();
    }
    closeDrawer();
});

$("#characterModal").addEventListener("click", e => {
    if (e.target === $("#characterModal")) {
        $("#characterModal").classList.remove("open");
        playCancelSound();
    }
});

let pendingImportCharacters = [];

function parseCharacterData(data) {
    if (!data) return [];
    if (Array.isArray(data)) {
        return data.filter(c => c && typeof c === "object");
    }
    if (data.characters && Array.isArray(data.characters)) {
        return data.characters;
    }
    if (data.character && typeof data.character === "object") {
        return [data.character];
    }
    if (typeof data === "object" && (data.name !== undefined || data.path !== undefined || data.nodes !== undefined)) {
        return [data];
    }
    return [];
}

function showImportConfirmModal(rawCharacters) {
    const processedCharacters = rawCharacters.map(raw => {
        const path = PATHS.includes(raw.path) ? raw.path : "毀滅";
        const name = (raw.name || "").trim() || path || "自訂角色";
        const charObj = freshCharacter(name, path);
        if (raw.nodes && typeof raw.nodes === "object") {
            charObj.nodes = raw.nodes;
        }
        if (raw.background) {
            charObj.background = raw.background;
        }
        ensurePathNodes(charObj);
        return charObj;
    });

    if (processedCharacters.length === 0) {
        playCancelSound();
        setStatus("未在檔案中找到有效的角色資料");
        alert("未在檔案中找到有效的角色資料。");
        return;
    }

    // 重複偵測：比對當前已有角色以及同批次內是否有相同名稱與命途
    const existingSet = new Set(appState.characters.map(c => `${c.name.trim()}__${c.path}`));
    const seenInBatch = new Set();
    const newCharacters = [];
    let duplicateCount = 0;

    for (const charObj of processedCharacters) {
        const key = `${charObj.name.trim()}__${charObj.path}`;
        if (existingSet.has(key) || seenInBatch.has(key)) {
            duplicateCount++;
        } else {
            seenInBatch.add(key);
            newCharacters.push(charObj);
        }
    }

    if (newCharacters.length === 0) {
        playCancelSound();
        alert("匯入的角色已全部存在於角色列表中，未重複新增。");
        setStatus("匯入角色已全部存在，未重複新增");
        return;
    }

    pendingImportCharacters = newCharacters;

    const hintEl = $("#importConfirmModal .import-hint-text");
    if (hintEl) {
        if (duplicateCount > 0) {
            hintEl.textContent = `偵測到 ${newCharacters.length} 個新角色資料（已略過 ${duplicateCount} 個重複角色），是否確認加入角色列表？`;
        } else if (newCharacters.length === 1) {
            hintEl.textContent = `偵測到角色「${newCharacters[0].name}」的資料，是否確認加入角色列表？`;
        } else {
            hintEl.textContent = `偵測到 ${newCharacters.length} 個角色資料，是否確認加入角色列表？`;
        }
    }

    const listEl = $("#importPreviewList");
    if (listEl) {
        listEl.innerHTML = pendingImportCharacters.map(c => {
            const iconFile = pathIconMediumDic[c.path] || "";
            const iconHTML = iconFile ? `<img src="./img/${iconFile}" alt="${escapeHTML(c.path)}">` : "";
            return `
                <div class="import-preview-card">
                    <div class="import-preview-item">
                        <span class="import-preview-name">${escapeHTML(c.name)}</span>
                        <span class="import-preview-path">(${iconHTML}<span>${escapeHTML(c.path)}</span>)</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    playClickSound();
    $("#importConfirmModal").classList.add("open");
}

$("#cancelImportConfirm").onclick = () => {
    $("#importConfirmModal").classList.remove("open");
    pendingImportCharacters = [];
};

$("#confirmImportConfirm").onclick = () => {
    if (pendingImportCharacters.length === 0) {
        $("#importConfirmModal").classList.remove("open");
        return;
    }
    pendingImportCharacters.forEach(c => {
        appState.characters.push(c);
    });
    appState.currentCharacterId = pendingImportCharacters[0].id;
    $("#importConfirmModal").classList.remove("open");
    refreshCharacterSelect();
    renderTree();
    closeDrawer();
    setStatus(`已成功加入 ${pendingImportCharacters.length} 個角色資料`);
    pendingImportCharacters = [];
};

$("#importConfirmModal").addEventListener("click", e => {
    if (e.target === $("#importConfirmModal")) {
        $("#importConfirmModal").classList.remove("open");
        playCancelSound();
        pendingImportCharacters = [];
    }
});

// Drag and drop JSON file to import characters
let dragCounter = 0;
const dragOverlay = $("#dragOverlay");

window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragOverlay && e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        dragOverlay.classList.add("active");
    }
});

window.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
    }
});

window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        if (dragOverlay) dragOverlay.classList.remove("active");
    }
});

window.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (dragOverlay) dragOverlay.classList.remove("active");

    const files = e.dataTransfer ? e.dataTransfer.files : null;
    if (!files || files.length === 0) {
        playCancelSound();
        return;
    }

    const file = files[0];
    const r = new FileReader();
    r.onload = () => {
        try {
            const data = JSON.parse(r.result);
            const chars = parseCharacterData(data);
            if (!chars || chars.length === 0) {
                playCancelSound();
                alert("未在檔案中找到有效的角色資料。");
                return;
            }
            showImportConfirmModal(chars);
        } catch {
            playCancelSound();
            alert("無法讀取此 JSON，請確認檔案格式正確。");
        }
    };
    r.onerror = () => {
        playCancelSound();
        alert("讀取檔案時發生錯誤。");
    };
    r.readAsText(file);
});

const exportDropdown = $("#exportDropdown");
const exportBtn = $("#exportBtn");
if (exportBtn && exportDropdown) {
    exportBtn.onclick = (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle("open");
    };
}

document.addEventListener("click", (e) => {
    if (exportDropdown && !exportDropdown.contains(e.target)) {
        exportDropdown.classList.remove("open");
    }
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        let closed = false;
        if (exportDropdown && exportDropdown.classList.contains("open")) {
            exportDropdown.classList.remove("open");
            closed = true;
        } else if ($("#characterModal").classList.contains("open")) {
            $("#characterModal").classList.remove("open");
            closed = true;
        } else if ($("#importConfirmModal") && $("#importConfirmModal").classList.contains("open")) {
            $("#importConfirmModal").classList.remove("open");
            pendingImportCharacters = [];
            closed = true;
        } else if (drawer.classList.contains("open")) {
            closeDrawer();
            closed = true;
        }
        if (closed) {
            playCancelSound();
        }
    }
});

$("#addCharacterBtn").onclick = () => $("#characterModal").classList.add("open");
$("#cancelAddCharacter").onclick = () => $("#characterModal").classList.remove("open");
$("#confirmAddCharacter").onclick = () => {
    const path = $("#newCharacterPath").value;
    const name = $("#newCharacterName").value.trim() || path || "未命名角色";
    const c = freshCharacter(name, path);
    appState.characters.push(c);
    appState.currentCharacterId = c.id;
    $("#newCharacterName").value = "";
    $("#characterModal").classList.remove("open");
    refreshCharacterSelect();
    renderTree();
    setStatus(`已新增角色「${getCharacterDisplayName(c)}」`);
};
$("#bgUpload").onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => { currentCharacter().background = r.result; renderTree(); setStatus("背景圖已更換") }; r.readAsDataURL(file);
};

function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const exportCurrentBtn = $("#exportCurrentBtn");
if (exportCurrentBtn) {
    exportCurrentBtn.onclick = (e) => {
        e.stopPropagation();
        if (exportDropdown) exportDropdown.classList.remove("open");
        const c = currentCharacter();
        const charData = {
            name: c.name,
            path: c.path,
            background: c.background || "",
            nodes: c.nodes
        };
        const json = JSON.stringify(charData, null, 2);
        const fileName = `${c.name || "角色"}_(${c.path})_行跡.json`;
        downloadJSON(json, fileName);
        setStatus(`已匯出角色「${getCharacterDisplayName(c)}」`);
    };
}

const exportAllBtn = $("#exportAllBtn");
if (exportAllBtn) {
    exportAllBtn.onclick = (e) => {
        e.stopPropagation();
        if (exportDropdown) exportDropdown.classList.remove("open");
        const allData = {
            version: appState.version || 4,
            characters: appState.characters
        };
        const json = JSON.stringify(allData, null, 2);
        downloadJSON(json, "星穹鐵道_全部角色行跡.json");
        setStatus(`已匯出全部 ${appState.characters.length} 個角色資料`);
    };
}

$("#importInput").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const data = JSON.parse(r.result);
            const chars = parseCharacterData(data);
            if (!chars || chars.length === 0) {
                playCancelSound();
                alert("未在檔案中找到有效的角色資料。");
                return;
            }
            showImportConfirmModal(chars);
        } catch {
            playCancelSound();
            alert("無法讀取此 JSON，請確認檔案格式。");
        }
    };
    r.onerror = () => {
        playCancelSound();
        alert("讀取檔案時發生錯誤。");
    };
    r.readAsText(file);
    e.target.value = "";
};
$("#resetLayoutBtn").onclick = () => {
    if (!confirm("重設目前角色的行跡節點資料？技能文字與圖示也會清空。")) return;
    const c = currentCharacter(); c.nodes = {}; ensurePathNodes(c); selectedNodeId = null; renderTree(); closeDrawer(); setStatus("已重設目前命途");
};

initSelects(); refreshCharacterSelect(); renderTree();