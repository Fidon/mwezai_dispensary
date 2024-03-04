import pytz, json
from datetime import datetime, timedelta
from django.utils import timezone
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db.models import Q
from django.db.models.functions import Lower
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from apps.dbase.models import CustomUser, Department, Dept_service, Patient, Patient_credit, Patient_vitals, Patient_service
from apps.dbase.forms import PatientForm
from utils.custom_decorators import dept_required
from utils.functions import expiry_days, find_age, filenumber, update_password, services_search, EA_TIMEZONE


my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)
today_date = current_time.date()

pending_waiting = Patient_service.objects.filter(Q(comp_status='waiting') | Q(comp_status='paying')).values('patient_id').distinct().count()


# Render reception dashboard
@never_cache
@login_required
@dept_required(('1'))
def dashboard(request):
    # print(f"Timezone: {timezone.now()}")
    # print(f"Timezone: {current_time}")
    # print(f"Timezone+3hrs: {timezone.now()+timedelta(hours=3)}")
    patients_reg = Patient.objects.all()
    patients_serv = Patient_service.objects.all()
    waiting_patients = patients_serv.filter(comp_status='waiting')
    complete_patients = patients_serv.filter(comp_status='complete')
    pending_pays = patients_serv.filter(comp_status='paying')
    pending_amount, today_payment = 0.0, 0.0
    for pend in pending_pays:
        if pend.md_qty is not None and pend.md_formulation is not None:
            pending_amount += (int(pend.md_qty) * pend.costEach)
        else:
            pending_amount += pend.costEach

    # today
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999)
    today_reg = patients_reg.filter(regDate__range=(today_start, today_end)).count()
    today_serv = patients_serv.filter(service_date__range=(today_start, today_end), registrar__department_id=1).values('patient_id').distinct().count()

    today_complete = complete_patients.filter(service_date__range=(today_start, today_end))
    for comp in today_complete:
        if comp.md_qty is not None and comp.md_formulation is not None:
            today_payment += comp.md_qty * comp.costEach
        else:
            today_payment += comp.costEach
    
    context = {
        'inside_patients': pending_waiting,
        'waiting_patients': waiting_patients.values('patient_id').distinct().count(),
        'pending_pay': pending_amount,
        'patients_reg': patients_reg.count(),
        'served_patients': patients_serv.filter(comp_status='complete').values('patient_id').distinct().count(),
        'today_reg': today_reg,
        'today_serv': today_serv,
        'today_amount': today_payment
    }
    return render(request, 'reception/dashboard.html', context)


# Render patients page
@never_cache
@login_required
@dept_required(('1'))
def new_patient(request):
    dept = Department.objects.filter(id__range=(2, 6))
    context = {
        'title': 'Add new patient',
        'data': {'dept': dept},
        'inside_patients': pending_waiting
        }
    return render(request, 'reception/patients.html', context)


# register new patient
@never_cache
@login_required
@dept_required(('1'))
def reg_patient(request):
    if request.method == 'POST':
        form = PatientForm(request.POST)
        if form.is_valid():
            while True:
                file_number = filenumber()
                if file_number is not None:
                    break
            
            new_patient = form.save(commit=False)
            new_patient.fileNumber = file_number
            new_patient.registrar = request.user
            new_patient.save()

            check_vitals = request.POST.get('vitals') == 'true'
            if (check_vitals):
                vitals = Patient_vitals()
                vitals.patient = new_patient
                vitals.bloodPressure = request.POST.get('bloodPressure')
                vitals.temperature = request.POST.get('temperature')
                vitals.heartRate = request.POST.get('heartRate')
                vitals.weight = request.POST.get('weight')
                vitals.saturation = request.POST.get('saturation')
                vitals.registrar = request.user
                vitals.save()

            response = {
                'success': True,
                'sms': 'Patient registered successfully!',
                'num': file_number
                }
        else:
            response = {
                'success': False,
                'sms': 'Failed to register new patient!',
                'errors': form.errors
                }
        return JsonResponse(response)


