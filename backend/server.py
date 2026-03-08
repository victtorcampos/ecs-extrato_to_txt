"""
Backend Contábil - Clean Architecture
Sistema de processamento de lotes contábeis com Clean Architecture
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv()

from src.config.database import init_db
from src.adapters.inbound.rest.controllers import lote_router, account_mapping_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager para inicialização do banco"""
    await init_db()
    yield


app = FastAPI(
    title="Sistema Contábil - Clean Architecture",
    description="API para processamento de lotes contábeis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas da API
app.include_router(lote_router)
app.include_router(account_mapping_router)


@app.get("/api/health")
async def health_check():
    """Endpoint de health check"""
    return {"status": "healthy", "service": "contabil-backend"}


# Servir frontend React (SPA)
frontend_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

if os.path.exists(frontend_build_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build_path, "static")), name="static")
    
    @app.get("/home")
    @app.get("/")
    async def serve_spa_home():
        return FileResponse(os.path.join(frontend_build_path, "index.html"))
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Se não for rota de API, servir o frontend
        if not full_path.startswith("api/"):
            file_path = os.path.join(frontend_build_path, full_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(os.path.join(frontend_build_path, "index.html"))
        return JSONResponse(status_code=404, content={"detail": "Not Found"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
