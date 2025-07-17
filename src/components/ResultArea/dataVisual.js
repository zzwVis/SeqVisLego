import * as d3 from 'd3';
import * as d3Sankey from './d3-sankey/index.js';
import store from '@/store'
import * as d3Color from 'd3-color';

import {
    changeEventBrush,
    changeGlobalHighlight,
    changeGlobalMouseover, changePatternBrush,
    collectNamesByDepth,
    countMatchingLists,
    createHierarchyData,
    createNodes,
    estimateSankeySize,
    extractInfoBySeqView,
    fillData,
    findKeyByValue,
    findSequencesContainingSubsequence,
    flatten,
    flattenPattern,
    generateUserColorMap,
    getKeysByValue,
    getRelatedLinks, getRelatedLinksForNode,
    groupData,
    parseAction,
    toggleVisibility,
    createBrushSet, formatDateTime, calMaxDepth,
} from './tool.js'
import axios, {all} from "axios";
import {console} from "vuedraggable/src/util/helper.js";

let usernameTextWidth = {}
// 创建颜色比例尺
const combinedColorScheme = [...d3.schemeTableau10, ...d3.schemeAccent, ...d3.schemePastel1, ...d3.schemeAccent, ...d3.schemePaired, ...d3.schemeCategory10];
const sunburstColor = d3.scaleOrdinal(combinedColorScheme);

const dragThreshold = 5; // 阈值，超过这个值认为是拖动

function removeSubsets(data) {
    const result = {};
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const arrays = data[key];
            const filteredArrays = [];

            // 检查每个数组是否是其他数组的子集
            for (let i = 0; i < arrays.length; i++) {
                let isSubset = false;
                for (let j = 0; j < arrays.length; j++) {
                    if (i !== j) {  // 不和自己比较
                        // 检查 arrays[i] 是否是 arrays[j] 的子集
                        const isSubsetOfJ = arrays[i].every(element => arrays[j].includes(element));
                        if (isSubsetOfJ) {
                            isSubset = true;
                            break;
                        }
                    }
                }
                if (!isSubset) {
                    filteredArrays.push(arrays[i]);
                }
            }
            result[key] = filteredArrays;
        }
    }
    return result;
}

function cleanLines(lines) {
    const grouped = {};
    // 按照 firstX 和 firstY 分组
    lines.forEach(line => {
        const key = `${line.firstX},${line.firstY}`; // 使用 firstX 和 firstY 作为分组键
        if (!grouped[key] || grouped[key].lastY < line.lastY) {
            grouped[key] = line; // 如果 lastY 更大，则更新该组的连线
        }
    });

    // 将分组后的连线转换为数组
    return Object.values(grouped);
}

// 数值数据的颜色插值
// 定义降低饱和度的函数
function desaturateColor(color, saturationFactor) {
    // 将 RGB 颜色转换为 HSL
    const hsl = d3.hsl(color);
    // 降低饱和度
    hsl.s *= saturationFactor;
    // 返回调整后的 RGB 颜色
    return hsl.toString();
}

// 创建低饱和度的插值函数（使用后半段配色）
// function desaturatedInterpolator(t, saturationFactor = 0.8) {
//     // 将 t 映射到 [0.5, 1] 区间
//     const adjustedT = t * 0.5 + 0.5;
//     // 获取原始颜色
//     const originalColor = d3.interpolateCubehelixDefault(adjustedT);
//     // 降低饱和度
//     return desaturateColor(originalColor, saturationFactor);
// }

// 创建低饱和度的插值函数
function desaturatedInterpolator(t, brightnessFactor = 1, saturationFactor = 0.9) {
    // 获取原始颜色
    const originalColor = d3.interpolatePuBu(t);

    // 将颜色转换为 HSL 格式以便调整饱和度和亮度
    const hslColor = d3Color.hsl(originalColor);

    // 降低饱和度
    hslColor.s *= saturationFactor; // 饱和度乘以饱和度因子
    // 降低亮度
    hslColor.l *= brightnessFactor; // 亮度乘以亮度因子

    // 返回调整后的颜色
    return hslColor.toString();
}

// function getColorForValue(value, minValue, maxValue) {
//     // 创建一个顺序比例尺
//     const colorScale = d3.scaleSequential( d3.interpolateYlGnBu)
//         .domain([minValue, maxValue]); // 定义域：最小值到最大值
//
//     return colorScale(value);
// }

// 定义根据值获取颜色的函数
function getColorForValue(value, minValue, maxValue) {
    // 将值归一化到 [0, 1] 区间
    const t =0.8*((value - minValue) / (maxValue - minValue));
    // 使用低饱和度插值函数生成颜色
    return desaturatedInterpolator(t);
}

function deepRemoveEmptyKey(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj; // 如果不是对象或为 null，直接返回
    }

    // 处理数组的情况
    if (Array.isArray(obj)) {
        return obj.map(item => deepRemoveEmptyKey(item)); // 递归处理数组里的每一项
    }

    // 处理普通对象的情况
    const result = {};
    for (const key in obj) {
        if (key === " " || key === "No") {
            continue; // 跳过键为 " " 的项
        }
        const value = obj[key];
        result[key] = deepRemoveEmptyKey(value); // 递归处理子属性
    }
    return result;
}

