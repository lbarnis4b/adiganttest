/** @odoo-module */
import {Component, useState, onWillUpdateProps, onMounted, onWillRender, onWillUnmount, onPatched, useRef, onWillDestroy, onWillPatch,  xml} from "@odoo/owl";
import {useBus} from "@web/core/utils/hooks";
const { DateTime } = luxon;

import { TimelineDataBar } from "./timeline_data_bar";
import { DeadlineSlider } from "./timeline_data_deadline";
import { TimelineSummaryBar } from "./timeline_data_summary";
import { TimelineFirst } from "./timeline_data_first";
import { TimelineGhostBar } from "./timeline_data_ghost";
import { TimeLineBarLoad } from "./timeline_data_bar_load";
import { TimelineIntersection } from "./timeline_data_intersection";
export class TimelineDataRow extends Component {
    static components = {
        TimelineDataBar, DeadlineSlider, TimelineSummaryBar, TimelineFirst, TimelineGhostBar, TimeLineBarLoad,
        TimelineIntersection};
    static template = "native_gantt.TimeLineRow";
    static props = {
        timeline_data: Object,
        item: Object,
    };

    setup() {
        this.timeline_data = this.props.timeline_data;
        this.elRef = useRef("task-gantt-timeline-row");
        this.hoverState = useState({hover: false}); // Add this line
        this.state = useState({
            item: this.props.item

        });

        // Use proper OWL useBus pattern for automatic cleanup
        useBus(this.env.bus, "handleRowHover", this.handleRowHover.bind(this));

        onMounted(() => {
            //console.log("Row onMounted");
        });

        onWillUnmount(() => {
            // useBus automatically cleans listeners - manual cleanup not needed
            //console.log("Row onWillUnmount");
        });

        onWillUpdateProps((nextProps) => {
            //console.log("Row onWillUpdateProps", nextProps);
            this.state.item = nextProps.item;
            this.timeline_data = nextProps.timeline_data;
        });

    }

    handleRowHover(ev) {
        if (ev.detail.zt_id === this.state.item.zt_id) {
            this.hoverState.hover = ev.detail.hover;
        }
    }

    get offsetTop() {
        return this.elRef.el.offsetTop;
    }

    handleMouseEnter() {
         this.hoverState.hover = true; // Update this line
         this.env.bus.trigger('selectNode', { id: this.state.item.id, select: true });
    }

    handleMouseLeave() {
        this.hoverState.hover = false; // Update this line
        this.env.bus.trigger('selectNode', { id: this.state.item.id, select: false });
    }

}
