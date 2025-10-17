/** @odoo-module */

import {Component, useState, onWillUpdateProps, onMounted, onWillUnmount, onWillPatch, useRef, xml} from "@odoo/owl";

const { DateTime, Duration } = luxon;

import { TimelineDataRow } from "./timeline_data_row";

export class GanttTimeLineData extends Component {
    static template = "native_gantt.TimeLineData";
    static components = { TimelineDataRow};
    static props = [
        "item_list",
        "scales",
        "options",
        "parent",
    ];

    setup() {

        this.scales = this.props.scales;
        this.options = this.props.options;
        this.renderer = this.props.parent;
        const calcPositionBar = (item, index) => this.calculatePositionBar(item, index);
        this.state = useState({
            item_list: this.props.item_list.map(calcPositionBar),
        });



        onWillUpdateProps(nextProps => {
            //console.log("GanttTimeLineData onWillUpdateProps", nextProps);

            // Need create totaly new array for item_list, for update props in child compoment
            // withoyut that child component will not update if for-loop in template
            const calcPositionBar = (item, index) => this.calculatePositionBar({ ...item }, index);
            this.state.item_list = nextProps.item_list.map(calcPositionBar);

            this.scales = nextProps.scales;
            this.options = nextProps.options;
            this.renderer = nextProps.parent
        });


    }

    calculatePositionBar(item, index) {
        item.position_bar = this.position_x(item.date_start, item.date_stop);
        item.uniq = index;
        return item;
    }

    position_x(date_start, date_stop) {
        let bar_left = null;
        let bar_width = null;

        if (date_start && date_stop) {

            let date_start_time = date_start.toMillis();
            let date_stop_time = date_stop.toMillis();

            let date_start_pxscale = Math.round((date_start_time - this.scales.firstDayScale) / this.scales.pxScaleUTC);
            let date_stop_pxscale = Math.round((date_stop_time - this.scales.firstDayScale) / this.scales.pxScaleUTC);

            bar_left = date_start_pxscale;
            bar_width = date_stop_pxscale - date_start_pxscale;
        }

        return {
            bar_left: bar_left,
            bar_width: bar_width,
        }

    }


    lag_any(first_date, second_date, lag_pos, lag_neg, left_position) {
        let lagResult = false;

        if (first_date && second_date) {
            const mDiff = first_date.diff(second_date, 'seconds');
            const durationSeconds = mDiff.seconds;

            if (durationSeconds) {
                const duration = Duration.fromObject({ seconds: durationSeconds });
                //lagResult = duration.toFormat("d 'days' ");
                lagResult = duration.toFormat(Math.abs(duration.as('days')).toFixed(2) + " 'days' ");

                let posNeg = lag_pos;

                if (durationSeconds < 0) {
                    posNeg = lag_neg;
                }

                if (left_position) {
                    lagResult = posNeg + " " + lagResult;
                } else {
                    lagResult = lagResult + " " + posNeg;
                }
            }
        }
        return lagResult;
    }

    //For Realtime Date when slide the item bar or slider

    GetSliderPxToTime(slider_left_px){
        let slider_time_millis = (slider_left_px*this.renderer.pxScaleUTC)+this.renderer.firstDayScale;
        let slider_date = DateTime.fromMillis(slider_time_millis, { zone: 'utc' }).startOf('day');
        return slider_date;
    }

    GetGanttBarPlanPxTime(bar){

        let tleft = bar.left;
        let twidth = bar.width;
        let tright = tleft + twidth;
        let new_slider_time = false

        let date_start = (tleft*this.renderer.pxScaleUTC)+this.renderer.firstDayScale;
        let date_end = (tright*this.renderer.pxScaleUTC)+this.renderer.firstDayScale;

        let new_date_start = DateTime.fromMillis(date_start);
        let new_date_end = DateTime.fromMillis(date_end);

        return  {
            date_start: new_date_start,
            date_stop: new_date_end,
        };
    }

}

