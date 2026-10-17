# Production Deployment & Operations Guide

## 1. System Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Windows Server 2022 | Ubuntu 24.04 LTS / Windows Server 2022 |
| **CPU** | 2 Cores | 4 Cores |
| **RAM** | 4 GB | 8 GB |
| **Disk Space** | 20 GB SSD | 50 GB NVMe SSD |
| **Python** | 3.11.x | 3.11.x |
| **Node.js** | 18.x LTS | 20.x LTS |
| **PostgreSQL** | 15.x | 16.x |

---

## 2. Production Architecture

```
                    ┌─────────────────────────┐
                    │  Desktop Client / Web   │
                    └───────────┬─────────────┘
                                │ HTTPS / WSS
                                ▼
                    ┌─────────────────────────┐
                    │   Nginx Reverse Proxy   │ (SSL Termination, Rate Limiting)
                    └───────────┬─────────────┘
                                │ Proxy Pass (Unix Socket / 127.0.0.1:8000)
                                ▼
                    ┌─────────────────────────┐
                    │    Gunicorn / Waitress  │ (WSGI Application Server)
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Django REST API App   │
                    └───────────┬─────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
        ┌──────────────────┐        ┌──────────────────┐
        │  PostgreSQL 16   │        │   Redis Cache    │
        │  (Primary DB)    │        │ (Session/Broker) │
        └──────────────────┘        └──────────────────┘
```

---

## 3. Database Setup (PostgreSQL)

### 3.1 Create Role and Database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE hrms_prod_db;
CREATE USER hrms_user WITH ENCRYPTED PASSWORD 'StrongProductionPasswordHere#2026';
GRANT ALL PRIVILEGES ON DATABASE hrms_prod_db TO hrms_user;
ALTER DATABASE hrms_prod_db OWNER TO hrms_user;
\q
```

---

## 4. Backend Deployment (Linux / systemd)

### 4.1 Clone Repository and Prepare Virtual Environment
```bash
git clone https://github.com/company/hrms.git /var/www/hrms
cd /var/www/hrms/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn
```

### 4.2 Configure Environment (`backend/.env`)
```ini
DJANGO_SECRET_KEY=generate_with_django_crypto_get_random_string_50_chars
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=hrms.company.com,api-hrms.company.com,127.0.0.1
DATABASE_URL=postgresql://hrms_user:StrongProductionPasswordHere#2026@127.0.0.1:5432/hrms_prod_db
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://hrms.company.com
DJANGO_SETTINGS_MODULE=config.settings.production
```

### 4.3 Database Migrations & Static Asset Collection
```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 4.4 Systemd Service Definition (`/etc/systemd/system/hrms-backend.service`)
```ini
[Unit]
Description=HRMS Django WSGI Service
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/hrms/backend
EnvironmentFile=/var/www/hrms/backend/.env
ExecStart=/var/www/hrms/backend/venv/bin/gunicorn \
          --workers 4 \
          --bind 127.0.0.1:8000 \
          --access-logfile /var/log/hrms/access.log \
          --error-logfile /var/log/hrms/error.log \
          config.wsgi:application

Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo mkdir -p /var/log/hrms && sudo chown -R www-data:www-data /var/log/hrms
sudo systemctl daemon-reload
sudo systemctl enable hrms-backend
sudo systemctl start hrms-backend
sudo systemctl status hrms-backend
```

---

## 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/hrms.conf`:
```nginx
server {
    listen 80;
    server_name hrms.company.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hrms.company.com;

    ssl_certificate /etc/letsencrypt/live/hrms.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hrms.company.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client upload limits
    client_max_body_size 25M;

    # Static Files
    location /static/ {
        alias /var/www/hrms/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Media Files (Documents, Payslip PDFs)
    location /media/ {
        alias /var/www/hrms/backend/media/;
        expires 7d;
        add_header Cache-Control "private";
    }

    # API Proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/hrms.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Windows Server Alternative (Waitress + NSSM)

For Windows Server environments:
1. Install Waitress in virtualenv: `pip install waitress`
2. Run via NSSM (Non-Sucking Service Manager):
```cmd
nssm install HRMSService "C:\xampp\htdocs\hrms\backend\venv\Scripts\waitress-serve.exe" "--listen=127.0.0.1:8000 config.wsgi:application"
nssm set HRMSService AppDirectory "C:\xampp\htdocs\hrms\backend"
nssm start HRMSService
```

---

## 7. Desktop Application Packaging (Windows)

To generate standalone distributable binaries:
```bash
cd desktop
npm run build
npx electron-builder --win
```
The output is created in `desktop/release/`, containing:
- `HRMS Desktop Setup 1.0.0.exe` (NSIS Installer)
- `win-unpacked/` (Unpacked standalone directory for direct deployment without admin installer).

---

## 8. Backup & Disaster Recovery

An automated daily database backup script is provided in `scripts/backup_db.py`.
Scheduled via cron (`crontab -e`):
```cron
0 2 * * * /var/www/hrms/backend/venv/bin/python /var/www/hrms/scripts/backup_db.py >> /var/log/hrms/backup.log 2>&1
```

Restore procedure:
```bash
python scripts/backup_db.py --restore /var/backups/hrms/hrms_db_backup_2026-10-17.sql.gz
```

