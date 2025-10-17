# -*- coding: utf-8 -*-
from odoo import models, fields, api, _

import pytz
from datetime import datetime, timedelta

import logging
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)  # Need for message in console.


class Project(models.Model):
    _inherit = "project.project"


    def _compute_duration_tracking(self):
        for rec in self:
            try:
                super(Project, rec)._compute_duration_tracking()
            except ValueError:
                rec.duration_tracking = 0

    @api.model
    def _tz_get(self):
        return [(tz, tz) for tz in sorted(pytz.all_timezones, key=lambda tz: tz if not tz.startswith('Etc/') else '_')]

    @api.model
    def _get_scheduling_type(self):
        value = [
            ('forward', _('Forward')),
            ('backward', _('Backward')),
            ('manual', _('Manual')),
        ]
        return value

    @api.model
    def _get_duration_picker(self):
        value = [
            ('day', _('Day')),
            ('second', _('Second')),
            ('day_second', _('Day Second'))
        ]
        return value

    use_calendar = fields.Boolean(name="Use Calendar",help="Set Calendat in Setting Tab", default=True)
    show_wbs = fields.Boolean(name="Show WBS Column", help="Display WBS codes in Gantt view", default=False)

    resource_calendar_id = fields.Many2one(
        'resource.calendar', string='Working Time',
        compute=False, readonly=False, store=True)
    
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            # If use_calendar=False, don't set calendar
            if not vals.get('use_calendar', True):
                vals['resource_calendar_id'] = False
            # If use_calendar=True and no calendar specified, use company calendar
            elif vals.get('use_calendar', True) and 'resource_calendar_id' not in vals:
                vals['resource_calendar_id'] = self.env.user.company_id.resource_calendar_id.id
        return super().create(vals_list)

    scheduling_type = fields.Selection('_get_scheduling_type',
                                       string='Scheduling Type',
                                       required=True,
                                       default='forward')

    date_start = fields.Datetime(string='Starting Date',
                                 default=fields.Datetime.now,
                                 help="Date Start for Auto Mode",
                                 index=True, copy=False)

    date_end = fields.Datetime(string='Ending Date', default=fields.datetime.now() + timedelta(days=1),
                               index=True, copy=False)

    task_default_duration = fields.Integer(string='Task Duration', default=86400,
                                           help="Default Task Duration", )

    task_default_start = fields.Integer(string='Task Start (UTC)', default=28800,
                                        help="Default Task Start after midnight, UTC - without Time Zone", )

    task_default_start_end = fields.Char(string='Task Start (tz)', readonly=True, compute='_compute_default_start_end',
                                         help="Default Task Start after midnight, with user Time Zone", )

    # humanize duration
    duration_scale = fields.Char(string='Duration Scale', default='d,h', help="You can set: y,mo,w,d,h,m,s,ms")
    duration_picker = fields.Selection('_get_duration_picker', string='Duration Picker', default=None, help="Empty it is Hide: day and second")
    duration_work_scale = fields.Char(string='Duration Work Scale', default='h', help="You can set: y,mo,w,d,h,m,s,ms")

    tz = fields.Selection(_tz_get, string='Timezone', default=lambda self: self._context.get('tz'),
                          help="Time Zone")
    tz_offset = fields.Char(compute='_compute_tz_offset', string='Timezone offset')

    # Critical Path fields for project  
    cp_shows = fields.Boolean(name="Critical Path Shows", help="Critical Path Shows", default=True)
    cp_detail = fields.Boolean(name="Critical Path Detail", help="Critical Path Shows Detail on Gantt", default=False)
    critical_path_count = fields.Integer(string='Critical Path Tasks Count', default=0)
    critical_path_duration = fields.Integer(string='Critical Path Duration', default=0) 

    critical_path_summary = fields.Text(string='Critical Path Summary', default="No critical path calculated yet")



    @api.depends('tz')
    def _compute_tz_offset(self):
        for project in self:
            project.tz_offset = datetime.now(pytz.timezone(project.tz or 'GMT')).strftime('%z')

    @api.depends('task_ids')
    def _compute_critical_path_count(self):
        for project in self:
            # Count tasks that are on the critical path
            # Use safe check in case critical_path field is not yet loaded
            critical_tasks = project.task_ids.filtered(lambda t: hasattr(t, 'critical_path') and t.critical_path)
            project.critical_path_count = len(critical_tasks)

    @api.depends('task_ids')
    def _compute_critical_path_duration(self):
        for project in self:
            # Calculate total duration of critical path tasks
            # Use safe check in case critical_path field is not yet loaded
            critical_tasks = project.task_ids.filtered(lambda t: hasattr(t, 'critical_path') and t.critical_path)
            total_duration = sum(critical_tasks.mapped('plan_duration'))
            project.critical_path_duration = total_duration

    @api.depends('task_ids')
    def _compute_critical_path_summary(self):
        for project in self:
            # Generate summary text of critical path tasks
            # Use safe check in case critical_path field is not yet loaded
            critical_tasks = project.task_ids.filtered(lambda t: hasattr(t, 'critical_path') and t.critical_path)
            if critical_tasks:
                task_names = critical_tasks.mapped('name')[:5]  # Limit to first 5 tasks
                summary = "Critical path tasks: " + ", ".join(task_names)
                if len(critical_tasks) > 5:
                    summary += f" ... and {len(critical_tasks) - 5} more"
                project.critical_path_summary = summary
            else:
                project.critical_path_summary = "No critical path calculated yet"

    @api.depends("task_default_start", "task_default_duration")
    def _compute_default_start_end(self):

        for proj in self:

            tz_name = self.env.context.get('tz') or self.env.user.tz
            date_end_str = ''

            if tz_name:
                user_tz = pytz.timezone(tz_name)

                date_start = fields.Datetime.from_string(fields.Datetime.now())
                date_start = date_start.replace(hour=0, minute=0, second=0)
                date_start = date_start + timedelta(seconds=proj.task_default_start)

                date_end = date_start + timedelta(seconds=proj.task_default_duration)

                date_start_tz = date_start.replace(tzinfo=pytz.utc).astimezone(user_tz)
                date_end_tz = date_end.replace(tzinfo=pytz.utc).astimezone(user_tz)

                date_end_str = 'UTC= {} -> {}, TZ= {} -> {}'.format(fields.Datetime.to_string(date_start),
                                                                    fields.Datetime.to_string(date_end),
                                                                    fields.Datetime.to_string(date_start_tz),
                                                                    fields.Datetime.to_string(date_end_tz)
                                                                    )

            proj.task_default_start_end = date_end_str


