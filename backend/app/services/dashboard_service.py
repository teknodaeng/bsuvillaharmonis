from datetime import date
from typing import Any, Dict
from app.core.database import db
from app.services.nasabah_service import nasabah_service
from app.services.transaction_service import transaction_service
from app.utils.currency import format_rupiah


class DashboardService:
    @classmethod
    def get_admin_dashboard(cls) -> Dict[str, Any]:
        """Summary statistics for admin operational dashboard."""
        today_str = date.today().isoformat()
        current_month_prefix = date.today().strftime("%Y-%m")

        # 1. Nasabah counts
        total_nasabah_row = db.fetch_one("SELECT COUNT(*) as cnt FROM nasabah")
        total_nasabah = total_nasabah_row["cnt"] if total_nasabah_row else 0

        active_nasabah_row = db.fetch_one("SELECT COUNT(*) as cnt FROM nasabah WHERE status = 'ACTIVE'")
        total_nasabah_active = active_nasabah_row["cnt"] if active_nasabah_row else 0

        # 2. Financial totals
        net_balance_row = db.fetch_one("SELECT COALESCE(SUM(credit) - SUM(debit), 0) as net FROM transactions")
        total_balance_all = net_balance_row["net"] if net_balance_row else 0

        setor_month_row = db.fetch_one(
            "SELECT COALESCE(SUM(credit), 0) as s FROM transactions WHERE type = 'SETOR' AND transaction_date LIKE ?",
            (f"{current_month_prefix}%",)
        )
        total_setor_this_month = setor_month_row["s"] if setor_month_row else 0

        tarik_month_row = db.fetch_one(
            "SELECT COALESCE(SUM(debit), 0) as t FROM transactions WHERE type = 'TARIK' AND transaction_date LIKE ?",
            (f"{current_month_prefix}%",)
        )
        total_tarik_this_month = tarik_month_row["t"] if tarik_month_row else 0

        # 3. Transactions today
        trx_today_row = db.fetch_one(
            "SELECT COUNT(*) as cnt FROM transactions WHERE date(transaction_date) = date('now')"
        )
        total_transactions_today = trx_today_row["cnt"] if trx_today_row else 0

        # 4. Recent transactions (latest 5)
        recent_txs, _ = transaction_service.list_transactions(page=1, page_size=5)

        return {
            "total_nasabah": total_nasabah,
            "total_nasabah_active": total_nasabah_active,
            "total_balance_all": total_balance_all,
            "total_balance_all_formatted": format_rupiah(total_balance_all),
            "total_setor_this_month": total_setor_this_month,
            "total_setor_this_month_formatted": format_rupiah(total_setor_this_month),
            "total_tarik_this_month": total_tarik_this_month,
            "total_tarik_this_month_formatted": format_rupiah(total_tarik_this_month),
            "total_transactions_today": total_transactions_today,
            "recent_transactions": recent_txs,
        }

    @classmethod
    def get_nasabah_dashboard(cls, nasabah_id: str) -> Dict[str, Any]:
        """Summary statistics for logged-in nasabah."""
        nasabah = nasabah_service.get_nasabah_by_id(nasabah_id)
        balance = nasabah_service.get_nasabah_balance(nasabah_id)

        setor_row = db.fetch_one(
            "SELECT COALESCE(SUM(credit), 0) as s FROM transactions WHERE nasabah_id = ? AND type = 'SETOR'",
            (nasabah_id,)
        )
        total_setor = setor_row["s"] if setor_row else 0

        tarik_row = db.fetch_one(
            "SELECT COALESCE(SUM(debit), 0) as t FROM transactions WHERE nasabah_id = ? AND type = 'TARIK'",
            (nasabah_id,)
        )
        total_tarik = tarik_row["t"] if tarik_row else 0

        recent_txs, _ = transaction_service.list_transactions(nasabah_id=nasabah_id, page=1, page_size=5)

        return {
            "nasabah_id": nasabah_id,
            "customer_id": nasabah["customer_id"],
            "account_no": nasabah["account_no"],
            "name": nasabah["name"],
            "balance": balance,
            "balance_formatted": format_rupiah(balance),
            "total_setor": total_setor,
            "total_setor_formatted": format_rupiah(total_setor),
            "total_tarik": total_tarik,
            "total_tarik_formatted": format_rupiah(total_tarik),
            "recent_transactions": recent_txs,
        }


dashboard_service = DashboardService()
