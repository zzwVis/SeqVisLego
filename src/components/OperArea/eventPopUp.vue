<template>
  <div class="eventPopup" v-if="visible" :style="{ left: left + 'px', top: top + 40 + 'px' }" style="height: 15%;width: 15%">
    <check style="width: 15%;height: 15%;cursor: pointer;color: #606266;position: absolute;left:60%;top: 1.5%"
           @click="analyseEvent" class="myIcon"></check>
    <delete style="width: 15%;height: 15%;cursor: pointer;color: #606266;position: absolute;left:70%;top: 1.5%"
           @click="clearEvent" class="myIcon"></delete>
    <Close style="width: 15%;height: 15%;position: absolute;left:80%;cursor:pointer;color: #606266;top: 1.5%" @click="closePopup" class="myIcon"></Close>
    <!-- 第一个内容块 -->
    <div style="height: 100%;">
      <div class="content-block" style="margin-top: -30px;">
        <h5>Time Range</h5>

        <div style="margin-top: -20px">
          <div class="range-selector">
            <!-- 最小值输入 -->
            <el-input
                v-model.number="startNum"
                type="number"
                :min="min"
                :max="max"
                size="small"
                @input="handleStartTimeChange"
                style="width: 90px"
            ></el-input>
            <div style="color: grey;margin-left: -20px">-</div>
            <!-- 最大值输入 -->
            <el-input
                v-model.number="endNum"
                type="number"
                :min="min"
                :max="max"
                size="small"
                style="width: 90px"
            ></el-input>
            <el-select
                v-model="selectedUnit"
                placeholder="unit"
                style="width: 125px; border: none;background: none;margin-left: -20px"
                size="small">
              <el-option
                  v-for="item in units"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value">
              </el-option>
            </el-select>
          </div>
        </div>
      </div>
      <!-- 分割线 -->
<!--      <div class="splitLine"></div>-->
<!--      &lt;!&ndash; 第二个内容块 &ndash;&gt;-->
<!--      <div class="content-block" style="margin-top: -26px">-->
<!--        <h5>Event Analyse</h5>-->
<!--        <div style="margin-top: -16px">-->
<!--          <el-select-->
<!--              v-model="selectedEventAnalyse"-->
<!--              placeholder="event Analyse"-->
<!--              style="width: 50%; border: none;background: none;margin-left: -2px"-->
<!--              size="small"  @change="chooseOperation">-->
<!--            <el-option-->
<!--                v-for="item in eventList"-->
<!--                :key="item.value"-->
<!--                :label="item.label"-->
<!--                :value="item.value">-->
<!--            </el-option>-->
<!--          </el-select>-->
<!--        </div>-->
<!--      </div>-->
    </div>
  </div>
</template>


<script>
import {Close, Delete} from "@element-plus/icons-vue";
import store from "@/store/index.js";


export default {
  components: {
    Delete,
    Close,
  },
  props: {
    left: Number,
    top: Number,
    visible: Boolean,
  },
  computed: {
  },
  data() {
    return {
      eventList : [ // 单位选项
        { value: 'event pairs', label: 'event pairs' },
        { value: 'event paths', label: 'event paths' },
        { value: 'seq pairs', label: 'seq pairs' }
      ],
      min: -100, // 最小值
      max: 100, // 最大值
      startNum: null,
      endNum: null,
      units: [ // 单位选项
        { value: 'hour', label: 'hour' },
        { value: 'min', label: 'min' },
        { value: 'sec', label: 'sec' }
      ],
      selectedUnit: null, // 选中的单位
      selectedEventAnalyse: null,
    };
  },
  watch: {
  },
  methods: {
    analyseEvent(){
      this.selectedEventAnalyse = "event pairs"

      let startNum, endNum
      if(this.selectedUnit==="sec"){
        startNum=this.startNum/60
        endNum=this.endNum/60
      }
      else if(this.selectedUnit==="hour"){
        startNum=this.startNum*60
        endNum=this.endNum*60
      }
      else if(this.selectedUnit==="min"){
        startNum=this.startNum
        endNum=this.endNum
      }
      if(this.startNum!==null&&this.endNum!==null&&this.selectedEventAnalyse!==null){
        store.dispatch('saveEventPairStartNum',startNum);
        store.dispatch('saveEventPairEndNum',endNum);
        store.dispatch('saveEventAnalyse',this.selectedEventAnalyse);
        store.dispatch('saveIsAnalyseEvent');
        this.$emit('close');
      }
    },
    clearEvent(){
      // 将交互数据置为空
      store.state.interactionData = {}
      this.$emit('close');
    },
    handleStartTimeChange(value) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        // 如果输入非数字，清空起始时间输入框
        this.startNum = '';
        this.endNum = '';
      } else {
        if (numValue > 0) {
          // 如果输入的是正数，转换为负数
          this.startNum = -numValue;
          this.endNum = numValue;
        } else {
          this.startNum = 0;
          this.endNum = numValue;
        }
      }
    },
    closePopup() {
      this.$emit('close');
    },
    chooseOperation(newValue) {
      this.selectedEventAnalyse = newValue
    },
  }
};
</script>

<style scoped>
.range-selector {
  display: flex; /* 启用Flexbox */
  align-items: center; /* 垂直居中 */
  //justify-content: space-between; /* 元素之间平均分配空间 */
  gap: 5px; /* 元素之间的间隔 */
}
</style>
