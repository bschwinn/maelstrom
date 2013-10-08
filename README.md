maelstrom
=========

Started out as messing around with Websockets and Tornado, ended up building a little REST and PUSH server which then evolved into a full brewing UI.  Use case is temperature control for mashing and fermentation, so wanted to do some websockets for things like data updates and alarms, etc.  Also need RESTful APIs for things like managing temperature profiles, device interfacing (arduino).  And what app doesn't need a "settings" api ?

What's it do now?
----------------------------
At the moment, the server and client make an app that does the following.
Server side:
 - websocket interface and a channels semantic (pub/sub)
 - RESTful inteface to save "app settings" in an SQLite db - simple key/value pairs
 - RESTful inteface to save "io configuration" in an SQLite db - arduinos and their IO
 - RESTful inteface to save "temperature profiles" in an SQLite db - temperature settings by date
 - POST inteface to publish messages to a channel (pushed down to clients)
Client side:
 - socket connection with pub/sub functionality
 - javascript interfaces to the RESTful interfaces mentioned above
 - subscribes to channels to revieve pushed events
 -- "data" channel is for data updates (SPs, PVs, modes, etc)
 -- "logs" channel is for server/device logging (diagnostics type data)
 -- "alarms" channel is for ALARMS - things like "not reaching setpoint in time", "pilot light out", "high liquid level", etc.


Bootstrapping
----------------------------
Instructions to run this from a working BrewPi installation are below.  Working on clean ubuntu instructions.

To run this from a BrewPi installation:

```
sudo apt-get install python-pip
sudo pip install tornado
sudo pip install sqlalchemy

```


Running it
----------------------------
To run the web server, invoke this command from the root dir:

```
python maelstrom.py
```

Then browse the app here:

http://localhost:8888/

Testing it
----------------------------
To run some tests, which generate things like temperature profiles, io configuration and settings, simply select the "Debugger" tab.  At the bottom you'll see a "Test Simulations" section.  These buttons will generate test scenarios, things like calling the RESTful APIs, publishing message on the data channel, etc.

 - *Generate Alarm* - generates alarms events on the "alarms" channel
 - *Ack Alarms* - publishes an acknowledgement to the "alarms" channel


Project Layout
----------------------------
The main file, maelstrom.py, sets up routes and launches a tornado webserver.  The web server, data model and core server implementation are in the libmaelstrom directory.  The client is pure html/js/css and lives in the libmaelstrom/static directory.  The sqlite database will be created as a file: <ROOT>/data/db
