# -*- coding: utf-8 -*-
from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)


class ProjectTaskCriticalPath(models.Model):
    _name = 'project.task'
    _inherit = 'project.task'

    # Critical path field already defined in project_task.py
    # critical_path = fields.Boolean(string="Critical Path", default=False, readonly=True,
    #                               help="Task is on the critical path (zero float)")
    
    # Related fields for display
    cp_shows = fields.Boolean(string='Critical Path Shows', related="project_id.cp_shows", readonly=True)
    cp_detail = fields.Boolean(string='Critical Path Detail', related="project_id.cp_detail", readonly=True)

    def mark_critical_path_from_scheduler(self, tasks_data, project_id):
        """
        Mark tasks on critical path based on calculated float values from scheduler
        Called from Phase 10 of scheduler
        
        Args:
            tasks_data: List of task dictionaries with calculated dates
            project_id: ID of the project
            
        Returns:
            int: Count of critical path tasks
        """
        critical_count = 0
        critical_task_names = []
        group_task_ids = []  # Collect group task IDs for batch update
        
        #_logger.info(f"🎯 Analyzing critical path for {len(tasks_data)} tasks...")
        
        for i, task_data in enumerate(tasks_data, 1):
            task_id = task_data.get("id")
            task_name = task_data.get("name", f"Task {task_id}")
            child_ids_count = task_data.get("child_ids", 0)
            
            #_logger.debug(f"   🔍 Processing task {i}/{len(tasks_data)}: {task_name} (ID: {task_id}, child_ids: {child_ids_count})")
            
            try:
                # Skip group tasks (tasks with subtasks) from critical path marking
                # Following Microsoft Project convention - only leaf tasks can be critical
                if child_ids_count > 0:
                    #_logger.debug(f"   🚫 Marking group task {task_name} for critical path flag clearing (has {child_ids_count} subtasks)")
                    # Collect group task IDs for batch update
                    group_task_ids.append(task_id)
                    continue
                
                # Calculate if task is critical
                is_critical, info_vals = self._calculate_critical_path(task_data)
                #_logger.debug(f"   📊 Task {task_name}: critical={is_critical}, info_vals={bool(info_vals)}")
                
                # Update task
                task_obj = self.browse(task_id)
                if task_obj.exists():
                    task_obj.write({'critical_path': is_critical})
                    #_logger.debug(f"   ✅ Updated task {task_name} critical_path={is_critical}")
                    
                    if is_critical:
                        critical_count += 1
                        critical_task_names.append(task_name)
                        #_logger.debug(f"   ⭐ {task_name}: Critical path task #{critical_count}")
                        
                        # Add visual info for Gantt only if cp_detail is enabled
                        if info_vals and project_id:
                            project = self.env['project.project'].browse(project_id)
                            if project.exists() and project.cp_detail:
                                #_logger.debug(f"   🎨 Adding visual info for {task_name} (cp_detail enabled)")
                                self._update_task_info(task_id, project_id, critical_count, info_vals)
                                #_logger.debug(f"   🎨 Visual info added for {task_name}")
                            #else:
                                #_logger.debug(f"   🚫 Skipping visual info for {task_name} (cp_detail disabled)")
                #else:
                    #_logger.warning(f"   ⚠️ Task {task_name} (ID: {task_id}) does not exist")
                    
            except Exception as e:
                _logger.error(f"Error processing task {task_name} (ID: {task_id}): {e}")
                continue
        
        # Batch update: Clear critical path flag for all group tasks at once
        if group_task_ids:
            group_tasks = self.browse(group_task_ids)
            group_tasks.write({'critical_path': False})
            #_logger.info(f"   🚫 Cleared critical_path flag for {len(group_task_ids)} group tasks in batch")
        
        # Update project summary
        if project_id:
            self._update_project_critical_path_summary(project_id, critical_task_names)
        
        #_logger.info(f"   ✅ Found {critical_count} tasks on critical path")
        return critical_count
    
    def _calculate_critical_path(self, task_data):
        """
        Calculate if task is on critical path (adapted from v17)
        
        Args:
            task_data: Dictionary with task scheduling data
            
        Returns:
            tuple: (is_critical: bool, info_vals: dict)
        """
        is_critical = False
        info_vals = {}
        
        task_name = task_data.get("name", "Unknown")
        #_logger.debug(f"      📋 Calculating critical path for: {task_name}")
        
        # Get early dates (from forward pass)
        soon_date_start = task_data.get("soon_date_start")
        soon_date_end = task_data.get("soon_date_end")
        
        # Get late dates (from backward pass)
        late_date_start = task_data.get("late_date_start")
        late_date_end = task_data.get("late_date_end")
        
        #_logger.debug(f"      📅 {task_name} dates: soon_start={soon_date_start}, soon_end={soon_date_end}")
        #_logger.debug(f"      📅 {task_name} dates: late_start={late_date_start}, late_end={late_date_end}")
        
        # Calculate total float (slack)
        if late_date_start and soon_date_start:
            start_float = (late_date_start - soon_date_start).total_seconds() / 3600
            info_vals["start_float"] = f"{start_float:.1f}h"
            info_vals["left_up"] = soon_date_start.strftime('%m/%d %H:%M') if soon_date_start else ''
            info_vals["left_down"] = late_date_start.strftime('%m/%d %H:%M') if late_date_start else ''
            #
            #_logger.debug(f"      📊 {task_name} start float: {start_float:.2f}h (soon: {soon_date_start}, late: {late_date_start})")
            
            # Task is critical if float is zero or negative (no time slack)
            if start_float <= 0.01:
                is_critical = True
                #_logger.debug(f"      ⭐ {task_name}: CRITICAL due to start float <= 0.01h")
        
        if late_date_end and soon_date_end:
            end_float = (late_date_end - soon_date_end).total_seconds() / 3600
            info_vals["end_float"] = f"{end_float:.1f}h"
            info_vals["right_up"] = soon_date_end.strftime('%m/%d %H:%M') if soon_date_end else ''
            info_vals["right_down"] = late_date_end.strftime('%m/%d %H:%M') if late_date_end else ''
            
            #_logger.debug(f"      📊 {task_name} end float: {end_float:.2f}h (soon: {soon_date_end}, late: {late_date_end})")
            
            # Task is critical if float is zero or negative (no time slack)
            if end_float <= 0.01:
                is_critical = True
                #_logger.debug(f"      ⭐ {task_name}: CRITICAL due to end float <= 0.01h")
        
        return is_critical, info_vals
    
    def _update_task_info(self, task_id, project_id, sequence_num, info_vals):
        """
        Update task info display for Gantt chart
        
        Args:
            task_id: ID of the task
            project_id: ID of the project
            sequence_num: Position in critical path sequence
            info_vals: Dictionary with display values
        """
        info_name = f"cp_{project_id}"
        TaskInfo = self.env['project.task.info']
        
        existing_info = TaskInfo.search([
            ('task_id', '=', task_id),
            ('name', '=', info_name)
        ])
        
        info_data = {
            'task_id': task_id,
            'name': info_name,
            'left_up': f"CP #{sequence_num}",  # Critical path sequence number
            'left_down': f"Float: {info_vals.get('start_float', '0h')}",  # Total float at start
            'right_up': f"ES: {info_vals.get('left_up', '')}",  # Early Start
            'right_down': f"LS: {info_vals.get('left_down', '')}",  # Late Start
            'show': True,  # Set show flag to display in Gantt
        }
        
        if existing_info:
            existing_info.write(info_data)
        else:
            TaskInfo.create(info_data)
    
    def _update_project_critical_path_summary(self, project_id, critical_task_names):
        """
        Update project with critical path summary information
        
        Args:
            project_id: ID of the project
            critical_task_names: List of critical task names
        """
        project = self.env['project.project'].browse(project_id)
        if project.exists():
            critical_tasks = self.search([
                ('project_id', '=', project_id),
                ('critical_path', '=', True)
            ])
            
            # Calculate total duration of critical path
            total_duration = sum(task.plan_duration for task in critical_tasks) / 3600  # Convert to hours
            
            # Create summary text
            if critical_task_names:
                if len(critical_task_names) <= 5:
                    summary = f"Critical path: {' → '.join(critical_task_names)}"
                else:
                    summary = f"Critical path: {' → '.join(critical_task_names[:3])} → ... → {critical_task_names[-1]} ({len(critical_task_names)} tasks)"
            else:
                summary = "No critical path calculated"
            
            project.write({
                'critical_path_count': len(critical_tasks),
                'critical_path_duration': int(total_duration),
                'critical_path_summary': summary
            })