import simplejson as json

from datetime import datetime
from tornado.web import Application, RequestHandler, StaticFileHandler, RedirectHandler
from sqlalchemy.orm.exc import NoResultFound, MultipleResultsFound

import db, core

###################################################
#   Http handlers
###################################################


###################################################
#   API handlers for AppSettings
#    - too simple key/value pair api
#    - get all, or change one, like it or not ;)
###################################################

class AppSettingsHandler(RequestHandler):
    def get(self):
        session = db.DBSession()
        settings = session.query(db.AppSetting).all()
        c = []
        for setting in settings:
            c.append( dict( name = setting.name, value = setting.value) )
        self.write(json.dumps(c))
        
    def post(self):
        settingsString = self.get_argument("settings", None)
        if settingsString is not None:
            settings = json.loads(settingsString)
            for setting in settings:
                self.processSetting( setting["name"], setting["value"] )
            c = settings
        else:
            name = self.get_argument("name")
            val = self.get_argument("value")
            self.processSetting( name, val )
            c = [ dict( name = name, value = val) ]
        # publish a change event 
        p = dict( eventType = "change", settings = c )
        core.theMan.publishMessage("_appsettings", json.dumps(dict( channel = "_appsettings", payload = p )))

    def processSetting(self, name, val):
        # clean any existing setting with same name
        session = db.DBSession()
        try: 
            setting = session.query(db.AppSetting).filter(db.AppSetting.name == name).one()
            session.delete(setting)
        except NoResultFound:
            print "No existing setting named: " + name + ", creating a new instance"
        except MultipleResultsFound:
            print "Multiple existing settings named: " + name + ", deleting them and new instance"
            for d in session.query(db.AppSetting).filter(db.AppSetting.name == name).all():
                session.delete(d)
        
        # add new setting
        c = dict( name = name, value = val)
        newSetting = db.AppSetting(**c)
        session.add(newSetting)
        session.commit()


###################################################
#   API handlers for IO
#    -  controller(s)
#    -  chamber(s) or control loops
#    -  device(s) or sensors and actuators
###################################################

#   API handlers for IO Controllers create and list
class IOControllersHandler(RequestHandler):
    def get(self):
        session = db.DBSession()
        controllers = session.query(db.IOController).all()
        c = []
        for controller in controllers:
            chambs = []
            for chamb in controller.chambers:
                chambs.append(dict(id = chamb.id, name = chamb.name))
            conDic = dict( id = controller.id, name = controller.name, address = controller.address, port = controller.port, socket = controller.socket, chambers = chambs )
            c.append(conDic)
        self.write(json.dumps(c))

    def post(self):
        session = db.DBSession()
        name = self.get_argument('name')
        address = self.get_argument('address')
        port = self.get_argument('port')
        socket = self.get_argument('socket')
        controller = db.IOController(name = name, address = address, port = port, socket = socket)
        session.add(controller)
        session.commit()
        # publish a change event 
        c = dict( id = controller.id, name = controller.name, address = controller.address, port = controller.port, socket = controller.socket)
        p = dict( eventType = "create", controller = c )
        core.theMan.publishMessage("_iocontrollers", json.dumps(dict( channel = "_iocontrollers", payload = p )))

#   API handlers for IO Controllers retrieve, update, delete
class IOControllerHandler(RequestHandler):
    def get(self, controllerid):
        cid = int(controllerid)
        session = db.DBSession()
        controller = session.query(db.IOController).filter(db.IOController.id == cid).one()
        chambs = []
        for chamb in controller.chambers:
            devs = []
            for dev in chamb.devices:
                devs.append( dict(id = dev.id, name = dev.name, slot = dev.slot, function = dev.function, hardwaretype = dev.hardwaretype, devicetype = dev.devicetype) )
            chambs.append(dict(id = chamb.id, name = chamb.name, devices = devs))
        conDic = dict( id = controller.id, name = controller.name, address = controller.address, port = controller.port, socket = controller.socket, chambers = chambs )
        self.write(json.dumps(conDic))

    def post(self, controllerid):
        cid = int(controllerid)
        session = db.DBSession()
        controller = session.query(db.IOController).filter(db.IOController.id == cid).one()
        controller.name = self.get_argument('name')
        controller.address = self.get_argument('address')
        controller.port = self.get_argument('port')
        controller.socket = self.get_argument('socket')
        session.commit()
        # publish a change event 
        c = dict( id = controller.id, name = controller.name, address = controller.address, port = controller.port, socket = controller.socket)
        p = dict( eventType = "update", controller = c )
        core.theMan.publishMessage("_iocontrollers", json.dumps(dict( channel = "_iocontrollers", payload = p )))

    def delete(self, controllerid):
        cid = int(controllerid)
        session = db.DBSession()
        controller = session.query(db.IOController).filter(db.IOController.id == cid).one()
        session.delete(controller)
        session.commit()
        # publish a change event 
        p = dict( eventType = "delete", controllerId = controllerid )
        core.theMan.publishMessage("_iocontrollers", json.dumps(dict( channel = "_iocontrollers", payload = p )))

