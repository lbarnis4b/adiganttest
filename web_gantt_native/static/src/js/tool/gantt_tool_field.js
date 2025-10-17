/** @odoo-module **/

const { DateTime } = luxon;
const time = DateTime;

import {
    areDatesEqual,
    deserializeDate,
    deserializeDateTime,
    formatDate,
    formatDateTime,
    parseDateTime,
    today,
} from "@web/core/l10n/dates";

//const auto_str_to_date = parseDateTime;
const auto_str_to_date = deserializeDateTime;

export function getFieldsGantt(parent, group_bys) {

    // this.fields_keys = _.keys(this.fields_view.fields);

    var gantt_fields_0 = [
        "id",
        "display_name"
    ];

    var gantt_fields_1 = [

        "name",
        "date_start",
        "date_stop",
        "progress",
        "user_id",

        "task_time",

        "project_id",
        "date_deadline",
        "progress",

        "on_gantt",

        "date_done",
        "state",

        "subtask_project_id",
        "load_data_id",

        "parent_id",

        "default_seq",

        "sorting_seq",
        "sorting_level",
        "subtask_count",

        "is_milestone",
        "schedule_mode",
        "constrain_type",
        "constrain_date",
        "duration",
        "plan_duration",

        "summary_date_start",
        "summary_date_end",

        "plan_action",

        "color_gantt_set",
        "color_gantt",
        "duration_scale",

        "fold",

        "critical_path",
        "cp_shows", 
        "cp_detail",

        "p_loop",

        "doc_count",

        "child_text",

        "wbs_code",
        "wbs_level", 
        "wbs_sequence",

    ];

    var model_fields_dict = [];
    // var model_fields = _.compact(_.map(gantt_fields_1, function(key) {
    //
    //     var key_field = parent.fields_view.arch.attrs[key] || '';
    //     model_fields_dict[key] = key_field;
    //     return key_field
    // }));
    //
    // model_fields = _.uniq(model_fields.concat(group_bys, gantt_fields_0));

    let model_fields = gantt_fields_1.map(key => {
        let key_field = parent.fields_view.arch.attrs[key] || '';
        model_fields_dict[key] = key_field;
        return key_field;
    }).filter(Boolean); // equivalent to _.compact

    model_fields = [...new Set(model_fields.concat(group_bys, gantt_fields_0))];

    return {
        model_fields : model_fields,
        gantt_fields : gantt_fields_1,
        model_fields_dict : model_fields_dict
    }

}

