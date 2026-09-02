def format_rupiah(amount: int | float | None) -> str:
    """Format an integer or float amount into Indonesian Rupiah (e.g. Rp 8.750)."""
    if amount is None:
        return "Rp 0"
    amount_int = int(round(amount))
    formatted = f"{amount_int:,}".replace(",", ".")
    return f"Rp {formatted}"
