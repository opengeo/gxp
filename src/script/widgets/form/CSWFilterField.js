/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/** api: (define)
 *  module = gxp.form
 *  class = CSWFilterField
 *  base_link = `Ext.form.CompositeField <http://extjs.com/deploy/dev/docs/?class=Ext.form.CompositeField>`_
 */
Ext.namespace("gxp.form");

/** api: constructor
 *  .. class:: CSWFilterField(config)
 *   
 *      A composite form field which uses a combobox to select values
 *      for a certain filter, and adds a button to the right of the combobox
 *      to remove the filter.
 */
gxp.form.CSWFilterField = Ext.extend(Ext.form.CompositeField, {

    /** api: config[property]
     *  ``String`` Optional, the PropertyName to use in the Filter
     */
    property: null,

    /** api: config[map]
     *  ``OpenLayers.Map``
     */
    map: null,

    /** api: config[type]
     *  ``String`` Optional type to use in the comparison filter.
     *  Defaults to '=='.
     */
    type: OpenLayers.Filter.Comparison.EQUAL_TO,

    /** api:config[name]
     *  ``String`` Name of the filter property.
     */
    name: null,

    /** api:config[comboFieldLabel]
     *  ``String`` fieldLabel to use for the combobox.
     */
    comboFieldLabel: null,

    /** api:config[comboStoreData]
     *  ``Array`` The data for the combo store.
     */
    comboStoreData: null,

    /** api:config[target]
     *  ``gxp.CatalogueSearchPanel`` The target on which to apply the filters.
     */
    target: null,

    getFilter: function() {
        if (this.property === 'BoundingBox') {
            return new OpenLayers.Filter.Spatial({
                type: OpenLayers.Filter.Spatial.BBOX,
                property: this.property,
                /* TODO revisit axis order */
                value: this.map.getExtent().transform(
                    this.map.getProjectionObject(),
                    new OpenLayers.Projection("EPSG:4326")
                )
            });
        } else { 
            return new OpenLayers.Filter.Comparison({
                type: this.type,
                property: this.property,
                value: this.combo.getValue()
            });
        } 
    },

    /**
     * Method: initComponent
     */
    initComponent: function() {
        this.items = [{
            ref: 'combo',
            xtype: "combo",
            fieldLabel: this.comboFieldLabel,
            store: new Ext.data.ArrayStore({
                fields: ['id', 'value'],
                data: this.comboStoreData
            }),
            displayField: 'value',
            valueField: 'id',
            mode: 'local',
            listeners: {
                'select': function(cmb, record) {
                    if (this.filter) {
                        this.target.removeFilter(this.filter);
                    }
                    this.filter = this.getFilter();
                    this.target.addFilter(this.filter);
                    return false;
                },
                scope: this
            },
            emptyText: 'Select filter',
            triggerAction: 'all'
        }, {
            xtype: 'button',
            iconCls: 'gxp-icon-removelayers',
            handler: function(btn) {
                this.target.removeFilter(this.filter);
            },
            scope: this
        }];
        this.hidden = true;
        gxp.form.CSWFilterField.superclass.initComponent.apply(this, arguments);
    },

    /**
     * Method: destroy
     */  
    destroy: function() {
        this.filter = null;
        this.target = null;
        this.map = null;
        gxp.form.CSWFilterField.superclass.destroy.call(this);
    }

});

Ext.reg('cswfilterfield', gxp.form.CSWFilterField);
