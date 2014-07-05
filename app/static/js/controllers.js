function BrewCtrl($scope, $document, maelstrom) {


  /********************** Modely stuffs ***********************/


  var CONN_STATUS = { 
      'disconnected': { status: 'disconnected', statusMessage: 'Disconnected from Server'},
      'connected' : { status: 'connected', statusMessage: 'Connected to Server'}
  };

  // connection status
  $scope.connStatus = CONN_STATUS['disconnected'];

  // alarms model
  $scope.alarms = [];
  // boolean to drive display
  $scope.needsAcknowledgement = false;

  // device logs model
  $scope.deviceLogEntries = [];

  // app settings model
  $scope.appsettings = {};
  $scope.appsettings.breweryLogo = 's/img/logo-777.png';

  // debugger model
  $scope.debug = {};
  $scope.debug.postChannel = '';
  $scope.debug.postMessage = '';

  // profiles model and stuffs
  $scope.profiles = [];
  $scope.selectedProfile = {};
  $scope.profileDetailClass = 'empty';

  $scope.profileEditor = null;



  /********************** Maelstrom event handlers ***********************/



  // maelstrom connection opened handler
  maelstrom.addHandler('open', function (evt) {

    // set connection status
    $scope.connStatus = CONN_STATUS[evt.status];

    // subscribe to channels
    $(['alarms', 'data', 'logs', 'lcd']).each(function(idx, key) {
      maelstrom.subscribe(key);
    });

    // load up app settings
    maelstrom.loadAppSettings(
      function (data) {
        $(data.settings.appsettings).each( function(idx,obj) {
          $scope.appsettings[obj.name] = obj.value;
        });
      },
      function (data) { maelstrom.getAppSettings(); }
    );

    // load up profiles
    maelstrom.loadProfiles(
      function (data) { 
        $scope.profiles = data.profiles;
        $scope.selectProfile($scope.selectedProfile.id);
      },
      function (data) {
        maelstrom.getProfiles();
      }
    );

    // load up controllers
    maelstrom.loadControllers(
      function (data) { 
        $scope.controllers = data.controllers;
        $scope.selectControllers($scope.selectedControllers.id);
      },
      function (data) {
        maelstrom.getControllers();
      }
    );

  });

  // maelstrom connection closed handler
  maelstrom.addHandler('closed', function (evt) {
    $scope.connStatus = CONN_STATUS[evt.status];
  });

  // maelstrom message handler
  maelstrom.addHandler('message', function (msgObj) {
    console.log("Maelstrom message recieved on channel: " + msgObj.channel);
    var payload = msgObj.message;
    switch (msgObj.channel) {

      case "alarms" :
        $(payload.alarms).each(function(idx,alm) {
          $scope.alarms.push(alm);
        });
        if ( payload.acknowledge === true ) {
          $scope.needsAcknowledgement = false;
        } else {
          $scope.needsAcknowledgement = true;
        }
        break;

      case "logs" :
          $(payload.entries).each(function(idx,val) {
            $scope.deviceLogEntries.push(val);
          });
        break;
    }
  });


  /********************** controllers functions for view ***********************/


  // reconnect to the server
  $scope.reconnect = function() {
    maelstrom.connect();
  };

  // publish an alarm ack
  $scope.acknowledgeAlarms = function() {
    var ackMessage = {
      channel: "alarms",
      payload: { acknowledge: true }
    };
    maelstrom.postMessage('alarms', ackMessage );
  };

  // get app settings
  $scope.getAppSettings = function() {
    maelstrom.getAppSettings();
  };

  // save app settings
  $scope.saveAppSettings = function() {
    var sets = [];
    sets[0] = { name: 'breweryLogo', value : $scope.appsettings.breweryLogo }
    sets[1] = { name: 'themeStylesheet', value : $scope.appsettings.themeStylesheet }
    sets[2] = { name: 'themeSelectedStyle', value: $scope.appsettings.themeSelectedStyle }
    maelstrom.saveAppSettings(sets);
  };

  // set selected profile by id
  $scope.selectProfile = function(id) {
    if ( $scope.profiles.length > 0 ) {
      for ( var i=0; i< $scope.profiles.length; i++ ) {
        if ( id == $scope.profiles[i].id ) {
          $scope.selectedProfile = $scope.profiles[i];
          $scope.profileDetailClass = 'readonly';
          $scope.profileEditor.config.editable = false;
          $scope.profileEditor.render( $scope.selectedProfile );
          $scope.profileChart.drawChart( $scope.profileEditor.getProfileDuration(), $scope.profileEditor.toCSV(true, ['date', 'temperature']) );
          break;
        }
      }
    }
  };

  // turn on edit mode for currently selected profile
  $scope.editSelectedProfile = function() {
    $scope.profileDetailClass = 'edit';
    $scope.profileEditor.config.editable = true;
    $scope.profileEditor.render( $scope.selectedProfile );
  };

  // turn on edit mode for currently selected profile
  $scope.newProfile = function() {
    $scope.profileDetailClass = 'new';
    $scope.profileEditor.config.editable = true;
    var newProf = { "id" : null, "name" : "New Profile", "type" : "", "temperatures" : [], "events" : [] };
    $scope.profiles.push(newProf);
    $scope.selectedProfile = newProf;
    $scope.profileEditor.render( $scope.selectedProfile );
  };

  // save edits for currently selected profile
  $scope.saveSelectedProfile = function() {
    if ( $scope.selectedProfile.id != null ) {
      maelstrom.updateProfile( $scope.selectedProfile.id, $scope.selectedProfile.name, $scope.selectedProfile.type, $scope.profileEditor.toJSON().temperatures, [], 
        function() {
          console.log('Profile: ' + $scope.selectedProfile.name + ' saved successfully');
          $scope.$apply(function() {
            $scope.profileDetailClass = 'readonly';
          });
        }, 
        function() {
          console.log('Error saving profile: ' + $scope.selectedProfile.name);
        }
      );
    } else {
      maelstrom.createProfile( $scope.selectedProfile.name, $scope.selectedProfile.type, $scope.profileEditor.toJSON().temperatures, [], 
        function() {
          console.log('Profile: ' + $scope.selectedProfile.name + ' created successfully');
          $scope.$apply(function() {
            $scope.profileDetailClass = 'readonly';
          });
        }, 
        function() {
          console.log('Error creating profile: ' + $scope.selectedProfile.name);
        }
      );
    }
  };

  // cancel profile edit - just reload them
  $scope.cancelEditProfile = function() {
    maelstrom.getProfiles();
    $scope.profileDetailClass = 'empty';
    $scope.profileEditor.config.editable = false;
    $scope.profileEditor.render( $scope.selectedProfile );
  };







  /********************** debugger, buttons to simulate events, etc ***********************/






  // post/publish a message to a channel
  $scope.debuggerPostMessage = function () {
    maelstrom.postMessage($scope.debug.postChannel, JSON.parse($scope.debug.postMessage));
  };

  $scope.generateAlarms = function() {
    var alarmMessage = {
      channel: "alarms",
      payload: {
        alarms: [
          { source: "system" , code: 1001, msg: "communication error with controller: Lager Chamber" }
          , { source: "controller_1::chamber_2" , code: 1001, msg: "Setpoint not reached within timelimit" }
        ]
      }
    };
    maelstrom.postMessage('alarms', alarmMessage );
  };
  $scope.generateLogs = function() {
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
    maelstrom.postMessage('logs', logs );
  };
}
