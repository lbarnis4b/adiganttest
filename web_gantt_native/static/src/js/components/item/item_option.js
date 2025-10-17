/** @odoo-module **/
import {Component, onMounted, onWillUnmount, onWillUpdateProps, useState, xml} from "@odoo/owl";
import {useService, useBus} from "@web/core/utils/hooks";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {serializeDateTime} from "@web/core/l10n/dates";
import {_t} from "@web/core/l10n/translation";

const { DateTime } = luxon;

export class GanttItemOption extends Component {

    static props = [
        "options",
        "parent"
    ];

    setup() {

        this.dialogService = useService("dialog");
        this.notification = useService("notification");

        this.weekType = useState({
            value: this.props.parent.week_type || 'isoweek',
        });

        this.selectedOption = useState({
            value: null,
        });



        this.industryOption= useState({
            value: "show",
        });

        // Add reactive state for resource load
        this.resourceLoadOption = useState({
            value: parseInt(this.props.parent.local_storage.getItem("gantt_resource_load")) || 0,
        });

        // Add reactive state for WBS column
        this.wbsOption = useState({
            value: parseInt(this.props.parent.local_storage.getItem("gantt_show_wbs")) || 0,
        });

        let industry_show = this.props.parent.industry_show
        // basic, active, inactive
        if (industry_show === 1) {
            this.industryOption.value = "hide";
        }
        else{
            this.industryOption.value = "show";
        }

        this.options = this.props.options;

        // Retrieve list_show from local_storage and set selectedOption.value
        const list_show = this.props.parent.local_storage.getItem("gantt_list_show");
        if (list_show === "-1") {
            this.selectedOption.value = "active";
        } else if (list_show === "0") {
            this.selectedOption.value = "inactive";
        } else if (list_show === "1") {
            this.selectedOption.value = "basic";
        }


        onWillUpdateProps((nextProps) => {
            //console.log("Item Action onWillUpdateProps:", nextProps);
            this.weekType.value = nextProps.parent.week_type || 'isoweek';
            this.options = nextProps.options;

            let industry_show = nextProps.parent.industry_show;
            // basic, active, inactive
            if (industry_show === 1) {
                this.industryOption.value = "hide";
            }
            else{
                this.industryOption.value = "show";
            }



        });

        // Use event-driven architecture instead of inefficient setInterval
        useBus(this.env.bus, 'resource-load-icon-update', (event, data) => {
            const showResourceLoad = data ? data.showResourceLoad : event.detail.showResourceLoad;
            this.resourceLoadOption.value = showResourceLoad ? 1 : 0;
        });

        onMounted(() => {
            //console.log("Item Action OnMounted:");
        });

        onWillUnmount(() => {
            //console.log("Item Action onWillUnmount:");
        });

        this.getClasses = () => {
            // For ISO week, use calendar icon (fa-calendar-o), for regular week, use dashed calendar icon (fa-calendar-times-o)
            if (this.weekType.value === 'isoweek') {
                return 'fa-calendar-o gantt-list-options-week-isoweek';
            } else {
                return 'fa-calendar-times-o gantt-list-options-week-week';
            }
        }

    }

    showItemsSorted(treeId, treeNode) {
        return this.options.items_sorted;
    }


    async onDivClick(ev) {
        //console.log("Div clicked:", ev);
        let target = ev.target;

        // Click on Week
        if (target.classList.contains("gantt-list-options-week")) {
            this.week_action(ev);
        }

        // Click on Export to File
        if (target.classList.contains("gantt-list-options-export-to-file")) {
            await this.export_action(ev);
        }

        // Click on Basic
        if (target.classList.contains("gantt-list-options-item-check-basic")) {
            this.list_action(ev);
        }

        // Click on Industry
        if (target.classList.contains("gantt-list-options-industry")) {
            this.industry_action(ev);
        }

        // Click on WBS Toggle
        if (target.classList.contains("gantt-list-options-wbs")) {
            this.wbs_action(ev);
        }

        // Click on Tree View
        if (target.classList.contains("fa-sitemap") && !target.classList.contains("gantt-list-options-wbs")) {

            this.notification.add("If the icon is red, remove some search filters to build the full tree.", { type: "info" });

        }


    }

    getTitleKeyAndIcon() {
        const key = this.selectedOption.value;
        switch (key) {
            case 'active':
                return { title: 'Show All Columns', key: 'inactive', iconClass: 'fa fa-eye' };
            case 'inactive':
                return { title: 'Show Duration Only', key: 'basic', iconClass: 'fa fa-eye-slash' };
            case 'basic':
                return { title: 'Hide All Columns', key: 'active', iconClass: 'fa fa-list' };
            default:
                return { title: 'Show Duration Only', key: 'inactive', iconClass: 'fa fa-eye-slash' };
        }
    }

