import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import store from './store'
// 统一导入el-icon图标
import * as ElIconModules from '@element-plus/icons'

import './style.css';

const app = createApp(App);

// 统一注册el-icon图标
for(let iconName in ElIconModules){
    app.component(iconName,ElIconModules[iconName])
}
app.use(ElementPlus)
app.use(store)
app.mount('#app')
