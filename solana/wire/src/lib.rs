#![no_std]
//! Shared instruction argument layouts and serialization for Zolius programs.
extern crate alloc;
use alloc::vec::Vec;
use spr_program::CompressedProof;
use wincode::{SchemaRead, SchemaWrite};

#[derive(Clone, Copy, Debug, PartialEq, Eq, SchemaRead, SchemaWrite)]
pub struct LockCreate { pub proof: CompressedProof, pub viewing_pubkey: [u8; 33], pub bump: u8 }
#[derive(Clone, Copy, Debug, PartialEq, Eq, SchemaRead, SchemaWrite)]
pub struct LockRelease { pub proof: CompressedProof, pub creator: [u8; 32], pub unlock: u64, pub bump: u8 }
#[derive(Clone, Copy, Debug, PartialEq, Eq, SchemaRead, SchemaWrite)]
pub struct SwapMake { pub proof: CompressedProof, pub viewing_pubkey: [u8; 33], pub bump: u8 }
#[derive(Clone, Copy, Debug, PartialEq, Eq, SchemaRead, SchemaWrite)]
pub struct SwapTake { pub proof: CompressedProof, pub maker: [u8; 32], pub bump: u8 }
#[derive(Clone, Copy, Debug, PartialEq, Eq, SchemaRead, SchemaWrite)]
pub struct SwapCancel { pub proof: CompressedProof, pub bump: u8 }

#[derive(Debug)]
pub enum EncodeError { InvalidTag, Serialization(wincode::WriteError) }

fn append(tag: u8, encoded: Result<Vec<u8>, wincode::WriteError>, spp: &[u8]) -> Result<Vec<u8>, EncodeError> {
    let args = encoded.map_err(EncodeError::Serialization)?;
    let mut out = Vec::with_capacity(1 + args.len() + spp.len());
    out.push(tag);
    out.extend_from_slice(&args);
    out.extend_from_slice(spp);
    Ok(out)
}

pub fn encode_lock_create(args: &LockCreate, spp: &[u8]) -> Result<Vec<u8>, EncodeError> { append(0, wincode::serialize(args), spp) }
pub fn encode_lock_release(tag: u8, args: &LockRelease, spp: &[u8]) -> Result<Vec<u8>, EncodeError> {
    if tag != 1 && tag != 2 { return Err(EncodeError::InvalidTag); }
    append(tag, wincode::serialize(args), spp)
}
pub fn encode_swap_make(args: &SwapMake, spp: &[u8]) -> Result<Vec<u8>, EncodeError> { append(0, wincode::serialize(args), spp) }
pub fn encode_swap_take(args: &SwapTake, spp: &[u8]) -> Result<Vec<u8>, EncodeError> { append(1, wincode::serialize(args), spp) }
pub fn encode_swap_cancel(args: &SwapCancel, spp: &[u8]) -> Result<Vec<u8>, EncodeError> { append(2, wincode::serialize(args), spp) }
