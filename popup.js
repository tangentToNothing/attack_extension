chrome.storage.sync.get('mitre_attack_extension', e => { 
    if (e.mitre_attack_extension) {
        if (e.mitre_attack_extension == 'disabled') {
            document.getElementById("switch_status").textContent = "Disabled";
            document.getElementById('switch').checked = false;
        }
        if (e.mitre_attack_extension == 'enabled') {
            document.getElementById("switch_status").textContent = "Enabled";
            document.getElementById('switch').checked = true;
        }
    }
});

function toggle(event) {
    if (event.target.checked) {
        document.getElementById("switch_status").textContent = "Enabled";
        chrome.storage.sync.set({'mitre_attack_extension': 'enabled'});
    } else {
        document.getElementById("switch_status").textContent = "Disabled";
        chrome.storage.sync.set({'mitre_attack_extension': 'disabled'});
    }
}

document.getElementById('switch').addEventListener('change', toggle);

