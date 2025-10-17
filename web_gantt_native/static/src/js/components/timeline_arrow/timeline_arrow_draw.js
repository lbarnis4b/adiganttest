/** @odoo-module */
import {Component, useState, onWillUpdateProps, onMounted, onWillRender, onWillUnmount, onPatched, useRef, onWillDestroy, onWillPatch,  xml} from "@odoo/owl";
const { DateTime } = luxon;

// import { TimelineDataBar } from "./timeline_data_bar";
// import { DeadlineSlider } from "./timeline_data_deadline";
export class TimelineArrowDraw extends Component {
    // static components = { TimelineDataBar, DeadlineSlider };
    static template = "native_gantt.TimelineArrowDraw";
    static props = {
        predecessor: Object,
    };

    setup() {

        this.state = useState({
            from_obj: this.props.predecessor.from_obj,
            to_obj: this.props.predecessor.to_obj,
            predecessor: this.props.predecessor,
            type: this.props.predecessor.type,
            id_counter: 0, // Initialize the counter for unique IDs

        });

        //this.state.prop = this.calculateProperties(this.props.predecessor.from_obj, this.props.predecessor.to_obj, this.props.predecessor.type);
        this.state.path = this.calculatePath(this.props.predecessor.from_obj, this.props.predecessor.to_obj, this.props.predecessor.type);

        onMounted(() => {
            //console.log("Line onMounted");
        });

        onWillUnmount(() => {
            //console.log("Line onWillUnmount");
        });

        onWillUpdateProps((nextProps) => {
            //console.log("Line onWillUpdateProps", nextProps);
            this.state.from_obj = nextProps.predecessor.from_obj;
            this.state.to_obj = nextProps.predecessor.to_obj;
            this.state.type = nextProps.predecessor.type;
            this.state.predecessor = nextProps.predecessor;
            //this.state.prop = this.calculateProperties(nextProps.predecessor.from_obj, nextProps.predecessor.to_obj, nextProps.predecessor.type);
            this.state.path = this.calculatePath(nextProps.predecessor.from_obj, nextProps.predecessor.to_obj, nextProps.predecessor.type);


        });

    }
    

    calculateProperties(from_obj, to_obj, type) {

        if (!from_obj || !to_obj) {
            return {};
        }

        let to_obj_top = to_obj.top;
        let from_obj_top = from_obj.top;

        let from_obj_left = from_obj.position_bar.task_stop_pxscale;
        let to_obj_left = to_obj.position_bar.task_start_pxscale;

        let link_dif = 55;
        let color = 'rgba(122, 122, 122, 0.4)';     // #7a7a7a

        let directionX = "right";
        let directionY = "up";

        let line_type = type;

        // Calculate properties based on type
        if (type === "FS") {
            from_obj_left = from_obj.position_bar.task_stop_pxscale;
            to_obj_left = to_obj.position_bar.task_start_pxscale;
            link_dif = 55;
            color = 'rgba(99, 203, 233, 0.4)';          
        }

        if (type === "SS") {
            from_obj_left = from_obj.position_bar.task_start_pxscale;
            to_obj_left = to_obj.position_bar.task_start_pxscale;
            link_dif = 20;
            color = 'rgba(99, 203, 233, 0.4)'; 
        }         

        if (type === "FF") {
            from_obj_left = from_obj.position_bar.task_stop_pxscale;
            to_obj_left = to_obj.position_bar.task_stop_pxscale;
            link_dif = 20;
            color = 'rgba(76, 213, 101, 0.4)';           
        }

        if (type === "SF") {
            from_obj_left = from_obj.position_bar.task_start_pxscale;
            to_obj_left = to_obj.position_bar.task_stop_pxscale;
            link_dif = 20;
            color = 'rgba(208, 141, 115, 0.4)';           
        }

        // Calculate directionX
        directionX = "right"; // X = RIGHT
        if ((to_obj_left - from_obj_left) <= link_dif) { // X = LEFT
            directionX = "left";
        }

        // Calculate directionY
        directionY = "up"; // Y = UP
        if (to_obj_top > from_obj_top) { // Y = DOWN
            directionY = "down";
        }

        // Calculate critical path
        let critical_path = undefined;
        //if (from_obj.critical_path && to_obj.critical_path && from_obj.cp_shows){
        if (from_obj.critical_path && to_obj.critical_path){
             critical_path = 1;
        }

        // Calculate p_loop
        let p_loop = undefined;
        if (to_obj.p_loop){
             p_loop = 1;
        }

        return {
            from_obj_left: from_obj_left,
            to_obj_left: to_obj_left,
            to_obj_top: to_obj_top,
            from_obj_top: from_obj_top,
            link_dif: link_dif,
            color: color,
            directionX: directionX,
            directionY: directionY,
            critical_path: critical_path,
            p_loop: p_loop,
            line_size: 2,
            margin_stop: 5,
            margin_start: 12,
            circle_width: 8,
            circle_height: 16,
            margin_arrow_down: 5,
            margin_arrow_top: 5,
            type: line_type,
            el_type: "i",
            el_fa: "circle",
        };
    }

