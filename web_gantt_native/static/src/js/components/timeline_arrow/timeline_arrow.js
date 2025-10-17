/** @odoo-module */

import {Component, useState, onWillUpdateProps, onMounted, onWillPatch, useRef, xml} from "@odoo/owl";

const { DateTime, Duration } = luxon;

import { TimelineArrowDraw } from "./timeline_arrow_draw";

export class GanttTimeLineArrow extends Component {
    static components = {TimelineArrowDraw};
    static template = "native_gantt.GanttTimeLineArrow";
    static props = [
        "item_list",
        "scales",
        "options",
        "parent",
    ];

    setup() {

        this.scales = this.props.scales;
        this.options = this.props.options;
        this.renderer = this.props.parent
        this.row_height = 30;

        let top = 0;
        this.item_list = this.props.item_list.map((item, index) => {
            item = this.calculatePositionBar(item, index);
            item.top = top;
            if (item.fold === false) {
                top += this.row_height; // Increase top position if item.fold is false
            }
            return item;
        });

        this.state = useState({

            canvas_width: this.scales.timeline_width,
            canvas_height: this.row_height*this.props.item_list.length,
            predecessors: this.Predecessors()

        });


        onWillUpdateProps(nextProps => {
            //console.log("GanttTimeLineArrow onWillUpdateProps", nextProps);

            this.scales = nextProps.scales;
            this.options = nextProps.options;
            this.renderer = nextProps.parent;

            top = 0;
            this.item_list = nextProps.item_list.map((item, index) => {
                item = this.calculatePositionBar(item, index);
                item.top = top;
                if ( !('fold' in item) || item.fold === false ) {
                    top += this.row_height; // Increase top position if item.fold is false
                }

                return item;
            });

            this.state.canvas_width = nextProps.scales.timeline_width;
            this.state.canvas_height = this.row_height*nextProps.item_list.length;

            this.state.predecessors = this.Predecessors()

        });

        onMounted(() => {
            //console.log("Arrow onMounted");
            //this.Predecessors()
        });

    }

    Predecessors() {
        const predecessors = this.renderer.Predecessor || [];
        let predecessor_list = [];

        predecessors.forEach(predecessor => {
            const to = predecessor.task_id[0];
            const from = predecessor.parent_task_id[0];

            const from_obj = this.item_list.find(item => item.id === from);
            const to_obj = this.item_list.find(item => item.id === to);

            if (from_obj && to_obj) {
                //console.log("from_obj", from_obj, "to_obj", to_obj);
                predecessor_list.push({
                    from_obj: from_obj,
                    to_obj: to_obj,
                    id: predecessor.id,
                    type: predecessor.type
                });
            }
        });

        return predecessor_list;
    }

    calculatePositionBar(item, index) {
        item.position_bar = this.position_x(item.date_start, item.date_stop);
        item.uniq = index;
        return item;
    }

    position_x(date_start, date_stop) {
        let bar_left = null;
        let bar_width = null;
        let date_stop_pxscale = null;
        let date_start_pxscale = null;

        if (date_start && date_stop) {

            let date_start_time = date_start.toMillis();
            let date_stop_time = date_stop.toMillis();

            date_start_pxscale = Math.round((date_start_time - this.scales.firstDayScale) / this.scales.pxScaleUTC);
            date_stop_pxscale = Math.round((date_stop_time - this.scales.firstDayScale) / this.scales.pxScaleUTC);

            bar_left = date_start_pxscale;
            bar_width = date_stop_pxscale - date_start_pxscale;
        }

        return {
            bar_left: bar_left,
            bar_width: bar_width,
            task_start_pxscale: date_start_pxscale,
            task_stop_pxscale: date_stop_pxscale
        }
    }
}

