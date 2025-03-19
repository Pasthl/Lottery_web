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
        
        // 尝试从数据库获取当前抽奖活动
        let currentLottery = null;
        let winners = [];
        let approvedCount = 0;
        
        try {
            // 查找当前进行中的抽奖活动
            currentLottery = await Lottery.findOne({ 
                status: 1, // 状态为"进行中"
                endTime: { $gt: new Date() } // 结束时间大于当前时间
            }).sort({ endTime: 1 }); // 按结束时间升序排序
            
            // 如果有当前抽奖活动，获取已批准的参与者数量
            if (currentLottery) {
                approvedCount = await Entry.countDocuments({
                    lottery: currentLottery._id,
                    approved: true
                });
            }
            
            // 查找最近的中奖者
            winners = await Entry.find({ 
                winner: true 
            })
            .sort({ drawnAt: -1 }) // 按开奖时间降序排序
            .limit(5); // 限制数量为5
        } catch (dbErr) {
            console.error('数据库查询错误:', dbErr);
            // 数据库错误时继续使用空值，会显示静态内容
        }
        
        // 渲染主页
        res.render('index', {
            title: '抽奖活动主页',
            currentLottery,
            winners,
            approvedCount,
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

// 提交抽奖表单
router.post('/submit', upload.single('screenshot'), async (req, res) => {
    try {
        // 获取表单数据
        const { participantId, lotteryId } = req.body;
        
        let targetLotteryId = lotteryId;
        
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
        
        // 创建新的抽奖条目
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
            message: '感谢参与！您的提交将在审核后生效。'
        });
    } catch (err) {
        console.error('提交表单错误:', err);
        return res.status(500).render('index', {
            title: '抽奖活动主页',
            error: '提交失败，请重试'
        });
    }
});

// 处理404错误 - 捕获所有未匹配的GET请求
router.get('*', (req, res) => {
    res.status(404).render('404', { 
        title: '页面未找到'
    });
});

module.exports = router;