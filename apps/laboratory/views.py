from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from apps.dbase.models import Patient, Patient_service, CustomUser, Dept_service, Test_results, Department, Tool_requests
from datetime import datetime, timedelta
from dateutil import relativedelta
from django.db.models import Q, Sum
from django.db.models.functions import Lower
from utils.functions import count_patients, get_all_patients, find_age, update_password, EA_TIMEZONE
from django.http import JsonResponse
from django.core.paginator import Paginator
import json
import pytz
from utils.custom_decorators import dept_required
from django.views.decorators.cache import never_cache




my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()


# count patients waiting for lab services
@never_cache
@login_required
@dept_required(('3'))
def count_patients_lab(request):
    if request.method == 'POST':
        response = count_patients(3)
    else:
        response = {'success': False}
    return JsonResponse(response)

# Render labolatory dashboard page
@never_cache
@login_required
@dept_required(('3'))
def dash_lab (request):
    get_patient_tests = Patient_service.objects.filter(service__isnull=False, service__dept_id=3)
    get_served_patients = Test_results.objects.filter(patient_test__service__dept_id=3)

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
    return render(request, 'labolatory/dashboard.html', dashboard_data)

# Render labolatory patients page
@never_cache
@login_required
@dept_required(('3'))
def lab_patients(request):
    waiting_count = Patient_service.objects.filter(
        comp_status='waiting',
        service__isnull=False,
        service__dept_id=3
    )
    unique_patient_ids = set()
    patients_list = []

    select_waiting_patients = waiting_count.order_by('service_date')

    for patient in select_waiting_patients:
        id_patient = int(patient.patient_id)
        if id_patient not in unique_patient_ids:
            unique_patient_ids.add(id_patient)
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
        'lab_wait_count': waiting_count.values('patient').distinct().count(),
        'patients_waiting': patients_list,
        'patients_all': all_patients
    }

    return render(request, 'labolatory/lab_patients.html', data)


# Render patient lab test results page
@never_cache
@login_required
@dept_required(('3'))
def lab_test_results (request, p):
    if Patient.objects.filter(fileNumber=p).exists():
        pat_get = Patient.objects.get(fileNumber=p)
        pending_tests = Patient_service.objects.filter(patient_id=pat_get.id, comp_status='waiting', service_id__isnull=False, service__dept_id=3)

        tests = []
        patient_details = Patient.objects.get(fileNumber=p)
        get_tests = pending_tests.order_by('service_date')
        
        info = {
            'id': patient_details.id,
            'fullname': patient_details.fullname,
            'gender': patient_details.gender,
            'age': find_age(patient_details.birthDate.strftime('%Y-%m-%d')),
            'contact': patient_details.contact,
            'address': patient_details.address,
        }

        for test in get_tests:
            tests.append({
                'id': test.id,
                'dtime': test.service_date.strftime('%d-%b-%Y %H:%M'),
                'name': test.service.name,
                'order_by': f"{test.registrar.full_name}({test.registrar.department.name})",
            })


        patient_history = Test_results.objects.filter(patient=patient_details.id, patient_test__service__dept_id=3).order_by('result_date')
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
            'pending_tests':tests,
            'pending_tests_count': pending_tests.count(),
            'pat_history': history_dates
        }
        return render(request, 'labolatory/lab_patients.html', data)
    return redirect(reverse('lab_patients'))


# Get patient labolatory history
@never_cache
@login_required
@dept_required(('3'))
def lab_patient_history(request):
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
            Q(patient_test__service__dept_id=3)).order_by('result_date')

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
                'test_name': res.patient_test.service.name,
                'micro': res.micro if res.micro else "-",
                'macro': res.macro if res.macro else "-",
                'report': res.report if res.report else "-",
                'cost': '{:,.2f}'.format(res.patient_test.costEach),
                'ordered_by': f"{res.patient_test.registrar.full_name} ({res.patient_test.registrar.department.name})",
                'rows': rows
            })
        
        response_data = {
            'success': True,
            'history': history_report
        }

        return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})

