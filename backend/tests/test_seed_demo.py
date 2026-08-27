from scripts.synthetic_data import generate_dataset


def test_generate_dataset_counts() -> None:
    dataset = generate_dataset()

    assert len(dataset["persons"]) == 75
    assert len(dataset["phones"]) == 25
    assert len(dataset["bank_accounts"]) == 20
    assert len(dataset["locations"]) == 25
    assert len(dataset["vehicles"]) == 18
    assert len(dataset["communications"]) == 220
    assert len(dataset["transactions"]) == 150
    assert len(dataset["cases"]) == 12
    assert len(dataset["documents"]) == 30
    assert dataset["alerts"][0]["score"] == 91.0
    assert dataset["transactions"][5]["sender_entity_id"] == 14
    assert dataset["transactions"][5]["amount"] == "850000.00"