export default {
    chooseWhich(operation, containerId, rawData, visualType){
        const data = deepRemoveEmptyKey(rawData)
        const divElement = document.getElementById(containerId);
        const allOperations = divElement.getAttribute("codeContext");
        if(divElement.firstChild){
            while (divElement.firstChild) {
                divElement.removeChild(divElement.firstChild);
            }
        }

        if (["original", "difference_set", "intersection_set", 'filterTimeRange'].includes(operation)) {
            if(!store.state.isFirstLoad){
                this.createTable(containerId, data);
                store.commit('setIsFirstLoad')
            }
            else if(visualType==="table"){
                this.createTable(containerId, data);
            }
            if(visualType==="scatter"){
                this.createScatter(containerId, data);
            }
        }
        if(operation === "filter"){
            if (Array.isArray(allOperations) && allOperations.length > 0 && !allOperations.includes("group")) {
                if(!store.state.isFirstLoad){
                    this.createTable(containerId, data);
                    store.commit('setIsFirstLoad')
                }
                else{
                    if(visualType==="scatter"){
                        this.createScatter(containerId, data);
                    }
                    else{
                        this.createTable(containerId, data);
                    }
                }
            }
            else{
                if(visualType==="timeline"){
                    if(store.state.curExpression.includes("filter(\"subsequence\")")){

                        this.createTimeLine(true,containerId, data,store.state.curColorMap);
                    }
                    else{
                        this.createTimeLine(false,containerId, data,store.state.curColorMap);
                    }

                }
                else{
                    this.createTable(containerId, data);
                }
            }
        }
        else if(operation === "unique_attr"){
            if(visualType==="table"){
                this.createList(containerId, data);
            }
            else{
                this.createList(containerId, data);
            }
        }
        else if(["count", "unique_count"].includes(operation)){
            // if(store.state.curExpression.includes("view_type")){
            if(visualType==="bar chart"){
                this.createBarChart(containerId, data);
            }
            else if(visualType==="pie chart"){
                this.createPieChart(containerId, data);
            }
            else if(visualType==="sunburst"){
                this.createSunBurst(containerId, data);
            }
            else{
                // this.createBarChart(containerId, data);
                this.createTable(containerId, data);
            }
            // }
        }
        else if((operation === "group")||(operation === "flatten")||(operation === "segment")||(operation === "sum")||(operation === "align")||(operation === "avg")||((operation === "filter")&&(allOperations.includes("group")))){
            const codeContext = store.state.curExpression
            const regex = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
            const matches = codeContext.matchAll(regex);
            const parameters = [];
            for (const match of matches) {
                parameters.push(match[1]);
            }
            const [dataKey] = codeContext.split(".");
            const originalData = store.state.originalTableData[dataKey]
            let uniqueValues = {};
            // 计算每个键下的唯一值数量
            for (let key in originalData) {
                uniqueValues[key] = new Set(data[key]).size;
            }
            let seqView
            if(store.state.curColorMap===""){
                // 根据唯一值数量对键进行排序
                let sortedKeys = Object.keys(uniqueValues).sort((a, b) => uniqueValues[a] - uniqueValues[b]);
                seqView = sortedKeys.find(function(element) {
                    return (!(parameters.includes(element))&&(!element.includes("时间"))&&(!element.includes("time")));
                });
                if(seqView===undefined){
                    seqView = sortedKeys[0]
                }
                store.commit('setCurColorMap',seqView)
            }
            else{
                seqView = store.state.curColorMap
            }

            if(store.state.curExpression.includes("view_type")){
                if(visualType==null || visualType==="timeline"){
                    if(store.state.curExpression.includes("filter(\"subsequence\")")){
                        this.createTimeLine(true,containerId, data, seqView);
                    }
                    else{
                        this.createTimeLine(false,containerId, data, seqView);
                    }
                }
                else if(visualType==="sankey"){
                    this.createAggTimeLine(containerId, data, seqView);
                }
                else if(visualType==="heatmap"){
                    this.createHeatmap(containerId, data, seqView);
                }
                else if(visualType==="line chart"){
                    this.createLineChart(containerId, data, seqView);
                }
                else if(visualType==="table"){
                    this.createTable(containerId, data);
                }
                else{
                    if(store.state.curExpression.includes("filter(\"subsequence\")")){
                        this.createTimeLine(true,containerId, data, seqView);
                    }
                    else{
                        this.createTimeLine(false,containerId, data, seqView);
                    }
                    // this.createTimeLine(containerId, data, seqView);
                }
            }
            else{
                if(operation !== "align"){
                    this.createTable(containerId, data);
                }
            }
        }
        else if(["pattern"].includes(operation)){
            // 使用正则表达式匹配 pattern() 中的内容
            const patternMatch = store.state.curExpression.match(/\.pattern\("([^"]+)"\)/);
            if (patternMatch) {
                store.commit('setCurColorMap', patternMatch[1])
            }
            if(store.state.curExpression.includes("view_type")){
                if(visualType==="timeline"){
                    this.createPatternLine(containerId, data);
                }
            }
        }
    },

    // createTable(containerId, data) {
    //     // 获取目标容器元素
    //     const container = document.getElementById(containerId);
    //     if (!container) {
    //         return;
    //     }
    //
    //     // 递归渲染数据为表格，带有隐藏/展开功能
    //     function renderData(data, level = 1) {
    //         const table = document.createElement('table');
    //         table.classList.add('el-table');
    //         table.style.borderCollapse = 'collapse';
    //         table.style.width = '100%';
    //
    //         if (typeof data === 'object' && !Array.isArray(data)) {
    //             // 获取每一层的键
    //             const keys = Object.keys(data);
    //
    //             // 动态创建表头
    //             const headerRow = document.createElement('tr');
    //             keys.forEach((key) => {
    //                 const th = document.createElement('th');
    //                 th.textContent = key;
    //                 th.style.border = '1px solid #e0e0e0';
    //                 th.style.padding = '10px';
    //                 th.style.background = '#f3f3f3';
    //                 th.style.fontWeight = 'bold';
    //                 headerRow.appendChild(th);
    //             });
    //             table.appendChild(headerRow);
    //
    //             // 确保表格每一行的行数与数据中的最大行数保持一致
    //             const rowCount = Math.max(...keys.map(key => Array.isArray(data[key]) ? data[key].length : 1));
    //
    //             // 渲染数据行
    //             for (let i = 0; i < rowCount; i++) {
    //                 const row = document.createElement('tr');
    //                 keys.forEach((key, columnIndex) => {
    //                     const td = document.createElement('td');
    //                     td.style.border = '1px solid #e0e0e0';
    //                     td.style.padding = '10px';
    //
    //                     if (Array.isArray(data[key])) {
    //                         if (typeof data[key][i] === 'string' && data[key][i].includes('GMT')) {
    //                             data[key][i] = formatDateTime(data[key][i]);
    //                         }
    //                         // 显示数组中的值或空字符串
    //                         td.textContent = data[key][i] !== undefined ? data[key][i] : '';
    //                         td.classList.add('el-hover-cell'); // 只有最底层的值加悬浮效果
    //
    //                         // 绑定点击事件
    //                         td.addEventListener('click', function () {
    //                             createBrushSet(containerId,[data[key][i]])
    //                             const myObject = {}
    //                             myObject[key] = data[key][i]
    //                             changeGlobalHighlight(myObject, containerId)
    //
    //                             // 切换类名（添加/移除 .highlighted 类）
    //                             td.classList.toggle('highlighted');
    //                         });
    //
    //                         // 绑定悬浮事件
    //                         td.addEventListener('mouseover', function () {
    //                             createBrushSet(containerId,[data[key][i]])
    //                             const myObject = {}
    //                             myObject[key] = data[key][i]
    //                             changeGlobalMouseover(myObject, containerId)
    //                         });
    //                         td.addEventListener('mouseout', function () {
    //                             const myObject = {}
    //                             myObject[key] = data[key][i]
    //                             changeGlobalMouseover(myObject, containerId)
    //                         });
    //                     } else if (typeof data[key] === 'object') {
    //                         // 添加隐藏/展开按钮
    //                         const toggleButton = document.createElement('button');
    //                         toggleButton.textContent = 'Hide'; // 默认显示展开状态
    //                         toggleButton.style.marginLeft = '0px';
    //                         toggleButton.style.marginTop = '-7px';
    //                         toggleButton.style.marginBottom = '2px';
    //                         toggleButton.className = 'el-button';
    //
    //                         // 嵌套表格
    //                         const nestedTable = renderData(data[key], level + 1);
    //                         td.appendChild(toggleButton);
    //                         td.appendChild(nestedTable);
    //                         td.style.verticalAlign = 'top'; // 确保嵌套表格从顶部对齐
    //
    //                         // 隐藏/展开功能
    //                         toggleButton.addEventListener('click', function () {
    //                             if (nestedTable.style.display === 'none') {
    //                                 nestedTable.style.display = '';
    //                                 toggleButton.textContent = 'Hide';
    //                             } else {
    //                                 nestedTable.style.display = 'none';
    //                                 toggleButton.textContent = 'Show';
    //                             }
    //                         });
    //                     } else {
    //                         // 显示单一值
    //                         td.textContent = i === 0 ? data[key] : ''; // 确保值只显示在第一行
    //                         td.rowSpan = rowCount; // 合并行，避免空白
    //                         td.classList.add('el-hover-cell'); // 只有最底层的值加悬浮效果
    //                     }
    //
    //                     row.appendChild(td);
    //                 });
    //                 table.appendChild(row);
    //             }
    //         }
    //
    //         return table;
    //     }
    //
    //
    //     store.watch(() => store.state.globalHighlight, (newValue) => {
    //         const tableCells = document.querySelectorAll('.el-table td');
    //         const filterParameters = store.state.filterRules
    //         let allValues = []
    //
    //         for (const [key, values] of Object.entries(filterParameters)) {
    //             for (const [key, value] of Object.entries(values)) {
    //                 allValues.push(value)
    //             }
    //         }
    //         tableCells.forEach((td) => {
    //             // 获取每个 td 的文本内容
    //             const cellValue = td.textContent.trim();
    //             // 如果该单元格的值在 highlightedValues 数组中，则添加高亮类名，否则移除
    //             if (allValues.includes(cellValue)) {
    //                 td.classList.add('highlighted');
    //             } else {
    //                 td.classList.remove('highlighted');
    //             }
    //         });
    //     }, { deep: true });
    //
    //     store.watch(() => store.state.globalMouseover, (newValue) => {
    //         const tableCells = document.querySelectorAll('.el-table td');
    //         const filterParameters = store.state.mouseoverRules
    //         let allValues = []
    //
    //         for (const [key, values] of Object.entries(filterParameters)) {
    //             for (const [key, value] of Object.entries(values)) {
    //                 allValues.push(value)
    //             }
    //         }
    //
    //         tableCells.forEach((td) => {
    //             // 获取每个 td 的文本内容
    //             const cellValue = td.textContent.trim();
    //             // 如果该单元格的值在 highlightedValues 数组中，则添加高亮类名，否则移除
    //             if (allValues.includes(cellValue)) {
    //                 td.classList.add('mouseovered');
    //             } else {
    //                 td.classList.remove('mouseovered');
    //             }
    //         });
    //     }, { deep: true });
    //
    //
    //     container.innerHTML = ''; // 清空容器
    //     const topLevelTable = renderData(data); // 渲染数据
    //     container.appendChild(topLevelTable);
    // },

    createTable(containerId, data) {
        // 获取目标容器元素
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        if (container) {
            container.innerHTML = '';
        }

        // 禁用 container 的 overflow
        container.style.overflow = 'hidden';

        // 递归渲染数据为表格，带有隐藏/展开功能
        function renderData(data, parentContainer, containerId, level = 1) {
            const table = document.createElement('table');
            table.classList.add('el-table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';

            parentContainer.appendChild(table);

            if (typeof data === 'object' && !Array.isArray(data)) {
                const keys = Object.keys(data);

                // 动态创建表头
                const headerRow = document.createElement('tr');
                keys.forEach((key) => {
                    const th = document.createElement('th');
                    th.textContent = key;
                    th.style.border = '1px solid #e0e0e0';
                    th.style.padding = '10px';
                    th.style.background = '#f3f3f3';
                    th.style.fontWeight = 'bold';
                    headerRow.appendChild(th);
                });
                table.appendChild(headerRow);

                // 创建行数据容器
                const tbody = document.createElement('tbody');
                table.appendChild(tbody);

                // 计算最大行数
                const rowCount = Math.max(...keys.map(key => Array.isArray(data[key]) ? data[key].length : 1));

                if (level === 1) {
                    // 顶层表格启用虚拟滚动
                    let startIndex = 0;
                    let batchSize = Math.min(20, rowCount);

                    function renderRows() {
                        if (startIndex >= rowCount) {
                            return;
                        }
                        const fragment = document.createDocumentFragment();
                        const toIndex = Math.min(startIndex + batchSize, rowCount);

                        for (let i = startIndex; i < toIndex; i++) {
                            const row = createRow(keys, data, i, rowCount, containerId, level);
                            fragment.appendChild(row);
                        }
                        tbody.appendChild(fragment);

                        startIndex += batchSize;

                        // 检查容器是否需要继续加载
                        if (parentContainer.scrollHeight <= parentContainer.clientHeight && startIndex < rowCount) {
                            renderRows();
                        }
                    }

                    // 初始渲染
                    renderRows();

                    // 监听滚动事件
                    parentContainer.addEventListener('scroll', function () {
                        if (parentContainer.scrollTop + parentContainer.clientHeight >= parentContainer.scrollHeight - 10) {
                            renderRows();
                        }
                    });
                } else {
                    // 嵌套表格默认隐藏行数据，但显示表头
                    // tbody.style.display = 'none'; // 默认隐藏行数据
                    tbody.style.display = ''; // 默认隐藏行数据


                    // 渲染所有行
                    for (let i = 0; i < rowCount; i++) {
                        const row = createRow(keys, data, i, rowCount, containerId, level, tbody);
                        tbody.appendChild(row);
                    }
                }
            }
        }

        function createRow(keys, data, rowIndex, rowCount, containerId, level, tbody) {
            const row = document.createElement('tr');
            keys.forEach((key) => {
                const td = document.createElement('td');
                td.style.border = '1px solid #e0e0e0';
                td.style.padding = '10px';

                if (Array.isArray(data[key])) {
                    const value = data[key][rowIndex] !== undefined ? data[key][rowIndex] : '';
                    td.textContent = value;
                    td.classList.add('el-hover-cell');
                    attachCellEventListeners(td, key, value, containerId);

                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    if (rowIndex === 0) {
                        // 添加隐藏/展开按钮
                        const toggleButton = document.createElement('button');
                        // toggleButton.textContent = 'Show';
                        toggleButton.textContent = 'Hide';
                        toggleButton.style.marginLeft = '0px';
                        toggleButton.style.marginTop = '-7px';
                        toggleButton.style.marginBottom = '2px';
                        toggleButton.className = 'el-button';

                        td.appendChild(toggleButton);

                        const nestedTableContainer = document.createElement('div');
                        td.appendChild(nestedTableContainer);

                        td.style.verticalAlign = 'top';
                        td.rowSpan = rowCount;

                        // 渲染嵌套表格的表头和行（行默认隐藏）
                        renderData(data[key], nestedTableContainer, containerId, level + 1);

                        // 获取嵌套表格的 tbody，用于控制行数据的显示和隐藏
                        const nestedTable = nestedTableContainer.querySelector('table');
                        const nestedTbody = nestedTable.querySelector('tbody');

                        // 添加展开/折叠功能
                        toggleButton.addEventListener('click', function () {
                            if (nestedTbody.style.display === 'none') {
                                nestedTbody.style.display = ''; // 显示行数据
                                toggleButton.textContent = 'Hide';
                            } else {
                                nestedTbody.style.display = 'none'; // 隐藏行数据
                                toggleButton.textContent = 'Show';
                            }
                        });
                    } else {
                        // 非首行，填充空单元格并隐藏
                        td.style.display = 'none';
                    }
                } else {
                    const value = rowIndex === 0 ? data[key] : '';
                    td.textContent = value;
                    if (rowIndex === 0) {
                        td.rowSpan = rowCount;
                    } else {
                        td.style.display = 'none';
                    }
                    td.classList.add('el-hover-cell');
                    attachCellEventListeners(td, key, value, containerId);
                }

                row.appendChild(td);
            });

            return row;
        }

        function attachCellEventListeners(td, key, value, containerId) {
            if (typeof value === 'string' && value.includes('GMT')) {
                value = formatDateTime(value);
                td.textContent = value;
            }

            td.addEventListener('click', function () {
                createBrushSet(containerId, [value]);
                const myObject = {};
                myObject[key] = value;
                changeGlobalHighlight(myObject, containerId);
                td.classList.toggle('highlighted');
            });

            td.addEventListener('mouseover', function () {
                // createBrushSet(containerId, [value]);
                const myObject = {};
                myObject[key] = value;
                changeGlobalMouseover(myObject, containerId);
            });

            td.addEventListener('mouseout', function () {
                const myObject = {};
                myObject[key] = value;
                changeGlobalMouseover(myObject, containerId);
            });
        }


        store.watch(() => store.state.globalHighlight, (newValue) => {
            const tableCells = document.querySelectorAll('.el-table td');
            const filterParameters = store.state.filterRules
            let allValues = []

            for (const [key, values] of Object.entries(filterParameters)) {
                for (const [key, value] of Object.entries(values)) {
                    allValues.push(value)
                }
            }
            tableCells.forEach((td) => {
                // 获取每个 td 的文本内容
                const cellValue = td.textContent.trim();
                // 如果该单元格的值在 highlightedValues 数组中，则添加高亮类名，否则移除
                if (allValues.includes(cellValue)) {
                    td.classList.add('highlighted');
                } else {
                    td.classList.remove('highlighted');
                }
            });
        }, { deep: true });

        store.watch(() => store.state.globalMouseover, (newValue) => {
            const tableCells = document.querySelectorAll('.el-table td');
            const filterParameters = store.state.mouseoverRules
            let allValues = []

            for (const [key, values] of Object.entries(filterParameters)) {
                for (const [key, value] of Object.entries(values)) {
                    allValues.push(value)
                }
            }

            tableCells.forEach((td) => {
                // 获取每个 td 的文本内容
                const cellValue = td.textContent.trim();
                // 如果该单元格的值在 highlightedValues 数组中，则添加高亮类名，否则移除
                if (allValues.includes(cellValue)) {
                    td.classList.add('mouseovered');
                } else {
                    td.classList.remove('mouseovered');
                }
            });
        }, { deep: true });

        const tableContainer = document.createElement('div');
        tableContainer.style.maxHeight = '100%'; // 设置表格容器的最大高度
        tableContainer.style.overflowY = 'auto'; // 启用垂直滚动

        container.appendChild(tableContainer);

        // 顶层表格渲染
        renderData(data, tableContainer, containerId);
    },

    createList(containerId, data) {
        // 获取目标容器元素
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        container.style.overflow = "auto";
        function renderData(data, level) {
            const table = document.createElement('table');
            table.classList.add('el-table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';

            for (const key in data) {
                const tr = document.createElement('tr');
                tr.classList.add('el-table-row', `level-${level}`);

                const th = document.createElement('th');
                th.textContent = key;
                th.classList.add('el-table-column', `level-${level}`);
                th.style.border = '1px solid #e0e0e0';
                th.style.padding = '10px';
                th.style.textAlign = 'left';
                th.style.background = '#f3f3f3';
                th.style.fontWeight = 'bold';

                const value = data[key];

                if (typeof value === 'object' && !Array.isArray(value)) {
                    // 添加展开/隐藏按钮
                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'el-button';
                    toggleButton.textContent = 'Hide'; // 默认状态为展开，所以按钮显示“隐藏”
                    const nestedRow = document.createElement('tr');
                    nestedRow.classList.add('nested-table', `level-${level + 1}`);

                    toggleButton.onclick = () => {
                        toggleVisibility(nestedRow, toggleButton);
                    };
                    th.appendChild(toggleButton);

                    // 创建嵌套表格所在的行
                    const td = document.createElement('td');
                    td.colSpan = 2;
                    td.appendChild(renderData(value, level + 1));
                    nestedRow.appendChild(td);

                    tr.appendChild(th);
                    table.appendChild(tr);
                    table.appendChild(nestedRow);
                } else {
                    // 显示键值对
                    const tdValue = document.createElement('td');
                    tdValue.textContent = value;
                    tdValue.style.border = '1px solid #e0e0e0';
                    tdValue.style.width = "70%"; // 直接设置宽度
                    tdValue.style.padding = '10px';
                    tdValue.style.textAlign = 'left';

                    tr.appendChild(th);
                    tr.appendChild(tdValue);
                    table.appendChild(tr);
                }
            }

            return table;
        }

        container.innerHTML = ''; // 清空容器
        const topLevelTable = renderData(data, 1); // 从第一级开始渲染
        container.appendChild(topLevelTable);
    },

    createScatter(containerId, data){
        // 数值型数据的键
        const allDataKeys = Object.keys(data)
        const numericKeys = allDataKeys.filter(key =>
            data[key].every(value => typeof value === 'number')
        );
        // 创建下拉框
        const selectAttr1 = document.createElement('select');
        selectAttr1.id = 'time-selection';
        selectAttr1.className = 'my-select';

        numericKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.innerText = key;
            selectAttr1.appendChild(option);
        });
        selectAttr1.selectedIndex = 0; // 设置下拉框默认选择第一个选项

        const selectAttr2 = document.createElement('select');
        selectAttr2.id = 'time-selection';
        selectAttr2.className = 'my-select';

        numericKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.innerText = key;
            selectAttr2.appendChild(option);
        });
        selectAttr2.selectedIndex = 1; // 设置下拉框默认选择第一个选项

        selectAttr1.addEventListener('change', function() {
            drawScatter(data, selectAttr1.value, selectAttr2.value)
        });

        selectAttr2.addEventListener('change', function() {
            drawScatter(data, selectAttr1.value, selectAttr2.value)
        });

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        container.appendChild(selectAttr1);
        container.appendChild(selectAttr2);

        // 设置SVG容器
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const lastSize = { width: container.clientWidth, height: container.clientHeight };

        const containerRect = container.getBoundingClientRect();
        const chartWidth = 0.88 * containerWidth;
        const chartHeight = 0.85 * containerHeight;
        let margin = { top: 0.025 * containerHeight, left: (containerWidth - chartWidth) / 2 };

        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'svgContainer' + containerId)
            .attr('width', containerWidth)
            .attr('height', containerHeight-55)
            .attr('overflow', 'auto');

        let chartGroup, xScale, yScale
        drawScatter(data, selectAttr1.value, selectAttr2.value)
        function drawScatter(data, attr1, attr2){
            d3.select(container)
                .select(".tooltip")
                .remove();
            svg.selectAll('*').remove();

            const data1 = data[attr1]
            const data2 = data[attr2]
            // 合并数据
            const scatterData = data1.map((d, i) => ({x: d, y: data2[i]}));

            const tooltip = d3.select(container)
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);

            chartGroup = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // 创建比例尺
            xScale = d3.scaleLinear()
                .domain(d3.extent(scatterData, d => d.x))
                .range([0, chartWidth]);

            yScale = d3.scaleLinear()
                .domain(d3.extent(scatterData, d => d.y))
                .range([chartHeight, 0]);
            // 创建轴线
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            // 添加x轴
            chartGroup.append('g')
                .attr('transform', `translate(0, ${chartHeight})`)
                .attr('class', 'x-axis')
                .call(xAxis);
            // 添加y轴
            chartGroup.append('g')
                .attr('class', 'y-axis')
                .call(yAxis);

            // 绘制数据点
            chartGroup.selectAll(".dot")
                .data(scatterData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("r", 3.5)
                .attr("cx", d => xScale(d.x))
                .attr("cy", d => yScale(d.y))
                .style("fill", "steelblue")
                .style("cursor", "pointer")
                .on('mouseover', function(event, d) {
                    const myObject1 = {};
                    const myObject2 = {};
                    myObject1[attr1] = d.x.toString()
                    myObject2[attr2] = d.y.toString()
                    changeGlobalMouseover(myObject1, containerId)
                    changeGlobalMouseover(myObject2, containerId)

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`${attr1}: <strong>${d.x}</strong><br>${attr2}: <strong>${d.y}</strong>`)
                        .style('left', (event.pageX)-containerRect.left + 'px')
                        .style('top', (event.pageY)-containerRect.top + 'px');
                })
                .on('mouseout', function(event, d) {
                    const myObject1 = {};
                    const myObject2 = {};
                    myObject1[attr1] = d.x.toString()
                    myObject2[attr2] = d.y.toString()
                    changeGlobalMouseover(myObject1, containerId)
                    changeGlobalMouseover(myObject2, containerId)

                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('filter', '');
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                })
                .on('click', function(event, d) {
                    // createBrushSet(containerId,[d.data.name.split("@")[0]])
                    event.stopPropagation();
                    const myObject1 = {};
                    const myObject2 = {};
                    myObject1[attr1] = d.x.toString()
                    myObject2[attr2] = d.y.toString()
                    changeGlobalHighlight(myObject1, containerId)
                    changeGlobalHighlight(myObject2, containerId)
                })
        }

        // 使用 ResizeObserver 监听容器大小变化
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentBoxSize) {
                    resizeLine()
                }
            }
        });
        // 观察 svg 容器大小变化
        resizeObserver.observe(container);
        function resizeLine() {
            const threshold = 5; // 阈值
            // 获取新的容器尺寸
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const chartWidth = 0.88 * containerWidth;
            const chartHeight = 0.85 * containerHeight;
            // 检查尺寸变化是否超过阈值
            if (Math.abs(containerWidth - lastSize.width) > threshold ||
                Math.abs(containerHeight - lastSize.height) > threshold) {

                margin = {
                    top: 0.02 * containerHeight,
                    left: (containerWidth - chartWidth) / 2,
                };

                svg.attr('width', containerWidth)
                    .attr('height', containerHeight -55)

                xScale.range([0, chartWidth]);
                yScale.range([chartHeight, 0]);

                svg.attr('width', containerWidth)
                    .attr('height', containerHeight)

                chartGroup.attr('transform', `translate(${margin.left}, ${margin.top})`)
                // 更新坐标轴位置和调用
                chartGroup.select('.x-axis')
                    .attr('transform', `translate(0,${chartHeight})`)
                    .call(d3.axisBottom(xScale));

                chartGroup.select('.y-axis').call(d3.axisLeft(yScale));

                chartGroup.selectAll(".dot")
                    .attr("cx", d => xScale(d.x))
                    .attr("cy", d => yScale(d.y))

                // 更新记录的尺寸
                lastSize.width = containerWidth;
                lastSize.height = containerHeight;
            }
        }
    },

    createBarChart(containerId, data){
        // 检查数据的有效性
        if (!data || Object.keys(data).length === 0) {
            return;
        }

        // 当容器尺寸变化时的处理函数
        function onResize() {
            // 获取新的容器尺寸
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const chartWidth = 0.88 * containerWidth;
            const chartHeight = 0.85 * containerHeight;
            // 检查尺寸变化是否超过阈值
            if (Math.abs(containerWidth - lastSize.width) > threshold ||
                Math.abs(containerHeight - lastSize.height) > threshold) {

                margin = {
                    top: 0.06 * containerHeight,
                    left: (containerWidth - chartWidth) / 2,
                    right: 0.02 * containerWidth
                };
                xScale.range([0, chartWidth]);
                yScale.range([chartHeight, 0]);

                svg.attr('width', containerWidth)
                    .attr('height', containerHeight)

                svg.style('width', containerWidth + 'px')
                    .style('height', containerHeight + 'px');

                chartGroup.attr('transform', `translate(${margin.left}, ${margin.top})`)
                // 更新坐标轴位置和调用
                chartGroup.select('.x-axis')
                    .attr('transform', `translate(0,${chartHeight})`)
                    .call(d3.axisBottom(xScale));

                chartGroup.select('.y-axis').call(d3.axisLeft(yScale));
                // 更新坐标轴

                outerKeys.forEach((key, i) => {
                    chartGroup.selectAll('.oldBarChart')
                        .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                        .attr('y', d => yScale(data[key][d]))
                        .attr('width', xScale.bandwidth() / outerKeys.length)
                        .attr('height', d => chartHeight - yScale(data[key][d]));
                    chartGroup.selectAll('.newBarChart')
                        .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                        .attr('y', d => yScale(filledData[key][d]))
                        .attr('width', xScale.bandwidth() / outerKeys.length)
                        .attr('height', d => {
                            return chartHeight - yScale(filledData[key][d])});
                    chartGroup.selectAll('.mouseoverBarChart')
                        .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                        .attr('y', (d) => {
                            return yScale(mouseoverData[key][d]);
                        })
                        .attr('width', xScale.bandwidth() / outerKeys.length)
                        .attr('height', d => chartHeight - yScale(mouseoverData[key][d]));
                    chartGroup.selectAll('.eventBarChart')
                        .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                        .attr('y', d => yScale(eventData[key][d]))
                        .attr('width', xScale.bandwidth() / outerKeys.length)
                        .attr('height', d => chartHeight - yScale(eventData[key][d]));
                });

                // 更新记录的尺寸
                lastSize.width = containerWidth;
                lastSize.height = containerHeight;
            }
        }

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        let lastSize = { width: container.clientWidth, height: container.clientHeight };
        const threshold = 20; // 阈值
        let filledData
        let mouseoverData
        let eventData
        let patternData

        const containerRect = document.getElementById(containerId).getBoundingClientRect();

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const regex2 = /unique_count\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const matches2 = codeContext.matchAll(regex2);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        if(parameters.length===0){
            for (const match of matches2) {
                parameters.push(match[1]);
            }
        }
        const foundKey = parameters[0]

        const chartWidth = 0.88 * containerWidth;
        const chartHeight = 0.85 * containerHeight;
        let margin = { top: 0.06 * containerHeight, left: (containerWidth - chartWidth) / 2, right: 0.02 * containerWidth };
        const maxFontSize = 14;
        const minFontSize = 10;
        const fontSizeScale = d3.scaleLinear()
            .domain([0, 2000])
            .range([minFontSize, maxFontSize]);

        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'svgContainer'+containerId)
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .attr('overflow','auto')

        const outerKeys = Object.keys(data);

        const chartGroup = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(Object.keys(data[outerKeys[0]]))
            .range([0, chartWidth])
            .padding(0.1);

        const maxValue = d3.max(outerKeys, key => d3.max(Object.keys(data[key]), innerKey => data[key][innerKey]))
        const minValue = d3.min(outerKeys, key => d3.min(Object.keys(data[key]), innerKey => data[key][innerKey]))

        const yScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([chartHeight, 0]);
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format("d")); // "d" 表示整数格式

        // 初始化变量
        let isDragging = false;
        let dragStart = null;
        // 监听鼠标事件

        container.addEventListener('mousedown', function(event) {
            // 记录鼠标起始位置
            dragStart = { x: event.clientX, y: event.clientY };
        });

        container.addEventListener('mousemove', function(event) {
            if (dragStart) {
                // 计算拖动距离
                const deltaX = event.clientX - dragStart.x;
                const deltaY = event.clientY - dragStart.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // 判断是否超过阈值
                if (distance > dragThreshold) {
                    store.dispatch('saveIsClickBrush');
                    isDragging = true;
                }
            }
        });

        container.addEventListener('mouseup', function(event) {
            if (!dragStart) return;
            // 计算拖动结束位置
            const dragEnd = { x: event.clientX, y: event.clientY };
            const deltaX = dragEnd.x - dragStart.x;
            const deltaY = dragEnd.y - dragStart.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // 清除状态
            dragStart = null;
            isDragging = false;
        });

        chartGroup.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .attr('class', 'x-axis')
            .call(xAxis)
            .selectAll('.tick text') // 选择 x 轴上的标签
            .style("cursor","pointer")
            .on('click',(event, d)=>{
                if(!isDragging){
                    createBrushSet(containerId,[d])
                    event.stopPropagation();
                    const myObject = {};
                    myObject[foundKey] = d
                    changeGlobalHighlight(myObject, containerId)
                }
            })
            .on('mouseover',(event, d)=>{
                // createBrushSet(containerId,[d])
                const myObject = {};
                myObject[foundKey] = d
                changeGlobalMouseover(myObject, containerId)
            })
            .on('mouseout',(event, d)=>{
                const myObject = {};
                myObject[foundKey] = d
                changeGlobalMouseover(myObject, containerId)
            })

        chartGroup.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        chartGroup.selectAll('.x-axis text')
            .style('font-size', function(d) {
                const fontSize = fontSizeScale(containerWidth); // 根据宽度计算字体大小
                return fontSize + 'px';
            });

        chartGroup.selectAll('.y-axis text')
            .style('font-size', function(d) {
                const fontSize = fontSizeScale(containerWidth); // 根据宽度计算字体大小
                return fontSize + 'px';
            });

        outerKeys.forEach((key, i) => {
            chartGroup.selectAll('.oldBarChart')
                .data(Object.keys(data[key]))
                .enter().append('rect')
                .attr('barName', d=>'bar-'+key+d)
                .attr("class",'oldBarChart')
                .attr('containerId',containerId)
                .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                .attr('y', d => yScale(data[key][d]))
                .attr('width', xScale.bandwidth() / outerKeys.length)
                .attr('height', d => chartHeight - yScale(data[key][d]))
                .attr('fill', d=> {
                    return getColorForValue(data[key][d], minValue, maxValue);
                })
                .style('cursor','pointer')
                .style('pointer-events', 'all')
                .on('mouseover', function(event, d) {
                    if(!isDragging){
                        if(key===""){
                            const myObject = {};
                            myObject[foundKey] = d
                            changeGlobalMouseover(myObject, containerId)
                            // createBrushSet(containerId,[d])
                        }
                        d3.select(this).attr('opacity', 0.7);
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 0.8);
                        let tooltipContent
                        if(key===""){tooltipContent=`${d} : <strong>${data[key][d]}</strong> `}
                        else{
                            tooltipContent=`${d}<br/>${key}: <strong>${data[key][d]}</strong> `
                        }
                        tooltip.html(tooltipContent)
                            .style('left', (event.pageX)-containerRect.left + 'px')
                            .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                    }
                })
                .on('mouseout', function(event,d) {
                    if(!isDragging){
                        if(key===""){
                            const myObject = {};
                            myObject[foundKey] = d
                            changeGlobalMouseover(myObject, containerId)
                        }
                        d3.select(this).attr('opacity', 1);
                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                    }
                })
                .on("click", function(event, d) {
                    if(!isDragging){
                        createBrushSet(containerId,[d])
                        event.stopPropagation();
                        if(key===""){
                            const myObject = {};
                            myObject[foundKey] = d
                            changeGlobalHighlight(myObject, containerId)}
                        // else{
                        //     changeGlobalHighlight(key, containerId)
                        // }
                    }
                })
        });

        // 创建框选区域
        const setBrush = d3.brush()
            .on("start brush", (event) => brushed(event));

        svg.append("g")
            .attr("class", "setBrush")

        store.watch(() => store.state.isClickBrush, () => {
            svg.select(".setBrush").call(setBrush);
        });

        function brushed(event) {
            if (!event.selection) {
                return; // 没有选择区域，直接返回
            }
            const [x0, y0] = event.selection[0]; // 框选区域左上角
            const [x1, y1] = event.selection[1]; // 框选区域右下角
            const finalData = []
            // 4. 获取选中的柱子
            chartGroup.selectAll('.oldBarChart').each(function(d,i) {
                const bar = d3.select(this);
                const barX = Number(bar.attr('x')) ;
                const barY = Number(bar.attr('y'));
                const barWidth = Number(bar.attr('width'));
                if(barX + barWidth <= x1-margin.left && barX >= x0-margin.left && barY <= y1+margin.top){
                    finalData.push(d);
                }
            });

            createSet1(x0, y0, x1, y1, finalData);
        }

        function createSet1(x0,y0,x1,y1,selectedData) {
            // 移除旧的点击区域
            chartGroup.selectAll('.clickable-region').remove();
            if(selectedData.length!==0) {
                createBrushSet(containerId,selectedData)
            }
            // 创建一个点击响应区域，是否加入异常序列
            svg.append('rect')
                .attr('class', 'set1-region')
                .attr('x', x0)
                .attr('y', y0)
                .attr('width', x1 - x0)
                .attr('height', y1 - y0)
                .style('fill', 'none')
                .style('pointer-events', 'all')
                .on('click', () => {
                    if(selectedData.length!==0) {
                        // createBrushSet(containerId,selectedData)
                        svg.select(".setBrush").call(setBrush.move, null);
                        svg.select(".setBrush").selectAll("*").remove();
                        svg.select(".setBrush").on(".setBrush", null);
                        svg.selectAll('.set1-region').remove();
                    }
                })
        }

        store.watch(() => store.state.isClickCancelBrush, () => {
            svg.select(".setBrush").call(setBrush.move, null);
            svg.select(".setBrush").selectAll("*").remove();
            svg.select(".setBrush").on(".setBrush", null);
            svg.selectAll('.set1-region').remove();
        });


        store.watch(() => store.state.globalHighlight, (newValue) => {
            chartGroup.selectAll('.newBarChart').remove()
            const filteredCodeContext = container.getAttribute("filteredCodeContext");
            let keysInNewData
            if (filteredCodeContext !== null && filteredCodeContext !== "") {
                const code=container.getAttribute("filteredCodeContext")
                axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                    .then(response => {
                        const newData = response.data['result']
                        keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);
                        const filterParameters = store.state.filterRules

                        filledData = fillData(data, newData)
                        // if(containerId!==store.state.curHighlightContainer){
                        outerKeys.forEach((key, i) => {
                            chartGroup.selectAll('.newBarChart')
                                .data(Object.keys(filledData[key]))
                                .enter().append('rect')
                                .attr("class",'newBarChart')
                                .attr('barName', d=>'newBar-'+key+'-'+d)
                                .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                                .attr('y', d => yScale(filledData[key][d]))
                                .attr('width', xScale.bandwidth() / outerKeys.length)
                                .attr('height', d => {
                                    return chartHeight - yScale(filledData[key][d])})
                                .attr('fill', '#A9A9A9')
                                .style('cursor','pointer')
                                .on('mouseover', function(event, d) {
                                    d3.select(this).attr('opacity', 0.7);
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);
                                    let tooltipContent
                                    if(key===""){tooltipContent=`${d} : <strong>${filledData[key][d]}</strong> `}
                                    else{
                                        tooltipContent=`${d}<br/>${key}: <strong>${filledData[key][d]}</strong> `
                                    }
                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                                })
                                .on('mouseout', function() {
                                    d3.select(this).attr('opacity', 1);
                                    tooltip.transition()
                                        .duration(500)
                                        .style('opacity', 0);
                                })
                                .on("click", function(event, d) {
                                    event.stopPropagation();
                                    if(key===""){
                                        const myObject = {};
                                        myObject[foundKey] = d
                                        changeGlobalHighlight(myObject, containerId)}
                                    onResize()
                                    // else{
                                    //     changeGlobalHighlight(key, containerId)
                                    // }
                                })
                        });
                        // }
                        // 高亮x轴
                        if(Object.keys(filterParameters).includes(foundKey)){
                            chartGroup.selectAll('.x-axis text')
                                .style('font-weight', axisText => keysInNewData.includes(axisText) ? 'bold' : 'normal')
                                .style('fill', axisText => keysInNewData.includes(axisText) ? '#F56C6C' : '#606266');
                        }
                        else{
                            chartGroup.selectAll('.x-axis text')
                                .style('font-weight', 'normal')
                                .style('fill', '#606266');
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
            else{
                chartGroup.selectAll('.x-axis text')
                    .style('font-weight', axisText => store.state.globalHighlight.includes(axisText) ? 'bold' : 'normal')
                    .style('fill', axisText => store.state.globalHighlight.includes(axisText) ? '#F56C6C' : '#606266');
            }
            onResize()
        }, { deep: true });

        store.watch(() => store.state.globalMouseover, (newValue) => {
            chartGroup.selectAll('.mouseoverBarChart').remove()
            const filteredCodeContext = container.getAttribute("mouseoverCodeContext");
            let keysInNewData
            if (filteredCodeContext !== null && filteredCodeContext !== "") {
                const code=container.getAttribute("mouseoverCodeContext")
                axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                    .then(response => {
                        const newData = response.data['result']
                        keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);
                        const filterParameters = store.state.mouseoverRules

                        // 高亮柱状图
                        mouseoverData = fillData(data, newData)
                        if(containerId!==store.state.curMouseoverContainer){
                            outerKeys.forEach((key, i) => {
                                chartGroup.selectAll('.mouseoverBarChart')
                                    .data(Object.keys(mouseoverData[key]))
                                    .enter().append('rect')
                                    .attr("class",'mouseoverBarChart')
                                    .attr('barName', d=>'mouseoverBar-'+key+'-'+d)
                                    .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                                    .attr('y', d => yScale(mouseoverData[key][d]))
                                    .attr('width', xScale.bandwidth() / outerKeys.length)
                                    .attr('height', d => {
                                        return chartHeight - yScale(mouseoverData[key][d])})
                                    .attr('fill', '#eeeeee')
                                    .style('cursor','pointer')
                                    .on('mouseover', function(event, d) {
                                        d3.select(this).attr('opacity', 0.7);
                                        tooltip.transition()
                                            .duration(200)
                                            .style('opacity', 0.8);
                                        let tooltipContent
                                        if(key===""){tooltipContent=`${d} : <strong>${mouseoverData[key][d]}</strong> `}
                                        else{
                                            tooltipContent=`${d}<br/>${key}: <strong>${mouseoverData[key][d]}</strong> `
                                        }
                                        tooltip.html(tooltipContent)
                                            .style('left', (event.pageX)-containerRect.left + 'px')
                                            .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                                        // onResize()
                                    })
                                    .on('mouseout', function() {
                                        d3.select(this).attr('opacity', 1);
                                        tooltip.transition()
                                            .duration(500)
                                            .style('opacity', 0);
                                    });
                            });
                        }
                        // 高亮x轴
                        if(Object.keys(filterParameters).includes(foundKey)){
                            chartGroup.selectAll('.x-axis text')
                                .classed('mouseover-legend', axisText => keysInNewData.includes(axisText));
                        }
                        else{
                            chartGroup.selectAll('.x-axis text')
                                .classed('mouseover-legend', axisText => keysInNewData.includes(axisText));
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
            else{
                chartGroup.selectAll('.x-axis text')
                    .classed('mouseover-legend', false)
            }
            onResize()
        }, { deep: true });

        store.watch(() => store.state.brushedEvent, (newValue) => {
            chartGroup.selectAll('.eventBarChart').remove()
            const brushedCodeContext = container.getAttribute("brushedCodeContext");
            let keysInNewData
            if (brushedCodeContext !== null && brushedCodeContext !== "") {
                const code=container.getAttribute("brushedCodeContext")
                const [dataKey] = code.split(".");
                const originalData = store.state.originalTableData[dataKey]
                const foundKey = findKeyByValue(originalData, Object.keys(data[outerKeys[0]])[0]);
                if(!code.includes("pattern")){
                    axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                        .then(response => {
                            const newData = response.data['result']
                            keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);
                            const filterParameters = store.state.brushedRules

                            eventData = fillData(data, newData)
                            outerKeys.forEach((key, i) => {
                                chartGroup.selectAll('.eventBarChart')
                                    .data(Object.keys(eventData[key]))
                                    .enter().append('rect')
                                    .attr("class",'eventBarChart')
                                    .attr('barName', d=>'eventBar-'+key+'-'+d)
                                    .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                                    .attr('y', d => yScale(eventData[key][d]))
                                    .attr('width', xScale.bandwidth() / outerKeys.length)
                                    .attr('height', d => {
                                        return chartHeight - yScale(eventData[key][d])})
                                    .attr('fill', '#A9A9A9')
                                    .style('cursor','pointer')
                                    .on('mouseover', function(event, d) {
                                        d3.select(this).attr('opacity', 0.7);
                                        tooltip.transition()
                                            .duration(200)
                                            .style('opacity', 0.8);
                                        let tooltipContent
                                        if(key===""){tooltipContent=`${d} : <strong>${eventData[key][d]}</strong> `}
                                        else{
                                            tooltipContent=`${d}<br/>${key}: <strong>${eventData[key][d]}</strong> `
                                        }
                                        tooltip.html(tooltipContent)
                                            .style('left', (event.pageX)-containerRect.left + 'px')
                                            .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                                    })
                                    .on('mouseout', function() {
                                        d3.select(this).attr('opacity', 1);
                                        tooltip.transition()
                                            .duration(500)
                                            .style('opacity', 0);
                                    })
                                    .on("click", function(event, d) {
                                        event.stopPropagation();
                                        if(key===""){
                                            const myObject = {};
                                            myObject[foundKey] = d
                                            changeGlobalHighlight(myObject, containerId)}
                                        // else{
                                        //     changeGlobalHighlight(key, containerId)
                                        // }
                                    })
                            });
                            // 高亮x轴
                            if(Object.keys(filterParameters).includes(foundKey)){
                                chartGroup.selectAll('.x-axis text')
                                    .style('font-weight', axisText => keysInNewData.includes(axisText) ? 'bold' : 'normal')
                                    .style('fill', axisText => keysInNewData.includes(axisText) ? '#F56C6C' : '#606266');
                            }
                            else{
                                chartGroup.selectAll('.x-axis text')
                                    .style('font-weight', 'normal')
                                    .style('fill', '#606266');
                            }

                        })
                        .catch(error => {
                            console.error(error);
                        });
                }
            }
            else{
                chartGroup.selectAll('.x-axis text')
                    .style('font-weight', axisText => store.state.globalHighlight.includes(axisText) ? 'bold' : 'normal')
                    .style('fill', axisText => store.state.globalHighlight.includes(axisText) ? '#F56C6C' : '#606266');
            }
        }, { deep: true });

        store.watch(() => store.state.brushedPattern, (newValue) => {
            chartGroup.selectAll('.patternBarChart').remove()
            const codeContext = container.getAttribute("codeContext");
            // 去除 .count()
            let stringWithoutCount = codeContext.replace(".count()", "");
            let code = stringWithoutCount.replace(".view_type(\"bar chart\")", ".view_type(\"timeline\")")
            if(code.includes("pattern")){
                axios.post('http://127.0.0.1:5000/executeCode', { code: code, support: store.state.curMinSupport })
                    .then(response => {
                        const newData = response.data['result']
                        const patternList = countMatchingLists(newData,newValue)
                        patternData = {"":patternList}
                        outerKeys.forEach((key, i) => {
                            chartGroup.selectAll('.patternBarChart')
                                .data(Object.keys(patternData[key]))
                                .enter().append('rect')
                                .attr("class",'patternBarChart')
                                .attr('barName', d=>'patternBar-'+key+'-'+d)
                                .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                                .attr('y', d => yScale(patternData[key][d]))
                                .attr('width', xScale.bandwidth() / outerKeys.length)
                                .attr('height', d => {
                                    return chartHeight - yScale(patternData[key][d])})
                                .attr('fill', '#A9A9A9')
                                .style('cursor','pointer')
                                .on('mouseover', function(event, d) {
                                    d3.select(this).attr('opacity', 0.7);
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);
                                    let tooltipContent
                                    if(key===""){tooltipContent=`${d} : <strong>${patternData[key][d]}</strong> `}
                                    else{
                                        tooltipContent=`${d}<br/>${key}: <strong>${patternData[key][d]}</strong> `
                                    }
                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                                })
                                .on('mouseout', function() {
                                    d3.select(this).attr('opacity', 1);
                                    tooltip.transition()
                                        .duration(500)
                                        .style('opacity', 0);
                                })
                                .on("click", function(event, d) {
                                    event.stopPropagation();
                                    if(key===""){
                                        const myObject = {};
                                        myObject[foundKey] = d
                                        changeGlobalHighlight(myObject, containerId)}
                                    // else{
                                    //     changeGlobalHighlight(key, containerId)
                                    // }
                                })
                        });
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
        }, { deep: true });

        store.watch(() => store.state.curMinSupport, (newValue) => {
            chartGroup.selectAll('.newBarChart').remove()
            chartGroup.selectAll('.eventBarChart').remove()
            chartGroup.selectAll('.patternBarChart').remove()
            const code=container.getAttribute("codeContext")
            if(code.includes("pattern")){
                axios.post('http://127.0.0.1:5000/executeCode', { code: code, support:newValue })
                    .then(response => {
                        const newData = response.data['result']
                        // 计算新的最大值和最小值
                        const newMaxValue = d3.max(outerKeys, key => d3.max(Object.keys(newData[key]), innerKey => newData[key][innerKey]));
                        const newMinValue = d3.min(outerKeys, key => d3.min(Object.keys(newData[key]), innerKey => newData[key][innerKey]));
                        // 更新 y 轴的比例尺
                        yScale.domain([0, newMaxValue])
                        const yAxisTicks = yScale.ticks()
                            .filter(tick => Number.isInteger(tick));
                        const yAxis = d3.axisLeft(yScale)
                            .tickValues(yAxisTicks)
                            .tickFormat(d3.format('d'));

                        chartGroup.select('.y-axis').call(yAxis);
                        // 绑定新的数据到矩形上
                        outerKeys.forEach((key, i) => {
                            chartGroup.selectAll('.oldBarChart')
                                .attr('x', d => xScale(d) + i * (xScale.bandwidth() / outerKeys.length))
                                .attr('y', d => yScale(newData[key][d]))
                                .attr('width', xScale.bandwidth() / outerKeys.length)
                                .attr('height', d => chartHeight - yScale(newData[key][d]))
                                .attr('fill', d=> {
                                    return getColorForValue(newData[key][d], newMinValue, newMaxValue);
                                })
                                .on('mouseover', function(event, d) {
                                    d3.select(this).attr('opacity', 0.7);
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);
                                    let tooltipContent
                                    if(key===""){tooltipContent=`${d} : <strong>${newData[key][d]}</strong> `}
                                    else{
                                        tooltipContent=`${d}<br/>${key}: <strong>${newData[key][d]}</strong> `
                                    }
                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY*0.98)-containerRect.top + 'px');
                                })
                        });
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
        }, { deep: true });

        store.watch(() => store.state.isClickCancelFilter, () => {
            chartGroup.selectAll('.eventBarChart').remove()
        });


        // 当取消筛选的时候也需要重新绘制
        const bbox = chartGroup.node().getBBox();
        svg.style("width",bbox.width+margin.left+margin.right)
        svg.style("height",bbox.height+margin.top)

        // 创建一个新的ResizeObserver实例，并将其绑定到容器上
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                onResize();
            }
        });
        resizeObserver.observe(container);
    },

    createPieChart(containerId, data) {
        const seriesData = [];
        for (const outerKey in data) {
            for (const innerKey in data[outerKey]) {
                seriesData.push({
                    name: innerKey,
                    value: data[outerKey][innerKey]
                });
            }
        }
        // 使用Array.map()从seriesData中提取所有的value
        const values = seriesData.map(item => item.value);
        // 使用Math.min()和Math.max()来找到最小值和最大值
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';

        let highlightSeriesData = []
        let mouseoverSeriesData = []
        let eventSeriesData = []

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const regex2 = /unique_count\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const matches2 = codeContext.matchAll(regex2);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        if(parameters.length===0){
            for (const match of matches2) {
                parameters.push(match[1]);
            }
        }
        const foundKey = parameters[0]

        function updatePieChart() {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            // container.style.overflow = "hidden";

            const newRadius = Math.min(containerWidth, containerHeight) / 2.5;

            svg.attr('width', containerWidth)
                .attr('height', containerHeight)

            svg.style('width', containerWidth)
                .style('height', containerHeight);

            // 更新饼图容器和图例的位置
            pieContainer.attr('transform', `translate(${containerWidth / 2},${containerHeight / 2})`);
            legendContainer.attr('transform', `translate(${containerWidth/2},${containerHeight / 2})`);
            const newArc = d3.arc().outerRadius(newRadius).innerRadius(0);
            const highlightArc = d3.arc().outerRadius(d => newRadius * (findValueByName(highlightSeriesData,d.data.name) / d.data.value)).innerRadius(0);
            const mouseoverArc = d3.arc().outerRadius(d => newRadius * (findValueByName(mouseoverSeriesData,d.data.name) / d.data.value)).innerRadius(0);
            const eventArc = d3.arc().outerRadius(d => newRadius * (findValueByName(eventSeriesData,d.data.name) / d.data.value)).innerRadius(0);

            svg.selectAll('.arc path')
                .attr('d', newArc);
            svg.selectAll('.highlightArc path')
                .attr('d', highlightArc);
            svg.selectAll('.mouseoverArc path')
                .attr('d', mouseoverArc);
            svg.selectAll('.eventArc path')
                .attr('d', eventArc);
        }

        // 初始化变量
        let isDragging = false;
        let dragStart = null;
        // 监听鼠标事件

        container.addEventListener('mousedown', function(event) {
            // 记录鼠标起始位置
            dragStart = { x: event.clientX, y: event.clientY };
        });

        container.addEventListener('mousemove', function(event) {
            if (dragStart) {
                // 计算拖动距离
                const deltaX = event.clientX - dragStart.x;
                const deltaY = event.clientY - dragStart.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // 判断是否超过阈值
                if (distance > dragThreshold) {
                    store.dispatch('saveIsClickBrush');
                    isDragging = true;
                }
            }
        });

        container.addEventListener('mouseup', function(event) {
            if (!dragStart) return;
            // 计算拖动结束位置
            const dragEnd = { x: event.clientX, y: event.clientY };
            const deltaX = dragEnd.x - dragStart.x;
            const deltaY = dragEnd.y - dragStart.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // 清除状态
            dragStart = null;
            isDragging = false;
        });

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRect = document.getElementById(containerId).getBoundingClientRect();
        const radius = Math.min(containerWidth, containerHeight) / 2.5;

        const svg = d3.select(container).append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
        const pieContainer = svg.append('g')
            .attr('transform', `translate(${containerWidth / 2},${containerHeight / 2})`);
        const legendContainer = svg.append('g')
            .attr('transform', `translate(${containerWidth / 2},${containerHeight / 2})`);

        const pie = d3.pie().value(d => d.value);
        const arc = d3.arc().outerRadius(radius).innerRadius(0);
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const arcs = pieContainer.selectAll('arc')
            .data(pie(seriesData))
            .enter()
            .append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('stroke', "#DCDCDC")
            .attr('fill', (d) => {
                return getColorForValue(d.value,minValue,maxValue)})
            .style('cursor','pointer')
            .on('mouseover', function (event, d) {
                if(!isDragging){
                    const myObject = {};
                    myObject[foundKey] = d.data.name
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('filter', 'url(#shadow)');
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.8);

                    let tooltipContent

                    tooltipContent=`${d.data.name}: <strong>${d.data.value}</strong> `

                    tooltip.html(tooltipContent)
                        .style('left', (event.pageX)-containerRect.left + 'px')
                        .style('top', (event.pageY)-containerRect.top + 'px');
                    changeGlobalMouseover(myObject, containerId)
                }
            })
            .on('mouseout', function (event, d) {
                if(!isDragging){
                    const myObject = {};
                    myObject[foundKey] = d.data.name
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('filter', '');
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                    changeGlobalMouseover(myObject, containerId)
                }
            })
            .on("click", function(event, d) {
                if(!isDragging){
                    event.stopPropagation();
                    const myObject = {};
                    myObject[foundKey] = d.data.name
                    changeGlobalHighlight(myObject, containerId)
                }
            });

        svg.append('defs').append('filter')
            .attr('id', 'shadow')
            .append('feDropShadow')
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('stdDeviation', 4)
            .attr('flood-color', '#888888')
            .attr('flood-opacity', 0.7);

        function findValueByName(data, name) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].name === name) {
                    return data[i].value;
                }
            }
            // 如果未找到匹配的名称，可以选择返回一个默认值，或者抛出错误等。
            return null; // 或者返回其他默认值
        }

        // 创建框选区域
        const setBrush = d3.brush()
            .on("start brush", (event) => brushed(event));

        svg.append("g")
            .attr("class", "setBrush")

        store.watch(() => store.state.isClickBrush, () => {
            svg.select(".setBrush").call(setBrush);
        });


        // 判断扇区是否在框选区域内
        function checkArcInSelection(arcData, x0, y0, x1, y1, centerX, centerY) {
            const arcStartAngle = arcData.startAngle ; // 直接使用弧度
            const arcEndAngle = arcData.endAngle ; // 直接使用弧度
            const outerRadius = radius;

            // 遍历框选区域的四个角点
            const points = [
                { x: x0, y: y0 },  // 左上角
                { x: x1, y: y0 },  // 右上角
                { x: x0, y: y1 },  // 左下角
                { x: x1, y: y1 }   // 右下角
            ];

            // 判断每个点是否在扇区内
            for (const point of points) {
                const dx = point.x - centerX;
                const dy = centerY - point.y;
                // 计算点的极坐标
                const distance = Math.sqrt(dx * dx + dy * dy);  // 到饼图中心的距离
                let angle = Math.atan2(dx, dy);
                if (angle < 0) angle += 2 * Math.PI;  // 确保角度在 0 到 2*PI 之间

                // 判断点是否在扇区的角度范围和半径范围内，处理跨越0度的扇区
                const inAngleRange = arcStartAngle <= arcEndAngle
                    ? (angle >= arcStartAngle && angle <= arcEndAngle)
                    : (angle >= arcStartAngle || angle <= arcEndAngle);

                if (inAngleRange && distance <= outerRadius) {
                    return true;
                }
            }

            return false;
        }


        function brushed(event) {
            if (!event.selection) return;

            const [x0, y0] = event.selection[0]; // 框选区域左上角
            const [x1, y1] = event.selection[1]; // 框选区域右下角
            const centerX = containerWidth / 2 ; // 饼图的中心X坐标
            const centerY = containerHeight / 2; // 饼图的中心Y坐标

            let selectedData = [];
            let allData = []

            // 遍历每个饼图的扇区
            arcs.each(function(d) {
                allData.push(d);
                // 判断扇区是否与框选区域有重叠
                const inSelection = checkArcInSelection(d, x0, y0, x1, y1, centerX, centerY);

                if (inSelection) {
                    // 如果扇区在框选范围内，提取对应的数据
                    selectedData.push(d.data.name);
                }

            });

            // 按照 d.value 从大到小排序
            allData.sort(function(a, b) {
                return a.value - b.value;
            });

            // 确保 selectedData 不为空，找到第一个和最后一个元素在 allData 中的下标
            if (selectedData.length > 0) {
                let firstIndex = allData.findIndex(function(d) {
                    return d.data.name === selectedData[0];
                });
                // 找到 selectedData 最后一个元素在 allData 中的索引
                let lastIndex = allData.findIndex(function(d) {
                    return d.data.name === selectedData[selectedData.length - 1];
                });

                if (firstIndex > lastIndex) {
                    [firstIndex, lastIndex] = [lastIndex, firstIndex]; // 直接交换 a 和 b 的值
                }
                // 提取 firstIndex 和 lastIndex 之间的所有元素，包括 firstIndex 和 lastIndex 本身
                const slicedData = allData.slice(firstIndex, lastIndex + 1);

                // 创建 finalData 数组，并将每个元素的 d.data 存入其中
                const finalData = slicedData.map(function(d) {
                    return isNaN(d.data.name) ? d.data.name : Number(d.data.name);
                });

                arcs.each(function(d) {
                    d3.select(this).classed('shadow-effect', false); // 应用阴影效果

                    // 判断扇区是否与框选区域有重叠
                    if(!isNaN(d.data.name)) {
                        d.data.name = Number(d.data.name);
                    }

                    const inShadow = finalData.includes(d.data.name);

                    if (inShadow) {
                        d3.select(this).classed('shadow-effect', true); // 应用阴影效果
                    }
                });
                createSet1(x0, y0, x1, y1, finalData);
            }
        }

        store.watch(() => store.state.isClickCancelBrush, () => {
            svg.select(".setBrush").call(setBrush.move, null);
            svg.select(".setBrush").selectAll("*").remove();
            svg.select(".setBrush").on(".setBrush", null);
            arcs.each(function() {d3.select(this).classed('shadow-effect', false); // 应用阴影效果
            });
            svg.selectAll('.set1-region').remove();
        });

        function createSet1(x0,y0,x1,y1,selectedData) {
            createBrushSet(containerId,selectedData)
            // 移除旧的点击区域
            svg.selectAll('.clickable-region').remove();
            // 创建一个点击响应区域，是否加入异常序列
            svg.append('rect')
                .attr('class', 'set1-region')
                .attr('x', x0)
                .attr('y', y0)
                .attr('width', x1 - x0)
                .attr('height', y1 - y0)
                .style('fill', 'none')
                .style('pointer-events', 'all')
                .on('click', () => {
                    if(selectedData.length!==0) {
                        // createBrushSet(containerId,selectedData)
                        svg.select(".setBrush").call(setBrush.move, null);
                        svg.select(".setBrush").selectAll("*").remove();
                        svg.select(".setBrush").on(".setBrush", null);
                        svg.selectAll('.set1-region').remove();

                        store.dispatch('saveIsClickCancelBrush');

                        arcs.each(function () {
                            d3.select(this).classed('shadow-effect', false); // 应用阴影效果
                        });
                    }
                })
        }


        store.watch(() => store.state.globalHighlight, (newValue) => {
            pieContainer.selectAll('.highlightArc').remove()
            const filteredCodeContext = container.getAttribute("filteredCodeContext");
            let keysInNewData
            if (filteredCodeContext !== null && filteredCodeContext !== "") {
                const code=container.getAttribute("filteredCodeContext")
                axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                    .then(response => {
                        const newData = response.data['result']
                        keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);

                        // 高亮柱状图
                        const filledData = fillData(data, newData)
                        highlightSeriesData = []
                        for (const outerKey in filledData) {
                            for (const innerKey in data[outerKey]) {
                                highlightSeriesData.push({
                                    name: innerKey,
                                    value: filledData[outerKey][innerKey]
                                });
                            }
                        }
                        if(containerId!==store.state.curHighlightContainer){
                            const newArc = d3.arc().outerRadius(d => {
                                return radius * (findValueByName(highlightSeriesData, d.data.name) / d.data.value)}).innerRadius(0);

                            const newArcs = pieContainer.selectAll('highlightArc')
                                .data(pie(seriesData))
                                .enter()
                                .append('g')
                                .attr('class', 'highlightArc');

                            newArcs.append('path')
                                .attr('d', newArc)
                                .attr('stroke', "#DCDCDC")
                                // .attr('fill', (d) => getColorForValue(findValueByName(highlightSeriesData,d.data.name),minValue,maxValue))
                                .attr('fill', "#A9A9A9")
                                .on('mouseover', function (event, d) {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', 'url(#shadow)');
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);

                                    let tooltipContent

                                    tooltipContent=`${d.data.name}: <strong>${findValueByName(highlightSeriesData,d.data.name)}</strong> `

                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY)-containerRect.top + 'px');
                                })
                                .on('mouseout', function () {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', '');
                                    tooltip.transition()
                                        .duration(500)
                                        .style('opacity', 0);
                                })
                                .on("click", function(event, d) {
                                    event.stopPropagation();
                                    const myObject = {};
                                    myObject[foundKey] = d.data.name
                                    changeGlobalHighlight(myObject, containerId)
                                });

                            svg.append('defs').append('filter')
                                .attr('id', 'shadow')
                                .append('feDropShadow')
                                .attr('dx', 0)
                                .attr('dy', 0)
                                .attr('stdDeviation', 4)
                                .attr('flood-color', '#888888')
                                .attr('flood-opacity', 0.7);
                            updatePieChart()
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
        }, { deep: true });

        store.watch(() => store.state.globalMouseover, (newValue) => {
            pieContainer.selectAll('.mouseoverArc').remove()
            const filteredCodeContext = container.getAttribute("mouseoverCodeContext");
            let keysInNewData
            if (filteredCodeContext !== null && filteredCodeContext !== "") {
                const code=container.getAttribute("mouseoverCodeContext")
                axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                    .then(response => {
                        const newData = response.data['result']
                        keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);

                        mouseoverSeriesData = []
                        const filledData = fillData(data, newData)
                        for (const outerKey in filledData) {
                            for (const innerKey in data[outerKey]) {
                                mouseoverSeriesData.push({
                                    name: innerKey,
                                    value: filledData[outerKey][innerKey]
                                });
                            }
                        }
                        if(containerId!==store.state.curMouseoverContainer){
                            const newArc = d3.arc().outerRadius(d => {
                                return radius * (findValueByName(mouseoverSeriesData,d.data.name) / d.data.value)}).innerRadius(0);

                            const newArcs = pieContainer.selectAll('mouseoverArc')
                                .data(pie(seriesData))
                                .enter()
                                .append('g')
                                .attr('class', 'mouseoverArc');

                            newArcs.append('path')
                                .attr('d', newArc)
                                .attr('stroke', "#DCDCDC")
                                // .attr('fill', (d) => getColorForValue(findValueByName(mouseoverSeriesData,d.data.name),minValue,maxValue))
                                .attr('fill', "#eeeeee")
                                .on('mouseover', function (event, d) {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', 'url(#shadow)');
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);

                                    let tooltipContent

                                    tooltipContent=`${d.data.name}: <strong>${findValueByName(mouseoverSeriesData,d.data.name)}</strong> `

                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY)-containerRect.top + 'px');
                                })
                                .on('mouseout', function () {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', '');
                                    tooltip.transition()
                                        .duration(500)
                                        .style('opacity', 0);

                                })
                                .on("click", function(event, d) {
                                    event.stopPropagation();
                                    const myObject = {};
                                    myObject[foundKey] = d.data.name
                                    changeGlobalHighlight(myObject, containerId)
                                });

                            svg.append('defs').append('filter')
                                .attr('id', 'shadow')
                                .append('feDropShadow')
                                .attr('dx', 0)
                                .attr('dy', 0)
                                .attr('stdDeviation', 4)
                                .attr('flood-color', '#888888')
                                .attr('flood-opacity', 0.7);
                            updatePieChart()
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
        }, { deep: true });

        store.watch(() => store.state.brushedEvent, (newValue) => {
            pieContainer.selectAll('.eventArc').remove()
            const brushedCodeContext = container.getAttribute("brushedCodeContext");
            let keysInNewData
            if (brushedCodeContext !== null && brushedCodeContext !== "") {
                const code=container.getAttribute("brushedCodeContext")
                axios.post('http://127.0.0.1:5000/executeCode', { code: code })
                    .then(response => {
                        const newData = response.data['result']
                        keysInNewData =  Object.keys(newData[Object.keys(newData)[0]]);

                        eventSeriesData = []
                        const filledData = fillData(data, newData)
                        for (const outerKey in filledData) {
                            for (const innerKey in data[outerKey]) {
                                eventSeriesData.push({
                                    name: innerKey,
                                    value: filledData[outerKey][innerKey]
                                });
                            }
                        }
                        if(containerId!==store.state.curMouseoverContainer){
                            const newArc = d3.arc().outerRadius(d => {
                                return radius * (findValueByName(eventSeriesData,d.data.name) / d.data.value)}).innerRadius(0);

                            const newArcs = pieContainer.selectAll('eventArc')
                                .data(pie(seriesData))
                                .enter()
                                .append('g')
                                .attr('class', 'eventArc');

                            newArcs.append('path')
                                .attr('d', newArc)
                                .attr('stroke', "#DCDCDC")
                                .attr('fill', (d) => getColorForValue(findValueByName(eventSeriesData,d.data.name),minValue,maxValue))
                                .on('mouseover', function (event, d) {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', 'url(#shadow)');
                                    tooltip.transition()
                                        .duration(200)
                                        .style('opacity', 0.8);

                                    let tooltipContent

                                    tooltipContent=`${d.data.name}: <strong>${findValueByName(eventSeriesData,d.data.name)}</strong> `

                                    tooltip.html(tooltipContent)
                                        .style('left', (event.pageX)-containerRect.left + 'px')
                                        .style('top', (event.pageY)-containerRect.top + 'px');
                                })
                                .on('mouseout', function () {
                                    d3.select(this)
                                        .transition()
                                        .duration(200)
                                        .attr('filter', '');
                                    tooltip.transition()
                                        .duration(500)
                                        .style('opacity', 0);

                                })
                                .on("click", function(event, d) {
                                    event.stopPropagation();
                                    const myObject = {};
                                    myObject[foundKey] = d.data.name
                                    changeGlobalHighlight(myObject, containerId)
                                });

                            svg.append('defs').append('filter')
                                .attr('id', 'shadow')
                                .append('feDropShadow')
                                .attr('dx', 0)
                                .attr('dy', 0)
                                .attr('stdDeviation', 4)
                                .attr('flood-color', '#888888')
                                .attr('flood-opacity', 0.7);
                        }
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
            else{
                chartGroup.selectAll('.x-axis text')
                    .style('font-weight', axisText => store.state.globalHighlight.includes(axisText) ? 'bold' : 'normal')
                    .style('fill', axisText => store.state.globalHighlight.includes(axisText) ? '#F56C6C' : '#606266');
            }
        }, { deep: true });

        store.watch(() => store.state.isClickCancelFilter, () => {
            pieContainer.selectAll('.eventArc').remove()
        });


        // 创建 ResizeObserver 实例
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                updatePieChart();
            }
        });
        resizeObserver.observe(container);
        // 初始时绘制图表
        updatePieChart();
    },

    createSunBurst(containerId, data) {
        // 获取容器尺寸和位置
        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        const foundKey = parameters[parameters.length-1]

        function updateSunburst() {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            const newRadius = Math.min(containerWidth, containerHeight) / 2.8;

            if (Math.abs(containerWidth - lastSize.width) > threshold ||
                Math.abs(containerHeight - lastSize.height) > threshold) {
                svg.attr('width', containerWidth)
                    .attr('height', containerHeight)

                svg.style('width', containerWidth)
                    .style('height', containerHeight);

                // 更新饼图容器的位置
                sunburstContainer.attr('transform', `translate(${containerWidth / 2.4},${containerHeight / 2})`);
                legendContainer.attr('transform', `translate(${containerWidth / 2.5+newRadius},${0.01*containerHeight})`);
                legendItemHeight = 0.02*containerHeight; // 图例项的高度
                legendItemWidth = 0.015*containerWidth; // 图例项的宽度
                legendContainer.selectAll('rect')
                    .attr('width', legendItemWidth)
                    .attr('height', legendItemHeight)

                const newPartition = d3.partition()
                    .size([2 * Math.PI, newRadius]);

                // 计算节点的弧形布局
                newPartition(root);

                arc.startAngle(d => d.x0)
                    .endAngle(d => d.x1)
                    .innerRadius(d => d.y0)
                    .outerRadius(d => d.y1)
                path.attr('d', arc);
                // 更新记录的尺寸
                lastSize.width = containerWidth;
                lastSize.height = containerHeight;
            }

            const newbbox1 = sunburstContainer.node().getBBox();
            const newbbox2 = legendContainer.node().getBBox();
            const newWidth = newbbox1.width+newbbox2.width+containerWidth/2-radius
            if(newWidth>containerWidth){
                svg.style("width",newWidth)
            }
        }

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRect = document.getElementById(containerId).getBoundingClientRect();
        let lastSize = { width: container.clientWidth, height: container.clientHeight };
        const threshold = 20; // 阈值
        let radius = Math.min(containerWidth, containerHeight) / 2.8; // 确定旭日图的半径
        // 在 SVG 容器外部创建一个提示框元素
        const tooltip = d3.select(container)
            .append("div")
            .attr("class", "tooltip")

        // 创建SVG元素
        const svg = d3.select(container).append('svg')
            .attr('width', containerWidth)
            .attr('height', containerHeight)

        const sunburstContainer = svg.append('g')
            .attr('transform', `translate(${containerWidth / 2.4},${containerHeight / 2})`);

        const legendContainer= svg.append('g').attr('transform', `translate(${containerWidth / 2.5+radius},${0.01*containerHeight})`);
        // 每层级的图例容器
        let legendItemHeight = 0.02*containerHeight; // 图例项的高度
        let legendItemWidth = 0.015*containerWidth; // 图例项的宽度
        let legendItemMargin = 1.8*legendItemWidth; // 图例项的间距


        const dataKey = Object.keys(data)[0]
        function findAllValues(obj) {
            let values = [];
            // 如果是对象，则递归调用
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    values = values.concat(findAllValues(obj[key]));
                }
            } else {
                // 基本情况：不是对象，直接添加数值
                values.push(obj);
            }
            return values;
        }
        const allValues = findAllValues(data[dataKey]);
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        const sunburstData = createHierarchyData(data[dataKey])

        drawLegend(store.state.globalColorMap)
        function drawLegend(colorMap){
            // 移除所有旧的图例元素
            legendContainer.selectAll('.legend-text, .legend-rect').remove();
            let namesByDepth = collectNamesByDepth(sunburstData, colorMap);
            namesByDepth = namesByDepth.filter(subArray => subArray.length > 0).flat();
            namesByDepth = [...new Set(namesByDepth)];
            if(namesByDepth.length!==0){
                for(let index = 0; index < namesByDepth.length; index++){
                    const name = namesByDepth[index]
                    const y = index * 20; // 每个图例项之间的间隔是20px
                    // 绘制颜色块
                    const legendText = legendContainer.append('rect')
                        .attr('x', 10)
                        .attr('y', y)
                        .attr('width', legendItemWidth)
                        .attr('height', legendItemHeight)
                        .attr('class',"legend-rect")
                        .style('fill', (Object.keys(colorMap).includes(name) ? colorMap[name] : "grey"));

                    // 绘制文本标签
                    legendContainer.append('text')
                        .attr('x', 10+1.3*legendItemWidth)
                        .attr('y', y + legendItemHeight/1.1) // 文本位置稍微下移以对齐颜色块
                        .text(name)
                        .style('fill','#606266')
                        .attr('class',"legend-text");
                }
            }
        }

        const bbox1 = sunburstContainer.node().getBBox();
        const bbox2 = legendContainer.node().getBBox();
        const newWidth = bbox1.width+bbox2.width+containerWidth/2-radius
        if(newWidth>containerWidth){
            svg.style("width",newWidth)
        }

        // 创建旭日图布局
        const partition = d3.partition()
            .size([2 * Math.PI, radius]);

        // 处理数据为层级格式
        const root = d3.hierarchy(sunburstData)
            .sum(d => d.value) // 定义如何计算每个节点的值
            .sort((a, b) => b.value - a.value);

        // 计算节点的弧形布局
        partition(root);

        // 弧生成器
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1)

        // 绘制旭日图的每一块
        const path = sunburstContainer.selectAll('path')
            .data(root.descendants())
            .enter().append('path')
            .attr('display', d => d.depth ? null : 'none') // 隐藏根节点
            .attr('d', arc)
            .attr('class','sunBurstArc')
            .style('stroke', '#fff') // 设置分隔线颜色
            .style('cursor','pointer')
            .on('mouseover', function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.8);

                let tooltipContent
                if(d.data.value){
                    tooltipContent=`${d.data.name}: <strong>${d.data.value}</strong>`
                }
                else{
                    tooltipContent=`${d.data.name}`
                }
                tooltip.html(tooltipContent)
                    .style('left', (event.pageX)-containerRect.left + 'px')
                    .style('top', (event.pageY)-containerRect.top + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('filter', '');
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .on("click", function(event, d) {
                event.stopPropagation();
                const myObject = {};
                myObject[foundKey] = d.data.name
                changeGlobalHighlight(myObject, containerId)
            })
            .style('fill', d => {
                if(d.data.value){
                    return getColorForValue(d.data.value,minValue,maxValue)
                }
                else{
                    if (Object.keys(store.state.globalColorMap).includes(d.data.name)) {
                        return store.state.globalColorMap[d.data.name]
                    }
                    return "#DCDCDC"
                }
            });
        // 创建 ResizeObserver 实例
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                updateSunburst();
            }
        });
        resizeObserver.observe(container);
        // 初始时绘制图表
        updateSunburst();

        function changeColor(colorMap){
            path.style('fill', d => {
                // if (Object.keys(colorMap).includes(d.data.name)) {
                //     return colorMap[d.data.name];
                // }
                // return "#DCDCDC";
                if(d.data.value){
                    return getColorForValue(d.data.value,minValue,maxValue)
                }
                else{
                    if (Object.keys(store.state.globalColorMap).includes(d.data.name)) {
                        return store.state.globalColorMap[d.data.name]
                    }
                    return "#DCDCDC"
                }
            })
        }

        store.watch(() => store.state.globalColorMap, (newValue) => {
            changeColor(newValue)
            drawLegend(newValue)
        });

    },

    createLineChart(containerId, originData) {
        // 检查数据的有效性
        if (!originData || Object.keys(originData).length === 0) {
            return;
        }

        const data = flatten(originData)
        const allDataKeys = Object.keys(data)
        // 数值型数据的键
        const numericKeys = Object.keys(data[allDataKeys[0]]).filter(key =>
            data[allDataKeys[0]][key].every(value => typeof value === 'number')
        );

        let line

        // 创建下拉框
        const selectAttr = document.createElement('select');
        selectAttr.id = 'time-selection';
        selectAttr.className = 'my-select';
        // 添加下拉选项
        const defaultOption = document.createElement('option');
        defaultOption.innerText = 'Attribute'; // 这里设置您想要显示的默认文字
        defaultOption.disabled = true; // 禁止选择这个选项
        defaultOption.selected = true; // 默认选中这个选项

        const sliderAttr = document.createElement('input');
        sliderAttr.type = 'range';
        sliderAttr.id = 'step-slider';
        sliderAttr.className = 'my-slider';
        sliderAttr.min = 1;  // 最小值
        sliderAttr.max = 100;  // 最大值
        sliderAttr.value = 5;  // 初始值
        sliderAttr.step = 1;  // 步长

        // 添加滑动条的显示值（可以实时显示）
        const stepValueDisplay = document.createElement('span');
        stepValueDisplay.id = 'step-value';
        stepValueDisplay.innerText = sliderAttr.value;  // 显示初始值
        // 设置文字大小和颜色
        stepValueDisplay.style.fontSize = '15px';  // 设置文字大小
        stepValueDisplay.style.color = 'grey';     // 设置文字颜色

        // Add numeric keys as options
        numericKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.innerText = key;
            selectAttr.appendChild(option);
        });

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        const foundKey = parameters[parameters.length-1]

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        document.getElementById(containerId).appendChild(selectAttr);
        document.getElementById(containerId).appendChild(sliderAttr);
        document.getElementById(containerId).appendChild(stepValueDisplay);

        // 每次滑动时更新显示的值
        sliderAttr.addEventListener('input', function() {
            stepValueDisplay.innerText = sliderAttr.value;  // 每次滑动更新显示的值
            const currentStep = parseInt(sliderAttr.value);  // 获取当前的 step 值
            createLine(containerId,data,selectAttr.value,currentStep)
        });

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const lastSize = { width: container.clientWidth, height: container.clientHeight };

        const containerRect = container.getBoundingClientRect();
        const chartWidth = 0.88 * containerWidth;
        const chartHeight = 0.8 * containerHeight;
        let margin = { top: 0.02 * containerHeight, left: (containerWidth - chartWidth) / 2 };

        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'svgContainer' + containerId)
            .attr('width', containerWidth)
            .attr('height', containerHeight-55)
            .attr('overflow', 'auto');

        let allUserData
        let chartGroup, xScale, yScale

        createLine(containerId,data,numericKeys[0],sliderAttr.value)

        selectAttr.addEventListener('change', function() {
            createLine(containerId,data,selectAttr.value,sliderAttr.value)
        });

        store.watch(() => store.state.globalColorMap, (newValue) => {
            drawLine(data, allUserData, newValue)
        });

        function calculateMovingAverage(data, step) {
            let movingAverage = [];
            for (let i = 0; i < data.length; i++) {
                const window = data.slice(Math.max(i - step + 1, 0), i + 1);
                const avg = d3.mean(window);
                movingAverage.push(avg);
            }
            return movingAverage;
        }


        // 更新图表的移动平均线
        function updateMovingAverage(key,values,step) {
            // 删除现有的移动平均线
            chartGroup.selectAll('.moving-average-line').remove();

            // // 重新计算每个数据的移动平均
            const movingAvgValues = calculateMovingAverage(values, step);  // 使用新的step

                // 绘制新的移动平均线
                chartGroup.append('path')
                    .datum(movingAvgValues)
                    .attr('class', 'moving-average-line')
                    .attr('d', line)
                    .attr('data-key', key + step +'-moving-average')
                    .style('stroke', 'grey')  // 移动平均线的颜色
                    .style('stroke-width', "2px")
                    .style('fill', 'none')
                    .style('stroke-dasharray', '5,5');  // 虚线样式
        }

        function createLine(containerId,data,seqView,stepValue) {
            allUserData = []
            Object.keys(data).forEach((username, index) => {
                allUserData.push({[username]: data[username][seqView]})
            })
            const colorMap = store.state.globalColorMap
            drawLine(data, allUserData, colorMap,stepValue)
        }
        function drawLine(originalData, data,colorMap,step) {
            d3.select(container)
                .select(".tooltip")
                .remove();

            svg.selectAll('*').remove();
            chartGroup = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // 在 SVG 容器外部创建一个提示框元素
            const tooltip = d3.select(container)
                .append("div")
                .attr("class", "tooltip")

            // 确定最大的数组长度以定义x轴范围
            const maxLength = d3.max(data, d => Object.values(d)[0].length);

            xScale = d3.scaleLinear()
                .domain([0, maxLength - 1])
                .range([0, chartWidth]);

            // 确定y轴的范围
            const yMin = d3.min(data, d => d3.min(Object.values(d)[0]));
            const yMax = d3.max(data, d => d3.max(Object.values(d)[0]));

            yScale = d3.scaleLinear()
                .domain([yMin, yMax])
                .range([chartHeight, 0]);

            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            // 添加坐标轴
            chartGroup.append('g')
                .attr('transform', `translate(0, ${chartHeight})`)
                .attr('class', 'x-axis')
                .call(xAxis)
                .selectAll('text')
                // .remove();

            chartGroup.append('g')
                .attr('class', 'y-axis')
                .call(yAxis);

            let verticalLine = chartGroup.append('line')
                .attr('id', 'vertical-line')  // 为虚线添加id，方便删除
                .style('stroke', 'gray')  // 虚线颜色
                .style('stroke-dasharray', '5,5')  // 虚线样式
                .style('stroke-width', 1)
                .style('pointer-events', 'none');  // 防止虚线影响鼠标事件

            // 定义折线生成器
            line = d3.line()
                .x((d, i) => xScale(i))
                .y(d => yScale(d));

            // 绘制每条折线
                data.forEach(d => {
                    const key = Object.keys(d)[0];
                    const values = d[key];

                    const allValues = originalData[key]
                    chartGroup.append('path')
                        .datum(values)
                        .attr('class', 'line')
                        .attr('d', line)
                        .attr('data-key', key)
                        .style('stroke', d => {
                            if (Object.keys(colorMap).includes(key)) {
                                return colorMap[key];
                            }
                            return "#DCDCDC"
                        })
                        .style('stroke-width', "1.5px")
                        .style('fill', 'none')
                        .style('cursor','pointer')
                        .on('mouseover', function (event, d) {
                            const myObject = {};
                            myObject[foundKey] = key
                            changeGlobalMouseover(myObject, containerId)

                            tooltip.transition()
                                .duration(200)
                                .style('opacity', 0.8);

                            const mouse = d3.pointer(event);
                            const mouseX = mouse[0];
                            const mouseIndex = Math.round(xScale.invert(mouseX));
                            if (mouseIndex >= 0 && mouseIndex < values.length) {
                                // 计算鼠标位置并绘制垂直虚线
                                const mouseY = values[mouseIndex];
                                d3.select('#vertical-line')
                                    .attr('x1', xScale(mouseIndex))  // 设置垂直线的 x 坐标
                                    .attr('x2', xScale(mouseIndex))  // 设置垂直线的 x 坐标
                                    .attr('y1', 0)  // 从 y = 0 开始
                                    .attr('y2', chartHeight);  // 到 y = chartHeight 结束

                                let tooltipText
                                // 创建要显示的信息字符串
                                tooltipText = `${key}: <strong>${mouseY}</strong> <br/>`;
                                Object.keys(allValues).forEach(key => {
                                    if (Array.isArray(allValues[key])) {
                                        let cellData = allValues[key][mouseIndex]
                                        if (typeof cellData === 'string' && cellData.includes('GMT')) {
                                            // 如果数据是日期时间字符串类型，进行格式化
                                            cellData = formatDateTime(cellData);
                                        }
                                        tooltipText += key + ": " + cellData + "<br/>";
                                    }
                                });

                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", .9);
                                tooltip.html(tooltipText)
                                    .style('left', (event.pageX)-containerRect.left + 'px')
                                    .style('top', (event.pageY)-containerRect.top-100 + 'px')}
                        })
                        .on('mouseout', function () {
                            verticalLine
                                .attr('y1', 0)
                                .attr('y2', 0);  // 隐藏虚线

                            const myObject = {};
                            myObject[foundKey] = key
                            changeGlobalMouseover(myObject, containerId)

                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('filter', '');
                            tooltip.transition()
                                .duration(500)
                                .style('opacity', 0);
                        })
                        .on('click', function() {
                            event.stopPropagation();
                            const myObject = {};
                            myObject[foundKey] = key
                            changeGlobalHighlight(myObject, containerId)
                        })

                    updateMovingAverage(key,values,step)
                });
        }


        // 使用 ResizeObserver 监听容器大小变化
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentBoxSize) {
                    resizeLine()
                }
            }
        });
        // 观察 svg 容器大小变化
        resizeObserver.observe(container);
        function resizeLine() {
            const threshold = 20; // 阈值
            // 获取新的容器尺寸
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const chartWidth = 0.88 * containerWidth;
            const chartHeight = 0.85 * containerHeight;
            // 检查尺寸变化是否超过阈值
            if (Math.abs(containerWidth - lastSize.width) > threshold ||
                Math.abs(containerHeight - lastSize.height) > threshold) {

                margin = {
                    top: 0.02 * containerHeight,
                    left: (containerWidth - chartWidth) / 2,
                };

                svg.attr('width', containerWidth)
                    .attr('height', containerHeight -55)

                xScale.range([0, chartWidth]);
                yScale.range([chartHeight, 0]);

                svg.attr('width', containerWidth)
                    .attr('height', containerHeight)

                svg.style('width', containerWidth + 'px')
                    .style('height', containerHeight + 'px');

                chartGroup.attr('transform', `translate(${margin.left}, ${margin.top})`)
                // 更新坐标轴位置和调用
                chartGroup.select('.x-axis')
                    .attr('transform', `translate(0,${chartHeight})`)
                    .call(d3.axisBottom(xScale));

                chartGroup.select('.y-axis').call(d3.axisLeft(yScale));

                const line = d3.line()
                    .x((d, i) => xScale(i))
                    .y(d => yScale(d));
                chartGroup.selectAll('.line')
                    .attr('d', line);

                // 更新记录的尺寸
                lastSize.width = containerWidth;
                lastSize.height = containerHeight;
            }
        }

        store.watch(() => store.state.globalHighlight, (newValue) => {
            const filterParameters = store.state.filterRules
            if(Object.keys(filterParameters).includes(foundKey)){
                // 更新折线显示
                svg.selectAll(".line")
                    .style("display", function() {
                        const key = d3.select(this).attr('data-key');
                        return filterParameters[foundKey].includes(key) ? null : "none";
                    });
            }
            else{
                svg.selectAll(".line")
                    .style("display", null);
            }
        }, { deep: true });

        store.watch(() => store.state.globalMouseover, (newValue) => {
            const filterParameters = store.state.mouseoverRules
            if(Object.keys(filterParameters).includes(foundKey)){
                // 更新折线显示
                svg.selectAll(".line")
                    .classed("highlight-path", function() {
                        const key = d3.select(this).attr('data-key');
                        return !filterParameters[foundKey].includes(key);
                    });
            }
            else{
                svg.selectAll(".line")
                    .classed("highlight-path", false); // 添加高亮类
            }
        }, { deep: true });
    },

    createPatternLine(containerId, originData) {
        // 检查数据的有效性
        if (!originData || Object.keys(originData).length === 0) {
            return;
        }

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRect = document.getElementById(containerId).getBoundingClientRect();

        let codeContext = store.state.curExpression
        const regex1 = /pattern\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const regex2 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const matches2 = codeContext.matchAll(regex2);
        const parameters = [];
        const userParameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        for (const match of matches2) {
            userParameters.push(match[1]);
        }
        const foundKey = parameters[0]

        const foundUserKey = userParameters[0]
        // 创建新的包装容器
        const controlsContainer = document.createElement('div');
        // const controlsContainer = container.insert("div", ":first-child")
        //     .attr("class", "controls-container")
        //     .style("position", "sticky")
        //     .style("top", "0px")
        //     .style("z-index", "1000")
        //     .style("background", "white");
        // controlsContainer.className = 'controls-container';

        let data = flattenPattern(originData)
        function addUniquePatternsToData(data, uniquePatterns) {
            let newData = {};
            // 首先添加 "unique pattern" 键和它的值
            newData["unique pattern"] = uniquePatterns;
            // 然后添加原来的数据
            Object.keys(data).forEach(key => {
                newData[key] = data[key];
            });
            return newData;
        }

        // 创建 SVG 容器
        let margin = { top: 0.01*containerHeight, left: 0.01*containerHeight, right: 0.02*containerWidth };
        // 找到最长的事件序列的宽度
        let maxWidth = 0;
        // 计算圆形的半径
        const scaleFactor = 0.025;
        let circleRadius = Math.max(10,Math.min(containerWidth, containerHeight) * scaleFactor / 2);
        let circleSpacing = circleRadius/2

        const lineSpacing = circleRadius*3;

        // 创建colormap
        let colorMap = store.state.globalColorMap

        store.watch(() => store.state.isClickSupport, () => {
            const myDiv = document.getElementById(containerId)
            const codeContext = myDiv.getAttribute("codeContext");
            const curSupport = store.state.curMinSupport
            // 前端可以直接把最后的操作传给后端 后面再改
            axios.post('http://127.0.0.1:5000/executeCode', { code: codeContext, support: curSupport })
                .then(response => {
                    // 使用 Vuex action 更新 responseData
                    const responseData = response.data['result'];
                    let flattenData = flattenPattern(responseData)
                    createChart(containerId,flattenData,store.state.globalColorMap)
                })
                .catch(error => {
                    console.error(error);
                });
        });

        createChart(containerId,data,colorMap)

        store.watch(() => store.state.globalColorMap, (newValue) => {
            createChart(containerId,data,newValue)
        });

        function createChart(containerId,originalData,colorMap){
            // 遍历外层对象的每一个键（日期）
            for (let i in originalData) {
                // 遍历内层对象的每一个键
                for (let key in originalData[i]) {
                    // 如果数组为空，删除这个键
                    if (originalData[i][key].length === 0) {
                        delete originalData[i][key];
                    }
                }
                // 如果内层对象变为空对象，也删除外层的键
                if (Object.keys(originalData[i]).length === 0) {
                    delete originalData[i];
                }
            }
            // 提取所有唯一的事件
            const uniqueEventTypes = new Set();
            Object.values(originalData).forEach(arrays => {
                arrays.forEach(array => {
                    array.forEach(event => uniqueEventTypes.add(event));
                });
            });

            // 提取唯一的模式
            const uniqueSets = new Set();  // 用于存储唯一的序列（字符串形式）
            const uniquePatterns = [];  // 存储转换回数组形式的唯一列表
            // 提取唯一的模式
            Object.values(originalData).forEach(groups => {
                groups.forEach(list => {
                    const listStr = JSON.stringify(list);
                    if (!uniqueSets.has(listStr)) {
                        uniqueSets.add(listStr);
                        uniquePatterns.push(list);
                    }
                });
            });

            const container = document.getElementById(containerId);
            // 选择要移除的 SVG 元素
            const svgToRemove = d3.select(container).select('.svgContainer'+containerId);
            // 移除 SVG 元素及其上的所有内容
            svgToRemove.remove();

            d3.select(container)
                .select(".tooltip")
                .remove();

            // 遍历数据中的每个用户 获取最大宽度
            Object.values(originalData).forEach(userLists => {
                // 初始化每个用户的宽度
                let userWidth = 0;
                // 遍历每个用户的事件列表
                userLists.forEach((list, index) => {
                    if (list.length > 0) {
                        userWidth += (list.length * circleRadius * 2+(list.length-1) * circleRadius)
                    }
                    // 除了第一个列表，每个列表前都添加一个列表间隔
                    if (index > 0) {
                        userWidth += (lineSpacing-circleRadius*2); // 列表间的额外间隔
                    }
                });
                // 更新最大宽度
                if (userWidth > maxWidth) {
                    maxWidth = userWidth;
                }
            });

            // 计算 SVG 的宽度
            let svgWidth = margin.left + maxWidth + margin.right ;
            if (svgWidth < containerWidth){
                svgWidth = containerWidth
            }

            let svgHeight = (Object.keys(originalData).length+2) * (circleRadius * 2.5 + circleSpacing)+circleRadius * 2.5+margin.top

            let legendSvg
            let totalHeight = 0

            const svg = d3.select(container)
                .append('svg')
                .attr('class', 'svgContainer'+containerId)
                .attr('width', svgWidth)
                .attr('height', svgHeight)
                .attr('overflow','auto')
                .attr('transform', `translate(${margin.left},${-10})`)

            data = addUniquePatternsToData(originalData, uniquePatterns);

            const seqContainer = svg.append('g')

            createLegend(data)

            function createLegend(data){
                const uniqueActionTypes = new Set();
                for (let actionType of data["unique pattern"].flat()) {
                    uniqueActionTypes.add(actionType);
                }

                const uniqueActionTypesArray = Array.from(uniqueActionTypes);

                // 创建图例
                // const legend = seqContainer.append('g')
                //     .attr('class', 'legend')
                //     .attr('transform', `translate(15, ${(Object.keys(data).length+1) * (circleRadius * 2.5 + circleSpacing)})`); // 控制图例位置

                const container = d3.select(`#${containerId}`); // 改用 D3 选择器

                let legendTop;
                if (svgHeight < containerHeight) {
                    legendTop = svgHeight; // 如果 SVG 高度小于容器高度，将 legendTop 设置为 SVG 高度
                } else {
                    legendTop = containerHeight*0.983; // 否则，将 legendTop 设置为容器高度
                }

                // 移除已有的 legendWrapper（如果存在）
                container.select(".legend-wrapper").remove(); // 通过类名选择并移除

                const legendWrapper = container.insert("div", ":first-child")
                    .attr("class", "legend-wrapper") // 添加类名以便后续移除
                    .style("position", "sticky")  // sticky 定位
                    .style("top", "0px")          // 距离容器顶部0px时固定
                    .style("left", "12px")        // 水平偏移
                    .style("z-index", "999")
                    .style("background", "white"); // 避免内容被遮挡
                // 创建 SVG 画布
                legendSvg = legendWrapper.append("svg")
                    .attr("width", svgWidth)
                    .style("background-color", "#eeeeee")
                    .attr("height", 0); // 初始高度为 0
                // 后续图例绘制代码保持不变...
                const legend = legendSvg.append("g")
                    .attr("class", "legend");

                // 添加图例矩形和文字
                const legendItems = uniqueActionTypesArray

                let totalLegendWidth = 0; // 用于存储总宽度
                let legendY = 0;
                let rowCount = 1;  //总行数
                const rectSize = circleRadius*2;

                legendItems.forEach((item, index) => {
                    const rectSize = circleRadius*2;
                    // 添加图例文字
                    const legendText = legend.append('text').text(item).style('font-size', rectSize/1.5);
                    // 获取图例文本的宽度
                    const legendTextWidth = legendText.node().getBBox().width;

                    let gap = circleRadius*1.5
                    let legendX = totalLegendWidth;
                    let legendCountInRow = 0;
                    // 总宽度
                    totalLegendWidth += gap+rectSize+legendTextWidth;
                    // 计算一行可以容纳多少个图例
                    const availableLegendCount = Math.floor(svgWidth / totalLegendWidth);
                    // 根据图例数量决定是否换行
                    if (legendCountInRow >= availableLegendCount) {
                        legendX = 0;
                        totalLegendWidth = 0;
                        totalLegendWidth += gap+rectSize+legendTextWidth;
                        legendY += rectSize*2;
                        legendCountInRow = 0;
                        rowCount++;
                    }
                    legendCountInRow++;
                    legendText
                        .attr('x', legendX+rectSize*1.2+legendTextWidth/2).attr('y', legendY+ rectSize*0.6)
                        .attr('text-anchor', 'middle').attr('alignment-baseline', 'middle')
                        .attr('class', 'patternLegendText')
                        .attr('text',item)
                        .style('fill', colorMap[item]? colorMap[item] :"#DCDCDC") // 根据操作类型选择颜色
                        .style('font-weight', 'bold')
                        .style('cursor', 'pointer') // 设置鼠标悬浮时显示手指样式
                        .on('click', function() {
                            event.stopPropagation();
                            const myObject = {};
                            myObject[foundKey] = item
                            changeGlobalHighlight(myObject, containerId)
                        })
                        .on('mouseover', function() {
                            const myObject = {};
                            myObject[foundKey] = item
                            changeGlobalMouseover(myObject, containerId)
                        })
                        .on('mouseout', function() {
                            const myObject = {};
                            myObject[foundKey] = item
                            changeGlobalMouseover(myObject, containerId)
                        });

                    // 添加图例矩形
                    legend.append('rect')
                        .attr('x', legendX)
                        .attr('y', legendY)
                        .attr('width', rectSize)
                        .attr('height', rectSize)
                        .style('fill', colorMap[item]? colorMap[item] :"#DCDCDC");
                });
                // 计算总高度
                totalHeight = (2*rowCount-1) * rectSize;
                // 动态设置 legendSvg 的高度
                legendSvg.attr('transform', `translate(0, ${legendTop-totalHeight})`);
                legendSvg.attr("height", totalHeight);
            }

            const userLocation ={}
            drawPattern(data)

            function drawPattern(data) {
                // 监听选中的需要高亮的路径信息

                store.watch(() => store.state.globalHighlight, (newValue) => {
                    // 点击图例变色
                    const code=container.getAttribute("codeContext")
                    const filterParameters = store.state.filterRules
                    const [dataKey] = code.split(".");
                    const originalData = store.state.originalTableData[dataKey]
                    // 分组条件对应的键

                    const foundKey = findKeyByValue(originalData, Object.keys(data)[1]);
                    // 事件对应的键
                    const foundDataKey = findKeyByValue(originalData, data[Object.keys(data)[0]][0][0]);

                    // 当筛选规则里面包含现有的键的时候才需要高亮分组条件
                    if(Object.keys(filterParameters).includes(foundKey)){
                        // 获取所有键 对于筛选得到的键，需要对他进行高亮
                        const keys = filterParameters[foundKey]
                        svg.selectAll(".selected-username").classed("selected-username", false);


                        const keysSet = new Set(keys); // 用 Set 提高查找效率
                        svg.selectAll('[username]')
                            .filter(function() {
                                const name = d3.select(this).attr('username');
                                return !keysSet.has(name.replace('username-', ''));
                            })
                            .classed('unpaired-event', true); // 添加高亮类

                        // keys.forEach(username => {
                        //     const name = `username-${username}`;
                        //     svg.selectAll(`[username="${name}"]`)
                        //         .classed("unpaired-event", true); // 添加高亮类
                        // });
                    }
                    else{
                        svg.selectAll(".selected-username").classed("selected-username", false);
                        svg.selectAll(".unpaired-event").classed("unpaired-event", false);
                    }
                    //高亮数据项
                    if(Object.keys(filterParameters).includes(foundDataKey)){
                        const keys = filterParameters[foundDataKey]

                        const circles = svg.selectAll('.pattern-circle');

                        circles.classed('unpaired-event', d => {
                            return !keys.includes(parseAction(d.event))});

                        svg.selectAll(".patternLegendText")
                            .classed('unhighlighted-text', function(d) {
                                const textContent = d3.select(this).text();  // 正确获取当前元素的文本内容
                                return !keys.includes(parseAction(textContent));
                            });
                    }
                    else{
                        // svg.selectAll('.pattern-circle').classed('unpaired-event', false);

                        svg.selectAll('.patternLegendText')
                            .classed('unpaired-event', false);
                    }
                }, { deep: true });

                // 监听选中的需要高亮的路径信息
                store.watch(() => store.state.globalMouseover, (newValue) => {
                    const code=container.getAttribute("codeContext")
                    const filterParameters = store.state.mouseoverRules
                    const [dataKey] = code.split(".");
                    const originalData = store.state.originalTableData[dataKey]
                    const foundKey = findKeyByValue(originalData, Object.keys(data)[1]);
                    const foundDataKey = findKeyByValue(originalData, data[Object.keys(data)[0]][0][0]);

                    // 当筛选规则里面包含现有的键的时候才需要高亮分组条件
                    if(Object.keys(filterParameters).includes(foundKey)){
                        // 获取所有键 对于筛选得到的键，需要对他进行高亮
                        const keys = filterParameters[foundKey]
                        svg.selectAll(".mouseover-username").classed("mouseover-username", false);
                        keys.forEach(username => {
                            const name = `username-${username}`;
                            svg.select(`[username="${name}"]`)
                                .classed("mouseover-username", true); // 添加高亮类
                        });
                    }
                    else{
                        svg.selectAll(".mouseover-username").classed("mouseover-username", false);
                    }
                    //高亮数据项
                    if(Object.keys(filterParameters).includes(foundDataKey)){
                        const keys = filterParameters[foundDataKey]
                        const circles = svg.selectAll('.pattern-circle');
                        svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);
                        svg.selectAll(".mouseover-legend").classed("mouseover-legend", false);

                        circles.classed('mouseover-circle', d => {
                            return keys.includes(parseAction(d.event))});

                        svg.selectAll(".patternLegendText")
                            .each(function() {
                                const legendText = d3.select(this);
                                const textContent = legendText.text(); // 获取当前元素的文本内容
                                if(keys.includes(parseAction(textContent))){
                                    legendText.classed('mouseover-legend', true); // 根据条件添加或移除类名
                                }
                            });
                    }
                    else{
                        svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);
                        svg.selectAll(".mouseover-legend").classed("mouseover-legend", false);
                    }
                }, { deep: true });

                // 在 SVG 容器外部创建一个提示框元素
                const tooltip = d3.select(container)
                    .append("div")
                    .attr("class", "tooltip")

                let userTextContainer = seqContainer.append("g")
                    .attr("class", "userTextContainer");
                // 遍历数据，创建事件符号
                usernameTextWidth["username" + containerId] = 0
                Object.keys(data).forEach((username, index) => {
                    const yPos = (index + 1) * (circleRadius * 2.5 + circleSpacing); // 控制圆形的垂直位置
                    const usernameText = userTextContainer.append('text')
                        .attr('x', 10) // 控制用户名的水平位置
                        .attr('y', yPos + circleRadius / 2 -10)
                        .attr('class', "trueText")
                        // .attr("username", `username-${username}`)
                        // .style('fill', '#808080')
                        .style('fill', 'none')
                        .style('font-weight', 'bold')
                        .style('cursor', 'pointer')
                        .on('click', function () {
                            event.stopPropagation(); // 阻止事件传播
                            const selectedUsername = d3.select(this).text();
                            const myObject = {};
                            myObject[foundUserKey] = selectedUsername
                            changeGlobalHighlight(myObject, containerId)
                        })
                        .on('mouseover', function () {
                            const selectedUsername = d3.select(this).text();
                            const myObject = {};
                            myObject[foundUserKey] = selectedUsername
                            changeGlobalMouseover(myObject, containerId)
                        })
                        .on('mouseout', function () {
                            const selectedUsername = d3.select(this).text();
                            const myObject = {};
                            myObject[foundUserKey] = selectedUsername
                            changeGlobalMouseover(myObject, containerId)
                        });

                    // 将用户名按 "&" 分割成多个部分
                    const parts = username.split('&');
                    // 定义一组灰色值（可以根据需求调整颜色的深浅）
                    const grayScale = ['#404040','#696969','#808080','#D3D3D3', '#A9A9A9' ];

                    let currentX = 10; // 起始的 x 坐标
                    parts.forEach((part, partIndex) => {
                        // 设置每个部分的颜色（根据 partIndex 来选择不同的灰色）
                        const fillColor = grayScale[partIndex % grayScale.length];  // 根据 partIndex 循环选择颜色

                        // 为每个 part 创建一个 tspan 元素
                        const tspan = usernameText.append('tspan')
                            .attr('x', currentX) // 当前的 x 坐标
                            .attr('dy', 0) // 保持 y 坐标一致
                            .attr('fill', "none") // 设置每个部分的颜色
                            .attr('class', "drawText")
                            // .attr("username", `username-${username}`)
                            .text(part);

                        // 更新 currentX，计算下一个 tspan 的起始 x 坐标
                        currentX += (tspan.node().getBBox().width+5); // 当前 tspan 的宽度加到 currentX 上
                    });

                    // 获取用户名文本的宽度
                    if (usernameTextWidth["username" + containerId] < usernameText.node().getBBox().width) {
                        usernameTextWidth["username" + containerId] = usernameText.node().getBBox().width;
                    }

                    svgWidth += usernameTextWidth["username" + containerId];
                    if (svgWidth < containerWidth){
                        svgWidth = containerWidth
                    }
                    d3.select('.svgContainer' + containerId).attr('width', svgWidth)
                    userLocation[username] = yPos

                    // 绘制模式
                    const patternChart = seqContainer.append('g')
                        .attr('class', 'sankeyChart')
                        .attr('transform', `translate(${usernameTextWidth["username"+containerId]+(circleRadius * 2 + circleSpacing)}, ${-10})`); // 控制图例位置
                    let xPos = 10
                    const value = data[username]
                    value.forEach((list, listIndex) => {
                        const points = list.map((_, i) => ({
                            x: xPos + i * lineSpacing,
                            y: yPos,
                            event: list[i]
                        }));

                        // 为列表中的每个事件绘制圆
                        patternChart.selectAll(null)
                            .data(points)
                            .enter()
                            .append("circle")
                            .attr("class", "pattern-circle")
                            .attr("cx", d => d.x)
                            .attr("cy", d => d.y + 10)
                            .attr("r", circleRadius)
                            .attr("circleName", d => d.event)
                            .attr("username", `username-${username}`)
                            .attr("fill", d => colorMap[d.event] ? colorMap[d.event] : "#eeeeee")
                            .attr("cursor", "pointer")
                            .on("mouseover", (e, d) => {
                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", 0.9);
                                tooltip.html(`Event: ${d.event}`)
                                    .style('left', (e.pageX) - containerRect.left + container.scrollLeft+ 'px')
                                    .style('top', (e.pageY) - containerRect.top+container.scrollTop + 'px');
                            })
                            .on("mouseout", () => {
                                tooltip.transition()
                                    .duration(500)
                                    .style("opacity", 0);
                            });

                        // 连接同一个列表中的事件
                        if (points.length > 1) {
                            patternChart.selectAll(null)
                                .data(points.slice(1))
                                .enter()
                                .append("line")
                                .attr("class", "patternLine")
                                .attr("x1", (d, i) => points[i].x+circleRadius)
                                .attr("y1", d => d.y +10)
                                .attr("x2", d => d.x-circleRadius)
                                .attr("y2", d => d.y+10)
                                .attr("stroke", "grey")
                                .attr("stroke-width", "1px");
                        }
                        xPos += list.length * lineSpacing;
                    });
                });

                let maxPartWidths = {}; //用于记录每一个外键的最大宽度，以实现对齐
                let previousParts = {}; // 用于记录每个索引位置的前一个 part
                let allPartPosition = []
                let partPositions = {}; // 用于记录每个 part 的第一次和最后一次出现
                let lastParts = []; //记录上一个parts，以判断是否是一组

                // 定义一组灰色值（可以根据需求调整颜色的深浅）
                const grayScale = ['#404040','#696969','#808080','#D3D3D3', '#A9A9A9' ];

                Object.keys(data).forEach((username, index) => {
                    const yPos = (index + 1) * (circleRadius * 2.5 + circleSpacing); // 控制圆形的垂直位置
                    const usernameText = userTextContainer.append('text')
                        .attr('x', 10) // 控制用户名的水平位置
                        .attr('y', yPos + circleRadius / 2 )
                        .attr('class', "trueText")
                        .attr("username", `username-${username}`)
                        .style('fill', 'none')
                        .style('font-weight', 'bold')
                        .style('cursor', 'pointer')

                    // 将用户名按 "&" 分割成多个部分
                    const parts = username.split('&');

                    let currentX = 10; // 起始的 x 坐标

                    parts.forEach((part, partIndex) => {
                        const foundUserKey = parameters[partIndex];
                        let fillColor
                        if (part === previousParts[partIndex] && partIndex < parts.length - 1) {
                            // return
                            fillColor = "white"
                        }
                        else{
                            // 设置每个部分的颜色（根据 partIndex 来选择不同的灰色）
                            fillColor = grayScale[partIndex % grayScale.length];  // 根据 partIndex 循环选择颜色
                        }

                        const code=container.getAttribute("codeContext")
                        const [dataKey] = code.split(".");
                        const originalData = store.state.originalTableData[dataKey]
                        const foundKey = findKeyByValue(originalData, part);

                        // 为每个 part 创建一个 tspan 元素
                        const tspan = usernameText.append('tspan')
                            .attr('x', currentX) // 当前的 x 坐标
                            .attr('dy', 0) // 保持 y 坐标一致
                            .attr('fill', fillColor) // 设置每个部分的颜色
                            .text(part)
                            .attr('class', "drawText")
                            .attr("username", `username-${part}`)
                            .on('click', function () {
                                event.stopPropagation(); // 阻止事件传播
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundKey] = selectedUsername
                                changeGlobalHighlight(myObject, containerId)
                                createBrushSet(containerId,[selectedUsername])
                            })
                            .on('mouseover', function () {
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundKey] = selectedUsername
                                changeGlobalMouseover(myObject, containerId)
                            })
                            .on('mouseout', function () {
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundKey] = selectedUsername
                                changeGlobalMouseover(myObject, containerId)
                            });

                        // 如果是 partIndex > 0，且之前没有记录，则初始化 firstX、firstY 和 lastY
                        if (partIndex >= 0 && !partPositions[partIndex]) {
                            partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        }

                        // 如果是 partIndex > 0，记录其第一次和最后一次出现的位置
                        // 如果是第一个 username，初始化每个 partIndex 的竖线起点
                        if (index === 0) {
                            partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        } else {
                            // 检查当前 partIndex 及其以上层级是否都相同
                            let isConsistent = true;
                            for (let i = 0; i <= partIndex; i++) {
                                if (parts[i] !== previousParts[i]) {
                                    isConsistent = false;
                                    break;
                                }
                            }

                            // 如果满足条件，则更新当前 partIndex 的竖线终点
                            if (isConsistent) {
                                partPositions[partIndex].lastY = yPos;
                            } else {
                                partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                            }
                        }

                        // 更新 currentX，计算下一个 tspan 的起始 x 坐标
                        currentX += (tspan.node().getBBox().width+15); // 当前 tspan 的宽度加到 currentX 上

                        // 检查是否需要移除这个元素
                        if (part === previousParts[partIndex] && partIndex < parts.length - 1) {
                            tspan.remove(); // 移除元素
                        }

                    });

                    lastParts = parts
                    // 更新 previousParts
                    previousParts = parts;

                    // 对于 partIndex > 0 的情况，如果有多次出现，绘制一条从头到尾的线

                    Object.keys(partPositions).forEach(partIndex => {
                        const position = partPositions[partIndex];
                        allPartPosition.push(position)
                    });

                    // 获取用户名文本的宽度
                    if (usernameTextWidth["username" + containerId] < usernameText.node().getBBox().width) {
                        usernameTextWidth["username" + containerId] = usernameText.node().getBBox().width;
                    }
                    userLocation[username] = yPos;
                });

                // 调用清洗函数
                const cleanedLines = cleanLines(allPartPosition);

                for(let i=0;i<cleanedLines.length;i++){
                    const positions = cleanedLines[i];
                    userTextContainer.append('line')
                        .attr('x1', positions.firstX-5) // 竖线的 x 坐标固定
                        .attr('x2', positions.firstX-5) // 竖线的 x 坐标固定
                        .attr('y1', positions.firstY-10) // 竖线的起点在第一次出现的 y 坐标
                        .attr('y2', positions.lastY+10) // 竖线的终点在最后一次出现的 y 坐标
                        .attr('stroke', '#888') // 线颜色为灰色
                        .attr('stroke-width', 1); // 线宽度
                }
            }

            // 监听选中的异常事件
            store.watch(() => store.state.isClickCancelBrush, () => {
                svg.selectAll('.set1-region').remove();
                svg.select(".setBrush").call(setBrush.move, null);
                svg.select(".setBrush").selectAll("*").remove();
                svg.select(".setBrush").on(".setBrush", null);
                svg.selectAll(".event-selected").classed("event-selected", false);
                svg.selectAll(".text-selected").classed("text-selected", false);
                // 移除先前的高亮效果
                svg.selectAll(".highlighted-username").classed("highlighted-username", false);
            });

            function brushed(event) {
                if (!event.selection) return;
                const [[x0, y0], [x1, y1]] = event.selection;
                const selectedData = [];
                const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
                svg.selectAll(".pattern-circle")
                    .classed("event-selected", function(d) {
                        const cx = parseFloat(d3.select(this).attr("cx")) + (circleRadius * 2 + circleSpacing) + usernameTextWidth["username"+containerId];
                        const cy = parseFloat(d3.select(this).attr("cy"));
                        const isSelected = x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                        if (isSelected) {
                            selectedData.push(parseAction(d.event));  // 将选中的数据添加到数组中
                        }
                        return isSelected;
                    });
                // 框选的也可能是名字
                if(selectedData.length===0){
                    const userTextContainer = svg.select(".userTextContainer")
                    const AllText = userTextContainer.selectAll(".trueText")
                    AllText.each(function() {
                        let text = d3.select(this);
                        let xPos = +text.attr("x");
                        let yPos = +text.attr("y");

                        // 检查文本的坐标是否在刷选框内
                        if (xPos >= x0 && xPos <= x1 && yPos >= y0 && yPos <= y1) {
                            text.classed("text-selected",true);
                            selectedData.push(text.text()); // 添加符合条件的用户名到数组
                        }
                    });
                }
                createSet1(x0,y0,x1,y1,selectedData)
            }

            function createSet1(x0,y0,x1,y1,selectedData) {
                createBrushSet(containerId,selectedData)
                // 移除旧的点击区域
                svg.selectAll('.clickable-region').remove();
                // 创建一个点击响应区域，是否加入异常序列
                svg.append('rect')
                    .attr('class', 'set1-region')
                    .attr('x', x0)
                    .attr('y', y0)
                    .attr('width', x1 - x0)
                    .attr('height', y1 - y0)
                    .style('fill', 'none')
                    .style('pointer-events', 'all')
                    .on('click', () => {
                        if(selectedData!==0){
                            // createBrushSet(containerId,selectedData)
                            store.commit('setSelectFromPattern',selectedData)
                            changeEventBrush(selectedData, containerId)
                            changePatternBrush(selectedData)
                        }
                        // Swal.fire({
                        //     title: 'Filter or create data block?',
                        //     icon: "question",
                        //     showCloseButton: true,
                        //     showCancelButton: false,
                        //     showConfirmButton: false,
                        //     confirmButtonText: 'Filter',
                        //     cancelButtonText: 'Create',
                        //     focusConfirm: false,
                        //     html: `
                        //         <button id="btn1" class="swal2-confirm swal2-styled" style="background: #7cd1f9">Filter</button>
                        //         <button id="btn2" class="swal2-confirm swal2-styled" style="background: #635CC3">Create</button>
                        //         <button id="btn3" class="swal2-confirm swal2-styled" style="background: #f0ad4e">Both</button>
                        //     `, // HTML content with three buttons
                        // }).then((result) => {
                        // })
                        // // Add event listeners to the buttons after the SweetAlert2 has been displayed
                        // Swal.getPopup().querySelector('#btn1').addEventListener('click', () => {
                        //     store.commit('setSelectFromPattern',selectedData)
                        //     changeEventBrush(selectedData, containerId)
                        //     Swal.close();
                        // });
                        //
                        // Swal.getPopup().querySelector('#btn2').addEventListener('click', () => {
                        //     createBrushSet(containerId,selectedData)
                        //     changePatternBrush(selectedData)
                        //     Swal.close();
                        // });
                        //
                        // Swal.getPopup().querySelector('#btn3').addEventListener('click', () => {
                        //     createBrushSet(containerId,selectedData)
                        //     store.commit('setSelectFromPattern',selectedData)
                        //     changeEventBrush(selectedData, containerId)
                        //     changePatternBrush(selectedData)
                        //     Swal.close();
                        // });
                    })
                    .on('contextmenu', (event) => {
                        event.preventDefault();  // 阻止默认的右键菜单
                        store.dispatch('saveIsClickCancelBrush');
                    });
            }

            // 创建框选区域
            const setBrush = d3.brush()
                .on("start brush", (event) => brushed(event));

            // 添加框选到 SVG 容器
            svg.append("g")
                .attr("class", "setBrush")

            store.watch(() => store.state.isClickBrush, () => {
                svg.select(".setBrush").call(setBrush);
            });

            // 监听尺寸变化
            const resizeObserver = new ResizeObserver(() => {
                const containerHeight = container.getBoundingClientRect().height;
                let newLegendTop
                if(containerHeight<500){
                    newLegendTop = containerHeight * 0.96;
                }
                else{
                    newLegendTop = containerHeight * 0.983;
                }

                legendSvg.attr('transform', `translate(0, ${newLegendTop - totalHeight})`);
            });

            // 开始监听
            resizeObserver.observe(container); // 直接观察 DOM 元素
        }
    },

    createTimeLine(isEventPair = false,containerId, originData, seqView) {
        // 检查数据的有效性
        if (!originData || Object.keys(originData).length === 0) {
            return;
        }

        const data = flatten(originData)

        // 遍历对象的所有键
        for (const key in data) {
            if (key === " " || key ==="No") {
                delete data[key];
            }
        }

        store.commit('setTimeLineData',{ key: containerId, value: {data: data, seqView:seqView} })
        let align_data = data
        let sequences=[]
        let userSeq={}
        let sankeyNodes;
        let seqContainer, svgWidth, svgHeight
        let uniqueActionTypesArray

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRect = document.getElementById(containerId).getBoundingClientRect();

        const code=container.getAttribute("codeContext")
        // 使用正则表达式匹配 group("title") 中的 title
        const matches = code.match(/group\("([^"]+)"\)/g);
        // 使用 map 提取出 title 并去除 group("") 的部分,提取出来group的参数
        const groupParam = matches ? matches.map(match => match.match(/group\("([^"]+)"\)/)[1]) : [];
        const curColormap = store.state.curColorMap

        // 创建包含所有元素的标题容器
        const titleElement = document.createElement('div');
        titleElement.style.marginLeft = '12px'; // 设置左边距
        titleElement.style.color = '#696969'; // 设置文字颜色

        // 创建一个数组，用于保存所有的 dropdown 元素
        const dropdowns = [];
        const toggleBoxes = []
        let maxTextWidth = {}
        // 定义创建下拉框的函数

        // 初始化变量
        let isDragging = false;
        let dragStart = null;

        // 监听鼠标事件
        container.addEventListener('mousedown', function(event) {
            // 记录鼠标起始位置
            dragStart = { x: event.clientX, y: event.clientY };
        });

        container.addEventListener('mousemove', function(event) {
            if (dragStart) {
                // 计算拖动距离
                const deltaX = event.clientX - dragStart.x;
                const deltaY = event.clientY - dragStart.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // 判断是否超过阈值
                if (distance > dragThreshold) {
                    store.dispatch('saveIsClickBrush');
                    isDragging = true;
                }
            }
        });

        container.addEventListener('mouseup', function(event) {
            if (!dragStart) return;
            // 计算拖动结束位置
            const dragEnd = { x: event.clientX, y: event.clientY };
            const deltaX = dragEnd.x - dragStart.x;
            const deltaY = dragEnd.y - dragStart.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // 清除状态
            dragStart = null;
            isDragging = false;
        });

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }
        // const foundUserKey = parameters[0]

        // 创建 SVG 容器
        let margin = { top: 0.01*containerHeight, left: 0.01*containerHeight, right: 0.02*containerWidth };
        // 找到最长的事件序列的长度
        let maxLength = 0;
        let eventCount= 0
        // 计算圆形的半径
        const scaleFactor = 0.025;
        let circleRadius = Math.max(10,Math.min(containerWidth, containerHeight) * scaleFactor / 2);
        let circleSpacing = circleRadius/2
        let newLength=0

        // 创建下拉框
        const selectBox = document.createElement('select');
        selectBox.id = 'time-selection';
        selectBox.className = 'my-select';
        // 添加下拉选项
        const defaultOption = document.createElement('option');
        defaultOption.innerText = 'Align By'; // 这里设置您想要显示的默认文字
        defaultOption.disabled = true; // 禁止选择这个选项
        defaultOption.selected = true; // 默认选中这个选项
        const option1 = document.createElement('option');
        option1.value = '相对时间';
        option1.innerText = 'relative time';
        const option2 = document.createElement('option');
        option2.value = '绝对时间';
        option2.innerText = 'absolute time';
        const option3 = document.createElement('option');
        option3.value = '局部对齐';
        option3.innerText = 'local alignment';
        const option4 = document.createElement('option');
        option4.value = '全局对齐';
        option4.innerText = 'global alignment';

        // 将选项添加到下拉框中
        selectBox.appendChild(defaultOption);
        selectBox.appendChild(option1);
        selectBox.appendChild(option2);
        selectBox.appendChild(option3);
        selectBox.appendChild(option4);

        // 聚合下拉框
        const aggBox = document.createElement('select');
        aggBox.id = 'agg-selection';
        aggBox.className = 'my-select';
        // 添加下拉选项
        const defaultAggOption = document.createElement('option');
        defaultAggOption.innerText = 'Aggregate'; // 这里设置您想要显示的默认文字
        defaultAggOption.disabled = true; // 禁止选择这个选项
        defaultAggOption.selected = true; // 默认选中这个选项
        const aggOption1 = document.createElement('option');
        aggOption1.value = '聚合';
        aggOption1.innerText = 'true';
        const aggOption2 = document.createElement('option');
        aggOption2.value = '不聚合';
        aggOption2.innerText = 'false';

        // 将选项添加到下拉框中
        aggBox.appendChild(defaultAggOption);
        aggBox.appendChild(aggOption1);
        aggBox.appendChild(aggOption2);

        // 创建一个勾选框
        const queryBox = document.createElement('input');
        queryBox.type = 'checkbox';
        queryBox.id = 'query-selection';
        queryBox.className = 'el-checkbox-input';
        // 创建包装容器
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        // 创建聚合构型下拉框
        const aggVisBox = document.createElement('select');
        aggVisBox.id = 'aggVis-selection';
        aggVisBox.className = 'my-select';
        // 添加下拉选项
        const defaultAggVisOption = document.createElement('option');
        defaultAggVisOption.innerText = 'Agg Vis'; // 这里设置您想要显示的默认文字
        defaultAggVisOption.disabled = true; // 禁止选择这个选项
        defaultAggVisOption.selected = true; // 默认选中这个选项
        const aggVisOption1 = document.createElement('option');
        aggVisOption1.value = '旭日图';
        aggVisOption1.innerText = 'Sunburst';
        const aggVisOption2 = document.createElement('option');
        aggVisOption2.value = '气泡树图';
        aggVisOption2.innerText = 'Circular';
        const aggVisOption3 = document.createElement('option');
        aggVisOption3.value = '紧凑气泡图';
        aggVisOption3.innerText = 'Bubble';

        // 将选项添加到下拉框
        aggVisBox.appendChild(defaultAggVisOption);
        aggVisBox.appendChild(aggVisOption1);
        aggVisBox.appendChild(aggVisOption2);
        aggVisBox.appendChild(aggVisOption3);

        // 创建新的包装容器
        // const controlsContainer = document.createElement('div');
        const containerNew = d3.select(`#${containerId}`); // 改用 D3 选择器
        const controlsContainer = containerNew.insert("div", ":first-child")
            .attr("class", "controls-container")
            .style("position", "sticky")
            .style("top", "0px")
            .style("height", "25px")
            .style("width", "90%")
            .style("z-index", "1000")
            .style("background", "white");
        controlsContainer.className = 'controls-container';
        controlsContainer.className = 'controls-container';
        // 将元素添加到新的包装容器中
        controlsContainer.node().appendChild(titleElement);
        controlsContainer.node().appendChild(selectBox);
        controlsContainer.node().appendChild(inputContainer);
        inputContainer.appendChild(aggVisBox);
        // controlsContainer.appendChild(titleElement);
        // controlsContainer.appendChild(selectBox);
        // // controlsContainer.appendChild(aggBox);
        // controlsContainer.appendChild(inputContainer);
        // inputContainer.appendChild(aggVisBox);
        // // container.appendChild(controlsContainer);

        aggVisBox.style.display = 'none';
        let colorMap;
        let filteredEvents

        if(isEventPair === true){
            const startTime = store.state.eventPairStartNum;
            const endTime = store.state.eventPairEndNum;

            let path=""
            if(store.state.eventAnalyse==="event pairs"){
                path='http://127.0.0.1:5000/event_pairs'
            }
            else if(store.state.eventAnalyse==="event paths"){
                path='http://127.0.0.1:5000/event_paths'
            }
            else if(store.state.eventAnalyse==="seq pairs"){
                path='http://127.0.0.1:5000/sequences_paths'
            }
            // const nodeId=Object.keys(store.state.interactionData)[0]
            // const value = store.state.interactionData[nodeId]
            const eventSet1 = store.state.eventSet1
            const eventSet2 = store.state.eventSet2
            // 调用函数来筛选事件
            axios.post(path, { data: data, startTime:startTime, endTime:endTime,eventSet1:eventSet1,eventSet2:eventSet2,attr1:store.state.eventPairAttr1,attr2:store.state.eventPairAttr2})
                .then(response => {
                    filteredEvents = response.data["filteredEvents"]
                    displayFilteredEvents(data,filteredEvents);
                })
                .catch(error => {
                    console.error(error);
                });
        }

        store.watch(
            () => store.state.isClickCancelBrush,
            (newValue) => {
                for (const key in store.state.interactionData) {
                    if (store.state.interactionData.hasOwnProperty(key)) {
                        const value = store.state.interactionData[key];
                        const selectedData = value.data[0]

                        const filteredData = Object.fromEntries(
                            Object.entries(data).filter(([key]) =>
                                selectedData.some(substring => key.includes(substring))
                            )
                        );

                        console.log(filteredData);

                        if(filteredData.length!==0){
                            createChart(containerId,filteredData,store.state.curColorMap)
                        }
                    }
                }

            },
        );


        // store.watch(() => store.state.isAnalyseEvent, () => {
        //     const startTime = store.state.eventPairStartNum;
        //     const endTime = store.state.eventPairEndNum;
        //     let path=""
        //     if(store.state.eventAnalyse==="event pairs"){
        //         path='http://127.0.0.1:5000/event_pairs'
        //     }
        //     else if(store.state.eventAnalyse==="event paths"){
        //         path='http://127.0.0.1:5000/event_paths'
        //     }
        //     else if(store.state.eventAnalyse==="seq pairs"){
        //         path='http://127.0.0.1:5000/sequences_paths'
        //     }
        //
        //     // const nodeId=Object.keys(store.state.interactionData)[0]
        //     // const value = store.state.interactionData[nodeId]
        //     const eventSet1 = store.state.eventSet1
        //     const eventSet2 = store.state.eventSet2
        //
        //     // 调用函数来筛选事件
        //     axios.post(path, { data: data, startTime:startTime, endTime:endTime,eventSet1:eventSet1,eventSet2:eventSet2,seqView:store.state.eventPairAttr})
        //         .then(response => {
        //             const filteredEvents = response.data["filteredEvents"]
        //             displayFilteredEvents(data,filteredEvents);
        //         })
        //         .catch(error => {
        //             console.error(error);
        //         });
        // });

        let legendSvg
        let totalHeight = 0;   //用于存储总高度

        function createLegend(seqContainer,svgWidth,uniqueActionTypesArray){
            if(typeof uniqueActionTypesArray[1] === 'string'){
                // 创建图例
                // const legend = seqContainer.append('g')
                //     .attr('class', 'legend')
                //     .attr('transform', `translate(15, ${(Object.keys(data).length+1) * (circleRadius * 2.5 + circleSpacing)})`); // 控制图例位置

                // const legend = seqContainer.append('g')
                //     .attr('class', 'legend')
                //     .attr('transform', `translate(15, 0)`); // 控制图例位置

                const container = d3.select(`#${containerId}`); // 改用 D3 选择器
                // 移除已有的 legendWrapper（如果存在）
                container.select(".legend-wrapper").remove(); // 通过类名选择并移除

                const beforeNode = container.node().children[1] || null;

                const legendWrapper = container.insert("div", function() {
                    return beforeNode;})
                    .attr("class", "legend-wrapper") // 添加类名以便后续移除
                    .style("position", "sticky")  // sticky 定位
                    .style("top", "45px")          // 距离容器顶部0px时固定
                    .style("left", "12px")        // 水平偏移
                    .style("z-index", "999")
                    .style("height", "10px")
                    .style("background", "none"); // 避免内容被遮挡

                // 获取容器高度
                const containerHeight = container.node().getBoundingClientRect().height;

                let legendTop;
                if (svgHeight < containerHeight) {
                    legendTop = svgHeight; // 如果 SVG 高度小于容器高度，将 legendTop 设置为 SVG 高度
                } else {
                    if(containerHeight>500){
                        legendTop = containerHeight*0.93; // 否则，将 legendTop 设置为容器高度
                    }
                    else{
                        legendTop = containerHeight*0.85; // 否则，将 legendTop 设置为容器高度
                    }
                }

                legendSvg = legendWrapper.append("svg")
                    .attr("width", svgWidth)
                    .attr('transform', `translate(0, ${legendTop})`)
                    .style("background-color", "#eeeeee")
                    .attr("height",0); // 初始高度为 0，后续可以根据内容动态调整

                // 后续图例绘制代码保持不变...
                const legend = legendSvg.append("g")
                    .attr("class", "legend")

                // 添加图例矩形和文字
                const legendItems = uniqueActionTypesArray;

                let totalLegendWidth = 0; // 用于存储总宽度
                let legendY = 0;
                let rowCount = 1;  //总行数
                const rectSize = circleRadius*2;

                let i = 0;
                while (i < legendItems.length) {
                    if (legendItems[i] === " " || legendItems[i] === null ) {
                        legendItems.splice(i, 1); // 删除当前元素
                    } else {
                        i++;
                    }
                }

                legendItems.forEach((item, index) => {
                    // 添加图例文字
                    const legendText = legend.append('text').text(item).style('font-size', rectSize/1.5);
                    // 获取图例文本的宽度
                    const legendTextWidth = legendText.node().getBBox().width;

                    let gap = circleRadius*1.5
                    let legendX = totalLegendWidth;
                    let legendCountInRow = 0;
                    // 总宽度
                    totalLegendWidth += gap+rectSize+legendTextWidth;
                    // 计算一行可以容纳多少个图例
                    const availableLegendCount = Math.floor(svgWidth / totalLegendWidth);
                    // 根据图例数量决定是否换行
                    if (legendCountInRow >= availableLegendCount) {
                        legendX = 0;
                        totalLegendWidth = 0;
                        totalLegendWidth += gap+rectSize+legendTextWidth;
                        legendY += rectSize*2;
                        legendCountInRow = 0;
                        rowCount++;
                    }
                    legendCountInRow++;
                    legendText
                        .attr('x', legendX+rectSize*1.4+legendTextWidth/2+15).attr('y', legendY+ rectSize*0.6)
                        .attr('text-anchor', 'middle').attr('alignment-baseline', 'middle')
                        .attr('class', 'sankeyLegendText')
                        .attr('text',item)
                        .style('fill', colorMap[item] ? colorMap[item] : "#eeeeee") // 根据操作类型选择颜色
                        .style('font-weight', 'bold')
                        .style('cursor', 'pointer') // 设置鼠标悬浮时显示手指样式
                        .on('click', function() {
                            event.stopPropagation();
                            const myObject = {};
                            myObject[store.state.curColorMap] = item
                            changeGlobalHighlight(myObject, containerId)
                        })
                        .on('mouseover', function() {
                            const myObject = {};
                            myObject[store.state.curColorMap] = item
                            changeGlobalMouseover(myObject, containerId)
                        })
                        .on('mouseout', function() {
                            const myObject = {};
                            myObject[store.state.curColorMap] = item
                            changeGlobalMouseover(myObject, containerId)
                        });

                    // 添加图例矩形
                    legend.append('rect')
                        .attr('x', legendX+15)
                        .attr('y', legendY)
                        .attr('width', rectSize)
                        .attr('height', rectSize)
                        .style('fill', colorMap[item])
                        .style('stroke', colorMap[item]) // 根据操作类型选择颜色
                        .style('stroke-width', '2px')   // 设置线条粗细为2像素
                        .attr('class', 'sankeyLegendRect')
                        .attr('id', item)
                });

                // 计算总高度
                totalHeight = (2*rowCount-1) * rectSize;
                // 动态设置 legendSvg 的高度
                legendSvg.attr('transform', `translate(0, ${legendTop-totalHeight})`);
                legendSvg.attr("height", totalHeight);
            }
        }

        function cleanData(inputData, targetKeys, emptyValue = " ") {
            const cleanedData = JSON.parse(JSON.stringify(inputData)); // 深拷贝

            for (const node in cleanedData) {
                if (typeof cleanedData[node] !== "object") continue;

                const keys = targetKeys || Object.keys(cleanedData[node]); // 使用传入字段或全部字段
                let indicesToRemove = [];

                // (1) 仅检查 targetKeys 中的字段，记录要删除的索引
                keys.forEach(key => {
                    if (
                        Array.isArray(cleanedData[node][key]) &&
                        key in cleanedData[node] // 确保字段存在
                    ) {
                        cleanedData[node][key].forEach((val, index) => {
                            if (val === emptyValue && !indicesToRemove.includes(index)) {
                                indicesToRemove.push(index);
                            }
                        });
                    }
                });

                // (2) 从后往前删除数据，避免索引错乱
                indicesToRemove.sort((a, b) => b - a).forEach(index => {
                    for (const key in cleanedData[node]) {
                        if (Array.isArray(cleanedData[node][key])) {
                            cleanedData[node][key].splice(index, 1); // 删除所有数组的对应行
                        }
                    }
                });
            }

            return cleanedData;
        }

        function displayFilteredEvents(data,filteredEvents, isSegment = true) {
            filteredEvents = removeSubsets(filteredEvents)

            if(isSegment){
                // 结果容器
                const result = {};

                for (const key in filteredEvents) {
                    if (data.hasOwnProperty(key)) {
                        result[key] = {}; // 初始化结果中的键
                        const indicesList = filteredEvents[key]; // 获取下标列表

                        // 遍历下标列表
                        indicesList.forEach((indices, seqIndex) => {
                            const seqKey = `seq${seqIndex + 1}`; // 生成 seq1, seq2 等键
                            result[key][seqKey] = {};

                            const curColormap = store.state.curColorMap

                            // 遍历 data 中的属性
                            for (const attr in data[key]) {
                                result[key][seqKey][attr] = indices.map(index => data[key][attr][index]);
                            }
                        });
                    } else {
                        result[key] = {}; // 如果 data 中没有对应的键，初始化为空对象
                    }
                }

                createChart(containerId,flatten(result),store.state.curColorMap)
            }
            else{
                const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
                // 首先移除所有旧的线条
                svg.selectAll('.event-pairs').remove();
                // 先将所有事件圆形颜色设置为灰色
                Object.keys(filteredEvents).forEach(username => {
                    filteredEvents[username].forEach(eventPair => {

                        // 为属于eventPair的事件圆形添加特定类名
                        let circleName = `circle-${username}`;
                        svg.selectAll(`[circleName="${circleName}"]`)
                            .filter((d, i) => i === eventPair.event1 || i === eventPair.event2)
                            .classed('paired-event', true);

                        // const event1 = eventPair.event1
                        // const event2 = eventPair.event2
                        const event1 = eventPair[0]
                        const event2 = eventPair[eventPair.length-1]

                        const event1Coords = getCircleCoordinates(username, event1, data, containerWidth, containerHeight);
                        const event2Coords = getCircleCoordinates(username, event2, data, containerWidth, containerHeight);
                        // 计算控制点坐标
                        const controlX = (event1Coords.x + event2Coords.x) / 2;
                        const controlY = Math.min(event1Coords.y, event2Coords.y) - 40; // 控制点偏移量，可根据需要调整
                        // 绘制弧形路径
                        const pathData = `M ${event1Coords.x} ${event1Coords.y} Q ${controlX} ${controlY} ${event2Coords.x} ${event2Coords.y}`;
                        svg.append('path')
                            .attr('class', 'event-pairs') // 为线条添加类名，便于后续选择和移除
                            .attr('d', pathData)
                            .attr('stroke', 'grey')
                            .attr('fill', 'none');
                    });
                });
                // svg.selectAll('.event-circle')
                //     .filter(function() { return !d3.select(this).classed('paired-event'); }) // 过滤出不含 'paired-event' 类名的元素
                //     .classed('unpaired-event', true); // 为这些元素添加 'unpaired-event' 类名
            }

        }

        store.watch(() => store.state.isClickReset, () => {
            const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
            // 移除所有连接线
            svg.selectAll('.event-pairs').remove();
            // 将所有事件圆形的颜色还原到原始状态
            if(aggBox.value!=="聚合"){
                svg.selectAll('.event-circle')
                    .classed('unpaired-event', false); // 如果使用了特定类名进行高亮显示，移除该类名
            }
        });

        //获取事件坐标
        function getCircleCoordinates(username, index) {
            // 构造对应的选择器
            const selector = `.event-circle[circleName="circle-${username}"]`;
            const circles = d3.selectAll(selector);
            const selectedCircle = circles.filter((d, i) => i === index);
            // 获取圆心坐标
            const xPos = parseFloat(selectedCircle.attr('cx'))+ (circleRadius * 2 + circleSpacing) + usernameTextWidth["username"+containerId];
            const yPos = parseFloat(selectedCircle.attr('cy'))-10;
            return { x: xPos, y: yPos };
        }

        if(!store.state.curExpression.includes(".filter(\"subsequence\")")){
            createChart(containerId,data,seqView)
        }

        store.watch(() => store.state.globalColorMap, () => {
            const myDiv= document.getElementById(containerId)
            if(myDiv.getAttribute("codeContext").includes(".view_type(\"timeline\")")){
                // 更改全局变量的值
                store.commit('setTimeLineData',{ key: containerId, value: {data: data, seqView:store.state.curColorMap} })
                // 获取当前选中的值
                // createChart(containerId,data,store.state.curColorMap)
                if(!store.state.curExpression.includes(".filter(\"pattern\")")){
                    createChart(containerId,data,store.state.curColorMap)
                }
                else{
                    displayFilteredEvents(data,filteredEvents);
                }
                selectBox.selectedIndex = 0;
                aggBox.selectedIndex = 0;
            }
        });
        // 当取消筛选的时候也需要重新绘制
        store.watch(() => store.state.isClickCancelFilter, () => {
            if(!store.state.curExpression.includes(".filter(\"pattern\")")){
                createChart(containerId,data,store.state.curColorMap)
            }
            else{
                displayFilteredEvents(data,filteredEvents);
            }
        });

        store.watch(() => store.state.isCancelAnalyseEvent, () => {
            createChart(containerId,data,store.state.curColorMap)
        });


        async function createChart(containerId,data,seqView){
            maxLength = 0
            Object.values(data).forEach(user => {
                eventCount = user[seqView].length
                if (eventCount > maxLength) {
                    maxLength = eventCount;
                }
            })
            const createToggleBox = (defaultValue, index) => {
                // 创建一个 span 元素作为切换框
                const toggleBox = document.createElement('span');
                toggleBox.textContent = defaultValue; // 设置默认值
                // toggleBox.style.cursor = 'pointer'; // 设置鼠标样式为手型，表示可点击
                // toggleBox.style.cursor = toggleBox.textContent === ':' ? 'not-allowed' : 'pointer';
                toggleBox.style.cursor = 'pointer';

                toggleBox.style.marginLeft = '5px'; // 设置左右 margin
                toggleBox.style.marginRight = '5px';
                toggleBox.className = `toggle-box-${index}`; // 设置唯一的类名

                // 添加点击事件监听器
                toggleBox.addEventListener('click', () => {
                    // 如果当前显示的是冒号，则直接返回，不执行任何操作
                    if (toggleBox.textContent === ':') {
                        return;
                    }
                    let dropdownValueList = []

                    // 切换内容
                    toggleBox.textContent = toggleBox.textContent === '×' ? ':' : '×';
                    // updateCursor();

                    // 处理切换逻辑
                    if (toggleBox.textContent === ':') {
                        aggVisBox.style.display = 'none';
                        // 遍历所有切换框，如果不是当前切换框，设置其值为 ×
                        toggleBoxes.forEach(otherToggleBox => {
                            if (otherToggleBox !== toggleBox && otherToggleBox.textContent !=="" ) {
                                otherToggleBox.textContent = '×';
                            }
                            dropdownValueList.push(otherToggleBox.textContent);
                        });

                        // 调整层级关系
                        usernameTextWidth["username" + containerId] = 0;
                        seqContainer.selectAll("*").remove();
                        // 列表最后一个是：说明聚合
                        if (dropdownValueList[dropdownValueList.length - 1] === ":") {
                            selectBox.disabled = false;
                            createLegend(seqContainer, svgWidth, uniqueActionTypesArray, data);
                            withoutAgg();
                        } else {
                            aggVisBox.style.display = '';
                            selectBox.disabled = true;
                            createLegend(seqContainer, svgWidth, uniqueActionTypesArray, originData);
                            Object.keys(originData).forEach((username, index) => {
                                const yPos = (index + 1) * (circleRadius * 2.5 + circleSpacing);
                                const usernameText = seqContainer.append('text')
                                    .attr('x', 10) // 控制用户名的水平位置
                                    .attr('y', yPos + circleRadius / 2)
                                    .text(username)
                                    .style('fill', '#808080')
                                    .style('font-weight', 'bold');
                                // 获取用户名文本的宽度
                                if (usernameTextWidth["username" + containerId] < usernameText.node().getBBox().width) {
                                    usernameTextWidth["username" + containerId] = usernameText.node().getBBox().width;
                                }
                                aggUserLocation[username] = yPos;
                            });

                            svg.attr('height', (Object.keys(originData).length + 2) * (circleRadius * 2.5 + circleSpacing) + circleRadius * 2.5 + margin.top);
                            const dataToAgg = extractInfoBySeqView(align_data, seqView);
                            const hierachyData = groupData(dataToAgg);
                            getSankeyData('http://127.0.0.1:5000/get_agg_timeline_data', hierachyData, true);
                        }
                    }
                });

                // 将当前 toggleBox 添加到 toggleBoxes 数组中
                toggleBoxes.push(toggleBox);
                return toggleBox;
            };

            // 定义 dragSource，用于存储被拖动的元素
            let dragSource = null;

            // 定义事件处理函数
            const handleDragStart = function (e) {
                dragSource = this;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', this.innerHTML);
                // 添加拖动样式
                this.classList.add('dragging');
                e.stopPropagation(); // 新增，阻止事件冒泡
            };

            const handleDragOver = function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.stopPropagation();
                return false;
            };

            const handleDragEnter = function (e) {
                this.classList.add('over');
                e.stopPropagation();
            };

            const handleDragLeave = function (e) {
                this.classList.remove('over');
                e.stopPropagation();
            };

            const handleDrop = function (e) {
                e.stopPropagation();
                e.preventDefault();

                if (dragSource !== this) {
                    // 交换 dragSource 和当前元素的内容
                    [dragSource.innerHTML, this.innerHTML] = [this.innerHTML, dragSource.innerHTML];

                    // 重新附加事件监听器，因为 innerHTML 的改变会移除事件监听器
                    addDragAndDropHandlers(dragSource);
                    addDragAndDropHandlers(this);
                }

                // 调用更新函数
                updateOrderArray();
                return false;
            };

            function updateOrderArray(){
                // 获取容器中的所有 span 元素
                const spans = document.querySelectorAll(`#${containerId} span.draggable`);
                // 创建一个数组来存储文本内容
                const newOrder = [];
                // 遍历 span 元素，获取文本内容并存入数组
                spans.forEach(span => {
                    newOrder.push(span.textContent);
                });
                // 输出结果
                const originalString = container.getAttribute("codeContext")

                // 1. 按照 . 分割字符串
                const parts = originalString.split('.');
                // 2. 找到所有 group("...") 部分的索引
                const groupIndices = [];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].startsWith('group("')) {
                        groupIndices.push(i); // 记录 group("...") 部分的索引
                    }
                }

                // 3. 按照 newOrder 的顺序替换 group("...") 部分
                for (let i = 0; i < newOrder.length; i++) {
                    const index = groupIndices[i]; // 获取当前 group("...") 的索引
                    if (index !== undefined) {
                        parts[index] = `group("${newOrder[i]}")`; // 替换为新的 group("...")
                    }
                }
                // 4. 将修改后的部分重新拼接成字符串
                const newString = parts.join('.');

                store.dispatch('saveIsExchange');
                store.dispatch('saveCurExpression',newString);
            }

            const handleDragEnd = function (e) {
                // 移除样式
                this.classList.remove('dragging');
                document.querySelectorAll('.draggable').forEach(item => {
                    item.classList.remove('over');
                });
                e.stopPropagation();
            };

            // 添加拖动和放下的事件监听器
            const addDragAndDropHandlers = (element) => {
                element.addEventListener('dragstart', handleDragStart, false);
                element.addEventListener('dragenter', handleDragEnter, false);
                element.addEventListener('dragover', handleDragOver, false);
                element.addEventListener('dragleave', handleDragLeave, false);
                element.addEventListener('drop', handleDrop, false);
                element.addEventListener('dragend', handleDragEnd, false);
            };

            groupParam.forEach((group, index) => {
                // 判断 group 标题是否已经存在
                if (!titleElement.querySelector(`[data-group="${group}"]`)) {
                    const groupTitle = document.createElement('span');
                    groupTitle.setAttribute('data-group', group);
                    groupTitle.appendChild(document.createTextNode(group));
                    // 设置为可拖动
                    groupTitle.setAttribute('draggable', true);
                    groupTitle.classList.add('draggable');
                    // 直接设置悬停时光标样式
                    groupTitle.style.cursor = 'move';  // 或 'pointer'（手型光标）
                    // 添加拖动事件监听器
                    addDragAndDropHandlers(groupTitle);
                    titleElement.appendChild(groupTitle);
                }

                // 如果不是最后一个元素，检查并添加 × 下拉框
                if (index < groupParam.length - 1) {
                    const multiplyDropdownId = `multiply-dropdown-${index}`;
                    if (!titleElement.querySelector(`#${multiplyDropdownId}`)) {
                        const multiplyDropdown = createToggleBox('×');
                        multiplyDropdown.id = multiplyDropdownId;
                        titleElement.appendChild(multiplyDropdown);
                    }
                }
            });

            // 检查并添加最后一个默认值为 : 的下拉框
            const colonDropdownId = `colon-dropdown-${groupParam.length}`;
            if (!titleElement.querySelector(`#${colonDropdownId}`)) {
                const colonDropdown = createToggleBox('', groupParam.length);
                colonDropdown.id = colonDropdownId;
                titleElement.appendChild(colonDropdown);
            }

            // 假设 span 元素有一个特定的 id 或 class 来标识
            const colormapTextId = 'colormap-text'; // 可以是 id 或其他标识符
            let colormapText = titleElement.querySelector(`#${colormapTextId}`); // 查询已存在的元素

            // 如果不存在，则创建并添加新的 span 元素
            if (!colormapText) {
                colormapText = document.createElement('span');
                colormapText.id = colormapTextId; // 为元素设置 id
                colormapText.textContent = curColormap;
                // // 设置为可拖动
                // colormapText.setAttribute('draggable', true);
                colormapText.classList.add('draggable');

                // 添加拖动事件监听器
                addDragAndDropHandlers(colormapText);
                titleElement.appendChild(colormapText);
            }

            const spans = document.querySelectorAll(`#${containerId} span.draggable`);

            // 遍历 toggleBoxes 数组
            spans.forEach((span, index) => {
                const width = span.offsetWidth; // 使用 offsetWidth 获取元素的宽度
                // 将宽度按次序存入字典
                maxTextWidth[index] = width;
            });
            // 输出结果

            store.watch(() => store.state.curColorMap, (newValue) => {
                // 修改文字显示
                colormapText.textContent = newValue;
            });

            colorMap= store.state.globalColorMap

            const container = document.getElementById(containerId);
            d3.select(container)
                .select(".tooltip")
                .remove();
            const allUserData = []
            Object.keys(data).forEach((username, index) => {
                allUserData.push(data[username][seqView])
            })

            // 选择要移除的 SVG 元素
            const svgToRemove = d3.select(container).select('.svgContainer'+containerId);
            // 移除 SVG 元素及其上的所有内容
            svgToRemove.remove();

            // 计算 SVG 的宽度
            svgWidth = margin.left + (maxLength) * (circleRadius * 2 + circleSpacing*2) + margin.right;
            if (svgWidth < containerWidth){
                svgWidth = containerWidth*0.996
            }
            svgHeight = (Object.keys(data).length+2) * (circleRadius * 2.5 + circleSpacing)+circleRadius * 2.5+margin.top

            const svg = d3.select(container)
                .append('svg')
                .attr('class', 'svgContainer'+containerId)
                .attr('width', svgWidth)
                .attr('height', svgHeight)
                .attr('transform', `translate(${margin.left},${0})`)

            seqContainer = svg.append('g')

            const uniqueActionTypes = new Set();
            Object.values(data).flatMap(user => user[seqView]).forEach(actionType => uniqueActionTypes.add(actionType));
            uniqueActionTypesArray = Array.from(uniqueActionTypes);
            createLegend(seqContainer,svgWidth,uniqueActionTypesArray,data)

            // 监听选中的需要高亮的路径信息
            store.watch(() => store.state.globalHighlight, (newValue) => {
                // 点击图例变色
                const code=container.getAttribute("codeContext")
                const filterParameters = store.state.filterRules
                const [dataKey] = code.split(".");
                const originalData = store.state.originalTableData[dataKey]

                let keyList
                if (Object.keys(data)[0].includes('&')) {
                    // 按照&分割字符串，并将分割后的元素放入数组
                    keyList = Object.keys(data)[0].split('&');
                } else {
                    // 如果不包含&，直接将字符串放入数组
                    keyList = [Object.keys(data)[0]];
                }
                const foundKey = [];
                for (const key of keyList) {  // 使用 for...of 来遍历数组元素
                    let curkey = findKeyByValue(originalData, key);  // 假设这里的查找逻辑是正确的
                    if (curkey !== null) {
                        foundKey.push(curkey);  // 使用 push 来添加元素到数组
                    }
                }
                // const foundKey = findKeyByValue(originalData, Object.keys(data)[0]);
                // 当筛选规则里面包含现有的键的时候才需要高亮分组条件
                if (!Object.keys(filterParameters).some(key => foundKey.includes(key))){
                    svg.selectAll(".selected-username").classed("selected-username", false);
                }
                else{
                    for(const eachKey of foundKey) {
                        if (Object.keys(filterParameters).includes(eachKey)) {
                            // 获取所有键 对于筛选得到的键，需要对他进行高亮
                            const keys = filterParameters[eachKey]
                            svg.selectAll(".selected-username").classed("selected-username", false);
                            keys.forEach(username => {
                                const name = `username-${username}`;
                                svg.selectAll(`[username="${name}"]`)
                                    .classed("selected-username", true); // 添加高亮类
                            });
                        }
                    }
                }

                //高亮数据项
                if(Object.keys(filterParameters).length!==0){
                    const allKeys = Object.keys(filterParameters)
                    for (let curKey of allKeys){
                        const keys = filterParameters[curKey]
                        const circles = svg.selectAll('.event-circle');
                        if(aggVisBox.value==="气泡树图"){
                            circles.classed('unpaired-event', function(d) {
                                const str = d3.select(this).attr('id')
                                const parts = str.split("-");
                                let circleId = parts[parts.length - 1]; // 获取最后一个部分
                                const circlename =  d3.select(this).attr('circleName').split("-")[1]; // 获取当前悬浮元素的className属性
                                const nameList = circlename.split("+")
                                const firstname = nameList[0]
                                if(Object.keys(data).includes(firstname)){
                                    return !keys.includes(parseAction(data[firstname][curKey][circleId]))&&!d.children;
                                }
                            });
                        }
                        else{
                            circles.classed('unpaired-event', function() {
                                const str = d3.select(this).attr('id')
                                const parts = str.split("-");
                                let circleId = parts[parts.length - 1]; // 获取最后一个部分
                                const circlename =  d3.select(this).attr('circleName').split("-")[1]; // 获取当前悬浮元素的className属性\

                                const nameList = circlename.split("+")
                                const firstname = nameList[0]
                                if(Object.keys(data).includes(firstname)){
                                    if(data[firstname][curKey][circleId]){
                                        return !keys.includes(parseAction(data[firstname][curKey][circleId]));
                                    }
                                }
                            });
                        }
                        if(Object.keys(filterParameters).includes(seqView)){
                            svg.selectAll(".sankeyLegendText")
                                .classed('unhighlighted-text', function() {
                                    const textContent = d3.select(this).text();  // 正确获取当前元素的文本内容
                                    return !keys.includes(parseAction(textContent));
                                });
                            svg.selectAll(".sankeyLegendRect")
                                .classed('unhighlighted-text', function(d) {
                                    const textContent = d3.select(this).attr("id");  // 正确获取当前元素的文本内容
                                    return !keys.includes(parseAction(textContent));
                                });
                        }
                    }
                }
                else{
                    if(aggVisBox.value==="气泡树图"){
                        svg.selectAll('.event-circle').classed('unpaired-event', false);
                    }
                    else{
                        svg.selectAll('.event-circle').classed('unpaired-event', false);
                    }
                    // 选择所有具有'sankeyLegendText'类的元素
                    svg.selectAll('.sankeyLegendText')
                        .classed('unhighlighted-text', false);
                    svg.selectAll('.sankeyLegendRect')
                        .classed('unhighlighted-text', false);
                }}, { deep: true });

            // 监听选中的需要高亮的路径信息
            store.watch(() => store.state.globalMouseover, (newValue) => {
                const code=container.getAttribute("codeContext")
                const filterParameters = store.state.mouseoverRules
                const [dataKey] = code.split(".");
                const originalData = store.state.originalTableData[dataKey]
                const foundKey = findKeyByValue(originalData, Object.keys(data)[0]);
                // 当筛选规则里面包含现有的键的时候才需要高亮分组条件
                if(Object.keys(filterParameters).includes(foundKey)){
                    // 获取所有键 对于筛选得到的键，需要对他进行高亮
                    const keys = filterParameters[foundKey]
                    svg.selectAll(".mouseover-username").classed("mouseover-username", false);
                    keys.forEach(username => {
                        const name = `username-${username}`;
                        svg.select(`[username="${name}"]`)
                            .classed("mouseover-username", true); // 添加高亮类
                    });
                }
                else{
                    svg.selectAll(".mouseover-username").classed("mouseover-username", false);
                }
                //高亮数据项
                if(Object.keys(filterParameters).length!==0){
                    const allKeys = Object.keys(filterParameters)
                    for (let curKey of allKeys){
                        const keys = filterParameters[curKey]
                        const circles = svg.selectAll('.event-circle');

                        circles.each(function(d) {
                            const str = d3.select(this).attr('id')
                            const parts = str.split("-");
                            let circleId = parts[parts.length - 1]; // 获取最后一个部分
                            const circlename =  d3.select(this).attr('circleName').split("-")[1]; // 获取当前悬浮元素的className属性
                            const nameList = circlename.split("+")
                            const firstname = nameList[0]
                            if(Object.keys(data).includes(firstname)){
                                if (data[firstname][curKey][circleId]&&keys.includes(parseAction(data[firstname][curKey][circleId]))) {
                                    d3.select(this).classed('mouseover-circle', true); // 添加类名到满足条件的圆圈上
                                }
                            }
                        });

                        svg.selectAll(".sankeyLegendText")
                            .each(function() {
                                const legendText = d3.select(this);
                                const textContent = legendText.text(); // 获取当前元素的文本内容
                                if(keys.includes(parseAction(textContent))){
                                    legendText.classed('mouseover-legend', true); // 根据条件添加或移除类名
                                }
                            });
                        svg.selectAll(".sankeyLegendRect")
                            .each(function() {
                                const legendText = d3.select(this);
                                const textContent = legendText.attr("id"); // 获取当前元素的文本内容
                                if(keys.includes(parseAction(textContent))){
                                    legendText.classed('mouseover-legend', true); // 根据条件添加或移除类名
                                }
                            });
                    }
                }
                else{
                    svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);
                    svg.selectAll('.sankeyLegendText').classed("mouseover-legend", false);
                    svg.selectAll('.sankeyLegendRext').classed("mouseover-legend", false);
                }
            }, { deep: true });

            const userLocation ={}
            const aggUserLocation = {}
            await withoutAgg()
            async function withoutAgg() {
                let userTextContainer = seqContainer.append("g")
                    .attr("class", "userTextContainer")
                    .attr('transform', `translate(0, -10)`); // 控制图例位置;
                // 遍历数据，创建事件符号
                usernameTextWidth["username" + containerId] = 0

                let maxPartWidths = {}; //用于记录每一个外键的最大宽度，以实现对齐
                let previousParts = {}; // 用于记录每个索引位置的前一个 part
                let allPartPosition = []
                let partPositions = {}; // 用于记录每个 part 的第一次和最后一次出现
                let lastParts = []; //记录上一个parts，以判断是否是一组

                // 第一阶段：计算每个 partIndex 下最长的文本宽度
                Object.keys(data).forEach((username, index) => {
                    const parts = username.split('&');

                    parts.forEach((part, partIndex) => {
                        // 创建一个虚拟的 text 元素
                        const virtualText = userTextContainer.append('text')
                            .attr('x', 0) // 设置 x 为 0，确保不影响布局
                            .attr('y', 0) // 设置 y 为 0，确保不影响布局
                            .style('visibility', 'hidden') // 隐藏虚拟文本
                            .text(part);

                        // 获取虚拟文本的宽度
                        const textWidth = virtualText.node().getComputedTextLength();

                        // 更新字典，记录最长的文本宽度
                        if (!maxPartWidths[partIndex] || textWidth > maxPartWidths[partIndex]) {
                            maxPartWidths[partIndex] = textWidth;
                        }

                        // 移除虚拟文本
                        virtualText.remove();
                    });
                });

                // 遍历 maxTextWidth，更新 maxPartWidths
                for (const index in maxPartWidths) {
                    if (maxPartWidths[index]) {
                        maxPartWidths[index] = Math.max(maxPartWidths[index], maxTextWidth[index]);
                    } else {
                        maxPartWidths[index] = maxTextWidth[index];
                    }
                }

                // 遍历 spans 数组
                for(let i=1;i<spans.length;i++){
                    const span = spans[i]
                    // 设置 span 的 left 属性
                    if(i!==spans.length-1){
                        span.style.marginLeft = `${maxPartWidths[i-1] -maxTextWidth[i-1]}px`;
                    }
                    else{
                        span.style.marginLeft = `${maxPartWidths[i-1] -maxTextWidth[i-1]+(circleRadius)}px`;
                    }
                }

                // 定义一组灰色值（可以根据需求调整颜色的深浅）
                const grayScale = ['#404040','#696969','#808080','#D3D3D3', '#A9A9A9' ];

                spans.forEach((span, index) => {
                    // 获取 span 的宽度
                    const width = span.offsetWidth;
                    // 将宽度按次序存入字典
                    maxTextWidth[index] = width;
                    // 根据宽度映射到 grayScale 的索引
                    const color = grayScale[index % grayScale.length]
                    // 设置 span 的背景颜色
                    span.style.color = color;
                });

                Object.keys(data).forEach((username, index) => {
                    const yPos = (index + 1) * (circleRadius * 2.5 + circleSpacing); // 控制圆形的垂直位置
                    const usernameText = userTextContainer.append('text')
                        .attr('x', 10) // 控制用户名的水平位置
                        .attr('y', yPos + circleRadius / 2 )
                        .attr('class', "trueText")
                        .attr("username", `username-${username}`)
                        .style('fill', 'none')
                        .style('font-weight', 'bold')
                        .style('cursor', 'pointer')

                    // 将用户名按 "&" 分割成多个部分
                    const parts = username.split('&');

                    let currentX = 10; // 起始的 x 坐标

                    parts.forEach((part, partIndex) => {
                        const foundUserKey = parameters[partIndex];
                        let fillColor
                        if (part === previousParts[partIndex] && partIndex < parts.length - 1) {
                            fillColor = "white"
                        }
                        else{
                            // 设置每个部分的颜色（根据 partIndex 来选择不同的灰色）
                            fillColor = grayScale[partIndex % grayScale.length];  // 根据 partIndex 循环选择颜色
                        }

                        // 为每个 part 创建一个 tspan 元素
                        const tspan = usernameText.append('tspan')
                            .attr('x', currentX) // 当前的 x 坐标
                            .attr('dy', 0) // 保持 y 坐标一致
                            .attr('fill', fillColor) // 设置每个部分的颜色
                            .text(part)
                            .attr('class', "drawText")
                            .attr("username", `username-${part}`)
                            .on('click', function () {
                                event.stopPropagation(); // 阻止事件传播
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundUserKey] = selectedUsername
                                changeGlobalHighlight(myObject, containerId)
                                createBrushSet(containerId,[selectedUsername])
                            })
                            .on('mouseover', function () {
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundUserKey] = selectedUsername
                                changeGlobalMouseover(myObject, containerId)
                            })
                            .on('mouseout', function () {
                                const selectedUsername = d3.select(this).text();
                                const myObject = {};
                                myObject[foundUserKey] = selectedUsername
                                changeGlobalMouseover(myObject, containerId)
                            });

                        // 如果是 partIndex > 0，且之前没有记录，则初始化 firstX、firstY 和 lastY
                        if (partIndex >= 0 && !partPositions[partIndex]) {
                            partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        }

                        // 如果是 partIndex > 0，记录其第一次和最后一次出现的位置
                        // 如果是第一个 username，初始化每个 partIndex 的竖线起点
                        if (index === 0) {
                            partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        } else {
                            // 检查当前 partIndex 及其以上层级是否都相同
                            let isConsistent = true;
                            for (let i = 0; i <= partIndex; i++) {
                                if (parts[i] !== previousParts[i]) {
                                    isConsistent = false;
                                    break;
                                }
                            }

                            // 如果满足条件，则更新当前 partIndex 的竖线终点
                            if (isConsistent) {
                                partPositions[partIndex].lastY = yPos;
                            } else {
                                partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                            }
                        }

                        // if (partIndex > 0) {
                        //     let isConsistent = true;
                        //     for (let i = 0; i < partIndex; i++) {
                        //         if (parts[i] !== lastParts[i]) {
                        //             isConsistent = false;
                        //             break;
                        //         }
                        //     }
                        //
                        //     // 如果满足条件，则更新 lastY
                        //     if (isConsistent) {
                        //         partPositions[partIndex].lastY = yPos;
                        //     } else {
                        //         // 如果不满足条件，则重置 firstX、firstY 和 lastY
                        //         partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        //     }
                        // }
                        // else {
                        //     if (part !== previousParts[partIndex]){
                        //         partPositions[partIndex] = { firstX: currentX, firstY: yPos, lastY: yPos };
                        //     }
                        // }

                        // 更新 currentX，计算下一个 tspan 的起始 x 坐标
                        // currentX += (tspan.node().getBBox().width+15); // 当前 tspan 的宽度加到 currentX 上
                        currentX += maxPartWidths[partIndex] + 15; // 当前 tspan 的宽度加到 currentX 上

                        if (part === previousParts[partIndex] && partIndex < parts.length - 1) {
                            tspan.remove(); // 移除元素
                        }

                        // 更新 previousParts 中当前索引位置的前一个 part
                        // if (part !== previousParts[partIndex] && partIndex < parts.length - 1) {
                        //     previousParts[partIndex] = part;
                        // }
                    });
                    lastParts = parts
                    // 更新 previousParts
                    previousParts = parts;
                    // 对于 partIndex > 0 的情况，如果有多次出现，绘制一条从头到尾的线

                    Object.keys(partPositions).forEach(partIndex => {
                        const position = partPositions[partIndex];
                        allPartPosition.push(position)
                    });
                    // 获取用户名文本的宽度
                    if (usernameTextWidth["username" + containerId] < usernameText.node().getBBox().width) {
                        usernameTextWidth["username" + containerId] = usernameText.node().getBBox().width;
                    }
                    userLocation[username] = yPos;
                });

                // 调用清洗函数
                const cleanedLines = cleanLines(allPartPosition);

                for(let i=0;i<cleanedLines.length;i++){
                    const positions = cleanedLines[i];
                    userTextContainer.append('line')
                        .attr('x1', positions.firstX-5) // 竖线的 x 坐标固定
                        .attr('x2', positions.firstX-5) // 竖线的 x 坐标固定
                        .attr('y1', positions.firstY-10) // 竖线的起点在第一次出现的 y 坐标
                        .attr('y2', positions.lastY+10) // 竖线的终点在最后一次出现的 y 坐标
                        .attr('stroke', '#888') // 线颜色为灰色
                        .attr('stroke-width', 1); // 线宽度
                }

                svg.attr('height', (Object.keys(data).length+2) * (circleRadius * 2.5 + circleSpacing)+circleRadius * 2.5+margin.top)
                await getSankeyData('http://127.0.0.1:5000/get_timeline_data', data, false)
            }
            // 聚合下拉框
            // aggBox.addEventListener('change', function() {
            //     usernameTextWidth["username"+containerId]=0
            //     seqContainer.selectAll("*").remove();
            //     if(this.value==="聚合"){
            //         aggVisBox.style.display = '';
            //         selectBox.disabled = true;
            //         createLegend(uniqueActionTypesArray,originData)
            //         Object.keys(originData).forEach((username, index) => {
            //             const yPos = (index+1) * (circleRadius * 2.5 + circleSpacing);
            //             const usernameText = seqContainer.append('text')
            //                 .attr('x', 10) // 控制用户名的水平位置
            //                 .attr('y', yPos+circleRadius/2)
            //                 .text(username)
            //                 .style('fill','#808080')
            //                 .style('font-weight', 'bold');
            //             // 获取用户名文本的宽度
            //             if(usernameTextWidth["username"+containerId]<usernameText.node().getBBox().width){
            //                 usernameTextWidth["username"+containerId] = usernameText.node().getBBox().width;
            //             }
            //             aggUserLocation[username]= yPos
            //         });
            //
            //         svg.attr('height', (Object.keys(originData).length+2) * (circleRadius * 2.5 + circleSpacing)+circleRadius * 2.5+margin.top)
            //         const dataToAgg = extractInfoBySeqView(align_data, seqView);
            //         const hierachyData = groupData(dataToAgg)
            //
            //         getSankeyData('http://127.0.0.1:5000/get_agg_timeline_data',hierachyData,true)
            //     }
            //     else{
            //         aggVisBox.style.display = 'none';
            //         selectBox.disabled = false;
            //         createLegend(uniqueActionTypesArray,data)
            //         withoutAgg()
            //     }
            // });

            async function getSankeyData(url,data,isAgg){
                // 选择tooltip并移除
                d3.select(container)
                    .select(".tooltip")
                    .remove();

                try {
                    const response = await axios.post(url, { data: data, seqView: store.state.curColorMap });
                    const nodes = response.data["nodes"]
                    const links = response.data["links"]

                    // 构建节点映射，方便后续查找
                    const nodeMap = new Map(nodes.map(node => [node.name, node]));
                    // 填充 links 数组中的 source 和 target 属性
                    links.forEach(link => {
                        link.source = nodeMap.get(link.source.name);
                        link.target = nodeMap.get(link.target.name);
                    });

                    // 在 SVG 容器外部创建一个提示框元素
                    const tooltip = d3.select(container)
                        .append("div")
                        .attr("class", "tooltip")

                    // 为下拉框添加事件监听器，监听 change 事件
                    selectBox.addEventListener('change', function() {
                        // 获取当前选中的值
                        drawSankey(this.value)
                        aggBox.selectedIndex = 0;
                    });

                    aggVisBox.addEventListener('change', function() {
                        drawSankey(selectBox.value,this.value)
                    });

                    const existingChart = seqContainer.select('.sankeyChart');
                    // 检查是否存在
                    if (!existingChart.empty()) {
                        existingChart.remove();
                    }
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    // 创建桑基图
                    const eventChart = seqContainer.append('g')
                        .attr('class', 'sankeyChart')
                        .attr('transform', `translate(${usernameTextWidth["username"+containerId]+(circleRadius * 2 + circleSpacing)}, ${-10})`); // 控制图例位置

                    if(selectBox.value ==="Align By"){ drawSankey("相对时间")}
                    else{
                        drawSankey(selectBox.value)
                    }

                    function drawSankey(alignment,aggVis){

                        // 清除eventChart中的全部元素
                        eventChart.selectAll("*").remove();
                        let sankeyWidth
                        if(isAgg&&selectBox.value==="全局对齐"){
                            sankeyWidth=(newLength+4) * (circleRadius*2 + circleSpacing)-usernameTextWidth["username"+containerId]
                        }
                        else{
                            sankeyWidth=(Math.max(maxLength,10)+6) * (circleRadius*2 + circleSpacing)-usernameTextWidth["username"+containerId]

                        }

                        d3Sankey.sankey()
                            .nodeAlign(d3Sankey.sankeyLeft)
                            .nodeWidth(circleRadius*2)
                            .size([sankeyWidth, (circleRadius * 2.5 + circleSpacing) * Object.keys(data).length])
                            ({nodes:nodes, links:links});

                        // 使用对象来分组具有相同name.split("@")[1]的数据
                        const groupedData = nodes.reduce((acc, item) => {
                            const splitResult = item.name.split("@")
                            const key = splitResult[splitResult.length-1];
                            if (!acc[key]) {
                                acc[key] = [];
                            }
                            acc[key].push(item);
                            return acc;
                        }, {});

                        sequences = Object.keys(groupedData).map(key => {
                            return groupedData[key].map(item => item.name.split("@")[0]);
                        });
                        userSeq = Object.keys(groupedData).reduce((accumulator, key) => {
                            accumulator[key] = groupedData[key].map(item => item.name.split("@")[0]);
                            return accumulator;
                        }, {});

                        if(alignment==="全局对齐"){
                            if(!isAgg){
                                axios.post('http://127.0.0.1:5000/global_align', { data: sequences })
                                    .then(response => {
                                        const location = response.data["location"]
                                        const align_result = response.data["align_result"]
                                        let outerKeys = Object.keys(data);
                                        align_data = outerKeys.reduce((acc, key, index) => {
                                            acc[key] = align_result[index];
                                            return acc;
                                        }, {});

                                        createNodes("",false,containerId,container,containerRect,eventChart,nodes,links,sankeyNodes,tooltip,seqView,colorMap,sunburstColor,2," ",data,alignment,userLocation,location)

                                        newLength = response.data["length"]
                                        let svgWidth
                                        svgWidth = margin.left + (newLength) * (circleRadius * 2 + circleSpacing*2) + margin.right;
                                        if (svgWidth < containerWidth){
                                            svgWidth = containerWidth*0.996
                                        }
                                        d3.select('.svgContainer' + containerId).attr('width', svgWidth)
                                    })
                                    .catch(error => {
                                        console.error(error);
                                    });
                            }
                        }

                        if(alignment==="局部对齐"){
                            if(!isAgg){
                                axios.post('http://127.0.0.1:5000/local_align', { data: sequences })
                                    .then(response => {
                                        const location = response.data["location"]
                                        let userMove ={}
                                        Object.keys(data).forEach((username, index) => {
                                            userMove[username]= location[index]
                                        });

                                        createNodes("",false,containerId,container,containerRect,eventChart,nodes,links,sankeyNodes,tooltip,seqView,colorMap,sunburstColor,2," ",data,alignment,userLocation,userMove)

                                        const newLength = response.data["length"]
                                        let svgWidth = margin.left + (newLength+maxLength) * (circleRadius * 2 + circleSpacing*2) + margin.right;
                                        if (svgWidth < containerWidth){
                                            svgWidth = containerWidth *0.996
                                        }
                                        d3.select('.svgContainer' + containerId).attr('width', svgWidth)
                                    })
                                    .catch(error => {
                                        console.error(error);
                                    });
                            }
                        }

                        else{
                            let svgWidth = margin.left + (maxLength) * (circleRadius * 2 + circleSpacing*2) + margin.right;
                            if (svgWidth < containerWidth){
                                svgWidth = containerWidth*0.996
                            }
                            d3.select('.svgContainer' + containerId).attr('width', svgWidth)
                            if(!isAgg){
                                createNodes("",isAgg,containerId,container,containerRect,eventChart,nodes,links,sankeyNodes,tooltip,seqView,colorMap,sunburstColor,2," ",data,alignment,userLocation)
                            }
                            else{
                                if(selectBox.value==="全局对齐"){
                                    sankeyWidth=(newLength) * (circleRadius*2 + circleSpacing)-usernameTextWidth["username"+containerId]
                                    svgWidth = margin.left + (newLength+15) * (circleRadius * 2 + circleSpacing) + margin.right;
                                    if (svgWidth < containerWidth){
                                        svgWidth = containerWidth
                                    }
                                    d3.select('.svgContainer' + containerId).attr('width', svgWidth)
                                }
                                createNodes("",isAgg,containerId,container,containerRect,eventChart,nodes,links,sankeyNodes,tooltip,seqView,colorMap,sunburstColor,2," ",data,alignment,aggUserLocation,{},aggVis,sankeyWidth, (circleRadius * 2.5 + circleSpacing)* Object.keys(data).length)
                            }
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            // 更改筛选出来的序列样式
            function highlightSequences(containerId,matchingSequences) {
                const svg = d3.select(".svgContainer" + containerId); // 选择 SVG 容器
                svg.selectAll(".highlighted-username").classed("highlighted-username", false);
                const userTextContainer = svg.select(".userTextContainer")
                const AllText = userTextContainer.selectAll(".trueText")
                // 定义一个空数组来存储文本属性
                const textArray = [];
                // 遍历所有文本元素，将其文本属性添加到数组中
                AllText.each(function() {
                    const textContent = d3.select(this).text();
                    textArray.push(textContent);
                });
                // 现在textArray中包含了所有文本元素的文本属性
                Object.keys(matchingSequences).forEach(usernameIndex => {
                    // 使用replace方法替换所有空格为"&"
                    const replacedString = textArray[usernameIndex].replace(/ /g, "&");
                    let name = `username-${replacedString}`;
                    d3.selectAll(`[username="${name}"]`)
                        .classed("selected-username", true); // 添加高亮类
                });
            }

            function brushed(event) {
                if (!event.selection) return;
                const [[x0, y0], [x1, y1]] = event.selection;
                const selectedData = [];
                const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
                svg.selectAll(".event-circle")
                    .classed("event-selected", function(d) {
                        const circleName = d3.select(this).attr("circleName")
                        // 使用 split 方法按照 '-' 分割字符串
                        const cx = parseFloat(d3.select(this).attr("cx")) + (circleRadius * 2 + circleSpacing) + usernameTextWidth["username"+containerId];
                        const cy = parseFloat(d3.select(this).attr("cy"));
                        const isSelected = x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                        if (isSelected) {
                            selectedData.push(parseAction(d.data.name.split("@")[0]));  // 将选中的数据添加到数组中
                        }
                        return isSelected;
                    });
                // 框选的也可能是名字
                if(selectedData.length===0){
                    const userTextContainer = svg.select(".userTextContainer")
                    const AllText = userTextContainer.selectAll(".trueText")
                    AllText.each(function() {
                        let text = d3.select(this);
                        let xPos = +text.attr("x");
                        let yPos = +text.attr("y");

                        // 检查文本的坐标是否在刷选框内
                        if (xPos >= x0 && xPos <= x1 && yPos >= y0 && yPos <= y1) {
                            text.classed("text-selected",true);
                            selectedData.push(text.text()); // 添加符合条件的用户名到数组
                        }
                    });
                }
                findSeq(x0,y0,x1,y1,selectedData)
                createSet1(x0,y0,x1,y1,selectedData)
            }

            function findSeq(x0,y0,x1,y1,selectedData) {
                let matchingSequences={}
                // 给每一个div都找到匹配的序列
                const timeLineDict = store.state.timeLineData
                const parentDiv = document.getElementsByClassName('grid-item block4')[0];
                // 遍历 children 数组
                const chartContainers = parentDiv.querySelectorAll('div.chart-container');
                const allContainerId = Array.from(chartContainers).map(div => div.id);

                for(let i = 0; i < allContainerId.length; i++){
                    const curContainerId = allContainerId[i]
                    const myDiv =  document.getElementById(curContainerId)
                    let codeContext =myDiv.getAttribute("codeContext");
                    if(codeContext){
                        if(codeContext.includes("timeline")&&!codeContext.includes("pattern")){
                            // 筛选出键在matchingSequences中的数据
                            const data = timeLineDict[curContainerId]["data"]
                            matchingSequences = findSequencesContainingSubsequence(data, selectedData,true);
                            highlightSequences(curContainerId,matchingSequences);
                        }
                    }
                }
            }

            async function filterByBrush(selectedData){
                let matchingSequences={}
                const timeLineDict = store.state.timeLineData
                const parentDiv = document.getElementsByClassName('grid-item block4')[0];
                // 遍历 children 数组
                const chartContainers = parentDiv.querySelectorAll('div.chart-container');
                const allContainerId = Array.from(chartContainers).map(div => div.id);

                for(let i = 0; i < allContainerId.length; i++){
                    const curContainerId = allContainerId[i]
                    const myDiv =  document.getElementById(curContainerId)
                    let codeContext =myDiv.getAttribute("codeContext");
                    if(codeContext.includes("timeline")&&!codeContext.includes("pattern")){
                        // 筛选出键在matchingSequences中的数据
                        const data = timeLineDict[curContainerId]["data"]
                        matchingSequences = findSequencesContainingSubsequence(data, selectedData,true);
                        const filteredData = Object.keys(timeLineDict[curContainerId]["data"])
                            .filter((key, index) => {
                                // 假设 matchingSequences 的键是我们想要匹配的
                                return Object.keys(matchingSequences).includes(index.toString());
                            })

                        svg.selectAll(".selected-username").classed("selected-username", false);
                        filteredData.forEach(username => {
                            const name = `username-${username}`;
                            svg.select(`[username="${name}"]`)
                                .classed("mouseover-username", true); // 添加高亮类
                        });

                        // 筛选出键在matchingSequences中的数据
                        // const filteredData = Object.keys(timeLineDict[curContainerId]["data"])
                        //     .filter((key, index) => {
                        //         // 假设 matchingSequences 的键是我们想要匹配的
                        //         return Object.keys(matchingSequences).includes(index.toString());
                        //     })
                        //     .reduce((obj, key) => {
                        //         obj[key] = timeLineDict[curContainerId]["data"][key];
                        //         return obj;
                        //     }, {});
                        // await createChart(curContainerId, filteredData, timeLineDict[curContainerId]["seqView"]);
                    }
                }
            }

            function createSet1(x0,y0,x1,y1,selectedData) {
                createBrushSet(containerId,selectedData)
                // 移除旧的点击区域
                svg.selectAll('.clickable-region').remove();
                // 创建一个点击响应区域，是否加入异常序列
                svg.append('rect')
                    .attr('class', 'set1-region')
                    .attr('x', x0)
                    .attr('y', y0)
                    .attr('width', x1 - x0)
                    .attr('height', y1 - y0)
                    .style('fill', 'none')
                    .style('pointer-events', 'all')
                    .on('click', () => {
                        svg.selectAll('.set1-region').remove();
                        if(selectedData.length!==0){
                            // createBrushSet(containerId,selectedData)
                            filterByBrush(selectedData)
                            changeEventBrush(selectedData, containerId)
                            changePatternBrush(selectedData)
                        }
                    })
                .on('contextmenu', (event) => {
                    event.preventDefault();  // 阻止默认的右键菜单
                    store.dispatch('saveIsClickCancelBrush');
                });
            }

            // 监听选中的异常事件
            store.watch(() => store.state.isClickCancelBrush, () => {
                svg.selectAll('.set1-region').remove();
                svg.select(".setBrush").call(setBrush.move, null);
                svg.select(".setBrush").selectAll("*").remove();
                svg.select(".setBrush").on(".setBrush", null);
                svg.selectAll(".event-selected").classed("event-selected", false);
                svg.selectAll(".text-selected").classed("text-selected", false);
                // 移除先前的高亮效果
                svg.selectAll(".highlighted-username").classed("highlighted-username", false);
            });

            // 监听选中的异常事件
            store.watch(() => store.state.selectedSeq, (newValue) => {
                const matchingSequences = findSequencesContainingSubsequence(data, newValue,seqView,true);
                highlightSequences(matchingSequences);
            });

            store.watch(() => store.state.selectFromPattern, (newValue) => {
                filterByBrush(newValue)
            });
            // 创建框选区域
            const setBrush = d3.brush()
                .on("start brush", (event) => brushed(event));

            // 添加框选到 SVG 容器
            svg.append("g")
                .attr("class", "setBrush")


            store.watch(() => store.state.isClickBrush, () => {
                svg.select(".setBrush").call(setBrush);
            });

        }

        // 监听尺寸变化
        const resizeObserver = new ResizeObserver(() => {
            const containerHeight = container.getBoundingClientRect().height;
            let newLegendTop
            if(containerHeight<500){
                newLegendTop = containerHeight * 0.87;
            }
            else{
                newLegendTop = containerHeight * 0.93;
            }

            legendSvg.attr('transform', `translate(0, ${newLegendTop - totalHeight})`);
        });

        // 开始监听
        resizeObserver.observe(container); // 直接观察 DOM 元素

    },

    createAggTimeLine(containerId, data, seqView) {
        let sankeyNodesData=[]
        let sankeyLinksData=[]
        let sankeyLinks;
        let sankeyNodes;
        let sankeyHeads;
        let sankeyTails
        let aggSankeyChart
        let allSankeyLinksData = []
        // 检查数据的有效性
        if (!data || Object.keys(data).length === 0) {
            return;
        }

        const flattenData = flatten(data)

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const containerRect = document.getElementById(containerId).getBoundingClientRect();

        let colorMap = store.state.globalColorMap
        const userColorMap = generateUserColorMap(flattenData);

        // 创建 SVG 容器
        let margin = { top: 0.05*containerHeight, left: 0.04*containerWidth, right: 0.02*containerWidth };
        // 找到最长的事件序列的长度
        let maxLength = 0;
        let eventCount= 0
        // 计算圆形的半径
        const scaleFactor = 0.025;
        let circleRadius =  Math.max(10,Math.min(containerWidth, containerHeight) * scaleFactor / 2);
        let circleSpacing = circleRadius/2

        let codeContext = store.state.curExpression
        const regex1 = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
        const matches1 = codeContext.matchAll(regex1);
        const parameters = [];
        for (const match of matches1) {
            parameters.push(match[1]);
        }

        Object.values(flattenData).forEach(user => {
            eventCount = user[seqView].length
            if (eventCount > maxLength) {
                maxLength = eventCount;
            }
        })

        createSankeyChart(seqView)

        store.watch(() => store.state.globalColorMap, (newValue) => {
            colorMap = newValue;
            createSankeyChart(store.state.curColorMap)
        });

        function resetSankeyChart() {
            d3.selectAll(`.sunburst-node`).classed('event-in-path', false);
            sankeyLinks.attr('stroke-opacity', 0.5);
            // sankeyLinks.attr('stroke', link => (`url(#line-gradient-${link.index})`));
            sankeyLinks.attr('stroke', link => (colorMap[parseAction(link.source.name.split("@")[0])]));
            sankeyHeads.attr('fill-opacity', 1);
            sankeyTails.attr('fill-opacity', 1);
        }

        function createSankeyChart(seqView){
            d3.select(container)
                .select(".tooltip")
                .remove();
            // 选择要移除的 SVG 元素
            const svgToRemove = d3.select(container).select('.svgContainer'+containerId);
            // 移除 SVG 元素及其上的所有内容
            svgToRemove.remove();
            // 计算 SVG 的宽度
            let svgWidth = margin.left + (maxLength+2) * (circleRadius * 2 + circleSpacing) + margin.right;
            if (svgWidth < containerWidth){
                svgWidth = containerWidth
            }
            const svg = d3.select(container)
                .append('svg')
                .attr('class', 'svgContainer'+containerId)
                .attr('width', svgWidth)
                .attr('height', '100%')
                .attr('overflow','auto')

            // 桑基图数据
            let sankeyWidth = 0
            let totalHeight = 0

            const keys = Object.keys(data); // 获取所有键

            let numberOfKeys

            const maxDepth = calMaxDepth(data)
            if(maxDepth===2){
                numberOfKeys = 1
            }
            else{
                numberOfKeys = Object.keys(data).length;
            }

            // let filteredData
            let legendSvg, legendHeight

            async function sendDataSequentially(data, keys, seqView) {
                for (let i = 0; i < numberOfKeys; i++) {
                    let curData

                    if(maxDepth===2){
                        curData = data
                    }
                    else{
                        curData = data[keys[i]]
                    }

                    // if(store.state.curExpression.includes("segment")){
                    //     const startTime = store.state.eventPairStartNum;
                    //     const endTime = store.state.eventPairEndNum;
                    //     let path=""
                    //     if(store.state.eventAnalyse==="event pairs"){
                    //         path='http://127.0.0.1:5000/event_pairs'
                    //     }
                    //     else if(store.state.eventAnalyse==="event paths"){
                    //         path='http://127.0.0.1:5000/event_paths'
                    //     }
                    //     else if(store.state.eventAnalyse==="seq pairs"){
                    //         path='http://127.0.0.1:5000/sequences_paths'
                    //     }
                    //     // const nodeId=Object.keys(store.state.interactionData)[0]
                    //     // const value = store.state.interactionData[nodeId]
                    //     const eventSet1 = store.state.eventSet1
                    //     const eventSet2 = store.state.eventSet2
                    //     // 调用函数来筛选事件
                    //     axios.post(path, { data: data, startTime:startTime, endTime:endTime,eventSet1:eventSet1,eventSet2:eventSet2,attr1:store.state.eventPairAttr1,attr2:store.state.eventPairAttr2})
                    //         .then(response => {
                    //             // console.log("当前的数据")
                    //             // curData = flattenData(response.data["filteredEvents"])
                    //             // curData = flatten(response.data["filteredEvents"])
                    //             // console.log("当前的数据",curData)
                    //             const newData= displayFilteredEvents(curData,response.data["filteredEvents"])
                    //             // console.log("新的数据")
                    //             function displayFilteredEvents(data,filteredEvents) {
                    //                 filteredEvents = removeSubsets(filteredEvents)
                    //
                    //                     // 结果容器
                    //                     const result = {};
                    //
                    //                     for (const key in filteredEvents) {
                    //                         if (data.hasOwnProperty(key)) {
                    //                             result[key] = {}; // 初始化结果中的键
                    //                             const indicesList = filteredEvents[key]; // 获取下标列表
                    //
                    //                             // 遍历下标列表
                    //                             indicesList.forEach((indices, seqIndex) => {
                    //                                 const seqKey = `seq${seqIndex + 1}`; // 生成 seq1, seq2 等键
                    //                                 result[key][seqKey] = {};
                    //
                    //                                 const curColormap = store.state.curColorMap
                    //
                    //                                 // 遍历 data 中的属性
                    //                                 for (const attr in data[key]) {
                    //                                     result[key][seqKey][attr] = indices.map(index => data[key][attr][index]);
                    //                                 }
                    //                             });
                    //                         } else {
                    //                             result[key] = {}; // 如果 data 中没有对应的键，初始化为空对象
                    //                         }
                    //                     }
                    //
                    //             }
                    //
                    //         })
                    //         .catch(error => {
                    //             console.error(error);});
                    //
                    // }


                    try {
                        // 先画Index
                        let sankeyNameText = {}
                        let userTextContainer = svg.append("g")
                            .attr("class", "userTextContainer");
                        // 遍历数据，创建事件符号
                        sankeyNameText["username" + containerId] = 0

                        await axios.post('http://127.0.0.1:5000/get_sankey_data', {data: curData, seqView: seqView})
                            .then(response => {
                                sankeyNodesData = response.data["nodes"]
                                sankeyLinksData = response.data["links"]

                                allSankeyLinksData.push(sankeyLinksData)
                                // 构建节点映射，方便后续查找
                                const nodeMap = new Map(sankeyNodesData.map(node => [node.name, node]));
                                // 填充 links 数组中的 source 和 target 属性
                                sankeyLinksData.forEach(link => {
                                    link.source = nodeMap.get(link.source.name);
                                    link.target = nodeMap.get(link.target.name);
                                });

                                let rectWidth = 30
                                let rectHeight = 18
                                let hasHead = true
                                if (sankeyLinksData && sankeyLinksData[0].head.name === "") {
                                    rectWidth = 0
                                    hasHead = false
                                }

                                let curWidth = estimateSankeySize(sankeyNodesData, 180);
                                if (sankeyWidth < curWidth) {
                                    sankeyWidth = curWidth
                                }
                                const sankeyHeight = Object.keys(curData).length * 35
                                const trueHeight = Object.keys(curData).length * 15
                                // totalHeight += sankeyHeight
                                if(maxDepth>2){
                                    totalHeight += trueHeight
                                }
                                else{
                                    totalHeight += sankeyHeight
                                }

                                if(i>0){ totalHeight += margin.top*2}
                                else{
                                    totalHeight += margin.top
                                }

                                const foundUserKey = parameters[0]

                                if(maxDepth>2){
                                    const usernameText =  svg.append('text')
                                        .attr('x', 0) // 控制用户名的水平位置
                                        .attr('y', -10)
                                        .attr('class', "trueText")
                                        .attr("username", `username-${keys[i]}`)
                                        .style('fill', 'fillColor')
                                        .style('font-weight', 'bold')
                                        .style('cursor', 'pointer')
                                        .attr('transform', `translate(${10}, ${ totalHeight - sankeyHeight })`)
                                        .text(keys[i])
                                    .on('click', function () {
                                        event.stopPropagation(); // 阻止事件传播
                                        const selectedUsername = d3.select(this).text();
                                        const myObject = {};
                                        myObject[foundUserKey] = selectedUsername
                                        changeGlobalHighlight(myObject, containerId)
                                    })
                                    .on('mouseover', function () {
                                        const selectedUsername = d3.select(this).text();
                                        const myObject = {};
                                        myObject[foundUserKey] = selectedUsername
                                        changeGlobalMouseover(myObject, containerId)
                                    })
                                    .on('mouseout', function () {
                                        const selectedUsername = d3.select(this).text();
                                        const myObject = {};
                                        myObject[foundUserKey] = selectedUsername
                                        changeGlobalMouseover(myObject, containerId)
                                    });

                                    // 获取用户名文本的宽度
                                    if (sankeyNameText["username" + containerId] < usernameText.node().getBBox().width) {
                                        sankeyNameText["username" + containerId] = usernameText.node().getBBox().width;
                                    }
                                }

                                // 创建桑基图
                                let topLocation
                                if(maxDepth===2){
                                    topLocation = totalHeight - sankeyHeight
                                }
                                else{
                                    topLocation = totalHeight - trueHeight - 35
                                }

                                aggSankeyChart = svg.append('g')
                                    .attr('class', 'aggSankeyChart')
                                    .attr('transform', `translate(${80 +sankeyNameText["username" + containerId]}, ${ topLocation })`)

                                const sankey = d3Sankey.sankey()
                                    .nodePadding(25)
                                    .nodeAlign(d3Sankey.sankeyLeft)
                                    .iterations(8)
                                    .size([sankeyWidth * 0.75, sankeyHeight])
                                    ({nodes: sankeyNodesData, links: sankeyLinksData});

                                // 更新 SVG 的宽度
                                svg.style("width", curWidth + margin.left + margin.right + "px");
                                // svg.style("height", (sankeyHeight+margin.top*5+circleRadius*2)*numberOfKeys + "px");
                                svg.style("height", (totalHeight + margin.top * 3) + "px");

                                const sankeyTooltip = d3.select(container)
                                    .append("div")
                                    .attr("class", "sankeyTooltip")

                                const filteredLinks = (sankeyLinksData || []).filter(d =>
                                    d.target?.name !== 'unknown' &&
                                    colorMap[parseAction(d.source?.name?.split("@")[0])]
                                );


                                // 添加节点和链接
                                sankeyLinks = aggSankeyChart.append("g")
                                    .attr('class', 'sankeyLink')
                                    .selectAll('sankeyLink')
                                    // .selectAll('g')
                                    .data(filteredLinks)
                                    .enter().append('g')
                                    .attr('fill', 'none')
                                    .attr('stroke-opacity', 0.5)
                                    .style('cursor', 'pointer')
                                    // .attr('stroke', d => `url(#line-gradient-${d.index})`)
                                    .attr('stroke', d => colorMap[parseAction(d.source.name.split("@")[0])])
                                    .on('mouseover', function (e, d) {
                                        // aggSankeyChart.selectAll('path.highlight-line').remove();
                                        const relatedNodes = [d.source, d.target];
                                        const relatedLinks = [d];
                                        // highlightSankeyChart(relatedLinks, relatedNodes)
                                        // 显示tooltip
                                        sankeyTooltip.transition()
                                            .duration(200)
                                            .style("opacity", .9)
                                        sankeyTooltip.html(`<p>${d.source.name.split("@")[0]} -- ${d.target.name.split("@")[0]} <strong>${d.value}</strong></p>`) // 设置提示框的内容
                                            .style("left", (e.pageX) - containerRect.left + container.scrollLeft + "px")
                                            .style("top", (e.pageY - containerRect.top + 10) + "px")
                                            .style("width", "auto")
                                            .style("white-space", "nowrap");
                                    })
                                    .on('mouseout', function () {
                                        sankeyTooltip.transition()
                                            .duration(500)
                                            .style("opacity", 0);
                                    })

                                // // 定义渐变
                                // const gradient = sankeyLinks.append('defs')
                                //     .append('linearGradient')
                                //     .attr('id', (d, i) => `line-gradient-${i}`)
                                //     .attr('gradientUnits', 'userSpaceOnUse')
                                //     .attr('x1', d => d.source.x1)
                                //     .attr('x2', d => d.target.x0);
                                // gradient.append('stop')
                                //     .attr('offset', '0%')
                                //     .attr('stop-color', (d) => {
                                //         return colorMap[parseAction(d.source.name.split("@")[0])]}); // 起始节点颜色
                                // gradient.append('stop')
                                //     .attr('offset', '100%')
                                //     .attr('stop-color', (d) => colorMap[parseAction(d.source.name.split("@")[0])]); // 终止节点颜色
                                sankeyLinks.append('path')
                                    .attr('d', d => d3Sankey.sankeyLinkHorizontal(rectWidth, hasHead)(d))
                                    .attr('outerKey', keys[i])
                                    .attr('stroke-width', d => Math.max(1, d.width / 2))


                                // 绘制head
                                sankeyHeads = aggSankeyChart.append("g")
                                    .selectAll('rect')
                                    .data(sankeyLinksData.filter(d => d.target.name !== 'unknown'))
                                    .enter()
                                    .append('rect')
                                    .attr('x', d => d.head.x)
                                    .attr('y', d => d.head.y)
                                    .attr('width', rectWidth)
                                    .attr('height', rectHeight)
                                    .attr('fill', "grey")
                                    .attr('fill-opacity', 1)

                                const headText = aggSankeyChart.append("g")
                                    .selectAll('text')
                                    .data(sankeyLinksData.filter(d => d.target.name !== 'unknown'))
                                    .enter()
                                    .append('text')
                                    .attr('x', d => d.head.x + rectWidth / 2)
                                    .attr('y', d => d.head.y + rectHeight / 2)
                                    .attr('text-anchor', 'middle')
                                    .attr('dominant-baseline', 'middle')
                                    .attr('fill', 'white')
                                    .style('font-size', '12px')
                                    .text(d => d.head.name);

                                // 绘制tail
                                sankeyTails = aggSankeyChart.append("g")
                                    .selectAll('rect')
                                    .data(sankeyLinksData.filter(d => d.target.name !== 'unknown'))
                                    .enter()
                                    .append('rect')
                                    .attr('x', d => d.tail.x)
                                    .attr('y', d => d.tail.y)
                                    .attr('width', rectWidth)
                                    .attr('height', rectHeight)
                                    .attr('fill', "grey")
                                    .attr('fill-opacity', 1)

                                const tailText = aggSankeyChart.append("g")
                                    .selectAll('text')
                                    .data(sankeyLinksData.filter(d => d.target.name !== 'unknown'))
                                    .enter()
                                    .append('text')
                                    .attr('x', d => d.tail.x + rectWidth / 2)
                                    .attr('y', d => d.tail.y + rectHeight / 2)
                                    .attr('text-anchor', 'middle')
                                    .attr('dominant-baseline', 'middle')
                                    .attr('fill', 'white')
                                    .style('font-size', '12px')
                                    .text(d => d.tail.name);

                                if(maxDepth===2){
                                    createNodes("",false, containerId, container, containerRect, aggSankeyChart, sankeyNodesData, sankeyLinksData, sankeyNodes, sankeyTooltip, seqView, colorMap, sunburstColor, 2)
                                }
                                else{
                                    createNodes(keys[i],false, containerId, container, containerRect, aggSankeyChart, sankeyNodesData, sankeyLinksData, sankeyNodes, sankeyTooltip, seqView, colorMap, sunburstColor, 2)
                                }

                                const svgElement = d3.select('.aggSankeyChart');
                                const svgRect = svgElement.node().getBoundingClientRect();
                                // const newWidth = svgRect.width;
                                // svg.style("width",newWidth+margin.left+margin.right)
                                svg.style("width", sankeyWidth + margin.left + margin.right)

                                // 画图例
                                if(true){
                                    // const legend = svg.append('g')
                                    //     .attr('class', 'legend')
                                    //     .attr('transform', `translate(30, ${totalHeight+ margin.top })`); // 控制图例位置

                                    const uniqueActionTypes = new Set();
                                    Object.values(flattenData).flatMap(user => user[seqView]).forEach(actionType => uniqueActionTypes.add(actionType));
                                    // 添加图例矩形和文字
                                    const legendItems = Array.from(uniqueActionTypes);

                                    let i = 0;
                                    while (i < legendItems.length) {
                                        if (legendItems[i] === " " || legendItems[i] === null ) {
                                            legendItems.splice(i, 1); // 删除当前元素
                                        } else {
                                            i++;
                                        }
                                    }

                                    let totalLegendWidth = 0; // 用于存储总宽度
                                    let legendY = 0;

                                    const container = d3.select(`#${containerId}`); // 改用 D3 选择器
                                    // 移除已有的 legendWrapper（如果存在）
                                    container.select(".legend-wrapper").remove(); // 通过类名选择并移除

                                    let legendTop;

                                    legendTop = containerHeight*0.983 // 否则，将 legendTop 设置为容器高度

                                    const legendWrapper = container.insert("div", ":first-child")
                                        .attr("class", "legend-wrapper") // 添加类名以便后续移除
                                        .style("position", "sticky")  // sticky 定位
                                        .style("top", 0)          // 距离容器顶部0px时固定
                                        .style("left", "2px")        // 水平偏移
                                        .style("z-index", "999")
                                        .style("height", "10px")
                                        .style("background", "none"); // 避免内容被遮挡

                                    // if (svgHeight < containerHeight) {
                                    //     legendTop = svgHeight; // 如果 SVG 高度小于容器高度，将 legendTop 设置为 SVG 高度
                                    // } else {
                                    //     legendTop = containerHeight*0.935; // 否则，将 legendTop 设置为容器高度
                                    // }

                                    legendSvg = legendWrapper.append("svg")
                                        .attr("width", svgWidth)
                                        .attr('transform', `translate(0, ${legendTop})`)
                                        .style("background-color", "#eeeeee")
                                        .attr("height",0); // 初始高度为 0，后续可以根据内容动态调整

                                    // 后续图例绘制代码保持不变...
                                    const legend = legendSvg.append("g")
                                        .attr("class", "legend")

                                    let rowCount = 1;  //总行数
                                    const rectSize = circleRadius * 2;
                                    // 点击图例变色
                                    legendItems.forEach((item, index) => {
                                        // 添加图例文字
                                        const legendText = legend.append('text').text(item).style('font-size', rectSize / 1.5);
                                        // 获取图例文本的宽度
                                        const legendTextWidth = legendText.node().getBBox().width;

                                        let gap = circleRadius * 1.5
                                        let legendX = totalLegendWidth;
                                        let legendCountInRow = 0;
                                        // 总宽度
                                        totalLegendWidth += gap + rectSize + legendTextWidth;
                                        // 计算一行可以容纳多少个图例
                                        const availableLegendCount = Math.floor(svgWidth / totalLegendWidth);
                                        // 根据图例数量决定是否换行
                                        if (legendCountInRow >= availableLegendCount) {
                                            legendX = 0;
                                            totalLegendWidth = 0;
                                            totalLegendWidth += gap + rectSize + legendTextWidth;
                                            legendY += rectSize * 2;
                                            legendCountInRow = 0;
                                            rowCount++;
                                        }
                                        legendCountInRow++;
                                        legendText
                                            .attr('x', legendX + rectSize * 1.2 + legendTextWidth / 2).attr('y', legendY + rectSize * 0.6)
                                            .attr('class', 'sankeyLegendText')
                                            .attr('text', item)
                                            .attr('text-anchor', 'middle').attr('alignment-baseline', 'middle')
                                            .style('fill', colorMap[item]) // 根据操作类型选择颜色
                                            .style('font-weight', 'bold')
                                            .style('cursor', 'pointer') // 设置鼠标悬浮时显示手指样式
                                            .on('click', function () {
                                                const myObject = {};
                                                myObject[seqView] = item
                                                changeGlobalHighlight(myObject, containerId)
                                            })
                                            .on('mouseover', function () {
                                                const myObject = {};
                                                myObject[seqView] = item
                                                changeGlobalMouseover(myObject, containerId)
                                            })
                                            .on('mouseout', function () {
                                                const myObject = {};
                                                myObject[seqView] = item
                                                changeGlobalMouseover(myObject, containerId)
                                            });

                                        // 添加图例矩形
                                        legend.append('rect')
                                            .attr('x', legendX)
                                            .attr('y', legendY)
                                            .attr('width', rectSize)
                                            .attr('height', rectSize)
                                            .style('fill', colorMap[item])
                                            .style('stroke', colorMap[item]) // 根据操作类型选择颜色
                                            .style('stroke-width', '2px')   // 设置线条粗细为2像素
                                            .attr('class', 'sankeyLegendRect')
                                            .attr('id', item);
                                    });

                                   legendHeight = (2*rowCount-1) * rectSize;
                                   legendSvg.attr('transform', `translate(0, ${legendTop-legendHeight})`);
                                   legendSvg.attr("height", legendHeight);
                                }

                            })
                            .catch(error => {
                                // console.error(error);
                            }); } catch (error) {
                        // console.error(`Error in request ${i + 1}:`, error);
                    }
                }
            }

            // 监听尺寸变化
            const resizeObserver = new ResizeObserver(() => {
                const containerHeight = container.getBoundingClientRect().height;
                let newLegendTop
                if(containerHeight<500){
                    newLegendTop = containerHeight * 0.95;
                }
                else{
                    newLegendTop = containerHeight * 0.983;
                }

                legendSvg.attr('transform', `translate(0, ${newLegendTop - legendHeight})`);
            });

            // 开始监听
            resizeObserver.observe(container); // 直接观察 DOM 元素
            // 调用函数
            sendDataSequentially(data, keys, seqView);
        }

        function highlightUser(nodesDictionary, relatedLinks, relatedNodes) {
            const circles = d3.selectAll('.sunburst-node');
            circles.classed('event-in-path', function () {
                return !relatedNodes.includes(d3.select(this).attr('nodeText'))
            });

            const filteredDictionary = Object.fromEntries(
                Object.entries(nodesDictionary)
                    .filter(([key]) => store.state.globalHighlight.includes(key))
            );
            sankeyLinks.attr('stroke-opacity', link => (relatedLinks.includes(link) ? 0.8 : 0.2))
            d3.selectAll('path.highlight-line').remove();
            relatedLinks.forEach(link => {
                const users = getKeysByValue(nodesDictionary, link.source.name, link.target.name);
                if (users.length >= 1) {
                    const userColors = getKeysByValue(filteredDictionary, link.source.name, link.target.name)
                        .map(username => userColorMap[username]);
                    const linkWidth = link.width/2

                    if(userColors.length<link.value){
                        const fillCount = link.value - userColors.length;
                        userColors.splice(userColors.length, 0, ...Array(fillCount).fill("transparent"));
                    }
                    // 画突出线段
                    const userWidth = linkWidth / link.value;
                    const pathCoordinates = d3Sankey.sankeyLinkHorizontal(30,false)(link);
                    users.forEach((user, userIndex) => {
                        const userLink = aggSankeyChart.append("path")
                            .attr("d", pathCoordinates)
                            .attr("fill", "none")
                            .attr('class', 'highlight-line')
                            .attr("stroke", userColorMap[user])
                            .attr("stroke-opacity", 0.8)
                            .attr("stroke-width", userWidth)
                            .attr("transform", `translate(0, ${(userIndex+1) * userWidth - linkWidth / 2})`)
                            .lower()
                    });
                }
            });

            sankeyLinks.attr('stroke', link => {
                if (!relatedLinks.includes(link)) {
                    return '#DCDCDC';
                }
            });

            sankeyHeads.attr('fill-opacity', link => (relatedLinks.includes(link) ? 1 : 0.1));
            sankeyTails.attr('fill-opacity', link => (relatedLinks.includes(link) ? 1 : 0.1));
        }
        function mouseoverUser(relatedLinks, relatedNodes) {
            aggSankeyChart.selectAll('.sunburst-node').each(function(d) {
                let circle = d3.select(this);

                if (relatedNodes.includes(circle.attr('nodeText'))) {
                    circle.classed('mouseover-circle', true); // 添加类名
                }
            });

            sankeyLinks.classed('mouseover-path', link => {
                return relatedLinks.includes(link);
            });

            sankeyHeads.classed('mouseover-path', link => (relatedLinks.includes(link)));
            sankeyTails.classed('mouseover-path', link => (relatedLinks.includes(link)));
        }

        store.watch(() => store.state.globalHighlight, (newValue) => {
            console.log("在这里")
            const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
            const code=container.getAttribute("codeContext")
            const filterParameters = store.state.filterRules
            const [dataKey] = code.split(".");
            const originalData = store.state.originalTableData[dataKey]
            // const foundKey = findKeyByValue(originalData, Object.keys(flattenData)[0]);
            let foundKey

            // 一层桑基图只有一个键，两层桑基图有两个键，一个outerKey对应一个桑基图
            let outerKey = ""
            if(parameters.length>1){
                outerKey = parameters[0]
                foundKey = parameters[1];
            }
            else{
                foundKey = parameters[0];
            }

            // const foundKey = findKeyByValue(originalData, Object.keys(data)[0]);
            const foundDataKey = findKeyByValue(originalData, flattenData[Object.keys(flattenData)[0]][seqView][0]);

            const dictDept = calMaxDepth(data)
            // 当筛选规则里面包含现有的键的时候才需要高亮分组条件

            if(Object.keys(filterParameters).includes(outerKey)){
                const keys = filterParameters[outerKey]
                const circles = svg.selectAll('.sunburst-node');

                circles.each(function(d) {
                    const curCircle = d3.select(this);
                    const curOuter = curCircle.attr("outerKey");

                    if(!keys.includes(curOuter)){
                        curCircle.classed('unpaired-event',true)
                    }
                });

                d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                    .classed('highlight-path',  function() {
                        const curLink = d3.select(this);
                        const curOuter = curLink.attr("outerKey");

                        return !keys.includes(curOuter)
                    });

                // 切换颜色
                svg.selectAll(".trueText")
                    .classed('unhighlighted-text', function() {
                        const textContent = d3.select(this).attr("username");  // 正确获取当前元素的文本内容
                        const trueNameList = textContent.split("-")
                        const trueName = trueNameList[trueNameList.length-1]
                        return !keys.includes(trueName);
                    });
            }

            else{
                svg.selectAll(".trueText")
                    .classed('unhighlighted-text', false);

                svg.selectAll(".sankeyLink path")
                    .classed('highlight-path', false);

                if(Object.keys(filterParameters).includes(foundKey)){
                    // 需要高亮一个桑基图的一个路径
                    // 获取所有已选中用户的事件序列
                    let allNodesArray
                    allNodesArray = filterParameters[foundKey].flatMap(username => {
                        if(dictDept===2){
                            if([seqView]){
                                const userEvents = data[username][seqView];
                                return Object.entries(userEvents).map(([key, value]) => `${value}@${key}`);
                            }
                            else{return ["error"]}
                        }
                        else{
                            for (const key in data){
                                const curSeq = data[key][username]

                                allNodesArray = []
                                if (curSeq[seqView]) {
                                    const userEvents = curSeq[seqView];
                                    // 确保 allNodesArray 是一个数组
                                    allNodesArray.push(...Object.entries(userEvents).map(([key, value]) => `${value}@${key}`));
                                }
                            }

                            if(allNodesArray.length!==0){
                                return allNodesArray;
                            }
                            else{return ["error"]}
                        }
                    });

                    // 获取所有已选中用户的事件序列，存储在字典中
                    if(allNodesArray!==["error"]){
                        const nodesDictionary = {};
                        let userEventsArray
                        let userEvents
                        filterParameters[foundKey].forEach(username => {
                            if(dictDept===2){
                                userEvents = flattenData[username][seqView];
                                userEventsArray = Object.entries(userEvents).map(([key, value]) => `${value}@${key}`);
                                nodesDictionary[username] = userEventsArray;

                                const linksArray = getRelatedLinks(allNodesArray, sankeyLinksData);
                                highlightUser(nodesDictionary, linksArray, allNodesArray)
                            }
                            else{
                                //对于两层分组的桑基图，高亮最外层键对应的序列
                                const circles = d3.selectAll('.sunburst-node');
                                circles.classed('event-in-path', function () {
                                    return !allNodesArray.includes(d3.select(this).attr('nodeText'))
                                });


                                let filteredNodes = [];  // 创建一个空数组来存储名称
                                circles.each(function(d) {  // 遍历所有的circles
                                    if (allNodesArray.includes(d3.select(this).attr('nodeText'))) {  // 检查条件
                                        filteredNodes.push(d.data.name);  // 如果条件满足，将name添加到数组中
                                    }
                                });

                                const linksArray = getRelatedLinksForNode(filteredNodes, allSankeyLinksData);

                                d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                                    .classed('highlight-path', link => {
                                        if(linksArray.includes(link)){
                                        }
                                        return !linksArray.includes(link);
                                    });

                            }
                        });
                    }
                }
                else{
                    aggSankeyChart.selectAll('path.highlight-line').remove();
                    resetSankeyChart()

                    const foundDataKey = store.state.curColorMap
                    //高亮数据项
                    if(Object.keys(filterParameters).includes(foundDataKey)){
                        const keys = filterParameters[foundDataKey]
                        const circles = svg.selectAll('.sunburst-node');
                        circles.classed('unpaired-event', d => {

                            return !keys.includes(parseAction(d.data.name.split("@")[0]))});

                        let filteredNodes = [];  // 创建一个空数组来存储名称
                        circles.each(function(d) {  // 遍历所有的circles
                            if (keys.includes(parseAction(d.data.name.split("@")[0]))) {  // 检查条件
                                filteredNodes.push(d.data.name);  // 如果条件满足，将name添加到数组中
                            }
                        });

                        const linksArray = getRelatedLinksForNode(filteredNodes, allSankeyLinksData);

                        // d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                        //     .classed('highlight-path', link => {
                        //         if(linksArray.includes(link)){
                        //         }
                        //         return !linksArray.includes(link);
                        //     });

                        d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                            .classed('highlight-path', function(link) {
                                const inArray = !linksArray.includes(link);
                                return inArray;
                            });


                        // 切换颜色
                        svg.selectAll(".sankeyLegendText")
                            .classed('unhighlighted-text', function() {
                                const textContent = d3.select(this).text();  // 正确获取当前元素的文本内容
                                return !keys.includes(parseAction(textContent));
                            });

                        svg.selectAll(".sankeyLegendRect")
                            .classed('unhighlighted-text', function() {
                                const textContent = d3.select(this).attr("id");  // 正确获取当前元素的文本内容
                                return !keys.includes(parseAction(textContent));
                            });
                    }
                    else{
                        const circles = svg.selectAll('.sunburst-node')
                        circles.classed("unpaired-event", false);
                        sankeyLinks.classed('highlight-path', false);

                        svg.selectAll('.sankeyLegendText')
                            .classed('unhighlighted-text', false);

                        svg.selectAll('.sankeyLegendRect')
                            .classed('unhighlighted-text', false);
                    }
                }

            }

        }, { deep: true });

        store.watch(() => store.state.globalMouseover, (newValue) => {
            const dictDept = calMaxDepth(data)
            const svg = d3.select(".svgContainer"+containerId); // 选择 SVG 容器
            const code=container.getAttribute("codeContext")
            const filterParameters = store.state.mouseoverRules
            const [dataKey] = code.split(".");
            const originalData = store.state.originalTableData[dataKey]
            // const foundKey = findKeyByValue(originalData, Object.keys(data)[0]);
            // const foundDataKey = findKeyByValue(originalData, data[Object.keys(data)[0]][seqView][0]);
            const foundDataKey = findKeyByValue(originalData, flattenData[Object.keys(flattenData)[0]][seqView][0]);

            let foundKey

            // 一层桑基图只有一个键，两层桑基图有两个键，一个outerKey对应一个桑基图
            let outerKey = ""
            if(parameters.length>1){
                outerKey = parameters[0]
                foundKey = parameters[1];
            }
            else{
                foundKey = parameters[0];
            }

            const circles = svg.selectAll('.sunburst-node');

            if(Object.keys(filterParameters).includes(outerKey)){
                const keys = filterParameters[outerKey]
                const circles = svg.selectAll('.sunburst-node');

                circles.each(function(d) {
                    const curCircle = d3.select(this);
                    const curOuter = curCircle.attr("outerKey");

                    if(keys.includes(curOuter)){
                        curCircle.classed('mouseover-circle',true)
                    }
                });

                d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                    .classed('mouseover-path',  function() {
                        const curLink = d3.select(this);
                        const curOuter = curLink.attr("outerKey");

                        return !keys.includes(curOuter)
                    });

                // 切换颜色
                svg.selectAll(".trueText")
                    .classed('mouseover-username', function() {
                        const textContent = d3.select(this).attr("username");  // 正确获取当前元素的文本内容
                        const trueNameList = textContent.split("-")
                        const trueName = trueNameList[trueNameList.length-1]
                        return !keys.includes(trueName);
                    });
            }

            else{
                svg.selectAll(".trueText")
                    .classed('mouseover-username', false);

                svg.selectAll(".sankeyLink path")
                    .classed('mouseover-path', false);


                // 当筛选规则里面包含现有的键的时候才需要高亮分组条件
                if(Object.keys(filterParameters).includes(foundKey)){
                    // 获取所有已选中用户的事件序列
                    let allNodesArray
                    allNodesArray = filterParameters[foundKey].flatMap(username => {
                        if(dictDept===2){
                            if([seqView]){
                                const userEvents = data[username][seqView];
                                return Object.entries(userEvents).map(([key, value]) => `${value}@${key}`);
                            }
                            else{return ["error"]}
                        }
                        else{
                            for (const key in data){
                                const curSeq = data[key][username]

                                allNodesArray = []
                                if (curSeq[seqView]) {
                                    const userEvents = curSeq[seqView];
                                    // 确保 allNodesArray 是一个数组
                                    allNodesArray.push(...Object.entries(userEvents).map(([key, value]) => `${value}@${key}`));
                                }
                            }

                            if(allNodesArray.length!==0){
                                return allNodesArray;
                            }
                            else{return ["error"]}
                        }
                    });

                    if(allNodesArray!==["error"]){
                        if(dictDept===2){
                            const linksArray = getRelatedLinks(allNodesArray, sankeyLinksData);
                            mouseoverUser(linksArray, allNodesArray)
                        }
                        else{
                            //对于两层分组的桑基图，高亮最外层键对应的序列
                            const circles = d3.selectAll('.sunburst-node');
                            circles.classed('mouseover-circle', function () {
                                return allNodesArray.includes(d3.select(this).attr('nodeText'))
                            });


                            let filteredNodes = [];  // 创建一个空数组来存储名称
                            circles.each(function(d) {  // 遍历所有的circles
                                if (allNodesArray.includes(d3.select(this).attr('nodeText'))) {  // 检查条件
                                    filteredNodes.push(d.data.name);  // 如果条件满足，将name添加到数组中
                                }
                            });

                            const linksArray = getRelatedLinksForNode(filteredNodes, allSankeyLinksData);

                            d3.selectAll('.sankeyLink path')  // 选择所有连线路径
                                .classed('mouseover-path', link => {
                                    if(linksArray.includes(link)){
                                    }
                                    return !linksArray.includes(link);
                                });

                        }
                    }





                }
                else{
                    svg.selectAll(".mouseover-path").classed("mouseover-path", false);
                    svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);

                    //高亮数据项
                    if(Object.keys(filterParameters).includes(foundDataKey)){
                        const keys = filterParameters[foundDataKey]
                        svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);
                        circles.each(function(d) {
                            let circle = d3.select(this);
                            if (keys.includes(parseAction(d.data.name.split("@")[0]))) {
                                circle.classed('mouseover-circle', true); // 添加类名
                            }
                        });

                        svg.selectAll(".sankeyLegendText")
                            .each(function() {
                                const node = d3.select(this);
                                const textContent = d3.select(this).text();
                                if(keys.includes(parseAction(textContent))){
                                    node.classed('mouseover-circle', true); // 根据条件添加或移除类名
                                }
                            });
                    }

                    else{
                        svg.selectAll(".mouseover-circle").classed("mouseover-circle", false);
                    }
                }

            }

        }, { deep: true });
    },

    createHeatmap(containerId, originData, seqView) {
        // 检查数据的有效性
        if (!originData || Object.keys(originData).length === 0) {
            return;
        }

        const data = flatten(originData)

        const container = document.getElementById(containerId);
        container.style.overflow = 'auto';
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 创建 SVG 容器
        let margin = { top: 0.08*containerHeight, left: 0.15*containerWidth, right: 0.15*containerWidth,bottom: 0.1*containerHeight};
        let width = containerWidth - margin.left - margin.right
        let height = containerHeight - margin.top - margin.bottom;

        let lastWidth = 0;
        let lastHeight = 0;
        const sizeChangeThreshold = 20; // 容器尺寸变化超过10px才重绘

        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'svgContainer'+containerId)
            .attr('width', containerWidth)
            .attr('height', '100%')
            .attr('overflow','auto')

        let legend, xScale, yScale, xAxis, yAxis, graph, legendAxis

        drawHeatMap(seqView)

        store.watch(() => store.state.curColorMap, (newValue) => {
            drawHeatMap(newValue)
        });

        function drawHeatMap(seqView){
            svg.selectAll('*').remove();

            const extractedAccounts = Object.keys(data).reduce((acc, key) => {
                acc[key] = data[key][seqView];
                return acc;
            }, {});

            // 初始化一个对象来存储每个用户转换到另一个用户的次数
            const transitions = {};
            // 计算转换次数
            Object.values(extractedAccounts).forEach(users => {
                for (let i = 0; i < users.length - 1; i++) {
                    const pair = `${users[i]}->${users[i + 1]}`;
                    transitions[pair] = (transitions[pair] || 0) + 1;
                }
            });
            // 输出转换次数
            const users = Array.from(new Set([...Object.values(extractedAccounts).flat()]));
            const colorScale = d3.scaleSequential(d3.interpolateGnBu)
                .domain([0, d3.max(Object.values(transitions))]);
            // 创建比例尺映射用户到坐标轴位置
            xScale = d3.scaleBand().domain(users).range([0, width]).padding(0.1); // 添加一些padding以避免方块之间紧挨;
            yScale = d3.scaleBand().domain(users).range([0, height]).padding(0.1); // 添加一些padding以避免方块之间紧挨; // 假设每个格子的高度是20px

            // 解析转换次数数据，创建热力图需要的数据结构
            const heatmapData = Object.entries(transitions).map(([key, value]) => {
                const [from, to] = key.split('->');
                return { from, to, value };
            });

            graph = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip') // 可以在CSS中定义样式
                .style('opacity', 0);

            // 绘制热力图格子
            graph.selectAll('rect')
                .data(heatmapData)
                .enter()
                .append('rect')
                .attr('x', d => xScale(d.from))
                .attr('y', d => yScale(d.to))
                .attr("rx", 6)
                .attr("ry", 6)
                .attr('width', xScale.bandwidth()) // 这里bandwidth()根据比例尺的范围和用户数量动态计算
                .attr('height', yScale.bandwidth()) // 同上
                .attr('fill', d => colorScale(d.value))
                .on('mouseover', function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', .9);
                    tooltip.html(d.from + '--' + d.to + " " +  " <strong>" + d.value + "</strong>")
                        .style('left', (event.pageX) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });
            // 添加轴标签
            xAxis = d3.axisTop(xScale).tickSize(0);
            yAxis = d3.axisLeft(yScale).tickSize(0);

            // graph.append('g')
            //     .attr('class', 'heatmapX-axis')
            //     .call(xAxis)
            //     .selectAll('text')

            graph.selectAll('.heatmapX-axis .domain, .heatmapX-axis line')
                .style('stroke', 'none'); // 将轴线和刻度线的颜色设置为透明

            graph.append('g')
                .attr('class', 'heatmapY-axis')
                .call(yAxis);

            graph.selectAll('.heatmapY-axis .domain, .heatmapY-axis line')
                .style('stroke', 'none'); // 将轴线和刻度线的颜色设置为透明

            // 图例尺寸和位置参数
            let legendWidth = 0.9*margin.left, legendHeight = 0.02*containerHeight
            const colorScaleDomain = colorScale.domain();
            // 创建图例容器
            legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${containerWidth - margin.right-margin.left}, ${containerHeight - 0.8*margin.bottom})`);
            // 创建图例的颜色条 - 使用渐变
            const linearGradient = legend.append("defs")
                .append("linearGradient")
                .attr("id", "linear-gradient");

            colorScale.ticks().forEach((t, i, n) => {
                linearGradient.append("stop")
                    .attr("offset", `${(100 * i) / n.length}%`)
                    .attr("stop-color", colorScale(t));
            });
            // 添加颜色条矩形
            legend.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#linear-gradient)");
            // 创建图例的比例尺，用于定位标签
            const legendScale = d3.scaleLinear()
                .domain([colorScaleDomain[0], colorScaleDomain[colorScaleDomain.length - 1]]) // 假设是连续比例尺
                .range([0, legendWidth]);

            // 创建一个只有两个刻度的轴（最小值和最大值）
            legendAxis = d3.axisBottom(legendScale)
                .tickValues([colorScaleDomain[0], colorScaleDomain[colorScaleDomain.length - 1]]) // 只显示最小值和最大值
            // 添加到图例
            legend.append("g")
                .attr("class", "legend-axis")
                .attr("transform", `translate(0, ${legendHeight})`)
                .call(legendAxis);
            legend.selectAll(".domain, .tick line").style("stroke", "none"); // 方法 1
            legend.selectAll(".tick text")
                .style("stroke", "gray") // 设置刻度线颜色为灰色
                .style("fill", "gray"); // 设置刻度文本颜色为灰色
        }

        function updateHeatmapSize(container) {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            // 检查尺寸变化是否足够大，需要重绘
            if (Math.abs(newWidth - lastWidth) > sizeChangeThreshold || Math.abs(newHeight - lastHeight) > sizeChangeThreshold) {
                // 更新边距、宽度和高度
                margin = { top: 0.1 * newHeight, left: 0.15 * newWidth, right: 0.15 * newWidth, bottom: 0.1 * newHeight };
                width = newWidth - margin.left - margin.right;
                height = newHeight - margin.top - margin.bottom;

                // 更新比例尺的范围
                xScale.range([0, width]);
                yScale.range([0, height]);

                // 更新SVG容器尺寸
                d3.select('.svgContainer' + containerId)
                    .attr('width', newWidth)
                    .attr('height', newHeight);

                const legendWidth = 0.9*margin.left
                const legendHeight = 0.02*newHeight
                legend.attr("transform", `translate(${newWidth - margin.right-margin.left}, ${newHeight - 0.8*margin.bottom})`);

                legend.selectAll('rect')
                    .attr('width', legendWidth)
                    .attr('height', legendHeight);
                legend.select("legend-axis").call(legendAxis);

                redrawHeatmap();
                // 更新存储的尺寸值
                lastWidth = newWidth;
                lastHeight = newHeight;
            }
        }

        function redrawHeatmap() {
            graph.attr('transform', `translate(${margin.left}, ${margin.top})`)
            // 重绘热力图的格子
            graph.selectAll('rect')
                .attr('x', d => xScale(d.from))
                .attr('y', d => yScale(d.to))
                .attr('width', xScale.bandwidth())
                .attr('height', yScale.bandwidth());

            // 可能还需要更新轴线和其他视觉元素的位置
            graph.select('.heatmapX-axis').call(xAxis);
            graph.select('.heatmapY-axis').call(yAxis);

        }

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const {width, height} = entry.contentRect;
                updateHeatmapSize(container);
            }
        });

        resizeObserver.observe(container);
    },
};
