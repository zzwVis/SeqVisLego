<template>
  <div class="popup" v-if="visible" :style="{ left: left + 'px', top: top + 'px'}">
      <Close style="width: 14px;height: 14px;position: absolute;left:88%;cursor:pointer;background: #989898;top: 1%" @click="closePopup" class="myImage" id="myClose"></Close>
      <!-- 第一个内容块 -->
      <div style="height: 100%;overflow-y: auto;overflow-x: hidden">
        <div class="content-block">
          <h4 style="font-family: 'Arial Narrow', sans-serif">Operation</h4>
          <div class="operation-buttons">
            <div
                v-for="(item, index) in operationList"
                :key="index"
                @click="chooseOperation(index)"
                class="operation-item"
            >
              <span class="circle"></span>
              <span class="text">{{ item.replace('_', ' ') }}</span>
            </div>
<!--            <el-button v-for="(item, index) in operationList" :key="index" @click="chooseOperation(index)"-->
<!--                       class="operation-button" style="background: #f9f9f9">{{ item.replace('_', ' ') }}</el-button>-->
          </div>
        </div>
        <!-- 分割线 -->
        <div class="splitLine"></div>
        <!-- 第二个内容块 -->
        <div class="content-block">
          <h4 style="font-family: 'Arial Narrow', sans-serif">Visualization</h4>
          <div style="margin-top: -10px;margin-left: 0">
            <img v-for="(img, index) in imgList" :key="index" :src="img.url" alt="Image" :style=img.style  class="hoverable-image" @click="chooseVisual(img.vis)"/>
          </div>
        </div>
      </div>
    </div>

  <div v-if="newPopupVisible" class="newPopup" :style="{ left: left + 'px', top: top + 'px'}">
    <Close v-if="displayMode !== 'filter'"
        style="width: 14px;height: 14px;position: absolute;left:88%;cursor:pointer;background: #989898;top: 1%" @click="closeNewPopup" class="myImage" id="myClose"></Close>

<!--    <check v-if="displayMode === 'filter'"-->
<!--           style="width: 14px;height: 14px;cursor: pointer;position: absolute;top: 1%;left:93.5%;background: #989898;"-->
<!--           @click="checkFilterAttr" class="myImage" id="myCheck"></check>-->
    <check v-if="displayMode === 'align'"
           style="width: 14px;height: 14px;cursor: pointer;position: absolute;top: 1%;left:93.5%;background: #989898;"
           @click="checkAlignAttr" class="myImage" id="myCheck"></check>
