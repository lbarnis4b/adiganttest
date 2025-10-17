from odoo import models, fields, api, _
import logging
_logger = logging.getLogger(__name__)  # Need for message in console.


class Project(models.Model):
    _inherit = "project.project"

    fold = fields.Boolean(name="Fold Project", help="Fold project", default=False)


class ProjectTaskNative(models.Model):
    _name = 'project.task'
    _inherit = 'project.task'

    fold = fields.Boolean(string="Fold Task", help="Fold task", default=False)
    sorting_seq = fields.Integer(string='Sorting Seq.', default=0)
    sorting_level = fields.Integer('Sorting Level', default=0)


    @api.model
    def tree_update(self, tree_data, id_update, parent_id):


        for idx, val in enumerate(tree_data):


            if not val["is_group"]:

                id = val["id"]
                # seq = val["sorting_seq"]

                var_data = {
                    "sorting_seq": idx,
                    "sorting_level": val["sorting_level"],
                    "plan_action": val["plan_action"],
                }


                if id == id_update:

                    var_data["parent_id"] = None
                    if parent_id and isinstance(parent_id,int):
                        var_data["parent_id"] = parent_id

                task_obj_search = self.sudo().search([('id', '=', int(id))])
                task_obj_search.sudo().write(var_data)

        # Recalculate WBS codes after hierarchy changes
        if id_update:
            updated_task = self.sudo().search([('id', '=', int(id_update))])
            if updated_task.project_id:
                # Get all tasks in the project and recalculate WBS codes
                project_tasks = self.sudo().search([
                    ('project_id', '=', updated_task.project_id.id)
                ])
                # Force recomputation of WBS codes
                project_tasks._compute_wbs_code()

        return True


    @api.model
    def fold_update(self, task_ids):

        for key, val in task_ids.items():
            id = key

            var_data = {
                "fold": val,
            }

            task_obj_search = self.sudo().search([('id', '=', int(id))])
            task_obj_search.sudo().write(var_data)

        return True

