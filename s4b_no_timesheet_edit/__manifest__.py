# -*- encoding: utf-8 -*-
{
	'name': 'No timesheet amount',
	'version': '16.0.1.0.0',
	'author' : 'Soft4Biz',
	#'website' : 'https://soft4biz.ro',
	'summary': """Timesheet amount is only visible to HR managers.""",
	'license': "LGPL-3",

	'depends': [
		'project', 
		'hr_timesheet',
	],

	'data': [
		'views/project_view.xml',
		'views/hr_timesheet_views.xml',
	],
	'installable': True,
	'auto_install': False,
}
