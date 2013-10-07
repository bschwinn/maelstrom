import time
import socket
import os


debug = 1

socketFile = '/home/brewpi/BEERSOCKET'

postDataUrl = "http://localhost:8888/publish"
postDataChannel = ""

def getSocketData(msg):
	if os.path.exists(socketFile):
		try:
			s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
			s.connect(socketFile)
			s.send(msg, 4096)
			resp = s.recv(4096)
			return resp
		except socket.timeout:
			return "Oh No, Socket timed out man."

	else:
		return "Oh No, No socket file, bailing out."


lcd = getSocketData("lcd")
cc = getSocketData("getControlConstants")
cs = getSocketData("getControlSettings")
cv = getSocketData("getControlVariables")


if debug:
	print "LCD: "
	print lcd
	print "Control Constants: "
	print cc
	print "Control Settings: "
	print cs
	print "Control Variables: "
	print cv
