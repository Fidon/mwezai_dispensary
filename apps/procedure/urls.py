from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dash_procedure, name='procedure_dash'),
    path('dashboard/', v.dash_procedure, name='procedure_dashb'),
    path('countpatients/', v.count_patients_procedure, name='count_patients_pro'),
    path('patients/', v.pro_patients, name='pro_patients'),
    path('patients/p/<slug:p>/', v.procedure_result, name='procedure_results'),
    path('patient/history/', v.pro_patient_history, name='pro_patient_history'),
    path('report/save/', v.save_procedure_report, name='save_report'),
    path('profile/', v.pro_profile, name='pro_profile'),
    path('profile/update', v.profile_update, name='profile_update'),
    path('alerts/', v.pro_alerts, name='pro_alerts'),
]
