#!/usr/bin/env node
const suite = process.argv[2] || 'tests';
console.log(`Skipping ${suite} suite (no automated coverage in this repo).`);
process.exit(0);
