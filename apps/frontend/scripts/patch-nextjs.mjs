#!/usr/bin/env node
/**
 * Patches Next.js to fix Node 24/25 compatibility issues
 * This runs as a postinstall script to ensure the patch is applied on Vercel
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextBuildIdPath = join(__dirname, '../node_modules/next/dist/build/generate-build-id.js');

if (!existsSync(nextBuildIdPath)) {
    console.log('[patch-nextjs] Next.js not found, skipping patch');
    process.exit(0);
}

let content = readFileSync(nextBuildIdPath, 'utf8');

// Check if already patched
if (content.includes("typeof generate === 'function'")) {
    console.log('[patch-nextjs] Already patched, skipping');
    process.exit(0);
}

// Apply patch for generateBuildId
const original = 'let buildId = await generate();';
const patched = "let buildId = typeof generate === 'function' ? await generate() : null;";

if (content.includes(original)) {
    content = content.replace(original, patched);
    writeFileSync(nextBuildIdPath, content);
    console.log('[patch-nextjs] Successfully patched generate-build-id.js');
} else {
    console.log('[patch-nextjs] Could not find pattern to patch');
}
