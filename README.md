maelstrom
=========

Started out as messing around with Websockets and Tornado, ended up building a little REST and PUSH server which then evolved into a full brewing UI.  Use case is temperature control for mashing and fermentation, so wanted to do some websockets for things like data updates and alarms, etc.  Also need RESTful APIs for things like managing temperature profiles, device interfacing (arduino).  And what app doesn't need a "settings" api ?

What's it do now?
----------------------------
At the moment, the API (python server) and client (js) make an app that does the following.
Server side:
 - RESTful inteface to save "settings" (key/value pairs) in an SQLite db
 - websocket interface and a channels semantic (pub/sub)
 - POST inteface to publish messages to a channel (pushed down to clients)
Client side:
 - saves channel subscriptions in "settings" API (useful for page reload)
 - reads saved channel subscriptions from "settings" API at startup and re-subscribes
 - three widgets that each display messages from a channel
 -- the "lcd" channel is lightweight but frequently updated temperature data
 -- the "logs" channel is for server/device logging (diagnostics type data)
 -- the "alarms" channel is for ALARMS - things like "not reaching setpoint in time", "pilot light out", "high liquid level", etc.


Bootstrapping
----------------------------
To run this, you need a working python 2.7 install which includes simplejson, sqlite3 and tornado (at least).  After grabbing the Gist, you'll need jquery so create a "js" directory inside the gist directory and copy your version of jquery there.


Running it
----------------------------
To run the web server:
python test-tornado.py

To browse the app:
http://localhost:8888/s/main.html

You can either use the UI to publish messages (helps to have page open in Firefox and Chrome) or run the data posting script below:
./test-post-data.sh

It's a simple post interface to deliver a message on a channel.