# Generated by Django 4.1.7 on 2024-01-13 22:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dbase', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='icd10_codes',
            name='id',
            field=models.AutoField(primary_key=True, serialize=False),
        ),
    ]