#   API handlers for Controller Chambers: create, todo: list
class IOChambersHandler(RequestHandler):
    def post(self, controllerid):
        session = db.DBSession()
        name = self.get_argument('name')
        chamber = db.IOChamber(iocontroller_id = controllerid, name = name)
        session.add(chamber)
        session.commit()
        # publish a change event 
        ch = dict( id = chamber.id, controllerId = chamber.iocontroller_id, name = chamber.name )
        p = dict( eventType = "create", chamber = ch )
        core.theMan.publishMessage("_iochambers", json.dumps(dict( channel = "_iochambers", payload = p )))


#   API handlers for Controller Chambers: update and delete, todo: retrieve single
class IOChamberHandler(RequestHandler):
    def post(self, chamberid):
        chid = int(chamberid)
        session = db.DBSession()
        chamber = session.query(db.IOChamber).filter(db.IOChamber.id == chid).one()
        chamber.name = self.get_argument('name')
        session.commit()
        # publish a change event 
        ch = dict( id = chamber.id, controllerId = chamber.iocontroller_id, name = chamber.name )
        p = dict( eventType = "update", chamber = ch )
        core.theMan.publishMessage("_iochambers", json.dumps(dict( channel = "_iochambers", payload = p )))

    def delete(self, chamberid):
        chid = int(chamberid)
        session = db.DBSession()
        chamber = session.query(db.IOChamber).filter(db.IOChamber.id == chid).one()
        controllerid = chamber.iocontroller_id
        session.delete(chamber)
        session.commit()
        # publish a change event 
        p = dict( eventType = "delete", chamberId = chamberid, controllerId = controllerid )
        core.theMan.publishMessage("_iochambers", json.dumps(dict( channel = "_iochambers", payload = p )))

#   API handlers for Chamber Devices: create, todo: list
class IODevicesHandler(RequestHandler):
    def put(self, chamberid):
        session = db.DBSession()
        name = self.get_argument('name')
        slot = self.get_argument('slot')
        function = self.get_argument('function')
        devicetype = self.get_argument('devicetype')
        hardwaretype = self.get_argument('hardwaretype')
        device = db.IODevice(iochamber_id = chamberid, name = name, slot = slot, function = function, devicetype = devicetype, hardwaretype = hardwaretype)
        session.add(device)
        session.commit()
        # publish a change event 
        d = dict( id = device.id, chamberId = device.iochamber_id, name = device.name, slot = device.slot, function = device.function, devicetype = device.devicetype, hardwaretype = device.hardwaretype)
        p = dict( eventType = "create", device = d )
        core.theMan.publishMessage("_iodevices", json.dumps(dict( channel = "_iodevices", payload = p )))

#   API handlers for Chamber Devices: update and delete, todo: retrieve single
class IODeviceHandler(RequestHandler):
    def post(self, deviceid):
        did = int(deviceid)
        session = db.DBSession()
        device = session.query(db.IODevice).filter(db.IODevice.id == did).one()
        device.name = self.get_argument('name')
        device.slot = self.get_argument('slot')
        device.function = self.get_argument('function')
        device.devicetype = self.get_argument('devicetype')
        device.hardwaretype = self.get_argument('hardwaretype')
        session.commit()
        # publish a change event 
        d = dict( id = device.id, chamberId = device.iochamber_id, name = device.name, slot = device.slot, function = device.function, devicetype = device.devicetype, hardwaretype = device.hardwaretype)
        p = dict( eventType = "update", device = d )
        core.theMan.publishMessage("_iodevices", json.dumps(dict( channel = "_iodevices", payload = p )))

    def delete(self, deviceid):
        did = int(deviceid)
        session = db.DBSession()
        dev = session.query(db.IODevice).filter(db.IODevice.id == did).one()
        chamberId = dev.iochamber_id
        session.delete(dev)
        session.commit()
        # publish a change event 
        p = dict( eventType = "delete", deviceId = deviceid, chamberId = chamberId )
        core.theMan.publishMessage("_iodevices", json.dumps(dict( channel = "_iodevices", payload = p )))


