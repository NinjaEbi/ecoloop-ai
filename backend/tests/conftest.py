import sys
from pathlib import Path

# Permit `pytest backend/tests` from the repository root and `pytest` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
