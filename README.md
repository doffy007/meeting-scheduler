# Meeting Scheduler

Minimal online meeting scheduler, backend pakai **Bun + TypeScript**, frontend pakai **React + Vite**.

---

## Setup & Run

### Backend

```bash
cd backend
bun install
bun run dev
```

* Server default: `http://localhost:8080`.
* Config database ada di `backend/.env` (isi value sesuai lokal kamu):

```env
ENV_TYPE=
APP_NAME=
SERVER_PORT=
DATABASE_URL=
DATABASE_PORT=
DATABASE_NAME=
DATABASE_USERNAME=
DATABASE_PASSWORD=
DSN=
JWT_PUBLIC_KEY=
JWT_PRIVATE_KEY=
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

* Frontend default: `http://localhost:5173`.
* `.env` frontend:

```env
VITE_API_BASE_URL=
```

---

## Arsitektur Singkat

* **Backend**: Bun + TypeScript, API layer untuk organizer settings & booking.
* **Frontend**: React + TypeScript + Vite.
* **Database**: PostgreSQL.
* **Flow singkat**:

  1. Organizer atur working hours, durasi meeting, buffer, blackout, min notice.
  2. Invitee pilih slot di public booking page → isi nama/email → konfirmasi.
  3. Organizer dashboard: lihat bookings, reschedule, cancel.

## API Documentation

Semua endpoint backend sudah terdokumentasi di file Postman berikut:  

[Meeting Scheduler.postman_collection](./Meeting_Scheduler.postman_collection.json)