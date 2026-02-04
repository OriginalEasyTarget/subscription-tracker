// ===================================
// Subscription Tracker App
// ===================================

class SubscriptionTracker {
    constructor() {
        this.subscriptions = [];
        this.storageKey = 'subscriptions';
        this.sortColumn = 'name';
        this.sortAscending = true;
        this.currentEditingSubscriptionId = null;
        this.init();
    }

    init() {
        // Load data from local storage
        this.loadFromStorage();

        // Bind form submission
        const form = document.getElementById('subscriptionForm');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Initialize category autocomplete
        this.updateCategoryAutocomplete();
        
        // Add Enter key listener for autocomplete selection
        const categoryInput = document.getElementById('category');
        categoryInput.addEventListener('keydown', (e) => this.handleAutocompleteKeydown(e, 'categories'));
        
        const frequencyInput = document.getElementById('frequency');
        frequencyInput.addEventListener('keydown', (e) => this.handleAutocompleteKeydown(e, 'frequencies'));

        // Set up date input auto-advance
        this.setupDateInputAutoAdvance();

        // Bind file upload
        const fileUpload = document.getElementById('fileUpload');
        fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));

        // Bind download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.addEventListener('click', () => this.downloadSubscriptionsCSV());

        // Set up header click handlers for sorting
        this.setupHeaderClickHandlers();

        // Set up collapsible section and tabs
        this.setupCollapsibleSection();

        // Set up modal escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNotesModal();
            }
        });

        // Initial render
        this.render();
    }

    setupCollapsibleSection() {
        const toggleButton = document.getElementById('toggleCollapse');
        const header = document.querySelector('.collapsible-header');
        const content = document.getElementById('collapsible-content');
        
        // Load collapse state from localStorage
        const isCollapsed = localStorage.getItem('collapsible-collapsed') === 'true';
        if (isCollapsed) {
            this.collapseSection(content, toggleButton);
        }
        
        // Toggle collapse on header click
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking the button itself (button will handle it)
            if (e.target.closest('.collapse-toggle')) {
                return;
            }
            this.toggleCollapse(content, toggleButton);
        });
        
        // Toggle collapse on button click
        toggleButton.addEventListener('click', () => {
            this.toggleCollapse(content, toggleButton);
        });
        
        // Set up tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button));
        });
    }

    toggleCollapse(content, button) {
        const isCurrentlyCollapsed = content.classList.contains('collapsed');
        if (isCurrentlyCollapsed) {
            this.expandSection(content, button);
            localStorage.setItem('collapsible-collapsed', 'false');
        } else {
            this.collapseSection(content, button);
            localStorage.setItem('collapsible-collapsed', 'true');
        }
    }

    collapseSection(content, button) {
        content.classList.add('collapsed');
        button.setAttribute('aria-expanded', 'false');
    }

    expandSection(content, button) {
        content.classList.remove('collapsed');
        button.setAttribute('aria-expanded', 'true');
    }

    switchTab(button) {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        
        // Remove active class from all panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        
        // Show corresponding panel
        const panel = document.getElementById(`${tabName}-panel`);
        if (panel) {
            panel.classList.add('active');
        }
    }

    // ===================================
    // Date Input Auto-Advance
    // ===================================

    setupDateInputAutoAdvance() {
        const dateInput = document.getElementById('nextBillingDate');
        const errorSpan = document.getElementById('date-error');

        dateInput.addEventListener('input', (e) => {
            const rawValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
            const formatted = this.formatDateInput(rawValue);
            e.target.value = formatted;
            
            // Clear error on input
            errorSpan.textContent = '';
            errorSpan.setAttribute('role', 'alert');
        });

        dateInput.addEventListener('blur', (e) => {
            const value = e.target.value.replace(/\D/g, ''); // Get only digits
            
            if (value.length === 0) {
                errorSpan.textContent = '';
                return;
            }

            // Auto-complete year if missing (MM/DD only = MM/DD/2026)
            let completed = value;
            if (value.length === 4) {
                completed = value + '2026'; // Auto-add current year
            } else if (value.length === 6) {
                // Expand 2-digit year to 4-digit year
                const mmdd = value.substring(0, 4);
                const yy = value.substring(4, 6);
                completed = mmdd + '20' + yy;
            }

            // Validate date
            const month = parseInt(completed.substring(0, 2), 10);
            const day = parseInt(completed.substring(2, 4), 10);
            const year = parseInt(completed.substring(4, 8), 10);

            if (!this.isValidDate(month, day, year)) {
                errorSpan.textContent = 'Invalid date. Please enter a valid date in MM/DD/YYYY format.';
                e.target.value = completed.substring(0, 2) + '/' + completed.substring(2, 4) + '/' + completed.substring(4, 8);
                return;
            }

            // Format and set the value
            const formatted = this.formatDateInput(completed);
            e.target.value = formatted;
            errorSpan.textContent = '';
        });
    }

    formatDateInput(rawInput) {
        if (!rawInput || rawInput.length === 0) return '';
        
        const digits = rawInput.replace(/\D/g, ''); // Remove all non-digits
        
        if (digits.length <= 2) {
            return digits;
        } else if (digits.length <= 4) {
            return digits.substring(0, 2) + '/' + digits.substring(2, 4);
        } else {
            return digits.substring(0, 2) + '/' + digits.substring(2, 4) + '/' + digits.substring(4, 8);
        }
    }

    isValidDate(month, day, year) {
        // Check month
        if (month < 1 || month > 12) return false;
        
        // Check year (reasonable range)
        if (year < 1900 || year > 2100) return false;
        
        // Days per month
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // Check for leap year
        if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
            daysInMonth[1] = 29;
        }
        
        // Check day
        if (day < 1 || day > daysInMonth[month - 1]) return false;
        
        return true;
    }

    // ===================================
    // Notes Modal
    // ===================================

    openNotesModal(subscriptionId) {
        const subscription = this.subscriptions.find((s) => s.id === subscriptionId);
        if (!subscription) return;

        this.currentEditingSubscriptionId = subscriptionId;
        const notesInput = document.getElementById('notesInput');
        notesInput.value = subscription.notes || '';
        
        const modal = document.getElementById('notesModal');
        modal.classList.add('show');
        notesInput.focus();
    }

    closeNotesModal() {
        const modal = document.getElementById('notesModal');
        modal.classList.remove('show');
        this.currentEditingSubscriptionId = null;
    }

    saveNotes() {
        if (this.currentEditingSubscriptionId === null) return;

        const subscription = this.subscriptions.find((s) => s.id === this.currentEditingSubscriptionId);
        if (!subscription) return;

        const notesInput = document.getElementById('notesInput');
        subscription.notes = notesInput.value.trim();

        this.saveToStorage();
        this.render();
        this.closeNotesModal();

        this.announce(`Notes updated for ${subscription.name}`);
    }

    // ===================================
    // Category Autocomplete
    // ===================================

    updateCategoryAutocomplete() {
        const categories = new Set();
        this.subscriptions.forEach((sub) => {
            if (sub.category && sub.category.trim()) {
                categories.add(sub.category);
            }
        });

        const datalist = document.getElementById('categories');
        // Only update if categories have changed
        const currentOptions = Array.from(datalist.querySelectorAll('option')).map(opt => opt.value);
        const newCategories = Array.from(categories).sort();
        
        if (JSON.stringify(currentOptions) !== JSON.stringify(newCategories)) {
            datalist.innerHTML = '';
            newCategories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category;
                datalist.appendChild(option);
            });
        }
    }

    // ===================================
    // Autocomplete Handling
    // ===================================

    handleAutocompleteKeydown(e, datalistId) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = e.target;
            const currentValue = input.value.toLowerCase().trim();
            const datalist = document.getElementById(datalistId);
            
            console.log(`Autocomplete triggered for ${datalistId}: "${currentValue}"`);
            
            // Find matching options
            const options = Array.from(datalist.querySelectorAll('option'));
            console.log(`Available options:`, options.map(o => o.value));
            
            let matchedOption = null;
            
            // First, try exact match (case-insensitive)
            matchedOption = options.find(opt => 
                opt.value.toLowerCase() === currentValue
            );
            
            // If no exact match, find first option that starts with the input
            if (!matchedOption && currentValue) {
                matchedOption = options.find(opt => 
                    opt.value.toLowerCase().startsWith(currentValue)
                );
            }
            
            // If still no match, select first option
            if (!matchedOption && options.length > 0) {
                matchedOption = options[0];
            }
            
            // Set the input value to the matched option
            if (matchedOption) {
                console.log(`Matched option:`, matchedOption.value);
                input.value = matchedOption.value;
            }
            
            // Submit the form
            const form = document.getElementById('subscriptionForm');
            form.dispatchEvent(new Event('submit'));
        }
    }

    // ===================================
    // Form Handling
    // ===================================

    handleFormSubmit(e) {
        e.preventDefault();

        // Clear previous error messages
        this.clearErrors();

        // Get form values
        const name = document.getElementById('name').value.trim();
        const cost = parseFloat(document.getElementById('cost').value);
        let frequency = document.getElementById('frequency').value;
        const category = document.getElementById('category').value.trim();
        const nextBillingDate = document.getElementById('nextBillingDate').value;
        const notes = document.getElementById('notes').value.trim();

        // Normalize frequency to lowercase
        frequency = this.normalizeFrequency(frequency);

        // Validate
        const errors = this.validateForm(name, cost, frequency);
        if (Object.keys(errors).length > 0) {
            this.displayErrors(errors);
            return;
        }

        // Create subscription object
        const subscription = {
            id: Date.now(),
            name,
            cost,
            frequency,
            category,
            nextBillingDate,
            notes,
            flagged: false,
        };

        // Add to array
        this.subscriptions.push(subscription);

        // Save and render
        this.saveToStorage();
        this.updateCategoryAutocomplete();
        this.render();

        // Reset form
        document.getElementById('subscriptionForm').reset();

        // Announce success to screen readers
        this.announce('Subscription added successfully');
    }

    validateForm(name, cost, frequency) {
        const errors = {};

        if (!name) {
            errors.name = 'Name is required';
        }

        if (isNaN(cost) || cost === '' || cost === null || cost < 0) {
            errors.cost = 'Cost must be a valid number';
        }

        if (!frequency) {
            errors.frequency = 'Billing frequency is required';
        }

        return errors;
    }

    displayErrors(errors) {
        for (const [field, message] of Object.entries(errors)) {
            const errorElement = document.getElementById(`${field}-error`);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.setAttribute('aria-live', 'assertive');
            }
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach((el) => {
            el.textContent = '';
        });
    }

    // ===================================
    // File Upload
    // ===================================

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const newSubscriptions = this.parseFile(content, file.name);

                if (newSubscriptions.length === 0) {
                    alert('No valid subscriptions found in the file.');
                    return;
                }

                this.subscriptions = this.subscriptions.concat(newSubscriptions);
                this.saveToStorage();
                this.render();

                this.announce(
                    `${newSubscriptions.length} subscription(s) imported successfully`
                );

                // Reset file input
                e.target.value = '';
            } catch (error) {
                alert(`Error parsing file: ${error.message}`);
            }
        };

        reader.readAsText(file);
    }

    parseFile(content, filename) {
        const lines = content.trim().split('\n');
        const subscriptions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',').map((p) => p.trim());

            if (
                parts.length >= 2 &&
                parts[0] &&
                !isNaN(parseFloat(parts[1]))
            ) {
                const subscription = {
                    id: Date.now() + i,
                    name: parts[0],
                    cost: parseFloat(parts[1]),
                    frequency: parts[2] || 'monthly',
                    category: parts[3] || '',
                    nextBillingDate: parts[4] || '',
                    notes: parts[5] || '',
                    flagged: false,
                };
                subscriptions.push(subscription);
            }
        }

        return subscriptions;
    }

    downloadSubscriptionsCSV() {
        if (this.subscriptions.length === 0) {
            alert('No subscriptions to download.');
            return;
        }

        // Create CSV content
        const headers = ['Name', 'Cost', 'Frequency', 'Category', 'NextBillingDate', 'Notes'];
        const rows = this.subscriptions.map(sub => [
            this.escapeCSV(sub.name),
            sub.cost,
            sub.frequency,
            this.escapeCSV(sub.category),
            sub.nextBillingDate,
            this.escapeCSV(sub.notes)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'subscriptions.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    escapeCSV(value) {
        if (!value) return '';
        // Escape quotes and wrap in quotes if contains comma, newline, or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    // ===================================
    // Subscription Management
    // ===================================

    toggleFlag(id) {
        const subscription = this.subscriptions.find((s) => s.id === id);
        if (subscription) {
            subscription.flagged = !subscription.flagged;
            this.saveToStorage();
            this.render();

            const action = subscription.flagged
                ? 'marked for cancellation'
                : 'unmarked for cancellation';
            this.announce(
                `${subscription.name} ${action}`
            );
        }
    }

    deleteSubscription(id) {
        const subscription = this.subscriptions.find((s) => s.id === id);
        if (!subscription) return;

        if (confirm(`Are you sure you want to delete "${subscription.name}"?`)) {
            this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
            this.saveToStorage();
            this.render();

            this.announce(`${subscription.name} deleted`);
        }
    }

    // ===================================
    // Calculations
    // ===================================

    getMonthlyAmount(cost, frequency) {
        // Ensure frequency is a string and trim whitespace
        const freq = String(frequency).toLowerCase().trim();
        const amount = parseFloat(cost) || 0;
        
        switch (freq) {
            case 'weekly':
                return amount * 4.33; // weeks per month
            case 'monthly':
                return amount;
            case 'quarterly':
                return amount / 3;
            case 'semi-annually':
                return amount / 6;
            case 'annually':
                return amount / 12;
            default:
                return 0;
        }
    }

    calculateSavings() {
        const flaggedSubscriptions = this.subscriptions.filter(
            (s) => s.flagged
        );

        let monthlySavings = 0;
        flaggedSubscriptions.forEach((sub) => {
            monthlySavings += this.getMonthlyAmount(sub.cost, sub.frequency);
        });

        const annualSavings = monthlySavings * 12;

        return {
            monthly: monthlySavings,
            annual: annualSavings,
        };
    }

    calculateTotalMonthlyCost() {
        let total = 0;
        this.subscriptions.forEach((sub) => {
            total += this.getMonthlyAmount(sub.cost, sub.frequency);
        });
        return total;
    }

    calculateTotalAnnualCost() {
        return this.calculateTotalMonthlyCost() * 12;
    }

    calculateTotalAnnualCost() {
        return this.calculateTotalMonthlyCost() * 12;
    }

    // ===================================
    // Rendering
    // ===================================

    render() {
        this.updateSummary();
        this.updateTable();
    }

    updateSummary() {
        const savings = this.calculateSavings();
        const totalMonthlyCost = this.calculateTotalMonthlyCost();
        const totalAnnualCost = this.calculateTotalAnnualCost();

        document.getElementById('monthlySavings').textContent = this.formatCurrency(
            savings.monthly
        );
        document.getElementById('annualSavings').textContent = this.formatCurrency(
            savings.annual
        );
        document.getElementById('totalMonthlyCost').textContent = this.formatCurrency(
            totalMonthlyCost
        );
        document.getElementById('totalAnnualCost').textContent = this.formatCurrency(
            totalAnnualCost
        );

        // Update subscription count
        const countElement = document.getElementById('subscriptionCount');
        if (this.subscriptions.length > 0) {
            countElement.textContent = `(${this.subscriptions.length})`;
        } else {
            countElement.textContent = '';
        }
    }

    updateTable() {
        const tableBody = document.getElementById('tableBody');

        if (this.subscriptions.length === 0) {
            tableBody.innerHTML =
                '<tr class="empty-row"><td colspan="8" class="empty-message">No subscriptions yet. Add one to get started!</td></tr>';
            return;
        }

        // Sort subscriptions if a sort column is set
        let sortedSubs = [...this.subscriptions];
        if (this.sortColumn) {
            sortedSubs = this.sortSubscriptions(sortedSubs);
        }

        tableBody.innerHTML = sortedSubs
            .map((sub) => this.createTableRow(sub))
            .join('');

        // Add click handlers to editable cells
        tableBody.querySelectorAll('td[data-editable]').forEach((cell) => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        // Add change handlers to flag checkboxes
        tableBody.querySelectorAll('.flag-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', (e) => {
                const subscriptionId = parseInt(e.target.dataset.id);
                this.toggleFlag(subscriptionId);
            });
        });
        
        // Update table headers with sort indicators (without re-adding listeners)
        this.updateTableHeaders();
    }

    updateTableHeaders() {
        // Set up headers with sort indicators
        const columns = ['name', 'cost', 'frequency', 'category', 'nextBillingDate', 'notes', 'flag', 'delete'];
        
        document.querySelectorAll('thead th').forEach((header, index) => {
            const column = columns[index];
            
            // Store original header text if not already stored
            if (!header.dataset.originalText) {
                header.dataset.originalText = header.textContent;
            }
            
            // Restore original text and clear indicators
            header.textContent = header.dataset.originalText;
            
            if (column !== 'flag' && column !== 'delete') {
                header.style.cursor = 'pointer';
                
                // Add visual indicator for current sort
                if (this.sortColumn === column) {
                    const indicator = this.sortAscending ? ' ▲' : ' ▼';
                    header.textContent += indicator;
                }
            }
        });
    }

    setupHeaderClickHandlers() {
        // Set up click handlers for table headers for sorting
        // This is done once during init to avoid adding multiple listeners
        const columns = ['name', 'cost', 'frequency', 'category', 'nextBillingDate', 'notes', 'flag', 'delete'];
        
        document.querySelectorAll('thead th').forEach((header, index) => {
            const column = columns[index];
            
            if (column !== 'flag' && column !== 'delete') {
                header.addEventListener('click', () => this.handleHeaderClick(index));
            }
        });
    }

    getFrequencyShortForm(frequency) {
        const map = {
            'weekly': 'week',
            'monthly': 'month',
            'quarterly': 'quarter',
            'semi-annually': '6 months',
            'annually': 'year',
        };
        return map[frequency] || frequency;
    }

    createTableRow(sub) {
        const monthlyCost = this.getMonthlyAmount(sub.cost, sub.frequency);
        const frequencyLabel = this.formatFrequency(sub.frequency);
        const nextBillingFormatted = sub.nextBillingDate
            ? this.formatDateDisplay(sub.nextBillingDate)
            : '—';
        const costDisplayFrequency = this.getFrequencyShortForm(sub.frequency);
        const notesIcon = sub.notes ? '📄' : '+';
        const notesTitle = sub.notes ? 'View notes' : 'Add notes';

        return `
            <tr class="${sub.flagged ? 'flagged' : ''}" data-id="${sub.id}">
                <td data-editable="name" data-type="text" title="Click to edit"><strong>${this.escapeHtml(sub.name)}</strong></td>
                <td data-editable="cost" data-type="number" title="Click to edit">
                    $${sub.cost.toFixed(2)} / ${costDisplayFrequency}
                    <br>
                    <small style="color: var(--gray-500);">~${monthlyCost.toFixed(2)}/mo</small>
                </td>
                <td data-editable="frequency" data-type="select" title="Click to edit">${frequencyLabel}</td>
                <td data-editable="category" data-type="text" title="Click to edit">${sub.category ? this.escapeHtml(sub.category) : '—'}</td>
                <td data-editable="nextBillingDate" data-type="date" title="Click to edit">${nextBillingFormatted}</td>
                <td class="notes-cell">
                    <button
                        class="btn-icon notes-btn"
                        onclick="tracker.openNotesModal(${sub.id})"
                        title="${notesTitle}"
                        aria-label="${notesTitle} for ${this.escapeHtml(sub.name)}"
                    >
                        ${notesIcon}
                    </button>
                </td>
                <td class="flag-cell">
                    <input
                        type="checkbox"
                        class="flag-checkbox"
                        data-id="${sub.id}"
                        ${sub.flagged ? 'checked' : ''}
                        title="${sub.flagged ? 'Unmark for cancellation' : 'Mark for cancellation'}"
                    />
                </td>
                <td class="delete-cell">
                    <button
                        class="btn-icon delete-btn"
                        onclick="tracker.deleteSubscription(${sub.id})"
                        title="Delete subscription"
                        aria-label="Delete ${this.escapeHtml(sub.name)}"
                    >
                        🗑
                    </button>
                </td>
            </tr>
        `;
    }

    // ===================================
    // Inline Editing
    // ===================================

    handleHeaderClick(columnIndex) {
        const columns = ['name', 'cost', 'frequency', 'category', 'nextBillingDate', 'notes'];
        const column = columns[columnIndex];
        
        if (column === 'actions') return;
        
        if (this.sortColumn === column) {
            this.sortAscending = !this.sortAscending;
        } else {
            this.sortColumn = column;
            this.sortAscending = true;
        }
        
        this.render();
    }

    sortSubscriptions(subs) {
        return subs.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle different data types
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            } else if (typeof aVal === 'number') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            
            if (aVal < bVal) {
                return this.sortAscending ? -1 : 1;
            }
            if (aVal > bVal) {
                return this.sortAscending ? 1 : -1;
            }
            return 0;
        });
    }

    handleCellClick(e) {
        const cell = e.target.closest('td[data-editable]');
        if (!cell || cell.querySelector('input, select, textarea')) {
            return; // Already in edit mode
        }

        const fieldName = cell.dataset.editable;
        const fieldType = cell.dataset.type;
        const rowElement = cell.closest('tr');
        const subscriptionId = parseInt(rowElement.dataset.id);
        const subscription = this.subscriptions.find((s) => s.id === subscriptionId);

        if (!subscription) return;

        const currentValue = subscription[fieldName];
        this.makeEditable(cell, fieldName, fieldType, currentValue, subscriptionId);
    }

    makeEditable(cell, fieldName, fieldType, currentValue, subscriptionId) {
        const originalContent = cell.innerHTML;

        let inputElement;

        if (fieldType === 'select') {
            // For frequency field, create a simple text input
            // The user can type or the browser will show the static datalist from HTML
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            // Display the formatted (title case) version to the user
            inputElement.value = this.formatFrequency(currentValue) || '';
            inputElement.setAttribute('list', 'frequencies');
        } else if (fieldType === 'date') {
            // Use masked date input like the form (MM/DD/YYYY format)
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.inputMode = 'numeric';
            inputElement.placeholder = 'MM/DD/YYYY';
            // Convert stored date format (YYYY-MM-DD) to display format (MM/DD/YYYY)
            if (currentValue) {
                const parts = currentValue.split('-');
                if (parts.length === 3) {
                    inputElement.value = `${parts[1]}/${parts[2]}/${parts[0]}`;
                }
            }
        } else if (fieldType === 'number') {
            inputElement = document.createElement('input');
            inputElement.type = 'number';
            inputElement.step = '0.01';
            inputElement.min = '0';
            inputElement.value = currentValue || '';
        } else {
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.value = currentValue || '';
        }

        inputElement.className = 'edit-input';

        const finishEdit = () => {
            const newValue = inputElement.value.trim();

            if (newValue !== String(currentValue || '')) {
                // For date fields, validate before updating
                if (fieldType === 'date') {
                    const validation = this.validateDateInput(newValue);
                    if (!validation.valid) {
                        alert(validation.message);
                        cell.innerHTML = originalContent;
                        return;
                    }
                }
                // For cost fields, validate they are numeric and >= 0
                if (fieldType === 'number') {
                    const numValue = parseFloat(newValue);
                    if (isNaN(numValue) || numValue < 0) {
                        alert('Cost must be a valid number (0 or greater)');
                        cell.innerHTML = originalContent;
                        return;
                    }
                }
                this.updateFieldValue(subscriptionId, fieldName, newValue, fieldType);
            } else {
                cell.innerHTML = originalContent;
            }
        };

        const cancelEdit = () => {
            cell.innerHTML = originalContent;
        };

        inputElement.addEventListener('blur', finishEdit);
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });

        cell.innerHTML = '';
        cell.appendChild(inputElement);
        inputElement.focus();
        inputElement.select();
    }

    updateFieldValue(subscriptionId, fieldName, newValue, fieldType) {
        const subscription = this.subscriptions.find((s) => s.id === subscriptionId);
        if (!subscription) return;

        // Convert value to correct type
        let convertedValue = newValue;
        if (fieldType === 'number') {
            convertedValue = parseFloat(newValue) || 0;
        } else if (fieldType === 'date') {
            // Convert MM/DD/YYYY format to YYYY-MM-DD for storage
            const rawDigits = newValue.replace(/\D/g, '');
            let converted = rawDigits;
            
            // Auto-complete year if missing
            if (rawDigits.length === 4) {
                converted = rawDigits + '2026';
            } else if (rawDigits.length === 6) {
                const mmdd = rawDigits.substring(0, 4);
                const yy = rawDigits.substring(4, 6);
                converted = mmdd + '20' + yy;
            }
            
            // Convert from MM/DD/YYYY digits to YYYY-MM-DD
            if (converted.length === 8) {
                const mm = converted.substring(0, 2);
                const dd = converted.substring(2, 4);
                const yyyy = converted.substring(4, 8);
                convertedValue = `${yyyy}-${mm}-${dd}`;
            } else {
                convertedValue = newValue; // Keep as-is if can't parse
            }
        } else if (fieldName === 'frequency') {
            // Normalize frequency to lowercase
            convertedValue = this.normalizeFrequency(newValue);
        } else {
            convertedValue = newValue;
        }

        subscription[fieldName] = convertedValue;
        this.saveToStorage();
        if (fieldName === 'category') {
            this.updateCategoryAutocomplete();
        }
        this.render();

        this.announce(`${fieldName} updated to ${newValue}`);
    }

    validateDateInput(dateString) {
        // Remove non-digits
        const digits = dateString.replace(/\D/g, '');
        
        if (digits.length === 0) {
            return { valid: false, message: 'Date is required' };
        }
        
        // Auto-complete year if needed
        let completed = digits;
        if (digits.length === 4) {
            completed = digits + '2026';
        } else if (digits.length === 6) {
            const mmdd = digits.substring(0, 4);
            const yy = digits.substring(4, 6);
            completed = mmdd + '20' + yy;
        } else if (digits.length !== 8) {
            return { valid: false, message: 'Please enter date in MM/DD/YYYY format' };
        }
        
        // Validate date
        const month = parseInt(completed.substring(0, 2), 10);
        const day = parseInt(completed.substring(2, 4), 10);
        const year = parseInt(completed.substring(4, 8), 10);
        
        if (!this.isValidDate(month, day, year)) {
            return { valid: false, message: 'Invalid date. Please enter a valid date.' };
        }
        
        return { valid: true };
    }

    formatDateDisplay(dateString) {
        // Convert YYYY-MM-DD format to MM/DD/YYYY with 2-digit formatting
        if (!dateString) return '—';
        
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const month = String(parts[1]).padStart(2, '0');
            const day = String(parts[2]).padStart(2, '0');
            const year = parts[0];
            return `${month}/${day}/${year}`;
        }
        
        return dateString;
    }

    formatFrequency(frequency) {
        const map = {
            weekly: 'Weekly',
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            'semi-annually': 'Semi-Annually',
            annually: 'Annually',
        };
        return map[frequency] || frequency;
    }

    normalizeFrequency(frequency) {
        // Convert title case input to lowercase for storage
        const map = {
            'Weekly': 'weekly',
            'Monthly': 'monthly',
            'Quarterly': 'quarterly',
            'Semi-Annually': 'semi-annually',
            'Annually': 'annually',
        };
        return map[frequency] || frequency.toLowerCase();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===================================
    // Local Storage
    // ===================================

    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.subscriptions));
    }

    loadFromStorage() {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
            try {
                this.subscriptions = JSON.parse(data);
                // Audit and fix data inconsistencies
                this.auditAndFixData();
            } catch (error) {
                console.error('Error loading from storage:', error);
                this.subscriptions = [];
            }
        }
    }

    auditAndFixData() {
        let dataChanged = false;
        const validFrequencies = ['weekly', 'monthly', 'quarterly', 'semi-annually', 'annually'];

        this.subscriptions.forEach((sub) => {
            // Fix cost: ensure it's a number
            if (typeof sub.cost !== 'number') {
                sub.cost = parseFloat(sub.cost) || 0;
                dataChanged = true;
            }

            // Fix frequency: convert to lowercase and handle legacy values
            if (sub.frequency) {
                let freq = String(sub.frequency).toLowerCase().trim();
                // Convert 'yearly' to 'annually' for consistency
                if (freq === 'yearly') {
                    freq = 'annually';
                    dataChanged = true;
                }
                // Validate frequency is in allowed list
                if (!validFrequencies.includes(freq)) {
                    freq = 'monthly'; // Default to monthly if invalid
                    dataChanged = true;
                }
                if (sub.frequency !== freq) {
                    sub.frequency = freq;
                    dataChanged = true;
                }
            } else {
                sub.frequency = 'monthly';
                dataChanged = true;
            }

            // Ensure other fields have default values
            if (!sub.id) sub.id = Date.now() + Math.random();
            if (!sub.name) sub.name = 'Unnamed';
            if (sub.category === undefined) sub.category = '';
            if (sub.nextBillingDate === undefined) sub.nextBillingDate = '';
            if (sub.notes === undefined) sub.notes = '';
            if (sub.flagged === undefined) sub.flagged = false;
        });

        // Save corrected data if any changes were made
        if (dataChanged) {
            this.saveToStorage();
            console.log('Data audit completed: inconsistencies fixed and saved');
        }
    }

    // ===================================
    // Accessibility
    // ===================================

    announce(message) {
        // Create a temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => announcement.remove(), 1000);
    }
}

// ===================================
// Initialize App
// ===================================
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new SubscriptionTracker();
});
