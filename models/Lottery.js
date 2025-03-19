const mongoose = require('mongoose');

// 定义抽奖活动模型架构
const LotterySchema = new mongoose.Schema({
    // 抽奖活动标题
    title: {
        type: String,
        required: [true, '请提供抽奖活动标题'],
        trim: true
    },
    
    // 活动描述
    description: {
        type: String,
        default: ''
    },
    
    // 开始时间
    startTime: {
        type: Date,
        required: [true, '请提供开始时间'],
        default: Date.now
    },
    
    // 结束时间（开奖时间）
    endTime: {
        type: Date,
        required: [true, '请提供结束时间']
    },
    
    // 活动状态：0-未开始，1-进行中，2-已结束
    status: {
        type: Number,
        default: 1, // 默认为进行中
        enum: [0, 1, 2]
    },
    
    // 创建者 - 管理员 (修改为字符串类型)
    createdBy: {
        type: String,
        default: 'admin-user'
    },
    
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // 是否已开奖
    isDrawn: {
        type: Boolean,
        default: false
    },
    
    // 开奖时间
    drawnAt: {
        type: Date,
        default: null
    }
});

// 创建并导出模型
const Lottery = mongoose.model('Lottery', LotterySchema);
module.exports = Lottery;