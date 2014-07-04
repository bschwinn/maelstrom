from flask import make_response, jsonify, url_for

from libmscope import app, db


@app.route('/', methods = ['GET'])
def get_app():
	return render_template("app.html", title = 'Maelstrom - A BrewPi Interface')


@app.route('/appsettings', methods = ['GET'])
def get_appsettings():
    session = db.DBSession()
    settings = session.query(db.AppSetting).all()
    d = []
    for setting in settings:
        d.append( dict( name = setting.name, value = setting.value) )
    return jsonify( { 'appsettings': d } )
