from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from utils.custom_decorators import dept_required
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from django.core.paginator import Paginator
from utils.functions import count_patients, get_all_patients, find_age, update_password, expiry_days, EA_TIMEZONE
from apps.dbase.models import Patient, Patient_service, Dept_service, Test_results, Department, Tool_requests
from django.db.models import Q, Sum, F
from django.db.models.functions import Lower
import json, pytz
from datetime import datetime, timedelta
from dateutil import relativedelta




my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()


# count patients waiting for lab services
@never_cache
@login_required
@dept_required(('2', '1'))
def count_patients_pharmacy(request):
    if request.method == 'POST':
        depart_id = request.POST.get('depart_id')
        response = count_patients(2)
    else:
        response = {'success': False}
    return JsonResponse(response)



# Render pharmacy dashboard page
@never_cache
@login_required
@dept_required(('2', '1'))
def dash_pharmacy (request):
    def calculate_totals(queryset, date_range):
        served_patients = get_served_patients.filter(result_date__range=date_range).values('patient_id').distinct().count()
        total_cost = queryset.filter(service_date__range=date_range, comp_status='complete').annotate(total_cost=F('costEach') * F('md_qty')).aggregate(total=Sum('total_cost'))['total'] or 0
        return served_patients, total_cost

    # Patient Medications
    get_patient_meds = Patient_service.objects.filter(service__isnull=False, service__dept_id=2)
    get_served_patients = Test_results.objects.filter(patient_test__service__dept_id=2)
    grand_total = get_patient_meds.filter(comp_status='complete').annotate(total_cost=F('costEach') * F('md_qty')).aggregate(total=Sum('total_cost'))['total']

    # today
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999)
    today_served, today_total = calculate_totals(get_patient_meds, (today_start, today_end))

    # this week
    week_start = current_time - timedelta(days=current_time.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=6)
    week_served, week_total = calculate_totals(get_patient_meds, (week_start, week_end))

    # this month
    month_start = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = month_start + relativedelta.relativedelta(months=1) - timedelta(microseconds=1)
    month_served, month_total = calculate_totals(get_patient_meds, (month_start, month_end))

    # Inventory
    inventory = Dept_service.objects.filter(dept_id=2, deleted=0)
    inv_stock, inv_soldout, inv_expired, inv_nearexpiry, inv_hidden = 0, 0, 0, 0, 0

    for med in inventory:
        days_to_expiry = expiry_days(med.expiryDate.strftime('%d-%b-%Y'))
        if med.qty == 0:
            inv_soldout += 1
        elif days_to_expiry <= 1:
            inv_expired += 1
        elif med.hidden:
            inv_hidden += 1
        elif days_to_expiry <= 14:
            inv_nearexpiry += 1
        else:
            inv_stock += 1

    phar_account = True if request.user.department_id in ('2', 2) else False

    dashboard_data = {
        "phar_account": phar_account,
        "waiting_count": get_patient_meds.filter(comp_status='waiting').values('patient_id').distinct().count(),
        "served_patients": get_served_patients.values('patient_id').distinct().count(),
        "grand_cost_amount": grand_total if grand_total else 0,
        "today_served": today_served,
        "today_total": today_total,
        "week_served": week_served,
        "week_total": week_total,
        "month_served": month_served,
        "month_total": month_total,
        "inv_stock": inv_stock,
        "inv_hidden": inv_hidden,
        "inv_soldout": inv_soldout,
        "inv_expired": inv_expired,
        "inv_nearexpiry": inv_nearexpiry,
    }
    return render(request, 'pharmacy/dashboard.html', dashboard_data)

