use spr_program::CompressedProof;
use zolius_wire::{encode_lock_create, encode_lock_release, encode_swap_cancel, encode_swap_make, encode_swap_take, LockCreate, LockRelease, SwapCancel, SwapMake, SwapTake};

fn proof() -> CompressedProof { CompressedProof { a: [1; 32], b: [2; 64], c: [3; 32] } }

#[test]
fn encoded_arguments_round_trip_and_preserve_spp_payload() {
    let payload = [7, 8, 9];
    let lock_create = LockCreate { proof: proof(), viewing_pubkey: [4; 33], bump: 5 };
    let bytes = encode_lock_create(&lock_create, &payload).unwrap();
    assert_eq!(bytes[0], 0);
    let mut rest = &bytes[1..];
    assert_eq!(wincode::deserialize_from::<LockCreate>(&mut rest).unwrap(), lock_create);
    assert_eq!(rest, payload);
    let release = LockRelease { proof: proof(), creator: [6; 32], unlock: 42, bump: 8 };
    for tag in [1, 2] {
        let bytes = encode_lock_release(tag, &release, &payload).unwrap();
        assert_eq!(bytes[0], tag);
        let mut rest = &bytes[1..];
        assert_eq!(wincode::deserialize_from::<LockRelease>(&mut rest).unwrap(), release);
        assert_eq!(rest, payload);
        assert_eq!(&bytes[161..169], &42u64.to_le_bytes());
    }
    let make = SwapMake { proof: proof(), viewing_pubkey: [4; 33], bump: 5 };
    let bytes = encode_swap_make(&make, &payload).unwrap();
    assert_eq!(bytes[0], 0);
    let mut rest = &bytes[1..];
    assert_eq!(wincode::deserialize_from::<SwapMake>(&mut rest).unwrap(), make);
    assert_eq!(rest, payload);
    let take = SwapTake { proof: proof(), maker: [6; 32], bump: 8 };
    let bytes = encode_swap_take(&take, &payload).unwrap();
    assert_eq!(bytes[0], 1);
    let mut rest = &bytes[1..];
    assert_eq!(wincode::deserialize_from::<SwapTake>(&mut rest).unwrap(), take);
    assert_eq!(rest, payload);
    let cancel = SwapCancel { proof: proof(), bump: 8 };
    let bytes = encode_swap_cancel(&cancel, &payload).unwrap();
    assert_eq!(bytes[0], 2);
    let mut rest = &bytes[1..];
    assert_eq!(wincode::deserialize_from::<SwapCancel>(&mut rest).unwrap(), cancel);
    assert_eq!(rest, payload);
}

#[test]
fn lock_release_rejects_unknown_action() {
    let args = LockRelease { proof: proof(), creator: [6; 32], unlock: 42, bump: 8 };
    assert!(encode_lock_release(0, &args, &[]).is_err());
    assert!(encode_lock_release(3, &args, &[]).is_err());
}