<!--    <check v-if="displayMode === 'align'"-->
<!--           style="width: 18px;height: 18px;cursor: pointer;color: #606266;position: absolute;margin-top: 8px;margin-left: 5px"-->
<!--           @click="checkAlignAttr" class="myImage"></check>-->

    <div style="margin-top: 0;overflow: hidden;height: 120%" v-if="displayMode === 'align'">
          <h4 style="font-family: 'Arial Narrow', sans-serif;margin-bottom: 5px;margin-top: 5px">Event Attribute</h4>
          <el-select
              v-if="displayMode === 'align'"
              v-model="selectedLabel"
              placeholder="Select Attribute"
              @change="handleLabelChangeAlign"
              style="width: 100%; border: none;background: none;margin-left: 0"
              popper-class="elOption"
              :popper-append-to-body="true"
              filterable
          >
            <el-option
                v-for="(options, label) in alignOptions"
                style="width:auto"
                :key="label"
                :label="label"
                :value="label">
            </el-option>
          </el-select>

          <!-- 根据所选标签显示的选项列表 -->
          <h4 style="font-family: 'Arial Narrow', sans-serif;margin-top: 10px;margin-bottom: 5px">Values</h4>
          <div v-if="typeof dataOfAttr === 'string'">
            <el-input v-model="searchText" placeholder="Search" prefix-icon="Search" class="searchBox" style="width: 100% !important;"></el-input>

            <div style="border: 2px solid #E9E9E9;border-radius: 2px;margin-top: 5px;width: 92%;margin-left: 3px">
              <ul class="popupList attrList" style="z-index: 9998;margin-top: 0;overflow: auto;height: 90px">
                <li
                    v-for="(option, index) in filteredAlignList"
                    :key="index"
                    style="padding: 5px 5px 0 5px;transition: background-color 0.3s;color: #808080;font-size: 2%;
                      display: flex;align-items: center;border: none;"
                    :class="{ 'is-selected': selectedAlignboxes.includes(option) }"
                    @click="chooseAttrOne(option)">
                  {{ option }}
                </li>
              </ul>
            </div>
          </div>

          <div v-else-if="typeof dataOfAttr === 'number'">
            <div style="margin-top: 5px;width: 98%;margin-left: 3px">
              <el-input type="number" v-model="minValue" placeholder="min" size="small" style="width: 40%;"></el-input>
              <span style="color: grey;margin-right: 15px">-</span>
              <el-input type="number" v-model="maxValue" placeholder="max" size="small" style="width: 40%"></el-input>
            </div>
          </div>

    </div>

    <div style="margin-top: 0;overflow: hidden;height: 100%" v-else-if="displayMode === 'filter'">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="event" name="event">
          <Close style="width: 15px;height: 15px;position: absolute;left:87%;cursor:pointer;top: 0" @click="closeNewPopup" class="myImage" id="myClose"></Close>

          <check v-if="displayMode === 'filter'"
                 style="width: 15px;height: 15px;cursor: pointer;position: absolute;top: 0;left:93.5%;"
                 @click="checkFilterAttr" class="myImage" id="myCheck"></check>
      <h4 style="font-family: 'Arial Narrow', sans-serif;margin-bottom: 5px;margin-top: 5px">Event Attribute</h4>
      <el-select
          v-if="displayMode === 'filter'"
          v-model="selectedLabel"
          placeholder="Select Attribute"
          @change="handleLabelChange"
          style="width: 105% !important; border: none;background: none;margin-left: 0;"
          popper-class="elOption"
          :popper-append-to-body="false"
          filterable
      >
        <el-option
            v-for="(options, label) in checkboxOptions"
            :key="label"
            :label="label"
            :value="label">
        </el-option>
      </el-select>

      <!-- 根据所选标签显示的选项列表 -->
      <h4 style="font-family: 'Arial Narrow', sans-serif;margin-top: 10px;margin-bottom: 5px">Values</h4>
      <div v-if="typeof dataOfAttr === 'string'">
        <el-input v-model="searchText" placeholder="Search" prefix-icon="Search" class="searchBox"></el-input>
        <div style="border: 2px solid #E9E9E9;border-radius: 2px;margin-top: 5px;width: 97%;margin-left: 0" v-if="displayMode === 'filter'">
          <ul class="popupList attrList" style="z-index: 9998;margin-top: 0">
            <li
                v-for="(option, index) in filteredAttributeList"
                :key="index"
                style="padding: 5px 5px 0 5px;transition: background-color 0.3s;color: #808080;font-size: 2%;
                      display: flex;align-items: center;border: none;"
                :class="{ 'is-selected': selectedCheckboxes.includes(option) }"
                @click="chooseAttr(option)">
              {{ option }}
            </li>
          </ul>
        </div>

      </div>
      <div v-else-if="typeof dataOfAttr === 'number'">
        <div style="margin-top: 5px;width: 98%;margin-left: 3px">
          <el-input type="number" v-model="minValue" placeholder="min" size="small" style="width: 40%;"></el-input>
          <span style="color: grey;margin-right: 15px">-</span>
          <el-input type="number" v-model="maxValue" placeholder="max" size="small" style="width: 40%"></el-input>
        </div>
      </div>
          <el-date-picker
              v-if="displayMode === 'filter'"
              v-model="dateTimeRange"
              type="datetimerange"
              size="small"
              style="width: 92%;margin-left: 2px;margin-bottom: 5px;margin-top: 10px;z-index: 9998"
              start-placeholder="Start Time"
              end-placeholder="End Time"
              range-separator="-"
              value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-tab-pane>

        <el-tab-pane label="subsequence" name="subsequence">
          <delete style="width: 15px;height: 15px;cursor: pointer;position: absolute;left:76%;padding: 3px;top: 0"
                      @click="clearEvent" class="myImage" id="myClear"></delete>
          <check style="width: 15px;height: 15px;cursor: pointer;position: absolute;left:90%;padding: 2px;top: 0;"
                     @click="analyseEvent" class="myImage" id="myCheck"></check>
          <Close style="width: 15px;height: 15px;position: absolute;left:83%;cursor:pointer;padding: 2px;top: 0" @click="closeNewPopup" class="myImage" id="myClose"></Close>

          <div class="eventPair" style="margin-top: 20px">
                <span style="font-family: 'Arial Narrow', sans-serif;margin-bottom: 5px;margin-top: 5px">Attribute</span>
                <el-select
                    v-model="selectedAttribute1"
                    placeholder="Attribute 1"
                    size="small"
                    style="width: 118px;margin-left: 30px;color: black"
                    filterable
                >
                  <el-option
                      v-for="item in optionAttr"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                  />
                </el-select>

            <el-select
                v-model="selectedAttribute2"
                placeholder="Attribute 2"
                size="small"
                style="width: 118px;color: black;margin-right: -30px"
                filterable
            >
              <el-option
                  v-for="item in optionAttr"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>

                <div class="select-container" style="display: flex;width: 120%">
                  <span style="font-family: 'Arial Narrow', sans-serif;margin-bottom: 5px;margin-top: 15px">Event Set</span>
                  <el-select
                      v-model="selectedValues1"
                      multiple
                      collapse-tags-tooltip
                      placeholder="set 1"
                      size="small"
                      style="width: 120px;margin-bottom: 5px;margin-top: 15px;margin-left: 20px;"
                      filterable
                  >
                    <el-option
                        v-for="item in option1"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>

                  <el-select
                      v-model="selectedValues2"
                      multiple
                      collapse-tags-tooltip
                      placeholder="set 2"
                      size="small"
                      style="width: 120px;margin-bottom: 5px;margin-top: 15px;margin-left: 0"
                      filterable
                  >
                    <el-option
                        v-for="item in option2"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>
                </div>

                <!-- 第一个内容块 -->
                <div style="height: 100%">
                  <div class="content-block" style="margin-top: 5px;">
                    <div style="width: 120%;">
                    <span style="font-family: 'Arial Narrow', sans-serif;margin-bottom: 5px;margin-top: 15px">Time Range</span>
                      <span style="font-family: 'Arial Narrow', sans-serif;font-size: small;margin: 15px 5px 15px 74px">Time unit:</span>
                    <el-select
                        v-model="selectedUnit"
                        placeholder="unit"
                        style="width: 120px; border: none;background: none;"
                        size="small">
                      <el-option
                          v-for="item in units"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value">
                      </el-option>
                    </el-select>
                    </div>

                    <div style="margin-top: 10px">
                      <div class="range-selector">
                        <!-- 最小值输入 -->
