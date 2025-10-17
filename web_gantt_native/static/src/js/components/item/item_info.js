/** @odoo-module **/

import {Component, onMounted, useState, onWillStart, onWillUnmount, onWillUpdateProps, useExternalListener, xml, useRef} from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { formatDate } from "@web/core/l10n/dates";
import { loadJS } from "@web/core/assets";

const { DateTime } = luxon;

export class GanttListInfo extends Component {

    static props = [
        "options",
        "parent",
        "item_list_z"
    ];

    setup() {

        this.options = this.props.options;
        this.parent = this.props.parent;

        this.state = useState({
            items_info: [],  // Ensure items is initialized as an empty array
            items_start: [],
            items_stop: [],
            items_sorted: this.props.options.items_sorted,
            export_wizard: this.props.options.export_wizard,
            main_group_id_name: this.props.options.main_group_id_name,
            action_menu: this.props.options.action_menu,
            tree_view: this.props.options.tree_view,
            item_list_z: this.props.item_list_z
        });

        //this.initializeItems();

        // onWillStart(async () => {
        //     await loadJS('/web_widget_time_delta/static/src/lib/duration-humanize/humanize-duration.js');
        // });

        onWillUpdateProps((nextProps) => {
            this.parent = nextProps.parent;
            this.options = nextProps.options;
            this.state.items_sorted = nextProps.options.items_sorted;
            this.state.export_wizard = nextProps.options.export_wizard;
            this.state.main_group_id_name = nextProps.options.main_group_id_name;
            this.state.action_menu = nextProps.options.action_menu;
            this.state.tree_view = nextProps.options.tree_view;
            this.state.item_list_z = nextProps.item_list_z;

            this.initializeItems();

        });

        onMounted(() => {
            //this.env.bus.addEventListener("widget-update", (ev) => this.widgetUpdate(ev));
            this.initializeItems();
        });
        //
        // onWillUnmount(() => {
        //     this.env.bus.removeEventListener("widget-update", (ev) => this.widgetUpdate(ev));
        //
        // });

    }

    // widgetUpdate(ev) {
    //     console.log("Item)info", this.parent.list_show);
    //     //this.widget[ev.detail.name] = ev.detail.value;
    //     //'$zTree' == ev.detail.name
    //     if (ev.detail.name === '$zTree') {
    //         this.state.$zTree = ev.detail.value;
    //         this.initializeItems();
    //     }
    // }

    initializeItems() {
        const item_list_z = this.state.item_list_z;
        this.state.items_info = [];
        this.state.items_start = [];
        this.state.items_stop = [];

        if (this.parent.list_show === 1) { // "basic" mode - hide all columns
            return;
        }

        item_list_z.forEach(node => {
            // Info ...
            let item = {
                id: node.zt_id,
                key: node.uniq,
                allowRowHover: true,
                fold: node.fold,
                open: node.open,
                child_text: node.child_text,
                duration: node.duration,
                duration_scale: node.duration_scale,
                task_start: node.date_start,
                task_stop: node.date_stop,
                isParent: node.isParent,
                display: 'block'
            };

            if (item.fold === true && this.state.tree_view === true) {
                item.display = 'none';
            }

            // Duration column (show in modes 0, -1)
            if (this.parent.list_show === 0 || this.parent.list_show === -1) {
                if (item.duration) {
                    let duration_humanize = humanizeDuration(item.duration * 1000, { round: true });
                    if (item.duration_scale) {
                        const duration_units = item.duration_scale.split(",");
                        duration_humanize = humanizeDuration(item.duration * 1000, { units: duration_units, round: true });
                    }
                    item.key = `duration-${node.zt_id}`;
                    item.text = duration_humanize;
                    item.class = 'task-gantt-item-info ' + (item.isParent ? 'task-gantt-items-subtask' : '');
                    item.style = 'float: right;';
                }
                this.state.items_info.push(item);
            }

            // Start-Stop columns (show in mode -1 - full mode)
            if (this.parent.list_show === -1) {
                let item_start = { ...item };
                item_start.text = '';

                if (item_start.task_start) {
                    const start_date_html = formatDate(DateTime.fromISO(item_start.task_start));
                    item_start.key = `start-${node.zt_id}`;
                    item_start.text = start_date_html;
                    item_start.class = 'task-gantt-item-info ' + (item_start.isParent ? 'task-gantt-items-subtask' : '');
                    item_start.style = 'float: right;';
                }
                let item_stop = { ...item };
                item_stop.text = '';
                if (item_stop.task_stop) {
                    const stop_date_html = formatDate(DateTime.fromISO(item_stop.task_stop));
                    item_stop.key = `stop-${node.zt_id}`;
                    item_stop.text = stop_date_html;
                    item_stop.class = 'task-gantt-item-info ' + (item_stop.isParent ? 'task-gantt-items-subtask' : '');
                    item_stop.style = 'float: right;';
                }
                this.state.items_start.push(item_start);
                this.state.items_stop.push(item_stop);
            }
        });

        //console.log("items");

    }

}



GanttListInfo.template = xml/*xml*/`
<div class="item-infos">
    <!-- Duration Column -->
    <div class="item-info">
        <t t-foreach="state.items_info" t-as="item" t-key="item.key">
            <div class="item-info" t-att-id="'item-info-' + item.id" t-att-style="'display: ' + item.display">
                <div t-att-class="item.class" style="float: right;">
                    <t t-esc="item.text"/>
                </div>
            </div>
        </t>
    </div>

    <!-- Start Date Column -->
    <div class="item-list">
        <t t-foreach="state.items_start" t-as="item" t-key="item.key">
            <div class="item-info" t-att-id="'item-info-' + item.id" t-att-style="'display: ' + item.display">
                <div t-att-class="item.class" style="float: right;">
                    <t t-esc="item.text"/>
                </div>
            </div>
        </t>
    </div>

    <!-- Stop Date Column -->
    <div class="item-list">
        <t t-foreach="state.items_stop" t-as="item" t-key="item.key">
            <div class="item-info" t-att-id="'item-info-' + item.id" t-att-style="'display: ' + item.display">
                <div t-att-class="item.class" style="float: right;">
                    <t t-esc="item.text"/>
                </div>
            </div>
        </t>
    </div>
</div>

`;
