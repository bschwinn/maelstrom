/**********************************************
 *********** Main Maelstrom Library ***********
 **********************************************/

_maelGetRootUrl = function() {
	return window.location.protocol + '//' + window.location.host;
}
_maelGetRootUrlWS = function() {
	var isSecure = ( window.location.protocol.indexOf('https') > -1 );
	return ((isSecure) ? 'wss:' : 'ws:') + '//' + window.location.host;
}

// maelstrom socket connection and pub/sub
var Maelstrom = function(config) {
	if ( arguments.length > 0 ) this.init(config);
};
Maelstrom.prototype = {
	init: function(config) {
		this.config = config;
		// this.socketUrl = 'ws://localhost:8888/socket';
		// this.sendUrl = 'http://localhost:8888/publish';
		this.socketUrl = _maelGetRootUrlWS() + '/socket';
		this.sendUrl = _maelGetRootUrl() + '/publish';
		this.channels = [ 'data', 'logs', 'alarms' ];
		this.connect();
	},
	connect: function(channel) {
		var that = this;
		this.ws = new WebSocket(this.socketUrl);
	    this.ws.onmessage = function(event) {
			that.onMessage(event);
	    };
	    this.ws.onopen = function() {
			that.onOpen();
	    };
	    this.ws.onclose = function() {
			that.onClose();
	    };
	},
	subscribe: function(channel) {
		this.ws.send( '{ "action": "subscribe", "channel": "' + channel + '" }' );
	},
	unsubscribe: function(channel) {
		this.ws.send( '{ "action": "unsubscribe", "channel": "' + channel + '" }' );
	},
	postMessage: function(channel, message) {
		var postData = {data: JSON.stringify(message), channel: channel};
		$.post(this.sendUrl, postData, function(){});
	},
	onOpen: function() {
		this.logMessage("Maelstrom client connected");
		$(document).trigger( 'maelstromConnected', { status: 'connected', statusMsg: 'Maelstrom client connected to server.' } );
	},
	onClose: function() {
		this.logMessage("Maelstrom client disconnected");
		$(document).trigger( 'maelstromDisconnected', { status: 'disconnected', statusMsg: 'Maelstrom client disconnected from server.' } );
	},
	onMessage: function(event) {
		var env = $.parseJSON(event.data);
		var msg = $.parseJSON(env.data);
		$(document).trigger( 'maelstromChannelMessage-' + env.channel, msg );
		this.logMessage(env.data + ' (' + env.channel + ')');
	},
	logMessage: function(msg) {
		if ( this.config.debugEnabled === true && this.config.debugDivId != '' ) {
		    $('#' + this.config.debugDivId).append('<div>' + msg + '</div>');
		}
	}
};

// maelstrom application settings api
var MaelstromAppSettings = function(mael) {
	if ( arguments.length > 0 ) this.init(mael);
}
MaelstromAppSettings.prototype = {
	url: _maelGetRootUrl() + '/appsettings',
	localKeyPrefix: 'maelstromAppSettings-',
	init: function(mael) {
		mael.subscribe('_appsettings');
		$(document).bind( 'maelstromChannelMessage-_appsettings', function(ev, message) {
			console.log("app settings: " + message.payload.eventType);
			var p = { eventType: message.payload.eventType, settings: message.payload.settings };
			$(document).trigger( 'maelstromAppSettingChange', p );
		});
	},
	getSettings: function() {
		var that = this;
		$.get(this.url, function(data) {
			$(document).trigger( 'maelstromAppSettingsLoaded', { settings: $.parseJSON(data) } );
		});
	},
	saveSetting: function(name, val) {
		$.post(this.url, { name: name, "value": val }, function(data) {
			console.log("Setting: " + name + ", has been saved.");
		});
	},
	saveSettings: function(settings) {
		$.post(this.url, { settings: JSON.stringify(settings) }, function(data) {
			console.log("Settings has been saved.");
		});
	},
	getLocalSettings: function() {
		var settings = {};
		for(var i = 0; i < localStorage.length; i++) {
		    var k = localStorage.key(i);
		    if ( k.indexOf(this.localKeyPrefix) == 0 ) {
		    	var newK = k.substring(this.localKeyPrefix.length);
		    	settings[newK] = localStorage.getItem(k);
		    }
		}
		return settings;
	},
	saveLocalSetting: function(name, val) {
		localStorage.setItem('maelstromAppSettings-' + name, val);
	}
};

