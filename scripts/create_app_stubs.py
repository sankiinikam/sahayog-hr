"""
Stub script — creates empty __init__.py, apps.py, models.py, urls.py, views.py
for apps that are registered in INSTALLED_APPS but not yet implemented.
Run once with: backend\venv\Scripts\python.exe scripts\create_app_stubs.py
"""
import os

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")

STUB_APPS = [
    "organization",
    "employees",
    "attendance",
    "leave",
    "payroll",
    "approvals",
    "notifications",
    "reports",
    "recruitment",
    "onboarding",
    "performance",
    "expenses",
    "assets",
    "offboarding",
]

INIT_CONTENT = '"""App package."""\n'

def apps_content(app_name):
    class_name = app_name.capitalize() + "Config"
    return f"""from django.apps import AppConfig


class {class_name}(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.{app_name}"
    label = "{app_name}"
    verbose_name = "{app_name.capitalize()}"
"""

MODELS_CONTENT = "# Models will be added in later phases.\n"
VIEWS_CONTENT = "# Views will be added in later phases.\n"

def urls_content(app_name):
    return f"""from django.urls import path

app_name = "{app_name}"

urlpatterns = [
    # Endpoints will be added in later phases.
]
"""

def create_stub(app_name):
    app_dir = os.path.join(BACKEND_DIR, "apps", app_name)
    os.makedirs(app_dir, exist_ok=True)

    files = {
        "__init__.py": INIT_CONTENT,
        "apps.py": apps_content(app_name),
        "models.py": MODELS_CONTENT,
        "views.py": VIEWS_CONTENT,
        "urls.py": urls_content(app_name),
    }

    for filename, content in files.items():
        path = os.path.join(app_dir, filename)
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"  Created: {path}")
        else:
            print(f"  Skipped (exists): {path}")

if __name__ == "__main__":
    for app in STUB_APPS:
        print(f"\n[{app}]")
        create_stub(app)
    print("\nDone.")

