# HRMS API Documentation

> **Base URL:** `http://localhost:8000/api/v1/`  
> **API Version:** `v1`  
> **Auth Scheme:** JWT (`Authorization: Bearer <token>`)

---

## 1. System Health

### `GET /api/v1/health/`
Checks backend and database connectivity.

- **Auth:** Public
- **Response 200 OK:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "django": "4.2.16",
  "database": "connected"
}
```

---

## 2. Authentication & Account Management

### `POST /api/v1/auth/login/`
Authenticate user with email and password. Returns JWT token pair.

- **Auth:** Public
- **Request Body:**
```json
{
  "email": "employee@example.com",
  "password": "Password123!"
}
```
- **Response 200 OK:**
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "email": "employee@example.com",
    "full_name": "Jane Doe",
    "role": "EMPLOYEE",
    "is_active": true
  }
}
```

### `POST /api/v1/auth/refresh/`
Refresh expired access token.

- **Auth:** Public
- **Request Body:**
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response 200 OK:**
```json
{
  "access": "eyJhbGciOi..."
}
```

### `POST /api/v1/auth/logout/`
Blacklist active refresh token and invalidate device session.

- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response 200 OK:**
```json
{
  "detail": "Successfully logged out."
}
```

### `GET /api/v1/auth/me/`
Fetch profile of the currently logged-in user.

- **Auth:** Required (`Bearer <token>`)
- **Response 200 OK:**
```json
{
  "id": 1,
  "email": "employee@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "full_name": "Jane Doe",
  "role": "EMPLOYEE",
  "is_active": true,
  "date_joined": "2026-10-17T01:49:44Z",
  "last_login": "2026-10-17T01:50:31Z"
}
```

### `POST /api/v1/auth/change-password/`
Change current user's password.

- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!",
  "confirm_new_password": "NewSecurePassword456!"
}
```
- **Response 200 OK:**
```json
{
  "detail": "Password changed successfully."
}
```

### `POST /api/v1/auth/password-reset/`
Request a password reset link by email.

- **Auth:** Public
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response 200 OK:**
```json
{
  "detail": "If an account with that email exists, a password reset link has been sent."
}
```

### `POST /api/v1/auth/password-reset/confirm/`
Confirm password reset using token from email.

- **Auth:** Public
- **Request Body:**
```json
{
  "token": "secure-reset-token",
  "new_password": "NewSecurePassword456!",
  "confirm_new_password": "NewSecurePassword456!"
}
```
- **Response 200 OK:**
```json
{
  "detail": "Password has been reset successfully."
}
```

---

## 3. Administrative User Management

### `GET /api/v1/auth/users/`
List all users with pagination.

- **Auth:** Admin only (`ADMIN`)
- **Response 200 OK:**
```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "email": "admin@hrms.local",
      "first_name": "System",
      "last_name": "Administrator",
      "full_name": "System Administrator",
      "role": "ADMIN",
      "is_active": true,
      "date_joined": "2026-10-17T01:49:44Z",
      "last_login": null
    }
  ]
}
```

### `POST /api/v1/auth/users/`
Create a new user with designated role.

- **Auth:** Admin only (`ADMIN`)
- **Request Body:**
```json
{
  "email": "hr@example.com",
  "first_name": "Sarah",
  "last_name": "Connor",
  "role": "HR",
  "password": "TemporaryPassword123!",
  "is_active": true
}
```
- **Response 201 Created:** User representation (without password).

---

## 4. Audit Trail

### `GET /api/v1/audit/`
Query immutable system audit logs.

- **Auth:** Admin or HR Manager (`ADMIN`, `HR`)
- **Filter Query Params:** `?action=AUTH_LOGIN&content_type=user`
- **Response 200 OK:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "user_email": "admin@hrms.local",
      "target_email": null,
      "action": "AUTH_LOGIN",
      "content_type": "",
      "object_id": null,
      "object_repr": "",
      "ip_address": "127.0.0.1",
      "notes": "",
      "created_at": "2026-10-17T01:50:31Z"
    }
  ]
}
```