class ProjectTaskPredecessor(models.Model):
    _name = 'project.task.predecessor'
    _inherit = ['gantt.native.predecessor']
    _description = 'project.task.predecessor'

    task_id = fields.Many2one('project.task', 'Task', ondelete='cascade')
    parent_task_id = fields.Many2one('project.task', 'Parent Task', required=True, ondelete='restrict',
                                 domain="[('project_id','=', parent.project_id)]")


    _sql_constraints = [
        ('project_task_link_uniq', 'unique(task_id, parent_task_id, type)', 'Must be unique.'),

    ]

    @api.model
    def write(self, vals):
        if "parent_task_id" in vals:
            self.check_parent(vals["parent_task_id"])
        return super(ProjectTaskPredecessor, self).write(vals)

    @api.model_create_multi
    def create(self, vals):
        for val in vals:
            self.check_parent(val["parent_task_id"])
        return super(ProjectTaskPredecessor, self).create(vals)

    def check_parent(self, task_id):
        task = self.env['project.task'].search([('id', '=', task_id)])
        if task.child_ids:
            raise UserError(_(
                'You can not add a Predecessor for Task with subtask ({}).\n'
                'Please Select Task inside Parent Task.').format(task.name))

    def unlink(self):
        parent_tasks = []
        for project in self:
            parent_tasks.append(project.parent_task_id)

        res = super(ProjectTaskPredecessor, self).unlink()

        if res:
            for parent_task in parent_tasks:
                search_if_parent = self.env['project.task.predecessor'].sudo().search_count(
                    [('parent_task_id', '=', parent_task.id)])

                if not search_if_parent:
                    parent_task.write({
                        'predecessor_parent': 0
                    })
        return res



