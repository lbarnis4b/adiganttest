/** @odoo-module **/

import {Component, onMounted, useState, onWillStart, onWillUnmount, onWillUpdateProps, useExternalListener, xml, useRef} from "@odoo/owl";
import {useBus} from "@web/core/utils/hooks";

export class GanttWbsColumn extends Component {

    static props = [
        "item_list_z",
        "options",
        "parent"
    ];

    setup() {
        this.options = this.props.options;
        this.parent = this.props.parent;

        this.state = useState({
            items_wbs: [],
            show_wbs: this.shouldShowWbs(),
            tree_view: this.props.options.tree_view,
            item_list_z: this.props.item_list_z
        });

        onWillUpdateProps((nextProps) => {
            this.parent = nextProps.parent;
            this.options = nextProps.options;
            this.state.show_wbs = this.shouldShowWbs();
            this.state.tree_view = nextProps.options.tree_view;
            this.state.item_list_z = nextProps.item_list_z;

            this.initializeWbsItems();
        });

        // Listen for row hover events from other components
        useBus(this.env.bus, 'handleRowHover', this.handleRowHover.bind(this));

        onMounted(() => {
            this.initializeWbsItems();
        });
    }

    shouldShowWbs() {
        // For now, use user preference from localStorage
        // TODO: Later integrate with project-level setting
        return Boolean(this.props.parent.show_wbs);
    }

    initializeWbsItems() {
        const item_list_z = this.state.item_list_z;
        this.state.items_wbs = [];

        if (!this.state.show_wbs) {
            return;
        }

        item_list_z.forEach(node => {
            let item = {
                id: node.zt_id,
                key: `wbs-${node.zt_id}`,
                wbs_code: node.wbs_code,
                fold: node.fold,
                open: node.open,
                isParent: node.isParent,
                is_group: node.is_group,
                display: 'block'
            };

            if (item.fold === true && this.state.tree_view === true) {
                item.display = 'none';
            }

            // Only show WBS for actual tasks (not groups)
            if (item.wbs_code && !item.is_group) {
                item.text = item.wbs_code;
            } else {
                item.text = '';
            }

            this.state.items_wbs.push(item);
        });
    }

    handleRowHover(ev) {
        // Safety check - ensure event detail exists
        if (!ev || !ev.detail) {
            return;
        }
        
        const { zt_id, hover } = ev.detail;
        
        // Ensure zt_id exists
        if (zt_id === undefined || zt_id === null) {
            return;
        }
        
        const wbsElement = document.getElementById(`wbs-item-${zt_id}`);
        
        if (wbsElement) {
            if (hover) {
                wbsElement.classList.add('gantt-wbs-item-hover');
            } else {
                wbsElement.classList.remove('gantt-wbs-item-hover');
            }
        }
    }

    onWbsItemMouseOver(item, event) {
        // Trigger hover event for other components to sync
        this.env.bus.trigger('handleRowHover', { zt_id: item.id, hover: true });
    }

    onWbsItemMouseOut(item, event) {
        // Trigger hover out event for other components to sync
        this.env.bus.trigger('handleRowHover', { zt_id: item.id, hover: false });
    }
}

GanttWbsColumn.template = xml/*xml*/`
<div class="gantt-wbs-column" t-if="state.show_wbs">
    <div class="gantt-wbs-items">
        <t t-foreach="state.items_wbs" t-as="item" t-key="item.key">
            <div class="gantt-wbs-item" 
                 t-att-id="'wbs-item-' + item.id" 
                 t-att-style="'display: ' + item.display"
                 t-on-mouseover="(ev) => this.onWbsItemMouseOver(item, ev)"
                 t-on-mouseout="(ev) => this.onWbsItemMouseOut(item, ev)">
                <span class="gantt-wbs-code" t-esc="item.text"/>
            </div>
        </t>
    </div>
</div>
`;