/** @odoo-module **/



import {Component, onMounted, useState, useExternalListener, xml, useRef, onWillStart, onWillUnmount, onWillUpdateProps } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
const { DateTime } = luxon;
import { useService, useBus } from '@web/core/utils/hooks';
import { FormViewDialog } from "@web/views/view_dialogs/form_view_dialog";
import { _t } from "@web/core/l10n/translation";

function each(array, callback) {
    if (Array.isArray(array) && array) {
        array.forEach(callback);
    }
}

export class GanttItemzTree extends Component {

    static props = [
        "item_list",
        "options"
    ];
    elRef = useRef("elItemTree");
    setup() {
        this.notification = useService('notification');
        this.dialogService = useService("dialog");
        // console.log(this.props);
        let self = this;
        this.hover_id = null;
        this.items_sorted = this.props.options.items_sorted;
        this.export_wizard = this.props.options.export_wizard;
        this.main_group_id_name = this.props.options.main_group_id_name;
        this.action_menu = this.props.options.action_menu;
        this.tree_view = this.props.options.tree_view;
        this.options = this.props.options;


        //this.records = this.props.item_list;

        const calcItem = (item, index) => this.calculateItem(item, index);
        this.records =    this.props.item_list.map(calcItem);

        this.blockUI = { action: function () {
            if (!this.env.services.ui.isBlocked) {
                this.env.services.ui.block();
            }
        }.bind(this) };

        this.unblockUI = { action: function () {
            if (this.env.services.ui.isBlocked) {
                this.env.services.ui.unblock();
            }
        }.bind(this) };


        this.setting = {

            edit: {
                enable: self.showItemsSorted,
                showRemoveBtn: false,
                showRenameBtn: self.showRenameBtn,
                drag: {
                    next: true,
                    inner: true,
                    prev: true,
                    isCopy: false
                  }
            },
            view: {

                selectedMulti: false,
                fontCss: self.getFont,
                nameIsHTML: true,
                showLine: true,  //
                showIcon: false,
                txtSelectedEnable: false,
                addHoverDom: self.addHoverDom,
                removeHoverDom: self.removeHoverDom,

            },
            data: {
                key: {
                    name: "value_name"
                },
                simpleData: {
                    enable: true,
                    idKey: "zt_id",
                    pIdKey: "zt_pId",

                }
            },
            callback: {
                beforeDrag: self.beforeDrag,
                beforeDrop: self.beforeDrop,
                onDrop: self.onDrop,
                onClick: self.zTreeOnClick,
                onCollapse: self.onCollapse,
                onExpand: self.onExpand,
                beforeCollapse: self.beforeCollapse,
                beforeEditName: self.beforeEditName,
                onRename: self.OnRename,

            }
        };

        this.previousItemList = [...this.props.item_list];


        onWillStart(async () => {
            await loadJS('/web_gantt_native/static/src/lib/jquery.ztree.core.js');
            await loadJS('/web_gantt_native/static/src/lib/jquery.ztree.exedit.js');
        });

        onWillUpdateProps((nextProps) => {
            //console.log("Ztree Item Update :", nextProps);

            let reinitialize = false;


            const calcItem = (item, index) => this.calculateItem(item, index);
            this.records = nextProps.item_list.map(calcItem);
            // this.items_sorted = nextProps.options.items_sorted;
            this.export_wizard = nextProps.options.export_wizard;
            this.main_group_id_name = nextProps.options.main_group_id_name;
            this.action_menu = nextProps.options.action_menu;
            this.tree_view = nextProps.options.tree_view;
            this.options = nextProps.options;

            // Check if item_list has changed
            if (JSON.stringify(this.previousItemList) !== JSON.stringify(nextProps.item_list)) {
                //console.log("item_list has changed");
                // Update the previous item_list
                this.previousItemList = [...nextProps.item_list];
                reinitialize = true;
            }

            if (this.items_sorted !== nextProps.options.items_sorted) {
                //console.log("tree_view has changed");
                this.items_sorted = nextProps.options.items_sorted;
                reinitialize = true;
            }



            if (reinitialize) {
                this.initializeZTree();
            }



        });

        onMounted(() => {
            this.initializeZTree();
        });


        // Listen for row hover events from other components
        useBus(this.env.bus, 'handleRowHover', this.handleRowHover.bind(this));

        onWillUnmount(() => {
            this.env.bus.removeEventListener("selectNode", (ev) => this.selectNode(ev));
            //console.log("Ztree onWillUnmount");
        });

    }

