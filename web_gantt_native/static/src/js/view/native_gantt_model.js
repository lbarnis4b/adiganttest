/** @odoo-module **/
import { Model } from "@web/views/model";
import { registry } from "@web/core/registry";

const modelRegistry = registry.category("models");

import {getFieldsGantt, groupRowsGantt, flatRowsGantt} from "@web_gantt_native/js/tool/gantt_tool_field";
import {deserializeDateTime} from "@web/core/l10n/dates";
const auto_str_to_date = deserializeDateTime;


const { DateTime } = luxon;
export class NativeGanttModel extends Model {
    static services = ["orm"];

    // previousSearchParams = null;
    setup(params) {
        //console.log("NativeGanttModel setup");
        this.data = {};
        this.metaData = params.metaData;
        this.searchParams = null;
        this.number = {
            type: 0,
            optional: true,
        };

    }

    async fetchLatestData() {
        //console.log("NativeGanttModel selfLoad");
        this.number.type += 1;

        return this.load(this.searchParams);
    }

    async load(searchParams) {
        //console.log("NativeGanttModel load");

        // // If searchParams is not provided, use the previous searchParams
        // if (!searchParams && this.previousSearchParams) {
        //     searchParams = this.previousSearchParams;
        // }
        //
        // // Store the current searchParams for future use
        // this.previousSearchParams = searchParams;

        this.searchParams = searchParams;
        const TestmetaData = "test";

        this.modelName = this.metaData.resModel;
        this.fields_view = this.metaData.fields_view;

        // this.modelName = params.modelName;

        let groupedBy = [...searchParams.groupBy];

        const params = {
            groupedBy: groupedBy,
            pagerOffset: 0,
        };

        this.gantt = {
            modelName: this.metaData.resModel,
            group_bys: this.searchParams.groupBy,
            orderedBy: this.searchParams.orderBy,
            domains: this.searchParams.domain,
            contexts: this.searchParams.context,
            fields: this.metaData.fields,
            arch: this.metaData.arch,
        }

        this.data = {
            modelName: this.metaData.resModel,
            group_bys: this.searchParams.groupBy,
            orderedBy: this.searchParams.orderBy,
            domains: this.searchParams.domain,
            contexts: this.searchParams.context,
            fields: this.metaData.fields,
            arch: this.metaData.arch,
        }

        return this._do_load();

    }


