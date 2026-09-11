from typing import Any

from neo4j import GraphDatabase
from neo4j.exceptions import AuthError, Neo4jError, ServiceUnavailable, SessionExpired

from app.core.config import settings


class GraphUnavailableError(RuntimeError):
    """Raised when the configured Neo4j service cannot be reached."""


class GraphClient:
    def __init__(self) -> None:
        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    def verify_connectivity(self) -> None:
        try:
            self._driver.verify_connectivity()
        except (AuthError, OSError, ServiceUnavailable, SessionExpired) as exc:
            raise GraphUnavailableError("Neo4j is unavailable or credentials are invalid.") from exc

    def execute_write(self, query: str, parameters: dict[str, Any] | None = None) -> None:
        try:
            with self._driver.session() as session:
                session.execute_write(lambda tx: tx.run(query, parameters or {}).consume())
        except (AuthError, OSError, ServiceUnavailable, SessionExpired) as exc:
            raise GraphUnavailableError("Neo4j is unavailable or credentials are invalid.") from exc
        except Neo4jError:
            raise

    def execute_read(self, query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        try:
            with self._driver.session() as session:
                result = session.execute_read(lambda tx: list(tx.run(query, parameters or {})))
            return [dict(record) for record in result]
        except (AuthError, OSError, ServiceUnavailable, SessionExpired) as exc:
            raise GraphUnavailableError("Neo4j is unavailable or credentials are invalid.") from exc
        except Neo4jError:
            raise

    def close(self) -> None:
        self._driver.close()