# Render patient search page
@never_cache
@login_required
@dept_required(('1'))
def payments(request):
    patients_list = Patient.objects.filter(deleted=False).order_by('-lastVisit')

    paging_patients = request.GET.get('page', 1)
    search_string = request.GET.get('search', None)

    if search_string:
        qry = search_string.lower()
        patients_list = Patient.objects.filter(deleted=False).filter(Q(fileNumber__icontains=qry) | Q(fullname__icontains=qry) | Q(birthDate__icontains=qry) | Q(address__icontains=qry) | Q(contact__icontains=qry) | Q(comment__icontains=qry) | Q(religion__icontains=qry) | Q(marital__icontains=qry) | Q(occupation__icontains=qry)).order_by('-lastVisit')

    paginator_patients = Paginator(patients_list, 10)
    patients_list = paginator_patients.get_page(paging_patients)

    context = {
        'inside_patients': pending_waiting,
        'patients_list': patients_list
    }
    return render(request, 'reception/pay.html', context)



# Render patient payments page
@never_cache
@login_required
@dept_required(('1'))
def patient_payments(request, p):
    file_exist = Patient.objects.filter(fileNumber=p).exists()
    if file_exist:
        patient_details = Patient.objects.get(fileNumber=p)
        vitals_patient = Patient_vitals.objects.filter(patient=patient_details.id)
        try:
            credit = Patient_credit.objects.get(patient_id=patient_details.id)
            pat_total_credit = credit.amount
        except Exception as ex_sms:
            pat_total_credit = 0.0
        
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
            'names': patient_details.fullname,
            'gender': patient_details.gender,
            'birthdate': patient_details.birthDate.strftime('%d-%b-%Y'),
            'age': find_age(patient_details.birthDate.strftime('%Y-%m-%d')),
            'contact': patient_details.contact,
            'address': patient_details.address,
            'religion': "-" if not patient_details.religion else patient_details.religion,
            'marital': "-" if not patient_details.marital else patient_details.marital,
            'occupation': "-" if not patient_details.occupation else patient_details.occupation,
            'regdate': patient_details.regDate.strftime('%d-%b-%Y'),
            'comment': "-" if not patient_details.comment else patient_details.comment,
            'credit': pat_total_credit,
            'vital_data': vital_data
        }
        select_doctors = CustomUser.objects.filter(department=4, blocked=0, deleted=0).annotate(lower_name=Lower('full_name')).order_by('lower_name')
        doctor_price = Department.objects.get(id=4)
        doctors = []
        for doc in select_doctors:
            patients = Patient_service.objects.filter(doctor=doc.id, comp_status='waiting').count()
            ct = patients if patients > 9 else '0'+str(patients)
            doctors.append({
                'id':doc.id,
                'full_name':doc.full_name,
                'price':doctor_price.price,
                'count':ct
                })
        lab_tests = Dept_service.objects.filter(dept=3, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
        medicines = Dept_service.objects.filter(Q(dept=2) & Q(hidden=0) & Q(deleted=0) & Q(qty__gt=0) & Q(expiryDate__gt=today_date)).exclude(formulation='lab_use').annotate(lower_name=Lower('name')).order_by('lower_name')
        ultrasound = Dept_service.objects.filter(dept=5, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
        procedures = Dept_service.objects.filter(dept=6, hidden=0, deleted=0).annotate(lower_name=Lower('name')).order_by('lower_name')
        exist_pend = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='paying').exists()
        exist_wait = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='waiting').exists()
        unpaid_tests = []
        waiting_tests = []
        total_pending_cost = 0.0
        total_waiting_cost = 0.0
        pending = ""
        waiting = ""

        # Loop through pending/unpaid patient services
        if exist_pend:
            pend_tests = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='paying')
            for pend in pend_tests:
                if pend.doctor_service:
                    serv = CustomUser.objects.get(id=pend.doctor_id)
                    dept = Department.objects.get(id=4)
                    unpaid_tests.append({
                        'id': pend.id,
                        'type': 'doc',
                        'name': serv.full_name,
                        'price': dept.price
                    })
                    total_pending_cost += dept.price
                else:
                    serv = Dept_service.objects.get(id=pend.service_id)
                    if pend.md_qty:
                        unpaid_tests.append({
                            'id': pend.id,
                            'type': 'med',
                            'name': serv.name,
                            'price': (pend.costEach * pend.md_qty),
                            'qty': pend.md_qty,
                            'form': pend.md_formulation
                        })
                        total_pending_cost += (pend.costEach * pend.md_qty)
                    else:
                        dept = Department.objects.get(id=serv.dept_id)
                        unpaid_tests.append({
                            'id': pend.id,
                            'type': 'Lab' if serv.dept_id == 3 else dept.name[:5],
                            'dept': dept.name,
                            'name': serv.name,
                            'price': pend.costEach
                        })
                        total_pending_cost += pend.costEach
                pending += "_" + str(pend.id)
        
        # Loop through waiting/paid patient services
        if exist_wait:
            paid_tests = Patient_service.objects.filter(patient_id=patient_details.id, comp_status='waiting')
            for paid in paid_tests:
                if paid.doctor_service:
                    serv = CustomUser.objects.get(id=paid.doctor_id)
                    dept = Department.objects.get(id=4)
                    waiting_tests.append({
                        'id': paid.id,
                        'type': 'doc',
                        'name': serv.full_name,
                        'price': dept.price
                    })
                    total_waiting_cost += dept.price
                else:
                    serv = Dept_service.objects.get(id=paid.service_id)
                    if paid.md_qty:
                        waiting_tests.append({
                            'id': paid.id,
                            'type': 'med',
                            'name': serv.name,
                            'price': (paid.costEach * paid.md_qty),
                            'qty': paid.md_qty,
                            'form': paid.md_formulation
                        })
                        total_waiting_cost += (paid.costEach * paid.md_qty)
                    else:
                        dept = Department.objects.get(id=serv.dept_id)
                        waiting_tests.append({
                            'id': paid.id,
                            'type': 'Lab' if serv.dept_id == 3 else dept.name[:5],
                            'dept': dept.name,
                            'name': serv.name,
                            'price': paid.costEach
                        })
                        total_waiting_cost += paid.costEach
                waiting += "_" + str(paid.id)


        data = {
            'info': info,
            'doctors':doctors,
            'labtests':lab_tests,
            'medicines':medicines,
            'ultrasound':ultrasound,
            'procedures':procedures,
            'unpaidtests':unpaid_tests,
            'total':total_pending_cost,
            'pending': pending[1:],
            'wait_tests':waiting_tests,
            'total_w':total_waiting_cost,
            'waiting': waiting[1:]
            }
        
        return render(request, 'reception/pay.html', {'patient':p, 'data':data, 'inside_patients':pending_waiting, 'current_time': current_time.strftime('%d-%b-%Y %H:%M:%S')})
    return redirect("/reception/pay")


