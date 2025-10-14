# -*- encoding: utf-8 -*-
{
	'name': 'Task Start Stop Upgraded',
	'version': '16.0.4.2.0.B20250116',
	'author' : 'Soft4Biz',
	#'website' : 'https://soft4biz.ro',
	'summary': """Project Task Start Stop functionality for multiple users.""",
	'license': "LGPL-3",

	'depends': [
		'project', 
		'hr_timesheet',
		'base',
		#'s4b_timesheet_work_type'
	],
	#'category': 'Project Management',
	'data': [
		'security/ir.model.access.csv',
		# 'data/work_type.xml',
		'views/project_view.xml',
		'views/hr_timesheet_views.xml',
	],
	'images': [
		'static/description/tasks_start_stop_kanban_cover_almightycs.png',
	],
	'installable': True,
	'auto_install': False,
}
