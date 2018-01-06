var
    balanceAddr = "#balance",
    ticketAddr = "#user_lottery_tickets",
    rewardAddr = ".user_reward_points",
    referralAddr = "#refer_tab .reward_table_box.br_0_0_5_5.font_bold",
    freePlayButtonAddr = "#free_play_form_button",
    captchaImg = ".captchasnet_captcha_content img",
    captchaText = "input.captchasnet_captcha_input_box",
    captchaModal = ".reveal-modal.open a.close-reveal-modal",
    buffCaptcha = null,
    waitCaptcha = false;

/**
 * Колво включеных бонусов
 * @return {*}
 */
var getBonus = function(){
    return $("#bonus_container_free_points").length + $("#bonus_container_fp_bonus").length + $("#bonus_container_free_lott").length;
};

/**
 * Текущий баланс
 * @return {jQuery}
 */
var getBalance = function(){
    return $(balanceAddr).text();
};

/**
 * Колво лотерейных билетов
 * @return {jQuery}
 */
var getTicket = function(){
    return $(ticketAddr).text();
};

/**
 * Колво бонусных поинтов
 * @return {jQuery}
 */
var getReward = function(){
    return $(rewardAddr).text();
};

/**
 * Колво рефералов
 * @return {jQuery}
 */
var getReferral = function(){
    return $(referralAddr).text();
};

/**
 * Запуск фрирола
 */
var runRoll = function() {

    if ($(freePlayButtonAddr).css('display') != "none") {
        if ($(captchaImg).length) {
            if (buffCaptcha == null) {
                if (!waitCaptcha) {
                    console.log("decode captcha");
                    window.ipcRender.send('captcha', $(captchaImg).prop("src"));
                    waitCaptcha = true;
                } else {
                    console.log("waiting captcha");
                }
            } else {
                $(captchaText).val(buffCaptcha);
                $(freePlayButtonAddr).click();
                buffCaptcha = null;
                waitCaptcha = false;
                window.ipcRender.send('roll');
            }
        } else {
            $(freePlayButtonAddr).click();
            window.ipcRender.send('roll');
        }
    }
};

$(document).ready(function ($) {

    console.log("Bot started");

    window.ipcRender.on('captcha', function (e, v) {
        buffCaptcha = v
    });

    window.ipcRender.on('roll', function (e, v) {
        runRoll();
    });

    window.ipcRender.on('update', function (e, v) {
        window.ipcRender.send('update', {
            balance: getBalance(),
            ticket: getTicket(),
            reward: getReward(),
            referral: getReferral(),
            bonus: getBonus()
        });
    });

    window.ipcRender.on('bonus', function (e, v) {
        eval("RedeemRPProduct")(v)
    });

    $("body").append("<div style='position: fixed; bottom: 0; left: 0; background: rgba(0,0,0,0.8); text-align: center; width: 100%; height: 30px; font-size: 16px; line-height: 30px; color: #fff;'>DONATE: 1Pk4RsucZ372AdNt2UWntE3Sn4SCbqPEVi (BTC) / DGFD6NTceh7oMTZVDhNmgA6v6Rk6usi2Lr (DOGE)</div>")
});
