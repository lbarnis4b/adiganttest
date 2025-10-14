# -*- coding: utf-8 -*-
{
	'name': "Project archive",

	'summary': """
			Archive analytic account when project is archived""",

	'author': "Soft4Biz",
	# 'website': "https://soft4biz.ro",
	'category': 'Uncategorized',
	'version': '10.0.1.0.0',
	'license': "LGPL-3",
	
	'depends': ['project','analytic'],

	# always loaded
	'data': [
		'views/project_views.xml',
	],

	'installable': True,
	'auto_install': False,
	'application': False,
}