<!--                        <el-input-->
<!--                            v-model.number="startNum"-->
<!--                            type="number"-->
<!--                            :min="min"-->
<!--                            :max="max"-->
<!--                            size="small"-->
<!--                            @input="handleStartTimeChange"-->
<!--                            style="width: 90px"-->
<!--                        ></el-input>-->
<!--                        <div style="color: black;margin-right: 14px">-</div>-->
<!--                        &lt;!&ndash; 最大值输入 &ndash;&gt;-->
<!--                        <el-input-->
<!--                            v-model.number="endNum"-->
<!--                            type="number"-->
<!--                            :min="min"-->
<!--                            :max="max"-->
<!--                            size="small"-->
<!--                            style="width: 90px"-->
<!--                        ></el-input>-->
                        <div style="display: flex; align-items: center;width: 98%">
                          <!-- 左侧文字 -->
<!--                          <span style="margin-right: 10px;font-size: small;color: #7e8183">{{ min }}</span>-->
                          <input
                              type="number"
                              :value="range[0]"
                              @input="handleRangeStartChange"
                              style="width: 30px; font-size: small; color: #7e8183;border: none;padding: 0"
                          />
                          <!-- 滑动条 -->
                          <el-slider
                              v-model="range"
                              range
                              :min="min"
                              :max="max"
                              @change="handleRangeChange"
                              style="flex: 1;margin-left: 5px;margin-right: 10px"
                              :marks="netBrandWidthMarks"
                          ></el-slider>

                          <!-- 右侧文字 -->
