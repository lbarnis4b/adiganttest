{
    'name': 'Project Category',    
    'summary': 'Projects can be categorized',
    'author': 'Soft4biz',
    'category': 'Project',
    'version': '16.0.7.0.0.B20240113',
    'license': "OPL-1",

    'depends': ['project','hr_timesheet'],
    
    'data': [
            'security/ir.model.access.csv',
            'security/accountable_security.xml',
            #'report/s4b_external_layout_standard_wohaf.xml',
            'views/project_project_view.xml',
            'views/project_category_view.xml',
            'views/hr_timesheet_view.xml',
            #'report/report_timesheet_report_ext_detailed.xml',
		    #'report/report_timesheet_report_ext_grouped.xml'		
    ],

    'installable': True,
    'application': True,
    'auto_install': False,
}
