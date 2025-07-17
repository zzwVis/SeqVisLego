<script setup>
  import operArea from "./components/OperArea/OperArea.vue"
  import filterArea from "./components/MainArea/FilterArea.vue"
  import resultArea from "./components/ResultArea/ResultArea.vue"
  import tempView from "./components/ResultArea/TempView.vue"

</script>

<template>
	<div class="grid-container">
		<div class="grid-item block1">
      <filter-area />
		</div>
		<div class="grid-item block3">
      <oper-area />
		</div>
		<div class="grid-item block4">
      <result-area />
		</div>
<!--    <div class="grid-item block5">-->
<!--      <temp-view />-->
<!--    </div>-->
<!--		<div class="grid-item block5">-->
<!--      <oper-block />-->
<!--		</div>-->
	</div>
</template>

<style scoped>

</style>