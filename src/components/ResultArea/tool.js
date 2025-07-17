import * as d3 from "d3";
import store from '@/store'
import {bubbletreemap} from './d3-bubbletreemap.js'

export function exportTableToCSV(containerId, filename) {
    const csv = [];
    const rows = document.querySelectorAll("#" + containerId + " .el-table tr");

    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll("td, th");

        for (let j = 0; j < cols.length; j++) {
            const text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s+)/gm, " ");
            row.push(`"${text}"`);
        }

        csv.push(row.join(","));
    }
    // 正常显示中文
    const BOM = "\uFEFF";
    const csvData = BOM + csv.join("\n");

    const csvFile = new Blob([csvData], { type: "text/csv" });
    const downloadLink = document.createElement("a");

    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

export function formatDateTime(dateString) {
    // 将字符串转换为Date对象
    const date = new Date(dateString);
    // 使用Intl.DateTimeFormat来定义输出格式
    const formatter = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        timeZone: "UTC"  // 设置时区为UTC
    });
    return formatter.format(date).replace(/\//g, '/');
}
export function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null;
}
// 解析操作类型 暂时默认取首字母!!!
export function parseAction(action) {
    if (action != null) {
        action = action.toString()
        // return action.split(' ')[0]
        return action
    }
    return null
}

function containsSubsequence(sequence, subsequence) {
    const sequenceArray = Object.values(sequence);
    for (let i = 0; i <= sequenceArray.length - subsequence.length; i++) {
        let match = true;
        for (let j = 0; j < subsequence.length; j++) {
            if (sequenceArray[i + j] !== subsequence[j]) {
                match = false;
                break;
            }
        }
        if (match) {return true;}
    }
    return false;
}
function containsPattern(sequence, pattern) {
    const sequenceArray = Object.values(sequence);
    let patternIndex = 0;

    for (let i = 0; i < sequenceArray.length; i++) {
        if (sequenceArray[i] === pattern[patternIndex]) {
            patternIndex++;
            if (patternIndex === pattern.length) {
                return true; // 找到完整模式
            }
        }
        // 不需要else if部分，移除回溯逻辑
    }
    return false; // 循环结束也没找到完整模式
}

export function findSequencesContainingSubsequence(data, subsequence, isFuzzy) {
    const matchingSequences = {};
    const dataToFind = subsequence[0]
    let foundKey = null; // 用于存储找到的键
    // 遍历每个顶层键
    for (let key in data) {
        let item = data[key];
        // 然后遍历每个顶层键下的所有子键
        for (let subKey in item) {
            let value = item[subKey];
            // 检查值是否为数组，并且数组中包含"何二"
            if (Array.isArray(value) && value.includes(dataToFind)) {
                foundKey = subKey; // 找到匹配项，记录键
                break; // 退出内层循环
            }
        }
        if (foundKey) {
            break; // 如果已经找到匹配项，退出外层循环
        }
    }

    Object.keys(data).forEach((user,index) => {
        const userEvents = data[user][foundKey];
        let parsedUserEvents = {}
        for (let key in userEvents) {
            parsedUserEvents[key] = parseAction(userEvents[key])
        }
        if(!isFuzzy){
            if (containsSubsequence(parsedUserEvents, subsequence)) {
                matchingSequences[index] = parsedUserEvents;
            }
        }
        else{
            if (containsPattern(parsedUserEvents, subsequence)) {
                matchingSequences[index] = parsedUserEvents;
            }
        }
    });
    return matchingSequences;
}

// 从数据中提取操作类型并为每种类型分配颜色
export function generateColorMap(data,seqView) {
    const uniqueActionTypes = new Set();
    // 遍历数据，提取所有不同的操作类型
    Object.values(data).forEach(userEvents => {
        const events = userEvents[seqView];
        events.forEach(action => {
            // 提取操作类型，这里假设操作类型位于空格前的字符串
            const actionType = parseAction(action);
            uniqueActionTypes.add(actionType);
        })
    });
    const uniqueAction = Array.from(uniqueActionTypes).sort();
    // 为每种操作类型分配颜色
    const colorMap = {};
    const combinedColorScheme = [...d3.schemePaired,  ...d3.schemeCategory10, ...d3.schemeAccent, ...d3.schemeTableau10, ];
    const colorScale = d3.scaleOrdinal(combinedColorScheme).domain(uniqueAction); // 设置颜色映射的域为所有唯一事件
    uniqueAction.forEach((event) => {
        colorMap[event] = colorScale(event); // 直接使用事件名称作为输入
    });
    return colorMap;
}

export function generateUserColorMap(data) {
    const uniqueActionTypes = new Set();
    // 遍历数据，提取所有不同的操作类型
    Object.keys(data).forEach(user => {
        uniqueActionTypes.add(user);
    });
    // 为每种操作类型分配颜色
    const colorMap = {};
    const colorScale = d3.scaleOrdinal(d3.schemePaired); // 使用内置的颜色方案
    uniqueActionTypes.forEach((actionType, index) => {
        colorMap[actionType] = colorScale(index);
    });
    return colorMap;
}

export function toggleVisibility(element, button) {
    if (element.style.display === 'none') {
        element.style.display = '';
        button.textContent = '隐藏';
    } else {
        element.style.display = 'none';
        button.textContent = '展开';
    }
}

export function convertToTreeData(data,seqView) {
    // 初始化树结构
    const root = { name: "root", children: [] };
    function buildTree(node, path, statements) {
        if (statements.length === 0) return;
        const statement = statements[0];
        const currentPath = path + ' > ' + statement;
        let childNode = node.children.find(child => child.path === currentPath);
        if (!childNode) {
            childNode = { name: statement, path: currentPath, children: [], value: 0 };
            node.children.push(childNode);
        }
        childNode.value += 1;

        buildTree(childNode, currentPath, statements.slice(1));
    }

    // 遍历每个用户的执行语句
    Object.values(data).forEach(user => {
        buildTree(root, "root", user[seqView]);
    });
    return root;
}
// 筛选事件的函数

export function getRelatedNodes(currentNode, links) {
    const relatedNodes = [];
    // 遍历所有连线，找到与当前节点相关的节点
    links.forEach(link => {
        if (link.source === currentNode) {
            relatedNodes.push(link.target);
        } else if (link.target === currentNode) {
            relatedNodes.push(link.source);
        }
    });
    relatedNodes.push(currentNode);
    return relatedNodes;
}

