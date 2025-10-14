# -*- coding: utf-8 -*-
{
    "name": """Gantt Native view for MRP - Manufacture""",
    "summary": """One price = web_gant_native, project_native, project_native_report_advance, project_native_exchange hr_holidays_gantt_native, mrp_gantt_native""",
    "category": "Project",
    "images": ['static/description/icon.png'],
    "version": "16.23.11.25.0",
    "description": """
        update: python 3.6.3 and click to gantt line
        Update3: date_planned_finished make visible
        Update4: Gantt in Dashboard.
        Update: Fix MRP readonly.
        Update: 12.0.
        Update: Sorting and Deadline
    """,
    "author": "Viktor Vorobjov",
    "license": "OPL-1",
    "website": "https://straga.github.io",
    "support": "vostraga@gmail.com",
    "live_test_url": "https://demo15.garage12.eu",

    "depends": [
        "mrp",
        "web_gantt_native",
    ],
    "external_dependencies": {"python": [], "bin": []},
    "data": [
        'views/mrp_production_view.xml',
        'views/mrp_workorder_view.xml',
        'views/mrp_workcenter_views.xml',
        'views/mrp_workcenter_productivity.xml',
        'security/ir.model.access.csv',
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