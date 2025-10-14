# -*- coding: utf-8 -*-

from openerp import fields, models, api, _
from openerp.exceptions import UserError, ValidationError
from datetime import datetime, timedelta
import time

class Users(models.Model):
	_inherit = 'res.users'

	def _time_count(self):
		
		def format_time(seconds):
			return str(timedelta(seconds=seconds))

		for rec in self:
			if rec.chrono_date_start and not rec.start_stop:
				datetime_diff = datetime.now() - rec.chrono_date_start
				rec.count_time = format_time(datetime_diff.seconds)
				# hrs = datetime_diff.seconds / 3600
				# mins = datetime_diff.seconds % 3600 / 60
				# rec.time_count = "%s:%s" % (hrs, mins)
			else:
				rec.time_count = "0.0"

	def get_count_time(self):

		def format_time(seconds):
			return str(timedelta(seconds=seconds))


		for rec in self:
			if rec.chrono_date_start and rec.start_stop:
				datetime_diff = datetime.now() - rec.chrono_date_start
				rec.count_time = format_time(datetime_diff.seconds)
				# hrs = datetime_diff.seconds / 3600
				# mins = datetime_diff.seconds % 3600 / 60
				# secs = datetime_diff.seconds % 60
				# if hrs < 10:
				# 	hours = "0" + str(hrs)
				# else:
				# 	hours = str(hrs)
				# if mins < 10:
				# 	minutes = "0" + str(mins)
				# else:
				# 	minutes = str(mins)
				# if secs < 10:
				# 	secconds = "0" + str(secs)
				# else:
				# 	secconds = str(secs)
				# rec.count_time = "%s:%s:%s" % (hours,minutes,secconds)
			else:
				rec.count_time = "00:00:00"

	chrono_date_start = fields.Datetime('Start Time')
	chrono_date_end = fields.Datetime('Stop Time')
	start_stop = fields.Boolean(string='Start Stop', default=False)
	time_count = fields.Char(compute="_time_count", string="Working Time")
	count_time = fields.Char(string="Working Time")
	running_work_description = fields.Char(string="Work Description")
	task_id = fields.Many2one('project.task',string="Start stop Task")

	def counter_refresh(self):
		for rec in self:
			if rec.start_stop:
				rec.get_count_time()

	def action_start(self):
		return self.write({'chrono_date_start': datetime.now(), 'chrono_date_end': False, 'start_stop': True, 'running_work_description': self.task_id.name})

	def action_stop(self):

		def date_diff_to_float(date_diff):
			total_seconds = date_diff.total_seconds()
			hours = int(total_seconds // 3600)
			minutes = int((total_seconds % 3600) // 60)
			seconds = total_seconds % 60
			return (hours + (minutes / 60))

		if not self.chrono_date_start:
			return
		datetime_diff = datetime.now() - self.chrono_date_start
		duration = date_diff_to_float(datetime_diff)
		# m, s = divmod(datetime_diff.total_seconds(), 60)
		# h, m = divmod(m, 60)
		# dur_h = (_('%0*d')%(2,h))
		# dur_m = (_('%0*d')%(2,m*1.677966102))
		# duration = dur_h+'.'+dur_m
		# work_types = self.env['work.type'].search([('name','like','Start Stop created')])
		# if work_types:
		# 	work_type = work_types[0].id
		# else:
		# 	work_type = 1

		self.task_id.sudo().write({
			'timesheet_ids': [(0, 0, {
				'name': self.running_work_description,
				'account_id': self.task_id.project_id.analytic_account_id.id,
				'unit_amount': float(duration),
				'company_id': self.env.user.company_id.id,
				'user_id': self.env.user.id,
				'chrono_date_start': self.chrono_date_start,
				'chrono_date_stop': datetime.now(),
				'project_id': self.task_id.project_id.id,
				'task_id':self.task_id.id,
				#'work_type_id' : work_type,
			 })]
		})
		self.write({'chrono_date_end': datetime.now(), 'start_stop': False, 'running_work_description': '', 'chrono_date_start': False})
		return True

class ProjectTask(models.Model):
	_inherit = 'project.task'

	@api.depends()
	def _get_current_user(self):
		for task in self:
			task.current_user = self.env['res.users'].search([('id','=',self.env.uid)])
		return True

	@api.depends()
	def _get_started_user(self):
		for task in self:
			task.started_user = self.env['res.users'].search([('id','=',self.env.uid),('task_id','=',task.id),('start_stop','=',True)])
		return True

	@api.depends('started_user','current_user')
	def _get_start_stop(self):
		for task in self:
			if task.started_user:
				task.start_stop = task.started_user.start_stop
			else:
				task.start_stop = False

	start_stop_users_ids = fields.One2many('res.users','task_id', string="Users using start stop")
	current_user = fields.Many2one('res.users',string='Current user', compute=_get_current_user)
	start_stop = fields.Boolean(string='Start Stop', default=False, compute=_get_start_stop)
	started_user = fields.Many2one('res.users',string='Started user', compute=_get_started_user)
	chrono_date_start = fields.Datetime('Start Time',related='started_user.chrono_date_start')
	chrono_date_end = fields.Datetime('Stop Time',related='started_user.chrono_date_end')
	time_count = fields.Char(string="Working Time", related='started_user.time_count')
	count_time = fields.Char(string="Working Time Float", related='started_user.count_time')
	running_work_description = fields.Char(string="Work Description", related='started_user.running_work_description')

	def action_start(self):
		user = self.env['res.users'].search([('id','=',self.env.uid)])
		if user.task_id:
			errormsg = _('You cannot start multiple tasks. Task %s (#%s) is already in progress.') % (user.task_id.name,str(user.task_id.id))
			raise UserError(errormsg)
		else:
			user.task_id = self.id
			user.action_start()
			ms = _("Started by %s.") % (user.name)
			self.message_post(body=ms)
			return self.write({
				'start_stop_users_ids' : [(4,user.id,0)]
				})

	def action_stop(self):    	
		user = self.env['res.users'].search([('id','=',self.env.uid)])
		if user in self.start_stop_users_ids:
			if not self.project_id:
				raise UserError(_('Please select project before stoping the timer.'))
			if not user.running_work_description:
				raise UserError(_('Please enter work description before stopping timer.'))	
			user.action_stop()
			ms = _("Stopped by %s.") % (user.name)
			self.message_post(body=ms)
			return self.write({
				'start_stop_users_ids' : [(3,user.id,0)]
			})

class AccountAnalyticLine(models.Model):
	_inherit = 'account.analytic.line'

	chrono_date_start = fields.Datetime('Start Time')
	chrono_date_stop = fields.Datetime('End Time')


class ProjectTaskAudit(models.Model):
	_name = "project.task.audit"
	_description = "Bogus"

	"""
		This model is here for compatibility reasons. It has no sense or reason. Has no views, it is total bogus
		After migrating database from 10 to 16 there remains some code, that wants to fill this table, but nobody creates this table or model.
		This is here to 'Rectify' this problem.

	"""

	change_date = fields.Datetime('Change date')
	name = fields.Char('Name')
	project_id = fields.Many2one('project.project','Project')
	task_id = fields.Many2one('project.task','Task')
	old_write_uid = fields.Many2one('res.users','Old user')
	new_write_uid = fields.Many2one('res.users','New user')
	old_effective_hours = fields.Float('Old effing hours')
	new_effective_hours = fields.Float('New effing hours')
	calc_effective_hours = fields.Float('Calc effing hours')
