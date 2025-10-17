/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

const { DateTime } = luxon;
export class TimelineSummaryBar extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;

        let position_x = this.position_x;
        this.summary_bar = useState({
            left: position_x._bar_left,
            width: position_x._bar_width,
        });




        onWillUpdateProps((nextProps) => {
            //console.log("Summary Bar onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;

            // Update deadline_bar
            let position_x = this.position_x;
            this.summary_bar.left = position_x._bar_left;
            this.summary_bar.width = position_x._bar_width;

        });
    }

    isValidDateTime(dateTimeObject) {
        return dateTimeObject && dateTimeObject.isValid;
    }

    get position_x() {

        let _bar_left = 0;
        let _bar_width = 0;



        if (this.isValidDateTime(this.item.summary_date_start) && this.isValidDateTime(this.item.summary_date_end)) {

            // Calculate left position
            let summary_date_start = this.item.summary_date_start.toMillis();
            let summary_date_start_pxscale = Math.round((summary_date_start - this.timeline_data.scales.firstDayScale)
                / this.timeline_data.scales.pxScaleUTC);



            _bar_left = summary_date_start_pxscale;

            // Calculate width
            let summary_date_end = this.item.summary_date_end.toMillis();
            let summary_date_end_pxscale = Math.round((summary_date_end - this.timeline_data.scales.firstDayScale)
                / this.timeline_data.scales.pxScaleUTC);

            _bar_width = summary_date_end_pxscale - summary_date_start_pxscale;



        }



        return {
            _bar_left: _bar_left,
            _bar_width: _bar_width,
        }

    }

}

TimelineSummaryBar.template = xml/*xml*/`

    <t t-if="props.item.summary_date_start and props.item.summary_date_end">
    
        <div t-att-class="'task-gantt-bar-summary task-gantt-bar-summary-' + props.row.id" t-att-style="'left:' + summary_bar.left + 'px; width:' + summary_bar.width + 'px;'">
            <div class="task-gantt-summary task-gantt-summary-start"></div>
            <div class="task-gantt-summary task-gantt-summary-end"></div>
            <div class="task-gantt-summary-width" t-att-style="'width:' + summary_bar.width + 'px;'"></div>
        </div>
    </t>


`;