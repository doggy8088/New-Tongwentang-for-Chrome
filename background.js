var
    textArea = null,
    menuId = null,
    isOptions = false,
    tongwen = {
        'version'     : '',
        'autoConvert' : 'none',
        'iconAction'  : 'auto',
        'symConvert'  : true,
        'inputConvert': 'none',
        'fontCustom'  : {
            'enable': false,
            'trad'  : 'PMingLiU,MingLiU,新細明體,細明體',
            'simp'  : 'MS Song,宋体,SimSun'
        },
        'urlFilter'   : {
            'enable': false,
            'list'  : [
                // { 'url': '', 'zhflag': 'none, trad, simp' }
            ]
        },
        'userPhrase'  : {
            'enable': false,
            'trad'  : {},
            'simp'  : {}
        },
        'contextMenu' : {
            'enable': true
        }
    };

/**
 * 重新載入設定值
 **/
function reloadConfig(act) {
    tongwen = JSON.parse(localStorage.tongwen);

    if (act === 'options') {
        isOptions = true;
        if (tongwen.contextMenu.enable) {
            contextMenuAction();
        } else {
            chrome.contextMenus.removeAll(function () {
                menuId = null;
            });
        }
    }
}

/**
 * 合併新舊版本的設定值
 **/
function mergeConfig() {
    var oTongwen, i;

    if (typeof localStorage.tongwen === 'undefined') {
        localStorage.tongwen = JSON.stringify(tongwen);
    } else {
        oTongwen = JSON.parse(localStorage.tongwen);
        for (i in oTongwen) {
            if (oTongwen.hasOwnProperty(i) && (i !== 'version')) {
                tongwen[i] = oTongwen[i];
            }
        }
        if (typeof tongwen.userPhrase.enable === 'undefined') {
            tongwen.userPhrase.enable = false;
        }
        localStorage.tongwen = JSON.stringify(tongwen); // 回存設定
    }
}

function urlFilterAction(uri) {
    var lst = tongwen.urlFilter.list, i, c, url, re = null;
    for (i = 0, c = lst.length; i < c; i += 1) {
        if (lst[i].url.indexOf('*') >= 0) {
            // var url = lst[i].url.replace(/(\W+)/ig, '\\$1').replace('*.', '*\\.').replace(/\*/ig, '\\w*'); // 較為嚴謹
            url = lst[i].url.replace(/(\W)/ig, '\\$1').replace(/\\\*/ig, '*').replace(/\*/ig, '.*'); // 寬鬆比對
            re = new RegExp('^' + url + '$', 'ig');
            if (uri.match(re) !== null) {
                return lst[i].zhflag;
            }
        } else if (uri === lst[i].url) {
            return lst[i].zhflag;
        }
    }
    return '';
}

/**
 * 網頁載入後初始化的動作
 **/
function docLoadedInit(uri) {
    var zhflag = '';

    if (tongwen.urlFilter.enable) {
        zhflag = urlFilterAction(uri);
    }
    if (zhflag === '') {
        zhflag = tongwen.autoConvert;
    }

    return zhflag;
}

/**
 * 取得剪貼簿內容
 * @returns {string}
 */
function getClipData() {
    textArea.value = '';
    textArea.focus();
    document.execCommand('Paste');
    return textArea.value;
}

/**
 * 設定剪貼簿內容
 * @param {string} val
 */
function setClipData(val) {
    textArea.value = val;
    textArea.focus();
    textArea.select();
    document.execCommand('Copy');
}

function doAction(tab, act, flag) {
    chrome.tabs.detectLanguage(tab.id, function (lang) {
        lang = typeof lang === 'undefined' ? false : lang.toLocaleLowerCase();
        var request = {
            'tongwen': tongwen,
            'act': act,
            'flag': ('trad,simp'.indexOf(flag) < 0) ? 'auto' : flag,
            'lang': lang
        };
        chrome.tabs.sendMessage(tab.id, request, function(response) {});
    });
}

/**
 * 設定圖示上的文字
 */
function iconActionStat() {
    chrome.browserAction.setBadgeBackgroundColor({'color': '#C0C0C0'});
    switch (tongwen.iconAction) {
        case 'trad': chrome.browserAction.setBadgeText({'text': 'T'}); break;
        case 'simp': chrome.browserAction.setBadgeText({'text': 'S'}); break;
        default    : chrome.browserAction.setBadgeText({'text': ''});
    }
}

