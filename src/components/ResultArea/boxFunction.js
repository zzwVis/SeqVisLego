let nextId = 1;
let nextTrueId = 1

export function boxClass(box) {
    return {
        [`box-${box.id}`]: true,
        'selected': box.isSelected
    };
}

export function boxStyle(box) {
    return {
        width: box.width,
        height: box.height,
        position: 'absolute',
        top: box.y + '%',
        left: box.x + '%',
        border: '2px solid #D3D3D3',
        'border-radius': '2px',
        'box-sizing': 'border-box',
        'background': 'white'
    };
}

export function handleIncrement(boxes, boxIndex, rootWidth, rootHeight, direction, containerId, selectId) {
    let box = boxes[boxIndex]
    if (!box) return;
    const gap = 1; // 间隙大小，单位为百分比
    const boxWidth= parseFloat(box.width.replace('%', ''))/100;
    const boxHeight= parseFloat(box.height.replace('%', ''))/100;
    if (direction==="vertical") {
        const newWidth = boxWidth / 2;
        const newBox1 = { id: box.id, trueId: nextTrueId++, parentId:box.trueId, width: (newWidth*100-gap/2)+"%", height: boxHeight*100+"%", x:box.x, y:box.y, children: [],parent:[],isSelected:true };
        const newBox2 = { id: nextId++, trueId: nextTrueId++,parentId:box.trueId, width: (newWidth*100-gap/2)+"%", height: boxHeight*100+"%", x:box.x+newWidth*100+gap/2, y:box.y, children: [],parent:[], isSelected: false };
        newBox1.parent.push(box)
        newBox2.parent.push(box)
        // 移除当前box
        boxes.splice(boxIndex, 1);
        boxes.push(newBox1)
        boxes.push(newBox2)
        box.children=[ newBox1, newBox2 ]

        boxes.forEach(box => {
            if (box !== newBox2) {
                box.isSelected = false;
            }
        });
        newBox2.isSelected = true;
        containerId.string = "chart-container-" + newBox2.id;
        selectId.string = containerId.string
    } else {
        const newHeight = boxHeight / 2;
        const newBox1 = { id: box.id, trueId: nextTrueId++ ,parentId:box.trueId, width: boxWidth*100+"%", height: (newHeight*100-gap/2)+"%", x:box.x, y:box.y, children: [],parent:[], isSelected:true };
        const newBox2 = { id: nextId++, trueId: nextTrueId++ ,parentId:box.trueId, width: boxWidth*100+"%", height: (newHeight*100-gap/2)+"%", x:box.x, y:box.y+newHeight*100+gap/2, children: [],parent:[],isSelected:false };
        newBox1.parent.push(box)
        newBox2.parent.push(box)
        boxes.splice(boxIndex, 1);
        boxes.push(newBox1)
        boxes.push(newBox2)
        box.children=[ newBox1, newBox2 ]

        boxes.forEach(box => {
            if (box !== newBox2) {
                box.isSelected = false;
            }
        });
        newBox2.isSelected = true;
        containerId.string = "chart-container-" + newBox2.id;
        selectId.string = containerId.string
    }
}

export function handleDecrement(boxes,boxIndex, containerId, selectId) {
    let box = boxes[boxIndex];
    if (!box || !box.parent) return;
    //将当前box的父box加入boxes
    box.parent[0].isSelected=true
    boxes.push(box.parent[0])
    // 重置所有盒子的选中状态
    boxes.forEach(box => {
        if (box !== box.parent[0]) {
            box.isSelected = false;
        }
    });

    // 找到父级 box 的索引
    const parentIndex = box.parentId
    if (parentIndex !== -1) {
        // 删除所有具有相同 parent 的 box
        const siblings = boxes.filter(b => b.parentId === box.parentId);
        siblings.forEach(sibling => {
            const index = boxes.indexOf(sibling);
            if (index !== -1) {
                boxes.splice(index, 1);
            }
        });
    }

    box.parent[0].isSelected = true;
    containerId.string = "chart-container-" + box.parent[0].id;
    selectId.string = containerId.string
}
