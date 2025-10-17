/** @odoo-module */
import {Component, useState, onMounted, onWillRender,onWillUpdateProps, useRef, xml, useExternalListener} from "@odoo/owl";

const { DateTime } = luxon;
export class DeadlineSlider extends Component {

    static props = {
        row: Object,
        item: Object,
    };

    setup() {
        this.row = this.props.row;
        this.timeline_data = this.row.timeline_data;
        this.item = this.props.item;

        this.elRefSlider = useRef("el_slider");
        this.elRefDeadline  = useRef("el_deadline");

        this.state = useState({
            deadline_bar: false,
            done_bar: false,
            sliderLeft: 0,
            isDragging: false,
            startPos: {x: 0, left: 0},
        });

        this.show_bar_to_today = false;

        let position_x = this.position_x;
        this.deadline_bar = useState({

            left: position_x.deadline_bar_left,
            width: position_x.deadline_bar_width,
            status: position_x.deadline_bar_status,
            slider: position_x.deadline_slider,
            background: position_x.bar_background,
            textAlign: position_x.bar_text_align,
            textMargin: position_x.bar_text_margin,
            text: position_x.bar_text,

        });

        this.done_bar = useState({

            left: position_x.done_bar_left,
            text: position_x.done_bar_text,

        });


        useExternalListener(window, 'mousedown', this.handleMouseDown);
        useExternalListener(window, 'mousemove', this.handleMouseMove);
        useExternalListener(window, 'mouseup', this.handleMouseUp);

        onMounted(()=>{
            this.state.sliderLeft = this.deadline_bar.slider;
        });

        onWillUpdateProps((nextProps) => {
            //console.log("DeadlineSlider onWillUpdateProps:", nextProps);
            this.row = nextProps.row;
            this.timeline_data = this.row.timeline_data;
            this.item = nextProps.item;

            // Update deadline_bar
            let position_x = this.position_x;
            this.deadline_bar.left = position_x.deadline_bar_left;
            this.deadline_bar.width = position_x.deadline_bar_width;
            this.deadline_bar.status = position_x.deadline_bar_status;
            this.deadline_bar.slider = position_x.deadline_slider;
            this.deadline_bar.background = position_x.bar_background;
            this.deadline_bar.textAlign = position_x.bar_text_align;
            this.deadline_bar.textMargin = position_x.bar_text_margin;
            this.deadline_bar.text = position_x.bar_text;

            this.state.sliderLeft = this.deadline_bar.slider;

            if (!this.state.isDragging && this.elRefDeadline && this.elRefDeadline.el) {
                this.elRefDeadline.el.style.display = 'block';
            }

        });
    }

    isValidDateTime(dateTimeObject) {
        return dateTimeObject && dateTimeObject.isValid;
    }

