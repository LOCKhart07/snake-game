from typing import List, Optional, Dict, Any, Union
import datetime
import json
import base64
import time
from fastapi import FastAPI, Depends, Request, Response, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Field, Session, SQLModel, create_engine, select, desc, asc, column
from sqlalchemy import func, Column, String, Integer
from sqlalchemy.ext.asyncio import create_async_engine
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
import global_variables

# Define SQLModel models
class User(SQLModel, table=True):
    __tablename__ = "users" # type: ignore #pyright issue
    user_id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(nullable=False)

    def __repr__(self):
        return f"User(user_id={self.user_id}, username='{self.username}')"

    def __str__(self):
        return f"{self.username} (ID: {self.user_id})"


class Score(SQLModel, table=True):
    __tablename__ = "scores" # type: ignore #pyright issue
    score_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.user_id")
    score: int = Field(nullable=False)
    scored_at: str = Field(default=None)
    time_taken_seconds: int = Field(default=None)

    def __repr__(self):
        return f"Score(score_id={self.score_id}, user_id={self.user_id}, score={self.score}, scored_at={self.scored_at}, time_taken_seconds={self.time_taken_seconds})"

    def __str__(self):
        return f"{self.score} scored by user {self.user_id} at {self.scored_at} ({self.time_taken_seconds} seconds)"


# Create database engine
engine = create_engine(global_variables.SQLALCHEMY_DATABASE_URI)
SQLModel.metadata.create_all(engine)


# Define request models
class ScoreRequest(BaseModel):
    username: str
    score: int
    timeTakenSeconds: int


# Define response models
class ScoreboardEntry(BaseModel):
    username: str
    score: int
    timeTakenSeconds: int
    scoredAt: Optional[str] = None


class ScoreboardResponse(BaseModel):
    data: List[ScoreboardEntry]


# Helper functions
def get_scoreboard_pair(user: User, score: Score) -> Dict[str, Any]:
    return {
        "username": user.username,
        "score": score.score,
        "timeTakenSeconds": score.time_taken_seconds,
        "scoredAt": score.scored_at,
    }


def get_client_ip(request: Request) -> str:
    """Function to retrieve the client's IP address."""
    headers = request.headers
    if "X-Forwarded-For" in headers:
        # If behind a proxy, use the first IP in the X-Forwarded-For list
        return headers["X-Forwarded-For"].split(",")[0]
    elif "X-Real-Ip" in headers:
        return headers["X-Real-Ip"]
    elif request.client is None:
        return "HOW TF DID THIS HAPPEN!"
    else:
        # Direct access (not behind a proxy)
        return request.client.host


def xor_cipher(data: str, key: str) -> str:
    result = "".join(
        chr(ord(data[i]) ^ ord(key[i % len(key)])) for i in range(len(data))
    )
    return result


# Create session dependency
def get_db():
    with Session(engine) as session:
        yield session


# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
    allow_origins=global_variables.CORS_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
async def validate_score_request(request: Request):
    """Dependency to validate score submission requests"""
    # Read request body
    body_bytes = await request.body()

    try:
        request_body = json.loads(body_bytes)
        username = request_body["username"]
        score = request_body["score"]
        time_taken_seconds = request_body["timeTakenSeconds"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad Request", "message": "Field missing"},
        )

    current_time = datetime.datetime.now().timestamp()
    client_ip = get_client_ip(request)

    encoded_data = request.headers.get("Accept-Connection")
    if not encoded_data:
        print(
            f"Suspicious Activity: IP {client_ip} detected possible attempt to direct access the API. | "
            f"Request body: {json.dumps(request_body)} | "
            f"No 'Accept-Connection' header."
        )
        # Instead of modifying the response, raise an exception
        # or return a specific result that the endpoint can handle
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid request signature"
        )

    try:
        key = f"{username}~{score}~ty~{time_taken_seconds}"
        decoded_bytes = base64.b64decode(encoded_data)
        decoded_str = decoded_bytes.decode("utf-8")
        data = base64.b64decode(xor_cipher(decoded_str, key))
        json_data = json.loads(data)
    except Exception:
        print(
            f"Suspicious Activity: IP {client_ip} detected possible request body manipulation. | "
            f"Request body: {json.dumps(request_body)} | "
            f"Encoded data: {encoded_data}."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid request signature"
        )

    timestamp_from_request = int(json_data["timestamp"])
    if abs(current_time - timestamp_from_request) > 60:
        print(
            f"Suspicious Activity: IP {client_ip} detected a potential replay attack. | "
            f"Request body: {json.dumps(request_body)}. | "
            f"Request timestamp: {timestamp_from_request}, Current time: {current_time}. "
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Request expired"
        )

    # If validation passes, return the parsed body
    return request_body


