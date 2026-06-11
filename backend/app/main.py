from fastapi import FastAPI


app = FastAPI(title="Jungle Campus Life AI FAQ Board")


@app.get("/health")
def health_check():
    """서버가 정상적으로 실행 중인지 확인하는 가장 작은 API다.
    입력은 없고, 정상 상태를 나타내는 JSON을 반환한다.
    프론트엔드나 배포 환경에서 백엔드 연결 확인용으로 사용한다.
    """
    return {"status": "ok"}

