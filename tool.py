from dateutil.parser import parse
import subprocess
import tempfile
from pathlib import Path

# 实现时间筛选功能
def insert_after_first_dot(original, insert_template, start_time, end_time):
    dot_index = original.find('.')
    if dot_index == -1:
        return original
    # 使用参数格式化要插入的字符串
    formatted_insertion = insert_template.format(startTime=start_time, endTime=end_time)
    return original[:dot_index + 1] + formatted_insertion + "." + original[dot_index + 1:]


def add_hierarchy_info(data, seq_view):
    # 创建一个新的字典来存储带有层级信息的数据
    new_data = {}
    # 遍历原始数据
    for username, user_data in data.items():
        events = user_data[seq_view]
        # 为每个事件添加层级信息，并将新数据存储在新的字典中
        new_data[username] = {
            **user_data,
            seq_view: [f"{event}@{index}" for index, event in enumerate(events)]
        }
    return new_data

def find_time_key(data):
    for key, value in data.items():
        if "时间" in key or "time" in key.lower():
            return key
    return None


def add_hierarchy_info_timeline(data, seq_view):
    # 创建一个新的字典来存储带有层级信息的数据
    new_data = {}
    # 遍历原始数据
    for username, user_data in data.items():
        events = user_data[seq_view]
        # 为每个事件添加层级信息，并将新数据存储在新的字典中
        new_data[username] = {
            **user_data,
            seq_view: [f"{event}@{index}@{username}" for index, event in enumerate(events)]
        }
    return new_data

def transform_sequence(events):
    # 初始化结果列表
    result = []
    # 初始化跟踪变量
    current_name = ":"
    count = 0
    start_index = 0

    for i, event in enumerate(events):
        if event.split("@")[0] != current_name.split("@")[0]:
            # 如果当前事件与跟踪的事件不同，并且已经跟踪了至少一个事件（count > 0）
            if count > 0:
                # 将跟踪的事件信息添加到结果列表
                result.append({"name": current_name, "count": count, "index": start_index})
            # 重置跟踪变量以跟踪新的事件
            current_name = event
            count = 1
            start_index = i
        else:
            # 如果当前事件与跟踪的事件相同，增加计数
            count += 1

    # 循环结束后，添加最后一个事件的信息（如果有）
    if count > 0:
        result.append({"name": current_name, "count": count, "index": start_index})

    return result


def generate_dict(n, string):
    return {str(i): string for i in range(1, n + 1)}


def process_sankey_data(data, seq_view, view_type):
    nodes = []
    links = []
    # 遍历原始数据e
    for username, user_data in data.items():
        events = user_data[seq_view]
        timeKey = find_time_key(user_data)
        # 如果事件只有一个元素，直接添加节点
        if len(events) == 1:
            data_by_key = {}
            if(view_type=="timeline"):
                # 遍历所有的键
                for key in user_data.keys():
                    # 将每个键对应的值存储在字典中
                    if key == seq_view:
                        data_by_key[key] = user_data[key][0]
                    # if key == timeKey:
                    #     timeValue = user_data[key][0]
                # 查找或添加节点
                source_node = next((node for node in nodes if node['name'] == events[0]),
                                   {'name': events[0], 'data': data_by_key, 'time': ""})
                target_node = next((node for node in nodes if node['name'] == 'unknown'),
                                   {'name': 'unknown', "data": {}, 'time': ""})
                nodes.append(source_node)
                nodes.append(target_node)
                links.append(
                    {'head': {'name': ''}, 'tail': {'name': ''}, 'source': source_node, 'target': target_node, 'value': 1})

        else:
            # 遍历事件，构建节点和链接
            for i in range(len(events) - 1):
                source = events[i]
                target = events[i + 1]

                # 如果 source 是 " "，则跳过当前迭代
                if source.split("@")[0] == " " or source.split("@")[0] == "No" or target.split("@")[0] == " " or target.split("@")[0] == "No":
                    continue

                # 初始化字典
                source_data_by_key = {}
                target_data_by_key = {}
                source_time = ""
                target_time = ""
                for key in user_data.keys():
                    # 将每个键对应的值存储在字典中
                    if key == seq_view:
                        source_data_by_key[key] = user_data[key][i]
                        target_data_by_key[key] = user_data[key][i + 1]
                    if key == timeKey:
                        source_time = user_data[key][i]
                        target_time = user_data[key][i + 1]
                # 查找或添加节点
                source_node = next((node for node in nodes if node['name'] == source),
                                   {'name': source, 'data': source_data_by_key, 'time': source_time})
                target_node = next((node for node in nodes if node['name'] == target),
                                   {'name': target, 'data': target_data_by_key, 'time': target_time})
                if source_node not in nodes:
                    nodes.append(source_node)
                if target_node not in nodes:
                    nodes.append(target_node)
                # 添加链接
                link = next((link for link in links if link['source'] == source_node and link['target'] == target_node),
                            None)
                if link:
                    link['value'] += 1
                else:
                    links.append(
                        {'head': {'name': ""}, 'tail': {'name': ""}, 'source': source_node,
                         'target': target_node,
                         'value': 1})
    return {'nodes': nodes, 'links': links}


