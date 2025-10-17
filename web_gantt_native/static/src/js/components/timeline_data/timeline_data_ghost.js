/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

const { DateTime } = luxon;
export class TimelineGhostBar extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;
        this.ghost_bar_list = [];
        this.GhostBar = [];

        // search item id in this.row.timeline_data.renderer.GhostBar
        if (this.row.timeline_data.renderer.Ghost_Data){
            this.GhostBar = this.row.timeline_data.renderer.Ghost_Data.filter(bar => bar.data_row_id === this.item.id);
        }

        let position_x = this.position_x;
        this.ghost_bar = useState({
            left: position_x._bar_left,
            width: position_x._bar_width,
        });


        onWillUpdateProps((nextProps) => {
            //console.log("Ghost Bar onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;

            if (this.row.timeline_data.renderer.Ghost_Data){
                this.GhostBar = this.row.timeline_data.renderer.Ghost_Data.filter(bar => bar.data_row_id === this.item.id);
            }

            // Update deadline_bar
            let position_x = this.position_x;
            this.ghost_bar.left = position_x._bar_left;
            this.ghost_bar.width = position_x._bar_width;

        });
    }

    get position_x() {

        let _bar_left = 0;
        let _bar_width = 0;


        if (this.GhostBar.length > 0){
            let data_min = this.GhostBar.reduce((min, ghost)=> ghost.date_start < min.date_start ? ghost : min, this.GhostBar[0]);
            let data_max = this.GhostBar.reduce((max, ghost)=> ghost.date_end > max.date_end ? ghost : max, this.GhostBar[0]);

            let start_time = data_min["date_start"].toMillis();
            let stop_time = data_max["date_end"].toMillis();

            let start_pxscale = Math.round((start_time-this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);
            let stop_pxscale = Math.round((stop_time-this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);

            _bar_left = start_pxscale;
            _bar_width = stop_pxscale-start_pxscale;

            //calculate ghost bar list
             this.ghost_bar_list = this.GhostBar.map((ghost, index) => {
                let ghost_start_time = ghost["date_start"].toMillis();
                let ghost_stop_time = ghost["date_end"].toMillis();

                let ghost_start_pxscale = Math.round((ghost_start_time-this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);
                let ghost_stop_pxscale = Math.round((ghost_stop_time-this.timeline_data.scales.firstDayScale) / this.timeline_data.scales.pxScaleUTC);

                let ghost_bar_left = ghost_start_pxscale;
                let ghost_bar_width = ghost_stop_pxscale-ghost_start_pxscale;

                return {
                    id: index,
                    left: ghost_bar_left,
                    width: ghost_bar_width,
                }
            });
        }

        return {
            _bar_left: _bar_left,
            _bar_width: _bar_width,
        }
    }

}

TimelineGhostBar.template = xml/*xml*/`

    <t t-if="ghost_bar.left and ghost_bar.width">
        <div t-att-class="'task-gantt-bar-ghosts-'+props.item.id" class="task-gantt-bar-ghosts"
            t-att-style="'left:' + ghost_bar.left + 'px; width:' + ghost_bar.width + 'px;'" >
        </div>
      
        <t t-foreach="ghost_bar_list" t-as="ghost" t-key="ghost.id">
            <div t-att-style="'left:' + ghost.left + 'px; width:' + ghost.width + 'px;'" 
            class="task-gantt-bar-ghost"></div>
        </t>
    </t>
    
`;