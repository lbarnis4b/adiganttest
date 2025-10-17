/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";


export class TimeLineBarInfo extends Component {

    static props = [
        "item",
        "timeline_data"
    ];
    setup() {

        this.item = this.props.item;
        this.task_info = this.props.timeline_data.renderer.Task_Info;

        let info = {
            start: '',
            left_up: '',
            left_down: '',
            end: '',
            right_up: '',
            right_down: '',
        }

        this.state = useState({
            info: info
        });

        onMounted(()=>{

            this.updateInfo();

        });

        onWillUpdateProps((nextProps) => {
            //console.log("Bar Docs onWillUpdateProps:", nextProps);
            this.item = nextProps.item;
            this.task_info = nextProps.timeline_data.renderer.Task_Info;
            this.updateInfo();

        });
    }

    updateInfo(){
        //search this.item.id in task_info
        if (!this.task_info) {
            return;
        }
        let task_info_to = this.task_info.filter(info => info.task_id === this.item.id);
        //update this.state with task_info_to

        this.state.info = {
            start: '',
            left_up: '',
            left_down: '',
            end: '',
            right_up: '',
            right_down: '',
        }


        // Then add task_info data (can append to CPM info)
        task_info_to.forEach(info => {
            if (info["show"]) {
                Object.keys(info).forEach(key => {
                    if (info[key]) {
                        if (this.state.info[key]) {
                            this.state.info[key] = this.state.info[key] + ', ' + info[key];
                        } else {
                            this.state.info[key] = info[key];
                        }
                    }
                });
            }
        });

    }
}

TimeLineBarInfo.template = xml/*xml*/`
    <div class="task-gantt-bar-plan-info-start">
        <a> <t t-esc="state.info.start"/> </a>
    </div>

    <div class="task-gantt-bar-plan-info-left-up">
        <a> <t t-esc="state.info.left_up"/> </a>
    </div>

    <div class="task-gantt-bar-plan-info-left-down">
        <a> <t t-esc="state.info.left_down"/> </a>
    </div>

    <div class="task-gantt-bar-plan-info-end">
        <a> <t t-esc="state.info.end"/> </a>
    </div>
    
    <div class="task-gantt-bar-plan-info-right-up">
        <a> <t t-esc="state.info.right_up"/> </a>
    </div>
    
    <div class="task-gantt-bar-plan-info-right-down">
        <a> <t t-esc="state.info.right_down"/> </a>
    </div>
        
        

`;