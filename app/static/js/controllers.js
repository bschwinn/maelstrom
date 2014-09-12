angular.module('brewApp.controllers', [])
  .controller('BrewCtrl', ['$scope', '$document', '$route', 'maelstrom', function ($scope, $document, $route, maelstrom) {

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
    // profiles model and stuffs
    $scope.profiles = [];
    $scope.selectedProfile = {};
    $scope.profileDetailClass = 'empty';
    $scope.profileEditor = null;
    // app settings model
    $scope.appsettings = {};
    $scope.appsettings.breweryLogo = 's/img/logo-777.png';
    // controllers model and stuffs
    $scope.controllers = [];
    $scope.controllerDatas = {};
    $scope.selectedController = {};
    $scope.controllerDetailClass = 'empty';

    // maelstrom connection opened handler
    maelstrom.addHandler('open', function (evt) {

      // set connection status
      $scope.connStatus = CONN_STATUS[evt.status];

      // subscribe to channels
      $(['alarms', 'data', 'logs']).each(function(idx, key) {
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
          $scope.selectController($scope.selectedController.id);
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

        case "data" :
          for (var i=$scope.controllers.length - 1; i >= 0; i--) {
            var c = $scope.controllers[i];
            if ( c.id == payload.controllerId ) {
              c.data = payload;
            }
            break;
          };
          break;
      }
    });


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


  // }])
  // .controller('ProfileCtrl', ['$scope', '$document', 'maelstrom', function ($scope, $document, maelstrom) {

    // **** Profile Stuff ****

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
            $scope.profileDetailClass = 'readonly';
          }, 
          function() {
            console.log('Error saving profile: ' + $scope.selectedProfile.name);
          }
        );
      } else {
        maelstrom.createProfile( $scope.selectedProfile.name, $scope.selectedProfile.type, $scope.profileEditor.toJSON().temperatures, [], 
          function() {
            console.log('Profile: ' + $scope.selectedProfile.name + ' created successfully');
            $scope.profileDetailClass = 'readonly';
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

    // set ref to the profile editor
    $scope.setProfileEditor = function(ed) {
      $scope.profileEditor = ed;
    };

    // set ref to the profile chart
    $scope.setProfileChart = function(chart) {
      $scope.profileChart = chart;
    };



  // }])
  // .controller('AppSettingsCtrl', ['$scope', '$document', 'maelstrom', function ($scope, $document, maelstrom) {

    // **** Settings Stuff ****


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



  // }])
  // .controller('IOCtrl', ['$scope', '$document', 'maelstrom', function ($scope, $document, maelstrom) {

    // **** IO Stuff ****


    // set selected controller by id
    $scope.selectController = function(id) {
      if ( $scope.controllers.length > 0 ) {
        for ( var i=0; i< $scope.controllers.length; i++ ) {
          if ( id == $scope.controllers[i].id ) {
            $scope.selectedController = $scope.controllers[i];
            $scope.controllerDetailClass = 'readonly';
            break;
          }
        }
      }
    };

    // turn on edit mode for currently selected controller
    $scope.editSelectedController = function() {
      $scope.controllerDetailClass = 'edit';
    };

    // turn on edit mode for currently selected controller
    $scope.newController = function() {
      $scope.controllerDetailClass = 'new';
      var newProf = { "id" : null, "name" : "New Controller", "type" : "", "temperatures" : [], "events" : [] };
      $scope.controllers.push(newProf);
      $scope.selectedController = newProf;
    };

    // save edits for currently selected controller
    $scope.saveSelectedController = function() {
      if ( $scope.selectedController.id != null ) {
        maelstrom.updateController( $scope.selectedController.id, $scope.selectedController.name, $scope.selectedController.address, $scope.selectedController.port, $scope.selectedController.socket, 
          function() {
            console.log('Controller: ' + $scope.selectedController.name + ' saved successfully');
            $scope.controllerDetailClass = 'readonly';
          }, 
          function() {
            console.log('Error saving controller: ' + $scope.selectedController.name);
          }
        );
      } else {
        maelstrom.createController( $scope.selectedController.name, $scope.selectedController.address, $scope.selectedController.port, $scope.selectedController.socket, 
          function() {
            console.log('Controller: ' + $scope.selectedController.name + ' created successfully');
            $scope.controllerDetailClass = 'readonly';
          }, 
          function() {
            console.log('Error creating controller: ' + $scope.selectedController.name);
          }
        );
      }
    };

    // cancel controller edit - just reload them
    $scope.cancelEditController = function() {
      maelstrom.getControllers();
      $scope.controllerDetailClass = 'empty';
    };

  // }])
  // .controller('DebugCtrl', ['$scope', '$document', 'maelstrom', function ($scope, $document, maelstrom) {

    // **** Debugging/Diagnostic Stuff ****


    // debugger model
    $scope.debug = {};
    $scope.debug.postChannel = '';
    $scope.debug.postMessage = '';

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

  }]);

