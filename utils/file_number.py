import random
import string
from apps.dbase.models import Patient


# generate file number
def filenumber():
    alphabet = string.ascii_uppercase  # A to Z
    for letter in alphabet:
        file_number = letter + ''.join(random.choice(string.digits) for _ in range(4))
        if not Patient.objects.filter(fileNumber=file_number).exists():
            return file_number
    return None


