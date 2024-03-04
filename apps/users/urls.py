from django.urls import path
from . import views


urlpatterns = [
    path('auth/', views.auth, name='loginPage'),
    path('auth/login-user', views.user_auth, name='us_auth'),
]
