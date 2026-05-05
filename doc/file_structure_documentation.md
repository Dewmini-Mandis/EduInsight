File Structure Documentation

Overview

This document outlines the recommended repository structure for the MN final-year project and explains the purpose of each major folder.

Root Structure

EduInsight/
  README.md
  doc/
    project_documentation.md
    user_roles_and_features.md
    database_design_document.md
    file_structure_documentation.md
  backend/
  ml/
  frontend/

Backend (Django + DRF)

backend/
  manage.py
  requirements.txt
  config/
    settings.py
    urls.py
    wsgi.py
    asgi.py
  apps/
    accounts/
    schools/
    classes/
    quizzes/
    attempts/
    analytics/
    recommendations/
  common/
    pagination.py
    permissions.py
    utils.py
  tests/
    accounts/
    schools/
    quizzes/
    attempts/
    analytics/
    recommendations/

Purpose:
- config: Django project settings and routing.
- apps: Domain-based modules aligned with the functional requirements.
- common: Shared helpers such as pagination and permissions.
- tests: Unit and integration tests grouped by app.

ML and Analytics Service

ml/
  notebooks/
  training/
    risk_model_train.py
    clustering_train.py
  inference/
    risk_predict.py
    cluster_predict.py
  data_pipeline/
    feature_builder.py
    preprocess.py
  models/
    risk_model.pkl
    clustering_model.pkl

Purpose:
- training: Model training scripts for risk prediction and clustering.
- inference: Lightweight prediction scripts used by the backend.
- data_pipeline: Feature building and data preprocessing steps.
- models: Stored model artifacts for inference.

Frontend (React)

frontend/
  package.json
  src/
    api/
      client.ts
      endpoints.ts
    auth/
    dashboards/
      national/
      school/
      teacher/
      student/
    quizzes/
    reports/
    recommendations/
    components/
    hooks/
    routes/
    styles/

Purpose:
- dashboards: Role-based views for different user types.
- quizzes: Quiz UI and attempt flow.
- reports: Analytics and report screens.
- recommendations: Personalized learning suggestions.
- api: HTTP client and API endpoint mappings.

Notes

- The structure follows a clear separation of concerns: backend, ML, and frontend.
- App boundaries match the data model and functional requirements from the documentation.
- The ml folder can be kept separate or deployed as a service if needed.
