odoo.define('web_widget_time_delta.legacy_timedelta_field', function (require) {
    "use strict";

    var AbstractField = require('web.AbstractField');
    var field_registry = require('web.field_registry');
    var core = require('web.core');

    var _t = core._t;

    var TimeDeltaFieldLegacy = AbstractField.extend({
        supportedFieldTypes: ['integer', 'float'],
        template: 'web_widget_time_delta.LegacyFieldTimeDelta',

        init: function () {
            this._super.apply(this, arguments);
            this.mask_humanize = undefined;
            this.showDays = false;
            this.showSeconds = false;

            if (this.nodeOptions.mask_humanize_string) {
                this.mask_humanize = this.nodeOptions.mask_humanize_string;
            }

            if (this.nodeOptions.mask_humanize_field) {
                this.mask_humanize = this.recordData[this.nodeOptions.mask_humanize_field];
            }

            var mask_picker = "";

            if (this.nodeOptions.mask_picker_string) {
                mask_picker = this.nodeOptions.mask_picker_string;
            }

            if (this.nodeOptions.mask_picker_field) {
                mask_picker = this.recordData[this.nodeOptions.mask_picker_field];
            }

            if (mask_picker === "day_second") {
                this.showDays = true;
                this.showSeconds = true;
            } else if (mask_picker === "day") {
                this.showDays = true;
            } else if (mask_picker === "second") {
                this.showSeconds = true;
            }
        },

        willStart: function () {
            return Promise.all([
                this._super.apply(this, arguments),
                $.ajax({
                    url: '/web_widget_time_delta/static/src/lib/duration-picker/jquery-duration-picker.js',
                    dataType: "script"
                }),
                $.ajax({
                    url: '/web_widget_time_delta/static/src/lib/duration-humanize/humanize-duration.js',
                    dataType: "script"
                })
            ]);
        },

        _render: function () {
            var show_value = parseInt(this.value, 10);
            if (!this.$input) {
                this.$input = this.$('input');
            }
            this.$input.val(show_value);

            var self = this;
            if (!this.$input.data('durationPicker')) {
                this.$input.durationPicker({
                    translations: {
                        day: _t('day'),
                        hour: _t('hour'),
                        minute: _t('minute'),
                        second: _t('second'),
                        days: _t('days'),
                        hours: _t('hours'),
                        minutes: _t('minutes'),
                        seconds: _t('seconds')
                    },
                    showSeconds: self.showSeconds,
                    showDays: self.showDays,
                    onChanged: function (newVal) {
                        self.$input.val(newVal);
                        self._setValue(newVal.toString());
                    }
                });
            }
        },

        _formatValue: function (value) {
            if (this.mode === 'readonly') {
                if (this.mask_humanize) {
                    return humanizeDuration(value * 1000, { units: this.mask_humanize.split(","), round: true });
                } else {
                    return humanizeDuration(value * 1000);
                }
            }
            return value;
        },
    });

    field_registry.add('time_delta', TimeDeltaFieldLegacy);
    field_registry.add('time_delta_list', TimeDeltaFieldLegacy);

    return TimeDeltaFieldLegacy;
});
