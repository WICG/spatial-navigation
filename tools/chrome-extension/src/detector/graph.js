/* graph.js contains codes which is necessary for generating graph data structures and SCC elements
which are necessary for detectors. */

function graph() {
    this.focusable = [];
    this.adj_list = [];
    this.rev_adj_list = [];
    this.node_num;
    this.rev_scc = [];
    this.scc = [];
    this.visited;
    this.stack = [];
    this.scc_visited = [];
    this.valid = true;
    this.result = [];
}

/* A fuction that makes a data structure of Graph. 
 *
 * Argument
 * 0 : all directions
 * 1 : up
 * 2 : down
 * 3 : left
 * 4 : right
 * 
 * Two dimensional array
 *
 * Row
 * Length of the number of focusble element.
 *
 * Column
 * idx   | 0      | 1  | 2    | 3    | 4     |
 * Nodes | origin | up | down | left | right |
 *
 */
graph.prototype.make_adj_array = function(direction) {
    const DIR = ["up", "down", "left", "right"];
    const option = {mode: 'all'}; // {mode: 'visible'}; //
    let targetGraph = [];
    this.focusable = document.body.focusableAreas(option);
    this.node_num = this.focusable.length;
    this.visited = new Array(this.node_num).fill(0);

    window.__spatialNavigation__.useMemoizationForIsVisible(true);
    if (direction == "all") { // direction == 0 means all directions
        for (var i = 0; i < this.node_num; i++) {
            this.focusable[i].node_id = i // assign node_id to focusable elements.
            targetGraph[i] = [this.focusable[i]];
            for (dir of DIR) {
                try {
                    targetGraph[i].push(window.__spatialNavigation__.findNextTarget(targetGraph[i][0], dir, option));
                } catch (e) {
                    console.log(targetGraph[i][0]);
                    console.log(e);
                    targetGraph[i].push(undefined);
                }
            }
        }
    } else if (DIR.includes(direction)) {
        for (var i = 0; i < this.node_num; i++) {
            this.focusable[i].node_id = i
            targetGraph[i] = new Array(2);
            targetGraph[i][0] = this.focusable[i];
            targetGraph[i][1] = window.__spatialNavigation__.findNextTarget(targetGraph[i][0], direction, option);
        }
    }
    window.__spatialNavigation__.useMemoizationForIsVisible(false);

    return targetGraph;
}


/* A fuction that removes empty and redundant element.
 *
 */
graph.prototype.remove_redundancy_in_array = function(input_array) {

    var output_array = input_array.filter(function(item, pos) {
        return input_array.indexOf(item) == pos;
    })

    var filtered_output_array = output_array.filter(function(el) {
        return el != null;
    });
    return filtered_output_array;
}


/* A fuction that makes a  directed graph in the form of two dimensional list
 *
 * Row
 * Length of the number of focusble element.
 *
 * Column
 * Nodes | origin | [destinations]
 *
 */

// Here, directed graph means a grpah only having directed edge
// that can be represented with a pair of two nodes (from, to)
// which is not related to arrow keys direction.

graph.prototype.make_adj_list = function(arrow_graph) {

    var directed_graph = [];

    for (var i = 0; i < arrow_graph.length; i++) {
        var tmp = new Array();
        var origin = arrow_graph[i][0];
        var destinations_with_each_arrow_keys = arrow_graph[i].slice(1, arrow_graph[i].length);
        var destinations_without_redundancy = this.remove_redundancy_in_array(destinations_with_each_arrow_keys);

        tmp.push(origin);
        Array.prototype.push.apply(tmp, destinations_without_redundancy);
        directed_graph.push(tmp);
    }
    return directed_graph;
}

/* A fuction that makes a reversed adj_list with directed graph
 *
 * Row
 * Length of the number of focusble element.
 * Same order of directed graph.
 *
 * Column
 * Nodes | destination | [origins] (in view point of directed graph)
 * 
 */

graph.prototype.make_rev_adj_list = function(directed_graph) {
    var reversed_graph_list = [];

    for (var i = 0; i < directed_graph.length; i++) {
        reversed_graph_list.push([directed_graph[i][0]]); // make a array of rev_graph in same order with directed_graph
    }

    for (var i = 0; i < directed_graph.length; i++) {
        for (var j = 1; j < directed_graph[i].length; j++) {
            if (directed_graph[i][j].node_id == undefined) {
                this.valid = false;
                return;
            }
            reversed_graph_list[directed_graph[i][j].node_id].push(directed_graph[i][0]); //push elements into rev_graph.
        }
    }
    return reversed_graph_list;
}

/* A fuction that makes a reversed scc with scc.
 *
 * has same algorithm with 'make_rev_adj_list'.
 * 
 */
graph.prototype.make_rev_scc = function(scc) {
    var rev_scc = [];

    for (var i = 0; i < scc.length; i++) {
        rev_scc.push([]);
    }

    for (var i = 0; i < scc.length; i++) {
        for (var j = 0; j < scc[i][0].length; j++) {
            rev_scc[scc[i][0][j]].push(i);
        }
    }

    this.rev_scc = rev_scc;
}

