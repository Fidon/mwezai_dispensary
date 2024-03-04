import pytz
from datetime import datetime, timedelta
from django.shortcuts import render, redirect
from django.urls import reverse
from dateutil import relativedelta
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.cache import never_cache
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, FloatField, ExpressionWrapper, Case, When, Sum
from django.db.models.functions import Lower
from apps.dbase.forms import CustomUserForm, DeptserviceForm
from apps.dbase.models import Department, CustomUser, Dept_service, Patient_service, Patient, Diagnosis, Test_results, ICD10_codes
from utils.custom_decorators import dept_required
from utils.functions import update_password, expiry_days, find_age, EA_TIMEZONE


my_timezone = EA_TIMEZONE()
current_time_utc = datetime.utcnow()
current_time = current_time_utc.replace(tzinfo=pytz.utc).astimezone(my_timezone)

# check if string is a number (integer/float)
def is_number(num):
    try:
        float(num)
        return True
    except ValueError:
        return False

# filter patient birthdates as per current age
def filter_ages_patient_report(column_search, queryset):
    today = datetime.now(my_timezone).date()
    parts = [part.strip() for part in column_search.split("-")]
    age_start, age_end = None, None
    if len(parts) == 2:
        for j, part in enumerate(parts):
            if part and is_number(part) and "." in part:
                age_parts = part.split('.')
                if len(age_parts) == 2 and age_parts[0].isdigit() and age_parts[1].isdigit():
                    months = 11 if int(age_parts[1][:2]) > 11 else int(age_parts[1][:2])
                    if j == 0:
                        age_start = today - timedelta(days=(int(age_parts[0]) * 365 + months * 30))
                    else:
                        age_end = today - timedelta(days=(int(age_parts[0]) * 365 + months * 30))

            elif part and is_number(part):
                if j == 0:
                    age_start = today - timedelta(days=int(part) * 365)
                else:
                    age_end = today - timedelta(days=int(part) * 365)

        if age_start and age_end:
            queryset = queryset.filter(Q(patient__birthDate__lte=age_start) & Q(patient__birthDate__gte=age_end))
        elif age_start:
            queryset = queryset.filter(patient__birthDate__lte=age_start)
        elif age_end:
            queryset = queryset.filter(patient__birthDate__gte=age_end)
    return queryset

# Render admin dashboard page
@never_cache
@login_required
@dept_required(('7'))
def dash_manage (request):
    patients_total = Patient.objects.all()
    staff_total = CustomUser.objects.all().exclude(id=request.user.id)
    complete_services = Patient_service.objects.filter(comp_status='complete')
    pharmacy_revenue = complete_services.filter(service__dept_id=2).annotate(total_cost=F('costEach') * F('md_qty')).aggregate(total=Sum('total_cost'))['total']
    pharmacy_revenue = pharmacy_revenue if pharmacy_revenue else 0.0
    others_revenue = complete_services.exclude(service__dept_id=2).aggregate(total=Sum('costEach'))['total']
    others_revenue = others_revenue if others_revenue else 0.0

    def get_date_range(start_date, end_date):
        return {
            "registered": patients_total.filter(regDate__range=(start_date, end_date)).count(),
            "served_patients": complete_services.filter(service_date__range=(start_date, end_date)).values('patient_id').distinct().count(),
            "pharmacy_revenue": complete_services.filter(service_date__range=(start_date, end_date), service__dept_id=2).annotate(total_cost=F('costEach') * F('md_qty')).aggregate(total=Sum('total_cost'))['total'] or 0.0,
            "others_revenue": complete_services.exclude(service__dept_id=2).filter(service_date__range=(start_date, end_date)).aggregate(total=Sum('costEach'))['total'] or 0.0,
        }

    def get_year_range():
        start_date = current_time.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = current_time.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999)
        return get_date_range(start_date, end_date)

    def get_month_range():
        start_date = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = (start_date + relativedelta.relativedelta(months=1)).replace(day=1, hour=23, minute=59, second=59, microsecond=999)
        return get_date_range(start_date, end_date)

    def get_week_range():
        week_start = current_time - timedelta(days=current_time.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999)
        return get_date_range(week_start, week_end)

    today_range = get_date_range(current_time.replace(hour=0, minute=0, second=0, microsecond=0), current_time.replace(hour=23, minute=59, second=59, microsecond=999))
    week_range = get_week_range()
    month_range = get_month_range()
    year_range = get_year_range()

    dashboard_data = {
        "patients_total": patients_total.count(),
        "patients_served": complete_services.values('patient_id').distinct().count(),
        "grand_total_revenue": pharmacy_revenue + others_revenue,
        "staff_total": staff_total.count(),
        "registered_today": today_range["registered"],
        "served_patients_today": today_range["served_patients"],
        "today_revenue": today_range["pharmacy_revenue"] + today_range["others_revenue"],
        "registered_week": week_range["registered"],
        "served_patients_week": week_range["served_patients"],
        "week_revenue": week_range["pharmacy_revenue"] + week_range["others_revenue"],
        "registered_month": month_range["registered"],
        "served_patients_month": month_range["served_patients"],
        "month_revenue": month_range["pharmacy_revenue"] + month_range["others_revenue"],
        "registered_year": year_range["registered"],
        "served_patients_year": year_range["served_patients"],
        "year_revenue": year_range["pharmacy_revenue"] + year_range["others_revenue"],
    }

    return render(request, 'control/dashboard.html', dashboard_data)

# Render admin users page
@never_cache
@login_required
@dept_required(('7'))
def users_page(request):
    data = Department.objects.filter(id__range=(1, 6))
    return render(request, "control/users.html", {'data': data})

# Register new user
@never_cache
@login_required
@dept_required(('7'))
def add_user(request):
    if request.method == 'POST':
        form = CustomUserForm(request.POST)
        if form.is_valid():
            form.save()
            response_data = {'success': True, 'sms': 'User added successfully!'}
        else:
            errors = {}
            if 'username' in form.errors:
                errors['username'] = form.errors['username'][0]
            if 'department' in form.errors:
                errors['department'] = form.errors['department'][0]
            if 'full_name' in form.errors:
                errors['full_name'] = form.errors['full_name'][0]
            if 'phone' in form.errors:
                errors['phone'] = form.errors['phone'][0]
            response_data = {'success': False, 'errors': errors}
        return JsonResponse(response_data)
    

# Render information page
@never_cache
@login_required
@dept_required(('7'))
def user_information (request, fr, us):
    previous_page = request.META.get('HTTP_REFERER', '/')
    if fr in ("doctor", "user"):
        if fr == "doctor":
            html_temp = "serv_doctor"
        else:
            html_temp = "users"
    else:
        return redirect(reverse('loginPage'))
    
    user_exist = CustomUser.objects.filter(id=us, deleted=0).exists()
    if user_exist:
        user_obj = CustomUser.objects.get(id=us)
        depart = Department.objects.get(id=user_obj.department_id)
        info = {
            'id': user_obj.id,
            'fullname': user_obj.full_name,
            'username': user_obj.username,
            'price': depart.price if fr == "doctor" else None,
            'depart': depart.name,
            'gender': user_obj.gender,
            'depart_id': user_obj.department_id,
            'password_change': "Yes" if user_obj.password_changed else "No",
            'lastlogin': "-" if user_obj.last_login is None else user_obj.last_login.astimezone(my_timezone).strftime('%d-%b-%Y %H:%M:%S'),
            'regdate': user_obj.date_joined.strftime('%d-%b-%Y %H:%M:%S'),
            'describe': user_obj.description if user_obj.description else "",
            'phone': user_obj.phone if user_obj.phone else "",
            'block_txt': "Unblock" if user_obj.blocked else "Block",
            'block': "btn-success" if user_obj.blocked else "btn-warning text-ttxt1"
        }

        departments = Department.objects.filter(id__range=(1, 6)).annotate(dept_name=Lower('name')).order_by('dept_name')
        depart_list = []
        for dep in departments:
            depart_list.append({
                'id': dep.id,
                'name': dep.name
            })
        return render(request, f"control/{html_temp}.html", {'us':info, 'user_id':us, 'depart_list':depart_list})
    return HttpResponseRedirect(previous_page)


