from django import template

register = template.Library()

@register.filter
def format_number(value):
    if isinstance(value, float):
        formatted_value = '{:,.0f}'.format(value)
    elif isinstance(value, int):
        formatted_value = '{:,}'.format(value)
    else:
        formatted_value = value
    return formatted_value

