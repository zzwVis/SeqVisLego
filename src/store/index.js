import { createStore } from 'vuex';
import * as d3 from "d3";
import eventColorConfig from '../../eventColorConfig.json';

// function generateGrayscaleColors(count) {
//     let grayscales = [];
//     for (let i = 0; i < count; i++) {
//         // 生成介于50~200之间的灰度值，避免过于接近黑色或白色
//         let grayValue = Math.round(50 + (150 * i / (count - 1)));
//         grayscales.push(`rgb(${grayValue}, ${grayValue}, ${grayValue})`);
//     }
//     return grayscales;
// }

function generateGrayscaleColors(count) {
    let purples = [];
    for (let i = 0; i < count; i++) {
        // 生成介于100~200之间的红色和蓝色值，绿色值保持在50以下
        let redValue = Math.round(100 + (100 * i / (count - 1)));
        let blueValue = Math.round(100 + (100 * i / (count - 1)));
        let greenValue = Math.round(50 * i / (count - 1));
        purples.push(`rgb(${redValue}, ${greenValue}, ${blueValue})`);
    }
    return purples;
}

const combinedColors = [...d3.schemeTableau10,...d3.schemeAccent,d3.schemePaired,d3.schemeCategory10,d3.schemeDark2, ...d3.schemeSet2, d3.schemeSet1 , ...d3.schemePaired,...d3.schemeCategory10, ...d3.schemeAccent, ...d3.schemeCategory10, ...d3.schemeCategory10,...d3.schemeTableau10,...d3.schemeCategory10, ...d3.schemeCategory10, ...d3.schemeAccent];

// const combinedColors = [ ...d3.schemeTableau10,...d3.schemePaired,...d3.schemePaired,d3.schemeCategory10,...d3.schemePaired,...d3.schemePaired,d3.schemeDark2,...d3.schemePaired,d3.schemeDark2,...d3.schemePaired,...d3.schemePaired,,...d3.schemePaired,...d3.schemePaired,d3.schemeCategory10,...d3.schemeTableau10,];



