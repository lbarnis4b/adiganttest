from odoo import models, fields, _


class ProjectCategory(models.Model):
	_name = 'project.task.category'

	name = fields.Char(string="Category", required=True)
	color = fields.Integer('Colour Index', required=True,
							   help="White : 0,Grey : 1,Pink :2,Yellow :3,Light Green : 4 ,Light Blue :5,"
									"Sky Blue : 6, Light Orange : 7,Purple: 8,Light Purple: 9")
	active = fields.Boolean(string="Active")
	project_ids = fields.One2many('project.project','project_category_id',string="Projects")
	task_ids = fields.One2many('project.task','task_category_id',string="Tasks")
	fold = fields.Boolean(string='Folded in Kanban',
		help='This category is folded in the kanban view when there are no records in that stage to display.')
	category_type = fields.Selection([('project','Project'),('task','Task')],string='CategoryType',required=True,default='task')

	task_type_group = fields.Selection([
		('imp','Implementation'),
		('dev','Development'),
		('int','Internal'),
		('eval','Evaluation'),
		],string='Task Type Group',required=False)

	accountability = fields.Float(string='Accountability', help="What proportion of the hours can be accounted. Number between 0 and 1",default=1)

	odoo10_id = fields.Integer(string="Odoo10 id",help="This is for migrating reasons")

	_sql_constraints = [
		('category_name_uniq', 'unique(name)', _('Category name must be unique!')),
	]
