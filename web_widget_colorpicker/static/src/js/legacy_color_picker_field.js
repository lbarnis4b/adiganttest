odoo.define('web_widget_colorpicker.legacy_color_picker_field', function (require) {
    "use strict";

    var AbstractField = require('web.AbstractField');
    var field_registry = require('web.field_registry');
    var core = require('web.core');

    var _t = core._t;

    var ColorPickerFieldLegacy = AbstractField.extend({
        supportedFieldTypes: ['char'],
        template: 'web_widget_colorpicker.LegacyFieldColorPicker',

        init: function () {
            this._super.apply(this, arguments);
        },

        willStart: function () {
            return Promise.all([
                this._super.apply(this, arguments),
                $.ajax({
                    url: '/web_widget_colorpicker/static/src/lib/bootstrap-colorpicker/js/bootstrap-colorpicker.min.js',
                    dataType: "script"
                })
            ]);
        },

        _render: function () {
            if (this.mode === 'readonly') {
                return;
            }

            if (!this.$input) {
                this.$input = this.$('input');
            }

            var self = this;
            if (!this.$el.find('.colorpicker-component').data('colorpicker')) {
                this.$el.find('.colorpicker-component').colorpicker({
                    format: 'rgba'
                }).on('changeColor', function(e) {
                    var val = e.color.toRGB();
                    var rgba = 'rgba(' + val.r + ',' + val.g + ',' + val.b + ',' + val.a + ')';
                    self._setValue(rgba);
                });
            }
        }
    });

    field_registry.add('colorpicker', ColorPickerFieldLegacy);

    return ColorPickerFieldLegacy;
});
