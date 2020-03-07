const logging = true; 
const debugging = false;

//Prio für Pushover
const prio_Firmware = 1;

//Variablen für Pushover
const sendpush = true;            //true = verschickt per Pushover Nachrchten // false = Pushover wird nicht benutzt
const pushover_Instanz0 =  'pushover.0';     // Pushover instance für Pio = 0
const pushover_Instanz1 =  'pushover.1';     // Pushover instance für Pio = 1
const pushover_Instanz2 =  'pushover.2';     // Pushover instance für Pio = 2
const pushover_Instanz3 =  'pushover.3';     // Pushover instance für Pio = -1 oder -2
let _prio;
let _titel;
let _message;
//const _device = 'TPhone';         //Welches Gerät soll die Nachricht bekommen
const _device = 'All'; 

//Variablen für Telegram
const sendtelegram = false;            //true = verschickt per Telegram Nachrchten // false = Telegram wird nicht benutzt
const user_telegram = '';             //User der die Nachricht bekommen soll

//Variable zum verschicken der Servicemeldungen per eMail
const sendmail = false;            //true = verschickt per email Nachrchten // false = email wird nicht benutzt

let _message_tmp;

const id_Version_Internet = '0_userdata.0.Servicemeldungen.Verfuegbare_Tasmota-Firmware'/*Verfuegbare Tasmota-Firmware*/;
var cacheSelectorTasmotaVersions = $('channel[state.id=sonoff.0.*.Version]');

const request = require('request');

function func_Version() {
    var options = {
        url: 'https://api.github.com/repos/arendst/Tasmota/releases/latest',
        headers: {
            'User-Agent': 'ioBroker Tasmota Firmware Check'
        }
    };

    request(options, function (error, response, body) {
        const availableFirmware = getState(id_Version_Internet).val;

        if(error) {
            log('error: ' + error);
        } else {
            var tasmotaJson = JSON.parse(body); 
            var tasmotaTagName = tasmotaJson.tag_name;
            var tasmotaVersion = tasmotaTagName.replace(/v/i, "").trim();

            if(availableFirmware == ''){
                if(logging){
                    log('ausgewähltes Objekt leer. Firmware wird erstmalig gesetzt. Firmware: '+ tasmotaVersion);// +' Zentrale: ' +Version[3]);
                }
                setState(id_Version_Internet, tasmotaVersion);
            }

            var devices = [];

            cacheSelectorTasmotaVersions.each(function (id, i) {
                var installedFirmware = getState(id).val.trim();
                installedFirmware = installedFirmware.replace('(sonoff)', '').trim();
                installedFirmware = installedFirmware.replace('(tasmota)', '').trim();

                var obj = getObject(id);
                var infoId = id.substring(0, id.lastIndexOf("."));
                var hostName = getState(infoId + '.Hostname').val;

                if(installedFirmware == tasmotaVersion){
                    if(logging){
                        log('Installierte Tasmota-Firmware für Gerät ' + hostName  + ' ist aktuell.');
                    }
                } else {
                    if(logging){
                        log('Installierte Tasmota-Firmware für Gerät ' + hostName  + ' (' + installedFirmware + ') ist nicht aktuell. Aktuell verfügbare Version: ' + tasmotaVersion);
                    }
                    
                    if(availableFirmware == tasmotaVersion){
                        if(debugging){
                            log('[DEBUG] ' + 'Version Internet hat sich nicht verändert');
                        }
                    } else {
                        if(debugging){
                            log('[DEBUG] ' + 'Installierte Tasmota-Firmware ist nicht aktuell.');
                        }
                        
                        setState(id_Version_Internet, tasmotaVersion);

                        devices.push(hostName + ' (' + installedFirmware + ')');
                    }         
                }
            });

            if(devices.length > 0) {
                _message_tmp = 'Neue Tasmota-Firmware ' + tasmotaVersion + ' für folgende Geräte verfügbar:\n' + devices.join('\n');
        
                //Push verschicken
                if(sendpush){
                    _prio = prio_Firmware;
                    _titel = 'Tasmota-Firmware';
                    _message = _message_tmp;
                    send_pushover_V4(_device, _message, _titel, _prio);
                }
                if(sendtelegram){
                    _message = _message_tmp;
                    send_telegram(_message, user_telegram);
                }
                if(sendmail){
                    _message = _message_tmp;
                    send_mail(_message);
                }
            }
        }
    });
}
        
function send_pushover_V4 (_device, _message, _titel, _prio) {
        let pushover_Instanz;
        if (_prio === 0){pushover_Instanz =  pushover_Instanz0}
        else if (_prio == 1){pushover_Instanz =  pushover_Instanz1}
        else if (_prio == 2){pushover_Instanz =  pushover_Instanz2}
        else {pushover_Instanz =  pushover_Instanz3}
        sendTo(pushover_Instanz, { 
        device: _device,
        message: _message, 
        title: _titel, 
        priority: _prio,
        retry: 60,
        expire: 600,
        html: 1
    }); 
}

function send_telegram (_message, user_telegram) {
    sendTo('telegram.0', { 
        text: _message,
        user: user_telegram,
        parse_mode: 'HTML'
    }); 
}

function send_mail (_message) {
    sendTo("email", {
        //from:    "iobroker@mydomain.com",
        //to:      "aabbcc@gmail.com",
        subject: "Servicemeldung",
        text:    _message
    });
}

// um 10:00 Uhr prüfen
schedule({hour: 10, minute: 0}, func_Version);

//beim Starten
func_Version();