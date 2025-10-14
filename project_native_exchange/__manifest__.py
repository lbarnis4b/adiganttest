# -*- coding: utf-8 -*-
{
    "name": """Gantt Native Exchange for Project""",
    "summary": """One price = web_gant_native, project_native, project_native_report_advance, project_native_exchange hr_holidays_gantt_native, mrp_gantt_native""",
    "category": "Project",
    "images": ['static/description/icon.png'],
    "version": "16.23.08.24.0",
    "description": """
        One price = web_gant_native
        project_native
        project_native_report_advance
        project_native_exchange 
        hr_holidays_gantt_native
        mrp_gantt_native

    """,
    "author": "Viktor Vorobjov",
    "license": "OPL-1",
    "website": "https://straga.github.io",
    "support": "vostraga@gmail.com",
    "live_test_url": "https://demo15.garage12.eu",

    "depends": [
        "project",
        "project_native",
        "web_gantt_native",
    ],
    "external_dependencies": {"python": [], "bin": []},
    "data": [
        'security/security.xml',
        'security/ir.model.access.csv',
        'wizard/project_native_exchange_view.xml',
    ],
    "qweb": [],
    "demo": [],

    "post_load": None,
    "pre_init_hook": None,
    "post_init_hook": None,
    "installable": True,
    "auto_install": False,
    "application": False,
}