// export function flatRowsGantt(row_datas, ItemsSorted) {
//     let rows_to_gantt = [];
//     let idMap = new Map();
//
//     function generateZtId(value, parentZtId) {
//         if (value.is_group) {
//             return `${parentZtId}${value.group_info[0]}_${value.group_info[1]}`;
//         }
//         return value.id.toString();
//     }
//
//     function buildFlatTree(items, parentZtId = "root_") {
//         items.forEach(value => {
//             let zt_id = generateZtId(value, parentZtId);
//             let zt_pId = parentZtId;
//
//             if (value.is_group) {
//                 value.task_name = value.group_info[1];
//             }
//
//             let flatItem = {
//                 zt_id: zt_id,
//                 zt_pId: zt_pId,
//                 is_group: value.is_group,
//                 id: value.id,
//                 group_id: value.group_info,
//                 value_name: value.is_group ? (value.task_name || "None") : value.task_name,
//                 group_field: value.group_field,
//                 task_count: value.task_count,
//                 fold: value.fold,
//                 assign_to: value.assign_to ? value.assign_to[1] : undefined,
//                 date_start: value.date_start,
//                 date_stop: value.date_stop,
//                 progress: value.progress,
//                 is_milestone: value.is_milestone,
//                 on_gantt: value.on_gantt,
//                 schedule_mode: value.schedule_mode,
//                 constrain_type: value.constrain_type,
//                 constrain_date: value.constrain_date,
//                 duration: value.duration,
//                 plan_duration: value.plan_duration,
//                 plan_action: value.plan_action,
//                 color_gantt:  value.color_gantt,
//                 color_gantt_set: value.color_gantt_set,
//                 duration_scale: value.duration_scale,
//                 summary_date_start: value.summary_date_start,
//                 summary_date_end: value.summary_date_end,
//                 subtask_project_id: value.subtask_project_id,
//                 load_data_id: value.load_data_id,
//                 parent_id: value.parent_id,
//                 subtask_count: value.subtask_count,
//                 date_done: value.date_done,
//                 state: value.state,
//                 fold: value.fold,
//                 critical_path: value.critical_path,
//                 cp_shows: value.cp_shows,
//                 cp_detail: value.cp_detail,
//                 p_loop: value.p_loop,
//                 doc_count: value.doc_count,
//                 child_text: value.child_text
//             };
//
//             rows_to_gantt.push(flatItem);
//             idMap.set(value.id, zt_id);
//
//             if (value.child_task && Array.isArray(value.child_task)) {
//                 buildFlatTree(value.child_task, zt_id);
//             }
//         });
//     }
//
//     buildFlatTree(row_datas);
//
//     // Second pass to set correct zt_pId for elements with parent_id
//     rows_to_gantt.forEach(item => {
//         if (item.parent_id && idMap.has(item.parent_id[0])) {
//             item.zt_pId = idMap.get(item.parent_id[0]);
//         }
//     });
//
//     return rows_to_gantt;
// }

export function flatRowsGantt(row_datas, ItemsSorted) {

    let rows_to_gantt = [];


    let generate_flat_gantt = (value, parent_value) => {

        let zt_id = false;
        let zt_pId = "root_";

        if (parent_value && !ItemsSorted){
            zt_pId = parent_value.zt_id
        }

        //if task_name is array and have 2 elements, then use second element as task_name
        if (Array.isArray(value.task_name) && value.task_name.length > 1) {
            value.task_name = value.task_name[1];
        }

        if (value.is_group) {

            value.zt_id = zt_pId + value.group_info[0] + "_" + value.group_info[1];
            value.task_name = value.group_info[1];

            rows_to_gantt.push({
                id: value.id,
                is_group: value.is_group,
                group_id: value.group_info,
                value_name: value.task_name ? value.task_name : "None",
                group_field: value.group_field,
                task_count: value.task_count,
                fold: value.fold,
                zt_pId: zt_pId,
                zt_id:  value.zt_id,
            });

        } else {

            let assign_to = undefined;
            try {
                assign_to = value.assign_to[1];
            } catch (err) {}

            if (ItemsSorted){
                zt_pId = parent_value.zt_id;
                if (value.parent_id){
                    zt_pId = value.parent_id[0]
                }
            }

            // if (parent_value){
            //     zt_pId = parent_value.zt_id;
            // }
            //
            // if (value.parent_id){
            //     zt_pId = value.parent_id[0]
            // }

            rows_to_gantt.push({
                zt_id:  value.id,
                zt_pId : zt_pId,
                is_group: value.is_group,
                id: value.id,
                group_id: value.group_info,
                value_name: value.task_name,
                assign_to: assign_to,
                date_start: value.date_start,
                date_stop: value.date_stop,
                tree_seq: value.tree_seq,
                default_seq: value.default_seq,
                sorting_level : value.sorting_level,
                sorting_seq: value.sorting_seq,
                project_id : value.project_id,
                date_deadline: value.date_deadline,
                progress: value.progress,
                is_milestone: value.is_milestone,
                on_gantt: value.on_gantt,
                schedule_mode: value.schedule_mode,
                constrain_type: value.constrain_type,
                constrain_date: value.constrain_date,
                duration: value.duration,
                plan_duration: value.plan_duration,
                plan_action: value.plan_action,
                color_gantt:  value.color_gantt,
                color_gantt_set: value.color_gantt_set,
                duration_scale: value.duration_scale,
                summary_date_start: value.summary_date_start,
                summary_date_end: value.summary_date_end,
                subtask_project_id: value.subtask_project_id,
                load_data_id: value.load_data_id,
                parent_id: value.parent_id,
                subtask_count: value.subtask_count,
                date_done: value.date_done,
                state: value.state,
                fold: value.fold,
                critical_path: value.critical_path,
                cp_shows: value.cp_shows,
                cp_detail: value.cp_detail,
                p_loop: value.p_loop,
                doc_count: value.doc_count,
                child_text: value.child_text,
                wbs_code: value.wbs_code,
                wbs_level: value.wbs_level,
                wbs_sequence: value.wbs_sequence
            });
        }

       if (Array.isArray(value.child_task)) {
            value.child_task.map(sub_task => generate_flat_gantt(sub_task, value));
        }
    };

    // console.log('Before generate_flat_gantt:', JSON.stringify(row_datas, null, 2));

    row_datas.map(result => generate_flat_gantt(result));

    // console.log('After generate_flat_gantt:', JSON.stringify(rows_to_gantt, null, 2));


    return rows_to_gantt;
}

