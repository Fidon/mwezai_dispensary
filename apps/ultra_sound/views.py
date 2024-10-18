from django.shortcuts import render, redirect
from django.urls import reverse
from datetime import datetime, timedelta
from dateutil import relativedelta
from django.db.models import Q, Sum
from django.contrib.auth.decorators import login_required
from utils.custom_decorators import dept_required
from utils.functions import count_patients, get_all_patients, find_age, update_password, EA_TIMEZONE
from django.views.decorators.cache import never_cache
from django.core.paginator import Paginator
from django.http import JsonResponse
from apps.dbase.models import Patient, Patient_vitals, Patient_service, Test_results
import json, pytz


my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()

# count patients waiting for ultrasound
@never_cache
@login_required
@dept_required(('5'))
def count_patients_usound(request):
    if request.method == 'POST':
        response = count_patients(5)
    else:
        response = {'success': False}
    return JsonResponse(response)

# Render ultrasound dashboard page
@never_cache
@login_required
@dept_required(('5'))
def dash_ultrasound (request):
    get_patient_tests = Patient_service.objects.filter(service__isnull=False, service__dept_id=5)
    get_served_patients = Test_results.objects.filter(patient_test__service__dept_id=5)

    def get_date_range(start_date, end_date):
        served_patients = get_served_patients.filter(result_date__range=(start_date, end_date)).values('patient_id').distinct().count()
        total_cost = get_patient_tests.filter(service_date__range=(start_date, end_date), comp_status='complete').aggregate(total=Sum('costEach'))['total'] or 0.0
        return served_patients, total_cost

    # today
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999)
    today_served, today_total = get_date_range(today_start, today_end)

    # this week
    week_start = current_time - timedelta(days=current_time.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999)
    week_served, week_total = get_date_range(week_start, week_end)

    # this month
    month_start = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = month_start + relativedelta.relativedelta(months=1) - timedelta(microseconds=1)
    month_served, month_total = get_date_range(month_start, month_end)

    dashboard_data = {
        "waiting_count": get_patient_tests.filter(comp_status='waiting').values('patient_id').distinct().count(),
        "pending_tests": get_patient_tests.filter(comp_status='waiting').count(),
        "served_patients": get_served_patients.values('patient_id').distinct().count(),
        "grand_cost_amount": get_patient_tests.filter(comp_status='complete').aggregate(total=Sum('costEach'))['total'] or 0,
        "today_served": today_served,
        "today_total": today_total,
        "week_served": week_served,
        "week_total": week_total,
        "month_served": month_served,
        "month_total": month_total,
    }

    return render(request, 'ultra_sound/dashboard.html', dashboard_data)

# Render ultrasound patients page
@never_cache
@login_required
@dept_required(('5'))
def ultrasound_patients (request):
    waiting_count = Patient_service.objects.filter(
        comp_status='waiting',
        service__isnull=False,
        service__dept_id=5
    )
    patient_ids = set()
    patients_list = []

    select_waiting_patients = waiting_count.order_by('service_date')

    for patient in select_waiting_patients:
        id_patient = int(patient.patient_id)
        if id_patient not in patient_ids:
            patient_ids.add(id_patient)
            get_patient = Patient.objects.get(id=id_patient)
            patients_list.append({
                'fileNumber': get_patient.fileNumber,
                'fullname': get_patient.fullname,
                'gender': get_patient.gender,
                'age': find_age(get_patient.birthDate.strftime('%Y-%m-%d')),
                'contact': get_patient.contact,
            })

    all_patients = get_all_patients()

    search_string = request.GET.get('search', None)
    tab_context = request.GET.get('div', None)

    if search_string:
        search_query = search_string.lower()
        if "patients" in tab_context:
            all_patients = [item for item in all_patients if search_query in str(item).lower()]
        if "waiting" in tab_context:
            patients_list = [item for item in patients_list if search_query in str(item).lower()]

    # Paginate results
    paginator_patients = Paginator(all_patients, 10)
    paginator_waiting = Paginator(patients_list, 10)

    page_patients = request.GET.get('pt', 1)
    page_waiting = request.GET.get('pw', 1)

    all_patients = paginator_patients.get_page(page_patients)
    patients_list = paginator_waiting.get_page(page_waiting)

    data = {
        'wait_count': waiting_count.values('patient').distinct().count(),
        'patients_waiting': patients_list,
        'patients_all': all_patients
    }

    return render(request, 'ultra_sound/usound_patients.html', data)

