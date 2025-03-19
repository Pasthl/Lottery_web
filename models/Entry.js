const mongoose = require('mongoose');

// 定义参与抽奖条目的模型架构
const EntrySchema = new mongoose.Schema({
    // 用户ID/名称 - 改为 participantId
    participantId: {
        type: String,
        required: [true, '请提供用户ID'],
        trim: true
    },
    
    // 截图URL - 改为 screenshot
    screenshot: {
        type: String,
        required: [true, '请提供截图URL']
    },
    
    // 关联的抽奖活动ID - 改为 lottery
    lottery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lottery'
    },
    
    // 是否已批准
    approved: {
        type: Boolean,
        default: false
    },
    
    // 是否为中奖者
    winner: {
        type: Boolean,
        default: false
    },
    
    // 开奖时间（如果是中奖者）
    drawnAt: {
        type: Date,
        default: null
    },
    
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 创建并导出模型
const Entry = mongoose.model('Entry', EntrySchema, 'entries');
module.exports = Entry;