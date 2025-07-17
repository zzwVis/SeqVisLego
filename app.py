'''
后端服务
'''

import re

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from myClass import ItemSet
# 引入类
from myClass import Table
from rulesGraph import op_graph, vis_graph

from tool import extract_substring, process_sankey_data, add_hierarchy_info, \
    add_hierarchy_info_timeline, process_agg_sankey_data, find_center_sequence, align_event_sequences, \
    extract_non_null_positions, align_sequences_with_moves, get_event_pairs, get_sequence_pairs, find_frequent_pattern


# 定义APP
app = Flask(__name__)

# 解决跨域问题
CORS(app)

# 创建字典来作为全局命名空间，并添加需要的变量
local_vars = {}


import traceback
from flask import jsonify

@app.route('/uploadFile', methods=['GET', 'POST'])
def acceptFile():
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        filename = file.filename
        if filename.endswith(('.xlsx', '.xls')):
            try:
                xls = pd.ExcelFile(file)
                set = {}
                sheet_info = {}
                for sheet_name in xls.sheet_names:
                    table = Table(file, sheet_name)
                    set[sheet_name] = ItemSet(table)
                    local_vars[sheet_name] = set[sheet_name]
                    df = pd.read_excel(xls, sheet_name)
                    headers = df.columns.tolist()
                    sheet_info[sheet_name] = headers
                return jsonify(sheet_info)
            except Exception as e:
                # 捕获异常并返回详细的错误信息
                error_message = f"Error processing file: {str(e)}\nTraceback:\n{traceback.format_exc()}"
                return jsonify({'error': error_message}), 500
        else:
            return jsonify({'error': 'Invalid file type. Only .xlsx and .xls are supported.'}), 400
    else:
        return jsonify({'error': 'Invalid request method. Only POST is supported.'}), 405


@app.route('/executeCode', methods=['GET', 'POST'])
def acceptCode():
    if request.method == 'POST':
        data = request.json
        # 获取前端输入的code
        code = data.get('code')
        support = data.get('support')
        code = "result=" + str(code)
        operations = re.findall(r'\.(\w+)\(', code)
        if "pattern" in code:
            # 使用正则表达式搜索 pattern() 函数调用
            pattern_match = re.search(r'pattern\([^)]*\)', code)
            if pattern_match:
                # 找到 pattern() 函数调用后，在其中插入新参数
                old_pattern = pattern_match.group()
                new_pattern = old_pattern[:-1] + ', "{}")'.format(support)
                # 替换原始字符串中的 pattern() 函数调用
                code = code.replace(old_pattern, new_pattern)
        if operations != []:
            last_operation = operations[-1]  # 获取最后一个操作
            if last_operation == "view_type":
                if(len(operations)>=2):
                    last_operation = operations[-2]
                    code = extract_substring(code, ".view_type")
                else:
                    last_operation = "original"
                    code = extract_substring(code, ".view_type")
                    code += ".get_list_data()"
            if any(keyword in last_operation for keyword in ['intersection_set', 'difference_set']):
                code = code + ".get_list_data()"
            if last_operation == "filter":
                if "group" in operations:
                    code = code + ".get_grouped_data()"
                else:
                    code = code + ".get_list_data()"
            elif any(keyword in last_operation for keyword in ['group', 'aggregate', 'flatten', 'segment']):
                code = code + ".get_grouped_data()"
            elif last_operation == "pattern":
                code = code + ".get_result()"
            elif last_operation == "align":
                code = code + ".get_grouped_data()"
            elif last_operation == "sum":
                code = code + ".get_result()"
            elif last_operation == "avg":
                code = code + ".get_result()"

            # elif not any(
            #         keyword in last_operation for keyword in ['unique_attr', 'unique_count', 'count', 'view_type']):
            #     code = code + ".get_result()"
            elif last_operation == 'filterTimeRange':
                code = code + ".get_list_data()"
                last_operation = "original"

        else:
            # 未进行任何操作
            code = code + ".get_list_data()"
            last_operation = "original"

    try:
        # 执行代码并传入全局命名空间
        exec(code, {}, local_vars)
    except Exception as e:
        print("Error during execution:", str(e))
        return jsonify({'error': str(e)}), 400

    # 提取执行结果
    result = local_vars.get('result', None)

    # 检查结果类型，确保它是字典或列表
    if isinstance(result, (dict, list)):
        return jsonify({"operation": last_operation, "result": result})
    else:
        return jsonify({'error': 'Result is not a list or dictionary'}), 400


# 定义路由，处理桑基图数据请求
@app.route('/get_sankey_data', methods=['GET', 'POST'])
def get_sankey_data():
    if request.method == 'POST':
        data = request.json
        seqView = data.get('seqView')
        # 调用数据处理函数获取桑基图数据
        originalData = add_hierarchy_info(data.get('data'), seqView)
        sankey_data = process_sankey_data(originalData, seqView, "sankey")
    # 返回 JSON 格式的数据
    return jsonify(sankey_data)


