// server/routes/admin.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const fs = require('fs');     
const path = require('path'); 

// 导入模型
const Lottery = require('../../models/Lottery');
const Entry = require('../../models/Entry');

// 从环境变量中读取验证码
// 这里定义两种验证码，一种是管理员验证码，一种是超级管理员验证码
const adminCodes = {
    admin: process.env.ADMIN_CODE || '夏夏姐姐是小猪',      // 普通管理员验证码
    superAdmin: process.env.SUPER_ADMIN_CODE || 'LOVE'  // 超级管理员验证码
};

// 基本管理员页面路由 - 处理 /admin 请求
router.get('/', (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (req.session.isAuthenticated) {
      return res.redirect('/admin/dashboard');
    }
    
    // 渲染admin视图
    res.render('admin', {
      title: '管理员控制面板'
    });
  } catch (err) {
    console.error('管理员页面渲染错误:', err);
    res.status(500).send('服务器错误');
  }
});

// 处理验证码验证
router.post('/verify', (req, res) => {
  try {
    const { verificationCode } = req.body;
    
    // 验证码为空
    if (!verificationCode) {
      return res.render('admin', { 
        title: '管理员控制面板',
        error: '请输入验证码' 
      });
    }
    
    // 验证验证码
    if (verificationCode === adminCodes.admin) {
      // 普通管理员验证成功
      req.session.isAuthenticated = true;
      req.session.userRole = 'admin';
      req.session.adminId = 'admin-user'; // 简单的标识符而非实际用户ID
      return res.redirect('/admin/dashboard');
    } else if (verificationCode === adminCodes.superAdmin) {
      // 超级管理员验证成功
      req.session.isAuthenticated = true;
      req.session.userRole = 'superAdmin';
      req.session.adminId = 'super-admin-user'; // 简单的标识符而非实际用户ID
      return res.redirect('/admin/dashboard');
    } else {
      // 验证失败
      return res.render('admin', { 
        title: '管理员控制面板',
        error: '验证码不正确' 
      });
    }
  } catch (err) {
    console.error('验证码验证错误:', err);
    res.status(500).send('服务器错误');
  }
});

// 管理员仪表盘页面
router.get('/dashboard', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin');
    }
    
    // 获取最新的抽奖活动
    let latestLottery = null;
    try {
      latestLottery = await Lottery.findOne().sort({ createdAt: -1 });
    } catch (err) {
      console.error('获取抽奖活动错误:', err);
    }
    
    // 获取所有参与者
    let entries = [];
    try {
      entries = await Entry.find().sort({ createdAt: -1 }).limit(100);
    } catch (err) {
      console.error('获取参与者错误:', err);
      // 使用示例数据作为备份
      entries = [
        { id: 1, userId: 'user123', imageUrl: '/uploads/image1.jpg', approved: false },
        { id: 2, userId: 'user456', imageUrl: '/uploads/image2.jpg', approved: true },
        { id: 3, userId: 'user789', imageUrl: '/uploads/image3.jpg', approved: false }
      ];
    }
    
    // 判断用户角色，提供相应的欢迎语
    const welcomeMessage = req.session.userRole === 'superAdmin' 
      ? '欢迎回来，超级管理员！您拥有所有权限。' 
      : '你好，又开始准备抽奖了？';
    
    res.render('dashboard', { 
      title: '管理员仪表盘',
      userRole: req.session.userRole,
      welcomeMessage,
      entries,
      lotterySetting: latestLottery
    });
  } catch (err) {
    console.error('仪表盘页面渲染错误:', err);
    res.status(500).send('服务器错误');
  }
});

// 处理抽奖设置
router.post('/settings', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin');
    }
    
    const { title, description, nextDrawTime } = req.body;
    
    // 创建新的抽奖活动
    const newLottery = new Lottery({
      title: title || "默认抽奖活动",
      description: description || "系统自动创建的活动",
      startTime: new Date(), // 当前时间作为开始时间
      endTime: new Date(nextDrawTime), // 下次抽奖时间作为结束时间
      status: 1, // 进行中
      createdBy: req.session.adminId || req.session.userRole, // 使用简单标识符
      isDrawn: false
    });
    
    await newLottery.save();
    
    // 如果是超级管理员，可以处理特殊验证码设置
    if (req.session.userRole === 'superAdmin' && req.body.specialCode) {
      // 这里可以实现保存特殊验证码的逻辑
      console.log('设置特殊验证码:', req.body.specialCode);
      // 简单示例：保存到环境变量(仅在本次运行中有效)
      process.env.ADMIN_CODE = req.body.specialCode;
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('保存抽奖设置错误:', err);
    res.status(500).send('服务器错误');
  }
});

// 审核参与者 - 支持AJAX
router.post('/approve/:id', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.json({ success: false, message: '未授权访问' });
    }
    
    await Entry.findByIdAndUpdate(req.params.id, { approved: true });
    
    // 对AJAX请求返回JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true });
    }
    
    // 对传统表单提交返回重定向
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('批准参与者错误:', err);
    
    // 对AJAX请求返回JSON错误
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: err.message });
    }
    
    // 对传统表单提交返回错误页面
    res.status(500).send('服务器错误');
  }
});

// 删除参与者
router.post('/delete/:id', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin');
    }
    
    // 先获取条目，以便获取文件路径
    const entry = await Entry.findById(req.params.id);
    
    if (entry && entry.screenshot) {
      // 获取文件的系统路径
      const filePath = path.join(__dirname, '../../public', entry.screenshot);
      
      // 检查文件是否存在
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
          // 文件存在，删除它
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error('删除文件错误:', unlinkErr);
            } else {
              console.log('成功删除文件:', filePath);
            }
          });
        } else {
          console.log('文件不存在:', filePath);
        }
      });
    }
    
    // 然后从数据库中删除条目
    await Entry.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/dashboard#entries-section');
  } catch (err) {
    console.error('删除参与者错误:', err);
    res.status(500).send('服务器错误');
  }
});

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/admin');
  });
});

module.exports = router;