import os

from tornado.ioloop import IOLoop
from tornado.web import Application, StaticFileHandler, RedirectHandler

from libmaelstrom import core, db, web


###################################################
#   web application setup and startup
###################################################


staticPath = os.path.dirname(os.path.realpath(__file__))+"/libmaelstrom/static"
dataPath = os.path.dirname(os.path.realpath(__file__))+"/data"

application = Application([
    (r"/", RedirectHandler, {"url": "/s/app.html"}),
    (r"/socket", core.ClientSocket),
    (r"/publish", core.Publisher),
    (r"/s/(.*)", StaticFileHandler, { "path" : staticPath }),
    (r"/appsettings", web.AppSettingsHandler),
    (r"/iocontrollers", web.IOControllersHandler),
    (r"/iocontroller/([0-9]+)", web.IOControllerHandler),
    (r"/iochambers/([0-9]+)", web.IOChambersHandler),
    (r"/iochamber/([0-9]+)", web.IOChamberHandler),
    (r"/iodevices/([0-9]+)", web.IODevicesHandler),
    (r"/iodevice/([0-9]+)", web.IODeviceHandler),
    (r"/profiles", web.ProfilesHandler),
    (r"/profile/([0-9]+)", web.ProfileHandler),
])

if __name__ == "__main__":
    db.init_db(dataPath)
    application.listen(8888)
    IOLoop.instance().start()

