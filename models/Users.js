const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 定义用户模型架构
const UserSchema = new mongoose.Schema({
    // 用户名 - 必须唯一
    username: {
        type: String,
        required: [true, '请提供用户名'],
        unique: true,
        trim: true
    },
    // 密码 - 必须
    password: {
        type: String,
        required: [true, '请提供密码'],
        minlength: 6
    },
    // 显示名称 - 可选
    displayName: {
        type: String,
        default: ''
    },
    // 用户角色：0-普通管理员，1-超级管理员
    role: {
        type: Number,
        default: 0,
        enum: [0, 1]
    },
    // 创建时间
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 密码加密中间件 - 在保存用户前执行
UserSchema.pre('save', async function(next) {
    // 只有在密码被修改时才重新加密
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        // 生成盐值
        const salt = await bcrypt.genSalt(10);
        // 使用盐值加密密码
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 验证密码方法
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// 创建并导出模型
const User = mongoose.model('User', UserSchema);
module.exports = User;