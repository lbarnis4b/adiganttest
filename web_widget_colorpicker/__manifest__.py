# -*- coding: utf-8 -*-
{
    "name": """Web Widget Colorpicker""",
    "summary": """Added Color Picker for From""",
    "category": "web",
    "images": ['static/description/icon.png'],
    "version": "16.0.250210.1",
    "description": """
            
            For Form View - added = widget="colorpicker"
            
            ...
            <field name="arch" type="xml">
                <form string="View name">
                    ...
                    <field name="colorpicker" widget="colorpicker"/>
                    ...
                </form>
            </field>
            ...

    """,

    "author": "Viktor Vorobjov",
    "license": "LGPL-3",
    "website": "https://straga.github.io",
    "support": "vostraga@gmail.com",
    "price": 0.00,
    "currency": "EUR",

    "depends": [
        "web"
    ],
    "external_dependencies": {"python": [], "bin": []},
    "data": [
    ],
    "demo": [],

    'assets': {
        'web.assets_backend': [
            # Libraries
            '/web_widget_colorpicker/static/src/lib/bootstrap-colorpicker/css/bootstrap-colorpicker.min.css',
            '/web_widget_colorpicker/static/src/lib/bootstrap-colorpicker/js/bootstrap-colorpicker.min.js',
            
            # Legacy widget (должен загружаться до использования)
            '/web_widget_colorpicker/static/src/js/legacy_color_picker_field.js',
            '/web_widget_colorpicker/static/src/xml/color_picker_field.xml',
            
            # Modern OWL widget
            '/web_widget_colorpicker/static/src/js/color_picker_field.js',
            '/web_widget_colorpicker/static/src/js/color_picker_field.xml',
        ],
    },

    "post_load": None,
    "pre_init_hook": None,
    "post_init_hook": None,
    "installable": True,
    "auto_install": False,
    "application": False,
}