/**
 * 建立右鍵選單
 */
function contextMenuAction() {
    if (menuId !== null) {
        return;
    }
    var contexts = ['page', 'selection', 'link', 'editable', 'image', 'video', 'audio'];

    // 新同文堂
    menuId = chrome.contextMenus.create({
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('extTitle'),
        'contexts' : contexts
    });
    // 輸入區 轉繁體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextInput2Trad'),
        'contexts' : ['editable'],
        'onclick'  : function () {
            chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
                doAction(tab, 'input', 'trad');
            });
        }
    });
    // 輸入區 轉簡體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextInput2Simp'),
        'contexts' : ['editable'],
        'onclick'  : function () {
            chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
                doAction(tab, 'input', 'simp');
            });
        }
    });
    // 分隔線
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'separator',
        'contexts' : ['editable']
    });
    // 網頁 轉繁體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextPage2Trad'),
        'contexts' : ['all'],
        'onclick'  : function () {
            chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
                doAction(tab, 'page', 'trad');
            });
        }
    });
    // 網頁 轉簡體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextPage2Simp'),
        'contexts' : ['all'],
        'onclick'  : function () {
            chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
                doAction(tab, 'page', 'simp');
            });
        }
    });
    // 分隔線
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'separator',
        'contexts' : ['all']
    });
    // 剪貼簿 轉繁體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextClip2Trad'),
        'contexts' : ['all'],
        'onclick'  : function () {
            var val, txt = getClipData();
            val = TongWen.convert(txt, 'traditional');
            setClipData(val);
        }
    });
    // 剪貼簿 轉簡體
    chrome.contextMenus.create({
        'parentId' : menuId,
        'type'     : 'normal',
        'title'    : chrome.i18n.getMessage('contextClip2Simp'),
        'contexts' : ['all'],
        'onclick'  : function () {
            var val, txt = getClipData();
            val = TongWen.convert(txt, 'simplified');
            setClipData(val);
        }
    });
}

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
    doAction(tab, 'icon', tongwen.iconAction);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // 初始化
    // 網址過濾規則與自動轉換
    var zhflag = docLoadedInit(request.docURL);
    tongwen.symbolS2T = symbolS2T;
    tongwen.symbolT2S = symbolT2S;
    sendResponse([tongwen, zhflag]);
});

chrome.commands.onCommand.addListener(function (command) {
    var val, txt;
    if (command === 'page-trad') {
        chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
            doAction(tab, 'page', 'trad');
        });
    } else if (command === 'page-simp') {
        chrome.tabs.query({ currentWindow: true, active: true }, function ([tab]) {
            doAction(tab, 'page', 'simp');
        });
    } else if (command === 'clip-trad') {
        txt = getClipData();
        val = TongWen.convert(txt, 'traditional');
        setClipData(val);
    } else if (command === 'clip-simp') {
        txt = getClipData();
        val = TongWen.convert(txt, 'simplified');
        setClipData(val);
    }
});

// Storage 有更動時
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (isOptions) {
        // 忽略本機，已經儲存過了
        isOptions = false;
        return;
    }

    var key, storageChange, isChange = false;
    for (key in changes) {
        if (changes.hasOwnProperty(key)) {
            if (key === 'version') {
                continue;
            }
            storageChange = changes[key];
            tongwen[key] = storageChange.newValue;
            isChange = true;
        }
    }
    if (isChange) {
        localStorage.tongwen = JSON.stringify(tongwen); // 回存設定
    }
});

// 更新設定檔
chrome.runtime.onInstalled.addListener(function (details) {
    // details = {previousVersion: "1.0.3.9", reason: "update"};
    var data = chrome.runtime.getManifest();
    tongwen.version = data.version;
    mergeConfig();
});

window.addEventListener('DOMContentLoaded', function (event) {
    // clip 需要的
    textArea = document.getElementById('clipdata');

    mergeConfig();
    reloadConfig('self');
    iconActionStat();

    if (tongwen.contextMenu.enable) {
        contextMenuAction();
    }

    if (tongwen.userPhrase.enable) {
        TongWen.addT2STable(tongwen.userPhrase.simp);
        TongWen.addS2TTable(tongwen.userPhrase.trad);
    }
});
