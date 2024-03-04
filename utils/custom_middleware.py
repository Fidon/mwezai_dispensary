from datetime import datetime, timedelta
from django.contrib.auth import logout

class Inactivity_logout_middleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        if user.is_authenticated:
            last_activity = request.session.get('last_activity')
            if last_activity:
                last_activity_time = datetime.strptime(last_activity, '%Y-%m-%d %H:%M:%S.%f')
                if datetime.now() - last_activity_time > timedelta(minutes=10):
                    logout(request)

            request.session['last_activity'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')

        response = self.get_response(request)
        return response