    logNodesWithIndentation(node, callback) {
    // Call the callback function with the current node and its level
        callback(node, node.level);

    // If the node has children, iterate over each child and call logNodesWithIndentation recursively
        if (node.children) {
            node.children.forEach(child => this.logNodesWithIndentation(child, callback));
        }
    }

    initializeZTree() {

        this.el = this.elRef.el;
        this.$el = $(this.el);

        this.env.bus.addEventListener("selectNode", (ev) => this.selectNode(ev));

        this.records.forEach(record => {
            record["open"] = true;

            if (typeof(record["fold"]) != "None" && record["fold"] === true) {
                record["open"] = false;
            }

        });

        // this.records.forEach(record => {
        //     if (typeof(record["fold"]) != 'undefined' && record["fold"] === true) {
        //         record["open"] = false;
        //     }
        // });

        let records_json = JSON.parse(JSON.stringify(this.records));

        let $zTree = $.fn.zTree.init(this.$el.find("#treeGantt"), this.setting, records_json);

        this.$zTree = $zTree;

        var nodes = $zTree.getNodes();

        nodes.forEach(node => this.logNodesWithIndentation(node, (n, level) => {
            //console.log(' '.repeat(level * 2) + n.value_name + " level: "+ level +" zOpen:" + n.open);

            let aObj = this.$el.find(`#${n.tId}_a`);
            aObj.addClass(`task-gantt-item-${n.zt_id}`);
            aObj.addClass('task-gantt-item');
            aObj.prop('data-id', n.zt_id);
            n["widget"] = this;
            n["root_node"] = node.zt_id;
            
            // WBS codes are now displayed in separate column - no inline display needed

            if (n.group_field && n.group_field === this.action_menu) {
                //Refresh
                let refresh_bar = $('<span class="button custom task-gantt-refresh"/>');
                refresh_bar.addClass(`item-button_always_${n.tId}`);
                refresh_bar.append('<i class="fa fa-refresh fa-1x"></i>');
                refresh_bar.attr("title", "Rescheduling");
                aObj.append(refresh_bar);

                //Export
                if (this.export_wizard){
                    let export_bar = $('<span class="button custom task-gantt-wizard"/>');
                    export_bar.addClass(`item-button_always_${n.tId}`);
                    export_bar.append('<i class="fa fa-arrow-right fa-arrow-click fa-1x"></i>');
                    export_bar.attr("title", "Record to PDF");
                    aObj.append(export_bar);
                }

                aObj.css('background-color', 'rgba(113,75,103,0.11)'); // Change to your desired color

            }

            // if (this.items_sorted) {
            //
            //     if (n.is_group) {
            //         aObj.addClass("task-gantt-items-group");
            //         aObj.css({'background-color': "rgba(40, 95, 143, 0.10)"});
            //     }
            //
            //     if (n.is_group && n.level === 0) {
            //         aObj.css({'background-color': "beige"});
            //     }
            //
            // }
        }));

        this.env.bus.trigger('widget-update', { name: '$zTree', value: $zTree });

    }

    calculateItem(item, index) {
        item.uniq = index;
        return item;
    }

    getFont(treeId, node) {
        //Task have subtask
        if (node['subtask_count']){
            return {'font-weight':'bold'}
        }else{
            return {}
        }
    }

