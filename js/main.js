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
                    <p>To enable full interactive exercises, open this site from a local web server instead of file://.</p>
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
