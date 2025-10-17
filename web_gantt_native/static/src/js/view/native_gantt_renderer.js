/** @odoo-module **/
import {useState, Component, useRef, onMounted,onPatched ,onWillRender,
    onWillUnmount, onWillStart,onWillUpdateProps, onWillPatch, onRendered, onWillDestroy} from "@odoo/owl";
import {useBus} from "@web/core/utils/hooks";


const { DateTime, Duration, Interval } = luxon;
const { serializeDateTime, serializeDate ,parseDateTime, parseDate  } = require("@web/core/l10n/dates");

import {deserializeDateTime} from "@web/core/l10n/dates";
const auto_str_to_date = deserializeDateTime;

import { browser } from "@web/core/browser/browser";
import { localization } from "@web/core/l10n/localization";

import { GanttTimeLineScroll } from "@web_gantt_native/js/components/scroll/timeline_scroll";
import { GanttItemzTree }      from "@web_gantt_native/js/components/item/item_ztree";
import { GanttTimeLineHead }   from "@web_gantt_native/js/components/header/timeline_head";
import { GanttTimeLineHeader } from "@web_gantt_native/js/components/header/timeline_header";
import { TimeLinePopupHint }   from "@web_gantt_native/js/components/hint/timeline_hint";
import { GanttTimeLineData }   from "@web_gantt_native/js/components/timeline_data/timeline_data";
import { GanttMenuButton }     from "@web_gantt_native/js/components/menu/button";

import { GanttItemAction }     from "@web_gantt_native/js/components/item/item_action";
import { GanttItemOption }     from "@web_gantt_native/js/components/item/item_option";
import { GanttItemMenu }       from "@web_gantt_native/js/components/item/item_menu";
import { GanttListInfo }       from "@web_gantt_native/js/components/item/item_info";

import { GanttTimeLineArrow }  from "@web_gantt_native/js/components/timeline_arrow/timeline_arrow";
import { GanttResourcePanel }   from "@web_gantt_native/js/components/load/resource_panel";
import { GanttWbsColumn }      from "@web_gantt_native/js/components/wbs/wbs_column";

export class NativeGanttRenderer extends Component {
    static template = "native_gantt.renderer";

    static components = {
        GanttTimeLineScroll,
        GanttItemzTree,
        GanttItemAction,
        GanttTimeLineHead,
        GanttTimeLineHeader,
        TimeLinePopupHint,
        GanttTimeLineData,
        GanttMenuButton,
        GanttItemOption,
        GanttItemMenu,
        GanttListInfo,
        GanttTimeLineArrow,
        GanttResourcePanel,
        GanttWbsColumn,

    };

    static props = [
        "model",
        "controller"
    ];

