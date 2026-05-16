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
