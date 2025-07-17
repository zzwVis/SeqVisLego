<template>
  <div class="uploadArea" id="divBlock">
<!--    <span class="module-title">Data Source</span>-->
      <span style="margin-left: 10px;color: black;width: 90%">Data Source</span>
    <el-upload
        class="upload-demo"
        action="http://127.0.0.1:5000/uploadFile"
        :on-success="handleSuccess"
        :file-list="fileList"
        :fileType="fileType"
        :show-file-list="false"
        :before-upload="beforeUpload"
        style="flex: 1; display: flex; justify-content: flex-end;margin-right: 10px"
    >
<!--      <el-button size="small" style="position:relative; cursor: pointer;">-->
        <upload style="width: 15px;height: 15px;cursor: pointer;color: #909298;margin-right: 10px;background:#f0f0f1;padding: 5px;border-radius: 5px" class="myImage"></upload>
<!--      </el-button>-->
    </el-upload>

<!--    要删掉-->
<!--    <el-select v-model="selectedFileUrl" placeholder="选择文件" style="flex: 1; display: flex; justify-content: flex-end;margin-right: 10px">-->
<!--      <el-option-->
<!--          v-for="file in availableFiles"-->
<!--          :key="file.name"-->
<!--          :label="file.name"-->
<!--          :value="file.url"-->
<!--      ></el-option>-->
<!--    </el-select>-->
<!--    <el-button @click="handleFileSelection">加载文件</el-button>-->

  </div>
<!--  <div class="tool" id="divBlock">-->
<!--    <span class="module-title">Tool</span>-->
<!--&lt;!&ndash;    <img src="../../assets/brush.svg" alt="Image"  class="tool-image" @click="brush"/>&ndash;&gt;-->
<!--    <img src="../../assets/cancelBrush.svg" alt="Image"  class="tool-image" @click="cancelBrush"/>-->
<!--&lt;!&ndash;    <img src="../../assets/cancelFilter.svg" alt="Image"  class="tool-image" @click="cancelFilter"/>&ndash;&gt;-->
<!--&lt;!&ndash;    <img src="../../assets/reset.svg" alt="Image"  class="tool-image" @click="reset"/>&ndash;&gt;-->
<!--  </div>-->
  <!--    <span class="module-color">ColorMap</span>-->
<!--    <div class="colorArea" id="divBlock">-->
<!--      <span style="margin-left: 10px;top: 4%;color: black;">ColorMap</span>-->

<!--      <el-select v-model="selected" placeholder="      Color By"-->
<!--                 style="border: none;width: 60%;background:none;left: -5px;" class="custom-select"-->
<!--                 size="small" @change="handleSelectChange">-->
<!--        <el-option-->
<!--            v-for="item in colorOptions"-->
<!--            :key="item.value"-->
<!--            :label="item.label"-->
<!--            :value="item.value">-->
<!--        </el-option>-->
<!--      </el-select>-->
<!--    </div>-->

<!--  找事件对-->
<!--  <div class="supportArea" id="divBlock">-->
<!--    <span style="margin-left: 10px;top: 4%">Support</span>-->
<!--    <div class="support-container">-->
<!--      <input id="support-input" class="el-input" type="text" placeholder="" v-model="inputSupport">-->
<!--      <el-button id="submit-button" @click="clickSupport">Min Support:</el-button>-->
<!--      <span class="percent-label">%</span>-->
<!--    </div>-->
<!--  </div>-->

  <div class="paramArea" id="divBlock">
    <span style="margin-left: 10px;top: 4.5%;color: black">Parameter</span>
  </div>
  <div class="supportArea" id="divBlock">
    <span style="margin-left: 10px;top: 4%;color: black;width: 140px">Min Support:</span>
    <div class="support-container">
      <span id="support-text" class="support-text" @click="toggleInput">30%</span>
      <div id="input-container" class="input-container" style="display: none;">
        <div class="input-with-suffix">
          <input id="support-input" class="el-input" type="text" placeholder="" v-model="inputSupport">
          <span class="suffix">%</span>
        </div>
        <check class="checkmark" @click="clickSupport"></check>
      </div>
    </div>

    <span style="margin-left: -20px;top: 4%;color: black;">ColorMap:</span>