# Patients report page
@never_cache
@login_required
@dept_required(('7'))
def patients_logs (request, p=None):
    context = {
        'patient': p
    }
    return render(request, "control/patients.html", context)


# Render doctors page
@never_cache
@login_required
@dept_required(('7'))
def serv_doctor (request):
    depart = Department.objects.get(id=4)
    return render(request, 'control/serv_doctor.html', {'doc_price':depart.price})


# Render lab tests page
@never_cache
@login_required
@dept_required(('7'))
def serv_lab(request):
    return render(request, 'control/serv_lab.html')


# Add new department item/test/medicine
@never_cache
@login_required
@dept_required(('7'))
def new_dept_item (request):
    if request.method == 'POST':
        form = DeptserviceForm(request.POST)
        if form.is_valid():
            test_new = form.save(commit=False)
            test_new.registrar = request.user
            if len(request.POST.get('describe')) == 0:
                test_new.describe = None
            test_new.save()
            response_data = {'success': True, 'sms': 'New item added successfully'}
        else:
            response_data = {'success': False, 'sms': 'Failed to add new item'}
        return JsonResponse(response_data)


# Render ultrasound tests page
@never_cache
@login_required
@dept_required(('7'))
def serv_ult_sound (request):
    return render(request, 'control/serv_sound.html')


# Render procedures page
@never_cache
@login_required
@dept_required(('7'))
def serv_procedure (request):
    return render(request, 'control/serv_procedure.html')


# Render pharmacy medicines page
@never_cache
@login_required
@dept_required(('7'))
def serv_pharmacy (request):
    return render(request, 'control/serv_pharmacy.html')


# Render medicine details page
@never_cache
@login_required
@dept_required(('7'))
def medical_information (request, m):
    med_exist = Dept_service.objects.filter(id=m, dept_id=2, deleted=0).exists()
    if med_exist:
        get_med = Dept_service.objects.get(id=m, dept_id=2)
        get_user = CustomUser.objects.get(id=get_med.registrar_id)
        last_edit = get_med.lastEdited.strftime('%d-%b-%Y %H:%M:%S')
        same_date = get_med.addDate.strftime('%d-%b-%Y %H:%M:%S') == get_med.lastEdited.strftime('%d-%b-%Y %H:%M:%S')
        medicine_info = {
            'id': get_med.id,
            'name': get_med.name,
            'price': get_med.price,
            'form': get_med.formulation,
            'stock': get_med.qty,
            'describe': "-" if get_med.describe is None else get_med.describe,
            'addDate': get_med.addDate.strftime('%d-%b-%Y %H:%M:%S'),
            'lastEdit': last_edit if not same_date else "-",
            'user': get_user.full_name,
            'edited': "Last edited by" if not same_date else "Added by",
            'expiryDate': get_med.expiryDate.strftime('%d-%b-%Y'),
            'expdays': expiry_days(get_med.expiryDate.strftime('%d-%b-%Y')),
            'exp': get_med.expiryDate.strftime('%Y-%m-%d'),
            'hid_txt': "Unhide" if get_med.hidden else "Hide",
            'hid': "btn-success" if get_med.hidden else "btn-warning text-ttxt1"
        }
        return render(request, 'control/serv_pharmacy.html', {'med':medicine_info, 'medicine_id':m})
    return redirect(reverse('serv_pharmacy'))


# Render service details page
@never_cache
@login_required
@dept_required(('7'))
def dept_item_info (request, i, d):
    previous_page = request.META.get('HTTP_REFERER', '/')
    if int(d) in (3, 5, 6):
        if d == 3:
            html_temp = "serv_lab"
        elif d == 5:
            html_temp = "serv_sound"
        else:
            html_temp = "serv_procedure"
    else:
        return redirect(reverse('loginPage'))
    
    item_exist = Dept_service.objects.filter(id=i, dept_id=d, deleted=0).exists()
    if item_exist:
        item = Dept_service.objects.get(id=i)
        get_user = CustomUser.objects.get(id=item.registrar_id)
        last_edit = item.lastEdited.strftime('%d-%b-%Y %H:%M:%S')
        same_date = item.addDate.strftime('%d-%b-%Y %H:%M:%S') == item.lastEdited.strftime('%d-%b-%Y %H:%M:%S')
        item_info = {
            'id': item.id,
            'name': item.name,
            'price': item.price,
            'describe': "-" if item.describe is None else item.describe,
            'addDate': item.addDate.strftime('%d-%b-%Y %H:%M:%S'),
            'lastEdit': last_edit if not same_date else "-",
            'user': get_user.full_name,
            'edited': "Last edited by" if not same_date else "Added by",
            'hid_txt': "Unhide" if item.hidden else "Hide",
            'hid': "btn-success" if item.hidden else "btn-warning text-ttxt1"
        }
        return render(request, f"control/{html_temp}.html", {'item':item_info, 'item_id':i})
    return HttpResponseRedirect(previous_page)


# Update department service information
@never_cache
@login_required
@dept_required(('7'))
def update_dept_service(request):
    response = {'s': False, 't': '404'}
    if request.method == 'POST':
        dept = request.POST.get('dept')
        if dept == "doctor":
            new_price = request.POST.get('price')
            Department.objects.filter(id=4).update(price=new_price)
            response = {
                "success": True,
                "sms": "Price updated successfully!"
            }
        elif dept == "users":
            user_id = int(request.POST.get('user_id'))
            phone = request.POST.get('phone') if request.POST.get('phone') else None
            phone_exist = False

            if phone:
                phone_exist = CustomUser.objects.filter(phone=phone).exclude(id=user_id).exists()

            if phone_exist:
                response = {
                    "success": False,
                    "sms": "This phone number is associated with another user account."
                }
            else:
                try:
                    username = request.POST.get('username')
                    fullname = request.POST.get('fullname')
                    gender = request.POST.get('gender')
                    department = int(request.POST.get('department'))
                    describe = request.POST.get('describe') if request.POST.get('describe') else None

                    depart = Department.objects.get(id=department)
                    us = CustomUser.objects.get(id=user_id)

                    if department != us.department_id:
                        us.department = depart
                    if username != us.username:
                        us.username = username
                    if gender != us.gender:
                        us.gender = gender
                    if fullname != us.full_name:
                        us.full_name = fullname
                    if describe != us.description:
                        us.description = describe
                    if phone != us.phone:
                        us.phone = phone

                    us.save()
                    response = {
                        "success": True,
                        "sms": "Information updated successfully!"
                    }
                except Exception as exep_sms:
                    response = {
                        "success": False,
                        "sms": "Failed to update user information"
                    }
        elif dept in ("pass_reset", "account_block", "account_delete"):
            id_user = int(request.POST.get('user'))
            user = CustomUser.objects.get(id=id_user)
            if dept == "pass_reset":
                user.set_password(user.username.upper())
            elif dept == "account_block":
                user.blocked = not user.blocked
            else:
                user.deleted = not user.deleted
            user.save()
            response = {'success':True, 'sms': 'success!'}
        elif dept in ("it_delete", "it_hide", "it_update"):
            item_id = int(request.POST.get('id'))
            item = Dept_service.objects.get(id=item_id)
            if dept == "it_hide":
                item.hidden = not item.hidden
            elif dept == "it_delete":
                item.deleted = True
            else:
                names = request.POST.get('name')
                price = float(request.POST.get('price'))
                describe = request.POST.get('describe') if len(request.POST.get('describe')) > 0 else None
                if not item.name == names:
                    item.name = names
                if not item.price == price:
                    item.price = price
                if not item.describe == describe:
                    item.describe = describe
            
            item.lastEdited = datetime.now(my_timezone).strftime("%Y-%m-%d %H:%M:%S.%f")
            item.save()
            response = {'success': True, 'sms': 'Item updated successfully!'}
    return JsonResponse(response)


# Render profile page
@never_cache
@login_required
@dept_required(('7'))
def manage_profile (request):
    return render(request, 'control/profile.html')


