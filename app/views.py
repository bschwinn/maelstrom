from flask import render_template, make_response, jsonify, url_for, request

import simplejson as json

from app import app, db, core, dao

# data access managers
setman = dao.AppSettingsManager()
profman = dao.ProfileManager()
ioman = dao.IOControllerManager()


# main view - angular does most of the work here
@app.route('/', methods = ['GET'])
def get_app():
	return render_template("app.html", title = 'Maelstrom - A BrewPi Interface')


# app settings api

@app.route('/appsettings', methods = ['GET'])
def get_appsettings():
	setts = setman.get_appsettings()
	return jsonify( { 'appsettings': setts } )

@app.route('/appsettings', methods = ['POST'])
def save_appsettings():
	setman.save_appsettings(json.loads(request.form["settings"]))
	return jsonify( { 'status': 'success' } )


# profiles api

@app.route('/profiles', methods = ['GET'])
def get_profiles():
	profs = profman.get_profiles()
	return jsonify( { 'profiles': profs } )

@app.route('/profiles', methods = ['POST'])
def create_profile():
	profman.create_profile(json.loads(request.form["profile"]))
	return jsonify( { 'status': 'success' } )

@app.route('/profile/<id>', methods = ['GET'])
def get_profile(id):
	prof = profman.get_profile(id)
	return jsonify( { 'profile': prof } )

@app.route('/profile/<id>', methods = ['POST'])
def update_profile(id):
	profman.update_profile(id, json.loads(request.form["profile"]))
	return jsonify( { 'status': 'success' } )


# controllers api

@app.route('/iocontrollers', methods = ['GET'])
def get_controllers():
	controllers = ioman.get_controllers()
	return jsonify( { 'controllers': controllers } )

@app.route('/iocontrollers', methods = ['POST'])
def create_controller():
	ioman.create_controller(json.loads(request.form["iocontroller"]))
	return jsonify( { 'status': 'success' } )

@app.route('/iocontroller/<id>', methods = ['POST'])
def update_controller(id):
	ioman.update_controller(id, json.loads(request.form["iocontroller"]))
	return jsonify( { 'status': 'success' } )


# error response handlers

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not found' } ), 404)

@app.errorhandler(500)
def error_500(error):
    return make_response(jsonify( { 'error': 'Somethings fucky: ' + error.message } ), 500)
