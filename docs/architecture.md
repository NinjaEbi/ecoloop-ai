# Architecture

React/Vite presents upload, questionnaire, results, and persisted history. FastAPI validates an upload and exposes documented REST endpoints. Image validation rejects unsuitable files before optional recognition. The condition engine converts user-observable answers into evidence and a condition score; the configurable EcoScore engine produces factor contributions; the recommendation engine evaluates all five actions. SQLite persists inputs and calculations. Stakeholder results are intentionally labelled sample/demo entries.
