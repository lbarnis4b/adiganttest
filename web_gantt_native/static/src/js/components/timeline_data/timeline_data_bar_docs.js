/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";


export class TimeLineDocs extends Component {

    static props = [
        "item",
    ];
    setup() {

        this.item = this.props.item;

        this.state = useState({
            doc_count: 0,
        });

        onMounted(()=>{
            this.state.doc_count = this.props.item.doc_count;
        });

        onWillUpdateProps((nextProps) => {
            //console.log("Bar Docs onWillUpdateProps:", nextProps);
            this.item = nextProps.item;
            this.state.doc_count = nextProps.item.doc_count;
        });
    }
}

TimeLineDocs.template = xml/*xml*/`
    <t t-if="state.doc_count"> 
        <div class="task-gantt-docs task-gantt-docs-slider">
            <i class="fa fa-paperclip" aria-hidden="false"></i>
            <span class="doc-count small-font"><t t-esc="state.doc_count"/></span>
        </div>
    </t>
`;