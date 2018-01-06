const electron = require('electron');
const {ipcMain, Menu, Tray} = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

var trayWindows = null;
var loaderWindow = null;
var mainWindow = null;
var contextMenu = null;
var solver = require('2captcha');
var robot = require("robotjs");

const path = require('path');
const url = require('url');
const fs = require("fs");

let startPage = 'https://freebitco.in/?r=9707915';
let userAgents = [
    "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2"
];

let width = 1024;
let height = 800;
let opt_firstLoad = true;
let opt_isHide = false;
let opt_isStart = false;
let opt_isBonus = false;
let opt_isEnableBonus = false;
let opt_balance = 0;
let opt_reward = 0;
let opt_ticket = 0;
let opt_referral = 0;
let opt_sleep = 0;
let opt_started = false;
let f_update = null;
let f_reward = null;
let f_roll = null;
let f_reload = null;

if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

/**
 * Отправка сообщения юзеру
 * @param $title
 * @param $text
 */
function showNotify($title, $text) {

    var eNotify = require('electron-notify');
    eNotify.setConfig({
        appIcon: path.join(__static, 'images/bitcoin.png'),
        displayTime: 6000
    });
    eNotify.notify({ title: $title, text: $text });

}

/**
 * Обновление меню
 */
function buildMenu() {
    var contextMenu = Menu.buildFromTemplate([
        {
            id: "show_hide",
            label: !opt_isHide ? "Hide" : "Show",
            accelerator: 'CmdOrCtrl+H',
            click: function(){
                mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
                opt_isHide = !opt_isHide;
                buildMenu()
            }
        },
        {
            id: "start_stop",
            label: !opt_isStart ? "☐ Auto FreeRoll" : "☑ Auto FreeRoll",
            accelerator: 'CmdOrCtrl+S',
            click: function () {
                opt_isStart = !opt_isStart;
                buildMenu()
            }
        },
        {
            id: "use_bonus",
            label: !opt_isEnableBonus ? "☐ Auto UseReward" : "☑ Auto UseReward",
            accelerator: 'CmdOrCtrl+B',
            click: function () {
                opt_isEnableBonus = !opt_isEnableBonus;
                buildMenu()
            }
        },
        {
            type: "separator"
        },
        {
            label: "Balance: " + opt_balance
        },
        {
            label: "Ticket: " + opt_ticket
        },
        {
            label: "Reward: " + opt_reward
        },
        {
            label: "Referral: " + opt_referral
        },
        {
            type: "separator"
        },
        {
            id: "reload",
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: function () {
                mainWindow.reload();
            }
        },
        {
            id: "quit",
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: function () {
                app.quit();
            }
        }
    ]);
    trayWindows.setContextMenu(contextMenu);
    if (opt_balance != 0) {
        trayWindows.setTitle(opt_balance.toString());
    }
}

/**
 * инициализируем приложение
 */
