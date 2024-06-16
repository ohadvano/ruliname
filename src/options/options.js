import { Rule, RuleMap } from '../rules.js';
import { RuleType } from '../consts.js';
import './options.css';

import Swal from 'sweetalert2';

const active = 'active';
const inactive = 'inactive';

let rulesEditor;
let activityState = {};

function refreshAdvancedRuleEditor() {
    const rulesJson = JSON.stringify(rulesEditor, null, 4);
    document.getElementById('rules-advanced-input').value = rulesJson;
}

function saveRules(rulesMap) {
    if (rulesMap instanceof RuleMap) {
        rulesEditor = RuleMap.fromJson(JSON.stringify(rulesMap));
    } else if (typeof rulesMap === 'string') {
        rulesEditor = RuleMap.fromJson(rulesMap);
    } else if (rulesMap == null) {
        rulesEditor = new RuleMap();
    } else {
        throw new Error(chrome.i18n.getMessage('internal_error_invalid_rules'));
    }

    refreshRulesEditor();
    refreshAdvancedRuleEditor();
}

function trySaveRules(rulesMap, silence) {
    try {
        saveRules(rulesMap);
        let rulesJson = JSON.stringify(rulesEditor, null, 4);

        chrome.storage.local.set({ rulesJson }, () => {
            if (silence) {
                return;
            }

            Swal.fire({
                title: chrome.i18n.getMessage("tab_rules_settings_save_success"),
                text: chrome.i18n.getMessage("tab_rules_settings_save_success_message"),
                icon: "success", timer: 2000
            });
        });
    } catch (error) {
        Swal.fire({ title: "", text: error.message, icon: "error" });
    }
}

function getRuleBlock(ruleId) {
    return `
<div id="${ruleId}_rule_block">
    <table class="rule-toggle">
        <tr>
            <td class="rule-toggle-label"><label id="${ruleId}_rule_label">${ruleId}</label></td>
            <td class="rule-toggle-icon"><img id="${ruleId}_toggle" /></td>
            <td><img id="${ruleId}_remove" /></td>
        </tr>
    </table>
    <table id="${ruleId}_data">
        <tr>
            <td class="rule-match-label"><label>${chrome.i18n.getMessage('tab_rule_setting_match_pattern')}</label></td>
            <td class="rule-match-input" colspan="3"><input id="${ruleId}_match_input" type="box" /></td>
        </tr>
        <tr>
            <td class="rule-type-label">${chrome.i18n.getMessage('tab_rule_setting_type_label')}</td>
            <td class="rule-type-input">
                <select id="${ruleId}_rule_type">
                    <option value="${RuleType.Fixed}">${chrome.i18n.getMessage('tab_rule_setting_type_fixed')}</option>
                    <option value="${RuleType.ElementId}">${chrome.i18n.getMessage('tab_rule_setting_type_element_id')}</option>
                    <option value="${RuleType.ClassId}">${chrome.i18n.getMessage('tab_rule_setting_type_class_id')}</option>
                    <option value="${RuleType.CustomQuery}">${chrome.i18n.getMessage('tab_rule_setting_type_custom_query')}</option>
                </select>
            </td>
            <td class="rule-value-label">${chrome.i18n.getMessage('tab_rule_setting_value_label')}</td>
            <td class="rule-value-input"><input id="${ruleId}_rule_value" type="box" /></td>
        </tr>
        <tr><td colspan="4"><label id="${ruleId}_error_prompt"></label></td></tr>
    </table>
</div>
    `;
}

function refreshRuleDataInEditor(ruleId) {
    var rule = rulesEditor.get(ruleId);
    if (!rule) {
        return;
    }

    document.getElementById(`${ruleId}_match_input`).value = rule.matchPattern;
    document.getElementById(`${ruleId}_rule_type`).value = rule.renameDefinition.type;
    document.getElementById(`${ruleId}_rule_value`).value = rule.renameDefinition.value;
}

