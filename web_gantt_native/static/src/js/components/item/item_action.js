/** @odoo-module **/
import {Component, onMounted, useState, onWillUnmount, onWillUpdateProps, useExternalListener, xml, useRef} from "@odoo/owl";

const { DateTime } = luxon;

export class GanttItemAction extends Component {

    static props = [
        "item_list_z"
    ];

    setup() {

        this.stateA = useState({
            item_list_z: this.props.item_list_z,
        });

        // const calcItem = (item, index) => this.calculateItem(item, index);
        // this.state = useState({
        //     item_list: this.props.item_list.map(calcItem),
        // });
        //
        onWillUpdateProps((nextProps) => {
            //console.log("Item Action onWillUpdateProps:", nextProps);
            // const calcItem = (item, index) => this.calculateItem(item, index);
            // this.state.item_list = nextProps.item_list.map(calcItem);
            this.stateA.item_list_z = nextProps.item_list_z;
        });

        // onMounted(() => {
        //     console.log("Item Action OnMounted:");
        // });
        //
        // onWillUnmount(() => {
        //     console.log("Item Action onWillUnmount:");
        // });

    }

    // calculateItem(item, index) {
    //     item.uniq = index;
    //     return item;
    // }

    onGlobalClick(ev) {
        //console.log("Item Action onGlobalClick:", ev);
        const id = ev.target.closest('.item-action').dataset.id;
        //console.log("Item Action onGlobalClick id:", id);
        // if (id) {
        //     this.trigger('focus-gantt-line', { id });
        // }
            // Prevent the default action
        ev.preventDefault();

        // Find the closest ancestor of the clicked element with the class 'item-action'
        const itemAction = ev.target.closest('.item-action');

        // Retrieve the data-id attribute, which contains the ID of the record
        const recordId = itemAction.dataset.id;
        //convert to int
        const recordIdInt = parseInt(recordId, 10); // 10 is the radix parameter

        // Use the record ID to find the corresponding node
        // This assumes you have a way to access your nodes, such as through this.props or this.state
        const record = this.stateA.item_list_z.find(node => node.id === recordIdInt);

        // Now you have the selected record, and you can perform further actions with it
        if (record) {
            // Perform actions with the selected record
            //console.log('Selected record:', record);

            if (!record.is_group){
                //DateTime Luxon
                let toIsoDateTime = record.date_start.toISO();
                this.env.bus.trigger('animate-scroll', { dateTime: toIsoDateTime});
            }
        }
    }
}


GanttItemAction.template = xml/*xml*/`

     <div class="item-actions" t-on-click="onGlobalClick">
         <t t-foreach="stateA.item_list_z" t-as="node" t-key="node.uniq">
             <div class="item-action" t-att-id="'item-action-' + node.id" t-att-data-id="node.id" t-att-style="node.fold ? 'display: none;' : ''">
                 <span class="action-focus"><i class="fa fa-crosshairs fa-1x"></i></span>
                 <span t-if="node.plan_action" class="action-plan"><i class="fa fa-exclamation"></i></span>
             </div>
         </t>
     </div>
`;