# change user password
@never_cache
@login_required
@dept_required(('7'))
def manage_profile_update (request):
    if request.method == 'POST':
        current_password = request.POST.get('currentpass')
        new_password = request.POST.get('newpass')
        change_pass = update_password(current_password, new_password, request)
        return JsonResponse(change_pass)
    return JsonResponse({'success':False, 'sms': 'Invalid request!'})


# get data into dataTables.js
@never_cache
@login_required
@dept_required(('7', '2', '1'))
def admin_get_data(request, param):
    my_timezone = EA_TIMEZONE()
    if "_" in param:
        dept = param.split("_")
        return tests_datatable(request, dept[1], my_timezone)
    if param == "users":
        return users_datatable(request, my_timezone)
    if param == "doctors":
        return doctors_datatable(request, my_timezone)
    if param == "medicines":
        return medicines_datatable(request, my_timezone)
    return JsonResponse({'text': 'Access denied!'})


# patients report
@never_cache
@login_required
@dept_required(('7'))
def ad_patients_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 1))
        order_dir = request.POST.get('order[0][dir]', 'desc')

        # Base queryset
        queryset = Diagnosis.objects.all()

        # Count the total records before filtering
        total_records = queryset.values('patient').distinct().count()

        # Date range filtering
        start_lastvisit = request.POST.get('min_lastvisit')
        end_lastvisit = request.POST.get('max_lastvisit')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if start_lastvisit:
            start_lastvisit = datetime.strptime(start_lastvisit, format_string).astimezone(my_timezone)
        if end_lastvisit:
            end_lastvisit = datetime.strptime(end_lastvisit, format_string).astimezone(my_timezone)
        
        if start_lastvisit or end_lastvisit:
            my_timezone = EA_TIMEZONE()
            if start_lastvisit and end_lastvisit:
                queryset = queryset.filter(diagnosis_date__range=(start_lastvisit, end_lastvisit))
            elif start_lastvisit:
                queryset = queryset.filter(diagnosis_date__gte=start_lastvisit)
            elif end_lastvisit:
                queryset = queryset.filter(diagnosis_date__lte=end_lastvisit)



        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'diagnosis_date',
            2: 'patient__fileNumber',
            3: 'patient__fullname',
            4: 'patient__birthDate',
            5: 'patient__gender',
            6: 'patient__contact',
            7: 'icd_codes',
            8: 'patient__occupation',
            9: 'patient__marital',
            10: 'patient__religion',
            11: 'patient__address',
            12: 'patient__comment',
            13: 'registrar__full_name',
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'diagnosis_date')
        if order_dir == 'asc':
            queryset = queryset.order_by(order_column_name)
        else:
            queryset = queryset.order_by(f'-{order_column_name}')

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if not column_search:
                continue

            column_field = column_mapping.get(i)
            if column_field:
                if i == 4 and column_search != "-":
                    queryset = filter_ages_patient_report(column_search, queryset)
                elif i == 5:
                    lookup = f"{column_field}__exact"
                    queryset = queryset.filter(**{lookup: column_search})
                else:
                    lookup = f"{column_field}__icontains"
                    queryset = queryset.filter(**{lookup: column_search})

        # Apply global search
        if search_value:
            global_search = Q()
            for field in column_mapping.values():
                global_search |= Q(**{f'{field}__icontains': search_value})
            queryset = queryset.filter(global_search)

        # Calculate the total number of records after filtering
        records_filtered = queryset.count()

        # JSON response
        patients_data = {}
        data = []
        count_data = 1

        for i, diag in enumerate(queryset):
            patient_id = diag.patient.id
            if patient_id not in patients_data:
                patients_data[patient_id] = {
                    'count': count_data,
                    'id': diag.id,
                    'regdate': diag.patient.regDate.strftime('%d-%b-%Y'),
                    'diagnosis_date': diag.diagnosis_date.strftime('%d-%b-%Y'),
                    'filenumber': diag.patient.fileNumber,
                    'fullname': diag.patient.fullname,
                    'age': find_age(diag.patient.birthDate.strftime('%Y-%m-%d'), 'age'),
                    'gender': "M" if diag.patient.gender == "Male" else "F",
                    'contact': diag.patient.contact,
                    'address': diag.patient.address,
                    'diseases': set()
                }
                count_data += 1

            diseases_list = diag.icd_codes if diag.icd_codes is not None else []
            patients_data[patient_id]['diseases'].update(diseases_list)

        for patient_data in patients_data.values():
            patient_data['diseases'] = ', '.join(patient_data['diseases']) if patient_data['diseases'] else "-"

        data = list(patients_data.values())

        records_filtered = len(data)

        # Apply pagination
        data = data[start:start + length]

        response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': data,
        }
        return JsonResponse(response)
    return render(request, 'control/report_patient.html')


