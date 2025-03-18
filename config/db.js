// 数据库连接配置
const mongoose = require('mongoose');

/**
 * 连接到MongoDB数据库
 * @returns {Promise} 连接成功的Promise
 */
const connectDB = async () => {
    try {
        // 使用环境变量中的MongoDB URI进行连接
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // 这些选项已在新版Mongoose中默认设置，但为了兼容性保留
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log(`MongoDB连接成功: ${conn.connection.host}`);
        return conn;
    } catch (err) {
        console.error(`MongoDB连接错误: ${err.message}`);
        // 如果连接失败，终止程序
        process.exit(1);
    }
};

module.exports = connectDB;