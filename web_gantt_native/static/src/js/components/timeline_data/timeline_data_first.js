/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

import {deserializeDateTime} from "@web/core/l10n/dates";

//const auto_str_to_date = parseDateTime;
const auto_str_to_date = deserializeDateTime;

const { DateTime } = luxon;
export class TimelineFirst extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;
        this.BarFirst = this.row.timeline_data.renderer.BarFirst
        this.BarFirstData = null;

        // Search for an element in BarFirst that matches the group_id[0]
        if (this.BarFirst && Array.isArray(this.item.group_id) && this.item.group_id[0]) {
            this.BarFirstData = this.BarFirst.find(bar => bar.id === this.item.group_id[0]);
        }

        let position_x = this.position_x;
        this._bar = useState({
            left: position_x._bar_left,
            width: position_x._bar_width,
            right: position_x._bar_right,
            shows: position_x._shows
        });


        onWillUpdateProps((nextProps) => {
            //console.log("Summary Bar onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;
            this.BarFirst = this.row.timeline_data.renderer.BarFirst

            // Search for an element in BarFirst that matches the group_id[0]
            if (this.BarFirst && Array.isArray(this.item.group_id) && this.item.group_id[0]) {
                this.BarFirstData = this.BarFirst.find(bar => bar.id === this.item.group_id[0]);
            }

            // Update deadline_bar
            let position_x = this.position_x;
            this._bar.left = position_x._bar_left;
            this._bar.width = position_x._bar_width;
            this._bar.right = position_x._bar_right;
            this._bar.shows = position_x._shows

        });
    }

    isValidDateTime(dateTimeObject) {
        return dateTimeObject && dateTimeObject.isValid;
    }

    first_shows() {

    }


    get position_x() {

        let _bar_left = 0;
        let _bar_width = 0;
        let _bar_right = 0;
        let _shows = false;

        if (this.BarFirstData) {
            // _bar_left = this.BarFirstData.left;
            // _bar_width = this.BarFirstData.width;

            // console.log("BarFirstData:", this.BarFirstData);

        // BarFirstData that object that contains the following keys:
        // date_end:"2024-08-15 07:00:00"
        // date_start:"2023-11-02 00:00:00"
        // id:1
        // name:"Office Design"

            let date_start = auto_str_to_date(this.BarFirstData.date_start);
            let date_end = auto_str_to_date(this.BarFirstData.date_end);

            if (this.isValidDateTime(date_start) && this.isValidDateTime(date_end)) {
                let date_start_time = date_start.toMillis();
                let date_stop_time = date_end.toMillis();

                let date_start_pxscale = Math.round(
                    (date_start_time - this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);
                let date_stop_pxscale = Math.round(
                    (date_stop_time - this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);

                _bar_left = date_start_pxscale;
                _bar_width = date_stop_pxscale - date_start_pxscale;
                _bar_right = date_stop_pxscale;
                _shows = true;
            }

        }

        return {
            _bar_left: _bar_left,
            _bar_width: _bar_width,
            _bar_right: _bar_right,
            _shows: _shows
        }

    }

}

TimelineFirst.template = xml/*xml*/`

    <t t-if="_bar.shows">
        <div class="task-gantt-bar-first" t-att-style="'left: ' + _bar.left + 'px; width: ' + _bar.width + 'px;'">
            <div class="task-gantt-first task-gantt-first-start" t-att-style="'height: ' + (1 + item.task_count) * 30 + 'px;'"></div>
            <div class="task-gantt-first task-gantt-first-end" t-att-style="'height: ' + (1 + item.task_count) * 30 + 'px;'"></div>
        </div>
        


    </t>


`;