export function getRelatedLinks(nodes, links) {
    const allRelatedLinks = [];
    // 遍历所有节点
    nodes.forEach((node, index) => {
        // 获取与当前节点相关的连线
        const relatedLinks = links.filter(link => link.source.name === node || link.target.name === node);
        // 过滤出与当前节点相邻的两个节点的连线
        const adjacentLinks = relatedLinks.filter(link => {
            const sourceIndex = nodes.indexOf(link.source.name);
            const targetIndex = nodes.indexOf(link.target.name);
            return index - sourceIndex === 1 || targetIndex - index === 1;
        });
        // 将相关连线添加到总数组中
        allRelatedLinks.push(...adjacentLinks);
    });
    return allRelatedLinks;
}

export function getRelatedLinksForNode(nodes, alllinks) {
    const allRelatedLinks = [];
    // 遍历所有节点
    for(let i=0;i<alllinks.length;i++){
        const links = alllinks[i]
        nodes.forEach((node, index) => {
            // 获取与当前节点相关的连线
            const relatedLinks = links.filter(link => link.source.name === node || link.target.name === node);
            // 将相关连线添加到总数组中
            allRelatedLinks.push(...relatedLinks);
        });
    }

    return allRelatedLinks;
}

export function estimateSankeySize(nodes, nodeSpacing) {
    // 提取数字部分并获取最大值
    let maxDepth = Math.max(...nodes
        .filter(node => node.name !== "unknown")
        .map(node => {
            const numbers = node.name.split('@').map(str => parseInt(str, 10));
            return numbers[1];
        }));

    if(nodes.some(node => node.name === "unknown")){
        if(maxDepth===0){
            maxDepth=1
        }
    }

    if(maxDepth>10){
        // 计算宽度和高度
        return  maxDepth * nodeSpacing ;
    }
    else{
        return  maxDepth * 220 ;
        console.log("这里")
    }
}


export function getKeysByValue(dictionary, sourceValue, targetValue) {
    const result = [];
    for (const [key, values] of Object.entries(dictionary)) {
        if (values.includes(sourceValue)&&values.includes(targetValue)) {
            result.push(key);
        }
    }
    return result;
}

export function findKeyByValue(data, searchValue) {
    for (const key in data) {
        if (data[key].some(item => {
            return item.toString().includes(searchValue);
        })) {
            return key;
        }
    }
    return null;
}

export function changeGlobalHighlight(d, containerId){
    store.commit('setCurHighlightContainer',containerId);
    const index = store.state.globalHighlight.findIndex(item => JSON.stringify(item) === JSON.stringify(d));
    if (index !== -1) {
        store.state.globalHighlight.splice(index, 1);
    }
    else {
        store.commit('setGlobalHighlight', d);
    }

    let filterRules={}

    const parentDiv = document.getElementsByClassName('grid-item block4')[0];
    const allChildDivs = {};
    // 直接选择所有类名为 'chart-container' 的 div 元素
    const chartContainers = parentDiv.querySelectorAll('div.chart-container');

    // 遍历找到的元素
    chartContainers.forEach(div => {
        // 使用元素的 id 作为键，'codeContext' 属性的值作为值
        allChildDivs[div.id] = div.getAttribute("codeContext");
    });
    if(store.state.globalHighlight.length===0){
        Object.entries(allChildDivs).forEach(([key, value]) => {
            const myDiv = document.getElementById(key);
            // 将字符串信息绑定到div的自定义属性上
            myDiv.setAttribute("filteredCodeContext", "");
        });
        filterRules={}
        store.commit('setFilterRules', filterRules);
    }
    else{
        for(let i=0;i<store.state.globalHighlight.length;i++){
            const foundKey = Object.keys(store.state.globalHighlight[i])[0]
            const curd = store.state.globalHighlight[i][foundKey]
            // 当前点击的数据项在数据中的键 为了后面加上filter语句
            if(foundKey!==null){
                if (!(foundKey in filterRules)) {
                    filterRules[foundKey] = []
                    filterRules[foundKey].push(curd)
                }
                else{
                    filterRules[foundKey].push(curd)
                }
            }
            const filtersArray = [];

            for (const key in filterRules) {
                if (filterRules.hasOwnProperty(key)) {
                    const values = filterRules[key];
                    const filterString = `filter('${key}', 'in', ${JSON.stringify(values)})`;
                    filtersArray.push(filterString);
                }
            }
            store.commit('setFilterRules', filterRules);
            Object.entries(allChildDivs).forEach(([key, value]) => {
                const hasDot = value.includes('.');
                // 根据是否包含 '.' 进行不同的处理
                let modifiedString;
                if(filtersArray.length!==0){
                    if (hasDot) {
                        const parts = value.split('.');
                        modifiedString = `${parts[0]}.${filtersArray.join('.')}.${parts.slice(1).join('.')}`;
                    } else {
                        modifiedString = `${value}.${filtersArray.join('.')}`;
                    }
                }
                else{
                    modifiedString = ""
                }
                const myDiv = document.getElementById(key);
                // 将字符串信息绑定到div的自定义属性上
                myDiv.setAttribute("filteredCodeContext", modifiedString);
            });
        }
    }
}

