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
      title: '管理员控制面板',
      currentPage: 'admin'
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
    
    // 获取所有未结束的抽奖活动（endTime大于当前时间）
    let activeGames = [];
    try {
      activeGames = await Lottery.find({
        endTime: { $gt: new Date() }, // 结束时间大于当前时间
        status: 1 // 状态为"进行中"
      }).sort({ endTime: 1 }); // 按结束时间升序排序，最早结束的排在前面
    } catch (err) {
      console.error('获取抽奖活动错误:', err);
    }
    
    // 为了向后兼容，保留获取最新抽奖活动
    let latestLottery = activeGames.length > 0 ? activeGames[0] : null;
    
    // 获取所有参与者
    let entries = [];
    try {
      // 使用 populate 方法关联 lottery 集合，以获取活动名称
      entries = await Entry.find()
                          .populate('lottery', 'title')
                          .lean();
      
      // 添加 lotteryName 属性到每个 entry
      entries.forEach(entry => {
        entry.lotteryName = entry.lottery ? entry.lottery.title : '未知活动';
      });
    } catch (err) {
      console.error('获取参与者失败:', err);
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
      lotterySetting: latestLottery, // 保留这个以确保向后兼容
      activeGames: activeGames // 新添加的未结束抽奖活动列表
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
    
    // 正确地从请求体中提取所有字段
    const { title, description, nextDrawTime, submissionCode, specialCode } = req.body;
    
    console.log('提交的表单数据:', req.body); // 添加调试日志
    
    // 创建新的抽奖活动
    const newLottery = new Lottery({
      title: title || "默认抽奖活动",
      description: description || "系统自动创建的活动",
      startTime: new Date(), 
      endTime: new Date(nextDrawTime),
      status: 1,
      createdBy: req.session.adminId || req.session.userRole,
      isDrawn: false,
      submissionCode: submissionCode || '' // 使用提取的submissionCode
    });
    
    await newLottery.save();
    
    // 处理特殊验证码设置
    if (req.session.userRole === 'superAdmin' && specialCode) {
      console.log('设置特殊验证码:', specialCode);
      process.env.ADMIN_CODE = specialCode;
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
      // 对AJAX请求返回JSON
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ success: false, message: '未授权访问' });
      }
      return res.redirect('/admin');
    }
    
    await Entry.findByIdAndUpdate(req.params.id, { approved: true });
    
    // 对AJAX请求返回JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true });
    }
    
    // 对传统表单提交返回重定向
    res.redirect('/admin/dashboard#entries-section');
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

// 删除参与者 - 支持AJAX
router.post('/delete/:id', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      // 对AJAX请求返回JSON
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ success: false, message: '未授权访问' });
      }
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
    
    // 对AJAX请求返回JSON成功
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true });
    }
    
    // 对传统表单提交返回重定向
    res.redirect('/admin/dashboard#entries-section');
  } catch (err) {
    console.error('删除参与者错误:', err);
    
    // 对AJAX请求返回JSON错误
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: err.message });
    }
    
    // 对传统表单提交返回错误页面
    res.status(500).send('服务器错误');
  }
});

// 删除所有非中奖条目
router.post('/deleteNonWinners', async (req, res) => {
  try {
      // 查找并删除所有 winner !== true 的条目
      const result = await Entry.deleteMany({ winner: { $ne: true } });
      
      // 记录操作日志
      console.log(`管理员清理了 ${result.deletedCount} 个非中奖条目`);
      
      // 如果是AJAX请求
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({
              success: true,
              message: `成功删除了 ${result.deletedCount} 个非中奖条目`
          });
      }
      
      // 常规表单提交
      req.flash('success', `成功删除了 ${result.deletedCount} 个非中奖条目`);
      res.redirect('/admin/dashboard');
  } catch (error) {
      console.error('删除非中奖条目失败:', error);
      
      // 如果是AJAX请求
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(500).json({
              success: false,
              message: '操作失败，请重试'
          });
      }
      
      // 常规表单提交
      req.flash('error', '操作失败，请重试');
      res.redirect('/admin/dashboard');
  }
});

// 手动开奖功能
router.post('/draw', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin');
    }

    const { lotteryId } = req.body;
    
    // 验证是否提供了抽奖活动ID
    if (!lotteryId) {
      return res.status(400).render('404', {
        title: '页面未找到'
      });
    }

    // 获取抽奖活动信息
    const lottery = await Lottery.findById(lotteryId);
    
    // 检查活动是否存在
    if (!lottery) {
      return res.status(404).render('404', {
        title: '页面未找到'
      });
    }

    // 检查活动是否已经开奖
    if (lottery.isDrawn) {
      return res.status(400).render('404', {
        title: '页面未找到'
      });
    }

    // 查找所有已批准的参与者
    const approvedEntries = await Entry.find({
      lottery: lotteryId,
      approved: true,
      winner: false // 确保之前没有被选为中奖者
    });

    console.log('已批准的参与者:', approvedEntries.map(entry => entry.participantId)); //打印合格参与者的ID

    // 检查是否有足够的参与者
    if (approvedEntries.length === 0) {
      return res.status(400).render('404', {
        title: '页面未找到'
      });
    }

    // 随机选择一个中奖者
    const winnerIndex = Math.floor(Math.random() * approvedEntries.length);
    const winner = approvedEntries[winnerIndex];

    // 更新中奖者信息
    await Entry.findByIdAndUpdate(winner._id, {
      winner: true,
      drawnAt: new Date()
    });

    // 更新抽奖活动状态
    await Lottery.findByIdAndUpdate(lotteryId, {
      isDrawn: true,
      drawnAt: new Date(),
      status: 2 // 已结束
    });

    // 重定向到结果页面
    return res.redirect(`/admin/draw-result/${winner._id}`);
  } catch (err) {
    console.error('开奖错误:', err);
    res.status(500).render('404', {
      title: '页面未找到'
    });
  }
});

// 开奖结果页面
router.get('/draw-result/:entryId', async (req, res) => {
  try {
    // 检查是否已经验证过身份
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin');
    }
    
    // 获取中奖者信息
    const winner = await Entry.findById(req.params.entryId);
    
    
    // 检查是否找到中奖者
    if (!winner) {
      return res.status(404).render('404', {
        title: '页面未找到'
      });
    }
    
    // 获取关联的抽奖活动
    const lottery = await Lottery.findById(winner.lottery);
    
    // 渲染结果页面
    res.render('draw-result', {
      title: '开奖结果',
      winner,
      lottery
    });
  } catch (err) {
    console.error('获取开奖结果错误:', err);
    res.status(500).render('404', {
      title: '页面未找到'
    });
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