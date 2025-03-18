// 应用入口文件 app.js

// 加载并配置dotenv库, 存储环境变量，比如存储数据库连接字符串、API密钥等敏感信息
require('dotenv').config();

//导入express框架，构建web应用和API
const express = require('express');
//导入express-ejs-layouts库，用于创建模板引擎
const expressLayouts = require('express-ejs-layouts');

//创建应用实例
const app = express();
//设置服务器要监听的端口号，如果环境变量中没有PORT，则使用5000端口
const PORT = process.env.PORT || 5000;

//设置静态文件目录，使浏览器可以直接访问public文件夹中的CSS、JavaScript、图片等静态资源
app.use(express.static('public'));

// Template Engine
//启用express-ejs-layouts模板
app.use(expressLayouts);
//设置默认布局模板的路径
app.set('layout', './layouts/main');
//设置视图引擎为EJS
app.set('view engine', 'ejs');

//注册路由模块
app.use('/', require('./server/routes/main'));
// 挂载管理员路由
app.use('/admin', require('./server/routes/admin'));

// 404处理 - 必须在其他所有路由之后
app.all('*', (req, res) => {
    res.status(404).render('404', { 
        title: '页面未找到'
    });
});

//启动Express服务器，监听指定的PORT
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


