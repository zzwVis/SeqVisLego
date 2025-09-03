import pandas as pd
from tool import find_frequent_pattern


def get_grouped_data_by_attribute(processed_data, originalData, attribute):
    def recursive_get_grouped_data_by_attribute(data):
        if isinstance(data, dict):
            grouped_data = {}
            for group_key, group_value in data.items():
                grouped_data[group_key] = recursive_get_grouped_data_by_attribute(group_value)
            return grouped_data
        elif isinstance(data, list):
            # 检查属性是否存在于原始数据中
            if attribute in originalData:
                return [originalData[attribute][i] for i in data]
            else:
                # 如果属性不存在，返回空列表
                return []
        else:
            return []

    return recursive_get_grouped_data_by_attribute(processed_data)


def extract_sequences(nested_dict):
    sequences = []

    def recurse(items):
        # 检查当前项目是不是字典
        if isinstance(items, dict):
            # 如果是字典，递归每个子项
            for item in items.values():
                recurse(item)
        elif isinstance(items, list):
            # 如果找到列表，将其包装在一个新列表中并添加到结果列表
            sequences.append(items)

    # 从最顶层字典开始递归
    recurse(nested_dict)
    return sequences


def is_subsequence(sub, full):
    n, m = len(sub),len(full)
    if n==0:
        return true

    for i in range(m-n+1):
        if full[i:i+n] == sub:
            return True
    return False
    # # 检查子序列是否存在
    # it = iter(full)
    # return all(item in it for item in sub)


def find_patterns_in_nested_data(nested_data, patterns):
    # 检查数据类型
    if isinstance(nested_data, list):
        # 如果是列表，检查其中是否包含任何模式
        return [pattern for pattern in patterns if is_subsequence(pattern, nested_data)]
    elif isinstance(nested_data, dict):
        # 如果是字典，递归处理每个键值
        return {key: find_patterns_in_nested_data(value, patterns) for key, value in nested_data.items()}
    else:
        # 其他类型的数据不处理
        return nested_data


class Table:
    def __init__(self, file_path, sheet_name):
        self.file_path = file_path
        self.sheet_name = sheet_name
        # 读取Excel文件的特定sheet
        df = pd.read_excel(file_path, sheet_name)
        # 删除包含任何空白单元格的行
        self.data = df.dropna().to_dict(orient='records')
        # self.data = pd.read_excel(file_path, sheet_name).to_dict(orient='records')

    def get_data(self):
        # 返回数据的字典表示，每个键对应一列
        return {key: [item[key] for item in self.data] for key in {k for d in self.data for k in d}}


