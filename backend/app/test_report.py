import asyncio
import uuid
import sys
# Ensure app is in path
sys.path.append("/app")
from app.db.session import async_session_maker
from sqlalchemy import select
from app.models.case import Case
from app.workers.report_tasks import generate_report_task

async def main():
    try:
        async with async_session_maker() as session:
            stmt = select(Case).where(Case.case_id == uuid.UUID('e455dc11-2e36-4024-a925-6309544d119b'))
            result = await session.execute(stmt)
            case = result.scalar_one_or_none()
            if case:
                doctor_id = str(case.diagnosis.doctor_id) if case.diagnosis else "00000000-0000-0000-0000-000000000000"
                print(f"Triggering for case: {case.case_id}, doctor: {doctor_id}")
                res = generate_report_task(str(case.case_id), doctor_id)
                print("Result:", res)
            else:
                print("Case not found")
    except Exception as e:
        print("Outer Exception:", e)

asyncio.run(main())