class ProjectTaskNative(models.Model):
    _name = 'project.task'
    _inherit = 'project.task'

    @api.model
    def _get_schedule_mode(self):
        value = [
            ('auto', _('Auto')),
            ('manual', _('Manual')),
        ]
        return value

    @api.model
    def _get_constrain_type(self):
        value = [
            ('asap', _('As Soon As Possible')),
            ('alap', _('As Late As Possible')),
            ('fnet', _('Finish No Earlier Than')),
            ('fnlt', _('Finish No Later Than')),
            ('mso', _('Must Start On')),
            ('mfo', _('Must Finish On')),
            ('snet', _('Start No Earlier Than')),
            ('snlt', _('Start No Later Than')),
        ]
        return value

    @api.model
    def _default_date_end(self):

        date_end = fields.Datetime.from_string(fields.Datetime.now())
        date_end = date_end.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_end + timedelta(days=1)

        if 'default_project_id' in self._context:
            project_id = self._context['default_project_id']

            project = self.env['project.project'].browse(project_id)

            if project.task_default_duration != 0 and project.task_default_start != 0:
                date_end = fields.Datetime.from_string(fields.Datetime.now())
                date_end = date_end.replace(hour=0, minute=0, second=0, microsecond=0)
                date_end = date_end + timedelta(seconds=project.task_default_start + project.task_default_duration)

        return date_end

    @api.model
    def _default_date_start(self):

        date_start = fields.Datetime.from_string(fields.Datetime.now())
        date_start = date_start.replace(hour=0, minute=0, second=0, microsecond=0)
        if 'default_project_id' in self._context:
            project_id = self._context['default_project_id']

            project = self.env['project.project'].browse(project_id)

            if project.task_default_start != 0:
                date_start = date_start + timedelta(seconds=project.task_default_start)

        return date_start



    @api.model
    def _get_fixed_calc_type(self):
        value = [
            ('duration', _('Duration')),
            ('work', _('Work')),

        ]
        return value

    fixed_calc_type = fields.Selection('_get_fixed_calc_type',
                                       string='Calc Type',
                                       required=True,
                                       default='work')

    # link
    predecessor_ids = fields.One2many('project.task.predecessor', 'task_id', 'Links')
    predecessor_count = fields.Integer(compute='_compute_predecessor_count', string='Predecessor Count', store=True)
    predecessor_parent = fields.Integer(compute='_compute_predecessor_count', string='Predecessor parent', store=True)


    # Gantt
    is_milestone = fields.Boolean("Mark as Milestone", default=False)
    on_gantt = fields.Boolean("Task name on gantt", default=False)
    date_finished = fields.Datetime('Done Date')

    # info - autoplanning
    native_duration = fields.Integer(
        'Gantt Duration',
        compute='_compute_native_duration',
        readonly=True, store=True, compute_sudo=True)

    # scheduler
    schedule_mode = fields.Selection('_get_schedule_mode',
                                     string='Schedule Mode',
                                     required=True,
                                     default='manual')

    # constrain
    constrain_type = fields.Selection('_get_constrain_type',
                                      string='Constraint Type',
                                      required=True,
                                      default='asap')
    constrain_date = fields.Datetime('Constraint Date')

    plan_action = fields.Integer(compute='_compute_plan_action', string='Plan Action', store=True)
    plan_duration = fields.Integer(string='Plan Value', default=86400)

    # redefine default
    date_start = fields.Datetime(string='Starting Date',
                                 default=_default_date_start,
                                 index=True, copy=False)

    date_end = fields.Datetime(string='Ending Date', default=_default_date_end,
                               index=True, copy=False)

    # color

    color_gantt_set = fields.Boolean("Set Color Task", default=False)
    color_gantt = fields.Char(
        string="Color Task Bar",
        help="Choose your color for Task Bar",
        default="rgba(170,170,13,0.53)"
    )

    # humanize duration
    duration_scale = fields.Char(string='Duration Scale', related="project_id.duration_scale", readonly=True, )
    duration_picker = fields.Selection(string='Duration Picker', related="project_id.duration_picker", readonly=True,)
    duration_work_scale = fields.Char(string='Duration Work Scale', related="project_id.duration_work_scale", readonly=True, )

    # WBS fields
    wbs_code = fields.Char(string='WBS Code', compute='_compute_wbs_code', store=True, 
                          help="Work Breakdown Structure code")
    wbs_level = fields.Integer(string='WBS Level', compute='_compute_wbs_level', store=True,
                              help="WBS hierarchy level")
    wbs_sequence = fields.Integer(string='WBS Sequence', default=0,
                                 help="Sequence within WBS level")

    # Critical path field (used by GUI)
    critical_path = fields.Boolean(string="Critical Path", default=False, readonly=True,
                                  help="Task is on the critical path (zero float)")


    def update_date_end(self, stage_id):
        #Disable remove (end date) when stage change,
        return {}


