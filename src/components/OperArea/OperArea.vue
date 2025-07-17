<template xmlns="http://www.w3.org/1999/html">
  <div class="container">
    <div class="data" id="word"><span>Data</span></div>
    <div class="myLine"></div>
    <div class="view" id="word"><span>Vis</span></div>
    <div class="myLine2"></div>
    <div class="intermedia" id="word">Intermediate <br>Data</div>
    <div style="position: absolute;right: 0">
      <!--    <el-button @click="deleteNode(this.currentNode)" style="position:absolute;right: 7%;top: 10px;z-index: 1;width: 7%;height: 10%;font-size: 2%">Delete Node</el-button>-->
<!--      <img src="../../assets/deleteNode.svg" alt="Image"  @click="deleteNode(this.currentNode)" class="nodeImg"/>-->
      <!--    <el-button @click="clearAll" style="position:absolute;right: 1%;top: 10px;z-index: 1;width: 5%;height: 10%;font-size: 2%">-->
      <!--    </el-button>-->
      <img src="../../assets/clearAll.svg" alt="Image"  @click="clearAll" class="nodeImg"/>
      <!--    <el-button @click="showAll" style="position:absolute;right: 15%;top: 10px;z-index: 1;width: 5%;height: 10%;font-size: 2%">Show All</el-button>-->
<!--      <img src="../../assets/showAll.svg" alt="Image"  @click="showAll" class="nodeImg"/>-->
      <!--    <el-button @click="importExample" style="position:absolute;right: 21%;top: 10px;z-index: 1;width: 5%;height: 10%;font-size: 2%">Sample</el-button>-->
      <img src="../../assets/template.svg" alt="Image"  @click="importExample" class="nodeImg"/>
    </div>
    <div class="workflowArea" id="workflowContainer" @click="closeHandler"></div>
  </div>
  <pop-up
      :left="popupLeft"
      :top="popupTop"
      :visible="popupVisible"
      :operation-list="popupOperation"
      :visual-list="popupVisualization"
      :param-list="popupParam"
      :display-mode="displayParam"
      :checkbox-options="checkboxOptions"
      :align-options="alignOptions"
      :img-list="popupVisImg"
      @close="closeHandler"/>
  <event-pop-up
      :left="eventPopupLeft"
      :top="eventPopupTop"
      :visible="eventPopupVisible"
      @close="closeEventHandler"/>
  <event-data-pop-up
      :left="eventDataPopupLeft"
      :top="eventDataPopupTop"
      :visible="eventDataPopupVisible"
      :event-list="eventDataList"
      @close="closeEventDataHandler"/>
</template>

<script>
import {mapState} from 'vuex';
import * as d3 from "d3";
import dagreD3 from 'dagre-d3';
import store from "@/store/index.js";
import "./style.css"
import popUp from './popUp.vue';
import eventPopUp from './eventPopUp.vue';
import eventDataPopUp from "./eventData.vue";
import axios, {all} from "axios";
import {
  addParameter, enhanceAlignExpression,
  enhanceFilterExpression,
  enhanceFilterTimeExpression,
  getNodePosition
} from "@/components/OperArea/tool.js";
import {node} from "dagre-d3/lib/intersect/index.js";
import deleteRelatedNode from '@/assets/deleteRelatedNode.png';
import deleteSingleNode from '@/assets/deleteSingleNode.png'; // 动态引用 SVG 文件