    async _do_load() {

        var domains = this.gantt.domains;
        var contexts = this.gantt.contexts;
        var group_bys = this.gantt.group_bys;

        var self = this;
        self.fields_view = this.metaData.fields_view

        self.main_group_id_name = self.fields_view.arch.attrs.main_group_id_name;
        self.action_menu = self.fields_view.arch.attrs.action_menu;

        // if not set group by, set default group by for ItemSorted and TreeView
        if (this.fields_view.arch.attrs.default_group_by) {
            n_group_bys = this.fields_view.arch.attrs.default_group_by.split(',');
            if (group_bys.length === 0) {
                self.TreeView = true;
                self.ItemsSorted = true;
                group_bys[0] = this.fields_view.arch.attrs.default_group_by;

            }
        }

        // Sort allow only if Group by project and domain search by project.
        // Project get from XML = main_group_id_name = "project_id"

        self.ItemsSorted = false;
        if (group_bys.length === 1) {

            if (group_bys[0] === self.main_group_id_name) {
                self.ItemsSorted = true;
            }
            // if group by display_main_group_id_name
            if (domains.length > 0) {
                let domain_name = "display_" + self.main_group_id_name;
                if (domains[0][0] === domain_name) {
                    domains[0][0] = self.main_group_id_name;
                }

                if (domains[0][0] !== self.main_group_id_name) {
                    self.ItemsSorted = false;
                }
            }

            if (domains.length > 1) {
                self.ItemsSorted = false;
            }


            // if group by display_main_group_id_name and display_in_project - remove display_in_project
            // For show all task in project/model
            if (domains.length === 3 && group_bys.length === 1 && group_bys[0] === self.main_group_id_name) {
                if (domains[1][0] === self.main_group_id_name && domains[2][0] === "display_in_project") {
                    self.ItemsSorted = true;
                    this.gantt.domains = this.gantt.domains.filter(domain => domain[0] !== "display_in_project" && domain !== "&");
                }
            }

        }

        if (self.fields_view.arch.attrs.no_group_sort_mode) {
            self.ItemsSorted = false;
        }

        // Tree View only if group by main_group_id_name
        self.TreeView = false;

        if (group_bys.length === 1) {

            if (group_bys[0] === self.main_group_id_name || group_bys[-1] === self.main_group_id_name) {
                self.TreeView = true;
            }
        }

        if (group_bys.length > 1) {

            if (group_bys[group_bys.length - 1] === self.main_group_id_name) {
                self.TreeView = true;
            }
        }


        var n_group_bys = [];

        if (group_bys.length) {
            n_group_bys = group_bys;
        }

        var getFields = getFieldsGantt(self, n_group_bys);
        self.model_fields = getFields["model_fields"];
        self.model_fields_dict = getFields["model_fields_dict"];

        var fields = self.model_fields;
        // fields.push('display_name');

        // this.fields_view.arch.attrs.default_group_by
        var export_wizard = false;

        if (self.fields_view.arch.attrs.hasOwnProperty('export_wizard')) {
            export_wizard = self.fields_view.arch.attrs.export_wizard
        }


        // //Pager
        // var limit_view = 0;
        // if (self.fields_view.arch.attrs.hasOwnProperty('limit_view')){
        //     limit_view = parseInt(self.fields_view.arch.attrs.limit_view)
        // }
        //
        // if(self.gantt.pager.limit){
        //     limit_view = self.gantt.pager.limit
        // }


        //Load Level
        var load_group_id_name = self.fields_view.arch.attrs.load_group_id_name;
        self.LoadMode = false;
        if (group_bys.length === 1) {

            if (group_bys[0] === load_group_id_name || group_bys[-1] === load_group_id_name) {
                self.LoadMode = true;
            }
        }

        if (group_bys.length > 1) {

            if (group_bys[group_bys.length - 1] === load_group_id_name) {
                self.LoadMode = true;
            }
        }

        //console.log("mTree_view model: ", this.TreeView);
        //console.log("mTree_view model ItemsSorted: ", this.ItemsSorted);


        self.gantt.data = {
            ItemsSorted: self.ItemsSorted,
            ExportWizard: export_wizard,
            TreeView: self.TreeView,
            Main_Group_Id_Name: self.main_group_id_name,
            Action_Menu: self.action_menu,
            model_fields: fields,
            model_fields_dict: self.model_fields_dict,
            model_fields_view: self.fields_view,
            model_fileds_type: self.metaData.fields,
            LoadMode: self.LoadMode,

        };

        let step_last = 0;
        // TODO: need get limit from own gantt pager
        let data = await this.orm.searchRead(
            this.modelName,
            this.gantt.domains,
            self.gantt.data.model_fields_dict,
            {
                context: this.gantt.contexts,
                // limit: this.state.limit,
                order: this.gantt.orderedBy,
            }
        );
        // this.gantt.pager.limit = this.state.limit;


                //        res_model = await this.__parentedParent._rpc({
                //     model: 'gantt.native.tool',
                //     method: 'open_model',
                //     args: [name_model, name_field],
                //     context: self.__parentedParent.state.contexts
                // })

        //look in data properties and amke regular field
        data.forEach(item => {
            for (let field in item) {
                if (field.endsWith("_properties")) {
                    let properties = item[field];
                    if (properties && Array.isArray(properties)) {
                        properties.forEach(prop => {

                            let value = prop.value;
                            if (prop.type === 'many2many' && prop.value) {
                                value = prop.value[0]
                            }

                            item[field+'.'+prop.name] = value;
                        });
                    }
                    delete item[field];
                }
            }
        });


        // let match = field.match(/^(\w+)_properties\.(.+)$/);
        //
        //     if (match) {
        //         let [_, field, property] = match;
        //         let n_field = field+"_properties"
        //         data.forEach(item => {
        //             if (Array.isArray(item[n_field])) {
        //                 item[n_field] = item[n_field].map(prop => {
        //                     if (prop.value === null) {
        //                         let user = result.find(r => r.id === prop.name);
        //                         if (user) {
        //                             prop.value = user[property];
        //                         }
        //                     }
        //                     return prop;
        //                 });
        //             }
        //         });
        //     }

        for (let field of n_group_bys) {
            if (self.metaData.fields[field].type === 'many2many') {
                let fieldModel = self.metaData.fields[field].relation;

                //if has relatedPropertyField return
                if (('relatedPropertyField' in self.metaData.fields[field])) {
                    continue;
                }


                let fieldName = "name";

                let result = await this.orm.searchRead(
                    fieldModel,
                    [],
                    [fieldName],
                    {
                        context: this.gantt.contexts,
                    }
                );


                // Process the result as needed - regular field - we can group only by first element
                // need test that
                data.forEach(item => {
                    if (Array.isArray(item[field])) {
                        item[field] = item[field].map(Id => {
                            let value = result.find(r => r.id === Id);
                            return value ? [Id, value.name] : Id;
                        }).flat();

                    }
                });
            }
        }


        return this.on_data_loaded_count(data, n_group_bys);


    }


