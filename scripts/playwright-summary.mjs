// Prints failed Playwright tests (title + first error lines) as one GitHub annotation.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'apps/web/e2e-results.json';
let report;
try {
  report = JSON.parse(readFileSync(file, 'utf8'));
} catch {
  console.log(`No Playwright JSON report at ${file}`);
  process.exit(0);
}
const failures = [];
const strip = (s) => String(s ?? '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
function walk(suite, path) {
  for (const s of suite.suites ?? []) walk(s, [...path, s.title]);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const last = t.results?.at(-1);
      if (last && !['passed', 'skipped'].includes(last.status)) {
        const err = strip(last.error?.message ?? last.errors?.[0]?.message)
          .split('\n')
          .slice(0, 8)
          .join('\n');
        failures.push(
          `[${t.projectName}] ${[...path, spec.title].filter(Boolean).join(' › ')} (${last.status}, ${Math.round((last.duration ?? 0) / 1000)}s)\n${err}`,
        );
      }
    }
  }
}
walk(report, []);
const text = failures.length ? failures.join('\n\n') : 'No failed tests in report';
console.log(text);
const enc = text.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
console.log(`::error title=Playwright failures (${failures.length})::${enc.slice(0, 60000)}`);
