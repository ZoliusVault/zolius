use zolius_policy::{swap_action, SwapAction, SwapError, SwapTerms};

const MAKER: [u8; 32] = [1; 32];
const TAKER: [u8; 32] = [2; 32];
const OTHER: [u8; 32] = [3; 32];

fn order() -> SwapTerms {
    SwapTerms {
        maker: MAKER,
        designated_taker: Some(TAKER),
        expires_at: 100,
    }
}

#[test]
fn designated_taker_can_fill_before_expiry() {
    assert_eq!(swap_action(&order(), SwapAction::Take, TAKER, 99), Ok(()));
    assert_eq!(
        swap_action(&order(), SwapAction::Take, OTHER, 99),
        Err(SwapError::Unauthorized)
    );
    assert_eq!(
        swap_action(&order(), SwapAction::Take, TAKER, 100),
        Err(SwapError::Expired)
    );
}

#[test]
fn maker_can_cancel_at_any_time() {
    assert_eq!(swap_action(&order(), SwapAction::Cancel, MAKER, 99), Ok(()));
    assert_eq!(
        swap_action(&order(), SwapAction::Cancel, MAKER, 100),
        Ok(())
    );
    assert_eq!(
        swap_action(&order(), SwapAction::Cancel, OTHER, 99),
        Err(SwapError::Unauthorized)
    );
}

#[test]
fn open_order_and_invalid_clock() {
    let mut open = order();
    open.designated_taker = None;
    assert_eq!(swap_action(&open, SwapAction::Take, OTHER, 99), Ok(()));
    assert_eq!(
        swap_action(&open, SwapAction::Take, OTHER, -1),
        Err(SwapError::InvalidClock)
    );
}
