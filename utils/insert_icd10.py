import os
from apps.dbase.models import ICD10_codes
import re

script_directory = os.path.dirname(os.path.abspath(__file__))
data_file_path = os.path.join(script_directory, 'icd10cm_codes_2022.txt')

def insert_icd():
    success = True
    with open(data_file_path, 'r') as file:
        lines = file.readlines()

    for line in lines:
        parts = re.split(r'\s+', line.strip(), 1)
        if len(parts) == 2:
            code, description = parts
            exist_code = ICD10_codes.objects.filter(code=code).exists()
            if not exist_code:
                icd_code = ICD10_codes(code=code, describe=description)
                icd_code.save()
                print(f"Added code: {code}")
        else:
            success = False

    return success
