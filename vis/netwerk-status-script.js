/* Versionshistorie:
 * 
 * 1.0.2:
 * - neu: Anzeige der letzten An- und Abmeldung
 * - neu: Verwendung eigener Bilder möglich
 * 
 * 1.0.1:
 * - neu: In dem Mapping der IP-Adressen kann jetzt eine URL vergeben werden ('http' oder direkt eine spezifische URL)
 * - geändert: Styling der Details
 * - entfernt: MAC-Adresse
 * 
 * 1.0.0:
 * - Initial Release
 */

const moment = require("moment");
 
// Skript Einstellungen *************************************************************************************************************************************************
 
let dpList = '0_userdata.0.vis.NetzwerkStatus.jsonList';          // Datenpunkt für IconList Widget (Typ: Zeichenkette (String))
 
let dpSortMode = '0_userdata.0.vis.NetzwerkStatus.sortMode';      // Datenpunkt für Sortieren (Typ: Zeichenkette (String))
let dpFilterMode = '0_userdata.0.vis.NetzwerkStatus.filterMode';  // Datenpunkt für Filter (Typ: Zeichenkette (String))
 
const checkInterval = 30;                                         // Interval wie oft Status der Skripte aktualisiert werden soll (in Sekunden)
 
let sprache = 'de';                                               // Sprache für formatierung letzte Änderung
let formatierungLastChange = "ddd DD.MM - HH:mm";                 // Formatierung letzte Änderung -> siehe momentjs library

let imagePath = '/vis.0/myImages/networkDevices/'                 // Pfad zu den verwendeten Bildern (bitte über den VIS Dateimanager hochladen)
                                                                  // nach Variable imagePath suchen und die entsprechenden Zeilen aus- bzw. einkommentieren
                                                                  // Das Bild (Dateiformat png) in der Mapping-Liste hinterlegen
let defaultImage = 'ip-network-outline';                          // Standardbild, falls kein Bild angegeben wurde (Material Design Icons)
//let defaultImage = `${imagePath}default.png`;                   // Standardbild, falls kein Bild angegeben wurde (eigenes Bild)
 
let farbeGeraetOnline = 'green';                                  // Status Bar Farbe wenn Geräte online ist
let farbeGeraetOffline = 'FireBrick';                             // Status Bar Farbe wenn Geräte offline ist
 
let sortResetAfter = 120;                                         // Sortierung nach X Sekunden auf sortReset zurücksetzen (0=deaktiviert)
let sortReset = 'name'                                            // Sortierung auf die zurückgesetzt werden soll
 
let filterResetAfter = 120;                                       // Filter nach X Sekunden zurücksetzen (0=deaktiviert)

const deviceNames = 
[{ ip: "192.168.178.11", alias: "Your Computer", 	  image: "desktop-classic" },
{ ip: "192.168.178.12", alias: "Sonoff Living Room", image: "toggle-switch-outline", link: "http" },
{ ip: "192.168.178.13", alias: "Diskstation", 		  image: "NAS", 				  link: "http://diskstation:5000" }
];
 
// **********************************************************************************************************************************************************************
 
// Fomate für moment Lib
moment.locale(sprache);

// auf Änderungen aktiver Skripts hören
let activeSelector = `[id=tr-064.*.devices.*.active]`;
let deviceActiveList = $(activeSelector);
if (deviceActiveList.length === 0) {
    // Fehlermeldung ausgeben, wenn selector kein result liefert
    console.error(`no result for selector '${activeSelector}'`)
} else {
    // listener nur für Änderung bei alive
    deviceActiveList.on(netzwerkStatus);
} 
 
// auf Änderungen der Sortieung hören
on({ id: dpSortMode, change: 'any' }, netzwerkStatus);
on({ id: dpSortMode, change: 'any' }, resetSort);
 
// // auf Änderungen der Filter hören
on({ id: dpFilterMode, change: 'any' }, netzwerkStatus);
on({ id: dpFilterMode, change: 'any' }, resetFilter);
 
 
// Funktion adapterStatus alle x Sekunden ausführen
schedule('*/' + checkInterval + ' * * * * *', netzwerkStatus);
 
