const fs = require('fs');
const THREE = require('./frontend/libs/three.min.js');
// Node doesn't have DOM, so we can't easily run MMDLoader which relies on fetch/FileLoader.
// Let's use a simple binary parser for the PMX format in Node.