# Submit test results
@never_cache
@login_required
@dept_required(('3'))
def submit_testResults(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            test_num = data[0]
            micro = data[1] if not data[1] == "-" else None
            macro = data[2] if not data[2] == "-" else None
            report = data[3] if not data[3] == "-" else None
            row_inputs = data[4:]

            get_test = Patient_service.objects.get(id=test_num)
            
            test_result = Test_results(
                patient=get_test.patient,
                doctor=request.user,
                patient_test=get_test,
                micro=micro,
                macro=macro,
                report=report,
                rows=row_inputs,
            )
            test_result.save()
            get_test.comp_status = 'complete'
            get_test.save()
            last_visit = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
            Patient.objects.filter(id=get_test.patient_id).update(lastVisit=last_visit)
            
            response_data = {'success': True, 'sms': 'Test results saved successfully!'}
            return JsonResponse(response_data)
        except json.JSONDecodeError as expt_sms:
            response_data = {'success': False, 'sms': 'Failed to save test results!'}
            return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Render request for supplies page
@never_cache
@login_required
@dept_required(('3', '4', '5', '6'))
def request_supplies (request):
    supplies = []
    pending_requests = []
    processed_requests = []
    dept = request.user.department_id
    supplies_query = Dept_service.objects.filter(Q(dept=2) & Q(hidden=0) & Q(deleted=0) & Q(qty__gt=0) & Q(expiryDate__gt=today_date), Q(formulation='lab_use'))
    if supplies_query.exists():
        select_tools = supplies_query.annotate(lower_name=Lower('name')).order_by('lower_name')
        for tool in select_tools:
            supplies.append({
                'id': tool.id,
                'name': tool.name,
                'price': tool.price,
                'qty': tool.qty
            })
    
    # get pending requests
    select_pending_reqs = Tool_requests.objects.filter(status='pending', dept_id=dept)
    if select_pending_reqs.count() > 0:
        for req in select_pending_reqs:
            pending_requests.append({
                'req_date': req.request_date.strftime('%d-%b-%Y %H:%M:%S'),
                'name': req.tool.name,
                'qty': req.qty,
                'staff': req.person.full_name,
                'describe': "-" if req.describe is None else req.describe
            })

    # get processed requests
    select_processed_reqs = Tool_requests.objects.filter(status='complete', dept_id=dept)
    if select_processed_reqs.count() > 0:
        for req in select_processed_reqs:
            processed_requests.append({
                'req_date': req.request_date.strftime('%d-%b-%Y %H:%M:%S'),
                'serv_date': req.serve_date.strftime('%d-%b-%Y %H:%M:%S'),
                'name': req.tool.name,
                'qty': req.qty,
                'staff': req.person.full_name,
                'describe': "-" if req.describe is None else req.describe
            })


    # Paginate results
    paginator_processed = Paginator(processed_requests, 10)
    paginator_pending = Paginator(pending_requests, 10)

    page_processed = request.GET.get('pro', 1)
    page_pending = request.GET.get('pen', 1)

    processed_requests = paginator_processed.get_page(page_processed)
    pending_requests = paginator_pending.get_page(page_pending)


    context = {
        'supplies': supplies,
        'count_pend': select_pending_reqs.count() if select_pending_reqs.count() < 10 else f"{select_pending_reqs.count()}+",
        'pending_requests': pending_requests,
        'count_process': select_processed_reqs.count() if select_processed_reqs.count() < 10 else f"{select_processed_reqs.count()}+",
        'processed_requests': processed_requests
    }
    if dept == 3:
        return render(request, 'labolatory/requests.html', context)
    if dept == 4:
        return render(request, 'doctor/requests.html', context)
    if dept == 5:
        return render(request, 'ultra_sound/requests.html', context)
    return render(request, 'procedure/requests.html', context)


# Search for supplies
@never_cache
@login_required
@dept_required(('3', '4', '5', '6'))
def search_supplies (request):
    if request.method == 'POST':
        supplies = []
        query_string = request.POST.get('query')
        query_context = request.POST.get('context')
        query_set = Dept_service.objects.filter(
            dept=2, hidden=0, deleted=0, qty__gt=0, formulation='lab_use', expiryDate__gt=today_date
        ).filter(
            Q(name__icontains=query_string) | 
            Q(price__icontains=query_string) | 
            Q(describe__icontains=query_string)
        ).annotate(lower_name=Lower('name')).order_by('lower_name')[:20]
        for med in query_set:
            supplies.append({
                'id': med.id,
                'name': med.name,
                'price': med.price,
                'qty': med.qty
            })
        return JsonResponse({'results': supplies})
    return JsonResponse({'res': '404'})


# Search for supplies
@never_cache
@login_required
@dept_required(('3', '4', '5', '6'))
def submit_new_request (request):
    if request.method == 'POST':
        try:
            request_id = request.POST.get('id')
            request_qty = request.POST.get('qty')
            request_describe = request.POST.get('describe')
            tool = Dept_service.objects.get(id=request_id)
            new_request = Tool_requests(
                person = request.user,
                dept = request.user.department,
                tool = tool,
                qty = request_qty,
                describe = request_describe if len(request_describe) > 0 else None
            )
            new_request.save()
            return JsonResponse({'success': True, 'sms': 'Request sent successfully!'})
        except Exception as ex_sms:
            return JsonResponse({'success': False, 'sms': 'Failed to send request!'})
    return JsonResponse({'res': '404'})


# Render profile page
@never_cache
@login_required
@dept_required(('3'))
def lab_profile (request):
    return render(request, 'labolatory/profile.html')


# change user password
@never_cache
@login_required
@dept_required(('3'))
def lab_profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})


# Render alerts page
@never_cache
@login_required
@dept_required(('3'))
def lab_alerts (request):
    return render(request, 'labolatory/alerts.html')
