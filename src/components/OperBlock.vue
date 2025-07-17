<template>
    <div class="draggable-square-container" ref="container"></div>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'DraggableSquare',
  data() {
    return {
      rectWidth: "5%",
    };
  },
  mounted() {
    this.createDraggableSquare();
    window.addEventListener('resize', this.handleResize);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },

  methods: {
    handleResize() {
      // 当窗口大小变化时重新计算矩形块的位置和尺寸
      d3.select(this.$refs.container).select('svg').remove();
      this.createDraggableSquare();
    },

    createDraggableSquare() {
      const svg = d3.select(this.$refs.container)
          .append('svg')
          .attr('class', 'draggable-square')
          .attr('width', '100%')
          .attr('height', '100%');

      const rootElement = document.getElementsByClassName('grid-container')[0]
      const rootRect = rootElement.getBoundingClientRect();
      const rootWidth=rootRect.width
      const rootHeight=rootRect.height

      const block5Element = document.getElementsByClassName('grid-item block5')[0]
      const block5Rect = block5Element.getBoundingClientRect();
      const offsetX = block5Rect.left;
      const offsetY = block5Rect.top;
      const containerWidth=block5Rect.width
      const containerHeight=block5Rect.height
      const rectNum=9

      //判断是否被拖动至于指定位置
      const blockElement = document.getElementsByClassName("workflowArea")[0]
      const blockRect = blockElement.getBoundingClientRect();
      const blockLeft = blockRect.left;
      const blockRight = blockRect.right;
      const blockTop = blockRect.top;
      const blockBottom = blockRect.bottom;
      const block5Width = block5Rect.width;
      const block5Height = block5Rect.height;

      const rectWidth= 0.5/rectNum;
      const rectWidthFloat= rectWidth*rootWidth
      const rectSpacing =rectWidthFloat/2
      const totalWidth = rectNum*rectWidthFloat+(rectNum-1)*rectSpacing
      const marginLeft = (containerWidth-totalWidth)/2
      const rectHeight= containerHeight/rootHeight/2*100+"%"
      const rectHeightFloat= parseFloat(rectHeight.replace('%', ''))/100*rootHeight
      //矩形块的初始坐标
      const rectCoordinates = []; // 存储矩形块的坐标

      // 计算文本大小
      function calculateFontSize(rectWidth, rectHeight) {
        return Math.min(rectWidth, parseFloat(rectHeight.replace('%', ''))/100*rootHeight) / 4 + "px";
      }

      for (let i = 0; i < rectNum; i++) {
        // const rectX = offsetX+((block5Width-rectWidth*rootWidth) /2); // 矩形块的x坐标
        // const rectY = offsetY+((i + 1) * (rectHeight*rootHeight + this.rectSpacing)) // 矩形块的y坐标
        const rectY = offsetY+((block5Height- rectHeightFloat) /2);
        const rectX = offsetX+(i * rectWidth*rootWidth + i * rectSpacing + marginLeft)
        const textX=rectX+rectWidth*rootWidth/2
        const textY=rectY+containerHeight/4

        //添加矩形块
        const rect = svg.append('rect')
            .attr('width', rectWidthFloat)
            .attr('class', 'draggable-rect')
            .attr('height', rectHeight)
            .attr('fill', '#eeeeee')
            .attr('x', rectX)
            .attr('y', rectY)
            .attr('id', 'myRect'+i)
            .attr('cursor','move')
            .attr('rx', 10) // 圆角的 x 半径
            .attr('ry', 10) // 圆角的 y 半径
            .on('mouseover', function() {
              d3.select(this)
                  .attr('fill','#ddd'); // 鼠标悬停时的填充颜色
            })
            .on('mouseout', function() {
              d3.select(this)
                  .attr('fill', '#eeeeee'); // 鼠标离开时恢复原始填充颜色
            });

        // 创建 filter
        const shadowFilter = svg.append('defs')
            .append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%');

        shadowFilter.append('feDropShadow')
            .attr('dx', 5)
            .attr('dy', 5)
            .attr('stdDeviation', 2)
            .attr('flood-color', '#D3D3D3');
        // 应用阴影 filter 到矩形
        rect.style('filter', 'url(#drop-shadow)');

        // 运算块文字
        let textContent = ["filter","group by","count","unique count","aggregate",'view type','unique attr',"intersection set","difference set"]

        const text = svg.append('text')
            .text(textContent[i]) // 使用数组中的文本
            .attr('x', textX)
            .attr('y', textY)
            .attr('id','myText'+i)
            .attr('fill','#696969')
            .style('font-size', calculateFontSize(rect.attr('width'), rect.attr('height')))
            // .style('font-weight',550)
            .attr('dominant-baseline', 'middle') // 垂直居中
            .attr('text-anchor', 'middle'); // 水平居中

        rectCoordinates.push({ x: rectX, y: rectY }); // 将坐标添加到数组中

        const vm = this; // 在事件处理器外部捕获 Vue 组件实例
        const drag = d3.drag()
            .on('start', function () {
              d3.select(this)
                  // .style('stroke', 'red');
            })
            .on('drag', function () {
              const pt = d3.pointer(event);
              //矩形和文字同时移动
              const dragTarget=d3.select(this);
              const id=dragTarget.attr('id')
              const rect=d3.select('#myRect'+id.substring(id.length-1))
              const text=d3.select('#myText'+id.substring(id.length-1))

              rect.attr('x', pt[0] - rectWidthFloat/2)
                  .attr('y', pt[1] - rectHeightFloat/2)
              text.attr('x', pt[0])
                  .attr('y', pt[1])
            })
            .on('end', function () {
              const curX = parseFloat(d3.select(this).attr('x'));
              const curY = parseFloat(d3.select(this).attr('y'));
              const originX=rectCoordinates[i].x
              const originY=rectCoordinates[i].y

              if ((curX+rectWidthFloat) < blockLeft || curX > blockRight || (curY+rectHeightFloat) < blockTop || curY > blockBottom) {
                // 位置不匹配，恢复至初始位置
                rect.attr('x', originX)
                    .attr('y', originY)
                text.attr('x', textX)
                    .attr('y', textY);
              } else {
                // 位置匹配，更新全局变量
                rect.attr('x', originX)
                    .attr('y', originY)
                text.attr('x', textX)
                    .attr('y', textY);
                const dragTarget = d3.select(this);
                const id = dragTarget.attr('id');
                const index = parseInt(id.substring(id.length - 1)); // 提取索引号
                const currentText = textContent[index]; // 获取当前文本内容
                vm.$store.dispatch('saveSelectedOperator', currentText);
                vm.$store.dispatch('saveIsDrag');
              }
            });
        rect.call(drag);
      }
    },
  },
};
</script>

<style scoped>
.draggable-square-container {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  pointer-events: none;
}

:deep(.draggable-rect) {
  pointer-events: auto; /* 矩形块接收鼠标事件 */
}

</style>

