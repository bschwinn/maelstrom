import socket
import os
import urllib, urllib2
import simplejson as json

from libmaelstrom import db

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
		else:
			print "socket file: " + sock + " doesn't exist."

	def parseData(self, data):
		return json.loads(data)

	def postData(self, channel, msg):
		data = urllib.urlencode(dict( channel = channel, data = json.dumps(msg) ))
		request = urllib2.Request(self.posturl, data)
		try: 
			response = urllib2.urlopen(request)
	 		html = response.read()
			print html
		except urllib2.URLError, e:
		    print e

	def createDataMessageTemplate(self):
		return dict( channel = "data", payload = dict( controllers = [] ) )

	def createLCDMessageTemplate(self):
		return dict( channel = "lcd", payload = dict( lcd = [] ) )

	def createChamberDic(self, chamber, cs):
		vars = dict( sp = 46.0, pv = 47.0, sp2 = 35.8, pv2 = 46.7 )
		mode = "profile"
		state = "cooling"
		time = 1000
		return dict( id = chamber.id, name = chamber.name, variables = vars, mode = mode, state = state, time = time )

	def createLCDMessage(self, controller, lcd):
		msg = self.createLCDMessageTemplate()
		larr = msg["payload"]["lcd"]
		for line in lcd:
			larr.append(line)
		return msg

	def createDataMessage(self, controller, cs):
		msg = self.createDataMessageTemplate()
		charr = []
		carr = msg["payload"]["controllers"]
		carr.append( dict( id = controller.id, name = controller.name, chambers = charr) )
		for chamber in controller.chambers:
			charr.append(self.createChamberDic(chamber, cs))
		return msg

# create the maelstrom -> brewpi bridge
bridge = BrewPiBridge()

# init db connection - this may create it if not there ?!?
db.init_db( os.path.dirname(os.path.realpath(__file__))+"/data" )

for controller in db.DBSession().query(db.IOController).all():
	lcd = bridge.getData(controller, "lcd")
	cs  = bridge.getData(controller, "getControlSettings")

	msg = bridge.createDataMessage(controller, cs)
	bridge.postData("data", msg)
	lmsg = bridge.createLCDMessage(controller, lcd)
	bridge.postData("lcd", lmsg)


