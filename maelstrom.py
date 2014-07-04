import os

from tornado.wsgi import WSGIContainer
from tornado.web import Application, StaticFileHandler, RedirectHandler, FallbackHandler
from tornado.ioloop import IOLoop

# from libmaelstrom import core, db, web
from libmaelstrom import app, core, db, web


###################################################
#   web application setup and startup
###################################################

def main():
    staticPath = os.path.dirname(os.path.realpath(__file__))+"/libmaelstrom/static"
    staticPath2 = os.path.dirname(os.path.realpath(__file__))+"/libmaelstrom/static2"
    dataPath = os.path.dirname(os.path.realpath(__file__))+"/data"

    wsgi_app = WSGIContainer(app)
    application = Application([

        (r"/", RedirectHandler, {"url": "/s/app.html"}),
        (r"/socket", core.ClientSocket),
        (r"/publish", core.Publisher),
        (r"/s/(.*)", StaticFileHandler, { "path" : staticPath }),
        (r"/s2/(.*)", StaticFileHandler, { "path" : staticPath2 }),
        # (r"/appsettings", web.AppSettingsHandler),
        # (r"/iocontrollers", web.IOControllersHandler),
        # (r"/iocontroller/([0-9]+)", web.IOControllerHandler),
        # (r"/iochambers/([0-9]+)", web.IOChambersHandler),
        # (r"/iochamber/([0-9]+)", web.IOChamberHandler),
        # (r"/iodevices/([0-9]+)", web.IODevicesHandler),
        # (r"/iodevice/([0-9]+)", web.IODeviceHandler),
        (r"/profiles", web.ProfilesHandler),
        (r"/profile/([0-9]+)", web.ProfileHandler),
        (r"/.*", FallbackHandler, dict(fallback=wsgi_app)),
    ])
    db.init_db(dataPath)
    application.listen(8888)
    IOLoop.instance().start()

if __name__ == "__main__":
    main()