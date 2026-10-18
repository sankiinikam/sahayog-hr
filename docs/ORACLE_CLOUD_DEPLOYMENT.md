# Oracle Cloud Always Free deployment

This deployment runs the Django API and PostgreSQL in Docker on one Oracle Cloud Always Free VM. It is appropriate for a small pilot. You are responsible for VM updates, database backups, and user access.

## 1. Create the Oracle resources

1. Create an Oracle Cloud Free Tier account and complete its verification.
2. Create an **Always Free eligible** Ubuntu 24.04 VM. The Ampere A1 shape is suitable when capacity is available.
3. Reserve a public IPv4 address for the VM.
4. In the OCI VCN security list, allow inbound TCP **80** and **443**. Do not expose port 8000 or PostgreSQL.
5. Create a DNS record such as `api.yourdomain.com` pointing to the reserved public IP. Caddy obtains the HTTPS certificate automatically after DNS is live.

## 2. Prepare the VM

Connect with SSH and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
exit
```

Connect again, then clone the repository:

```bash
git clone https://github.com/sankiinikam/sahayog-hr.git
cd sahayog-hr
cp .env.oracle.example .env.oracle
chmod 600 .env.oracle
```

Edit `.env.oracle` and set `DOMAIN`, `ALLOWED_HOSTS`, `SECRET_KEY`, `POSTGRES_PASSWORD`, and `DATABASE_URL`. The password in `DATABASE_URL` must match `POSTGRES_PASSWORD`; URL-encode special characters in that URL.

Start the service:

```bash
docker compose --env-file .env.oracle -f docker-compose.oracle.yml up -d --build
docker compose --env-file .env.oracle -f docker-compose.oracle.yml logs -f api
```

Verify `https://api.yourdomain.com/api/v1/health/` returns successfully. Create the first administrator:

```bash
docker compose --env-file .env.oracle -f docker-compose.oracle.yml exec api python manage.py seed_superuser
```

## 3. Build public client applications

After the API works, set the GitHub repository variable `HRMS_API_BASE_URL` to:

```text
https://api.yourdomain.com/api/v1
```

Then rebuild the Windows and Android applications. The Android app may also use the server-address field on its login screen, but the release build should use this public URL by default.

## Operations

Update the server after a GitHub push:

```bash
cd sahayog-hr
git pull
docker compose --env-file .env.oracle -f docker-compose.oracle.yml up -d --build
```

Back up PostgreSQL regularly to storage outside the VM:

```bash
docker compose --env-file .env.oracle -f docker-compose.oracle.yml exec -T db pg_dump -U hrms_user hrms > hrms-backup.sql
```
