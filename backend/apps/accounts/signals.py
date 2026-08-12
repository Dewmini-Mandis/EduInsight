from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver
from .models import SystemAccessLog, User

def get_client_ip(request):
	if not request:
		return None
	x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
	if x_forwarded_for:
		ip = x_forwarded_for.split(',')[0]
	else:
		ip = request.META.get('REMOTE_ADDR')
	return ip

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
	ip = get_client_ip(request)
	SystemAccessLog.objects.create(
		user=user,
		action=f"User {user.email or user.username} logged in",
		ip_address=ip,
		status=SystemAccessLog.STATUS_SUCCESS
	)

@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
	ip = get_client_ip(request)
	username = credentials.get("username", credentials.get("email", "Unknown"))
	SystemAccessLog.objects.create(
		action=f"Failed login attempt for {username}",
		ip_address=ip,
		status=SystemAccessLog.STATUS_BLOCKED
	)
