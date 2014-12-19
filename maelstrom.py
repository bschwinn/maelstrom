import os

from tornado.wsgi import WSGIContainer
from tornado.web import Application, StaticFileHandler, FallbackHandler
from tornado.ioloop import IOLoop

from app import app, core, db
from config import basedir

###################################################
#   web application setup and startup
###################################################

def startmeup():

    wsgi_app = WSGIContainer(app)

    application = Application([

        (r"/s/(.*)", StaticFileHandler, { "path" : basedir + "/app/static" }),
        (r"/socket", core.ClientSocket),
        (r"/publish", core.Publisher),
        (r".*", FallbackHandler, dict(fallback=wsgi_app)),
    ])

    CONN_STR = app.config['SQLALCHEMY_DATABASE_URI']

    print("Connection string is ? " + CONN_STR)

    db.init_db( CONN_STR )
    application.listen(8888)
    IOLoop.instance().start()

if __name__ == "__main__":
    startmeup()