# Reception report
@never_cache
@login_required
@dept_required(('7'))
def ad_reception_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = CustomUser.objects.filter(department_id=1)

        # Date range filtering
        rec_startdate = request.POST.get('rec_mindate')
        rec_enddate = request.POST.get('rec_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if rec_startdate:
            rec_startdate = datetime.strptime(rec_startdate, format_string).astimezone(my_timezone)
        if rec_enddate:
            rec_enddate = datetime.strptime(rec_enddate, format_string).astimezone(my_timezone)


        # Base data from queryset
        base_data = []
        for user in queryset:
            count_patients_filter = {'registrar': user}
            count_admitted_filter = {'registrar': user}
            amount_filter = {'registrar': user, 'comp_status': 'complete'}

            # Update filters based on date range
            if rec_startdate:
                count_patients_filter['regDate__gte'] = rec_startdate
                count_admitted_filter['service_date__gte'] = rec_startdate
                amount_filter['service_date__gte'] = rec_startdate

            if rec_enddate:
                count_patients_filter['regDate__lte'] = rec_enddate
                count_admitted_filter['service_date__lte'] = rec_enddate
                amount_filter['service_date__lte'] = rec_enddate

            # Retrieve counts and amounts based on filters
            count_patients = Patient.objects.filter(**count_patients_filter).count()
            admit_count = Patient_service.objects.filter(**count_admitted_filter).values('patient_id').distinct().count()

            amount_query = Patient_service.objects.filter(**amount_filter).annotate(
                sum_amount=ExpressionWrapper(Case(When(md_qty__isnull=False,
                then=F('costEach') * F('md_qty')), default=F('costEach'),
                output_field=FloatField()), output_field=FloatField()))

            amount = amount_query.aggregate(total_amount=Sum('sum_amount'))['total_amount']
            base_data.append({
                'id': user.id,
                'names': user.full_name,
                'patients': count_patients,
                'admitted': admit_count,
                'amount': amount if amount else 0.0,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'names',
            2: 'patients',
            3: 'admitted',
            4: 'amount'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'names')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()

                        if column_field in ['admitted', 'patients', 'amount']:
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        grand_patients = sum(item['patients'] for item in base_data)
        grand_admitted = sum(item['admitted'] for item in base_data)
        grand_amount = sum(item['amount'] for item in base_data)

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'names': item.get('names'),
                'patients': '{:,}'.format(item.get('patients')),
                'admitted': '{:,}'.format(item.get('admitted')),
                'amount': '{:,.2f}'.format(item.get('amount')),
                'action': ''
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': {'grand_patients': grand_patients, 'grand_admitted': grand_admitted,'grand_amount': grand_amount}
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_reception.html')



# Reception report details
@never_cache
@login_required
@dept_required(('7'))
def ad_rec_info(request, u, c):
    if request.method == 'POST' and c == 'patients':
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # base query
        queryset = Patient.objects.filter(registrar_id=u)

        # Date range filtering
        startdate = request.POST.get('mindate')
        enddate = request.POST.get('maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if startdate:
            startdate = datetime.strptime(startdate, format_string).astimezone(my_timezone)
        if enddate:
            enddate = datetime.strptime(enddate, format_string).astimezone(my_timezone)
            
        if startdate and enddate:
            queryset = queryset.filter(regDate__range=(startdate, enddate))
        elif startdate:
            queryset = queryset.filter(regDate__gte=startdate)
        elif enddate:
            queryset = queryset.filter(regDate__lte=enddate)


        # Base data from queryset
        base_data = []
        for patient in queryset:
            base_data.append({
                'id': patient.id,
                'regDate': patient.regDate,
                'fullname': patient.fullname,
                'fileNumber': patient.fileNumber,
                'gender': patient.gender,
                'contact': patient.contact
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'regDate',
            2: 'fullname',
            3: 'fileNumber',
            4: 'gender',
            5: 'contact'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'regDate')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'gender':
                            if column_search.lower() == column_value:
                                filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'regDate': item.get('regDate').strftime('%d-%b-%Y %H:%M'),
                'fullname': item.get('fullname'),
                'fileNumber': item.get('fileNumber'),
                'gender': item.get('gender'),
                'contact': item.get('contact')
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
        }
        return JsonResponse(ajax_response)
    elif request.method == 'POST' and c == 'admission':
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # base query
        queryset = Patient_service.objects.filter(registrar_id=u).filter(Q(comp_status='complete') | Q(comp_status='waiting'))
        # print(f"Registrar: {u}")

        # Date range filtering
        startdate = request.POST.get('mindate')
        enddate = request.POST.get('maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if startdate:
            startdate = datetime.strptime(startdate, format_string).astimezone(my_timezone)
        if enddate:
            enddate = datetime.strptime(enddate, format_string).astimezone(my_timezone)
            
        if startdate and enddate:
            queryset = queryset.filter(service_date__range=(startdate, enddate))
        elif startdate:
            queryset = queryset.filter(service_date__gte=startdate)
        elif enddate:
            queryset = queryset.filter(service_date__lte=enddate)


        # Base data from queryset
        patient_id_list = []
        base_data = []
        for patient in queryset:
            if patient.patient_id not in patient_id_list:
                patient_id_list.append(patient.patient_id)
                base_data.append({
                    'id': patient.patient_id,
                    'fullname': patient.patient.fullname,
                    'fileNumber': patient.patient.fileNumber,
                    'gender': patient.patient.gender,
                })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'fullname',
            2: 'fileNumber',
            3: 'gender',
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'fullname')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'gender':
                            if column_search.lower() == column_value:
                                filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'fullname': item.get('fullname'),
                'fileNumber': item.get('fileNumber'),
                'gender': item.get('gender'),
                'action': ''
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
        }
        return JsonResponse(ajax_response)
    elif request.method == 'POST' and c == 'revenue':
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # base query
        queryset = Patient_service.objects.filter(registrar_id=u, comp_status='complete')

        # Date range filtering
        startdate = request.POST.get('mindate')
        enddate = request.POST.get('maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if startdate:
            startdate = datetime.strptime(startdate, format_string).astimezone(my_timezone)
        if enddate:
            enddate = datetime.strptime(enddate, format_string).astimezone(my_timezone)
            
        if startdate and enddate:
            queryset = queryset.filter(service_date__range=(startdate, enddate))
        elif startdate:
            queryset = queryset.filter(service_date__gte=startdate)
        elif enddate:
            queryset = queryset.filter(service_date__lte=enddate)


        # Base data from queryset
        patient_id_list = []
        base_data = []
        for patient in queryset:
            if patient.patient_id not in patient_id_list:
                revenue_query = queryset.filter(patient_id=patient.patient_id).annotate(sum_amount=ExpressionWrapper(Case(When(md_qty__isnull=False, then=F('costEach') * F('md_qty')), default=F('costEach'), output_field=FloatField()), output_field=FloatField()))
                amount = revenue_query.aggregate(total_amount=Sum('sum_amount'))['total_amount']

                patient_id_list.append(patient.patient_id)
                
                base_data.append({
                    'id': patient.patient_id,
                    'fullname': patient.patient.fullname,
                    'fileNumber': patient.patient.fileNumber,
                    'revenue': amount,
                })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'fullname',
            2: 'fileNumber',
            3: 'revenue',
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'fullname')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'revenue':
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)
                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)
                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)
                    base_data = filtered_base_data

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'fullname': item.get('fullname'),
                'fileNumber': item.get('fileNumber'),
                'revenue': '{:,.2f}'.format(item.get('revenue')),
                'action': ''
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
        }
        return JsonResponse(ajax_response)  
    if CustomUser.objects.filter(id=u, department_id=1).exists():
        staff = CustomUser.objects.get(id=u)
        data = {
            'receptionist': u,
            'rec_names': staff.full_name,
            'category': c
        }
        return render(request, 'control/report_reception.html', data)
    return redirect(reverse('ad_reception_report'))

@never_cache
@login_required
@dept_required(('7'))
def ad_details_reception(request, pat, act, reg):
    if request.method == 'POST':
        if act == 'revenue':
            pat_services = Patient_service.objects.filter(patient_id=pat, registrar_id=reg, comp_status='complete')
        else:
            pat_services = Patient_service.objects.filter(patient_id=pat, registrar_id=reg).filter(Q(comp_status='complete') | Q(comp_status='waiting'))


        # Date range filtering
            startdate = request.POST.get('mindate', None)
            enddate = request.POST.get('maxdate', None)
            # print(f"Tarehe: {startdate} -- {enddate}")
            format_string = "%Y-%m-%d %H:%M:%S.%f"
            if startdate:
                startdate = datetime.strptime(startdate, format_string).astimezone(my_timezone)
            if enddate:
                enddate = datetime.strptime(enddate, format_string).astimezone(my_timezone)
                
            if startdate and enddate:
                pat_services = pat_services.filter(service_date__range=(startdate, enddate))
            elif startdate:
                pat_services = pat_services.filter(service_date__gte=startdate)
            elif enddate:
                pat_services = pat_services.filter(service_date__lte=enddate)


        # Base data from queryset
        services_list = []
        for service in pat_services:
            if service.service is None:
                names = f"(Doctor) {service.doctor.full_name}"
                costs = service.costEach
            else:
                if service.md_qty is None:
                    names = f"({service.service.dept.name}) {service.service.name}"
                    costs = service.costEach
                else:
                    names = f"({service.service.dept.name}) {service.service.name} - {service.md_formulation} x {service.md_qty}"
                    costs = float(service.costEach * service.md_qty)

            services_list.append({
                'id': int(service.id),
                'dates': service.service_date.strftime('%d-%b-%Y %H:%M'),
                'names': names,
                'costs': '{:,.2f}'.format(costs),
                'status': service.comp_status,
                'results': act,
            })
        services_list = sorted(services_list, key=lambda x: x['id'], reverse=True)
        return JsonResponse({'success': True, 'services': services_list})