    // static props = {
    //     model: Object,
    //
    // };
    setup() {

        //console.log("NativeGanttRenderer setup");

        //this.globalPointerMove = this.globalPointerMove.bind(this);
        // window.addEventListener('pointermove', this.globalPointerMove);
        // this.env.bus.addEventListener("global-pointer-move", (ev) => this.globalPointerMove(ev));


        this.model = this.props.model;
        this.rootRef = useRef("gantt_container");
        this.taskGanttRef = useRef("taskGantt");

        this.taskGanttListRef = useRef('taskGanttList');
        this.timelineGanttItemsRef = useRef('timelineGanttItems');
        this.taskGanttItemsRef = useRef('taskGanttItems');

        this.taskGanttTimeLineRef = useRef('task-gantt-timeline');
        this.taskGanttTimeLineDataRef = useRef('task-gantt-timeline-data');

        this.scales = {
            time_scale: undefined,
            time_type: undefined,
            first_scale: undefined,
            second_scale: undefined,
            first_day: undefined,
            last_day: undefined,
            format: undefined,
            offset_left: 0,
            gutterOffset: 0,

            firstDayScale: 0,
            pxScaleUTC: 0,
            timeline_width: 0,
        }

        //Storage browser
        this.local_storage = browser.localStorage;
        
        // ID for debugging
        this.rendererId = Math.random().toString(36).substr(2, 9);

        this.gutterOffset = this.local_storage.getItem("gantt_offset") || 400;
        this.itemsOffset = this.local_storage.getItem("items_offset") || 300;

        // this.gutterOffset =  400;
        // this.itemsOffset =  300;
        // this.local_storage.setItem("gantt_offset", this.gutterOffset);
        // this.local_storage.setItem("items_offset", this.itemsOffset);

        //
        this.week_type = this.local_storage.getItem("gantt_week_type") || "isoweek";

        // Item List Menu
        this.list_show = parseInt(this.local_storage.getItem("gantt_list_show")) || 0;
        this.industry_show = parseInt(this.local_storage.getItem("gantt_industry_show")) || 0;
        this.show_wbs = parseInt(this.local_storage.getItem("gantt_show_wbs")) || 0;
        // showResourceLoad is now managed by Controller via events
        // Read state from localStorage for correct initialization
        this.showResourceLoad = parseInt(browser.localStorage.getItem("gantt_resource_load")) || 0;

        //
        this.formatDateTime = localization.dateTimeFormat;
        this.formatDate = localization.dateFormat;
        this.scales.format = this.formatDate;

        this.isTODAYline = false;

        this.timeType = 'month_day';

            // items_sorted: this.ItemsSorted,
            // export_wizard: this.ExportWizard,
            // main_group_id_name: this.Main_Group_Id_Name,
            // tree_view : this.TreeView,
            // action_menu: this.Action_Menu,
        this.state_z = useState({
            item_list_z : [],
        })

        if (!this.model.gantt.data.hasOwnProperty('rows_to_gantt')) {
            console.log("No rows_to_gantt");
        }



        this.state = useState({
            item_list : this.model.gantt.data.rows_to_gantt  || [],

            scales: this.scales,
            options: {},

            gutterOffset: this.gutterOffset,
            itemsOffset: this.itemsOffset,
            offset_left: 1,
            data: this.props.model.data,
            model: this.props.model,
            showResourceLoad: this.showResourceLoad,
            resourceData: [],
        });

        this.widget = {};

        this._renderGantt();


        onWillStart(() => {
            //console.log("Renderer onWillStart");
             // console.log("taskGanttRef", this.taskGanttRef.el);
        });

        onWillUpdateProps((nextProps) => {
            //console.log("Renderer onWillUpdateProps", nextProps);
             //console.log("taskGanttRef", this.taskGanttRef.el);
        });

        onMounted(() => {

            this._addGutterMouseEventListeners();

            //console.log("Renderer onMounted");
            // console.log("taskGanttRef", this.taskGanttRef.el);
        });

        onWillUnmount(() => {
            // useBus automatically cleans EventBus listeners - manual cleanup not needed
            this._removeGutterMouseEventListeners();

            //console.log("Renderer onWillUnmount");
            // console.log("taskGanttRef", this.taskGanttRef.el);
        });


        onWillPatch(() => {
            //console.log("Renderer onWillPatch");
            // console.log("taskGanttRef", this.taskGanttRef.el);
        });

        // onRendered(() => {
        //     console.log("Renderer onRendered");
        //     // console.log("taskGanttRef", this.taskGanttRef.el);
        // });


        onPatched(() => {
            //console.log("Renderer onPatched");
           //  console.log("taskGanttRef", this.taskGanttRef.el);
        });


        onWillDestroy(() => {
            //console.log("Renderer onWillDestroy");
           //  console.log("taskGanttRef", this.taskGanttRef.el);
        });

        onWillRender(() => {
            //console.log("Renderer onWillRender");
            // console.log("taskGanttRef", this.taskGanttRef.el);
        });

        let test = "test";

        // All EventBus listeners must be in setup() method
        useBus(this.env.bus, 'toggle-resource-load', this.onToggleResourceLoad.bind(this));
        useBus(this.env.bus, "ganttn-pointer-move", this.globalPointerMove.bind(this));
        useBus(this.env.bus, "ganttn-scroll", this.scrollUpdate.bind(this));
        useBus(this.env.bus, "switch-scale", this.switchScale.bind(this));
        useBus(this.env.bus, "widget-update", this.widgetUpdate.bind(this));
        useBus(this.env.bus, "gantt_refresh_after_change", this.gantt_refresh_after_change.bind(this));

    }


    _addGutterMouseEventListeners() {
        const itemsGutter = this.rootRef.el.querySelector('.task-gantt-items-gutter');
        const mainGutter = this.rootRef.el.querySelector('.task-gantt-gutter');
        itemsGutter.addEventListener('mousedown', (event) => this._onMouseDown(event, 'items'));
        mainGutter.addEventListener('mousedown', (event) => this._onMouseDown(event, 'gutter'));
        document.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('mouseup', this._onMouseUp.bind(this));
    }

    _removeGutterMouseEventListeners() {
        const itemsGutter = this.rootRef.el.querySelector('.task-gantt-items-gutter');
        const mainGutter = this.rootRef.el.querySelector('.task-gantt-gutter');
        itemsGutter.removeEventListener('mousedown', (event) => this._onMouseDown(event, 'items'));
        mainGutter.removeEventListener('mousedown', (event) => this._onMouseDown(event, 'gutter'));
        document.removeEventListener('mousemove', this._onMouseMove.bind(this));
        document.removeEventListener('mouseup', this._onMouseUp.bind(this));
    }

    _onMouseDown(event, gutterType) {
        this.state.isResizing = true;
        this.state.startX = event.clientX;
        this.state.initialWidth = gutterType === 'items' ? this.state.itemsOffset : this.state.gutterOffset;
        this.state.resizingGutter = gutterType;
        document.body.style.cursor = 'col-resize'; // Change cursor to resizing cursor
    }

