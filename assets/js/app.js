document.addEventListener('DOMContentLoaded', () => {
    const folderInput = document.getElementById('folder-path');
    const verifyBtn = document.getElementById('check-folder-btn');
    const folderStatus = document.getElementById('folder-status');
    const runnerSection = document.getElementById('runner-section');
    const openDialogBtn = document.getElementById('open-dialog-btn');
    const dialog = document.getElementById('run-dialog');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const dynamicInputs = document.getElementById('dynamic-inputs');
    const executeBtn = document.getElementById('execute-btn');
    const logMonitor = document.getElementById('log-monitor');
    const logContent = document.getElementById('log-content');
    const connectionStatus = document.getElementById('connection-status');

    let currentConfig = {
        path: '',
        params: [],
        logFile: 'output.log'
    };
    let eventSource = null;

    // Verify Folder
    verifyBtn.addEventListener('click', async () => {
        const path = folderInput.value.trim();
        if (!path) return;

        folderStatus.textContent = 'Scanning...';
        folderStatus.className = 'status-text';
        runnerSection.classList.add('hidden');

        try {
            const res = await fetch(`api.php?action=scan&path=${encodeURIComponent(path)}`);
            const data = await res.json();

            if (data.found) {
                folderStatus.textContent = '✓ Valid BatchRunner Project found';
                folderStatus.className = 'status-text success';
                runnerSection.classList.remove('hidden');

                currentConfig.path = path;
                currentConfig.params = data.params;
                currentConfig.logFile = data.logFile;
            } else {
                folderStatus.textContent = '❌ No webrunner.sh found in directory';
                folderStatus.className = 'status-text error';
            }
        } catch (e) {
            folderStatus.textContent = '❌ Error connecting to server';
            folderStatus.className = 'status-text error';
            console.error(e);
        }
    });

    // Open Dialog
    openDialogBtn.addEventListener('click', () => {
        dynamicInputs.innerHTML = '';

        currentConfig.params.forEach(param => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const label = document.createElement('label');
            label.textContent = param.label;
            group.appendChild(label);

            let input;
            if (param.type === 'select') {
                input = document.createElement('select');
                if (param.options && Array.isArray(param.options)) {
                    param.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.trim();
                        option.textContent = opt.trim();
                        input.appendChild(option);
                    });
                }
            } else if (param.type === 'boolean') {
                input = document.createElement('select'); // Simple boolean dropdown
                const optTrue = document.createElement('option');
                optTrue.value = 'true';
                optTrue.textContent = 'True';
                const optFalse = document.createElement('option');
                optFalse.value = 'false';
                optFalse.textContent = 'False';
                input.appendChild(optTrue);
                input.appendChild(optFalse);
            } else if (param.type === 'date') {
                input = document.createElement('input');
                input.type = 'date';
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }

            input.dataset.var = param.var;
            input.className = 'param-input';
            group.appendChild(input);
            dynamicInputs.appendChild(group);
        });

        // If no params, showing a message
        if (currentConfig.params.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = 'No arguments required.';
            msg.style.color = '#94a3b8';
            dynamicInputs.appendChild(msg);
        }

        dialog.classList.remove('hidden');
    });

    // Close Modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            dialog.classList.add('hidden');
        });
    });

    // Execute
    executeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const inputs = document.querySelectorAll('.param-input');
        const args = {};

        inputs.forEach(input => {
            args[input.dataset.var] = input.value;
        });

        // Close immediately
        dialog.classList.add('hidden');

        // UI Updates
        logMonitor.classList.remove('hidden');
        logContent.textContent = ''; // Clear logs
        logContent.textContent = ''; // Clear logs
        connectionStatus.textContent = 'Requesting execution...';
        connectionStatus.className = 'badge';

        try {
            // Start process
            await fetch(`api.php?action=run&path=${encodeURIComponent(currentConfig.path)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    args: args,
                    logFile: currentConfig.logFile
                })
            });

            connectionStatus.textContent = 'Starting stream...';

            // Start Polling
            if (eventSource) clearInterval(eventSource); // Reuse var name for interval ID

            let currentOffset = 0;
            const pollFn = async () => {
                try {
                    const logRes = await fetch(`read_log.php?path=${encodeURIComponent(currentConfig.path)}&file=${encodeURIComponent(currentConfig.logFile)}&offset=${currentOffset}`);
                    const logData = await logRes.json();

                    if (logData.error) {
                        connectionStatus.textContent = 'Error reading log';
                        connectionStatus.style.background = '#ef4444';
                        return;
                    }

                    if (logData.content) {
                        logContent.textContent += logData.content;
                        currentOffset = logData.offset;

                        // Auto scroll
                        const container = document.getElementById('log-container');
                        container.scrollTop = container.scrollHeight;

                        // Check for completion
                        if (logData.content.includes('SUCCESS')) {
                            connectionStatus.textContent = 'Completed (Success)';
                            connectionStatus.style.background = '#22c55e';
                            clearInterval(eventSource);
                        } else if (logData.content.includes('FAILURE') || logData.content.includes('ERROR')) {
                            connectionStatus.textContent = 'Failed';
                            connectionStatus.style.background = '#ef4444';
                            // Don't stop polling immediately in case more logs come, or maybe stop? 
                            // Usually scripts exit after error, but let's keep polling for a few more seconds or just let user stop.
                            // For this demo, let's stop on explicit expected tokens.
                            clearInterval(eventSource);
                        }
                    }

                    // Update heartbeat UI visually
                    connectionStatus.textContent = connectionStatus.textContent.includes('Live') ? 'Live .' : 'Live';
                    connectionStatus.style.background = '#22c55e';
                    connectionStatus.style.color = '#000';

                } catch (e) {
                    console.error('Poll error', e);
                    // Don't stop polling on transient network error, but maybe warn
                }
            };

            // Poll every 1 second
            eventSource = setInterval(pollFn, 1000);

            // Initial poll immediately
            pollFn();

        } catch (e) {
            alert('Failed to start execution: ' + e.message);
        }
    });
});
