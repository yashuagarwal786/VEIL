from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def normalize_base_url(url: str) -> str:
    return url.rstrip("/") + "/"


def request_json(url: str, timeout: int) -> tuple[int, object, str | None]:
    request = Request(url, headers={"Accept": "application/json"})
    with urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response.status, None, f"expected JSON, got {content_type or 'unknown content type'}"
        return response.status, json.loads(body), None


def check_json_endpoint(name: str, url: str, timeout: int) -> CheckResult:
    try:
        status, _, error = request_json(url, timeout)
    except HTTPError as exc:
        return CheckResult(name, False, f"HTTP {exc.code} from {url}")
    except URLError as exc:
        return CheckResult(name, False, f"connection failed for {url}: {exc.reason}")
    except TimeoutError:
        return CheckResult(name, False, f"timed out connecting to {url}")
    except json.JSONDecodeError as exc:
        return CheckResult(name, False, f"invalid JSON from {url}: {exc}")

    if error:
        return CheckResult(name, False, f"{error} at {url}")
    if status >= 400:
        return CheckResult(name, False, f"HTTP {status} from {url}")
    return CheckResult(name, True, f"HTTP {status} JSON from {url}")


def check_cors(api_base_url: str, frontend_url: str, timeout: int) -> CheckResult:
    url = urljoin(normalize_base_url(api_base_url), "api/workspace/dashboard?case_id=1")
    request = Request(
        url,
        method="OPTIONS",
        headers={
            "Origin": frontend_url.rstrip("/"),
            "Access-Control-Request-Method": "GET",
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            allow_origin = response.headers.get("access-control-allow-origin")
    except HTTPError as exc:
        return CheckResult("cors", False, f"HTTP {exc.code} on CORS preflight")
    except URLError as exc:
        return CheckResult("cors", False, f"CORS preflight connection failed: {exc.reason}")
    except TimeoutError:
        return CheckResult("cors", False, "CORS preflight timed out")

    expected = frontend_url.rstrip("/")
    if allow_origin != expected:
        return CheckResult("cors", False, f"expected access-control-allow-origin {expected!r}, got {allow_origin!r}")
    return CheckResult("cors", True, f"allows browser origin {expected}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a deployed VEIL frontend/API connection.")
    parser.add_argument("--api-url", required=True, help="Public FastAPI base URL, for example https://veil-api.onrender.com")
    parser.add_argument("--frontend-url", required=True, help="Public frontend origin, for example https://veil.vercel.app")
    parser.add_argument("--timeout", type=int, default=15)
    args = parser.parse_args()

    api_base_url = normalize_base_url(args.api_url)
    checks = [
        check_json_endpoint("api health", urljoin(api_base_url, "api/health"), args.timeout),
        check_json_endpoint("dashboard", urljoin(api_base_url, "api/workspace/dashboard?case_id=1"), args.timeout),
        check_cors(args.api_url, args.frontend_url, args.timeout),
    ]

    for check in checks:
        status = "PASS" if check.ok else "FAIL"
        print(f"{status} {check.name}: {check.detail}")

    return 0 if all(check.ok for check in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