class ItemSet:
    def __init__(self, table):
        self.table = table
        # 通过table访问data
        self.data = table.get_data()
        key = next(iter(self.data))
        self.processed_data = list(range(len(self.data[key])))
        # 按照时间排序
        has_time_values = False
        time_key = ""
        for key in self.data:
            if any(isinstance(value, pd.Timestamp) for value in self.data[key]):
                has_time_values = True
                time_key = key
                break
        if has_time_values:
            self.processed_data = sorted(self.processed_data, key=lambda i: self.data[time_key][i])

    def copy(self):
        # 创建一个新的 ItemSet 实例，复制当前实例的状态
        new_instance = ItemSet(self.table)
        new_instance.processed_data = self.processed_data.copy()
        return new_instance

    # def filter(self, attribute=None, operator=None, rule=None):
    #     if attribute is None and operator is None and rule is None:
    #         return self
    #
    #     if attribute not in self.data:
    #         return self
    #     # 规则是数字
    #     if isinstance(rule, (int, float)):
    #         # 定义操作符和比较函数的映射
    #         operator_functions = {
    #             '<': lambda x, y: x < y,
    #             '=': lambda x, y: x == y,
    #             '>': lambda x, y: x > y,
    #             '>=': lambda x, y: x >= y,
    #             '<=': lambda x, y: x <= y,
    #         }
    #         # 数字比较
    #         if operator in operator_functions:
    #             compare_function = operator_functions[operator]
    #             result = [i for i in self.processed_data if compare_function(self.data[attribute][i], rule)]
    #     elif isinstance(rule, list):
    #         if self.data.get(attribute) and (isinstance(self.data[attribute][0], str) or "id" in attribute.lower()):
    #             result = [i for i in self.processed_data if self.data[attribute][i] in rule]
    #         elif self.data[attribute] and isinstance(self.data[attribute][0], (int, float)):
    #             lower_bound = float(rule[0])
    #             upper_bound = float(rule[1])
    #             # 检查 rule 是否有至少两个元素
    #             if len(rule) == 2:
    #                 result = [i for i in self.processed_data if lower_bound <= self.data[attribute][i] <= upper_bound]
    #             else:
    #                 raise ValueError("Rule must contain at least two elements.")
    #
    #     else:
    #         # 字符串比较
    #         operator_functions = {
    #             '<': lambda x, y: x in y,
    #             '<=': lambda x, y: x in y,
    #             '=': lambda x, y: x == y,
    #         }
    #         if operator in operator_functions:
    #             compare_function = operator_functions[operator]
    #             result = [i for i in self.processed_data if compare_function(rule, self.data[attribute][i])]
    #     new_instance = self.copy()
    #     new_instance.processed_data = result
    #     return new_instance

    # def filter(self, attribute=None, operator=None, rule=None):
    #     if attribute is None and operator is None and rule is None:
    #         return self
    #
    #     if attribute not in self.data:
    #         return self
    #
    #     # 判断processed_data是否经过了group操作
    #     if isinstance(self.processed_data, dict):
    #         # 处理已经group的情况
    #         # 对每个分组进行过滤
    #         filtered_data = {}
    #         for group_value, indices in self.processed_data.items():
    #             # 使用与原来的逻辑相同的方式过滤每个组的数据
    #             if isinstance(rule, (int, float)):
    #                 operator_functions = {
    #                     '<': lambda x, y: x < y,
    #                     '=': lambda x, y: x == y,
    #                     '>': lambda x, y: x > y,
    #                     '>=': lambda x, y: x >= y,
    #                     '<=': lambda x, y: x <= y,
    #                 }
    #                 if operator in operator_functions:
    #                     compare_function = operator_functions[operator]
    #                     # 过滤当前组的数据
    #                     filtered_indices = [i for i in indices if compare_function(self.data[attribute][i], rule)]
    #                     if filtered_indices:
    #                         filtered_data[group_value] = filtered_indices
    #
    #             elif isinstance(rule, list):
    #                 if self.data.get(attribute) and (
    #                         isinstance(self.data[attribute][0], str) or "id" in attribute.lower()):
    #                     # 如果规则是列表并且数据是字符串或包含"ID"，按规则进行匹配
    #                     filtered_indices = [i for i in indices if self.data[attribute][i] in rule]
    #                     if filtered_indices:
    #                         filtered_data[group_value] = filtered_indices
    #                 elif self.data[attribute] and isinstance(self.data[attribute][0], (int, float)):
    #                     # 数字区间过滤
    #                     lower_bound = float(rule[0])
    #                     upper_bound = float(rule[1])
    #                     filtered_indices = [i for i in indices if lower_bound <= self.data[attribute][i] <= upper_bound]
    #                     if filtered_indices:
    #                         filtered_data[group_value] = filtered_indices
    #
    #         # 返回过滤后的新实例
    #         new_instance = self.copy()
    #         new_instance.processed_data = filtered_data
    #         return new_instance
    #
    #     else:
    #         # 处理未经过group的情况
    #         # 规则是数字
    #         if isinstance(rule, (int, float)):
    #             operator_functions = {
    #                 '<': lambda x, y: x < y,
    #                 '=': lambda x, y: x == y,
    #                 '>': lambda x, y: x > y,
    #                 '>=': lambda x, y: x >= y,
    #                 '<=': lambda x, y: x <= y,
    #             }
    #             # 数字比较
    #             if operator in operator_functions:
    #                 compare_function = operator_functions[operator]
    #                 result = [i for i in self.processed_data if compare_function(self.data[attribute][i], rule)]
    #                 # 返回过滤后的新实例
    #                 new_instance = self.copy()
    #                 new_instance.processed_data = result
    #                 return new_instance
    #
    #         elif isinstance(rule, list):
    #             if self.data.get(attribute) and (isinstance(self.data[attribute][0], str) or "id" in attribute.lower()):
    #                 # 处理字符串或ID的匹配
    #                 result = [i for i in self.processed_data if self.data[attribute][i] in rule]
    #                 new_instance = self.copy()
    #                 new_instance.processed_data = result
    #                 return new_instance
    #             elif self.data[attribute] and isinstance(self.data[attribute][0], (int, float)):
    #                 lower_bound = float(rule[0])
    #                 upper_bound = float(rule[1])
    #                 result = [i for i in self.processed_data if lower_bound <= self.data[attribute][i] <= upper_bound]
    #                 new_instance = self.copy()
    #                 new_instance.processed_data = result
    #                 return new_instance

    # def filter(self, attribute=None, operator=None, rule=None):
    #     if attribute is None and operator is None and rule is None:
    #         return self
    #
    #     if attribute not in self.data:
    #         return selfshi
    #     def filter_nested_data(data):
    #         # 如果当前数据是字典（表示分组）
    #         if isinstance(data, dict):
    #             filtered_data = {}
    #             for key, value in data.items():
    #                 # 递归处理嵌套的分组
    #                 filtered_value = filter_nested_data(value)
    #                 # 如果过滤后的值不为空，则保留该分组
    #                 if filtered_value is not None:
    #                     filtered_data[key] = filtered_value
    #             # 如果过滤后的字典不为空，则返回
    #             return filtered_data if filtered_data else None
    #
    #         # 如果当前数据是列表（表示需要过滤的具体数据）
    #         elif isinstance(data, list):
    #             if isinstance(rule, (int, float)):
    #                 operator_functions = {
    #                     '<': lambda x, y: x < y,
    #                     '=': lambda x, y: x == y,
    #                     '>': lambda x, y: x > y,
    #                     '>=': lambda x, y: x >= y,
    #                     '<=': lambda x, y: x <= y,
    #                 }
    #                 if operator in operator_functions:
    #                     compare_function = operator_functions[operator]
    #                     # 检查列表中是否存在满足条件的项
    #                     if any(compare_function(self.data[attribute][i], rule) for i in data):
    #                         # 如果存在，保留整个列表
    #                         return data
    #                     else:
    #                         # 否则丢弃整个列表
    #                         return None
    #
    #             elif isinstance(rule, list):
    #                 if self.data.get(attribute) and (
    #                         isinstance(self.data[attribute][0], str) or "id" in attribute.lower()):
    #                     # 如果规则是列表并且数据是字符串或包含"ID"，按规则进行匹配
    #                     if any(self.data[attribute][i] in rule for i in data):
    #                         # 如果存在，保留整个列表
    #                         return data
    #                     else:
    #                         # 否则丢弃整个列表
    #                         return None
    #                 elif self.data[attribute] and isinstance(self.data[attribute][0], (int, float)):
    #                     # 数字区间过滤
    #                     lower_bound = float(rule[0])
    #                     upper_bound = float(rule[1])
    #                     if any(lower_bound <= self.data[attribute][i] <= upper_bound for i in data):
    #                         # 如果存在，保留整个列表
    #                         return data
    #                     else:
    #                         # 否则丢弃整个列表
    #                         return None
    #
    #         # 如果数据类型不是字典或列表，直接返回
    #         return data
    #
    #     # 对 processed_data 进行过滤
    #     filtered_data = filter_nested_data(self.processed_data)
    #
    #     # 返回过滤后的新实例
    #     new_instance = self.copy()
    #     new_instance.processed_data = filtered_data
    #     return new_instance

    def filter(self, attribute=None, operator=None, rule=None):
        if attribute is None and operator is None and rule is None:
            return self

        if attribute not in self.data:
            return self

        def should_keep_item(index):
            """判断单个数据项是否满足条件"""
            if isinstance(rule, (int, float)):
                operator_functions = {
                    '<': lambda x: x < rule,
                    '=': lambda x: x == rule,
                    '>': lambda x: x > rule,
                    '>=': lambda x: x >= rule,
                    '<=': lambda x: x <= rule,
                }
                if operator in operator_functions:
                    return operator_functions[operator](self.data[attribute][index])
            elif isinstance(rule, list):
                if isinstance(self.data[attribute][0], str) or "id" in attribute.lower():
                    return self.data[attribute][index] in rule
                else:
                    lower = float(rule[0])
                    upper = float(rule[1])
                    return lower <= self.data[attribute][index] <= upper
            return False

        def process_dict(data_dict):
            """处理字典结构：保留存在满足条件项的分组"""
            result = {}
            for key, value in data_dict.items():
                if isinstance(value, dict):
                    # 处理嵌套字典
                    processed = process_dict(value)
                    if processed:
                        result[key] = processed
                elif isinstance(value, list):
                    # 对于字典中的列表，只检查是否存在满足条件的项
                    if any(should_keep_item(i) for i in value):
                        result[key] = value.copy()  # 保留完整列表
            return result if result else None

        def process_list(data_list):
            """处理列表结构：直接过滤"""
            return [i for i in data_list if should_keep_item(i)]

        # 根据输入数据类型选择处理方式
        if isinstance(self.processed_data, dict):
            filtered_data = process_dict(self.processed_data)
        elif isinstance(self.processed_data, list):
            filtered_data = process_list(self.processed_data)
        else:
            filtered_data = self.processed_data

        new_instance = self.copy()
        new_instance.processed_data = filtered_data
        return new_instance

    # def filter(self, attribute=None, operator=None, rule=None):
    #     if attribute is None and operator is None and rule is None:
    #         return self
    #
    #     if attribute not in self.data:
    #         return self
    #
    #     def filter_nested_data(data):
    #         # 如果当前数据是字典（表示分组）
    #         if isinstance(data, dict):
    #             filtered_data = {}
    #             for key, value in data.items():
    #                 # 递归处理嵌套的分组
    #                 filtered_value = filter_nested_data(value)
    #                 # 如果过滤后的值不为空，则保留该分组
    #                 if filtered_value is not None:
    #                     filtered_data[key] = filtered_value
    #             # 如果过滤后的字典不为空，则返回
    #             return filtered_data if filtered_data else None
    #
    #         # 如果当前数据是列表（表示需要过滤的具体数据）
    #         elif isinstance(data, list):
    #             if isinstance(rule, (int, float)):
    #                 operator_functions = {
    #                     '<': lambda x, y: x < y,
    #                     '=': lambda x, y: x == y,
    #                     '>': lambda x, y: x > y,
    #                     '>=': lambda x, y: x >= y,
    #                     '<=': lambda x, y: x <= y,
    #                 }
    #                 if operator in operator_functions:
    #                     compare_function = operator_functions[operator]
    #                     # 过滤列表中的项，保留满足条件的项
    #                     filtered_list = [i for i in data if compare_function(self.data[attribute][i], rule)]
    #                     return filtered_list if filtered_list else None
    #
    #             elif isinstance(rule, list):
    #                 if self.data.get(attribute) and (
    #                         isinstance(self.data[attribute][0], str) or "id" in attribute.lower()):
    #                     # 如果规则是列表并且数据是字符串或包含"ID"，按规则进行匹配
    #                     filtered_list = [i for i in data if self.data[attribute][i] in rule]
    #                     return filtered_list if filtered_list else None
    #                 elif self.data[attribute] and isinstance(self.data[attribute][0], (int, float)):
    #                     # 数字区间过滤
    #                     lower_bound = float(rule[0])
    #                     upper_bound = float(rule[1])
    #                     filtered_list = [i for i in data if lower_bound <= self.data[attribute][i] <= upper_bound]
    #                     return filtered_list if filtered_list else None
    #
    #         # 如果数据类型不是字典或列表，直接返回
    #         return data
    #
    #     # 对 processed_data 进行过滤
    #     filtered_data = filter_nested_data(self.processed_data)
    #
    #     # 返回过滤后的新实例
    #     new_instance = self.copy()
    #     new_instance.processed_data = filtered_data
    #     return new_instance

    def filterTimeRange(self, startTime, endTime):
        # 查找包含"时间"的属性名
        time_attribute = [attr for attr in self.data if "时间" in attr]
        if not time_attribute:
            return self  # 没有找到包含"时间"的属性名，返回原始数据
        # 将时间字符串转换为 datetime 对象
        startTime = pd.to_datetime(startTime)
        endTime = pd.to_datetime(endTime)
        # 过滤时间范围
        result = []
        for i in self.processed_data:
            for attr in time_attribute:
                if startTime <= self.data[attr][i] <= endTime:
                    result.append(i)
                    break
        new_instance = self.copy()
        new_instance.processed_data = result
        return new_instance

    # def align(self, attribute=None, operator="=",rule=None):
    #     if attribute is None and rule is None:
    #         return self
    #
    #     def align_data(processed_data, data, attribute, rule):
    #         aligned_processed_data = {}
    #         max_offset = 0  # 记录最大的偏移量
    #
    #         # 第一步：找到每个分组中指定属性值第一次出现的位置
    #         offsets = {}
    #         for key, indices in processed_data.items():
    #             # 从原始数据中提取指定属性的值
    #             attr_values = data[attribute]
    #             # 获取当前分组对应的属性值
    #             group_values = [attr_values[i] for i in indices]
    #
    #             # 检查是否有指定属性值
    #             if rule in group_values:
    #                 # 找到指定属性值第一次出现的位置
    #                 offset = group_values.index(rule)
    #                 offsets[key] = offset
    #                 # 更新最大偏移量
    #                 if offset > max_offset:
    #                     max_offset = offset
    #             else:
    #                 # 如果没有找到指定值，则偏移量为 -1
    #                 offsets[key] = -1
    #
    #         # 第二步：根据最大偏移量对齐所有分组的索引
    #         for key, indices in processed_data.items():
    #             offset = offsets[key]
    #             if offset == -1:
    #                 # 如果没有找到指定值，则不进行对齐
    #                 continue
    #                 # aligned_processed_data[key] = indices
    #             else:
    #                 # 计算需要填充的 None 的数量
    #                 padding = max_offset - offset
    #                 # 对齐索引
    #                 aligned_indices = [None] * padding + indices
    #                 aligned_processed_data[key] = aligned_indices
    #
    #         return aligned_processed_data
    #
    #     # 对齐数据
    #     aligned_data = align_data(self.processed_data, self.data, attribute, rule)
    #
    #     new_instance = self.copy()
    #     new_instance.processed_data = aligned_data
    #     return new_instance

    def align(self, attribute=None, operator="=", rule=None):
        if attribute is None and rule is None:
            return self

        def align_data(processed_data, data, attribute, rule):
            # 递归对齐函数
            def recursive_align(data_node, path=None):
                if path is None:
                    path = []

                if isinstance(data_node, dict):
                    # 如果是字典，递归处理每个值
                    result = {}
                    max_offset = 0
                    offsets = {}

                    # 第一步：收集所有子节点的偏移量
                    for key, child_node in data_node.items():
                        child_result, child_offset = recursive_align(child_node, path + [key])
                        offsets[key] = child_offset
                        if child_offset > max_offset:
                            max_offset = child_offset

                    # 第二步：应用对齐
                    for key, child_node in data_node.items():
                        child_result, child_offset = recursive_align(child_node, path + [key])
                        if child_offset == -1:
                            result[key] = child_result
                        else:
                            padding = max_offset - child_offset
                            if isinstance(child_result, list):
                                # 如果是列表，在前面填充None
                                result[key] = [None] * padding + child_result
                            else:
                                # 如果是字典，在每个子列表前填充None
                                aligned_child = {}
                                for k, v in child_result.items():
                                    if isinstance(v, list):
                                        aligned_child[k] = [None] * padding + v
                                    else:
                                        aligned_child[k] = v
                                result[key] = aligned_child

                    return result, max_offset

                elif isinstance(data_node, list):
                    # 如果是列表，处理对齐逻辑
                    attr_values = data[attribute]
                    group_values = [attr_values[i] for i in data_node]

                    if rule in group_values:
                        offset = group_values.index(rule)
                        return data_node, offset
                    else:
                        return data_node, -1
                else:
                    # 其他情况（如叶子节点）直接返回
                    return data_node, 0

            # 执行递归对齐
            aligned_data, _ = recursive_align(processed_data)
            return aligned_data

        # 对齐数据
        aligned_data = align_data(self.processed_data, self.data, attribute, rule)

        new_instance = self.copy()
        new_instance.processed_data = aligned_data
        return new_instance
    def sum(self):
        # 找到数值型属性
        numeric_attributes = [
            attr for attr, values in self.data.items()
            if all(isinstance(v, (int, float)) for v in values)
        ]

        # 初始化结果字典
        sum_result = {attr: [] for attr in numeric_attributes}

        # 找到最大长度
        max_length = max(
            len(indices) for indices in self.processed_data.values()
        )

        # 对每个数值型属性进行处理
        for attr in numeric_attributes:
            # 初始化当前属性的求和列表
            attr_sum = [0] * max_length

            # 遍历每个分组
            for group, indices in self.processed_data.items():
                # # 如果当前分组的长度不足，则跳过
                # if len(indices) < max_length:
                #     continue

                # 提取当前分组的数值数据
                group_values = [
                    self.data[attr][i] if i is not None else 0
                    for i in indices
                ]
                # 填充到最大长度
                group_values += [0] * (max_length - len(group_values))
                # 逐元素相加
                attr_sum = [x + y for x, y in zip(attr_sum, group_values)]

            # 将当前属性的求和结果存入 sum_result
            sum_result[attr] = attr_sum

        new_instance = self.copy()
        new_instance.processed_data = {'sum': sum_result}
        return new_instance

    def avg(self):
        # 找到数值型属性
        numeric_attributes = [
            attr for attr, values in self.data.items()
            if all(isinstance(v, (int, float)) for v in values)
        ]

        # 初始化结果字典
        avg_result = {attr: [] for attr in numeric_attributes}

        # 找到最大长度
        max_length = max(
            len(indices) for indices in self.processed_data.values()
        )

        # 对每个数值型属性进行处理
        for attr in numeric_attributes:
            # 初始化当前属性的求和列表和有效元素计数列表
            attr_sum = [0] * max_length
            attr_count = [0] * max_length

            # 遍历每个分组
            for group, indices in self.processed_data.items():

                # 提取当前分组的数值数据，并统计有效元素的个数
                for i, idx in enumerate(indices):
                    if idx is not None:
                        attr_sum[i] += self.data[attr][idx]
                        attr_count[i] += 1

            # 计算平均值，避免除以零
            attr_avg = [
                (attr_sum[i] / attr_count[i]) if attr_count[i] != 0 else 0
                for i in range(max_length)
            ]

            # 将当前属性的平均值结果存入 avg_result
            avg_result[attr] = attr_avg

        new_instance = self.copy()
        new_instance.processed_data = {'avg': avg_result}
        return new_instance

    def _groupby(self, data, attribute, indices):
        """给定数据、属性和索引列表，按属性进行分组"""
        grouped = {}
        for index in indices:
            attr_value = data[attribute][index]
            if attr_value not in grouped:
                grouped[attr_value] = []
            grouped[attr_value].append(index)
        return grouped

    def group(self, attribute):
        if attribute not in self.data:
            return self
        new_instance = self.copy()
        if isinstance(new_instance.processed_data, list):
            # 直接对列表进行分组
            new_instance.processed_data = self._groupby(new_instance.data, attribute, new_instance.processed_data)
        elif isinstance(new_instance.processed_data, dict):
            # 迭代处理嵌套字典
            stack = [(None, new_instance.processed_data)]
            while stack:
                parent_key, current_data = stack.pop()
                for key, value in current_data.items():
                    if isinstance(value, list):
                        # 对列表进行分组
                        current_data[key] = self._groupby(new_instance.data, attribute, value)
                    elif isinstance(value, dict):
                        # 如果是字典，加入堆栈以便后续处理
                        stack.append((key, value))
        return new_instance

    # pattern函数用在多次分组之后
    def pattern(self, attribute, support="30%"):
        if attribute not in self.data:
            return self
        new_instance = self.copy()
        grouped_data_by_attribute = get_grouped_data_by_attribute(self.processed_data, self.data, attribute)
        sequences = extract_sequences(grouped_data_by_attribute)
        patternList = find_frequent_pattern(sequences, support)
        pattern_in_seq = find_patterns_in_nested_data(grouped_data_by_attribute, patternList)
        new_instance.processed_data = pattern_in_seq
        return new_instance

    def segment(self):
        return self

    # def flatten(self):
    #     new_instance = self.copy()
    #
    #     def recursive_flatten(data, prefix=''):
    #         flattened = {}
    #         if isinstance(data, dict):
    #             for key, value in data.items():
    #                 flattened.update(recursive_flatten(value, prefix=f"{prefix}{key}✖"))
    #         elif isinstance(data, list):
    #             flattened[prefix[:-1]] = data
    #         return flattened
    #
    #     if isinstance(new_instance.processed_data, dict):
    #         new_instance.processed_data = recursive_flatten(new_instance.processed_data)
    #         return new_instance
    #     else:
    #         return {}

    def flatten(self):
        new_instance = self.copy()

        def recursive_flatten(data):
            flattened = {}
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, dict):
                        for inner_key, inner_value in value.items():
                            # Concatenate the keys with '✖'
                            new_key = f"{key}✖{inner_key}"
                            flattened[new_key] = inner_value
                    else:
                        flattened[key] = value
            return flattened

        if isinstance(new_instance.processed_data, dict):
            new_instance.processed_data = recursive_flatten(new_instance.processed_data)
            return new_instance
        else:
            return {}

    def view_type(self, type):
        return self

    def aggregate(self):
        return self

    def unique_attr(self, *attributes):
        unique_values_result = {}

        for attribute in attributes:
            if attribute not in self.data:
                continue

            def process_data(data):
                if isinstance(data, list):
                    # 如果是列表，提取该属性的唯一值
                    return list(set(self.data[attribute][i] for i in data))
                elif isinstance(data, dict):
                    # 如果是字典，递归处理每个值
                    return {key: process_data(value) for key, value in data.items()}
                else:
                    return []

            unique_values_result[attribute] = process_data(self.processed_data)

        return unique_values_result

    def count(self, attribute=None, operator=None, myvalue=None):
        if attribute and attribute not in self.data:
            return {attribute: 0}

        def process_data(data):
            if isinstance(data, list):
                if operator:
                    if operator in ["<=", "<"]:
                        return sum(1 for i in data if myvalue in self.data[attribute][i])
                    else:
                        return sum(1 for i in data if self.data[attribute][i] == myvalue)
                else:
                    return sum(1 for i in data)
            elif isinstance(data, dict):
                # 如果是字典，递归处理每个值
                return {key: process_data(value) for key, value in data.items()}
            else:
                return 0

        # 检查是否使用了 group
        if isinstance(self.processed_data, dict):
            if attribute:
                return {attribute: process_data(self.processed_data)}
            else:
                return {"": process_data(self.processed_data)}
        else:
            result = {attribute: process_data(self.processed_data)}
            return {"": result}

    def unique_count(self, *attributes):
        unique_count_result = {}
        attr_string = "*".join(attributes)

        def process_data(data):
            if isinstance(data, list):
                combinations = set(tuple(self.data[attr][item] for attr in attributes) for item in data)
                return len(combinations)
            elif isinstance(data, dict):
                # 如果数据是字典，递归处理每个键
                return {key: process_data(value) for key, value in data.items()}
            else:
                return 0

        if isinstance(self.processed_data, dict):
            if not attributes or not self.processed_data:
                return {}
            unique_count_result[attr_string] = process_data(self.processed_data)

        else:
            unique_combinations = set()
            for index in self.processed_data:
                if all(attribute in self.data for attribute in attributes):
                    # 创建当前记录的属性组合
                    combination = tuple(self.data[attribute][index] for attribute in attributes)
                    unique_combinations.add(combination)
            unique_combination_count = len(unique_combinations)
            unique_count_result[""] = {attr_string: unique_combination_count}

        return unique_count_result

    # 求交集函数
    def intersection_set(self, another_set, feature=None):
        new_instance = self.copy()
        if self.processed_data and another_set.processed_data:
            set1 = self.processed_data
            set2 = another_set.processed_data
        if feature is None:
            # 如果没有提供特征，则直接返回两个集合的交集
            new_instance.processed_data = list(set(set1).intersection(set2))
        elif feature in self.data:
            # 如果提供了特征，求特征值的交集
            set1_values = set(self.data[feature][i] for i in set1)
            set2_values = set(self.data[feature][i] for i in set2)
            # 找出在这两个特征集合中共有的值
            common_values = set1_values.intersection(set2_values)
            # 找出具有共有特征值的索引
            new_instance.processed_data = [i for i in range(len(self.data[feature])) if
                                           self.data[feature][i] in common_values]
        else:
            new_instance.processed_data = []
        return new_instance

    # 求差集函数
    def difference_set(self, another_set, feature=None):
        new_instance = self.copy()
        if self.processed_data and another_set.processed_data:
            set1 = self.processed_data
            set2 = another_set.processed_data
        if feature is None:
            # 如果没有提供特征，则直接返回两个集合的差集
            new_instance.processed_data = list(set(set1) - set(set2))
        elif feature in self.data:
            # 如果提供了特征，求特征值的交集
            set1_values = set(self.data[feature][i] for i in set1)
            set2_values = set(self.data[feature][i] for i in set2)
            # 求差集
            difference_values = set1_values - set2_values
            # 找出具有差集特征值的索引
            new_instance.processed_data = [i for i in range(len(new_instance.data[feature])) if
                                           new_instance.data[feature][i] in difference_values]
        else:
            new_instance.processed_data = []
        return new_instance

    def get_list_data(self):
        # 从每个属性中选择与 processed_data 索引相匹配的元素
        return {key: [self.data[key][i] for i in self.processed_data] for key in self.data}

    def get_grouped_data(self):
        def recursive_get_grouped_data(data):
            if isinstance(data, dict):
                grouped_data = {}
                for group_key, group_value in data.items():
                    grouped_data[group_key] = recursive_get_grouped_data(group_value)
                return grouped_data
            elif isinstance(data, list):
                group_data = {}
                for key in self.data:
                    # group_data[key] = [self.data[key][i] for i in data]
                    group_data[key] = []
                    for i in data:
                        if i is None:
                            # 如果元素是 None，直接保留 None
                            group_data[key].append(None)
                        else:
                            # 否则从 self.data 中获取对应的值
                            group_data[key].append(self.data[key][i])
                return group_data
            else:
                return {}

        return recursive_get_grouped_data(self.processed_data)

    def get_result(self):
        # 返回当前数据处理的结果
        return self.processed_data
