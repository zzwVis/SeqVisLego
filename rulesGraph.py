class OperationGraph:
    def __init__(self):
        self.graph = {}

    def add_operation(self, sequence, next_operations):
        # 储存每个序列到下一步操作的映射
        self.graph[tuple(sequence)] = next_operations

    def get_next_operations(self, sequence):
        # 直接获取序列的下一步操作
        direct_next_ops = self.graph.get(tuple(sequence), None)
        if direct_next_ops is not None:
            return direct_next_ops
        # 如果直接获取失败，基于路径最后一个操作来获取可能的下一步操作
        if sequence:
            last_op_sequence = [sequence[-1]]
            return self.graph.get(tuple(last_op_sequence), [])
        else:
            return []


class VisualGraph:
    def __init__(self):
        # 规则映射：操作序列 -> 可视化构型列表
        self.rules = {}

    def add_operation(self, operations, visualization_types):
        self.rules[tuple(operations)] = visualization_types

    def get_visualization(self, operations):
        # 尝试直接获取序列的下一步操作
        direct_next_ops = self.rules.get(tuple(operations), None)
        if direct_next_ops is not None:
            return direct_next_ops
        # 如果直接获取失败，尝试应用复杂规则
        return self.check_complex_rule(operations)

    def check_complex_rule(self, operations):
        groupNum = operations.count("group")
        flattenNum = operations.count("flatten")
        # 计算group_by和flatten的数量差
        diff = groupNum - flattenNum

        # 检查是否以count/unique_count结束
        if operations[-1] == "count" or operations[-1] == "unique_count":
            if diff == 1:
                return ["bar chart", "pie chart",'table']
            elif diff > 1:
                return ["sunburst",'table']
        # 检查是否以unique_attr结束
        if operations[-1] == "unique_attr":
            return ["table"]
        # 检查是否以filter结束
        if operations[-1] == "filter":
            return ["table", "scatter", "timeline"]
        if operations[-1] == "align":
            return ["timeline","sankey"]
        if operations[-1] == "sum":
            return ["line chart"]
        if operations[-1] == "avg":
            return ["line chart"]
        if operations[-1] == "pattern":
            return ['timeline']
        if operations[-1] == "segment":
            return ['timeline',"sankey"]
        else:
            if groupNum > 1:
                return ['timeline', 'sankey', 'line chart', 'heatmap','table']
            if groupNum == 1:
                return ['timeline', 'sankey', 'line chart', 'heatmap','table']
        return None

    def find_paths_to_visualization(self, target_visualization):
        # 找到所有可以达到目标可视化构型的操作序列
        paths = []
        for sequence, visuals in self.rules.items():
            if target_visualization in visuals:
                paths.append(sequence)
        return paths

    def get_missing_operations_for_visualization(self, current_sequence, target_visualization):
        # 检查当前序列是否已经可以通过静态定义或复杂规则得到目标可视化
        current_ops = self.get_visualization(current_sequence)
        if target_visualization in current_ops:
            return []  # 当前序列已满足目标

        # 尝试不同的操作来查找缺失的步骤
        potential_operations = ["count", "unique_count", "group", "unique_attr", "filter", "flatten"]
        for op in potential_operations:
            test_sequence = current_sequence + [op]
            # 检查静态定义的操作映射
            next_ops = self.get_visualization(test_sequence)
            if target_visualization in next_ops:
                return [op]
            # 检查复杂规则
            elif target_visualization in self.check_complex_rule(test_sequence):
                return [op]

        return []  # 如果没有找到匹配项，返回空列表

# 创建操作图
op_graph = OperationGraph()
# 创建可视化构型图
vis_graph = VisualGraph()

# 添加操作序列及其可能的下一步操作
op_graph.add_operation([], ["filter", "unique_attr", "unique_count", "group"])
op_graph.add_operation(["filter"], ["filter", "group", "unique_count","segment","pattern", "unique_attr","align"])
op_graph.add_operation(["group"], ["group",  "filter", "unique_attr", "count", "flatten","unique_count", "pattern","align","sum","avg","segment"])
op_graph.add_operation(["flatten"], ["group", "count", "unique_attr", "flatten", "pattern","unique_count","align","sum","avg"])
op_graph.add_operation(["pattern"], ["count"])
op_graph.add_operation(["unique_attr"], [])
op_graph.add_operation(["count"], [])
op_graph.add_operation(["unique_count"], [])
op_graph.add_operation(["group","align"], ["filter","sum",'avg'])

# 添加可视化序列及其可能的下一步可视化构型
vis_graph.add_operation([], ["table"])
vis_graph.add_operation(["filter"], ["table"])
vis_graph.add_operation(["unique_attr"], ["table"])
vis_graph.add_operation(["count"], ["bar chart", "pie chart", "table"])
vis_graph.add_operation(["unique_count"], ["bar chart", "pie chart"])
vis_graph.add_operation(["sum"], ["line chart"])
vis_graph.add_operation(["avg"], ["line chart"])
vis_graph.add_operation(["filter", "unique_count"], ["bar chart", "pie chart"])
vis_graph.add_operation(["filter", "unique_attr"], ["table"])

# 查找缺少的操作
# print(vis_graph.get_missing_operations_for_visualization(['filter', 'group',"group", "pattern"], 'sunBurst'))  # 应该返回 ['count']
# print(vis_graph.get_missing_operations_for_visualization(["group", "group", "flatten"], 'sunBurst'))
# print(vis_graph.get_visualization(["filter"]))
# print(vis_graph.get_visualization(["filter","unique_count"]))
