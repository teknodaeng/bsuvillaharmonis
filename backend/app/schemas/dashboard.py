from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.schemas.transaction import TransactionResponse


class AdminDashboardResponse(BaseModel):
    total_nasabah: int
    total_nasabah_active: int
    total_balance_all: int
    total_balance_all_formatted: str
    total_setor_this_month: int
    total_setor_this_month_formatted: str
    total_tarik_this_month: int
    total_tarik_this_month_formatted: str
    total_transactions_today: int
    recent_transactions: List[TransactionResponse]


class NasabahDashboardResponse(BaseModel):
    nasabah_id: str
    customer_id: str
    account_no: str
    name: str
    balance: int
    balance_formatted: str
    total_setor: int
    total_setor_formatted: str
    total_tarik: int
    total_tarik_formatted: str
    recent_transactions: List[TransactionResponse]
