from sqlalchemy.orm import Session

from app.models.case import Case


class CaseRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_case_number(self, case_number: str) -> Case | None:
        return self.session.query(Case).filter(Case.case_number == case_number).one_or_none()

    def add(self, case: Case) -> Case:
        self.session.add(case)
        self.session.flush()
        return case
