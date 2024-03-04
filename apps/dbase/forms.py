from django import forms
from django.utils import timezone
from .models import Patient, Dept_service, Patient_service
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate


# customuser form
class CustomUserForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ['department', 'full_name', 'username', 'gender', 'phone', 'description']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['phone'].required = False
        self.fields['description'].required = False

    def clean_username(self):
        username = self.cleaned_data['username']
        User = get_user_model()
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("This username is already in use.")
        return username
    
    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone and (not phone.isdigit() or len(phone) != 10):
            raise forms.ValidationError("Please enter a 10-digit phone number.")
        
        User = get_user_model()
        if phone and User.objects.filter(phone=phone).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError("This phone number is associated with another user account.")
        return phone

    def save(self, commit=True):
        user = super().save(commit=False)
        username = self.cleaned_data['username'].upper()
        user.set_password(username)
        if commit:
            user.save()
        return user


# User authentication form
class CustomAuthenticationForm(AuthenticationForm):
    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if user is None:
                raise forms.ValidationError("Incorrect username or password.")
            if user.blocked:
                raise forms.ValidationError("Account blocked, contact your admin.")
            if user.deleted:
                raise forms.ValidationError("Invalid account, contact your admin.")

        return self.cleaned_data



# department_service form
class DeptserviceForm(forms.ModelForm):
    class Meta:
        model = Dept_service
        fields = ['dept', 'name', 'price', 'describe', 'formulation', 'qty', 'expiryDate']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['expiryDate'].required = False
        self.fields['describe'].required = False
        self.fields['formulation'].required = False
        self.fields['qty'].required = False



# Patient form
class PatientForm(forms.ModelForm):
    class Meta:
        model = Patient
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['marital'].required = False
        self.fields['occupation'].required = False
        self.fields['religion'].required = False
        self.fields['fileNumber'].required = False
        self.fields['regDate'].required = False
        self.fields['registrar'].required = False
        self.fields['comment'].required = False
        self.fields['regDate'].required = False
        self.fields['lastVisit'].required = False

