
var testAlarmGenerate = function(mael) {
	var alarmMessage = {
		channel: "alarms",
		payload: {
			alarms: [
				{ source: "system" , code: 1001, msg: "communication error with controller: Lager Chamber" }
				, { source: "controller_1::chamber_2" , code: 1001, msg: "Setpoint not reached within timelimit" }
			]
		}
	};
	mael.postMessage('alarms', alarmMessage );
}

var testAlarmAck = function(mael) {
	var ackMessage = {
		channel: "alarms",
		payload: { acknowledge: true }
	};
	mael.postMessage('alarms', ackMessage );
}

var testDeviceLogs = function(mael) {
	var logs = {
		channel: "logs",
		payload: {
			entries: [
				{ source: "system" , code: 1001, msg: "communication with controller 3 re-established" }
				, { source: "controller_1::chamber_1" , msg: "Changed to profile mode" }
				, { source: "controller_1::chamber_2" , msg: "Changed to beer constant mode" }
				, { source: "controller_1::chamber_2" , msg: "Beer setpoint changed to 44.0" }
			]
		}
	};
	mael.postMessage('logs', logs );
}

var testAppSetting = function(mael, setman) {
	setman.saveSetting('breweryLogo', 'img/logo-000.png');
}

var testAppSettings = function(mael, setman) {
	var settings = [];
	settings[0] = { name: 'breweryLogo', value : 'img/logo-000.png'}
	settings[1] = { name: 'themeStylesheet', value : 'smoothness'}
	setman.saveSettings(settings);
}


var testMash = function(mael) {
	testDataBase(mael, "Mashing Arduino", "Brew House", "Profile", "Heating", 0, testdatapoints_uptosp);
}
var testLager = function(mael) {
	testDataBase(mael, "Lager Arduino", "Lager Chamber", "Profile", "Cooling", -5, testdatapoints_downtosp);
}
var testAle = function(mael) {
	testDataBase(mael, "Ale Arduino", "Ale Chamber", "Profile", "Cooling", 12, testdatapoints_downtosp);
}

var testAddControllers = function(mael, ioman) {
	ioman.createController("BrewPi One", "localhost", "1234");
	ioman.createController("BrewPi Two", "localhost", "2345");
	ioman.getControllers(function(controllers) {
		$(controllers).each(function(idx,controller) {
			ioman.createChamber(controller.id, controller.name + " - Chamber 1");
			ioman.createChamber(controller.id, controller.name + " - Chamber 2");
		});
		window.setTimeout(function() {
			ioman.getControllers(function(controllers) {
				window.setTimeout(function() {
					$(controllers).each(function(idx,controller) {
						$(controller.chambers).each(function(idx,chamber) {
							ioman.createDevice(chamber.id, "Beer Temp (" + controller.id + ":" + chamber.id + ")", 1, "Beer", "OneWire", "TempSensor");
							ioman.createDevice(chamber.id, "Fridge Temp (" + controller.id + ":" + chamber.id + ")", 2, "Beer", "OneWire", "TempSensor");
							ioman.createDevice(chamber.id, "Air Temp (" + controller.id + ":" + chamber.id + ")", 3, "Beer", "OneWire", "TempSensor");
							ioman.createDevice(chamber.id, "Cooling (" + controller.id + ":" + chamber.id + ")", 1, "Beer", "Output", "DO");
							ioman.createDevice(chamber.id, "Heating (" + controller.id + ":" + chamber.id + ")", 2, "Beer", "Output", "DO");
							ioman.createDevice(chamber.id, "Fan (" + controller.id + ":" + chamber.id + ")", 4, "Beer", "OneWire", "Relay");
						});
					});
				}, 1000);
			});
		}, 1000)
	});
}