    getIndustryKeyAndIcon() {
        const key = this.industryOption.value;
        switch (key) {
            case 'hide':
                return { title: 'Hide Industry', key: 'hide', iconClass: 'fa fa-industry' };
            case 'show':
                return { title: 'Show Industry', key: 'show', iconClass: 'fa fa-industry' };
            default:
                return { title: 'Hide Industry', key: 'hide', iconClass: 'fa fa-industry' };
        }
    }

    getResourceLoadKeyAndIcon() {
        // Use reactive state for automatic updates
        const isActive = this.resourceLoadOption.value;
        if (isActive) {
            return { title: 'Hide Resource Load', key: 'active', iconClass: 'fa fa-users', style: 'color: green;' };
        } else {
            return { title: 'Show Resource Load', key: 'inactive', iconClass: 'fa fa-users', style: 'color: gray;' };
        }
    }

    getWbsKeyAndIcon() {
        const isActive = this.wbsOption.value;
        if (isActive) {
            return { title: 'Hide WBS Column', key: 'active', iconClass: 'fa fa-sitemap', style: 'color: green;' };
        } else {
            return { title: 'Show WBS Column', key: 'inactive', iconClass: 'fa fa-sitemap', style: 'color: gray;' };
        }
    }


    industry_action(event) {

        let parent = this.props.parent;
        let e_key = event.target.dataset.key;
        let industry_show = 1
        // basic, active, inactive
        if (e_key === "hide") {
            industry_show = 0
        }

        parent.industry_show = industry_show
        parent.local_storage.setItem("gantt_industry_show", industry_show)

        this.industryOption.value = e_key;

        this.env.bus.trigger('gantt_refresh_after_change');

    }

    wbs_action(event) {
        let parent = this.props.parent;
        let show_wbs = parent.show_wbs ? 0 : 1;  // Toggle current state

        parent.show_wbs = show_wbs;
        parent.local_storage.setItem("gantt_show_wbs", show_wbs);

        this.wbsOption.value = show_wbs;

        this.env.bus.trigger('gantt_refresh_after_change');
    }

    list_action(event) {

        let parent = this.props.parent;
        const e_key = event.target.dataset.key;
        let list_show = 0;

        if (e_key === "active") {
            list_show = -1;  // Show all columns (duration + start + stop)
        } else if (e_key === "inactive") {
            list_show = 0;   // Show duration only
        } else if (e_key === "basic") {
            list_show = 1;   // Hide all columns
        }

        parent.list_show = list_show;
        parent.local_storage.setItem("gantt_list_show", list_show);

        this.selectedOption.value = e_key;

        this.env.bus.trigger('gantt_refresh_after_change');
    }



    async export_action(event) {
        const parent = this.props.parent;
        const zTree = parent.widget.$zTree;
        const nodes = zTree.getNodes();

        const rows_to_gantt = nodes.flatMap(node => {
            const childNodes = zTree.transformToArray(node);
            return childNodes.map(row => {
                const date_start = row.date_start ? serializeDateTime(DateTime.fromISO(row.date_start)) :  undefined;
                const date_end = row.date_stop ? serializeDateTime(DateTime.fromISO(row.date_stop)) :  undefined;
                //const date_start = row.date_start ;
                //const date_end = row.date_stop ;
                const subtask_count = row.isParent ? 1 : 0;

                return {
                    id: row.id,
                    name: row.value_name,
                    duration: row.duration,
                    date_start: date_start,
                    date_end: date_end,
                    sorting_level: row.level,
                    subtask_count: subtask_count,
                    wbs: undefined,
                    stuff: "",
                    separate: row.is_group
                };
            });
        });

        const pre_data = parent.Predecessor.map(predecessor => ({
            task_id: predecessor.task_id[0],
            parent_task_id: predecessor.parent_task_id[0],
            type: predecessor.type
        }));

        const context = {
            ...parent.state.contexts,
            time_type: parent.timeType || false,
            default_screen: true,
            default_data_json: JSON.stringify(rows_to_gantt),
            default_pre_json: JSON.stringify(pre_data)
        };

        // Check if the model exist
        let result = await this.env.services.orm.call(
            'gantt.native.tool',
            'exist_model',
            ['project_native_report_advance'],
            {context: this.props.options.model.gantt.contexts}
        );

        if (result) {
            this.export_open(parent, this.options.export_wizard, context);
        }
    }


