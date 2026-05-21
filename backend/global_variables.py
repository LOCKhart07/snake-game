import os

URL_PREFIX = "/snake-game"

SQLALCHEMY_DATABASE_URI = "sqlite:////data/score.db"
CORS_URLS = ["https://lockhart07.github.io", "https://slitherbite.lockhart.in"]

GET_SCORES_POLLING_RATE_SECONDS = 5

ANALYTICS_PASSWORD = os.environ.get("ANALYTICS_PASSWORD", "")