function initRuleEditorListeners(ruleId) {
    const ruleMatch = document.getElementById(`${ruleId}_match_input`);
    const ruleType = document.getElementById(`${ruleId}_rule_type`);
    const ruleValue = document.getElementById(`${ruleId}_rule_value`);
    const ruleData = document.getElementById(`${ruleId}_data`);
    const ruleErrorPrompt = document.getElementById(`${ruleId}_error_prompt`);
    const ruleLabel = document.getElementById(`${ruleId}_rule_label`);
    const ruleToggle = document.getElementById(`${ruleId}_toggle`);

    if (activityState[ruleId] == active) {
        ruleData.classList.add(active);
        ruleToggle.classList.add(active);
    }

    function getUpdatedRule() {
        try {
            let rule = new Rule({
                match: ruleMatch.value,
                rename: {
                    type: ruleType.value,
                    value: ruleValue.value
                }
            });

            return { rule: rule, error: null };
        } catch (error) {
            return { rule: null, error: error };
        }
    }

    function updateRule() {
        let { rule: rule, error: error } = getUpdatedRule();

        if (error) {
            rulesEditor.setNullRule(ruleId);
            ruleErrorPrompt.innerHTML = error.message;
        } else {
            rulesEditor.set(ruleId, rule);
            ruleErrorPrompt.innerHTML = '';
        }
    }

    function toggleAction() {
        if (ruleData.classList.contains(active)) {
            ruleData.classList.remove(active);
            ruleToggle.classList.remove(active);
            activityState[ruleId] = inactive;
        } else {
            ruleData.classList.add(active);
            ruleToggle.classList.add(active);
            activityState[ruleId] = active;
        }
    }

    ruleLabel.addEventListener('click', () => toggleAction(ruleId));
    ruleToggle.addEventListener('click', () => toggleAction(ruleId));

    document.getElementById(`${ruleId}_remove`).addEventListener('click', () => {
        Swal.fire({
            title: "", text: chrome.i18n.getMessage('tab_rule_setting_remove_rule_warning', ruleId),
            icon: "warning", showCancelButton: true, confirmButtonColor: "#d33", cancelButtonColor: "#3085d6",
            confirmButtonText: chrome.i18n.getMessage('tab_rule_setting_remove_rule_confirmation'),
        }).then((result) => {
            if (result.isConfirmed) {
                document.getElementById(`${ruleId}_rule_block`).remove();
                rulesEditor.remove(ruleId);
            }
        });
    });

    ruleMatch.addEventListener('input', () => updateRule());
    ruleType.addEventListener('change', () => updateRule());
    ruleValue.addEventListener('input', () => updateRule());
}

function refreshRulesEditor() {
    var editor = document.getElementById('tab-rules-settings-editor-rows');

    editor.innerHTML = "";
    for (let ruleId of rulesEditor.keys()) {
        editor.innerHTML += getRuleBlock(ruleId);
    }

    for (let ruleId of rulesEditor.keys()) {
        refreshRuleDataInEditor(ruleId);
    }

    for (let ruleId of rulesEditor.keys()) {
        initRuleEditorListeners(ruleId);
    }

    initThemeSwitch();
}

function loadInitialSettings() {
    chrome.storage.local.get(['rulesJson'], items => {
        trySaveRules(items.rulesJson, true);
    });
}

function initAdvancedOptionsToggle() {
    const advancedOptions = document.getElementById('tab-rules-settings-advanced-editor');
    const advancedOptionsLabel = document.getElementById('tab-rules-settings-advanced-editor-label-data');
    const advancedOptionsIcon = document.getElementById('tab-rules-settings-advanced-editor-toggle');

    function toggleAction() {
        if (advancedOptions.classList.contains(active)) {
            advancedOptions.classList.remove(active);
            advancedOptionsIcon.classList.remove(active);
        } else {
            advancedOptions.classList.add(active);
            advancedOptionsIcon.classList.add(active);
        }
    }

    advancedOptionsLabel.addEventListener("click", () => toggleAction());
    advancedOptionsIcon.addEventListener("click", () => toggleAction());
}

function initAdvancedRulesInput() {
    const rulesAdvancedInput = document.getElementById('rules-advanced-input');
    const result = document.getElementById('tab-rules-settings-advanced-input-result');

    rulesAdvancedInput.addEventListener('input', () => {
        try {
            RuleMap.fromJson(rulesAdvancedInput.value);
            result.textContent = '';
        } catch (error) {
            result.textContent = error.message;
        }
    });
}

function initImportButton() {
    const importFileInput = document.getElementById('tab-rules-settings-import-file-input');
    document.getElementById('tab-rules-settings-button-import').addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', () => {
        var file = importFileInput.files[0];

        var reader = new FileReader();
        reader.onload = load => {
            Swal.fire({
                title: "", text: chrome.i18n.getMessage('tab_rules_settings_import_warning'),
                icon: "warning", showCancelButton: true,
                confirmButtonText: chrome.i18n.getMessage('tab_rules_settings_import_confirmation'),
            }).then((result) => {
                if (result.isConfirmed) {
                    trySaveRules(load.target.result);
                    importFileInput.value = '';
                }
            });
        };

        reader.readAsText(file);
    });
}

function initExportButton(manifestData) {
    document.getElementById('tab-rules-settings-button-export').addEventListener('click', () => {
        chrome.storage.local.get(['rulesJson'], items => {
            var date = new Date();
            var dateString =    `${date.getFullYear()}`
                             + `-${('0' + (date.getMonth() + 1)).slice(-2)}`
                             + `-${('0' + date.getDate()).slice(-2)}`
                             + `_${('0' + date.getHours()).slice(-2)}`
                             + `-${('0' + date.getMinutes()).slice(-2)}`
                             + `-${('0' + date.getSeconds()).slice(-2)}`;

            var data = items.rulesJson;
            var blob = new Blob([data], { type: "text/json;charset=utf-8" });
            var url = URL.createObjectURL(blob);

            var link = document.createElement("a");
            link.download = `${manifestData.name}_export_${dateString}.json`;
            link.href = url;
            link.click();
            link.remove();
        });
    });
}