export function groupRowsGantt(tasks, group_bys, self_parent, ItemsSorted) {
    const parent = self_parent;
    const GtimeStopA  = [];
    const GtimeStartA = [];
    const model_fields_dict = parent.model_fields_dict;
    const gantt_attrs = parent.gantt_attrs;
    const second_sort = parent.second_sort;
    const main_group = parent.main_group;

    tasks = simulateGroupBy(tasks, group_bys, parent.fields);
    tasks = sortTasks(tasks, model_fields_dict, second_sort, ItemsSorted);
    const groups = getGroups(tasks, group_bys);

    const sortedGroups = sortGroups(groups, gantt_attrs, second_sort, main_group);

    let projects = generateProjects(sortedGroups, parent, model_fields_dict, GtimeStopA, GtimeStartA, group_bys);

    // console.log('-------- List Tasks --------');
    // projects.forEach(project => {
    //     project.child_task.forEach(task => {
    //         console.log(`Task ID: ${task.id}, Parent ID: ${task.parent_id}`);
    //     });
    // });

    // console.log('-------- Project Tasks --------');

    // console.log(JSON.stringify(projects, null, 2));

    // console.log('-------- Grouped Tasks --------');

    //const nestedTaskList = nestTasks(tasks2);
    // console.log(JSON.stringify(nestedTaskList, null, 2));

    if (ItemsSorted) {
           projects.forEach(project => {
        let new_childs = nestTasks(project.child_task);

        project.child_task = new_childs;

    });
    }



    //console.log('-------- Grouped Tasks --------', JSON.stringify(projects , null, 2));




    return {
        projects,
        timestop: GtimeStopA,
        timestart: GtimeStartA
    };
}

// Function to print grouped tasks for visualization


function nestTasks(tasks) {
    const taskMap = new Map();
    const nestedTasks = [];

    // Initialize the task map and add a children array to each task
    tasks.forEach(task => {
        task.child_task = [];
        taskMap.set(task.id, task);
    });

    // Build the nested structure
    tasks.forEach(task => {
        if (task.parent_id !== false && task.parent_id !== undefined && task.parent_id.length > 0) {
            task.parent_id.forEach(parentId => {
                const parentTask = taskMap.get(parentId);
                if (parentTask) {
                    parentTask.child_task.push(task);
                }
            });
        } else {
            nestedTasks.push(task);
        }
    });

    return nestedTasks;
}


