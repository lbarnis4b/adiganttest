/** @odoo-module */
import {Component, useState, onMounted, onWillRender, onWillUnmount, useRef, xml, onWillUpdateProps, useExternalListener} from "@odoo/owl";
const { DateTime } = luxon;
import { useService, useBus } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

import { TimeLineDocs } from "./timeline_data_bar_docs";
import { TimeLineBarInfo } from "./timeline_data_bar_info";


export class TimelineDataBar extends Component {
    static components = { TimeLineDocs, TimeLineBarInfo};
    static template = "native_gantt.TimeLineBar";
    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;

        this.elRef = useRef("task-gantt-timeline-row");
        this.elRefwaitDiv = useRef("waitDiv");

        this.notification = useService("notification");

        this.color = {
            auto: "rgba(111, 197, 242, 0.6)",
            auto_not_asap: "rgba(242, 133, 113, 0.6)",
            default: "rgba(242, 197, 116, 0.6)",
            milestone: "rgba(242, 197, 116, 0.1)",
            miliestone_auto: "rgba(111, 197, 242, 0.1)",
            miliestone_auto_not_asap: "rgbza(242, 133, 113, 0.1)",
            // Critical Path colors
            critical_path: "rgba(255, 69, 58, 0.8)",        // Red for critical tasks

        }

        this.state = useState({
            isDragging: false,
            startPos: {x: 0, left: 0, offset: 0},
        });

        this.task_bar = useState({
            left: this.item.position_bar.bar_left,
            width: this.item.position_bar.bar_width,
            color: this.itemColor(this.item),
            progress: this.ProgressBar
        });

        onWillUpdateProps((nextProps) => {
            //console.log("TimelineDataBar onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = nextProps.row.timeline_data;
            this.item = nextProps.item;

            this.task_bar.left = nextProps.item.position_bar.bar_left;
            this.task_bar.width = nextProps.item.position_bar.bar_width;
            this.task_bar.color = this.itemColor(nextProps.item);
            this.task_bar.progress = this.ProgressBar;
        });

        // Use proper OWL useBus pattern for automatic cleanup
        useBus(this.env.bus, "color-update", this.colorUpdate.bind(this));

        onMounted(() => {
            // useBus listeners already registered above
        });

        onWillUnmount(() => {
            // useBus automatically cleans listeners - manual cleanup not needed
        });

        useExternalListener(window, 'mousedown', this.handleMouseDown);
        useExternalListener(window, 'mousemove', this.handleMouseMove);
        useExternalListener(window, 'mouseup', this.handleMouseUp);

