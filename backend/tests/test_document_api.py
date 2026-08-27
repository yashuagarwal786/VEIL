from fastapi.testclient import TestClient

from app.main import app


def test_upload_rejects_unsupported_file() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/documents/upload",
        data={"case_id": "1"},
        files={"file": ("malware.exe", b"MZ no thanks", "application/octet-stream")},
    )

    assert response.status_code == 400
