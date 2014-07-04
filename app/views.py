from flask import render_template, make_response, jsonify, url_for, request

import simplejson as json

from app import app, db, core, web

setman = web.AppSettingsManager()


@app.route('/', methods = ['GET'])
def get_app():
	return render_template("app.html", title = 'Maelstrom - A BrewPi Interface')


@app.route('/appsettings', methods = ['GET'])
def get_appsettings():
	setts = setman.get_appsettings()
	return jsonify( { 'appsettings': setts } )

@app.route('/appsettings', methods = ['POST'])
def save_appsettings():
	setman.save_appsettings(request.form["settings"])
	return jsonify( { 'status': 'success' } )



@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify( { 'error': 'Not found' } ), 404)

@app.errorhandler(500)
def error_500(error):
    return make_response(jsonify( { 'error': 'Somethings fucky: ' + error.message } ), 500)
