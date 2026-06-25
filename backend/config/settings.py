from dotenv import load_dotenv
load_dotenv()

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-insecure-change-me"
DEBUG = True
ALLOWED_HOSTS = []

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
	"postgresql://neondb_owner:npg_NTFYE8qIifC0@ep-cool-shadow-aoob8xsr.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

db_config = dj_database_url.parse(
	db_url,
	conn_max_age=0,
	ssl_require=True,
)

# Force IPv4 resolve to bypass IPv6 handshake/routing issues on some local networks
try:
	host = db_config.get("HOST")
	if host and not host.startswith("/") and not host.replace(".", "").isdigit():
		ipv4_addresses = [
			info[4][0]
			for info in socket.getaddrinfo(host, 5432, socket.AF_INET)
		]
		if ipv4_addresses:
			db_config["HOST"] = ipv4_addresses[0]
			db_config["OPTIONS"] = db_config.get("OPTIONS") or {}
			# Omit channel_binding as it's not supported by Neon and causes connection failures
			db_config["OPTIONS"].pop("channel_binding", None)
			# Add endpoint ID to options for Neon routing when connecting via IP address directly
			endpoint_id = host.split(".")[0]
			if endpoint_id.endswith("-pooler"):
				endpoint_id = endpoint_id[:-7]
			db_config["OPTIONS"]["options"] = f"endpoint={endpoint_id}"
except Exception:
	pass

USE_SQLITE = os.getenv("USE_SQLITE", "True").lower() in ("true", "1", "t")

if USE_SQLITE:
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

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework.authentication.TokenAuthentication",
	],
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.IsAuthenticated",
	],
}
