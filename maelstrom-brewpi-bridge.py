import socket
import os

from libmaelstrom import db

dataPath = os.path.dirname(os.path.realpath(__file__))+"/data"
db.init_db(dataPath)

# deals wit getting json from the socket
class SockMan:
	def getData(self, sock, msg):
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
		print ":::::::::::::::::::data::::::::::::::::::::"
		print data
		return json.loads(data)

# deals wit posting datas
class PostMan:
	channel = "data"
	posturl = "http://localhost:8888/publish"
	def postData(self, msg):
		data = urllib.urlencode(msg)
		request = urllib2.Request(url, data)
		response = urllib2.urlopen(request)
		html = response.read()
		print html

# deals wit creating messages
class MessMan:
	def createMessage(self, lcd, cc, cs, cv):
		return ""

sockman = SockMan()
postman = PostMan()
messman = MessMan()

for controller in db.DBSession().query(db.IOController).all():
	lcd = sockman.getData(controller.socket, "lcd")
	cc  = sockman.getData(controller.socket, "getControlConstants")
	cs  = sockman.getData(controller.socket, "getControlSettings")
	cv  = sockman.getData(controller.socket, "getControlVariables")

	msg = messman.createMessage(lcd,cc,cs,cv)

	postman.postData(msg)