    _onMouseMove(event) {
        if (!this.state.isResizing) return;
        const dx = event.clientX - this.state.startX;
        let newWidth;
        if (this.state.resizingGutter === 'items') {
            newWidth = Number(this.state.initialWidth) + dx;
            if (!isNaN(newWidth)) {
                this.state.itemsOffset = newWidth;
            }
        } else if (this.state.resizingGutter === 'gutter') {
            newWidth = Number(this.state.initialWidth) + dx;
            if (!isNaN(newWidth)) {
                this.state.gutterOffset = newWidth;
            }
        }
    }


    _onMouseUp() {
        this.state.isResizing = false;
        this.state.resizingGutter = null;
        document.body.style.cursor = 'default'; // Reset cursor to default
        this.local_storage.setItem("gantt_offset", this.state.gutterOffset);
        this.local_storage.setItem("items_offset", this.state.itemsOffset);

        this.scales.gutterOffset = this.state.gutterOffset;
        this.scales.itemsOffset = this.state.itemsOffset;

        this.gutterOffset = this.state.gutterOffset;

        //this.env.bus.trigger('gantt_refresh_after_change')
    }


    widgetUpdate(ev) {
        //console.log("Widget Update", ev);
        this.widget[ev.detail.name] = ev.detail.value;
        let zTree = ev.detail.value
        // this.updateChildrenFoldStatus(zTree);
        this.to_item_list_z(zTree);

    }
//console.log(' '.repeat(child.level * 2) + child.value_name);
//     updateChildrenFoldStatus(zTree) {
//         const traverseAndUpdate = (nodes) => {
//             for (let i = 0; i < nodes.length; i++) {
//                 let node = nodes[i];
//                 if (!node.open && node.children) {
//                     for (let j = 0; j < node.children.length; j++) {
//                         node.children[j].fold = true;
//                     }
//                 }
//                 console.log(' '.repeat(node.level * 2) + node.value_name + " rF:" + node.fold + " O:" + node.open);
//
//                 if (node.children && node.children.length > 0) {
//                     traverseAndUpdate(node.children); // Recursively traverse all nodes
//                 }
//             }
//         };
//
//         let nodes = zTree.getNodes();
//         traverseAndUpdate(nodes);
//     }

    to_item_list_z(zTree) {

        if (!zTree) {
            return [];
        }

        let item_list_z = zTree.transformToArray(zTree.getNodes());

        let fields = this.model.metaData.fields;

        let level_where_open = 0
        let next_level_fold = false

        for (let item of item_list_z) {

            for (let key in item) {
                let field = this.model.metaData.fields_view.arch.attrs[key];

                if (fields[field] && fields[field].type === 'date' && typeof item[key] == 'string') {
                    item[key] = parseDate(item[key]);
                } else if (fields[field] && fields[field].type === 'datetime' && typeof item[key] == 'string') {
                    item[key] = parseDateTime(item[key]);
                }
            }

            if (this.options.items_sorted){
                if (item.open === false && item.children && next_level_fold === false) {
                next_level_fold = true;
                level_where_open = item.level;
                item.fold = false
            }else if (next_level_fold) {
                    if (item.level > level_where_open) {
                        item.fold = true;
                    } else {
                        next_level_fold = false;
                }

            }else{
                item.fold = false;
                }
        }
            //console.log(' '.repeat(item.level * 2) + item.value_name + " rF:" + item.fold + " O:" + item.open + " level:" + item.level);
        }

         this.state_z.item_list_z = item_list_z


    }

    globalPointerMove(ev) {

        ev.stopPropagation();

        //console.log("taskGanttRef Global Pointer", this.taskGanttRef.el, ev);

        if (this.taskGanttRef.el && ev.detail.action === 'show-hint') {

            const ev_act = ev.detail.ev;
            const target = ev_act.target;
            let scrollTop = target.scrollTop+this.taskGanttRef.el.scrollTop;
            if (ev.detail.hasOwnProperty('y')) {
                scrollTop = ev.detail.y;
            }
            const scrollLeft = target.scrollLeft;
            const itemValue = ev.detail.itemValue;

            const posX = scrollLeft+ev_act.pageX-this.scales.gutterOffset+this.scales.offset_left;
            this.env.bus.trigger('show-hint', { itemValue: itemValue, posX: posX, posY: scrollTop });
        }


    }

    scrollUpdate(ev) {
        this.scales.offset_left = ev.detail.offset_left;

        const taskGanttTimeLineEL = this.taskGanttTimeLineRef.el;
        if (taskGanttTimeLineEL) {
            taskGanttTimeLineEL.scrollLeft = ev.detail.offset_left;
        }


    }

