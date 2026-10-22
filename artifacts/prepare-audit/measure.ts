import { performance } from "node:perf_hooks";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { defaultKit, getSummary } from "../../src/lib/gobag/kit";
import { initialLibrary } from "../../src/lib/gobag/library";

const worstCase = { ...initialLibrary, kits: Array.from({ length: 20 }, (_, n) => ({ id: `test-${n}`, name: `Test ${n}`, state: { ...defaultKit, plan: { emergencyContact: "x".repeat(500) }, customItems: Array.from({ length: 100 }, (_, i) => ({ ...getSummary(defaultKit).items[0], id: `custom-${i}`, name: `Custom supply ${i}` })) } })) };
const serialization = (value: unknown) => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) JSON.stringify(value);
  return { bytes: Buffer.byteLength(JSON.stringify(value)), meanStringifyMs: (performance.now() - start) / 1000 };
};
const html = readFileSync('.next/server/app/go-bag.html', 'utf8');
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map(m => m[1]))];
const assets = scripts.map(url => {
  const path = `.next/${url.replace(/^\/_next\//, '')}`;
  const source = readFileSync(path);
  return { url, bytes: statSync(path).size, gzipBytes: gzipSync(source).length };
});
const result = {
  note: "Node microbenchmark and production asset sizes, not browser Web Vitals or device localStorage latency. No measured before/after loading-speed claim.",
  serialization: { defaultLibrary: serialization(initialLibrary), maximumLibraryFixture: serialization(worstCase) },
  initialJavaScript: { files: assets.length, bytes: assets.reduce((n,a)=>n+a.bytes,0), gzipBytes: assets.reduce((n,a)=>n+a.gzipBytes,0), assets },
};
writeFileSync('artifacts/prepare-audit/performance.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
