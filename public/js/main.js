// 等待DOM完全加载后执行
document.addEventListener('DOMContentLoaded', function() {
    // 获取倒计时相关元素
    const countdownTimer = document.getElementById('countdown-timer');
    
    // 如果存在倒计时元素
    if (countdownTimer) {
        let endDate;
        
        // 检查元素上是否有data-end属性（服务器提供的结束时间）
        const serverEndTime = countdownTimer.getAttribute('data-end');
        
        if (serverEndTime) {
            // 使用服务器提供的结束时间
            endDate = new Date(parseInt(serverEndTime));
        } else {
            // 尝试从localStorage获取保存的结束时间
            let savedEndTime = localStorage.getItem('lotteryEndTime');
            
            if (savedEndTime) {
                // 如果有保存的结束时间，使用它
                endDate = new Date(parseInt(savedEndTime));
                
                // 检查结束时间是否已过期（已经过去了）
                if (endDate <= new Date()) {
                    // 如果已过期，创建新的结束时间
                    console.log("倒计时已过期，创建新的倒计时");
                    endDate = createNewEndTime();
                }
            } else {
                // 如果没有保存的结束时间，创建新的
                console.log("没有保存的倒计时，创建新的倒计时");
                endDate = createNewEndTime();
            }
            
            // 保存结束时间到localStorage（仅当没有服务器提供的时间时）
            localStorage.setItem('lotteryEndTime', endDate.getTime().toString());
        }
        
        // 启动倒计时
        startCountdown(endDate);
    }
    
    // 表单验证
    const lotteryForm = document.getElementById('lottery-form');
    if (lotteryForm) {
        lotteryForm.addEventListener('submit', validateForm);
    }
});

/**
 * 创建新的结束时间（当前时间加7天）
 * @returns {Date} 新的结束日期
 */
function createNewEndTime() {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // 设置为一周后
    return endDate;
}

/**
 * 开始倒计时功能
 * @param {Date} endDate - 倒计时结束日期
 */
function startCountdown(endDate) {
    // 获取各个时间元素
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');
    
    // 如果找不到必要的元素，则退出函数
    if (!daysElement || !hoursElement || !minutesElement || !secondsElement) {
        console.error('找不到倒计时元素');
        return;
    }
    
    // 更新倒计时的函数
    function updateCountdown() {
        // 获取当前时间
        const currentTime = new Date().getTime();
        
        // 计算剩余时间（毫秒）
        const timeRemaining = endDate.getTime() - currentTime;
        
        // 如果倒计时结束
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            daysElement.textContent = '00';
            hoursElement.textContent = '00';
            minutesElement.textContent = '00';
            secondsElement.textContent = '00';
            return;
        }
        
        // 计算剩余天数、小时、分钟和秒数
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        // 更新显示，确保两位数格式
        daysElement.textContent = days < 10 ? '0' + days : days;
        hoursElement.textContent = hours < 10 ? '0' + hours : hours;
        minutesElement.textContent = minutes < 10 ? '0' + minutes : minutes;
        secondsElement.textContent = seconds < 10 ? '0' + seconds : seconds;
    }
    
    // 立即执行一次，避免延迟
    updateCountdown();
    
    // 每秒更新一次
    const timerInterval = setInterval(updateCountdown, 1000);
}

/**
 * 验证表单提交
 * @param {Event} event - 表单提交事件
 */
function validateForm(event) {
    // 获取表单字段
    const participantId = document.getElementById('participant-id').value.trim();
    const screenshot = document.getElementById('screenshot').files;
    
    let isValid = true;
    let errorMessage = '';
    
    // 验证ID
    if (!participantId) {
        errorMessage = '请输入您的ID';
        isValid = false;
    }
    
    // 验证截图
    if (!screenshot || screenshot.length === 0) {
        errorMessage = '请上传截图';
        isValid = false;
    } else {
        // 文件类型验证
        const fileType = screenshot[0].type;
        if (!fileType.startsWith('image/')) {
            errorMessage = '只能上传图片文件';
            isValid = false;
        }
        
        // 文件大小验证（最大5MB）
        const fileSize = screenshot[0].size / (1024 * 1024);
        if (fileSize > 5) {
            errorMessage = '文件大小不能超过5MB';
            isValid = false;
        }
    }
    
    // 如果验证失败，阻止表单提交并显示错误
    if (!isValid) {
        event.preventDefault();
        alert(errorMessage);
    }
}