# Labolatory report
@never_cache
@login_required
@dept_required(('7'))
def ad_lab_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = Test_results.objects.filter(patient_test__service__dept_id=3)

        # Date range filtering
        res_startdate = request.POST.get('res_mindate')
        res_enddate = request.POST.get('res_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if res_startdate:
            res_startdate = datetime.strptime(res_startdate, format_string).astimezone(my_timezone)
        if res_enddate:
            res_enddate = datetime.strptime(res_enddate, format_string).astimezone(my_timezone)
            
        if res_startdate and res_enddate:
            queryset = queryset.filter(result_date__range=(res_startdate, res_enddate))
        elif res_startdate:
            queryset = queryset.filter(result_date__gte=res_startdate)
        elif res_enddate:
            queryset = queryset.filter(result_date__lte=res_enddate)


        # Base data from queryset
        base_data = []
        for test in queryset:
            base_data.append({
                'id': test.id,
                'res_date': test.result_date,
                'test_name': test.patient_test.service.name,
                'test_id': test.patient_test.service_id,
                'test_cost': test.patient_test.costEach,
                'patient': test.patient.fullname,
                'patient_file': test.patient.fileNumber,
                'staff': test.doctor.full_name,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'res_date',
            2: 'test_name',
            3: 'test_cost',
            4: 'patient',
            5: 'staff'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'res_date')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'test_cost':
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        total_costs = sum(item['test_cost'] for item in base_data)
        total_tests = len(set(item['test_id'] for item in base_data))
        total_patients = len(set(item['patient_file'] for item in base_data))
        grand_totals = {
            'total_costs': '{:,.1f}'.format(total_costs),
            'total_tests': '{:,}'.format(total_tests),
            'total_patients': '{:,}'.format(total_patients)
        }

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'res_date': item.get('res_date').strftime('%d-%b-%Y %H:%M'),
                'test_name': item.get('test_name'),
                'test_id': item.get('test_id'),
                'test_cost': '{:,.1f}'.format(item.get('test_cost')),
                'patient': item.get('patient'),
                'patient_file': item.get('patient_file'),
                'staff': item.get('staff'),
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': grand_totals
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_lab.html')


# Ultrasound report
@never_cache
@login_required
@dept_required(('7'))
def ad_usound_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = Test_results.objects.filter(patient_test__service__dept_id=5)

        # Date range filtering
        res_startdate = request.POST.get('res_mindate')
        res_enddate = request.POST.get('res_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if res_startdate:
            res_startdate = datetime.strptime(res_startdate, format_string).astimezone(my_timezone)
        if res_enddate:
            res_enddate = datetime.strptime(res_enddate, format_string).astimezone(my_timezone)
            
        if res_startdate and res_enddate:
            queryset = queryset.filter(result_date__range=(res_startdate, res_enddate))
        elif res_startdate:
            queryset = queryset.filter(result_date__gte=res_startdate)
        elif res_enddate:
            queryset = queryset.filter(result_date__lte=res_enddate)


        # Base data from queryset
        base_data = []
        for test in queryset:
            base_data.append({
                'id': test.id,
                'res_date': test.result_date,
                'test_name': test.patient_test.service.name,
                'test_id': test.patient_test.service_id,
                'test_cost': test.patient_test.costEach,
                'patient': test.patient.fullname,
                'patient_file': test.patient.fileNumber,
                'staff': test.doctor.full_name,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'res_date',
            2: 'test_name',
            3: 'test_cost',
            4: 'patient',
            5: 'staff'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'res_date')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'test_cost':
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        total_costs = sum(item['test_cost'] for item in base_data)
        total_tests = len(set(item['test_id'] for item in base_data))
        total_patients = len(set(item['patient_file'] for item in base_data))
        grand_totals = {
            'total_costs': '{:,.1f}'.format(total_costs),
            'total_tests': '{:,}'.format(total_tests),
            'total_patients': '{:,}'.format(total_patients)
        }

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'res_date': item.get('res_date').strftime('%d-%b-%Y %H:%M'),
                'test_name': item.get('test_name'),
                'test_id': item.get('test_id'),
                'test_cost': '{:,.1f}'.format(item.get('test_cost')),
                'patient': item.get('patient'),
                'patient_file': item.get('patient_file'),
                'staff': item.get('staff'),
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': grand_totals
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_usound.html')


# Procedures report
@never_cache
@login_required
@dept_required(('7'))
def ad_procedures_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = Test_results.objects.filter(patient_test__service__dept_id=6)

        # Date range filtering
        res_startdate = request.POST.get('res_mindate')
        res_enddate = request.POST.get('res_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if res_startdate:
            res_startdate = datetime.strptime(res_startdate, format_string).astimezone(my_timezone)
        if res_enddate:
            res_enddate = datetime.strptime(res_enddate, format_string).astimezone(my_timezone)
            
        if res_startdate and res_enddate:
            queryset = queryset.filter(result_date__range=(res_startdate, res_enddate))
        elif res_startdate:
            queryset = queryset.filter(result_date__gte=res_startdate)
        elif res_enddate:
            queryset = queryset.filter(result_date__lte=res_enddate)


        # Base data from queryset
        base_data = []
        for test in queryset:
            base_data.append({
                'id': test.id,
                'res_date': test.result_date,
                'test_name': test.patient_test.service.name,
                'test_id': test.patient_test.service_id,
                'test_cost': test.patient_test.costEach,
                'patient': test.patient.fullname,
                'patient_file': test.patient.fileNumber,
                'staff': test.doctor.full_name,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'res_date',
            2: 'test_name',
            3: 'test_cost',
            4: 'patient',
            5: 'staff'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'res_date')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()
                        if column_field == 'test_cost':
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        total_costs = sum(item['test_cost'] for item in base_data)
        total_tests = len(set(item['test_id'] for item in base_data))
        total_patients = len(set(item['patient_file'] for item in base_data))
        grand_totals = {
            'total_costs': '{:,.1f}'.format(total_costs),
            'total_tests': '{:,}'.format(total_tests),
            'total_patients': '{:,}'.format(total_patients)
        }

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'res_date': item.get('res_date').strftime('%d-%b-%Y %H:%M'),
                'test_name': item.get('test_name'),
                'test_id': item.get('test_id'),
                'test_cost': '{:,.1f}'.format(item.get('test_cost')),
                'patient': item.get('patient'),
                'patient_file': item.get('patient_file'),
                'staff': item.get('staff'),
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': grand_totals
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_procedure.html')


# Pharmacy report
@never_cache
@login_required
@dept_required(('7'))
def ad_pharmacy_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = Test_results.objects.filter(patient_test__service__dept_id=2)

        # Date range filtering
        res_startdate = request.POST.get('res_mindate')
        res_enddate = request.POST.get('res_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if res_startdate:
            res_startdate = datetime.strptime(res_startdate, format_string).astimezone(my_timezone)
        if res_enddate:
            res_enddate = datetime.strptime(res_enddate, format_string).astimezone(my_timezone)
            
        if res_startdate and res_enddate:
            queryset = queryset.filter(result_date__range=(res_startdate, res_enddate))
        elif res_startdate:
            queryset = queryset.filter(result_date__gte=res_startdate)
        elif res_enddate:
            queryset = queryset.filter(result_date__lte=res_enddate)


        # Base data from queryset
        base_data = []
        for med in queryset:
            base_data.append({
                'id': med.id,
                'res_date': med.result_date,
                'med_name': med.patient_test.service.name,
                'med_form': med.patient_test.md_formulation,
                'med_qty': med.patient_test.md_qty,
                'med_id': med.patient_test.service_id,
                'med_cost': int(med.patient_test.costEach) * med.patient_test.md_qty,
                'patient': med.patient.fullname,
                'patient_file': med.patient.fileNumber,
                'staff': med.doctor.full_name,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'res_date',
            2: 'med_name',
            3: 'med_form',
            4: 'med_qty',
            5: 'med_cost',
            6: 'patient',
            7: 'staff'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'res_date')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()

                        if column_field in ("med_qty", "med_cost"):
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        total_costs = sum(item['med_cost'] for item in base_data)
        total_qty = sum(item['med_qty'] for item in base_data)
        total_meds = len(set(item['med_id'] for item in base_data))
        total_patients = len(set(item['patient_file'] for item in base_data))
        grand_totals = {
            'total_costs': '{:,.1f}'.format(total_costs),
            'total_qty': '{:,}'.format(total_qty),
            'total_meds': '{:,}'.format(total_meds),
            'total_patients': '{:,}'.format(total_patients)
        }

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'res_date': item.get('res_date').strftime('%d-%b-%Y %H:%M'),
                'med_name': item.get('med_name'),
                'med_form': item.get('med_form'),
                'med_qty': '{:,}'.format(item.get('med_qty')),
                'med_id': item.get('med_id'),
                'med_cost': '{:,.1f}'.format(item.get('med_cost')),
                'patient': item.get('patient'),
                'patient_file': item.get('patient_file'),
                'staff': item.get('staff'),
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': grand_totals
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_pharmacy.html')


# Doctors report
@never_cache
@login_required
@dept_required(('7'))
def ad_doctors_report(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 0))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = CustomUser.objects.filter(department_id=4)

        # Date range filtering
        serv_startdate = request.POST.get('serv_mindate')
        serv_enddate = request.POST.get('serv_maxdate')
        format_string = "%Y-%m-%d %H:%M:%S.%f"
        if serv_startdate:
            serv_startdate = datetime.strptime(serv_startdate, format_string).astimezone(my_timezone)
        if serv_enddate:
            serv_enddate = datetime.strptime(serv_enddate, format_string).astimezone(my_timezone)


        # Base data from queryset
        base_data = []
        for doctor in queryset:
            count_patients_filter = {'doctor': doctor, 'comp_status': 'complete'}
            amount_filter = {'registrar': doctor, 'comp_status': 'complete'}

            if serv_startdate:
                count_patients_filter['service_date__gte'] = serv_startdate
                amount_filter['service_date__gte'] = serv_startdate

            if serv_enddate:
                count_patients_filter['service_date__lte'] = serv_enddate
                amount_filter['service_date__lte'] = serv_enddate

            count_patients = Patient_service.objects.filter(**count_patients_filter).count()

            amount_query = Patient_service.objects.filter(**amount_filter).annotate(
                sum_amount=ExpressionWrapper(Case(When(md_qty__isnull=False,
                then=F('costEach') * F('md_qty')), default=F('costEach'),
                output_field=FloatField()), output_field=FloatField()))

            amount = amount_query.aggregate(total_amount=Sum('sum_amount'))['total_amount']
            base_data.append({
                'id': doctor.id,
                'names': doctor.full_name,
                'patients': count_patients,
                'revenues': amount if amount else 0.0,
            })

        
        # Total records before filtering
        total_records = len(base_data)

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'names',
            2: 'patients',
            3: 'revenues'
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'names')
        if order_dir == 'asc':
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=False)
        else:
            base_data = sorted(base_data, key=lambda x: x[order_column_name], reverse=True)

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    filtered_base_data = []
                    for item in base_data:
                        column_value = str(item.get(column_field, '')).lower()

                        if column_field in ['patients', 'revenues']:
                            if column_search.startswith('-') and column_search[1:].isdigit():
                                max_value = int(column_search[1:])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value <= max_value:
                                    filtered_base_data.append(item)

                            elif column_search.endswith('-') and column_search[:-1].isdigit():
                                min_value = int(column_search[:-1])
                                item_value = float(column_value) if column_value else 0.0
                                if item_value >= min_value:
                                    filtered_base_data.append(item)

                            elif column_search.isdigit():
                                target_value = float(column_search.replace(',', ''))
                                item_value = float(column_value) if column_value else 0.0
                                if item_value == target_value:
                                    filtered_base_data.append(item)
                        else:
                            if column_search.lower() in column_value:
                                filtered_base_data.append(item)

                    base_data = filtered_base_data

        # Apply global search
        if search_value:
            base_data = [item for item in base_data if any(str(value).lower().find(search_value.lower()) != -1 for value in item.values())]

        # Calculate the total number of records after filtering
        records_filtered = len(base_data)

        # Calculate grand totals before pagination
        grand_patients = sum(item['patients'] for item in base_data)
        grand_revenues = sum(item['revenues'] for item in base_data)

        # Apply pagination
        base_data = base_data[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1


        # Final data to be returned to ajax call
        final_data = []
        for i, item in enumerate(base_data):
            final_data.append({
                'count': row_count_start + i,
                'id': item.get('id'),
                'names': item.get('names'),
                'patients': '{:,}'.format(item.get('patients')),
                'revenues': '{:,.1f}'.format(item.get('revenues')),
            })

        ajax_response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': final_data,
            'grand_totals': {'total_patients': grand_patients, 'total_revenues': grand_revenues}
        }
        return JsonResponse(ajax_response)
    return render(request, 'control/report_doctors.html')


# Render alerts page
@never_cache
@login_required
@dept_required(('7'))
def manage_alerts (request):
    return render(request, 'control/alerts.html')


# ICD10_codes page
@never_cache
@login_required
@dept_required(('7'))
def ad_icd_codes(request):
    if request.method == 'POST':
        my_timezone = EA_TIMEZONE()
        draw = int(request.POST.get('draw', 0))
        start = int(request.POST.get('start', 0))
        length = int(request.POST.get('length', 10))
        search_value = request.POST.get('search[value]', '')
        order_column_index = int(request.POST.get('order[0][column]', 1))
        order_dir = request.POST.get('order[0][dir]', 'asc')

        # Base queryset
        queryset = ICD10_codes.objects.filter(deleted=False)

        # Count the total records before filtering
        total_records = queryset.count()

        # Define a mapping from DataTables column index to the corresponding model field
        column_mapping = {
            0: 'id',
            1: 'code',
            2: 'describe',
        }

        # Apply sorting
        order_column_name = column_mapping.get(order_column_index, 'code')
        if order_dir == 'asc':
            queryset = queryset.order_by(order_column_name)
        else:
            queryset = queryset.order_by(f'-{order_column_name}')

        # Apply individual column filtering
        for i in range(len(column_mapping)):
            column_search = request.POST.get(f'columns[{i}][search][value]', '')
            if column_search:
                column_field = column_mapping.get(i)
                if column_field:
                    lookup = f"{column_field}__icontains"
                    queryset = queryset.filter(**{lookup: column_search})

        # Apply global search
        if search_value:
            global_search = Q()
            for field in column_mapping.values():
                global_search |= Q(**{f'{field}__icontains': search_value})
            queryset = queryset.filter(global_search)

        # Calculate the total number of records after filtering
        records_filtered = queryset.count()

        # Apply pagination
        queryset = queryset[start:start + length]

        # Calculate row_count based on current page and length
        page_number = start // length + 1
        row_count_start = (page_number - 1) * length + 1

        # JSON response
        data = [
            {
                'count': row_count_start + i,
                'id': icd.id,
                'code': icd.code,
                'describe': icd.describe,
                'action': ''
            }
            for i, icd in enumerate(queryset)
        ]
        response = {
            'draw': draw,
            'recordsTotal': total_records,
            'recordsFiltered': records_filtered,
            'data': data,
        }
        return JsonResponse(response)
    return render(request, 'control/icd_codes.html')


# ICD10_codes updates
@never_cache
@login_required
@dept_required(('7'))
def manage_icd10_updates (request):
    if request.method == 'POST':
        response_obj = None
        action_type = request.POST.get('action')
        if action_type == "add_new":
            icd_code = request.POST.get('code')
            icd_describe = request.POST.get('describe')
            if len(icd_code) > 0 and len(icd_describe) > 0:
                code_exist = ICD10_codes.objects.filter(code=icd_code).exists()
                if not code_exist:
                    new_icd_code = ICD10_codes(code=icd_code, describe=icd_describe)
                    new_icd_code.save()
                    response_obj = {
                        "success": True,
                        "sms": "New code registered successfully!"
                    }
                else:
                    response_obj = {
                        "success": False,
                        "sms": "Code is already registered!"
                    }
            else:
                response_obj = {
                    "success": False,
                    "sms": "Please enter code and description!"
                }
        elif action_type == "update":
            icd_id = request.POST.get('id')
            icd_code = request.POST.get('code')
            icd_describe = request.POST.get('describe')
            if len(icd_code) > 0 and len(icd_describe) > 0:
                code_exist = ICD10_codes.objects.filter(code=icd_code).exclude(id=icd_id).exists()
                if not code_exist:
                    get_code = ICD10_codes.objects.get(id=icd_id)
                    if icd_code != get_code.code:
                        get_code.code = icd_code
                    if icd_describe != get_code.describe:
                        get_code.describe = icd_describe
                    get_code.save()
                    response_obj = {
                        "success": True,
                        "sms": "Code updated successfully!"
                    }
                else:
                    response_obj = {
                        "success": False,
                        "sms": "Code is already registered!"
                    }
            else:
                response_obj = {
                    "success": False,
                    "sms": "Neither code nor description can be blank!"
                }
        else:
            icd_id = request.POST.get('id')
            code_exist = ICD10_codes.objects.filter(id=icd_id).exists()
            if code_exist:
                get_code = ICD10_codes.objects.get(id=icd_id)
                get_code.deleted = True
                get_code.save()
                response_obj = {
                    "success": True,
                    "sms": "Code deleted successfully!"
                }
            else:
                response_obj = {
                    "success": False,
                    "sms": "Invalid code id."
                }
        return JsonResponse(response_obj)
    return JsonResponse({"success": False, "sms": "Invalid request!"})


# datatables' methods/functions
def users_datatable(request, my_timezone):
    draw = int(request.POST.get('draw', 0))
    start = int(request.POST.get('start', 0))
    length = int(request.POST.get('length', 10))
    search_value = request.POST.get('search[value]', '')
    order_column_index = int(request.POST.get('order[0][column]', 0))
    order_dir = request.POST.get('order[0][dir]', 'asc')

    # Base queryset
    queryset = CustomUser.objects.filter(deleted=0).exclude(id=request.user.id)

    # Count the total records before filtering
    total_records = queryset.count()

    # Date range filtering
    start_date = request.POST.get('mindate')
    end_date = request.POST.get('maxdate')
    format_string = "%Y-%m-%d %H:%M:%S.%f"
    if start_date:
        start_date = datetime.strptime(start_date, format_string).astimezone(my_timezone)
    if end_date:
        end_date = datetime.strptime(end_date, format_string).astimezone(my_timezone)
    
    if start_date or end_date:
        date_range = None
        def_min = datetime.strptime("1900-01-01 00:00:00.000000", format_string)
        def_max = datetime.strptime("9999-12-31 23:59:59.999999", format_string)
        if start_date and end_date:
            date_range = (start_date, end_date)
        elif start_date:
            date_range = (start_date, def_max)
        elif end_date:
            date_range = (def_min, end_date)

        my_timezone = EA_TIMEZONE()
        queryset = queryset.filter(date_joined__range=date_range)


    # Define a mapping from DataTables column index to the corresponding model field
    column_mapping = {
        0: 'id',
        1: 'date_joined',
        2: 'full_name',
        3: 'username',
        4: 'gender',
        5: 'department__id',
        6: 'phone',
        7: 'blocked',
        8: 'description',
    }

    # Apply sorting
    order_column_name = column_mapping.get(order_column_index, 'id')
    if order_dir == 'asc':
        queryset = queryset.order_by(order_column_name)
    else:
        queryset = queryset.order_by(f'-{order_column_name}')

    # Apply individual column filtering
    for i in range(len(column_mapping)):
        column_search = request.POST.get(f'columns[{i}][search][value]', '')
        if column_search:
            column_field = column_mapping.get(i)
            if column_field:
                lookup = f"{column_field}__icontains"
                queryset = queryset.filter(**{lookup: column_search})

    # Apply global search
    if search_value:
        global_search = Q()
        for field in column_mapping.values():
            global_search |= Q(**{f'{field}__icontains': search_value})
        queryset = queryset.filter(global_search)

    # Calculate the total number of records after filtering
    records_filtered = queryset.count()

    # Apply pagination
    queryset = queryset[start:start + length]

    # Calculate row_count based on current page and length
    page_number = start // length + 1
    row_count_start = (page_number - 1) * length + 1

    # JSON response
    data = [
        {
            'count': row_count_start + i,
            'id': user.id,
            'regdate': user.date_joined.strftime('%d-%b-%Y'),
            'fullname': user.full_name,
            'username': user.username,
            'gender': user.gender,
            'dept': user.department.name if user.department else '',
            'phone': user.phone if user.phone else '-',
            'blocked': "Blocked" if user.blocked else "Active",
            'action': ''
        }
        for i, user in enumerate(queryset)
    ]
    response = {
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': records_filtered,
        'data': data,
    }
    return JsonResponse(response)

def doctors_datatable(request, my_timezone):
    draw = int(request.POST.get('draw', 0))
    start = int(request.POST.get('start', 0))
    length = int(request.POST.get('length', 10))
    search_value = request.POST.get('search[value]', '')
    order_column_index = int(request.POST.get('order[0][column]', 0))
    order_dir = request.POST.get('order[0][dir]', 'asc')

    # Base queryset
    queryset = CustomUser.objects.filter(department=4, deleted=0)

    # Count the total records before filtering
    total_records = queryset.count()

    # Regdate date range filtering
    start_date = request.POST.get('reg_mindate')
    end_date = request.POST.get('reg_maxdate')
    format_string = "%Y-%m-%d %H:%M:%S.%f"
    if start_date:
        start_date = datetime.strptime(start_date, format_string).astimezone(my_timezone)
    if end_date:
        end_date = datetime.strptime(end_date, format_string).astimezone(my_timezone)
    if start_date or end_date:
        if start_date and end_date:
            queryset = queryset.filter(date_joined__range=(start_date, end_date))
        elif start_date:
            queryset = queryset.filter(date_joined__lte=start_date)
        elif end_date:
            queryset = queryset.filter(date_joined__gte=end_date)

    # LastLogin date range filtering
    login_start = request.POST.get('login_mindate')
    login_end = request.POST.get('login_maxdate')
    if login_start:
        login_start = datetime.strptime(login_start, format_string).astimezone(my_timezone)
        login_start - timedelta(hours=3)
    if login_end:
        login_end = datetime.strptime(login_end, format_string).astimezone(my_timezone)
        login_end - timedelta(hours=3)
    
    if login_start or login_end:
        if login_start and login_end:
            queryset = queryset.filter(last_login__range=(login_start, login_end))
        elif login_start:
            queryset = queryset.filter(last_login__gte=login_start)
        elif login_end:
            queryset = queryset.filter(last_login__lte=login_end)

    # Define a mapping from DataTables column index to the corresponding model field
    column_mapping = {
        0: 'id',
        1: 'date_joined',
        2: 'last_login',
        3: 'full_name',
        4: 'username',
        5: 'gender',
        6: 'phone',
        7: 'blocked',
        8: 'description',
    }

    # Apply sorting
    order_column_name = column_mapping.get(order_column_index, 'id')
    if order_dir == 'asc':
        queryset = queryset.order_by(order_column_name)
    else:
        queryset = queryset.order_by(f'-{order_column_name}')

    # Apply individual column filtering
    for i in range(len(column_mapping)):
        column_search = request.POST.get(f'columns[{i}][search][value]', '')
        if column_search:
            column_field = column_mapping.get(i)
            if column_field:
                lookup = f"{column_field}__icontains"
                queryset = queryset.filter(**{lookup: column_search})

    # Apply global search
    if search_value:
        global_search = Q()
        for field in column_mapping.values():
            global_search |= Q(**{f'{field}__icontains': search_value})
        queryset = queryset.filter(global_search)

    # Calculate the total number of records after filtering
    records_filtered = queryset.count()

    # Apply pagination
    queryset = queryset[start:start + length]

    # Calculate row_count based on current page and length
    page_number = start // length + 1
    row_count_start = (page_number - 1) * length + 1

    # JSON response
    data = [
        {
            'count': row_count_start + i,
            'id': user.id,
            'regdate': user.date_joined.strftime('%d-%b-%Y'),
            'lastlogin': user.last_login.strftime('%d-%b-%Y %H:%M:%S') if user.last_login else '-',
            'fullname': user.full_name,
            'username': user.username,
            'gender': user.gender,
            'phone': user.phone if user.phone else '-',
            'status': "Blocked" if user.blocked else 'Active',
            'action': ''
        }
        for i, user in enumerate(queryset)
    ]
    response = {
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': records_filtered,
        'data': data,
    }
    return JsonResponse(response)

def tests_datatable(request, dept, my_timezone):
    draw = int(request.POST.get('draw', 0))
    start = int(request.POST.get('start', 0))
    length = int(request.POST.get('length', 10))
    search_value = request.POST.get('search[value]', '')
    order_column_index = int(request.POST.get('order[0][column]', 0))
    order_dir = request.POST.get('order[0][dir]', 'asc')

    # Base queryset
    queryset = Dept_service.objects.filter(dept_id=dept, deleted=0).annotate(names=Lower('name'))

    # Count the total records before filtering
    total_records = queryset.count()

    # Date range filtering
    start_date = request.POST.get('reg_mindate')
    end_date = request.POST.get('reg_maxdate')
    format_string = "%Y-%m-%d %H:%M:%S.%f"
    if start_date:
        start_date = datetime.strptime(start_date, format_string).astimezone(my_timezone)
    if end_date:
        end_date = datetime.strptime(end_date, format_string).astimezone(my_timezone)
    
    if start_date or end_date:
        if start_date and end_date:
            queryset = queryset.filter(addDate__range=(start_date, end_date))
        elif start_date:
            queryset = queryset.filter(addDate__gte=start_date)
        elif end_date:
            queryset = queryset.filter(addDate__lte=end_date)
        

    # Define a mapping from DataTables column index to the corresponding model field
    column_mapping = {
        0: 'id',
        1: 'addDate',
        2: 'names',
        3: 'hidden',
        4: 'price',
        5: 'describe',
    }

    # Apply sorting
    order_column_name = column_mapping.get(order_column_index, 'id')
    if order_dir == 'asc':
        queryset = queryset.order_by(order_column_name)
    else:
        queryset = queryset.order_by(f'-{order_column_name}')

    # Apply individual column filtering
    for i in range(len(column_mapping)):
        column_search = request.POST.get(f'columns[{i}][search][value]', '')
        if column_search:
            column_field = column_mapping.get(i)
            if column_field:
                if i == 4 and column_search != "-":
                    parts = [part.strip() for part in column_search.split("-")]
                    if len(parts) == 2 and (is_number(parts[0]) and is_number(parts[1])):
                        min_price, max_price = map(float, parts)
                        queryset = queryset.filter(Q(price__gte=min_price) & Q(price__lte=max_price))
                    elif len(parts) == 2 and is_number(parts[0]):
                        queryset = queryset.filter(Q(price__gte=float(parts[0])))
                    elif len(parts) == 2 and is_number(parts[1]):
                        queryset = queryset.filter(Q(price__lte=float(parts[1])))
                    elif len(parts) == 1 and is_number(parts[0]):
                        queryset = queryset.filter(Q(price=float(parts[0])))
                elif i == 3:
                    lookup = f"{column_field}__exact"
                    queryset = queryset.filter(**{lookup: column_search})
                else:
                    lookup = f"{column_field}__icontains"
                    queryset = queryset.filter(**{lookup: column_search})

    # Apply global search
    if search_value:
        global_search = Q()
        for field in column_mapping.values():
            global_search |= Q(**{f'{field}__icontains': search_value})
        queryset = queryset.filter(global_search)

    # Calculate the total number of records after filtering
    records_filtered = queryset.count()

    # Apply pagination
    queryset = queryset[start:start + length]

    # Calculate row_count based on current page and length
    page_number = start // length + 1
    row_count_start = (page_number - 1) * length + 1

    # JSON response
    data = [
        {
            'count': row_count_start + i,
            'id': test.id,
            'regdate': test.addDate.strftime('%d-%b-%Y'),
            'names': test.names,
            'status': "Hidden" if test.hidden else "Active",
            'price': '{:,.2f}'.format(test.price)+" TZS",
            'action': ''
        }
        for i, test in enumerate(queryset)
    ]
    response = {
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': records_filtered,
        'data': data,
    }
    return JsonResponse(response)

def medicines_datatable(request, my_timezone):
    draw = int(request.POST.get('draw', 0))
    start = int(request.POST.get('start', 0))
    length = int(request.POST.get('length', 10))
    search_value = request.POST.get('search[value]', '')
    order_column_index = int(request.POST.get('order[0][column]', 3))
    order_dir = request.POST.get('order[0][dir]', 'asc')

    # Base queryset
    queryset = Dept_service.objects.filter(dept_id=2, deleted=0).annotate(names=Lower('name'))

    # Count the total records before filtering
    total_records = queryset.count()

    # Registration date range filter
    start_date = request.POST.get('reg_mindate')
    end_date = request.POST.get('reg_maxdate')
    format_dt = "%Y-%m-%d %H:%M:%S.%f"
    if start_date:
        start_date = datetime.strptime(start_date, format_dt)
    if end_date:
        end_date = datetime.strptime(end_date, format_dt)
    
    if start_date or end_date:
        if start_date and end_date:
            queryset = queryset.filter(addDate__range=(start_date, end_date))
        elif start_date:
            queryset = queryset.filter(addDate__gte=start_date)
        elif end_date:
            queryset = queryset.filter(addDate__lte=end_date)
    
    
    # Expiry date range filter
    exp_start = request.POST.get('exp_mindate')
    exp_end = request.POST.get('exp_maxdate')
    # print(f"{exp_start}-----{exp_end}")
    if exp_start:
        exp_start = datetime.strptime(exp_start, format_dt).strftime("%Y-%m-%d")
    if exp_end:
        exp_end = datetime.strptime(exp_end, format_dt).strftime("%Y-%m-%d")
    
    if exp_start or exp_end:
        if exp_start and exp_end:
            queryset = queryset.filter(expiryDate__range=(exp_start, exp_end))
        elif exp_start:
            queryset = queryset.filter(expiryDate__gte=exp_start)
        elif exp_end:
            queryset = queryset.filter(expiryDate__lte=exp_end)
        

    # Define a mapping from DataTables column index to the corresponding model field
    column_mapping = {
        0: 'id',
        1: 'addDate',
        2: 'expiryDate',
        3: 'names',
        4: 'price',
        5: 'qty',
        6: 'formulation',
        7: 'hidden',
        8: 'describe',

    }

    # Apply sorting
    order_column_name = column_mapping.get(order_column_index, 'id')
    if order_dir == 'asc':
        queryset = queryset.order_by(order_column_name)
    else:
        queryset = queryset.order_by(f'-{order_column_name}')

    # Apply individual column filtering
    for i in range(len(column_mapping)):
        column_search = request.POST.get(f'columns[{i}][search][value]', '')
        if column_search:
            column_field = column_mapping.get(i)
            if column_field:
                if i == 4 and column_search != "-":
                    parts = [part.strip() for part in column_search.split("-")]
                    if len(parts) == 2 and (is_number(parts[0]) and is_number(parts[1])):
                        min_price, max_price = map(float, parts)
                        queryset = queryset.filter(Q(price__gte=min_price) & Q(price__lte=max_price))
                    elif len(parts) == 2 and is_number(parts[0]):
                        queryset = queryset.filter(Q(price__gte=float(parts[0])))
                    elif len(parts) == 2 and is_number(parts[1]):
                        queryset = queryset.filter(Q(price__lte=float(parts[1])))
                    elif len(parts) == 1 and is_number(parts[0]):
                        queryset = queryset.filter(Q(price=float(parts[0])))
                elif i == 5 and column_search != "-":
                    parts = [part.strip() for part in column_search.split("-")]
                    if len(parts) == 2 and (is_number(parts[0]) and is_number(parts[1])):
                        min_price, max_price = map(int, parts)
                        queryset = queryset.filter(Q(qty__gte=min_price) & Q(qty__lte=max_price))
                    elif len(parts) == 2 and is_number(parts[0]):
                        queryset = queryset.filter(Q(qty__gte=int(parts[0])))
                    elif len(parts) == 2 and is_number(parts[1]):
                        queryset = queryset.filter(Q(qty__lte=int(parts[1])))
                    elif len(parts) == 1 and is_number(parts[0]):
                        queryset = queryset.filter(Q(qty=int(parts[0])))
                elif i == 6 or i == 7:
                    lookup = f"{column_field}__exact"
                    queryset = queryset.filter(**{lookup: column_search})
                else:
                    lookup = f"{column_field}__icontains"
                    queryset = queryset.filter(**{lookup: column_search})

    # Apply global search
    if search_value:
        global_search = Q()
        for field in column_mapping.values():
            global_search |= Q(**{f'{field}__icontains': search_value})
        queryset = queryset.filter(global_search)

    # Calculate the total number of records after filtering
    records_filtered = queryset.count()

    # Apply pagination
    queryset = queryset[start:start + length]

    # Calculate row_count based on current page and length
    page_number = start // length + 1
    row_count_start = (page_number - 1) * length + 1

    # JSON response
    data = [
        {
            'count': row_count_start + i,
            'id': med.id,
            'exp': expiry_days(med.expiryDate.strftime('%d-%b-%Y')),
            'regdate': med.addDate.strftime('%d-%b-%Y'),
            'expirydate': med.expiryDate.strftime('%d-%b-%Y'),
            'names': med.names,
            'price': '{:,.2f}'.format(med.price)+" TZS",
            'qty': '{:,}'.format(med.qty),
            'formulation': med.formulation,
            'status': "Hidden" if med.hidden else "Active",
            'action': ''
        }
        for i, med in enumerate(queryset)
    ]
    response = {
        'draw': draw,
        'recordsTotal': total_records,
        'recordsFiltered': records_filtered,
        'data': data,
    }
    return JsonResponse(response)






