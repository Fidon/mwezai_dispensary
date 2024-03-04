from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, Group, Permission
from django.utils import timezone
from datetime import timedelta



def def_datetime():
    return timezone.now() + timedelta(hours=3)

# department model
class Department(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    price = models.FloatField(null=True, default=None)
    deleted = models.BooleanField(default = False)
    objects = models.Manager()

    def __str__(self):
        return str(self.name)


# custom user model
class CustomUserManager(BaseUserManager):
    def create_user(self, username, full_name, department, password = None, is_admin = False):
        if not username:
            raise ValueError("The username field must be set")
        if not full_name:
            raise ValueError("The fullname field must be set")
        if department is None:
            raise ValueError("The department field must be set")

        user = self.model(
            username = username,
            full_name = full_name,
            department = department,
            is_admin = is_admin,
        )
        
        user.set_password(password)
        user.save(using = self._db)
        return user
    
    def create_superuser(self, username, full_name, department, password = None):
        user = self.create_user(
            username = username,
            full_name = full_name,
            department = department,
            password = password,
            is_admin = True,
        )
        return user

class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.AutoField(primary_key = True)
    username = models.CharField(unique = True, max_length = 150)
    full_name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    phone = models.CharField(max_length=10, null=True, default=None)
    blocked = models.BooleanField(default = False)
    is_admin = models.BooleanField(default = False)
    last_login = models.DateTimeField(null = True, default=None)
    date_joined = models.DateTimeField(default=def_datetime)
    password_changed = models.BooleanField(default = False)
    description = models.TextField(null=True, default=None)
    deleted = models.BooleanField(default = False)
    gender = models.CharField(max_length=1, default='M')
    groups = models.ManyToManyField(Group, blank = True, related_name = 'custom_users')
    user_permissions = models.ManyToManyField(Permission, blank = True, related_name = 'custom_users')
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['full_name', 'department']
    
    def __str__(self):
        return str(self.full_name)
    

# department_service model
class Dept_service(models.Model):
    id = models.AutoField(primary_key=True)
    dept = models.ForeignKey(Department, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    price = models.FloatField()
    formulation = models.CharField(max_length=100, null=True, default=None)
    qty = models.PositiveIntegerField(null=True, default=None)
    describe = models.TextField(null=True, default=None)
    addDate = models.DateTimeField(default=def_datetime)
    registrar = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    expiryDate = models.DateField(null=True, default=None)
    lastEdited = models.DateTimeField(default=def_datetime)
    deleted = models.BooleanField(default = False)
    hidden = models.BooleanField(default = False)
    objects = models.Manager()

    def __str__(self):
        return str(self.name)
    

# Patient model
class Patient(models.Model):
    id = models.AutoField(primary_key=True)
    fileNumber = models.CharField(max_length=8, unique=True)
    fullname = models.CharField(max_length=255)
    birthDate = models.DateField()
    gender = models.CharField(max_length=6)
    address = models.TextField()
    contact = models.CharField(max_length=10, null=True, default=None)
    comment = models.TextField(null=True, default=None)
    religion = models.CharField(max_length=15, null=True, default=None)
    marital = models.CharField(max_length=30, null=True, default=None)
    occupation = models.CharField(max_length=150, null=True, default=None)
    registrar = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    regDate = models.DateTimeField(default=def_datetime)
    lastVisit = models.DateTimeField(default=def_datetime)
    deleted = models.BooleanField(default = False)
    objects = models.Manager()

    def __str__(self):
        return str(self.fullname)
    

# Patient_vitals model
class Patient_vitals(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    bloodPressure = models.CharField(max_length=15)
    temperature = models.FloatField()
    heartRate = models.FloatField()
    weight = models.FloatField()
    saturation = models.FloatField()
    add_date = models.DateTimeField(default=def_datetime)
    registrar = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    objects = models.Manager()

    def __str__(self):
        return str(self.id)


# patient_service model
class Patient_service(models.Model):
    id = models.AutoField(primary_key=True)
    service_date = models.DateTimeField(default=def_datetime)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    service = models.ForeignKey(Dept_service, on_delete=models.PROTECT, null=True, default=None)
    doctor_service = models.BooleanField(null=True, default=False)
    doctor = models.ForeignKey(CustomUser, on_delete=models.PROTECT, null=True, default=None, related_name='doctor_services')
    costEach = models.FloatField()
    pay_status = models.CharField(max_length=12, default='cash')
    comp_status = models.CharField(max_length=50, default='waiting')
    md_qty = models.PositiveIntegerField(null=True, default=None)
    md_formulation = models.CharField(max_length=100, null=True, default=None)
    md_dosage = models.TextField(null=True, default=None)
    registrar = models.ForeignKey(CustomUser, on_delete=models.PROTECT, null=True, default=None)
    objects = models.Manager()

    def __str__(self):
        return str(self.service)
    

# test_results model
class Test_results(models.Model):
    id = models.AutoField(primary_key=True)
    result_date = models.DateTimeField(default=def_datetime)
    seen_date = models.DateTimeField(default=def_datetime)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    doctor = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    patient_test = models.ForeignKey(Patient_service, on_delete=models.PROTECT)
    micro = models.TextField(null=True, default=None)
    macro = models.TextField(null=True, default=None)
    report = models.TextField(null=True, default=None)
    rows = models.JSONField(null=True, default=None)
    new_tests = models.JSONField(null=True, default=None)
    status = models.CharField(max_length=50, default='pending')
    objects = models.Manager()

    def __str__(self):
        return str(self.id)


# diagnosis_results model
class Diagnosis(models.Model):
    id = models.AutoField(primary_key=True)
    diagnosis_date = models.DateTimeField(default=def_datetime)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    doctor = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    d_chief = models.TextField(null=True, default=None)
    d_assess = models.TextField(null=True, default=None)
    rev_systems = models.JSONField(null=True, default=None)
    pat_history = models.JSONField(null=True, default=None)
    fam_history = models.JSONField(null=True, default=None)
    physical_exam = models.JSONField(null=True, default=None)
    icd_codes = models.JSONField(null=True, default=None)
    tests = models.JSONField(null=True, default=None)
    objects = models.Manager()

    def __str__(self):
        return str(self.id)


# patient_credit model
class Patient_credit(models.Model):
    id = models.AutoField(primary_key=True)
    credit_date = models.DateTimeField(default=def_datetime)
    patient = models.OneToOneField(Patient, on_delete=models.PROTECT)
    amount = models.FloatField()
    use_date = models.DateTimeField(null=True, default=None)
    objects = models.Manager()

    def __str__(self):
        return str(self.id)


# ICD-10 model
class ICD10_codes(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=15)
    describe = models.TextField(null=True, default=None)
    deleted = models.BooleanField(null=True, default=False)
    objects = models.Manager()

    def __str__(self):
        return str(self.code)


# tools requests model
class Tool_requests(models.Model):
    id = models.AutoField(primary_key=True)
    request_date = models.DateTimeField(default=def_datetime)
    serve_date = models.DateTimeField(null=True, default=None)
    person = models.ForeignKey(CustomUser, on_delete=models.PROTECT)
    dept = models.ForeignKey(Department, on_delete=models.PROTECT)
    tool = models.ForeignKey(Dept_service, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField(null=True, default=None)
    status = models.CharField(max_length=50, default='pending')
    describe = models.TextField(null=True, default=None)
    objects = models.Manager()

    def __str__(self):
        return str(self.id)
