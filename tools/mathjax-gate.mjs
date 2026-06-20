#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { init } from "mathjax";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run validate:mathjax -- <file.md>");
  process.exit(2);
}

const MathJax = await init({
  loader: { load: ["input/tex", "output/chtml"] },
  tex: { packages: ["base", "ams", "newcommand"] },
});

const src = readFileSync(path, "utf8");
const lines = src.split(/\r?\n/);
const failures = [];
const bracketBlocks = [];
const bareTex = [];
let inFence = false;
let displayCount = 0;
let inlineCount = 0;

function preview(expr) {
  return expr.trim().split(/\n/).slice(0, 7).join(" / ").slice(0, 260);
}

async function checkMath(expr, displayMode, line) {
  try {
    const node = await MathJax.tex2chtmlPromise(
      expr.replace(/[ \t]+$/gm, "").trim(),
      {
        display: displayMode,
      },
    );
    const html = MathJax.startup.adaptor.outerHTML(node);
    if (html.includes("mjx-merror") || html.includes("data-mjx-error")) {
      const m = html.match(/data-mjx-error="([^"]+)"/);
      failures.push({
        line,
        mode: displayMode ? "display" : "inline",
        message: m ? m[1] : "MathJax emitted an error node",
        expr: preview(expr),
      });
    }
  } catch (e) {
    failures.push({
      line,
      mode: displayMode ? "display" : "inline",
      message: String(e?.message || e).slice(0, 220),
      expr: preview(expr),
    });
  }
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
    displayCount++;
    if (i >= lines.length) {
      failures.push({
        line: start,
        mode: "display",
        message: "Unclosed $$ block",
        expr: preview(buf.join("\n")),
      });
    } else {
      await checkMath(buf.join("\n"), true, start);
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
    await checkMath(m[1], false, i + 1);
  }
}

const result = {
  displayCount,
  inlineCount,
  bracketBlockCount: bracketBlocks.length,
  bracketBlockLines: bracketBlocks.slice(0, 20),
  bareTexCount: bareTex.length,
  bareTexLines: bareTex.slice(0, 20),
  failureCount: failures.length,
  failures: failures.slice(0, 20),
};

console.log(JSON.stringify(result, null, 2));

if (bracketBlocks.length || bareTex.length || failures.length) {
  process.exit(1);
}
