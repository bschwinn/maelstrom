angular.module('brewApp.services', []).factory('maelstrom', ['$rootScope', '$http', function ($rootScope, $http) {

  var maelstrom = new Maelstrom( $http, { debugEnabled: true, debugDivId : 'debugger' } );
  var setman=null, ioman=null, profman=null;

  return {
    addHandler: function (eventName, callback) {
      maelstrom.addHandler(eventName, function (data) {  
        callback.call(maelstrom, data);
      });
    },
    postMessage: function (channel, msg) {
      maelstrom.postMessage(channel, msg);
    },
    connect: function() {
      maelstrom.connect();
    },
    subscribe: function(channel) {
      maelstrom.subscribe(channel)
    },
    unsubscribe: function(channel) {
      maelstrom.unsubscribe(channel)
    },
    loadAppSettings: function (loadedHandler, changeHandler) {
      if (setman==null) {
        setman = new MaelstromAppSettings( maelstrom,
          function (data) {  
            loadedHandler.call(setman, data);
          },
          function (data) {  
            changeHandler.call(setman, data);
          }
        );
      } else {
        setman.init(maelstrom);
      }
    },
    getAppSettings: function () {
      setman.getSettings();
    },
    saveAppSettings: function (settings) {
      setman.saveSettings(settings);
    },
    loadProfiles: function (loadedHandler, changeHandler) {
      if (profman==null) {
        profman = new MaelstromProfileSettings( maelstrom,
          function (data) {  
            loadedHandler.call(profman, data);
          },
          function (data) {  
            changeHandler.call(profman, data);
          }
        );
      } else {
        profman.init(maelstrom);
      }
    },
    getProfiles: function (callback) {
      profman.getProfiles(callback);
    },
    getProfile: function (id, callback) {
      profman.getProfile(id, callback);
    },
    updateProfile: function (id, name, theType, temperatures, events, successHandler, failureHandler) {
      profman.updateProfile(id, name, theType, temperatures, events, successHandler, failureHandler);
    },
    createProfile: function (name, theType, temperatures, events, successHandler, failureHandler) {
      profman.createProfile(name, theType, temperatures, events, successHandler, failureHandler);
    },
    loadControllers: function (loadedHandler, changeHandler) {
      if (ioman==null) {
        ioman = new MaelstromControllerSettings( maelstrom, 
          function (data) {  
            loadedHandler.call(ioman, data);
          },
          function (data) {  
            changeHandler.call(ioman, data);
          }
        );
      } else {
        ioman.init(maelstrom);
      }
    },
    getControllers: function (callback) {
      ioman.getControllers(callback);
    },
    getController: function (id, callback) {
      ioman.getController(id, callback);
    },
    updateController: function (id, name, address, port, socket, successHandler, failureHandler) {
      ioman.updateController(id, name, address, port, socket, successHandler, failureHandler);
    },
    createController: function (name, address, port, socket, successHandler, failureHandler) {
      ioman.createController(name, address, port, socket, successHandler, failureHandler);
    }
  };
}]);

