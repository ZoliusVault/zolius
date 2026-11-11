import test from "node:test";
import assert from "node:assert/strict";
import { lockCreate, lockRelease, swapMake, swapTake, swapCancel } from "../wire.mjs";

const proof = { a: new Uint8Array(32).fill(1), b: new Uint8Array(64).fill(2), c: new Uint8Array(32).fill(3) };
const payload = Uint8Array.of(7, 8, 9);
const view = new Uint8Array(33).fill(4);
const creator = new Uint8Array(32).fill(6);

test("instruction tags, fixed fields and appended SPP bytes", () => {
  const create = lockCreate({ proof, viewingPubkey: view, bump: 5, spp: payload });
  assert.equal(create.length, 1 + 128 + 33 + 1 + 3);
  assert.equal(create[0], 0); assert.equal(create[129], 4); assert.equal(create[162], 5);
  assert.deepEqual(create.slice(-3), payload);
  const claim = lockRelease({ action: "claim", proof, creator, unlock: 0x0102030405060708n, bump: 8, spp: payload });
  assert.equal(claim[0], 1); assert.deepEqual(claim.slice(161, 169), Uint8Array.of(8, 7, 6, 5, 4, 3, 2, 1));
  assert.equal(lockRelease({ action: "cancel", proof, creator, unlock: 42n, bump: 8, spp: payload })[0], 2);
  assert.equal(swapMake({ proof, viewingPubkey: view, bump: 5, spp: payload })[0], 0);
  assert.equal(swapTake({ proof, maker: creator, bump: 8, spp: payload })[0], 1);
  assert.equal(swapCancel({ proof, bump: 8, spp: payload })[0], 2);
});

test("invalid input never produces an instruction", () => {
  assert.throws(() => lockCreate({ proof: { ...proof, a: new Uint8Array(31) }, viewingPubkey: view, bump: 0, spp: payload }));
  assert.throws(() => lockRelease({ action: "other", proof, creator, unlock: 1n, bump: 0, spp: payload }));
  assert.throws(() => lockRelease({ action: "claim", proof, creator, unlock: -1n, bump: 0, spp: payload }));
  assert.throws(() => swapCancel({ proof, bump: 256, spp: payload }));
});
