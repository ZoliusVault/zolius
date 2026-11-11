//! In-progress fixed-price OTC circuits. An on-chain program, verifiers and
//! client transaction builders are required before these circuits can be used.
use borsh::{BorshDeserialize, BorshSerialize};
use spr_program::{
    circuit::{
        CheckedTransaction, ConfidentialTransaction, DataUtxo, PublicInputs, TokenUtxos, Utxo,
        UtxoTrait,
    },
    input, poseidon, require, require_eq, Asset, CircuitError, ClientInputs, Field,
    ShieldedAddress, TxContext, UtxoOwner, UtxoState, ZkProgram,
};

#[input]
#[derive(Default, PartialEq, Eq, BorshSerialize, BorshDeserialize, UtxoState, ClientInputs)]
pub struct OrderTerms {
    pub maker: UtxoOwner,
    pub requested_mint: Asset,
    pub requested_amount: u64,
    pub expiry: u64,
    /// The taker's identity field as big-endian bytes; all zero means open.
    pub taker_identity: [u8; 32],
}

#[input]
#[derive(ZkProgram)]
pub struct MakeOrder {
    pub private: MakePrivate,
    pub public: MakePublic,
}
#[input]
#[derive(ClientInputs)]
pub struct MakePrivate {
    pub tx_context: TxContext,
    pub source: Utxo,
    pub source_amount: u64,
    pub requested_mint: Asset,
    pub requested_amount: u64,
    pub expiry: u64,
    pub taker_identity: [u8; 32],
}
#[input]
#[derive(PublicInputs)]
pub struct MakePublic {
    pub maker_identity: Field,
    pub order_owner: ShieldedAddress,
}

impl MakeOrder {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        require(p.source_amount != 0);
        require(p.requested_amount != 0);
        let mut source = TokenUtxos::new_mut(core::array::from_ref(&p.source))?;
        require_eq(source.owner().key().identity()?, self.public.maker_identity);
        let mut order = DataUtxo::<OrderTerms>::new_init(&self.public.order_owner)
            .with_asset(&source.asset())?;
        source.transfer(&mut order, &p.source_amount)?;
        order.maker = source.owner();
        order.requested_mint = p.requested_mint;
        order.requested_amount = p.requested_amount;
        order.expiry = p.expiry;
        order.taker_identity = p.taker_identity;
        ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(source)
            .with(order)
            .check()
    }
}

#[input]
#[derive(ZkProgram)]
pub struct TakeOrder {
    pub private: TakePrivate,
    pub public: TakePublic,
}
#[input]
#[derive(ClientInputs)]
pub struct TakePrivate {
    pub tx_context: TxContext,
    pub order: Utxo,
    pub terms: OrderTerms,
    pub taker_input: Utxo,
    /// Carries the maker's viewing key to the client encrypting the payout.
    pub maker_address: ShieldedAddress,
}
#[input]
#[derive(PublicInputs)]
pub struct TakePublic {
    pub expiry: u64,
    pub first_nullifier: Field,
}

impl TakeOrder {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        let seed = poseidon(&[Field::from(u32::from_be_bytes(*b"SWTX")), p.order.blinding])?;
        require_eq(p.tx_context.blinding_seed, seed);
        let mut order = DataUtxo::new_mut(&p.order, &p.terms)?.close();
        require(order.amount()? != 0);
        require(order.requested_amount != 0);
        require_eq(order.expiry, self.public.expiry);
        let mut payment = TokenUtxos::new_mut(core::array::from_ref(&p.taker_input))?.close();
        require_eq(payment.asset(), order.requested_mint);
        let taker = payment.owner();
        let mut designated = Field::zero();
        for byte in order.taker_identity.iter() {
            designated = designated * Field::from(256u64) + Field::from(*byte);
        }
        let expected_owner = poseidon(&[designated, taker.nullifier_pk()])?;
        require_eq(designated * (taker.hash()? - expected_owner), Field::zero());
        let mut to_taker = TokenUtxos::new_init(&taker, &order.asset());
        let mut to_maker = TokenUtxos::new_init(&order.maker, &order.requested_mint);
        let price = order.requested_amount;
        order.transfer_all(&mut to_taker)?;
        payment.transfer(&mut to_maker, &price)?;
        let checked = ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(order)
            .with(payment)
            .with(to_taker)
            .with(to_maker)
            .check()?;
        require_eq(checked.first_nullifier, self.public.first_nullifier);
        Ok(checked)
    }
}

#[input]
#[derive(ZkProgram)]
pub struct CancelOrder {
    pub private: CancelPrivate,
    pub public: CancelPublic,
}
#[input]
#[derive(ClientInputs)]
pub struct CancelPrivate {
    pub tx_context: TxContext,
    pub order: Utxo,
    pub terms: OrderTerms,
}
#[input]
#[derive(PublicInputs)]
pub struct CancelPublic {
    pub maker_identity: Field,
}

impl CancelOrder {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        let mut order = DataUtxo::new_mut(&p.order, &p.terms)?.close();
        require(order.amount()? != 0);
        require_eq(order.maker.key().identity()?, self.public.maker_identity);
        let mut refund = TokenUtxos::new_init(&order.maker, &order.asset());
        order.transfer_all(&mut refund)?;
        ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(order)
            .with(refund)
            .check()
    }
}