    // searchCount(model, domain, kwargs = {}) {
    //     validateArray("domain", domain);
    //     return this.call(model, "search_count", [domain], kwargs);
    // }
    async on_data_loaded_count(tasks, group_bys) {

        const result = await this.orm.searchCount(
            this.modelName,
            this.gantt.domains,
            {context: this.gantt.contexts,
            }
        );

        // self.gantt.pager.records = result;
        // if (self.gantt.pager.records > self.gantt.pager.limit){
        //     self.gantt.data.ItemsSorted = false
        // }
        return this.on_data_loaded_info(tasks, group_bys);

    }

    async on_data_loaded_info(tasks, group_bys) {
        var self = this;
        let ids = tasks.map(task => task.id);
        var info_model = self.fields_view.arch.attrs.info_model;
        var info_task_id = "task_id";

        if (info_model) {

            let result = await this.orm.searchRead(
                info_model,
                [[info_task_id, 'in', [...new Set(ids)]]],
                Array.from(new Set([info_task_id,"start", "end", "left_up","left_down","right_up","right_down","show"])),
                {
                    context: this.gantt.contexts,
                });

            //if result
            if (result) {
                result = result.map(info => {
                    if (info.task_id) {
                        info.task_id = info.task_id[0];
                    }
                    return info;
                });
                self.gantt.data.task_info = result;
            }


        }
        return this.on_data_loaded_predecessor(tasks, group_bys);
    }


    async on_data_loaded_predecessor(tasks, group_bys) {
        var self = this;
        let ids = tasks.map(task => task.id);

        var predecessor_model = self.fields_view.arch.attrs.predecessor_model;
        var predecessor_task_id = self.fields_view.arch.attrs.predecessor_task_id;
        var predecessor_parent_task_id = self.fields_view.arch.attrs.predecessor_parent_task_id;
        var predecessor_type = self.fields_view.arch.attrs.predecessor_type;

        if (predecessor_model) {
           let result = await this.orm.searchRead(
                predecessor_model,
                [[predecessor_task_id, 'in', [...new Set(ids)]]],
                Array.from(new Set([predecessor_task_id, predecessor_parent_task_id, predecessor_type])),
                {
                    context: this.gantt.contexts,
                });
           self.gantt.data.predecessor = result;

        }
        return this.on_data_loaded_ghost(tasks, group_bys);
    }


