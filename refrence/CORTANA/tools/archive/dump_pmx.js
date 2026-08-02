const fs = require('fs');
const { Parser } = require('./frontend/libs/mmdparser.min.js');

const buffer = fs.readFileSync('model/test/Chisa/Chisa.pmx');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const parser = new Parser();
const pmx = parser.parsePmx(arrayBuffer);

console.log("=== BONES ===");
pmx.bones.forEach((b, i) => console.log(`[${i}] ${b.name} (${b.englishName || ''})`));

console.log("\n=== MORPHS ===");
pmx.morphs.forEach((m, i) => console.log(`[${i}] ${m.name} (${m.englishName || ''})`));
