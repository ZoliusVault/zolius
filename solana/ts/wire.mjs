// Instruction encoding only. Build and sign the Privacy Rings transaction separately.
function bytes(value, length, name) {
  if (!(value instanceof Uint8Array) || (length !== null && value.length !== length)) {
    throw new TypeError(`${name} must be ${length === null ? "a Uint8Array" : `${length} bytes`}`);
  }
  return value;
}
function proofBytes(proof) {
  if (!proof || typeof proof !== "object") throw new TypeError("proof is required");
  return [bytes(proof.a, 32, "proof.a"), bytes(proof.b, 64, "proof.b"), bytes(proof.c, 32, "proof.c")];
}
function bumpByte(bump) {
  if (!Number.isInteger(bump) || bump < 0 || bump > 255) throw new RangeError("bump must be a u8");
  return Uint8Array.of(bump);
}
function u64(value) {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn) throw new RangeError("unlock must be a u64 bigint");
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
}
function concat(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
function encode(tag, proof, fields, bump, spp) {
  return concat([Uint8Array.of(tag), ...proofBytes(proof), ...fields, bumpByte(bump), bytes(spp, null, "spp")]);
}
export function lockCreate({ proof, viewingPubkey, bump, spp }) {
  return encode(0, proof, [bytes(viewingPubkey, 33, "viewingPubkey")], bump, spp);
}
export function lockRelease({ action, proof, creator, unlock, bump, spp }) {
  if (action !== "claim" && action !== "cancel") throw new TypeError("invalid lock action");
  return encode(action === "claim" ? 1 : 2, proof, [bytes(creator, 32, "creator"), u64(unlock)], bump, spp);
}
export function swapMake({ proof, viewingPubkey, bump, spp }) {
  return encode(0, proof, [bytes(viewingPubkey, 33, "viewingPubkey")], bump, spp);
}
export function swapTake({ proof, maker, bump, spp }) {
  return encode(1, proof, [bytes(maker, 32, "maker")], bump, spp);
}
export function swapCancel({ proof, bump, spp }) {
  return encode(2, proof, [], bump, spp);
}
