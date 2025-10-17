# -*- coding: utf-8 -*-
from . import project_task
from . import project_task_tree
from . import project_task_tree_update
from . import project_task_calendar
from . import project_task_scheduler
from . import project_task_detail_plan
from . import project_task_info
from . import project_task_critical_path  # Simple critical path marking (from v17)
from . import project_task_cycle_detection
from . import project_task_scheduler_calendar
from . import project_task_resource
from . import resource

# Critical path is now calculated after scheduling completes in scheduler_plan() (moved from Phase 10)