    async on_data_loaded_ghost(tasks, group_bys) {
        let self = this;
        let gantt_attrs = self.fields_view.arch.attrs;
        const ghost_date_field = [];
        let ghost_model = gantt_attrs["ghost_model"];

        if (ghost_model) {
            let ids = tasks.map(task => task.id);

            const ghost_id = gantt_attrs["ghost_id"];
            ghost_date_field.push(ghost_id);

            const ghost_name = gantt_attrs["ghost_name"];
            ghost_date_field.push(ghost_name);

            const ghost_date_start = gantt_attrs["ghost_date_start"];
            if (ghost_date_start){
                ghost_date_field.push(ghost_date_start) ;
            }

            const ghost_date_end = gantt_attrs["ghost_date_end"];
            if (ghost_date_end){
                ghost_date_field.push(ghost_date_end) ;
            }

            const ghost_durations = gantt_attrs["ghost_durations"];
            ghost_date_field.push(ghost_durations);

            self.gantt.data.Ghost = [];
            self.gantt.data.Ghost_Data = [];

            var s_model =  ghost_model;
            var s_field =  ghost_date_field;

             let result = await this.orm.searchRead(
                s_model,
                [[ghost_id, 'in', [...new Set(ids)]]],
                Array.from(new Set(s_field)),
                {
                    context: this.gantt.contexts,
                });

             self.gantt.data.Ghost = result;
            const uniqueEntries = new Set();

             self.gantt.data.Ghost_Data = result.map(result => {
                const data_row_id = result[ghost_id][0];
                const name = result[ghost_name];
                const durations = result[ghost_durations];

                const date_start = auto_str_to_date(result[ghost_date_start]);
                if (!date_start) {
                    return null;
                }

                const uniqueKey = `${data_row_id}-${name}-${result[ghost_date_start]}-${durations}`;
                if (uniqueEntries.has(uniqueKey)) {
                    return null;
                }
                uniqueEntries.add(uniqueKey);


                let date_end = auto_str_to_date(result[ghost_date_end]);

                if (!date_end.isValid) {
                    if (durations) {
                        date_end = date_start.plus({ minutes: durations * 60 });
                    } else {
                        return null;
                    }
                }

                return {
                    data_row_id: data_row_id,
                    name: result[ghost_name],
                    date_start: date_start,
                    date_end: date_end,
                    durations: durations
                };
             }).filter(result => result !== null);


        // let GtimeStart = self.gantt.data.Ghost_Data.reduce((min, ghost) => {
        //     return ghost.date_start < min.date_start ? ghost : min;
        //     }, self.gantt.data.Ghost_Data[0]);
        //
        // let GtimeStop = self.gantt.data.Ghost_Data.reduce((max, ghost) => {
        //     return ghost.date_end > max.date_end ? ghost : max;
        //     }, self.gantt.data.Ghost_Data[0]);
        //
        //
        // if (this.gantt.data.GtimeStart === undefined || this.gantt.data.GtimeStart > GtimeStart) {
        //     this.gantt.data.GtimeStart = GtimeStart["date_start"].toSeconds();
        // }
        //
        // if (this.gantt.data.GtimeStop === undefined || this.gantt.data.GtimeStop < GtimeStop) {
        //     this.gantt.data.GtimeStop = GtimeStop["date_end"].toSeconds();
        // }



        }
        return this.on_data_loaded_barfirst(tasks, group_bys);
    }

    async on_data_loaded_barfirst(tasks, group_bys) {
        var self = this;
        if (self.ItemsSorted) {
            // var barfirst_field = "project_id";
            var barfirst_field_ids = tasks.map(task => task.project_id);
            var ids = barfirst_field_ids.map(item => item[0]);
            var barfirst_model = "project.project";
            var barfirst_name = "name";
            var barfirst_date_start = "date_start";
            var barfirst_date_end = "date_end";

            let result = await this.orm.searchRead(
                barfirst_model,
                [['id', 'in', [...new Set(ids)]]],
                Array.from(new Set([barfirst_name, barfirst_date_start, barfirst_date_end])),
                {
                    context: this.gantt.contexts,
                });
            self.gantt.data.BarFirst = result;
            // self.gantt.data.BarFirst_Data = GanttTimeLineFirst.get_data_barfirst(self);
        }
        return this.on_data_loaded_name_get(tasks, group_bys);
    }

    async on_data_loaded_name_get(tasks, group_bys) {
//         var self = this;
//         var ids = tasks.map(task => task.id);
//         // let names = await this.orm.nameGet(
//         //     this.modelName,
//         //     ids,
//         //     {
//         //         context: this.gantt.contexts,
//         //     });
//
// // tasks.map is used to create a new array by applying a function to every element in the original tasks array.
// // The arrow function task => {...} is passed to map. This function is applied to each task in the tasks array.
// // Inside the function, names.find is used to find the first name in the names array where name[0] === task.id.
// // The return statement creates a new object that combines the __name property and all properties of the current task.
// // The spread operator (...) is used to include all properties of task in the new object.
//         let ntasks = tasks.map(task => {
//             let name = names.find(name => name[0] === task.id);
//                 return { __name: name[1], ...task };
//         });


        // add __name property to each task
        let ntasks = tasks.map(task => {
            return { __name: task.display_name, ...task };
        });
        this.gantt.data.ntasks = ntasks;
        this.gantt.data.group_bys = group_bys;


        return this.get_second_sort_data(ntasks, group_bys);
    }


