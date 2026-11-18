# Quick Start — PostgreSQL Only

Buddy, ab local aur Railway **dono PostgreSQL** use karenge. SQLite remove kar diya hai.

1. PgAdmin mein `csr_app` role aur `scholarshiphive_csr` / `scholarshiphive_csr_test` databases create karo.
2. `SETUP_LOCAL.bat` ek baar chalao to `backend/.env` generate ho. Is file mein local PostgreSQL password aur fresh JWT secret add karo.
3. `SETUP_LOCAL.bat` dobara chalao; tables banengi aur first admin account create hoga.
4. `START_API_LOCAL.bat` aur `START_WORKER_LOCAL.bat` separate terminals mein start karo.
5. Chrome mein `extension/` Load Unpacked karo. API `http://127.0.0.1:8000` set karo.
6. Employee signup, admin approval, WhatsApp sync, PDF audit aur chatbot test karo.
7. Jab local testing complete ho, same code Railway API + Postgres + worker par deploy karo.

**Exact SQL aur troubleshooting:** `START_HERE_POSTGRES_ROMAN_URDU.md`