    // edit_record(event) {
    //     this.open_record(event, {mode: 'edit'});
    // }
    fold_bar = async (node, childs, fold) => {
        const self = this;
        const fold_dic = {};

        childs.forEach(child => {
            //update fold in ztree
            const nnode = self.$zTree.getNodeByTId(child.tId);
            nnode.fold = fold;

            if (!fold && node.group_field === self.main_group_id_name) {
                fold_dic[child.id] = false;
            }

        });

        // Not allow save fold if not in Tree View - that means group by not by main_group_id_name
        if (node.widget.tree_view && node.widget.items_sorted) {
            //const fold_dic = {};

            if (node["id"]) {
                fold_dic[node["id"]] = fold;

                //console.log(fold_dic);

                const task_model = this.props.options.model.modelName;

                try {
                    const result = await this.env.services.orm.call(
                        task_model,
                        'fold_update',
                        [fold_dic],
                        { context: this.props.options.model.gantt.contexts }
                    );

                    // this.notification.add(
                    //     _t('Tree Data Update : ' + result),
                    //     {type: 'warning'}
                    // );

                } catch (error) {
                    this.notification.add(
                        _t('An error occurred while updating the tree data.'),
                        {type: 'danger'}
                    );
                }
            }
        }

        this.env.bus.trigger('widget-update', { name: '$zTree', value: self.$zTree });

       // this.env.bus.trigger('gantt_refresh_after_change')
    }


    onDrop = async (ev, treeId, treeNodes, targetNode, moveType) => {

        var self = this;
        var result = false;
        if (targetNode && targetNode.drop !== false) {
            var treeNode = treeNodes[0];
            var zTree = targetNode.widget.$zTree;
            var nodes = zTree.getNodes();
            var match_task = undefined;
            var zt_pId = undefined;

            if (moveType === "inner") {
                match_task = zTree.getNodeByParam('id', treeNode.id);
                match_task.plan_action = 1;
                zt_pId = targetNode.zt_id;
            }

            if (moveType === "next" || moveType === "prev") {
                match_task = zTree.getNodeByParam('id', treeNode.id);
                match_task.plan_action = 1;
                zt_pId = targetNode.zt_pId
            }

            var rows_to_gantt = [];

            nodes.forEach(function (node) {
                var childNodes = zTree.transformToArray(node);
                childNodes.forEach(function (child) {
                    var root_node_select =  "root_"+treeNode.subtask_project_id[0]+"_"+treeNode.subtask_project_id[1];
                    if (root_node_select  === node.zt_id) {
                        if (child.isParent){
                            child.fontCss = {'font-weight':'bold'}
                        }else{
                            child.fontCss = {}
                        }
                        var for_update = {
                            "id": child.id,
                            "plan_action": child.plan_action,
                            "is_group": child.is_group,
                            "sorting_level": child.level
                        };
                        rows_to_gantt.push(for_update)
                    }
                });
            });

            if (match_task) {
                // var parent = targetNode.widget_parent;
                var task_model = this.props.options.model.modelName;

                result = await this.env.services.orm.call(
                    task_model,
                    'tree_update',
                    [rows_to_gantt, treeNode.zt_id, zt_pId],
                    { context: this.props.options.model.gantt.contexts }
                );

                if (result) {
                    this.notification.add(
                        _t('Tree Data Update : ' + result),
                        {type: 'warning'}
                    );
                }

                this.env.bus.trigger('gantt_refresh_after_change')
                result = true;

            }
        }
        return result;

    }



    beforeDrag = (treeId, treeNodes) => {
        if (!this.items_sorted) {
            return false;
        }

        for (let i = 0; i < treeNodes.length; i++) {
            if (treeNodes[i].drag === false) {
                return false;
            }
        }
        return true;
    }

    beforeDrop(treeId, treeNodes, targetNode, moveType) {
        var result = false;
        if (targetNode && targetNode.drop !== false) {
            result = true;
        }
        return result
    }