#  获取嵌套数据中最长数组的长度
def get_max_list_length(data):
    def get_max_list_length_recursively(data, depth=0):
        max_length = 0
        for value in data.values():
            if isinstance(value, dict):
                max_length = max(max_length, get_max_list_length_recursively(value, depth + 1))
            elif isinstance(value, list):
                max_length = max(max_length, len(value))
        return max_length

    return get_max_list_length_recursively(data)


# 提取数组中指定下标的数据
def extract_data(data, index):
    def extract_recursive(obj):
        if isinstance(obj, dict):
            return {key: extract_recursive(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            if index < len(obj):
                return [obj[index]]
            else:
                return []
        else:
            return obj

    return extract_recursive(data)

# 将数据处理成能用于绘制旭日图的格式
def process_data(data):
    def process_recursive(obj):
        if isinstance(obj, dict):
            return {key: process_recursive(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            if not obj or (len(obj) == 1 and obj[0] is None):
                return {"": 0}
            else:
                return {item: 1 for item in obj}
        else:
            return obj

    return process_recursive(data)


def process_agg_sankey_data(data):
    nodes = []
    links = []
    list_range = get_max_list_length(data)
    for i in range(0, list_range-1):
        currentData = process_data(extract_data(data, i))
        nextData = process_data(extract_data(data, i+1))
        # 遍历原始数据
        for username, events in currentData.items():
            # 如果事件只有一个元素，直接添加节点
            if list_range == 1:
                # 查找或添加节点
                source_node = next((node for node in nodes if node['name'] == f"{username}@{i}"),
                                   {'name': f"{username}@{i}", 'data': events})
                target_node = next((node for node in nodes if node['name'] == 'unknown'),
                                   {'name': 'unknown', "data": {} })
                nodes.append(source_node)
                nodes.append(target_node)
                # 添加链接
                links.append({'head': {'name': ''}, 'tail': {'name': ''}, 'source': source_node, 'target': target_node,
                              'value': 1})
            else:
                # 遍历事件，构建节点和链接
                source = f"{username}@{i}"
                target = f"{username}@{i+1}"

                # 查找或添加节点
                source_node = next((node for node in nodes if node['name'] == source),
                                      {'name': source, 'data': events})
                target_node = next((node for node in nodes if node['name'] == target),
                                   {'name': target, 'data': nextData[username]})
                if source_node not in nodes:
                    nodes.append(source_node)
                if target_node not in nodes:
                    nodes.append(target_node)
                # 添加链接
                link = next((link for link in links if link['source'] == source_node and link['target'] == target_node),
                            None)
                if link:
                    link['value'] += 1
                else:
                    links.append(
                        {'head': {'name': ""}, 'tail': {'name': ""}, 'source': source_node, 'target': target_node, 'value': 1})
    return {'nodes': nodes, 'links': links}


def extract_substring(s, delimiter):
    index = s.find(delimiter)
    return s[:index] if index != -1 else s


def needleman_wunsch(seq1, seq2, match_score=2, mismatch_penalty=-1, gap_penalty=-1):
    m, n = len(seq1), len(seq2)
    # 初始化得分矩阵
    score_matrix = [[0 for _ in range(n + 1)] for _ in range(m + 1)]
    # 初始化方向矩阵
    direction_matrix = [[None for _ in range(n + 1)] for _ in range(m + 1)]

    # 初始化矩阵的第一行和第一列
    for i in range(1, m + 1):
        score_matrix[i][0] = i * gap_penalty
        direction_matrix[i][0] = 'up'
    for j in range(1, n + 1):
        score_matrix[0][j] = j * gap_penalty
        direction_matrix[0][j] = 'left'

    # 填充得分矩阵和方向矩阵
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if seq1[i - 1] == seq2[j - 1]:
                score_diagonal = score_matrix[i - 1][j - 1] + match_score
            else:
                score_diagonal = score_matrix[i - 1][j - 1] + mismatch_penalty

            score_up = score_matrix[i - 1][j] + gap_penalty
            score_left = score_matrix[i][j - 1] + gap_penalty

            max_score = max(score_diagonal, score_up, score_left)

            score_matrix[i][j] = max_score
            if max_score == score_diagonal:
                direction_matrix[i][j] = 'diagonal'
            elif max_score == score_up:
                direction_matrix[i][j] = 'up'
            else:
                direction_matrix[i][j] = 'left'

    # 回溯以构建对齐序列
    align1, align2 = [], []
    i, j = m, n

    while i > 0 or j > 0:
        direction = direction_matrix[i][j]
        if direction == 'diagonal':
            align1.insert(0, seq1[i - 1])
            align2.insert(0, seq2[j - 1])
            i -= 1
            j -= 1
        elif direction == 'up':
            align1.insert(0, seq1[i - 1])
            align2.insert(0, None)
            i -= 1
        else:  # 'left'
            align1.insert(0, None)
            align2.insert(0, seq2[j - 1])
            j -= 1

    return align1, align2


def align_event_sequences(center_seq, sequences):
    aligned_sequences = []
    max_length = 0
    # 对每个序列与中心序列进行对齐
    for seq in sequences:
        _, aligned_seq = needleman_wunsch(center_seq, seq)
        aligned_sequences.append(aligned_seq)
        max_length = max(max_length, len(aligned_seq))

    # 创建全局对齐框架，填充None以保持对齐结构
    global_alignment = [[None for _ in range(max_length)] for _ in sequences]

    # 填充全局对齐框架
    for i, seq in enumerate(aligned_sequences):
        for j, elem in enumerate(seq):
            if elem is not None:  # 如果对齐位置不是占位符，则填充元素
                global_alignment[i][j] = elem
            # 如果元素是None，保持占位符，表示该位置在原始序列中没有对应的元素

    return global_alignment


# 函数用于提取非null元素的位置
def extract_non_null_positions(sequences):
    positions = []
    for seq in sequences:
        seq_positions = [i for i, x in enumerate(seq) if x is not None]
        positions.append(seq_positions)
    return positions


def lcs_length(seq1, seq2):
    """计算两个序列之间的最长公共子序列（LCS）的长度。"""
    m, n = len(seq1), len(seq2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if seq1[i - 1] == seq2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


def find_center_sequence(sequences):
    """基于LCS找到最能代表中心的序列。"""
    total_similarity = [0] * len(sequences)
    for i, seq1 in enumerate(sequences):
        for j, seq2 in enumerate(sequences):
            if i != j:
                total_similarity[i] += lcs_length(seq1, seq2)
    center_index = total_similarity.index(max(total_similarity))
    return sequences[center_index], center_index


def smith_waterman_move_count(base_seq, target_seq, match_score=2, mismatch_penalty=-1, gap_penalty=-1):
    """
    使用Smith-Waterman算法计算将目标序列对齐到基准序列所需的移动（插入和删除）个数。
    """
    m, n = len(base_seq), len(target_seq)
    # 初始化得分矩阵
    score_matrix = [[0 for _ in range(n + 1)] for _ in range(m + 1)]

    # 计算得分矩阵
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            match = score_matrix[i - 1][j - 1] + (
                match_score if base_seq[i - 1] == target_seq[j - 1] else mismatch_penalty)
            delete = score_matrix[i - 1][j] + gap_penalty
            insert = score_matrix[i][j - 1] + gap_penalty
            score_matrix[i][j] = max(0, match, delete, insert)

    # 回溯以确定移动次数
    move_count = 0
    i, j = m, n
    max_score = max(max(row) for row in score_matrix)
    # 找到得分最高点开始回溯
    for row in range(m + 1):
        for col in range(n + 1):
            if score_matrix[row][col] == max_score:
                i, j = row, col

    while i > 0 and j > 0:
        if score_matrix[i][j] == score_matrix[i - 1][j - 1] + (
                match_score if base_seq[i - 1] == target_seq[j - 1] else mismatch_penalty):
            i -= 1
            j -= 1
        elif score_matrix[i][j] == score_matrix[i - 1][j] + gap_penalty:
            move_count += 1  # 删除操作
            i -= 1
        elif score_matrix[i][j] == score_matrix[i][j - 1] + gap_penalty:
            move_count += 1  # 插入操作
            j -= 1
        elif score_matrix[i][j] == 0:
            break

    return move_count


def align_sequences_with_moves(sequences):
    center_seq, center_index = find_center_sequence(sequences)
    """计算每个序列对齐到基准序列所需的移动个数。"""
    move_counts = []
    for seq in sequences:
        move_count = smith_waterman_move_count(center_seq, seq)
        move_counts.append(move_count)
    return move_counts


# def get_event_pairs(data, start_time, end_time, event_set1, event_set2, seq_view, isPath):
#     filtered_events_by_user = {}
#     for username in data.keys():
#         time_key = None
#         for key in data[username].keys():
#             if "时间" in key or "time" in key:
#                 time_key = key
#                 break
#             if "time_interval" in key:
#                 time_key = key
#                 break
#
#         # 对每个用户初始化一个空列表来存储事件对
#         filtered_events_by_user[username] = []
#         times = data[username][time_key]
#         events = data[username][seq_view]
#         for i in range(len(events)):
#             for j in range(i + 1, len(events)):
#                 # time_diff = (parse(times[j]).timestamp() - parse(times[i]).timestamp()) / 60  # 将时间差转换为分钟
#                 if ":" in str(times[j]):
#                     time_diff = (parse(times[j]).timestamp() - parse(times[i]).timestamp()) / 60
#                 else:
#                     # 如果是时间戳类型，则进行时间差计算
#                     time_diff = (times[j] - times[i]) * 60  # 将时间差转换为分钟
#
#                 is_time_in_range = abs(time_diff) <= end_time
#                 if is_time_in_range:
#                     if len(event_set1) == 0 and len(event_set2) == 0:
#                         # 如果没有指定事件类型，直接添加
#                         filtered_events_by_user[username].append({'event1': i, 'event2': j})
#                     elif (events[i] in event_set1 and events[j] in event_set2) or (
#                             events[i] in event_set2 and events[j] in event_set1):
#                         if (start_time >= 0) and (
#                                 events[i] in event_set1 and events[j] in event_set2):
#                             # 正时间范围：事件2 在事件1 之后
#                             if isPath:
#                                 filtered_events_by_user[username].append({'event1': i, 'event2': j})
#                             else:
#                                 eventPath = list(range(i, j + 1))
#                                 filtered_events_by_user[username].append(eventPath)
#                         elif start_time < 0:
#                             # 负时间范围：事件2 在事件1 之前或之后都可
#                             if isPath:
#                                 filtered_events_by_user[username].append({'event1': i, 'event2': j})
#                             else:
#                                 eventPath = list(range(i, j + 1))
#                                 filtered_events_by_user[username].append(eventPath)
#     return filtered_events_by_user

def get_event_pairs(data, start_time, end_time, event_set1, event_set2, attr1,attr2, isPath):
    # 判断 start_time 和 end_time 是否为 None
    hasTimeKey = start_time is not None and end_time is not None

    filtered_events_by_user = {}
    for username in data.keys():
        time_key = None
        for key in data[username].keys():
            if "时间" in key or "time" in key or "Time" in key:
                time_key = key
                break
            if "time_interval" in key:
                time_key = key
                break

        if attr1 == "":
            attr1 = attr2
        if attr2 == "":
            attr2 = attr1

        # 对每个用户初始化一个空列表来存储事件对
        filtered_events_by_user[username] = []

        if len(event_set1) == 0:
            event_set1 = data[username][attr1]
        if len(event_set1) == 0:
            event_set2 = data[username][attr2]


        events1 = data[username][attr1]
        events2 = data[username][attr2]

        if hasTimeKey:
            i = 0
            while i < len(events1):
                for j in range(i + 1, len(events2)):
                    times = data[username][time_key]

                    if times[i] is None or times[j] is None:
                        continue

                    if ":" in str(times[j]):
                        time_diff = (parse(times[j]).timestamp() - parse(times[i]).timestamp()) / 60
                    else:
                        time_diff = (times[j] - times[i])

                    is_time_in_range = abs(time_diff) <= end_time
                    if is_time_in_range:
                        if len(event_set1) == 0 and len(event_set2) == 0:
                            filtered_events_by_user[username].append({'event1': i, 'event2': j})
                            i = j  # ✅ 更新 i 到 j
                            break
                        elif (events1[i] in event_set1 and events2[j] in event_set2) or (
                                events1[i] in event_set2 and events2[j] in event_set1):
                            if (start_time >= 0) and (
                                    events1[i] in event_set1 and events2[j] in event_set2):
                                if isPath:
                                    filtered_events_by_user[username].append({'event1': i, 'event2': j})
                                else:
                                    eventPath = list(range(i, j + 1))
                                    filtered_events_by_user[username].append(eventPath)
                                i = j  # ✅ 更新 i 到 j
                                break
                            elif start_time < 0:
                                if isPath:
                                    filtered_events_by_user[username].append({'event1': i, 'event2': j})
                                else:
                                    eventPath = list(range(i, j + 1))
                                    filtered_events_by_user[username].append(eventPath)
                                i = j  # ✅ 更新 i 到 j
                                break
                else:
                    i += 1  # 如果没有匹配，i 继续累加

        # if hasTimeKey:
        #     for i in range(len(events1)):
        #         for j in range(i + 1, len(events2)):
        #             times = data[username][time_key]
        #             # time_diff = (parse(times[j]).timestamp() - parse(times[i]).timestamp()) / 60  # 将时间差转换为分钟
        #             if ":" in str(times[j]):
        #                 time_diff = (parse(times[j]).timestamp() - parse(times[i]).timestamp()) / 60
        #             else:
        #                 # 如果是时间戳类型，则进行时间差计算
        #                 time_diff = (times[j] - times[i])
        #
        #             is_time_in_range = abs(time_diff) <= end_time
        #             if is_time_in_range:
        #                 if len(event_set1) == 0 and len(event_set2) == 0:
        #                     # 如果没有指定事件类型，直接添加
        #                     filtered_events_by_user[username].append({'event1': i, 'event2': j})
        #                 elif (events1[i] in event_set1 and events2[j] in event_set2) or (
        #                         events1[i] in event_set2 and events2[j] in event_set1):
        #                     if (start_time >= 0) and (
        #                             events1[i] in event_set1 and events2[j] in event_set2):
        #                         # 正时间范围：事件2 在事件1 之后
        #                         if isPath:
        #                             filtered_events_by_user[username].append({'event1': i, 'event2': j})
        #                         else:
        #                             eventPath = list(range(i, j + 1))
        #                             filtered_events_by_user[username].append(eventPath)
        #                     elif start_time < 0:
        #                         # 负时间范围：事件2 在事件1 之前或之后都可
        #                         if isPath:
        #                             filtered_events_by_user[username].append({'event1': i, 'event2': j})
        #                         else:
        #                             eventPath = list(range(i, j + 1))
        #                             filtered_events_by_user[username].append(eventPath)
        else:
            for i in range(len(events1)):
                for j in range(i + 1, len(events2)):
                    if events1[i] in event_set1 and events2[j] in event_set2:
                        if isPath:
                            filtered_events_by_user[username].append({'event1': i, 'event2': j})
                        else:
                            eventPath = list(range(i, j + 1))
                            filtered_events_by_user[username].append(eventPath)
                        break  # 添加这一行，找到满足条件的 j 后，跳出内层循环
    return filtered_events_by_user


def get_sequence_pairs(data, start_time, end_time, event_set1, event_set2, seq_view):
    filtered_events_by_user = {}
    event_set1 = set(event_set1)  # 将列表转换为集合以加快搜索
    event_set2 = set(event_set2)
    for username in data.keys():
        time_key = None
        for key in data[username].keys():
            if "时间" in key or "time" in key:
                time_key = key
                break

        # 对每个用户初始化一个空列表来存储事件对
        filtered_events_by_user[username] = []
        times = data[username][time_key]
        timestamps = [parse(time).timestamp() / 60 for time in times]  # 预处理时间戳并转换为分钟
        events = data[username][seq_view]
        # 构建事件和时间戳的组合列表
        events_timestamps = list(zip(events, timestamps))

        n = len(events_timestamps)
        for i in range(n):
            for j in range(i, n):
                seq_a, time_a = zip(*events_timestamps[i:j + 1])
                if set(seq_a).issubset(event_set1) or set(seq_a).issubset(event_set2):
                    for k in range(n):
                        for l in range(k, n):
                            seq_b, time_b = zip(*events_timestamps[k:l + 1])
                            if (set(seq_b).issubset(event_set1)) or set(seq_b).issubset(event_set2):
                                # 只有当 seq_a 和 seq_b 至少满足一个集合的子集条件时才计算时间差
                                if (start_time >= 0) and (
                                        set(seq_a).issubset(event_set1) and set(seq_b).issubset(event_set2)):
                                    # 正时间范围：事件2 在事件1 之后
                                    if abs(time_a[0] - time_b[0]) <= end_time:
                                        filtered_events_by_user[username].append({'seq_a': seq_a, 'seq_b': seq_b})
                                elif start_time < 0:
                                    filtered_events_by_user[username].append({'seq_a': seq_a, 'seq_b': seq_b})

    return filtered_events_by_user


def find_frequent_pattern(sequences, support):
    # 生成项到ID和ID到项的映射
    item_to_id = {}
    id_to_item = {}
    current_id = 1
    for seq in sequences:
        for item in seq:
            if item not in item_to_id:
                item_to_id[item] = current_id
                id_to_item[current_id] = item
                current_id += 1

    # 准备数据并写入临时输入文件
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_input:
        input_file_path = temp_input.name
        for seq in sequences:
            # 对每个项后面都加上 -1，序列结束后加上 -2
            temp_input.write(' '.join(f"{item_to_id[item]} -1" for item in seq) + ' -2\n')

    # 临时输出文件
    temp_output = tempfile.NamedTemporaryFile(delete=False)
    output_file_path = temp_output.name
    temp_output.close()
    # SPMF的路径
    spmf_jar_path = 'spmf.jar'
    # 最小支持度，根据需要调整
    min_support = support

    # 构建Java命令
    command = f"java -jar {spmf_jar_path} run VMSP {input_file_path} {output_file_path} {min_support}"
    subprocess.run(command, shell=True)
    with open(output_file_path, 'r') as f:
        lines = f.readlines()
    # 解析结果并映射回原始项
    pattern_list = []
    for result in lines:
        # 移除字符串末尾的支持度信息（例如 "#SUP: 3"）
        pattern_str = result.split(" #")[0]
        # 分割模式字符串，移除分隔符'-1'后转换为整数ID列表
        pattern_ids = [int(id) for id in pattern_str.split(" -1")[:-1]]  # 切片[:-1]用于去除最后的空字符串
        # 将整数ID映射回原始项
        pattern_items = [id_to_item[id] for id in pattern_ids]
        pattern_list.append(pattern_items)

    # 清理临时文件
    Path(input_file_path).unlink()
    Path(output_file_path).unlink()
    return pattern_list


