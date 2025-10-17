/** @odoo-module */

import {_t} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";
import {NativeGanttArchParser} from "./native_gantt_arch_parser";
import {NativeGanttController} from "./native_gantt_controller";
import {NativeGanttModel} from "./native_gantt_model";
import {NativeGanttRenderer} from "./native_gantt_renderer";



export const GanttContainer = {
    type: 'ganttaps',
    display_name: _t('Native Gantt'),
    icon: 'fa fa-tasks',
    multiRecord: true,

    Controller: NativeGanttController,
    Renderer:   NativeGanttRenderer,
    Model:      NativeGanttModel,
    ArchParser: NativeGanttArchParser,


    // SearchModel: PivotSearchModel,
    // searchMenuTypes: ["filter", "groupBy", "comparison", "favorite"],


    props(genericProps, view) {
        const modelParams = {};
        if (genericProps.state) {
            modelParams.metaData = genericProps.state.metaData;
        } else {
            const { arch, fields, resModel } = genericProps;

            let _arch = {};
            let _attrs = {};
            
            if (typeof arch === 'string') {
                // Parse the XML string to extract attributes
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(arch, "text/xml");
                const rootElement = xmlDoc.documentElement;
                
                // Extract attributes from the parsed XML
                if (rootElement.attributes) {
                    for (let i = 0; i < rootElement.attributes.length; i++) {
                        const attr = rootElement.attributes[i];
                        _attrs[attr.name] = attr.value;
                    }
                }
            } else if (arch.attrs) {
                _attrs = { ...arch.attrs };
            } else if (arch.attributes) {
                for (let i = 0; i < arch.attributes.length; i++) {
                    const attr = arch.attributes[i];
                    _attrs[attr.name] = attr.value;
                }
            }
            _arch = {
                attrs: _attrs,
            }


            let fields_view = {
                arch : _arch,
            }

            let limit = parseInt(_arch.attrs.limit, 10) || genericProps.limit;


            modelParams.metaData = {
                arch,
                fields,
                resModel,
                fields_view,
                limit
            };
        }

        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            modelParams,
        };
    },

}

registry.category("views").add("ganttaps", GanttContainer);
