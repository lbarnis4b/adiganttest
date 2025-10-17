
/** @odoo-module **/

import {Component, useState, useRef, onWillUnmount, onWillUpdateProps, useEffect} from "@odoo/owl";
import {useBus} from "@web/core/utils/hooks";
const { DateTime } = luxon;

export class GanttTimeLineHeader extends Component {
    static template = "native_gantt.TimelineHeader";
    
    static props = [
        "scales",
        "options",
    ];
    elRef = useRef("el");
    setup() {

        this.scales = this.props.scales;

        // Get Type Week from localStorage
        this.weekType = localStorage.getItem("gantt_week_type") || 'isoweek';
        //console.log('GanttTimeLineHeader: initial weekType from localStorage:', this.weekType);
        
        // Add event listener for gantt_refresh_after_change event
        this.env.bus.addEventListener('gantt_refresh_after_change', () => {
            // Update weekType from localStorage
            this.weekType = localStorage.getItem("gantt_week_type") || 'isoweek';
            this.state.weekType = this.weekType;
            //console.log('GanttTimeLineHeader: weekType updated from localStorage to', this.weekType);
        });

        this.state = useState({
            time_scale: this.props.scales.time_scale,
            time_type: this.props.scales.time_type,
            first_scale:this._scale(this.props.scales.first_scale),
            second_scale: this._scale(this.props.scales.second_scale),
            first_day: this.props.scales.first_day,
            last_day: this.props.scales.last_day,
            format: this.props.scales.format,
            offset_left: this.props.scales.offset_left,
            weekType: this.weekType,
        });

        this.TODAY = DateTime.local();
        
        // Use proper OWL useBus pattern for automatic cleanup
        useBus(this.env.bus, "ganttn-scroll", this.scrollUpdate.bind(this));

        onWillUnmount(() => {
            // useBus automatically cleans listeners - manual cleanup not needed
        });

        useEffect(() => {
            //console.log("Header: UseEffect: has been rendered");
            this.TODAY = DateTime.local();
        });

        onWillUpdateProps((nextProps) => {
            //console.log('onWillUpdateProps called with nextProps:', nextProps);
            //console.log('Current weekType:', this.weekType);
            //console.log('Next weekType from props:', nextProps.options?.parent?.week_type);
            
            this.scales = nextProps.scales;
            this.state.time_scale = nextProps.scales.time_scale;
            this.state.time_type = nextProps.scales.time_type;
            this.state.first_scale = this._scale(nextProps.scales.first_scale);
            this.state.second_scale = this._scale(nextProps.scales.second_scale);
            this.state.first_day = nextProps.scales.first_day;
            this.state.last_day = nextProps.scales.last_day;
            this.state.format = nextProps.scales.format;
            this.state.offset_left = nextProps.scales.offset_left;
            
            // Save current weekType from localStorage
            this.weekType = localStorage.getItem("gantt_week_type") || 'isoweek';
            this.state.weekType = this.weekType;
            //console.log('Preserved weekType from localStorage:', this.weekType);
        });


    }

    _scale(scale){

        if (['month_day'].includes(this.scales.time_type)) {
            scale.map((item, index) => {
                // Add a uniqueProperty to each item
                item.uniqueProperty = index;
                return item;
            });
            return scale;
        }
        else{
            return scale;
        }

        // if (['day_1hour', 'day_2hour', 'day_4hour', 'day_8hour'].includes(this.scales.time_type)) {
        //     return scale;
        // }
        // else{
        //     scale.map((item, index) => {
        //         item.uniqueProperty = index;
        //         return item;
        //     });
        //     return scale;
        // }


    }

    scrollUpdate(ev) {
        const element = this.elRef.el;
        if (element) {
            element.scrollLeft = ev.detail.offset_left;
        }
    }
    // debugFirstScale(val) {
    //     console.log('month.id:', val);
    // }
    //
    // debugXML(val) {
    //     console.log('XML:', val);
    // }

    onMouseOver(itemValue, ev) {
        this.env.bus.trigger('ganttn-pointer-move', { action: 'show-hint', itemValue: itemValue, ev: ev });
        // console.log('onMouseOver:', ev);
    }
    onMouseOut() {
        this.env.bus.trigger('hide-hint');
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
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSameDay;
        };
    }

    get isMonth() {
        return (month) => {
            // convert to luxon
            month = DateTime.fromJSDate(month);
            const isSame = month.hasSame(this.TODAY, 'month');
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSame;
        };
    }
    get toFormat() {
        return (day, format) => {
            // convert to luxon
            day = DateTime.fromJSDate(day);
            
            let result;
            if (format === 'WW' && this.state.weekType === 'week') {
                // For regular weeks, calculate the week number manually
                // Get the start of the year
                const startOfYear = day.startOf('year');
                // Get the start of the week (Sunday)
                const startOfWeek = day.startOf('week');
                // Calculate the difference in weeks
                const diffInWeeks = Math.floor(startOfWeek.diff(startOfYear, 'weeks').weeks) + 1;
                result = diffInWeeks.toString();
                //console.log(`Manual week calculation: day=${day.toISO()}, startOfYear=${startOfYear.toISO()}, startOfWeek=${startOfWeek.toISO()}, diffInWeeks=${diffInWeeks}`);
            } else {
                // For all other formats, use standard formatting
                result = day.toFormat(format);
            }
            
            //console.log(`toFormat called with format: ${format}, weekType: ${this.state.weekType}, result: ${result}`);
            return result;
        };
    }

    get dayHourTypes() {
        return ['day_1hour', 'day_2hour', 'day_4hour', 'day_8hour'];
    }

    get MonthDayTypes() {
        return ['month_day'];
    }

    get YearMontTypes() {
        return ['year_month'];
    }

    get QuarterMontTypes() {
        return ['quarter'];
    }


    get formattedDate() {
        return (date) => {
            // if (date instanceof Date && !isNaN(date)) {
            //     return DateTime.fromJSDate(date).toFormat("Do MMM dd - YY");
            // } else {
            //     console.error('Invalid date:', date);
            //     return 'Invalid DateTime';
            // }
            let n_date = DateTime.fromFormat(date, "yyyy MM dd")
            return n_date.toFormat("dd LLL ccc - yy");
        };
    }

    get formattedHour() {
        return (hour) => {
            // if (hour instanceof Date && !isNaN(hour)) {
            //     return DateTime.fromJSDate(hour).toFormat("HH:mm");
            // } else {
            //     console.error('Invalid hour:', hour);
            //     return 'Invalid DateTime';
            // }
            // let n_date = DateTime.fromFormat(hour, "yyyy MM dd")
            return DateTime.fromJSDate(hour).toFormat("HH:mm");
            //return hour;
        };
    }

    get hint() {
        return (day) => {
            day = DateTime.fromJSDate(day);
            const titles = day.toFormat(this.props.scales.format);
            return titles;
        };
    }
    get WeekMontTypes() {
        return ['week_month'];
    }
    get isWeek() {
        return (week) => {
            // convert to luxon
            week = DateTime.fromJSDate(week);
            const isSame = week.hasSame(this.TODAY, 'week');
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSame;
        };
    }

    get isQuarter() {
        return (quarter) => {
            // convert to luxon
            quarter = DateTime.fromJSDate(quarter);
            const isSame = quarter.hasSame(this.TODAY, 'quarter');
            // console.log(`Day: ${day}, Is today: ${isSameDay}`);
            return isSame;
        };
    }


    get toUniqFormat() {
        return (date, format) => {
            date = DateTime.fromJSDate(date);
            const isUniq = date.toFormat(format);
            return isUniq;
        };
    }



}
