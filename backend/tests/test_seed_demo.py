from scripts.synthetic_data import generate_dataset


def test_generate_dataset_counts() -> None:
    dataset = generate_dataset()

    assert len(dataset["persons"]) == 82
    assert len(dataset["phones"]) == 32
    assert len(dataset["bank_accounts"]) == 25
    assert len(dataset["locations"]) == 30
    assert len(dataset["vehicles"]) == 18
    assert len(dataset["communications"]) == 250
    assert len(dataset["transactions"]) == 156
    assert len(dataset["cases"]) == 13
    assert len(dataset["documents"]) == 33
    assert len(dataset["evidence"]) == 63
    assert len(dataset["alerts"]) == 4
    assert dataset["alerts"][0]["score"] == 91.0
    assert dataset["cases"][-1]["case_number"] == "CYBER-2026-009"
    assert dataset["transactions"][5]["sender_entity_id"] == 14
    assert dataset["transactions"][5]["amount"] == "850000.00"
