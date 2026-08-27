import re
import unicodedata


def clean_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"(?<=\w)-\n(?=\w)", "", normalized)
    normalized = re.sub(r"(?<![.!?:;])\n(?=[a-z])", " ", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()
