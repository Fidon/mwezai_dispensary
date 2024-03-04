from datetime import datetime
import pytz



def find_age(bdate):
    timezone_eat = pytz.timezone("Africa/Dar_es_Salaam")
    birthdate = timezone_eat.localize(datetime.strptime(bdate, "%Y-%m-%d"))
    current_date = datetime.now(timezone_eat)

    years = current_date.year - birthdate.year
    months = current_date.month - birthdate.month
    if current_date.day < birthdate.day:
        months -= 1
    if months < 0:
        years -= 1
        months += 12
    
    return f"{years}.{months}"
