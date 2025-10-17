/** @odoo-module */

/**
 *
 *
 * @typedef {Object} ArchInfo
 * @property {string} arch
 * @property {string} countField
 */

// import {XMLParser} from "@web/core/utils/xml";
import {parseXML, visitXML} from "@web/core/utils/xml";

export class NativeGanttArchParser{


    parse(xmlDoc, models, modelName) {
        const fields = models[modelName];
        const className = xmlDoc.getAttribute("class") || null;
        const countField = xmlDoc.getAttribute("limit_view");
        /** @type { ArchInfo} */
        return {
            xmlDoc,
            countField,
        };
        // const archInfo = {
        //     title: null,
        //     layout: null,
        //     colNumber: 0,
        //     isEmpty: true,
        //     columns: [{ actions: [] }, { actions: [] }, { actions: [] }],
        //     customViewId,
        // };
        //
        //
        // // visitXML(arch, (node) => {
        // //     switch ()
        // //
        // // });
        // return archInfo;
    }

    // parse(arch, fields) {
    //     const xmlDoc = this.parseXML(arch);
    //     const countField = xmlDoc.getAttribute("count_field");
    //     /** @type { ArchInfo} */
    //     return {
    //         arch,
    //         fields,
    //         countField,
    //     };
    //}
}
