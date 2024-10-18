from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from utils.insert_icd10 import insert_icd
from django.http import HttpResponseForbidden


@login_required
def signout(request):
    if request.user.is_authenticated:
        logout(request)
        return JsonResponse({'message': '200'})
    return JsonResponse({'message': '405'})


def add_icd_codes(request):
    icd = insert_icd()
    if icd:
        print(f"All codes added successfully!")
    return JsonResponse({'message': 'All codes added successfully!'})

def error_404(request, exception):
    return render(request, '404.html', status=404)

def error_403(request):
    return render(request, '403.html')