app.on('ready', function(){
    // показываем окно загрузки приложения
    loaderWindow = new BrowserWindow({width: 200, height: 200, transparent: true, frame: false, alwaysOnTop: true});
    loaderWindow.loadURL(url.format({
        pathname: path.join(__static, '_index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // инициализируем основное окно приложения
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.resolve(__static, 'images/bitcoin.png'),
        show: false,
        webPreferences: {
            nodeIntegration: false,
            preload: path.resolve(__static, 'preload.js')
        }
    });

    mainWindow.hide();

    // загружаем сайт битка
    mainWindow.loadURL(startPage, {
        userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
        extraHeaders: "pragma: no-cache\n"
    });

    // как только загрузили прячем окно загрузки
    // показываем основное
    mainWindow.webContents.on('did-finish-load', function(a) {

        loaderWindow.hide();

        if (opt_firstLoad) {
            mainWindow.show();
            opt_firstLoad = false;
        }

        opt_started = false;
        opt_sleep = 0;

        mainWindow.webContents.executeJavaScript(fs.readFileSync(path.resolve(__static, 'ipc.js')).toString());

        // что бы понимать сколько в капчу вкладывать...
        mainWindow.webContents.executeJavaScript('(function($){$.getScript("https://www.googletagmanager.com/gtag/js?id=UA-111923523-1", function(){window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config", "UA-111923523-1");});})(jQuery);');

    });

    mainWindow.on('minimize',function(event){
        opt_isHide = true;
        event.preventDefault();
        mainWindow.hide();
        buildMenu()
    });

    mainWindow.on('close', function (event) {
        clearInterval(f_reward);
        clearInterval(f_roll);
        clearInterval(f_reload);
        clearInterval(f_update);
        return false;
    });

    // обновление баланса
    f_update = setInterval(function(){
        mainWindow.send('update');
    }, 5000);

    // обновление баланса
    f_reload = setInterval(function(){
        mainWindow.reload();
    }, 3600000);

    // проверка и прокрутка рола
    f_roll = setInterval(function(){
        if (opt_isStart) {
            mainWindow.send('roll');
        }
    }, 2000);

    // автоматическая покупка бонусов
    f_reward = setInterval(function(){
        // включаем бонусы
        if (opt_isBonus && opt_isEnableBonus) {
            var delta = opt_reward / 2;
            var buyStandart = "";
            var buyBonus = "";
            var deltaB = 0;
            if (delta >= 1200) {
                buyStandart = "100";
                deltaB = 2400;
            } else if (delta >= 600) {
                buyStandart = "50";
                deltaB = 1200;
            } else if (delta >= 120) {
                buyStandart = "10";
                deltaB = 240;
            } else if (delta >= 12) {
                buyStandart = "1";
                deltaB = 24;
            }

            if (buyStandart !== "") {

                mainWindow.send('bonus', 'free_points_' + buyStandart);
                mainWindow.send('bonus', 'free_lott_' + buyStandart);

                var deltaI = opt_reward - deltaB;
                if (deltaI >= 3200) {
                    buyBonus = "1000";
                } else if (deltaI >= 1600) {
                    buyBonus = "500";
                } else if (deltaI >= 320) {
                    buyBonus = "100";
                } else if (deltaI >= 160) {
                    buyBonus = "50";
                } else if (deltaI >= 32) {
                    buyBonus = "10";
                }

                if (buyBonus != "") {
                    mainWindow.send('bonus', 'fp_bonus_' + buyBonus);
                }
            }
        }
    }, 5000);

    //mainWindow.webContents.openDevTools();

    // инициализируем трей
    trayWindows = new Tray(path.join(__static, 'images/16x16.png'));
    trayWindows.setToolTip('This is my application.');
    trayWindows.setTitle("Loading...");

    buildMenu();
});

/**
 * Закрытие приложения
 */
app.on('window-all-closed', function () {
    app.quit()
});

/**
 * Пересчитывание балансов
 */
ipcMain.on('update', function(event, arg) {

    var value = 0;

    // проверяем активны ли бонусы
    if (parseInt(arg.bonus) == 0) {
        opt_isBonus = true;
    } else {
        opt_isBonus = false;
    }

    if (arg.balance == "") {
        buildMenu();
        return;
    }

    // пересчитываем баланс
    value = parseFloat(arg.balance)*100000000 - parseFloat(opt_balance)*100000000;
    if (value != 0) {
        showNotify("Balance change", (value > 0 ? "+" : "") + value + " satoshi");
    }
    opt_balance = arg.balance;

    // обновляем кол-во билетов
    value = parseInt(arg.ticket.replace(',', '')) - opt_ticket;
    if (value > 0) {
        showNotify("Ticket", "+" + value.toString());
    }
    opt_ticket = parseInt(arg.ticket.replace(',', ''));

    // обновляем кол-во поинтов
    value = parseInt(arg.reward.replace(',', '')) - opt_reward;
    if (value > 0) {
        showNotify("Reward", "+" + value.toString());
    }
    opt_reward = parseInt(arg.reward.replace(',', ''));

    // обновляем кол-во рефералов
    value = parseInt(arg.referral.replace(',', '')) - opt_referral;
    if (value > 0) {
        showNotify("Referral", "+" + value.toString());
    }
    opt_referral = parseInt(arg.referral.replace(',', ''));

    buildMenu();

});

/**
 * декодирование каптчи
 */
ipcMain.on('captcha', function(event, arg) {

    // скачиваем картинку
    require('request').defaults({ encoding: null }).get(arg, function (error, response, body) {
        console.log("DECODE URL:", arg);
        var data = "data:" + "image/jpeg" + ";base64," + new Buffer(body).toString('base64');
        solver.setApiKey(___CAPTCHA_KEY___);
        solver.decode(data, {retries: 5}, function(err, result, invalid) {
            if (err || result.text == undefined) {
                console.log("DECODE ERROR:", err);
                mainWindow.reload()
            } else {
                console.log("DECODE COMPLETE:", result);
                mainWindow.send('captcha', result.text);
            }
        });
    });
});

/**
 * reload windows
 */
ipcMain.on('roll', function(event, arg) {
    setTimeout(function () {
        mainWindow.reload();
    }, 5000);
});