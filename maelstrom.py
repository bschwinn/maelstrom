import os

from tornado.wsgi import WSGIContainer
from tornado.web import Application, StaticFileHandler, RedirectHandler, FallbackHandler
from tornado.ioloop import IOLoop

from app import app, core, db
from config import basedir


###################################################
#   web application setup and startup
###################################################

def main():

    wsgi_app = WSGIContainer(app)

    application = Application([

        (r"/s/(.*)", StaticFileHandler, { "path" : basedir + "/app/static" }),
        (r"/socket", core.ClientSocket),
        (r"/publish", core.Publisher),
        # (r"/iocontrollers", web.IOControllersHandler),
        # (r"/iocontroller/([0-9]+)", web.IOControllerHandler),
        # (r"/iochambers/([0-9]+)", web.IOChambersHandler),
        # (r"/iochamber/([0-9]+)", web.IOChamberHandler),
        # (r"/iodevices/([0-9]+)", web.IODevicesHandler),
        # (r"/iodevice/([0-9]+)", web.IODeviceHandler),
        (r".*", FallbackHandler, dict(fallback=wsgi_app)),
    ])
    db.init_db(app.config['SQLALCHEMY_DATABASE_URI'])
    application.listen(8888)
    IOLoop.instance().start()

if __name__ == "__main__":
    main()
