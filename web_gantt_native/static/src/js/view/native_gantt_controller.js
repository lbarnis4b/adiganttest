/** @odoo-module **/

import {Component, useState, onWillStart, onWillUpdateProps, onWillUnmount, useRef, useEffect, onMounted} from "@odoo/owl";
import {useBus, useService} from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";

import {Layout} from "@web/search/layout";
import { SearchBar } from "@web/search/search_bar/search_bar";
import { standardViewProps } from "@web/views/standard_view_props";
import { useSetupView } from "@web/views/view_hook";
import {useModel} from "@web/views/model";

const { DateTime } = luxon;
export class NativeGanttController extends Component {

     static components = {Layout, SearchBar};

     static props = {
         ...standardViewProps,
         Model: Function,
         Renderer: Function,
         modelParams: Object,
     };


     static template = "native_gantt.Controller";
     setup() {
         //console.log("NativeGanttController load");

         this.orm = useService("orm");
         this.rpc = useService("rpc");

         this.localStorage = browser.localStorage;
         this.showResourceLoad = parseInt(this.localStorage.getItem("gantt_resource_load")) || 0;

         this.model = useModel(this.props.Model, this.props.modelParams);
         // this.model = useModelWithSampleData(this.props.Model, this.props.modelParams);

         // second click on veiw -> getLocalState
         // In this case, the local state of the view is an object with a single property metaData,
         // which is the metadata of the model.
         // This state is saved when the NativeGanttController view is hidden and restored when the view is shown again.
         useSetupView({
            rootRef: useRef("root"),
            getLocalState: () => {
                return { metaData: this.model.metaData };
            },
         });


         useEffect(() => {
            //console.log("Constoller: UseEffect: has been rendered");
            this.env.bus.trigger('gantt_refresh_after_change');
            // (async () => {
            //
            // })();
         });

         // Send initial state to Renderer only on first mount
         onMounted(() => {
            this.env.bus.trigger('toggle-resource-load', { showResourceLoad: this.showResourceLoad });
            this.env.bus.trigger('resource-load-icon-update', { showResourceLoad: this.showResourceLoad });
         });

         // Add listener for toggle resource load event
         useBus(this.env.bus, 'user-toggle-resource-load', this.toggleResourceLoad.bind(this));

    }


    async handleClick(ev) {
        let targetClass = ev.target.className;
        //console.log("handleClick", targetClass);

        let targetClassList = ev.target.classList;
        if (targetClassList.contains('task-gantt-today')) {
            // console.log('The target element has the class task-gantt-today');
            await this.ClickToday();
        }


        //Scale
        if (targetClassList.contains('task-gantt-zoom-1h')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'day_1hour'});
        }

        if (targetClassList.contains('task-gantt-zoom-2h')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'day_2hour'});
        }

        if (targetClassList.contains('task-gantt-zoom-4h')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'day_4hour'});
        }

        if (targetClassList.contains('task-gantt-zoom-8h')) {
            // console.log('The target element has the class task-gantt');
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'day_8hour'});
        }


        if (targetClassList.contains('task-gantt-zoom-days')) {
            // console.log('The target element has the class task-gantt');
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'month_day'});
        }

        if (targetClassList.contains('task-gantt-zoom-month')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'year_month'});
        }

        if (targetClassList.contains('task-gantt-zoom-weeks')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'month_week'});
        }

        if (targetClassList.contains('task-gantt-zoom-quarter')) {
            await this.model.fetchLatestData();
            this.env.bus.trigger('switch-scale', { timeType: 'quarter'});
        }


    }
    async ClickToday() {

        //console.log("ClickToday");
        //await this.model.fetchLatestData();

        //need move vertical line to today
        let TODAY = DateTime.local();
        this.env.bus.trigger('animate-scroll', { dateTime: TODAY.toISO()});

    }


    get className() {
        if (this.env.isSmall) {
            const classList = (this.props.className || "").split(" ");
            classList.push("o_action_delegate_scroll");
            return classList.join(" ");
        }
        return this.props.className;
    }

    toggleResourceLoad() {
        // Toggle state
        this.showResourceLoad = !this.showResourceLoad;
        
        // Save to localStorage
        this.localStorage.setItem("gantt_resource_load", this.showResourceLoad ? "1" : "0");
        
        // Pass new state to Renderer  
        this.env.bus.trigger('toggle-resource-load', { showResourceLoad: this.showResourceLoad });
        
        // Notify UI components about icon state change
        this.env.bus.trigger('resource-load-icon-update', { showResourceLoad: this.showResourceLoad });
    }

}
