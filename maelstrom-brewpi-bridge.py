import socket, os, time
import urllib, urllib2
import simplejson as json

from app import db
from config import SQLALCHEMY_DATABASE_URI

# bridges maelstrom and brewpi.py
#  - reads controller config from maelstrom and for each controller:
#  - connects to socket and aggregates controller data, then creates
#  - a maelstrom data update event and publishes it to maelstrom server.
class BrewPiBridge:

	posturl = "http://localhost:8888/publish"

	def getData(self, controller, msg):

		# TODO deal with inet sockets
		sock = controller.socket

		if os.path.exists(sock):
			try:
				s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
				s.connect(sock)
				s.send(msg, 4096)
				resp = s.recv(4096)
				return self.parseData(resp)
			except socket.timeout:
				print "socket timed out."
			except socket.error:
				print "socket error, trying again next time..."
		else:
			print "socket file: " + sock + " doesn't exist."

	def parseData(self, data):
		return json.loads(data)

	def postData(self, channel, msg):
		data = urllib.urlencode(dict( channel = channel, data = json.dumps(msg) ))
		request = urllib2.Request(self.posturl, data)
		try: 
			response = urllib2.urlopen(request)
		except urllib2.URLError, e:
		    print e

	def createDataMessageTemplate(self, pload):
		return dict( channel = "data", payload = pload )

	def createDataMessage(self, controller, lcd, cs):
		larr = []
		bv="0.0"
		fv="0.0"
		for line in lcd:
			if ( line.startswith('Beer') ):
				bv = line[6:10]
			elif ( line.startswith('Fridge') ):
				fv = line[6:10]
			larr.append(line)
		payload = dict( controllerId = controller.id, controllerName = controller.name, fridge = fv, fridgeSet = cs['fridgeSet'], beer = bv, beerSet = cs['beerSet'], status = larr[-1])
		if cs['mode'] == 'p':
			payload.update( dict(profile = cs['profile']))
		return self.createDataMessageTemplate(payload)

# create the maelstrom -> brewpi bridge
bridge = BrewPiBridge()

# init db connection - this may create it if not there ?!?
db.init_db( SQLALCHEMY_DATABASE_URI )

while True:

	for controller in db.DBSession().query(db.IOController).all():

		lcd = bridge.getData(controller, "lcd")
		# ['Mode   Off          ', 'Beer   65.1  --.- &degF', 'Fridge 65.9  --.- &degF', 'Idling for  17h30m55']
		cs  = bridge.getData(controller, "getControlSettings")
		# {'profile': 'Sound Czech Pilsner', 'heatEst': 1.855, 'fridgeSet': 82.26, 'dataLogging': 'active', 'beerSet': 64.26, 'mode': 'p', 'coolEst': 22.16}

		msg = bridge.createDataMessage(controller, lcd, cs)

		print str(msg)

		bridge.postData("data", msg)

	time.sleep(7)