    _renderGantt() {

        this.Task_Info = this.model.gantt.data.task_info;

        this.Predecessor = this.model.gantt.data.predecessor;

        //Ghost
        this.Ghost = this.model.gantt.data.Ghost ;
        this.Ghost_Data = this.model.gantt.data.Ghost_Data;

        //BarFist
        this.BarFirst = this.model.gantt.data.BarFirst;
        this.BarFirst_Data =  this.model.gantt.data.BarFirst_Data;

        //Action Menu
        this.ExportWizard = this.model.gantt.data.ExportWizard;
        this.Main_Group_Id_Name = this.model.gantt.data.Main_Group_Id_Name;
        this.Action_Menu = this.model.gantt.data.Action_Menu;

        //
        this.context = this.model.gantt.data.context;

        this.fields_view = this.model.fields_view;
        this.ItemsSorted = this.model.gantt.data.ItemsSorted;
        // this.fields = this.model.gantt.fields;
        this.fields = this.model.model_fields;
        this.model_fields_dict  = this.model.model_fields_dict;
        this.TreeView = this.model.gantt.data.TreeView;

        this.LoadMode = this.model.gantt.data.LoadMode;
        this.Load_Data = this.model.gantt.data.Load_Data;

        this.Task_Load_Data = this.model.gantt.data.Task_Load_Data;

        this.GtimeStart = this.model.gantt.data.GtimeStart;
        this.GtimeStop = this.model.gantt.data.GtimeStop;

        if ( this.timeType === undefined ) {
            this.timeType = 'month_day';
        }

        //Sorted and grouped to flat list
        this.rows_to_gantt = this.model.gantt.data.rows_to_gantt;
        // or &&
        if (this.rows_to_gantt === undefined) {
            return;
        }






        // Start - End month
        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('month'); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('month'); //End month
        this.timeScaleUTC = this.lastDayDate.diff(this.firstDayDate, 'milliseconds').milliseconds; // difference in time
        this.firstDayScale = this.firstDayDate.valueOf(); // value of first day

        this.options = {
            items_sorted: this.ItemsSorted,
            export_wizard: this.ExportWizard,
            main_group_id_name: this.Main_Group_Id_Name,
            tree_view : this.TreeView,
            action_menu: this.Action_Menu,
            fields_view: this.fields_view,
            taskGanttTimeLineRef: this.taskGanttTimeLineRef,
            taskGanttTimeLineDataRef: this.taskGanttTimeLineDataRef,
            model: this.props.model,

        };
        //console.log("rTree_view renderer: ", this.TreeView);
        //console.log("rTree_view renderer ItemsSorted: ", this.ItemsSorted);

        this._action()

    }

        // super.setup();
        // Here we could really do without a renderer as we could just use the
        // controller template directly. But the common practice is to have a
        // renderer component that gets updated with props: "items" in that case.



     // on Mounted(()=>{
     //    console.log("NativeGanttRenderer onMounted");
        // this._updateTree();


    _action() {

        if (this.timeType === 'month_day'){
            this.ZoomDaysClick();
        }

        if (this.timeType === 'day_1hour'){
            this.ZoomHoursClick(1, 'day_1hour');
        }

        if (this.timeType === 'day_2hour'){
            this.ZoomHoursClick(2, 'day_2hour');
        }

        if (this.timeType === 'day_4hour'){
            this.ZoomHoursClick(4, 'day_4hour');
        }

        if (this.timeType === 'day_8hour'){
            this.ZoomHoursClick(8, 'day_8hour');
        }

        if (this.timeType === 'year_month'){
            this.ZoomMonthClick();
        }

        if (this.timeType === 'month_week'){
            this.ZoomWeeksClick();
        }

        if (this.timeType === 'quarter'){
            this.ZoomQuarterClick();
        }



        //diff between state this.state.item_list and this.rows_to_gantt and log to console diff
        // Calculate the difference
        // Calculate the difference

        //Gutter offset get over state
        this.state.options = this.options;
        this.state.item_list = this.rows_to_gantt;


        this.state.gutterOffset = this.gutterOffset;
        this.state.itemsOffset = this.itemsOffset;

    }

    // assert.deepEqual(query.params, {
    //     args: [[43, 14], { active: false }],
    //     kwargs: {
    //         context: {
    //             lang: "en",
    //             tz: "taht",
    //             uid: 7,
    //         },
    //     },
    //     method: "write",
    //     model: "partner",
    // });

    // async updateData(Id, model, field, value) {
    //     let route = `/web/dataset/call_kw/${model}/write`;
    //     try {
    //         await this.env.services.rpc({
    //             route: route,
    //             params: {
    //                 model: model,
    //                 method: "write",
    //                 args: [
    //                     [Id], // Array of IDs of the records to update
    //                     { field: value }, // Object mapping field names to new values
    //                 ],
    //                 kwargs: {},
    //                 context: this.context
    //             },
    //         });
    //     } catch (error) {
    //         console.error(`Error updating ${field}:`, error);
    //     }
    // }

    async updateData(Id, model, field_value) {
        try {
            await this.env.services.orm.write(model, [Id], field_value);
        } catch (error) {
            console.error(`Error updating ${field_value}:`, error);
        }
    }