# API Endpoints
@app.get(f"{global_variables.URL_PREFIX}/api/ping")
async def ping():
    return "pong"


@app.post(f"{global_variables.URL_PREFIX}/api/score", response_model=ScoreRequest)
async def save_score(validated: dict = Depends(validate_score_request),db: Session = Depends(get_db)):
        
    score_request = ScoreRequest(
            username=validated["username"],
            score=validated["score"],
            timeTakenSeconds=int(validated["timeTakenSeconds"])
        )
    user = db.exec(select(User).where(User.username == score_request.username)).first()
    if not user:
        user = User(username=score_request.username)
        db.add(user)
        db.commit()
        db.refresh(user)

    new_score = Score(
        user_id=user.user_id,
        score=score_request.score,
        scored_at=datetime.datetime.now(datetime.UTC).isoformat(),
        time_taken_seconds=score_request.timeTakenSeconds,
    )
    print("RECIEVED A SCORE: ", new_score)

    db.add(new_score)
    db.commit()

    return score_request


def get_top_scoreboard_service(db: Session, page: int, per_page: int, username: Optional[str] = None):
    query = (
        select(
            User,
            func.max(Score.score).label("max_score"),
            Score.scored_at,
            Score.time_taken_seconds,
        )
        .join(Score)
        .group_by(User.user_id) #type: ignore #IDK
    )

    if username:
        query = query.where(column(User.username).like(f"%{username}%"))

    query = query.order_by(desc(Score.score), asc(Score.scored_at))

    # Execute query with pagination
    result = db.exec(query.offset((page - 1) * per_page).limit(per_page)).all()

    return [
        get_scoreboard_pair(
            user=user,
            score=Score(
                scored_at=scored_at,
                score=score,
                time_taken_seconds=time_taken_seconds,
            ),
        )
        for user, score, scored_at, time_taken_seconds in result
    ]


@app.get(f"{global_variables.URL_PREFIX}/api/score", response_model=ScoreboardResponse)
async def get_scoreboard(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1),
    username: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(User, Score).join(Score)

    if username:
        query = query.where(column(User.username).like(f"%{username}%"))

    query = query.order_by(desc(Score.score), desc(Score.scored_at))

    # Execute query with pagination
    result = db.exec(query.offset((page - 1) * per_page).limit(per_page)).all()

    return {
        "data": [
            get_scoreboard_pair(user=user, score=score) for user, score in result
        ]
    }

@app.get(f"{global_variables.URL_PREFIX}/api/personal-best", response_model=dict)
async def get_user_top_score(username: str, db: Session = Depends(get_db)):
    query = (
        select(
            User,
            Score.score.label("max_score"), #type: ignore #IDK
            Score.scored_at,
            Score.time_taken_seconds,
        )
        .join(Score)
        .where(User.username == username)
        .order_by(desc(Score.score), asc(Score.time_taken_seconds))
    )

    result = db.exec(query).first()

    if result:
        user, score, scored_at, time_taken_seconds = result
    else:
        user = User(username=username) if username else User(username="")
        score = 0
        scored_at = None
        time_taken_seconds = None

    data = get_scoreboard_pair(
        user=user,
        score=Score(
            scored_at=scored_at,
            score=score,
            time_taken_seconds=time_taken_seconds,
        ),
    )

    return {"data": data}


@app.get(f"{global_variables.URL_PREFIX}/api/top-score", response_model=ScoreboardResponse)
async def get_top_scoreboard(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1),
    username: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return {
        "data": get_top_scoreboard_service(
            db=db, page=page, per_page=per_page, username=username
        )
    }


@app.get(f"{global_variables.URL_PREFIX}/stream/top-score")
async def stream_scores(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1),
    username: Optional[str] = None,
):
    async def event_stream():
        last_data = None
        while True:
            with Session(engine) as db:
                current_data = get_top_scoreboard_service(
                    db=db, page=page, per_page=per_page, username=username
                )
                if current_data != last_data:
                    data = {
                        "data": current_data,
                        "timestamp": str(
                            datetime.datetime.now(
                                datetime.timezone(
                                    datetime.timedelta(hours=5, minutes=30)
                                )
                            )
                        ),
                    }
                    last_data = current_data
                    yield f"data: {json.dumps(data)}\n\n"

            # Wait for either 5 seconds or a new score update
            await asyncio.sleep(global_variables.GET_SCORES_POLLING_RATE_SECONDS)

            # Check if client disconnected
            if await request.is_disconnected():
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    import asyncio

    print("BOOTING UP THE REACTORS!!!")
    host = "0.0.0.0"
    port = 8000
    print(f"STARTING WEBSERVER ON {host}:{port}")
    uvicorn.run(app, host=host, port=port)