    CalcStep(prop, from, to) {

        let step = undefined;

        if (to.top < from.top){
            //go up
            if (to.left - from.left > 10){
                //go right
                if (prop.type === "SS")  {
                    step = ["up", "right"];
                }

                if (prop.type === "SF")  {
                    step = ["up", "right", "up", "left"];
                }

                if (prop.type === "FS") {
                    step = ["up", "right"];
                }


            }

            else{
                //go left

                if (prop.type === "SS")  {
                    step = ["up", "left", "up", "right"];
                }

                if (prop.type === "SF")  {
                    step = ["up", "left"];
                }

                if (prop.type === "FS") {
                    step = ["up", "left","up", "right"];
                }


            }


             if (to.left > from.left ) {


                 if (prop.type === "FF") {
                     step = ["up", "right", "up", "left"];
                 }
             }else{

                 if (prop.type === "FF") {
                     step = ["up", "left"];
                 }
             }

            // if (to.left === from.left){
            //     step = ["up"];
            // }
        }

        if (to.top > from.top ){
            //go down
            if (to.left > from.left){
                //go right

                if (prop.type === "SS")  {
                    step = ["down", "right"];
                }

                if (prop.type === "SF")  {
                    step = ["down", "right", "down", "left"];
                }


                if (prop.type === "FS") {
                    step = ["down", "right"];
                }
                if (prop.type === "FF") {
                    step = ["down", "right", "down", "left"];
                }
            }

            else{
                //go left

                if (prop.type === "SS")  {
                    step = ["down", "left", "down", "right"];
                }

                if (prop.type === "SF")  {
                    step = ["down", "left"];
                }

                if (prop.type === "FS") {
                    step = ["down", "left","down", "right"];
                }
                if (prop.type === "FF") {
                    step = ["down", "left"];
                }

            }
        }

        return step;

    }

    CalcPath(prop, from, to, dir, step, mark) {

        let path = { "top": 0, "left": 0, "width": 0, "height": 0, "dir": 0, "align_center" : 0};

        path.type = prop.type;
        path.color = prop.color;
        path.critical_path = prop.critical_path;
        path.p_loop = prop.p_loop;
        path.mark = mark;
        path.el_type = "div";
        path.el_fa = undefined;

        if (path.critical_path){
             path.color = 'rgba(243, 105, 82, 0.4)' //'#f36952';
        
         }


        let k_lft = 4;

        if (dir === "up"){

            if (to) {

                if (step === 0) {
                    path.top = to.top + 7;
                    path.left = from.left + 3;
                    path.height = (from.top - path.top) + 4;
                } else{

                    path.top = to.top+7;
                    path.left = to.left - 7;
                    if (prop.type === "FF" || prop.type === "SF"){
                        path.left = to.left + 10;
                    }

                    path.height = (from.top - path.top) + 2;
                }

                path.width = prop.line_size;

            } else{

                path.top = from.top - 10;
                path.left = from.left + 3;
                path.width = prop.line_size;
                path.height = 20;
            }
        }

        if (dir === "down"){
            if (to) {

                if (step === 0) {
                    path.top = from.top+10;
                    path.left = from.left + 3;

                    path.height = (to.top - path.top) + 7;
                } else{
                    path.top = from.top;
                    path.left = to.left - 7;
                    if (prop.type === "FF" || prop.type === "SF"){
                        path.left = to.left + 10;
                    }

                    path.height = (to.top - path.top) + 7;
                }

                path.width =  prop.line_size;

            } else{
                path.top = from.top+10;
                path.left = from.left+ 3;
                path.width = prop.line_size;
                path.height =  10;
            }
        }


        if (dir === "right"){
            if (to) {
                path.top = from.top;
                if (prop.directionY === "down") {
                    path.top = from.top + from.height;
                }

                path.left = from.left;

                if (step === 0){
                    path.width = (to.left - from.left);
                } else{
                    path.width = (to.left - from.left) + 10;
                }

                if (path.width < 0) {
                    path.width = 0
                }

                path.height = prop.line_size;
            }
        }


        if (dir === "left"){
            if (to) {

                path.top = from.top;
                if (prop.directionY === "down") {
                    path.top = from.top + from.height;
                }

                path.left = to.left - 7;
                if (prop.type === "FF" || prop.type === "SF"){
                    path.left = to.left + 10;
                }
                if (step === 0){
                    path.left = to.left;
                }

                path.width = (from.left - path.left) + 2;
                path.height = prop.line_size;

            }
            else{
                path.top = from.top+5;
                path.left =  from.left + k_lft;
                path.width = prop.line_size;
                path.height =  10;
            }
        }
        return path;
    }

