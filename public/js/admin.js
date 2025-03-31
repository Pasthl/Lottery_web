// public/js/admin.js
// 确保这个函数定义在全局范围内（不在任何其他函数内部）
function confirmDeleteNonWinners() {
    if (confirm('确定要删除所有非中奖条目吗？此操作不可撤销！')) {
        // 使用跟踪语句来调试
        console.log('用户确认删除非中奖条目');
        
        // 创建表单并提交
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/deleteNonWinners';
        document.body.appendChild(form);
        form.submit();
    } else {
        console.log('用户取消了操作');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化AJAX功能
    initAjaxForms();
    
    function initAjaxForms() {
        // 批准按钮AJAX处理
        document.querySelectorAll('form[action^="/admin/approve/"]').forEach(form => {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const url = this.getAttribute('action');
                const row = this.closest('tr');
                const button = this.querySelector('button');
                
                // 禁用按钮，防止重复提交
                if (button) button.disabled = true;
                
                // 发送AJAX请求
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 更新UI - 修改状态
                        const statusCell = row.querySelector('td:nth-child(4)');
                        if (statusCell) {
                            statusCell.innerHTML = '<span class="status approved">已批准</span>';
                        }
                        
                        // 移除批准按钮
                        this.remove();
                    } else {
                        // 恢复按钮状态
                        if (button) button.disabled = false;
                        alert('操作失败：' + (data.message || '未知错误'));
                    }
                })
                .catch(error => {
                    console.error('AJAX错误:', error);
                    // 恢复按钮状态
                    if (button) button.disabled = false;
                    alert('发生错误，请重试');
                });
            });
        });
        
        // 删除按钮AJAX处理
        document.querySelectorAll('form[action^="/admin/delete/"]').forEach(form => {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                // 确认是否删除
                if (confirm('确定要删除这个条目吗？')) {
                    const url = this.getAttribute('action');
                    const row = this.closest('tr');
                    const button = this.querySelector('button');
                    
                    // 禁用按钮，防止重复提交
                    if (button) {
                        button.disabled = true;
                        button.textContent = '处理中...';
                    }
                    
                    // 发送AJAX请求
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            try {
                                return response.json();
                            } catch (e) {
                                return { success: true };
                            }
                        } else {
                            throw new Error('请求失败');
                        }
                    })
                    .then(data => {
                        if (data.success) {
                            // 删除行
                            if (row) row.remove();
                            
                            // 检查表格是否为空
                            const tbody = document.querySelector('#entries-section table tbody');
                            if (tbody && tbody.children.length === 0) {
                                const tableDiv = document.querySelector('#entries-section .table-responsive');
                                if (tableDiv) {
                                    tableDiv.remove();
                                    document.querySelector('#entries-section').insertAdjacentHTML(
                                        'beforeend', 
                                        '<p class="no-entries">当前没有参与者</p>'
                                    );
                                }
                            }
                        } else {
                            // 恢复按钮状态
                            if (button) {
                                button.disabled = false;
                                button.textContent = '删除';
                            }
                            alert('操作失败：' + (data.message || '未知错误'));
                        }
                    })
                    .catch(error => {
                        console.error('AJAX错误:', error);
                        // 恢复按钮状态
                        if (button) {
                            button.disabled = false;
                            button.textContent = '删除';
                        }
                        alert('发生错误，请重试');
                    });
                }
            });
        });
    }
});