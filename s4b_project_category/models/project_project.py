from odoo import api, models, fields, SUPERUSER_ID, _
from odoo.exceptions import Warning,ValidationError


class Project(models.Model):
	_inherit = "project.project"

	@api.model
	def _read_group_category_ids(self, category, domain, order):
		search_domain = [('id', 'in', category.ids)]
		if 'default_project_id' in self.env.context:
			search_domain = ['|', ('project_ids', '=', self.env.context['default_project_id'])] + search_domain

		category_ids = category._search(search_domain, order=order, access_rights_uid=SUPERUSER_ID)
		return category.browse(category_ids)


	project_category_id = fields.Many2one("project.task.category", string="Project Category", ondelete="restrict",
		group_expand='_read_group_category_ids', domain=[('category_type','=','project')])
	color = fields.Integer(string='Color', default = 0, related="project_category_id.color", readonly=True)


class Task(models.Model):
	_inherit = "project.task"

	project_category_id = fields.Many2one("project.task.category", string="Project Category", ondelete="restrict", related="project_id.project_category_id")
	task_category_id = fields.Many2one("project.task.category", string="Task Category", ondelete="restrict", domain=[('category_type','=','task')])
	color = fields.Integer(string='Color', default = 0, related="task_category_id.color", readonly=True)
	# start_date = fields.Datetime(string='Start Date')
	# end_date = fields.Datetime(string='End Date')

	# @api.onchange('parent_id')
	# def inherit_parent_category(self):
	# 	if self.parent_id and self.parent_id.task_category_id and not self.task_category_id:
	# 		self.task_category_id = self.parent_id.task_category_id

	# @api.model
	# def create(self, vals):
    #     # Check if the task has a parent task
	# 	if vals.get('parent_id'):
	# 		parent_task = self.env['project.task'].browse(vals['parent_id'])
    #         # Set the start_date and end_date to match the parent task's dates
	# 		vals['start_date'] = parent_task.start_date
	# 		vals['end_date'] = parent_task.end_date
	# 	return super(Task, self).create(vals)

	# def write(self, vals):
    #     # If the parent task's start_date or end_date is updated
	# 	if 'start_date' in vals or 'end_date' in vals:
	# 		for task in self:
	# 			# Update all subtasks with the new start_date or end_date
	# 			if task.child_ids:
	# 				start_date = vals.get('start_date', task.start_date)
	# 				end_date = vals.get('end_date', task.end_date)
	# 				task.child_ids.write({
	# 					'start_date': start_date,
	# 					'end_date': end_date
	# 				})
	# 	if 'parent_id' in vals:
	# 		parent_task = self.env['project.task'].browse(vals['parent_id'])
	# 		vals['start_date'] = parent_task.start_date
	# 		vals['end_date'] = parent_task.end_date

	# 	return super(Task, self).write(vals)
	

class AccountAnalyticLine(models.Model):
	_inherit = 'account.analytic.line'

	task_category_id = fields.Many2one('project.task.category', string='Task category', related='task_id.task_category_id', store=True)
	accountable_amount = fields.Float(string=_('Accountable Amount'), default=0.0)