    async saveData(recordId, data) {
        //get fields type from attrs and convert data to correct type
        let fields = this.model.metaData.fields;
        let toUpdate = {};  // object to update
        for (let key in data) {
            let field = this.model.metaData.fields_view.arch.attrs[key];
            toUpdate[field] = fields[field].type === 'datetime' ? serializeDateTime(data[key]) : data[key];
        }

        await this.updateData(recordId, this.model.metaData.resModel, toUpdate);
        await this.model.fetchLatestData();
        this._renderGantt();
    }

    async gantt_refresh_after_change(ev) {

        // console.log("Gantt Refresh", ev);
        // await this.model.fetchLatestData();
        // this._renderGantt();

        //console.log("Gantt Refresh", ev);
        try {
            await this.model.fetchLatestData();
            this._renderGantt();
            
            // If Resource Load enabled, load resource data
            if (this.showResourceLoad) {
                await this._loadResourceData();
            }
        } catch (error) {
            //console.error('Error:', error);
        } finally {
            // Set the flag back to false when the function has finished running
        }



    }

    updateItem(item, key, new_value) {

        let model = "project.task";
        let field = this.model.fields_view.arch.attrs[key];
        let Id = item.id;
        let value = serializeDateTime(new_value);

        this.updateData(Id, model, {[field]: value})
            .then(() => {
                //console.log('Update successful');
                return this.model.fetchLatestData();
            })
            .then(() => {
                //console.log('Reload successful');
                this._renderGantt();
            })
            .catch((error) => {
                console.error('Error:', error);
        });
    }

    switchScale(ev) {
        //console.log("switchScale", ev);
        // if (ev.detail.timeType !== this.timeType) {
        //     this.timeType = ev.detail.timeType;
        //     this._renderGantt();
        // }

        this.timeType = ev.detail.timeType;
        this._renderGantt();

    }



    ZoomHoursClick(div_hour, timeType) {

        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('month'); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('month'); //End month

        this.timeScaleUTC = this.lastDayDate.valueOf() - this.firstDayDate.valueOf(); // raznica vremeni
        this.firstDayScale = this.firstDayDate.valueOf();

        //Get Days Range
        let iter = Interval.fromDateTimes(this.firstDayDate, this.lastDayDate);
        let hour2Range = [];
        for (let date of iter.splitBy({ hours: div_hour })) {
            hour2Range.push(date.start.toJSDate());
        }
        //Group by days
        let daysGroup = hour2Range.reduce(function (acc, day) {
            let formattedDay = DateTime.fromJSDate(day).toFormat("yyyy MM dd");
            if (!acc[formattedDay]) {
                acc[formattedDay] = [];
            }
            acc[formattedDay].push(day);
            return acc;
        }, {});

        let duration = iter.toDuration('hours');
        let K_scale = duration.hours;
        K_scale = K_scale / div_hour;

        this.timeScale = 40; //px
        this.timeType = timeType;
        this.timeline_width = this.timeScale * K_scale;
        this.pxScaleUTC = Math.round(this.timeScaleUTC / this.timeline_width); // skolko vremeni v odnom px

        this.scales.time_scale = this.timeScale;
        this.scales.time_type = this.timeType;
        this.scales.first_scale = daysGroup;
        this.scales.second_scale =  daysGroup;
        this.scales.first_day = this.firstDayDate;
        this.scales.last_day = this.lastDayDate;
        this.scales.gutterOffset = this.gutterOffset
        this.scales.firstDayScale = this.firstDayScale;
        this.scales.pxScaleUTC = this.pxScaleUTC;
        this.scales.timeline_width = this.timeline_width;

        this.state.scales = this.scales;

    }

