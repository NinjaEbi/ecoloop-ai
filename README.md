# EcoLoop AI — Phase-1 College Mini-Project Prototype

EcoLoop AI is an explainable decision-support prototype for a device's repair, refurbish, sell, donate, or recycle path. It persists assessments to SQLite and deliberately distinguishes model-backed recognition from manual assessment.

## Current verified status

- The supplied workspace initially contained no repository, Dataset 1, Dataset 2, or trained model.
- Dataset 3 is publicly accessible: 3,000 tabular smartphone rows. It is useful for later structured experiments but cannot train image recognition.
- Consequently image validation works, but recognition returns **unknown** until a verified local model artifact is added. The complete manual-assessment flow is functional and labelled accordingly.

## Run

Use the bundled Python executable or any Python 3.12 environment.

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. API documentation is at `http://localhost:8000/docs`.

## Tests

```powershell
cd backend; python -m pytest
cd frontend; npm test; npm run build
```

## Dataset workflow

Do not merge datasets by default. Once local datasets are located, first run:

```powershell
python scripts/inspect_dataset.py --path "PATH_TO_DATASET" --output docs/dataset_report.json
```

Review class semantics, splits, labels, duplicates, and the report before recording an approved mapping with `prepare_dataset.py`. See [docs/dataset.md](docs/dataset.md).

## Architecture

React/Vite → FastAPI → image validation / optional model adapter → condition engine → EcoScore → recommendation engine → SQLite → history and demo stakeholders.

Sample stakeholder entries are clearly labelled demo data; they are not live businesses or availability data.