// const tasks2 = [
//     { id: 85, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 84, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 83, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 82, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 81, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 80, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 79, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 78, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 77, parent_id: [34], name: 'Room 1: Paint' },
//     { id: 33, parent_id: false, name: 'Root Task 1' },
//     { id: 34, parent_id: [33], name: 'Check Lift' },
//     { id: 32, parent_id: false, name: 'Root Task 2' },
//     { id: 45, parent_id: false, name: 'Root Task 3' }
// ];
//
// function nestTasks2(tasks) {
//     const taskMap = new Map();
//     const nestedTasks = [];
//
//     tasks.forEach(task => {
//         task.children = [];
//         taskMap.set(task.id, task);
//     });
//
//     tasks.forEach(task => {
//         if (task.parent_id !== null) {
//             const parentTask = taskMap.get(task.parent_id);
//             if (parentTask) {
//                 parentTask.children.push(task);
//             }
//         } else {
//             nestedTasks.push(task);
//         }
//     });
//
//     return nestedTasks;
// }






function simulateGroupBy(tasks, group_bys, fields) {
    if (group_bys.length === 0) {
        group_bys = ["_pseudo_group_by"];
        tasks.forEach(task => task._pseudo_group_by = "Plain Gantt View");
        if (fields) {
            fields._pseudo_group_by = {type: "string"};
        }
    }
    return tasks;
}

/**
 * Sort the tasks based on the appropriate field.
 * @param {object[]} tasks - The tasks to sort.
 * @param {object} model_fields_dict - A dictionary of the model fields.
 * @param {boolean} second_sort - Whether to sort by the second sort field.
 * @param {boolean} ItemsSorted - Whether the tasks are sorted.
 * @returns {object[]} The sorted tasks.
 */
function sortTasks(tasks, model_fields_dict, second_sort, ItemsSorted) {
    let sort_fld = "sequence";
    if (second_sort) {
        sort_fld = model_fields_dict["default_seq"];
    } else if (!second_sort && ItemsSorted) {
        sort_fld = model_fields_dict["sorting_seq"];
    }
    if (sort_fld) {
        tasks.sort((a, b) => a[sort_fld] - b[sort_fld]);
    }
    return tasks;
}

/**
 * Split the tasks into groups based on the group_by fields.
 * @param {object[]} tasks - The tasks to split into groups.
 * @param {string[]} group_bys - The fields to group by.
 * @returns {object[]} The tasks grouped by the group_by fields.
 */
function getGroups(tasks, group_bys) {
       let split_groups = (tasks, group_bys) => {
        if (group_bys.length === 0)
            return tasks;
        let sp_groups = [];
        tasks.forEach(task => {
            let group_name = task[group_bys[0]];

            // Handle cases where group_name is undefined, null, empty array, or non-date
            if (
                group_name === undefined || group_name === null ||
                (Array.isArray(group_name) && group_name.length === 0)

            ) {
                group_name = [-1,"None"];
            }

            // let group = sp_groups.find(group => group.name[1] === group_name[1]);
            // if (group === undefined) {
            //     group = {name: group_name, tasks: [], __is_group: true};
            //     sp_groups.push(group);
            // }
            // group.tasks.push(task);

            let group = undefined;
            if (group_name && group_name.length > 1) {
                group = sp_groups.find(group => group.name[1] === group_name[1]);
            }
            else{
                group = sp_groups.find(group => group.name[1] === group_name);
            }

            if (group === undefined) {
                if (group_name && group_name.length > 1) {
                    group = {name: group_name, tasks: [], __is_group: true};
                }
                else{
                    group = {name:[-1, group_name], tasks: [], __is_group: true};
                }
                sp_groups.push(group);
            }

            group.tasks.push(task);
        });
        sp_groups.forEach(group => {
            group.tasks = split_groups(group.tasks, group_bys.slice(1));
        });
        return sp_groups;
    };
    return split_groups(tasks, group_bys);
}

