document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const sizeSelect = document.getElementById('sizeSelect');
    const customSizeInput = document.getElementById('customSizeInput');
    const colorPicker = document.getElementById('colorPicker');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const generateBtn = document.getElementById('generateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const urlError = document.getElementById('urlError');
    const previewSection = document.getElementById('previewSection');
    const qrImage = document.getElementById('qrImage');
    const previewDetails = document.getElementById('previewDetails');
    const historyContainer = document.getElementById('historyContainer');

    let currentQrId = null;

    // Toggle Custom Size Input
    sizeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customSizeInput.classList.remove('hidden');
        } else {
            customSizeInput.classList.add('hidden');
        }
    });

    // URL Validation
    const isValidUrl = (urlStr) => {
        try {
            new URL(urlStr);
            return true;
        } catch (err) {
            return false;
        }
    };

    // Fetch History
    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history');
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();

            historyContainer.innerHTML = '';
            if (data.length === 0) {
                historyContainer.innerHTML = '<p style="text-align:center; color:#8492a6;">No QR codes yet. Generate one!</p>';
                return;
            }

            data.forEach(item => {
                const dateObj = new Date(item.created_at);
                const dateStr = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;

                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
          <div class="history-info">
            <img src="${item.qr_image}" alt="QR preview">
            <div class="history-text">
              <span class="history-url" title="${item.url}">${item.url}</span>
              <span class="history-date">${dateStr}</span>
            </div>
          </div>
          <button class="delete-btn" data-id="${item.id}" title="Delete Record">✖</button>
        `;
                historyContainer.appendChild(historyItem);
            });

            // Bind Delete Buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    await deleteRecord(id);
                });
            });
        } catch (err) {
            console.error(err);
            historyContainer.innerHTML = '<p class="error-text" style="display:block;">Error loading history.</p>';
        }
    };

    // Delete Record
    const deleteRecord = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            const res = await fetch(`/api/delete/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchHistory(); // refresh list
            }
        } catch (err) {
            alert('Failed to delete record.');
        }
    };

    // Generate QR Code
    const generateQrCode = async () => {
        const url = urlInput.value.trim();
        if (!url) {
            urlError.textContent = 'Please enter a URL';
            urlError.style.display = 'block';
            return;
        }
        if (!isValidUrl(url)) {
            urlError.textContent = 'Please enter a valid complete URL (e.g. https://example.com)';
            urlError.style.display = 'block';
            return;
        }
        urlError.style.display = 'none';

        let size = sizeSelect.value;
        if (size === 'custom') {
            size = customSizeInput.value;
            if (!size || size < 100 || size > 1000) {
                alert('Please enter a valid custom size between 100 and 1000.');
                return;
            }
        }

        const color = colorPicker.value;
        const bgColor = bgColorPicker.value;

        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, size, color, bgColor })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate');
            }

            // Display Preview
            qrImage.src = data.qrImage;
            previewDetails.innerHTML = `Size: ${size}x${size} <br> Foreground: ${color} | Background: ${bgColor}`;
            previewSection.classList.remove('hidden');

            // Refresh history
            fetchHistory();

        } catch (err) {
            alert(err.message);
        } finally {
            generateBtn.textContent = 'Generate QR Code';
            generateBtn.disabled = false;
        }
    };

    // Reset Form
    resetBtn.addEventListener('click', () => {
        urlInput.value = '';
        sizeSelect.value = '250';
        customSizeInput.value = '';
        customSizeInput.classList.add('hidden');
        colorPicker.value = '#000000';
        bgColorPicker.value = '#ffffff';
        urlError.style.display = 'none';
        previewSection.classList.add('hidden');
    });

    // Download QR Code
    downloadBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = qrImage.src;
        a.download = 'qr-code.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Event Listeners
    generateBtn.addEventListener('click', generateQrCode);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateQrCode();
    });

    // Init
    fetchHistory();
});
