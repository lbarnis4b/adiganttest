=================================
Project Category
=================================
This odoo module will help the user with the creating of project Category and can select the category in Project.

Version 16.0.7.0.0.B20240113
===============================
#. Reverted to basic version
#. start_date, end_date part removed
#. reports removed
#. Subtask/parent task stuff removed

Version 16.0.6.0.0.I20241108
===============================
#. Added start_date, end_date to project_task
#. Every subtask will have the same start_date, end_date as the parent task

Version 16.0.5.1.0.B20241107
===============================
#. Task#5204 - task_category_id inherited (with onchange - can be changed) from parent_id if task has parent and parent has task_category_id

Version 16.0.5.0.0.B20241014
===============================
#. Changed templates ids to be more descriptive
#. Cosiderably improved the code quality of the reports
#. Added Evaluation to task_type_group 
#. Made Evaluation Work Report - Grouped (like timesheet_report_ext_grouped_with_duration but filtered task_type_group == 'eval')

Version 16.0.4.0.100.B20241003
===============================
This is a temporary version for migration reasons. 
---------------------------------------------------
After succesfull migration of data to 16, these modifications can be disregarded.

#. Added accountability field to project_task_category table - for compatibility reasons with odoo10 migration
#. Added odoo10_id for migration reasons

Version 16.0.4.0.0.I20240917
=============================
#. Put back task_type_group because it was removed after migration, and it is needed for the reports
#. Put back accountable_amount because it was skipped after migration
#. Migrated reports related to timesheet  (Work report - Grouped, Work report - Detailed)

Version 16.0.3.0.0.B20240806
=============================
Migrated to Odoo16
-------------------
#. Modified to include both Project and Task types
#. Color codes added

Version 2.0.0.B20240719
========================
Project kanban facelift
-------------------------
#. Category added to project kanban view correctly (the big eye in the sky)
#. Category groupping bugs resolved
#. Folded groupping resolved

Version 1.0.0.B20240610
========================
First working version