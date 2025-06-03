// Admin Dashboard JavaScript

// Initialize DataTable
const clientsTable = $('#clientsTable').DataTable({
    order: [[7, 'desc']], // Sort by joining date by default
    pageLength: 25,
    columns: [
        { data: 'serial', title: '#' },
        { data: 'repName', title: 'Rep Name' },
        { data: 'companyName', title: 'Company' },
        { data: 'phone', title: 'Phone' },
        { data: 'country', title: 'Country' },
        { data: 'joiningDate', title: 'Joining Date', width: '130px', render: function(data) {
            if (!data) return '';
            if (typeof data === 'string' && data.match(/^\d{4}\/\d{2}\/\d{2}$/)) return data;
            const d = new Date(data);
            return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
        }},
        { data: 'paymentEffectiveUntil', title: 'Payment Effective Until', width: '130px', render: function(data) {
            if (!data) return '';
            const d = new Date(data);
            return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
        }},
        { data: 'active', title: 'Active?' },
        {
            data: null,
            orderable: false,
            render: function(data, type, row) {
                return `
                    <button class="btn btn-sm btn-primary btn-action" data-client-id="${row._id}">Edit</button>
                    <button class="btn btn-sm btn-danger btn-action" data-client-id="${row._id}">Remove</button>
                `;
            }
        }
    ]
});

// Load countries and states
const countries = {
    'Australia': ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'],
    'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin'],
    'Afghanistan': [],
    'Albania': [],
    'Algeria': [],
    'Andorra': [],
    'Angola': [],
    'Antigua and Barbuda': [],
    'Argentina': [],
    'Armenia': [],
    'Austria': [],
    'Azerbaijan': [],
    'Bahamas': [],
    'Bahrain': [],
    'Bangladesh': [],
    'Barbados': [],
    'Belarus': [],
    'Belgium': [],
    'Belize': [],
    'Benin': [],
    'Bhutan': [],
    'Bolivia': [],
    'Bosnia and Herzegovina': [],
    'Botswana': [],
    'Brazil': [],
    'Brunei': [],
    'Bulgaria': [],
    'Burkina Faso': [],
    'Burundi': [],
    'Cabo Verde': [],
    'Cambodia': [],
    'Cameroon': [],
    'Canada': [],
    'Central African Republic': [],
    'Chad': [],
    'Chile': [],
    'China': [],
    'Colombia': [],
    'Comoros': [],
    'Congo, Democratic Republic of the': [],
    'Congo, Republic of the': [],
    'Costa Rica': [],
    'Cote d\'Ivoire': [],
    'Croatia': [],
    'Cuba': [],
    'Cyprus': [],
    'Czechia': [],
    'Denmark': [],
    'Djibouti': [],
    'Dominica': [],
    'Dominican Republic': [],
    'Ecuador': [],
    'Egypt': [],
    'El Salvador': [],
    'Equatorial Guinea': [],
    'Eritrea': [],
    'Estonia': [],
    'Eswatini': [],
    'Ethiopia': [],
    'Fiji': [],
    'Finland': [],
    'France': [],
    'Gabon': [],
    'Gambia': [],
    'Georgia': [],
    'Germany': [],
    'Ghana': [],
    'Greece': [],
    'Grenada': [],
    'Guatemala': [],
    'Guinea': [],
    'Guinea-Bissau': [],
    'Guyana': [],
    'Haiti': [],
    'Honduras': [],
    'Hungary': [],
    'Iceland': [],
    'India': [],
    'Indonesia': [],
    'Iran': [],
    'Iraq': [],
    'Ireland': [],
    'Israel': [],
    'Italy': [],
    'Jamaica': [],
    'Japan': [],
    'Jordan': [],
    'Kazakhstan': [],
    'Kenya': [],
    'Kiribati': [],
    'Korea, North': [],
    'Korea, South': [],
    'Kosovo': [],
    'Kuwait': [],
    'Kyrgyzstan': [],
    'Laos': [],
    'Latvia': [],
    'Lebanon': [],
    'Lesotho': [],
    'Liberia': [],
    'Libya': [],
    'Liechtenstein': [],
    'Lithuania': [],
    'Luxembourg': [],
    'Madagascar': [],
    'Malawi': [],
    'Malaysia': [],
    'Maldives': [],
    'Mali': [],
    'Malta': [],
    'Marshall Islands': [],
    'Mauritania': [],
    'Mauritius': [],
    'Mexico': [],
    'Micronesia': [],
    'Moldova': [],
    'Monaco': [],
    'Mongolia': [],
    'Montenegro': [],
    'Morocco': [],
    'Mozambique': [],
    'Myanmar': [],
    'Namibia': [],
    'Nauru': [],
    'Nepal': [],
    'Netherlands': [],
    'Nicaragua': [],
    'Niger': [],
    'Nigeria': [],
    'North Macedonia': [],
    'Norway': [],
    'Oman': [],
    'Pakistan': [],
    'Palau': [],
    'Palestine': [],
    'Panama': [],
    'Papua New Guinea': [],
    'Paraguay': [],
    'Peru': [],
    'Philippines': [],
    'Poland': [],
    'Portugal': [],
    'Qatar': [],
    'Romania': [],
    'Russia': [],
    'Rwanda': [],
    'Saint Kitts and Nevis': [],
    'Saint Lucia': [],
    'Saint Vincent and the Grenadines': [],
    'Samoa': [],
    'San Marino': [],
    'Sao Tome and Principe': [],
    'Saudi Arabia': [],
    'Senegal': [],
    'Serbia': [],
    'Seychelles': [],
    'Sierra Leone': [],
    'Singapore': [],
    'Slovakia': [],
    'Slovenia': [],
    'Solomon Islands': [],
    'Somalia': [],
    'South Africa': [],
    'South Sudan': [],
    'Spain': [],
    'Sri Lanka': [],
    'Sudan': [],
    'Suriname': [],
    'Sweden': [],
    'Switzerland': [],
    'Syria': [],
    'Taiwan': [],
    'Tajikistan': [],
    'Tanzania': [],
    'Thailand': [],
    'Timor-Leste': [],
    'Togo': [],
    'Tonga': [],
    'Trinidad and Tobago': [],
    'Tunisia': [],
    'Turkey': [],
    'Turkmenistan': [],
    'Tuvalu': [],
    'Uganda': [],
    'Ukraine': [],
    'United Arab Emirates': [],
    'United Kingdom': [],
    'United States': [],
    'Uruguay': [],
    'Uzbekistan': [],
    'Vanuatu': [],
    'Vatican City': [],
    'Venezuela': [],
    'Vietnam': [],
    'Yemen': [],
    'Zambia': [],
    'Zimbabwe': []
};

