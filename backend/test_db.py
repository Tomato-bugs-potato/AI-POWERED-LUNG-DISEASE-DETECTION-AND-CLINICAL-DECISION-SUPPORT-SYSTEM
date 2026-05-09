import asyncio
import traceback
from app.db.session import engine
from app.models import Base

# Ensure all models are imported
from app.models.__init__ import *

async def main():
    print("Starting DB test")
    async with engine.begin() as conn:
        try:
            print("Running create_all")
            await conn.run_sync(Base.metadata.create_all)
            print("Successfully ran create_all")
        except Exception as e:
            print("Error running create_all:")
            traceback.print_exc()

        try:
            print("Running create_all with checkfirst=True")
            await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True))
            print("Successfully ran create_all with checkfirst")
        except Exception as e:
            print("Error running create_all checkfirst:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
