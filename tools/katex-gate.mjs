#!/usr/bin/env node
import { readFileSync } from "node:fs";
import katex from "katex";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run validate:katex -- <file.md>");
  process.exit(2);
}

const src = readFileSync(path, "utf8");
const lines = src.split(/\r?\n/);
const failures = [];
const bracketBlocks = [];
const bareTex = [];
const badEquals = [];
let inFence = false;
let displayCount = 0;
let inlineCount = 0;

function preview(expr) {
  return expr.trim().split(/\n/).slice(0, 7).join(" / ").slice(0, 260);
}

function checkMath(expr, displayMode, line) {
  try {
    katex.renderToString(expr.replace(/[ \t]+$/gm, "").trim(), {
      displayMode,
      throwOnError: true,
      strict: "warn",
      trust: false,
    });
  } catch (e) {
    failures.push({
      line,
      mode: displayMode ? "display" : "inline",
      message: String(e?.message || e).slice(0, 220),
      expr: preview(expr),
    });
  }
}

function hasNeighborOperand(buf, idx, dir) {
  for (let j = idx + dir; j >= 0 && j < buf.length; j += dir) {
    const t = buf[j].trim();
    if (!t) continue;
    return !/^[{}]$|^\\boxed\{$/.test(t);
  }
  return false;
}

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
    inFence = !inFence;
    continue;
  }
  if (inFence) continue;

  if (/^#{0,6}\s*\[\s*$/.test(trimmed)) bracketBlocks.push(i + 1);

  if (trimmed === "$$") {
    const start = i + 1;
    const buf = [];
    i++;
    while (i < lines.length && lines[i].trim() !== "$$") {
      buf.push(lines[i]);
      i++;
    }
    for (let bi = 0; bi < buf.length; bi++) {
      if (/^[ \t]*={3,}[ \t]*$/.test(buf[bi])) badEquals.push(start + bi + 1);
      if (
        /^[ \t]*=[ \t]*$/.test(buf[bi]) &&
        (!hasNeighborOperand(buf, bi, -1) || !hasNeighborOperand(buf, bi, 1))
      ) {
        badEquals.push(start + bi + 1);
      }
    }
    displayCount++;
    if (i >= lines.length) {
      failures.push({
        line: start,
        mode: "display",
        message: "Unclosed $$ block",
        expr: preview(buf.join("\n")),
      });
    } else {
      checkMath(buf.join("\n"), true, start);
    }
    continue;
  }

  if (
    /\\(?:boxed|operatorname|begin\{|end\{|mathcal|mathrm|mathbf|mathsf)\b/.test(
      lines[i],
    ) &&
    !/\$/.test(lines[i])
  ) {
    bareTex.push(i + 1);
  }

  const inline = /(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g;
  let m;
  while ((m = inline.exec(lines[i]))) {
    inlineCount++;
    checkMath(m[1], false, i + 1);
  }
}

const result = {
  displayCount,
  inlineCount,
  bracketBlockCount: bracketBlocks.length,
  bracketBlockLines: bracketBlocks.slice(0, 20),
  bareTexCount: bareTex.length,
  bareTexLines: bareTex.slice(0, 20),
  badEqualsCount: badEquals.length,
  badEqualsLines: badEquals.slice(0, 20),
  failureCount: failures.length,
  failures: failures.slice(0, 20),
};

console.log(JSON.stringify(result, null, 2));

if (
  bracketBlocks.length ||
  bareTex.length ||
  badEquals.length ||
  failures.length
) {
  process.exit(1);
}