    export_open(parent, res_model, context) {

        this.dialogService.add(FormViewDialog, {
            title: _t("PDF Report for Screen"),
            resModel: res_model,
            resId: false,
            context: context,
            preventCreate: true,
            onRecordSaved: () => {
                // Handle record saved logic here if needed
            },

        }, {
            onClose: () => {
                // Handle dialog close logic here if needed
            }
        });
    }


    week_action(event) {
        //console.log("Week Action:", event);
        let parent = this.props.parent;
        let target = event.target;

        parent.week_type = parent.local_storage.getItem("gantt_week_type") || "isoweek";
        //console.log("Current week_type from local_storage:", parent.week_type);

        if (parent.week_type === "week") {
            parent.week_type = "isoweek";
            //console.log("Changed week_type to:", parent.week_type);

            // Change class for icon styling (dashed -> normal)
            target.classList.remove("gantt-list-options-week-week");
            target.classList.add("gantt-list-options-week-isoweek");

        } else {
            parent.week_type = "week";
            //console.log("Changed week_type to:", parent.week_type);

            // Change class for icon styling (normal -> dashed)
            target.classList.remove("gantt-list-options-week-isoweek");
            target.classList.add("gantt-list-options-week-week");
        }

        parent.local_storage.setItem("gantt_week_type", parent.week_type)

        // Direct update of options.parent.week_type for all components
        if (this.props.options && this.props.options.parent) {
            this.props.options.parent.week_type = parent.week_type;
            //console.log("Updated options.parent.week_type to:", this.props.options.parent.week_type);
        }

        //console.log("Week Type:", parent.week_type);
        
        // Update components of the Gantt chart header
        this.env.bus.trigger('gantt_refresh_after_change')
        
        // Call event to fully update the Gantt chart
        this.env.bus.trigger('gantt_timeline_data_refresh')

    }



}


GanttItemOption.template = xml/*xml*/`

        <div class="gantt-list-options" t-on-click="onDivClick">
            <div class="text-left gantt-list-options-item">
                <div t-att-class="getTitleKeyAndIcon().iconClass + ' gantt-list-options-item-check 
                                gantt-list-options-item-check-basic'" 
                     t-att-title="getTitleKeyAndIcon().title" 
                     t-att-data-key="getTitleKeyAndIcon().key" 
                     aria-hidden="false"></div>
            </div>
            <div class="text-left gantt-list-options-item">
                <div t-att-class="getIndustryKeyAndIcon().iconClass + ' gantt-list-options-industry gantt-list-options-industry-'+getIndustryKeyAndIcon().key"
                        t-att-title="getIndustryKeyAndIcon().title"
                        t-att-data-key="getIndustryKeyAndIcon().key"
                        aria-hidden="false"></div>
<!--                class="fa fa-industry gantt-list-options-industry gantt-list-options-industry-hide " -->
<!--                     data-key="hide" -->
<!--                     aria-hidden="false" -->
<!--                     title="Time Line">-->
                     
      
            </div>
            <div class="text-left gantt-list-options-item">
                <div class="fa" t-att-class="'gantt-list-options-week ' + getClasses()" data-key="isoweek" 
                     aria-hidden="false" 
                     t-att-title="weekType.value === 'isoweek' ? 'Iso Week' : 'Week'"></div>
            </div>
            <div class="text-left gantt-list-options-item">
                <div class="fa fa-file-text-o gantt-list-options-export-to-file" aria-hidden="false" 
                     title="Screen to PDF"></div>
            </div>
            
            <div class="text-left gantt-list-options-item">
                <div t-att-class="getWbsKeyAndIcon().iconClass + ' gantt-list-options-wbs'" 
                     t-att-style="getWbsKeyAndIcon().style"
                     aria-hidden="false" 
                     t-att-title="getWbsKeyAndIcon().title"/>
            </div>
            
            <div class="text-left gantt-list-options-item">
                <div t-att-class="getResourceLoadKeyAndIcon().iconClass + ' gantt-list-options-resource-load'" 
                     t-att-style="getResourceLoadKeyAndIcon().style"
                     aria-hidden="false" 
                     t-att-title="getResourceLoadKeyAndIcon().title" 
                     t-on-click.stop.prevent="() => this.env.bus.trigger('user-toggle-resource-load')"/>
            </div>
            
            <div class="gantt-list-options-item">
                <t t-if="showItemsSorted()">
                    <i class="fa fa-sitemap" style="color: darkgreen;" 
                       t-att-title="'Items are use tree view.'"></i>
                </t>
                <t t-else="">
                    <i class="fa fa-sitemap" style="color: darkred;"
                       t-att-title="'Items are not tree view. Please order by project or remove any filter'"></i>
                </t>
            </div>
            
  
            
        </div>
`;