<!--                          <span style="margin-left: 10px;font-size: small;color: #7e8183">{{ max }}</span>-->
                          <input
                              type="number"
                              :value="range[1]"
                              class="spacious-input"
                              @input="handleRangeEndChange"
                              style="margin-left: 10px; width: 30px; font-size: small; color: #7e8183;border:none;padding: 0"
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </el-tab-pane>

      </el-tabs>
    </div>
    <div v-else-if="displayMode === 'unique_count'"
        style="border: 2px solid #E9E9E9;border-radius: 2px;margin-top: 5px;width: 98%;margin-left: 3px;overflow-y: auto">
      <ul class="popupList attrList" style="z-index: 9998;margin-top: 0">
        <li
            v-for="(option, index) in paramList"
            :key="index"
            style="padding: 5px 5px 0 5px;transition: background-color 0.3s;color: #808080;font-size: 2%;
                      display: flex;align-items: center;border: none"
            :class="{ 'is-selected': selectedCountboxes.includes(option) }"
            @click="chooseCountAttr(option)">
          {{ option }}
        </li>
      </ul>
    </div>
    <!-- 否则显示列表 -->
    <div v-else style="height:98%;overflow:auto;margin-top:10px">
    <ul class="popupList paramList" style="z-index: 9998">
      <li v-for="(item, index) in paramList" :key="index" class="popupItem paramItem" @click="chooseParam(item)"
          style="padding: 10px 0 5px 5px;transition: background-color 0.3s;color: #808080 !important;font-size: 2%;
                      display: flex;align-items: center;">
        {{ item }}
      </li>
    </ul>
    </div>
  </div>
</template>


<script>
import {Close} from "@element-plus/icons-vue";
import store from "@/store/index.js";
import {mapState} from "vuex";
import {ref} from "vue";
import {NULL} from "sass";