// Populate country dropdown
function populateCountries() {
    const countrySelect = $('select[name="country"]');
    const filterCountry = $('#filterCountry');
    
    // Australia and New Zealand first
    ['Australia', 'New Zealand'].forEach(country => {
        countrySelect.append(`<option value="${country}">${country}</option>`);
        filterCountry.append(`<option value="${country}">${country}</option>`);
    });
    // Then all other countries alphabetically
    Object.keys(countries).sort().forEach(country => {
        if (country !== 'Australia' && country !== 'New Zealand') {
            countrySelect.append(`<option value="${country}">${country}</option>`);
            filterCountry.append(`<option value="${country}">${country}</option>`);
        }
    });
}

// Update states based on selected country
function updateStates(country, targetSelect) {
    const stateSelect = targetSelect || $('select[name="state"]');
    stateSelect.empty().append('<option value="">Select State</option>');
    
    if (country && countries[country]) {
        countries[country].forEach(state => {
            stateSelect.append(`<option value="${state}">${state}</option>`);
        });
    }
}

// Event Listeners
$(document).ready(function() {
    // Initialize country dropdowns
    populateCountries();
    
    // Add export button click handler
    $('#exportClients').click(function() {
        $.ajax({
            url: '/api/admin/clients/export',
            method: 'GET',
            headers: getAuthHeaders(),
            xhrFields: { responseType: 'blob' },
            success: function(data, status, xhr) {
                const blob = new Blob([data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'clients.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            },
            error: function(xhr) {
                let msg = 'Error exporting data';
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                alert(msg);
            }
        });
    });
    
    // Country change event
    $('select[name="country"]').change(function() {
        updateStates($(this).val());
    });
    
    // Filter country change event
    $('#filterCountry').change(function() {
        updateStates($(this).val(), $('#filterState'));
    });
    
    // Apply filters
    $('#filterName, #filterCompany, #filterCountry, #filterState').on('keyup change', function() {
        clientsTable.draw();
    });
    
    // Save client
    $('#saveClient').click(function() {
        const form = $('#clientForm');
        // Validate required fields
        let valid = true;
        form.find('[required]').each(function() {
            if (!$(this).val()) {
                $(this).addClass('is-invalid');
                valid = false;
            } else {
                $(this).removeClass('is-invalid');
            }
        });
        if (!valid) {
            alert('Please fill in all required fields.');
            return;
        }
        // Confirmation if files are attached
        const files = $('input[name="documents"]')[0].files;
        if (files.length > 0) {
            if (!confirm('You have attached files. An email with these files will be sent to the client. Do you want to continue?')) {
                return;
            }
        }
        // Confirmation if paymentEffectiveUntil changed
        const editId = form.data('edit-id');
        if (editId) {
            const original = form.data('original-payment-until');
            const current = form.find('[name="paymentEffectiveUntil"]').val();
            if (original !== current) {
                if (!confirm('You are changing the Payment Effective Until date. Are you sure you want to make this change?')) {
                    return;
                }
            }
        }
        const formData = new FormData(form[0]);
        for (let i = 0; i < files.length; i++) {
            formData.append('documents', files[i]);
        }
        let url = '/api/admin/clients';
        let method = 'POST';
        if (editId) {
            url = `/api/admin/clients/${editId}`;
            method = 'PUT';
        }
        $.ajax({
            url: url,
            method: method,
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function(response) {
                if (response.success) {
                    $('#addClientModal').modal('hide');
                    form.removeData('edit-id');
                    form[0].reset();
                    // Reset file input
                    form.find('input[name="documents"]').val('');
                    loadClients();
                    showNotification('Client saved successfully', 'success');
                } else {
                    showNotification('Error saving client', 'error');
                }
            },
            error: function(xhr) {
                let msg = 'Error saving client';
                if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
                alert(msg);
            }
        });
    });

    // When editing, make joining date read-only; when adding, make it editable
    $('#addClientModal').on('show.bs.modal', function () {
        const form = $('#clientForm');
        const editId = form.data('edit-id');
        if (editId) {
            form.find('[name="joiningDate"]').prop('readonly', true);
            form.find('[name="paymentEffectiveUntil"]').prop('readonly', true);
        } else {
            form.find('[name="joiningDate"]').prop('readonly', false);
            form.find('[name="paymentEffectiveUntil"]').prop('readonly', false);
        }
    });

    // Clear form and edit mode when modal is closed
    $('#addClientModal').on('hidden.bs.modal', function () {
        const form = $('#clientForm');
        form[0].reset();
        form.removeData('edit-id');
        form.find('.is-invalid').removeClass('is-invalid');
        // Accessibility: move focus to Add New Client button
        $('[data-bs-target="#addClientModal"]').focus();
    });

    // Load clients on page load
    loadClients();

    // Remove any direct click handlers for .btn-action
    // Add delegated event handler:
    $('#clientsTable tbody').off('click').on('click', '.btn-action', function(e) {
        e.stopPropagation();
        const clientId = $(this).data('client-id');
        if ($(this).hasClass('btn-primary')) {
            editClient(clientId);
        } else if ($(this).hasClass('btn-danger')) {
            confirmDelete(clientId);
        }
    });

    // Open client profile modal when clicking a row (except actions column)
    $('#clientsTable tbody').on('click', 'tr', function(e) {
        // Ignore clicks on action buttons
        if ($(e.target).closest('.btn-action').length > 0) return;
        const rowData = clientsTable.row(this).data();
        if (!rowData) return;
        showClientProfile(rowData._id);
    });

    // Logout button
    $('#logout').off('click').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    });

    // Move focus to table after clientProfileModal closes
    $('#clientProfileModal').on('hidden.bs.modal', function () {
        $('#clientsTable').focus();
    });
});

// Load clients
function loadClients() {
    $.ajax({
        url: '/api/admin/clients',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(response) {
            if (response.success) {
                clientsTable.clear().rows.add(response.clients).draw();
            }
        }
    });
}

// Edit client
function editClient(clientId) {
    $.ajax({
        url: `/api/admin/clients/${clientId}`,
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(response) {
            if (response.success) {
                const client = response.client;
                const form = $('#clientForm');
                // Populate form fields
                form[0].reset();
                Object.keys(client).forEach(key => {
                    const input = form.find(`[name="${key}"]`);
                    if (input.length) {
                        if (key === 'joiningDate' && client[key]) {
                            // Convert to YYYY-MM-DD for input[type=date]
                            const date = new Date(client[key]);
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const dd = String(date.getDate()).padStart(2, '0');
                            input.val(`${yyyy}-${mm}-${dd}`);
                        } else if (key === 'paymentEffectiveUntil' && client[key]) {
                            // Convert to YYYY-MM-DD for input[type=date]
                            const date = new Date(client[key]);
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const dd = String(date.getDate()).padStart(2, '0');
                            input.val(`${yyyy}-${mm}-${dd}`);
                        } else if (input.attr('type') === 'file') {
                            // Only clear file input, never set to a file name
                            input.val('');
                        } else {
                            input.val(client[key]);
                        }
                    }
                });
                // Update states based on country
                updateStates(client.country);
                form.find('[name="state"]').val(client.state);
                // Show modal
                $('#addClientModal').modal('show');
                // Set a flag for edit mode
                form.data('edit-id', clientId);
                form.data('original-payment-until', client.paymentEffectiveUntil ? new Date(client.paymentEffectiveUntil).toISOString().slice(0,10) : '');
                // Show and populate change history in edit modal
                const history = client.history || [];
                let historyHtml = '';
                
                // Always show add note UI at the top with larger textarea
                const addNoteHtml = `<div class='input-group mb-3'>
                    <textarea class='form-control' id='addHistoryNoteTextarea' rows='1' style='resize: horizontal; width: 350px;' placeholder='Add note...'></textarea>
                    <button class='btn btn-primary' id='addHistoryNoteBtn' data-history-id='new'>Add Note</button>
                </div>`;

                if (history.length === 0) {
                    historyHtml = '<li class="list-group-item">No changes recorded.</li>';
                } else {
                    history.slice().reverse().forEach(h => {
                        historyHtml += `<li class="list-group-item">
                            <strong>${new Date(h.timestamp).toLocaleString()}</strong> by ${h.changedBy || 'admin'}<br>
                            <ul>`;
                        h.changes.forEach(change => {
                            historyHtml += `<li>${change.field}: <em>${change.oldValue ?? ''}</em> → <strong>${change.newValue ?? ''}</strong></li>`;
                        });
                        historyHtml += '</ul>';
                        // Only show note as read-only if present
                        if (h.note) {
                            historyHtml += `<div class='mt-2'><label><strong>Note:</strong></label><div class='form-control-plaintext'>${h.note}</div></div>`;
                        }
                        historyHtml += '</li>';
                    });
                }
                $('#addNoteContainer').html(addNoteHtml);
                $('#editClientHistoryList').html(historyHtml);
                $('#editClientHistorySection').show();
                // Store client id for note saving
                $('#editClientHistorySection').data('client-id', clientId);
            }
        }
    });
}

// Delete client
function deleteClient(clientId) {
    if (confirm('Are you sure you want to delete this client?')) {
        $.ajax({
            url: `/api/admin/clients/${clientId}`,
            method: 'DELETE',
            headers: getAuthHeaders(),
            success: function(response) {
                if (response.success) {
                    loadClients();
                    showNotification('Client deleted successfully', 'success');
                } else {
                    showNotification('Error deleting client', 'error');
                }
            },
            error: function() {
                showNotification('Error deleting client', 'error');
            }
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Implementation depends on your notification system
    alert(message);
}

// Custom filtering function
$.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
    const name = $('#filterName').val().toLowerCase();
    const company = $('#filterCompany').val().toLowerCase();
    const country = $('#filterCountry').val();
    const state = $('#filterState').val();
    
    const rowName = data[1].toLowerCase();
    const rowCompany = data[2].toLowerCase();
    const rowCountry = data[4];
    const rowState = data[5];
    
    if (name && !rowName.includes(name)) return false;
    if (company && !rowCompany.includes(company)) return false;
    if (country && rowCountry !== country) return false;
    if (state && rowState !== state) return false;
    
    return true;
});

// Helper to get auth headers
function getAuthHeaders() {
    return {
        'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
    };
}

// Confirm delete function
function confirmDelete(clientId) {
    if (confirm('Are you sure you want to delete this client?')) {
        deleteClient(clientId);
    }
}

// Function to show client profile and history
function showClientProfile(clientId) {
    $('#clientProfileModal').data('client-id', clientId);
    $.ajax({
        url: `/api/admin/clients/${clientId}`,
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(response) {
            if (response.success) {
                const client = response.client;
                // Build details HTML
                let detailsHtml = '<dl class="row">';
                Object.entries(client).forEach(([key, value]) => {
                    if (['history', 'documents', '__v', '_id', 'updatedAt', 'createdAt'].includes(key)) return;
                    detailsHtml += `<dt class='col-sm-4'>${key}</dt><dd class='col-sm-8'>${value || ''}</dd>`;
                    if (key === 'joiningDate' && value) {
                        const d = new Date(value);
                        const formatted = d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
                        detailsHtml += `<dt class='col-sm-4'>Joining Date</dt><dd class='col-sm-8'>${formatted}</dd>`;
                        return;
                    }
                    if (key === 'paymentEffectiveUntil' && value) {
                        const d = new Date(value);
                        const formatted = d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
                        detailsHtml += `<dt class='col-sm-4'>Payment Effective Until</dt><dd class='col-sm-8'>${formatted}</dd>`;
                        return;
                    }
                });
                detailsHtml += '</dl>';
                // Show attachments
                if (client.documents && client.documents.length > 0) {
                    detailsHtml += '<h6>Attachments</h6><ul>';
                    client.documents.forEach(doc => {
                        if (doc && doc.path) {
                            detailsHtml += `<li><a href="/${doc.path.replace(/\\/g, '/')}" target="_blank">${doc.filename}</a></li>`;
                        } else if (doc && doc.filename) {
                            detailsHtml += `<li>${doc.filename}</li>`;
                        }
                    });
                    detailsHtml += '</ul>';
                }
                $('#clientProfileDetails').html(detailsHtml);
                // Build history HTML
                const history = client.history || [];
                let historyHtml = '';
                if (history.length === 0) {
                    historyHtml = '<li class="list-group-item">No changes recorded.</li>';
                } else {
                    history.slice().reverse().forEach(h => {
                        historyHtml += `<li class="list-group-item">
                            <strong>${new Date(h.timestamp).toLocaleString()}</strong> by ${h.changedBy || 'admin'}<br>
                            <ul>`;
                        h.changes.forEach(change => {
                            historyHtml += `<li>${change.field}: <em>${change.oldValue ?? ''}</em> → <strong>${change.newValue ?? ''}</strong></li>`;
                        });
                        historyHtml += '</ul>';
                        // Only show note if present, no editing UI
                        if (h.note) {
                            historyHtml += `<div class='mt-2'><label><strong>Note:</strong></label><div class='form-control-plaintext'>${h.note}</div></div>`;
                        }
                        historyHtml += '</li>';
                    });
                }
                $('#clientHistoryList').html(historyHtml);
                // Show modal
                $('#clientProfileModal').modal('show');
            }
        }
    });
}

// Save history note (works for both modals)
$(document).on('click', '.save-history-note, #addHistoryNoteBtn', function() {
    const historyId = $(this).data('history-id');
    const note = $(this).closest('.input-group').find('textarea').val();
    if (!note) {
        showNotification('Please enter a note', 'error');
        return;
    }

    // Try to get client id from profile modal, then edit modal
    let clientId = $('#clientProfileModal').data('client-id');
    if (!clientId) clientId = $('#editClientHistorySection').data('client-id');

    const url = historyId === 'new' 
        ? `/api/admin/clients/${clientId}/history`
        : `/api/admin/clients/${clientId}/history/${historyId}`;
    
    const method = historyId === 'new' ? 'POST' : 'PUT';

    $.ajax({
        url: url,
        method: method,
        headers: getAuthHeaders(),
        contentType: 'application/json',
        data: JSON.stringify({ note }),
        success: function(response) {
            if (response.success) {
                showNotification('Note saved', 'success');
                // Refresh the client data to show the new note
                if (historyId === 'new') {
                    // Clear the textarea
                    $('#addHistoryNoteTextarea').val('');
                }
                // Reload the client data
                editClient(clientId);
            }
        },
        error: function(xhr) {
            let msg = 'Error saving note';
            if (xhr.responseJSON && xhr.responseJSON.message) msg = xhr.responseJSON.message;
            showNotification(msg, 'error');
        }
    });
}); 