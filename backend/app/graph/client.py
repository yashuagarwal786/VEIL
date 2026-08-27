from typing import Any

from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

from app.core.config import settings


class GraphClient:
    def __init__(self) -> None:
        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    def verify_connectivity(self) -> None:
        self._driver.verify_connectivity()

    def execute_write(self, query: str, parameters: dict[str, Any] | None = None) -> None:
        try:
            with self._driver.session() as session:
                session.execute_write(lambda tx: tx.run(query, parameters or {}).consume())
        except Neo4jError:
            raise

    def execute_read(self, query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        try:
            with self._driver.session() as session:
                result = session.execute_read(lambda tx: list(tx.run(query, parameters or {})))
            return [record.data() for record in result]
        except Neo4jError:
            raise

    def close(self) -> None:
        self._driver.close()
