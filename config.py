import os
basedir = os.path.abspath(os.path.dirname(__file__))

SQLALCHEMY_DATABASE_URI = os.path.dirname(os.path.realpath(__file__))+"/data"

SQLALCHEMY_MIGRATE_REPO = os.path.join(basedir, 'db_repository')