    LinkStartPoint(prop) {

        let path = {"top": 0, "left": 0, "width": 0, "height": 0, "dir": 0, "align_center" : 1};

        path.color = prop.color;
        path.type = prop.type;

        path.critical_path = prop.critical_path;

        path.width = 8;
        path.height = 16;
        path.dir = "S1";
        path.top = prop.from_obj_top + path.width/2 + 2;

        if (prop.type === "FF" || prop.type === "FS") {
            path.left = prop.from_obj_left + prop.margin_stop+2;
        }

        if (prop.type === "SS" || prop.type === "SF") {
            path.left = prop.from_obj_left - prop.margin_start;
        }

        path.el_type = "i";

        return path;

    }

    LinkCircle (path) {
        if (path.critical_path){
            path.color = 'rgba(243, 105, 82, 0.4)' //'#f36952';
        }
        path.el_fa = "circle";
        return path;
    }

    LinkArrow (path) {
        if (path.critical_path){
            path.color = 'rgba(243, 105, 82, 0.4)' //'#f36952';
        }
        path.el_fa = "arrow";
        return path;
    }


    LinkEndPoint(prop) {

        let path = {"top": 0, "left": 0, "width": 0, "height": 0,"dir": 0, "align_center" : 0, };

        path.color = prop.color;
        path.type = prop.type;
        path.dirY = prop.directionY;
        path.critical_path = prop.critical_path;

        if (prop.type === "FF" || prop.type === "SF") {

            path.left = prop.to_obj_left + prop.margin_stop + 7;
            path.width = 10;
            path.height = 16;
            path.align = 1;
            path.dir = "left";

            if (prop.directionY === "up") {
                path.top = prop.to_obj_top+prop.margin_arrow_down;
            }
            if (prop.directionY === "down") {
                path.top = prop.to_obj_top+prop.margin_arrow_top;
            }
        }

        if (prop.type === "SS" || prop.type === "FS") {

            path.top = prop.to_obj_top;
            path.left = prop.to_obj_left - prop.margin_start -7;
            path.width = 10;
            path.height = 16;
            path.dir = "right";
            path.align = 1;

            if (prop.directionY === "up") {
                   path.top = prop.to_obj_top+prop.margin_arrow_down;
            }
            if (prop.directionY === "down") {
                   path.top = prop.to_obj_top+prop.margin_arrow_top;
            }
        }

        path.el_type = "i";
        return path;
    }


    calculatePath = (from_obj, to_obj, type) => {

        if (from_obj.fold || to_obj.fold) {
            return [];
        }

        var LinkWrapperRoute = [];
        let paths = []
        let prop = this.calculateProperties(from_obj, to_obj, type);

        // first element point start
        let s1 = this.LinkStartPoint(prop);
        s1 = this.LinkCircle(s1);
        s1.id = this.state.id_counter++; // Assign unique ID
        LinkWrapperRoute.push(s1);

        // second element point end
        let e1 = this.LinkEndPoint(prop);
        e1 = this.LinkArrow(e1);
        e1.id = this.state.id_counter++; // Assign unique ID
        // push will be last

        // How many steps are needed to draw the path
        let steps = this.CalcStep(prop, s1, e1 );

        if (steps){

            let steps_i = steps.length;

            if (steps_i === 4){

                paths.push(this.CalcPath(prop, s1, undefined, steps[0], 0));
                paths.push(this.CalcPath(prop, paths[0], e1, steps[1], 1, true));
                paths.push(this.CalcPath(prop, paths[1], e1, steps[2], 2));
                paths.push(this.CalcPath(prop, paths[2], e1, steps[3], 0));
            }

            if (steps_i === 3){
                paths.push(this.CalcPath(prop, s1, undefined, steps[0], 0));
                paths.push(this.CalcPath(prop, paths[0], e1, steps[1], 1, true));
                paths.push(this.CalcPath(prop, paths[1], e1, steps[2], 0));
            }

            if (steps_i === 1){
                paths.push(this.CalcPath(prop, s1, e1, steps[0], 0, true));
            }

            if (steps_i === 2){
                paths.push(this.CalcPath(prop, s1, e1, steps[0], 0,true));
                paths.push(this.CalcPath(prop, paths[0], e1, steps[1], 0));
            }

            paths.forEach(path => {
                path.id = this.state.id_counter++; // Assign unique ID
                LinkWrapperRoute.push(path);
            });

        }

        LinkWrapperRoute.push(e1);
        return LinkWrapperRoute

    }

}