<!--    <select v-model="selected"-->
<!--            style="left: 5px; margin-right: 10px;background: none;font-size: 12px;color: black"-->
<!--            class="custom-select"-->
<!--            @change="handleSelectChange">-->
<!--      <option v-for="item in colorOptions"-->
<!--              :key="item.value"-->
<!--              :value="item.value">-->
<!--        {{ item.label }}-->
<!--      </option>-->
<!--    </select>-->

        <el-select v-model="selected" placeholder=" "
               style="left: 5px;margin-right: -10px"
               popper-class="custom-popper"
               size="small" @change="handleSelectChange">
      <el-option
          v-for="item in colorOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value">
      </el-option>
    </el-select>

  </div>

<!--  <div class="windowArea" id="divBlock">-->
<!--    <span style="margin-left: 10px;top: 4%">Time Window</span>-->

<!--    <check style="width: 15px;height: 15px;cursor: pointer;position: absolute;left:79%;padding: 2px"-->
<!--           @click="analyseEvent" class="myImage"></check>-->
<!--    <delete style="width: 15px;height: 15px;cursor: pointer;position: absolute;left:89%;padding: 3px"-->
<!--            @click="clearEvent" class="myImage"></delete>-->
<!--  </div>-->

<!--    <div style="height: 17%;width: 94%;top: 37%;margin-top: 12px;position: absolute;left:0;background: white;border: none;padding: 10px">-->
<!--      <span style="font-size: 2%;">Attribute:</span>-->
<!--      <el-select-->
<!--          v-model="selectedAttribute"-->
<!--          placeholder="Attribute"-->
<!--          style="width: 120px;margin-left: 10px;color: black"-->
<!--      >-->
<!--        <el-option-->
<!--            v-for="item in optionAttr"-->
<!--            :key="item.value"-->
<!--            :label="item.label"-->
<!--            :value="item.value"-->
<!--        />-->
<!--      </el-select>-->

<!--      <div class="select-container" style="display: flex;position: relative;top: 8%">-->
<!--        <span style="font-size: 2%;margin-top: 5px">Set:</span>-->
<!--        <el-select-->
<!--            v-model="selectedValues1"-->
<!--            multiple-->
<!--            collapse-tags-->
<!--            placeholder="set 1"-->
<!--            style="width: 180px;margin-left: 14px;"-->
<!--        >-->
<!--          <el-option-->
<!--              v-for="item in option1"-->
<!--              :key="item.value"-->
<!--              :label="item.label"-->
<!--              :value="item.value"-->
<!--          />-->
<!--        </el-select>-->

<!--        <el-select-->
<!--            v-model="selectedValues2"-->
<!--            multiple-->
<!--            collapse-tags-->
<!--            placeholder="set 2"-->
<!--            style="width: 180px;margin-left: 5px"-->
<!--        >-->
<!--          <el-option-->
<!--              v-for="item in option2"-->
<!--              :key="item.value"-->
<!--              :label="item.label"-->
<!--              :value="item.value"-->
<!--          />-->
<!--        </el-select>-->
<!--      </div>-->

<!--      &lt;!&ndash; 第一个内容块 &ndash;&gt;-->
<!--      <div style="height: 100%;position: relative;top: 10%">-->
<!--        <div class="content-block" style="margin-top: 0;">-->
<!--          <span style="font-size: 2%;">Time Range:</span>-->
<!--          <div style="margin-top: 6px">-->
<!--            <div class="range-selector">-->
<!--              &lt;!&ndash; 最小值输入 &ndash;&gt;-->
<!--              <el-input-->
<!--                  v-model.number="startNum"-->
<!--                  type="number"-->
<!--                  :min="min"-->
<!--                  :max="max"-->
<!--                  size="small"-->
<!--                  @input="handleStartTimeChange"-->
<!--                  style="width: 90px"-->
<!--              ></el-input>-->
<!--              <div style="color: black;margin-right: 14px">-</div>-->
<!--              &lt;!&ndash; 最大值输入 &ndash;&gt;-->
<!--              <el-input-->
<!--                  v-model.number="endNum"-->
<!--                  type="number"-->
<!--                  :min="min"-->
<!--                  :max="max"-->
<!--                  size="small"-->
<!--                  style="width: 90px"-->
<!--              ></el-input>-->
<!--              <el-select-->
<!--                  v-model="selectedUnit"-->
<!--                  placeholder="unit"-->
<!--                  style="width: 125px; border: none;background: none;"-->
<!--                  size="small">-->
<!--                <el-option-->
<!--                    v-for="item in units"-->
<!--                    :key="item.value"-->
<!--                    :label="item.label"-->
<!--                    :value="item.value">-->
<!--                </el-option>-->
<!--              </el-select>-->
<!--            </div>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->

  <div class="historyArea" id="divBlock">
    <span style="margin-left: 10px;top: 4%;color: black">Declarative Grammar</span>
  </div>
  <div class="history" id="dataBlock">