export function changeGlobalMouseover(d, containerId){
    store.commit('setCurMouseoverContainer',containerId);
    const index = store.state.globalMouseover.findIndex(item => JSON.stringify(item) === JSON.stringify(d));
    if (index !== -1) {
        store.state.globalMouseover.splice(index, 1);
    }
    else {
        store.commit('setGlobalMouseover', d);
    }

    let filterRules={}
    const myDiv =  document.getElementById(containerId)
    let codeContext =myDiv.getAttribute("codeContext");
    const [dataKey] = codeContext.split(".");
    const originalData = store.state.originalTableData[dataKey]

    const parentDiv = document.getElementsByClassName('grid-item block4')[0];
    const allChildDivs = {};
    // 直接选择所有类名为 'chart-container' 的 div 元素
    // const chartContainers = parentDiv.querySelectorAll('div.chart-container');
    const chartContainers = Array.from(parentDiv.querySelectorAll('div.chart-container'))
        .filter(div => div.id !== 'chart-container-default');
    // 遍历找到的元素
    chartContainers.forEach(div => {
        // 使用元素的 id 作为键，'codeContext' 属性的值作为值
        allChildDivs[div.id] = div.getAttribute("codeContext");
    });
    if(store.state.globalMouseover.length===0){
        Object.entries(allChildDivs).forEach(([key, value]) => {
            const myDiv = document.getElementById(key);
            // 将字符串信息绑定到div的自定义属性上
            myDiv.setAttribute("mouseoverCodeContext", "");
        });
        filterRules={}
        store.commit('setMouseoverRules', filterRules);
    }
    else{
        for(let i=0;i<store.state.globalMouseover.length;i++){
            const foundKey = Object.keys(store.state.globalMouseover[i])[0]
            const curd = store.state.globalMouseover[i][foundKey]
            if(foundKey!==null){
                if (!(foundKey in filterRules)) {
                    filterRules[foundKey] = []
                    filterRules[foundKey].push(curd)
                }
                else{
                    filterRules[foundKey].push(curd)
                }
            }
            const filtersArray = [];

            for (const key in filterRules) {
                if (filterRules.hasOwnProperty(key)) {
                    const values = filterRules[key];
                    const filterString = `filter('${key}', 'in', ${JSON.stringify(values)})`;
                    filtersArray.push(filterString);
                }
            }
            store.commit('setMouseoverRules', filterRules);

            Object.entries(allChildDivs).forEach(([key, value]) => {
                const hasDot = value.includes('.');
                // 根据是否包含 '.' 进行不同的处理
                let modifiedString;
                if(filtersArray.length!==0){
                    if (hasDot) {
                        const parts = value.split('.');
                        modifiedString = `${parts[0]}.${filtersArray.join('.')}.${parts.slice(1).join('.')}`;
                    } else {
                        modifiedString = `${value}.${filtersArray.join('.')}`;
                    }
                }
                else{
                    modifiedString = ""
                }
                const myDiv = document.getElementById(key);
                // 将字符串信息绑定到div的自定义属性上
                myDiv.setAttribute("mouseoverCodeContext", modifiedString);
            });
        }
    }
}

export function changeEventBrush(selectedData, containerId){
    store.commit('setBrushedEvent', selectedData);
    let filterRules= {}
    const myDiv =  document.getElementById(containerId)
    let codeContext =myDiv.getAttribute("codeContext");
    const [dataKey] = codeContext.split(".");
    const originalData = store.state.originalTableData[dataKey]

    const parentDiv = document.getElementsByClassName('grid-item block4')[0];
    const allChildDivs = {};
    // 直接选择所有类名为 'chart-container' 的 div 元素
    // const chartContainers = parentDiv.querySelectorAll('div.chart-container');
    const chartContainers = Array.from(parentDiv.querySelectorAll('div.chart-container'))
        .filter(div => div.id !== 'chart-container-default');
    // 遍历找到的元素
    chartContainers.forEach(div => {
        // 使用元素的 id 作为键，'codeContext' 属性的值作为值
        allChildDivs[div.id] = div.getAttribute("codeContext");
    });
    if(store.state.brushedEvent.length===0){
        Object.entries(allChildDivs).forEach(([key, value]) => {
            const myDiv = document.getElementById(key);
            // 将字符串信息绑定到div的自定义属性上
            myDiv.setAttribute("brushedCodeContext", "");
        });
        filterRules={}
        store.commit('setBrushedRules', filterRules);
    }
    else{
        for(let i = 0; i<store.state.brushedEvent.length;i++){
            const curd = store.state.brushedEvent[i]
            // 当前点击的数据项在数据中的键 为了后面加上filter语句
            const foundKey = findKeyByValue(originalData, curd);
            if(foundKey!==null){
                if (!(foundKey in filterRules)) {
                    filterRules[foundKey] = []
                    filterRules[foundKey].push(curd)
                }
                else{
                    filterRules[foundKey].push(curd)
                }
            }
            const filtersArray = [];

            for (const key in filterRules) {
                if (filterRules.hasOwnProperty(key)) {
                    const values = filterRules[key];
                    const filterString = `filter('${key}', 'in', ${JSON.stringify(values)})`;
                    filtersArray.push(filterString);
                }
            }
            store.commit('setBrushedRules', filterRules);
            Object.entries(allChildDivs).forEach(([key, value]) => {
                const hasDot = value.includes('.');
                // 根据是否包含 '.' 进行不同的处理
                let modifiedString;
                if(filtersArray.length!==0){
                    if (hasDot) {
                        const parts = value.split('.');
                        modifiedString = `${parts[0]}.${filtersArray.join('.')}.${parts.slice(1).join('.')}`;
                    } else {
                        modifiedString = `${value}.${filtersArray.join('.')}`;
                    }
                }
                else{
                    modifiedString = ""
                }
                const myDiv = document.getElementById(key);
                // 将字符串信息绑定到div的自定义属性上
                myDiv.setAttribute("brushedCodeContext", modifiedString);
            });
        }
    }
}

export function changePatternBrush(selectedData){
    store.commit('setBrushedPattern', selectedData);
}

// 填充数据的函数
export function fillData(originalData, newData) {
    const result = {};
    // 遍历原始数据的键
    for (const outerKey in originalData) {
        if (originalData.hasOwnProperty(outerKey)) {
            result[outerKey] = {}; // 创建一个新对象来存放填充后的数据

            // 遍历原始数据中的内部键
            for (const innerKey in originalData[outerKey]) {
                if (originalData[outerKey].hasOwnProperty(innerKey)) {
                    if (newData[outerKey] && newData[outerKey][innerKey] !== undefined) {
                        // 如果新数据中包含相同的键，将原始数据的值复制到结果中
                        result[outerKey][innerKey] = newData[outerKey][innerKey];
                    } else {
                        // 如果新数据中没有相同的键，将值设置为0
                        result[outerKey][innerKey] = 0;
                    }
                }
            }
        }
    }
    return result;
}

