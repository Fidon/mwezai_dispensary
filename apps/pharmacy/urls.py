from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dash_pharmacy, name='pharmacy_dash'),
    path('dashboard/', v.dash_pharmacy, name='pharmacy_dashb'),
    path('countpatients/', v.count_patients_pharmacy, name='patientsPharmacy'),
    path('patients/', v.medicines, name='medicines'),
    path('patients/p/<slug:p>/', v.patient_prescription, name='prescribe'),
    path('patient-history/', v.phar_patient_history, name='phar_history'),
    path('medicals/submit/', v.phar_submit_meds, name='phar_serveMed'),
    path('tools-requests/', v.phar_dept_requests, name='phar_requests'),
    path('requests/process/', v.phar_process_requests, name='phar_process_requests'),
    path('inventory/', v.phar_inventory, name='phar_inventory'),
    path('inventory/m/<int:m>/', v.medicine_details, name='med_info'),
    path('inventory/new-medicine/', v.phar_new_medicine, name='new_medicine'),
    path('inventory/med-info-update/', v.phar_update_medicine, name='update_medicine'),
    path('profile/', v.phar_profile, name='phar_profile'),
    path('profile/update-password/', v.phar_profile_update, name='profile_update'),
    path('alerts/', v.phar_alerts, name='phar_alerts'),
]