    ZoomQuarterClick() {

        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('quarter').minus({ quarter: 3 }); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('quarter').plus({ quarter: 3 }); //End month
        this.timeScaleUTC = this.lastDayDate.diff(this.firstDayDate, 'milliseconds').milliseconds; // difference in time
        this.firstDayScale = this.firstDayDate.toMillis(); // value of first day

        //Get Second Range
        let interval = Interval.fromDateTimes(this.firstDayDate, this.lastDayDate);
        let range_second = [];
            for (let date of interval.splitBy({ Quarter: 1 })) {
            range_second.push(date.start.toJSDate());
        }

        //Group by
        let quarterGroup = range_second.reduce(function (acc, quarter) {
            let formatted = DateTime.fromJSDate(quarter).toFormat("yyyy");
            if (!acc[formatted]) {
                acc[formatted] = [];
            }
            acc[formatted].push(quarter);
            return acc;
        }, {});


        this.timeScale = 80; //px
        this.timeType = 'quarter';

        this.timeline_width = this.timeScale * range_second.length; // min otrzok 60 - eto 4 4asa. v sutkah 6 otrezkov
        this.pxScaleUTC = Math.round(this.timeScaleUTC / this.timeline_width); // skolko vremeni v odnom px

        this.scales.time_scale = this.timeScale;
        this.scales.time_type = this.timeType;
        this.scales.first_scale = quarterGroup;
        this.scales.second_scale =  quarterGroup;
        this.scales.first_day = this.firstDayDate;
        this.scales.last_day = this.lastDayDate;
        this.scales.gutterOffset = this.gutterOffset
        this.scales.firstDayScale = this.firstDayScale;
        this.scales.pxScaleUTC = this.pxScaleUTC;
        this.scales.timeline_width = this.timeline_width;

        this.state.scales = this.scales;

    }
    ZoomWeeksClick() {

        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('week').minus({ weeks: 3 }); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('week').plus({ weeks: 3 }); //End month
        this.timeScaleUTC = this.lastDayDate.diff(this.firstDayDate, 'milliseconds').milliseconds; // difference in time
        this.firstDayScale = this.firstDayDate.toMillis(); // value of first day

        //Get Second Range
        let interval = Interval.fromDateTimes(this.firstDayDate, this.lastDayDate);
        let range_second = [];
        
        // Update week_type from localStorage
        this.week_type = this.local_storage.getItem("gantt_week_type") || "isoweek";
        //console.log('Generating weeks with week_type:', this.week_type);
        
        // Generate weeks based on the week type
        if (this.week_type === "isoweek") {
            // ISO weeks (start on Monday)
            for (let date of interval.splitBy({ Week: 1 })) {
                range_second.push(date.start.toJSDate());
            }
        } else {
            // Regular weeks (start on Sunday)
            for (let date of interval.splitBy({ weeks: 1 })) {
                // For regular weeks, start on Sunday
                let weekStart = date.start.startOf('week');
                range_second.push(weekStart.toJSDate());
            }
        }

        //Group by
        let weekGroup = range_second.reduce(function (acc, week) {
            let formatted = DateTime.fromJSDate(week).toFormat("yyyy");
            if (!acc[formatted]) {
                acc[formatted] = [];
            }
            acc[formatted].push(week);
            return acc;
        }, {});


        this.timeScale = 30; //px
        this.timeType = 'week_month';

        this.timeline_width = this.timeScale * range_second.length; // min otrzok 60 - eto 4 4asa. v sutkah 6 otrezkov
        this.pxScaleUTC = Math.round(this.timeScaleUTC / this.timeline_width); // skolko vremeni v odnom px

        this.scales.time_scale = this.timeScale;
        this.scales.time_type = this.timeType;
        this.scales.first_scale = weekGroup;
        this.scales.second_scale =  weekGroup;
        this.scales.first_day = this.firstDayDate;
        this.scales.last_day = this.lastDayDate;
        this.scales.gutterOffset = this.gutterOffset
        this.scales.firstDayScale = this.firstDayScale;
        this.scales.pxScaleUTC = this.pxScaleUTC;
        this.scales.timeline_width = this.timeline_width;

        this.state.scales = this.scales;

    }
    ZoomMonthClick() {

        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('month').minus({ months: 1 }); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('month').plus({ months: 1 }); //End month
        this.timeScaleUTC = this.lastDayDate.diff(this.firstDayDate, 'milliseconds').milliseconds; // difference in time
        this.firstDayScale = this.firstDayDate.toMillis(); // value of first day


        //Get Second Range
        let interval = Interval.fromDateTimes(this.firstDayDate, this.lastDayDate);
        let range_second = [];
            for (let date of interval.splitBy({ month: 1 })) {
            range_second.push(date.start.toJSDate());
        }

        // //Get First Range
        // let range_first = [];
        // for (let date of interval.splitBy({ year: 1 })) {
        //     let stringDate = DateTime.fromJSDate(date).toFormat("YYYY");
        //     range_first.push(stringDate);
        // }

        //Group by
        let monthGroup = range_second.reduce(function (acc, month) {
            let formatted = DateTime.fromJSDate(month).toFormat("yyyy");
            if (!acc[formatted]) {
                acc[formatted] = [];
            }
            acc[formatted].push(month);
            return acc;
        }, {});


        this.timeScale = 30; //px
        this.timeType = 'year_month';

        this.timeline_width = this.timeScale * range_second.length; // min otrzok 60 - eto 4 4asa. v sutkah 6 otrezkov
        this.pxScaleUTC = Math.round(this.timeScaleUTC / this.timeline_width); // skolko vremeni v odnom px

        this.scales.time_scale = this.timeScale;
        this.scales.time_type = this.timeType;
        this.scales.first_scale = monthGroup;
        this.scales.second_scale =  monthGroup;
        this.scales.first_day = this.firstDayDate;
        this.scales.last_day = this.lastDayDate;
        this.scales.gutterOffset = this.gutterOffset
        this.scales.firstDayScale = this.firstDayScale;
        this.scales.pxScaleUTC = this.pxScaleUTC;
        this.scales.timeline_width = this.timeline_width;

        this.state.scales = this.scales;

    }