export function createNodes(outerKey = "",isAgg,containerId,container,containerRect,aggSankeyChart,sankeyNodesData,sankeyLinksData,sankeyNodes,sankeyTooltip,seqView,colorMap,sunburstColor,r,hasUsername,data,alignment,userLocation,userMove,aggVis){
    let circleSpacing = sankeyNodesData[1].x1- sankeyNodesData[0].x1

    const partition = (newData) => {
        return d3.partition().size([2 * Math.PI, newData.height + 1])(newData)
    }

    let classString,className,username
    if(hasUsername){
        classString = 'event-circle'
    }
    else{
        classString = `sunburst-node`
        className = 'circle'
    }
    const idString='sunburst-node-'
    let trueIndex
    // 最内层圆形半径
    let radiusDict={}

    function merge_data(data){
        const mergedData = {}
        // 处理数据，合并具有相同内键的项
        for (const outerKey in data) {
            const innerDict = data[outerKey];
            for (const innerKey in innerDict) {
                const value = innerDict[innerKey];
                if (innerKey === "" || value === 0) {
                    mergedData[outerKey] = {[innerKey]: value};
                } else {
                    let merged = false;
                    for (const mergedOuterKey in mergedData) {
                        const mergedInnerDict = mergedData[mergedOuterKey];
                        if (innerKey in mergedInnerDict && mergedInnerDict[innerKey] !== 0) {
                            // 合并外键，并更新值
                            const newOuterKey = [...new Set(mergedOuterKey.split('+').concat(outerKey))].sort().join('+');
                            mergedData[newOuterKey] = {[innerKey]: mergedInnerDict[innerKey] + value};
                            // 删除旧的外键
                            delete mergedData[mergedOuterKey];
                            merged = true;
                            break;
                        }
                    }
                    if (!merged) {
                        mergedData[outerKey] = {[innerKey]: value};
                    }
                }
            }
        }
        return mergedData
    }

    function updateRadiusDict(node) {
        node.descendants().forEach(d => {
            const value = d.value; // 使用d.data.value而不是node.value
            const radius = d.r; // 使用d.r而不是node.r
            // 检查radiusDict中是否已经有了这个value
            if (value in radiusDict) {
                radiusDict[value] = Math.min(radiusDict[value], radius);
            } else {
                radiusDict[value] = radius;
            }
        });
    }

    if(isAgg && (aggVis === "气泡树图" || aggVis === "紧凑气泡图")){
        sankeyNodesData.forEach((nodeData, index) => {
            const radius = Math.max((nodeData.x1 - nodeData.x0),(nodeData.y1 - nodeData.y0))/r
            // const curData = createHierarchyForTimeLine(nodeData.data,nodeData.name);
            const mergedData = merge_data(nodeData.data);
            const curData = createHierarchyForTimeLine(mergedData,nodeData.name);

            const curRoot = d3.hierarchy(curData)
                .sum(d => d.value) // 定义如何计算节点大小
                .sort((a, b) => b.value - a.value);
            d3.pack()
                .size([radius*2, radius*2])
                .padding(1)
                (curRoot);
            updateRadiusDict(curRoot);
        })
    }

    const scrollLeft = aggSankeyChart.node().parentNode.scrollLeft;
    const svgWidth = aggSankeyChart.attr("width")
    const containerWidth = container.clientWidth

    // 计算可见元素的起始和结束索引
    const startIndex = Math.max(0, Math.floor(scrollLeft / 10));
    const endIndex = Math.min(sankeyNodesData.length, Math.ceil((scrollLeft + containerWidth) / 10));
    // 获取可见的数据子集
    const visibleData = sankeyNodesData.slice(startIndex, endIndex);

    // 循环遍历 sankeyNodesData
    sankeyNodesData.forEach((nodeData, index) => {
        const number = Object.keys(nodeData.data).length
        let radius = Math.max((nodeData.x1 - nodeData.x0),(nodeData.y1 - nodeData.y0))/r

        if(hasUsername){
            radius = Math.min(12,radius)
        }

        if(nodeData.name!=="unknown"){
            let arr
            if(hasUsername){
                arr = nodeData.name.split("@");
                if(!isAgg){
                    username =  arr[arr.length - 1]
                    trueIndex = arr[arr.length - 2]
                }
                else{
                    username =  arr[arr.length - 2]
                    trueIndex = arr[arr.length - 1]
                }
                className = `circle-${username}`
            }
            else{
                arr = nodeData.name.split("@"); // 使用冒号分割字符串
                trueIndex = arr[arr.length - 1]
            }

            // 创建每个节点的旭日图数据
            let hierarchyData
            if(!isAgg){
                hierarchyData = createSunburstData(nodeData.data, seqView);
            }
            else{
                // 先合并
                const mergedData = merge_data(nodeData.data);
                hierarchyData = createHierarchyForTimeLine(mergedData,nodeData.name);
            }

            // 计算每个旭日图的圆心位置和半径
            let centerX,centerY

            const x0 = sankeyNodesData.map(d => d.x0);
            const x1 = sankeyNodesData.map(d => d.x1);
            const minx0 = Math.min.apply(null,x0);
            const maxx0 = Math.max.apply(null,x0);
            // 找出最早和最晚的时间点
            const minx1 = Math.min.apply(null,x1);
            const maxx1 = Math.max.apply(null,x1);
            // 绘制旭日图
            const root = d3.hierarchy(hierarchyData).sum((d) => d.value).sort((a, b) => b.value - a.value)
            partition(root)
            if(alignment==="相对时间"||alignment===undefined||isAgg===true){
                centerX = (nodeData.x0 + nodeData.x1) / 2

                if(hasUsername){
                    if(!isAgg){
                        centerY =  userLocation[username]
                    }
                    else{
                        centerY =  userLocation[nodeData.name.split("@")[0]]+10
                    }
                }
                else{
                    centerY = (nodeData.y0 + nodeData.y1) / 2
                }
                drawNodes()
            }

            else if(alignment==="绝对时间"){
                let timeType
                // 获取时、分、秒部分，忽略年月日
                function getSeconds(timeString) {
                    // 使用正则表达式提取时间部分 (00:09:41)
                    const timeMatch = timeString.match(/\d{2}:\d{2}:\d{2}/);
                    if (timeMatch) {
                        const [hours, minutes, seconds] = timeMatch[0].split(':').map(Number);
                        // 计算总秒数
                        return hours * 3600 + minutes * 60 + seconds;
                    }
                    return null; // 如果格式不正确，返回null
                }

                const times = sankeyNodesData.map(d => {
                    if(d.time.includes("GMT")){
                        console.log("1")
                        timeType = "string"
                        return d.time.split("@")[0]
                    }
                    else{
                        timeType= "number"
                        return d.time
                    }
                });
                // const dates = times.map(time => new Date(time));

                // 找出最早和最晚的时间点
                // const minTime = new Date(Math.min.apply(null,dates));
                // const maxTime = new Date(Math.max.apply(null,dates));
                // 用于存放每个时间字符串的总秒数
                if(timeType==="string"){
                    const totalSeconds = times.map(timeString => {
                        return getSeconds(timeString);  // 这里需要返回值
                    });

                    const maxTime = Math.max(...totalSeconds);
                    const minTime = Math.min(...totalSeconds);
                    const timeRange = maxTime - minTime;
                    // const timeDiff = new Date(nodeData.time)- minTime;
                    const timeDiff = getSeconds(nodeData.time)- minTime;

                    const newx0 = (timeDiff / timeRange)*(maxx0-minx0)+minx0
                    const newx1 = (timeDiff / timeRange)*(maxx1-minx1)+minx1
                    centerX = (newx0 + newx1) / 2
                    if(hasUsername){
                        centerY =  userLocation[username]
                    }
                    else{
                        centerY = (nodeData.y0 + nodeData.y1) / 2
                    }
                    drawNodes()
                }
                else{
                    const maxTime = Math.max(...times);
                    const minTime = Math.min(...times);
                    // console.log("最小",minTime)
                    // console.log("zuida",maxTime)

                    const timeRange = maxTime - minTime;
                    // const timeDiff = new Date(nodeData.time)- minTime;
                    const timeDiff = nodeData.time- minTime;

                    const newx0 = (timeDiff / timeRange)*(maxx0-minx0)+minx0
                    const newx1 = (timeDiff / timeRange)*(maxx1-minx1)+minx1
                    centerX = (newx0 + newx1) / 2
                    if(hasUsername){
                        centerY =  userLocation[username]
                    }
                    else{
                        centerY = (nodeData.y0 + nodeData.y1) / 2
                    }
                    drawNodes()
                }
            }

            else if(alignment==="全局对齐"){
                const newx0 = userMove[index]*circleSpacing+minx0
                const newx1 = userMove[index]*circleSpacing+minx1
                centerX = (newx0 + newx1) / 2
                if(hasUsername){
                    centerY =  userLocation[username]
                }
                else{
                    centerY = (nodeData.y0 + nodeData.y1) / 2
                }
                drawNodes()
            }

            else if(alignment==="局部对齐"){
                centerX = (nodeData.x0 + nodeData.x1) / 2 + userMove[username]*circleSpacing
                if(hasUsername){
                    centerY =  userLocation[username]
                }
                else{
                    centerY = (nodeData.y0 + nodeData.y1) / 2
                }
                drawNodes()
            }

            function drawNodes(){
                // 添加路径元素
                let arc
                if(number!==1){
                    arc = d3.arc()
                        .startAngle(d => d.x0)
                        .endAngle(d => d.x1)
                        // .innerRadius(d => {
                        //     if (d.depth === 2) {
                        //         // 对第二层的内半径进行调整，使其与第一层的外半径相匹配
                        //         return (d.y0 * 4.2) - ((d.y1 - d.y0) * 4.2) / 2;
                        //     } else {
                        //         // 其他层使用正常的内半径
                        //         return d.y0 * 4.2;
                        //     }
                        // })
                        // .outerRadius(d => {
                        //     // 对第一层使用不同的外半径
                        //     if (d.depth === 1) {
                        //         return (d.y0 * 4.2) + ((d.y1 - d.y0) * 4.2) / 2;  // 第一层的宽度减半
                        //     } else {
                        //         return (d.y1 *4.2); // 其他层使用正常宽度
                        //     }
                        // });
                        .innerRadius(0)
                        .outerRadius(radius)
                    // .outerRadius(d => d.y1 *4.2)
                }
                else{
                    arc = d3.arc()
                        .startAngle(function(d) { return d.x0; })
                        .endAngle(function(d) { return d.x1; })
                        .innerRadius(0)
                        .outerRadius(radius)
                }

                if(aggVis==="气泡树图"){
                    const circularRoot = d3.hierarchy(hierarchyData)
                        .sum(d => d.value) // 定义如何计算节点大小
                        .sort((a, b) => b.value - a.value);
                    d3.pack()
                        .size([radius*2, radius*2])
                        .padding(0)
                        (circularRoot);

                    const descendants = circularRoot.descendants(); // 获取所有节点
                    const nodes = aggSankeyChart.selectAll(`[circleName="${className}"]`)
                        .data(descendants, (d) => {
                            if(d.data.name==="root"){
                                d.data.name="root"+index
                            }
                            return d.data.name
                        })
                        .enter()
                        .append("circle")
                        .attr('class', classString)
                        .attr('id', `${idString}${trueIndex}`)
                        .attr('circleName', d=>{
                            const namelength = d.data.name.split("@").length
                            const lastname = d.data.name.split("@")[namelength-1]
                            if(isAgg){
                                if(lastname!==root){
                                    return className+"&"+lastname
                                }
                            }
                            else{
                                return className
                            }})
                        .attr("fill", d => d.children ? "#fff" : colorMap[parseAction(d.data.name.split("@")[0])])
                        .attr("fill-opacity", d => d.children ? null : 1)
                        .attr("stroke", d => d.children ? "#bbb" : null)
                        .attr("stroke-width", d => {
                            if (d.children) {
                                return d.data.name.includes("root")  ? "1px" : "0.4px";
                            } else {
                                return null;
                            }
                        })
                        .attr("stroke-opacity", d => d.children ? 1 : null)
                        .attr('display', d => {
                            return (d.children&&!d.data.name.includes("root")) ? 'none' : null})
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => {
                            if(d.data.name.includes("root") || d.children){return d.r}
                            else{return radiusDict[d.value]}
                            // return d.r
                        })
                        .attr('radius', d => {
                            if(d.data.name.includes("root") || d.children){return d.r}
                            else{return radiusDict[d.value]}
                            // return d.r
                        })
                        .style('cursor','pointer')
                        .attr("nodeText", nodeData.name)
                        .attr('transform', `translate(${centerX}, ${centerY-radius})`)


                    nodes.on('mouseover', function (e, d) {
                        if (!(d.data.name.includes("root"))) { // 过滤掉d.data.name包含root的节点
                            sankeyTooltip.transition()
                                .duration(200)
                                .style('opacity', 0.8);

                            let tooltipContent;
                            if (d.data.value) {
                                tooltipContent = `${parseAction(d.data.name.split("@")[0])}: <strong>${d.data.value}</strong>`;
                            } else {
                                tooltipContent = `${parseAction(d.data.name.split("@")[0])}`;
                            }
                            sankeyTooltip.html(tooltipContent)
                                .style('left', (e.pageX) - containerRect.left + 'px')
                                .style('top', (e.pageY) - containerRect.top + 'px');
                        }
                    })
                        .on('mouseout', function () {
                            sankeyTooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        });
                }
                else if(aggVis==="紧凑气泡图"){
                    const mergedData = merge_data(nodeData.data);
                    const hierarchyData= createHierarchy(mergedData,nodeData.name);

                    const bubbleRoot = d3.hierarchy(hierarchyData)
                        .sum(d => radiusDict[d.value]) // 定义如何计算节点大小
                        .sort((a, b) => b.value - a.value);
                    const bubble = bubbletreemap()
                        .padding(1)
                        .curvature(1)
                        .hierarchyRoot(bubbleRoot)
                        .width(radius*2)
                        .height(radius*2)

                    let hierarchyRoot = bubble.doLayout().hierarchyRoot();
                    let leafNodes = hierarchyRoot.descendants().filter(function (candidate) {
                        return !candidate.children;
                    });
                    let contourGroup = aggSankeyChart.append("g")
                        .attr("class", "contour");

                    // Draw circles.
                    let circleGroup = aggSankeyChart.append("g")
                        .attr("class", "circlesAfterPlanck");

                    circleGroup.selectAll("circle")
                        .data(leafNodes, (d) => {
                            return d.data.name
                        })
                        .enter()
                        .append("circle")
                        .attr('class', classString)
                        .attr('id', `${idString}${trueIndex}`)
                        .attr('circleName', d=>{
                            const namelength = d.data.name.split("@").length
                            const lastname = d.data.name.split("@")[namelength-1]
                            if(isAgg){
                                if(lastname!==root){
                                    return className+"&"+lastname
                                }
                            }
                            else{
                                return className
                            }})
                        .attr("fill", d => colorMap[parseAction(d.data.name.split("@")[0])])
                        .attr("fill-opacity", 1)
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r)
                        .attr('radius', d => d.r)
                        .style('cursor','pointer')
                        .attr("nodeText", nodeData.name)
                        .attr('transform', `translate(${centerX}, ${centerY-radius})`)
                        .on('mouseover', function (e, d) {
                            sankeyTooltip.transition()
                                .duration(200)
                                .style('opacity', 0.8);

                            let tooltipContent;
                            if (d.data.value) {
                                tooltipContent = `${parseAction(d.data.name.split("@")[0])}: <strong>${d.data.value}</strong>`;
                            } else {
                                tooltipContent = `${parseAction(d.data.name.split("@")[0])}`;
                            }
                            sankeyTooltip.html(tooltipContent)
                                .style('left', (e.pageX) - containerRect.left + 'px')
                                .style('top', (e.pageY) - containerRect.top + 'px');
                        })
                        .on('mouseout', function () {
                            sankeyTooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        });

                    // 创建轮廓路径
                    contourGroup.selectAll("path")
                        .data(bubble.getContour())
                        .enter().append("path")
                        .attr("d", function(arc) { return arc.d; })
                        .style("stroke", "#bbb")
                        .style("stroke-width", function(arc) { return 1; })
                        .attr("transform", function(arc) {
                            const matches = arc.transform.match(/-?\d+(\.\d+)?/g);
                            // 提取出两个数据
                            const x = parseFloat(matches[0]);
                            const y = parseFloat(matches[1]);
                            const newX = x + centerX;
                            const newY = y + centerY-radius;
                            // 重新组合成新的字符串
                            return `translate(${newX},${newY})`})
                        .on('mouseover', function (e, d) {
                            if (!(d.name.includes("root"))) {
                                sankeyTooltip.transition()
                                    .duration(200)
                                    .style('opacity', 0.8);

                                const tooltipContent = `${parseAction(d.name.split("@")[0])}`;
                                sankeyTooltip.html(tooltipContent)
                                    .style('left', (e.pageX) - containerRect.left + 'px')
                                    .style('top', (e.pageY) - containerRect.top + 'px');
                            }
                        })
                        .on('mouseout', function () {
                            sankeyTooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        });
                }

                else{
                    // 时间轴旭日图部分
                    sankeyNodes = aggSankeyChart.selectAll(`[circleName="${className}"]`)
                        .data(
                            // root.descendants(), (d) => {
                            // return d.data.name}
                            root.descendants().filter((d) => {
                                return colorMap[parseAction(d.data.name.split("@")[0])]
                            }),
                            (d) => d.data.name
                        )
                        .enter()
                        .append('path')
                        .attr('class', classString)
                        .attr('id', `${idString}${trueIndex}`)
                        .attr('circleName', d=>{
                            const namelength = d.data.name.split("@").length
                            const lastname = d.data.name.split("@")[namelength-1]
                            if(isAgg){
                                if(lastname!==root){
                                    return className+"&"+lastname
                                }
                            }
                            else{
                                return className
                            }
                        })
                        .attr('cx', centerX)
                        .attr('cy', centerY)
                        .attr('radius', radius)
                        .style('cursor','pointer')
                        .attr("nodeText", nodeData.name)
                        .attr("outerKey", outerKey)
                        .attr('transform', `translate(${centerX}, ${centerY})`)
                        .attr('d', arc)
                        .style("fill", function(d) {
                            // return colorMap[parseAction(d.data.name.split("@")[0])] ? colorMap[parseAction(d.data.name.split("@")[0])] : '#C0C0C0'
                            return colorMap[parseAction(d.data.name.split("@")[0])] ? colorMap[parseAction(d.data.name.split("@")[0])] : '#FFFFFF'

                        })
                        .style("display", function(d) {
                            // return colorMap[parseAction(d.data.name.split("@")[0])] ? colorMap[parseAction(d.data.name.split("@")[0])] : '#C0C0C0'
                            return colorMap[parseAction(d.data.name.split("@")[0])] ? colorMap[parseAction(d.data.name.split("@")[0])] : 'none'
                        })
                        .attr('fill-opacity', 1)

                    sankeyNodes
                        .on('mouseover', function (e, d) {
                            if(!isAgg){
                                // createBrushSet(containerId,[d.data.name.split("@")[0]])
                                const myObject = {};
                                myObject[seqView] = d.data.name.split("@")[0]
                                // changeGlobalMouseover(myObject, containerId)

                                const str = this.id;
                                const parts = str.split("-");
                                let circleId = parts[parts.length - 1]; // 获取最后一个部分
                                sankeyTooltip.transition()
                                    .duration(200)
                                    .style("opacity", .9)
                                let tooltipText
                                //     时间轴部分
                                if(hasUsername){
                                    let circlename =  d3.select(this).attr('circleName').split("-")[1]; // 获取当前悬浮元素的className属性
                                    // 创建要显示的信息字符串
                                    tooltipText = "<strong>" + d.data.name.split('@')[0] + "</strong><br/>";
                                    Object.keys(data[username]).forEach(key => {
                                        if (Array.isArray(data[circlename][key]) && data[circlename][key][circleId] !== undefined) {
                                            let cellData = data[circlename][key][circleId]
                                            if (typeof cellData === 'string' && cellData.includes('GMT')) {
                                                // 如果数据是日期时间字符串类型，进行格式化
                                                cellData = formatDateTime(cellData);
                                            }
                                            tooltipText += key + ": " + cellData + "<br/>";
                                        }
                                    });
                                }

                                else{
                                    // 桑基图部分
                                    if(d.data.name===nodeData.name){
                                        tooltipText = `<p>${d.data.name.split("@")[0]} <strong>${nodeData.value}</strong></p>`
                                    }
                                    else{
                                        if (typeof d.data.name === 'string' && d.data.name.includes('GMT')) {
                                            d.data.name = formatDateTime(d.data.name.split("@")[0]);
                                        }
                                        tooltipText = `<p>${d.data.name.split("@")[0]}</p>`
                                    }
                                }
                                sankeyTooltip.html(tooltipText) // 设置提示框的内容
                                    .style("left", (e.pageX)- containerRect.left + container.scrollLeft + "px")
                                    .style("top", (e.pageY - containerRect.top + container.scrollTop+10) + "px")
                                    .style("width", "auto")
                                    .style("white-space", "nowrap")
                                    .style("z-index", "9999"); // 设置一个较高的 z-index 值;
                            }
                            else{
                                sankeyTooltip.transition()
                                    .duration(200)
                                    .style('opacity', 0.8);

                                let tooltipContent
                                if(d.data.value){
                                    tooltipContent=`${d.data.name.split("@")[0]}: <strong>${d.data.value}</strong>`
                                }
                                else{
                                    tooltipContent=`${d.data.name.split("@")[0]}`
                                }
                                sankeyTooltip.html(tooltipContent)
                                    .style('left', (e.pageX)-containerRect.left + 'px')
                                    .style('top', (e.pageY)-containerRect.top + 'px');
                            }
                        })
                        .on('mouseout', function (event,d) {
                            const myObject = {};
                            myObject[seqView] = d.data.name.split("@")[0]
                            // changeGlobalMouseover(myObject, containerId)

                            sankeyTooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        })
                        .on('click', function (event,d) {
                            createBrushSet(containerId,[d.data.name.split("@")[0]])
                            event.stopPropagation(); // 阻止事件传播
                            const myObject = {};
                            myObject[seqView] = d.data.name.split("@")[0]
                            // changeGlobalHighlight(myObject, containerId)
                        });

                    if(!isAgg){
                        // 添加黑色边框
                        // sankeyNodes.style('stroke', 'grey') // 设置边框颜色为黑色
                        // .style('stroke-width', '1px') // 设置边框宽度
                    }
                    else{
                        sankeyNodes
                            .attr('display', d => {
                                return d.depth ? null : 'none'}) // 隐藏根节点
                        // .style('stroke', '#fff') // 设置分隔线颜色
                    }
                }
            }

        }
    });
}

