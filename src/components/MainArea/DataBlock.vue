<template>
  <div class="data-table-container">
    <el-table
        :data="tableRows"
        style="cursor: pointer;font-size: 0.8vh;height:100%;border: none"
        @header-click="headerClicked"
        :header-cell-style="{ 'background-color': 'white !important' }"
    >
      <el-table-column
          v-for="sheet in sheetNames"
          :key="sheet"
          :prop="sheet"
          :label="sheet"
      >
        <template v-slot="{ row }">
          <div class="clickable-cell">
            {{ row[sheet] }}
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>

import axios from "axios";

export default {
  props: {
    // 接受从父组件传入的tableData
    tableData: {
      type: Object,
      default: () => ({})
    }
  },
  watch: {
    // 监听tableData属性的变化
    tableData: {
      handler(newValue) {
        if (Object.keys(newValue).length > 0) {
          this.printFirstSheetInfo();
        }
      },
      deep: true,
      immediate: true,
    },
  },
  computed: {
    sheetNames() {

      // 获取所有sheet的名称
      const names = Object.keys(this.tableData);

      // 如果有sheetNames，并且是首次加载，调用 triggerHeaderClick
      if (names.length > 0) {
        this.$nextTick(() => {
          this.triggerHeaderClick(names);
        });
      }

      return names;
    },
    tableRows() {
      // 计算表格的行数据
      let maxRows = 0;
      this.sheetNames.forEach(sheet => {
        maxRows = Math.max(maxRows, this.tableData[sheet].length);
      });
      const rows = [];
      for (let i = 0; i < maxRows; i++) {
        let row = {};
        this.sheetNames.forEach(sheet => {
          row[sheet] = this.tableData[sheet][i] || '';
        });
        rows.push(row);
      }
      return rows;
    },
  },
  methods: {
    headerClicked(column) {
      this.$store.dispatch('saveIsSelectData');
      this.$store.dispatch('saveSelectedData', column.label || column.prop);
    },

    triggerHeaderClick(names) {
      // 模拟点击第一个表头
      const firstColumn = names[0]; // 假设触发第一个表头的点击
      if (firstColumn) {
        const column = { label: firstColumn }; // 模拟一个表头对象
        this.headerClicked(column); // 手动调用点击事件
      }
    },

    printFirstSheetInfo() {
      const sheetName = Object.keys(this.tableData)[0]
      this.$store.dispatch('saveSheetName', sheetName);

      // 前端可以直接把最后的操作传给后端 后面再改
      axios.post('http://127.0.0.1:5000/executeCode', { code: sheetName, startTime:"", endTime:"" })
          .then(response => {
            this.responseData = response.data;
            this.$store.dispatch('saveOriginalTableData', { key: sheetName, value: this.responseData['result'] });
          })
          .catch(error => {
            console.error(error);
          });

      const column = this.tableData[sheetName]
      this.$store.dispatch('saveSheetData', column);
    }
  }
};
</script>

<style>
.data-table-container {
  width: 97% !important;
  left: 1% !important;
  height: 20%;
  position: absolute;
  top: 4%; /* 底部与父容器底部对齐 */
  max-height: 100%;
  overflow: auto; /* 如果内容超出最大高度，显示滚动条 */
  border: 1.8px dashed #d1d0d0;
}

.clickable-cell {
  height: 20px;
  line-height: 20px;
  overflow: hidden;
  cursor: not-allowed; /* 鼠标悬浮时显示禁止图标 */
  border: none;
}
</style>
