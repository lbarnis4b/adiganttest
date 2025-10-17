/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

import {deserializeDateTime} from "@web/core/l10n/dates";
const auto_str_to_date = deserializeDateTime;

const { DateTime } = luxon;
export class TimeLineBarLoad extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;
        this.taks_load_data = this.timeline_data.renderer.Task_Load_Data
        const color_alpha = '0.4';
        const alpha_load = '0.8';
        this.data_bar = [];

        // let color_gantt = this.item.color_bar;
        // this.task_bar.color = color_gantt.replace(/[^,]+(?=\))/, newAplha);


        // this.bar.task_bar.color = this.bar.task_bar.color.replace(/[^,]+(?=\))/, alpha_bar);

        const Data = this.checkItemIdExists(this.taks_load_data, this.item.id);

        if (Data) {
            this.data_bar = Data.data;
            this.env.bus.trigger('color-update', { id: this.item.uniq, alpha: color_alpha});
            this.load_bar_color = this.item.color_bar.replace(/[^,]+(?=\))/, alpha_load);
        }

        this.position_x();


        onWillUpdateProps((nextProps) => {
            //console.log("Load Bar onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;
            this.taks_load_data = this.timeline_data.renderer.Task_Load_Data

            const Data = this.checkItemIdExists(this.taks_load_data, this.item.id);

            if (Data) {
                this.data_bar = Data.data;
                this.env.bus.trigger('color-update', { alpha: color_alpha});
                this.load_bar_color = this.item.color_bar.replace(/[^,]+(?=\))/, alpha_load);
            }

            this.position_x();

        });
    }


        // Data. elements structure
        // id {
        //                 id: item[load_id_from],
        //                 data: []
        //
        // data ({
        //             id: item[load_id],
        //             data_from: item.data_from,
        //             data_to: item.data_to,
        //             data_aggr: item.data_aggr,
        //             duration: item.duration


    checkItemIdExists(taskLoadData, itemId) {
        if (!taskLoadData) {
            return false;
        }

        for (const data of taskLoadData) {
            if (data.id[0] === itemId) {
                return data;
            }
        }
        return false;
    }

    position_x() {
           this.data_bar.forEach((load, index) => {

                let _start_time = auto_str_to_date(load["data_from"]);
                let _stop_time = auto_str_to_date(load["data_to"]);


                if (!this.isValidDateTime(_start_time) || !this.isValidDateTime(_stop_time)) {
                    return;
                }

                _start_time = _start_time.toMillis();
                _stop_time = _stop_time.toMillis();

                let _start_pxscale = Math.round((_start_time - this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);
                let _stop_pxscale = Math.round((_stop_time - this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);

                let _bar_left = _start_pxscale;
                let _bar_width = _stop_pxscale - _start_pxscale;

                load.id = index;
                load.left = _bar_left;
                load.width = _bar_width;
           });

    }


    isValidDateTime(dateTimeObject) {
        return dateTimeObject && dateTimeObject.isValid;
    }



}

TimeLineBarLoad.template = xml/*xml*/`

    <t t-foreach="data_bar" t-as="load" t-key="load.id">
        <div class="task-gantt-bar-load-task"
            t-att-style="'left:' + load.left + 'px; width:' + load.width + 'px; background:' + load_bar_color + ';'">
        </div>
    </t>

`;