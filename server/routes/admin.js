// server/routes/admin.js
const express = require('express');
const router = express.Router();

// 基本管理员页面路由 - 处理 /admin 请求
router.get('/', (req, res) => {
  try {
    // 渲染admin视图
    res.render('admin', { 
      title: '管理员控制面板'
    });
  } catch (err) {
    console.error('管理员页面渲染错误:', err);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;