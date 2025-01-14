use cosmwasm_std::{
    to_binary, Addr, BankMsg, Binary, Coin, Deps, DepsMut, Env, MessageInfo, Response, StdError,
    StdResult, Uint128,
};
use cw2::set_contract_version;
use serde::{Deserialize, Serialize};

// Constants
const CONTRACT_NAME: &str = "crates.io:xion-invoice";
const CONTRACT_VERSION: &str = "0.1.0";

// Structs
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Invoice {
    pub id: u64,
    pub issuer: Addr,
    pub recipient: Addr,
    pub amount: Uint128,
    pub description: String,
    pub due_date: u64,
    pub is_paid: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InstantiateMsg {}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ExecuteMsg {
    CreateInvoice {
        recipient: String,
        amount: Uint128,
        description: String,
        due_date: u64,
    },
    PayInvoice {
        invoice_id: u64,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum QueryMsg {
    GetInvoice {
        invoice_id: u64,
    },
    GetInvoicesByUser {
        user: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct InvoiceResponse {
    pub id: u64,
    pub issuer: String,
    pub recipient: String,
    pub amount: Uint128,
    pub description: String,
    pub due_date: u64,
    pub is_paid: bool,
}

// State
use cw_storage_plus::{Item, Map};

const INVOICE_SEQ: Item<u64> = Item::new("invoice_seq");
const INVOICES: Map<u64, Invoice> = Map::new("invoices");
const USER_INVOICES: Map<&Addr, Vec<u64>> = Map::new("user_invoices");

// Instantiate
#[cosmwasm_std::entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> StdResult<Response> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    INVOICE_SEQ.save(deps.storage, &1)?;
    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("contract_name", CONTRACT_NAME)
        .add_attribute("contract_version", CONTRACT_VERSION))
}

// Execute
#[cosmwasm_std::entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, StdError> {
    match msg {
        ExecuteMsg::CreateInvoice {
            recipient,
            amount,
            description,
            due_date,
        } => create_invoice(deps, info, recipient, amount, description, due_date),
        ExecuteMsg::PayInvoice { invoice_id } => pay_invoice(deps, env, info, invoice_id),
    }
}

fn create_invoice(
    deps: DepsMut,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
    description: String,
    due_date: u64,
) -> Result<Response, StdError> {
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    if recipient_addr == info.sender {
        return Err(StdError::generic_err("Cannot create invoice for yourself"));
    }

    if amount.is_zero() {
        return Err(StdError::generic_err("Amount must be greater than 0"));
    }

    let mut invoice_seq = INVOICE_SEQ.load(deps.storage)?;
    let new_invoice = Invoice {
        id: invoice_seq,
        issuer: info.sender.clone(),
        recipient: recipient_addr.clone(),
        amount,
        description,
        due_date,
        is_paid: false,
    };

    INVOICES.save(deps.storage, invoice_seq, &new_invoice)?;
    let mut user_invoice_list = USER_INVOICES.may_load(deps.storage, &info.sender)?.unwrap_or_default();
    user_invoice_list.push(invoice_seq);
    USER_INVOICES.save(deps.storage, &info.sender, &user_invoice_list)?;

    invoice_seq += 1;
    INVOICE_SEQ.save(deps.storage, &invoice_seq)?;

    Ok(Response::new()
        .add_attribute("method", "create_invoice")
        .add_attribute("invoice_id", new_invoice.id.to_string())
        .add_attribute("recipient", recipient_addr))
}

fn pay_invoice(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    invoice_id: u64,
) -> Result<Response, StdError> {
    let mut invoice = INVOICES.load(deps.storage, invoice_id)?;
    if invoice.is_paid {
        return Err(StdError::generic_err("Invoice is already paid"));
    }
    if invoice.recipient != info.sender {
        return Err(StdError::generic_err("Only the recipient can pay this invoice"));
    }

    if info.funds.len() != 1 || info.funds[0].amount != invoice.amount {
        return Err(StdError::generic_err("Incorrect payment amount"));
    }

    let payment = BankMsg::Send {
        to_address: invoice.issuer.to_string(),
        amount: info.funds.clone(),
    };

    invoice.is_paid = true;
    INVOICES.save(deps.storage, invoice_id, &invoice)?;

    Ok(Response::new()
        .add_message(payment)
        .add_attribute("method", "pay_invoice")
        .add_attribute("invoice_id", invoice_id.to_string()))
}

// Query
#[cosmwasm_std::entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetInvoice { invoice_id } => to_binary(&query_invoice(deps, invoice_id)?),
        QueryMsg::GetInvoicesByUser { user } => to_binary(&query_invoices_by_user(deps, user)?),
    }
}

fn query_invoice(deps: Deps, invoice_id: u64) -> StdResult<InvoiceResponse> {
    let invoice = INVOICES.load(deps.storage, invoice_id)?;
    Ok(InvoiceResponse {
        id: invoice.id,
        issuer: invoice.issuer.to_string(),
        recipient: invoice.recipient.to_string(),
        amount: invoice.amount,
        description: invoice.description,
        due_date: invoice.due_date,
        is_paid: invoice.is_paid,
    })
}

fn query_invoices_by_user(deps: Deps, user: String) -> StdResult<Vec<InvoiceResponse>> {
    let user_addr = deps.api.addr_validate(&user)?;
    let invoice_ids = USER_INVOICES.may_load(deps.storage, &user_addr)?.unwrap_or_default();

    let invoices: StdResult<Vec<InvoiceResponse>> = invoice_ids
        .into_iter()
        .map(|id| query_invoice(deps, id))
        .collect();

    invoices
}
