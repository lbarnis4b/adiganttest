# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
import logging

from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)  # Need for message in console.


class MrpProductionPredecessor(models.Model):
    _name = 'mrp.production.predecessor'
    _inherit = ['gantt.native.predecessor']

    task_id = fields.Many2one('mrp.production', 'Task', ondelete='cascade')
    parent_task_id = fields.Many2one('mrp.production', 'Parent Task', required=True, ondelete='restrict')


    _sql_constraints = [
        ('mrp_production_predecessor_uniq', 'unique(task_id, parent_task_id, type)', 'Must be unique.'),

    ]


    def unlink(self):

        parent_task_id = self.parent_task_id
        res = super(MrpProductionPredecessor, self).unlink()


        if res:
            search_if_parent = self.env['mrp.production.predecessor'].sudo().search_count(
                [('parent_task_id', '=', parent_task_id.id)])

            if not search_if_parent:
                parent_task_id.write({
                    'predecessor_parent': 0
                })

        return res