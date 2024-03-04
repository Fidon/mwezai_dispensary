from django.urls import path
from . import views as v


urlpatterns = [
    path('', v.dash_lab, name='labolatory_dash'),
    path('dashboard/', v.dash_lab, name='labolatory_dashb'),
    path('countpatients/', v.count_patients_lab, name='patientsLab'),
    path('patients/', v.lab_patients, name='lab_patients'),
    path('patients/p/<slug:p>/', v.lab_test_results, name='lab_test_results'),
    path('testresult/submit/', v.submit_testResults, name='submitTestresults'),
    path('patient/history/', v.lab_patient_history, name='lab_patient_history'),
    path('alerts/', v.lab_alerts, name='lab_alerts'),
    path('profile/', v.lab_profile, name='lab_profile'),
    path('profile/update/', v.lab_profile_update, name='lab_change_pass'),
    path('alerts/', v.lab_alerts, name='lab_alerts'),
    
    path('department/requests/', v.request_supplies, name='dept_requests'),
    path('department/requests/submit-new-request/', v.submit_new_request, name='submit_dept_request'),
    path('department/search/supplies-tools/', v.search_supplies, name='search_supplies'),
]
