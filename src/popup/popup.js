import './popup.css';

document.addEventListener("DOMContentLoaded", (() => {
    document.querySelectorAll('[data-locale]').forEach(el => {
        el.textContent = chrome.i18n.getMessage(el.dataset.locale);
    });

    const manifestData = chrome.runtime.getManifest();

    const extensionName = document.getElementById('popup-extension-name');
    extensionName.innerHTML = manifestData.name;
    extensionName.addEventListener('click', () => {
        chrome.tabs.create({ 'url': 'https://github.com/ohadvano/ruliname' });
    });

    const extensionVersion = document.getElementById('popup-extension-version');
    extensionVersion.innerHTML = manifestData.version;

    const configurationsLink = document.getElementById('popup-configurations-link');
    configurationsLink.addEventListener('click', () => {
        chrome.tabs.create({ 'url': '/options.html' });
    });

    const aboutLink = document.getElementById('popup-about-link');
    aboutLink.addEventListener('click', () => {
        chrome.tabs.create({ 'url': '/options.html#about' });
    });
}));
