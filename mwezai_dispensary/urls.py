from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from .views import signout, add_icd_codes
from django.urls import path, include
from apps.users import views as u
from apps.reception import views as r
from apps.laboratory import views as l

urlpatterns = [
    path('admin/', admin.site.urls),
    path('signout/', signout, name='signout'),
    path('insert_icd10_codes/', add_icd_codes, name='icd10_insert'),
    path('profile/update-password/', r.profile_pass_update, name='change_password'),
    path('services/search/', r.search_services, name='search_service'),
    
    # users app urls
    path('', u.auth, name='authPage'),
    path('auth/', u.auth, name='loginPage'),
    path('auth/login-user', u.user_auth, name='us_auth'),

    path('reception/', include('apps.reception.urls')),
    path('pharmacy/', include('apps.pharmacy.urls')),
    path('doc/', include('apps.doctor.urls')),
    path('labolatory/', include('apps.laboratory.urls')),
    # ------------------------------------------------------------------------------------------------
    path('department/requests/', l.request_supplies, name='dept_requests'),
    path('department/requests/submit-new-request/', l.submit_new_request, name='submit_dept_request'),
    path('department/search/supplies-tools/', l.search_supplies, name='search_supplies'),
    # ------------------------------------------------------------------------------------------------
    path('procedure/', include('apps.procedure.urls')),
    path('ultrasound/', include('apps.ultra_sound.urls')),
    path('manage/', include('apps.control.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)