#   API handlers for Temperature Profiles: create and list
class ProfilesHandler(RequestHandler):
    def get(self):
        session = db.DBSession()
        profiles = session.query(db.Profile).all()
        c = []
        for profile in profiles:
            temps = []
            for temp in profile.temperatures:
                dt = ''
                if temp.date is not None:
                    dt = temp.date.strftime('%Y-%m-%dT%H:%M:%S')
                temps.append(dict(id = temp.id, days = temp.day, date = dt, temperature = temp.temperature))
            evts = []
            for event in profile.events:
                dt = ''
                if event.date is not None:
                    dt = event.date.strftime('%Y-%m-%dT%H:%M:%S')
                evts.append(dict(id = event.id, days = event.day, date = dt, eventText = event.eventText))
            c.append(dict( id = profile.id, name = profile.name, type = profile.type, temperatures = temps, events = evts ))
        self.write(json.dumps(c))

    def post(self):
        session = db.DBSession()
        name = self.get_argument('name')
        type = self.get_argument('type')
        temps = json.loads(self.get_argument('temperatures'))
        evts = json.loads(self.get_argument('events'))
        profile = db.Profile(name = name, type = type, temperatures =  [], events = [])
        session.add(profile)
        session.commit()
        profile.temperatures = profutils.parseTemperatures(profile.id, temps)
        profile.events = profutils.parseEvents(profile.id, evts)
        session.add(profile)
        session.commit()
        # publish a change event 
        prof = dict( id = profile.id, name = profile.name, temperatures = profutils.stringifyTemperatures(profile.temperatures), events = profutils.stringifyEvents(profile.events))
        p = dict( eventType = "create", profile = prof )
        core.theMan.publishMessage("_profiles", json.dumps(dict( channel = "_profiles", payload = p )))

#   API handlers for IO Controllers retrieve, update, delete
class ProfileHandler(RequestHandler):
    def get(self, profileid):
        pid = int(profileid)
        session = db.DBSession()
        profile = session.query(db.Profile).filter(db.Profile.id == pid).one()
        temps = []
        for temp in profile.temperatures:
            dt = ''
            if temp.date is not None:
                dt = temp.date.strftime('%Y-%m-%dT%H:%M:%S')
            temps.append(dict(id = temp.id, days = temp.day, date = dt, temperature = temp.temperature))
        profDic = dict( id = profile.id, name = profile.name, type = profile.type, temperatures = temps )
        self.write(json.dumps(profDic))

    def post(self, profileid):
        cid = int(profileid)
        session = db.DBSession()
        profile = session.query(db.Profile).filter(db.Profile.id == cid).one()
        profile.name = self.get_argument('name')
        profile.type = self.get_argument('type')
        temps = json.loads(self.get_argument('temperatures'))
        evts = json.loads(self.get_argument('events'))
        profile.temperatures = profutils.parseTemperatures(profileid, temps)
        profile.events = profutils.parseEvents(profileid, evts)
        session.commit()
        prof = dict( id = profile.id, name = profile.name, temperatures = profutils.stringifyTemperatures(profile.temperatures), events = profutils.stringifyEvents(profile.events))
        p = dict( eventType = "update", profile = prof )
        core.theMan.publishMessage("_profiles", json.dumps(dict( channel = "_profiles", payload = p )))

    def delete(self, profileid):
        pid = int(profileid)
        session = db.DBSession()
        profile = session.query(db.Profile).filter(db.Profile.id == pid).one()
        session.delete(profile)
        session.commit()
        # publish a change event 
        p = dict( eventType = "delete", profileId = profileid )
        core.theMan.publishMessage("_profiles", json.dumps(dict( channel = "_profiles", payload = p )))

#   API utils
class ProfileUtils():

    def parseTemperatures(self, profileid, temps):
        tarr = []
        for temp in temps:
            d = ''
            if temp['date'] is not None:
                d = datetime.strptime(temp['date'], '%Y-%m-%dT%H:%M:%S')
            tarr.append( db.ProfileTemperature(profile_id = profileid, day = temp["days"], date = d, temperature = temp["temperature"]) )
        return tarr

    def stringifyTemperatures(self, temps):
        tarr = []
        for temp in temps:
            d = ''
            if temp.date is not None:
                d = temp.date.strftime('%Y-%m-%dT%H:%M:%S')
            tarr.append( dict(profileId = temp.profile_id, days = temp.day, date = d, temperature = temp.temperature) )
        return tarr

    def parseEvents(self, profileid, events):
        evarr = []
        for evt in events:
            d = ''
            if evt['date'] is not None:
                d = datetime.strptime(evt['date'], '%Y-%m-%dT%H:%M:%S')
            evarr.append( db.ProfileEvent(profile_id = profileid, day = evt["days"], date = d, eventText = evt["eventText"]) )
        return evarr

    def stringifyEvents(self, events):
        evarr = []
        for evt in events:
            d = ''
            if evt.date is not None:
                d = evt.date.strftime('%Y-%m-%dT%H:%M:%S')
            evarr.append( dict(profileId = evt.profile_id, days = evt.day, date = d, eventText = evt.eventText) )
        return evarr

profutils = ProfileUtils()


