/** @odoo-module **/

import {Component, onMounted, useState, onWillUnmount, onWillUpdateProps, onWillDestroy, useExternalListener, xml, useRef} from "@odoo/owl";

const { DateTime } = luxon;

export class GanttTimeLineScroll extends Component {

    static props = [
        "scales",
        "options"
    ];

    setup() {

        // Bind this to the event handlers, for access to the component's state
        this.startDrag = this.startDrag.bind(this);
        this.drag = this.drag.bind(this);
        this.endDrag = this.endDrag.bind(this);

        this.taskGanttTimeLineRef = this.props.options.taskGanttTimeLineRef
        this.taskGanttTimeLineDataRef = this.props.options.taskGanttTimeLineDataRef


        this.state = useState({
            time_scale: this.props.scales.time_scale,
            time_type: this.props.scales.time_type,
            first_scale: this.props.scales.first_scale,
            second_scale: this.props.scales.second_scale,
            first_day: this.props.scales.first_day,
            last_day: this.props.scales.last_day,
            format: this.props.scales.format,

            gutterOffset: this.props.scales.gutterOffset,
            firstDayScale: this.props.scales.firstDayScale,
            pxScaleUTC: this.props.scales.pxScaleUTC,
            timeline_width: this.props.scales.timeline_width,

            currentDate: DateTime.fromISO(this.props.scales.first_day).toFormat(this.props.scales.format)

        });

        this.isDragging = false;
        this.dragStartX = 0;
        this.sliderX = 0;
        this.scrollRef = useRef('timeline-gantt-scroll');

        window.addEventListener('pointerdown', this.startDrag);
        // window.addEventListener('pointermove', this.drag);
        window.addEventListener('pointerup', this.endDrag);
        window.addEventListener('mouseup', this.endDrag);

        onWillUpdateProps((nextProps) => {
            //console.log("Scroll onWillUpdateProps:", nextProps);
            this.state.time_scale = nextProps.scales.time_scale;
            this.state.time_type = nextProps.scales.time_type;
            this.state.first_scale = nextProps.scales.first_scale;
            this.state.second_scale = nextProps.scales.second_scale;
            this.state.first_day = nextProps.scales.first_day;
            this.state.last_day = nextProps.scales.last_day;
            this.state.format = nextProps.scales.format;

            this.state.gutterOffset = nextProps.scales.gutterOffset;
            this.state.firstDayScale= nextProps.scales.firstDayScale;
            this.state.pxScaleUTC = nextProps.scales.pxScaleUTC;
            this.state.timeline_width = nextProps.scales.timeline_width;


            this.updateScroll();



        });


        onMounted(() => {
            this.env.bus.addEventListener("animate-scroll", (ev) => this.animateScrollEvent(ev));
            //console.log("Scroll OnMounted:");
            this.updateScroll();


            // const slider = this.scrollRef.el.querySelector('.timeline-gantt-scroll-slider');

        });

        onWillUnmount(() => {
            //console.log("Scroll onWillUnmount:");
            this.env.bus.removeEventListener("animate-scroll", (ev) => this.animateScrollEvent(ev));

            window.removeEventListener('pointerdown', this.startDrag);
            // window.removeEventListener('pointermove', this.drag);
            window.removeEventListener('pointerup', this.endDrag);
            window.removeEventListener('mouseup', this.endDrag);


        });

        onWillDestroy(() => {
            //console.log("Scroll onWillDestroy");
            this.env.bus.removeEventListener("animate-scroll", (ev) => this.animateScrollEvent(ev));
           //  console.log("taskGanttRef", this.taskGanttRef.el);
        });

    }

    animateScrollEvent(ev) {
        //console.log("animateScrollevent", ev);
        //console.log("EL", this.scrollRef.el);

        if (ev.detail.dateTime === undefined){
            return;
        }

        if (this.scrollRef.el === null){
            return;
        }

        let targetDateTime = DateTime.fromISO(ev.detail.dateTime);
        let toscale = Math.round((targetDateTime.toMillis() - this.state.firstDayScale) / this.state.pxScaleUTC);

        let new_toscale = toscale-500;
        if (new_toscale < 0){
            new_toscale = 0;
        }

        this.env.bus.trigger('ganttn-scroll', {offset_left: new_toscale});


        let scale_width = this.scrollRef.el.offsetWidth
        let x1 = this.taskGanttTimeLineRef.el.offsetWidth;
        let x2 = this.taskGanttTimeLineDataRef.el.offsetWidth;
        let scroll_width = x2 - x1;

        let scale = scroll_width/(scale_width);

        let offset_left = (new_toscale) / scale;



        if (offset_left > scale_width){
            offset_left = scale_width
        }

        if (offset_left <= 0){
            offset_left = 0
        }
        const limit = this.scrollRef.el.offsetWidth - 50; // get the width of the timeline-gantt-scroll



        if (offset_left > limit) {
            offset_left = limit;
        }

        this.state.sliderLeft  = offset_left

        this.sliderX = offset_left;
        this.dragStartX = offset_left;

         this.updateCurrentDate();

    }

