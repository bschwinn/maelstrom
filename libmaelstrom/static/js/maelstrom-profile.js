/*
 * Temperature Profile Table
 * config is:
 * {
 *   tableClass: "<css class name for table>",
 *   theadClass: "<css class name for thead>",
 *   tbodyClass: "<css class name for tbody>",
 *   editable: true|false,
 *   contextMenuCssClass: "<context menu class>",
 *   contextMenuDisplayHandler: "<context menu shown/hidden event handler>"
 * }
 */

function TemperatureProfileTable(id, startDate, config) {
    "use strict";
    if (arguments.length > 0 ) {
        this.init(id, startDate, config);
    }
}

TemperatureProfileTable.prototype = {
    init: function(id, startDate, config) {
        "use strict";
        this.id = id;
        this.startDate = startDate;
        this.profileName = '';
        this.config = (config || {});
        this.config.timeFormat = 'HH:mm:ss';
        this.selector = '#' + this.id;
        this.menuId = this.id + 'Menu';
        this.menuSelector = '#' + this.menuId;
        this.bodySelector = this.selector + ' tbody';
        this.headSelector = this.selector + ' thead';
        this.footSelector = this.selector + ' tfoot';
        this.rowsSelector = this.bodySelector + ' tr';
        this.newTable = '<table border="0"><thead></thead><tbody></tbody><tfoot></tfoot></table>';
        this.newRow = '<tr></tr>';
        this.newCell = '<td></td>';
        this.newHeadCell = '<th></th>';
        this.numMilliSecondsPerDay = 24 * 60 * 60 * 1000;
        this.headerTitles = ['Day', 'Temperature', 'Date and Time'];
        this.csvColumns = ['date', 'temperature', 'days'];
        this.prepTable();
    },
    render: function(data) {
        "use strict";
        this.profileName = data.name;
        this.renderHeader();
        this.renderRows(data.temperatures);
        this.renderFooter();
        // start date inferred from first data row, if not present (empty profile), use current date/time
        // var initialDate = this.parseStartDate(data.temperatures);
        // this.updateDisplay( initialDate );
        this.updateDisplay( this.startDate );
    },
    prepTable: function() {
        "use strict";
        var table = $(this.newTable).attr('class', this.config.tableClass);
        $(this.selector).append(table);
        $(this.headSelector).addClass(this.config.theadClass);
        $(this.bodySelector).addClass(this.config.tbodyClass);
    },
    renderHeader: function() {
        "use strict";
        if($(this.headSelector + " th").length > 0){
            return; // header already rendered
        }
        var headerRow = $(this.newRow);
        $(this.headSelector).append(headerRow);
        var cell = $(this.newHeadCell).text(this.headerTitles[0]);
        headerRow.append(cell);
        cell = $(this.newHeadCell).text(this.headerTitles[1]);
        headerRow.append(cell);
        cell = $(this.newHeadCell).text(this.headerTitles[2]);
        headerRow.append(cell);
    },
    renderRows: function(rows) {
        "use strict";
        this.clearRows();
        for( var i=0; i<rows.length; i++ ) {
            this.renderRow( rows[i] );
        }
        if ( this.config.editable ) {
            this.addRow();
        }
    },
    renderRow: function(rowData) {
        "use strict";
        var newRow = this.createRow(rowData.days, rowData.temperature, rowData.date);
        $(this.bodySelector).append(newRow);
    },
    renderFooter: function() {
    },
    addRow: function() {
        "use strict";
        var $newRow = this.createRow();
        $(this.bodySelector).append($newRow);
    },
    insertRow: function(index, afterOrBefore) {
        "use strict";
        var row = this.createRow();
        if ( afterOrBefore ) {
            $(this.rowsSelector).eq(index).after(row);
        } else {
            $(this.rowsSelector).eq(index).before(row);
        }
        this.updateDisplay();
        row.find('td.profileDays').focus();
    },
    insertRowNow: function() {
        "use strict";
        var nowTime = new Date().getTime();
        var timeDiff = nowTime - this.startDate().getTime();
        var days = (timeDiff / this.numMilliSecondsPerDay).toFixed(2);
        var rows = this.getProfileData();
        var rowIndex = rows.length - 1;
        var temperature = '';
        for( var i=0; i<rows.length; i++ ) {
            if ( parseFloat(rows[i].days) > parseFloat(days)) {
                rowIndex = i-1;
                break;
            }
        }
        if( rowIndex + 1  < rows.length ){
            var previousTemperature = parseFloat(rows[rowIndex].temperature);
            var nextTemperature = parseFloat(rows[rowIndex+1].temperature);
            var previousDays = parseFloat(rows[rowIndex].days);
            var nextDays = parseFloat(rows[rowIndex+1].days);
            temperature = (previousTemperature + (nextTemperature - previousTemperature)*(days-previousDays)/(nextDays-previousDays)).toFixed(2);
        }
        var row = this.createRow(days, temperature);

        $(this.rowsSelector).eq(rowIndex).after(row);
        this.updateDisplay();
        row.find('td.profileTemp').focus();
    },
    deleteRow: function(index) {
        "use strict";
        $(this.rowsSelector).eq(index).remove();
        var me = this;
        this.updateDisplay();
    },
    createRow: function(days, temp, theDate) {
        "use strict";
        var $newRow = $(this.newRow);
        var cell = $(this.newCell).addClass('profileDays').html( (days) );
        this.attachCellHandlers(cell, true); // attach selectAll and blur
        $newRow.append(cell);
        cell = $(this.newCell).addClass('profileTemp').html( (temp) );
        this.attachCellHandlers(cell, false); // attach just selectAll
        $newRow.append(cell);
        cell = $(this.newCell).addClass('profileDate').html( (theDate) );
        $newRow.append(cell);
        this.attachRowHandlers($newRow);
        return $newRow;
    },
    attachRowHandlers: function($row) {
        "use strict";
        $row.bind( "click", function() {
            $(this).addClass("selected").siblings().removeClass("selected");
        });
        var me = this;
        if (this.config.editable) {
            $row.bind("contextmenu",function(e) {
                $(this).addClass("selected").siblings().removeClass("selected");
                var selectedIndex = $(this).data('rowIndex');
                var newMenu = me.createContextMenu(selectedIndex);
                $(me.selector).append(newMenu);
                me.positionMenu(e, newMenu);
                newMenu.show();
                if ( me.config.contextMenuDisplayHandler !== null ) {
                    me.config.contextMenuDisplayHandler(true);
                }
                e.preventDefault();
            });
        }
    },
    attachCellHandlers: function($theCell, daysCell) {
        "use strict";
        var me = this;
        if ( this.config.editable ) {
            $theCell.attr('contenteditable', 'true').focus(function() {
                me.selectAll(this);
            }).blur(function() {
                if ( !me.preventFocusEvents && !me.hasEmptyDayCells() ) {
                    me.maintainEmptyRow();
                    me.maintainZeroRow();
                    me.updateDisplay();
                }
            });
        }
    },
    clearRows: function() {
        "use strict";
        $(this.bodySelector).empty();
    },
    createContextMenu: function(index) {
        "use strict";
        if ( $(this.menuSelector).length ) {
            $(this.menuSelector).remove();
            console.log("closing already open menu");
        }
        var me = this;
        var $menu = $('<div></div>').attr('id', this.menuId).addClass(this.config.contextMenuCssClass);
        var $list = $('<ul></ul>');
        var $item = $('<li></li>').addClass("insertBefore").text('Insert Row Before').click( function() { me.insertRow(index, false); me.closeContextMenu(); });
        $list.append($item);
        $item = $('<li></li>').addClass("insertAfter").text('Insert Row After').click( function() { me.insertRow(index, true); me.closeContextMenu(); });
        $list.append($item);
        $item = $('<li></li>').addClass("delete").text('Delete Row').click( function() { me.deleteRow(index); me.closeContextMenu(); });
        $list.append($item);
        $menu.append($list);

        return $menu;
    },
    positionMenu: function(e, newMenu){

        // TODO: needs edge detection

        "use strict";
        newMenu.css("top", $(e.target).position().top + e.offsetY);
        newMenu.css("left", $(e.target).position().left + e.offsetX);
    },
    closeContextMenu: function() {
        "use strict";
        $(this.menuSelector).remove();
        if ( this.config.contextMenuDisplayHandler !== null ) {
            this.config.contextMenuDisplayHandler(false);
        }
    },
    updateDisplay: function(initialDate) {
        "use strict";
        if ( initialDate != null ) {
            this.startDate = initialDate;
        }
        if ( this.startDate != null ) {
            // ensure up to date row index - used in sorting
            var rowIdx = 0;
            $(this.rowsSelector).each(function() {
                $(this).data('rowIndex', rowIdx);
                rowIdx++;
            });
            // get dom table rows and sort them
            var rows = $(this.rowsSelector).get();
            rows.sort(function(a,b) {
                var v1 = parseFloat($(a).find('td.profileDays').text());
                var v2 = parseFloat($(b).find('td.profileDays').text());
                if ( isNaN(v1) || isNaN(v1) || (v1 == v2) ) {
                    return parseInt($(a).data('rowIndex')) - parseInt($(b).data('rowIndex'));
                } else {
                    return v1 - v2;
                }
            });
            // re-append table rows to get them in sorted order in the actual dom/table
            var idx = 0;
            var that = this;
            $.each(rows, function(index, row) {
                // calc next date with current duration (days)
                var strDays = $(row).find("td.profileDays").text();
                if ( typeof( strDays ) !== "undefined" && strDays !== '' ) {
                    var dates = that.formatNextDate(that.startDate, strDays);
                    $(this).find("td.profileDate").text( dates.display ).data('profile-date', dates.raw);
                }
                // striping/styling
                var add = 'even';
                var rmv = 'odd';
                if ( idx % 2 === 1 ) {
                    add = 'odd';
                    rmv = 'even';
                }
                $(row).addClass(add).removeClass(rmv).removeClass("selected").data('rowIndex', idx); // keep rowIndex up to date, used for positioning in insert/delete rows
                // simply re-append row, existing rows will be moved to the last position
                $(that.bodySelector).append(row);
                idx++;
            });
        }
        if ( this.config.chartUpdateCallBack != null && typeof(this.config.chartUpdateCallBack) !== "undefined") {
            this.config.chartUpdateCallBack();
        }
    },
    maintainZeroRow: function(){
        "use strict";
        var firstRowDays = parseFloat($(this.rowsSelector + ":first-child").find("td.profileDays").text());
        if(isNaN(firstRowDays)){
            return;
        }
        if(firstRowDays !== 0.0){
            var row = this.createRow('0','');
            $(this.rowsSelector).eq(0).before(row);
            this.updateDisplay();
        }
    },
    formatNextDate: function(theDate, strDays) {
        "use strict";
        var days = parseFloat(strDays);
        var t1 = theDate.getTime();
        var t2 = parseInt(this.numMilliSecondsPerDay * days, 10);
        var newDate = new Date( t1 + t2 );
        return { raw: this.formatDate(newDate), display: this.formatDateDisplay(newDate) };
    },
    formatDate: function(theDate) {
        "use strict";
        return theDate.toISOString();
    },
    formatDateDisplay: function(theDate) {
        "use strict";
        if ( this.config.displayDateFormatter != null ) {
            return this.config.displayDateFormatter(theDate);
        } else {
            return theDate.toString();
        }
    },
    parseDate: function(strDate){
        return new Date(strDate);
    },
    selectAll: function(elem) {
        "use strict";
        window.setTimeout(function() {
            var sel, range;
            if (window.getSelection && document.createRange) {
                range = document.createRange();
                range.selectNodeContents(elem);
                sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(elem);
                range.select();
            }
        }, 1);
    },
    getProfileData: function() {
        "use strict";
        var points = [];
        var me = this;
        $(this.rowsSelector).each(function() {
            var d = $(this).find('td.profileDate').data('profile-date');
            if ( d != null ) d = d.substr(0,d.indexOf('.')); // trim off millis and zone
            points[points.length] = { days : $(this).find('td.profileDays').text(), temperature: $(this).find('td.profileTemp').text(), date: d };
            if ( me.config.editable && points[points.length-1].days == '' ) {
                points.pop();  // remove last row if its blank and we are editing
            }
        });
        return points;
    },
    hasEmptyDayCells: function(){
        "use strict";
        var me = this;
        var emptyCells = 0;
        $(this.rowsSelector).each(function() {
            var cell = $(this).find('td.profileDays');  // test first cell for empty
            if ( !me.isValidCell(cell) ) {
                emptyCells++;
            }
        });
        return(emptyCells > 1); // there will always be one empty cell at the bottom when editing
    },
    toJSON: function() {
        "use strict";
        return { name: this.profileName, temperatures: this.getProfileData()};
    },
    toCSV: function(includeHeader, fields) {
        "use strict";
        var ret = '';
        var colNames = (fields || this.csvColumns);
        if ( includeHeader ) {
            for ( var i=0; i<colNames.length; i++ ) {
                ret += ((i!==0) ? ',' : '') + colNames[i];
            }
            ret += '\n';
        }
        var profileData = this.getProfileData();
        for ( var j=0; j<profileData.length; j++ ) {
            var row = profileData[j];
            for (var k=0; k<colNames.length; k++ ) {
                ret += ((k!==0) ? ',' : '') + row[colNames[k]];
            }
            ret += '\n';
        }
        return ret;
    },
    toXML: function() {
        // TODO: perhaps interface to other stuff ??
    },
    getProfileDuration: function() {
        var profileData = this.getProfileData();
        return (profileData.length>0 && parseFloat(profileData[profileData.length-1].days)) ? profileData[profileData.length-1].days : 0;
    },
    isValidCell: function(cell) {
        "use strict";
        var contents = cell.text();
        return ( typeof( contents ) !== "undefined" && contents !== '' && !isNaN(parseFloat(contents)));
    },
    markInvalidCells: function() {
        "use strict";
        this.preventFocusEvents = true;
        $(this.rowsSelector).each(function() {
            var dayCell = $(this).find('td.profileDays');
            if ( isNaN(parseFloat(dayCell.text())) ) {
                $(this).addClass('error');
                dayCell.focus();
                return false;
            } else {
                $(this).removeClass('error');
            }
        });
        this.preventFocusEvents = false;
    },
    resetInvalidCells: function() {
        "use strict";
        $(this.rowsSelector+'.error').removeClass('error');
    },
    maintainEmptyRow: function(){
        "use strict";
        if ( this.config.editable ) {
            var rows = this.getProfileData();
            var profileLength = rows.length;
            var tableLength = $(this.rowsSelector).length;

            if(tableLength === profileLength){
                this.addRow();
            }
        }
    }
};

