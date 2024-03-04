from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from utils.custom_decorators import dept_required
from utils.functions import count_patients, get_all_patients, find_age, update_password, EA_TIMEZONE
from django.views.decorators.cache import never_cache
from django.core.paginator import Paginator
from django.http import JsonResponse
from datetime import datetime, timedelta
from dateutil import relativedelta
from django.db.models import Q, Sum
from django.db.models.functions import Lower
from apps.dbase.models import Department, Patient, Patient_vitals, Patient_service, Dept_service, CustomUser, Test_results
import json, pytz




my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()


# count patients waiting for ultrasound
@never_cache
@login_required
@dept_required(('6','4'))
def count_patients_procedure(request):
    if request.method == 'POST':
        # depart_id = request.POST.get('depart_id')
        response = count_patients(6, request.user.id)
    else:
        response = {'success': False}
    return JsonResponse(response)


# Render procedure dashboard page
@never_cache
@login_required
@dept_required(('6','4'))
def dash_procedure (request):
    def calculate_totals(queryset, date_range):
        served_patients = get_served_patients.filter(result_date__range=date_range).values('patient_id').distinct().count()
        total_cost = queryset.filter(service_date__range=date_range, comp_status='complete').aggregate(total=Sum('costEach'))['total'] or 0
        return served_patients, total_cost

    # Patient Tests
    get_patient_tests = Patient_service.objects.filter(service__isnull=False, service__dept_id=6)
    get_served_patients = Test_results.objects.filter(patient_test__service__dept_id=6)
    grand_total = get_patient_tests.filter(comp_status='complete').aggregate(total=Sum('costEach'))['total']

    # today
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999)
    today_served, today_total = calculate_totals(get_patient_tests, (today_start, today_end))

    # this week
    week_start = current_time - timedelta(days=current_time.weekday())
    week_end = week_start + timedelta(days=6)
    week_served, week_total = calculate_totals(get_patient_tests, (week_start, week_end))

    # this month
    month_start = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = month_start + relativedelta.relativedelta(months=1) - timedelta(microseconds=1)
    month_served, month_total = calculate_totals(get_patient_tests, (month_start, month_end))

    proced_account = True if request.user.department_id in ('6', 6) else False

    dashboard_data = {
        "proced_account": proced_account,
        "waiting_count": get_patient_tests.filter(comp_status='waiting').values('patient_id').distinct().count(),
        "pending_tests": get_patient_tests.filter(comp_status='waiting').count(),
        "served_patients": get_served_patients.values('patient_id').distinct().count(),
        "grand_cost_amount": grand_total if grand_total else 0,
        "today_served": today_served,
        "today_total": today_total,
        "week_served": week_served,
        "week_total": week_total,
        "month_served": month_served,
        "month_total": month_total,
    }

    return render(request, 'procedure/dashboard.html', dashboard_data)