export function createSunburstData(data, seqView) {
    if (data[seqView]) {
        return {
            // name: data[seqView].replace(/\s\d+$/, ''),
            name: data[seqView],
            children: Object.entries(data).filter(([key, value]) => key !== seqView)
                .map(([key, value]) => ({ name: value,value:1 }))
        };
    } else {
        return {
            name: "root",
            children: Object.entries(data).filter(([key, value]) => key !== seqView)
                .map(([key, value]) => ({ name: value,value:1 }))
        };
    }
}

export function createHierarchyForTimeLine(data, name) {
    function transform(node, parentKey = "") {
        // 如果节点是一个数值且不为0，表示我们到达了一个有效的叶子节点，返回其值
        if (typeof node === 'number') {
            return node !== 0 ? { value: node } : null;
        }
        // 否则，遍历对象的键值对，构建children数组
        // 使用reduce而不是map来累积非0的节点
        const children = Object.keys(node).reduce((acc, key) => {
            const transformedNode = transform(node[key], key); // 传递当前键作为父键
            if (transformedNode) { // 确保不添加值为0的节点
                acc.push({
                    name: key + "@" + name + (parentKey ? "@"+parentKey : ""),
                    ...transformedNode // 递归转换当前节点
                });
            }
            return acc;
        }, []);

        // 如果children为空，意味着所有子节点的值都是0，这种情况下返回null
        return children.length > 0 ? { children } : null;
    }

    return {
        name: "root",
        ...transform(data)
    };
}


