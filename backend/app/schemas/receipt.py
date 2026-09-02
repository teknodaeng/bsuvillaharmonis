from typing import Optional
from pydantic import BaseModel


class ReceiptNasabahInfo(BaseModel):
    id: str
    customer_id: str
    account_no: str
    name: str
    nik: str
    phone: Optional[str] = None
    address: Optional[str] = None


class ReceiptDetail(BaseModel):
    category_code: Optional[str] = None
    category_name: Optional[str] = None
    weight_kg: Optional[float] = None
    weight_formatted: Optional[str] = None
    price_per_kg: Optional[int] = None
    price_formatted: Optional[str] = None
    amount: int
    amount_formatted: str


class ReceiptMutation(BaseModel):
    debit: int
    debit_formatted: str
    credit: int
    credit_formatted: str
    balance_after: int
    balance_after_formatted: str


class ReceiptResponse(BaseModel):
    app_name: str
    title: str
    transaction_no: str
    transaction_date: str
    transaction_date_formatted: str
    type: str
    type_display: str
    nasabah: ReceiptNasabahInfo
    detail: Optional[ReceiptDetail] = None
    mutation: ReceiptMutation
    notes: Optional[str] = None
    footer: str
    printed_at: str
