from datetime import datetime, date, timedelta
import pytz, random, string
from apps.dbase.models import *
from django.contrib.auth import authenticate, login
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
# from django.utils import timezone



def EA_TIMEZONE():
    return pytz.timezone('Etc/GMT-3')


my_timezone = EA_TIMEZONE()
current_date = date.today()
current_datetime = datetime.combine(current_date, datetime.min.time())
current_datetime = my_timezone.localize(current_datetime)
expiryDays = (current_datetime + timedelta(days=1)).date()

current_time = datetime.now(my_timezone)
today_date = current_time.date()


def change_db_dates():
    new_timezone = EA_TIMEZONE()
    
    print("Updating users model")
    for user in CustomUser.objects.all():
        if user.date_joined is not None:
            user.date_joined += timedelta(hours=3)
            user.save()

    print("Updating department services model")
    for service in Dept_service.objects.all():
        if service.addDate is not None:
            service.addDate += timedelta(hours=3)
        if service.lastEdited is not None:
            service.lastEdited += timedelta(hours=3)
        service.save()
    
    print("Updating diagnosis model")
    for diag in Diagnosis.objects.all():
        if diag.diagnosis_date is not None:
            diag.diagnosis_date += timedelta(hours=3)
            diag.save()

    print("Updating patients model")
    for patient in Patient.objects.all():
        if patient.regDate is not None:
            patient.regDate += timedelta(hours=3)
        if patient.lastVisit is not None:
            patient.lastVisit += timedelta(hours=3)
        patient.save()
    
    print("Updating patient_credit model")
    for credit in Patient_credit.objects.all():
        if credit.credit_date is not None:
            credit.credit_date += timedelta(hours=3)
            credit.save()
    
    print("Updating patient_service model")
    for serv in Patient_service.objects.all():
        if serv.service_date is not None:
            serv.service_date += timedelta(hours=3)
            serv.save()
    
    print("Updating patient_vitals model")
    for vital in Patient_vitals.objects.all():
        if vital.add_date is not None:
            vital.add_date += timedelta(hours=3)
            vital.save()

    print("Updating Test_results model")
    for test in Test_results.objects.all():
        if test.result_date is not None:
            test.result_date += timedelta(hours=3)
        if test.seen_date is not None:
            test.seen_date += timedelta(hours=3)
        test.save()

    print("Updating Tools_request model")
    for tool in Tool_requests.objects.all():
        if tool.serve_date is not None:
            tool.serve_date += timedelta(hours=3)
        if tool.request_date is not None:
            tool.request_date += timedelta(hours=3)
        tool.save()
    
    print("All tables updated successfully!")


# calculate the age based on birthdate
def find_age(bdate, str=None):
    timezone_eat = EA_TIMEZONE()
    birthdate = timezone_eat.localize(datetime.strptime(bdate, "%Y-%m-%d"))
    current_date = datetime.now(timezone_eat)
    delta = current_date - birthdate
    years = delta.days // 365
    months = (delta.days % 365) // 30

    if str is not None:
        years = f"0{years}" if years < 10 else years
        months = f"0{months}" if months < 10 else months
        return f"{years}.{months}"

    if years == 0 and months == 0:
        days = (delta.days % 365) % 30
        weeks = days // 7
        remaining_days = days % 7
        return f"{weeks}.{remaining_days} weeks"
    
    return f"{years}.{months} years"

# calculate expiry date in days
def expiry_days(exp_date):
    today_date = datetime.now(my_timezone).date()
    expiry_date = datetime.strptime(exp_date, '%d-%b-%Y').date()
    difference = (expiry_date - today_date).days
    return difference

# generate file number
def filenumber():
    alphabet = string.ascii_uppercase  # A to Z
    for letter in alphabet:
        file_number = letter + ''.join(random.choice(string.digits) for _ in range(4))
        if not Patient.objects.filter(fileNumber=file_number).exists():
            return file_number
    return None

# count patients for specific department
def count_patients(depart_id, doc=None):
    if doc is not None:
        user = CustomUser.objects.get(id=doc)
        if user.department_id == 4 and depart_id == 4:
            query = Patient_service.objects.filter(doctor_id=doc, service__isnull=True)
            query_complete = Patient_service.objects.filter(comp_status='complete', registrar_id=doc).exclude(service__dept=2)
        else:
            query = Patient_service.objects.filter(service__dept_id=depart_id, service__isnull=False)
            query_complete = Patient_service.objects.filter(comp_status='complete', service__dept_id=depart_id)
        
        count_pat = query.filter(comp_status='waiting').values('patient_id').distinct().count()
        ready_results = Test_results.objects.filter(
            patient_test__in=query_complete, status='pending'
        ).values('patient_id').distinct().count()
        
        result = {'success': True, 'num': count_pat, 'res_count': ready_results}
    else:
        query = Patient_service.objects.filter(service__dept_id=depart_id, service__isnull=False)
        count_pat = query.filter(comp_status='waiting').values('patient_id').distinct().count()
        result = {'success': True, 'num': count_pat}
        if depart_id == 2:
            requests = Tool_requests.objects.filter(status='pending').count()
            result = {'success': True, 'num': f"{count_pat}---{requests}"}
    return result


# fetch all patients
def get_all_patients():
    fetch_all_patients = Patient.objects.filter(deleted=False).order_by('fullname')
    all_patients = []
    for person in fetch_all_patients:
        all_patients.append({
            'fileNumber': person.fileNumber,
            'fullname': person.fullname,
            'gender': person.gender,
            'age': find_age(person.birthDate.strftime('%Y-%m-%d')),
            'contact': person.contact,
        })
    return all_patients

