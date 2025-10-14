
=================
Task deliverables
=================

Documentation that need to be delivered to third party about this project/task.

Version 6.0.1 LB - 2025.06.30
================================
#. send_alert job methid corrected

Version 6.0.0.B20241127
=========================
#. Migrated to Odoo16 asis

Version 5.3.0 (Lorincz Barna - 2021.03.22)
------------------------------------------
#. Version 4.2.0 and version 5.0.0 combined
#. Deprecated lines removed from code 

Version 4.2.0 (Lorincz Barna - 2021.01.19)
------------------------------------------
#. Alert active is now linked to Alert date. If you set alert date, alert will activate automatically. You can still deactivate it, if you want.

Version 4.1.0 (Lorincz Barna - 2020.12.07)
------------------------------------------
#. Not finalized search filter added
#. Not finalized search filter made default filter on Deliverables menu

Version 5.0.0 (Lorincz Barna - 2020.03.13)
------------------------------------------
#. Works with (and is dependent on) s4b_project_templates
#. If project has task with deliverable lines, template button will not give warning, instead you can make that project a template and at the creation of new project all the deliverable lines are copied

Version 4.0.0 (Lorincz Barna)
-----------------------------
#. New fields on deliverable lines: Comment, Type, Stage
#. Type and Stage settings on Project/Configuration/Deliverables menu
#. Alert fields on lines

Update 3.2.0 (Lorincz Barna)
----------------------------
#. Project id modified to stored field
#. Create method modified to store project id
#. onchange method to task_id - modifies project_id
#. server action to update all project ids

Update 2.2.0 (Lorincz Barna)
----------------------------
#. Tree view made editable

Update 2.1.0 (Lorincz Barna)
----------------------------
#. Project id added to model as related field - brings the project of the task
#. Project/Deliverables menuitem created
#. Tree view and search view to Reports/Deliverables menuitem - tree view for viewing only - no delete, edit, create

Developped by
-------------

* Soft4biz <office@soft4biz.ro>
* Lorincz Barna <barni@soft4biz.ro>