# Render procedure patients page
@never_cache
@login_required
@dept_required(('6','4'))
def pro_patients (request):
    waiting_count = Patient_service.objects.filter(
        comp_status='waiting',
        service__isnull=False,
        service__dept_id=6
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

    proced_account = True if request.user.department_id in ('6', 6) else False

    data = {
        'proced_account': proced_account,
        'pro_wait_count': waiting_count.values('patient').distinct().count(),
        'patients_waiting': patients_list,
        'patients_all': all_patients
    }

    return render(request, 'procedure/pro_patients.html', data)

# Render patient procedure report
@never_cache
@login_required
@dept_required(('6','4'))
def procedure_result (request, p):
    if Patient.objects.filter(fileNumber=p).exists():
        patient_details = Patient.objects.get(fileNumber=p)
        pending_procedures = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='waiting', service_id__isnull=False, service__dept_id=6)
        patient_procedures = []
        get_procedures = pending_procedures.order_by('service_date')
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

        # patient personal details
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

        # patient's pending procedures
        for pro in get_procedures:
            patient_procedures.append({
                'id': pro.id,
                'dtime': pro.service_date.strftime('%d-%b-%Y %H:%M'),
                'name': pro.service.name,
                'describe': pro.service.describe,
                'order_by': f"{pro.registrar.full_name}({pro.registrar.department.name})"
            })

        # patient's procedure history
        patient_history = Test_results.objects.filter(patient=patient_details.id, patient_test__service__dept_id=6).order_by('result_date')
        history_dates = []
        for hist in patient_history:
            if hist.result_date.strftime('%d-%b-%Y') not in history_dates:
                history_dates.append(hist.result_date.strftime('%d-%b-%Y'))

        # Paginate patient history dates
        paginator_history = Paginator(history_dates, 10)
        page_history_dates = request.GET.get('page', 1)
        history_dates = paginator_history.get_page(page_history_dates)
        

        select_doctors = CustomUser.objects.filter(department=4, blocked=0, deleted=0).annotate(lower_name=Lower('full_name')).order_by('lower_name')
        doctor_price = Department.objects.get(id=4)
        doctors = [
            {
                'id': doc.id,
                'full_name': doc.full_name,
                'price': doctor_price.price,
                'count': str(patients).zfill(2) if (patients := Patient_service.objects.filter(doctor=doc.id, comp_status='waiting').count()) > 9 else f'0{patients}'
            }
            for doc in select_doctors
        ]

        lab_tests = Dept_service.objects.filter(dept=3, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
        medicines = Dept_service.objects.filter(Q(dept=2) & Q(hidden=0) & Q(deleted=0) & Q(qty__gt=0) & Q(expiryDate__gt=today_date)).exclude(formulation='lab_use').annotate(lower_name=Lower('name')).order_by('lower_name')
        ultrasound = Dept_service.objects.filter(dept=5, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
        procedures = Dept_service.objects.filter(dept=6, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')

        proced_account = True if request.user.department_id in ('6', 6) else False

        data = {
            'proced_account': proced_account,
            'doctors': doctors,
            'labtests': lab_tests,
            'medicines': medicines,
            'ultrasound': ultrasound,
            'procedures': procedures,
            'patient': p,
            'info': info,
            'patient_procedures': patient_procedures,
            'pending_pro_count': pending_procedures.count(),
            'pat_history': history_dates
        }

        return render(request, 'procedure/pro_patients.html', data)
    return redirect(reverse('pro_patients'))

# Get patient procedure history
@never_cache
@login_required
@dept_required(('6','4'))
def pro_patient_history(request):
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
            Q(patient_test__service__dept_id=6)).order_by('result_date')

        history_report = []
        for res in history_details:
            orderdate = res.patient_test.service_date
            plans = []
            if res.new_tests is not None:
                for plan in res.new_tests:
                    pln = Patient_service.objects.get(id=plan)
                    names = f"Doctor: {pln.doctor.full_name}" if pln.service is None else f"{pln.service.dept.name}: {pln.service.name}"
                    if pln.md_qty is not None:
                        names = f"{pln.service.dept.name}: {pln.service.name} x{pln.md_qty}"
                    plans.append({
                        'id': pln.id,
                        'name': names,
                        'status': pln.comp_status
                    })

            history_report.append({
                'id': res.id,
                'orderdate': orderdate.strftime('%d-%b-%Y %H:%M:%S'),
                'reportdate': res.result_date.strftime('%d-%b-%Y %H:%M:%S'),
                'reporter': res.doctor.full_name,
                'pro_name': res.patient_test.service.name,
                'describe': res.rows.get('describe'),
                'findings': res.rows.get('findings'),
                'done': res.rows.get('done'),
                'plans': plans,
                'cost': '{:,.2f}'.format(res.patient_test.costEach),
                'ordered_by': f"{res.patient_test.registrar.full_name} ({res.patient_test.registrar.department.name})"
            })
        
        response_data = {
            'success': True,
            'history': history_report
        }

        return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Save procedure report
@never_cache
@login_required
@dept_required(('6','4'))
def save_procedure_report(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        doctor = request.user
        id, rows, plans = data

        pat_procedure = Patient_service.objects.get(id=id)
        patient = Patient.objects.get(id=pat_procedure.patient_id)
        new_tests = []

        for plan in plans:
            service_id = None if plan['service'] == '0' else plan['service']
            service_obj = Dept_service.objects.get(id=service_id) if service_id else None
            cost_each = service_obj.price if service_obj else 0.0

            doc_serv = plan['doctor_service'] != '0'
            doctor_id = None if plan['doctor'] == '0' else plan['doctor']
            doctor_obj = CustomUser.objects.get(id=doctor_id) if doctor_id else None

            if doc_serv and doctor_id:
                doctor_service = Department.objects.get(id=4)
                cost_each = doctor_service.price

            md_qty = plan['md_qty'] if 'md_qty' in plan else None
            md_form = plan['md_form'] if 'md_form' in plan else None
            md_dosage = plan['md_dosage'] if 'md_dosage' in plan else None

            md_qty = None if md_qty in ('0', 0) else md_qty
            md_form = None if md_form in ('0', 0) else md_form
            md_dosage = None if md_dosage in ('0', 0) else md_dosage

            plan_model = Patient_service(
                patient=patient,
                service=service_obj,
                costEach=cost_each,
                doctor_service=doc_serv,
                doctor=doctor_obj,
                md_qty=md_qty,
                md_formulation=md_form,
                md_dosage=md_dosage,
                pay_status="cash",
                comp_status="paying",
                registrar=doctor
            )
            plan_model.save()
            new_tests.append(plan_model.pk)
        
        pro_report = Test_results(
            patient=patient,
            doctor=doctor,
            patient_test=pat_procedure,
            rows=rows,
            new_tests=new_tests if new_tests else None
        )
        pro_report.save()
        Patient_service.objects.filter(id=id).update(comp_status='complete')
        last_visit = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
        Patient.objects.filter(id=pat_procedure.patient_id).update(lastVisit=last_visit)
        
        response = {'success': True, 'sms': 'Report submitted successfully.'}
        return JsonResponse(response)



# Render profile page
@never_cache
@login_required
@dept_required(('6','4'))
def pro_profile (request):
    proced_account = True if request.user.department_id in ('6', 6) else False
    return render(request, 'procedure/profile.html', {"proced_account":proced_account})


# change user password
@never_cache
@login_required
@dept_required(('6','4'))
def profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})


# Render alerts page
@never_cache
@login_required
@dept_required(('6','4'))
def pro_alerts (request):
    proced_account = True if request.user.department_id in ('6', 6) else False
    return render(request, 'procedure/alerts.html', {"proced_account":proced_account})
