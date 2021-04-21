import markdown


def parse_help():
    with open('app/templates/help.md') as f:
        help_md = f.read()
    help_html = markdown.markdown(help_md)
    return help_html