export default {
  components: {
    popUp,
    eventPopUp,
    eventDataPopUp
  },
  data() {
    return {
      graph: new dagreD3.graphlib.Graph().setGraph({}),
      render: new dagreD3.render(),
      nextNodeId: 0,
      nextEdgeId: 1,
      nodes: [],
      edges: [],
      currentNode: null,
      maxText: "",
      links: null,
      linksData: [],
      // 存放路径(节点)与代码的对应关系
      pathData: {},
      // 存储节点的上一个位置
      nodePositions: {},
      // 弹窗位置和内容
      popupLeft: 0,
      popupTop: 0,
      popupVisible: false,
      newPopupVisible: false,
      popupOperation:[],
      popupVisualization:[],
      popupVisImg:[],
      popupParam:[],
      displayParam:"",
      images: [
        { url: '../../../../src/assets/table.png', vis: "table", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/barChart.png', vis: "bar chart", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/pieChart.png', vis: "pie chart", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/sunBurst.png', vis: "sunburst", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/timeLine.png', vis: "timeline", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/sankey.svg', vis: "sankey", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/lineChart.png', vis: "line chart", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/heatmap.png', vis: "heatmap", style:"width: 30px; height: 30px;margin: 0 5px;" },
        { url: '../../../../src/assets/scatter.png', vis: "scatter", style:"width: 25px; height: 25px;margin: 2px 5px;" },
      ],
      checkboxOptions:{},
      alignOptions:{},
      filterExpression: {},
      //当前的交互矩形块id,
      interactiveNodeId: "",
      // 事件对弹窗
      eventPopupLeft: 0,
      eventPopupTop: 0,
      eventPopupVisible: false,
      // 显示信息
      eventDataPopupLeft: 0,
      eventDataPopupTop: 0,
      eventDataPopupVisible: false,
      eventDataList: [],
      // 记录上一次的事件分析数据长度
      lastLength: 0,
      // 记录当前需要在两个节点之间插入的节点ID
      nodeInEdge: "",
      // 记录当前的这个点是插在哪条边上了
      curClickEdge: ""
    };
  },
  computed: {
    ...mapState({
      selectedData: state => state.selectedData,
      selectedOperator: state => state.selectedOperator,
      selectedParameter: state => state.selectedParameter,
      isDrag: state => state.isDrag,
      isSelectedData: state => state.isSelectData,
      isSelectParameter: state => state.isSelectParameter,
      isSelectedAlignParameter: state => state.isSelectAlignParameter,
      curExpression: state => state.curExpression,
      selectContainer: state=>state.selectContainer,
      isSelectContainer: state=>state.isSelectContainer,
      isSelectVisualType: state=>state.isSelectVisualType,
      isSelectHistory: state =>state.isSelectHistory,
      filterParam: state=>state.filterParam,
      alignAttr: state=>state.alignAttr,
      alignParam: state=>state.alignParam,
      interactionData: state => state.interactionData,
      curNodeExpression: state => state.curNodeExpression
    }),
  },
  watch: {
    nodes(newVal) {
      console.log("新的值", newVal);

      // 获取当前所有已创建的 nodeId
      const nodeIds = new Set(this.nodes.map(node => node.id));

      // 遍历所有已经创建的元素并检查是否存在于新的 nodes 中
      d3.selectAll("#interactiveRect").each(function () {
        const nodeId = this.id.replace('interactiveRect', '');  // 获取nodeId
        console.log("nodeId",nodeId)
        if (!newVal.some(node => node.id === nodeId)) {
          // 如果当前节点 id 不存在于 newVal 中，删除该元素
          d3.select(this).remove();
          d3.select(".textElem" + nodeId).remove();  // 同时移除文本元素
        }
      });

      d3.selectAll("#textElem").each(function () {
        const nodeId = this.className.baseVal.replace('textElem', '');  // 获取nodeId
        if (!newVal.some(node => node.id === nodeId)) {
          // 如果当前节点 id 不存在于 newVal 中，删除该元素
          d3.select(this).remove();
        }
      });
    },

    pathData: {
      handler(newVal) {
        // 这里是删除了管道同时把视图也删除了的代码
        const allKeys = Object.keys(newVal)
        const parentDiv = document.getElementsByClassName('grid-item block4')[0];

        const chartContainers = parentDiv.querySelectorAll('div.chart-container');

        // 遍历找到的元素
        chartContainers.forEach(div => {
          // 使用元素的 id 作为键，'codeContext' 属性的值作为值
         const code = div.getAttribute("codeContext");
          // 如果当前的 codeContext 在 allKeys 中没有匹配的项
          if (!allKeys.includes(code)) {
            div.innerHTML = '';  // 清空该 div 的内容
            // 删除绑定的自定义属性
            div.removeAttribute("codeContext");
            div.removeAttribute("visualType");
            div.removeAttribute("nodeId");
            div.removeAttribute("startTime");
            div.removeAttribute("endTime");
          }
        });
      },
      deep: true
    },
    currentNode(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.maxText = ""
      }
      if(newVal!=="node0"){
        this.handleNodeClick(newVal);
      }
    },
    // 监听数据的选择
    isSelectedData() {
      this.clearAll()
      this.setupGraph()
      if (this.selectedData) {
        this.addNode(this.selectedData);
        // store.commit('setSelectedOperator',"view type")
        // this.showOperator(this.currentNode,"view type");
        // this.AddViewType(this.currentNode, "table");
      }
      this.$store.dispatch('clearCurExpression');
      this.handleNodeClick(this.currentNode);
    },
    // 监听操作符的变化
    isDrag() {
      if(this.currentNode){
        this.showOperator(this.currentNode,this.selectedOperator);
      }
    },
    // 监听选择参数的变化
    isSelectParameter() {
      if (this.currentNode && this.selectedParameter && this.currentNode!=="node0") {
        const node = this.graph.node(this.currentNode);
        if(node.label===" "){
          this.updateNodeWithSquare(this.currentNode, this.selectedParameter);
        }
        this.handleNodeClick(this.currentNode)
      }
    },
    // 对齐的参数
    isSelectedAlignParameter() {
      if (this.currentNode && this.alignParam && this.currentNode!=="node0") {
        this.updateNodeWithSquare(this.currentNode, this.alignAttr);
      }
      this.handleNodeClick(this.currentNode)
    },
    // 监听可视化构型的选择
    isSelectVisualType() {
      if (this.currentNode) {
        if(((this.selectedOperator==="group")||(this.selectedOperator==="flatten")||(this.selectedOperator==="pattern"))
            &&(["bar chart", "pie chart", "sunburst"].includes(store.state.visualType))){
          this.showOperator(this.currentNode,"count");
        }
        else{
          store.commit('setSelectedOperator',"view type")
          this.showOperator(this.currentNode,"view type");
          this.AddViewType(this.currentNode, store.state.visualType);
        }
      }
    },
    // 监听代码的变化
    isSelectHistory() {
      let codeContext = this.curExpression
      const completePath = this.parseChainExpression(codeContext);
      function isPathValid(nodes, edges) {
        for (let i = 0; i < nodes.length - 1; i++) {
          const source = nodes[i];
          const target = nodes[i + 1];
          // 检查当前两个节点之间是否存在边
          const edgeExists = edges.some(edge => edge.source === source && edge.target === target);
          if (!edgeExists) {
            return false; // 如果某一段路径不存在，直接返回 false
          }
        }
        return true; // 如果所有路径都存在，返回 true
      }

      // 看看现在是不是清空状态
      const svg = d3.select(".svgArea")
      // 检查是否存在 .node 元素
      const nodes = svg.selectAll('.node');

      // 判断当前点击的这个历史记录，在可视化编程区域是不是已经有了对应的管道 ，如果没有才创建，如果有的话就没反应
      const isExist = Object.keys(this.pathData).includes(codeContext);

      if(!isExist){
        // 遍历列表的每一项
        completePath.forEach((item, index) => {
          if(index===0){
            if (!nodes.empty()) {
              this.handleNodeClick("node0")
            }
            else {
              this.clearAll()
              this.setupGraph()
              this.addNode(store.state.sheetName);
              this.$store.dispatch('clearCurExpression');
              this.handleNodeClick(this.currentNode);
            }
          }
          else{
            const keysCount = Object.keys(item).length; // 获取键的数量
            if(keysCount===1){
              for (const [key, value] of Object.entries(item)) {
                if(key === "operator"){
                  if(value==="count"){
                    store.commit('setVisualType',completePath[index+1]["view_type"])
                  }
                  this.showOperator(this.currentNode,value);
                  if(value!=="count"){
                    this.handleNodeClick(this.currentNode);
                  }
                }
                else if(key==="parameter"){
                  if (this.currentNode && this.currentNode!=="node0") {
                    this.updateNodeWithSquare(this.currentNode, value);
                  }
                  this.handleNodeClick(this.currentNode)
                }
                else if(key==="view_type"){
                  if(completePath[index-1].operator!=="count"){
                    store.commit('setSelectedOperator',"view type")
                    this.showOperator(this.currentNode,"view type");
                    this.AddViewType(this.currentNode, value);
                  }
                  else{
                    this.handleNodeClick(this.currentNode);
                  }
                }
              }
            }
            else{
              for (const [key, value] of Object.entries(item)) {
                if(key==="operator"){
                  this.showOperator(this.currentNode,value);
                  this.handleNodeClick(this.currentNode);
                }
                // 这里的value是属性
                else if(key==="parameter"){
                  if (this.currentNode && this.currentNode!=="node0") {
                    this.updateNodeWithSquare(this.currentNode, value);
                  }
                  this.handleNodeClick(this.currentNode)
                }
                //   这里是属性的取值范围
                else if(key==="range"){
                  this.$store.dispatch('saveIsSelectParameter');
                  this.$store.dispatch('saveFilterParam',value)
                }
              }
            }
          }
        });
      }
      // const nodeInPath = this.pathData[codeContext]
      // // 选择所有边，并根据条件筛选
      // svg.selectAll('.mylink')
      //     .style('visibility', link => {
      //       const sourceIndex = nodeInPath.indexOf(link.source);
      //       const targetIndex = nodeInPath.indexOf(link.target);
      //       // 检查是否是相邻的两个节点
      //       if (sourceIndex !== -1 && targetIndex !== -1 && (targetIndex - sourceIndex) === 1) {
      //         return 'visible';
      //       } else {
      //         return 'hidden';
      //       }
      //     });
      // svg.selectAll('.linkText')
      //     .style('visibility', link => {
      //       const sourceIndex = nodeInPath.indexOf(link.source);
      //       const targetIndex = nodeInPath.indexOf(link.target);
      //       // 检查是否是相邻的两个节点
      //       if (sourceIndex !== -1 && targetIndex !== -1 && Math.abs(targetIndex - sourceIndex)=== 1) {
      //         return 'visible';
      //       } else {
      //         return 'hidden';
      //       }
      //     });
      // this.nodes.forEach(n => {
      //   svg.selectAll('.node')
      //       .style('visibility', node => {
      //         // 检查是否是相邻的两个节点
      //         if (nodeInPath.includes(node)) {
      //           return 'visible';
      //         } else {
      //           return 'hidden';
      //         }
      //       });
      //   svg.selectAll('.mypath')
      //       .style('visibility', path => {
      //         const sourceIndex = nodeInPath.indexOf(path.v);
      //         const targetIndex = nodeInPath.indexOf(path.w);
      //         // 检查是否是相邻的两个节点
      //         if (sourceIndex !== -1 && targetIndex !== -1 && Math.abs(targetIndex - sourceIndex)=== 1) {
      //           return 'visible';
      //         } else {
      //           return 'hidden';
      //         }
      //       });
      //   svg.selectAll('.edgeLabel')
      //       .style('visibility', pathLabel => {
      //         const sourceIndex = nodeInPath.indexOf(pathLabel.v);
      //         const targetIndex = nodeInPath.indexOf(pathLabel.w);
      //         // 检查是否是相邻的两个节点
      //         if (sourceIndex !== -1 && targetIndex !== -1 && Math.abs(targetIndex - sourceIndex)=== 1) {
      //           return 'visible';
      //         } else {
      //           return 'hidden';
      //         }
      //       });
      // })
    },
    interactionData: {
      handler(newVal) {
        const nodeId = store.state.interactNodeId

        if(!(Object.keys(newVal).length === 0)){
          const svg = d3.select(".innerArea")
          // const nodeId=Object.keys(newVal)[0]
          const value = newVal[nodeId]
          const length = value["expression"].length
          // 如果是移除的情况，则不添加新的数据块
          if(length>=this.lastLength){
            this.lastLength = length
            const expression = value["expression"][length-1]

            const eventData = value["data"][length-1]
            const curNode = this.graph.node(nodeId);
            // let text = curNode.label

            let eventDataString = eventData.join(", ");
            let text = eventDataString

            const maxLength = 13; // 你可以根据需要调整这个值
            // 如果字符串长度超过最大长度，则截断并添加省略号
            let truncatedText = eventDataString.length > maxLength
                ? eventDataString.substring(0, maxLength) + "..."
                : eventDataString;


            const positionX= Number(curNode.x);
            let positionY
            let outerRect

            const width = curNode.width
            const height = Number(curNode.height)

            // const element1 = svg.select("#" + "interactiveRect" + text +"1");
            const element = svg.select("#" + "interactiveRect" + nodeId);
            let textId, outerY
            const padding =12
            const outerX =positionX - width / 2 - padding;

            // if (element1.empty()) {
            //   positionY = curNode.y + curNode.height +40;
            //   textId=text+"1"
            //   if(!element2.empty()){
            //     outerY = element2.attr("y") - padding/2- curNode.height-5
            //     createOuterRect.call(this, outerX, outerY);
            //   }
            // } else {
            //   positionY = curNode.y + curNode.height*2 +45;
            //   textId = text+"2"
            //   if(!element1.empty()){
            //     outerY = positionY - padding/2- curNode.height-5
            //     createOuterRect.call(this, outerX, outerY);
            //   }
            // }

            positionY = 200;
            textId=text+"1"
            // if(!element.empty()){
            //   outerY = element.attr("y") - padding/2- curNode.height-5
            //   createOuterRect.call(this, outerX, outerY)
            // }

            // function createOuterRect(outerX, outerY){
            //   const outerWidth =width + padding * 2
            //   const outerHeight = height * 2+ 5 + padding
            //   const self = this; // 保存this的引用
            //   // 如果有两个事件对，那么就可以进行event-pair操作 添加外框
            //   outerRect = svg.append("rect")
            //       .attr("class","outerRect")
            //       .attr("x", outerX) // 使外框稍微大一点，向左移动
            //       .attr("y", outerY) // 使外框稍微大一点，向上移动
            //       .attr("width", outerWidth) // 增加外框的宽度
            //       .attr("height", outerHeight) // 增加外框的高度
            //       .attr("rx", 5) // 可以为外框也设置圆角
            //       .attr("ry", 5)
            //       .style("fill", "transparent")
            //       .style("stroke", "grey") // 设置外框的颜色
            //       .style("stroke-width", 1.5) // 设置外框的线条宽度
            //       .style("stroke-dasharray", ("3, 3"))
            //       .style("cursor","pointer")
            //       .on("click", function() {
            //         self.eventPopupLeft = outerX + outerWidth +70;
            //         self.eventPopupTop = outerY-10;
            //         self.eventPopupVisible = true
            //         self.eventDataList= eventData
            //       });
            //   outerRect.lower()
            // }

            svg.selectAll(".interactiveRect" + nodeId).remove(); // 移除已有的 text 元素

            const interactiveRect = svg.append("rect")
                .attr("x", positionX-width/2) // 矩形左上角的x坐标
                .attr("y", positionY) // 矩形左上角的y坐标
                .attr("width", width) // 矩形的宽度
                .attr("height", height) // 矩形的高度
                .attr("rx", 2) // 圆角的x半径
                .attr("ry", 2) // 圆角的y半径
                // .attr('id', textId)
                .attr('id', "interactiveRect")
                .attr('class',"interactiveRect"+nodeId)
                .style("cursor","pointer")
                .style("fill", "transparent")
                .style("stroke", "#a38875")
                .style("stroke-width", 1.5)
                .style("stroke-dasharray", ("3, 3"))
                .on("mouseover", () => {
                  d3.select(".textElem" + nodeId).text(text);
                  // this.eventDataPopupLeft = positionX +width;
                  // this.eventDataPopupTop = positionY +10;
                  // this.eventDataPopupVisible = true
                  // this.eventDataList= eventData
                })
                .on("mouseout", () => {
                  d3.select(".textElem" + nodeId).text(truncatedText);
                  this.eventDataPopupVisible = false
                })
                .on("click", () => {
                  this.eventDataPopupVisible = false
                  let name = truncatedText

                  this.addNode(name,expression)
                  interactiveRect.remove()
                  textElem.remove()
                  d3.select(".outerRect").remove()
                  // const indexToRemove = newVal[nodeId]["expression"].indexOf(expression);
                  //
                  // if (indexToRemove !== -1) {
                  //   store.state.interactionData[nodeId]["data"].splice(indexToRemove, 1);
                  //   store.state.interactionData[nodeId]["expression"].splice(indexToRemove, 1);
                  // }
                });

            svg.selectAll(".textElem" + nodeId).remove(); // 移除已有的 text 元素

            // 添加文字
            const textElem = svg.append('text')
                .attr('x', positionX)
                .attr('y', positionY+height / 2+3)
                .attr('text-anchor', 'middle')
                .attr('class',"textElem"+nodeId)
                .attr('id', "textElem")
                .text(truncatedText)
                .style("fill", "#a38875")
                .style("font-size", "60%")
                .style('font-family', 'Roboto Condensed, sans-serif')
                .style("font-weight", "middle")
                .style("cursor","pointer")
                .on("mouseover", () => {
                  // 鼠标悬浮时显示完整内容
                  d3.select(this).text(text);
                  // this.eventDataPopupLeft = positionX +width;
                  // this.eventDataPopupTop = positionY +10;
                  // this.eventDataPopupVisible = true
                  // this.eventDataList= eventData
                })
                .on("mouseout", () => {
                  // 鼠标离开时恢复截断内容
                  d3.select(this).text(truncatedText);
                  this.eventDataPopupVisible = false
                })
                .on("click", () => {
                  this.eventDataPopupVisible = false
                  // 判断数组中是否存在 label 为 "Data1" 的元素
                  let existingLabels = this.nodes.map(item => item.label); // 获取所有 label 的值
                  let name = truncatedText
                  // let name = 'Data1';
                  // // 如果 "Data1" 已存在，依次检查 "Data2"、"Data3" 等
                  // let i = 1;
                  // while (existingLabels.includes(name)) {
                  //   i++;
                  //   name = 'Data' + i;
                  // }

                  this.addNode(name,expression)
                  interactiveRect.remove()
                  textElem.remove()
                  d3.select(".outerRect").remove()

                });

            interactiveRect.raise(); // 将interactiveRect提升到最高层级
            textElem.raise()
          }
        }
        else{
          d3.selectAll(".outerRect").remove()
          d3.selectAll(".interactiveRect").remove()
          d3.selectAll(".textElem").remove()
          this.lastLength = 0
        }
      },
      deep: true,
    },
    curNodeExpression:{
      handler(newValue){
        const hasContent1 = this.hasContentInLastParentheses(newValue)
        if(hasContent1){
          const parts2 = newValue.split('.');
          for (const key in this.pathData) {
            if (this.pathData.hasOwnProperty(key)) {
              const hasContent2 = this.hasContentInLastParentheses(key)
              // 将字符串按照 . 分割成数组
              const parts1 = key.split('.');
              // 合并两个数组
              const mergedParts = parts2.concat(parts1);
              // 去重（保留顺序）
              const uniqueParts = mergedParts.filter((value, index, self) => self.indexOf(value) === index);
              // 将数组重新拼接成字符串
              const result = uniqueParts.join('.');

              // 如果 result 不等于 key，则将 key 替换为 result
              if(hasContent1&&hasContent2){
                // 记录新增部分及其索引
                // const newPartsWithIndex = {};
                // for (const part of parts2) {
                //   if (!parts1.includes(part)) {
                //     newPartsWithIndex[part] = mergedParts.indexOf(part);
                //   }
                // }
                if (result !== key) {
                  this.pathData[result] = this.pathData[key]; // 将原来的值赋给新的 key
                  delete this.pathData[key]; // 删除原来的 key
                }
              }
            }
          }

          // 用于存储最终结果的字典
          const newDict = {};
          // 获取所有的键
          const keys = Object.keys(this.pathData);

          // 遍历每个键
          for (let i = 0; i < keys.length; i++) {
            // 检查子字符串逻辑
            let isSubstring = false;
            for (let j = 0; j < keys.length; j++) {
              if (i !== j && keys[i] !== "" && keys[j].includes(keys[i])) {
                isSubstring = true;
                break;
              }
            }

            // 检查最后一部分是否为 group() 且没有参数，且不是 count()
            const parts = keys[i].split('.');
            const lastPart = parts[parts.length - 1];
            const isGroupWithoutParam = /^group\(\)$/.test(lastPart); // 检查是否为 group()
            const isSpecialFunc = /^(count\(.*\)|unique_count\(.*\)|unique_attr\(.*\))$/.test(lastPart); // 检查是否为 count(), unique_count() 或 unique_attr()

            // 如果不满足条件，则跳过
            if (isGroupWithoutParam && !isSpecialFunc) {
              continue; // 不保留该键值对
            }

            // 如果不是其他键的子字符串，则添加到新字典
            if (!isSubstring && this.hasContentInLastParentheses(keys[i])) {
              newDict[keys[i]] = this.pathData[keys[i]];
            }
          }

          const selectedEdge = d3.select(`#${this.curClickEdge}`);

          const targetId = selectedEdge.attr('target'); // 获取路径的 d 属性
          this.deleteNode(targetId)
          this.deleteNode(this.nodeInEdge)

          for (const key in newDict)  {
            let codeContext = key
            const completePath = this.parseChainExpression(codeContext);
            // 看看现在是不是清空状态
            const svg = d3.select(".svgArea")
            // 检查是否存在 .node 元素
            const nodes = svg.selectAll('.node');
            // 判断当前点击的这个历史记录，在可视化编程区域是不是已经有了对应的管道 ，如果没有才创建，如果有的话就没反应
            const isExist = true;

            if(isExist){
              // 遍历列表的每一项
              completePath.forEach((item, index) => {
                if(index===0){
                  if (!nodes.empty()) {
                    this.handleNodeClick("node0")
                  }
                  else {
                    this.clearAll()
                    this.setupGraph()
                    this.addNode(store.state.sheetName);
                    this.$store.dispatch('clearCurExpression');
                    this.handleNodeClick(this.currentNode);
                  }
                }
                else{
                  const keysCount = Object.keys(item).length; // 获取键的数量
                  if(keysCount===1){
                    for (const [key, value] of Object.entries(item)) {
                      if(key === "operator"){
                        if(value==="count"){
                          store.commit('setVisualType',completePath[index+1]["view_type"])
                        }
                        this.showOperator(this.currentNode,value);
                        if(value!=="count"){
                          this.handleNodeClick(this.currentNode);
                        }
                      }
                      else if(key==="parameter"){
                        if (this.currentNode && this.currentNode!=="node0") {
                          this.updateNodeWithSquare(this.currentNode, value);
                        }
                        this.handleNodeClick(this.currentNode)
                      }
                      else if(key==="view_type"){
                        if(completePath[index-1].operator!=="count"){
                          store.commit('setSelectedOperator',"view type")
                          this.showOperator(this.currentNode,"view type");
                          this.AddViewType(this.currentNode, value);
                        }
                        else{
                          this.handleNodeClick(this.currentNode);
                        }
                      }
                    }
                  }
                  else{
                    for (const [key, value] of Object.entries(item)) {
                      if(key==="operator"){
                        this.showOperator(this.currentNode,value);
                        this.handleNodeClick(this.currentNode);
                      }
                      // 这里的value是属性
                      else if(key==="parameter"){
                        if (this.currentNode && this.currentNode!=="node0") {
                          this.updateNodeWithSquare(this.currentNode, value);
                        }
                        this.handleNodeClick(this.currentNode)
                      }
                      //   这里是属性的取值范围
                      else if(key==="range"){
                        this.$store.dispatch('saveIsSelectParameter');
                        this.$store.dispatch('saveFilterParam',value)
                      }
                    }
                  }
                }
              });
            }
          }
        }
      },
      deep:true
    }
},
  mounted() {
    this.setupGraph();
  },
  methods: {
    hasContentInLastParentheses(str) {
      // 找到最后一个左括号的位置
      const lastOpen = str.lastIndexOf('(');
      // 找到最后一个右括号的位置
      const lastClose = str.lastIndexOf(')');

      // 如果没有括号或者括号位置不正确，返回 false
      if (lastOpen === -1 || lastClose === -1 || lastClose < lastOpen) {
        return false;
      }

      // 判断括号之间是否有内容
      return str.substring(lastOpen + 1, lastClose).trim() !== '';
    },

    updateInteractiveElements (nodeId, newX, newWidth) {
      // 更新 interactiveRect 的位置
      d3.selectAll(`.interactiveRect${nodeId}`)
          .attr("x", newX-newWidth/2)

      // 更新 textElem 的位置
      d3.selectAll(`.textElem${nodeId}`)
          .attr("x", newX)

    },
    closeHandler() {
      // 关闭弹窗的逻辑
      this.popupVisible = false; // 将弹窗状态设置为不可见
    },
    closeEventHandler() {
      // 关闭弹窗的逻辑
      this.eventPopupVisible = false; // 将弹窗状态设置为不可见
    },
    closeEventDataHandler() {
      // 关闭弹窗的逻辑
      this.eventDataPopupVisible = false; // 将弹窗状态设置为不可见
    },
    onNodePositionChange() {
      // 重新计算路径
      this.linksData.forEach(link => {
        const sourceNode = this.graph.node(link.source);
        const targetNode = this.graph.node(link.target);
        const newPath = this.calculateArcPath(sourceNode, targetNode);
        d3.select(`#${link.source}-${link.target}`).attr('d', newPath);
        // 更新textPath的路径
        d3.select(`#textPath-${link.source}-${link.target}`).attr('d', newPath);
      });
    },

    // 将历史记录转换为可以画图的形式
    parseChainExpression(expression) {
      // 定义正则表达式，用于匹配操作符和参数
      const pattern = /(\w+)(?:\(([^)]*)\))?/;
      // 使用正则表达式来匹配整个链式操作
      const parts = expression.match(/(\w+)(?:\(([^)]*)\))?/g);
      // 结果数组
      const result = [];
      // 第一个部分是数据起点
      result.push({ node: parts[0] });
      // 操作符计数器
      const operatorCount = {};
      // 解析后续的链式操作
      for (let i = 1; i < parts.length; i++) {
        const match = parts[i].match(pattern);
        if (match) {
          const operator = match[1]; // 操作符
          const parameter = match[2]; // 参数

          // 更新操作符计数
          if (!operatorCount[operator]) {
            operatorCount[operator] = 0;
          }
          operatorCount[operator] += 1;

          // 特殊处理 view_type 操作
          if (operator === "view_type" && parameter) {
            // 将 view_type 作为键，参数作为值
            result.push({
              [operator]: parameter.replace(/^['"]|['"]$/g, '') // 去掉引号
            });
          } else {
            // 添加操作符信息
            const operatorEntry = { operator: operator };
            if (operator === "filter") {
              operatorEntry.occurrence = operatorCount[operator]; // 记录出现次数
            }
            result.push(operatorEntry);

            // 处理参数
            if (parameter) {
              if (operator === "filter") {
                // 对于 filter 操作，只提取第一个引号中的内容
                const filterMatches = parameter.match(/['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*(\[[^\]]*\])/);

                if (filterMatches && filterMatches.length >= 4) {
                  const paramName = filterMatches[1]; // 提取第一个引号内的内容，即 "Borough"
                  const rangeString = filterMatches[3]; // 提取第三部分的字符串，即 ['Manhattan', 'Bronox']
                  // 使用正则表达式提取列表中的所有元素
                  const rangeValue = rangeString
                      .slice(1, -1) // 去掉开头和结尾的方括号
                      .split(',') // 按逗号分割字符串
                      .map(item => item.trim().replace(/['"]/g, '')); // 去掉多余的空格和引号
                  result.push({
                    parameter: paramName,
                    range: [rangeValue]
                  });
                }
              } else {
                // 其他操作，提取完整参数并去掉引号
                result.push({ parameter: parameter.replace(/^['"]|['"]$/g, '') });
              }
            }
          }
        }
      }
      return result;
    },

    clearAll(){
      this.popupVisible = false
      if(this.nodes.length!==0){
        this.deleteNode("node0")
      }
      this.nodes = []
      this.edges = []
      this.nextNodeId = 0
      this.nextEdgeId = 1
      this.currentNode = null
      this.graph = new dagreD3.graphlib.Graph().setGraph({})
      this.$store.dispatch('clearSelectedParameter');

      const divElement = document.getElementsByClassName('workflowArea')[0]
      if(divElement.firstChild){
        while (divElement.firstChild) {
          divElement.removeChild(divElement.firstChild);
        }
      }

      this.pathData= {}
    },

    importExample(){
      this.clearAll()
      this.setupGraph()
      this.addNode(store.state.sheetName);
      this.$store.dispatch('clearCurExpression');
      this.$store.dispatch('saveSelectedOperator',"");
      this.showOperator(this.currentNode,"group by");
      this.updateNodeWithSquare(this.currentNode, store.state.sheetData[0]);
      store.commit('setSelectedOperator',"view type")
      this.showOperator(this.currentNode,"view type");
      this.AddViewType(this.currentNode, "timeline");
      this.handleNodeClick(this.currentNode)
    },

    showAll(){
      const svg = d3.select(".svgArea")
      svg.selectAll('.mylink').style('visibility', 'visible');
      svg.selectAll('.linkText').style('visibility', 'visible');
      svg.selectAll('.node').style('visibility', 'visible');
      svg.selectAll('.mypath').style('visibility', 'visible');
      svg.selectAll('.edgeLabel').style('visibility', 'visible');
    },

    setupGraph() {
      const container = document.getElementsByClassName('grid-item block3')[0]
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const ranksep = 0.1*containerHeight
      // 初始化图形设置
      this.graph.setGraph({ rankdir: 'TB', edgesep: 5, ranksep: ranksep,  nodesep: 40, });
      // 设置 SVG 和渲染器
      const offsetX = 0.05*containerWidth; // 水平偏移量
      const offsetY = 0.285*containerHeight; // 垂直偏移量
      const svg = d3.select(".workflowArea").append("svg").attr('width', containerWidth).attr('height', containerHeight)
          .attr("class",'svgArea')

      const inner = svg.append("g")
          .attr("transform", `translate(${offsetX}, ${offsetY})`).attr("class",'innerArea')

      // 用来后续更新图形
      this.updateGraph = () => {
        if (inner) {
          inner.call(this.render, this.graph);
          this.bindNodeEvents();
        }
        // 检查每个节点的位置是否发生了变化
        this.graph.nodes().forEach((nodeId) => {
          const node = this.graph.node(nodeId);
          const prevPosition = this.nodePositions[nodeId];

          if (!prevPosition || node.x !== prevPosition.x || node.y !== prevPosition.y) {
            this.onNodePositionChange(node);
            // 更新存储的位置
            this.nodePositions[nodeId] = { x: node.x, y: node.y };
          }

          this.updateInteractiveElements(nodeId, node.x, node.width);
        });
      };
      this.updateGraph();
    },

    addNode(data,className) {
      const newNodeId = `node${this.nextNodeId++}`;

      const container = document.getElementsByClassName('grid-item block3')[0]
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const rectHeight = 0.07*containerHeight
      const rectWidth = 0.035*containerWidth
      this.nodes.push({ id: newNodeId, label: data});
      let nodeClass
      if(className){
        nodeClass = className
      }
      else nodeClass = newNodeId
      if(data === " "){
        this.graph.setNode(newNodeId, { label: data, id:newNodeId, class:nodeClass,
          style:"fill:#7F73AC;cursor:pointer;border:#a3c0d7",
          height: rectHeight,
          width:rectWidth,
          rx: 2,
          ry: 2});
      }
      else{
        this.graph.setNode(newNodeId, { label: data, id:newNodeId,class:nodeClass,
          style:"fill:#7F73AC;cursor:pointer",
          height: rectHeight,
          width:rectWidth,
          rx: 2,
          ry: 2,
          labelStyle: "fill:white;font-size:15px;font-weight:middle;font-family:'Roboto Condensed', sans-serif",
        });
      }
      this.currentNode = newNodeId;
      this.updateGraph();
    },

    addEdge(source, operation, target) {
      this.edges.push({ source: source, target: target, label: operation, id: source+"-"+target });
      if (["view type"].includes(this.selectedOperator)) {
        this.graph.setEdge(source, target, { label: operation,class:"mypath",id: source+"-"+target,
          style: "fill:none;stroke:grey;stroke-width:1.5px;cursor:pointer",
          labelStyle: "fill:transparent;font-weight:middle;font-size:80%;",
          arrowhead:"undirected",
          arrowheadStyle:"fill:grey;" });
        this.updateGraph();
      }
      else{
        const curLink = { source: source, target: target, label: operation,id: source+"-"+target }
        this.linksData.push(curLink);
        const sourceNode = this.graph.node(source);
        const targetNode = this.graph.node(target);
        // 计算弧线的路径
        const pathData = this.calculateArcPath(sourceNode, targetNode);

        // 重新计算所有路径
        const svg = d3.select(".svgArea");
        const links = svg.selectAll('.mylink')
            .data(this.linksData, d => `${d.source}-${d.target}`);
        // 处理新元素
        links.enter()
            .append('path')
            .attr('class', 'mylink')
            .merge(links)  // 合并新元素和已存在元素
            .attr('d', d => this.calculateArcPath(this.graph.node(d.source), this.graph.node(d.target)))
            .attr('stroke', 'grey')
            .attr('cursor', 'pointer')
            .attr('fill', 'none')
            .attr('stroke-width', 1.5)
            .attr("source", d => `${d.source}`)
            .attr("target", d => `${d.target}`)
            .attr("id", d => `${d.source}-${d.target}`)
            // .attr('marker-end', 'url(#vee-arrowhead)');  // 使用 V 形箭头标记
        // 处理删除的元素
        links.exit().remove();

        // 为每个弧线生成唯一的ID
        const uniqueId = `textPath-${source}-${target}`;
        // 添加 <defs> 元素
        const defs = svg.append('defs');
        // 为每个 label 创建 <textPath>
        const linkTextPaths = defs.selectAll('.linkTextPath')
            .data(this.linksData)
            .enter()
            .append('path')
            .attr('id', `${uniqueId}`)
            .attr('d', pathData);
        // 添加 label 到每个弧线
        const linksTexts = svg.selectAll('.linkText')
            .data(this.linksData)
            .enter()
            .append('text')
            .attr('dy', -7)  // 垂直方向微调
            .append('textPath')
            .attr('xlink:href', (_, i) => `#${uniqueId}`)
            .text(operation)
            .attr('class', 'linkText')
            .attr("id", d => {return `${d.source}-${d.target}`})
            .style('fill', '#B05817')
            .style('font-weight','middle')
            .style('font-size','80%')
            .style('font-family', 'Roboto Condensed, sans-serif')
            .attr('startOffset', '95%')
            .attr('text-anchor', 'end');

        const marker = svg.append('defs')
            .append('marker')
            .attr('id', 'vee-arrowhead')
            .attr('viewBox', '-0 -5 10 10')  // 设置视图框
            .attr('refX',6)  // 箭头坐标
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', "2%")  // 箭头大小
            .attr('markerHeight', "2%")
            .attr('xoverflow', 'visible');

        marker.append('svg:path')
            .attr('d', 'M0,-4L8,0L0,4L3,0L0,-4')
            .attr('fill', 'grey'); // 箭头颜色
      }
    },

    calculateArcPath(sourceNode, targetNode) {
      const container = document.getElementsByClassName('grid-item block3')[0]
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const offsetX = 0.05*containerWidth;
      const offsetY = 0.28*containerHeight;
      const height = 0.06*containerHeight
      // 根据需要计算弧线的路径，这里简化为一个弧线
      const sourcePosition = getNodePosition(sourceNode);
      const targetPosition = getNodePosition(targetNode);
      const distance = Math.sqrt(
          Math.pow(targetPosition.x - sourcePosition.x, 2) +
          Math.pow(targetPosition.y - sourcePosition.y, 2)
      );

      // 调整控制点的偏移量，根据距离来确定弧度
      const controlPointOffset = distance * 0.25;

      const curvePath = d3.path();
      curvePath.moveTo(sourcePosition.x+offsetX, sourcePosition.y+offsetY-height);
      curvePath.quadraticCurveTo(
          (sourcePosition.x + targetPosition.x) / 2+offsetX,
          (sourcePosition.y + targetPosition.y) / 2+offsetY-height - controlPointOffset,
          targetPosition.x+offsetX,
          targetPosition.y+offsetY-height
      );

      return curvePath.toString();
    },

    // 为节点和边绑定事件
    bindNodeEvents() {
      const svg = d3.select(".svgArea")

      this.nodes.forEach(node => {
        const nodeGroup = d3.select(`#${node.id}`);

        const nodeWidth = nodeGroup.node().getBoundingClientRect().width;
        const nodeHeight = nodeGroup.node().getBoundingClientRect().height;

        // 添加删除图标
        // 把它及之后的节点和连线都删除
        if (nodeGroup.select('.delete-related-icon').empty()) {
          nodeGroup.append('image')
              .attr('class', 'delete-related-icon')
              .attr('href', deleteRelatedNode) // 引用图片路径
              .attr('x', nodeWidth*0.41) // 将图标放置在节点右上角
              .attr('y', -nodeHeight*0.6)
              .attr('width', 12) // 图标宽度（根据实际需求调整）
              .attr('height', 12) // 图标高度（根据实际需求调整）
              .attr("cursor","pointer")
              .on('click', (event) => {
                event.stopPropagation(); // 阻止冒泡，避免触发节点点击事件
                // 获取当前节点的 id
                const nodeId = d3.select(event.currentTarget).node().parentNode.id;
                this.deleteNode(nodeId)
              })
          .style('display', 'none') // 默认隐藏
        }

        //只删除该节点
        if (nodeGroup.select('.delete-single-icon').empty()) {
          nodeGroup.append('image')
              .attr('class', 'delete-single-icon')
              .attr('href', deleteSingleNode) // 引用图片路径
              .attr('x', nodeWidth*0.28) // 将图标放置在节点右上角
              .attr('y', -nodeHeight*0.6)
              .attr('width', 12) // 图标宽度（根据实际需求调整）
              .attr('height', 12) // 图标高度（根据实际需求调整）
              .attr("cursor","pointer")
              .on('click', (event) => {
                event.stopPropagation(); // 阻止冒泡，避免触发节点点击事件
                event.stopPropagation(); // 阻止冒泡，避免触发节点点击事件
                // 获取当前节点的 id
                const nodeId = d3.select(event.currentTarget).node().parentNode.id;
                this.deleteSingleNode(nodeId)
              })
          .style('display', 'none') // 默认隐藏
        }


        d3.select(`#${node.id}`).on('click', () => {
          // 点击节点的处理逻辑
          this.handleNodeClick(node.id);
        });
        // 悬浮事件
        d3.select(`#${node.id}`).on('mouseover', () => {
          // 更新所有连线的颜色为蓝色
          svg.selectAll('.mylink')
              .style('stroke', function () {
                const linkId = d3.select(this).attr('id');
                return linkId.includes(node.id) ? '#69b3b2' : 'grey';
              })

          // 显示两个删除图标
          nodeGroup.select('.delete-related-icon').style('display', 'inline');
          nodeGroup.select('.delete-single-icon').style('display', 'inline');

        });
        d3.select(`#${node.id}`).on('mouseout', () => {
          // 移出事件的处理逻辑
          svg.selectAll('.mylink')
              .style('stroke', 'grey')
              .style('stroke-width', 1.5);

          // 隐藏两个删除图标
          nodeGroup.select('.delete-related-icon').style('display', 'none');
          nodeGroup.select('.delete-single-icon').style('display', 'none');
        });

      });

      this.edges.forEach(edge => {
        d3.select(`#${edge.id}`).on('click', () => {
          // 点击节点的处理逻辑
          this.handleEdgeClick(edge.id);
        });
        // // 悬浮事件
        // d3.select(`#${node.id}`).on('mouseover', () => {
        //   // 更新所有连线的颜色为蓝色
        //   svg.selectAll('.mylink')
        //       .style('stroke', function () {
        //         const linkId = d3.select(this).attr('id');
        //         return linkId.includes(node.id) ? '#69b3b2' : 'grey';
        //       })
        // });
        // d3.select(`#${node.id}`).on('mouseout', () => {
        //   // 移出事件的处理逻辑
        //   svg.selectAll('.mylink')
        //       .style('stroke', 'grey')
        //       .style('stroke-width', 1.5);
        // });
      });
    },

    createPopUp(completePath){
      // 筛选出包含 'operation' 键的对象，并提取其值
      const operationsArray = completePath
          .filter(item => item.operator) // 筛选出含有 'operator' 键的对象
          .map(item => item.operator); // 提取这些对象的 'operator' 键的值

      const operaLength = operationsArray.length
      const lastOperation = operationsArray[operaLength-1]

      store.dispatch('saveSelectedOperator', lastOperation);

      const codeContext = store.state.curExpression

      // const [dataKey] = codeContext.split(".");
      // const originalData = store.state.originalTableData[dataKey]
      const originalData = store.state.originalTableData[store.state.sheetName]

      const allKeys = Object.keys(originalData)
      if(lastOperation==="filter"){
        const uniqueProperties = {};// 遍历对象的每个键
        Object.keys(originalData).forEach(key => {
          if((!key.includes("时间"))||(!key.includes("time"))){
            const uniqueValues = new Set(originalData[key]);
            // 将 Set 转换为数组并存储在结果对象中
            uniqueProperties[key] = Array.from(uniqueValues);
          }
        });
        this.displayParam = "filter"
        this.checkboxOptions = uniqueProperties
      }
      else if(lastOperation==="align"){
        const uniqueProperties = {};// 遍历对象的每个键
        Object.keys(originalData).forEach(key => {
          if((!key.includes("时间"))||(!key.includes("time"))){
            const uniqueValues = new Set(originalData[key]);
            // 将 Set 转换为数组并存储在结果对象中
            uniqueProperties[key] = Array.from(uniqueValues);
          }
        });
        this.alignOptions = uniqueProperties
        this.displayParam = "align"
      }
      else if(lastOperation==="unique_count"){
        this.displayParam = "unique_count"
        this.popupParam = allKeys
      }
      else{
        this.displayParam = "else"
        this.popupParam = allKeys
      }
      if(lastOperation!=="view_type"){
        // 获取下一步可能的操作和可视化构型
        axios.post('http://127.0.0.1:5000/next_opera_vis', { operation: operationsArray})
            .then(response => {
              const operationList = response.data["operationList"]
              const visualizationList = response.data["visualizationList"]
              this.popupOperation=operationList
              this.popupVisualization=visualizationList

              this.popupVisImg = this.images.filter(img => visualizationList.includes(img.vis));
              if(lastOperation==="group"||lastOperation==="flatten"||lastOperation==="pattern"){
                const groupNum = operationsArray.filter(item => item === "group").length;
                const flattenNum = operationsArray.filter(item => item === "flatten").length;
                // 计算group_by和flatten的数量差
                const diff = groupNum - flattenNum
                // 检查是否以count/unique_count结束
                if (diff === 1){
                  this.popupVisualization.push("bar chart", "pie chart")
                  this.popupVisImg = this.images.filter(img => this.popupVisualization.includes(img.vis));
                }
                else if (diff > 1){
                  this.popupVisualization.push("sunburst")
                  this.popupVisImg = this.images.filter(img => this.popupVisualization.includes(img.vis));
                }
              }
            })
            .catch(error => {
              console.error(error);
            });
        this.popupVisible = true;
      }
      else{
        this.popupVisible = false;
      }
    },

    findSourceNode(targetNode,links) {
      // 判断 links 是否为 null 或 undefined 或空数组
      if (!links || links.length === 0) {
        return 'node0';
      }

      // 初始化当前节点
      let currentNode = targetNode;
      // 递归查找当前 target 的起点，直到找不到为止
      while (true) {
        // 查找当前节点的起点
        let link = links.find(line => line.target === currentNode);

        // 如果找不到 link，说明已到达链条的开头
        if (!link) {
          return currentNode;
        }
        // 更新当前节点为找到的 source，继续向前查找
        currentNode = link.source;
      }
    },

    extractOperations(code) {
      const matches = code.match(/\.(\w+)\(/g) || [];
      return matches.map(match => match.slice(1, -1));
      },

    // 处理节点点击事件的逻辑
    handleNodeClick(nodeId,highlight = true) {
      // 阻止事件冒泡
      event.stopPropagation();
      // 获取点击节点
      const clickNode = this.graph.node(nodeId);
      // 为当前节点设置高亮效果
      if(highlight){
        this.highlightNode(clickNode)
      }

      const container = document.getElementsByClassName('grid-item block3')[0]
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const offsetX = 0.05*containerWidth; // 水平偏移量

      if(highlight){
        this.popupLeft = clickNode.x + offsetX+65;
        this.popupTop = clickNode.y +30;
      }
      else{
        this.popupLeft = clickNode.x + offsetX+95;
        this.popupTop = clickNode.y - 10;
      }

      this.updateGraph()
      // 设置当前节点
      this.currentNode = nodeId;

      const beginning = this.findSourceNode(nodeId,this.edges)

      let truePathToNode = this.findPath(beginning, nodeId);

      let pathToNode = this.findPath('node0', nodeId);

      const nodes = pathToNode.nodes
      const edges = pathToNode.edges

      const trueNodes = truePathToNode.nodes
      const trueEdges = truePathToNode.edges
      // 筛选出标签为"filter"的边，并提取这些边的target属性
      const targets = edges.filter(link => link.label === "filter").map(link => link.target);

      const filterTargets = targets.sort((a, b) => {
        // 提取出数字部分进行比较
        const numberA = parseInt(a.replace("node", ""), 10);
        const numberB = parseInt(b.replace("node", ""), 10);
        return numberA - numberB;
      });

      let completePath

      completePath = this.createCompletePaths(nodes, edges)

      // if(nodes.length!==0){
      //   completePath = this.createCompletePaths(nodes, edges)
      // }
      // else{
      //   completePath = this.createCompletePaths(trueNodes, trueEdges)
      // }

      if(completePath.length!==0){
        // 初始状态，还没有进行任何操作
        if(typeof(completePath)=="string"){
          // this.filterExpression = {}
          this.$store.dispatch('saveCurExpression',completePath);
          this.popupParam = []
          // 获取下一步可能的操作和可视化构型
          const operationList = ["filter", "unique_attr", "unique_count", "group"]
          const visualizationList = ["table"]
          this.popupOperation=operationList
          this.popupVisualization=visualizationList
          this.popupVisImg = this.images.filter(img => visualizationList.includes(img.vis));
          this.popupVisible = true;

          this.$store.dispatch('saveNodeId', nodeId);
        }
        else{
          let filterCount = 0;
          // 遍历数据，记录每个operator为filter的数据项是第几次出现
          completePath = completePath.map((item, index) => {
            // 如果当前项的operator是filter
            if (item.operator === 'filter') {
              filterCount += 1; // 增加计数
              return { ...item, occurrence: filterCount }; // 返回当前项并附加出现次数
            }
            return item; // 如果当前项不是operator为filter的项，则原样返回
          });
          completePath.forEach((item,index) => {
            // 获取对象的键和值
            let key = Object.keys(item)[0];
            let value = item[key];
            if(key === "node"){
              this.$store.dispatch('saveCurExpression',value);
            }
            else if(key === "operator"){
              this.$store.dispatch('saveCurExpression',this.$store.state.curExpression + '.' + value + "()");
            }
            else if(key === "parameter"){
              const lastIndex = index-1
              const lastKey = Object.keys(completePath[lastIndex])[0];
              // const lastValue = completePath[lastIndex][lastKey];

              const allOper = this.extractOperations(store.state.curExpression);
              const lastValue = allOper[allOper.length-1]

              //更新表达式
              const curExpression = this.$store.state.curExpression
              let newExpression = addParameter(curExpression, value)
              if(lastValue==="filter"){
                if(value==="subsequence"){
                  const filterNodeId = filterTargets[completePath[lastIndex]["occurrence"]-1]
                  if(this.filterExpression.hasOwnProperty(filterNodeId)){
                    newExpression = this.filterExpression[filterNodeId];
                  }
                }
                else if(value!=="time"){
                  const filterNodeId = filterTargets[completePath[lastIndex]["occurrence"]-1]
                  if(this.filterExpression.hasOwnProperty(filterNodeId)){
                    newExpression = this.filterExpression[filterNodeId];
                  }
                  else{
                    newExpression = enhanceFilterExpression(newExpression, this.filterParam);
                    this.filterExpression[filterNodeId] = newExpression
                  }
                }
                else{
                  const filterNodeId = filterTargets[completePath[lastIndex]["occurrence"]-1]
                  if(this.filterExpression.hasOwnProperty(filterNodeId)){
                    newExpression = this.filterExpression[filterNodeId];
                  }
                  else{
                    const insert_template = "filterTimeRange('{startTime}','{endTime}')"
                    newExpression = enhanceFilterTimeExpression(newExpression, insert_template, this.filterParam[0], this.filterParam[1]).replace('.filter("time")', '');
                    this.filterExpression[filterNodeId] = newExpression
                  }
                }
              }
              if(lastValue==="align"){
                newExpression = enhanceAlignExpression(newExpression, this.alignParam[0]);
              }
              this.$store.dispatch('saveCurExpression',newExpression);
              if(lastValue==="view_type"){
                this.$store.dispatch('saveVisualType', value);
                this.$store.dispatch('saveNodeId', nodeId);
              }
            }
          });
          this.createPopUp(completePath)

          if(nodeId===this.nodeInEdge){
            this.$store.dispatch('saveCurNodeExpression',store.state.curExpression);
          }
        }
      }
      else{
        const className = clickNode.class
        if(className!==clickNode.id){
          this.interactiveNodeId = clickNode.id
          this.$store.dispatch('saveCurExpression',className);
          this.popupParam = []
          // 获取下一步可能的操作和可视化构型
          axios.post('http://127.0.0.1:5000/next_opera_vis', { operation: []})
              .then(response => {
                const operationList = response.data["operationList"]
                const visualizationList = response.data["visualizationList"]
                this.popupOperation=operationList
                this.popupVisualization=visualizationList
                // 使用数组过滤方法来筛选保留符合条件的图片
                this.popupVisImg = this.images.filter(img => visualizationList.includes(img.vis));
                this.popupVisible = true;
              })
              .catch(error => {
                console.error(error);
              });
        }
        else{
          let filterCount = 0;
          let pathToNode = this.findPath(this.interactiveNodeId, nodeId);
          const curInteractiveNode = this.graph.node(this.interactiveNodeId);
          const originalExpression = curInteractiveNode.class
          const nodes = pathToNode.nodes
          const edges = pathToNode.edges
          let completePath = this.createCompletePaths(nodes, edges)
          // 遍历数据，记录每个operator为filter的数据项是第几次出现
          completePath = completePath.map((item, index) => {
            if (item.operator === 'filter') {
              filterCount += 1; // 增加计数
              return { ...item, occurrence: filterCount }; // 返回当前项并附加出现次数
            }
            return item;
          });
          completePath.forEach((item,index) => {
            // 获取对象的键和值
            let key = Object.keys(item)[0];
            let value = item[key];
            if(key === "node"){
              this.$store.dispatch('saveCurExpression',originalExpression);
            }
            else if(key === "operator"){
              this.$store.dispatch('saveCurExpression',this.$store.state.curExpression + '.' + value + "()");
            }
            else if(key === "parameter"){
              const lastIndex = index-1
              const lastKey = Object.keys(completePath[lastIndex])[0];
              const lastValue = completePath[index-1][lastKey];
              //更新表达式

              const curExpression = this.$store.state.curExpression

              let newExpression = addParameter(curExpression, value)
              if(lastValue==="filter"){
                if(value!=="time"){
                  const filterNodeId = filterTargets[completePath[lastIndex]["occurrence"]-1]
                  if(this.filterExpression.hasOwnProperty(filterNodeId)){
                    newExpression = this.filterExpression[filterNodeId];
                  }
                  else{
                    newExpression = enhanceFilterExpression(newExpression, this.filterParam);
                    this.filterExpression[filterNodeId] = newExpression
                  }
                }
                else{
                  const filterNodeId = filterTargets[completePath[lastIndex]["occurrence"]-1]
                  if(this.filterExpression.hasOwnProperty(filterNodeId)){
                    newExpression = this.filterExpression[filterNodeId];
                  }
                  else{
                    const insert_template = "filterTimeRange('{startTime}','{endTime}')"
                    newExpression = enhanceFilterTimeExpression(newExpression, insert_template, this.filterParam[0], this.filterParam[1]).replace('.filter("time")', '');
                    this.filterExpression[filterNodeId] = newExpression
                  }
                }
              }
              if(lastValue==="align"){
                newExpression = enhanceAlignExpression(newExpression, this.alignParam[0]);
              }
              this.$store.dispatch('saveCurExpression',newExpression);
              if(lastValue==="view_type"){
                this.$store.dispatch('saveVisualType', value);
                this.$store.dispatch('saveNodeId', nodeId);
              }
            }
          });
          this.createPopUp(completePath)
        }
      }

      this.$store.dispatch('saveIsSelectNode');

      if (!this.pathData[store.state.curExpression]){
        if(nodes.length !== 0){
          this.pathData[store.state.curExpression] = nodes
        }
        else{
          this.pathData[store.state.curExpression] = trueNodes
        }
      }
    },

    // 处理节点点击事件的逻辑
    handleEdgeClick(edgeId) {
      // 阻止事件冒泡
      event.stopPropagation();

      // 为当前节点设置高亮效果
      this.highlightEdge(edgeId)

      this.curClickEdge = edgeId
      const selectedEdge = d3.select(`#${edgeId}`);

      const sourceId = selectedEdge.attr('source'); // 获取路径的 d 属性

      this.nodeInEdge = "node"+this.nextNodeId

      this.handleNodeClick(sourceId, false)
    },
    showOperator(nodeId, operation) {
      if (operation && this.graph.node(nodeId)) {
        const newNodeId = `node${this.nextNodeId}`;
        this.addNode(" ");
        this.addEdge(nodeId, operation.replace("_", " "), newNodeId);
        if(operation==="count"){
          const nextNodeId = `node${this.nextNodeId}`;
          store.commit('setSelectedOperator',"view type")
          this.addNode(" ");

          this.addEdge(newNodeId, "view type", nextNodeId);

          // 显示从起点到当前节点的路径信息
          const beginning = this.findSourceNode(nodeId,this.edges)

          let pathToNode = this.findPath(beginning, nodeId);

          const nodes = pathToNode.nodes
          const edges = pathToNode.edges
          const completePath = this.createCompletePaths(nodes, edges)

          const operationsArray = completePath
              .filter(item => item.operator) // 筛选出含有 'operator' 键的对象
              .map(item => item.operator); // 提取这些对象的 'operator' 键的值
          const groupNum = operationsArray.filter(item => item === "group").length;
          const flattenNum = operationsArray.filter(item => item === "flatten").length;
          // 计算group_by和flatten的数量差
          const diff = groupNum - flattenNum
          if (diff === 1){
            if(store.state.visualType==="pie chart"){
              store.commit('setSelectedViewType',"pie chart")
              this.AddViewType(this.currentNode, "pie chart");
            }
           else{
              store.commit('setSelectedViewType',"bar chart")
              this.AddViewType(this.currentNode, "bar chart");
              // store.commit('setSelectedViewType',"pie chart")
              // this.AddViewType(this.currentNode, "pie chart");
            }
          }
          else if (diff > 1){
            store.commit('setSelectedViewType',"sunburst")
            this.AddViewType(this.currentNode, "sunburst");
          }

          this.popupVisible = false
        }
        else if(operation==="segment"){
          const nextNodeId = `node${this.nextNodeId}`;
          store.commit('setSelectedOperator',"view type")
          this.addNode(" ");

          this.addEdge(newNodeId, "view type", nextNodeId);

          store.commit('setSelectedViewType',"timeline")
          this.AddViewType(this.currentNode, "timeline");
          this.popupVisible = false
        }
        else if(operation==="sum"||operation==="avg"){
          const nextNodeId = `node${this.nextNodeId}`;
          store.commit('setSelectedOperator',"view type")
          this.addNode(" ");

          this.addEdge(newNodeId, "view type", nextNodeId);

          store.commit('setSelectedViewType',"sunburst")
          this.AddViewType(this.currentNode, "line chart");


          this.popupVisible = false
        }
        // else if(operation==="group by"){
        //   const nextNodeId = `node${this.nextNodeId}`;
        //   store.commit('setSelectedOperator',"view type")
        //   // this.addNode(" ");
        //   // this.addEdge(newNodeId, "view type", nextNodeId);
        //   // if(store.state.visualType==="Sankey"){
        //   //   this.AddViewType(this.currentNode, "Sankey");
        //   // }
        //   // else{
        //   //   store.commit('setSelectedViewType',"timeLine")
        //   //   this.AddViewType(this.currentNode, "timeLine");
        //   // }
        // }
      }
    },

    highlightNode(node) {
      this.nodes.forEach(n => {
        const oldNode = this.graph.node(n.id);
        const allVis = ['timeline', 'sankey', 'bar chart','pie chart', 'line chart', 'heatmap','table','sunburst','scatter']

        // if(n.id!=="node0"){
        //   this.graph.setNode(n.id, {...oldNode, style: "fill:#7F73AC;cursor:pointer;stroke:#7F73AC;stroke-width:6px"}); // 重置为原始样式
        // }
        // else{
        //   this.graph.setNode(n.id, {...oldNode, style: "fill:#7F73AC;cursor:pointer;stroke:#7F73AC;stroke-width:6px"}); // 重置为原始样式
        // }

        if(allVis.includes(oldNode.label)){
          this.graph.setNode(n.id, {...oldNode, style: "fill:#FEDFB5;cursor:pointer;stroke:#7F73AC;stroke-width:0px"}); // 重置为原始样式
        }
        else{
          this.graph.setNode(n.id, {...oldNode, style: "fill:#7F73AC;cursor:pointer;stroke:#7F73AC;stroke-width:0px"}); // 重置为原始样式
        }

      })
      // this.graph.setNode(node.id, {...node, style: "fill:#7F73AC;cursor:pointer;stroke:#7F73AC;stroke-width:6px"});
    },

    highlightEdge(edgeId) {
        // 将指定连线的颜色更新为红色
        d3.selectAll('.mylink')
            .style('stroke', function () {
              const linkId = d3.select(this).attr('id');
              return linkId === edgeId ? '#e47470' : 'grey';
            })
    },

    // 在数据节点中加入参数文字
    updateNodeWithSquare(nodeId, text) {
      const nodeElem = d3.select(`#${nodeId}`);
      const node = this.graph.node(nodeId);

      const existingSquares = nodeElem.selectAll('rect');
      const rectWidth =  node.width/2
      const rectHeight = rectWidth/2
      const spacing = rectHeight/2; // 矩形块之间的间距
      const translateY = rectHeight/2+1
      let xPosition, yPosition
      if(existingSquares.size()<=4) {
        if (existingSquares.size() <= 2) {
          // 更新现有矩形的位置
          existingSquares.each(function () {
            d3.select(this)
                .attr('y', d => parseFloat(d3.select(this).attr('y')) - translateY);
          });
          // 同步更新对应的文本位置
          const existingTexts = nodeElem.selectAll('text');
          existingTexts.each(function () {
            d3.select(this)
                .attr('y', d => parseFloat(d3.select(this).attr('y')) - translateY);
          });
          xPosition = -(rectWidth / 2);
          yPosition = -(rectHeight / 2) + spacing * (existingSquares.size() - 1);
        } else {
          if (existingSquares.size() === 3) {
            existingSquares.each(function (_, i) {
              const newX = parseFloat(d3.select(this).attr('x'));
              // 根据索引判断是否需要进行平移
              const adjustedX = i <= 2 ? newX - translateY * 2 : newX;
              d3.select(this).attr('x', adjustedX);
            });
            // 同步更新对应的文本位置
            const existingTexts = nodeElem.selectAll('text');
            existingTexts.each(function (_, i) {
              const newX = parseFloat(d3.select(this).attr('x'));
              // 根据索引判断是否需要进行平移
              const adjustedX = i <= 2 ? newX - translateY * 2 : newX;
              d3.select(this).attr('x', adjustedX);
            });
          }
          xPosition = 2;
          yPosition = -rectHeight / 2 - translateY;
          if (existingSquares.size() === 4) {
            xPosition = 2;
            yPosition = -(rectHeight / 2) + spacing * (existingSquares.size() - 3)
          }
        }
        const newSquare = nodeElem.append('g'); // 使用 'g' 元素来组合正方形和文本
        newSquare.append('rect')
            .attr('x', xPosition)
            .attr('y', yPosition)
            .attr('width', rectWidth)
            .attr('height', rectHeight)
            .style('fill', 'transparent');
        // 添加有限长度的文字
        const maxTextLength = 12; // 最大文本长度
        let displayText = text.length > maxTextLength ? text.substring(0, maxTextLength) + '...' : text;
        let CircleText = text.length > 1 ? text.substring(0, maxTextLength) : text;
        // 添加文字
        const textElem = newSquare.append('text')
            .attr('x', xPosition + rectWidth / 2)
            .attr('y', yPosition + rectHeight / 2 +5)
            .attr('text-anchor', 'middle')
            .text(displayText)
            .attr('id', text) // 设置 ID
            .style("fill", "white")
            .style("font-size", "14px")
            .style("font-weight", "middle");

        // 鼠标悬浮事件显示完整文本
        newSquare.on('mouseover', () => textElem.text(text));
        newSquare.on('mouseout', () => textElem.text(displayText));
        this.maxText += CircleText
        // 更新节点的 label 属性
        this.graph.setNode(nodeId, {
          ...node,
          label: text,
          labelStyle: "fill:rgba(0, 0, 0, 0);font-size:15px;font-weight:middle"
        });
        this.updateGraph();
      }
    },

    AddViewType(nodeId, text) {
      const container = document.getElementsByClassName('grid-item block3')[0]
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const nodeElem = d3.select(`#${nodeId}`);
      nodeElem.selectAll(".view_type").remove()
      const node = this.graph.node(nodeId);
      const rectWidth =  0.05*containerWidth;
      const rectHeight = 0.12*containerHeight
      let xPosition, yPosition
      xPosition = -rectWidth/2;
      yPosition = -rectHeight/2;
      const newSquare = nodeElem.append('g').attr('class','view_type');
      // 添加有限长度的文字
      const maxTextLength = 12; // 最大文本长度
      let displayText = text.length > maxTextLength ? text.substring(0, maxTextLength) + '...' : text;
      let CircleText = text.length > 1 ? text.substring(0, maxTextLength): text;
      // 添加文字
      const textElem = newSquare.append('text')
          .attr('x', xPosition + rectWidth / 2)
          .attr('y', yPosition + rectHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .text(displayText)
          .attr('id', text) // 设置 ID
          .style("fill", "#666666")
          .style("font-size", "15px")
          .style("font-weight", "middle");

      // 鼠标悬浮事件显示完整文本
      newSquare.on('mouseover', () => textElem.text(text));
      newSquare.on('mouseout', () => textElem.text(displayText));
      // 更新节点的 label 属性
      this.graph.setNode(nodeId, { ...node, label: text,labelStyle:"fill:rgba(0, 0, 0, 0);font-size:15px;font-weight:middle"});
      this.updateGraph();

      // this.handleNodeClick(this.getPreviousNode(nodeId))
    },
    getPreviousNode(node) {
      // 提取数字部分，进行减法操作
      let number = parseInt(node.replace("node", ""));
      if (isNaN(number) || number <= 0) {
        return null; // 处理无效输入或没有前一个节点的情况
        }
      return `node${number - 1}`;
      },
    // 删除节点
    deleteNode(nodeId) {
      const svg = d3.select(".svgArea")
      // 实现删除节点以及其后续节点和连线的逻辑
      let nodesToDelete = new Set();
      let edgesToDelete = new Set();
      const dfs = (currentNodeId) => {
        nodesToDelete.add(currentNodeId);
        let outgoingEdges = this.edges.filter(edge => edge.source === currentNodeId);
        outgoingEdges.forEach(edge => {
          edgesToDelete.add(edge);
          if (!nodesToDelete.has(edge.target)) {
            dfs(edge.target);
          }
        });
      };
      dfs(nodeId);
      // 删除节点和边
      this.nodes = this.nodes.filter(node => !nodesToDelete.has(node.id));
      this.edges = this.edges.filter(edge => !edgesToDelete.has(edge));
      // 同时从 dagre-d3 的 graph 实例中删除节点和边
      nodesToDelete.forEach(nodeId => this.graph.removeNode(nodeId));
      edgesToDelete.forEach(edge => this.graph.removeEdge(edge.source, edge.target));

      // 遍历 pathData 并删除最后一个节点在 nodesToDelete 中的路径
      for (const key in this.pathData) {

        if (this.pathData.hasOwnProperty(key)) {
          const path = this.pathData[key];

          const lastNode = path[path.length - 1];
          if (nodesToDelete.has(lastNode)) {
            delete this.pathData[key];
          }
        }
      }

      // 把自己画的连线也删除
      nodesToDelete.forEach(nodeId => {
        this.linksData = this.linksData.filter(link => {
          return link.source !== nodeId && link.target !== nodeId;
        });

        const linksToDelete = svg.selectAll('.mylink')
            .filter(link => {
              // 根据特定节点的 ID 进行筛选
              return link.source === nodeId || link.target === nodeId;
            });
        // 从选定的元素中移除
        linksToDelete.remove();
        svg.selectAll('.linkText')
            .filter(link => {
              // 根据特定节点的 ID 进行筛选
              return link.source === nodeId || link.target === nodeId;
            })
            .remove()
      })
      this.updateGraph();
      this.popupVisible = false
    },

    // 删除单个节点
    deleteSingleNode(nodeId) {
      const svg = d3.select(".svgArea")
      // 实现删除节点以及其后续节点和连线的逻辑
      let nodesToDelete = new Set();
      let edgesToDelete = new Set();

      nodesToDelete.add(nodeId)

      let outgoingEdges = this.edges.filter(edge => (edge.source === nodeId|| edge.target ===nodeId ));
      outgoingEdges.forEach(edge => {
        edgesToDelete.add(edge);
      });

      this.edges.forEach(edge => {
        if(edge.source===nodeId&&edge.label==="view_type"){
          nodesToDelete.add(edge.target)
        }
      });

      // 删除节点和边
      this.nodes = this.nodes.filter(node => !nodesToDelete.has(node.id));

      this.edges = this.edges.filter(edge => !edgesToDelete.has(edge));
      // 同时从 dagre-d3 的 graph 实例中删除节点和边
      nodesToDelete.forEach(nodeId => this.graph.removeNode(nodeId));
      edgesToDelete.forEach(edge => this.graph.removeEdge(edge.source, edge.target));

      // 遍历 pathData 并删除最后一个节点在 nodesToDelete 中的路径
      for (const key in this.pathData) {
        if (this.pathData.hasOwnProperty(key)) {
          const path = this.pathData[key];
          const lastNode = path[path.length - 1];
          if (nodeId === lastNode) {
            delete this.pathData[key];
          }
        }
      }

      let sourceLink = {}, targetLink = []

      this.linksData.forEach(edge => {if(edge.target===nodeId) sourceLink = edge});

      this.linksData.forEach(edge => {if(edge.source===nodeId) targetLink.push(edge)});

      // 把自己画的连线也删除
      this.linksData = this.linksData.filter(link => {
        return link.source !== nodeId && link.target !== nodeId;
      });
      const linksToDelete = svg.selectAll('.mylink')
          .filter(link => {
            // 根据特定节点的 ID 进行筛选
            return link.source === nodeId || link.target === nodeId;
          });
      // 从选定的元素中移除
      linksToDelete.remove();
      svg.selectAll('.linkText')
          .filter(link => {
            // 根据特定节点的 ID 进行筛选
            return link.source === nodeId || link.target === nodeId;
          })
          .remove()

      const sourceId = sourceLink.source; // 获取路径的 d 属性

      for(let i=0;i<targetLink.length;i++){
        const targetId = targetLink[i].target
        const operation = targetLink[i].label

        if(sourceId&&targetId){
          this.addEdge(sourceId, operation, targetId)
        }
      }

      this.updateGraph();
      this.popupVisible = false
    },
    // 获取节点上的参数信息
    getTextsInfo(nodeId) {
      const nodeElem = d3.select(`#${nodeId}`);
      const textElems = nodeElem.selectAll('text');
      let textsInfo = [];
      textElems.each(function() {
        const textElem = d3.select(this);
        if(textElem.attr('id')!=null){
          textsInfo.push({
            text: textElem.attr('id')
          });
        }
      });
      return textsInfo;
    },

    findPath(startNodeId, targetNodeId) {
      let path = {
        nodes: [],
        edges: []
      };
      let visited = new Set();
      let found = false;
      const dfs = (currentNodeId) => {
        if (currentNodeId === targetNodeId) {
          found = true;
          path.nodes.push(currentNodeId);
          return;
        }
        visited.add(currentNodeId);
        path.nodes.push(currentNodeId);
        let neighbors = this.edges.filter(edge => edge.source === currentNodeId);
        for (let edge of neighbors) {
          if (!visited.has(edge.target)) {
            dfs(edge.target);
            if (found) {
              path.edges.push(edge);
              return;
            }
          }

        }
        path.nodes.pop();
      };
      dfs(startNodeId);
      return path;
    },

    getNodeLabel(nodeId) {
      const node = this.graph.node(nodeId);
      if(node){
        return node.label
      }
      else{
        return ""
      }
    },

    createCompletePaths(nodes, edges) {
      if (edges.length === 0) {
        return this.getNodeLabel(nodes[0]);
      }
      edges.forEach(edge => {
        if (edge.label.includes(" ")) {
          edge.label = edge.label.replace(/ /g, "_");
        }
      });
      let containsViewType = edges.some(edge => edge.label === 'view_type');
      if (containsViewType) {
        let targetsOfViewType = edges.filter(edge => edge.label === 'view_type').map(edge => edge.target);
        // edges = edges.filter(edge => edge.label !== 'view_type');
        // nodes = nodes.filter(node => !targetsOfViewType.includes(node));
        const curText = this.getTextsInfo(targetsOfViewType[0])[0];
        store.commit('setSelectedViewType',curText.text)
      }
      let completePaths = [];
      for (let i = edges.length - 1; i >= 0; i--) {
        let edge = edges[i];
        let sourceLabel = this.getNodeLabel(edge.source);
        let targetLabel = this.getNodeLabel(edge.target);
        let nodeTexts = this.getTextsInfo(edge.target);
        if (i === edges.length - 1) {
          completePaths.push({ "node": sourceLabel });
          completePaths.push({ "operator": edge.label });
          // if (targetLabel !== sourceLabel) {
          //   nodeTexts.forEach(textInfo => completePaths.push({ "parameter": textInfo.text }));
          // } else {
          //   completePaths.push({ "node": targetLabel });
          // }
          nodeTexts.forEach(textInfo => completePaths.push({ "parameter": textInfo.text }));
        } else {
          // 对于其他边，只需包括边的标签和终点
          completePaths.push({ "operator": edge.label });
          nodeTexts.forEach(textInfo => completePaths.push({ "parameter": textInfo.text }));
        }
      }
      return completePaths;
    },
  },
};
</script>


