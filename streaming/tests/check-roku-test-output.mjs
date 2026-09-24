// brs@0.45.0 does not reliably propagate runtime errors as a nonzero CLI exit.
// Require the complete fixture result so CI cannot pass on missing/failed checks.
let output = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) output += chunk;
process.stdout.write(output);
const lastLine = output.trim().split(/\r?\n/).at(-1) ?? '';
if (!/^PASS:\s+28\s+deep-link checks$/.test(lastLine) || /^FAIL:/m.test(output)) {
  console.error('Roku deep-link test did not complete all 28 checks successfully.');
  process.exitCode = 1;
}