// maelstrom io/device configuration
var MaelstromIOSettings = function(mael) {
	if ( arguments.length > 0 ) this.init(mael);
}
MaelstromIOSettings.prototype = {
	urlControllers: _maelGetRootUrl() + '/iocontrollers',
	urlController: _maelGetRootUrl() + '/iocontroller',
	urlChambers: _maelGetRootUrl() + '/iochambers',
	urlChamber: _maelGetRootUrl() + '/iochamber',
	urlDevices: _maelGetRootUrl() + '/iodevices',
	urlDevice: _maelGetRootUrl() + '/iodevice',
	init: function(mael) {
		mael.subscribe('_iocontrollers');
		mael.subscribe('_iochambers');
		mael.subscribe('_iodevices');
		$(document).bind( 'maelstromChannelMessage-_iocontrollers', function(ev, message) {
			console.log("io controller change: " + message.payload.eventType);
			var p;
			if (message.payload.eventType != "delete") {
				p = { eventType: message.payload.eventType, controllerId: message.payload.controller.id, controller: message.payload.controller };
			} else {
				p = { eventType: message.payload.eventType, controllerId: message.payload.controllerId };
			}
			$(document).trigger( 'maelstromIOControllerChange', p );
		});
		$(document).bind( 'maelstromChannelMessage-_iochambers', function(ev, message) {
			console.log("io chamber change: " + message.payload.eventType);
			var p;
			if (message.payload.eventType != "delete") {
				p = { eventType: message.payload.eventType, controllerId: message.payload.chamber.controllerId, chamberId: message.payload.chamber.id, chamber: message.payload.chamber };
			} else {
				p = { eventType: message.payload.eventType, controllerId: message.payload.controllerId, chamberId: message.payload.chamberId };
			}
			$(document).trigger( 'maelstromIOChamberChange', p );
		});
		$(document).bind( 'maelstromChannelMessage-_iodevices', function(ev, message) {
			console.log("io device change: " + message.payload.eventType);
		});
	},
	getControllers: function(handler) {
		var that = this;
		$.get(this.urlControllers, function(data) {
			if ( typeof(handler) !== 'undefined' ) {
				handler($.parseJSON(data));
			} else {
				$(document).trigger( 'maelstromIOControllersLoaded', { controllers: $.parseJSON(data) } );
			}
		});
	},
	getController: function(id) {
		var that = this;
		$.get(this.urlController+'/'+id, function(data) {
			$(document).trigger( 'maelstromIOControllerLoaded', { controller: $.parseJSON(data) } );
		});
	},
	deleteController: function(controllerId) {
		$.ajax({
			url: this.urlController+'/'+controllerId, 
			type: "delete", 
			success: function(data) {
				console.log("Controller: " + controllerId + ", has been deleted.");
			}
		});
	},
	createController: function(name, address, port) {
		$.ajax({
			url: this.urlControllers,
			type: "post", 
			data: { name: name, address: address, port: port },
			success: function(data) {
				console.log("Controller: " + name + ", has been created.");
			}
		});
	},
	updateController: function(id, name, address, port, socket) {
		$.ajax({
			url: this.urlController+'/'+id, 
			type: "post", 
			data: { name: name, address: address, port: port, socket: socket },
			success: function(data) {
				console.log("Controller: " + name + ", has been updated.");
			}
		});
	},
	createChamber: function(controllerid, name) {
		$.ajax({
			url: this.urlChambers+'/'+controllerid,
			type: "post", 
			data: { name: name },
			success: function(data) {
				console.log("Chamber: " + name + ", has been created on controller id: " + controllerid);
			}
		});
	},
	updateChamber: function(chamberid, name) {
		$.ajax({
			url: this.urlChamber+'/'+chamberid,
			type: "post", 
			data: { name: name },
			success: function(data) {
				console.log("Chamber: " + name + ", has been updated." );
			}
		});
	},
	deleteChamber: function(chamberid) {
		$.ajax({
			url: this.urlChamber+'/'+chamberid,
			type: "delete", 
			success: function(data) {
				console.log("Chamber: " + chamberid + ", has been deleted." );
			}
		});
	},
	createDevice: function(chamberid, name, slot, func, devicetype, hardwaretype) {
		$.ajax({
			url: this.urlDevices+'/'+chamberid,
			type: "put", 
			data: { name: name, slot:slot, "function": func, devicetype:devicetype, hardwaretype:hardwaretype },
			success: function(data) {
				console.log("Device: " + name + ", has been created on chamber id: " + chamberid);
			}
		});
	},
	updateDevice: function(deviceid, name, slot, func, devicetype, hardwaretype) {
		$.ajax({
			url: this.urlDevice+'/'+deviceid,
			type: "post", 
			data: { name: name, slot:slot, "function": func, devicetype:devicetype, hardwaretype:hardwaretype },
			success: function(data) {
				console.log("Device: " + name + ", has been updated." );
			}
		});
	},
	deleteDevice: function(deviceid) {
		$.ajax({
			url: this.urlDevice+'/'+deviceid,
			type: "delete", 
			success: function(data) {
				console.log("Device: " + deviceid + ", has been deleted." );
			}
		});
	}
};
// maelstrom io/device configuration
var MaelstromProfileSettings = function(mael) {
	if ( arguments.length > 0 ) this.init(mael);
}
MaelstromProfileSettings.prototype = {
	init: function(mael) {
		this.urlProfiles = _maelGetRootUrl() + '/profiles';
		this.urlProfile = _maelGetRootUrl() + '/profile';
		mael.subscribe('_profiles');
		$(document).bind( 'maelstromChannelMessage-_profiles', function(ev, message) {
			console.log("Profile change: " + message.payload.eventType);
			var p;
			if (message.payload.eventType != "delete") {
				p = { eventType: message.payload.eventType, profileId: message.payload.profile.id, profile: message.payload.profile };
			} else {
				p = { eventType: message.payload.eventType, profileId: message.payload.profileId };
			}
			$(document).trigger( 'maelstromProfileChange', p );
		});
	},
	getProfiles: function(handler) {
		var that = this;
		$.get(this.urlProfiles, function(data) {
			var profs = $.parseJSON(data);
			if ( typeof(handler) !== 'undefined' ) {
				handler(profs);
			} else {
				$(document).trigger( 'maelstromProfilesLoaded', { profiles: profs } );
			}
		});
	},
	getProfile: function(profileId, handler) {
		var that = this;
		$.get(this.urlProfile+'/'+profileId, function(data) {
			var prof = $.parseJSON(data);
			if ( typeof(handler) !== 'undefined' ) {
				handler(prof);
			} else {
				$(document).trigger( 'maelstromProfileLoaded', { profile: prof } );
			}
		});
	},
	createProfile: function(name, theType, temperatures, events, successHandler, failureHandler) {
		$.ajax({
			url: this.urlProfiles,
			type: "post", 
			data: { name: name, "type": theType, temperatures: JSON.stringify(temperatures), events: JSON.stringify(events) },
			success: function(data) {
				console.log("Profile: " + name + ", has been updated.");
				if ( typeof(successHandler) !== 'undefined' ) {
					successHandler(data);
				}
			},
            error: function(xhr, ajaxOptions, thrownError) {
				console.log("Profile: " + name + ", FAILED TO UPDATE !!");
				if ( typeof(failureHandler) !== 'undefined' ) {
					failureHandler(thrownError);
				}
			}
		});
	},
	updateProfile: function(id, name, theType, temperatures, events, successHandler, failureHandler) {
		$.ajax({
			url: this.urlProfile+'/'+id, 
			type: "post", 
			data: { name: name, "type": theType, temperatures: JSON.stringify(temperatures), events: JSON.stringify(events) },
			success: function(data) {
				console.log("Profile: " + name + ", has been updated.");
				if ( typeof(successHandler) !== 'undefined' ) {
					successHandler(data);
				}
			},
            error: function(xhr, ajaxOptions, thrownError) {
				console.log("Profile: " + name + ", FAILED TO UPDATE !!");
				if ( typeof(failureHandler) !== 'undefined' ) {
					failureHandler(thrownError);
				}
			}
		});
	},
	deleteProfile: function(profileId) {
		$.ajax({
			url: this.urlProfile+'/'+profileId, 
			type: "delete", 
			success: function(data) {
				console.log("Profile: " + profileId + ", has been deleted.");
			}
		});
	}
};