// 紧凑气泡图的数据
export function createHierarchy(data,name) {
    // Helper function to transform each entry
    function transform(entry, parentKey = "") {
        // Convert each entry to the desired format
        const result = Object.keys(entry).map(key => {
            // Check if the value is a number (leaf node)
            if (typeof entry[key] === 'number') {
                return {
                    name: key + "@" + name + (parentKey ? "@"+parentKey : ""),
                    value: entry[key],
                    uncertainty: 0 // Assuming uncertainty is the same as value
                };
            }
            // Otherwise, it's an object with further mappings
            else {
                return {
                    name: key + "@" + name,
                    children: transform(entry[key], key), // Recursively transform
                    uncertainty: 0 // Placeholder, adjust as necessary
                };
            }
        });
        return result;
    }

    return {
        name: "root", // Root node name
        children: transform(data), // Transform the input data into a hierarchy
        uncertainty: 0 // Placeholder for root uncertainty
    };
}


export function createHierarchyData(data) {
    function transform(node) {
        // 如果节点是一个数值，表示我们到达了叶子节点，返回其值
        if (typeof node === 'number') {
            return { value: node };
        }

        // 否则，遍历对象的键值对，构建children数组
        const children = Object.keys(node).map(key => {
            return {
                name: key,
                ...transform(node[key]) // 递归转换当前节点
            };
        });

        return { children };
    }

    // 开始转换，假设最顶层的"name"是"root"
    return {
        name: "root",
        ...transform(data)
    };
}