// lets hack a little shall we ?
Dygraph.EVERY2DAYS = -1;
Dygraph.EVERY3DAYS = -2;
Dygraph.EVERY4DAYS = -3;
var _1DAY = 1000 * 86400;
Dygraph.SHORT_SPACINGS[Dygraph.EVERY2DAYS]    = 2 * _1DAY;
Dygraph.SHORT_SPACINGS[Dygraph.EVERY3DAYS]    = 3 * _1DAY;
Dygraph.SHORT_SPACINGS[Dygraph.EVERY4DAYS]    = 4 * _1DAY;


function TemperatureProfileChart(id, dateFormatter, temperatureFormatter) {
    "use strict";
    if (arguments.length > 0 ) {
        this.init(id, dateFormatter, temperatureFormatter);
    }
}

TemperatureProfileChart.prototype = {
    init: function(id, dateFormatter, temperatureFormatter) {
        "use strict";
        this.id = id;
        this.dateFormatter = dateFormatter;
        this.temperatureFormatter = temperatureFormatter;
    },
    drawChart: function(profileDuration, profileData) {

        var chartConfig = {
            colors: [ 'rgb(0, 0, 0)' ],
            axisLabelFontSize:12,
            gridLineColor:'#ccc',
            gridLineWidth:'0.1px',
            labelsDivStyles: { 'textAlign': 'right' },
            strokeWidth: 1,
            xValueParser: function(x) { 
                return new Date(x);
            },
            underlayCallback: this.updateCurrentDateLine,
            "Temperature" : {},
            axes: {
                y : { valueFormatter: this.temperatureFormatter },
                x : { valueFormatter: this.dateFormatter }
            },
            highlightCircleSize: 2,
            highlightSeriesOpts: {
                strokeWidth: 1.5,
                strokeBorderWidth: 1,
                highlightCircleSize: 5
            },
            yAxisLabelWidth: 35
        };
        var that = this;
        if ( profileDuration < 28) {
            chartConfig.axes.x.ticker = function(a, b, pixels, opts, dygraph, vals) {
                return Dygraph.getDateAxis(a, b, that.calculateXAxisTicks(profileDuration), opts, dygraph);
            };
        }
        var chart = new Dygraph(
            document.getElementById(this.id),
            profileData,
            chartConfig
        );
    },
    calculateXAxisTicks : function(duration) {
        if (duration > 20) {
            return Dygraph.EVERY4DAYS;
        } else if (duration > 13) {
            return Dygraph.EVERY3DAYS;
        } else if (duration > 7) {
            return Dygraph.EVERY2DAYS;
        } else {
            return Dygraph.DAILY;
        }
    },
    updateCurrentDateLine : function(canvas, area, g) {
        if(g.numRows() < 1){
            return; // when the chart has no data points, return.
        }

        canvas.fillStyle = "rgba(255, 100, 100, 1.0)";

        var nowTime = new Date().getTime();
        var startTime = g.getValue(0,0);
        var endTime = g.getValue(g.numRows()-1,0);

        if(nowTime < startTime){
            // all profile dates in the future, show in bottom left corner
            canvas.textAlign = "start";
            canvas.font = "14px Arial";
            canvas.fillText("<< Current time", area.x + 10, area.h - 10);
        }
        else if(nowTime > endTime){
            // all profile dates in the future, show in bottom right corner
            canvas.textAlign = "end";
            canvas.font = "14px Arial";
            canvas.fillText("Current time >>", area.x + area.w - 10, area.h - 10);
        }
        else{
            // draw line at current time
            var xCoordinate = g.toDomXCoord(nowTime);
            canvas.fillRect(xCoordinate, area.y+17, 1, area.h-17);

            // display interpolated temperature
            for( var i=0; i< g.numRows(); i++ ) {
                if (g.getValue(i,0) > nowTime) {
                    break; // found surrounding temperature points
                }
            }
            var previousTemperature = parseFloat(g.getValue(i-1,1));
            var nextTemperature = parseFloat(g.getValue(i,1));
            var previousTime = g.getValue(i-1,0);
            var nextTime = g.getValue(i,0);
            var temperature = (previousTemperature + (nextTemperature - previousTemperature)*(nowTime-previousTime)/(nextTime-previousTime)).toFixed(2);
            var yCoordinate = g.toDomYCoord(temperature);
            // Now add the interpolated temp to the cart, left or right of the line depending on which half
            canvas.font = "20px Arial";
            if(xCoordinate < 0.5 * area.w){
                canvas.textAlign = "start";
                if(nextTemperature >= parseFloat(temperature)){
                    yCoordinate += 20; // lower so it won't overlap with the chart
                }
                canvas.fillText(temperature, xCoordinate + 5, yCoordinate);
            }
            else{
                if(previousTemperature >= parseFloat(temperature)){
                    yCoordinate += 20; // lower so it won't overlap with the chart
                }
                canvas.textAlign = "end";
                canvas.fillText(temperature, xCoordinate - 5, yCoordinate);
            }
        }
    }
}