# 定义路由，处理桑基图数据请求
@app.route('/get_timeline_data', methods=['GET', 'POST'])
def get_timeline_data():
    if request.method == 'POST':
        data = request.json
        seqView = data.get('seqView')
        # 调用数据处理函数获取桑基图数据
        originalData = add_hierarchy_info_timeline(data.get('data'), seqView)
        sankey_data = process_sankey_data(originalData, seqView, "timeline")
    # 返回 JSON 格式的数据
    return jsonify(sankey_data)


@app.route('/get_agg_timeline_data', methods=['GET', 'POST'])
def get_agg_timeline_data():
    if request.method == 'POST':
        data = request.json
        sankey_data = process_agg_sankey_data(data.get('data'))
    # 返回 JSON 格式的数据
    return jsonify(sankey_data)


@app.route('/get_highlight_data', methods=['GET', 'POST'])
def get_highlight_data():
    requestData = request.json
    data = requestData.get('data')
    selectedUsernames = requestData.get('selectedNames', [])
    seqView = requestData.get('seqView')
    # 获取所有已选中用户的事件序列
    nodes_array = [f"{event} {index}" for username in selectedUsernames
                   for index, event in enumerate(data[username][seqView])]
    return jsonify({'nodesArray': nodes_array})


@app.route('/global_align', methods=['GET', 'POST'])
def global_align():
    requestData = request.json
    sequences = requestData.get('data')
    # 中心序列
    center_seq, center_index = find_center_sequence(sequences)
    align_result = align_event_sequences(center_seq, sequences)
    max_length = len(align_result[0])
    non_null_positions = extract_non_null_positions(align_result)
    merged_array = [element for array in non_null_positions for element in array]

    return jsonify({"length": max_length, "location": merged_array, "align_result": align_result})


@app.route('/local_align', methods=['GET', 'POST'])
def local_align():
    requestData = request.json
    sequences = requestData.get('data')
    move_count = align_sequences_with_moves(sequences)
    # 找到最小的移动个数
    min_move_count = min(move_count)
    max_move_count = max(move_count)

    # 如果最小移动个数是负数，调整所有移动个数以确保都是正数
    if min_move_count < 0:
        adjusted_move_counts = [move + abs(min_move_count) for move in move_count]
        max_move_count += abs(min_move_count)
    else:
        adjusted_move_counts = move_count

    return jsonify({"length": max_move_count, "location": adjusted_move_counts})


@app.route('/event_pairs', methods=['GET', 'POST'])
def event_pairs():
    requestData = request.json
    data = requestData.get('data')
    start_time = requestData.get('startTime')
    if start_time is None:
        start_time = 0
    end_time = requestData.get('endTime')
    event_set1 = requestData.get('eventSet1')
    event_set2 = requestData.get('eventSet2')
    attr1 = requestData.get('attr1')
    attr2 = requestData.get('attr2')
    filtered_events_by_user = get_event_pairs(data, start_time, end_time, event_set1, event_set2, attr1,attr2, True)
    return jsonify({"filteredEvents": filtered_events_by_user})


@app.route('/event_paths', methods=['GET', 'POST'])
def event_paths():
    requestData = request.json
    data = requestData.get('data')
    start_time = requestData.get('startTime')
    if start_time is None:
        start_time = 0
    end_time = requestData.get('endTime')
    event_set1 = requestData.get('eventSet1')
    event_set2 = requestData.get('eventSet2')
    attr1 = requestData.get('attr1')
    attr2 = requestData.get('attr2')
    filtered_events_by_user = get_event_pairs(data, start_time, end_time, event_set1, event_set2, attr1,attr2, False)
    return jsonify({"filteredEvents": filtered_events_by_user})


@app.route('/sequence_paths', methods=['GET', 'POST'])
def sequence_paths():
    requestData = request.json
    data = requestData.get('data')
    start_time = requestData.get('startTime')
    if start_time is None:
        start_time = 0
    end_time = requestData.get('endTime')
    event_set1 = requestData.get('eventSet1')
    event_set2 = requestData.get('eventSet2')
    seq_view = requestData.get('seqView')
    filtered_events_by_user = get_sequence_pairs(data, start_time, end_time, event_set1, event_set2, seq_view)
    return jsonify({"filteredEvents": filtered_events_by_user})


@app.route('/next_opera_vis', methods=['GET', 'POST'])
def next_operations():
    requestData = request.json
    operation = requestData.get('operation')
    operationList = op_graph.get_next_operations(operation)
    visualizationList = vis_graph.get_visualization(operation)
    return jsonify({"operationList": operationList, "visualizationList": visualizationList})


@app.route('/find_frequent_pattern', methods=['GET', 'POST'])
def find_pattern():
    requestData = request.json
    sequences = requestData.get('data')
    patternList = find_frequent_pattern(sequences)
    return jsonify({"patternList": patternList})


# 启动
if __name__ == '__main__':
    app.run(debug=True)