export function collectNamesByDepth(node, colorMap) {
    const namesByDepth = []; // 使用列表存储每个层级的名称列表

    // 递归函数来遍历节点
    function traverse(node, depth) {
        // 确保该深度的列表已经初始化
        if (!namesByDepth[depth]) {
            namesByDepth[depth] = [];
        }
        if (node.name&&Object.keys(colorMap).includes(node.name)) { // 确保节点有name属性
            if(!namesByDepth[depth].includes(node.name)){
                namesByDepth[depth].push(node.name);
            }
        }

        // 遍历子节点
        if (node.children) {
            node.children.forEach(child => traverse(child, depth + 1));
        }
    }

    traverse(node, 0); // 从根节点开始遍历，根节点层级为0

    return namesByDepth;
}

export function processLabelData(node, path = [], level = 0) {
    if (typeof node === 'object' && !Array.isArray(node) && node !== null) {
        // 判断是否到达了倒数第二层
        if (Object.values(node)[0] && typeof Object.values(node)[0] === 'object' && !Array.isArray(Object.values(node)[0]) && Object.values(node)[0] !== null) {
            return Object.entries(node).flatMap(([key, value]) => {
                return processLabelData(value, path.concat(key), level + 1);
            });
        } else {
            return [{ path, level }];
        }
    } else {
        return [{ path, level }];
    }
}

