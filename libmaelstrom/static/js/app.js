/************  Main application level javascript *************/

window.dateTimeFormat = 'yy-mm-dd';
window.dateTimeFormatDisplay = 'mm/dd/yy';
window.tempFormat = 'F';

var mael = null; // maelstrom connection manager
var setman = null, ioman = null, profman = null; // settings API managers
var pot1 = null, pot2 = null, pot3 = null; // pots in brewery
var carboy1 = null, carboy2 = null; // carboy (lager) ferms in chamber 1
var conical1 = null, conical2 = null; // conical (ale) ferms in chamber 2


// global -  profile table context menu global click handlers
function profTableContextMenuHandler(shown) {
    "use strict";
    if (shown) {
        $('html').bind('click', profTableGlobalClickHandler );
    } else {
        $('html').unbind('click', profTableGlobalClickHandler );
    }
}
function profTableGlobalClickHandler() {
    "use strict";
    profileEdit.closeContextMenu();
}


$(document).ready(function () {

	// setup our connection, API interfaces and vessel widgets
	mael = new Maelstrom( { debugEnabled: true, debugDivId : 'debugger' } );

    profileEdit = new TemperatureProfileTable('profileEditDiv', {
        editable: true, startDateFieldSelector: '#addProfile_startdate',
        tableClass: "profileTableEdit ui-widget", theadClass: "ui-widget-header", tbodyClass: "ui-widget-content",
        dateFormat: window.dateTimeFormat, dateFormatDisplay: window.dateTimeFormatDisplay,
        contextMenuCssClass: 'profileTableMenu', contextMenuDisplayHandler: profTableContextMenuHandler,
        chartUpdateCallBack: profileEditDrawChart
    });

    profileTable = new TemperatureProfileTable('profileTable', { startDateFieldSelector: '#profileStartDate',
        tableClass: "profileTableEdit ui-widget", theadClass: "ui-widget-header", tbodyClass: "ui-widget-content",
        dateFormat: window.dateTimeFormat, dateFormatDisplay: window.dateTimeFormatDisplay
    });

	pot1 = new BeerVessel('pot1', 'BK-1', {width: 270, height: 400, vesselStyle: BeerVessel.POT, hideValues: true} );
	pot2 = new BeerVessel('pot2', 'MT-1', {width: 270, height: 400, vesselStyle: BeerVessel.POT} );
	pot3 = new BeerVessel('pot3', 'LT-1', {width: 270, height: 400, vesselStyle: BeerVessel.POT} );

	conical1 = new BeerVessel('conical1', 'FV-1', {width: 270, height: 400, vesselStyle: BeerVessel.CONICAL} );
	conical2 = new BeerVessel('conical2', 'FV-2', {width: 270, height: 400, vesselStyle: BeerVessel.CONICAL} );

	carboy1 = new BeerVessel('carboy1', 'FV-3', {width: 270, height: 400, vesselStyle: BeerVessel.CARBOY} );
	carboy2 = new BeerVessel('carboy2', 'FV-4', {width: 270, height: 400, vesselStyle: BeerVessel.CARBOY} );


	// the main tabs for each "house"
	//  - manages subscription to logs channel for efficiency
	var lastTab = new MaelstromAppSettings().getLocalSettings()['mainTab']; // lets cheat here
	$('#mainTabs').tabs( {
		active:lastTab,
		activate: function( event, ui ) {
			var newIndex = ui.newTab.parent().children().index(ui.newTab);
			setman.saveLocalSetting('mainTab', newIndex);
		}
	});


	// ****  bind handlers to maelstrom events  ****


	// listen for connected/disconnected events here
	$(document).bind( 'maelstromConnected', function (ev, data) { 
		$('#connStatusLight').removeClass('disconnected').addClass('connected');
		$('#connStatusMessage').text('Connected to Server');
		$('#reconnect').hide();
		if ( setman == null ) {
			setman = new MaelstromAppSettings( mael );
			setman.getSettings();
			ioman = new MaelstromIOSettings( mael );
			ioman.getControllers();
			profman = new MaelstromProfileSettings( mael );
			profman.getProfiles();
		} else {
			// this is a reconnect, re-init the managers 
			// to re-subscribe them to their event channels
			setman.init(mael);
			ioman.init(mael);
			profman.init(mael);
		}
		$(['alarms', 'data', 'logs', 'lcd']).each(function(idx, key) {
			mael.subscribe(key);
		});
	});
	$(document).bind( 'maelstromDisconnected', function (ev, data) { 
		$('#connStatusLight').removeClass('connected').addClass('disconnected');
		$('#connStatusMessage').text('Disconnected from Server');
		$('#reconnect').removeAttr('disabled').show();
	});
	// listen for messages on the "data" channel here
	$(document).bind( 'maelstromChannelMessage-data', function (ev, message) {
		// TODO - handle data channel stuff
	});
	// listen for messages on the "data" channel here
	$(document).bind( 'maelstromChannelMessage-lcd', function (ev, message) {
		// TODO - this needs to be done more intelligently
		lcdFormatPayload(message.payload);
	});
	// listen for messages on the "alarms" channel here
	$(document).bind( 'maelstromChannelMessage-alarms', function (ev, message) {
		alarmsProcessData(message.payload);
	});
	// listen for messages on the "logs" channel here
	$(document).bind( 'maelstromChannelMessage-logs', function (ev, message) { 
		logsProcessData(message.payload);
	});

	$(document).bind( 'maelstromProfileChange', function (ev, payload) {
		console.log("maelstromProfileChange: " + payload.profileId + ", data-profileId: " + $('#profileDetails').data('profileId'));
		profman.getProfiles();
		if ( (payload.eventType == "delete") && ( payload.profileId == $('#profileDetails').data('profileId')) ) {
			profileNotSelected();
		} else if ( (payload.eventType != "delete") && ( payload.profileId == $('#profileDetails').data('profileId')) ){
			profman.getProfile(payload.profileId);
		}
	});
	// listen for "Profiles Loaded" event and draw the list
	$(document).bind( 'maelstromProfilesLoaded', function(ev, data) {
		profileRenderList(data.profiles);
	});
	// listen for "Profile Loaded" event and draw the profile
	$(document).bind( 'maelstromProfileLoaded', function(ev, data) {
		var profile = data.profile;
		$('#profileTitle').text('Profile: ' + profile.name);
        profileTable.render(profile);
	    $("#profileChart").html("<span class='chart-loading chart-placeholder'>Redrawing profile...</span>");
	    TemperatureProfileChart.drawChart("profileChart", profileTable );
	});

	// listen for controller changes (from other windows/devices) and reload list and currently displayed
	$(document).bind( 'maelstromIOControllerChange', function (ev, payload) {
		console.log("maelstromIOControllerChange - id: " + payload.controllerId);
		ioman.getControllers();
		if ( (payload.eventType != "delete") && (payload.controllerId == $('#addChamber_button').data('controllerId')) ) {
			ioman.getController(payload.controller.id);
		} else if ( (payload.eventType == "delete") && (payload.controllerId == $('#addChamber_button').data('controllerId')) ) {
			deviceConfigChamberNotSelected("Selected controller deleted at another terminal, Click a Controller on the left.")
		}
	});
	// listen for chamber changes (from other windows/devices) and reload chamber's controller if displayed
	$(document).bind( 'maelstromIOChamberChange', function (ev, payload) {
		console.log("maelstromIOChamberChange: " + payload.chamberId);
		if ( payload.controllerId == $('#addChamber_button').data('controllerId') ) {
			ioman.getController(payload.controllerId);
		}
	});
	// listen for device changes (from other windows/devices)
	$(document).bind( 'maelstromIODeviceChange', function (ev, payload) {
		console.log("maelstromIODeviceChange: " + payload.deviceId);
		// TODO - handle device changes
	});

	// listen for device changes (from other windows/devices)
	$(document).bind( 'maelstromAppSettingChange', function (ev, payload) {
		console.log("maelstromAppSettingChange: reloading settings.");
		setman.getSettings();
	});
	// listen for "AppSettings Loaded" event
	$(document).bind( 'maelstromAppSettingsLoaded', function(ev, data) {
		$(data.settings).each(function(idx,setting) {
			switch(setting.name) {
				case "breweryLogo" :
					$('#breweryLogo').attr('src', setting.value);
					$('#appsettings_logo').val(setting.value);
					break;
				case "themeStylesheet" :
					changeAppTheme(setting.value);
					$('#appsettings_theme').val(setting.value);
					break;
				case "themeSelectedStyle" :
					changeSelectedStyle(setting.value);
					$('#appsettings_selectedcss').val(setting.value);
					break;
			}
		})
	});
	// listen for "IO Controllers Loaded" event and draw the list
	$(document).bind( 'maelstromIOControllersLoaded', function(ev, data) {
		deviceConfigRenderControllerList(data.controllers);
	});
	
	// listen for "IO Controller Loaded" event and draw the controller
	$(document).bind( 'maelstromIOControllerLoaded', function(ev, data) {
		deviceConfigRenderChamberList(data.controller.id, data.controller.chambers);
	});


	// alarm ack button in header
	$('#alarmsAck').button().click(function() {
		alarmsPublishAcknowledge();
	});
	// alarm ack button in header
	$('#reconnect').button().click(function() {
		$('#connStatusMessage').text('Reconnecting to server...');
		$('#reconnect').attr('disabled', 'disabled');
		mael.connect();
	});
	// add controller button
	$('#addController_button').button().click(function() {
		deviceConfigAddController();
	});
	// show logger button
	$('#showDeviceLogger').button().click(function() {
		$('#logsDiv').dialog( {height: 500, width:700} );
	});
	// appsettings nav
	$('#appsettingslist').selectable({
	    stop: function(event, ui) {
	        $(".ui-selected:first", this).each(function() {
			    $(this).siblings().removeClass("ui-selected");
				$('#appsettingsMain').addClass('ui-selected');
			    var gid = $(this).data('groupid');
			    $('#'+gid).addClass('selected').siblings().removeClass('selected');
	        });
	    }
	});
	$('#appsettingsMain').addClass('ui-selected');
	$('#' + $('#appsettingslist').children().first().data('groupid') ).addClass('selected');
	$('#appsettingslist').children().first().addClass('ui-selected');
	// add chamber button
	$('#addChamber_button').button().click(function() {
		deviceConfigAddChamber( $(this).data('controllerId') );
	});
	// add profile button
	$('#addProfile_button').button().click(function() {
		profileAddProfile();
	});
    $("#addProfile_startdate").datetimepicker({ dateFormat: window.dateTimeFormatDisplay, timeFormat: "HH:mm:ss", onSelect: function() {
        profileEdit.updateDisplay();
    }});

    $("#saveSettings_lookfeel").button().click(function() {
		var settings = [];
		settings[0] = { name: 'breweryLogo', value : $('#appsettings_logo').val() }
		settings[1] = { name: 'themeStylesheet', value : $('#appsettings_theme').val() }
		settings[2] = { name: 'themeSelectedStyle', value: $('#appsettings_selectedcss').val() }
		setman.saveSettings(settings);
    });

	// binds all test handlers to button clicks, etc.
	setupTestingStuff();

	// debugger - publish a message on a channel
	$('#postThisBtn').click(function() {
		mael.postMessage($('#postThisChan').val(), $('#postThisMsg').val());
		$('#postThisMsg').val('');
	});

});


