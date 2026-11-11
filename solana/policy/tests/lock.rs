use zolius_policy::{lock_action, LockAction, LockError, LockTerms};

const CREATOR: [u8; 32] = [1; 32];
const BENEFICIARY: [u8; 32] = [2; 32];
const OTHER: [u8; 32] = [3; 32];

fn terms(cancelable: bool) -> LockTerms {
    LockTerms {
        creator: CREATOR,
        beneficiary: BENEFICIARY,
        unlock_at: 100,
        cancelable,
    }
}

#[test]
fn only_beneficiary_can_claim_at_or_after_unlock() {
    assert_eq!(
        lock_action(&terms(true), LockAction::Claim, BENEFICIARY, 99),
        Err(LockError::TooEarly)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Claim, BENEFICIARY, 100),
        Ok(BENEFICIARY)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Claim, BENEFICIARY, 101),
        Ok(BENEFICIARY)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Claim, OTHER, 101),
        Err(LockError::Unauthorized)
    );
}

#[test]
fn only_creator_can_cancel_if_enabled_and_before_unlock() {
    assert_eq!(
        lock_action(&terms(true), LockAction::Cancel, CREATOR, 99),
        Ok(CREATOR)
    );
    assert_eq!(
        lock_action(&terms(false), LockAction::Cancel, CREATOR, 99),
        Err(LockError::NotCancelable)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Cancel, CREATOR, 100),
        Err(LockError::TooLate)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Cancel, OTHER, 99),
        Err(LockError::Unauthorized)
    );
}

#[test]
fn negative_clock_never_authorizes_action() {
    assert_eq!(
        lock_action(&terms(true), LockAction::Cancel, CREATOR, -1),
        Err(LockError::InvalidClock)
    );
    assert_eq!(
        lock_action(&terms(true), LockAction::Claim, BENEFICIARY, -1),
        Err(LockError::InvalidClock)
    );
}
