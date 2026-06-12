import os

import psycopg
from psycopg.rows import dict_row


# 로컬 개발 기본값이다. 배포할 때는 DATABASE_URL 환경변수로 실제 DB 주소를 넣는다.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://jungle_user:jungle_password@127.0.0.1:5432/jungle_faq",
)


def get_connection():
    """PostgreSQL 연결 객체를 만든다.
    호출한 쪽에서 with 문으로 열고 닫는 방식으로 사용한다.
    dict_row를 써서 조회 결과를 dict처럼 다룰 수 있게 한다.
    """
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def check_database_connection() -> dict[str, str]:
    """DB 연결이 되는지 확인하는 최소 쿼리를 실행한다.
    실제 게시판 기능은 아니고, 연결 설정 검증용 함수다.
    성공하면 현재 DB 이름과 접속 사용자를 반환한다.
    """
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT current_database() AS database_name, current_user AS user_name"
            )
            row = cursor.fetchone()

    if row is None:
        raise RuntimeError("DB 연결 확인 결과가 비어 있습니다.")

    return dict(row)