<!--    <span class="module-title">Declarative Grammar</span>-->
    <div class="historyPanel">
      <el-input v-model="searchText" placeholder="Search" prefix-icon="Search" class="searchBox1"></el-input>
      <ul class="historyList">
        <li v-for="(item, index) in filteredHistory" :key="index" @click="selectHistory(item)" class="historyItem">
          {{ item }}
          <delete style="width: 15px;height: 15px;cursor: pointer;color: #606266"  @click.stop="deleteHistory(index)" class="deleteBtn"></delete>
        </li>
      </ul>
    </div>
  </div>
  <DataBlock :tableData="responseFileData" />
<!--  <div class="metaArea" id="divBlock">-->
<!--&lt;!&ndash;    <div style="top: 6%;position: absolute" id="divPanel"><span style="margin-left: 10px">Data Message</span></div>&ndash;&gt;-->
<!--    <span style="margin-left: 10px;top: 4%">Meta Data</span>-->
<!--  </div>-->

</template>

<script>
import axios from "axios";
import DataBlock from './DataBlock.vue';
import {Search} from "@element-plus/icons";
import "./style.css"
import { mapState } from 'vuex';
import store from "@/store/index.js";
import {Check, Upload} from "@element-plus/icons-vue";

export default {
  components:{
    Check,
    Upload,
    Search,
    DataBlock
  },
  data() {
    return {
      selectedAttribute: [], // 存储选定的eventSet属性
      selectedValues1: [], // 存储eventSet1
      selectedValues2: [], // 存储eventSet2
      optionAttr: [],
      option1: [],
      option2: [],
      responseData: null,
      codeInput: '', // 用于存储用户输入的代码
      responseFileData:[],
      fileList: [],
      fileType: [ "xls", "xlsx","json"],
      selectedOption: '',
      operation: '',
      // 这里存储选择的日期范围
      dateTimeRange: [],
      history: [], // 用于存储历史记录
      searchText: '',
      // 导航栏
      activeTab: 'history',
      unusualSequences: [],
      isAddHistory :false,
      colorOptions: [],
      colormapData: [],
      selected: '',
      inputSupport: "",
      // 事件对相关的数据们
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

      //临时加一下
      availableFiles: [
        { name: 'foursquare.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/updated.xlsx' },
        { name: 'nscc.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/nscc.xlsx' },
        // { name: 'foursquare.xlsx', url: '/api/foursquare.xlsx' },
        { name: 'mlb.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/mlb.xlsx' },
        { name: 'football.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/filtered_matches.xlsx' },
        { name: 'log.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/filtered_mapped_data_200_users_min20_renumbered.xlsx' },
        { name: 'fullFour.xlsx', url: 'https://sequence.obs.cn-south-1.myhuaweicloud.com/categorized_data.xlsx' },
        // { name: 'nscc.xlsx', url: '/api/nscc.xlsx' },
        // { name: 'file1.xlsx', url: '/api/updated.xlsx' }
        // 可以继续添加其他文件信息
      ],
      selectedFileUrl: null, // 选中的文件名
    };
  },
  computed: {
    ...mapState({
      unusualSeq: state => state.unusualSeq,
      curExpression: state => state.curExpression,
      isSelectNode: state=>state.isSelectNode,
      selectedViewType: state => state.selectedViewType,
      isSelectedViewType: state => state.isSelectedViewType,
      dateRange: state => state.dateRange,
      curColorMap: state => state.curColorMap,
      sheetData: state => state.sheetData,
      isSelectHistory: state => state.isSelectHistory,
      isExchange: state => state.isExchange,
      globalPathData: state => state.globalPathData
    }),
    filteredHistory() {
      if (!this.searchText) {
        return this.history; // 如果搜索框为空，则显示所有历史记录
      }
      return this.history.filter(item =>
          item.toLowerCase().includes(this.searchText.toLowerCase())
      );
    },
  },
  watch: {
    unusualSeq: {
      handler(newVal) {
        this.unusualSequences = newVal
      },
      deep: true
    },
    isSelectedViewType() {
      this.selectedOption = this.selectedViewType
      this.$store.dispatch('saveVisualType', this.selectedViewType);
    },
    // 监听当前表达式的变化
    isSelectNode() {
      this.codeInput = this.curExpression
      // 先判断是否已经有这个表达式对应的视图
      const  allChildDivs=this.getDiv()
      // 找出allChildDivs数组中值为this.codeInput对应的键
      const matchingKeys = Object.keys(allChildDivs).find(key => allChildDivs[key] === this.codeInput);

      if (matchingKeys) {
        store.dispatch('saveSelectBox',matchingKeys);
      } else {
        // 没有找到匹配的键
        const regex = /\.(\w+)\(/g; // 正则表达式，寻找所有的操作
        const matches = this.codeInput.match(regex);

        let lastOperation = null;
        if (matches !== null && matches.length > 0) {
          // 获取最后一个匹配项，并从匹配结果中提取操作名
          const lastMatch = matches[matches.length - 1];
          lastOperation = lastMatch.slice(1, lastMatch.indexOf('('));

          if (!this.codeInput.includes("view_type")) {
            this.$store.dispatch('saveVisualType', "");
          }

          if(lastOperation!=="filter" && lastOperation!=="unique_attr" ){

            if(lastOperation === "group"){
              const codeContext = store.state.curExpression
              const regex = /group\("([^"]+)"\)/g; // 使用全局标志`g`进行全文搜索
              const matches = codeContext.matchAll(regex);
              if(Array.from(matches).length!==0){
                this.executeCode()
              }
            }
            else{
              // if (this.codeInput.includes("view_type")) {
                this.executeCode()
              // }
            }
          }
          else{
            this.executeCode()
          }
        }
        else{
          this.executeCode()
        }
      }
    },

    curColorMap(newValue){
      this.selected = newValue
      let uniqueValues = new Set(this.colormapData[newValue]);
      // 如果需要转换回数组形式
      uniqueValues = [...uniqueValues];
      store.dispatch('saveGlobalColorMap',uniqueValues);
    },

    sheetData(newValue) {
      const optionAttr = newValue.map(item => ({
        label: item,
        value: item
      }));
      store.dispatch('saveOptionAttr',optionAttr);

      // this.optionAttr = newValue.map(item => ({
      //   label: item,
      //   value: item
      // }));
    },
    selectedAttribute: {
      handler(newVal) {
        const originalTableData = store.state.originalTableData
        const attrData = originalTableData[store.state.sheetName][newVal]
        const uniqueArray = [...new Set(attrData)];
        this.option1 = uniqueArray.map(item => ({
          label: item,
          value: item
        }));
        this.option2 = uniqueArray.map(item => ({
          label: item,
          value: item
        }));

        store.dispatch('saveEventPairAttr',newVal);
      },
      deep: true
    },
    isExchange() {
      this.executeCode(store.state.curExpression)
    },
  },
  methods: {
    toggleInput() {
      this.showInput = !this.showInput;
      if (this.showInput) {
        document.getElementById('input-container').style.display = 'inline-flex';
        document.getElementById('support-input').focus();
      } else {
        document.getElementById('input-container').style.display = 'none';
      }
    },
    // 删删删
    async handleFileSelection() {
      if (this.selectedFileUrl) {
        try {
          // 下载文件
          const response = await axios.get(this.selectedFileUrl, {
            responseType: 'blob', // 获取 Blob 类型数据
          });

          // 创建文件对象
          const fileName = this.selectedFileUrl.split('/').pop(); // 从 URL 中提取文件名
          const file = new File([response.data], fileName, { type: response.data.type });

          // 创建 FormData 对象
          const formData = new FormData();
          formData.append('file', file);

          // 上传到服务器
          const uploadResponse = await axios.post('http://127.0.0.1:5000/uploadFile', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          // 上传成功后的处理
          this.handleSuccess(uploadResponse.data);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    },
    // 删删删

    analyseEvent(){
      // this.selectedEventAnalyse = "event pairs"
      this.selectedEventAnalyse = "event paths"

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
      if(this.selectedEventAnalyse!==null){
        store.dispatch('saveEventPairStartNum',startNum);
        store.dispatch('saveEventPairEndNum',endNum);
        store.dispatch('saveEventSet1',this.selectedValues1);
        store.dispatch('saveEventSet2',this.selectedValues2);
        store.dispatch('saveEventAnalyse',this.selectedEventAnalyse);
        store.dispatch('saveIsAnalyseEvent');
      }
    },
    clearEvent(){
      // 将交互数据置为空
      store.state.interactionData = {}
      this.$emit('close');
      store.dispatch('saveIsCancleAnalyseEvent');
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


    clickSupport(){
      if(this.inputSupport!==""){
        store.dispatch('saveCurMinSupport',this.inputSupport +"%")
        store.dispatch('saveIsClickSupport')
      }
      const newValue = this.inputSupport;
      document.getElementById('support-text').innerText = `${newValue}%`;
      this.toggleInput(); // 调用 toggleInput 方法隐藏弹框
    },
    convertToDropdownFormat(items) {
      return items.map(item => ({ value: item, label: item }));
    },
    handleSelectChange(newValue) {
      // store.dispatch('saveCurColorMap',this.selected)
      // let uniqueValues = new Set(this.colormapData[this.selected]);
      // // 如果需要转换回数组形式
      // uniqueValues = [...uniqueValues];
      // store.dispatch('saveGlobalColorMap',this.colormapData[this.selected])
      // 确保没有干扰下拉框的展开/收起
      this.$nextTick(() => {
        store.dispatch('saveCurColorMap', this.selected);
        let uniqueValues = new Set(this.colormapData[this.selected]);
        uniqueValues = [...uniqueValues];
        store.dispatch('saveGlobalColorMap', this.colormapData[this.selected]);
      });
    },
    brush() {
      store.dispatch('saveIsClickBrush');
    },
    cancelBrush() {
      // store.dispatch('saveIsClickCancelBrush');
      store.dispatch('saveIsClickCancelFilter');
    },
    reset() {
      store.dispatch('saveIsClickReset');
    },
    cancelFilter() {
      store.dispatch('saveIsClickCancelFilter');
    },
    getDiv(){
      const parentDiv = document.getElementsByClassName('grid-item block4')[0];
      const childDivs = parentDiv.querySelectorAll('div');
      const allChildDivs = {};
      // 遍历 children 数组
      for (let i = 0; i < childDivs.length; i++) {
        // 获取当前子元素的所有子 div 元素
        const currentChildDivs = childDivs[i].querySelectorAll('div');
        // 在当前子元素的子 div 中查找类名为 'chart-container' 的元素
        for (let j = 0; j < currentChildDivs.length; j++) {
          const currentDiv = currentChildDivs[j];
          if (currentDiv.classList.contains('chart-container')) {
            // 将 'chart-container' 元素的 id 添加到数组中
            const curDivId = currentDiv.id
            allChildDivs[curDivId] = document.getElementById(curDivId).getAttribute("codeContext");
          }
        }
      }
      return allChildDivs
    },
    // 上传之前判断文件格式
    beforeUpload(file){
      if (file.type != null){
        const FileExt = file.name.replace(/.+\./, "").toLowerCase();
        if(this.fileType.includes(FileExt)){
          return true;
        }
        else {
          this.$message.error("上传文件格式不正确!");
          return false;
        }
      }
    },

    handleSuccess(response, file, fileList) {
      this.responseFileData = response
    },

    // 找按照什么来进行事件序列的可视化
    extractSeqViewContent(str) {
      const regex = /(seq|agg)_view\("([^"]+)"\)/;
      const match = str.match(regex);
      return match ? match[2] : null;
      },

    extractViewType(str) {
      const pattern = /\.view_type\("(.+?)"\)/;
      const match = str.match(pattern);
      if (match && match[1]) {
        return match[1];
      } else {
        return null; // 或者你可以根据需要返回一个默认值
      }
    },

    executeCode(expression = this.codeInput) {
      if(this.extractSeqViewContent(expression)){
        const seqEvent = this.extractSeqViewContent(expression)
        this.$store.dispatch('saveSeqView', seqEvent);
      }

      if(this.extractViewType(expression)){
        const viewType = this.extractViewType(expression)
        store.commit('setSelectedViewType',viewType)
      }

      // 前端可以直接把最后的操作传给后端 后面再改
      axios.post('http://127.0.0.1:5000/executeCode', { code: expression, support: "50%" })
          .then(response => {
            // 使用 Vuex action 更新 responseData
            this.$store.dispatch('saveResponseData', response.data);
            this.$store.dispatch('saveCurExpression',expression);
            this.responseData = response.data;
            this.operation = this.responseData["operation"]

            if(!response.data){
              const codeIndex = this.history.indexOf(expression);
              if (codeIndex !== -1) {
                this.history.splice(codeIndex, 1);
              }
            }

            if (this.operation === "original") {
              this.$store.dispatch('saveOriginalTableData', { key: expression, value: this.responseData['result'] });
              this.colormapData = this.responseData['result']
              this.colorOptions = this.convertToDropdownFormat(Object.keys(this.responseData['result']))
            }
          })
          .catch(error => {
            console.error(error);
            // 从history中移除this.codeInput
            const codeIndex = this.history.indexOf(expression);
            if (codeIndex !== -1) {
              this.history.splice(codeIndex, 1);
            }
          });
      if (!this.history.includes(expression)) {
        // 使用match()方法查找所有匹配项
        const regex = /\.(\w+)\(/g; // 正则表达式，寻找所有的操作
        const matches = expression.match(regex);

        let lastOperation = null;
        if (matches !== null && matches.length > 0) {
          // 获取最后一个匹配项，并从匹配结果中提取操作名
          const lastMatch = matches[matches.length - 1];
          lastOperation = lastMatch.slice(1, lastMatch.indexOf('('));
        }
        if(lastOperation==="filter"){
          // 使用正则表达式匹配所有包含 filter() 的部分
          const regex = /(?:filter\([^)]*\))(?=\s*\)|$)/g;
          const matches = expression.match(regex);
          if(matches[0]!=='filter()'){
            this.history.push(expression)
          }
        }
        else if(lastOperation==="unique_attr"){
          const regex = /(?:unique_attr\([^)]*\))(?=\s*\)|$)/g;
          const matches = expression.match(regex);
          if(matches[0]!=='unique_attr()'){
            this.history.push(expression)
          }
        }
        else{
          if (expression.includes("view_type")) {
            this.history.push(expression)
          }
        }
      }
    },

    selectHistory(item) {
      this.codeInput = item; // 设置 codeInput 为选中的历史记录
      store.dispatch('saveIsSelectHistory');
      store.dispatch('saveCurExpression',item);
      // const  allChildDivs=this.getDiv()
      // const matchingKeys = Object.keys(allChildDivs).find(key => allChildDivs[key] === this.codeInput);
      //
      // if (matchingKeys) {
      //   store.dispatch('saveSelectBox',matchingKeys);
      // } else {
      //   this.executeCode()
      // }
    },

    deleteHistory(index) {
      this.history.splice(index, 1); // 删除特定的历史记录
    },
  },
};
</script>

