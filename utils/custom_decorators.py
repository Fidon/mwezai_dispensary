from functools import wraps
from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseForbidden

# def dept_required(dept_id):
#     def decorator(view_func):
#         @wraps(view_func)
#         def _wrapped_view(request, *args, **kwargs):
#             user = request.user
#             if user.is_authenticated and str(user.department_id) in dept_id:
#                 return view_func(request, *args, **kwargs)
#             return HttpResponseForbidden()
#         return _wrapped_view
#     return decorator


def dept_required(dept_id):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = request.user
            if user.is_authenticated and str(user.department_id) in dept_id:
                return view_func(request, *args, **kwargs)
            return redirect(reverse('access_denied'))
        return _wrapped_view
    return decorator
