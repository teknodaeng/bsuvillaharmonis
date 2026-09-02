from datetime import datetime
from typing import Optional, Union
import dateutil.parser


def format_kg(weight_gram_or_kg: Optional[Union[int, float]], from_gram: bool = True) -> str:
    """Format weight in kilogram with 3 decimal precision (e.g. 2,500 kg)."""
    if weight_gram_or_kg is None:
        return "0,000 kg"
    if from_gram:
        kg = weight_gram_or_kg / 1000.0
    else:
        kg = float(weight_gram_or_kg)
    formatted = f"{kg:,.3f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{formatted} kg"


def format_date(dt: Optional[Union[str, datetime]]) -> str:
    """Format date to DD/MM/YYYY."""
    if not dt:
        return "-"
    if isinstance(dt, str):
        try:
            parsed = dateutil.parser.parse(dt)
        except Exception:
            return dt
    else:
        parsed = dt
    return parsed.strftime("%d/%m/%Y")


def format_datetime(dt: Optional[Union[str, datetime]]) -> str:
    """Format datetime to DD/MM/YYYY HH:MM."""
    if not dt:
        return "-"
    if isinstance(dt, str):
        try:
            parsed = dateutil.parser.parse(dt)
        except Exception:
            return dt
    else:
        parsed = dt
    return parsed.strftime("%d/%m/%Y %H:%M")
