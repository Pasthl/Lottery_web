//导入express模块
const express = require('express');
//创建路由实例
const router = express.Router();

// Route
router.get('', (req, res) => {
    res.render('index', { 
        title: '抽奖活动主页'
    });
});

module.exports = router;