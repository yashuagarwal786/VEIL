PREFIX_BY_TYPE = {
    "Person": "P",
    "Organization": "ORG",
    "Phone": "PH",
    "BankAccount": "BA",
    "Vehicle": "VEH",
    "Location": "LOC",
    "Case": "C",
    "Document": "DOC",
}


def graph_id(entity_type: str, source_id: int | str) -> str:
    prefix = PREFIX_BY_TYPE[entity_type]
    return f"{prefix}{int(source_id):03d}"


def normalize_case_id(case_id: str) -> str:
    return graph_id("Case", case_id) if case_id.isdigit() else case_id