# update user password
def update_password(current_password, new_password, request):
    user = request.user
    if not authenticate(username=user.username, password=current_password):
        return {'success':False, 'sms':'Incorrect current password!'}

    user.set_password(new_password)
    if not user.password_changed:
        user.password_changed = True
    user.save()
    login(request, user, backend='mwezai_dispensary.backends.CaseInsensitiveModelBackend')
    return {'success':True, 'sms': 'Password updated successfully!'}

# search services
def services_search(online, qry_str, context):
    result_set = []
    qry_id_map = {
        "lab": 3,
        "ult": 5,
        "pro": 6,
        "med": 2,
        "doc": 4,
    }
    qry_id = qry_id_map.get(context, 12345)

    if qry_id in (3, 5, 6):
        query_set = Dept_service.objects.filter(
            dept_id=qry_id, hidden=0, deleted=0
        ).filter(
            Q(name__icontains=qry_str) | 
            Q(price__icontains=qry_str) | 
            Q(describe__icontains=qry_str)
        ).annotate(lower_name=Lower('name')).order_by('lower_name')
        for serv in query_set:
            result_set.append({
                'id': serv.id,
                'name': serv.name,
                'price': serv.price
            })
    elif qry_id == 2:
        today_date = date.today()
        query_set = Dept_service.objects.filter(
            dept=2, hidden=0, deleted=0, qty__gt=0, expiryDate__gt=today_date
        ).exclude(formulation='lab_use').filter(
            Q(name__icontains=qry_str) | 
            Q(price__icontains=qry_str) | 
            Q(formulation__icontains=qry_str) |
            Q(describe__icontains=qry_str)
        ).annotate(lower_name=Lower('name')).order_by('lower_name')
        for med in query_set:
            result_set.append({
                'id': med.id,
                'name': med.name,
                'price': med.price,
                'form': med.formulation
            })
    elif qry_id == 4:
        if online.department == 4:
            query_set = CustomUser.objects.filter(
                department=4, blocked=0, deleted=0).filter(
                Q(full_name__icontains=qry_str)
            ).annotate(lower_name=Lower('full_name')).order_by('lower_name')

            query_set = CustomUser.objects.filter(
                department=4, blocked=0, deleted=0).filter(
                ~Q(id=online.id), Q(full_name__icontains=qry_str)
            ).annotate(lower_name=Lower('full_name')).order_by('lower_name')
        else:
            query_set = CustomUser.objects.filter(
                department=4, blocked=0, deleted=0).filter(
                Q(full_name__icontains=qry_str)
            ).annotate(lower_name=Lower('full_name')).order_by('lower_name')
        doctor_dept = Department.objects.get(id=4)
        for doc in query_set:
            patients = Patient_service.objects.filter(doctor=doc.id, comp_status='waiting').count()
            count_patients = patients if patients > 9 else '0'+str(patients)
            result_set.append({
                'id': doc.id,
                'name': doc.full_name,
                'price': doctor_dept.price,
                'count': count_patients
            })
    elif context == "icd_10_codes":
        query_set = ICD10_codes.objects.filter(
            Q(code__icontains=qry_str) | 
            Q(describe__icontains=qry_str)
        ).exclude(deleted=True).order_by('id')[:30]
        for desc in query_set:
            result_set.append({
                'code': desc.code,
                'describe': desc.describe
            })
    elif "bill_dates_" in context:
        # Date range filtering
        start_date = online
        end_date = qry_str
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if start_date:
            start_date = datetime.strptime(start_date, format_string).astimezone(my_timezone)
        if end_date:
            end_date = datetime.strptime(end_date, format_string).astimezone(my_timezone)
        
        file_number = context.split("_")
        patient = Patient.objects.get(fileNumber=file_number[len(file_number)-1])
        if start_date or end_date:
            status_paid = Q(comp_status='waiting') | Q(comp_status='complete')
            status_unpaid = Q(comp_status='paying')
            if start_date and end_date:
                dates = Q(service_date__gte=start_date) & Q(service_date__lte=end_date)
            elif start_date:
                dates = Q(service_date__gte=start_date)
            elif end_date:
                dates = Q(service_date__lte=end_date)
            

            paid_set = Patient_service.objects.filter(Q(patient_id=patient.id), dates, status_paid)
            unpaid_set = Patient_service.objects.filter(Q(patient_id=patient.id), dates, status_unpaid)
            paid_list, unpaid_list = [], []
            for bill in paid_set:
                names = ""
                if bill.service is None:
                    names = bill.doctor.full_name
                elif bill.service.dept_id == 2:
                    names = f"{bill.service.name} x{bill.md_qty}"
                else:
                    names = bill.service.name
                paid_list.append({
                    'dept': bill.service.dept.name if bill.service else "Doctor",
                    'names': names,
                    'price': bill.costEach * float(bill.md_qty) if bill.md_qty else bill.costEach
                })
            for bill in unpaid_set:
                names = ""
                if bill.service is None:
                    names = bill.doctor.full_name
                elif bill.service.dept_id == 2:
                    names = f"{bill.service.name} x{bill.md_qty}"
                else:
                    names = bill.service.name
                unpaid_list.append({
                    'dept': bill.service.dept.name if bill.service else "Doctor",
                    'names': names,
                    'price': bill.costEach * float(bill.md_qty) if bill.md_qty else bill.costEach
                })
            return {'paid_list': paid_list, 'unpaid_list': unpaid_list}
    return {'results': result_set}




