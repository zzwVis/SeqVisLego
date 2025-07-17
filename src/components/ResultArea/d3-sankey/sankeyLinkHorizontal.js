import { linkHorizontal } from "d3-shape";

function horizontalSource(rectWidth,hasHead) {
  return function(d) {
    if(hasHead){
      return [(d.source.x1 + d.source.x0) / 2 + Math.max(((d.source.x1 - d.source.x0) / 2), ((d.source.y1 - d.source.y0) / 2)) + rectWidth, d.y0];
    }
    else{
      return [(d.source.x1 + d.source.x0) / 2 , d.y0];
    }
  };
}

function horizontalTarget(rectWidth,hasHead) {
  return function(d) {
    if(hasHead){
      return [(d.target.x1 + d.target.x0) / 2 - Math.max(((d.target.x1 - d.target.x0) / 2), ((d.target.y1 - d.target.y0) / 2)) - rectWidth, d.y1];
    }
    else{
      return [(d.target.x1 + d.target.x0) / 2, d.y1];
    }
  };
}

export default function(rectWidth,hasHead) {
  return linkHorizontal()
      .source(horizontalSource(rectWidth,hasHead))
      .target(horizontalTarget(rectWidth,hasHead));
}
