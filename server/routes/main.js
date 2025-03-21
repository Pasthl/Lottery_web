// server/routes/main.js
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// 导入模型
// 注意修改路径以匹配你的项目结构
const Lottery = require('../../models/Lottery');
const Entry = require('../../models/Entry');

// 配置文件上传
// 配置 Multer 存储
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 确保上传目录存在
        const uploadDir = './public/uploads/';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'screenshot-' + uniqueSuffix + ext);
    }
});

// 文件过滤器 - 只接受图片
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只能上传图片文件!'), false);
    }
};

// 创建 multer 实例
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 限制5MB
});

// 主页路由
router.get('/', async (req, res) => {
    try {
        // 判断是否有成功提交的消息
        const success = req.query.success === 'true' ? 'true' : undefined;
        
        // 获取所有进行中的抽奖活动
        let activeGames = [];
        let winners = [];
        
        try {
            // 查找所有进行中的抽奖活动
            activeGames = await Lottery.find({ 
                status: 1, // 状态为"进行中"
                endTime: { $gt: new Date() } // 结束时间大于当前时间
            }).sort({ endTime: 1 }); // 按结束时间升序排序
            
            // 获取当前最早结束的抽奖活动作为默认活动
            const currentLottery = activeGames.length > 0 ? activeGames[0] : null;
            
            // 查找最近的中奖者
            winners = await Entry.find({ winner: true })
                .populate('lottery', 'title') // 填充抽奖活动信息，只获取标题字段
                .sort({ drawnAt: -1 }) // 按开奖时间降序排序
                .limit(5); // 限制数量为5
        } catch (dbErr) {
            console.error('数据库查询错误:', dbErr);
        }
        
        // 渲染主页
        res.render('index', {
            title: '抽奖活动主页',
            currentPage: 'home', // 用于导航栏标识
            currentLottery: activeGames.length > 0 ? activeGames[0] : null, // 保留兼容性
            activeGames,  // 传递所有进行中的抽奖活动
            winners,
            success
        });
    } catch (err) {
        console.error('主页加载错误:', err);
        res.render('index', {
            title: '抽奖活动主页',
            error: '加载数据时出错'
        });
    }
});

// 修改提交抽奖表单路由
router.post('/submit', upload.single('screenshot'), async (req, res) => {
    try {
        // 获取表单数据
        const { participantId, lottery } = req.body;
        
        let targetLotteryId = lottery;
        
        // 验证是否有抽奖活动ID
        if (!targetLotteryId) {
            // 查找当前活动
            const currentLottery = await Lottery.findOne({ 
                status: 1,
                endTime: { $gt: new Date() }
            });
            
            if (!currentLottery) {
                return res.status(400).render('index', {
                    title: '抽奖活动主页',
                    error: '当前没有进行中的抽奖活动'
                });
            } else {
                targetLotteryId = currentLottery._id;
            }
        }
        
        // 检查是否上传了文件
        if (!req.file) {
            return res.status(400).render('index', {
                title: '抽奖活动主页',
                error: '请上传截图'
            });
        }

        // 检查用户ID是否提供
        if (!participantId) {
            return res.status(400).render('index', {
                title: '抽奖活动主页',
                error: '请提供您的ID'
            });
        }
        
        // 检查用户是否已经参与了当前抽奖
        const existingEntry = await Entry.findOne({
            participantId: participantId,
            lottery: targetLotteryId
        });
        
        if (existingEntry) {
            return res.status(400).render('index', {
                title: '抽奖活动主页',
                error: '您已经参与过这次抽奖了',
                participantId: participantId
            });
        }
        
        // 获取抽奖活动信息，检查是否设置了验证码
        const lotteryInfo = await Lottery.findById(targetLotteryId);
        console.log('抽奖活动信息:', lotteryInfo);
        
        // 检查该抽奖活动是否设置了验证码
        if (lotteryInfo && lotteryInfo.submissionCode && lotteryInfo.submissionCode.trim() !== '') {
            // 活动设置了验证码，需要用户验证
            console.log('该活动设置了验证码，需要验证');
            
            // 保存表单数据，以便验证后使用
            const formData = {
                participantId,
                lottery: targetLotteryId,
                screenshotPath: `/uploads/${req.file.filename}`
            };
            
            // 渲染验证页面
            return res.render('verify-submission', {
                title: '验证提交',
                lotteryTitle: lotteryInfo.title, // 传递活动标题
                formData,
                error: null
            });
        } else {
            // 没有设置验证码，直接创建新的抽奖条目
            console.log('该活动没有设置验证码，直接提交');
            
            const newEntry = new Entry({
                participantId,
                screenshot: `/uploads/${req.file.filename}`,
                lottery: targetLotteryId,
                approved: false,
                winner: false,
                createdAt: new Date()
            });
            
            // 保存到数据库
            await newEntry.save();
            
            // 渲染感谢页面
            return res.render('thankyou', {
                title: '提交成功',
                message: '感谢参与！你的提交会经过管理员审核后加入奖池！'
            });
        }
    } catch (err) {
        console.error('提交表单错误:', err);
        return res.status(500).render('index', {
            title: '抽奖活动主页',
            error: '提交失败，请重试'
        });
    }
});

// 添加验证码验证路由
router.post('/verify-submission', async (req, res) => {
    try {
        const { submissionCode, participantId, lottery: lotteryId, screenshotPath } = req.body;
        
        // 获取抽奖活动
        const lottery = await Lottery.findById(lotteryId);
        
        if (!lottery) {
            return res.status(400).render('index', {
                title: '抽奖活动主页',
                error: '抽奖活动不存在'
            });
        }
        
        console.log('验证码比对:', {
            用户输入: submissionCode,
            数据库中: lottery.submissionCode
        });
        
        // 验证码比对
        if (submissionCode !== lottery.submissionCode) {
            // 验证失败，重新显示验证页面
            const formData = {
                participantId,
                lottery: lotteryId,
                screenshotPath
            };
            
            return res.render('verify-submission', {
                title: '验证提交',
                lotteryTitle: lottery.title,
                formData,
                error: '验证码不正确，请重试'
            });
        }
        
        // 验证成功，创建新的抽奖条目
        const newEntry = new Entry({
            participantId,
            screenshot: screenshotPath,
            lottery: lotteryId,
            approved: false,
            winner: false,
            createdAt: new Date()
        });
        
        // 保存到数据库
        await newEntry.save();
        
        // 渲染感谢页面
        return res.render('thankyou', {
            title: '提交成功',
            message: '感谢参与！你的提交会经过管理员审核后加入奖池！'
        });
        
    } catch (err) {
        console.error('验证提交错误:', err);
        return res.status(500).render('index', {
            title: '抽奖活动主页',
            error: '提交失败，请重试'
        });
    }
});

// 彩蛋页面路由
router.get('/easter-egg', (req, res) => {
    res.render('easter-egg', { 
      title: 'BREAKING...',
      layout: false 
    });
  });

// 关于页面路由
router.get('/about', (req, res) => {
    res.render('about', { 
        title: '关于本站',
        currentPage: 'about' // 用于导航栏标识
    });
});

// 处理404错误 - 捕获所有未匹配的GET请求
router.get('*', (req, res) => {
    res.status(404).render('404', { 
        title: '页面未找到'
    });
});

module.exports = router;