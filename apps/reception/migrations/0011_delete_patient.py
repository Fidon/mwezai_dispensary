# Generated by Django 4.1.7 on 2023-09-18 06:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reception', '0010_patient_regdate_alter_patient_lastvisit'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Patient',
        ),
    ]