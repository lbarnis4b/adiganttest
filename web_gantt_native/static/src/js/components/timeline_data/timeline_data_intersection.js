/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

import {deserializeDateTime} from "@web/core/l10n/dates";

//const auto_str_to_date = parseDateTime;
const auto_str_to_date = deserializeDateTime;

const { DateTime } = luxon;
export class TimelineIntersection extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;
        this.item_list = this.timeline_data.renderer.state_z.item_list_z;

        //industry_show
        this.industry_show = this.timeline_data.renderer.industry_show;
        let root_node = this.item.root_node;

        this.item_for_shows = [];
        //console.log("s this.industry_show", this.industry_show);
        if (this.item.group_field && !this.industry_show) {
            // item filter with root_node
            // Ensure this.item is an array before filtering
            if (Array.isArray(this.item_list)) {
                this.item_for_shows = this.item_list
                .filter(item => item["root_node"] === root_node)
                .sort((a, b) => a.date_start - b.date_start);
            }
        }



        onWillUpdateProps((nextProps) => {
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;

            this.item_list = this.timeline_data.renderer.state_z.item_list_z;
            this.industry_show = this.timeline_data.renderer.industry_show;
            let root_node = this.item.root_node;
            this.item_for_shows = [];
            //console.log("u this.industry_show", this.industry_show);

                if (this.item.group_field && !this.industry_show) {
                    // item filter with root_node
                    // Ensure this.item is an array before filtering
                    if (Array.isArray(this.item_list)) {
                        this.item_for_shows = this.item_list
                            .filter(item => item["root_node"] === root_node)
                            .sort((a, b) => a.date_start - b.date_start);

                    }
                }
        });


    }

    Intersection() {

        let before_left = false
        let before_top = 0

        let to_xml = [];

        this.item_for_shows.forEach(item => {

            if (!item.isParent) {

                let position_bar = item.position_bar

                let before_top = 0;

                if (before_left && before_left > position_bar.bar_left) {
                    before_top = before_top === 0 ? 16 : 0;
                }

                before_left = position_bar.bar_left + position_bar.bar_width;

                to_xml.push(
                    {
                        id: item.uniq,
                        value_name: item.value_name,
                        top: before_top,
                        left: position_bar.bar_left,
                        width: position_bar.bar_width,
                        background: 'rgba(242, 133, 113, 0.6)',

                    }
                )
            }

        });

        return to_xml;

    }
}

TimelineIntersection.template = xml/*xml*/`

<t t-foreach="Intersection()" t-as="child" t-key="child.id">

    <div t-att-id="'task-gantt-bar-intersection-' + child.id" 
        class="task-gantt-bar-intersection" 
        t-att-style="'top:' + child.top + 'px; left:' + child.left + 'px; width:' + child.width + 'px; background:' + child.background;">
        <div class="task-gantt-name" t-att-style="'width:' + (child.width - 5) + 'px;'">
            <t t-esc="child.value_name"/>
        </div>   
    </div>
 
</t>


`;