// stuff for LCD channel and widget
function changeAppTheme(newTheme){
	$('#themeStylesheet').attr('href', "//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/" + newTheme + "/jquery-ui.min.css");
}
function changeSelectedStyle(newStyle) {
	$('#themeSelectedStyle').remove();
	var steez = $('<style>.ui-selected { ' + newStyle + ' }</style>').attr('id', 'themeSelectedStyle');
	$('head').append(steez);
}

// stuff for LCD channel and widget
// function lcdFormatFloat(num){
// 	return parseFloat(num).toFixed(1);
// }
// function lcdFormatPayload(payload) {
// 	var chamb = payload.controllers[0].chambers[0];
// 	var html = '';
// 	var spacer = '   ';
// 	var sp = lcdFormatFloat(chamb.variables.sp) + '';
// 	if ( sp.indexOf('.') > 2 ) spacer = '  ';
// 	html += '<div>' + chamb.name + '</div>';
// 	html += '<div>Mode: ' + chamb.mode + '</div>';
// 	html += '<div>SP: ' + spacer + sp + spacer + '  PV:  ' + lcdFormatFloat(chamb.variables.pv) + '</div>';
// 	html += '<div>SP2:' + spacer + lcdFormatFloat(chamb.variables.sp2) + spacer + '  PV2: ' + lcdFormatFloat(chamb.variables.pv2) + '</div>';
// 	html += '<div>' + chamb.state + ' for ' + chamb.time + '</div>';
// 	$('#lcdDiv').html(html);
// }
function lcdFormatPayload(payload) {
	var lcd = payload.lcd;
	var html = lcd.join('<br/>');
	$('#lcdDiv').html(html);
}