    ZoomDaysClick() {

        this.firstDayDate = DateTime.fromMillis(this.GtimeStart).startOf('month'); //Start month
        this.lastDayDate = DateTime.fromMillis(this.GtimeStop).endOf('month'); //End month
        this.timeScaleUTC = this.lastDayDate.diff(this.firstDayDate, 'milliseconds').milliseconds; // difference in time
        this.firstDayScale = this.firstDayDate.toMillis(); // value of first day

        // let currentLocaleData = Intl.DateTimeFormat().resolvedOptions().locale;

        //Get Days Range
        let interval = Interval.fromDateTimes(this.firstDayDate, this.lastDayDate);
        let dayRange = [];
            for (let date of interval.splitBy({ days: 1 })) {
            dayRange.push(date.start.toJSDate());
        }

        //Get Year - Month range
        let monthRange = [];
        for (let date of interval.splitBy({ months: 1 })) {
            let month = {};
            month['year'] = date.start.year;
            month['month'] = date.start.monthLong;
            month['days'] = date.start.daysInMonth;
            monthRange.push(month);
        }

        this.timeScale = 24; //px
        this.timeType = 'month_day';
        this.timeline_width = this.timeScale * dayRange.length;
        this.pxScaleUTC = Math.round(this.timeScaleUTC / this.timeline_width); // skolko vremeni v odnom px

        this.scales.time_scale = this.timeScale;
        this.scales.time_type = this.timeType;
        this.scales.first_scale = monthRange;
        this.scales.second_scale =  dayRange;
        this.scales.first_day = this.firstDayDate;
        this.scales.last_day = this.lastDayDate;
        this.scales.gutterOffset = this.gutterOffset
        this.scales.firstDayScale = this.firstDayScale;
        this.scales.pxScaleUTC = this.pxScaleUTC;
        this.scales.timeline_width = this.timeline_width;

        this.state.scales = this.scales;

        //GanttTimeLineScroll - > scales
        // AddItemList();
                //GanttItemzTree -> options. item_list
        // AddItemsData();
                ////GanttListAction
                ////GanttListInfo
        // AddTimeLineHead();
                //GanttTimeLineHead -> options. scales
        // AddTimeLineData
                // GanttTimeLineData
                    // Bar, Deadline, Row




        // await this.renderer.AddTimeLineArrow(this.renderer.timeline_width);
        // await this.renderer.AddTimeLineGhost();
        //
        // await this.renderer.AddTimeLineSummary();
        // await this.renderer.AddTimeLineFirst();
        //
        // await this.renderer.DivResize();
        // await this.renderer.ModeActive();

        //this.ModificateAfterRender()

    }





    async onToggleResourceLoad(event, data) {
        // In useBus data comes as second parameter
        const showResourceLoad = data ? data.showResourceLoad : event.detail.showResourceLoad;
        
        // Update state based on Controller data
        this.showResourceLoad = showResourceLoad;
        
        // If panel turns on - load data
        if (this.showResourceLoad) {
            await this._loadResourceData();
        }
        
        // In OWL update state to trigger reactive re-render
        this.state.showResourceLoad = showResourceLoad;
    }

    async _loadResourceData() {
        // Load resource data for wave display
        // Always reload resource data on refresh (commented out the cache check)
        // if (this.state.resourceData && this.state.resourceData.length > 0) {
        //     return;
        // }
        
        // Load resource data directly from database
        const resourceData = await this._loadResourceDataFromDatabase();
        this.state.resourceData = resourceData;
    }