    async get_second_sort_data(tasks, group_bys) {
        var self = this;
        self.gantt.data["second_sort"] = undefined;
        var gantt_attrs = self.fields_view.arch.attrs;
        var link_field = gantt_attrs["second_seq_link_field"];

         if (group_bys.length === 1 && group_bys[0] === link_field) {
             let ids = [];
             tasks.map(result => {
                if (result[link_field]) {
                    ids.push(result[link_field][0]);
                }
             });

             var s_model =  gantt_attrs["second_seq_model"];
             var s_field =  gantt_attrs["second_seq_field"];

             let result = await this.orm.searchRead(
                s_model,
                [['id', 'in', [...new Set(ids)]]],
                Array.from(new Set(['id', s_field])),
                {
                    context: this.gantt.contexts,
                });

             self.gantt.data["second_sort"] = result;
             return this.get_minmax_step(tasks, group_bys);
         }
        else{
            return this.get_main_group_data(tasks, group_bys);
         }
    }

    async get_main_group_data(tasks, group_bys) {
        var self = this;
        self.gantt.data["main_group"] = undefined;
        var gantt_attrs = self.fields_view.arch.attrs;

        var main_id = gantt_attrs["main_group_id_name"];
        var s_model =  gantt_attrs["main_group_model"];
        var s_field = ["id", "name","fold"];

        if (group_bys.length === 1 && group_bys[0] === main_id && s_model) {

            let ids = [];
            tasks.forEach(result => {
                if (result[main_id]) {
                    ids.push(result[main_id][0]);
                }
            });

            let result = await this.orm.searchRead(
                s_model,
                [['id', 'in', [...new Set(ids)]]],
                s_field,
                {
                    context: this.gantt.contexts,
                });

            self.gantt.data["main_group"] = result;
        }

       return this.get_minmax_step(tasks, group_bys);


    }

    get_minmax_step(tasks, group_bys) {
        // let self = this;

        let parent = {};

        parent.fields = this.gantt.fields;

        parent.model_fields_dict = this.gantt.data.model_fields_dict;
        parent.gantt_attrs = this.gantt.data.model_fields_view.arch.attrs;
        parent.second_sort = this.gantt.data.second_sort;
        parent.main_group = this.gantt.data.main_group;

        // groupRowsGantt, flatRowsGantt
        let groupRows = groupRowsGantt(tasks, group_bys, parent, this.ItemsSorted);
        this.gantt.data.rows_to_gantt =  flatRowsGantt(groupRows["projects"], this.ItemsSorted);

        //Get Max Min date for data
        let GtimeStartA = groupRows["timestart"];
        let GtimeStopA = groupRows["timestop"];

        let GtimeStart = Math.min.apply(null, GtimeStartA);
        let GtimeStop = Math.max.apply(null, GtimeStopA);

        if (this.gantt.data.GtimeStart === undefined || this.gantt.data.GtimeStart > GtimeStart) {
            this.gantt.data.GtimeStart = GtimeStart;
        }

        if (this.gantt.data.GtimeStop === undefined || this.gantt.data.GtimeStop < GtimeStop) {
            this.gantt.data.GtimeStop = GtimeStop;
        }

        // this.gantt.data.GtimeStart = Math.min.apply(null, GtimeStartA); //// MAX date in date range
        // this.gantt.data.GtimeStop = Math.max.apply(null, GtimeStopA);   //// Min date in date range

        //clean data
        GtimeStopA = [];
        GtimeStartA = [];

        return this.get_res_task_load(tasks, group_bys);

    }