<style scoped>
:deep(.el-tabs__item) {
  color: #666666;
  font-size: 0.8vw;
  background: #eeeeee;
  //border: 2px solid white;
  //border-radius: 5px;
}

:deep(.el-tabs__item.is-active) {
  color: grey;
  background: #f1f9ff;
}

.support-container {
  position: relative;
  display: inline-block;
  width: 55% !important;
  top: 0;
}

#submit-button {
  position: absolute;
  left: 68%;
  height: 100%;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center; /* Center vertically */
  font-size: 2%;
  width: 60%;
  margin-left: 0;
  color: #A9A9A9 !important;
}

/* 输入框样式 */
#support-input {
  //border: none;
  border: 1px solid lightgrey;
  border-radius: 1px;
  margin-left: 1px;
  box-sizing: border-box;
  transition: border-color .2s;
  font-size: 70% !important;
  color: #A9A9A9;
  width: 60%; /* Fill the container */
  left: 0;
  height: 20px !important;
}


.support-container {
  position: relative;
  display: inline-block;
  border: none;
}

.support-text {
  cursor: pointer;
  color: black;
}

.input-container {
  //display: inline-flex;
  //align-items: center;
  width: 70px;
  position: absolute; /* 绝对定位，脱离文档流 */
  top: -5px; /* 覆盖在原本元素的上方 */
  left: 0; /* 覆盖在原本元素的上方 */
  height: auto;
  z-index: 10; /* 确保弹窗在最上层 */
  border: 1.5px dashed #ccc;
  padding: 2px;
  border-radius: 4px;
  background: white;
}

.checkmark {
  padding: 1px;
  background-color: #f0f6ea !important;
  color: #7fbc4d !important;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  width: 15px !important;
  height: 15px !important;
  top:30% !important;
}

.checkmark:hover {
  background-color: #7fbc4d !important;
  color:#f0f6ea !important;
}

.input-with-suffix {
  position: relative;
  width: 70px !important;
  //display: inline-block;
  color: black
}

.suffix {
  position: absolute;
  left:20px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none; /* 使百分号不可点击 */
}
</style>