# Render patient test results page
@never_cache
@login_required
@dept_required(('5'))
def usound_results (request, p):
    file_exist = Patient.objects.filter(fileNumber=p).exists()
    if file_exist:
        patient_details = Patient.objects.get(fileNumber=p)
        pending_usound_tests = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='waiting', service_id__isnull=False, service__dept_id=5)
        ultrasound_tests = []
        get_usound_tests = pending_usound_tests.order_by('service_date')
        vitals_patient = Patient_vitals.objects.filter(patient=patient_details.id)
        
        vital_data = []
        if vitals_patient.count() > 0:
            for v_data in vitals_patient.order_by('-add_date'):
                vital_data.append({
                    'bp': f"{v_data.bloodPressure} mmHg",
                    'hr': f"{v_data.heartRate} b/min",
                    'sat': f"{v_data.saturation}%",
                    'weight': f"{v_data.weight} kg",
                    'temp': f"{v_data.temperature} &deg;C",
                    'dates': v_data.add_date.strftime('%d-%b-%Y %H:%M')
                })

        info = {
            'id': patient_details.id,
            'fileNumber': p,
            'fullname': patient_details.fullname,
            'gender': patient_details.gender,
            'age': find_age(patient_details.birthDate.strftime('%Y-%m-%d')),
            'contact': patient_details.contact,
            'address': patient_details.address,
            'religion': patient_details.religion if patient_details.religion else "-",
            'marital': patient_details.marital if patient_details.marital else "-",
            'occupation': patient_details.occupation if patient_details.occupation else "-",
            'comment': patient_details.comment if patient_details.comment else "-",
            'report_by': request.user.full_name,
            'dtime': datetime.now().strftime("%d-%b-%Y %H:%M:%S"),
            'vital_data': vital_data
        }

        for test in get_usound_tests:
            ultrasound_tests.append({
                'id': test.id,
                'dtime': test.service_date.strftime('%d-%b-%Y %H:%M'),
                'name': test.service.name,
                'order_by': f"{test.registrar.full_name}({test.registrar.department.name})",
            })

        # patient's procedure history
        patient_history = Test_results.objects.filter(patient=patient_details.id, patient_test__service__dept_id=5).order_by('result_date')
        history_dates = []
        for hist in patient_history:
            if hist.result_date.strftime('%d-%b-%Y') not in history_dates:
                history_dates.append(hist.result_date.strftime('%d-%b-%Y'))

        # Paginate patient history dates
        paginator_history = Paginator(history_dates, 10)
        page_history_dates = request.GET.get('page', 1)
        history_dates = paginator_history.get_page(page_history_dates)

        data = {
            'patient': p,
            'info':info,
            'patient_tests': ultrasound_tests,
            'pending_count': pending_usound_tests.count(),
            'pat_history': history_dates
        }

        return render(request, 'ultra_sound/usound_patients.html', data)
    return redirect(reverse('usound_patients'))



# Get patient procedure history
@never_cache
@login_required
@dept_required(('5'))
def usound_patient_history(request):
    if request.method == 'POST':
        patient = int(request.POST.get('patient'))
        history_date = str(request.POST.get('result_date'))
        history_date = datetime.strptime(history_date, "%d-%b-%Y")
        history_start = history_date.replace(hour=0, minute=0, second=0, microsecond=0)
        history_end = history_start + timedelta(days=1) - timedelta(microseconds=1)
        history_details = Test_results.objects.filter(
            Q(patient_id=patient),
            Q(result_date__gte=history_start),
            Q(result_date__lte=history_end),
            Q(patient_test__service__isnull=False),
            Q(patient_test__service__dept_id=5)).order_by('result_date')

        history_report = []
        for res in history_details:
            orderdate = res.patient_test.service_date
            rows = []
            for row in res.rows:
                rows.append({
                    'name': row.get('itemName'),
                    'value': row.get('itemValue'),
                    'range': row.get('itemRange')
                })

            history_report.append({
                'id': res.id,
                'orderdate': orderdate.strftime('%d-%b-%Y %H:%M:%S'),
                'reportdate': res.result_date.strftime('%d-%b-%Y %H:%M:%S'),
                'reporter': res.doctor.full_name,
                'usound_name': res.patient_test.service.name,
                'report': res.report,
                'rows': rows,
                'cost': '{:,.2f}'.format(res.patient_test.costEach),
                'ordered_by': f"{res.patient_test.registrar.full_name} ({res.patient_test.registrar.department.name})"
            })
        
        response_data = {
            'success': True,
            'history': history_report
        }

        return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Submit ultrasound results
@never_cache
@login_required
@dept_required(('5'))
def submit_usoundResults(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            test_num = data[0]
            report = data[1] if not data[1] == "-" else None
            row_inputs = data[2:]

            get_test = Patient_service.objects.get(id=test_num)
            get_pat = get_test.patient
            
            test_result = Test_results(
                patient=get_pat,
                doctor=request.user,
                patient_test=get_test,
                micro=None,
                macro=None,
                report=report,
                rows=row_inputs,
            )
            test_result.save()
            get_test.comp_status = 'complete'
            get_test.save()
            last_visit = datetime.now().replace(tzinfo=pytz.UTC)
            Patient.objects.filter(id=get_test.patient_id).update(lastVisit=last_visit)

            response_data = {'success': True, 'sms': 'Ultrasound results saved successfully!'}
            return JsonResponse(response_data)
        except json.JSONDecodeError as expt_sms:
            response_data = {'success': False, 'sms': 'Failed to save ultrasound results!'}
            return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})

# Render profile page
@never_cache
@login_required
@dept_required(('5'))
def ultra_profile (request):
    return render(request, 'ultra_sound/profile.html')

# change user password
@never_cache
@login_required
@dept_required(('5'))
def ultra_profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})

# Render alerts page
@never_cache
@login_required
@dept_required(('5'))
def ultra_alerts (request):
    return render(request, 'ultra_sound/alerts.html')
