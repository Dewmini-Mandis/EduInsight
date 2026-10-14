from dotenv import load_dotenv
load_dotenv()

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-insecure-change-me"
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver", "*"]

INSTALLED_APPS = [
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	"rest_framework",
	"rest_framework.authtoken",
	"apps.accounts",
	"apps.schools",
	"apps.classes",
	"apps.quizzes",
	"apps.attempts",
	"apps.analytics",
	"apps.recommendations",
	"apps.audit",
]

MIDDLEWARE = [
	"django.middleware.security.SecurityMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
	{
		"BACKEND": "django.template.backends.django.DjangoTemplates",
		"DIRS": [],
		"APP_DIRS": True,
		"OPTIONS": {
			"context_processors": [
				"django.template.context_processors.debug",
				"django.template.context_processors.request",
				"django.contrib.auth.context_processors.auth",
				"django.contrib.messages.context_processors.messages",
			],
		},
	}
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

import os
import socket
import dj_database_url

db_url = os.getenv(
	"DATABASE_URL",
	"postgresql://neondb_owner:npg_NTFYE8qIifC0@ep-cool-shadow-aoob8xsr.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

conn_max_age = int(os.getenv("DB_CONN_MAX_AGE", "600"))
conn_health_checks = os.getenv("DB_CONN_HEALTH_CHECKS", "True").lower() in ("true", "1", "t")
ssl_require = "sslmode=require" in db_url

db_config = dj_database_url.parse(
	db_url,
	conn_max_age=conn_max_age,
	ssl_require=ssl_require,
)
db_config["CONN_HEALTH_CHECKS"] = conn_health_checks

db_host = db_config.get("HOST")
if db_host and not db_host.startswith("localhost") and db_host != "127.0.0.1":
	try:
		resolved_ip = socket.gethostbyname(db_host)
		db_config.setdefault("OPTIONS", {})["hostaddr"] = resolved_ip
	except Exception:
		pass

import sys
USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("true", "1", "t")

if 'test' in sys.argv or USE_SQLITE:
	DATABASES = {
		"default": {
			"ENGINE": "django.db.backends.sqlite3",
			"NAME": BASE_DIR / "db.sqlite3",
		}
	}
else:
	DATABASES = {
		"default": db_config
	}


AUTH_PASSWORD_VALIDATORS = [
	{
		"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
	},
	{
		"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
	},
	{
		"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
	},
	{
		"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
	},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR.parent / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework.authentication.TokenAuthentication",
	],
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.IsAuthenticated",
	],
	"DEFAULT_PAGINATION_CLASS": "apps.accounts.pagination.FlexiblePagination",
	"PAGE_SIZE": 50,
}
