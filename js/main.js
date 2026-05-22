const buttons = document.querySelectorAll('.tab-bar button');
const panels = document.querySelectorAll('.tab-panel');

function activateTab(tabName) {
    buttons.forEach(btn => btn.classList.remove('active'));
    panels.forEach(panel => panel.classList.remove('active'));

    const targetButton = document.querySelector(`.tab-bar button[data-tab="${tabName}"]`);
    const targetPanel = document.getElementById(`tab-${tabName}`);

    if (targetButton && targetPanel) {
        targetButton.classList.add('active');
        targetPanel.classList.add('active');
        location.hash = `#${tabName}`;
    }
}

buttons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        activateTab(tabName);
    });
});

// On page load, activate tab from URL hash
const hash = location.hash.slice(1);
if (hash) {
    activateTab(hash);
}

// Keep tab state in sync when hash changes via links like <a href="#history">.
window.addEventListener('hashchange', () => {
    const tab = location.hash.slice(1);
    if (tab) {
        activateTab(tab);
    }
});

// History tab language toggle
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.history-content').forEach(c => c.classList.remove('active'));
        const target = document.querySelector(`.lang-${lang}`);
        if (target) target.classList.add('active');
    });
});

function renderTrainingFallback(container) {
    container.innerHTML = `
        <div class="training-wrapper">
            <h2 class="lesson-title">Training Lessons (Offline Fallback)</h2>
            <p class="history-lead">Your browser blocked module loading from file://, so a local fallback is shown.</p>

            <section class="lesson-section">
                <h3>Lesson 1: Architecture Overview</h3>
                <div class="section-text">
                    <ul>
                        <li>WEIZAC uses a 40-bit word.</li>
                        <li>Each word can hold two 20-bit instructions (left and right).</li>
                        <li>Main registers: AC, MQ, and PC.</li>
                        <li>Memory model: 1024 words.</li>
                    </ul>
                </div>
            </section>

            <section class="lesson-section">
                <h3>Lesson 2: Instruction Format</h3>
                <div class="section-text">
                    <ul>
                        <li>Instruction width: 20 bits.</li>
                        <li>Opcode: 8 bits, Address: 12 bits.</li>
                        <li>Execution order: left instruction, then right instruction.</li>
                    </ul>
                </div>
            </section>

            <section class="lesson-section">
                <h3>Lesson 3: Data Transfer</h3>
                <div class="section-text">
                    <ul>
                        <li>LOAD M(X), LOAD -M(X), LOAD |M(X)|, LOAD -|M(X)|</li>
                        <li>LOAD MQ,M(X), LOAD MQ</li>
                        <li>STOR M(X)</li>
                    </ul>
                </div>
            </section>

            <section class="lesson-section">
                <h3>Lesson 4: Arithmetic</h3>
                <div class="section-text">
                    <ul>
                        <li>ADD, SUB, MUL, DIV, LSH, RSH</li>
                        <li>40-bit overflow masking behavior</li>
                        <li>MUL split result across AC:MQ</li>
                    </ul>
                </div>
            </section>

            <section class="lesson-section">
                <h3>Lesson 5: Branching</h3>
                <div class="section-text">
                    <ul>
                        <li>JUMP left/right targets</li>
                        <li>JUMP+ conditional behavior when AC >= 0</li>
                        <li>PC side transitions and control flow</li>
                    </ul>
                </div>
            </section>

            <section class="lesson-section">
                <h3>Lesson 6: Self-Modifying Code</h3>
                <div class="section-text">
                    <ul>
                        <li>STOR M(X, 8:19) and STOR M(X, 28:39)</li>
                        <li>Patching instruction addresses during execution</li>
                        <li>Array traversal loop patterns</li>
                    </ul>
                    <p>Interactive exercises are available when the training module loads successfully.</p>
                </div>
            </section>
        </div>
    `;
}

// Training tab initialization
const trainingContainer = document.getElementById('training-container');
if (trainingContainer) {
    if (window.VEIZACTraining && typeof window.VEIZACTraining.initTraining === 'function') {
        window.VEIZACTraining.initTraining(trainingContainer);
    } else {
        import('./training.js')
            .then(({ initTraining }) => {
                initTraining(trainingContainer);
            })
            .catch(() => {
                renderTrainingFallback(trainingContainer);
            });
    }
}

const simulatorMount = document.getElementById('sim-ui-mount');
if (simulatorMount) {
    if (window.VEIZACUI && typeof window.VEIZACUI.initSimulatorUI === 'function') {
        window.VEIZACUI.initSimulatorUI();
        if (window.VEIZACTools && typeof window.VEIZACTools.initToolsUI === 'function') {
            window.VEIZACTools.initToolsUI();
        }
    } else {
        import('./ui.js')
            .then(({ initSimulatorUI }) => {
                initSimulatorUI();
                if (window.VEIZACTools && typeof window.VEIZACTools.initToolsUI === 'function') {
                    window.VEIZACTools.initToolsUI();
                } else {
                    import('./tools.js')
                        .then(({ initToolsUI }) => initToolsUI())
                        .catch(() => {
                            // Tools overlay is optional during bootstrap failures.
                        });
                }
            })
            .catch(() => {
                simulatorMount.innerHTML = [
                    'Simulator module could not be loaded in this browser context.',
                    'Global and module simulator loaders are both unavailable.'
                ].join('<br>');
            });
    }
}
