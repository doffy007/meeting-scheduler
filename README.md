# Meeting Scheduler

Aplikasi booking meeting sederhana dengan **Bun + TypeScript** (backend) dan **React + Vite** (frontend).

---

## Quick Start
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Jalankan aplikasi
docker-compose up --build -d
```

Akses:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080

**Stop aplikasi:**
```bash
docker-compose down
```

---

## Environment Variables

### Backend (.env.example)
```env
ENV_TYPE=
APP_NAME=
SERVER_PORT=

DATABASE_URL=
DATABASE_PORT=
DATABASE_NAME=
DATABASE_USERNAME=
DATABASE_PASSWORD=

DSN=postgresql://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_URL}:${DATABASE_PORT}/${DATABASE_NAME}

JWT_PUBLIC_KEY=
JWT_PRIVATE_KEY=
```

### Frontend (.env.example)
```env
VITE_API_BASE_URL=
VITE_PORT=
```

---

## Fitur

- Organizer setup: working hours, timezone, meeting duration, buffer time, blackout dates
- Public booking page dengan timezone support
- Dashboard untuk manage bookings

---

## API Documentation

Import Postman collection untuk dokumentasi lengkap:

📄 [Meeting Scheduler.postman_collection.json](./Meeting_Scheduler.postman_collection.json)

---

## Tech Stack

- **Backend**: Bun, TypeScript, PostgreSQL, date-fns-tz
- **Frontend**: React, TypeScript, Vite
- **DevOps**: Docker Compose

---

## License

MIT