    async _loadResourceDataFromDatabase() {
        // Load resource data directly from database
        try {
            const resourceData = await this.model.orm.searchRead(
                'project.task.resource.link',
                [], // domain - all records
                ['resource_id', 'task_id', 'load_factor', 'date_start', 'date_end'],
                {
                    context: this.model.gantt.contexts,
                }
            );
            
            // Transform data to required format
            const formattedData = resourceData.map(link => {
                const task = this.state.item_list.find(item => 
                    !item.is_group && item.id === link.task_id[0]
                );
                
                if (task) {
                    // Check different possible date formats
                    const dateStart = task.date_start || task.dateStart || task.start_date;
                    const dateEnd = task.date_stop || task.dateStop || task.date_end || task.dateEnd || task.end_date;
                    
                    const taskName = task.value_name || task.__name || task.name || task.task_name || task.display_name || `Task ${task.id}`;
                    
                    // Simple logic: if one date missing - use another for both
                    let actualDateStart = dateStart;
                    let actualDateEnd = dateEnd;
                    let hasIssues = false;
                    let issueType = null;
                    
                    if (!dateStart && !dateEnd) {
                        // If no dates at all - use fallback
                        const now = new Date();
                        actualDateStart = now;
                        actualDateEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                        hasIssues = true;
                        issueType = 'no_dates';
                    } else if (!dateStart) {
                        // No start date - use end date
                        actualDateStart = dateEnd;
                        hasIssues = true;
                        issueType = 'no_start';
                    } else if (!dateEnd) {
                        // No end date - use start date
                        actualDateEnd = dateStart;
                        hasIssues = true;
                        issueType = 'no_end';
                    }
                    
                    // Proper handling of different date types (including Luxon DateTime)
                    let startDate, endDate;
                    
                    // Simple date conversion function
                    const convertToDate = (dateValue) => {
                        if (!dateValue) return null;
                        
                        // If already JavaScript Date
                        if (dateValue instanceof Date) {
                            return dateValue;
                        }
                        
                        // If this is Luxon DateTime object
                        if (typeof dateValue === 'object') {
                            // Try standard Luxon methods
                            if (typeof dateValue.toJSDate === 'function') {
                                try {
                                    const result = dateValue.toJSDate();
                                    if (!isNaN(result.getTime())) return result;
                                } catch (e) {}
                            }
                            if (typeof dateValue.toMillis === 'function') {
                                try {
                                    const millis = dateValue.toMillis();
                                    if (!isNaN(millis) && isFinite(millis)) {
                                        const result = new Date(millis);
                                        if (!isNaN(result.getTime())) return result;
                                    }
                                } catch (e) {}
                            }
                            // Property ts as fallback
                            if (dateValue.ts && typeof dateValue.ts === 'number') {
                                return new Date(dateValue.ts);
                            }
                        }
                        
                        // Standard conversion
                        const date = new Date(dateValue);
                        return isNaN(date.getTime()) ? null : date;
                    };
                    
                    try {
                        startDate = convertToDate(actualDateStart);
                        endDate = convertToDate(actualDateEnd);
                    } catch (error) {
                        console.warn(`Error processing dates for task ${task.id}:`, error, { dateStart, dateEnd });
                        return {
                            resource_id: link.resource_id,
                            task_id: [task.id, taskName],
                            data_from: null,
                            data_to: null,
                            data_aggr: null,
                            duration: 0,
                            load_factor: link.load_factor || 1.0,
                            has_issues: true,
                            issue_type: 'invalid_dates'
                        };
                    }
                    
                    // Check validity of resulting dates
                    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn(`Invalid dates for task ${task.id}:`, { 
                            originalDateStart: dateStart, 
                            originalDateEnd: dateEnd,
                            processedStartDate: startDate,
                            processedEndDate: endDate
                        });
                        
                        // Apply fallback strategy instead of returning with has_issues
                        const now = new Date();
                        const fallbackStart = new Date(now);
                        const fallbackEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
                        
                        console.info(`Using fallback dates for task ${task.id}: ${fallbackStart.toISOString()} - ${fallbackEnd.toISOString()}`);
                        
                        return {
                            resource_id: link.resource_id,
                            task_id: [task.id, taskName],
                            data_from: fallbackStart,
                            data_to: fallbackEnd,
                            data_aggr: null,
                            duration: 1, // 1 day
                            assigned_hours: link.assigned_hours || 0,
                            remaining_hours: link.remaining_hours || 0,
                            progress: link.progress || 0,
                            load_factor: link.load_factor || 1.0,
                            original_data_from: dateStart,
                            original_data_to: dateEnd,
                            has_issues: true,
                            issue_type: 'invalid_dates'
                        };
                    }
                    
                    // Check that end date is not before start date
                    if (endDate < startDate) {
                        console.warn(`End date before start date for task ${task.id}:`, { dateStart, dateEnd });
                        return {
                            resource_id: link.resource_id,
                            task_id: [task.id, taskName],
                            data_from: startDate,
                            data_to: startDate, // Use startDate for both dates
                            data_aggr: startDate.toISOString().split('T')[0],
                            duration: 0,
                            load_factor: link.load_factor || 1.0,
                            has_issues: true,
                            issue_type: 'end_before_start'
                        };
                    }
                    
                    return {
                        resource_id: link.resource_id,
                        task_id: [task.id, taskName],
                        data_from: startDate,
                        data_to: endDate,
                        data_aggr: typeof actualDateStart === 'string' ? actualDateStart.split('T')[0] : actualDateStart,
                        duration: Math.max((endDate - startDate) / 1000, 0),
                        assigned_hours: link.assigned_hours || 0,
                        remaining_hours: link.remaining_hours || 0,
                        progress: link.progress || 0,
                        load_factor: link.load_factor || 1.0,
                        original_data_from: dateStart,
                        original_data_to: dateEnd,
                        has_issues: hasIssues,
                        issue_type: issueType
                    };
                }
                return null;
            }).filter(Boolean);
            
            return formattedData;
            
        } catch (error) {
            console.error('Error loading resource data:', error);
            return [];
        }
    }


}







// NativeGanttRenderer.components = {TreeItem};
// NativeGanttRenderer.components = {};NativeGanttRenderer.components = {};
// NativeGanttRenderer.props = {
//     // countField: {
//     //     type: String,
//     //     optional: true,
//     // },
//     // onTreeItemClicked: {
//     //     type: Function,
//     //     optional: true,
//     // },
//     // onChangeItemTree: {
//     //     type: Function,
//     //     optional: true,
//     // },
//     // items: {
//     //     type: Array,
//     //     optional: true,
//     // },
// };
