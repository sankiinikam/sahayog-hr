from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    # Authentication
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", views.TokenRefreshAPIView.as_view(), name="token_refresh"),
    path("me/", views.me, name="me"),

    # Password management
    path("change-password/", views.ChangePasswordView.as_view(), name="change_password"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # Sessions
    path("sessions/", views.MySessionsView.as_view(), name="my_sessions"),

    # Admin user management
    path("users/", views.UserListCreateView.as_view(), name="user_list_create"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user_detail"),
]

