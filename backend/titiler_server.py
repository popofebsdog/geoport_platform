"""
TiTiler COG tile server — runs on http://localhost:8080
Start: python titiler_server.py  (or ./start_titiler.sh)
"""
from titiler.application.main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        log_level="info",
    )