const store = createStore({
    state() {
        return {
            responseData: null,
            visualType :null,
            isSelectVisualType:false,
            seqView :null,
            unusualSeq: [],
            selectedSeq: [],
            selectedData: "",
            // filter的属性
            selectedParameter: "",
            selectedOperator: "",
            curExpression:"",
            // 在两个节点之间添加某个节点，新增的表达式
            curNodeExpression: "",
            isDrag:false,
            isSelectData:false,
            isSelectNode:false,
            selectContainer: "",
            selectBox: "",
            isSelectContainer: "",
            isSelectParameter:false,
            // align的参数
            isSelectAlignParameter:false,
            globalHighlight: [],
            globalMouseover: [],
            curHighlightContainer: "",
            curMouseoverContainer: "",
            originalTableData:{},
            filterRules:{},
            mouseoverRules:{},
            dateRange: [],
            selectedViewType: "",
            isSelectedViewType: false,
            isSelectHistory: "",
            // 是否交换了group参数
            isExchange: "",
            sheetName: "",
            sheetData: [],
            // filter的值
            filterParam: [],
            // align的属性
            alignAttr: "",
            // align的参数:即特定值
            alignParam: [],
            // 用于存放brush临时数据
            interactionData: {},
            // 当前点击的节点id
            nodeId: "",
            //是否点击了框框
            isCilckBox: false,
            // 筛选事件对的起始时间
            eventPairStartNum: "",
            // 筛选事件对的终止时间
            eventPairEndNum: "",
            // 事件对分析类别
            eventAnalyse: "",
            // 是否对事件对进行分析
            isAnalyseEvent: false,
            // 是否取消对事件对进行分析
            isCancelAnalyseEvent: false,
            isClickBrush: false,
            isClickReset: false,
            isClickCancelFilter: false,
            isClickCancelBrush: false,
            // 存放所有时间轴视图的id对应的数据
            timeLineData: {},
            // 全局的colorMap
            globalColorMap: {},
            // 当前的colorMap选项
            curColorMap: "",
            // 由brush导致的筛选
            brushedEvent: [],
            // 由brush导致的过滤条件
            brushedRules:{},
            // 由brush导致的模式筛选
            brushedPattern: [],
            //是否修改了min support
            isClickSupport: false,
            // 当前的min support
            curMinSupport: "",
            // 为了一加载数据就自动创建表格因此使用这个变量监听一下
            isFirstLoad: false,
            //框选模式，更新时间轴
            selectFromPattern: [],
            // 当前交互的视图对应的节点Id
            interactNodeId: "",
            // 选择的两个事件集合
            eventSet1: [],
            eventSet2: [],
            // 事件对1对应的属性
            eventPairAttr1:"",
            // 事件对2对应的属性
            eventPairAttr2:"",
            //存放全局的路径信息
            globalPathData:{},
            //存放可以选择的参数信息
            optionAttr:[]
        };
    },
    mutations: {
        setResponseData(state, data) {
            state.responseData = data;
        },
        setVisualType(state, option) {
            state.visualType = option;
        },
        setIsSelectVisualType(state) {
            state.isSelectVisualType = !state.isSelectVisualType;
        },
        setSeqView(state, option) {
            state.seqView = option;
        },
        setUnusualSeq(state, option) {
            state.unusualSeq.push(option);
        },
        setSelectedSeq(state, option) {
            state.selectedSeq = option;
        },
        setSelectedData(state, option) {
            state.selectedData = option;
        },
        setSelectedParameter(state, option) {
            state.selectedParameter = option;
        },
        clearSelectedParameter(state) {
            state.selectedParameter = ""; // 将 selectedParameter 清空
        },
        setSelectedOperator(state, option) {
            state.selectedOperator = option;
        },
        setCurExpression(state, option) {
            state.curExpression = option;
        },
        setCurNodeExpression(state, option) {
            state.curNodeExpression = option;
        },
        clearCurExpression(state) {
            state.curExpression = ""
        },
        setIsDrag(state) {
            state.isDrag = !state.isDrag;
        },
        setIsSelectData(state) {
            state.isSelectData = !state.isSelectData;
        },
        setIsSelectNode(state) {
            state.isSelectNode = !state.isSelectNode;
        },
        setSelectContainer(state, option) {
            state.selectContainer = option;
        },
        setSelectBox(state, option) {
            state.selectBox = option;
        },
        setIsSelectContainer(state) {
            state.isSelectContainer = !state.isSelectContainer;
        },
        setIsSelectParameter(state) {
            state.isSelectParameter = !state.isSelectParameter;
        },
        setIsSelectAlignParameter(state) {
            state.isSelectAlignParameter = !state.isSelectAlignParameter;
        },
        setGlobalHighlight(state,option) {
            state.globalHighlight.push(option);
        },
        clearGlobalHighlight(state) {
            state.globalHighlight = []
        },
        setGlobalMouseover(state,option) {
            state.globalMouseover.push(option);
        },
        setCurHighlightContainer(state, option) {
            state.curHighlightContainer = option;
        },
        setCurMouseoverContainer(state, option) {
            state.curMouseoverContainer = option;
        },
        setOriginalTableData(state, { key, value }) {
            if (!(key in state.originalTableData)) {
                state.originalTableData[key] = value;
            }
        },
        setFilterRules(state, option) {
            state.filterRules = option;
        },
        setMouseoverRules(state, option) {
            state.mouseoverRules = option;
        },
        setDateRange(state, option) {
            state.dateRange = option;
        },
        setSelectedViewType(state, option) {
            state.selectedViewType = option;
        },
        setIsSelectedViewType(state) {
            state.isSelectedViewType = !state;
        },
        setIsSelectHistory(state) {
            state.isSelectHistory = !state.isSelectHistory;
        },
        setIsExchange(state) {
            state.isExchange = !state.isExchange;
        },
        setSheetName(state, option) {
            state.sheetName = option;
        },
        setSheetData(state, option) {
            state.sheetData = option;
        },
        setFilterParam(state, option) {
            state.filterParam = option;
        },
        setAlignAttr(state, option) {
            state.alignAttr = option;
        },
        setAlignParam(state, option) {
            state.alignParam = option;
        },
        setInteractionData(state, {key, value}) {
            state.interactionData[key] = value;
            // if (!(key in state.interactionData)) {
            //     state.interactionData[key] = value;
            // }
            // else{
            //     const obj1=state.interactionData
            //     const obj2={}
            //     obj2[key]= value
            //     const nodeId = Object.keys(obj1)[0]
            //     // 创建一个新的结果对象，其中包含合并后的expression数组和data数组
            //     const merged = {
            //         [nodeId]: {
            //             expression: [],
            //             data: []
            //         }
            //     };
            //     // 合并expression数组
            //     merged[nodeId]["expression"] = [...obj1[nodeId]["expression"], ...obj2[nodeId]["expression"]];
            //     // 合并data数组
            //     merged[nodeId]["data"] = [...obj1[nodeId]["data"], ...obj2[nodeId]["data"]];
            //     // 返回新的合并后的数据对象
            //     state.interactionData = merged
            // }
        },
        setNodeId(state, option) {
            state.nodeId = option;
        },
        setIsClickBox(state) {
            state.isClickBox = !state.isClickBox;
        },
        setEventPairStartNum(state, option) {
            state.eventPairStartNum = option;
        },
        setEventPairEndNum(state, option) {
            state.eventPairEndNum = option;
        },
        setEventAnalyse(state, option) {
            state.eventAnalyse = option;
        },
        setIsAnalyseEvent(state) {
            state.isAnalyseEvent = !state.isAnalyseEvent;
        },
        setIsCancleAnalyseEvent(state) {
            state.isCancelAnalyseEvent = !state.isCancelAnalyseEvent;
        },
        setIsClickBrush(state) {
            state.isClickBrush = !state.isClickBrush;
        },
        setIsClickReset(state) {
            state.isClickReset = !state.isClickReset;
        },
        setIsClickCancelFilter(state) {
            state.isClickCancelFilter = !state.isClickCancelFilter;
        },
        setIsClickCancelBrush(state) {
            state.isClickCancelBrush = !state.isClickCancelBrush;
        },
        setTimeLineData(state, { key, value }) {
            state.timeLineData[key] = value;
        },
        setGlobalColorMap(state, option){
            // 定义调整颜色亮度和饱和度的函数
            function lightenAndDesaturateColor(color, lightnessFactor, saturationFactor) {
                // 将 RGB 颜色转换为 HSL
                const hsl = d3.hsl(color);
                // 增加亮度（限制在 [0, 1] 范围内）
                hsl.l = Math.min(1, hsl.l * lightnessFactor);
                // 降低饱和度（限制在 [0, 1] 范围内）
                hsl.s = Math.min(1, hsl.s * saturationFactor);
                // 返回调整后的 RGB 颜色
                return hsl.toString();
            }

            // 调整 combinedColors 的亮度和饱和度
            const lightnessFactor = 1.1; // 亮度因子，1.2 表示增加 20% 亮度
            const saturationFactor = 0.9; // 饱和度因子，0.5 表示降低一半饱和度
            const lightenedAndDesaturatedColors = combinedColors.map(color => lightenAndDesaturateColor(color, lightnessFactor, saturationFactor));

            const grayscaleColors = generateGrayscaleColors(20);
            state.globalColorMap = {}
            if(typeof option[0] === 'number'){
                const minValue = Math.min(...option);
                const maxValue = Math.max(...option);
                const colorScale = d3.scaleSequential(d3.interpolateViridis)
                    .domain([minValue, maxValue]); // 定义域：最小值到最大值

                option.forEach((event) => {
                    state.globalColorMap[event] = colorScale(event);
                });
            }
            else{
                option.forEach((event, index) => {
                    if (eventColorConfig[event]) {  // 直接从配置读取
                        state.globalColorMap[event] = eventColorConfig[event];
                    }
                    else{
                        if (index < combinedColors.length) {
                            // 如果索引在颜色列表长度之内，就使用莫兰迪颜色
                            // state.globalColorMap[event] = combinedColors[index];
                            state.globalColorMap[event] = lightenedAndDesaturatedColors[index];
                        } else {
                            // 如果索引超出莫兰迪颜色列表长度，就使用灰色
                            state.globalColorMap[event] = grayscaleColors[(index - combinedColors.length) % grayscaleColors.length];
                        }
                    }
                });
            }
        },
        setCurColorMap(state, option) {
            state.curColorMap = option;
        },
        setBrushedEvent(state, option) {
            state.brushedEvent = option;
        },
        setBrushedRules(state, option) {
            state.brushedRules = option;
        },
        setBrushedPattern(state, option) {
            state.brushedPattern = option;
        },
        setIsClickSupport(state) {
            state.isClickSupport = !state.isClickSupport;
        },
        setCurMinSupport(state, option) {
            state.curMinSupport = option;
        },
        setIsFirstLoad(state) {
            state.isFirstLoad = !state.isFirstLoad;
        },
        setSelectFromPattern(state, option) {
            state.selectFromPattern = option;
        },
        setInteractNodeId(state, option) {
            state.interactNodeId = option;
        },
        setEventSet1(state, option){
            state.eventSet1 = option
        },
        setEventSet2(state, option){
            state.eventSet2 = option
        },
        setEventPairAttr1(state, option){
            state.eventPairAttr1 = option
        },
        setEventPairAttr2(state, option){
            state.eventPairAttr2 = option
        },
        setGlobalPathData(state, option){
            state.globalPathData = option
        },
        setOptionAttr(state, option){
            state.optionAttr = option
        }
    },
    actions: {
        saveResponseData({ commit }, data) {
            commit('setResponseData', data);
        },
        saveVisualType({ commit }, option) {
            commit('setVisualType', option);
        },
        saveIsSelectVisualType({ commit }) {
            commit('setIsSelectVisualType');
        },
        saveSeqView({ commit }, option) {
            commit('setSeqView', option);
        },
        saveUnusualSeq({ commit }, option) {
            commit('setUnusualSeq', option);
        },
        saveSelectedSeq({ commit }, option) {
            commit('setSelectedSeq', option);
        },
        saveSelectedData({ commit }, option) {
            commit('setSelectedData', option);
        },
        saveSelectedParameter({ commit }, option) {
            commit('setSelectedParameter', option);
        },
        clearSelectedParameter({ commit }) {
            commit('clearSelectedParameter'); // 调用 mutation 来清空 selectedParameter
        },
        saveSelectedOperator({ commit }, option) {
            commit('setSelectedOperator', option);
        },
        saveCurExpression({ commit }, option) {
            commit('setCurExpression', option);
        },
        clearCurExpression({ commit }) {
            commit('clearCurExpression');
        },
        saveCurNodeExpression({ commit }, option) {
            commit('setCurNodeExpression', option);
        },
        saveIsDrag({ commit }, option) {
            commit('setIsDrag', option);
        },
        saveIsSelectData({ commit }) {
            commit('setIsSelectData');
        },
        saveIsSelectNode({ commit }) {
            commit('setIsSelectNode');
        },
        saveSelectContainer({ commit }, option) {
            commit('setSelectContainer', option);
        },
        saveSelectBox({ commit }, option) {
            commit('setSelectBox', option);
        },
        saveIsSelectContainer({ commit }) {
            commit('setIsSelectContainer');
        },
        saveIsSelectParameter({ commit }) {
            commit('setIsSelectParameter');
        },
        saveIsSelectAlignParameter({ commit }) {
            commit('setIsSelectAlignParameter');
        },
        saveGlobalHighlight({ commit }, option) {
            commit('setGlobalHighlight', option);
        },
        clearGlobalHighlight({ commit }) {
            commit('clearGlobalHighlight');
        },
        saveGlobalMouseover({ commit }, option) {
            commit('setGlobalMouseover', option);
        },
        saveCurHighlightContainer({ commit }, option) {
            commit('setCurHighlightContainer',option);
        },
        saveCurMouseoverContainer({ commit }, option) {
            commit('setCurMouseoverContainer',option);
        },
        saveOriginalTableData({ commit }, { key, value }) {
            commit('setOriginalTableData',{ key, value });
        },
        saveFilterRules({ commit }, option) {
            commit('setFilterRules', option);
        },
        saveMouseoverRules({ commit }, option) {
            commit('setMouseoverRules', option);
        },
        saveDateRange({ commit }, option) {
            commit('setDateRange', option);
        },
        saveSelectedViewType({ commit }, option) {
            commit('setSelectedViewType', option);
        },
        saveIsSelectedViewType({ commit }) {
            commit('setIsSelectedViewType');
        },
        saveIsSelectHistory({ commit }) {
            commit('setIsSelectHistory');
        },
        saveIsExchange({ commit }) {
            commit('setIsExchange');
        },
        saveSheetName({ commit }, option) {
            commit('setSheetName', option);
        },
        saveSheetData({ commit }, option) {
            commit('setSheetData',option);
        },
        saveFilterParam({ commit }, option) {
            commit('setFilterParam',option);
        },
        saveAlignAttr({ commit }, option) {
            commit('setAlignAttr',option);
        },
        saveAlignParam({ commit }, option) {
            commit('setAlignParam',option);
        },
        saveInteractionData({ commit }, {key, value}) {
            commit('setInteractionData', {key, value});
        },
        saveNodeId({ commit }, option) {
            commit('setNodeId',option);
        },
        saveIsClickBox({ commit }) {
            commit('setIsClickBox');
        },
        saveEventPairStartNum({ commit }, option) {
            commit('setEventPairStartNum',option);
        },
        saveEventPairEndNum({ commit }, option) {
            commit('setEventPairEndNum',option);
        },
        saveEventAnalyse({ commit }, option) {
            commit('setEventAnalyse',option);
        },
        saveIsAnalyseEvent({ commit }) {
            commit('setIsAnalyseEvent');
        },
        saveIsCancleAnalyseEvent({ commit }) {
            commit('setIsCancleAnalyseEvent');
        },
        saveIsClickBrush({ commit }) {
            commit('setIsClickBrush');
        },
        saveIsClickReset({ commit }) {
            commit('setIsClickReset');
        },
        saveIsClickCancelFilter({ commit }) {
            commit('setIsClickCancelFilter');
        },
        saveIsClickCancelBrush({ commit }) {
            commit('setIsClickCancelBrush');
        },
        saveTimeLineData({ commit }, {key, value}) {
            commit('setTimeLineData', {key, value});
        },
        saveGlobalColorMap({ commit }, option) {
            commit('setGlobalColorMap',option);
        },
        saveCurColorMap({ commit }, option) {
            commit('setCurColorMap',option);
        },
        saveBrushedEvent({ commit }, option) {
            commit('setBrushedEvent',option);
        },
        saveBrushedRules({ commit }, option) {
            commit('setBrushedRules',option);
        },
        saveBrushedPattern({ commit }, option) {
            commit('setBrushedPattern',option);
        },
        saveIsClickSupport({ commit }) {
            commit('setIsClickSupport');
        },
        saveCurMinSupport({ commit }, option) {
            commit('setCurMinSupport',option);
        },
        saveIsFirstLoad({ commit }) {
            commit('setIsFirstLoad');
        },
        saveSelectFromPattern({ commit }, option) {
            commit('setSelectFromPattern', option);
        },
        saveInteractNodeId({ commit }, option) {
            commit('setInteractNodeId', option);
        },
        saveEventSet1({ commit }, option) {
            commit('setEventSet1', option);
        },
        saveEventSet2({ commit }, option) {
            commit('setEventSet2', option);
        },
        saveEventPairAttr1({ commit }, option) {
            commit('setEventPairAttr1', option);
        },
        saveEventPairAttr2({ commit }, option) {
            commit('setEventPairAttr2', option);
        },
        saveGlobalPathData({ commit }, option) {
            commit('setGlobalPathData', option);
        },
        saveOptionAttr({ commit }, option) {
            commit('setOptionAttr', option);
        },
    }
});

export default store;