# Render pharmacy patients & medicine page
@never_cache
@login_required
@dept_required(('2', '1'))
def medicines (request):
    waiting_count = Patient_service.objects.filter(
        comp_status='waiting',
        service__isnull=False,
        service__dept_id=2
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

    phar_account = True if request.user.department_id in ('2', 2) else False

    data = {
        'phar_account': phar_account,
        'wait_count': waiting_count.values('patient').distinct().count(),
        'patients_waiting': patients_list,
        'patients_all': all_patients
    }

    return render(request, 'pharmacy/medicines.html', data)


# Render patient prescription details
@never_cache
@login_required
@dept_required(('2', '1'))
def patient_prescription (request, p):
    file_exist = Patient.objects.filter(fileNumber=p).exists()
    patGet = Patient.objects.get(fileNumber=p)
    pending_prescription = Patient_service.objects.filter(patient_id=patGet.id, comp_status='waiting', service__dept_id=2).count()
    if file_exist:
        patient_details = Patient.objects.get(fileNumber=p)

        pat_info = {
            'id': patient_details.id,
            'fullname': patient_details.fullname,
            'gender': patient_details.gender,
            'age': find_age(patient_details.birthDate.strftime('%Y-%m-%d')),
            'contact': patient_details.contact,
            'address': patient_details.address,
        }

        get_medicines = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='waiting', service_id__isnull=False, service__dept_id=2).order_by('service_date')
        medicine_list = []
        for medicine in get_medicines:
            medicine_list.append({
                'id': medicine.id,
                'name': medicine.service.name,
                'qty': medicine.md_qty,
                'form': medicine.md_formulation,
                'dosage': medicine.md_dosage,
                'med_id': medicine.service_id
            })
        
        patient_history = Test_results.objects.filter(patient=patient_details.id, patient_test__md_qty__isnull=False).order_by('result_date')
        history_dates = []
        for hist in patient_history:
            if hist.result_date.strftime('%d-%b-%Y') not in history_dates:
                history_dates.append(hist.result_date.strftime('%d-%b-%Y'))

        # Paginate patient history dates
        paginator_history = Paginator(history_dates, 10)
        page_history_dates = request.GET.get('page', 1)
        history_dates = paginator_history.get_page(page_history_dates)

        phar_account = True if request.user.department_id in ('2', 2) else False

        data = {
            'phar_account': phar_account,
            'id': p,
            'info': pat_info,
            'pending_precribe': pending_prescription,
            'medicines': medicine_list,
            'pat_history': history_dates
        }
        return render(request, 'pharmacy/medicines.html', data)
    return redirect(reverse('medicines'))


