/** @odoo-module **/

import {Component, useRef, useState, useExternalListener, xml, useEffect} from "@odoo/owl";

const { DateTime } = luxon;

export class GanttItemMenu extends Component {
    static props = [
        "options",
        "scales",
        "parent",
    ];

    setup() {
        this.state = useState({
            count: 0,
        });

        useEffect(() => {
            // console.log("Menu Component: UseEffect: has been rendered");
        });
    }

    async handleClick(ev) {
        // Delegate the click handling to the parent controller
        if (this.props.parent && this.props.parent.handleClick) {
            await this.props.parent.handleClick(ev);
        }
    }

    getButtonClass(timeType) {
        const currentTimeType = this.props.scales?.time_type;
        const isActive = currentTimeType === timeType;
        return isActive ? "btn btn-primary" : "btn btn-default";
    }
}

GanttItemMenu.template = xml/*xml*/`
    <div class="o_gantt_native_buttons">
        <div class="btn-group btn-group-sm">
            <button type="button" class="task-gantt-today btn btn-primary btn-sm" t-on-click="handleClick">
                Today
            </button>
        </div>

        <div class="btn-group btn-group-sm">
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-1h ' + getButtonClass('day_1hour')" t-on-click="handleClick">1H</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-2h ' + getButtonClass('day_2hour')" t-on-click="handleClick">2H</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-4h ' + getButtonClass('day_4hour')" t-on-click="handleClick">4H</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-8h ' + getButtonClass('day_8hour')" t-on-click="handleClick">8H</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-days ' + getButtonClass('month_day')" t-on-click="handleClick">Days</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-month ' + getButtonClass('year_month')" t-on-click="handleClick">Month</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-weeks ' + getButtonClass('month_week')" t-on-click="handleClick">Weeks</button>
            <button type="button" t-att-class="'task-gantt-zoom task-gantt-zoom-quarter ' + getButtonClass('quarter')" t-on-click="handleClick">Quarter</button>
        </div>
    </div>
`;