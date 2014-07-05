app.factory('maelstrom', function ($rootScope) {

  var maelstrom = new Maelstrom( { debugEnabled: true, debugDivId : 'debugger' } );
  var setman=null, ioman=null, profman=null;

  return {
    addHandler: function (eventName, callback) {
      maelstrom.addHandler(eventName, function (data) {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.call(maelstrom, data);
        });
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
        setman = new MaelstromAppSettings(
          maelstrom
          , function (data) {  
            var args = arguments;
            $rootScope.$apply(function () {
              loadedHandler.call(setman, data);
            });
          }
          , function (data) {  
            var args = arguments;
            $rootScope.$apply(function () {
              changeHandler.call(setman, data);
            });
          });
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
        profman = new MaelstromProfileSettings(
          maelstrom
          , function (data) {  
            var args = arguments;
            $rootScope.$apply(function () {
              loadedHandler.call(profman, data);
            });
          }
          , function (data) {  
            var args = arguments;
            $rootScope.$apply(function () {
              changeHandler.call(profman, data);
            });
          });
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
    }
  };
});
