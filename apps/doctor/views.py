from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from utils.custom_decorators import dept_required
from utils.functions import count_patients, get_all_patients, find_age, update_password, EA_TIMEZONE
from django.core.paginator import Paginator
from django.http import JsonResponse
from apps.dbase.models import Patient, Patient_vitals, Patient_service, CustomUser, Department, Dept_service, Diagnosis, ICD10_codes, Test_results
from datetime import datetime, timedelta
from dateutil import relativedelta
from django.db.models import Q, Sum
from django.db.models.functions import Lower
import json, pytz



my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()




# count patients waiting for specific doctor
@never_cache
@login_required
@dept_required(('4'))
def count_patients_doc(request):
    if request.method == 'POST':
        depart_id = request.POST.get('depart_id')
        response = count_patients(4, request.user.id)
    else:
        response = {'success': False}
    return JsonResponse(response)

# Render dashboard page
@never_cache
@login_required
@dept_required(('4'))
def dash_doc (request):
    base_query = Patient_service.objects.filter(doctor_id=request.user.id)
    all_attended = base_query.filter(comp_status='complete')
    waiting_patients = base_query.filter(comp_status='waiting').values('patient_id').distinct().count()
    returning_patients = Patient_service.objects.filter(Q(comp_status='waiting') | Q(comp_status='paying')).filter(registrar_id=request.user.id)
    unread_results = Test_results.objects.filter(status='pending', patient_test__registrar_id=request.user.id).exclude(patient_test__service__dept_id=2)
    revenue_query = Patient_service.objects.filter(doctor_service=1, comp_status='complete')
    total_revenue = revenue_query.aggregate(total=Sum('costEach'))['total']

    # today
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999)
    today_attended = all_attended.filter(service_date__range=(today_start, today_end))
    today_returning = returning_patients.filter(service_date__range=(today_start, today_end))
    today_results = unread_results.filter(result_date__range=(today_start, today_end))
    today_revenue = revenue_query.filter(service_date__range=(today_start, today_end)).aggregate(total=Sum('costEach'))

    # this week
    week_start = current_time - timedelta(days=current_time.weekday())
    week_end = week_start + timedelta(days=6)
    week_attended = all_attended.filter(service_date__range=(week_start, week_end))
    week_returning = returning_patients.filter(service_date__range=(week_start, week_end))
    week_results = unread_results.filter(result_date__range=(week_start, week_end))
    week_revenue = revenue_query.filter(service_date__range=(week_start, week_end)).aggregate(total=Sum('costEach'))

    # this month
    month_start = current_time.replace(day=1)
    month_start = month_start.replace(hour=0, minute=0, second=0, microsecond=0)
    month_end = month_start + relativedelta.relativedelta(months=1)
    month_end = month_end.replace(day=1)
    month_end = month_end.replace(hour=23, minute=59, second=59, microsecond=999)
    month_attended = all_attended.filter(service_date__range=(month_start, month_end))
    month_returning = returning_patients.filter(service_date__range=(month_start, month_end))
    month_results = unread_results.filter(result_date__range=(month_start, month_end))
    month_revenue = revenue_query.filter(service_date__range=(month_start, month_end)).aggregate(total=Sum('costEach'))

    context = {
        'all_attended': all_attended.values('patient_id').distinct().count(),
        'waiting_patients': waiting_patients,
        'returning_patients': returning_patients.values('patient_id').distinct().count(),
        'unread_results': unread_results.count(),
        'total_revenue': total_revenue if total_revenue else 0,
        'today_attended': today_attended.values('patient_id').distinct().count(),
        'today_returning': today_returning.values('patient_id').distinct().count(),
        'today_results': today_results.count(),
        'today_revenue': today_revenue['total'] if today_revenue['total'] else 0,
        'week_attended': week_attended.values('patient_id').distinct().count(),
        'week_returning': week_returning.values('patient_id').distinct().count(),
        'week_results': week_results.count(),
        'week_revenue': week_revenue['total'] if week_revenue['total'] else 0,
        'month_attended': month_attended.values('patient_id').distinct().count(),
        'month_returning': month_returning.values('patient_id').distinct().count(),
        'month_results': month_results.count(),
        'month_revenue': month_revenue['total'] if month_revenue['total'] else 0,
    }
    return render(request, 'doctor/dashboard.html', context)

