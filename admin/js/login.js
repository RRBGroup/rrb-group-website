$(document).ready(function() {
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        
        const username = $('#username').val();
        const password = $('#password').val();
        
        $.ajax({
            url: '/api/admin/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            success: function(response) {
                if (response.success) {
                    // Store token
                    localStorage.setItem('adminToken', response.token);
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    alert(response.message || 'Invalid username or password');
                }
            },
            error: function(xhr) {
                let msg = 'Error logging in';
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                alert(msg);
            }
        });
    });
}); 