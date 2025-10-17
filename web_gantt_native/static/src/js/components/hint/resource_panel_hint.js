/** @odoo-module */

import { Component, useState } from "@odoo/owl";

export class ResourcePanelHint extends Component {
    static template = "web_gantt_native.ResourcePanelHint";
    static props = {};

    setup() {
        this.state = useState({
            itemValue: [],
            left: 0,
            top: 0,
            isVisible: false,
        });
        
        this.margenTop = 2;
        
        // Listen for resource-specific hint events
        this.env.bus.addEventListener("resource-show-hint", (ev) => this.showHint(ev));
        this.env.bus.addEventListener("resource-hide-hint", () => this.hideHint());
    }

    calculatePosition(ev) {
        // Since we use position: fixed, we work with viewport coordinates
        let left = ev.detail.posX;
        let top = ev.detail.posY;
        
        // Add small offset so hint doesn't cover cursor
        const offsetX = 10;
        const offsetY = 10;
        
        // Adjust for hint dimensions
        const hintWidth = 250;
        const hintHeight = this.calculateHintHeight(ev.detail.itemValue);
        
        // Keep hint within viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal adjustment - show to the left if too close to right edge
        if (left + hintWidth + offsetX > viewportWidth) {
            left = left - hintWidth - offsetX;
        } else {
            left = left + offsetX;
        }
        
        // Vertical adjustment - show above if too close to bottom
        if (top + hintHeight + offsetY > viewportHeight) {
            top = top - hintHeight - offsetY;
        } else {
            top = top + offsetY;
        }
        
        
        return { left, top };
    }

    calculateHintHeight(itemValue) {
        const itemCount = typeof itemValue === "object" ? Object.keys(itemValue).length : 1;
        return itemCount * 22 + 20; // 22px per item + padding
    }

    showHint(ev) {
        const position = this.calculatePosition(ev);
        
        this.state.isVisible = true;
        this.state.left = position.left;
        this.state.top = position.top;
        this.state.itemValue = this.formatHintData(ev.detail.itemValue);
    }

    formatHintData(value) {
        // Format resource/task data for display
        if (typeof value === "object" && !Array.isArray(value)) {
            // Convert object to array of key-value pairs
            return Object.entries(value).map(([key, val]) => {
                // Format keys for better readability
                const formattedKey = this.formatKey(key);
                const formattedValue = this.formatValue(key, val);
                return { key: formattedKey, value: formattedValue };
            });
        } else if (Array.isArray(value)) {
            return value;
        } else {
            // Single string value
            return [{ key: "", value: value }];
        }
    }

    formatKey(key) {
        // Convert snake_case to readable format
        const keyMap = {
            'task_id': 'Task',
            'resource_id': 'Resource', 
            'start_date': 'Start Date',
            'end_date': 'End Date',
            'duration': 'Duration',
            'progress': 'Progress',
            'state': 'Status',
            'assigned_hours': 'Assigned Hours',
            'remaining_hours': 'Remaining Hours',
            'has_issues': 'Has Issues'
        };
        return keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatValue(key, value) {
        // Format values based on type
        if (value === null || value === undefined) {
            return '-';
        }
        
        if (Array.isArray(value) && value.length === 2) {
            // Likely a many2one field [id, name]
            return value[1];
        }
        
        if (key.includes('date') && value) {
            // Format dates
            try {
                const date = new Date(value);
                return date.toLocaleDateString();
            } catch {
                return value;
            }
        }
        
        if (key === 'progress' && typeof value === 'number') {
            return `${Math.round(value)}%`;
        }
        
        if (key === 'has_issues' || key === 'is_critical') {
            return value ? '⚠️ Yes' : '✓ No';
        }
        
        if (typeof value === 'number' && (key.includes('hours') || key.includes('duration'))) {
            return `${value.toFixed(1)} h`;
        }
        
        return String(value);
    }

    hideHint() {
        this.state.isVisible = false;
    }
}