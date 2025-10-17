/** @odoo-module */

import {Component, useState} from "@odoo/owl";

export class TimeLinePopupHint extends Component {
    static template = "native_gantt.TimeLinePopupHint";
    static props = {};

    setup() {
        this.state = useState({
            itemValue: this.updateHint("This is a Hint"),
            left: 0,
            top: 0,
            isVisible: false,
        });
        this.margenTop = 2;
        // Listen for the 'show-hint' and 'hide-hint' events on the bus
        this.env.bus.addEventListener("show-hint", (ev) => this.showHint(ev));
        this.env.bus.addEventListener("hide-hint", () => this.hideHint());
    }

    calculateTop(posY, itemCount) {
    const timelineElement = document.querySelector('.task-gantt-timeline');
    const viewportHeight    = timelineElement ? timelineElement.offsetHeight : window.innerHeight;
    const margin = 10; // margin from the edge of the viewport
    const hintHeight = itemCount * 20; // assuming each item is 20px high

        if (posY + hintHeight + margin > viewportHeight) {
            return posY - hintHeight + margin;
        } else {
            return posY + this.margenTop + margin;
        }
    }


    showHint(ev) {
        this.state.isVisible = true;
        this.state.left = ev.detail.posX;
        // if ev.target. margin top add that value

        // this.state.top =  ev.detail.posY+this.margenTop;
        // if (ev.detail.margenTop) {
        //     this.state.top = this.state.top + ev.detail.margenTop;
        // }

    const itemCount = typeof ev.detail.itemValue === "object" ? Object.keys(ev.detail.itemValue).length : 1;
    this.state.top = this.calculateTop(ev.detail.posY, itemCount);

    if (ev.detail.margenTop) {
        this.state.top += ev.detail.margenTop;
    }


        this.state.itemValue = this.updateHint(ev.detail.itemValue);

    }

    updateHint(value) {
        // Check if value is an object
        if (typeof value === "object") {
            // Convert the object to an array of {key, value} objects
            value = Object.entries(value).map(([key, value]) => ({key, value}));
        } else {
            // If value is not an object, wrap it in an array as a {key, value} object
            value = [{key: "", value: value}];
        }
        return value;
    }

    hideHint() {
        this.state.isVisible = false;
    }


}

