# 📡 API Reference Documentation

All endpoints are hosted by the Express API layer under the `/api` prefix. Responses adhere to standard HTTP status codes and JSON payloads.

---

## 1. Health & System Status

### `GET /api/health`
Checks server uptime, database connection pool statistics, and PostgreSQL engine version.

**Response `200 OK`**:
```json
{
  "status": "UP",
  "timestamp": "2026-10-23T22:00:00.000Z",
  "uptimeSeconds": 3600,
  "database": {
    "connected": true,
    "time": "2026-10-23T22:00:00.000Z",
    "version": "PostgreSQL 16.4",
    "pool": {
      "totalClients": 5,
      "idleClients": 4,
      "waitingClients": 0
    }
  }
}
```

---

## 2. Authentication

### `POST /api/auth/register`
Creates a new passenger account. Passwords hashed using bcrypt.

**Request Body**:
```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "Password@123"
}
```

### `POST /api/auth/login`
Authenticates a user or admin and returns a signed JSON Web Token (JWT).

**Request Body**:
```json
{
  "email": "user1@railway.com",
  "password": "User@123"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "user_id": 2,
    "name": "Aarav Sharma",
    "email": "user1@railway.com",
    "role": "USER"
  }
}
```

### `GET /api/auth/me`
Retrieves currently authenticated user profile.
- **Headers**: `Authorization: Bearer <token>`

---

## 3. Train Search & Stations

### `GET /api/stations`
Lists all 16 major Indian Railway junction stations with codes and cities.

### `GET /api/search`
Queries available trains with multi-class seat counts and calculated fares.

**Query Parameters**:
- `from`: Station code (e.g. `NDLS`)
- `to`: Station code (e.g. `MMCT`)
- `date`: Journey date (`YYYY-MM-DD`)
- `class` (optional): `SL`, `3A`, or `2A`

**Response `200 OK`**:
```json
{
  "success": true,
  "count": 1,
  "results": [
    {
      "schedule_id": 1,
      "journey_date": "2026-10-25",
      "train_id": 1,
      "train_no": "12951",
      "train_name": "Mumbai Tejas Rajdhani Express",
      "train_type": "RAJDHANI",
      "from_station_code": "NDLS",
      "departure_time": "16:55:00",
      "to_station_code": "MMCT",
      "arrival_time": "08:35:00",
      "distance_km": 1384,
      "availability": [
        {
          "class": "3A",
          "total_seats": 64,
          "free_seats": 42,
          "booked_seats": 22,
          "waiting_count": 0,
          "current_status": "AVAILABLE",
          "fare": 1450
        }
      ]
    }
  ]
}
```

### `GET /api/schedules/:id/seats?class=3A`
Returns visual seat grid and berth allocations for a specific coach layout.

---

## 4. Bookings & High-Concurrency Transactions

### `POST /api/bookings`
Executes `book_ticket` stored procedure within Repeatable Read isolation.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "scheduleId": 1,
  "class": "3A",
  "fromStationId": 1,
  "toStationId": 2,
  "passengers": [
    {
      "name": "Rohan Sharma",
      "age": 29,
      "gender": "M"
    }
  ],
  "paymentMethod": "UPI",
  "forcePayFail": false
}
```

**Response `201 Created` (Confirmed)**:
```json
{
  "success": true,
  "booking": {
    "status": "CONFIRMED",
    "pnr": 1000000045,
    "total_fare": 1450,
    "allocated_passengers": 1,
    "seat_ids": [108]
  }
}
```

### `GET /api/bookings/my`
Retrieves booking history for the authenticated user from view `v_booking_history`.

### `GET /api/pnr/:pnr`
Fetches boarding pass details, assigned berths, payment receipt, and live waitlist status.

### `POST /api/bookings/:pnr/cancel`
Invokes `cancel_ticket(pnr, user_id)` stored procedure. Atomically reallocates released seat to next in queue.

---

## 5. Admin Endpoints

Protected by `authenticateToken` and `requireRole('ADMIN')`.

- `GET /api/admin/stats`: KPI metrics, 14-day booking trends, and train fleet occupancy percentages.
- `POST /api/admin/trains`: Register new train master record.
- `POST /api/admin/stations`: Register station.
- `POST /api/admin/schedules`: Add operational train run date.
