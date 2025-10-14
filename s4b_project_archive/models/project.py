# -*- coding: utf-8 -*-

from odoo import api, models, fields

class Project(models.Model):
	_name = "project.project"
	_inherit = "project.project"

	@api.onchange('active')
	def analytic_deactivate(self):
		for project in self:
			if project.analytic_account_id:
				# project.analytic_account_id.active = project.active
				project.analytic_account_id.sudo().update({'active':project.active})

	def write(self,vals):
		if 'active' in vals:
			self.analytic_account_id.sudo().update({'active':vals['active']})
		return super(Project,self).write(vals)

