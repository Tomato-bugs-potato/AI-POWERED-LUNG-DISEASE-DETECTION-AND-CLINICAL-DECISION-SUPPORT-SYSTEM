import enum
from typing import Any
from sqlalchemy import MetaData
from sqlalchemy.orm import declarative_base

# Define conventions for constraint naming to help Alembic generate reliable migrations
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)

class Base(declarative_base(metadata=metadata)):
    __abstract__ = True
    
    def dict(self) -> dict[str, Any]:
        """Utility to convert model attributes to a dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

# --- Shared Enum Definitions ---

class Role(str, enum.Enum):
    Lab_Technician = "Lab_Technician"
    Radiologist = "Radiologist"
    Doctor = "Doctor"
    Admin = "Admin"

class UserStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"
    Locked = "Locked"

class HospitalStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"

class PatientSex(str, enum.Enum):
    Male = "Male"
    Female = "Female"

class CaseStatus(str, enum.Enum):
    Pending_Review = "Pending_Review"
    In_Review = "In_Review"
    Ready_for_Diagnosis = "Ready_for_Diagnosis"
    Diagnosed = "Diagnosed"
    Completed = "Completed"

class UrgencyLevel(str, enum.Enum):
    Critical = "Critical"
    Non_Critical = "Non_Critical"

class ImageFormat(str, enum.Enum):
    PNG = "PNG"
    JPEG = "JPEG"
    DICOM = "DICOM"

class PrimaryDiagnosis(str, enum.Enum):
    Normal = "Normal"
    Pneumonia = "Pneumonia"
    Tuberculosis = "Tuberculosis"
    Lung_Tumor = "Lung_Tumor"
    Other = "Other"

class AuditAction(str, enum.Enum):
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    OTP_SENT = "OTP_SENT"
    OTP_VERIFIED = "OTP_VERIFIED"
    OTP_FAILED = "OTP_FAILED"
    USER_CREATED = "USER_CREATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    PASSWORD_RESET = "PASSWORD_RESET"
    IMAGE_UPLOADED = "IMAGE_UPLOADED"
    IMAGE_DUPLICATE_DETECTED = "IMAGE_DUPLICATE_DETECTED"
    AI_INFERENCE_COMPLETED = "AI_INFERENCE_COMPLETED"
    AI_INFERENCE_FAILED = "AI_INFERENCE_FAILED"
    REVIEW_SAVED = "REVIEW_SAVED"
    ANNOTATION_EDITED = "ANNOTATION_EDITED"
    REVIEW_SENT_TO_DOCTOR = "REVIEW_SENT_TO_DOCTOR"
    DIAGNOSIS_SUBMITTED = "DIAGNOSIS_SUBMITTED"
    DIAGNOSIS_DRAFT_SAVED = "DIAGNOSIS_DRAFT_SAVED"
    REPORT_GENERATED = "REPORT_GENERATED"
    REPORT_DOWNLOADED = "REPORT_DOWNLOADED"
    PATIENT_REGISTERED = "PATIENT_REGISTERED"
    CASE_CREATED = "CASE_CREATED"
    CASE_STATUS_CHANGED = "CASE_STATUS_CHANGED"
    CASE_LINKED = "CASE_LINKED"
    DATA_DELETION_REQUESTED = "DATA_DELETION_REQUESTED"
    ADMIN_LOG_VIEWED = "ADMIN_LOG_VIEWED"