// stuff for Alarms channel and widgets
function alarmsProcessData(payload) {
	$(payload.alarms).each(function(idx,val) {
		$('#alarmsDiv').append('<div>' + val.msg + '(' + val.source + ')</div>')
	});
	if ( payload.acknowledge === true ) {
		$('#alarmsDiv').append('<div>ALARM ACKNOWLEDGEMENT</div>')
		alarmsAcknowledge();
	} else {
		alarmsAnnunciate();
	}
	$('#alarmsDiv').scrollTop(999999);
}
function alarmsPublishAcknowledge(payload) {
	var ackMessage = {
		channel: "alarms",
		payload: { acknowledge: true }
	};
	mael.postMessage('alarms', ackMessage );
}
function alarmsAnnunciate(){
	$('#alarmsDiv').addClass('alarm');
	$('#alarmsAck').addClass('alarm');
}
function alarmsAcknowledge(){
	$('#alarmsAck').removeClass('alarm');
	$('#alarmsDiv').removeClass('alarm');
}

// stuff for logs channel and logger widget
function logsProcessData(payload) {
	$(payload.entries).each(function(idx,val) {
		$('#logsDiv').append('<div>' + new Date() + ' - ' + val.msg + '(' + val.source + ')</div>')
	});
	$('#logsDiv').scrollTop(999999);
}


