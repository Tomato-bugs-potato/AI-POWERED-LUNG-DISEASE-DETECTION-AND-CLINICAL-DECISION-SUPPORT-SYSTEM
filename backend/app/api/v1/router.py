from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, patients, cases, images, inference, reviews, diagnoses, reports, logs

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(images.router, prefix="/images", tags=["Images"])
api_router.include_router(inference.router, prefix="/inference", tags=["Inference"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(diagnoses.router, prefix="/diagnoses", tags=["Diagnoses"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(logs.router, prefix="/logs", tags=["Audit Logs"])
