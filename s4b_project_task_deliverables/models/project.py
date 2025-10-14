# -*- coding: utf-8 -*-

from odoo import api, fields, models
from odoo.exceptions import ValidationError

# You can add task fields to this list, to be restrictive for making a template.
# NOT_VALID_TASK_FIELDS = ['timesheet_ids','stock_move_ids','analytic_line_ids']

class Task(models.Model):
	_name = "project.task"
	_inherit = "project.task"

	deliverables_ids = fields.One2many('project.task.deliverables','task_id',string='Deliverables', copy=True)

	@api.model
	def deliverable_alerts(self):
		tasks = self.env['project.task'].search([('active','=',True)])
		for task in tasks:
			if task.deliverables_ids:
				for deliv in task.deliverables_ids:
					if deliv.alert_alive and not deliv.finalized:
						deliv.mail_reminder(deliv.id)

	# Template stuff

# class Project(models.Model):
# 	_name = "project.project"
# 	_inherit = "project.project"

# 	@api.one
# 	def template_button(self):
# 		if not self.is_template and self._check_tasks_validity(NOT_VALID_TASK_FIELDS):
# 			raise ValidationError('Project/Tasks have some detail field on them (timesheet, material, etc). You cannot make this Project a Template.')
# 		else:
# 			self.is_template = not self.is_template	

# 	@api.multi
# 	def copy_template(self):
# 		for project in self:
# 			if project._check_tasks_validity(NOT_VALID_TASK_FIELDS):
# 					project.update({'is_template' : False})
# 			if not project.is_template:
# 				raise ValidationError("Project is not a template! Set as template and try again!")
# 			else:
# 				new_project = project.copy()
# 				tasks = self.env['project.task'].search([('project_id','=',new_project.id)])
# 				for task in tasks:
# 					delivs = self.env['project.task.deliverables'].search([('task_id','=',task.id)])
# 					for deliv in delivs:
# 						deliv.update_project()
# 				return new_project