function initHelpButton() {
    document.getElementById('tab-rules-settings-button-help').addEventListener("click", (() => {
        chrome.tabs.create({ url: "https://github.com/ohadvano/ruliname" })
    }));
}

function initSaveEditorButton() {
    document.getElementById('tab-rules-settings-button-save').addEventListener('click', () => {
        trySaveRules(rulesEditor);
    });
}

function initSaveAdvancedEditorButton() {
    const rulesAdvancedInput = document.getElementById('rules-advanced-input');
    document.getElementById('tab-rules-settings-button-save-advanced').addEventListener('click', () => {
        trySaveRules(rulesAdvancedInput.value);
    });
}

function initEditorToggleAllButton() {
    let toggleAllState = inactive;
    const toggleAll = document.getElementById('tab-rules-settings-editor-toggle-all');
    toggleAll.addEventListener('click', () => {
        if (toggleAllState === active) {
            for (let ruleId of rulesEditor.keys()) {
                document.getElementById(`${ruleId}_data`).classList.remove(active);
                document.getElementById(`${ruleId}_toggle`).classList.remove(active);
                activityState[ruleId] = inactive;
            }

            toggleAllState = inactive;
            toggleAll.classList.remove(active);
        } else {
            for (let ruleId of rulesEditor.keys()) {
                document.getElementById(`${ruleId}_data`).classList.add(active);
                document.getElementById(`${ruleId}_toggle`).classList.add(active);
                activityState[ruleId] = active;
            }

            toggleAllState = active;
            toggleAll.classList.add(active);
        }
    });
}

function initEditorAddButton() {
    document.getElementById('tab-rules-settings-editor-add').addEventListener('click', () => {
        Swal.fire({ title: "", text: chrome.i18n.getMessage("tab_rules_setting_add_choose_name"),
                    input: "text", showCancelButton: true})
            .then((ruleId) => {
                if (!ruleId.value) {
                    Swal.fire({title: "", icon: "warning",
                               text: chrome.i18n.getMessage("tab_rules_setting_add_invalid_chosen_name")});
                    return;
                }

                rulesEditor.addNewRule(ruleId.value);
                activityState[ruleId.value] = active;
                refreshRulesEditor();
            });
    });
}

function setLocale() {
    document.querySelectorAll('[data-locale]').forEach(el => {
        el.textContent = chrome.i18n.getMessage(el.dataset.locale);
    });
}

function setExtensionName(manifestData) {
    document.querySelectorAll("[data-extension-name]").forEach(el => {
        el.textContent = manifestData.name;
    });
}

function setExtensionVersion(manifestData) {
    document.querySelectorAll("[data-extension-version]").forEach(el => {
        el.textContent = manifestData.version;
    });
}

function initThemeSwitch() {
    const darkSwitch = document.getElementById('sidebar-theme-switch');

    function setTheme(name) {
        chrome.storage.local.set({ theme: name }, () => {});
        darkSwitch.checked = name === 'dark';
        document.querySelectorAll('*').forEach(element => {
            element.classList.forEach(className => {
                if (className.startsWith("theme-")) {
                    element.classList.remove(className);
                }
            });

            element.classList.add(`theme-${name}`);
        });
    }

    chrome.storage.local.get(['theme'], items => {
        let theme;
        if (!items.theme) {
            theme = 'dark';
        } else {
            theme = items.theme;
        }

        setTheme(theme);
        darkSwitch.addEventListener('click', () => {
            if (theme === 'light') {
                theme = 'dark';
            } else {
                theme = 'light';
            }

            setTheme(theme);
        });
    });
}

function initTabSwitching() {
    const tabs = document.querySelectorAll("[data-tab-target]");
    const tabContents = document.querySelectorAll("[data-tab-content]");

    function setActive(tab, target) {
        tabContents.forEach(tabContent => tabContent.classList.remove(active));
        tabs.forEach(tabContent => tabContent.classList.remove(active));
        tab.classList.add(active);
        target.classList.add(active);
    }

    tabs.forEach((tab, _idx) => {
        const target = document.querySelector(tab.dataset.tabTarget);
        if (tab.dataset.tabTarget === '#tab-about'
                && window.location.href.indexOf("#about") !== -1) {
            setActive(tab, target);
        }

        tab.addEventListener("click", () => setActive(tab, target));
    });
}

document.addEventListener("DOMContentLoaded", (() => {
    setLocale();

    const manifestData = chrome.runtime.getManifest();
    setExtensionName(manifestData);
    setExtensionVersion(manifestData);

    initTabSwitching();
    loadInitialSettings();

    initAdvancedOptionsToggle();
    initAdvancedRulesInput();

    initHelpButton();
    initImportButton();
    initExportButton(manifestData);

    initSaveEditorButton();
    initSaveAdvancedEditorButton();

    initEditorToggleAllButton();
    initEditorAddButton();

    initThemeSwitch();
}));
