# EcoLoop AI — Phase-1 project report

## Overview

EcoLoop AI is a working Phase-1 college mini-project prototype for explainable e-waste decision support. It validates images, handles uncertain recognition safely, gathers ordinary-user functional observations, calculates a condition score and EcoScore, evaluates Repair/Refurbish/Sell/Donate/Recycle, stores the assessment in SQLite, and shows its history.

## Architecture and technology

React + Vite + TypeScript provides the responsive user interface, including a Leaflet/OpenStreetMap view for clearly labelled sample stakeholder locations. A modular FastAPI backend exposes REST/OpenAPI endpoints, validates image quality with Pillow/NumPy, runs the condition/EcoScore/recommendation services, and persists data in SQLite. Configuration files hold thresholds, weights, category scope, and stakeholder mappings.

## Actual data and model status

No local Dataset 1, Dataset 2, or trained model was found in the supplied workspace or the searched Documents/Codex tree. Therefore no image model was trained, no model metric is reported, and the application does not claim supported AI detection classes or visible-damage labels. Dataset 3 was verified as an accessible 3,000-row CSV smartphone dataset. It is structured educational data, not an image or object-detection dataset. Dataset auditing/training guard scripts are included for when the local data is supplied.

## Calculation method

EcoScore uses configured weights: reuse potential (30), condition (25), repairability (20), remaining useful life (15), recyclability (10). Five deterministic, bounded recommendation scores use reported condition, age, visible damage and optional repair economics. The maximum score is recommended and mapped to a sample stakeholder category.

## SQLite schema and API

The `assessments` table persists image reference, recognition result, answers, findings, condition, EcoScore breakdown, all option scores, recommendation and timestamp. API: `GET /api/health`, `POST /api/analyze`, `POST /api/assessment`, `GET /api/assessments`, `GET /api/assessments/{id}`, `GET /api/dashboard`, `GET /api/stakeholders`, `GET /api/stakeholders/nearby`.

## Verification results

- Backend tests: **3 passed**.
- Frontend unit test: **1 passed**.
- Frontend production build: **passed**.
- Running API checks: health, dashboard and demo stakeholder endpoints returned successful data.
- Valid 240×240 image: passed quality checks, returned `unknown` and manual-assessment messaging because no verified model exists.
- Excessively uniform image: rejected as blurry.
- Black-screen symptom assessment: persisted with condition `Poor`, EcoScore `63.8`, all five option scores, and recommendation `Repair`.
- Browser automation: attempted but unavailable: the provided browser-control Node runtime exited with an operating-system `EPERM` while resolving a protected profile path. No browser workflow result is claimed.

## Startup and demo

From the project root, install `python -m venv .venv` then `.venv\\Scripts\\python.exe -m pip install -r backend\\requirements.txt`. Run backend with `cd backend; ..\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000`. Run frontend with `cd frontend; npm install; npm run dev`. Upload a clear image, continue after the truthful unknown response, choose a category, complete the questionnaire and save the result. Open History to confirm persistence.

## Known limitations

The project does not diagnose internal faults, and functional answers are user-reported. EcoScore is a project heuristic, not a lifecycle assessment. Sample stakeholders are not live businesses. Recognition, multiple-device detection, and detailed visible-damage detection remain unavailable until locally supplied datasets are audited and a real model is trained/evaluated.