// ***** stuff for device configuration *****


// render profiless
function profileRenderList(profiles) {
	$('#profilelist').empty();
	$(profiles).each(function( idx, profile ) {
		var li = $('<li></li>').attr('id', 'profile_' + profile.id).data('profileId', profile.id);
		li.append(profileCreateProfileDelete(profile));
		li.append(profileCreateProfileEdit(profile));
		var title = $('<a href="#"></a>').addClass('title').text(profile.name);
		li.append(title);
		$('#profilelist').append(li);
	});
    $('#profilelist').selectable({
        stop: function(event, ui) {
            $(".ui-selected:first", this).each(function() {
				profileSelected(this);
            });
        }
    });
    // re-select if profile details has an id
    var profId = $('#profileDetails').data('profileId');
    if ( profId != null && profId != '' ) {
		$('#profile_' + profId).addClass('ui-selected');
    }

}
function profileCreateProfileDelete(profile) {
	var deleter = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-trash' },text: false}
	).click(function() {
		var profileId = $(this).parent().data('profileId');
		$('#profileToDelete').text(profile.name);
		$('#profileDelete').dialog({
	        modal: true,
	        title: "Delete Profile !?!",
	        buttons: [
	            {
	                text: "Delete",
	                click: function() {
						profman.deleteProfile(profileId);
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return deleter;
}
function profileCreateProfileEdit(profile) {
	var editer = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-wrench' },text: false}
	).click(function() {
		var profileId = $(this).parent().data('profileId');
		profileSelected(document.getElementById('profile_' + profileId));
		$('#addProfile_name').val(profile.name);
		$('#addProfile_type').val(profile['type']);
		profman.getProfile(profile.id, function(profile) {
	        profileEdit.render( profile );
	        showProfileEditDialog(profile.id, "Edit Temperature Profile");
		});
	});
	return editer;
}
// draw a chart in the profile edit window - called on table update
function profileEditDrawChart() {
    $("#profileEditChartDiv").html("<span class='chart-loading chart-placeholder'>Redrawing profile...</span>");
    TemperatureProfileChart.drawChart("profileEditChartDiv", profileEdit );
}

// add profile dialog
function profileAddProfile() {
	$('#addProfile_name').val('');
	$('#addProfile_type').val('');
    profileEdit.render( { name: '', temperatures: [] } );
    showProfileEditDialog(null, "Create Temperature Profile");
}

function showProfileEditDialog(profileId, dialogTitle, isSaveAs) {
    "use strict";
    $('#profileSaveError').hide();
    var editableName = (profileId==null);
    var profileNames = [];
    profman.getProfiles( function(profiles) {
        $(profiles).each(function(idx, profile) {
        	profileNames[profileNames.length] = profile.name;
        });
    });
    function closeDialog(jqDialog){
        $('#profileSaveError').hide();
        $("#profileEditName").removeAttr('disabled');
        jqDialog.dialog( "close" );
    }
    function errorDialog(jqDialog){
        $('#profileSaveError').show();
    }
    function callSaveProfile(isNew, jqDialog, profName, profData) {
    	if ( isNew ) {
        	profman.createProfile( profName, $('#addProfile_type').val(), profData.temperatures, [], function() {
				closeDialog(jqDialog);
			}, function() {
				errorDialog();
			} );
    	} else {
			profman.updateProfile( profileId, profName, $('#addProfile_type').val(), profData.temperatures, [], function() {
				closeDialog(jqDialog);
			}, function() {
				errorDialog();
			} );
    	}
    }
    $("#profileForm").dialog( {
        modal: true,
        title: dialogTitle,
        open: function(event, ui) {
            if ( !editableName ) {
                $("#addProfile_name").attr('disabled',true);
            }
            if (isSaveAs) {
                $("#addProfile_name").focus();
            } else {
                $('#profileEditDiv table tr').last().find('td').first().focus();
            }
        },
        buttons: [
            {
                text: "Save",
                click: function() {

                    function isNameTaken(name) {
                        for( var i=0; i<profileNames.length; i++ ) {
                            if ( name === profileNames[i] ) {
                                return true;
                            }
                        }
                        return false;
                    }

                    if ( profileEdit.hasEmptyDayCells() ) {
                        profileEdit.markInvalidCells();
                        return;
                    } else {
                        profileEdit.resetInvalidCells();
                    }

                    var profName = $('#addProfile_name').val();
                    if ( typeof( profName ) !== "undefined" && profName !== '' ) {

                        $('#addProfile_name').prev().removeClass('error');
                        var jqDialog = $( this );
                        if ( editableName && isNameTaken(profName) ) {
                            $("<div>Are you sure you want to overwrite the profile: " + profName + "?</div>").dialog({
                                resizable: false,
                                height: 140,
                                modal: true,
                                buttons: {
                                    Ok: function () {
                                        callSaveProfile((editableName || isSaveAs), jqDialog, profName, profileEdit.toJSON());
                                        $(this).dialog("close");
                                    },
                                    Cancel: function () {
                                        $('#profileEditName').focus();
                                        $(this).dialog("close");
                                    }
                                }
                            });
                        } else {
                            callSaveProfile((editableName || isSaveAs), jqDialog, profName, profileEdit.toJSON());
                        }

                    } else {
                        $('#addProfile_name').prev().addClass('error');
                        $('#addProfile_name').focus();
                    }
                }
            },{
                text: "Cancel",
                click: function() {
                    $("#addProfile_name").removeAttr('disabled');
                    $( this ).dialog( "close" );
                }
            }
        ],
        width: 960
    });
	profileEditDrawChart();
}
function profileSelected(elem) {
    $(elem).siblings().removeClass("ui-selected");
    var pid = $(elem).data('profileId');
	profman.getProfile(pid); // profile is rendered on profile loaded window event
	$('#profileTitle').text('Profile loading...');
	$('#profileDetails').addClass('ui-selected').data('profileId', pid);
}
function profileNotSelected(msg) {
	$('#profileTitle').text('Profile deleted by another session/device, select one from the left.');
	$('#profileDetails').removeClass('ui-selected').data('profileId', '');
	$('#profileTable').empty();
	$('#profileChart').empty();
}


// render list of controllers
function deviceConfigRenderControllerList(controllers) {
	$('#controllerlist').empty();
	$(controllers).each(function( idx, controller ) {
		var li = $('<li></li>').attr('id', 'controller_' + controller.id).data('controllerId', controller.id);
		li.append(deviceConfigCreateControllerDelete(controller));
		li.append(deviceConfigCreateControllerEdit(controller));
		var title = $('<a href="#"></a>').addClass('title').text(controller.name);
		li.append(title);
		$('#controllerlist').append(li);
	});
    $('#controllerlist').selectable({
        stop: function(event, ui) {
            $(".ui-selected:first", this).each(function() {
                $(this).siblings().removeClass("ui-selected");
                var cid = $(this).data('controllerId');
				ioman.getController(cid);
				deviceConfigChamberSelected(cid);
            });
        }
    });
}
function deviceConfigChamberSelected(cid) {
	$('#chambers').addClass('ui-selected');
	$('#chamberlist').show();
	$('#addChamber_button').data('controllerId', cid).show();
}
function deviceConfigChamberNotSelected(msg) {
	$('#chambers').removeClass('ui-selected');
	var li = $('<li></li>').text(msg);
	$('#chamberlist').empty().append(li);
	$('#addChamber_button').data('controllerId', '').hide();
}

function deviceConfigCreateControllerDelete(controller) {
	var deleter = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-trash' },text: false}
	).click(function() {
		var controllerId = $(this).parent().data('controllerId');
		$('#controllerToDelete').text(controller.name);
		$('#controllerDelete').dialog({
	        modal: true,
	        title: "Delete Controller !?!",
	        buttons: [
	            {
	                text: "Delete",
	                click: function() {
						ioman.deleteController(controllerId);
						ioman.getControllers();
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return deleter;
}
function deviceConfigCreateControllerEdit(controller) {
	var editer = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-wrench' },text: false}
	).click(function() {
		var controllerId = $(this).parent().data('controllerId');
		$('#addController_name').val(controller.name);
		$('#addController_address').val(controller.address);
		$('#addController_port').val(controller.port);
		$('#addController_socket').val(controller.socket);
		$('#controllerForm').dialog({
	        modal: true,
	        title: "Update Controller",
	        buttons: [
	            {
	                text: "Upate",
	                click: function() {
						ioman.updateController( controllerId, $('#addController_name').val(), $('#addController_address').val(), $('#addController_port').val(), $('#addController_socket').val());
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return editer;
}


// render list of chambers
function deviceConfigRenderChamberList(controllerId, chambers) {
	$('#chamberlist').empty();
	// console.log('controller loaded: ' + data.controller.name);
	$(chambers).each(function( idx, chamber ) {
		var li = $('<li></li>').attr('id', 'chamber_' + chamber.id).data('controllerId',controllerId).data('chamberId',chamber.id);
		li.append(deviceConfigCreateChamberDelete(chamber));
		li.append(deviceConfigCreateChamberEdit(chamber));
		var title = $('<span></span>').addClass('title').text(chamber.name).click(function() {
			console.log("loading up device editor for chamber id: " + chamber.id);
		});
		li.append(title);
		var t = deviceConfigCreateTableWithHeader(chamber);
		if ( chamber.devices != null && chamber.devices.length > 0 ) {
			$(chamber.devices).each(function(idx, device) {
				t.append(deviceConfigCreateTableRow(controllerId, chamber.id, device));
			});
		} else {
			t.append(deviceConfigCreateTableRowEmpty());
		}
		t.append(deviceConfigCreateTableRowAdd(controllerId, chamber.id));
		li.append(t);
		$('#chamberlist').append(li);
	});
}
function deviceConfigCreateChamberDelete(chamber) {
	var deleter = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-trash' },text: false}
	).click(function() {
		var controllerId = $(this).parent().data('controllerId');
		var chamberId = $(this).parent().data('chamberId');
		$('#chamberToDelete').text(chamber.name);
		$('#chamberDelete').dialog({
	        modal: true,
	        title: "Delete Chamber !?!",
	        buttons: [
	            {
	                text: "Delete",
	                click: function() {
						ioman.deleteChamber(chamberId);
						// ????
						// ioman.getController(controllerId);
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return deleter;
}
function deviceConfigCreateChamberEdit(chamber) {
	var editer = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-wrench' },text: false}
	).click(function() {
		var controllerId = $(this).parent().data('controllerId');
		var chamberId = $(this).parent().data('chamberId');
		console.log("controllerid: " + controllerId + ", chamberid: " + chamberId + ".");
		$('#addChamber_name').val(chamber.name);
		$('#chamberForm').dialog({
	        modal: true,
	        title: "Update Chamber",
	        buttons: [
	            {
	                text: "Upate",
	                click: function() {
						ioman.updateChamber(chamberId, $('#addChamber_name').val());
						// ????
						// ioman.getController(controllerId);
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return editer;
}
function deviceConfigCreateTableWithHeader(chamber) {
	var t = $('<table class="deviceConfigTable" cellspacing="1" cellpadding="0" border="0"></table>').attr('id', 'chamber' + chamber.id + '_devices');
	var thead = $('<thead></thead>');
	var th = $('<th></th>').text('Device Name');
	thead.append(th);
	th = $('<th></th>').text('Slot');
	thead.append(th);
	th = $('<th></th>').text('Function');
	thead.append(th);
	th = $('<th></th>').text('Device Type');
	thead.append(th);
	th = $('<th></th>').text('Hardware Type');
	thead.append(th);
	t.append(thead);
	return t;
}
function deviceConfigCreateTableRow(controllerId, chamberId, device) {
	var tr = $('<tr></tr>');
	var td = $('<td></td>');
	td.append(deviceConfigCreateDeviceDelete(controllerId, chamberId, device));
	td.append(deviceConfigCreateDeviceEdit(controllerId, chamberId, device));
	var title = $('<span></span>').addClass('title').text(device.name);
	td.append(title);
	tr.append(td);
	td = $('<td></td>').text(device.slot);
	tr.append(td);
	td = $('<td></td>').text(device['function']);
	tr.append(td);
	td = $('<td></td>').text(device.devicetype);
	tr.append(td);
	td = $('<td></td>').text(device.hardwaretype);
	tr.append(td);
	return tr;
}
function deviceConfigCreateTableRowEmpty() {
	var tr = $('<tr></tr>');
	var td = $('<td></td>').attr('colspan', 5).text('No devices, please add a device.');
	tr.append(td);
	return tr;
}
function deviceConfigCreateTableRowAdd(controllerId, chamberId) {
	var tr = $('<tr></tr>');
	var td = $('<td></td>').attr('colspan', 5);
	var button = $('<button></button>').text('Add New Device').button().click(function() {
		deviceConfigAddDevice( controllerId, chamberId );
	});
	td.append(button);
	tr.append(td);
	return tr;
}
function deviceConfigCreateDeviceDelete(controllerId, chamberId, device) {
	var deleter = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-trash' },text: false}
	).click(function() {
		$('#deviceToDelete').text(device.name);
		$('#deviceDelete').dialog({
	        modal: true,
	        title: "Delete Device !?!",
	        buttons: [
	            {
	                text: "Delete",
	                click: function() {
						ioman.deleteDevice(device.id);
						ioman.getController(controllerId);
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return deleter;
}
function deviceConfigCreateDeviceEdit(controllerId, chamberId, device) {
	var editer = $('<button></button>').text('delete').button(
		{icons: { primary: 'ui-icon-wrench' },text: false}
	).click(function() {
		console.log("controllerid: " + controllerId + ", chamberid: " + chamberId + ".");
		$('#addDevice_name').val(device.name);
		$('#addDevice_slot').val(device.slot);
		$('#addDevice_function').val(device['function']);
		$('#addDevice_hardwaretype').val(device.hardwaretype);
		$('#addDevice_devicetype').val(device.devicetype);
		$('#deviceForm').dialog({
	        modal: true,
	        title: "Update Device",
	        buttons: [
	            {
	                text: "Upate",
	                click: function() {
						ioman.updateDevice(device.id, $('#addDevice_name').val(), $('#addDevice_slot').val(), $('#addDevice_function').val(), $('#addDevice_devicetype').val(), $('#addDevice_hardwaretype').val());
						ioman.getController(controllerId);
	                    $( this ).dialog( "close" );
	                }
	            },{
	                text: "Cancel",
	                click: function() { $( this ).dialog( "close" ); }
	            }
	        ]
		});
	});
	return editer;
}

// add controller dialog
function deviceConfigAddController() {
	$('#addController_name').val('');
	$('#addController_address').val('');
	$('#addController_port').val('');
	$('#addController_socket').val('');
	$('#controllerForm').dialog({
        modal: true,
        title: "Create Controller",
        buttons: [
            {
                text: "Create",
                click: function() {
					ioman.createController( $('#addController_name').val(), $('#addController_address').val(), $('#addController_port').val(), $('#addController_socket').val());
                    $( this ).dialog( "close" );
                }
            },{
                text: "Cancel",
                click: function() { $( this ).dialog( "close" ); }
            }
        ]
	});
}

// add chamber dialog
function deviceConfigAddChamber(controllerId) {
	$('#addChamber_name').val('');
	$('#chamberForm').dialog({
        modal: true,
        title: "Create Chamber",
        buttons: [
            {
                text: "Create",
                click: function() {
					ioman.createChamber( controllerId, $('#addChamber_name').val());
					ioman.getController(controllerId);
                    $( this ).dialog( "close" );
                }
            },{
                text: "Cancel",
                click: function() { $( this ).dialog( "close" ); }
            }
        ]
	});
}
// add chamber dialog
function deviceConfigAddDevice(controllerId, chamberId) {
	$('#addDevice_name').val('');
	$('#addDevice_slot').val('');
	$('#addDevice_function').val('');
	$('#addDevice_hardwaretype').val('');
	$('#addDevice_devicetype').val('');
	$('#deviceForm').dialog({
        modal: true,
        title: "Create Device",
        buttons: [
            {
                text: "Create",
                click: function() {
					ioman.createDevice( chamberId, $('#addDevice_name').val(), $('#addDevice_slot').val(), $('#addDevice_function').val(), $('#addDevice_devicetype').val(), $('#addDevice_hardwaretype').val());
					ioman.getController(controllerId);
                    $( this ).dialog( "close" );
                }
            },{
                text: "Cancel",
                click: function() { $( this ).dialog( "close" ); }
            }
        ]
	});
}

// testing - see maelstrom-tests.js
function setupTestingStuff() {
	// tests - alarms and acks
	$('#test-alarm-generate').button().click(function() {
		testAlarmGenerate(mael);
	});
	$('#test-alarm-ack').button().click(function() {
		testAlarmAck(mael);
	});
	// controller/device data change
	$('#test-mash').button().click(function() {
		testMash(mael);
	});
	$('#test-lagerferm').button().click(function() {
		testLager(mael);
	});
	$('#test-aleferm').button().click(function() {
		testAle(mael);
	});
	// io controller settings
	$('#test-addio').button().click(function() {
		testAddControllers(mael, ioman);
	});
	// profile management
	$('#test-addprof').button().click(function() {
		testAddProfiles(mael, profman);
	});
	// io controller logging channel
	$('#test-devlogs').button().click(function() {
		testDeviceLogs(mael);
	});
	// app setting test - reset logo
	$('#test-appsetlogo').button().click(function() {
		testAppSetting(mael,setman);
	});
	// app settings test - reset logo and theme
	$('#test-appsetlogotheme').button().click(function() {
		testAppSettings(mael,setman);
	});
}




