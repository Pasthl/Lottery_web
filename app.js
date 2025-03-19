// 应用入口文件 app.js

// 加载并配置dotenv库, 存储环境变量，比如存储数据库连接字符串、API密钥等敏感信息
require('dotenv').config();

//导入express框架，构建web应用和API
const express = require('express');
//导入express-ejs-layouts库，用于创建模板引擎
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const dotenv = require('dotenv');
// 导入session模块，用于管理用户会话
const session = require('express-session');

// 加载环境变量
dotenv.config();

// 导入数据库连接
const connectDB = require('./config/db');

//创建应用实例
const app = express();
//设置服务器要监听的端口号，如果环境变量中没有PORT，则使用5000端口
const PORT = process.env.PORT || 5000;

// 连接到数据库
connectDB()
  .then(() => console.log('数据库连接成功'))
  .catch(err => console.error(`数据库连接失败: ${err.message}`));

//设置静态文件目录，使浏览器可以直接访问public文件夹中的CSS、JavaScript、图片等静态资源
app.use(express.static('public'));

// 配置会话
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// Template Engine
//启用express-ejs-layouts模板
app.use(expressLayouts);
//设置默认布局模板的路径
app.set('layout', './layouts/main');
//设置视图引擎为EJS
app.set('view engine', 'ejs');

// 添加请求体解析中间件 - 用于处理表单提交
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 将用户会话数据添加到所有视图中
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.userRole = req.session.userRole || null;
  next();
});

// 先注册admin路由
app.use('/admin', require('./server/routes/admin'));
// 再注册主路由
app.use('/', require('./server/routes/main')); //因为main.js的最后还有一个404，导致阻塞了admin的路由

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