<template>
  <div class="eventDataPopup" v-if="visible" :style="{ left: left + 'px', top: top + 'px'}">
    <Close style="width: 15%;height: 15%;position: absolute;left:80%;cursor:pointer;color: #606266;top: 1.5%" @click="closePopup" class="myIcon"></Close>
    <!-- 第一个内容块 -->
    <div style="height: 100%;">
      <div class="event-row" v-for="(group, index) in ipGroups" :key="index">
        <div class="event-item" v-for="event in group" :key="event">{{ event }}</div>
      </div>
    </div>
  </div>
</template>


<script>
import {Close} from "@element-plus/icons-vue";

export default {
  components: {
    Close,
  },
  props: {
    left: Number,
    top: Number,
    visible: Boolean,
    eventList:Array,
  },
  computed: {
    ipGroups() {
      let groups = [];
      for (let i = 0; i < this.eventList.length; i += 2) {
        groups.push(this.eventList.slice(i, i + 2));
      }
      return groups;
    }
  },
  data() {
    return {

    };
  },
  watch: {
  },
  methods: {
    closePopup() {
      this.$emit('close');
    },
  }
};
</script>

<style scoped>
.event-row {
  display: flex;
  justify-content: start;
  margin-bottom: 6px; /* 或者根据需要调整间距 */
  color: grey;
}

.event-item {
  margin-right: 15px; /* 或者根据需要调整间距 */
}
</style>
