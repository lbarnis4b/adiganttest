
/** @odoo-module **/

import {Component, useRef, useState, useExternalListener, xml, useEffect} from "@odoo/owl";

const { DateTime } = luxon;

export class GanttMenuButton extends Component {
    static props = [
        "parent",
    ];
    setup() {
        this.state = useState({
            count: 0,
        });

        useEffect(() => {
            //console.log("Button: UseEffect: has been rendered");
           // this.state.templateVersion = this.state.templateVersion === 1 ? 2 : 1;
        });
    }

    incrementCount() {
        this.state.count++;
    }


}


GanttMenuButton.template = xml/*xml*/`
    <div>
        <button t-on-click="incrementCount">Today</button>
    </div>
`;
