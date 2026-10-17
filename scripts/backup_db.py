#!/usr/bin/env python
"""
Automated Database Backup and Restore Utility for HRMS.
Supports both PostgreSQL and SQLite fallback environments.
Includes automated compression and retention pruning (default 30 days).

Usage:
    python scripts/backup_db.py
    python scripts/backup_db.py --restore <backup_filepath>
    python scripts/backup_db.py --retention-days 14
"""

import os
import sys
import argparse
import datetime
import shutil
import sqlite3
import subprocess
from pathlib import Path
from urllib.parse import urlparse

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def parse_database_url():
    """Extract database connection parameters from environment or default."""
    # Check .env if available
    env_file = BASE_DIR / "backend" / ".env"
    db_url = os.environ.get("DATABASE_URL")
    if not db_url and env_file.exists():
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip("'\"")
                    break

    if not db_url:
        db_url = "sqlite:///backend/db.sqlite3"

    return db_url


def backup_sqlite(db_path: Path) -> Path:
    """Create an online atomic backup of SQLite database using sqlite3 backup API."""
    if not db_path.is_absolute():
        db_path = BASE_DIR / db_path

    if not db_path.exists():
        raise FileNotFoundError(f"Source SQLite database not found at {db_path}")

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"hrms_backup_{timestamp}.sqlite3"

    print(f"[*] Backing up SQLite database from {db_path} to {backup_file}...")
    src_conn = sqlite3.connect(str(db_path))
    dst_conn = sqlite3.connect(str(backup_file))
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    dst_conn.close()
    src_conn.close()

    print(f"[+] Backup completed successfully: {backup_file} ({backup_file.stat().st_size} bytes)")
    return backup_file


def backup_postgres(parsed_url) -> Path:
    """Execute pg_dump with custom archive format."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"hrms_backup_{timestamp}.dump"

    env = os.environ.copy()
    if parsed_url.password:
        env["PGPASSWORD"] = parsed_url.password

    cmd = [
        "pg_dump",
        "-h", parsed_url.hostname or "localhost",
        "-p", str(parsed_url.port or 5432),
        "-U", parsed_url.username or "postgres",
        "-F", "c",
        "-b",
        "-v",
        "-f", str(backup_file),
        parsed_url.path.lstrip("/")
    ]

    print(f"[*] Executing pg_dump for database {parsed_url.path.lstrip('/')}...")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed:\n{result.stderr}")

    print(f"[+] Backup completed successfully: {backup_file} ({backup_file.stat().st_size} bytes)")
    return backup_file


def restore_backup(backup_file: Path, db_url: str):
    """Restore database from backup file."""
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found at {backup_file}")

    print(f"[*] Starting restore from {backup_file}...")
    if backup_file.suffix == ".sqlite3" or "sqlite" in db_url:
        parsed = urlparse(db_url)
        target_path = Path(parsed.path.lstrip("/")) if parsed.path else BASE_DIR / "backend" / "db.sqlite3"
        if not target_path.is_absolute():
            target_path = BASE_DIR / target_path

        shutil.copy2(str(backup_file), str(target_path))
        print(f"[+] SQLite database restored successfully to {target_path}")
    else:
        parsed = urlparse(db_url)
        env = os.environ.copy()
        if parsed.password:
            env["PGPASSWORD"] = parsed.password

        cmd = [
            "pg_restore",
            "-h", parsed.hostname or "localhost",
            "-p", str(parsed.port or 5432),
            "-U", parsed.username or "postgres",
            "-d", parsed.path.lstrip("/"),
            "-v",
            "--clean",
            str(backup_file)
        ]
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[!] pg_restore warnings/errors:\n{result.stderr}")
        else:
            print(f"[+] PostgreSQL database restored successfully.")


def prune_old_backups(retention_days: int):
    """Prune backups older than specified retention period."""
    cutoff = datetime.datetime.now() - datetime.timedelta(days=retention_days)
    count = 0
    for item in BACKUP_DIR.iterdir():
        if item.is_file() and item.name.startswith("hrms_backup_"):
            mtime = datetime.datetime.fromtimestamp(item.stat().st_mtime)
            if mtime < cutoff:
                item.unlink()
                count += 1
                print(f"[-] Pruned aged backup: {item.name}")
    print(f"[*] Retention prune complete: {count} old backup(s) removed.")


def main():
    parser = argparse.ArgumentParser(description="HRMS Database Backup and Restore Utility")
    parser.add_argument("--restore", type=str, help="Path to backup file to restore")
    parser.add_argument("--retention-days", type=int, default=30, help="Days of backup retention (default: 30)")
    args = parser.parse_args()

    db_url = parse_database_url()

    if args.restore:
        restore_backup(Path(args.restore), db_url)
        return

    if "sqlite" in db_url:
        parsed = urlparse(db_url)
        sqlite_file = parsed.path.lstrip("/")
        backup_sqlite(Path(sqlite_file))
    elif "postgres" in db_url:
        parsed = urlparse(db_url)
        backup_postgres(parsed)
    else:
        print(f"[!] Unsupported database engine in URL: {db_url}")
        sys.exit(1)

    prune_old_backups(args.retention_days)


if __name__ == "__main__":
    main()

