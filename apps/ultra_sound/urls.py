from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dash_ultrasound, name='ultrasound_dash'),
    path('dashboard/', v.dash_ultrasound, name='ultrasound_dashb'),
    path('countpatients/', v.count_patients_usound, name='patientsUsound'),
    path('patients/', v.ultrasound_patients, name='usound_patients'),
    path('patients/p/<slug:p>/', v.usound_results, name='ultrasound_results'),
    path('patients/p/<slug:p>/', v.usound_results, name='ultrasound_results'),
    path('patient/history/', v.usound_patient_history, name='usound_patient_history'),
    path('profile/', v.ultra_profile, name='ultra_profile'),
    path('profile/update/', v.ultra_profile_update, name='updatepass_ultra'),
    path('alerts/', v.ultra_alerts, name='ultra_alerts'),
]