# Render patients list page
@never_cache
@login_required
@dept_required(('4'))
def patients_doc (request):
    waiting_count = Patient_service.objects.filter(
        comp_status='waiting',
        service__isnull=True,
        doctor_id=request.user.id
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
        'doc_wait_count': waiting_count.values('patient').distinct().count(),
        'patients_waiting': patients_list,
        'patients_all': all_patients
    }

    return render(request, 'doctor/patients.html', data)

# Render patient infromation page
@never_cache
@login_required
@dept_required(('4'))
def patient_consult (request, p):
    if Patient.objects.filter(fileNumber=p).exists():
        patient_details = Patient.objects.get(fileNumber=p)
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
            'birthdate': patient_details.birthDate,
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

        select_doctors = CustomUser.objects.filter(department=4, blocked=0, deleted=0).exclude(id=request.user.id).annotate(lower_name=Lower('full_name')).order_by('lower_name')
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

        icd_codes = ICD10_codes.objects.filter(deleted=False).order_by('code')[:30]

        get_pending_results = Test_results.objects.filter(patient=patient_details, status='pending').exclude(patient_test__service__dept_id=2).order_by('-result_date')
        get_seen_results = Test_results.objects.filter(patient=patient_details, status='seen').exclude(patient_test__service__dept_id=2).order_by('-result_date')
        get_pharmacy_history = Test_results.objects.filter(patient_id=patient_details, patient_test__service__isnull=False, patient_test__service__dept_id=2).order_by('-result_date')
        get_patient_history = Diagnosis.objects.filter(patient=patient_details).order_by('-diagnosis_date')

        diagnosis_dates = []
        for q in get_patient_history:
            date_str = q.diagnosis_date.strftime('%d-%b-%Y')
            if date_str not in diagnosis_dates:
                diagnosis_dates.append(date_str)

        results_pending = []
        for res in get_pending_results:
            results_pending.append({
                'id': res.id,
                'dept': res.patient_test.service.dept.name,
                'test': res.patient_test.service.name,
                'dates': res.result_date.strftime('%d-%b-%Y')
            })

        results_seen = []
        for res in get_seen_results:
            results_seen.append({
                'id': res.id,
                'dept': res.patient_test.service.dept.name,
                'test': res.patient_test.service.name,
                'dates': res.result_date.strftime('%d-%b-%Y')
            })

        pharmacy_results = []
        for res in get_pharmacy_history:
            med_cost = (float(res.patient_test.md_qty) * res.patient_test.costEach)
            pharmacy_results.append({
                'id': res.id,
                'dates': res.result_date.strftime('%d-%b-%Y %H:%M:%S'),
                'med_server': res.doctor.full_name,
                'med_name': res.patient_test.service.name,
                'med_qty': res.patient_test.md_qty,
                'med_formulation': res.patient_test.md_formulation,
                'med_dosage': res.patient_test.md_dosage,
                'med_price': '{:,.2f}'.format(res.patient_test.costEach),
                'med_cost': '{:,.2f}'.format(med_cost),
                'prescribed_by': f"{res.patient_test.registrar.full_name} ({res.patient_test.registrar.department.name})",
                'medicine': res.patient_test.service_id
            })



        # Paginate results & history dates
        paginator_diag_dates = Paginator(diagnosis_dates, 10)
        page_diag_dates = request.GET.get('ph', 1)
        diagnosis_dates = paginator_diag_dates.get_page(page_diag_dates)

        paginator_pending_results = Paginator(results_pending, 10)
        page_pending = request.GET.get('pd', 1)
        results_pending = paginator_pending_results.get_page(page_pending)

        paginator_seen_results = Paginator(results_seen, 10)
        page_seen = request.GET.get('ps', 1)
        results_seen = paginator_seen_results.get_page(page_seen)

        paginator_pharmacy = Paginator(pharmacy_results, 10)
        page_pharmacy = request.GET.get('pc', 1)
        pharmacy_results = paginator_pharmacy.get_page(page_pharmacy)

        data = {
            'patient': p,
            'info': info,
            'doctors': doctors,
            'labtests': lab_tests,
            'medicines': medicines,
            'ultrasound': ultrasound,
            'procedures': procedures,
            'icd_codes': icd_codes,
            'pending_results': results_pending,
            'seen_results': results_seen,
            'pharmacy_results': pharmacy_results,
            'history': diagnosis_dates,
            'patient_page': True
        }

        return render(request, 'doctor/patients.html', data)
    return redirect(reverse('patients_doc'))

