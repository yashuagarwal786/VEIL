import re
from decimal import Decimal


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s.]", " ", value.lower())).strip()


def normalize_email(value: str) -> str:
    return value.strip().lower()


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return digits


def normalize_vehicle(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", value).upper()


def normalize_money(value: str) -> str:
    amount = re.sub(r"(?i)(inr|rs\.?|₹)", "", value)
    amount = re.sub(r"[^0-9.]", "", amount)
    return str(Decimal(amount or "0").quantize(Decimal("0.01")))


def normalize_generic(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def normalize_by_type(entity_type: str, value: str) -> str:
    if entity_type == "PHONE":
        return normalize_phone(value)
    if entity_type == "EMAIL":
        return normalize_email(value)
    if entity_type == "VEHICLE":
        return normalize_vehicle(value)
    if entity_type == "MONEY":
        return normalize_money(value)
    if entity_type in {"PERSON", "ORGANIZATION", "LOCATION"}:
        return normalize_name(value)
    return normalize_generic(value)
