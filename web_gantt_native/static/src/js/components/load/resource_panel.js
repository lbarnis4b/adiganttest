/** @odoo-module **/

import { Component, useRef, onMounted, onWillUnmount, onWillUpdateProps, useState } from "@odoo/owl";
import { GanttTimeLineHead } from "@web_gantt_native/js/components/header/timeline_head";
import { ResourcePanelHint } from "@web_gantt_native/js/components/hint/resource_panel_hint";

export class GanttResourcePanel extends Component {
    static template = "web_gantt_native.GanttResourcePanel";
    static components = { GanttTimeLineHead, ResourcePanelHint };
    static props = {
        tasks: Array,
        scales: Object,
        options: Object,
        gutterOffset: { type: [Number, String], optional: true },
        itemsOffset: { type: [Number, String], optional: true },
        resourceData: Array,
        parent: Object,
    };

    setup() {
        this.timelineRef = useRef("resource-timeline");
        this.resourceListRef = useRef("resource-list");
        
        // Use useState for reactivity
        this.state = useState({
            gutterOffset: parseInt(this.props.gutterOffset) || 400,
            itemsOffset: parseInt(this.props.itemsOffset) || 300,
        });
        


        const onGanttScroll = (ev) => {
            if (this.timelineRef.el) {
                this.timelineRef.el.scrollLeft = ev.detail.offset_left;
            }
        };



        onMounted(() => {
            try {
                if (this.env.bus) {
                    this.env.bus.addEventListener("ganttn-scroll", onGanttScroll);
                }
            } catch (error) {
                console.warn("Could not add event listeners:", error);
            }
        });

        onWillUnmount(() => {
            try {
                if (this.env.bus) {
                    this.env.bus.removeEventListener("ganttn-scroll", onGanttScroll);
                }
            } catch (error) {
                console.warn("Could not remove event listeners:", error);
            }
        });
        
                            // Handle props changes
                    onWillUpdateProps((nextProps) => {
                        // Update state
                        this.state.gutterOffset = parseInt(nextProps.gutterOffset) || 400;
                        this.state.itemsOffset = parseInt(nextProps.itemsOffset) || 300;
                    });
    }

    getResourceData() {
        return this.props.resourceData || [];
    }

    getSafeScales() {
        // Create a safe copy of scales for GanttTimeLineHead
        const scales = this.props.scales || {};
        
        const safeScales = {
            time_scale: scales.time_scale || 50,
            time_type: scales.time_type || 'month_day',
            first_scale: scales.first_scale || [],
            second_scale: scales.second_scale || [],
            first_day: scales.first_day,
            last_day: scales.last_day,
            format: scales.format || 'dd/MM/yyyy',
        };
        
        // Handle different second_scale structures
        if (scales.second_scale) {
            if (Array.isArray(scales.second_scale)) {
                safeScales.second_scale = scales.second_scale;
            } else if (typeof scales.second_scale === 'object') {
                // For object structure leave as is
                safeScales.second_scale = scales.second_scale;
            } else {
                safeScales.second_scale = [];
            }
        }
        
        return safeScales;
    }

    shouldShowTimelineHead() {
        // Show timeline head only if there is valid data
        const scales = this.props.scales || {};
        
        // Check different types of second_scale structures
        if (!scales.second_scale) {
            return false;
        }
        
        // For arrays (Days mode)
        if (Array.isArray(scales.second_scale)) {
            return scales.second_scale.length > 0;
        }
        
        // For objects (Hours, Weeks and other modes)
        if (typeof scales.second_scale === 'object') {
            const keys = Object.keys(scales.second_scale);
            return keys.length > 0;
        }
        
        return false;
    }

    getResourceGroups() {
        const resourceData = this.getResourceData();
        const groups = {};
        
        if (!resourceData || resourceData.length === 0) {
            return [];
        }
        
        resourceData.forEach(item => {
            const resourceId = item.resource_id[0];
            const resourceName = item.resource_id[1];
            
            if (!groups[resourceId]) {
                groups[resourceId] = {
                    id: resourceId,
                    name: resourceName,
                    tasks: []
                };
            }
            
            groups[resourceId].tasks.push(item);
        });
        
        return Object.values(groups);
    }

    hasResourceIssues(resource) {
        // Check if resource has tasks with issues
        return resource.tasks.some(task => task.has_issues);
    }

    getResourceIssueHint(resource) {
        const issues = [];
        
        resource.tasks.forEach(task => {
            if (task.has_issues) {
                switch (task.issue_type) {
                    case 'no_dates':
                        issues.push(`Task "${task.task_id[1]}" has no dates`);
                        break;
                    case 'no_start':
                        issues.push(`Task "${task.task_id[1]}" missing start date`);
                        break;
                    case 'no_end':
                        issues.push(`Task "${task.task_id[1]}" missing end date`);
                        break;
                    case 'invalid_dates':
                        issues.push(`Task "${task.task_id[1]}" has invalid dates`);
                        break;
                    case 'end_before_start':
                        issues.push(`Task "${task.task_id[1]}" end date before start`);
                        break;
                }
            }
        });
        
        return issues;
    }

