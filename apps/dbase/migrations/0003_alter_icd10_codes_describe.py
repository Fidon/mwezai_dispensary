# Generated by Django 4.1.7 on 2024-01-13 22:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dbase', '0002_alter_icd10_codes_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='icd10_codes',
            name='describe',
            field=models.TextField(default=None, null=True),
        ),
    ]