# submit patient diagnosis results
@never_cache
@login_required
@dept_required(('4'))
def save_patient_diagnosis(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        doctor = request.user
        patient_id, pat_chief, pat_asses, rev_systems, pat_history, fam_history, physical_exam, icd_codes, *doctor_plans = data

        patient = get_object_or_404(Patient, id=patient_id)
        tests = []

        for plan in doctor_plans:
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
            tests.append(plan_model.pk)
        
        diagnosis = Diagnosis(
            patient=patient,
            doctor=doctor,
            d_chief=pat_chief,
            d_assess=pat_asses,
            rev_systems=rev_systems,
            pat_history=pat_history,
            fam_history=fam_history,
            physical_exam=physical_exam,
            icd_codes=icd_codes if icd_codes else None,
            tests=tests if tests else None
        )
        diagnosis.save()
        try:
            Patient_service.objects.filter(patient_id=patient_id, doctor_id=doctor.id).update(comp_status='complete')
            last_visit = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
            Patient.objects.filter(id=patient_id).update(lastVisit=last_visit)
        except Exception as e:
            print(f"An error occurred: {e}")
        
        response = {'success': True, 'sms': 'Data submitted successfully.'}
        return JsonResponse(response)

# Render patients' results list page
@never_cache
@login_required
@dept_required(('4'))
def doc_patient_results (request):
    query = Patient_service.objects.filter(registrar=request.user, comp_status='complete').exclude(service__dept_id=2)
    query_patients = Test_results.objects.filter(patient_test__in=query, status='pending').order_by('-result_date')

    search_string = request.GET.get('search', None)
    page_results = request.GET.get('page', 1)
    
    if search_string:
        qry = search_string.lower()
        query_patients = Test_results.objects.filter(patient_test__in=query, status='pending').filter(Q(patient__fileNumber__icontains=qry) | Q(patient__fullname__icontains=qry) | Q(patient__address__icontains=qry) | Q(patient__contact__icontains=qry) | Q(patient__comment__icontains=qry) | Q(patient__religion__icontains=qry) | Q(patient__marital__icontains=qry) | Q(patient__occupation__icontains=qry)).order_by('-result_date')

    patient_ids, patients_results_list = [], []

    for result in query_patients:
        if result.patient_id not in patient_ids:
            patient_ids.append(result.patient_id)
            patients_results_list.append({
                'fileNumber': result.patient.fileNumber,
                'fullname': result.patient.fullname,
                'gender': result.patient.gender,
                'age': find_age(result.patient.birthDate.strftime('%Y-%m-%d')),
                'contact': result.patient.contact,
                'deptname': result.patient_test.service.dept.name,
                'testname': result.patient_test.service.name
            })
    
    paginator_results = Paginator(patients_results_list, 10)
    patient_results = paginator_results.get_page(page_results)

    response = {
        'results_page': True,
        'patient_results': patient_results,
        'style_link':'results'
    }

    return render(request, 'doctor/patients.html', response)

# Retrieve test report
@never_cache
@login_required
@dept_required(('4'))
def retrieve_test_report(request):
    if request.method == 'POST' and request.POST.get('path') == "results":
        report_id = int(request.POST.get('test_result'))
        rep = Test_results.objects.get(id=report_id)
        new_plans = []
        if rep.new_tests is not None:
            for test in rep.new_tests:
                serv = Patient_service.objects.get(id=test)
                names = f"Doctor: {serv.doctor.full_name}" if serv.service is None else f"{serv.service.dept.name}: {serv.service.name}"
                new_plans.append({
                    'id': test,
                    'name': names,
                    'status': serv.comp_status
                })
        report_obj = {
            'id': rep.id,
            'orderdate': rep.patient_test.service_date.strftime('%d-%b-%Y %H:%M:%S'),
            'reportdate': rep.result_date.strftime('%d-%b-%Y %H:%M:%S'),
            'micro': rep.micro if rep.micro else "-",
            'macro': rep.macro if rep.macro else "-",
            'report': rep.report if rep.report else "-",
            'reporter': f"{rep.doctor.full_name}({rep.doctor.department.name})",
            'dept': rep.patient_test.service.dept_id,
            'rows': rep.rows,
            'plans': new_plans if rep.new_tests else "-",
            'qty':  rep.patient_test.md_qty if rep.patient_test.service.dept_id == 2 else "-",
            'form':  rep.patient_test.md_formulation if rep.patient_test.service.dept_id == 2 else "-",
            'dosage':  rep.patient_test.md_dosage if rep.patient_test.service.dept_id == 2 else "-"
        }
        response = {'success': True, 'report_obj':report_obj}
        if not rep.status == "seen":
            rep.status = "seen"
            rep.seen_date = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
            rep.save()
    elif request.method == 'POST' and request.POST.get('path') == "history":
        patient = Patient.objects.get(fileNumber=request.POST.get('patient'))
        diagnosis_date = str(request.POST.get('diagnosis_date'))
        diagnosis_date = datetime.strptime(diagnosis_date, "%d-%b-%Y")
        diag_start = diagnosis_date.replace(hour=0, minute=0, second=0, microsecond=0)
        diag_end = diag_start + timedelta(days=1) - timedelta(microseconds=1)
        diag_details = Diagnosis.objects.filter(
            Q(patient=patient), Q(diagnosis_date__gte=diag_start), Q(diagnosis_date__lte=diag_end)
        ).order_by('-diagnosis_date')

        diag_plans = {}
        icd_diseases = {}
        diagnosis_reports = []

        for diag in diag_details:
            if diag.tests:
                for test in diag.tests:
                    serv = Patient_service.objects.get(id=test)
                    names = f"Doctor: {serv.doctor.full_name}" if serv.service is None else f"{serv.service.dept.name}: {serv.service.name}"
                    diag_plans[test] = {
                        'id': test,
                        'name': names,
                        'status': serv.comp_status
                    }

            if diag.icd_codes:
                for icd in diag.icd_codes:
                    icd_code = ICD10_codes.objects.get(code=icd)
                    icd_diseases[icd] = {
                        'code': icd_code.code,
                        'describe': icd_code.describe
                    }

            diagnosis_reports.append({
                'id': diag.id,
                'dates': diag.diagnosis_date.strftime('%d-%b-%Y %H:%M:%S'),
                'doctor': diag.doctor.full_name,
                'chief': diag.d_chief,
                'assess': diag.d_assess,
                'sys': diag.rev_systems,
                'hist': diag.pat_history,
                'fam': diag.fam_history,
                'phy': diag.physical_exam,
                'plans': [diag_plans.get(test, '-') for test in diag.tests] if diag.tests else [],
                'disease': [icd_diseases.get(icd, '-') for icd in diag.icd_codes] if diag.icd_codes else []
            })
        response = {'success': True, 'reports':diagnosis_reports}
    else:
        response = {'st': False, 'cd': '404'}
    return JsonResponse(response)

# Render profile page
@never_cache
@login_required
@dept_required(('4'))
def doc_profile (request):
    return render(request, 'doctor/profile.html')

# change user password
@never_cache
@login_required
@dept_required(('4'))
def doc_profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})

# Render alerts page
@never_cache
@login_required
@dept_required(('4'))
def doc_alerts (request):
    return render(request, 'doctor/alerts.html')