    calculateTaskPosition(task) {
        // For problematic tasks show short line at the beginning of timeline
        if (task.has_issues) {
            return {
                left: 10, // Offset from edge
                width: 50 // Fixed width for problematic tasks
            };
        }
        
        // Check for dates availability
        if (!task.data_from || !task.data_to) {
            return {
                left: 10, // Offset from edge
                width: 50 // Fixed width for problematic tasks
            };
        }
        
        try {
            // Use the same logic as main Gantt
            const scales = this.props.parent.scales;
            
            if (!scales.firstDayScale || !scales.pxScaleUTC) {
                return { left: 10, width: 50 };
            }
            
            // Convert dates to milliseconds (as in main Gantt)
            let startTime, stopTime;
            
            // Function for safe conversion of any date type (synchronized with native_gantt_renderer.js)
            const convertToMillis = (dateValue) => {
                if (!dateValue) return null;
                
                // If already JavaScript Date
                if (dateValue instanceof Date) {
                    return dateValue.getTime();
                }
                
                // If this is Luxon DateTime object
                if (typeof dateValue === 'object') {
                    // Check various Luxon DateTime methods
                    if (typeof dateValue.toMillis === 'function') {
                        return dateValue.toMillis();
                    }
                    if (typeof dateValue.toJSDate === 'function') {
                        return dateValue.toJSDate().getTime();
                    }
                    if (typeof dateValue.valueOf === 'function') {
                        const val = dateValue.valueOf();
                        if (typeof val === 'number') return val;
                    }
                    // If object has ts property (timestamp)
                    if (dateValue.ts && typeof dateValue.ts === 'number') {
                        return dateValue.ts;
                    }
                }
                
                // Try standard Date creation
                const date = new Date(dateValue);
                return isNaN(date.getTime()) ? null : date.getTime();
            };
            
            // Handle different date formats
            startTime = convertToMillis(task.data_from);
            stopTime = convertToMillis(task.data_to);
            
            // Check time validity
            if (startTime === null || stopTime === null || isNaN(startTime) || isNaN(stopTime)) {
                return { left: 10, width: 50 };
            }
            
            // Use exact formula from timeline_data.js
            const startPxScale = Math.round((startTime - scales.firstDayScale) / scales.pxScaleUTC);
            const stopPxScale = Math.round((stopTime - scales.firstDayScale) / scales.pxScaleUTC);
            
            const bar_left = startPxScale;
            const bar_width = stopPxScale - startPxScale;
            
            return {
                left: Math.max(bar_left, 0),
                width: Math.max(bar_width, 10) // Minimum width 10px
            };
            
        } catch (error) {
            return { left: 10, width: 50 };
        }
    }

    onResourceHover(resource, ev) {
        const hintData = {
            'Resource': resource.name,
            'Total Tasks': resource.tasks.length,
            'Tasks with Issues': resource.tasks.filter(t => t.has_issues).length,
        };
        
        // Add issue details if any
        if (this.hasResourceIssues(resource)) {
            hintData['Issues'] = this.getResourceIssueHint(resource).join(', ');
        }
        
        // Calculate total hours if available
        const totalHours = resource.tasks.reduce((sum, task) => {
            return sum + (task.assigned_hours || 0);
        }, 0);
        
        if (totalHours > 0) {
            hintData['Total Hours'] = totalHours.toFixed(1) + ' h';
        }
        
        
        this.env.bus.trigger('resource-show-hint', {
            posX: ev.clientX,
            posY: ev.clientY,
            itemValue: hintData
        });
    }
    
    onResourceOut() {
        this.env.bus.trigger('resource-hide-hint');
    }
    
    onTaskHover(task, ev) {
        const hintData = {
            'Task': task.task_id[1] || `Task ${task.task_id[0]}`,
            'Resource': task.resource_id[1] || `Resource ${task.resource_id[0]}`
        };
        
        // Add dates if available
        if (task.data_from && !task.has_issues) {
            try {
                const startDate = new Date(task.data_from);
                hintData['Start Date'] = startDate.toLocaleDateString();
            } catch (e) {
                hintData['Start Date'] = task.data_from;
            }
        }
        
        if (task.data_to && !task.has_issues) {
            try {
                const endDate = new Date(task.data_to);
                hintData['End Date'] = endDate.toLocaleDateString();
            } catch (e) {
                hintData['End Date'] = task.data_to;
            }
        }
        
        // Add hours if available
        if (task.assigned_hours) {
            hintData['Assigned Hours'] = task.assigned_hours.toFixed(1) + ' h';
        }
        
        if (task.remaining_hours) {
            hintData['Remaining Hours'] = task.remaining_hours.toFixed(1) + ' h';
        }
        
        // Add progress if available
        if (task.progress !== undefined && task.progress !== null) {
            hintData['Progress'] = Math.round(task.progress) + '%';
        }
        
        // Add issue information if problematic
        if (task.has_issues) {
            let issueText = 'Unknown issue';
            switch (task.issue_type) {
                case 'no_dates':
                    issueText = 'No dates set - using fallback dates';
                    break;
                case 'no_start':
                    issueText = 'Missing start date';
                    break;
                case 'no_end':
                    issueText = 'Missing end date';
                    break;
                case 'invalid_dates':
                    issueText = 'Invalid dates - using fallback dates';
                    break;
                case 'end_before_start':
                    issueText = 'End date before start date - corrected';
                    break;
            }
            hintData['⚠️ Issue'] = issueText;
            
            // Show original dates if available
            if (task.original_data_from && task.original_data_to) {
                hintData['Original Dates'] = `${task.original_data_from} - ${task.original_data_to}`;
            }
        }
        
        
        this.env.bus.trigger('resource-show-hint', {
            posX: ev.clientX,
            posY: ev.clientY,
            itemValue: hintData
        });
    }
    
    onTaskOut() {
        this.env.bus.trigger('resource-hide-hint');
    }
    

}