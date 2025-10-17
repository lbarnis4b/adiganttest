# -*- coding: utf-8 -*-
{
    "name": """Gantt Native Web view""",
    "summary": """One price = web_gant_native, project_native, project_native_report_advance, project_native_exchange hr_holidays_gantt_native, mrp_gantt_native""",
    "category": "Project",
    "images": ['static/description/banner.gif'],
    "version": "16.0.25.0904.00",
    "description": """
        Main Module for Gantt Native

    """,

    "author": "Viktor Vorobjov",
    "license": "OPL-1",
    "website": "https://www.youtube.com/watch?v=xbAoC_s5Et0&list=PLmxcMU6Ko0NkqpGLcC44_GXo3_41pyLNx",
    "support": "vostraga@gmail.com",
    "live_test_url": "https://demo17.garage12.eu",
    "price": 299.00,
    "currency": "EUR",

    "depends": [
        "web", "web_widget_time_delta"
    ],
    "external_dependencies": {"python": [], "bin": []},
    "data": [
    ],
    "qweb": [
    ],
    "demo": [],
    'assets': {
        'web.assets_backend': [
            'web_gantt_native/static/src/**/*.js',
            'web_gantt_native/static/src/**/*.xml',
            #'web_gantt_native/static/src/**/*.scss',
            'web_gantt_native/static/src/**/*.css',
        ],

    },

    "post_load": None,
    "pre_init_hook": None,
    "post_init_hook": None,
    "installable": True,
    "auto_install": False,
    "application": False,
}