    async get_res_task_load(tasks, group_bys) {
        // var self = this;

        var gantt_attrs = this.fields_view.arch.attrs;

        var load_model = gantt_attrs["load_bar_model"];
        var load_id = gantt_attrs["load_id"];
        var load_id_from = gantt_attrs["load_id_from"];
        var load_ids_from = gantt_attrs["load_ids_from"];


        let ids = false;
        if (load_ids_from === "id") {
            ids = tasks.map(task => task.id);
        } else if (load_ids_from !== "" && load_ids_from !== undefined) {
            let gp_load = tasks.map(group_value => {
                if (group_value[load_ids_from] !== false && group_value[load_ids_from] !== undefined && group_value[load_ids_from].length > 0) {
                    return group_value[load_ids_from][0];
                }
            });

            ids = gp_load.filter(id => id !== undefined);
        }

        if (ids){
            var _fields = [load_id, load_id_from, 'data_from', 'data_to', 'data_aggr', 'duration'];
            var _domain = [[load_id_from, 'in', [...new Set(ids)]]];

            let result = await this.orm.searchRead(
                load_model,
                _domain,
                _fields,
                {
                    context: this.gantt.contexts,
                });

            //result = [{
            //     load_id: 136,
            //     load_id_from: [
            //         76,
            //         "Blue Car 好吧"
            //     ],
            //     "data_from": "2024-04-10 05:00:00",
            //     "data_to": "2024-04-10 09:00:00",
            //     "data_aggr": "2024-04-10",
            //     "duration": 14400
            // }]

            // Agregate result  by task id


            //this.gantt.data["Task_Load_Data"] = result;

            // Aggregate result by task_id
            let aggregatedResult = new Map();

            result.forEach(item => {
                let fieldValue = item[load_id_from][0]; // Use the value of load_id_from dynamically
                if (!aggregatedResult.has(fieldValue)) {
                    aggregatedResult.set(fieldValue, {
                        id: item[load_id_from],
                        data: []
                    });
                }
                aggregatedResult.get(fieldValue).data.push({
                    id: item[load_id],
                    data_from: item.data_from,
                    data_to: item.data_to,
                    data_aggr: item.data_aggr,
                    duration: item.duration
                });
            });

            // Convert the Map back to an array
            this.gantt.data["Task_Load_Data"] = Array.from(aggregatedResult.values());


            return this.get_res_load(tasks, group_bys);

       }
       else{
            return true
       }


    }

    async get_res_load(tasks, group_bys) {

        if (this.LoadMode) {

            let gantt_attrs = this.fields_view.arch.attrs;
            let load_model = gantt_attrs["load_bar_model"];
            let _ctx = this.gantt.contexts;

            // var m_GtimeStart = moment(this.gantt.data["GtimeStart"]).format("YYYY-MM-DD");
            let m_GtimeStart = DateTime.fromMillis(this.gantt.data["GtimeStart"]).toFormat("yyyy-MM-dd");
            // var m_GtimeStop = moment(this.gantt.data["GtimeStop"]).format("YYYY-MM-DD");
            let m_GtimeStop = DateTime.fromMillis(this.gantt.data["GtimeStop"]).toFormat("yyyy-MM-dd");

            // var data_load_group = _.where(this.gantt.data["rows_to_gantt"], {is_group: true});
            let data_load_group = this.gantt.data["rows_to_gantt"].filter(item => item.is_group === true);

            let gp_load = data_load_group.map(group_value => {
                if (group_value.group_id !== false && group_value.group_id.length > 0) {
                    return group_value.group_id[0];
                }
            });

            //var gp_domain_ids = _.compact(gp_load);
            let gp_domain_ids = gp_load.filter(Boolean);
            let _domain = [['resource_id', 'in', [...new Set(gp_domain_ids)]],['data_aggr', '>=', m_GtimeStart], ['data_aggr', '<=', m_GtimeStop]];
            let _fields = ['task_id', 'data_from', 'data_to', 'data_aggr', 'duration', 'resource_id'];

            let result = await this.orm.searchRead(
                load_model,
                _domain,
                _fields,
                {
                    context: _ctx,
                });

                this.gantt.data["Load_Data"] = result;
        }

        return true
    }




    reload(handle, params) {
        if (params.domain) {
            this.gantt.domains = params.domain;
        }
        if (params.context) {
            this.gantt.contexts = params.context;
        }
        if (params.groupBy) {
            this.gantt.group_bys = params.groupBy;
        }
        return this._do_load();
    }

}


// 1. Replacing _.uniq with native JavaScript:
//      var _domain = [[load_id_from, 'in', [...new Set(ids.map(id => id))]]];
//      This code removes duplicate elements from the ids array and converts it back to an array.
// 2. Replacing _.compact with native JavaScript:
//      var gp_domain_ids = gp_load.filter(Boolean);
//      This code removes all falsy values from the gp_load array.