/* SCC(Strong Conected Component) with DFS
 * scc[i][0] contains edges.
 * (e.g : scc[0][0] == [1,2] means scc[0] has directed edges to scc[1], scc[2])
 * scc[i][j] (j >= 1) is a node of scc.
 * scc[i][1], scc[i][2], scc[i][3] ... are nodes that belong to scc[i]
 * 
 * reference : https://en.wikipedia.org/wiki/Kosaraju%27s_algorithm
 * 
 */
graph.prototype.make_scc = function() {
    for (var node_id = 0; node_id < this.node_num; node_id++) {
        if (!this.visited[node_id]) {
            this.front_dfs(node_id);
        }
    }

    this.visited.fill(0);

    while (this.stack.length) {
        var node_id = this.stack.pop();
        if (!this.visited[node_id]) {
            this.scc.push([]);
            this.scc[this.scc.length - 1].push([]);
            this.rev_dfs(node_id)
        }
    }

    this.condensation();
}

/* A fuction that traverse graph in dfs (for recursive method).
 *
 */
graph.prototype.front_dfs = function(node_id) {
    this.visited[node_id] = 1;
    for (var i = 1; i < this.adj_list[node_id].length; i++) {
        var next_node_id = this.adj_list[node_id][i].node_id;
        if (!this.visited[next_node_id]) {
            this.front_dfs(next_node_id);
        }
    }
    this.stack.push(node_id);
}

/* A fuction that traverse graph in dfs (for recursive method).
 * To make scc, it uses rev_adj_list.
 * 
 */
graph.prototype.rev_dfs = function(node_id) {
    this.visited[node_id] = 1;
    this.adj_list[node_id].scc_id = this.scc.length - 1;
    this.scc[this.scc.length - 1].push(this.rev_adj_list[node_id][0]);
    for (var i = 1; i < this.rev_adj_list[node_id].length; i++) {
        var next_node_id = this.rev_adj_list[node_id][i].node_id;
        if (!this.visited[next_node_id]) {
            this.rev_dfs(next_node_id)
        }
    }
}

/* A fuction that condenses redundant edges of scc.
 * 
 */
graph.prototype.condensation = function() {
    var tmp = [];
    for (var i = 0; i < this.scc.length; i++) {
        tmp.length = 0;
        for (var j = 1; j < this.scc[i].length; j++) {
            var node = this.scc[i][j];
            var o_arrow_num = this.adj_list[node.node_id].length;
            for (var k = 1; k < o_arrow_num; k++) {
                var o_node = this.adj_list[node.node_id][k].node_id
                if (this.adj_list[o_node].scc_id != this.adj_list[node.node_id].scc_id) tmp.push(this.adj_list[o_node].scc_id);
            }
        }
        this.scc[i][0] = tmp.filter(function(item, pos) {
            return tmp.indexOf(item) == pos;
        })
    }
}

graph.prototype.detect_trap = function() {
    var result = [];
    for (var i = 0; i < this.scc.length; i++) {
        if (this.scc.length != 1 && !this.scc[i][0].length) {
            for (var j = 1; j < this.scc[i].length; j++) {
                result.push(this.scc[i][j]);
            }
        }
    }
    return result;
}

graph.prototype.detect_loop = function() {
    var result = [];
    for (var i = 0; i < this.scc.length; i++) {
        if (this.scc[i][0].length >= 2) {
            for (var j = 1; j < this.scc[i].length; j++) {
                result.push(this.scc[i][j]);
            }
        }
    }
    return result;
}

/* A fuction that detect unreachable elements 
 * Assume that someone push "down" button at current screen.
 * 
 */
graph.prototype.detect_unreachable = function() {
    this.scc_visited = new Array(this.scc.length);
    var index = this.adj_list[this.focusable.indexOf(document.body.spatialNavigationSearch("down"))].scc_id;
    for (var i = 0; i < this.rev_scc[index].length; i++) {
        this.unreachable_dfs(this.rev_scc[index][i]);
    }
    return this.result;
}

graph.prototype.unreachable_dfs = function(scc_id) {
    this.scc_visited[scc_id] = 1;
    for (var j = 1; j < this.scc[scc_id].length; j++) {
        this.result.push(this.scc[scc_id][j]);
    }
    for (var i = 0; i < this.rev_scc[scc_id].length; i++) {
        if (!this.scc_visited[scc_id]) {
            this.unreachable_dfs(this.rev_scc[scc_id][i])
        }
    }
}

graph.prototype.detect_isolation = function() {
    var result = [];
    for (var i = 0; i < this.scc.length; i++) {
        if (!this.scc[i][0].length && !this.rev_scc[i].length) {
            for (var j = 1; j < this.scc[i].length; j++) {
                result.push(this.scc[i][j]);
            }
        }
    }
    return result;
}