    async open_record(event, options) {

            // var self = this.__parentedParent;
            var res_id = false;
            var res_model = false;
            // var res_open = false;
            // var start_date = false;
            var readonly = false;

            if (event.is_group === false && event.id) {

                res_id = event.id;
                res_model = this.props.options.model.modelName;
                await this.env.services.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: res_model,
                    res_id: res_id,
                    views: [[false, 'form']],
                    target: 'current',
                });


            } else if (event.is_group === true && event.group_id) {
                res_id = event.group_id;
                let nameModel = this.props.options.model.modelName;
                let nameField = event.group_field;

                const res_model = await this.env.services.orm.call(
                    "gantt.native.tool",
                    "open_model",
                    [nameModel, nameField]
                );


                await this.env.services.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: res_model,
                    res_id: res_id,
                    views: [[false, 'form']],
                    target: 'current',
                    readonly: readonly,
                });
            }

            else{
                this.notification.add(_t('You are trying to open a record that does not exist!'), { type: 'warning' });
            }

    }

    beforeCollapse = (treeId, treeNode) => {
        var self = this;

        // Check if self.tree_view is true
        if (!self.items_sorted) {
            // If self.tree_view is false, prevent collapse
            return false;
        }

        // Existing logic
        return (treeNode.collapse !== false);
    }

    onCollapse = async (event, treeId, treeNode) => {

        var self = this;

        var widget = treeNode.widget;
        var zTree = widget.$zTree;

        var node = zTree.getNodeByTId(treeNode.tId);
        var childs = treeNode.widget.getChildNodes(node);

        // console.log(lch);

        await this.fold_bar(node, childs, true)



    }

    onExpand = async (event, treeId, treeNode) => {

        var self = this;

        var widget = treeNode.widget;
        var zTree = widget.$zTree;
        // var zTree = $.fn.zTree.getZTreeObj("treeGantt");

        var node = zTree.getNodeByTId(treeNode.tId);

        var childs = treeNode.widget.getChildNodes(node);

        // console.log(lch)

        await self.fold_bar(node, childs, false)
    }


    beforeEditName = async (reeId, treeNode) =>{
        const check_field = ["name"];
        const fields = this.options.model.data.fields;

        const _read_only = await this.checkReadOnly(check_field, fields, treeNode);
        const check_readonly = _read_only.find(field => field.readonly);

        if (check_readonly) {
            this.notification.add(_t(`You are trying to edit on a read-only field! : '${check_readonly["field"]}'`), { type: 'warning' });
            return false;
        }
    }

    OnRename = async (event, treeId, treeNode, isCancel)=> {
        if (!isCancel) {
            const data = { "name": treeNode.value_name };

            const result = await this.env.services.orm.write(
                this.props.options.model.modelName, // model
                [treeNode.id],                      // record id
                data                                // data
            );

            if (result) {
                this.notification.add(
                    _t('Item Data Update : ' + result),
                    {type: 'warning'}
                );

                const match_item = this.props.item_list.find(item => item.id === treeNode.id);
                if (match_item) {
                    match_item.value_name = treeNode.value_name;
                }


                this.env.bus.trigger('gantt_refresh_after_change')
                //Todo refresh gantt
                // if (treeNode.on_gantt) {
                //     this.trigger('gantt_fast_refresh_after_change');
                // }
            }
        } else {
            this.$zTree.cancelEditName();
        }
    }

    zTreeOnClick = async (ev, treeId, treeNode) => {

        //alert(treeNode.tId + ", " + treeNode.zt_id);

        //Scheduling action
        var is_group = treeNode.is_group || false;
        var group_id = false;
        var group_field = false;


        //Edit Task
        let target = ev.target;
        if (target.classList.contains("node_name")) {

            if (is_group) {

                group_id = treeNode.group_id[0];
                group_field = treeNode.group_field;
            }

            await this.open_record({
                id: treeNode.id,
                is_group: is_group,
                group_id: group_id,
                group_field: group_field,
                start_date: treeNode.start_date
            })
        }

        //Rescheduling
        if (target.classList.contains("fa-refresh")) {
            if (is_group) {
                group_id = treeNode.group_id[0];
                group_field = treeNode.group_field;
            }
            await  this.plan_action({
                id: treeNode.id,
                is_group: is_group,
                group_id: group_id,
                group_field: group_field,
                start_date: treeNode.start_date
            })

        }



        //Wizard export
        if ($(ev.target).hasClass("fa-arrow-click" )) {

            if (is_group) {
                group_id = treeNode.group_id[0];
                group_field = treeNode.group_field;
            }
            let time_type = this.options.timeType;
            let context =  this.props.options.model.gantt.contexts
            context['default_group_id'] = group_id || false;
            context['default_'+group_field] = group_id || false;
            context['time_type'] = time_type || false;
            let res_model = this.export_wizard;

            let result = await this.env.services.orm.call(
                'gantt.native.tool',
                'exist_model',
                ['project_native_report_advance'],
                {context: this.props.options.model.gantt.contexts}
            );

            if (result) {
                this.export_open(res_model, context);
            }

        }



        //Add Task
        if (target.classList.contains("fa-plus")) {

            // var is_group = match_node.is_group || false;

            var parent_id = false;
            var project_id = false;

            if (is_group) {
                project_id = treeNode.group_id[0];
            }
            else{
                parent_id = treeNode.id;
                if (treeNode.subtask_project_id){
                    project_id = treeNode.subtask_project_id[0]
                }
            }

            // if (project_id){

                // treeNode.widget.trigger_up('item_record_add', {
                //     project_id: project_id,
                //     parent_id: parent_id,
                // });

                let context =  this.props.options.model.gantt.contexts

                context['default_project_id'] = project_id;
                context['default_parent_id'] = parent_id;

                this.env.services.action.doAction({
                    name: _t("Add Closing Day(s)"),
                    type: "ir.actions.act_window",
                    res_model: 'project.task',
                    view_mode: "form",
                    views: [[false, "form"]],
                    target: "new",
                    context: context,
                }, {
                    onClose: () => this.env.bus.trigger('gantt_refresh_after_change')
                });


            // }else{
            //     this.notification.add(_t('You are trying add task to not select Project!'), { type: 'warning' });
            //
            // }

        }

    }


    export_open(res_model, context) {

        this.dialogService.add(FormViewDialog, {
            title: _t("PDF Report for Project"),
            resModel: res_model,
            resId: false,
            context: context,
            preventCreate: true,
            onRecordSaved: () => {
                // Handle record saved logic here if needed
            },

        }, {
            onClose: () => {
                // Handle dialog close logic here if needed
            }
        });

    }




    async plan_action(event) {

        if (event.is_group && event.group_field === 'project_id') {
            var  res_id = event.group_id;

            var  res_model = 'project.task';
            this.blockUI.action();

            const result = await this.env.services.orm.call(
                res_model,
                'scheduler_plan',
                [res_id],
                { context: this.props.options.model.gantt.contexts }
            );

            this.unblockUI.action();
            
            // Check if CPM calculation failed and show notification
            if (result === false) {
                // Show user notification about failed planning
                this.env.services.notification.add(
                    "⚠️ CPM Calculation Failed - Circular dependencies detected. Check project messages for details.",
                    {
                        title: "Planning Failed", 
                        type: "warning",
                        sticky: true
                    }
                );
            } else {
                // Show success notification for successful planning
                this.env.services.notification.add(
                    "✅ Project planning completed successfully",
                    {
                        title: "Planning Complete",
                        type: "success"
                    }
                );
            }
            
            this.env.bus.trigger('gantt_refresh_after_change')

        }
    }

    showItemsSorted(treeId, treeNode) {
        return self.items_sorted;
    }
    showRenameBtn(treeId, treeNode) {
        return !treeNode.is_group;
    }


    getChildNodes(treeNode) {
        var childNodes = this.$zTree.transformToArray(treeNode);
        var nodes = [];

        for (var i = 0; i < childNodes.length; i++) {
            var child = childNodes[i];
            if (treeNode.zt_id !== child.zt_id) {
                nodes.push(child);
            }
        }
        return nodes;
    }

    addHoverDom = (treeId, treeNode) => {
        this.env.bus.trigger('handleRowHover', { zt_id: treeNode.zt_id, hover: true });
        // console.log("Ztree Hover", treeNode.id );

        // Add a button when hovering
        let aObj = $("#" + treeNode.tId + "_a");
        if ($(".item-button_"+treeNode.tId).length>0) return;

        let add_btn = $('<span class="button custom task-gantt-add"/>');
        add_btn.addClass("item-button_" + treeNode.tId);
        add_btn.append('<i class="fa fa-plus fa-1x"></i>');
        add_btn.attr("title", "Add Record");
        aObj.append(add_btn);

    }

    removeHoverDom = (treeId, treeNode) => {
        this.env.bus.trigger('handleRowHover', { zt_id: treeNode.zt_id, hover: false });
        // console.log("Ztree Hover Remove", treeNode.id );

        $(".item-button_" + treeNode.tId).remove();
    }

    handleRowHover = (ev) => {
        // Safety check - ensure event detail exists
        if (!ev || !ev.detail) {
            return;
        }
        
        const { zt_id, hover } = ev.detail;
        
        // Ensure zt_id exists
        if (zt_id === undefined || zt_id === null) {
            return;
        }
        
        // Apply hover effect to task names in the tree
        // Escape special characters in CSS selector to avoid jQuery syntax errors
        const escapedId = CSS.escape(zt_id);
        const taskElement = this.$el.find('.task-gantt-item-' + escapedId);
        if (taskElement.length > 0) {
            if (hover) {
                taskElement.addClass("task-gantt-item-hover");
            } else {
                taskElement.removeClass("task-gantt-item-hover");
            }
        }
    }

    selectNode = (ev) => {

        let node = this.$zTree.getNodeByParam("zt_id", ev.detail.id);
        if (ev.detail.select) {
            this.$el.find('.task-gantt-item-'+ ev.detail.id).addClass("task-gantt-item-hover");
            // console.log("Ztree Node select", ev.detail.id);

        } else {
            this.$el.find('.task-gantt-item-'+ ev.detail.id).removeClass("task-gantt-item-hover");
            // console.log("Ztree Node cancelselect", ev.detail.id);
        }
    }

    async checkReadOnly(checkFields, parentFields, record) {
        const readonlyFields = [];
        for (let field of checkFields) {
            let readonlyStatus = false;
            let checkField = parentFields[field];
            let checkState = record["state"];
            let states = checkField["states"];

            if (checkState && states) {
                let whereState = [];
                for (let state of states) {
                    let param1 = false;
                    let param2 = false;
                    if (state[0].length === 2) {
                        param1 = state[0][0];
                        param2 = state[0][1];
                    }
                    if (param1 === 'readonly') {
                        whereState.push({ state: key, param: param2 });
                    }
                    if (param2 === true) {
                        readonlyStatus = true;
                    }
                }
                let checkReadonly = whereState.find(state => state.state === checkState);
                if (readonlyStatus) {
                    if (!checkReadonly) {
                        readonlyStatus = false;
                    }
                } else {
                    if (!checkReadonly) {
                        readonlyStatus = true;
                    }
                }
            } else {
                readonlyStatus = checkField.readonly;
            }
            readonlyFields.push({ field: field, readonly: readonlyStatus });
        }
        return readonlyFields;
    }




}

GanttItemzTree.template = xml/*xml*/`

<div class="gantt-item-tree" t-ref="elItemTree">

    <ul id="treeGantt" class="ztree">

    </ul>

</div>

`;