export function flatten(obj, parentKey = '', result = {}) {
    for (let key in obj) {
        let newKey = parentKey ? `${parentKey}&${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            flatten(obj[key], newKey, result);
        } else {
            result[parentKey] = result[parentKey] || {};
            result[parentKey][key] = Array.from(obj[key]);
        }
    }
    return result;
}

export function calMaxDepth(obj) {
    // 如果当前是对象且不是数组
    if (typeof obj === 'object' && !Array.isArray(obj)) {
        let maxDepth = 0;

        // 遍历对象的所有键
        for (let key in obj) {
            // 递归计算子对象的嵌套深度
            const depth = calMaxDepth(obj[key]);
            // 更新最大深度
            maxDepth = Math.max(maxDepth, depth);
        }

        // 当前层加1（即这一层的深度）
        return maxDepth + 1;
    }

    // 如果是基本数据类型（不再嵌套），返回0
    return 0;
}



export function flattenPattern(data, prefix = '', separator = '&') {
    const flattened = {};

    // 辅助函数，用于递归摊平对象
    function flattenHelper(currentData, currentPrefix) {
        Object.keys(currentData).forEach(key => {
            const newKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key;
            if (typeof currentData[key] === 'object' && !Array.isArray(currentData[key])) {
                // 如果当前值是对象（不是数组），则递归调用
                flattenHelper(currentData[key], newKey);
            } else {
                // 否则，直接设置摊平后的键和值
                flattened[newKey] = currentData[key];
            }
        });
    }

    flattenHelper(data, prefix);
    return flattened;
}


export function extractInfoBySeqView(data, key) {
    let result = {};
    for (let entry in data) {
        let info = data[entry];
        if (Array.isArray(info)) {
            result[entry] = info ;
        } else {
            let subEntries = Object.keys(info);
            for (let subEntry of subEntries) {
                if (subEntry === key) {
                    result[entry] = info[subEntry];
                }
            }
        }
    }
    return result;
}

export function groupData(data) {
    let nestedData = {};

    function addToNestedData(obj, parts, action) {
        if (parts.length === 1) {
            obj[parts[0]] = action;
        } else {
            let currentPart = parts.shift();
            if (!obj[currentPart]) {
                obj[currentPart] = {};
            }
            addToNestedData(obj[currentPart], parts, action);
        }
    }

    for (let key in data) {
        let parts = key.split('&');
        let action = data[key];
        addToNestedData(nestedData, parts, action);
    }

    return nestedData;
}

// 给当前的交互矩形块绑定表达式信息
export function getRulesForInteractive(filters,containerId){
    const myDiv =  document.getElementById(containerId)
    let codeContext =myDiv.getAttribute("codeContext");
    const [dataKey] = codeContext.split(".");
    const originalData = store.state.originalTableData[dataKey]
    const filterRules={}
    let modifiedString;

    if(filters.length===0){
        myDiv.setAttribute("interactiveCodeContext", codeContext);
    }
    else {
        for (let i = 0; i < filters.length; i++) {
            const curd = filters[i]
            // 当前点击的数据项在数据中的键 为了后面加上filter语句
            const foundKey = findKeyByValue(originalData, curd);
            if (foundKey !== null) {
                if (!(foundKey in filterRules)) {
                    filterRules[foundKey] = []
                    filterRules[foundKey].push(curd)
                } else {
                    filterRules[foundKey].push(curd)
                }
            }
            const filtersArray = [];

            for (const key in filterRules) {
                if (filterRules.hasOwnProperty(key)) {
                    const values = filterRules[key];
                    const filterString = `filter('${key}', 'in', ${JSON.stringify(values)})`;
                    filtersArray.push(filterString);
                }
            }
            const hasDot = codeContext.includes('.');
            // 根据是否包含 '.' 进行不同的处理
            if (filtersArray.length !== 0) {
                if (hasDot) {
                    const parts = codeContext.split('.');
                    // modifiedString = `${parts[0]}.${filtersArray.join('.')}.${parts.slice(1).join('.')}`;
                    modifiedString = `${parts[0]}.${filtersArray.join('.')}`;
                } else {
                    modifiedString = `${codeContext}.${filtersArray.join('.')}`;
                }
            } else {
                modifiedString = codeContext
            }
        }
    }
    // 将字符串信息绑定到div的自定义属性上
    myDiv.setAttribute("mouseoverCodeContext", modifiedString);
    return modifiedString
}

export function countMatchingLists(data, queryList) {
    // 初始化结果对象
    let result = {};
    // 遍历数据中的每个键（即每个人）
    for (let key in data) {
        // 初始化每个人的计数为0
        result[key] = 0;
        // 遍历该键对应的每个IP列表数组
        data[key].forEach(events => {
            // 检查查询列表中的元素是否按顺序出现在当前的IP列表中
            let queryIndex = 0;  // 查询列表的当前索引
            for (let event of events) {
                if (event === queryList[queryIndex]) {
                    queryIndex++;  // 当前元素匹配，移动到查询列表中的下一个元素
                    if (queryIndex === queryList.length) {
                        break;  // 如果查询列表中的所有元素都已匹配，退出循环
                    }
                }
            }

            // 如果查询列表的所有元素都按顺序找到了
            if (queryIndex === queryList.length) {
                result[key] += 1;
            }
        });
    }
    return result;
}

export function createBrushSet(containerId,selectedData){
    const myDiv = document.getElementById(containerId)
    const nodeId =myDiv.getAttribute("nodeId");
    const rulesForInteractive = getRulesForInteractive(selectedData,containerId)
    const value={"expression":[rulesForInteractive],"data":[selectedData]}
    // const value={"expression":[rulesForInteractive]}
    store.commit('setInteractionData',{ key:nodeId,value:value })
    store.commit('setInteractNodeId',nodeId)
}