        super.setup();
    }


    colorUpdate(ev) {
        //console.log("Color Update", ev);
        if (this.item.uniq === ev.detail.id) {
            this.task_bar.color = this.task_bar.color.replace(/[^,]+(?=\))/, ev.detail.alpha);
        }
    }

    get offsetTop() {

        if (this.elRef && this.elRef.el) {
            return this.elRef.el.offsetTop;
        }
    }


    async handleMouseUp() {
         if (this.state.isDragging !== false) {
             this.state.isDragging = false;
             this.env.bus.trigger('hide-hint');

             // Show the waiting div
             // this.elRefwaitDiv.el.style.display = "block";

             //now need to update the data in the model
             let date_bar = this.timeline_data.GetGanttBarPlanPxTime(this.task_bar);
             await this.timeline_data.renderer.saveData(this.item.id, date_bar);

             this.env.bus.trigger('gantt_refresh_after_change')

            // Hide the waiting div
            // this.elRefwaitDiv.el.style.display = 'none';

        }
    }

    showHint(event) {

        let date_bar = this.timeline_data.GetGanttBarPlanPxTime(this.task_bar);

        let date_start = date_bar.date_start.toFormat(this.timeline_data.renderer.formatDateTime);
        let date_stop = date_bar.date_stop.toFormat(this.timeline_data.renderer.formatDateTime);

        //console.log("Hint", "X" + this.state.startPos.x);

        const yPos = this.row.offsetTop + 18; //margenTop : 18
        this.env.bus.trigger('ganttn-pointer-move', { action: 'show-hint', itemValue: {"Date start": date_start, "Date stop": date_stop}, ev: event, y: yPos });


    }

    showTips(event) {

        let date_bar = this.timeline_data.GetGanttBarPlanPxTime(this.task_bar);

        let date_start = date_bar.date_start.toFormat(this.timeline_data.renderer.formatDateTime);
        let date_stop = date_bar.date_stop.toFormat(this.timeline_data.renderer.formatDateTime);

        // console.log("Tips", "X" + this.state.startPos.x);
        const yPos = this.row.offsetTop + 18; //margenTop : 18

        let Tips = {
            "Name": this.item.value_name,
            "Date start": date_start,
            "Date stop": date_stop
        }

        if (this.item.date_deadline) {
            const deadline = DateTime.fromISO(this.item.date_deadline);
            if (deadline.isValid) {
                Tips["Deadline"] = deadline.toFormat(this.timeline_data.renderer.formatDateTime);
            }
        }

        if (this.item.progress) {
            Tips["Progress"] = this.item.progress + "%";
        }

        if (this.item.plan_duration) {
            let duration_humanize = humanizeDuration(this.item.plan_duration * 1000, { round: true });
            if (this.item.duration_scale) {
                const duration_units = this.item.duration_scale.split(",");
                duration_humanize = humanizeDuration(this.item.plan_duration * 1000, { units: duration_units, round: true });
            }
            Tips["Plan Duration"] = duration_humanize;
        }


        if (this.item.duration) {
            let duration_humanize = humanizeDuration(this.item.duration * 1000, { round: true });
            if (this.item.duration_scale) {
                const duration_units = this.item.duration_scale.split(",");
                duration_humanize = humanizeDuration(this.item.duration * 1000, { units: duration_units, round: true });
            }
            Tips["Duration"] = duration_humanize;
        }

        if (this.item.date_done) {
            const date_done = DateTime.fromISO(this.item.date_done);
            if (date_done.isValid) {
                Tips["Date Done"] = date_done.toFormat(this.timeline_data.renderer.formatDateTime);
            }
        }

        if (this.item.constrain_type) {
            const type = {
                "asap": 'As Soon As Possible',
                "alap": 'As Late As Possible',
                "fnet": 'Finish No Earlier Than',
                "fnlt": 'Finish No Later Than',
                "mso": 'Must Start On',
                "mfo": 'Must Finish On',
                "snet": 'Start No Earlier Than',
                "snlt": 'Start No Later Than',
            };
            Tips["Constraint"] = type[this.item.constrain_type];

            if (this.item.constrain_date) {
                const constrain_date = DateTime.fromISO(this.item.constrain_date);
                if (constrain_date.isValid) {
                    Tips["Constraint Date"] = constrain_date.toFormat(this.timeline_data.renderer.formatDateTime);
                }
            }
        }


        this.env.bus.trigger('ganttn-pointer-move', { action: 'show-hint', itemValue: Tips, ev: event, y: yPos });

    }


    onMouseOver(itemValue, ev) {
        // this.env.bus.trigger('ganttn-pointer-move', { action: 'show-hint', itemValue: itemValue, ev: ev });
        if (ev.target.id === `task-gantt-bar-plan-${itemValue.uniq}`) {
            // console.log('onMouseOver:', ev);
            this.showTips(ev);
        }
    }
    onMouseOut() {
        this.env.bus.trigger('hide-hint');
    }

    showAutoModeMessage() {
        this.notification.add(_t("Moving is not allowed in auto mode."), {
            title: _t("Auto Mode"),
            type: "warning",
        });
    }
    handleMouseMove(event) {



        if (this.state.isDragging === "move") {
            const dx = event.pageX - this.state.startPos.x;
            this.task_bar.left = this.state.startPos.left + dx;
            this.state.startPos.offset = event.pageX;

            this.showHint(event);
            //console.log("Move", "left" + this.task_bar.left);
        }

        if (this.state.isDragging === "width") {
            const dx = event.pageX - this.state.startPos.x;
            this.task_bar.width = this.state.startPos.left + dx;

            this.showHint(event);
            //console.log("Resize", "width" + this.task_bar.width);

        }

        if (this.state.isDragging === "resizeStart") {
            const dx = event.pageX - this.state.startPos.x;
            this.task_bar.left = this.state.startPos.left + dx;
            this.task_bar.width = this.state.startPos.width - dx;

            this.showHint(event);
            //console.log("Resize", "left" + this.task_bar.left, "width" + this.task_bar.width);
        }

    }

    handleMousePermit() {

        if (this.item.schedule_mode === 'auto') {
        // Item is in auto mode, don't allow moving
            this.showAutoModeMessage();
            return false;
        }

        return true;
    }

    handleMouseDown(event) {

        // console.log("Down", event.target.id);

        // Move Bar
        if (event.target.id === `task-gantt-bar-plan-${this.item.uniq}` && this.handleMousePermit()) {
            this.state.isDragging = "move";
            this.state.startPos.x = event.pageX;
            this.state.startPos.left = this.task_bar.left;
            //console.log("Down", "Move" + this.state.startPos.left);
        }

        // Resize Bar Width
        if (event.target.id === `task-gantt-bar-plan-end-${this.item.uniq}` && this.handleMousePermit()) {
            this.state.isDragging = "width";
            this.state.startPos.x = event.pageX;
            this.state.startPos.left = this.task_bar.width;
            //console.log("Down", "With" + this.state.startPos.left);
        }

        // Resize Bar Start
        if (event.target.id === `task-gantt-bar-plan-start-${this.item.uniq}` && this.handleMousePermit()) {
            this.state.isDragging = "resizeStart";
            this.state.startPos.x = event.pageX;
            this.state.startPos.left = this.task_bar.left;
            this.state.startPos.width = this.task_bar.width;
            //console.log("Down", "Left" + this.state.startPos.left);
        }
    }

    get itemClass() {
        return (item) => {
            let classes = 'task-gantt-bar-plan task-gantt-bar-plan-' + item.uniq;
            classes += item.is_group ? ' group-class' : ' item-class';
            classes += ' ui-draggable ui-draggable-handle ui-resizable';
            
            // Add critical path class for red border styling
            if (item.critical_path) {
                classes += ' task-gantt-items-critical-path';
            }
            
            return classes;
        };
    }

    get ProgressBar() {
        let progress_bar = {
            left: 0,
            width: 0,
            percentage: 0
        };

        if (this.item.progress) {
            progress_bar.left = this.item.position_bar.bar_left;
            progress_bar.width = this.item.position_bar.bar_width * (this.item.progress / 100);
            progress_bar.percentage = this.item.progress + "%";
        }
        return progress_bar;
    }

    get itemColor() {
        return (item) => {
            let color_gantt = false;


            // Check if task has custom color set
            if (item.color_gantt_set) {
                color_gantt =  item.color_gantt;
            }
            
            // Critical Path Logic - no longer overrides background color
            // Critical tasks now use red border instead of red background
            // if (!color_gantt && item.critical_path) {
            //     color_gantt = this.color.critical_path;
            // }

            // Standard color logic
            else if (!color_gantt) {
                color_gantt = this.color.default;
                if (item.schedule_mode === 'auto'){
                    color_gantt = this.color.auto;
                }
                if (item.constrain_type !== "asap" && item.constrain_type !== undefined && item.schedule_mode === "auto"){
                    color_gantt = this.color.auto_not_asap;
                }
            }




            let color_rgba = color_gantt.replace(/[^\d.,]/g, '').split(',');

            if (this.timeline_data.options.tree_view){
                if (item.isParent){
                    color_rgba[3] = 0.2;
                }
            }
            else{
                if (item.subtask_count) {
                    color_rgba[3] = 0.2;
                }
            }

            color_gantt = "rgba(" + color_rgba[0] + "," + color_rgba[1] + "," + color_rgba[2] + "," + color_rgba[3] + ")";

            //Milestone
            if (item.is_milestone){
                let color_milestone = this.color.milestone;
                if (item.schedule_mode === 'auto'){
                    color_milestone = this.color.miliestone_auto;
                }
                if (item.constrain_type !== "asap" && item.constrain_type !== undefined && item.schedule_mode === "auto"){
                    color_milestone = this.color.miliestone_auto_not_asap;
                }

                color_gantt = color_milestone
            }

            item.color_bar = color_gantt;
            return color_gantt;
        };
    }

}
