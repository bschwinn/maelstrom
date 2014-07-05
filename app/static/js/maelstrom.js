/**********************************************
 *********** Main Maelstrom Library ***********
 **********************************************/


// maelstrom socket connection and pub/sub
var Maelstrom = function(config) {
	if ( arguments.length > 0 ) this.init(config);
};
Maelstrom.prototype = {
	init: function(config) {
		this.config = config;
		this.socketUrl = ( (window.location.protocol.indexOf('https') > -1) ? 'wss:' : 'ws:') + '//' + window.location.host + '/socket';
		this.sendUrl = '/publish';
		this.heartBeatTime = 10000;
		this.heartBeatSkips = 0;
		this.heartBeatMaxSkips = 2;
		this.heartBeatCheckTimer = null;
		this.heartBeatPingTimer = null;
		this.handlers = { 'open' : [], 'closed' : [], 'message' : [], '_appsettings' : [], '_profiles' : [], '_iocontrollers' : [] };
		this.connected = false;
		this.connect();
	},
	connect: function(channel) {
		this.logMessage("Connecting to maelstrom server...");
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
	addHandler: function(evt, callback) {
		if ( /open|closed|message|_appsettings|_profiles|_iocontrollers/.test(evt) ) {
			this.handlers[evt].push(callback);
		} else {
			this.logMessage("Unsupported handler: " + evt);
		}
	},

	// internal stuff
	fireHandler: function(evt, data) {
		if ( this.handlers[evt].length > 0 ) {
			for(var i=0; i < this.handlers[evt].length; i++) {
				this.handlers[evt][i].call(this, data);
			}
		}
	},
	createHeartBeatChecker: function() {
		var that = this;
		this.heartBeatCheckTimer = window.setTimeout( function() {
			that.logMessage("heartbeat missed ! #" + that.heartBeatSkips);
			if ( that.heartBeatSkips >= (that.heartBeatMaxSkips-1) ) {
				that.logMessage("heartbeat missed max times !!!! #" + that.heartBeatSkips);
				this.fireHandler('closed', { status: 'disconnected', statusMsg: 'Maelstrom client disconnected from server.' } );
			} else {
				that.createHeartBeatChecker();
				that.heartBeatSkips++;
			}
		}, this.heartBeatTime );
	},
	resetHeartBeatTimer: function() {
		var that = this;
		this.heartBeatSkips = 0;
		// reset checker
		window.clearTimeout(this.heartBeatCheckTimer);
		// delay next check
		this.heartBeatPingTimer = window.setTimeout(function() {
			that.sendHeartBeatPing();
			that.createHeartBeatChecker();
		}, this.heartBeatTime);
	},
	sendHeartBeatPing: function() {
		try {
			this.ws.send( '{ "action": "ping", "channel": "_heartbeat" }' );
		} catch(err) {
			this.logMessage("Error sending heartbeat, we must be disconnected.");
			this.fireHandler('closed', { status: 'disconnected', statusMsg: 'Maelstrom client disconnected from server.' } );
		}
	},
	onOpen: function() {
		var that = this;
		this.heartBeatPingTimer = window.setTimeout(function() {
			that.sendHeartBeatPing();
			that.createHeartBeatChecker();
		}, this.heartBeatTime);
		this.logMessage("Maelstrom client connected");
		this.fireHandler('open', { status: 'connected', statusMsg: 'Maelstrom client connected to server.' } );
	},
	onClose: function() {
		window.clearTimeout(this.heartBeatCheckTimer);
		window.clearTimeout(this.heartBeatPingTimer);
		this.logMessage("Maelstrom client disconnected");
		this.fireHandler('closed', { status: 'disconnected', statusMsg: 'Maelstrom client disconnected from server.' } );
	},
	onMessage: function(event) {
		var env = JSON.parse(event.data);
		var msg = JSON.parse(env.data);
		if ( env.channel == "_heartbeat" ) {
			this.resetHeartBeatTimer();
			this.logMessage("Heartbeat OK");
		} else if ( env.channel.split('')[0] == "_" ) { // internal channels start with "_"
			this.logMessage(env.data + ' (' + env.channel + ')');
			this.fireHandler(env.channel, { channel: env.channel, message: msg.payload } );
		} else {
			this.logMessage(env.data + ' (' + env.channel + ')');
			this.fireHandler('message', { channel: env.channel, message: msg.payload } );
		}
	},
	logMessage: function(msg) {
		console.log(msg);
	}
};

// maelstrom application settings api
var MaelstromAppSettings = function(mael, loadedHandler, changeHandler) {
	if ( arguments.length > 0 ) this.init(mael, loadedHandler, changeHandler);
}
MaelstromAppSettings.prototype = {
	url: '/appsettings',
	localKeyPrefix: 'maelstromAppSettings-',
	changeHandler: null,
	loadedHandler: null,
	init: function(mael, loadedHandler, changeHandler) {
		this.loadedHandler = loadedHandler;
		this.changeHandler = changeHandler;
		mael.subscribe('_appsettings');
		mael.addHandler('_appsettings', function(data) {
			changeHandler.call( this, { eventType: data.message.eventType, settings: data.message.settings } );
		});
		this.getSettings();
	},
	getSettings: function() {
		var that = this;
		$.get(this.url, function(data) {
			if ( that.loadedHandler != null) that.loadedHandler.call(that, { settings: data } );
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
	}
};

// maelstrom profile configuration
var MaelstromProfileSettings = function(mael, loadedHandler, changeHandler) {
	if ( arguments.length > 0 ) this.init(mael, loadedHandler, changeHandler);
}
MaelstromProfileSettings.prototype = {
	changeHandler: null,
	loadedHandler: null,
	init: function(mael, loadedHandler, changeHandler) {
		this.urlProfiles = '/profiles';
		this.urlProfile = '/profile';
		this.loadedHandler = loadedHandler;
		this.changeHandler = changeHandler;
		mael.subscribe('_profiles');
		mael.addHandler('_profiles', function(data) {
			var p, msg = data.message;
			console.log("Profile change: " + msg.eventType);
			if (msg.eventType != "delete") {
				p = { eventType: msg.eventType, profileId: msg.profile.id, profile: msg.profile };
			} else {
				p = { eventType: msg.eventType, profileId: msg.profileId };
			}
			changeHandler.call( this, p );
		});
		this.getProfiles();
	},
	getProfiles: function(handler) {
		var that = this;
		$.get(this.urlProfiles, function(data) {
			var profs = data.profiles;
			if ( typeof(handler) !== 'undefined' ) {
				handler(profs);
			} else {
				if ( that.loadedHandler != null) that.loadedHandler.call(that, { profiles: profs } );
			}
		});
	},
	getProfile: function(profileId, handler) {
		var that = this;
		$.get(this.urlProfile+'/'+profileId, function(data) {
			var prof = data.profile;
			if ( typeof(handler) !== 'undefined' ) {
				handler(prof);
			}
		});
	},
	createProfile: function(name, theType, temperatures, events, successHandler, failureHandler) {
		$.ajax({
			url: this.urlProfiles,
			type: "post", 
			data: { 'profile': JSON.stringify( { "name" : name, "type": theType, "temperatures": temperatures, "events": events } ) }, 
			success: function(data) {
				console.log("Profile: " + name + ", has been created.");
				if ( typeof(successHandler) !== 'undefined' ) {
					successHandler(data);
				}
			},
            error: function(xhr, ajaxOptions, thrownError) {
				console.log("Profile: " + name + ", FAILED TO CREATE !!");
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
			data: { 'profile': JSON.stringify( { "id" : id, "name" : name, "type": theType, "temperatures": temperatures, "events": events } ) }, 
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


// maelstrom controller configuration
var MaelstromControllerSettings = function(mael, loadedHandler, changeHandler) {
	if ( arguments.length > 0 ) this.init(mael, loadedHandler, changeHandler);
}
MaelstromControllerSettings.prototype = {
	changeHandler: null,
	loadedHandler: null,
	init: function(mael, loadedHandler, changeHandler) {
		this.urlControllers = '/iocontrollers';
		this.urlController = '/iocontroller';
		this.loadedHandler = loadedHandler;
		this.changeHandler = changeHandler;
		mael.subscribe('_iocontrollers');
		mael.addHandler('_iocontrollers', function(data) {
			var p, msg = data.message;
			console.log("Controller change: " + msg.eventType);
			if (msg.eventType != "delete") {
				p = { eventType: msg.eventType, controllerId: msg.controller.id, controller: msg.controller };
			} else {
				p = { eventType: msg.eventType, controllerId: msg.controllerId };
			}
			changeHandler.call( this, p );
		});
		this.getControllers();
	},
	getControllers: function(handler) {
		var that = this;
		$.get(this.urlControllers, function(data) {
			var profs = data.controllers;
			if ( typeof(handler) !== 'undefined' ) {
				handler(profs);
			} else {
				if ( that.loadedHandler != null) that.loadedHandler.call(that, { controllers: profs } );
			}
		});
	},
	getController: function(controllerId, handler) {
		var that = this;
		$.get(this.urlController+'/'+controllerId, function(data) {
			var prof = data.controller;
			if ( typeof(handler) !== 'undefined' ) {
				handler(prof);
			}
		});
	},
	createController: function(name, address, port, socket, successHandler, failureHandler) {
		$.ajax({
			url: this.urlControllers,
			type: "post", 
			data: { 'iocontroller': JSON.stringify( { "name" : name, "address": address, "port": port, "socket": socket } ) }, 
			success: function(data) {
				console.log("Controller: " + name + ", has been created.");
				if ( typeof(successHandler) !== 'undefined' ) {
					successHandler(data);
				}
			},
            error: function(xhr, ajaxOptions, thrownError) {
				console.log("Controller: " + name + ", FAILED TO CREATE !!");
				if ( typeof(failureHandler) !== 'undefined' ) {
					failureHandler(thrownError);
				}
			}
		});
	},
	updateController: function(id, name, address, port, socket, successHandler, failureHandler) {
		$.ajax({
			url: this.urlController+'/'+id, 
			type: "post", 
			data: { 'iocontroller': JSON.stringify( { "id" : id, "name" : name, "address": address, "port": port, "socket": socket } ) }, 
			success: function(data) {
				console.log("Controller: " + name + ", has been updated.");
				if ( typeof(successHandler) !== 'undefined' ) {
					successHandler(data);
				}
			},
            error: function(xhr, ajaxOptions, thrownError) {
				console.log("Controller: " + name + ", FAILED TO UPDATE !!");
				if ( typeof(failureHandler) !== 'undefined' ) {
					failureHandler(thrownError);
				}
			}
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
	}
};

