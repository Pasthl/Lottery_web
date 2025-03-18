// server/routes/main.js
const express = require('express');
const router = express.Router();

// 主页路由
router.get('/', (req, res) => {
    // 简单渲染主页模板
    // 后续可以添加数据查询和传递
    res.render('index', {
        title: '抽奖活动主页' // 传递页面标题
    });
});

// 提交抽奖表单的路由
router.post('/submit', (req, res) => {
    // 目前只是简单返回提交成功的消息
    // 后续会添加文件上传和数据库存储功能
    res.send('表单提交成功！后续将添加实际处理逻辑。');
});

module.exports = router;