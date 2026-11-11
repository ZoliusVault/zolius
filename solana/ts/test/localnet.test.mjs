import test from "node:test";
import assert from "node:assert/strict";

const url = process.env.ZOLIUS_LOCALNET_RPC;
const payer = process.env.ZOLIUS_LOCALNET_PAYER;
const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decode58(text) {
  let value = 0n;
  for (const char of text) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error("invalid base58");
    value = value * 58n + BigInt(digit);
  }
  const bytes = [];
  while (value) { bytes.unshift(Number(value & 255n)); value >>= 8n; }
  for (const char of text) { if (char !== "1") break; bytes.unshift(0); }
  if (bytes.length !== 32) throw new Error("expected a 32-byte public key");
  return Uint8Array.from(bytes);
}

async function rpc(method, params) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}

for (const program of ["AJok8ztWjxcbeFDLAWRmY11fCvp8mJJpbrvpUs3UmoZP", "HQioSDqtsHSz2LzdHZXYShA8Jgi19Sxxh92M2rKVMC7u"]) {
  test(`localnet ${program} rejects an unknown instruction`, { skip: !url || !payer }, async () => {
    const latest = await rpc("getLatestBlockhash", [{ commitment: "confirmed" }]);
    // Legacy transaction: one placeholder signature, payer, program, and an
    // instruction passing the payer signer and an invalid tag. Simulation does
    // not verify the placeholder signature and never sends a transaction.
    const tx = Buffer.concat([
      Buffer.from([1]), Buffer.alloc(64), Buffer.from([1, 0, 1, 2]),
      Buffer.from(decode58(payer)), Buffer.from(decode58(program)),
      Buffer.from(decode58(latest.value.blockhash)),
      Buffer.from([1, 1, 1, 0, 1, 255]),
    ]);
    const result = await rpc("simulateTransaction", [tx.toString("base64"), { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true }]);
    assert.deepEqual(result.value.err, { InstructionError: [0, "InvalidInstructionData"] });
    assert.ok(result.value.logs.some((line) => line.includes(`Program ${program} invoke`)));
  });
}