export default {
  components: {Close},
  props: {
    left: Number,
    top: Number,
    visible: Boolean,
    operationList: Array,
    visualList: Array,
    paramList: Array,
    displayMode: String,
    checkboxOptions:Object,
    alignOptions:Object,
    imgList:Array,
    startNum: null,
    endNum: null,
  },
  computed: {
    ...mapState({
      optionAttr: state => state.optionAttr
    }),
    filteredAttributeList() {
      if (!this.searchText) {
        return this.attributeList; // 如果搜索框为空，则显示所有历史记录
      }
      return this.attributeList.filter(item =>
          item.toString().toLowerCase().includes(this.searchText.toLowerCase())
      );
    },
    filteredAlignList() {
      if (!this.searchText) {
        return this.attributeListAlign; // 如果搜索框为空，则显示所有历史记录
      }
      return this.attributeListAlign.filter(item =>
          item.toString().toLowerCase().includes(this.searchText.toLowerCase())
      );
    },
  },
  data() {
    return {
      netBrandWidthMarks : { 0: '0',60: '60',"-60":"-60"},
      min: -60, // 最小值
      max: 60, // 最大值
      range: [0, 0], // 初始范围值
      selectedUnit: null, // 选中的单位
      startNum: null,
      endNum: null,
      units: [ // 单位选项
        { value: 'hour', label: 'hour' },
        { value: 'min', label: 'min' },
        { value: 'sec', label: 'sec' }
      ],
      activeTab: 'event', // 默认激活的选项卡
      selectedValues: [], // 用于存储选中的值,
      dateTimeRange: [], // 选择的日期范围
      selectedLabel: '',
      attributeList:[],
      attributeListAlign:[],
      selectedCheckboxes: [], // 存储被选中的选项
      selectedAlignboxes: [], // 存储被选中的选项
      selectedCountboxes: [], // 存储被选中的选项
      newPopupVisible: false,
      searchText: '',
      //选中的属性可能是字符型也可能是数字型
      dataOfAttr: '',
      minValue: null,
      maxValue: null,
      selectedAttribute1: [], // 存储选定的eventSet属性
      selectedAttribute2: [], // 存储选定的eventSet属性
      selectedValues1: [], // 存储eventSet1
      selectedValues2: [], // 存储eventSet2
      // optionAttr: [],
      option1: [],
      option2: [],
    };
  },
  watch: {
    selectedAttribute1: {
      handler(newVal) {
        const originalTableData = store.state.originalTableData
        const attrData = originalTableData[store.state.sheetName][newVal]
        const uniqueArray = [...new Set(attrData)];
        this.option1 = uniqueArray.map(item => ({
          label: item,
          value: item
        }));

        store.dispatch('saveEventPairAttr1',newVal);
      },
      deep: true
    },
    selectedAttribute2: {
      handler(newVal) {
        const originalTableData = store.state.originalTableData
        const attrData = originalTableData[store.state.sheetName][newVal]
        const uniqueArray = [...new Set(attrData)];
        this.option2 = uniqueArray.map(item => ({
          label: item,
          value: item
        }));

        store.dispatch('saveEventPairAttr2',newVal);
      },
      deep: true
    },
    dateTimeRange(newValue) {
      if(newValue){
        this.$store.dispatch('saveDateRange', this.dateTimeRange);
      }
      else{
        this.$store.dispatch('saveDateRange', []);
      }
      this.$store.dispatch('saveIsSelectParameter');
      this.$store.dispatch('saveSelectedParameter',"time");
      this.$store.dispatch('saveFilterParam',[this.dateTimeRange[0],this.dateTimeRange[1]])
      this.newPopupVisible = false
    },
    visible(newValue){
      if(newValue===false){
        this.newPopupVisible=false
      }
    },
  },
  methods: {
    // 处理左侧输入框变化
    handleRangeStartChange(event) {
      const value = Number(event.target.value);
      if (!isNaN(value) && value >= this.min && value <= this.range[1]) {
        this.range[0] = value;
      }
    },
    // 处理右侧输入框变化
    handleRangeEndChange(event) {
      const value = Number(event.target.value);
      if (!isNaN(value) && value >= this.range[0] && value <= this.max) {
        this.range[1] = value;
      }
    },
    handleRangeChange(value) {
      const [start, end] = value; // 解构出范围选择器的起始值和结束值

      // 如果起始值大于 0，将其转换为负数，并调整结束值
      if (start > 0) {
        this.range = [-start, start];
      }
      else if(start<0) {
        // 否则，确保起始值为 0，结束值为输入值
        this.range = [start, -start];
      }
    },

    // handleStartTimeChange(value) {
    //   const numValue = Number(value);
    //   if (isNaN(numValue)) {
    //     // 如果输入非数字，清空起始时间输入框
    //     this.startNum = '';
    //     this.endNum = '';
    //   } else {
    //     if (numValue > 0) {
    //       // 如果输入的是正数，转换为负数
    //       this.startNum = -numValue;
    //       this.endNum = numValue;
    //     } else {
    //       this.startNum = 0;
    //       this.endNum = numValue;
    //     }
    //   }
    // },
    analyseEvent(){
      // this.selectedEventAnalyse = "event pairs"
      this.selectedEventAnalyse = "event paths"

      let startNum, endNum
      if(this.selectedUnit==="sec"){
        startNum=this.range[0]/60
        endNum=this.range[1]/60
      }
      else if(this.selectedUnit==="hour"){
        startNum=this.range[0]*60
        endNum=this.range[1]*60
      }
      else if(this.selectedUnit==="min"){
        startNum=this.range[0]
        endNum=this.range[1]
      }
      else{
        if(this.range[0] === this.range[1]){
          startNum = null
          endNum = null
        }
        else{
          startNum=this.range[0]
          endNum=this.range[1]
        }
      }
      if(this.selectedEventAnalyse!==null){
        store.dispatch('saveEventPairStartNum',startNum);
        store.dispatch('saveEventPairEndNum',endNum);
        store.dispatch('saveEventSet1',this.selectedValues1);
        store.dispatch('saveEventSet2',this.selectedValues2);
        store.dispatch('saveEventAnalyse',this.selectedEventAnalyse);
        store.dispatch('saveIsAnalyseEvent');
        store.dispatch('saveIsSelectParameter');
        store.dispatch('saveSelectedParameter',"subsequence");
      }
      this.newPopupVisible = false
    },
    clearEvent(){
      // 将交互数据置为空
      store.state.interactionData = {}
      this.$emit('close');
      store.dispatch('saveIsCancleAnalyseEvent');
    },
    closePopup() {
      // 隐藏弹窗并将其状态设置为不可见
      this.$emit('close'); // 发送 close 事件给父组件
    },
    closeNewPopup() {
      this.newPopupVisible = false
      this.selectedCheckboxes = [];
      this.selectedCountboxes = [];
      this.selectedAlignboxes = []
    },
    chooseOperation(index) {
      let operation = this.operationList[index];
      if((operation!=="count")&&(operation!=="flatten")){
        this.newPopupVisible = true;
      }
      store.dispatch('saveIsDrag');
      store.dispatch('saveSelectedOperator', operation);
    },
    chooseVisual(vis) {
      this.$store.dispatch('saveIsSelectVisualType');
      this.$store.dispatch('saveVisualType', vis);
    },
    chooseParam(item) {
      this.$store.dispatch('saveIsSelectParameter');
      this.$store.dispatch('saveSelectedParameter',item);
      this.newPopupVisible = false
    },
    handleLabelChange(value) {
      if (this.checkboxOptions[value]) {
        this.attributeList = this.checkboxOptions[value];
        if(value.toLowerCase().includes("id")){
          this.dataOfAttr = "string"
        }
        else{
          this.dataOfAttr = this.checkboxOptions[value][0]
        }
      } else {
        this.attributeList = [];
      }
      this.$store.dispatch('saveSelectedParameter',value);
      // 当标签更换时清空已选中的选项
      this.selectedCheckboxes = [];
      this.minValue = null
      this.maxValue = null
    },
    handleLabelChangeAlign(value) {
      if (this.alignOptions[value]) {
        this.attributeListAlign = this.alignOptions[value];
        if(value.toLowerCase().includes("id")){
          this.dataOfAttr = "string"
        }
        else{
          this.dataOfAttr = this.alignOptions[value][0]
        }
      } else {
        this.attributeListAlign = [];
      }
      this.$store.dispatch('saveAlignAttr',value);
      // 当标签更换时清空已选中的选项
      this.selectedAlignboxes = [];
      this.minValue = null
      this.maxValue = null
    },
    chooseAttr(option){
      const index = this.selectedCheckboxes.indexOf(option);
      if (index > -1) {
        // 如果选项已经被选中，则移除它
        this.selectedCheckboxes.splice(index, 1);
      } else {
        // 否则，添加这个选项到数组中
        this.selectedCheckboxes.push(option);
      }
    },
    chooseAttrOne(option){
      const index = this.selectedAlignboxes.indexOf(option);
      if (index > -1) {
        // 如果选项已经被选中，则移除它
        this.selectedAlignboxes.splice(index, 1);
      } else {
        // 否则，添加这个选项到数组中
        this.selectedAlignboxes = []
        this.selectedAlignboxes.push(option);
      }
    },
    chooseCountAttr(option){
      const index = this.selectedCountboxes.indexOf(option);
      if (index > -1) {
        this.selectedCountboxes.splice(index, 1);
      } else {
        this.selectedCountboxes.push(option);
      }
      this.$store.dispatch('saveIsSelectParameter');
      this.$store.dispatch('saveSelectedParameter',option)
      this.newPopupVisible = false
    },
    checkFilterAttr(){
      if(typeof this.dataOfAttr === 'number'){
        if (this.minValue !== null && this.maxValue !== null && !isNaN(this.minValue) && !isNaN(this.maxValue)) {
          if (this.minValue <= this.maxValue) {
            this.selectedCheckboxes = [this.minValue, this.maxValue];
          } else {
            this.selectedCheckboxes = [this.maxValue, this.minValue];
          }
        }
      }
      this.$store.dispatch('saveIsSelectParameter');
      this.$store.dispatch('saveFilterParam',this.selectedCheckboxes)
      this.newPopupVisible = false
      this.selectedLabel = ""
    },
    checkAlignAttr(){
      if(typeof this.dataOfAttr === 'number'){
        if (this.minValue !== null && this.maxValue !== null && !isNaN(this.minValue) && !isNaN(this.maxValue)) {
          if (this.minValue <= this.maxValue) {
            this.selectedCheckboxes = [this.minValue, this.maxValue];
          } else {
            this.selectedCheckboxes = [this.maxValue, this.minValue];
          }
        }
      }
      this.$store.dispatch('saveIsSelectAlignParameter');
      this.$store.dispatch('saveAlignParam',this.selectedAlignboxes)
      this.newPopupVisible = false
      this.selectedLabel = ""
    }
  }
};
</script>

