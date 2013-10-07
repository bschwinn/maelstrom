/**********************************************
 ******** Maelstrom SVG Widget Library ********
 **********************************************/

// temperature cotrolled vessel base class
//  - displays PV, SP and label
//  - methods to set/update these values
//  - represents multiple types of home-brew vessel
var BeerVessel = function(id, label, config) {
	if ( arguments.length > 0 ) this.init(id, label, config);
}
BeerVessel.CONICAL = 0;
BeerVessel.CARBOY = 10;
BeerVessel.CORNEY = 20;
BeerVessel.POT = 100;
BeerVessel.KEGGLE = 110;
BeerVessel.TUN = 120;
BeerVessel.prototype = {
	init: function(id, label, config) {
		this.id = id;
		this.svgId = this.id + '_svg';
		this.gNodeId = this.id + '_gNode';
		this.valueSPId = this.id + '_value-sp'
		this.valuePVId = this.id + '_value-pv'
		this.skinGradientId = this.id + '_metalTankSkin';
		this.label = label;
		this.config = (typeof(config) !== 'undefined' && config != null ) ? config : {};
		this.defaultConfig = { 
			offX: 5, 
			offY: 5, 
			width: 300, 
			height: 360, 
			lineColor: '#000', 
			lineWidth: 2, 
			vesselStyle: BeerVessel.CONICAL, 
			labelSize: 36, 
			labelStyle: 'arial,helvetica', 
			labelColor: '#000',
			hideLabel: false,
			hideValues: false
		};
		this.config = $.extend(true, {}, this.defaultConfig, this.config);
		this.draw();
	},
	createDefs: function() {
		var svgNode = $('<svg></svg>'); // dummy wrapper
		var defsNode  = $('<defs></defs>');
		var gradSkin = $('<linearGradient></linearGradient>').attr('id', this.skinGradientId);
		gradSkin.attr('x1', 1).attr('y1', 0).attr('x2', 0).attr('y2', 0);
		var stop = $('<stop></stop>').attr('offset', '15%').attr('stop-color', 'grey');
		gradSkin.append(stop);
		var stop1 = $('<stop></stop>').attr('offset', '100%').attr('stop-color', 'white');
		gradSkin.append(stop1);
		defsNode.append(gradSkin);
		svgNode.append(defsNode);
		return svgNode.html();
	},
	createNode: function() {
		var svgNode = $('<svg></svg>'); // dummy wrapper
		var gNode = $('<g></g>').attr('id', this.gNodeId);
		this.createVessel(gNode);
		if ( !this.config.hideLabel ) this.createLabel(gNode);
		if ( !this.config.hideValues ) this.createValues(gNode);
		svgNode.append(gNode);
		return svgNode.html();
	},
	createVessel: function(gNode) {
		switch(this.config.vesselStyle) {
			case BeerVessel.CARBOY :
				this.createCarboy(gNode);
				break;
			case BeerVessel.POT :
				this.createPot(gNode);
				break;
			case BeerVessel.CONICAL :
				this.createConical(gNode);
				break;
		}
	},
	createLabel: function(gNode) {
		var labelY = (this.getTextOffset()-this.config.labelSize);
		var txt = $('<text></text>').text(this.label);
		txt.attr('fill', this.config.labelColor).attr('stroke', this.config.labelColor);
		txt.attr('font-size', this.config.labelSize).attr('font-family',this.config.labelStyle);
		txt.attr('text-anchor', 'middle');
		txt.attr('x', this.config.width/2).attr('y', labelY );
		gNode.append(txt);
	},
	createValues: function(gNode) {
		var valueY = (this.getTextOffset()+this.config.labelSize);
		var txt = $('<text></text>').attr('id', this.valueSPId).text('SP: ##.#');
		txt.attr('fill', this.config.labelColor).attr('stroke', this.config.labelColor);
		txt.attr('font-size', this.config.labelSize).attr('font-family',this.config.labelStyle);
		txt.attr('text-anchor', 'middle');
		txt.attr('x', this.config.width/2).attr('y', valueY );
		gNode.append(txt);
		var valueY2 = (this.getTextOffset()+(2*this.config.labelSize));
		var txt2 = $('<text></text>').attr('id', this.valuePVId).text('PV: ##.#');
		txt2.attr('fill', this.config.labelColor).attr('stroke', this.config.labelColor);
		txt2.attr('font-size', this.config.labelSize).attr('font-family',this.config.labelStyle);
		txt2.attr('text-anchor', 'middle');
		txt2.attr('x', this.config.width/2).attr('y', valueY2 );
		gNode.append(txt2);
	},
	createConical: function(gNode) {
		// account for tank top in y offset
		var domeHeight = this.config.width/4;
		var polyCheat = this.config.lineWidth;
		var neckWidth = (0.1*(this.config.width/2));
		var offY = (this.config.offY + domeHeight + 10);
		gNode.attr('transform', 'translate(' + this.config.offX + ',' + offY + ')');
		gNode.attr('stroke', this.config.lineColor);
		gNode.attr('stroke-width', this.config.lineWidth);
		gNode.attr('fill', 'url(#' + this.skinGradientId + ')');
		var elli = $('<ellipse></ellipse>').attr('cx', this.config.width/2 ).attr('cy', 0);
		elli.attr('rx', this.config.width/2).attr('ry', domeHeight);
		gNode.append(elli);
		var rect = $('<rect></rect>').attr('x', 0 ).attr('y', 0);
		var coneHeight = (0.33 * this.config.height);
		var bodyHeight = this.config.height - offY - coneHeight;
		rect.attr('width', this.config.width).attr('height', bodyHeight);
		gNode.append(rect);
		var cone = $('<polygon></polygon>');
		cone.attr('transform', 'translate(0,' + (bodyHeight + 0) + ')');
		var points = (this.config.width-polyCheat) + ',0';
		points += ' ' + (this.config.width/2 + (neckWidth)) + ',' + coneHeight;
		points += ' ' + (this.config.width/2 - (neckWidth)) + ',' + coneHeight;
		points += ' ' + (polyCheat) + ',0';
		cone.attr('points', points);
		gNode.append(cone);
	},
	createCarboy: function(gNode) {
		// account for tank top in y offset
		var lipHeight = this.config.width/40;
		var lipWidth = this.config.width/20;
		var offY = (this.config.offY + lipHeight);
		var neckHeight = (this.config.width/4);
		var neckWidth = (0.1*(this.config.width/2));
		var polyCheat = this.config.lineWidth + 10;
		gNode.attr('transform', 'translate(' + this.config.offX + ',' + offY + ')');
		gNode.attr('stroke', this.config.lineColor);
		gNode.attr('stroke-width', this.config.lineWidth);
		gNode.attr('fill', 'url(#' + this.skinGradientId + ')');
		var neck = $('<polygon></polygon>');
		//neck.attr('transform', 'translate(0,' + offY + ')');
		var points = ' ' + (polyCheat) + ',' + neckHeight;
		points += ' ' + (this.config.width/2 - neckWidth) + ',0';
		points += ' ' + (this.config.width/2 + neckWidth) + ',0';
		points += ' ' + (this.config.width-polyCheat) + ',' + neckHeight;
		neck.attr('points', points);
		gNode.append(neck);
		var elli = $('<ellipse></ellipse>').attr('transform', 'translate(' + (this.config.width/2 - lipWidth) + ',0)');
		elli.attr('cx', this.config.width/20).attr('cy', 0);
		elli.attr('rx', this.config.width/20).attr('ry', lipHeight);
		gNode.append(elli);
		var rect = $('<rect></rect>').attr('x', 0 ).attr('y', neckHeight);
		rect.attr('rx', 10);
		var bodyHeight = this.config.height - offY - neckHeight;
		rect.attr('width', this.config.width).attr('height', bodyHeight);
		gNode.append(rect);
	},
	createPot: function(gNode) {
		var lipHeight = this.config.width/40;
		gNode.attr('transform', 'translate(' + this.config.offX + ',' + this.config.offY + ')');
		gNode.attr('stroke', this.config.lineColor);
		gNode.attr('stroke-width', this.config.lineWidth);
		gNode.attr('fill', 'url(#' + this.skinGradientId + ')');
		var pot = $('<polygon></polygon>');
		var points = '0,0 ' + lipHeight + ',' + lipHeight;
		points += ' ' + lipHeight + ',' + (this.config.height - (lipHeight*2));
		points += ' ' + (lipHeight*2) + ',' + (this.config.height - (lipHeight));
		points += ' ' + (this.config.width - (lipHeight*2)) + ',' + (this.config.height - (lipHeight));
		points += ' ' + (this.config.width - (lipHeight)) + ',' + (this.config.height - (lipHeight*2));
		points += ' ' + (this.config.width - (lipHeight)) + ',' + (lipHeight);
		points += ' ' + (this.config.width) + ',0';
		pot.attr('points', points);
		gNode.append(pot);
	},
	getTextOffset: function() {
		switch(this.config.vesselStyle) {
			case BeerVessel.CARBOY :
				return this.config.height/1.5;
			case BeerVessel.POT :
				return this.config.height/2;
			case BeerVessel.CONICAL :
				return this.config.height/4;
		}
	},
	setValues: function(newSP, newPV) {
		if ( !this.config.hideValues )  {
			$('#' + this.valueSPId).text('SP: ' + newSP);
			$('#' + this.valuePVId).text('PV: ' + newPV);
		}
	},
	draw: function() {
		$('#' + this.id).html( '<svg id="' + this.svgId + '" height="' + (this.config.height+1) + '">' + this.createDefs() + this.createNode() + '</svg>');
	}
}