function netzwerkStatus() {
    try {
        let deviceList = [];
 
        for (var i = 0; i <= deviceActiveList.length - 1; i++) {
            let id = deviceActiveList[i].replace('.active', '');
            let obj = getObject(id);
 
            let pattern = /(?:\d{1,3}\.){3}\d{1,3}/i;

            let ipAddress = obj.common.name.match(pattern)[0];
            let image = defaultImage;
            let deviceName = obj.common.name.replace(/ \((?:\d{1,3}\.){3}\d{1,3}\)/g, '');
            let device = deviceNames.find(element => element.ip == ipAddress);
            let listType = 'text';
            let buttonLink = '';

            if(device) {
                deviceName = device.alias;
                image = device.image;
                //image = `${imagePath}${device.image}.png`;

                if(device.link) {
                    listType = 'buttonLink';

                    if(device.link == 'http') {
                        buttonLink = `http://${ipAddress}`;
                    } else {
                        buttonLink = device.link;
                    }
                }
            }

            let macAddress = obj.native.mac;
            let imageColor = 'black';
            let statusBarColor = farbeGeraetOffline;
            let status = 2;
 
            if (getState(deviceActiveList[i]).val) {
                statusBarColor = farbeGeraetOnline;
                status = 1;
            }

            if(listType === 'buttonLink') {
                deviceName = `<span style="text-decoration: underline">${deviceName}</span>`                
            }

            let lastSignIn = 'noch nicht angemeldet';
            let lastSignOff = 'noch nicht abgemeldet';

            // Letzte Anmeldung auslesen
            if(existsState(id + '.lastActive')) {
                lastSignIn = 'angemeldet seit: ' + moment((getState(id + '.lastActive').val)).format("DD.MM.YY HH:mm:ss");
            }        

            // Letzte Abmeldung auslesen
            if(existsState(id + '.lastInactive')) {
                lastSignOff = 'abgemeldet seit: ' + moment((getState(id + '.lastInactive').val)).format("DD.MM.YY HH:mm:ss");
            }

            let subText = `<div style="color: black; font-family: RobotoCondensed-BoldItalic">${ipAddress}</div>
                           <div style="color: grey; font-family: RobotoCondensed-Regular">${lastSignIn}</div>
                           <div style="color: grey; font-family: RobotoCondensed-Regular">${lastSignOff}</div>`
 
            deviceList.push({
                text: deviceName,
                subText: subText,
                statusBarColor: statusBarColor,
                image: image,
                imageColor: imageColor,
                listType: listType,
                buttonLink: buttonLink,
                showValueLabel: false,
                name: deviceName,
                ipAddress: ipAddress,
                status: status
            });
        }
 
        let sortMode = myHelper().getStateValueIfExist(dpSortMode, 'name');
 
        if (sortMode === 'name' || sortMode === 'ipAddress') {
            deviceList.sort(function (a, b) {
                return a[sortMode].toLowerCase() == b[sortMode].toLowerCase() ? 0 : +(a[sortMode].toLowerCase() > b[sortMode].toLowerCase()) || -1;
            });
        } else if (sortMode === 'status') {
            deviceList.sort(function (a, b) {
                return a[sortMode] == b[sortMode] ? 0 : +(a[sortMode] < b[sortMode]) || -1;
            });
        } else {
            // default: nach name sortieren
            sortMode = 'name'
            deviceList.sort(function (a, b) {
                return a[sortMode].toLowerCase() == b[sortMode].toLowerCase() ? 0 : +(a[sortMode].toLowerCase() > b[sortMode].toLowerCase()) || -1;
            });
        }
 
 
        let filterMode = myHelper().getStateValueIfExist(dpFilterMode, null);
 
        if (filterMode && filterMode !== null && filterMode !== '') {
            if (filterMode === 'offline') {
                deviceList = deviceList.filter(function (item) {
                    return item.status === 2;
                });
            } else if (filterMode === 'online') {
                deviceList = deviceList.filter(function (item) {
                    return item.status === 1;
                });
            }
        }
 
 
        let result = JSON.stringify(deviceList);
        if (getState(dpList) !== result) {
            setState(dpList, result, true);
        }
 
    } catch (err) {
        console.error(`[netzwerkStatus] error: ${err.message}, stack: ${err.stack}`);
    }
}
 
function resetSort() {
    let sortMode = myHelper().getStateValueIfExist(dpSortMode, null);
 
    if (sortResetAfter > 0) {
        setTimeout(function () {
            if (sortMode !== null && sortMode === myHelper().getStateValueIfExist(dpSortMode, null)) {
                setState(dpSortMode, sortReset);
            }
        }, sortResetAfter * 1000);
    }
}
 
function resetFilter() {
    let filterMode = myHelper().getStateValueIfExist(dpFilterMode, null);
 
    if (filterResetAfter > 0) {
        setTimeout(function () {
            if (filterMode !== null && filterMode === myHelper().getStateValueIfExist(dpFilterMode, null)) {
                setState(dpFilterMode, '');
            }
        }, filterResetAfter * 1000);
    }
}
 
// Beim Staren des Skriptes Adapter Status abrufen
netzwerkStatus();
 
function myHelper() {
    return {
        getStateValueIfExist: function (id, nullValue = undefined, prepand = '', append = '') {
            if (existsState(id)) {
                return prepand + getState(id).val + append;
            } else {
                return nullValue;
            }
        },
        getCommonPropertyIfExist: function (object, prop, nullValue = undefined, prepand = '', append = '') {
            if (myHelper().checkCommonPropertyExist(object, prop)) {
                return prepand + object.common[prop] + append;
            } else {
                return nullValue;
            }
        },
        checkCommonPropertyExist: function (object, prop) {
            if (object && object.common && object.common[prop]) {
                return true;
            } else {
                return false;
            }
        }
    }
}