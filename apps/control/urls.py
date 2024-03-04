from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dash_manage, name='ad_dash'),
    path('dashboard/', v.dash_manage, name='ad_dashb'),
    path('patients/logs/', v.patients_logs, name='patients_logs'),
    path('patients/logs/p/<int:p>/', v.patients_logs, name='patient_details'),
    path('users/', v.users_page, name='ad_users'),
    path('newuser/', v.add_user, name='ad_newuser'),
    path('doc/', v.serv_doctor, name='serv_doctor'),
    path('user/fr/<slug:fr>/us/<int:us>/', v.user_information, name='details_user'),
    path('lab/', v.serv_lab, name='serv_lab'),
    path('new-dept-item/', v.new_dept_item, name='new_dept_item'),
    path('ultrasound/', v.serv_ult_sound, name='serv_sound'),
    path('procedure/', v.serv_procedure, name='serv_procedure'),
    path('pharmacy/', v.serv_pharmacy, name='serv_pharmacy'),
    path('pharmacy/m/<int:m>/', v.medical_information, name='serv_med_info'),
    path('services/i/<int:i>/d/<int:d>/', v.dept_item_info, name='item_info'),
    path('services/update/', v.update_dept_service, name='service_update'),
    path('profile/', v.manage_profile, name='ad_profile'),
    path('profile/update/', v.manage_profile_update, name='ad_updatepass'),
    path('icd-codes/', v.ad_icd_codes, name='icd_codes_page'),
    path('icd-codes/updates', v.manage_icd10_updates, name='icd_updates'),
    path('retrieve_data/param/<slug:param>/', v.admin_get_data, name='admin_data'),
    path('alerts/', v.manage_alerts, name='ad_alerts'),

    # -------------------- REPORTS ------------------------
    path('reports/patients/', v.ad_patients_report, name='ad_patient_report'),
    path('reports/reception/', v.ad_reception_report, name='ad_reception_report'),
    path('reports/reception/u/<int:u>/c/<slug:c>/', v.ad_rec_info, name='rec_details'),
    path('reports/reception/pat/<int:pat>/act/<slug:act>/reg/<int:reg>/', v.ad_details_reception, name='rec_services'),
    path('reports/labolatory/', v.ad_lab_report, name='ad_lab_report'),
    path('reports/ultrasound/', v.ad_usound_report, name='ad_usound_report'),
    path('reports/procedures/', v.ad_procedures_report, name='ad_procedure_report'),
    path('reports/pharmacy/', v.ad_pharmacy_report, name='ad_pharmacy_report'),
    path('reports/doctors/', v.ad_doctors_report, name='ad_doctors_report'),
]
