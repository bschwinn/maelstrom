from sqlalchemy import Column, Integer, DateTime, Numeric, Text, VARCHAR, Table, ForeignKey
from sqlalchemy import create_engine, bindparam, func, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker, relationship

###################################################
#   Models and Migrations?
###################################################

DBSession = scoped_session(sessionmaker())
Base = declarative_base()

def init_db(connstr):
    engine = create_engine(connstr)
    DBSession.configure(bind=engine)
    Base.metadata.create_all(engine)



# app settings (name/value pairs)
class AppSetting(Base):
    __tablename__ = 'appsetting'
    id = Column(Integer, primary_key=True)
    name = Column(VARCHAR(1024))
    value = Column(VARCHAR(1024))
    
    def __init__(self, name, value):
        self.name, self.value = name, value



# temperature profiles
class ProfileEvent(Base):
    __tablename__ = 'profileEvent'
    id = Column(Integer, primary_key=True)
    profile_id = Column(Integer, ForeignKey("profile.id", ondelete='CASCADE'))
    day = Column(Numeric)
    date = Column(DateTime)
    eventText = Column(VARCHAR(2048))
    def __init__(self, profile_id, day, date, eventText):
        self.profile_id, self.day, self.date, self.eventText = profile_id, day, date, eventText

class ProfileTemperature(Base):
    __tablename__ = 'profileTemperature'
    id = Column(Integer, primary_key=True)
    profile_id = Column(Integer, ForeignKey("profile.id", ondelete='CASCADE'))
    day = Column(Numeric)
    date = Column(DateTime)
    temperature = Column(Numeric)
    def __init__(self, profile_id, day, date, temperature):
        self.profile_id, self.day, self.date, self.temperature = profile_id, day, date, temperature

class Profile(Base):
    __tablename__ = 'profile'
    id = Column(Integer, primary_key=True)
    name = Column(VARCHAR(1024))
    type = Column(VARCHAR(1024))
    temperatures = relationship("ProfileTemperature", passive_deletes=True)
    events = relationship("ProfileEvent", passive_deletes=True)
    
    def __init__(self, **kwargs):
        for i in self.__table__.columns:
            if i.name in kwargs:
                setattr(self, i.name, kwargs[i.name])




# io settings - controllers (arduinos) -> devices (inputs/outputs)
class IODevice(Base):
    __tablename__ = 'iodevice'
    id = Column(Integer, primary_key=True)
    iochamber_id = Column(Integer, ForeignKey("iochamber.id", ondelete='CASCADE'))
    name = Column(VARCHAR(1024)) # what's in a name ?
    slot = Column(VARCHAR(1024)) # ??
    devicetype = Column(VARCHAR(1024)) # temp sensor, digital out, etc.
    hardwaretype = Column(VARCHAR(1024)) # one-wire, pin, etc.
    function = Column(VARCHAR(1024)) # beer temp, chamber temp, chamber heat/cool/fan, etc.
    def __init__(self, iochamber_id, name, slot, devicetype, hardwaretype, function):
        self.iochamber_id, self.name, self.slot, self.devicetype, self.hardwaretype, self.function = iochamber_id, name, slot, devicetype, hardwaretype, function

class IOChamber(Base):
    __tablename__ = 'iochamber'
    id = Column(Integer, primary_key=True)
    name = Column(VARCHAR(1024))
    iocontroller_id = Column(Integer, ForeignKey("iocontroller.id", ondelete='CASCADE'))
    devices = relationship("IODevice", passive_deletes=True)
    def __init__(self, iocontroller_id, name):
        self.iocontroller_id, self.name = iocontroller_id, name

class IOController(Base):
    __tablename__ = 'iocontroller'
    id = Column(Integer, primary_key=True)
    name = Column(VARCHAR(1024))
    address = Column(VARCHAR(1024))
    port = Column(VARCHAR(1024))
    socket = Column(VARCHAR(1024))
    chambers = relationship("IOChamber", passive_deletes=True)
    
    def __init__(self, **kwargs):
        for i in self.__table__.columns:
            if i.name in kwargs:
                setattr(self, i.name, kwargs[i.name])