# retrieve medicine details
@never_cache
@login_required
# @dept_required(('1'))
def medic_details(request):
    if request.method == 'POST':
        med_id = request.POST.get('medicine')
        medicine = Dept_service.objects.get(id=med_id)
        med_info = {
            'id': medicine.id,
            'names': medicine.name,
            'price': medicine.price,
            'form': medicine.formulation,
            'qty': medicine.qty,
        }
        data = {'success': True,'med': med_info}
    else:
        data = {'success': False, 'med': "none"}
    return JsonResponse(data)


# save patient services and payments
@never_cache
@login_required
@dept_required(('1'))
def save_patient_services(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        patient_file = extract_patient_file(data)
        grand_total = calculate_grand_total(data)
        process_patient_data(data, request.user)
        fail_status, failed_list, failed_amount = process_pending_tests(data)
        update_patient_credit(get_patient(patient_file), grand_total)
        response = {
            'success': True,
            'sms': 'Operation completed!',
            'status': fail_status,
            'failed_list': failed_list,
            'amount': failed_amount
        }
        return JsonResponse(response)

def extract_patient_file(data):
    if len(data) > 1:
        return data[1].get('patient')
    id_test = data[0].get('pending')[0]
    test_pend = Patient_service.objects.get(id=id_test)
    test_patient = Patient.objects.get(id=test_pend.patient_id)
    return test_patient.fileNumber

def calculate_grand_total(data):
    grand_total = 0.0
    if len(data) > 1:
        for row_data in data[1:]:
            service_obj, cost_each, doctor_obj, md_qty = None, None, None, None
            if row_data['md_qty'] in ('0', 0) and row_data['doctor'] in ('0', 0):
                service_obj, cost_each = get_service_and_cost(row_data)
            elif row_data['service'] in ('0', 0) and row_data['md_qty'] in ('0', 0):
                doctor_obj, cost_each = get_doctor_and_cost(row_data, cost_each)
            elif int(row_data['md_qty']) >= 0:
                md_qty, md_form, md_dosage, cost_each = get_medication_data(row_data)
            grand_total += float(cost_each)
    
    for pen in data[0].get('pending', []):
        pen_test = Patient_service.objects.get(id=pen)
        if not pen_test.md_qty or pen_test.doctor_service:
            grand_total += pen_test.costEach
        else:
            pen_service = Dept_service.objects.get(id=pen_test.service_id)
            if pen_test.md_qty <= pen_service.qty:
                grand_total += (pen_test.costEach + pen_test.md_qty)

    return grand_total

def process_patient_data(data, user):
    if len(data) > 1:
        for row_data in data[1:]:
            patient_file = row_data['patient']
            patient = get_patient(patient_file)
            service_obj, cost_each = get_service_and_cost(row_data)
            doctor_obj, cost_each = get_doctor_and_cost(row_data, cost_each)
            md_qty, md_form, md_dosage, ex = get_medication_data(row_data)
            create_patient_service(patient, service_obj, cost_each, doctor_obj, md_qty, md_form, md_dosage, user)
            update_patient_last_visit(patient)

def process_pending_tests(data):
    pending_tests = data[0].get('pending', [])
    fail_status = False
    failed_list = []
    amount_remaining = 0.0
    for pen in pending_tests:
        pen_test = Patient_service.objects.get(id=pen)
        if pen_test.md_qty:
            exp_days = expiry_days(pen_test.service.expiryDate.strftime('%d-%b-%Y'))
            if (pen_test.service.qty >= pen_test.md_qty) and (exp_days > 0):
                new_qty = pen_test.service.qty - pen_test.md_qty
                Dept_service.objects.filter(id=pen_test.service_id).update(qty=new_qty)
                update_pending_test_status(pen)
            else:
                fail_status = True
                amount_remaining += (float(pen_test.md_qty) * float(pen_test.costEach))
                failed_list.append(int(pen))
        else:
            update_pending_test_status(pen)
    return fail_status, failed_list, amount_remaining

def get_patient(patient_file):
    return Patient.objects.get(fileNumber=patient_file)

def get_service_and_cost(row_data):
    service_id = row_data['service']
    if service_id in ('0', 0, None):
        return None, 0.0
    service_obj = Dept_service.objects.get(id=service_id)
    cost_each = service_obj.price
    return service_obj, cost_each

def get_doctor_and_cost(row_data, cost_each):
    doc_serv = row_data['doctor_service']
    doctor_id = row_data['doctor']
    if doc_serv in ('0', 0, None) or doctor_id in ('0', 0, None):
        return None, cost_each
    doctor_service = Department.objects.get(id=4)
    doctor_obj = CustomUser.objects.get(id=doctor_id)
    cost_each = doctor_service.price
    return doctor_obj, cost_each

def get_medication_data(row_data):
    md_qty = row_data.get('md_qty')
    md_form = row_data.get('md_form')
    md_dosage = row_data.get('md_dosage')
    price = None
    if md_qty in ('0', 0, None):
        md_qty = None
    if md_form in ('0', 0, None):
        md_form = None
    if md_dosage in ('0', 0, None):
        md_dosage = None
    if row_data.get('service') not in ('0', 0, None) and row_data.get('md_qty') not in ('0', 0, None):
        sss = Dept_service.objects.get(id=int(row_data.get('service')))
        price = (float(sss.price) * float(md_qty))
    return md_qty, md_form, md_dosage, price

def create_patient_service(patient, service_obj, cost_each, doctor_obj, md_qty, md_form, md_dosage, user):
    if md_qty in ('0', 0, None):
        patient_service = Patient_service(
            patient=patient,
            service=service_obj,
            costEach=float(cost_each),
            doctor_service=doctor_obj is not None,
            doctor=doctor_obj,
            md_qty=md_qty,
            md_formulation=md_form,
            md_dosage=md_dosage,
            pay_status="cash",
            comp_status="waiting",
            registrar=user
        )
        patient_service.save()
    else:
        med_update = Dept_service.objects.get(id=service_obj.id)
        if int(md_qty) <= med_update.qty:
            med_update.qty -= int(md_qty)
            med_update.save()
            patient_service = Patient_service(
                patient=patient,
                service=service_obj,
                costEach=float(cost_each),
                doctor_service=doctor_obj is not None,
                doctor=doctor_obj,
                md_qty=int(md_qty),
                md_formulation=md_form,
                md_dosage=md_dosage,
                pay_status="cash",
                comp_status="waiting",
                registrar=user
            )
            patient_service.save()

def update_patient_last_visit(patient):
    current_datetime = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
    Patient.objects.filter(id=patient.id).update(lastVisit=current_datetime)

def update_pending_test_status(pen):
    pen_test = Patient_service.objects.get(id=pen)
    pen_test.comp_status = 'waiting'
    pen_test.service_date = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
    pen_test.save()

def update_patient_credit(patient, grand_total):
    try:
        patient_credit = Patient_credit.objects.get(patient=patient)
        if patient_credit.amount <= grand_total:
            patient_credit.amount = 0.0
        else:
            patient_credit.amount -= grand_total
        patient_credit.save()
    except Exception as sms:
        pass


# delete/cancel patient's pending payments/services
@never_cache
@login_required
@dept_required(('1'))
def delete_pending(request):
    if request.method == 'POST':
        test_id = request.POST.get('test_update_id')
        act = request.POST.get('action')
        pat_id = request.POST.get('patient')
        patient = Patient.objects.get(fileNumber=pat_id)
        get_pen = Patient_service.objects.get(id=test_id)
        service_cost = (get_pen.costEach * get_pen.md_qty) if get_pen.md_qty else get_pen.costEach
        if act == "waiting":
            if get_pen.md_qty:
                service = Dept_service.objects.get(id=get_pen.service_id)
                service.qty += get_pen.md_qty
                service.save()
            try:
                credit = Patient_credit.objects.get(patient_id=patient.id)
                credit.amount = credit.amount + service_cost
                credit.save()
                get_pen.comp_status = "returned"
                get_pen.save()
            except Exception as ex_sms:
                pat_credit = Patient_credit(patient=patient, amount=service_cost)
                pat_credit.save()
                get_pen.comp_status = "returned"
                get_pen.save()
        else:
            get_pen.comp_status = "cancelled"
            get_pen.save()
    return JsonResponse({'success':True, 'sms':"Completed!"})


# Render page for patient details update
@never_cache
@login_required
@dept_required(('1'))
def patient_update(request, p):
    file_exist = Patient.objects.filter(fileNumber=p).exists()
    if file_exist:
        patient_details = Patient.objects.get(fileNumber=p)
        last_vital = Patient_vitals.objects.filter(patient=patient_details.id).order_by('-add_date').first()
        dept = Department.objects.filter(id__range=(2, 6))
        
        vital_data = {
            'bp': last_vital.bloodPressure if last_vital else '',
            'hr': last_vital.heartRate if last_vital else '',
            'sat': last_vital.saturation if last_vital else '',
            'weight': last_vital.weight if last_vital else '',
            'temp': last_vital.temperature if last_vital else '',
        }

        data = {
            'dept': dept,
            'id': patient_details.id,
            'names': patient_details.fullname,
            'gen': patient_details.gender,
            'bdate': patient_details.birthDate,
            'cont': patient_details.contact,
            'addr': patient_details.address,
            'rel': "" if not patient_details.religion else patient_details.religion,
            'mar': "" if not patient_details.marital else patient_details.marital,
            'occu': "" if not patient_details.occupation else patient_details.occupation,
            'ct': "" if not patient_details.comment else patient_details.comment,
            **vital_data
        }
        return render(request, 'reception/patients.html', {'title':'Update patient information', 'data':data, 'inside_patients':pending_waiting})
    return redirect("/reception/new-patient")


# Update patient's details
@never_cache
@login_required
@dept_required(('1'))
def patient_details_save(request):
    if request.method == 'POST':
        patient = request.POST.get('patiend_id')
        patient_exist = Patient.objects.filter(id=patient).exists()
        if patient_exist:
            fullname = request.POST.get('fullname')
            birthdate = request.POST.get('birthdate')
            gender = request.POST.get('gender')
            address = request.POST.get('address')
            contact = request.POST.get('contact')
            comment = request.POST.get('comment', None)
            religion = request.POST.get('religion', None)
            marital = request.POST.get('marital', None)
            occupation = request.POST.get('occupation', None)
            
            bloodPressure = request.POST.get('bloodPressure', None)
            temperature = request.POST.get('temperature', None)
            heartRate = request.POST.get('heartRate', None)
            weight = request.POST.get('weight', None)
            saturation = request.POST.get('saturation', None)

            info = Patient.objects.get(id=patient)
            if info.fullname != fullname:
                info.fullname = fullname
            if info.birthDate != birthdate:
                info.birthDate = birthdate
            if info.gender != gender:
                info.gender = gender
            if info.address != address:
                info.address = address
            if info.contact != contact:
                info.contact = contact
            if info.comment != comment:
                info.comment = comment if len(comment) > 0 else None
            if info.religion != religion:
                info.religion = religion
            if info.marital != marital:
                info.marital = marital
            if info.occupation != occupation:
                info.occupation = occupation if len(occupation) > 0 else None
            info.save()

            vitals_values = {
                'bloodPressure': bloodPressure,
                'temperature': temperature,
                'saturation': saturation,
                'heartRate': heartRate,
                'weight': weight,
            }

            if all(value is not None for value in vitals_values.values()):
                patient_vital = Patient_vitals(
                    bloodPressure = bloodPressure,
                    temperature = temperature,
                    saturation = saturation,
                    heartRate = heartRate,
                    weight = weight,
                    patient = info,
                    registrar = request.user
                )
                patient_vital.save()

            return_values = {
                'success':True,
                'sms':'Patient details updated successfully!',
                'num':info.fileNumber
                }
        else:
            return_values = {
                'success':False,
                'sms':'Invalid patient ID'
                }
        return JsonResponse(return_values)
    return JsonResponse({'success':False, 'sms':'Invalid GET request'})


# Render patients (pending & waiting) page
@never_cache
@login_required
@dept_required(('1'))
def rec_patients_inside(request):
    # Get all patients
    all_patients = Patient.objects.filter(deleted=False).order_by('-lastVisit')

    # Get counts for waiting and paying patients
    wait_count = Patient_service.objects.filter(comp_status='waiting').values('patient_id').distinct().count()
    pay_count = Patient_service.objects.filter(comp_status='paying').values('patient_id').distinct().count()

    # Get waiting patients
    waitlist = get_patient_list('waiting')

    # Get pending/paying patients
    pendlist = get_patient_list('paying')

    # Apply search filter if search_string is present
    search_string = request.GET.get('qry', None)
    tab_context = request.GET.get('div', None)

    if search_string:
        search_query = search_string.lower()
        if "pending" in tab_context:
            pendlist = filter_list_by_search(pendlist, search_query)
        if "waiting" in tab_context:
            waitlist = filter_list_by_search(waitlist, search_query)
        if "patients" in tab_context:
            all_patients = filter_patients_by_search(all_patients, search_query)

    # Paginate results
    paginator_patients = Paginator(all_patients, 10)
    paginator_waiting = Paginator(waitlist, 10)
    paginator_pending = Paginator(pendlist, 10)

    page_patients = request.GET.get('pt', 1)
    page_waiting = request.GET.get('pw', 1)
    page_pending = request.GET.get('pe', 1)

    all_patients = paginator_patients.get_page(page_patients)
    waitlist = paginator_waiting.get_page(page_waiting)
    pendlist = paginator_pending.get_page(page_pending)

    patients_data = {
        "patients": all_patients,
        "waiting": waitlist,
        "pending": pendlist,
        "pay_count": pay_count,
        "wait_count": wait_count,
        "inside_patients": pending_waiting,
    }
    return render(request, 'reception/inside_patients.html', patients_data)

def get_patient_list(comp_status):
    patient_list = []
    distinct_patient_ids = Patient_service.objects.filter(comp_status=comp_status).values('patient_id').distinct()
    for id_obj in distinct_patient_ids:
        one_patient = {}
        one_services = []
        patient_id = id_obj['patient_id']
        pat_name = Patient.objects.get(id=patient_id)
        one_patient['fnum'] = pat_name.fileNumber
        one_patient['name'] = pat_name.fullname
        patient_services = Patient_service.objects.filter(comp_status=comp_status, patient_id=patient_id)
        total_cost = 0.0
        for service in patient_services:
            if service.service_id is not None:
                pat_serv = Dept_service.objects.get(id=service.service_id)
                dept = Department.objects.get(id=pat_serv.dept_id)
                one_services.append(f"{dept.name[:3]}: {pat_serv.name}")
                if service.md_qty is not None:
                    total_cost += (service.costEach * float(service.md_qty))
                else:
                    total_cost += service.costEach
            elif service.doctor_id is not None:
                doctor = CustomUser.objects.get(id=service.doctor_id)
                total_cost += service.costEach
                one_services.append(f"Doc: {doctor.full_name}")
        one_patient['services'] = one_services
        one_patient['cost'] = total_cost
        patient_list.append(one_patient)
    return patient_list

def filter_list_by_search(patient_list, search_query):
    return [item for item in patient_list if search_query in str(item).lower()]

def filter_patients_by_search(all_patients, search_query):
    return all_patients.filter(
        Q(fileNumber__icontains=search_query) | Q(fullname__icontains=search_query) |
        Q(address__icontains=search_query) | Q(contact__icontains=search_query) |
        Q(comment__icontains=search_query) | Q(religion__icontains=search_query) |
        Q(marital__icontains=search_query) | Q(occupation__icontains=search_query)
    )

# Render profile page
@never_cache
@login_required
@dept_required(('1'))
def rec_profile(request):
    return render(request, 'reception/profile.html', {'inside_patients':pending_waiting})

# change user password
@never_cache
@login_required
@dept_required(('1'))
def profile_pass_update(request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})

# search services
@never_cache
@login_required
# @dept_required(('1'))
def search_services(request):
    if request.method == 'POST':
        query_context = request.POST.get('context')
        if "bill_dates_" in query_context:
            start_date = request.POST.get('start_date')
            end_date = request.POST.get('end_date')
            search = services_search(start_date, end_date, query_context)
        else:
            query_string = request.POST.get('query')
            search = services_search(request.user, query_string, query_context)
        return JsonResponse(search)
    return JsonResponse({'results': 'Invalid request!'})

# Render notifications/alerts page
@never_cache
@login_required
@dept_required(('1'))
def rec_alerts(request):
    return render(request, 'reception/alerts.html', {'inside_patients':pending_waiting})

# Render patients report page
@never_cache
@login_required
@dept_required(('1'))
def report_patients(request):
    return render(request, 'reception/report_patients.html', {'inside_patients':pending_waiting})

# Render payments report page
@never_cache
@login_required
@dept_required(('1'))
def report_payments(request):
    return render(request, 'reception/report_payments.html', {'inside_patients':pending_waiting})

