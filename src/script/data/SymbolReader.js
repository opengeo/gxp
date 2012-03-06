/**
 * Copyright (c) 2008-2012 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

Ext.ns("gxp.data");

/** api: (define)
 *  module = gxp.data
 *  class = SymbolReader
 *  extends = Ext.data.JsonReader
 */

/** api: constructor
 *  .. class:: SymbolReader(config)
 *
 *  Parses symbolizers and splits them up in sub types (such as fill and stroke).
 */
gxp.data.SymbolReader = Ext.extend(Ext.data.JsonReader, {

    /** private: method[readRecords]
     *  Override to split up the symbolizers in sub types.
     */
    readRecords: function(o) {
        var type = "Symbolizers";
        this.raw = o;
        Ext.applyIf(this.meta, gxp.data.SymbolReader.metaData[type]);
        var data = {metaData: this.meta};
        data[type] = [];
        for (var i=0,ii=o.length;i<ii;++i) {
            var symbolizer = o[i];
            var key = symbolizer.CLASS_NAME.substring(symbolizer.CLASS_NAME.lastIndexOf(".")+1);
            if (key === "Polygon" || key === "Point") {
                data[type].push({
                    type: key, 
                    checked: symbolizer.stroke !== undefined ? symbolizer.stroke : true, 
                    subType: "Stroke", symbolizer: symbolizer
                });
                data[type].push({
                    type: key, 
                    checked: symbolizer.fill !== undefined ? symbolizer.fill : true, 
                    subType: "Fill", symbolizer: symbolizer
                });
            } else {
                data[type].push({
                    type: key, 
                    subType: key, 
                    symbolizer: symbolizer
                });
            }
        }
        return gxp.data.SymbolReader.superclass.readRecords.call(this, data);
    }

});

/** private: constant[metaData]
 *  ``Object`` MetaData configuration
 */
gxp.data.SymbolReader.metaData = {
    Symbolizers: {
        root: "Symbolizers",
        fields: [
            {name: "type"},
            {name: "checked"},
            {name: "subType"},
            {name: "symbolizer"}
        ]
    }
};
