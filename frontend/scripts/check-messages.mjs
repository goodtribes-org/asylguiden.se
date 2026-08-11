#!/usr/bin/env node
/**
 * Checks that every messages/<locale>.json has the same key tree as sv.json.
 *
 * Seven files kept in step by hand drift within a month, and a key missing in
 * next-intl surfaces either as a thrown error or as an empty string depending
 * on configuration — both bad, and neither obvious in review. This turns the
 * acceptance criterion into something that keeps holding.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");
const REFERENCE = "sv";

function keyPaths(node, prefix = "") {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node).flatMap(([key, value]) =>
      keyPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function load(locale) {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8"));
}

const locales = readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

if (!locales.includes(REFERENCE)) {
  console.error(`✗ reference locale ${REFERENCE}.json is missing`);
  process.exit(1);
}

const reference = new Set(keyPaths(load(REFERENCE)));
let failed = false;

for (const locale of locales.filter((l) => l !== REFERENCE)) {
  const keys = new Set(keyPaths(load(locale)));
  const missing = [...reference].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !reference.has(k));

  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${locale}.json differs from ${REFERENCE}.json`);
    for (const k of missing) console.error(`    missing: ${k}`);
    for (const k of extra) console.error(`    unexpected: ${k}`);
  } else {
    console.log(`✓ ${locale}.json — ${keys.size} keys`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nAll ${locales.length} locales match ${REFERENCE}.json (${reference.size} keys).`);
