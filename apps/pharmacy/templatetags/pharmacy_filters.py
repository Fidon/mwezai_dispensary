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


@register.filter
def price(value):
    return '{:.0f}'.format(value)


@register.filter
def format_desc(value):
    describe = "" if value == "-" else value
    return describe


@register.filter
def days(value):
    return abs(value)