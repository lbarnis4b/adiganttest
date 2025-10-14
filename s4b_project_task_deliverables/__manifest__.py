# -*- coding: utf-8 -*-
{
	'name': "Project Task Deliverables",

	'summary': """
			Deliverable documents regarding task""",

	'author': "Soft4Biz",
	#'website': "http://soft4biz.ro",
	'category': 'Uncategorized',
	'version': '16.0.6.1.0',
	'license': "LGPL-3",
	

	# any module necessary for this one to work correctly
	'depends': [
		'base',
		'project',
		# 's4b_project_template',
		],

	# always loaded
	'data': [
		'security/ir.model.access.csv',
		'data/email.xml',
		'views/project_views.xml',
		'views/deliverables.xml'
	],

	'installable': True,
	'auto_install': False,
	'application': False,
}