<style scoped>
/* 全局调整选项卡样式 */
/deep/ .el-tabs__item {
  font-size: 12px !important;
  padding: 0 20px;
  height: 20px;
  line-height: 20px;
}

/deep/ .el-tabs__header {
  height: 20px;
}
/* 让选项卡平分宽度 */
:deep(.el-tabs__nav) {
  display: flex;
  width: 100%;
}

:deep(.el-tabs__item) {
  flex: 1; /* 平分宽度 */
  text-align: center; /* 文字居中 */
}

:deep(.el-tabs__item) {
  color: grey;
  font-size: 0.8vw;
  background: #eeeeee;
  //border: 2px solid white;
}

:deep(.el-tabs__item.is-active) {
  color: grey;
  background: #f1f9ff;
}
.operation-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 8px; /* 调整间距 */
}

/* 鼠标悬浮状态 */
.operation-item:hover .circle {
  background-color: #a9ccfa; /* 绿色实心圆圈 */
}

.circle {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc; /* 灰色空心圆圈 */
  border-radius: 50%;
  margin-right: 8px; /* 圆圈和文本之间的间距 */
  transition: all 0.3s ease; /* 添加过渡效果 */
}

.text {
  color: #333; /* 文本颜色 */
}


/* 修改选中选项卡的文字颜色为灰色 */
/deep/.el-tabs__item.is-active {
  color: grey !important; /* 选中文字颜色改为灰色 */
}

/* 修改滑动条范围内的颜色为灰色 */
/deep/.el-slider__runway{
  height: 12px !important; /* 设置滑动条的高度 */
  background-color: #f7f8f8;
  border: 1.5px solid #dddddd;
  border-radius: 2px;
}

/deep/.el-slider__bar{
  height: 12px !important; /* 设置滑动条的高度 */
  background-color: #e7e8e7;
}

/deep/.el-slider__stop {
  width: 15px;
  height: 15px;
  top: -2px;
  background: #FFFFFF;
  border: 1px solid #aeaeae;
  box-sizing: border-box;
}

/deep/.el-slider__button {
  width: 22px;
  height: 22px;
  margin-top: 5px !important;
  background-color: #FFFFFF;
  border: 1.5px solid #aeaeae;
}
/deep/.el-slider__marks-text{
  font-size: 12px;
  color: #999999;
}

input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none; /* Safari */
  margin: 0;
}

</style>
