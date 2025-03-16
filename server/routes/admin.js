const express = require('express');
const router = express.Router();

// 管理员主页
router.get('', (req, res) => {
    res.render('admin', { 
        title: '管理员页面'
    });
});

module.exports = router;