//! Authorization and time boundaries for a prospective Zolius Lock program.
//!
//! This library is not a Solana program. A private implementation must bind
//! these terms and the selected payout to the verified circuit and CPI.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LockTerms {
    pub creator: [u8; 32],
    pub beneficiary: [u8; 32],
    pub unlock_at: u64,
    pub cancelable: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LockAction {
    Claim,
    Cancel,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LockError {
    Unauthorized,
    TooEarly,
    TooLate,
    NotCancelable,
    InvalidClock,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SwapTerms {
    pub maker: [u8; 32],
    pub designated_taker: Option<[u8; 32]>,
    pub expires_at: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SwapAction {
    Take,
    Cancel,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SwapError {
    Unauthorized,
    Expired,
    InvalidClock,
}

/// Checks order authority and time. Asset and price binding belong in the proof.
pub fn swap_action(
    terms: &SwapTerms,
    action: SwapAction,
    signer: [u8; 32],
    now: i64,
) -> Result<(), SwapError> {
    let now = u64::try_from(now).map_err(|_| SwapError::InvalidClock)?;
    match action {
        SwapAction::Take => {
            if terms.designated_taker.is_some_and(|taker| taker != signer) {
                return Err(SwapError::Unauthorized);
            }
            if now >= terms.expires_at {
                return Err(SwapError::Expired);
            }
            Ok(())
        }
        SwapAction::Cancel => {
            if signer != terms.maker {
                return Err(SwapError::Unauthorized);
            }
            Ok(())
        }
    }
}

/// Returns the only permitted payout owner for an authorized action.
pub fn lock_action(
    terms: &LockTerms,
    action: LockAction,
    signer: [u8; 32],
    now: i64,
) -> Result<[u8; 32], LockError> {
    let now = u64::try_from(now).map_err(|_| LockError::InvalidClock)?;
    match action {
        LockAction::Claim => {
            if signer != terms.beneficiary {
                return Err(LockError::Unauthorized);
            }
            if now < terms.unlock_at {
                return Err(LockError::TooEarly);
            }
            Ok(terms.beneficiary)
        }
        LockAction::Cancel => {
            if signer != terms.creator {
                return Err(LockError::Unauthorized);
            }
            if !terms.cancelable {
                return Err(LockError::NotCancelable);
            }
            if now >= terms.unlock_at {
                return Err(LockError::TooLate);
            }
            Ok(terms.creator)
        }
    }
}
