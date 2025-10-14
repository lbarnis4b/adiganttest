========================
Task Start Stop upgraded
========================

This moduel adds Start/Stop buttons on Tasks (Form and Kanban view) and measures time spent working on task.
Works with multiple users using Start/Stop on same Task.

Version 4.2.0.B20250116
------------------------
#. Start and Stop buttons on project form moved to header and made conditional.

Version 4.1.0.B20250109
------------------------
#. start_date and end_date visibility limited to HR manager.

Version 4.0.0.B20241212
------------------------
#. Migrated to Odoo 16

Update 3.1.0 (Szelyes Csaba)
----------------------------
#. Bug fixing in "action_stop" method: self.write({'chrono_date_end': datetime.now(), 'start_stop': False, 'running_work_description': '', 'chrono_date_start': False})

Update 2.1.0 (Lorincz Barna)
----------------------------

#. Write rights to start stop related user fields

Developped by
-------------

* Bossinfo <office@bossinfo.ro>
* Lorincz Barna <barni@bossinfo.ro>