var testAddProfiles = function(mael, profman) {
	var temps = generateTestProfile(testprofiletemps, -7, 0);
	var temps2 = generateTestProfile(testprofiletemps, -14, -16);
	var temps3 = generateTestProfile(testprofiletemps, -8, -10);
	profman.createProfile("Ale Fermentation", "Fermentation", temps, []);
	profman.createProfile("Lager Fermentation", "Fermentation", temps2, []);
	profman.createProfile("Kolsch", "Fermentation", temps3, []);
}
var testprofiletemps = [
	{ date: null, days: 0, temperature: 69.0 }
	, { date: null, days: 0, temperature: 65.0 }
	, { date: null, days: 0, temperature: 66.0 }
	, { date: null, days: 0, temperature: 66.0 }
	, { date: null, days: 0, temperature: 65.0 }
	, { date: null, days: 0, temperature: 69.0 }
	, { date: null, days: 0, temperature: 70.0 }
]
var generateTestProfile = function(datapoints, daybias, tempbias) {
	var df = 'yy-mm-dd';
	var d = new Date();
	var dTime = d.getTime();
	var daysArr = [ 0, 7, 7, 12, 12, 14, 21, 22 ];
	var scale = 1000*60*60*24;
	var newTestData = [];
	for( var i=0; i<datapoints.length; i++ ) {
		var profTemp = {};
		dTime2 = dTime + (daybias+daysArr[i])*scale;
		d2 = new Date(dTime2);
		profTemp.date = $.datepicker.formatDate(df, d2) + 'T00:00:00';
		profTemp.temperature = datapoints[i].temperature + tempbias;
		profTemp.days = daysArr[i];
		newTestData[newTestData.length] = profTemp;
	}
	return newTestData;
}

var testdatapoints_downtosp = [
	[55.0, 56.2, 47.9, 56.0]
	, [55.0, 56.1, 48.2, 56.0]
	, [55.0, 56.1, 48.3, 56.0]
	, [55.0, 56.0, 48.4, 55.9]
	, [55.0, 56.0, 48.5, 55.8]
	, [55.0, 55.8, 48.6, 55.8]
	, [55.0, 55.7, 48.7, 55.7]
	, [55.0, 55.6, 48.9, 55.6]
	, [55.0, 55.5, 49.1, 55.5]
	, [55.0, 55.4, 49.3, 55.4]
	, [55.0, 55.4, 49.4, 55.4]
	, [55.0, 55.3, 49.5, 55.3]
	, [55.0, 55.3, 49.7, 55.2]
	, [55.0, 55.1, 51.0, 55.1]
	, [55.0, 55.1, 53.0, 55.1]
	, [55.0, 55.0, 55.0, 55.0]
];
var testdatapoints_uptosp = [
	[154.5, 149.9, 159.0, 149.7]
	, [154.6, 151.1, 159.0, 151.5]
	, [154.7, 152.7, 158.7, 153.0]
	, [154.8, 153.2, 158.3, 153.3]
	, [154.9, 153.8, 158.0, 153.7]
	, [155.0, 154.1, 157.8, 153.9]
	, [155.1, 154.5, 157.5, 154.4]
	, [155.2, 155.0, 157.3, 155.2]
	, [155.3, 155.2, 156.9, 155.2]
	, [155.4, 155.4, 156.5, 155.3]
	, [155.5, 155.6, 156.3, 155.4]
	, [155.6, 155.5, 156.2, 156.1]
	, [155.7, 155.7, 156.2, 156.0]
	, [155.8, 155.8, 156.1, 155.9]
	, [155.9, 155.9, 156.1, 156.0]
	, [156.0, 155.9, 156.0, 156.1]
];
var getTestTemplate = function(controller, chamber, mode, state) {
	return {
		channel: "data",
		payload: {
			controllers: [
				{
					id: 2,
					name: controller,
					chambers: [
						{	
							id: 3,
							name: chamber,
							variables: {	
								sp: 0
								, pv: 0
								, sp2: 0
								, pv2: 0
							},
							mode: mode,
							state: state,
							time: 364
						}
					]
				}
			]
		}
	};
}
var generateTestData = function(datapoints, bias) {
	var newTestData = [];
	for( var i=0; i<datapoints.length; i++ ) {
		var vars = datapoints[i];
		newTestData[i] = [];
		for( var j=0; j<vars.length; j++ ) {
			newTestData[i][j] = vars[j] + bias;
		}
	}
	return newTestData;
}
var testDataBase = function(mael, controller, chamber, mode, state, bias, baseData) {
	var datapoints = generateTestData(baseData, bias);
	var jsonTempl = getTestTemplate(controller, chamber, mode, state)
	for( var i=0; i<datapoints.length; i++ ) {
		var fnc = function(y) {
			return function() {
				var datavals = datapoints[y];
				jsonTempl.payload.controllers[0].chambers[0].variables.sp = datavals[0];
				jsonTempl.payload.controllers[0].chambers[0].variables.pv = datavals[1];
				jsonTempl.payload.controllers[0].chambers[0].variables.sp2 = datavals[2];
				jsonTempl.payload.controllers[0].chambers[0].variables.pv2 = datavals[3];
				mael.postMessage( 'data', jsonTempl );
			}
		}(i);
		var t = window.setTimeout( fnc, i*1200);
	}
}
