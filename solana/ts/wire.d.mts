export type CompressedProof = { a: Uint8Array; b: Uint8Array; c: Uint8Array };
type Common = { proof: CompressedProof; bump: number; spp: Uint8Array };
export function lockCreate(input: Common & { viewingPubkey: Uint8Array }): Uint8Array;
export function lockRelease(input: Common & { action: "claim" | "cancel"; creator: Uint8Array; unlock: bigint }): Uint8Array;
export function swapMake(input: Common & { viewingPubkey: Uint8Array }): Uint8Array;
export function swapTake(input: Common & { maker: Uint8Array }): Uint8Array;
export function swapCancel(input: Common): Uint8Array;