function sortGroups(groups, gantt_attrs, second_sort, main_group) {
    if (second_sort) {
        const s_field = gantt_attrs["second_seq_field"];
        groups = groups.map(result => {
            const s_id = result["name"][0];
            const sort_element = second_sort.find(element => element.id === s_id);

            if (sort_element) {
                result["sort_seq"] = sort_element[s_field];
            } else {
                result["sort_seq"] = -1;
            }
            return result;
        });

        groups.sort((a, b) => {
            if (a["sort_seq"] < b["sort_seq"]) {
                return -1;
            }
            if (a["sort_seq"] > b["sort_seq"]) {
                return 1;
            }
            return 0;
        });
    }

    if (main_group) {
        groups = groups.map(result => {
            const s_id = result["name"][0];
            const main_element = main_group.find(element => element.id === s_id);

            if (main_element) {
                result["g_data"] = main_element;
            } else {
                result["g_data"] = false;
            }

            return result;
        });
    }

    return groups;
}

function generateProjects(groups, parent, model_fields_dict, GtimeStopA, GtimeStartA, group_bys) {
    let assign_to = [];

    let generate_task_info = function(task, plevel) {
        let level = plevel || 0;
        if (task.__is_group) {
            assign_to = task.user_id;
            let task_infos = task.tasks.map(sub_task => generate_task_info(sub_task, level + 1)).filter(Boolean);
            if (task_infos.length === 0)
                return;

            let group_name = undefined;
            let field = parent.fields[group_bys[level]];

            if (field && field.type === "datetime"){
                group_name = auto_str_to_date(task.name);
            }
            else{
                try{
                    group_name = task.name;
                }
                catch (e) {
                    group_name = "None";
                }
            }

            let fold = false;
            if (task.hasOwnProperty("g_data"))
            {
                fold = task.g_data["fold"]
            }
            let task_count = task_infos.length;
            return {
                is_group: task.__is_group,
                group_info: task.name,
                group_field: group_bys[level],
                child_task:task_infos,
                task_name:group_name,
                level:level,
                task_count: task_count,
                fold: fold
            };
        } else {
               var today = time.local();
               var task_name = task.__name;

               assign_to = task[model_fields_dict["user_id"]];

               var mp_level = task[model_fields_dict["mp_level"]];
               var default_seq = task[model_fields_dict["default_seq"]];
               var sorting_level = task[model_fields_dict["sorting_level"]];
               var sorting_seq = task[model_fields_dict["sorting_seq"]];

               var subtask_project_id = task[model_fields_dict["subtask_project_id"]];
               var load_data_id = task[model_fields_dict["load_data_id"]];

               var parent_id = task[model_fields_dict["parent_id"]];
               var subtask_count = task[model_fields_dict["subtask_count"]];

               var date_start = auto_str_to_date(task[model_fields_dict["date_start"]]);
               if (!date_start){
                    date_start = today
               }

               var date_stop = auto_str_to_date(task[model_fields_dict["date_stop"]]);
               if (!date_stop) {
                    date_stop = date_start
               }

               var date_deadline = auto_str_to_date(task[model_fields_dict["date_deadline"]]);
               if (!date_deadline){
                    date_deadline = false
               }

                var progress = task[model_fields_dict["progress"]];
                var is_milestone = task[model_fields_dict["is_milestone"]];
                var on_gantt = task[model_fields_dict["on_gantt"]];

                var project_id = undefined;
                try {
                    project_id = task[model_fields_dict["project_id"]][0];
                } catch (err) {}

                var date_done = auto_str_to_date(task[model_fields_dict["date_done"]]);
                if (!date_done){
                    date_done = false
                }

                var constrain_date = auto_str_to_date(task[model_fields_dict["constrain_date"]]);
                if (!constrain_date){
                    constrain_date = false
                }

                var duration = task[model_fields_dict["duration"]];
                var plan_duration = task[model_fields_dict["plan_duration"]];

                var plan_action = task[model_fields_dict["plan_action"]];

                var color_gantt_set = task[model_fields_dict["color_gantt_set"]];
                var color_gantt = task[model_fields_dict["color_gantt"]];

                var duration_scale = task[model_fields_dict["duration_scale"]];

                let summary_date_start = task[model_fields_dict["summary_date_start"]]
                summary_date_start = auto_str_to_date(summary_date_start);
                if (!summary_date_start){
                    summary_date_start = false
                }

                var summary_date_end = auto_str_to_date(task[model_fields_dict["summary_date_end"]]);
                if (!summary_date_end){
                    summary_date_end = false
                }

                var schedule_mode = task[model_fields_dict["schedule_mode"]];
                var constrain_type = task[model_fields_dict["constrain_type"]];

                var state = task[model_fields_dict["state"]];

                var fold = task[model_fields_dict["fold"]];

                var critical_path = task[model_fields_dict["critical_path"]];
                var cp_shows = task[model_fields_dict["cp_shows"]];
                var cp_detail = task[model_fields_dict["cp_detail"]];

                var p_loop = task[model_fields_dict["p_loop"]];
                var doc_count = task[model_fields_dict["doc_count"]];
                var child_text = task[model_fields_dict["child_text"]];
                
                var wbs_code = task[model_fields_dict["wbs_code"]];
                var wbs_level = task[model_fields_dict["wbs_level"]];
                var wbs_sequence = task[model_fields_dict["wbs_sequence"]];

                if (date_stop && typeof date_stop.toMillis === 'function' && !isNaN(date_stop.toMillis())) {
                    GtimeStopA.push(date_stop.toMillis());
                }

                if (date_start && typeof date_start.toMillis === 'function' && !isNaN(date_start.toMillis())) {
                    GtimeStartA.push(date_start.toMillis());
                }

                if (date_done && typeof date_done.toMillis === 'function' && !isNaN(date_done.toMillis())) {
                    GtimeStopA.push(date_done.toMillis());
                    GtimeStartA.push(date_done.toMillis());
                }

                if (date_deadline && typeof date_deadline.toMillis === 'function' && !isNaN(date_deadline.toMillis())) {
                    GtimeStopA.push(date_deadline.toMillis());
                    GtimeStartA.push(date_deadline.toMillis());
                }

                return {
                    id:task.id,
                    task_name: task_name,
                    date_start: date_start,
                    date_stop: date_stop,
                    level:level,
                    assign_to:assign_to,

                    mp_level : mp_level,

                    default_seq : default_seq,

                    sorting_level : sorting_level,
                    sorting_seq : sorting_seq,

                    project_id: project_id,

                    date_deadline: date_deadline,

                    progress: progress,

                    is_milestone: is_milestone,

                    constrain_date: constrain_date,
                    schedule_mode: schedule_mode,
                    constrain_type: constrain_type,

                    duration: duration,
                    plan_duration: plan_duration,

                    plan_action: plan_action,

                    color_gantt_set: color_gantt_set,
                    color_gantt:  color_gantt,

                    duration_scale: duration_scale,

                    summary_date_start: summary_date_start,
                    summary_date_end: summary_date_end,

                    on_gantt: on_gantt,

                    subtask_project_id: subtask_project_id,
                    load_data_id: load_data_id,

                    parent_id: parent_id,
                    subtask_count: subtask_count,

                    date_done: date_done,
                    state: state,

                    fold:fold,

                    critical_path:critical_path,
                    cp_shows: cp_shows,
                    cp_detail: cp_detail,

                    p_loop: p_loop,

                    doc_count: doc_count,

                    child_text: child_text,

                    wbs_code: wbs_code,
                    wbs_level: wbs_level,
                    wbs_sequence: wbs_sequence,

                    is_group: false,
                };
        }
    };

    let projects = groups.map(result => generate_task_info(result, 0));
    //console.log('-------- Projects --------', JSON.stringify(projects , null, 2));
    return projects;

}