import simplejson as json

from tornado.web import RequestHandler
from tornado.websocket import WebSocketHandler


#   connection and subscription manager
###################################################

# TODO: maybe store channels and/or subscriptions in a DB ?
class ConnectionMgr:

    connections = []
    channels = { 
        'alarms' : [],
        'data' : [], 
        'logs' : [], 
        '_profiles' : [],
        '_iocontrollers' : [],
        '_appsettings' : []
    }

    def getChannels(self):
        return self.channels.keys()

    def getChannel(self, name):
        return self.channels.get(name)

    def hasChannel(self, name):
        return (name in self.channels.keys())

    def publishMessage(self, channel, data):
        if self.hasChannel(channel):
            for socket in self.getChannel(channel):
                socket.write_message(json.dumps({"channel" : channel, "data" : data}))
            return True
        else:
            return False

    def addConnection(self, conn):
        self.connections.append(conn)

    def removeConnection(self, conn):
        self.connections.remove(conn)

    def addSubscription(self, channel, conn):
        self.channels.get(channel).append(conn)

    def removeSubscription(self, channel, conn):
        self.channels.get(channel).remove(conn)

    def sendHeartbeat(self, conn):
        if conn in self.connections:
            data = json.dumps( dict( payload = dict( action = "pong" )) ) # data is a string, TODO make sure this is sound
            msg = dict( channel = "_heartbeat", data = data )
            conn.write_message(json.dumps(msg))

# static/global instance - need better python skills here
# the connection mgr keeps connection/subscription state
theMan = ConnectionMgr()



# websocket handler supporting sub/unsub to channels (topics)
###################################################

class ClientSocket(WebSocketHandler):
    def open(self):
        theMan.addConnection(self)
        print "WebSocket opened"

    def on_message(self, message):
        msg = json.loads(message)

        if msg.get('channel') == "_heartbeat" and msg.get('action') == "ping":
            theMan.sendHeartbeat(self)
        elif theMan.hasChannel(msg.get('channel')):
            if msg.get('action') == 'subscribe':
                print "subscribing to channel: " + msg.get('channel')
                theMan.addSubscription(msg.get('channel'), self)
            elif msg.get('action') == 'unsubscribe':
                print "unsubscribing from channel: " + msg.get('channel')
                theMan.removeSubscription(msg.get('channel'), self)

    def on_close(self):
        print "WebSocket closed"
        theMan.removeConnection(self)
        for channel in theMan.getChannels():
            for socket in theMan.getChannel(channel):
                if socket == self:
                    theMan.removeSubscription(channel, self)
                    break


# RESTful interface to publish a message to a channel
###################################################

class Publisher(RequestHandler):
    def post(self, *args, **kwargs):
        data = self.get_argument('data')
        channel = self.get_argument('channel')
        if theMan.publishMessage(channel, data):
            self.write('Posted')
        else:
            self.write('Unsupported channel: ' + channel)