# Get patient pharmacy history
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_patient_history(request):
    if request.method == 'POST':
        patient = int(request.POST.get('patient'))
        result_date = str(request.POST.get('result_date'))
        result_date = datetime.strptime(result_date, "%d-%b-%Y")
        result_start = result_date.replace(hour=0, minute=0, second=0, microsecond=0)
        result_end = result_start + timedelta(days=1) - timedelta(microseconds=1)
        result_details = Test_results.objects.filter(
            Q(patient_id=patient),
            Q(result_date__gte=result_start),
            Q(result_date__lte=result_end),
            Q(patient_test__service__isnull=False),
            Q(patient_test__service__dept_id=2)).order_by('result_date')

        result_report = []
        grand_cost = 0.0
        for res in result_details:
            med_cost = (float(res.patient_test.md_qty) * res.patient_test.costEach)
            grand_cost += med_cost
            result_report.append({
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
        
        response_data = {
            'success': True,
            'med_list': result_report,
            'grand_cost': '{:,.2f}'.format(grand_cost)
        }

        return JsonResponse(response_data)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# submit served medicines
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_submit_meds (request):
    if request.method == 'POST':
        failed_med = []
        medicines_array = json.loads(request.body)
        for med in medicines_array:
            get_med = Patient_service.objects.get(id=med)
            exp_days = expiry_days(get_med.service.expiryDate.strftime('%d-%b-%Y'))
            if (get_med.service.qty >= get_med.md_qty) and (exp_days > 0):
                new_qty = get_med.service.qty - get_med.md_qty
                Dept_service.objects.filter(id=get_med.service_id).update(qty=new_qty)

                test_result = Test_results(
                    patient=get_med.patient,
                    doctor=request.user,
                    patient_test=get_med,
                    micro=None,
                    macro=None,
                    report=None,
                    rows=None,
                )
                test_result.save()
                get_med.comp_status = 'complete'
                get_med.save()
            else:
                problem = f"Expired days {abs(exp_days)} ago" if exp_days<=0 else f"Insufficient stock {get_med.service.qty}"
                failed_med.append({
                    'id': med,
                    'name': f"{get_med.service.name} x {get_med.md_qty}",
                    'problem': problem,
                })
        return JsonResponse({'success': True, 'failed': failed_med})
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Render supplies requests page
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_dept_requests (request):
    pending_reqs = Tool_requests.objects.filter(status='pending').order_by('request_date')
    processed_reqs = Tool_requests.objects.filter(status='complete').order_by('-serve_date')
    pending_list = []
    processed_list = []
    count_pending = pending_reqs.count()
    for req in pending_reqs:
        pending_list.append({
            'id': req.id,
            'dates': req.request_date.strftime('%d-%b-%Y'),
            'dept': req.dept.name,
            'names': req.tool.name,
            'qty': f"0{req.qty}" if req.qty < 10 else req.qty,
            'describe': "-" if req.describe is None else req.describe
        })

    for req in processed_reqs:
        processed_list.append({
            'id': req.id,
            'dates': "-" if req.serve_date is None else req.serve_date.strftime('%d-%b-%Y'),
            'dept': req.dept.name,
            'names': req.tool.name,
            'qty': f"0{req.qty}" if req.qty < 10 else req.qty,
            'describe': "-" if req.describe is None else req.describe
        })
    

    # Paginate processed list results
    paginator_processed = Paginator(processed_list, 10)
    page_processed = request.GET.get('page', 1)
    processed_list = paginator_processed.get_page(page_processed)

    phar_account = True if request.user.department_id in ('2', 2) else False

    data = {
        'phar_account': phar_account,
        'pend_list': pending_list,
        'comp_list': processed_list,
        'count_pend': count_pending
        }
    return render(request, 'pharmacy/supp_requests.html', data)


# submit served requests
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_process_requests (request):
    if request.method == 'POST':
        failed_reqs = []
        requests_array = json.loads(request.body)
        for req in requests_array:
            get_req = Tool_requests.objects.get(id=req)
            exp_days = expiry_days(get_req.tool.expiryDate.strftime('%d-%b-%Y'))
            if (get_req.tool.qty >= get_req.qty) and (exp_days > 0):
                new_qty = get_req.tool.qty - get_req.qty
                Dept_service.objects.filter(id=get_req.tool_id).update(qty=new_qty)
                get_req.status = 'complete'
                get_req.serve_date = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
                get_req.save()
            else:
                problem = f"Expired days {abs(exp_days)} ago" if exp_days<=0 else f"Insufficient stock {get_req.tool.qty}"
                failed_reqs.append({
                    'id': req,
                    'name': f"{get_req.tool.name} x {get_req.qty}",
                    'problem': problem,
                })
        return JsonResponse({'success': True, 'failed': failed_reqs})
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Render inventory page
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_inventory (request):
    select_medicines = Dept_service.objects.filter(dept=2, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
    medicines = []
    for med in select_medicines:
        expiry_date = med.expiryDate.strftime('%d-%b-%Y')
        medicines.append({
            'id': med.id,
            'addDate': med.addDate.strftime('%d-%b-%Y'),
            'lastAdd': med.lastEdited.strftime('%d-%b-%Y'),
            'expiryDate': expiry_date,
            'exp': expiry_days(expiry_date),
            'name': med.name,
            'price': med.price,
            'stock': med.qty,
            'form': med.formulation,
            'hidden': med.hidden
        })
    
    phar_account = True if request.user.department_id in ('2', 2) else False

    return render(request, 'pharmacy/inventory.html', {'medicines':medicines, 'phar_account': phar_account})


# Render medicine details page
@never_cache
@login_required
@dept_required(('2', '1'))
def medicine_details (request, m):
    med_exist = Dept_service.objects.filter(id=m, dept_id=2).exists()
    if med_exist:
        get_med = Dept_service.objects.get(id=m, dept_id=2)
        used_total = Patient_service.objects.filter(service=get_med.id).aggregate(total_stock=Sum('md_qty'))
        md_stock = get_med.qty - (used_total['total_stock'] or 0)
        medicine_info = {
            'id': get_med.id,
            'name': get_med.name,
            'price': get_med.price,
            'form': get_med.formulation,
            'stock': get_med.qty,
            'describe': "-" if get_med.describe is None else get_med.describe,
            'addDate': get_med.addDate.strftime('%d-%b-%Y'),
            'lastEdit': get_med.lastEdited.strftime('%d-%b-%Y'),
            'expiryDate': get_med.expiryDate.strftime('%d-%b-%Y'),
            'expdays': expiry_days(get_med.expiryDate.strftime('%d-%b-%Y')),
            'exp': get_med.expiryDate.strftime('%Y-%m-%d'),
            'hid_txt': "Unhide" if get_med.hidden else "Hide",
            'hid': "btn-success" if get_med.hidden else "btn-warning text-ttxt1"
        }

        phar_account = True if request.user.department_id in ('2', 2) else False

        return render(request, 'pharmacy/inventory.html', {'med':medicine_info, 'medicine_id':m, 'phar_account': phar_account})
    return redirect(reverse('phar_inventory'))


# add new medicine
@never_cache
@login_required
# @dept_required(('2', '1'))
def phar_new_medicine (request):
    if request.method == 'POST':
        try:
            name = request.POST.get('names')
            formula = request.POST.get('formula')
            price = request.POST.get('price')
            qty = request.POST.get('qty')
            expiry = request.POST.get('expiry')
            describe = request.POST.get('describe', None)
            department = Department.objects.get(id=2)

            new_medicine = Dept_service(
                name = name,
                price = price,
                formulation = formula,
                qty = qty,
                describe = describe,
                expiryDate = expiry,
                dept = department,
                registrar = request.user
            )

            new_medicine.save()
            response = {'success': True, 'sms': 'New medicine added!'}
        except Exception as exep_sms:
            print(str(exep_sms))
            response = {'success': False, 'sms': "Failed to add new medicine!"}

        return JsonResponse(response)
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# update medicine information
@never_cache
@login_required
# @dept_required(('2', '1'))
def phar_update_medicine (request):
    if request.method == 'POST':
        update_type = request.POST.get('update')
        med_id = int(request.POST.get('id'))
        if update_type == "update":
            med_exist = Dept_service.objects.filter(id=med_id, dept_id=2).exists()
            if med_exist:
                names = request.POST.get('names')
                formula = request.POST.get('formula')
                price = request.POST.get('price')
                qty = request.POST.get('qty')
                expiry = request.POST.get('expiry')
                describe = request.POST.get('describe')
                med = Dept_service.objects.get(id=med_id, dept_id=2)
                new_qty = med.qty + int(qty)

                if med.name != names:
                    med.name = names
                if med.price != price:
                    med.price = price
                if med.formulation != formula:
                    med.formulation = formula
                if describe not in (med.describe, "-"):
                    med.describe = describe
                if med.expiryDate != expiry:
                    med.expiryDate = expiry
                if med.registrar_id != request.user.id:
                    med.registrar = request.user
                med.qty = new_qty
                med.lastEdited = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
                try:
                    med.save()
                    response = {'success': True, 'sms': 'Medicine updated successfully!'}
                except Exception as exep_sms:
                    response = {'success': False, 'sms': "Failed to add new medicine!"}
                return JsonResponse(response)
            return JsonResponse({'success': False, 'sms': 'Invalid medicine id!'})
        
        if update_type == "delete":
            Dept_service.objects.filter(id=med_id).update(deleted=True)
            return JsonResponse({'success': True})
        
        md = Dept_service.objects.get(id=med_id)
        md.hidden = not md.hidden
        md.lastEdited = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
        md.save()
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False, 'sms': 'Invalid request method.'})


# Render profile page
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_profile (request):
    phar_account = True if request.user.department_id in ('2', 2) else False
    return render(request, 'pharmacy/profile.html', {'phar_account': phar_account})


# change user password
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})


# Render alerts page
@never_cache
@login_required
@dept_required(('2', '1'))
def phar_alerts (request):
    phar_account = True if request.user.department_id in ('2', 2) else False
    return render(request, 'pharmacy/alerts.html', {'phar_account': phar_account})
