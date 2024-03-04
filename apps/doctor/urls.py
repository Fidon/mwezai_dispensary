from django.urls import path
from . import views as v
from apps.reception import views as r


urlpatterns = [
    path('', v.dash_doc, name='doc_dash'),
    path('dashboard/', v.dash_doc, name='doc_dashb'),
    path('count-patients/', v.count_patients_doc, name='patientsDoctor'),
    path('patients/', v.patients_doc, name='patients_doc'),
    path('results/', v.doc_patient_results, name='doc_results'),
    path('test/result-report/', v.retrieve_test_report, name='test_results_report'),
    path('patients/p/<slug:p>/', v.patient_consult, name='patient_details'),
    path('diagnosis/save/', v.save_patient_diagnosis, name='diagnosis_results'),
    path('profile/', v.doc_profile, name='doc_profile'),
    path('profile/update', v.doc_profile_update, name='doc_profile_update'),
    path('alerts/', v.doc_alerts, name='doc_alerts'),
]
