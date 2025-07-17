<template>
<!--  <div class="defaultView" id="chart-container-default">-->
<!--    <div id="chart-container-default" class="chart-container" @click="selectDefaultChart() && $event.stopPropagation()" style="position: relative;height: 95.5%; width: 100%; overflow: auto; top: 3vh;"></div>-->
<!--  </div>-->
  <div v-for="(box,index) in boxes" :key="box.id" :class="boxClass(box)" :style="boxStyle(box)" @click="selectBox(box)">
    <!--图表容器-->
    <div :id="`chart-container-${box.id}`" class="chart-container" @click="selectChart(box) && $event.stopPropagation()" style="position: relative;height: 95.5%; width: 100%; top: 2vh;"></div>
    <!--按钮容器-->
    <div class="button-container">
<!--      <el-button @click.stop="handleIncrement(boxes, index, rootWidth, rootHeight, 'vertical',containerId,selectId)" size="small" class="imgContainer">-->
<!--        <img src="../../assets/vertical.png" alt="horizontal" style="width: 15px; height: 15px;background: #f0f0f1;padding: 3px;border-radius: 2px">-->
<!--      </el-button>-->
<!--      <el-button @click.stop="handleIncrement(boxes, index, rootWidth, rootHeight, 'horizontal',containerId,selectId)" size="small" class="imgContainer">-->
<!--        <img src="../../assets/horizontal.png" alt="vertical" style="width: 15px; height: 15px;background: #f0f0f1;padding: 3px;border-radius: 2px">-->
<!--      </el-button>-->
<!--      <el-button @click.stop="handleDecrement(boxes, index, containerId, selectId)" :disabled="!canDecrement(box)" size="small" style="margin-right: 10px;" class="imgContainer">-->
<!--        <img src="../../assets/merge.png" alt="merge" style="width: 20px; height: 20px;background: #f0f0f1;padding: 3px;border-radius: 2px">-->
<!--      </el-button>-->
      <div @click.stop="handleIncrement(boxes, index, rootWidth, rootHeight, 'vertical', containerId, selectId)" class="imgContainer">
        <img src="../../assets/horizontal.png" class="resultImage" alt="horizontal" style="width: 15px; height: 15px; margin-right: 5px; padding: 2px; border-radius: 2px">
      </div>
      <div @click.stop="handleIncrement(boxes, index, rootWidth, rootHeight, 'horizontal', containerId, selectId)" class="imgContainer">
        <img src="../../assets/vertical.png" class="resultImage" alt="vertical" style="width: 15px; height: 15px; margin-right: 5px; padding: 2px; border-radius: 2px">
      </div>
      <div @click.stop="handleDecrement(boxes, index, containerId, selectId)" :class="{ 'disabled': !canDecrement(box) }" class="imgContainer" style="margin-right: 10px;">
        <img src="../../assets/merge.png" class="resultImage" alt="merge" style="width: 15px; height: 15px; margin-right: 5px; padding: 2px; border-radius: 2px">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick} from 'vue';
import { useStore } from 'vuex'; // 引入 useStore 钩子
import { boxClass, boxStyle, handleIncrement, handleDecrement } from "./boxFunction.js";
import dataVisual from "./dataVisual.js"
import "./style.css"

// 使用 useStore 钩子获取 store 实例
const store = useStore();
// 定义响应式数据
const boxes = ref([{ id: 0, trueId:0, parentId:-1, width: '100%', height: '100%', x: 0, y: 0, children: [], parent:[], isSelected:false }]);

// 定义全局变量
let rootWidth = 1;
let rootHeight = 1;
let containerId = {string: 'chart-container-0'}
let selectId = {string: 'chart-container-0'}

// 判断 chart-container 是否包含元素
function selectChart(box) {
  selectId.string = `chart-container-${box.id}`;
  // store.dispatch('saveIsSelectContainer');
  // store.dispatch('saveSelectContainer',selectId.string);
  const myDiv =  document.getElementById(selectId.string)
  let codeContext =myDiv.getAttribute("codeContext");
  if(codeContext!==null){
    store.dispatch('saveCurExpression',codeContext);
  }
  const divElement = document.getElementById(selectId.string);
  return !!(divElement && divElement.firstChild);
}
function canDecrement(box) {
  if (box.parentId === null) {
    return false;
  }
  // 计算拥有相同parentId的box的数量
  const siblingsCount = boxes.value.filter(b => b.parentId === box.parentId).length;
  // 如果有多于一个box拥有相同的parentId，则可以减少
  return siblingsCount > 1;
}
function selectBox(curBox) {
  // 重置所有盒子的选中状态
  boxes.value.forEach(box => {
    if (box !== curBox) {
      box.isSelected = false;
    }
  });
  curBox.isSelected = !curBox.isSelected;
  containerId.string = "chart-container-" + curBox.id;
  store.dispatch('saveSelectBox',containerId.string);
  selectId.string = containerId.string
}

watch(() => store.state.selectBox, (newValue, oldValue) => {
  if(newValue!==containerId.string){
    boxes.value.forEach(box => {
      box.isSelected = ("chart-container-" + box.id) === newValue;
    });
    containerId.string = newValue
  }
});

// 观察 Vuex 中 responseData 的变化
watch(() => store.state.responseData, (newValue) => {
  const operation = newValue.operation
  const data = newValue.result
  const visualType=store.state.visualType
  const seqView=store.state.seqView

  if(containerId.string === selectId.string){
    dataVisual.chooseWhich(operation, containerId.string, data, visualType, seqView)
    //给点击的容器绑定执行的代码
    const myDiv = document.getElementById(containerId.string);
    // 将字符串信息绑定到div的自定义属性上
    myDiv.setAttribute("codeContext", store.state.curExpression);
    myDiv.setAttribute("visualType", visualType);
    myDiv.setAttribute("nodeId", store.state.nodeId);
    // 绑定时间属性
    if((store.state.dateRange.length !== 0)){
      myDiv.setAttribute("startTime", store.state.dateRange[0]);
      myDiv.setAttribute("endTime", store.state.dateRange[1]);
    }
    else{
      myDiv.setAttribute("startTime", "");
      myDiv.setAttribute("endTime", "");
    }
  }
});

// 当组件挂载时执行
onMounted(() => {
  const rootElement = document.getElementsByClassName('grid-item block4')[0];
  const rootRect = rootElement.getBoundingClientRect();
  rootWidth = rootRect.width;
  rootHeight = rootRect.height;
});

</script>

<style scoped>
.imgContainer{
  height: 20px;
  weight: 20px;
  background: none;
  margin-top: 2px;
  border: none;
}

.resultImage:hover{
  cursor: pointer;
  background: #ececec !important;
}

.defaultView {
  position: absolute;
  left: -19.8%;
  top:58.5%;
  width:19%;
  height: 41%;
  //background: white
}
</style>

