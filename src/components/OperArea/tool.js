export function getNodePosition(node) {
    const x = node.x;
    const y = node.y;
    return {x, y};
}

export function addParameter(string, parameter) {
    let parts = string.split('.');
    // 找到最后一个函数调用
    let lastFunction = parts[parts.length - 1];
    // 检查圆括号内是否有内容，以判断是否已有参数
    let parenthesisContent = lastFunction.substring(lastFunction.indexOf('(') + 1, lastFunction.lastIndexOf(')'));
    if (parenthesisContent.trim() !== '') {
        // 如果已有参数，添加新参数
        let lastParenIndex = lastFunction.lastIndexOf(')');
        lastFunction = lastFunction.substring(0, lastParenIndex) + ', "' + parameter + '")';
    } else {
        // 如果没有参数，添加第一个参数
        lastFunction = lastFunction.replace('()', '("' + parameter + '")');
    }
    // 重建字符串
    parts[parts.length - 1] = lastFunction;
    return parts.join('.');
}

export function enhanceFilterExpression(baseString, params) {
    // 使用正则表达式匹配 `.filter("任意参数")`，并使用捕获组来提取参数
    const pattern = /\.filter\("([^"]*)"\)/;
    // 将数组转换为字符串，并处理为期望的格式
    const paramsString = JSON.stringify(params).replace(/"/g, "'");
    // 使用正则表达式的 replace 方法，在匹配到的字符串后添加额外的参数
    const newString = baseString.replace(pattern, (match, p1) => {
        return `.filter("${p1}","in",${paramsString})`;
    });
    return newString;
}
export function enhanceFilterTimeExpression(original, insertTemplate, startTime, endTime) {
    const dotIndex = original.indexOf('.');
    if (dotIndex === -1) {
        return original;
    }
    // 使用模板字符串和参数格式化要插入的字符串
    const formattedInsertion = insertTemplate.replace('{startTime}', startTime).replace('{endTime}', endTime);
    return original.substring(0, dotIndex + 1) + formattedInsertion + "." + original.substring(dotIndex + 1);
}
export function enhanceAlignExpression(baseString, param) {
    // 使用正则表达式匹配 `.filter("任意参数")`，并使用捕获组来提取参数
    const pattern = /\.align\("([^"]*)"\)/;
    // 将数组转换为字符串，并处理为期望的格式
    // 使用正则表达式的 replace 方法，在匹配到的字符串后添加额外的参数
    const newString = baseString.replace(pattern, (match, p1) => {
        return `.align("${p1}","=","${param}")`;
    });
    return newString;
}