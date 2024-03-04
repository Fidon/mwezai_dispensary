from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dashboard, name='dashboard'),
    path('dashboard/', v.dashboard, name='dash'),
    path('new-patient/', v.new_patient, name='new_patient'),
    path('patients/register-new', v.reg_patient, name='reg_patient'),
    path('pay/', v.payments, name='payments'),
    path('pay/p/<slug:p>/', v.patient_payments, name='patient_pay'),
    path('pay/load-medicine-info/', v.medic_details, name='medicine_info'),
    path('pay/submit-patient-payments/', v.save_patient_services, name='save_patient_services'),
    path('pay/remove-pending/', v.delete_pending, name='delete_pending'),
    path('patient/update/p/<slug:p>/', v.patient_update, name='update_patient'),
    path('patient/save-info/', v.patient_details_save, name='patient_info_save'),
    path('patients/', v.rec_patients_inside, name='patients_inside'),
    path('alerts/', v.rec_alerts, name='rec_alerts'),
    path('profile/', v.rec_profile, name='rec_profile'),
    path('report-patients/', v.report_patients, name='patientsReport'),
    path('report-payments/', v.report_payments, name='paymentsReport'),
    # ----------------------------------------------------------------------------------------------
    path('profile/update-password/', v.profile_pass_update, name='change_password'),
    path('services/search/', v.search_services, name='search_service'),
]
