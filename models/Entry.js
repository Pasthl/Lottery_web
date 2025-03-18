const mongoose = require('mongoose');

// 定义抽奖条目模型架构
const EntrySchema = new mongoose.Schema({
    // 参与者ID
    participantId: {
        type: String,
        required: [true, '请提供参与者ID'],
        trim: true
    },
    // 截图文件路径
    screenshot: {
        type: String,
        required: [true, '请提供截图']
    },
    // 条目状态：0-待审核，1-已批准，2-已拒绝
    status: {
        type: Number,
        default: 0,
        enum: [0, 1, 2]
    },
    // 是否为中奖者
    isWinner: {
        type: Boolean,
        default: false
    },
    // 审核评论
    comment: {
        type: String,
        default: ''
    },
    // 关联的抽奖活动
    lottery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lottery',
        required: true
    },
    // 审核者 - 管理员
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    },
    // 审核时间
    reviewedAt: {
        type: Date,
        default: null
    }
});

// 创建并导出模型
const Entry = mongoose.model('Entry', EntrySchema);
module.exports = Entry;