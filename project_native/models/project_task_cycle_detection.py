# -*- coding: utf-8 -*-

from odoo import models, api
from collections import defaultdict, deque
import logging

_logger = logging.getLogger(__name__)


class ProjectTaskCycleDetection(models.Model):
    _name = 'project.task'
    _inherit = 'project.task'

    def _detect_cycles_improved(self, project_id):
        """
        Improved cycle detection using proper graph algorithms
        
        This method uses multiple algorithms to detect different types of cycles:
        1. DFS with coloring for basic cycle detection
        2. Tarjan's algorithm for strongly connected components
        3. Path-based detection for complex dependency cycles
        
        Args:
            project_id (int): Project ID to check for cycles
            
        Returns:
            dict: {
                'has_cycles': bool,
                'cycle_tasks': list of task IDs involved in cycles,
                'cycle_paths': list of cycle paths found,
                'strongly_connected_components': list of SCCs
            }
        """
        
        # Build dependency graph
        graph = self._build_dependency_graph(project_id)
        if not graph['tasks']:
            return {'has_cycles': False, 'cycle_tasks': [], 'cycle_paths': [], 'strongly_connected_components': []}
        
        # Method 1: DFS-based cycle detection
        dfs_result = self._dfs_cycle_detection(graph)
        
        # Method 2: Tarjan's algorithm for strongly connected components
        tarjan_result = self._tarjan_scc_detection(graph)
        
        # Method 3: Path-based cycle detection for detailed analysis
        path_result = self._path_based_cycle_detection(graph)
        
        # Combine results
        all_cycle_tasks = set()
        all_cycle_tasks.update(dfs_result['cycle_tasks'])
        all_cycle_tasks.update(tarjan_result['cycle_tasks'])
        all_cycle_tasks.update(path_result['cycle_tasks'])
        
        has_cycles = len(all_cycle_tasks) > 0
        
        #if has_cycles:
            #_logger.warning(f"Cycles detected in project {project_id}: {len(all_cycle_tasks)} tasks involved")
            #for path in path_result['cycle_paths']:
                #task_names = [graph['tasks'][task_id]['name'] for task_id in path]
                #_logger.warning(f"Cycle path: {' -> '.join(task_names)}")
        
        return {
            'has_cycles': has_cycles,
            'cycle_tasks': list(all_cycle_tasks),
            'cycle_paths': path_result['cycle_paths'],
            'strongly_connected_components': tarjan_result['sccs'],
            'detection_methods': {
                'dfs': dfs_result,
                'tarjan': tarjan_result,
                'path_based': path_result
            }
        }

    def _build_dependency_graph(self, project_id):
        """
        Build a comprehensive dependency graph for cycle detection
        
        Returns:
            dict: {
                'tasks': {task_id: task_info},
                'adjacency': {task_id: [dependent_task_ids]},
                'reverse_adjacency': {task_id: [predecessor_task_ids]}
            }
        """
        
        # Get all tasks
        tasks = self.env['project.task'].search([
            ('project_id', '=', project_id),
            ('active', 'in', [True, False])
        ])
        
        # Get all predecessors
        predecessors = self.env['project.task.predecessor'].search([
            ('task_id.project_id', '=', project_id)
        ])
        
        # Build graph structure
        graph = {
            'tasks': {},
            'adjacency': defaultdict(list),
            'reverse_adjacency': defaultdict(list)
        }
        
        # Add tasks
        for task in tasks:
            graph['tasks'][task.id] = {
                'id': task.id,
                'name': task.name,
                'schedule_mode': task.schedule_mode
            }
        
        # Add edges
        for pred in predecessors:
            parent_id = pred.parent_task_id.id
            child_id = pred.task_id.id
            
            # Skip invalid references
            if parent_id not in graph['tasks'] or child_id not in graph['tasks']:
                continue
            
            graph['adjacency'][parent_id].append(child_id)
            graph['reverse_adjacency'][child_id].append(parent_id)
        
        return graph

    def _dfs_cycle_detection(self, graph):
        """
        DFS-based cycle detection with proper coloring
        
        Uses WHITE-GRAY-BLACK coloring algorithm:
        - WHITE: unvisited
        - GRAY: currently being processed (in recursion stack)
        - BLACK: completely processed
        
        A back edge (to a GRAY node) indicates a cycle.
        """
        
        WHITE, GRAY, BLACK = 0, 1, 2
        colors = {task_id: WHITE for task_id in graph['tasks']}
        cycle_tasks = set()
        cycle_found = False
        
        def dfs_visit(node_id, path):
            nonlocal cycle_found
            
            colors[node_id] = GRAY
            path.append(node_id)
            
            for neighbor_id in graph['adjacency'][node_id]:
                if colors[neighbor_id] == GRAY:
                    # Back edge found - cycle detected
                    cycle_found = True
                    # Add all nodes in the cycle
                    cycle_start_idx = path.index(neighbor_id)
                    cycle_nodes = path[cycle_start_idx:] + [neighbor_id]
                    cycle_tasks.update(cycle_nodes)
                    
                elif colors[neighbor_id] == WHITE:
                    dfs_visit(neighbor_id, path.copy())
            
            colors[node_id] = BLACK
        
        # Check all nodes
        for task_id in graph['tasks']:
            if colors[task_id] == WHITE:
                dfs_visit(task_id, [])
        
        return {
            'has_cycles': cycle_found,
            'cycle_tasks': list(cycle_tasks)
        }

    def _tarjan_scc_detection(self, graph):
        """
        Tarjan's algorithm for finding strongly connected components
        
        SCCs with more than one node indicate cycles.
        This is more robust than simple DFS for complex cycle structures.
        """
        
        # Initialize Tarjan's algorithm variables
        index_counter = [0]  # Use list for mutable reference
        stack = []
        lowlinks = {}
        index = {}
        on_stack = {}
        sccs = []
        
        def strongconnect(node_id):
            # Set the depth index for node to the smallest unused index
            index[node_id] = index_counter[0]
            lowlinks[node_id] = index_counter[0]
            index_counter[0] += 1
            stack.append(node_id)
            on_stack[node_id] = True
            
            # Consider successors of node
            for successor_id in graph['adjacency'][node_id]:
                if successor_id not in index:
                    # Successor has not yet been visited; recurse on it
                    strongconnect(successor_id)
                    lowlinks[node_id] = min(lowlinks[node_id], lowlinks[successor_id])
                elif on_stack.get(successor_id, False):
                    # Successor is in stack and hence in the current SCC
                    lowlinks[node_id] = min(lowlinks[node_id], index[successor_id])
            
            # If node is a root node, pop the stack and print an SCC
            if lowlinks[node_id] == index[node_id]:
                scc = []
                while True:
                    successor_id = stack.pop()
                    on_stack[successor_id] = False
                    scc.append(successor_id)
                    if successor_id == node_id:
                        break
                sccs.append(scc)
        
        # Run algorithm on all nodes
        for task_id in graph['tasks']:
            if task_id not in index:
                strongconnect(task_id)
        
        # Find SCCs with cycles (more than one node)
        cycle_tasks = set()
        cyclic_sccs = []
        
        for scc in sccs:
            if len(scc) > 1:
                cyclic_sccs.append(scc)
                cycle_tasks.update(scc)
            elif len(scc) == 1:
                # Check for self-loops
                node_id = scc[0]
                if node_id in graph['adjacency'][node_id]:
                    cyclic_sccs.append(scc)
                    cycle_tasks.add(node_id)
        
        return {
            'has_cycles': len(cycle_tasks) > 0,
            'cycle_tasks': list(cycle_tasks),
            'sccs': cyclic_sccs,
            'all_sccs': sccs
        }

    def _path_based_cycle_detection(self, graph):
        """
        Path-based cycle detection to find actual cycle paths
        
        This method finds and returns the actual paths that form cycles,
        which is useful for debugging and user feedback.
        """
        
        visited = set()
        rec_stack = set()
        cycle_paths = []
        cycle_tasks = set()
        
        def find_cycles_from_node(node_id, path):
            visited.add(node_id)
            rec_stack.add(node_id)
            path.append(node_id)
            
            for neighbor_id in graph['adjacency'][node_id]:
                if neighbor_id not in visited:
                    find_cycles_from_node(neighbor_id, path.copy())
                elif neighbor_id in rec_stack:
                    # Found a cycle
                    cycle_start_idx = path.index(neighbor_id)
                    cycle_path = path[cycle_start_idx:] + [neighbor_id]
                    cycle_paths.append(cycle_path)
                    cycle_tasks.update(cycle_path)
            
            rec_stack.remove(node_id)
        
        # Check all unvisited nodes
        for task_id in graph['tasks']:
            if task_id not in visited:
                find_cycles_from_node(task_id, [])
        
        return {
            'has_cycles': len(cycle_tasks) > 0,
            'cycle_tasks': list(cycle_tasks),
            'cycle_paths': cycle_paths
        }

    def _mark_cyclic_tasks_improved(self, cycle_detection_result):
        """
        Mark tasks involved in cycles with detailed information
        """
        
        # Clear existing loop flags first
        all_tasks = self.env['project.task'].browse(cycle_detection_result.get('all_tasks', []))
        if all_tasks:
            all_tasks.write({'p_loop': False})
        
        # Mark cyclic tasks
        cyclic_task_ids = cycle_detection_result['cycle_tasks']
        if cyclic_task_ids:
            cyclic_tasks = self.env['project.task'].browse(cyclic_task_ids)
            cyclic_tasks.write({'p_loop': True})
            
            # Log detailed cycle information
            for i, path in enumerate(cycle_detection_result['cycle_paths']):
                task_names = []
                for task_id in path:
                    task = self.env['project.task'].browse(task_id)
                    task_names.append(task.name if task else f"Task {task_id}")
                
                #_logger.warning(f"Cycle {i+1}: {' -> '.join(task_names)}")

    @api.model 
    def check_project_cycles(self, project_id):
        """
        Public method to check for cycles in a project
        
        Args:
            project_id (int): Project ID to check
            
        Returns:
            dict: Cycle detection results
        """
        
        result = self._detect_cycles_improved(project_id)
        
        if result['has_cycles']:
            self._mark_cyclic_tasks_improved(result)
        
        return result

    @api.model
    def fix_simple_cycles(self, project_id):
        """
        Attempt to fix simple cycles by breaking dependency chains
        
        This method can automatically resolve some simple cycles by:
        1. Identifying self-references and removing them
        2. Breaking simple two-node cycles by removing one dependency
        3. Suggesting manual fixes for complex cycles
        
        Args:
            project_id (int): Project ID to fix cycles in
            
        Returns:
            dict: Results of cycle fixing attempts
        """
        
        result = self._detect_cycles_improved(project_id)
        fixes_applied = []
        
        if not result['has_cycles']:
            return {'success': True, 'message': 'No cycles detected', 'fixes_applied': []}
        
        # Fix self-references
        for task_id in result['cycle_tasks']:
            self_refs = self.env['project.task.predecessor'].search([
                ('task_id', '=', task_id),
                ('parent_task_id', '=', task_id)
            ])
            
            if self_refs:
                task_name = self.env['project.task'].browse(task_id).name
                self_refs.unlink()
                fixes_applied.append(f"Removed self-reference for task: {task_name}")
        
        # Fix simple two-node cycles
        for path in result['cycle_paths']:
            if len(path) == 3 and path[0] == path[2]:  # A -> B -> A
                task_a_id, task_b_id = path[0], path[1]
                
                # Remove one of the dependencies (prefer to keep the one created first)
                predecessors = self.env['project.task.predecessor'].search([
                    '|',
                    '&', ('task_id', '=', task_b_id), ('parent_task_id', '=', task_a_id),
                    '&', ('task_id', '=', task_a_id), ('parent_task_id', '=', task_b_id)
                ], order='create_date desc', limit=1)
                
                if predecessors:
                    task_a_name = self.env['project.task'].browse(task_a_id).name
                    task_b_name = self.env['project.task'].browse(task_b_id).name
                    predecessors.unlink()
                    fixes_applied.append(f"Broke cycle between tasks: {task_a_name} and {task_b_name}")
        
        # Re-check for remaining cycles
        final_result = self._detect_cycles_improved(project_id)
        
        return {
            'success': not final_result['has_cycles'],
            'fixes_applied': fixes_applied,
            'remaining_cycles': final_result['cycle_paths'] if final_result['has_cycles'] else [],
            'message': f"Applied {len(fixes_applied)} fixes. " + 
                      ("All cycles resolved." if not final_result['has_cycles'] 
                       else f"{len(final_result['cycle_paths'])} cycles remaining (require manual intervention).")
        }