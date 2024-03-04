from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from apps.dbase.forms import CustomAuthenticationForm


# Render login page
@never_cache
def auth(request):
    if request.user.is_authenticated:
        dept = request.user.department_id
        link = ""
        if dept == 1:
            link = "/reception"
        elif dept == 2:
            link = "/pharmacy"
        elif dept == 3:
            link = "/labolatory"
        elif dept == 4:
            link = "/doc"
        elif dept == 5:
            link = "/ultrasound"
        elif dept == 6:
            link = "/procedure"
        elif dept == 7:
            link = "/manage"
        response = redirect(link)
        response.set_cookie('uu_iid', request.user.username)
        return response
    return render(request, 'users/auth.html')


# User login
def user_auth(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None and not user.blocked:
                login(request, user)
                dept = user.department_id
                link = ""
                if dept == 1:
                    link = "/reception"
                elif dept == 2:
                    link = "/pharmacy"
                elif dept == 3:
                    link = "/labolatory"
                elif dept == 4:
                    link = "/doc"
                elif dept == 5:
                    link = "/ultrasound"
                elif dept == 6:
                    link = "/procedure"
                elif dept == 7:
                    link = "/manage"
                response = JsonResponse({'success': True, 'page': link})
                response.set_cookie('uu_iid', user.username)
        else:
            response = JsonResponse({'success': False, 'sms': form.errors['__all__'][0], 'error':form.errors})
        return response
