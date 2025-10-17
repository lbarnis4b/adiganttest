
/** @odoo-module **/

import {Component, onMounted, useState, useExternalListener, xml, useRef, onWillUpdateProps, useEffect} from "@odoo/owl";

const { DateTime } = luxon;

export class GanttTimeLineHead extends Component {
    static template = "native_gantt.TimelineHead";
    
    static props = {
        scales: Object,
        options: Object,
        parent: Object,
        cssClass: { type: String, optional: true },
    };
    elRef = useRef("el");

    setup() {

        this.state = useState({
            time_scale: this.props.scales.time_scale,
            time_type: this.props.scales.time_type,
            first_scale: this.props.scales.first_scale,
            second_scale: this.props.scales.second_scale,
            first_day: this.props.scales.first_day,
            last_day: this.props.scales.last_day,
            format: this.props.scales.format,
        });

        this.TODAY = DateTime.local();

        onWillUpdateProps((nextProps) => {
            //console.log("Head onWillUpdateProps:", nextProps);

            // Object.keys(this.state).forEach(key => {
            //     if (Object.keys(nextProps.scales).includes(key)) {
            //         this.state[key] = nextProps.scales[key];
            //     }
            // });

            this.state.time_scale = nextProps.scales.time_scale
            this.state.time_type= nextProps.scales.time_type
            this.state.first_scale= nextProps.scales.first_scale
            this.state.second_scale= nextProps.scales.second_scale
            this.state.first_day= nextProps.scales.first_day
            this.state.last_day= nextProps.scales.last_day
            this.state.format= nextProps.scales.format



        });


    }

    get isWeekend() {
        // return (day) => day.weekday === 6 || day.weekday === 7;
        return (day) => {
            // convert to luxon
            day = DateTime.fromJSDate(day);
            const isWeekend = day.weekday === 6 || day.weekday === 7;
            // console.log(`Day: ${day}, Is weekend: ${isWeekend}`);
            return isWeekend;
        };
    }

    get isToday() {
        return (day) => {
            // convert to luxon
            day = DateTime.fromJSDate(day);
            const isSameDay = day.hasSame(this.TODAY, 'day');

            if (isSameDay) {
                this.props.parent.isTODAYline = true;
            }
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSameDay;
        };
    }

    get isMonth() {
        return (month) => {
            // convert to luxon
            month = DateTime.fromJSDate(month);
            const isSame = month.hasSame(this.TODAY, 'month');

            if (isSame) {
                this.props.parent.isTODAYline = true;
            }
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSame;
        };
    }

    get isWeek() {
        return (week) => {
            week = DateTime.fromJSDate(week);
            const isSame = week.hasSame(this.TODAY, 'week');
            if (isSame) {
                this.props.parent.isTODAYline = true;
            }
            return isSame;
        };
    }

    get isQuarter() {
        return (quarter) => {
            quarter = DateTime.fromJSDate(quarter);
            const isSame = quarter.hasSame(this.TODAY, 'quarter');
            if (isSame) {
                this.props.parent.isTODAYline = true;
            }
            return isSame;
        };
    }



    get dayHourTypes() {
        return ['day_1hour', 'day_2hour', 'day_4hour', 'day_8hour'];
    }

    get YearMontTypes() {
        return ['year_month'];
    }

    debugXML(val) {
        //console.log('XML:', val);
    }

    get toFormat() {
        return (day, format) => {
            // convert to luxon
            day = DateTime.fromJSDate(day);
            const isSame = day.toFormat(format);
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSame;
        };
    }
    get WeekMontTypes() {
        return ['week_month'];
    }
    get QuarterMontTypes() {
        return ['quarter'];
    }
///let dt2 = DateTime.fromFormat('March 15, 2022', 'MMMM dd, yyyy');
    get toUniqFormat() {
        return (date, format) => {
            date = DateTime.fromJSDate(date);
            const isUniq = date.toFormat(format);
            return isUniq;
        };
    }

}