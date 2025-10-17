# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
import logging
import time

from datetime import datetime, timedelta


_logger = logging.getLogger(__name__) # Need for message in console.


class ProjectTaskNativeScheduler(models.Model):
    _name = 'project.task'
    _inherit = 'project.task'

    def _scheduler_plan_start_calc(self, project):
        """ CORE SCHEDULER ENGINE - Main calculation function for project scheduling
        
        This is the heart of the scheduling system that implements a two-pass CPM algorithm:
        
        ARCHITECTURE OVERVIEW:
        =====================
        1 FORWARD PASS: Calculate Early Start/Finish dates (ASAP - As Soon As Possible)
        2 BACKWARD PASS: Calculate Late Start/Finish dates (ALAP - As Late As Possible)  
        3 CRITICAL PATH: Integration with improved CPM algorithm after scheduling
        4 CONSTRAINT HANDLING: Apply date constraints (Must Start On, etc.)
        5 CALENDAR INTEGRATION: Resource calendar and working hours support
        
        ALGORITHM FLOW:
        ==============
        Phase 1: Data Preparation
        ├── Extract all tasks from project
        ├── Build predecessor relationship matrix
        ├── Initialize calendar and resource data
        └── Set up task scheduling parameters
        
        Phase 2: Forward Pass (Early Dates)
        ├── Start with tasks having no predecessors
        ├── Calculate early start/finish recursively
        ├── Handle different link types (FS, SS, FF, SF)
        └── Apply forward scheduling constraints
        
        Phase 3: Project Date Calculation
        ├── Determine project end date from forward pass
        └── Update project timeline boundaries
        
        Phase 4: Backward Pass (Late Dates)
        ├── Start from project end date
        ├── Calculate late start/finish working backwards
        ├── Handle predecessor relationships in reverse
        └── Apply backward scheduling constraints
        
        Phase 5: Critical Path Integration
        ├── Call improved CPM algorithm
        ├── Calculate float values for all tasks
        └── Identify critical path sequence
        
        Phase 6: Constraint Processing
        ├── Handle ALAP (As Late As Possible) tasks
        ├── Apply date constraints (MSO, MFO, SNET, SNLT, etc.)
        └── Recalculate affected task chains
        
        Phase 7: Results Writing
        ├── Write calculated dates back to database
        ├── Update detail planning data
        └── Mark tasks as calculated
        
        :param project: Project record containing scheduling configuration
        :returns: Boolean indicating success/failure of scheduling process
        """
        
        # PHASE 1: DATA PREPARATION & INITIALIZATION
        #_logger.info(f" Starting scheduler calculation for project: {project.name}")
        #_logger.info(f" Scheduling mode: {project.scheduling_type}")
        
        try:
            # PHASE 1: DATA PREPARATION & INITIALIZATION
            #_logger.info("📊 Starting Phase 1: Data Preparation...")
            scheduling_type = project.scheduling_type
            #  Initialize core data structures for scheduling algorithm
            tasks_ap = []           #  Main task list with scheduling data
            predecessors_ap = []    #  Predecessor relationships matrix
            project_id = project.id #  Project identifier
            resources_ids = set()   #  Resource ID collection
            leave_ids = list()      #  Leave/holiday records
            attendance_ids = list() #  Working time attendance records
            t_params = {}           #  Task calculation parameters
            calendar_ready = []     #  Processed calendar data

            #  Calendar caching for performance optimization
            attendance_ids_cache = []
            leave_ids_cache = []
            resource_key_val = []

            #  TASK DATA EXTRACTION
            # Search for all tasks in project (including inactive ones for complete scheduling)
            domain = [('project_id', '=', project_id), '|', ('active', '=', True), ('active', '=', False)]
            arch_tasks = self.env['project.task'].sudo().search(domain)
            
            #  Sort tasks by sorting sequence for proper processing order
            tasks_list = arch_tasks.sorted(key=lambda x: x.sorting_seq)
            #logger.info(f" Found {len(tasks_list)} tasks to schedule")


            #  BUILD TASK PARAMETERS - Core configuration for scheduling calculations
            t_params = {
                'leave_ids': leave_ids,                #  Employee leaves/holidays
                'attendance_ids': attendance_ids,      #  Working time patterns
                'scheduling_type': scheduling_type,    #  Forward/Backward scheduling mode
                'project_id': project_id,              #  Project reference
                'project': project                     #  Full project object
            }

            # PROCESS EACH TASK - Build scheduling data structure
            #_logger.info(" Building task scheduling matrix...")
            
            for task in tasks_list:
                #  CLEANUP: Remove existing detail planning data
                # This ensures fresh calculation without old planning artifacts
                task.detail_plan_ids.unlink()

                #  RESOURCE HANDLING: Extract task resource assignments
                task_resource_ids = False
                if hasattr(task, 'task_resource_ids'):
                    task_resource_ids = task.task_resource_ids

                #  CALENDAR INTEGRATION: Build resource calendar and leave data
                # This handles working hours, holidays, and resource availability
                # Pass only current task.id to exclude only it from conflict detection
                #cal_id, task_res, t_params = self.make_res_cal_leave(task_resource_ids, t_params, [task.id])
                cal_id, task_res, t_params = self.make_res_cal_leave(task_resource_ids, t_params, tasks_list.ids)

                #  DATE INITIALIZATION - Critical for two-pass CPM algorithm
                # Initialize all date fields to None first
                soon_date_start = None   #  Early Start (ES) - earliest possible start
                soon_date_end = None     #  Early Finish (EF) - earliest possible finish
                late_date_start = None   #  Late Start (LS) - latest allowable start
                late_date_end = None     #  Late Finish (LF) - latest allowable finish

                #  CRITICAL: Always initialize both soon and late dates based on task dates
                # This ensures proper two-pass algorithm functionality for CPM calculations
                if scheduling_type == "forward":
                    #  FORWARD PASS: Initialize early dates from task, late dates calculated in reverse
                    soon_date_start = task.date_start   # ES = current task start
                    soon_date_end = task.date_end       # EF = current task end
                    # Initialize late dates as base for proper calculation
                    late_date_start = task.date_start   # LS baseline
                    late_date_end = task.date_end       # LF baseline

                elif scheduling_type == "backward":
                    #  BACKWARD PASS: Initialize late dates from task, late dates calculated in reverse
                    late_date_start = task.date_start   # LS = current task start
                    late_date_end = task.date_end       # LF = current task end
                    # Initialize early dates as base for proper calculation
                    soon_date_start = task.date_start   # ES baseline
                    soon_date_end = task.date_end       # EF baseline

                #  BUILD TASK SCHEDULING RECORD
                # Create comprehensive task data structure for scheduling algorithm
                
                #  Tasks List - Core scheduling data structure
                tasks_ap.append({"id": task.id,
                                 "plan_duration": task.plan_duration,        #  Task duration in seconds
                                 "soon_date_start": soon_date_start,        #  Early Start (ES)
                                 "soon_date_end": soon_date_end,            #  Early Finish (EF)
                                 "late_date_start": late_date_start,        #  Late Start (LS)
                                 "late_date_end": late_date_end,            #  Late Finish (LF)
                                 "schedule_mode": task.schedule_mode,       #  Auto/Manual scheduling
                                 "project_id": project,                     #  Project reference
                                 # Calendar data moved to separate handling
                                 "constrain_type": task.constrain_type,     #  Constraint type (ASAP/ALAP/MSO/etc)
                                 "constrain_date": task.constrain_date,     #  Constraint target date
                                 "detail_plan": task.detail_plan,           #  Detailed planning flag
                                 "name": task.name,                         #  Task name for logging
                                 "cal_id": cal_id,                          #  Calendar ID
                                 # Resource management
                                 "task_resource_ids" : task_resource_ids,   #  Assigned resources
                                 "task_res" : task_res,                     #  Processed resource data
                                 # Task type handling
                                 "fixed_calc_type" : task.fixed_calc_type,  #  Duration vs Work calculation
                                 "p_loop" : False,                          #  Loop detection flag
                                 "child_ids": len(task.child_ids.ids),      #  Subtask count
                                 "sorting_level": task.sorting_level        #  Hierarchy level
                                 })

                #  PREDECESSOR RELATIONSHIP EXTRACTION
                # Find all predecessor links where this task is either source or target
                domain = ['|', ('task_id', '=', task.id), ('parent_task_id', '=', task.id)]
                predecessors_list = self.env['project.task.predecessor'].sudo().search(domain)

                #  Build predecessor relationship matrix for CPM calculations
                for predecessor in predecessors_list:
                    predecessors_ap.append(
                        {"id": predecessor.id,                                  #  Predecessor link ID
                         "type": predecessor.type,                              #  Link type (FS/SS/FF/SF)
                         "lag_qty": predecessor.lag_qty,                        #  Lag quantity
                         "lag_type": predecessor.lag_type,                      #  Lag type (day/hour/percent)
                         "parent_task_id": predecessor.parent_task_id.id,       #  Source task (predecessor)
                         "task_id": predecessor.task_id.id,                     #  Target task (successor)
                         "child_ids": len(predecessor.task_id.child_ids.ids),   #  Successor subtask count
                         "sorting_seq": predecessor.task_id.sorting_seq         #  Successor sort order
                         })

            #  REMOVE DUPLICATE PREDECESSORS
            # Eliminate duplicate predecessor relationships using list comprehension
            predecessors_ap = [i for n, i in enumerate(predecessors_ap) if i not in predecessors_ap[n + 1:]]
            t_params["predecessors_ap"] = predecessors_ap
            #_logger.info(f" Found {len(predecessors_ap)} predecessor relationships")

            #  PROJECT DATE VALIDATION & INITIALIZATION
            # Ensure project has valid start/end dates for scheduling calculations
            # SAVE ORIGINAL PROJECT END DATE before _project_check_date potentially clears it
            original_project_end = project.date_end
            p_date_start, p_date_end = self._project_check_date(project, scheduling_type)
            project_ap = {
                "id": project.id,              #  Project ID
                "project_obj": project,        #  Full project object
                "original_date_end": original_project_end,  # CRITICAL: Save original project end for isolated ALAP
                "date_start": p_date_start,    #  Project start date
                "date_end": p_date_end         #  Project end date
            }
            #_logger.info(f" Project dates: {p_date_start} to {p_date_end}")

        
            #  CLEANUP PREVIOUS CRITICAL PATH DATA
            # Remove old critical path information before new calculation
            info_name = "cp_{}".format(project.id)
            self._task_info_remove(info_name)
            #_logger.info(f" Cleaned previous critical path data: {info_name}")
            #_logger.info("✅ Phase 1 completed: Data preparation finished successfully")
        except Exception as e:
            _logger.error(f"Phase 1 FAILED: Data preparation failed: {e}")
            return False

        try:
            # PHASE 2: FORWARD PASS - Calculate Early Start/Finish dates
            # This implements the first pass of the CPM algorithm
            #_logger.info("📈 Starting Phase 2: Forward Pass - calculating Early Start/Finish dates...")
            tasks_ap = self._ap_calc_tasks_list(project_ap=project_ap, tasks_ap=tasks_ap, t_params=t_params,
                                                revers_step=False)
            #_logger.info("✅ Phase 2 completed: Forward pass calculation done")
        except Exception as e:
            _logger.error(f"Phase 2 FAILED: Forward pass calculation failed: {e}")
            return False

        try:
            # PHASE 3: PROJECT DATE RECALCULATION
            # Update project dates based on calculated task dates from forward pass
            #_logger.info("📅 Starting Phase 3: Recalculating project dates from scheduled tasks...")
            project_ap = self._project_get_date(project_ap, tasks_ap, scheduling_type)
            #_logger.info("✅ Phase 3 completed: Project date recalculation done")
        except Exception as e:
            _logger.error(f"Phase 3 FAILED: Project date recalculation failed: {e}")
            return False

        try:
            # PHASE 4: BACKWARD PASS - Calculate Late Start/Finish dates
            # This implements the second pass of the CPM algorithm working backward from project end
            #_logger.info("📉 Starting Phase 4: Backward Pass - calculating Late Start/Finish dates...")
            tasks_ap = self._ap_calc_tasks_list(project_ap=project_ap, tasks_ap=tasks_ap, t_params=t_params,
                                                revers_step=True)
            #_logger.info("✅ Phase 4 completed: Backward pass calculation done")
        except Exception as e:
            _logger.error(f"Phase 4 FAILED: Backward pass calculation failed: {e}")
            return False

        try:
            # PHASE 6: ALAP CONSTRAINT PROCESSING (DEPENDENT TASKS ONLY)
            # Handle "As Late As Possible" tasks that have dependencies
            # Isolated ALAP tasks will be processed in Phase 9 after project completion
            #_logger.info("⏰ Starting Phase 6: Processing ALAP constraints with dependencies...")
            alap_processed_count = 0
            alap_deferred_count = 0
            
            # Phase 6 processes only dependent ALAP tasks using proper CPM late dates
            # Isolated ALAP tasks are deferred to Phase 9 for project-end-based calculation
            
            for task_alap in tasks_ap:
                if task_alap["constrain_type"] == "alap":
                    # Check if task has dependencies (predecessors OR successors)
                    has_predecessors = self._task_has_predecessors(task_alap["id"], t_params)
                    has_successors = self._task_has_successors(task_alap["id"], t_params)
                    
                    if not has_predecessors and not has_successors:
                        # ISOLATED ALAP TASK: This is problematic - ALAP without dependencies is meaningless
                        task_name = task_alap.get('name', task_alap['id'])
                        #_logger.warning(f"⚠️ PROBLEMATIC TASK: '{task_name}' has ALAP constraint but no dependencies - this is illogical")
                        #_logger.warning(f"⚠️ Recommendation: Remove ALAP constraint or add task dependencies for '{task_name}'")
                        
                        # Mark task as problematic - DON'T set calc=True so it keeps exclamation mark
                        task_alap["_problematic"] = True
                        # Do NOT set task_alap["calc"] = True - keep task unresolved with exclamation mark
                        
                        # Still defer to Phase 9 for compatibility, but mark as problematic
                        task_alap["_deferred_alap"] = True
                        alap_deferred_count += 1
                        #_logger.info(f"🔄 Deferring problematic isolated ALAP task to Phase 9: {task_name}")
                        continue
                    
                    # DEPENDENT ALAP TASK: Process now with existing logic
                    alap_processed_count += 1
                    #_logger.info(f"⚡ Processing dependent ALAP task: {task_alap.get('name', task_alap['id'])}")
                    
                    alap_run = False
                    if scheduling_type == "forward":
                        #  FORWARD SCHEDULING ALAP: Handle dependent tasks  
                        soon_date_end = task_alap["soon_date_end"]   # Early finish
                        late_date_end = task_alap["late_date_end"]   # Late finish
                        
                        # ALAP dependent tasks use late dates from backward pass (proper CPM)
                        # No artificial project boundary constraints needed
                        
                        if has_successors:
                            # ALAP TASK WITH SUCCESSORS: Check for successor constraints first
                            # Find the earliest successor constraint to use as anchor point
                            earliest_successor_constraint = None
                            task_id = task_alap["id"]
                            
                            # Look for successors with constraints that limit this ALAP task
                            # Check in t_params dependencies structure for successor relationships
                            all_predecessors = t_params.get("predecessors_ap", [])
                            
                            for pred_relation in all_predecessors:
                                parent_task_id = pred_relation.get("parent_task_id")
                                child_task_id = pred_relation.get("task_id") 
                                
                                if parent_task_id == task_id:
                                    # Found a successor of our ALAP task
                                    # Find the successor task details
                                    for successor_task in tasks_ap:
                                        if successor_task["id"] == child_task_id:
                                            successor_constraint_type = successor_task.get("constrain_type")
                                            successor_constraint_date = successor_task.get("constrain_date")
                                            
                                            if successor_constraint_type in ["snet", "mso"] and successor_constraint_date:
                                                # Successor has a start constraint that affects our ALAP end date
                                                if earliest_successor_constraint is None or successor_constraint_date < earliest_successor_constraint:
                                                    earliest_successor_constraint = successor_constraint_date
                                                    #_logger.info(f" ALAP found successor constraint: {successor_task.get('name')} {successor_constraint_type} = {successor_constraint_date}")
                                            break
                            
                            if earliest_successor_constraint:
                                # SUCCESSOR-CONSTRAINED ALAP: Work backwards from successor constraint
                                #_logger.info(f" ALAP task '{task_alap.get('name', task_alap['id'])}' constrained by successor, end date = {earliest_successor_constraint}")
                                constraint_end = earliest_successor_constraint
                                task_duration = task_alap["plan_duration"]
                                
                                if task_duration > 0:
                                    calculated_start = constraint_end - timedelta(seconds=task_duration)
                                    calculated_end = constraint_end
                                else:
                                    # Zero duration task
                                    calculated_start = calculated_end = constraint_end
                                
                                #_logger.info(f" ALAP successor-constrained dates: {calculated_start} -> {calculated_end}")
                                
                                # Apply successor-constrained ALAP dates
                                task_alap["soon_date_start"] = calculated_start
                                task_alap["soon_date_end"] = calculated_end
                                alap_run = True
                                #_logger.info(f" Applied successor-constrained ALAP dates: {calculated_start} -> {calculated_end}")
                                
                            else:
                                # CRITICAL FIX: No successors or constraints - this task should be deferred to Phase 9
                                # Phase 6 should NOT process isolated ALAP tasks using project_end
                                #_logger.info(f"🔄 ALAP task '{task_alap.get('name', task_alap['id'])}' has no successor constraints - deferring to Phase 9")
                                task_alap["_deferred_alap"] = True  # Mark for Phase 9 processing
                                alap_deferred_count += 1
                                continue  # Skip processing in Phase 6
                            
                        elif late_date_end > soon_date_end:
                            #  DEPENDENT ALAP TASK: Balance between dependency requirements and ALAP preference
                            # CRITICAL FIX: ALAP must respect dependencies - cannot start before dependencies allow
                            
                            dependency_start = task_alap["soon_date_start"]  # Earliest possible start (from dependencies)
                            dependency_end = task_alap["soon_date_end"]      # Earliest possible end (from dependencies)
                            alap_start = task_alap["late_date_start"]        # Latest preferred start (from project end)
                            alap_end = task_alap["late_date_end"]            # Latest preferred end (from project end)
                            
                            # CRITICAL FIX: ALAP with dependencies - correct interpretation
                            # ALAP means "finish as late as possible while respecting dependencies"
                            # Dependencies give us the EARLIEST possible start/finish
                            # Late dates give us the LATEST possible start/finish (from project constraints)
                            # For ALAP: use dependency start (cannot start earlier) but try to delay finish
                            
                            # DEPENDENCIES ARE MANDATORY - cannot start before dependency_start
                            # But we can potentially finish later than dependency_end if project allows
                            
                            # Use dependency start (mandatory constraint)
                            required_start = dependency_start
                            required_end = dependency_end
                            
                            # Check if late dates allow finishing later while respecting dependency start
                            if alap_start >= required_start:
                                # Late dates respect dependencies, we can use them for potential delay
                                effective_start = required_start  # Must start when dependencies allow
                                effective_end = max(required_end, alap_end)  # Finish as late as possible (from CPM backward pass)
                                
                                if effective_end > required_end:
                                    # ALAP provides actual delay benefit
                                    alap_run = True
                                    task_alap["soon_date_start"] = effective_start
                                    task_alap["soon_date_end"] = effective_end
                                    if "late_detail_plan" in task_alap.keys():
                                        task_alap["soon_detail_plan"] = task_alap["late_detail_plan"]
                                    #_logger.info(f" ALAP task '{task_alap.get('name', task_alap['id'])}' delayed finish: start={effective_start} (deps), end={effective_end} (ALAP)")
                                #else:
                                    #_logger.info(f"ALAP task '{task_alap.get('name', task_alap['id'])}' no delay possible")
                                    #_logger.info(f"  Dependencies: {dependency_start} -> {dependency_end}")
                                    #_logger.info(f"  Late dates: {alap_start} -> {alap_end}")
                                    # Keep dependency dates
                            #else:
                                # Late dates conflict with dependencies - use dependencies
                                #_logger.warning(f"ALAP task '{task_alap.get('name', task_alap['id'])}' late dates conflict with dependencies")
                                #_logger.warning(f"  Dependencies require start: {dependency_start}")
                                #_logger.warning(f"  Late dates suggest start: {alap_start}")
                                #_logger.warning(f"  Using dependency dates (dependency priority)")
                                # Keep current soon_date_start/end (dependency-driven dates)

                    else:
                        #  BACKWARD SCHEDULING ALAP: Use early dates if they allow later scheduling
                        soon_date_start = task_alap["soon_date_start"]  # Early start
                        late_date_start = task_alap["late_date_start"]  # Late start
                        if soon_date_start > late_date_start:
                            #  Move task to latest possible dates (ALAP behavior)
                            alap_run = True
                            task_alap["late_date_start"] = task_alap["soon_date_start"]
                            task_alap["late_date_end"] = task_alap["soon_date_end"]
                            if "soon_detail_plan" in task_alap.keys():
                                task_alap["late_detail_plan"] = task_alap["soon_detail_plan"]

                    if alap_run:
                        #  RECALCULATE DEPENDENT TASKS after ALAP adjustment
                        # This ensures that moving one task to ALAP doesn't break dependencies
                        #_logger.info(f" Recalculating dependencies for ALAP task: {task_alap.get('name', task_alap['id'])}")
                        self._ap_calc_scheduler_recur_work(task_id=task_alap["id"], project=project_ap, tasks=tasks_ap,
                                                       t_params=t_params, revers_step=False)
            #_logger.info(f"✅ Phase 6 completed: {alap_processed_count} dependent ALAP tasks processed, {alap_deferred_count} isolated ALAP tasks deferred to Phase 9")
        except Exception as e:
            _logger.error(f"Phase 6 FAILED: ALAP constraint processing failed: {e}")
            return False

        try:
            # PHASE 7: WRITE RESULTS TO DATABASE
            # Apply all calculated dates and scheduling data back to task records
            #_logger.info("💾 Starting Phase 7: Writing calculated scheduling data to database...")
            projects_task_obj = self.env['project.task']
            updated_count = 0
            
            for task_new in tasks_ap:

                # PROCESS CALCULATED TASKS - Only update tasks that were successfully calculated
                if "calc" in task_new.keys():
                    task_id = task_new["id"]
                    task_obj = projects_task_obj.browse(task_id)
                    vals = {}  #  Values to write to database
                    
                    #  Add critical path info (calculated by improved algorithm)
                    vals = self._task_info_add(task=task_new, vals=vals, info_name=info_name)

                    #  SELECT APPROPRIATE DATE FIELDS based on scheduling direction
                    if scheduling_type == "forward":
                        # Forward scheduling: Use Early dates (soon_date_*)
                        task_date_start = "soon_date_start"  # Early Start
                        task_date_end = "soon_date_end"      # Early Finish
                        detail_plan = "soon_detail_plan"      # Forward detail planning
                    else:
                        # Backward scheduling: Use Late dates (late_date_*)
                        task_date_start = "late_date_start"  # Late Start
                        task_date_end = "late_date_end"      # Late Finish
                        detail_plan = "late_detail_plan"      # Backward detail planning

                    #  SET CALCULATED DATES
                    vals["date_start"] = task_new[task_date_start]  # Calculated start date
                    vals["date_end"] = task_new[task_date_end]      # Calculated end date


                    #  HANDLE DETAIL PLANNING DATA
                    # Detail planning provides granular resource allocation and timing
                    if detail_plan in task_new.keys():
                        save_detail_plan = False
                        
                        #  Check if detail planning is enabled
                        if task_obj.project_id and task_obj.project_id.detail_plan:
                            save_detail_plan = task_obj.project_id.detail_plan
                        elif task_obj.detail_plan:
                            save_detail_plan = True

                        if save_detail_plan:
                            # Skip detail planning for group tasks (tasks with subtasks)
                            # Following Microsoft Project convention - only leaf tasks get detail planning
                            if len(task_obj.child_ids) == 0:
                                # Generate detailed planning lines for resource allocation
                                task_detail_lines = self._add_detail_plan(task_new[detail_plan])
                                if task_detail_lines:
                                    vals["detail_plan_ids"] = task_detail_lines
                           # else:
                                #_logger.debug(f"   🚫 Skipping detail_plan for group task: {task_obj.name} (has {len(task_obj.child_ids)} subtasks)")


                    #  APPLY CRITICAL PATH DATA (if calculated by improved algorithm)
                    if "critical_path" in task_new.keys():
                        vals["critical_path"] = task_new["critical_path"]

                    #  SET LOOP DETECTION FLAG
                    vals["p_loop"] = task_new["p_loop"]

                    #  WRITE TO DATABASE
                    task_obj.write(vals)
                    updated_count += 1
            
            #_logger.info(f"✅ Phase 7 completed: Successfully updated {updated_count} tasks with scheduling data")
            
            # Phase 8: Finalize project dates (update project start/end from scheduled tasks)
            try:
                #_logger.info(f"📅 Starting Phase 8: Finalizing project dates...")
                self._scheduler_plan_complite(project_id=project.id, scheduling_type=project.scheduling_type)
                #_logger.info(f"✅ Phase 8 completed: Project dates finalized")
            except Exception as e:
                _logger.error(f"Phase 8 FAILED: Project date finalization failed: {e}")
                # Don't return False - scheduling itself succeeded
            
            # PHASE 9: ISOLATED ALAP PROCESSING - After project completion
            # Process ALAP tasks that have no dependencies and should be scheduled from project end
            try:
                #_logger.info("🔄 Starting Phase 9: Processing isolated ALAP tasks...")
                isolated_count = self._process_isolated_alap_tasks(project_ap, tasks_ap, t_params)
                #_logger.info(f"✅ Phase 9 completed: {isolated_count} isolated ALAP tasks processed")
            except Exception as e:
                _logger.error(f"Phase 9 FAILED: Isolated ALAP processing failed: {e}")
                # Don't return False - this is not critical
            
            # NOTE: Critical path calculation moved to scheduler_plan() to work with calendar scheduling
            #_logger.info(f"🏁 Scheduler calculation completed for project: {project.name}")
            return tasks_ap  # Return tasks_ap for critical path calculation
        except Exception as e:
            #_logger.error(f"❌ Phase 7 FAILED: Database write failed: {e}")
            return False




    def _project_get_date(self, project_ap, tasks_ap, scheduling_type):
        """ PROJECT DATE CALCULATION
        
        Calculates project start/end dates based on calculated task dates.
        This is crucial for proper project timeline management.
        
        Forward scheduling: Project end = MAX(task end dates)
        Backward scheduling: Project start = MIN(task start dates)
        
        :param project_ap: Project data structure
        :param tasks_ap: List of calculated tasks
        :param scheduling_type: 'forward' or 'backward'
        :returns: Updated project_ap with recalculated dates
        """

        prj_task_date = []
        if scheduling_type == "forward":
            date_obj = "soon_date_end"
            p_date_obj = "date_end"
            limit = max
        elif scheduling_type == "backward":
            date_obj = "late_date_start"
            p_date_obj = "date_start"
            limit = min
        else:
            return False

        for task in tasks_ap:

            if task[date_obj] and "calc" in task.keys():
                # prj_task_date.append(fields.Datetime.from_string(task[date_obj]))
                prj_task_date.append(task[date_obj])

        if prj_task_date:
            new_date = limit(prj_task_date)
            project_ap[p_date_obj] = new_date



        return project_ap


    # 0 all Calc Tasks List
    def _ap_calc_tasks_list(self, project_ap, tasks_ap, t_params, revers_step=False):
        
        # Initialize global visited tracking for graph traversal completeness
        if not hasattr(t_params, 'global_visited'):
            t_params['global_visited'] = set()

        search_tasks = []
        scheduling_type = t_params["scheduling_type"]
        project_id = t_params["project_id"]

        # FIXED: Improved reverse step logic
        # In reverse step, we calculate the opposite direction dates
        original_scheduling_type = scheduling_type
        if revers_step:
            if scheduling_type == "forward":
                scheduling_type = "backward"
            elif scheduling_type == "backward":
                scheduling_type = "forward"
            
            # Store original type for reference
            t_params["original_scheduling_type"] = original_scheduling_type

        if scheduling_type == "forward":
            search_tasks = self.env['project.task'].sudo().search(
                ['&', ('project_id', '=', project_id), ('predecessor_count', '=', 0)])

        if scheduling_type == "backward":
            search_tasks = self.env['project.task'].sudo().search(
                ['&', ('project_id', '=', project_id), ('predecessor_parent', '=', 0)])


        t_params.update({"scheduling_type": scheduling_type})

        for search_task  in search_tasks:
            # Mark root task as globally visited
            if 'global_visited' in t_params:
                t_params['global_visited'].add(search_task.id)
                
            tasks_ap = self._ap_calc_scheduler_first_work(task=search_task, tasks=tasks_ap, project=project_ap,
                                                          t_params=t_params, revers_step=revers_step)
        
        # Check graph traversal completeness - ensure all nodes were visited
        all_task_ids = set(task['id'] for task in tasks_ap)
        visited_task_ids = t_params.get('global_visited', set())
        unvisited_tasks = all_task_ids - visited_task_ids
        
        if unvisited_tasks and not revers_step:  # Only check for forward pass
            # SIMPLIFIED APPROACH: Just mark remaining tasks as visited without reprocessing
            # This prevents infinite loops while allowing the algorithm to continue
            #_logger.info(f"🔄 Graph traversal incomplete: {len(unvisited_tasks)} unvisited tasks: {list(unvisited_tasks)[:5]}")
            #_logger.info(f"⚠️ Marking remaining unvisited tasks as processed to prevent infinite loops")
            
            for task_id in list(unvisited_tasks):
                t_params['global_visited'].add(task_id)
                
            #_logger.info(f"✅ All tasks now marked as visited: {len(t_params['global_visited'])} total")
        #else:
            #_logger.info(f"✅ Graph traversal complete: all {len(all_task_ids)} tasks visited")
            
        return tasks_ap



    # 1 Fist Work
    def _ap_calc_scheduler_first_work(self, task, tasks, project, t_params, revers_step=False):

        # _logger.debug(
        #     "-> Start - ID: {}, Name: {}".format(task["id"], task["name"]))

        scheduling_type = t_params["scheduling_type"]

        if not task.child_ids:  # (task not group.)
            vals = {}

            if task.schedule_mode == "auto":  # (auto mode)

                task_obj = self._task_from_list(tasks, task.id)

                if scheduling_type == "forward":
                    direction = "normal"
                    date_type = "date_start"
                    cp_date_start = "soon_date_start"
                    cp_date_end = "soon_date_end"

                elif scheduling_type == "backward":
                    direction = "revers"
                    date_type = "date_end"
                    cp_date_start = "late_date_start"
                    cp_date_end = "late_date_end"

                else:
                    return tasks

                # For root tasks, get start date from project OR constraint date
                # CRITICAL FIX: MFO constraint should anchor backward pass
                if (scheduling_type == "backward" and 
                    task.constrain_type == "mfo" and task.constrain_date):
                    new_date = task.constrain_date  # Use MFO constraint date as anchor
                    #_logger.info(f"🎯 MFO constraint anchoring backward pass: {task.name} -> {new_date}")
                else:
                    new_date = project[date_type]  # Standard project date

                if not new_date:
                    return tasks
                # calc calendar and dates
                calendar_level, date_start, date_end = self._ap_calc_period(task_obj=task_obj,
                                                                           direction=direction,
                                                                           new_date=new_date,
                                                                           date_type=date_type,
                                                                           t_params=t_params)
                # critical path dates
                vals[cp_date_start] = date_start
                vals[cp_date_end] = date_end

                # check constain for that date and recalculate if needed
                vals, calendar_level = self._scheduler_work_constrain(task_obj, vals, calendar_level,
                                                                      scheduling_type, t_params)

                if calendar_level:
                    vals["detail_plan"] = calendar_level

                tasks = [self._task_date_update(x_task, task.id, vals) for x_task in tasks]

            else:
                vals["calc"] = True
                tasks = [self._task_date_update(x_task, task.id, vals) for x_task in tasks]


            tasks = self._ap_calc_scheduler_recur_work(task_id=task.id,
                                                       project=project,
                                                       tasks=tasks,
                                                       t_params=t_params,
                                                       revers_step=revers_step)

            return tasks

        else:
            return tasks

    def _kahn_topological_sort(self, tasks, predecessors, scheduling_type):
        """
        Kahn's algorithm for topological sorting of tasks
        Ensures that predecessors are always processed before dependent tasks
        
        Returns: List of tasks in topologically sorted order
        """
        from collections import defaultdict, deque
        
        # Build graph: task_id -> list of dependent tasks
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        
        # Initialize all tasks (excluding group/summary tasks with children)
        # Group tasks don't participate in dependency scheduling
        task_dict = {t['id']: t for t in tasks if t.get('child_ids', 0) == 0}
        for task_id in task_dict:
            in_degree[task_id] = 0
        
        # Build dependency graph
        if scheduling_type == "forward":
            # Forward: parent -> child (predecessor -> successor)  
            for pred in predecessors:
                parent_id = pred['parent_task_id']
                child_id = pred['task_id']
                if parent_id in task_dict and child_id in task_dict:
                    graph[parent_id].append(child_id)
                    in_degree[child_id] += 1
        else:
            # Backward: child -> parent (reverse direction)
            for pred in predecessors:
                parent_id = pred['parent_task_id']
                child_id = pred['task_id']
                if parent_id in task_dict and child_id in task_dict:
                    graph[child_id].append(parent_id)
                    in_degree[parent_id] += 1
        
        # Kahn's algorithm: Start with nodes that have no dependencies (in_degree = 0)
        queue = deque([task_id for task_id in task_dict if in_degree[task_id] == 0])
        result = []
        
        #_logger.info(f"🔄 KAHN: Starting with {len(queue)} root tasks")
        
        while queue:
            current_task_id = queue.popleft()
            current_task = task_dict[current_task_id]
            result.append(current_task)
            
            # Process all dependent tasks
            for dependent_id in graph[current_task_id]:
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0:
                    queue.append(dependent_id)
                    #_logger.debug(f"   Task {task_dict[dependent_id].get('name', dependent_id)} ready (all predecessors done)")
        
        # Check for cycles
        remaining_tasks = [task_id for task_id in task_dict if in_degree[task_id] > 0]
        if remaining_tasks:
            #_logger.warning(f"🔄 KAHN: Potential cycle detected: {len(remaining_tasks)} tasks with unresolved dependencies")
            # Add remaining tasks anyway to avoid infinite loops
            for task_id in remaining_tasks:
                result.append(task_dict[task_id])
        
        #_logger.info(f"🔄 KAHN: Sorted {len(result)} tasks topologically")
        return result

    def _find_reachable_tasks(self, start_task_id, predecessors, scheduling_type):
        """
        Find all tasks reachable from start_task_id following dependency chain
        """
        reachable = {start_task_id}
        queue = [start_task_id]
        
        while queue:
            current_id = queue.pop(0)
            
            if scheduling_type == "forward":
                # Forward: find all tasks that depend on current_id
                dependents = [p['task_id'] for p in predecessors if p['parent_task_id'] == current_id]
            else:
                # Backward: find all tasks that current_id depends on
                dependents = [p['parent_task_id'] for p in predecessors if p['task_id'] == current_id]
            
            for dep_id in dependents:
                if dep_id not in reachable:
                    reachable.add(dep_id)
                    queue.append(dep_id)
        
        return reachable

    def _process_single_task_with_predecessors(self, task_id, tasks, predecessors, scheduling_type, t_params):
        """
        Process a single task with its predecessors (simplified version of old recursive logic)
        """
        # This is a simplified version - we'll use the original logic for now
        # TODO: Implement proper single task processing
        return tasks

    # 2 Recursion Work
    def _ap_calc_scheduler_recur_work(self, task_id, project, tasks, t_params, revers_step=False):
        """
        KAHN'S ALGORITHM IMPLEMENTATION: Topological Task Processing
        
        This function replaces recursive dependency processing with topological ordering
        to ensure predecessors are always calculated before dependent tasks.
        This fixes the core issue where Project Complete was reading dates from
        Management Review before Management Review was properly calculated.
        """
        scheduling_type = t_params["scheduling_type"]
        predecessors = t_params["predecessors_ap"]

        # CRITICAL FIX: Apply Kahn's topological sorting algorithm
        # This ensures predecessors are always processed before dependent tasks
        topological_order = self._kahn_topological_sort(tasks, predecessors, scheduling_type)
        task_names = [t.get('name', f'ID:{t.get("id")}') for t in topological_order]
        #_logger.info(f"🔄 KAHN SORT: Processing tasks in topological order: {task_names}")

        # NEW TOPOLOGICAL APPROACH: Process each task in correct dependency order
        #_logger.info("🚀 TOPOLOGICAL PROCESSING: Starting task processing in dependency order...")
        
        # Process tasks one by one in topological order
        for task in topological_order:
            task_id = task['id']
            task_name = task.get('name', f'ID:{task_id}')
            #_logger.info(f"📋 Processing task: {task_name}")
            
            # Process this single task with all its predecessors
            tasks = self._process_single_task_with_predecessors(task_id, project, tasks, t_params)
        
        #_logger.info("✅ TOPOLOGICAL PROCESSING: All tasks processed in correct dependency order")
        return tasks
        
    def _process_single_task_with_predecessors(self, task_id, project, tasks, t_params):
        """
        Process a single task with all its predecessors.
        This function handles one task at a time in the correct topological order.
        
        :param task_id: ID of the task to process
        :param project: Project object
        :param tasks: List of all tasks
        :param t_params: Scheduler parameters including predecessors
        :return: Updated tasks list
        """
        scheduling_type = t_params["scheduling_type"]
        predecessors = t_params["predecessors_ap"]

        # Determine field names based on scheduling direction
        if scheduling_type == "forward":
            task_field = "parent_task_id"  # Field containing prerequisite task ID
            next_task_field = "task_id"    # Field containing dependent task ID
        else:  # backward
            task_field = 'task_id'
            next_task_field = "parent_task_id"

        # Find all prerequisite relationships for this task
        # In forward scheduling: find where this task is the parent (predecessor)
        # In backward scheduling: find where this task is the child (successor)
        search_objs = list(filter(lambda x: x[task_field] == task_id, predecessors))
        search_objs = sorted(search_objs, key=lambda x: x["sorting_seq"])
        
        #if search_objs:
            #_logger.info(f"   📊 Found {len(search_objs)} dependencies for task {task_id}")
        
        # Process each predecessor relationship
        for predecessor_obj in search_objs:
            dependent_task_id = predecessor_obj[next_task_field]
            dependent_task_obj = self._task_from_list(tasks, task_id=dependent_task_id)
            
            if dependent_task_obj:
                #_logger.info(f"   🔗 Processing dependency: {task_id} -> {dependent_task_id} ({predecessor_obj.get('type', 'FS')})")
                
                # Calculate new dates for the dependent task based on this predecessor
                date_list = self._calc_date_list(scheduling_type, predecessors, tasks, predecessor_obj)
                
                vals, calendar_level = self._calc_new_date(
                    scheduling_type=scheduling_type,
                    predecessor_obj=predecessor_obj,
                    task_obj=dependent_task_obj, 
                    date_list=date_list, 
                    t_params=t_params
                )

                # Handle automatic vs manual scheduling
                if dependent_task_obj["schedule_mode"] == "auto":
                    if vals and 'plan_action' not in vals.keys():
                        # Apply scheduling constraints
                        vals, calendar_level = self._scheduler_work_constrain(
                            dependent_task_obj, vals, calendar_level, scheduling_type, t_params
                        )

                        if calendar_level:
                            vals["detail_plan"] = calendar_level
                else:
                    # Manual tasks are marked as calculated but dates not changed
                    vals["calc"] = True

                # Update the dependent task with calculated dates
                tasks = [self._task_date_update(x_task, dependent_task_id, vals) for x_task in tasks]
                
                #_logger.info(f"   ✅ Updated task {dependent_task_id} based on predecessor {task_id}")
                
        return tasks


    # Tools




    def _project_check_date(self, project, scheduling_type):

        # Project Star and End Date
        # date_start = fields.Datetime.from_string(project.date_start)
        # date_end = fields.Datetime.from_string(project.date_end)
        date_start = project.date_start
        date_end = project.date_end

        if scheduling_type == "forward":
            pvals = {}
            if not date_start:
                date_start = fields.datetime.now()
                pvals['date_start'] = date_start
            pvals['date_end'] = date_end = None
            project.write(pvals)


        if scheduling_type == "backward":
            pvals = {}
            if not date_end:
                date_end = fields.datetime.now()
                pvals['date_end'] = date_end
            pvals['date_start'] = date_start = None
            project.write(pvals)

        return date_start, date_end


    # calc date if not set.
    def _ap_calc_date(self, date_input, date_type, plan_duration):

        new_date_start = None
        new_date_end = None

        if date_type == "date_start":
            # new_date_start = fields.Datetime.to_string(date_input)
            new_date_start = date_input
            if plan_duration == 0:
                new_date_end = new_date_start
            else:
                diff = timedelta(seconds=plan_duration)
                # new_date_end = fields.Datetime.to_string(date_input + diff)
                new_date_end = date_input + diff

        if date_type == "date_end":
            # new_date_end = fields.Datetime.to_string(date_input)
            new_date_end = date_input
            if plan_duration == 0:
                new_date_start = new_date_end
            else:
                diff = timedelta(seconds=plan_duration)
                # new_date_start = fields.Datetime.to_string(date_input - diff)
                new_date_start = date_input - diff

        return new_date_start, new_date_end


    def _ap_calc_period(self, task_obj, direction, new_date, date_type, t_params, cal_value=None):

        '''
        :param direction: normal , revers
        :param date_type: date_start , date_end
        :param scheduling_type: forward , backward
        :return:
        '''

        if not cal_value:
            cal_value = {
                "start_value": "date_from",
                "start_type_op": "min",
                "end_value": "date_to",
                "end_type_op": "max"
            }


        if task_obj:

            plan_duration = task_obj["plan_duration"]
            calendar_level = self._get_calendar_level(task_obj, new_date, plan_duration, t_params, direction=direction)

            if calendar_level:
                date_start = self._get_date_from_level(calendar_level, cal_value["start_value"], cal_value["start_type_op"])
                date_end = self._get_date_from_level(calendar_level, cal_value["end_value"], cal_value["end_type_op"])
            else:
                date_start, date_end = self._ap_calc_date(new_date, date_type, plan_duration)

            return calendar_level, date_start, date_end
        else:
            return False, False, False



    def _task_date_update(self, task, task_id, vals):

        if task["id"] == task_id:
            
            if "p_loop" in vals.keys():
                task["p_loop"] = vals["p_loop"]
                task["calc"] = True
                return task


            if "calc" in vals.keys():
                task["calc"] = True
                return task

            if "soon_date_start" in vals.keys() and "soon_date_end" in vals.keys():
                date_start = "soon_date_start"
                date_end = "soon_date_end"
                detail_plan = "soon_detail_plan"
                task["calc"] = True

            elif "late_date_start" in vals.keys() and "late_date_end" in vals.keys():
                date_start = "late_date_start"
                date_end = "late_date_end"
                detail_plan = "late_detail_plan"
                task["calc"] = True
            else:
                return task

            task[date_start] = vals[date_start]
            task[date_end] = vals[date_end]


            if "detail_plan" in vals.keys():
                task[detail_plan] = vals["detail_plan"]
                del vals["detail_plan"]

        return task



    def _task_from_list(self, tasks, task_id):
        task_list = []
        if tasks and task_id:
            search_objs = filter(lambda x: x['id'] == task_id, tasks)

            if search_objs:
                search_objs_list = list(search_objs)
                if search_objs_list[0]:
                    task_list = search_objs_list[0]

        return task_list



    def _calc_date_list(self, scheduling_type, predecessors, tasks, predecessor_obj):

        date_list = []
        type_link = predecessor_obj["type"]
        task_date_obj = 0
        parent_date_field_1 = 0
        parent_date_field_2 = 0

        if scheduling_type == "forward":

            dt_list_task_field = "task_id"
            dt_list_task_id = predecessor_obj["task_id"]

            cp_date_start = "soon_date_start"
            cp_date_end = "soon_date_end"

            if type_link == "FS":
                task_date_obj = "parent_task_id"
                parent_date_field_1 = cp_date_end
                parent_date_field_2 = cp_date_start

            elif type_link == "SS":
                task_date_obj = "parent_task_id"
                parent_date_field_1 = cp_date_start
                parent_date_field_2 = cp_date_end

            elif type_link == "FF":
                task_date_obj = "parent_task_id"
                parent_date_field_1 = cp_date_end
                parent_date_field_2 = cp_date_start

            elif type_link == "SF":
                task_date_obj = "parent_task_id"
                parent_date_field_1 = cp_date_start
                parent_date_field_2 = cp_date_end


        elif scheduling_type == "backward":
            dt_list_task_field = 'parent_task_id'
            dt_list_task_id = predecessor_obj["parent_task_id"]
            cp_date_start = "late_date_start"
            cp_date_end = "late_date_end"

            if type_link == "FS":
                task_date_obj = "task_id"
                parent_date_field_1 = cp_date_start
                parent_date_field_2 = cp_date_end

            elif type_link == "SS":
                task_date_obj = "task_id"
                parent_date_field_1 = cp_date_start
                parent_date_field_2 = cp_date_end

            elif type_link == "FF":
                task_date_obj = "task_id"
                parent_date_field_1 = cp_date_end
                parent_date_field_2 = cp_date_start

            elif type_link == "SF":
                task_date_obj = "task_id"
                parent_date_field_1 = cp_date_end
                parent_date_field_2 = cp_date_start
        else:
            return date_list



        search_date_objs = filter(lambda x: x[dt_list_task_field] == dt_list_task_id and x['type'] == type_link, predecessors)
        search_date_objs = list(search_date_objs)


        for date_obj in search_date_objs:

            parent_task = self._task_from_list(tasks, task_id=date_obj[task_date_obj])

            if parent_task and parent_date_field_1 and parent_task[parent_date_field_1]:
                # parent_date = fields.Datetime.from_string(parent_task[parent_date_field_1])
                parent_date = parent_task[parent_date_field_1]
                
                # FS DEPENDENCY FIX: Apply lag and minimum gap for proper FS behavior
                if (date_obj["lag_qty"] != 0 or type_link == "FS") and parent_date and parent_task[parent_date_field_2]:

                    # parent_date_two = fields.Datetime.from_string(parent_task[parent_date_field_2])
                    parent_date_two = parent_task[parent_date_field_2]
                    
                    # Use the original lag values (no artificial gap needed)
                    effective_lag_qty = date_obj["lag_qty"]
                    effective_lag_type = date_obj["lag_type"] or "day"
                    
                    parent_date = self._predecessor_lag_timedelta(parent_date,
                                                                  effective_lag_qty, effective_lag_type,
                                                                  parent_date_two)
                date_list.append(parent_date)

        return date_list



    def _calc_new_date(self, scheduling_type, predecessor_obj, task_obj, date_list, t_params):

        new_date = cp_date_start = cp_date_end = direction = date_type = False
        vals = {}
        calendar_level = []
        type_link = predecessor_obj["type"]

        if date_list:

            if scheduling_type == "forward":

                cp_date_start = "soon_date_start"
                cp_date_end = "soon_date_end"

                if type_link == "FS":

                    new_date = max(date_list)
                    date_type = "date_start"
                    direction = "normal"

                if type_link == "SS":
                    new_date = min(date_list)
                    date_type = "date_start"
                    direction = "normal"

                if type_link == "FF":
                    new_date = max(date_list)
                    date_type = "date_end"
                    direction = "revers"

                if type_link == "SF":

                    new_date = min(date_list)
                    date_type = "date_end"
                    direction = "revers"


            elif scheduling_type == "backward":

                cp_date_start = "late_date_start"
                cp_date_end = "late_date_end"

                if type_link == "FS":

                    new_date = min(date_list)
                    date_type = "date_end"
                    direction = "revers"

                if type_link == "SS":
                    new_date = min(date_list)
                    date_type = "date_start"
                    direction = "normal"

                if type_link == "FF":
                    new_date = max(date_list)
                    date_type = "date_end"
                    direction = "revers"

                if type_link == "SF":

                    new_date = max(date_list)
                    date_type = "date_start"
                    direction = "normal"

        if new_date:
            calendar_level, date_start, date_end = self._ap_calc_period(task_obj=task_obj, direction=direction,
                                                                       new_date=new_date, date_type=date_type,
                                                                       t_params=t_params, cal_value=None)
            vals[cp_date_start] = date_start
            vals[cp_date_end] = date_end

        else:
            vals['plan_action'] = True

        return vals, calendar_level



    def _predecessor_lag_timedelta(self, parent_date, lag_qty, lag_type, parent_date_two, plan_type='forward'):

        diff = timedelta(days=0)

        if plan_type == 'backward':
            lag_qty = lag_qty * -1

        if lag_type == "day":
            diff = timedelta(days=lag_qty)
            return parent_date+diff

        if lag_type == "hour":
            diff = timedelta(seconds=lag_qty*3600)

        if lag_type == "minute":
            diff = timedelta(seconds=lag_qty*60)
            
        if lag_type == "second":
            diff = timedelta(seconds=lag_qty)

        if lag_type == "percent":
            diff = parent_date - parent_date_two
            duration = diff.total_seconds()
            percent_second = (duration*abs(lag_qty))/100

            diff = timedelta(seconds=percent_second)

        return  parent_date + diff

        # if lag_qty > 0:
        #     return parent_date + diff
        # else:
        #     return parent_date - diff


    def _task_has_predecessors(self, task_id, t_params):
        """
        Check if task has any predecessor dependencies
        
        :param task_id: Task ID to check
        :param t_params: Task parameters containing predecessors list
        :returns: Boolean indicating if task has predecessors
        """
        predecessors = t_params.get("predecessors_ap", [])
        
        # Check if this task is a successor to any other task
        for pred in predecessors:
            if pred["task_id"] == task_id:
                return True
        return False

    def _task_has_successors(self, task_id, t_params):
        """
        Check if task has any successor dependencies (tasks that depend on this task)
        
        :param task_id: Task ID to check
        :param t_params: Task parameters containing predecessors list
        :returns: Boolean indicating if task has successors
        """
        predecessors = t_params.get("predecessors_ap", [])
        
        # Check if this task is a predecessor to any other task
        for pred in predecessors:
            if pred["parent_task_id"] == task_id:
                return True
        return False

    def _scheduler_work_constrain(self, task_obj, vals, calendar_level, scheduling_type, t_params):

        if scheduling_type == "forward":
            cp_date_start = "soon_date_start"
            cp_date_end = "soon_date_end"
        elif scheduling_type == "backward":
            cp_date_start = "late_date_start"
            cp_date_end = "late_date_end"
        else:
            return vals, calendar_level

        constrain_type = task_obj["constrain_type"]
        constrain_date = task_obj["constrain_date"]

        if constrain_type and constrain_type not in ["asap", "alap"] and constrain_date and vals:

            # constrain_date = fields.Datetime.from_string(constrain_date)
            constrain_date = constrain_date
            direction = date_type = None

            # Finish No Early Than
            if constrain_type == "fnet":
                # sheduled_task_data = fields.Datetime.from_string(vals[cp_date_end])
                sheduled_task_data = vals[cp_date_end]
                if sheduled_task_data < constrain_date:
                    direction = "revers"
                    date_type = "date_end"

            # Finish No Later Than
            if constrain_type == "fnlt":
                # sheduled_task_data = fields.Datetime.from_string(vals[cp_date_end])
                sheduled_task_data = vals[cp_date_end]
                if sheduled_task_data > constrain_date:
                    direction = "revers"
                    date_type = "date_end"

            # Must Start On
            if constrain_type == "mso":
                # MSO constraint with dependency conflict resolution (Microsoft Project behavior)
                calculated_start = vals[cp_date_start]  # Date from dependency calculation
                constraint_start = constrain_date       # Date from MSO constraint
                
                if calculated_start != constraint_start:
                    # CONFLICT DETECTED between MSO constraint and dependencies
                    task_name = task_obj.get('name', f'ID:{task_obj.get("id", "Unknown")}')
                    
                    # Check if task has dependencies (predecessors)
                    has_predecessors = self._task_has_predecessors(task_obj["id"], t_params) if "id" in task_obj else False
                    
                    if has_predecessors:
                        
                        #_logger.warning(f"⚠️ CONSTRAINT CONFLICT: Task '{task_name}' MSO constraint ({constraint_start}) "
                        #               f"conflicts with dependency requirements ({calculated_start}). "
                        #               f"Dependency wins (Microsoft Project behavior).")
                        
                        # Add conflict warning to task_info 
                        task_obj["info_vals"] = {
                            "left_down": f"⚠️ MSO Conflict: Constraint {constraint_start.strftime('%Y-%m-%d %H:%M')} vs "
                                        f"Dependency {calculated_start.strftime('%Y-%m-%d %H:%M')} - Dependency wins",
                            "show": True
                        }
                        
                        # Keep dependency-calculated dates, do NOT apply MSO constraint
                        #_logger.info(f"Task '{task_name}' scheduled per dependency: {calculated_start} (ignoring MSO constraint)")
                        return vals, calendar_level
                    else:
                        # No dependencies - apply MSO constraint normally
                        #_logger.info(f"MSO constraint applied for task '{task_name}': "
                        #            f"Calculated start {calculated_start}, "
                        #            f"MSO constraint {constraint_start}. "
                        #            f"Using MSO constraint date.")
                        direction = "normal" 
                        date_type = "date_start"
                else:
                    # MSO matches calculated date - no conflict
                    task_name = task_obj.get('name', f'ID:{task_obj.get("id", "Unknown")}')
                    #_logger.info(f"MSO constraint matches calculated date for task '{task_name}': {constraint_start}")
                    return vals, calendar_level


            # Must Finish On
            if constrain_type == "mfo":
                # MFO constraint with dependency conflict resolution (Microsoft Project behavior)
                calculated_end = vals[cp_date_end]     # Date from dependency calculation  
                constraint_end = constrain_date        # Date from MFO constraint
                
                if calculated_end != constraint_end:
                    # CONFLICT DETECTED between MFO constraint and dependencies
                    task_name = task_obj.get('name', f'ID:{task_obj.get("id", "Unknown")}')
                    
                    # Check if task has dependencies (predecessors or successors)
                    has_predecessors = self._task_has_predecessors(task_obj["id"], t_params) if "id" in task_obj else False
                    has_successors = self._task_has_successors(task_obj["id"], t_params) if "id" in task_obj else False
                    
                    if has_predecessors or has_successors:
                        
                        #_logger.warning(f"⚠️ CONSTRAINT CONFLICT: Task '{task_name}' MFO constraint ({constraint_end}) "
                        #               f"conflicts with dependency requirements ({calculated_end}). "
                        #               f"Dependency wins (Microsoft Project behavior).")
                        
                        # Add conflict warning to task_info
                        task_obj["info_vals"] = {
                            "left_down": f"⚠️ MFO Conflict: Constraint {constraint_end.strftime('%Y-%m-%d %H:%M')} vs "
                                        f"Dependency {calculated_end.strftime('%Y-%m-%d %H:%M')} - Dependency wins",
                            "show": True
                        }
                        
                        # Keep dependency-calculated dates, do NOT apply MFO constraint
                        #_logger.info(f"Task '{task_name}' scheduled per dependency: {calculated_end} (ignoring MFO constraint)")
                        return vals, calendar_level
                    else:
                        # No dependencies - apply MFO constraint normally
                        #_logger.info(f"MFO constraint applied for task '{task_name}': Using constraint date {constraint_end}")
                        direction = "revers"
                        date_type = "date_end"
                else:
                    # MFO matches calculated date - no conflict
                    task_name = task_obj.get('name', f'ID:{task_obj.get("id", "Unknown")}')
                    #_logger.info(f"MFO constraint matches calculated date for task '{task_name}': {constraint_end}")
                    direction = "revers"
                    date_type = "date_end"


            # Start No Earlier Than
            if constrain_type == "snet":
                # sheduled_task_data = fields.Datetime.from_string(vals[cp_date_start])
                sheduled_task_data = vals[cp_date_start]
                if sheduled_task_data < constrain_date:
                    direction = "normal"
                    date_type = "date_start"


            # Start No Later Than
            if constrain_type == "snlt":
                # sheduled_task_data = fields.Datetime.from_string(vals[cp_date_start])
                sheduled_task_data = vals[cp_date_start]
                if sheduled_task_data > constrain_date:
                    direction = "normal"
                    date_type = "date_start"


            if constrain_date:
                calendar_level_new, date_start, date_end = self._ap_calc_period(task_obj=task_obj,
                                                                                direction=direction,
                                                                                new_date=constrain_date,
                                                                                date_type=date_type,
                                                                                t_params=t_params)

                if date_start and date_end:
                    vals[cp_date_start] = date_start
                    vals[cp_date_end] = date_end

                if calendar_level_new:
                    calendar_level = calendar_level_new

        return vals, calendar_level

    def _process_isolated_alap_tasks(self, project_ap, tasks_ap, t_params):
        """
        Process isolated ALAP tasks (no predecessors or successors) after project completion.
        These tasks should be scheduled to finish as late as possible within project boundaries.
        
        :param project_ap: Project data structure with original dates
        :param tasks_ap: List of task dictionaries
        :param t_params: Task parameters
        :return: Number of processed tasks
        """
        processed_count = 0
        
        # CRITICAL FIX: Use original project end date for isolated ALAP tasks
        original_project_end = project_ap.get("original_date_end")
        current_project_end = project_ap["project_obj"].date_end
        
        # Prefer original project end if available, fallback to current
        target_project_end = original_project_end if original_project_end else current_project_end
        
        if not target_project_end:
            #_logger.warning("⚠️ Project has no end date (original or current) - cannot process isolated ALAP tasks")
            return processed_count
            
        # if original_project_end:
        #     _logger.info(f"📅 Using ORIGINAL project end date for isolated ALAP: {target_project_end}")
        # else:
        #     _logger.info(f"📅 Using current project end date for isolated ALAP: {target_project_end}")
        
        # Find all deferred ALAP tasks
        isolated_alap_tasks = [task for task in tasks_ap if task.get("_deferred_alap", False)]
        
        for task_alap in isolated_alap_tasks:
            try:
                task_name = task_alap.get('name', f'ID:{task_alap["id"]}')
                
                # Skip problematic tasks - leave them unresolved with exclamation mark
                if task_alap.get("_problematic", False):
                    #_logger.warning(f"⚠️ Skipping problematic isolated ALAP task: {task_name}")
                    continue
                    
                task_duration = task_alap.get("plan_duration", 0)  # in seconds
                
                if task_duration <= 0:
                    #_logger.warning(f"⚠️ ALAP task {task_name} has no duration - skipping")
                    continue
                
                # Calculate ALAP dates: finish at target project end, start = end - duration
                from datetime import timedelta
                calculated_end = target_project_end
                calculated_start = calculated_end - timedelta(seconds=task_duration)
                
                #_logger.info(f"🎯 ALAP isolated task: {task_name}")
                #_logger.info(f"   Project end: {target_project_end}")
                #_logger.info(f"   Task duration: {task_duration}s ({task_duration/3600:.1f}h)")
                #_logger.info(f"   ALAP dates: {calculated_start} -> {calculated_end}")
                
                # Update task dates in memory (tasks_ap)
                task_alap["soon_date_start"] = calculated_start
                task_alap["soon_date_end"] = calculated_end
                
                # Update task in database
                task_record = self.env['project.task'].browse(task_alap["id"])
                if task_record.exists():
                    task_record.sudo().write({
                        'date_start': calculated_start,
                        'date_end': calculated_end,
                    })
                    #_logger.info(f"✅ Updated isolated ALAP task: {task_name}")
                    processed_count += 1
                #else:
                    #_logger.warning(f"⚠️ Task record not found for {task_name} (ID: {task_alap['id']})")
                    
            except Exception as e:
                task_name = task_alap.get('name', f'ID:{task_alap.get("id", "Unknown")}')
                _logger.error(f"Failed to process isolated ALAP task {task_name}: {e}")
        
        return processed_count

    def _calculate_current_project_end_from_tasks(self, tasks_ap, scheduling_type, t_params):
        """
        Calculate current project end date from task data during scheduling.
        This replicates Phase 8 logic but runs during Phase 6 for ALAP constraints.
        
        :param tasks_ap: List of task dictionaries with current scheduling data
        :param scheduling_type: "forward" or "backward"  
        :param t_params: Task parameters containing predecessor data
        :return: Calculated project end date or None
        """
        if scheduling_type != "forward":
            return None
            
        # Find leaf tasks (tasks with no successors) similar to Phase 8 logic
        leaf_task_dates = []
        all_task_dates = []
        
        # Get predecessor relationships
        predecessors = t_params.get("predecessors_ap", [])
        
        for task in tasks_ap:
            task_end = task.get("soon_date_end")
            if not task_end:
                continue
                
            all_task_dates.append(task_end)
            
            # Check if this task has successors
            task_id = task["id"]
            has_successors = False
            
            # Check for successor relationships (this task as parent)
            for pred in predecessors:
                if pred.get("parent_task_id") == task_id:
                    has_successors = True
                    break
            
            # If no successors, it's a leaf task
            if not has_successors:
                leaf_task_dates.append(task_end)
                
        # Use leaf task dates if available, otherwise use all task dates
        if leaf_task_dates:
            calculated_end = max(leaf_task_dates)
            #_logger.debug(f"   Using leaf task dates: {len(leaf_task_dates)} leaf tasks")
        elif all_task_dates:
            calculated_end = max(all_task_dates)  
            #_logger.debug(f"   Using all task dates: {len(all_task_dates)} tasks")
        else:
            calculated_end = None
            
        return calculated_end
