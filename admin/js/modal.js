document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('clientsTable');
    table.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-action')) {
            const clientId = e.target.getAttribute('data-client-id');
            if (e.target.classList.contains('btn-primary')) {
                editClient(clientId);
            } else if (e.target.classList.contains('btn-danger')) {
                confirmDelete(clientId);
            }
        }
    });
}); 