#v15 @api.onchange('user_id') no need

    def _get_summary_date(self):

        for task in self.sorted(key='sorting_level', reverse=True):

            summary_date_start = None
            summary_date_end = None
            if task.child_ids:

                date_start = []
                date_end = []

                for child in task.child_ids:
                    if child.child_ids:

                        summary_date_start = child.summary_date_start
                        summary_date_end = child.summary_date_end

                        if summary_date_start:
                            date_start.append(summary_date_start)

                        if summary_date_end:
                            date_end.append(summary_date_end)

                    else:

                        if child.date_start:
                            date_start.append(child.date_start)

                        if child.date_end:
                            date_end.append(child.date_end)

                # if date_start:
                #     summary_date_start = min(date_start,
                #                                   key=lambda x: x if fields.Datetime.from_string(x) else None)
                #
                # if date_end:
                #     summary_date_end = max(date_end, key=lambda x: x if fields.Datetime.from_string(x) else None)

                if date_start:
                    summary_date_start = min(date_start)

                if date_end:
                    summary_date_end = max(date_end)

            task.summary_date_start = summary_date_start
            task.summary_date_end = summary_date_end



    summary_date_start = fields.Datetime(compute='_get_summary_date', string="Summary Date Start")
    summary_date_end = fields.Datetime(compute='_get_summary_date', string="Summary Date End")


    p_loop = fields.Boolean("Loop Detected")


    @api.onchange('project_id')
    def _onchange_project(self):
        if hasattr(super(ProjectTaskNative, self), '_onchange_project'):
            if self._origin.id:
                if self.env['project.task.predecessor'].search(
                        ['|', ('task_id', '=', self._origin.id), ('parent_task_id', '=', self._origin.id),
                         (('parent_task_id', '=', self._origin.id))], limit=1):
                    raise UserError(_(
                        'You can not change a Project for task.\nPlease Delete - Predecessor: for parent or child.'))

                if self.search([('parent_id', '=', self._origin.id)], limit=1):
                    raise UserError(_(
                        'You can not change a Project for Task.\nPlease Delete or Remove - sub tasks first.'))

            super(ProjectTaskNative, self)._onchange_project()


    @api.depends("predecessor_ids")
    def _compute_predecessor_count(self):

        for task in self:
            for predecessor in task.predecessor_ids:
                predecessor.parent_task_id.write({
                    'predecessor_parent': 1,
                })

            search_if_parent = self.env['project.task.predecessor'].sudo().search_count(
                [('parent_task_id', '=', task.id)])
            task.update({
                'predecessor_count': len(task.predecessor_ids),
                'predecessor_parent': search_if_parent,
            })



    @api.model
    def scheduler_plan(self, project_id):

        search_project = self.env['project.project'].sudo().search([('id', '=', project_id)], limit=1)
        scheduling_type = search_project.scheduling_type

        if scheduling_type == "manual":
            raise UserError(_(
                'Not work in manual mode. Please set in project: Backwork or Forward'))

        # Check for cycles before scheduling
        cycle_result = self.check_project_cycles(project_id)
        if cycle_result['has_cycles']:
            cycle_tasks = cycle_result['cycle_tasks']
            task_names = []
            for task_id in cycle_tasks:
                task = self.browse(task_id)
                if task.exists():
                    task_names.append(task.name)
            
            raise UserError(_(
                'Circular dependencies detected in project tasks. '
                'The following tasks are involved in circular dependencies: %s. '
                'Please review and fix the task dependencies before scheduling.'
            ) % ', '.join(task_names))

        # project_task_scheduler.py
        tasks_ap = self._scheduler_plan_start_calc(project=search_project)

        # self.do_sorting(project_id=project_id)

        self._summary_work(project_id=project_id)
        self._scheduler_plan_complite(project_id=project_id, scheduling_type=scheduling_type)

        # CRITICAL PATH CALCULATION - moved here from Phase 10 to work with calendar
        # Calculate critical path after all scheduling is complete
        try:
            #_logger.info("🎯 Calculating critical path after scheduling completion...")
            self._calculate_project_critical_path(project_id, tasks_ap)
        except Exception as e:
            _logger.error(f"Critical path calculation failed: {e}")
            # Don't fail the whole scheduling process

        return True

    def _calculate_project_critical_path(self, project_id, tasks_ap):
        """
        Calculate critical path for project after scheduling is complete
        This method uses the scheduler's internal tasks_ap data with late dates
        
        Args:
            project_id: ID of the project
            tasks_ap: Task scheduling data from the scheduler with calculated late dates
        """
        #_logger.info(f"🎯 Starting critical path calculation for project {project_id}")
        
        if not tasks_ap:
            #_logger.error("❌ No scheduler data provided for critical path calculation")
            return 0
        
       #_logger.info(f"🎯 Using scheduler data with {len(tasks_ap)} tasks")
        
        # DEBUG: Analyze scheduler data before critical path calculation
        #_logger.info("🔍 ANALYZING SCHEDULER DATA:")
        #for i, task_data in enumerate(tasks_ap[:5]):  # Show first 5 tasks
            # task_name = task_data.get('name', 'Unknown')
            # soon_start = task_data.get('soon_date_start')
            # soon_end = task_data.get('soon_date_end') 
            # late_start = task_data.get('late_date_start')
            # late_end = task_data.get('late_date_end')
            
            # if late_start and soon_start:
            #     start_float = (late_start - soon_start).total_seconds() / 3600
            #     _logger.info(f"  📋 Task {i+1}: {task_name}")
            #     _logger.info(f"    Soon: {soon_start} → {soon_end}")
            #     _logger.info(f"    Late: {late_start} → {late_end}")
            #     _logger.info(f"    Float: {start_float:.2f}h")
            # else:
            #     _logger.info(f"  📋 Task {i+1}: {task_name} - Missing late dates")
        
        # Use the critical path module with proper scheduler data
        critical_count = self.mark_critical_path_from_scheduler(tasks_ap, project_id)
        #_logger.info(f"✅ Critical path calculation completed: {critical_count} tasks marked as critical")
        
        return critical_count

    def _scheduler_plan_complite(self, project_id, scheduling_type):

        # Calculate data start/stop for project.
        #_logger.info(f"📅 _scheduler_plan_complite called for project_id={project_id}, scheduling_type={scheduling_type}")

        search_tasks = self.env['project.task'].sudo().search([('project_id', '=', project_id)])
        #_logger.info(f"📅 Found {len(search_tasks)} tasks in project {project_id}")

        # Reset plan_action flag for all tasks
        for task in search_tasks:
            var_data = {}
            var_data['plan_action'] = False
            task.sudo().write(var_data)

        if scheduling_type == "forward":
            # FORWARD SCHEDULING: Update only END date (result), preserve START date (input parameter)
            
            date_list_end = []
            leaf_task_dates = []
            
            for task in search_tasks:
                if task.date_end:
                    date_list_end.append(task.date_end)
                    
                    # Calculate successor count by checking if this task is a parent in any predecessor relationship
                    successor_count = self.env['project.task.predecessor'].search_count([
                        ('parent_task_id', '=', task.id)
                    ])
                    
                    # Debug logging for task dates
                    #_logger.info(f"   📋 Task: {task.name} - date_end: {task.date_end}, successor_count: {successor_count}")
                    
                    # Collect leaf task dates (tasks with no successors - end of project)
                    # CRITICAL FIX: Exclude isolated ALAP tasks from project end calculation
                    if successor_count == 0:
                        if task.constrain_type == 'alap':
                            # Skip isolated ALAP tasks from project end calculation
                            pass
                            #_logger.info(f"   🔄 Skipping isolated ALAP task from project end calc: {task.name}")
                        else:
                            leaf_task_dates.append(task.date_end)
                            #_logger.info(f"   🍃 Leaf task found: {task.name} - {task.date_end}")
            
            # Use leaf task dates if available, otherwise fall back to all tasks
            if leaf_task_dates:
                new_prj_date_end = max(leaf_task_dates)
                #_logger.info(f"📅 Forward: Using leaf task date for project end: {new_prj_date_end} (from {len(leaf_task_dates)} leaf tasks)")
            elif date_list_end:
                # Check if all tasks are isolated ALAP tasks - if so, preserve original project end
                all_tasks_alap = all(task.constrain_type == 'alap' for task in search_tasks if task.date_end)
                if all_tasks_alap:
                    project = self.env['project.project'].sudo().browse(int(project_id))
                    if project.date_end:
                        new_prj_date_end = project.date_end
                        #_logger.info(f"📅 Forward: Preserving original project end for isolated ALAP tasks: {new_prj_date_end}")
                    else:
                        new_prj_date_end = max(date_list_end)
                        #_logger.info(f"📅 Forward: No original project end, using latest ALAP task: {new_prj_date_end}")
                else:
                    new_prj_date_end = max(date_list_end)
                    #_logger.info(f"📅 Forward: Using latest task date for project end: {new_prj_date_end} (no non-ALAP leaf tasks found)")
            else:
                new_prj_date_end = None
            
            if new_prj_date_end:
                project = self.env['project.project'].sudo().browse(int(project_id))
                # _logger.info(f"📅 Forward: Updating project {project.name} END date to: {new_prj_date_end}")
                # _logger.info(f"📅 Forward: Preserving project START date: {project.date_start}")
                project.write({
                    'date_end': new_prj_date_end,
                })
                #_logger.info(f"📅 Project end date updated successfully: {project.date_end}")

        elif scheduling_type == "backward":
            # BACKWARD SCHEDULING: Update only START date (result), preserve END date (input parameter)
            
            date_list_start = []
            for task in search_tasks:
                if task.date_start:
                    date_list_start.append(task.date_start)

            #_logger.info(f"📅 Backward scheduling: Found {len(date_list_start)} tasks with start dates")
            if date_list_start:
                new_prj_date_start = min(date_list_start)
            else:
                new_prj_date_start = None
            
            if new_prj_date_start:
                project = self.env['project.project'].sudo().browse(int(project_id))
                # _logger.info(f"📅 Backward: Updating project {project.name} START date to: {new_prj_date_start}")
                # _logger.info(f"📅 Backward: Preserving project END date: {project.date_end}")
                project.write({
                    'date_start': new_prj_date_start,
                })
                #_logger.info(f"📅 Project start date updated successfully: {project.date_start}")
            #else:
                #_logger.warning("📅 No tasks with start dates found - project start date not updated")


    def _summary_work(self, project_id):

        search_tasks = self.env['project.task'].sudo().search(
            ['&', ('project_id', '=', project_id), ('child_ids', '!=', False)])

        for task in search_tasks:
            var_data = {}
            if task.schedule_mode == "auto":
                var_data["date_start"] = task.summary_date_start
                var_data["date_end"] = task.summary_date_end

                if task.summary_date_end and task.summary_date_start:
                    # diff = fields.Datetime.from_string(task.summary_date_end) - fields.Datetime.from_string(
                    #     task.summary_date_start)
                    # var_data["plan_duration"] = diff.total_seconds()

                    diff = task.summary_date_end - task.summary_date_start
                    var_data["plan_duration"] = diff.total_seconds()

                    # var_data["duration"] = diff.total_seconds()

                task.sudo().write(var_data)


    @api.depends("predecessor_ids.task_id", "predecessor_ids.type", "constrain_type", "constrain_date", "plan_duration",
                 "native_duration", "project_id.scheduling_type", "task_resource_ids.name")
    def _compute_plan_action(self):
        for task in self:

            # If the task is in automatic mode, set plan_action = True
            if task.schedule_mode != "manual":
                task.plan_action = True
            else:
                # More efficient search - only look for automatic tasks
                has_auto_dependent = self.env['project.task.predecessor'].search_count([
                    ('parent_task_id', '=', task.id),
                    ('task_id.schedule_mode', '!=', 'manual')
                ]) > 0
                
                task.plan_action = has_auto_dependent

    @api.depends('date_end', 'date_start')
    def _compute_native_duration(self):
        for task in self:

                   
            if task.date_end and task.date_start and task.date_start > task.date_end:
                # Обновляем дату окончания, сохраняя продолжительность, если она известна
                if hasattr(task, 'plan_duration') and task.plan_duration > 0:
                    task.date_end = task.date_start + timedelta(seconds=task.plan_duration)
                else:
                   
                    task.date_end = task.date_start + timedelta(days=1)

            if task.date_end and task.date_start:
                diff = fields.Datetime.from_string(task.date_end) - fields.Datetime.from_string(task.date_start)
                native_duration = diff.total_seconds()
            else:
                native_duration = 0.0

            task.native_duration = native_duration

    @api.depends('parent_id', 'sorting_seq', 'sequence', 'project_id')
    def _compute_wbs_code(self):
        for task in self:
            task.wbs_code = task._generate_wbs_code()

    @api.depends('parent_id')
    def _compute_wbs_level(self):
        for task in self:
            task.wbs_level = task._calculate_wbs_level()

    def _generate_wbs_code(self):
        """Generate WBS code based on task hierarchy and position"""
        if not self.project_id:
            return '1'
            
        if self.parent_id:
            # Get parent WBS code
            parent_wbs = self.parent_id.wbs_code or '1'
            
            # Find position among siblings - use multiple sort criteria
            siblings = self.parent_id.child_ids.sorted(lambda x: (
                x.sorting_seq or 9999,  # If sorting_seq is 0, put at end
                x.sequence or 9999,     # Use sequence as fallback
                x.id                    # Final fallback
            ))
            try:
                position = siblings.ids.index(self.id) + 1
            except ValueError:
                position = 1
            
            return f"{parent_wbs}.{position}"
        else:
            # Root task - find position among root tasks in project
            root_tasks = self.env['project.task'].search([
                ('project_id', '=', self.project_id.id),
                ('parent_id', '=', False)
            ]).sorted(lambda x: (
                x.sorting_seq or 9999,  # If sorting_seq is 0, put at end  
                x.sequence or 9999,     # Use sequence as fallback
                x.id                    # Final fallback
            ))
            
            try:
                position = root_tasks.ids.index(self.id) + 1
            except ValueError:
                position = 1
                
            return str(position)

    def _calculate_wbs_level(self):
        """Calculate WBS level (depth in hierarchy)"""
        level = 0
        current = self
        while current.parent_id:
            level += 1
            current = current.parent_id
            if level > 10:  # Prevent infinite loops
                break
        return level

    @api.model_create_multi
    def create(self, vals_list):
        """Override create to recalculate WBS codes after task creation"""
        tasks = super().create(vals_list)
        
        # Recalculate WBS codes for affected projects
        projects = tasks.mapped('project_id')
        for project in projects:
            if project:
                project_tasks = self.search([('project_id', '=', project.id)])
                project_tasks._compute_wbs_code()
        
        return tasks

    def write(self, vals):
        """Override write to recalculate WBS codes when hierarchy changes"""
        result = super().write(vals)
        
        # If parent_id, project_id, sorting_seq or sequence changed, recalculate WBS
        if any(field in vals for field in ['parent_id', 'project_id', 'sorting_seq', 'sequence']):
            projects = self.mapped('project_id')
            for project in projects:
                if project:
                    project_tasks = self.search([('project_id', '=', project.id)])
                    project_tasks._compute_wbs_code()
        
        return result

    @api.model 
    def init_wbs_codes(self, project_id=None):
        """Manual method to initialize WBS codes for a project"""
        if project_id:
            domain = [('project_id', '=', project_id)]
        else:
            domain = []
            
        tasks = self.search(domain)
        
        # First ensure sorting_seq is set based on sequence if needed
        for task in tasks.filtered(lambda t: not t.sorting_seq):
            if task.sequence:
                task.sorting_seq = task.sequence
            elif not task.parent_id:
                # Root tasks without sorting_seq - set based on creation order
                root_tasks = self.search([
                    ('project_id', '=', task.project_id.id),
                    ('parent_id', '=', False)
                ]).sorted('id')
                task.sorting_seq = root_tasks.ids.index(task.id) + 1
        
        # Now recalculate WBS codes
        tasks._compute_wbs_code()
        return True

    def unlink(self):

        if self.search([('parent_id', 'in', self.ids)], limit=1):
            raise UserError(_(
                'You can not delete a Parent Task.\nPlease Delete - sub tasks first.'))
        return super(ProjectTaskNative, self).unlink()



    def conv_sec_tofloat(self, sec, type="sec"):

        if type == "sec":
            tde = timedelta(seconds=sec)
        if type == "hrs":
            tde = timedelta(hours=sec)

        return tde.total_seconds() / timedelta(hours=1).total_seconds()



    @api.constrains('parent_id', 'child_ids')
    def _check_subtask_level(self):
        pass
        # for task in self:
        #     if task.parent_id and task.child_ids:
        #         raise ValidationError(_('Task %s cannot have several subtask levels.' % (task.name,)))



