from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config"
DB_PATH = ROOT / "backend" / "ecoloop.db"
UPLOAD_DIR = ROOT / "backend" / "uploads"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}

def json_config(name: str) -> Path:
    return CONFIG / name