    updateScroll() {
        let format = this.state.format
        if (this.state.format === undefined) {
            format = 'yyyy-MM-dd HH:mm:ss';
        }

        this.state.scroll_start_str = DateTime.fromISO(this.state.first_day).toFormat(format);
        this.state.scroll_end_str = DateTime.fromISO(this.state.last_day).toFormat(format);

    }

    startDrag(event) {
        if (event.target.className === 'timeline-gantt-scroll-slider'
            || event.target.className === 'task-gantt-timeline-row'
            || event.target.className === 'timeline-gantt-current-date') {

            //event.preventDefault(); // Add this line to prevent the default behavior

            window.removeEventListener('pointermove', this.drag);
            window.addEventListener('pointermove', this.drag);

            this.isDragging = true;

            this.dragStartX = event.clientX;

            this.scale_width = this.scrollRef.el.offsetWidth
            let x1 = this.taskGanttTimeLineRef.el.offsetWidth;
            let x2 = this.taskGanttTimeLineDataRef.el.offsetWidth;
            this.scroll_width = x2 - x1;

        }
    }

    drag(event) {

        //event.preventDefault(); // Add this line to prevent the default behavior
        //if (!this.isDragging || event.target.className !== 'timeline-gantt-scroll-slider') return;


        event.preventDefault(); // Add this line to prevent the default behavior


        // if (!this.isDragging) return;



        const dx = event.clientX - this.dragStartX;
        this.sliderX += dx;
        this.dragStartX = event.clientX;

        //this.scale_width
        //this.scroll_width

        // Ensure sliderX is not less than 0
        if (this.sliderX < 0) {
            this.sliderX = 0;
        }


        // Ensure sliderX is not more than the width of the timeline-gantt-scroll
        const limit = this.scrollRef.el.offsetWidth - 50; // get the width of the timeline-gantt-scroll
        if (this.sliderX > limit) {
            this.sliderX = limit;
        }


        this.state.sliderLeft = this.sliderX;

        let offset_left = this.state.sliderLeft


        //need recalculating the scale_x offser for the timeline-gantt-head and task-gantt-timeline
        offset_left = offset_left * (this.scroll_width / (this.scale_width - 50));


        this.env.bus.trigger('ganttn-scroll', {offset_left: offset_left});

        this.updateCurrentDate();
    }

    endDrag() {
        this.isDragging = false;
        window.removeEventListener('pointermove', this.drag);
    }


    updateCurrentDate() {

         let offset_left = this.state.sliderLeft * (this.scroll_width / (this.scale_width - 50));

        const offsetMillis = offset_left * this.state.pxScaleUTC;
        const currentDate = DateTime.fromMillis(this.state.firstDayScale + offsetMillis).toFormat(this.state.format);
        this.state.currentDate = currentDate;
    }


    scrollOffset(gantt_data_offset) {
        // Assuming gantt_data_offset is the amount you want to scroll
        // You can adjust the scroll position of the timeline
        this.state.scale_width += gantt_data_offset;
    }

}

GanttTimeLineScroll.template = xml/*xml*/`

    <div class="timeline-gantt-scroll" t-ref="timeline-gantt-scroll">
        <div class="timeline-gantt-scroll-scale-start">
            <div class="timeline-gantt-scroll-scale-start-date">
                <t t-esc="state.scroll_start_str"/>
            </div>
        </div>
        
        
        <div class="timeline-gantt-scroll-scale-end">
            <div class="timeline-gantt-scroll-scale-end-date">
                <t t-esc="state.scroll_end_str"/>
            </div>
        </div>
        
        
        <div class="timeline-gantt-scroll-slider" 
             t-att-style="'position: relative; left: ' + state.sliderLeft + 'px;'">
                     <div class="timeline-gantt-current-date">
            <t t-esc="state.currentDate"/>
            </div>
        </div>
        

           
        
    </div>
`;
