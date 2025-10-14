# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError
from datetime import datetime, date

import logging
_logger = logging.getLogger(__name__)

class TaskDeliverablesType(models.Model):
	_name= "project.task.deliverables.type"

	name = fields.Char(string='Type',required=True)
	color = fields.Integer(string='Colour Index', required=True, size=1, default=0,
						   help="White : 0,Grey : 1,Pink :2,Yellow :3,Light Green : 4 ,Light Blue :5,"
								"Sky Blue : 6, Light Orange : 7,Purple: 8,Light Purple: 9")

	_sql_constraints = [
		('project_task_deliverables_type_unique', 'unique(name)', 'Must be unique.'),
	]

class TaskDeliverablesStage(models.Model):
	_name= "project.task.deliverables.stage"

	name = fields.Char(string='Stage',required=True)
	is_final = fields.Boolean(string='Final',required=True,default=False)
	color = fields.Integer(string='Colour Index', required=True, size=1, default=0,
						   help="White : 0,Grey : 1,Pink :2,Yellow :3,Light Green : 4 ,Light Blue :5,"
								"Sky Blue : 6, Light Orange : 7,Purple: 8,Light Purple: 9")

	_sql_constraints = [
		('project_task_deliverables_stage_unique', 'unique(name)', 'Must be unique.'),
	]

	def final_on_off(self):
		for line in self:
			if line.is_final:
				line.is_final = False
			else:
				other_final = self.env['project.task.deliverables.stage'].search([('is_final','=',True)])
				if other_final:
					raise ValidationError(_('You already have a final stage. Deactivate that first, than you can set this one to final.'))
				else:
					line.is_final = True

class TaskDeliverables(models.Model):
	_name = "project.task.deliverables"

	def _get_default_resp_id(self):
		if self.task_id.user_ids:
			return self.task_id.user_ids[0]
		return None

	name = fields.Char(string='Description',required=True,copy=True)
	responsible = fields.Many2one('res.users', string='Responsible',default=_get_default_resp_id,copy=True)
	project_id = fields.Many2one('project.project',string='Project',copy=False)
	task_id = fields.Many2one('project.task',string='Task',required=True,ondelete='cascade',domain="[('project_id', '=', project_id)]",copy=False)
	planned_date = fields.Date(string="Planned delivery",copy=False)
	delivery_date = fields.Date(string="Delivery date",copy=False)
	comment = fields.Text(string='Comment',copy=True)
	deliverable_type_id = fields.Many2one('project.task.deliverables.type',string='Type',copy=True)
	deliverable_stage_id = fields.Many2one('project.task.deliverables.stage',string='Stage',copy=False)
	alert_alive = fields.Boolean(string='Alert active',required=True,default=False,readonly=True,copy=False)
	alert_date = fields.Date(string="Alert date",copy=False)
	finalized = fields.Boolean(string='Finalized',related='deliverable_stage_id.is_final',copy=False)
	active = fields.Boolean(string='Active',related='task_id.active',copy=False)

	# alert on/off button - error if you want to turn it on, and dont have alert_date
	def alive_on_off(self):
		for deliv in self:
			if deliv.alert_alive:
				deliv.alert_alive = False
			else:
				if deliv.alert_date:
					deliv.alert_alive = True
				else:
					raise ValidationError(_('You cannot activate an alert if you do not set an Alert date. Please set Alert date first.'))

	# if task_id changes, chages project_id too
	@api.depends('task_id')
	def update_project(self):
		for line in self:
			task = self.env['project.task'].search([('id','=',line.task_id.id)])
			line.update({
			 'project_id' : task.project_id.id
			 })

	# On create writes project_id and responsible, if it is not given.
	@api.model
	def create(self,vals):
		if 'task_id' in vals:
			task = self.env['project.task'].search([('id','=',vals.get('task_id'))])
			vals['project_id'] = task.project_id.id
			if 'responsible' not in vals:
				vals['responsible'] = task.user_ids[0].id or None
		if vals.get('alert_date'):
			vals['alert_alive'] = True
		elif 'alert_date' in vals:
			vals['alert_alive'] = False
		result = super(TaskDeliverables,self).create(vals)
		return result

	def write(self,vals):
		if 'task_id' in vals:
			task = self.env['project.task'].search([('id','=',vals.get('task_id'))])
			vals['project_id'] = task.project_id.id
		if vals.get('alert_date'):
			vals['alert_alive'] = True
		elif 'alert_date' in vals:
			vals['alert_alive'] = False
		result = super(TaskDeliverables,self).write(vals)
		return result

	# Server action for updating project ids.
	def update_project_ids(self):
		delivs = self.env['project.task.deliverables'].browse(self._context.get('active_ids', []))
		for deliv in delivs:
			if deliv.task_id:
				deliv.update_project()

	@api.model
	def mail_reminder(self,deliv_id):
		today = date.today()
		deliv = self.env['project.task.deliverables'].search([('id','=',deliv_id)])
		# daymonth = datetime.strptime(deliv.alert_date, "%Y-%m-%d")
		daymonth = deliv.alert_date
		if (today >= daymonth):
			self.send_alert(deliv)
		return

	@api.model
	def send_alert(self,deliv):
		# su_id = self.env['res.partner'].browse(SUPERUSER_ID)
		template = self.env['ir.model.data'].search([('module', '=', 's4b_project_task_deliverables'), ('name', '=', 'deliv_alert')])
		template_id = template.res_id
		#template_id = self.env['ir.model.data'].get_object_reference('s4b_project_task_deliverables','deliv_alert')[1]
		template_browse = self.env['mail.template'].browse(template_id)
		#user = self.env['alert'].browse(alert)
		email_to = deliv.responsible.partner_id.email
		email_from = deliv.task_id.project_id.user_id.partner_id.email or 'admin@soft4biz.ro'
		if not email_to and not email_from:
			_logger.info(f"Delivery alert cannot be sent: There is no to or from email address.")
			return False

		if template_browse:

			body = template_browse.body_html

			values = {
				'subject': deliv.name,
				'body_html': body,
				'email_to': email_to,
				'email_from' : email_from,
			}

			mail_values = template_browse.generate_email(self.id, fields=values)

			mail_values['email_to'] = email_to
			mail_values['email_from'] = email_from

			mail = self.env['mail.mail'].create(mail_values)
			mail.send()
			_logger.info(f"Delivery alert {deliv.name} mail sent to: {email_to}")
			return True	