    get position_x() {

        // console.log("position_x", this.item.date_deadline)

        let deadline_bar_left = 0;
        let deadline_bar_width = 0;
        let deadline_bar_status = '';
        let deadline_bar_slider = 0;

        let background= "rgba(255, 190, 190, 0.33)";
        let text_align = "right";
        let text_margin = 20;   // 20px
        let text = "";
        this.state.deadline_bar = false;
        this.state.done_bar = false;

        let done_bar_left = 0;
        let done_bar_text = "";


        if (this.isValidDateTime(this.item.date_done)) {
            this.state.done_bar = true;

            if (this.timeline_data.options.fields_view.arch.attrs.state_status) {
                this.state.done_bar = this.item.state === this.timeline_data.options.fields_view.arch.attrs.state_status;
            }

            let done_date_time = this.item.date_done.toMillis();
            let done_star_pxscale = Math.round((done_date_time - this.timeline_data.scales.firstDayScale)
                / this.timeline_data.scales.pxScaleUTC);


            done_bar_left = done_star_pxscale;
            done_bar_text = this.timeline_data.lag_any(this.item.date_done, this.item.date_deadline, "-  ", "+ ", true);

        }


        if (this.isValidDateTime(this.item.date_deadline) && !this.isValidDateTime(this.item.date_done)) {
            this.state.deadline_bar = true;

            let deadline_today = this.item.position_bar;

            // Show the deadline bar to today - TODO - check if it is needed
            if (this.timeline_data.renderer.isTODAYline && this.show_bar_to_today) {
                deadline_today = this.props.parent.position_x(DateTime.local(), DateTime.local(), this.item.date_deadline);
                text_margin = 5;
            }

            let deadline_date_time = this.item.date_deadline.toMillis();
            let deadline_star_pxscale = Math.round((deadline_date_time - this.timeline_data.scales.firstDayScale)
                                                                                    / this.timeline_data.scales.pxScaleUTC);

            const task_start_pxscale = deadline_today.bar_left;
            const task_stop_pxscale = task_start_pxscale + deadline_today.bar_width;

            // const bar_left = this.item.position_bar.bar_left;
            // const bar_width = this.item.position_bar.bar_width;

            if (deadline_star_pxscale >= task_stop_pxscale) {
                deadline_bar_left = task_stop_pxscale;
                deadline_bar_width = deadline_star_pxscale - task_stop_pxscale;
                deadline_bar_status = 'after_stop';
                background= "rgba(167, 239, 62, 0.33)";
                text_align = "left";

            }
            if (deadline_star_pxscale < task_stop_pxscale) {
                deadline_bar_left = deadline_star_pxscale
                deadline_bar_width = task_stop_pxscale - deadline_bar_left;
                deadline_bar_status = 'before_stop'
            }
            if (deadline_star_pxscale <= task_start_pxscale) {
                deadline_bar_left = deadline_star_pxscale;
                deadline_bar_width = task_start_pxscale - deadline_bar_left;
                deadline_bar_status = 'before_start'
            }

            //slider
            deadline_bar_slider = deadline_star_pxscale;
            text = this.timeline_data.lag_any(DateTime.local(), this.item.date_deadline, "-  ", "+ ", true);

        }

        return {
            deadline_bar_left: deadline_bar_left,
            deadline_bar_width: deadline_bar_width,
            deadline_bar_status: deadline_bar_status,
            deadline_slider: deadline_bar_slider,
            bar_background: background,
            bar_text_align: text_align,
            bar_text_margin: text_margin,
            bar_text: text,
            done_bar_left: done_bar_left,
            done_bar_text: done_bar_text,
        }

    }

    handleMouseUp() {
         if (this.state.deadline_bar &&  this.state.isDragging) {
             this.state.isDragging = false;
             this.env.bus.trigger('hide-hint');

             let date_deadline = this.timeline_data.GetSliderPxToTime(this.state.sliderLeft);
             this.timeline_data.renderer.updateItem(this.item, "date_deadline" , date_deadline)

             // Show the deadline
             //this.elRefDeadline.el.style.display = 'block';
        }
    }

    handleMouseMove(event) {
        if (this.state.deadline_bar && this.state.isDragging) {
            const dx = event.pageX - this.state.startPos.x;
            this.state.sliderLeft = this.state.startPos.left + dx;

            let date_deadline = this.timeline_data.GetSliderPxToTime(this.state.sliderLeft);


            let itemValue = date_deadline.toFormat(this.timeline_data.renderer.formatDate);

            // HINT
            this.env.bus.trigger('show-hint', {
                itemValue: itemValue,
                posX: this.state.sliderLeft,
                posY: this.row.offsetTop,
                margenTop : 18
            });
        }
    }

    handleMouseDown(event) {
        if (this.state.deadline_bar && event.target.id === `deadline-slider-${this.item.uniq}`) {
            this.state.isDragging = true;
            this.state.startPos.x = event.pageX;
            this.state.startPos.left = this.state.sliderLeft;

            //console.log("Click", "left" + this.state.startPos.left);

            // Hide the deadline
            this.elRefDeadline.el.style.display = 'none';
        }
    }
}

DeadlineSlider.template = xml/*xml*/`

    <t t-if="state.deadline_bar"> 
        <div class="task-gantt-bar-deadline"  t-ref="el_deadline"
        t-att-style="'left: ' + deadline_bar.left + 'px; ' +
                     'width: ' + deadline_bar.width + 'px; ' +
                     'background: ' + deadline_bar.background + '; ' +
                     'text-align: ' + deadline_bar.textAlign + '; ' +
                     'text-margin: ' + deadline_bar.textMargin + 'px; '
                     ">
            <div class="task-gantt-bar-deadline-info" t-esc="deadline_bar.text" />
        </div>
  
        <div class="task-gantt-deadline-slider" t-ref="el_slider"
             t-att-id="'deadline-slider-' + item.uniq"
             t-att-style="'position: obsalute; left: ' + state.sliderLeft + 'px;'">
        </div>
     </t>  
     
    <t t-if="state.done_bar">
        <div class="task-gantt-done-slider fa fa-check-circle-o" 
        t-att-style=" 'left: ' + done_bar.left + 'px; ' ">
            <div class="task-gantt-done-info">
                <a t-esc="done_bar.text"></a>
            </div>
        </div>
    </t>
`;