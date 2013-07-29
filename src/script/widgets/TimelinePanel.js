/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires util.js
 * @requires OpenLayers/Renderer/SVG.js
 * @requires OpenLayers/Renderer/VML.js
 * @requires OpenLayers/Renderer/Canvas.js
 * @requires OpenLayers/Layer/Vector.js
 * @requires OpenLayers/BaseTypes/Date.js
 * @requires OpenLayers/BaseTypes/LonLat.js
 */

/** api: (define)
 *  module = gxp
 *  class = TimelinePanel
 *  base_link = `Ext.Panel <http://extjs.com/deploy/dev/docs/?class=Ext.Panel>`_
 */
Ext.namespace("gxp");

// showBy does not allow offsets
Ext.override(Ext.Tip, {
    showBy: function(el, pos, offsets){
        var offsetX = offsets[0];
        var offsetY = offsets[1];
        if (pos.charAt(0) === 'b') {
            offsetY = -offsetY;
        }
        if (pos.charAt(0) === 'r' || pos.charAt(1) === 'r') {
            offsetX = -offsetX;
        }
        if (pos.charAt(0) === 'c') {
            offsetX = 0;
            offsetY = 0;
        }
        if (pos.charAt(0) === 'l' || pos.charAt(0) === 'r') {
            offsetY = 0;
        }
        if(!this.rendered){
            this.render(Ext.getBody());
        }
        var position = this.el.getAlignToXY(el, pos || this.defaultAlign, [offsetX, offsetY]);
        if (!this.isVisible()) {
            this.showAt(position);
        } else {
            this.setPagePosition(position[0], position[1]);
        }
    }   
});

// TODO use from GeoExt eventually
GeoExt.FeatureTip = Ext.extend(Ext.Tip, {

    /** api: config[map]
     *  ``OpenLayers.Map``
     */
    map: null,

    /** api: config[location]
     *  ``OpenLayers.Feature.Vector``
     */
    location: null,

    /** api: config[shouldBeVisible]
     *  ``Function``
     *  Optional function to run to determine if the FeatureTip
     *  should be visible, this can e.g. be used to add another
     *  dimension such as time.
     */
    shouldBeVisible: null,

    /** private: method[initComponent]
     *  Initializes the feature tip.
     */
    initComponent: function() {
        var centroid = this.location.geometry.getCentroid();
        this.location = new OpenLayers.LonLat(centroid.x, centroid.y);
        this.map.events.on({
            "move" : this.show,
            scope : this
        });
        GeoExt.FeatureTip.superclass.initComponent.call(this);
    },

    /** private: method[beforeDestroy]
     *  Cleanup events before destroying the feature tip.
     */
    beforeDestroy: function() {
        for (var key in this.youtubePlayers) {
            this.youtubePlayers[key].destroy();
            delete this.youtubePlayers[key]; 
        }
        this.map.events.un({
            "move" : this.show,
            scope : this
        });
        GeoExt.FeatureTip.superclass.beforeDestroy.call(this);
    },

    /** private: method[getPosition]
     *  Get the position of the feature in pixel space.
     *
     *  :returns: ``Array`` The position of the feature in pixel space or
     *  null if the feature is not visible in the map.
     */
    getPosition: function() {
        if (this.map.getExtent().containsLonLat(this.location)) {
            var locationPx = this.map.getPixelFromLonLat(this.location),
                mapBox = Ext.fly(this.map.div).getBox(true),
                top = locationPx.y + mapBox.y,
               left = locationPx.x + mapBox.x;
            return [left, top];
        } else {
            return null;
        }
    },

    /** api: method[show]
     *  Show the feature tip.
     */
    show: function() {
        var position = this.getPosition();
        if (position !== null && (this.shouldBeVisible === null || this.shouldBeVisible.call(this))) {
            if (!this.isVisible()) {
                this.showAt(position);
            } else {
                this.setPagePosition(position[0], position[1]);
            }
        } else {
            this.hide();
        }
    }

});

// http://code.google.com/p/simile-widgets/issues/detail?id=3
window.Timeline && window.SimileAjax && (function() {
    SimileAjax.History.enabled = false;

    Timeline._Band.prototype._onDblClick = Ext.emptyFn;

    Timeline.DefaultEventSource.prototype.remove = function(id) {
        this._events.remove(id);
    };
    SimileAjax.EventIndex.prototype.remove = function(id) {
        var evt = this._idToEvent[id];
        this._events.remove(evt);
        delete this._idToEvent[id];
    };
    Timeline._Band.prototype.zoom = function(zoomIn, x, y, target) {
        if (!this._zoomSteps) {
            // zoom disabled
            return;
        }
        var center = this.getCenterVisibleDate();
        var netIntervalChange = this._ether.zoom(zoomIn);
        this._etherPainter.zoom(netIntervalChange);
        this.setCenterVisibleDate(center);
    };
})();

/** api: constructor
 *  .. class:: TimelinePanel(config)
 *   
 *      A panel for displaying a Similie Timeline.
 */
gxp.TimelinePanel = Ext.extend(Ext.Panel, {

    youtubePlayers: {},

    /** api: config[scrollInterval]
     *  ``Integer`` The Simile scroll event listener will only be handled
     *  upon every scrollInterval milliseconds. Defaults to 500.
     */
    scrollInterval: 500,

    /** private: property[annotationsStore]
     *  ``GeoExt.data.FeatureStore``
     */

    /** api: config[annotationConfig]
     *  ``Object`` Configuration object for the integration of annotations
     *  with the timeline.
     */
    annotationConfig: {
        timeAttr: 'start_time',
        endTimeAttr: 'end_time',
        filterAttr: 'in_timeline',
        mapFilterAttr: 'in_map'
    },
    
    /** api: config[viewer]
     *  ``gxp.Viewer``
     */

    /** api: config[playbackTool]
     *  ``gxp.plugins.Playback``
     */

    /** private: property[timeline]
     *  ``Timeline``
     */
    
    /** private: property[timelineContainer]
     *  ``Ext.Container``
     */
    
    /** private: property[eventSource]
     *  ``Object``
     *  Timeline event source.
     */

    /** api: property[layerLookup]
     *  ``Object``
     *  Mapping of store/layer names (e.g. "local/foo") to objects storing data
     *  related to layers.  The values of each member are objects with the 
     *  following properties:
     *
     *   * layer - {OpenLayers.Layer.Vector}
     *   * titleAttr - {String}
     *   * timeAttr - {String}
     *   * endTimeAttr - {String}
     *   * filterAttr - {String}
     *   * visible - {Boolean}
     *   * timeFilter - {OpenLayers.Filter}
     *   * sldFilter - {OpenLayers.Filter}
     *   * clientSideFilter - {OpenLayers.Filter}
     *  
     */
    
    /** private: property[rangeInfo]
     *  ``Object`` An object with 2 properties: current and original.
     *  Current contains the original range with a fraction on both sides.
     */

    /**
     * api: config[maxFeatures]
     * ``Integer``
     * The maximum number of features in total for the timeline.
     */
    maxFeatures: 500,

    /**
     * api: config[bufferFraction]
     * ``Float``
     * The fraction to take around on both sides of a time filter. Defaults to 1.
     */
    bufferFraction: 1,

    layout: "border",

    /** private: method[initComponent]
     */
    initComponent: function() {

        // handler for clicking on an event in the timeline
        Timeline.OriginalEventPainter.prototype._showBubble = 
            this.handleEventClick.createDelegate(this);

        this.timelineContainer = new Ext.Container({
            region: "center"
        });

        this.eventSource = new Timeline.DefaultEventSource(0);

        this.items = [this.timelineContainer];

        // we are binding with viewer to get updates on new layers        
        if (this.initialConfig.viewer) {
            delete this.viewer;
            this.bindViewer(this.initialConfig.viewer);
        }

        // bind to the annotations store for notes
        if (this.initialConfig.annotationsStore) {
            this.bindAnnotationsStore(this.initialConfig.annotationsStore);
        }

        // we are binding with the playback tool to get updates on ranges
        // and current times
        if (this.initialConfig.playbackTool) {
            delete this.playbackTool;
            this.bindPlaybackTool(this.initialConfig.playbackTool);
        }

        if (this.ownerCt) {
            this.ownerCt.on("beforecollapse", function() {
                this._silentMapMove = true;
            }, this);
            this.ownerCt.on("beforeexpand", function() {
                delete this._silentMapMove;
            }, this);
            this.ownerCt.on("afterlayout", function() {
                delete this._silent;
            }, this);
        }

        gxp.TimelinePanel.superclass.initComponent.call(this); 
    },

    /**
     * private: method[handleEventClick]
     *  :arg x: ``Integer``
     *  :arg y: ``Integer``
     *  :arg evt: ``Object``
     *  
     *  Handler for when an event in the timeline gets clicked. Show a popup
     *  for a feature and the feature editor for a note/annotation.
     */
    handleEventClick: function(x, y, evt) {
        this.fireEvent("click", evt.getProperty('fid'));
    },

    /**
     * private: method[bindAnnotationsStore]
     *  :arg store: ``GeoExt.data.FeatureStore``
     *  
     *  Bind with a feature store to have notes show up in the timeline.
     */
    bindAnnotationsStore: function(store) {
        store.on('load', function(store, rs, options) {
            var key = 'annotations';
            this.layerLookup[key] = Ext.apply({
                titleAttr: 'title',
                icon: Timeline.urlPrefix + "/images/note.png",
                layer: store.layer,
                visible: true
            }, this.annotationConfig);
            var features = [];
            store.each(function(record) {
                features.push(record.getFeature());
            });
            this.addFeatures(key, features);
            if (rs.length > 0) {
                this.ownerCt.expand();
            }
        }, this, {single: true});
    },

    /**
     * private: method[bindPlaybackTool]
     *  :arg playbackTool: ``gxp.plugins.Playback``
     *
     *  Bind with the playback tool so we get updates on when we have to move
     *  the timeline and when we have to change the range.
     */
    bindPlaybackTool: function(playbackTool) {
        this.playbackTool = playbackTool;
        this.playbackTool.on("timechange", this.onTimeChange, this);
        this.playbackTool.on("rangemodified", this.onRangeModify, this);
    },

    /**
     * private: method[unbindPlaybackTool]
     *
     *  Unbind with the playback tool
     */
    unbindPlaybackTool: function() {
        if (this.playbackTool) {
            this.playbackTool.un("timechange", this.onTimeChange, this);
            this.playbackTool.un("rangemodified", this.onRangeModify, this);
            this.playbackTool = null;
        }
    },

    /**
     * private: method[onTimeChange]
     *  :arg toolbar: ``gxp.plugin.PlaybackToolbar``
     *  :arg currentValue: ``Number``
     *
     *  Listener for when the playback tool fires timechange.
     */
    onTimeChange: function(toolbar, currentValue) {
        this._silent = true;
        this._ignoreTimeChange !== true && this.setCenterDate(currentValue);
        delete this._silent;
    },

    /** private: method[onRangeModify]
     *  :arg toolbar: ``gxp.plugin.PlaybackToolbar``
     *  :arg range: ``Array(Date)``
     *
     *  Listener for when the playback tool fires rangemodified
     */
    onRangeModify: function(toolbar, range) {
        this._silent = true;
        this.setRange(range);
        delete this._silent;
    },

    /** private: method[createTimeline]
     *  :arg range:  ``Array``
     *
     *  Create the Simile timeline object.
     */
    createTimeline: function(range) {
        if (!this.rendered || (this.timelineContainer.el.getSize().width === 0 && this.timelineContainer.el.getSize().height === 0)) {
            return;
        }
        var theme = Timeline.ClassicTheme.create();
        var span = range[1] - range[0];
        var years  = ((((span/1000)/60)/60)/24)/365;
        var intervalUnits = [];
        if (years >= 50) {
            intervalUnits.push(Timeline.DateTime.DECADE);
            intervalUnits.push(Timeline.DateTime.CENTURY);
        } else {
            intervalUnits.push(Timeline.DateTime.YEAR);
            intervalUnits.push(Timeline.DateTime.DECADE);
        }
        var d = new Date(range[0] + span/2);
        var bandInfos = [
            Timeline.createBandInfo({
                width: "80%", 
                intervalUnit: intervalUnits[0], 
                intervalPixels: 200,
                eventSource: this.eventSource,
                date: d,
                theme: theme,
                layout: "original",
                zoomIndex: 7,
                zoomSteps: [
                    {pixelsPerInterval: 25,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 50,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 75,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 100,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 125,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 150,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 175,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 200,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 225,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 250,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 275,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 300,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 325,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 350,  unit: intervalUnits[0]},
                    {pixelsPerInterval: 375,  unit: intervalUnits[0]}
                ]
            }),
            Timeline.createBandInfo({
                width: "20%", 
                intervalUnit: intervalUnits[1], 
                intervalPixels: 200,
                eventSource: this.eventSource,
                date: d,
                theme: theme,
                layout: "overview"
            })
        ];
        bandInfos[1].syncWith = 0;
        bandInfos[1].highlight = true;

        bandInfos[0].decorators = [
            new Timeline.PointHighlightDecorator({
                date: d,
                theme: theme
            })
        ];
        this.timeline = Timeline.create(
            this.timelineContainer.el.dom, 
            bandInfos, 
            Timeline.HORIZONTAL
        );
        // since the bands are linked we need to listen to one band only
        this._silent = true;
        this.timeline.getBand(0).addOnScrollListener(
            gxp.util.throttle(this.setPlaybackCenter.createDelegate(this), this.scrollInterval)
        );
        
    },

    /** private: method[setPlaybackCenter]
     *  :arg band:  ``Object``
     *
     *  When the timeline is moved, update the playback tool.
     */
    setPlaybackCenter: function(band) {
        var time = band.getCenterVisibleDate();
        if (this._silent !== true && this.playbackTool && this.playbackTool.playbackToolbar.playing !== true) {
            this._ignoreTimeChange = true;
            this.playbackTool.setTime(time);
            this.timeline.getBand(0)._decorators[0]._date = this.playbackTool.playbackToolbar.control.currentValue;
            this.timeline.getBand(0)._decorators[0].paint();
            delete this._ignoreTimeChange;
            this.showAnnotations();
        }
    },
    
    /** private: method[bindViewer]
     *  :arg viewer: ``gxp.Viewer``
     *
     *  Bind the timeline with the viewer, so we get updates on layer changes.
     */
    bindViewer: function(viewer) {
        if (this.viewer) {
            this.unbindViewer();
        }
        this.viewer = viewer;
        if (!this.layerLookup) {
            this.layerLookup = {};
        }
    },
    
    /** private: method[unbindViewer]
     *
     *  Unbind this timeline from the current viewer.
     */
    unbindViewer: function() {
        delete this.viewer;
        delete this.layerLookup;
    },

    /** private: method[onLayout]
     *
     *  Fired by Ext, create the timeline.
     */
    onLayout: function() {
        gxp.TimelinePanel.superclass.onLayout.call(this, arguments);
        if (!this.timeline) {
            if (this.playbackTool && this.playbackTool.playbackToolbar) {
                this.setRange(this.playbackTool.playbackToolbar.control.animationRange);
                this.setCenterDate(this.playbackTool.playbackToolbar.control.currentValue);
            }
        }
    },

    /** private: method[setRange]
     *  :arg range: ``Array``
     *
     *  Set the range for the bands of this timeline.
     */
    setRange: function(range) {
        this.originalRange = range;
        if (!this.timeline) {
            this.createTimeline(range);
        }
        // if we were not rendered, the above will not have created the timeline
        if (this.timeline) {
            var firstBand = this.timeline.getBand(0);
            firstBand.setMinVisibleDate(range[0]);
            firstBand.setMaxVisibleDate(range[1]);
            var secondBand = this.timeline.getBand(1);
            secondBand.getEtherPainter().setHighlight(range[0], range[1]);
        }
    },

    buildHTML: function(record) {
        var content = record.get('content');
        var start = content ? content.indexOf('[youtube=') : -1;
        if (start !== -1) {
            var header = content.substr(0, start);
            var end = content.indexOf(']', start);
            var footer  = content.substr(end+1);
            var url = content.substr(start+9, end-9);
            var params = OpenLayers.Util.getParameters(url);
            var width = params.w || 250;
            var height = params.h || 250;
            var v = params.v;
            if (v === undefined) {
                v = url.substr(url.lastIndexOf('/')+1, (url.indexOf('?') !== -1 ? (url.indexOf('?') - (url.lastIndexOf('/')+1)) : undefined));
            }
            url = 'http://www.youtube.com/embed/' + v;
            var fid = record.getFeature().fid;
            var id = 'player_' + fid;
            return header + '<br/>' + '<iframe id="' + id + 
                '" type="text/html" width="' + width + '" height="' + 
                height + '" ' + 'src="' + url + '?enablejsapi=1&origin=' + 
                window.location.origin + '" frameborder="0"></iframe>' + 
                '<br/>' + footer;
        } else {
            return content;
        }
    },

    /** private: method[displayTooltip]
     *  :arg record: ``GeoExt.data.FeatureRecord``
     *
     *  Create and show the tooltip for a record.
     */
    displayTooltip: function(record) {
        var hasGeometry = (record.getFeature().geometry !== null);
        if (!this.tooltips) {
            this.tooltips = {};
        }
        var fid = record.getFeature().fid || record.getFeature().id;
        var content = record.get('content') || '';
        var youtubeContent = content.indexOf('[youtube=') !== -1;
        var listeners = {
            'show': function(cmp) {
                if (youtubeContent === true) {
                    if (this.youtubePlayers[fid]._ready && 
                        this.playbackTool.playbackToolbar.playing) {
                            this.youtubePlayers[fid].playVideo();
                    }
                }
            },
            'afterrender': function() {
                if (youtubeContent === true) {
                    if (!this.youtubePlayers[fid]) {
                        var me = this;
                        // stop immediately, if we wait for PLAYING we might be too late already
                        if (me.playbackTool.playbackToolbar.playing) {
                            me.playbackTool.playbackToolbar._weStopped = true;
                            me.playbackTool.playbackToolbar.control.stop();
                        }
                        var id = 'player_' + fid;
                        this.youtubePlayers[fid] = new YT.Player(id, {
                            events: {
                                'onReady': function(evt) {
                                    evt.target._ready = true;
                                    if (me.playbackTool.playbackToolbar.playing || 
                                        me.playbackTool.playbackToolbar._weStopped) {
                                            evt.target.playVideo();
                                    }
                                },
                                'onStateChange': function(evt) {
                                    if (evt.data === YT.PlayerState.PLAYING) {
                                        if (!me.playbackTool.playbackToolbar._weStopped && 
                                            me.playbackTool.playbackToolbar.playing) {
                                                me.playbackTool.playbackToolbar._weStopped = true;
                                                me.playbackTool.playbackToolbar.control.stop();
                                        }
                                    } else if (evt.data == YT.PlayerState.ENDED) {
                                        if (me.playbackTool.playbackToolbar._weStopped) {
                                            me.playbackTool.playbackToolbar.control.play();
                                            delete me.playbackTool.playbackToolbar._weStopped;
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            },
            scope: this
        };
        if (!this.tooltips[fid]) {
            if (!hasGeometry) {
                this.tooltips[fid] = new Ext.Tip({
                    cls: 'gxp-annotations-tip',
                    maxWidth: 500,
                    listeners: listeners,
                    title: record.get("title"),
                    html: this.buildHTML(record)
                });
            } else {
                this.tooltips[fid] = new GeoExt.FeatureTip({
                    map: this.viewer.mapPanel.map,
                    location: record.getFeature(),
                    shouldBeVisible: function() {
                        return (this._inTimeRange === true);
                    },
                    cls: 'gxp-annotations-tip',
                    maxWidth: 500,
                    title: record.get("title"),
                    listeners: listeners,
                    html: this.buildHTML(record)
                });
            }
        }
        var tooltip = this.tooltips[fid];
        tooltip._inTimeRange = true;
        if (!hasGeometry) {
            // http://www.sencha.com/forum/showthread.php?101593-OPEN-1054-Tooltip-anchoring-problem
            tooltip.showBy(this.viewer.mapPanel.body, record.get("appearance"), [10, 10]);
            tooltip.showBy(this.viewer.mapPanel.body, record.get("appearance"), [10, 10]);
        } else {
            if (!tooltip.isVisible()) {
                tooltip.show();
            }
        }
    },

    /** private: method[hideTooltip]
     *  :arg record: ``GeoExt.data.FeatureRecord``
     *
     *  Hide the tooltip associated with the record.
     */
    hideTooltip: function(record) {
        var fid = record.getFeature().fid || record.getFeature().id;
        if (this.tooltips && this.tooltips[fid]) {
            this.tooltips[fid]._inTimeRange = false;
            this.tooltips[fid].hide();
        }
    },

    /** private: method[showAnnotations]
     *
     *  Show annotations in the map.
     */
    showAnnotations: function() {
        var time = this.playbackTool.playbackToolbar.control.currentValue;
        if (!this.annotationsLayer) {
            this.annotationsLayer = new OpenLayers.Layer.Vector(null, {
                displayInLayerSwitcher: false,
                styleMap: new OpenLayers.StyleMap({'default':{
                    label: "${title}\n${content}",
                    fontColor: "black",
                    fontSize: "12px",
                    fontFamily: "Courier New, monospace",
                    fontWeight: "bold",
                    labelOutlineColor: "white",
                    labelAlign: "middle",
                    labelOutlineWidth: 3
                }})
            });
            this.viewer && this.viewer.mapPanel.map.addLayer(this.annotationsLayer);
        }
        var compare = time/1000;
        if (this.annotationsStore) {
            this.annotationsStore.each(function(record) {
                var mapFilterAttr = this.annotationConfig.mapFilterAttr;
                if (Ext.isBoolean(record.get(mapFilterAttr)) ? record.get(mapFilterAttr) : (record.get(mapFilterAttr) === "true")) {
                    var startTime = parseFloat(record.get(this.annotationConfig.timeAttr));
                    var endTime = record.get(this.annotationConfig.endTimeAttr);
                    var ranged = (endTime != startTime);
                    if (endTime == "" || endTime == null) {
                        endTime = this.playbackTool.playbackToolbar.control.animationRange[1];
                    }
                    if (ranged === true) {
                        if (compare <= parseFloat(endTime) && compare >= startTime) {
                            this.displayTooltip(record);
                        } else {
                            this.hideTooltip(record);
                        }
                    } else {
                        var diff = (startTime-compare);
                        var percentage = Math.abs((diff/startTime)*100);
                        // we need to take a margin for the feature to have a chance to show up
                        if (percentage <= 2.5) {
                            this.displayTooltip(record);
                        } else {
                            this.hideTooltip(record);
                        }
                    }
                }
            }, this);
        }
    },

    /** private: method[setCenterDate]
     *  :arg time: ``Date``
     *      
     *  Set the center datetime on the bands of this timeline.
     */
    setCenterDate: function(time) {
        if (!(time instanceof Date)) {
            time = new Date(time);
        }
        if (this.timeline) {
            this.timeline.getBand(0)._decorators[0]._date = time;
            this.timeline.getBand(0)._decorators[0].paint();
            this.timeline.getBand(0).setCenterVisibleDate(time);
            if (this.rangeInfo && this.rangeInfo.current) {
                var currentRange = this.rangeInfo.current;
                var originalRange = this.rangeInfo.original;
                // update once the time gets out of the original range
                if (time < originalRange[0] || time > originalRange[1]) {
                    var span = currentRange[1] - currentRange[0];
                    var start = new Date(time.getTime() - span/2);
                    var end = new Date(time.getTime() + span/2);
                    // don't go beyond the original range
                    start = new Date(Math.max(this.originalRange[0], start));
                    end = new Date(Math.min(this.originalRange[1], end));
                    this.rangeInfo.current = [start, end];
                    // calculate back the original extent
                    var startOriginal = new Date(time.getTime() - span/4);
                    var endOriginal = new Date(time.getTime() + span/4);
                    this.rangeInfo.original = [startOriginal, endOriginal];
                    // we have moved ahead in time, and we have not moved so far that 
                    // all our data is invalid
                    if (start > currentRange[0] && start < currentRange[1]) {
                        // only request the slice of data that we need
                        start = currentRange[1];
                    }
                    // we have moved back in time
                    if (start < currentRange[0] && end > currentRange[0]) {
                        end = currentRange[0];
                    }
                    // TODO if we need paging on annotations, we should create the
                    // time filter here
                }
            }
        }
        this.showAnnotations();
    },

    /** private: method[addFeatures]
     *  :arg key: ``String``
     *  :arg features: ``Array``
     *
     *  Add some features to the timeline.
     */    
    addFeatures: function(key, features) {
        var hasFeature = function(fid) {
            var iterator = this.eventSource.getAllEventIterator();
            while (iterator.hasNext()) {
                var evt = iterator.next();
                if (evt.getProperty('key') === key && evt.getProperty('fid') === fid) {
                    return true;
                }
            }
            return false;
        };
        var isDuration = false;
        var titleAttr = this.layerLookup[key].titleAttr;
        var timeAttr = this.layerLookup[key].timeAttr;
        var endTimeAttr = this.layerLookup[key].endTimeAttr;
        var filterAttr = this.layerLookup[key].filterAttr;
        if (endTimeAttr) {
            isDuration = true;
        }
        var num = features.length;
        var events = [];
        var attributes, str;
        for (var i=0; i<num; ++i) {
            // prevent duplicates
            if (hasFeature.call(this, features[i].fid) === false) {
                attributes = features[i].attributes;
                if (isDuration === false) {
                    events.push({
                        start: OpenLayers.Date.parse(attributes[timeAttr]),
                        title: attributes[titleAttr],
                        durationEvent: false,
                        key: key,
                        icon: this.layerLookup[key].icon,
                        fid: features[i].fid
                    });
                } else if (Ext.isBoolean(attributes[filterAttr]) ? attributes[filterAttr] : (attributes[filterAttr] === "true")) {
                    var start = attributes[timeAttr];
                    var end = attributes[endTimeAttr];
                    // end is optional
                    var durationEvent = (start != end);
                    if (!Ext.isEmpty(start)) {
                        start = parseFloat(start);
                        if (Ext.isNumber(start)) {
                            start = new Date(start*1000);
                        } else {
                            start = OpenLayers.Date.parse(start);
                        }
                    }
                    if (!Ext.isEmpty(end)) {
                        end = parseFloat(end);
                        if (Ext.isNumber(end)) {
                            end = new Date(end*1000);
                        } else {
                            end = OpenLayers.Date.parse(end);
                        }
                    }
                    if (durationEvent === false) {
                        end = undefined;
                    } else {
                        if (end == "" || end == null) {
                            // Simile does not deal with unlimited ranges, so let's
                            // take the range from the playback control
                            end = new Date(this.playbackTool.playbackToolbar.control.animationRange[1]);
                        }
                    }
                    if(start != null){
                        events.push({
                            start: start,
                            end: end,
                            icon: this.layerLookup[key].icon,
                            title: attributes[titleAttr],
                            durationEvent: durationEvent,
                            key: key,
                            fid: features[i].fid
                        });
                    }
                }
            }
        }
        var feed = {
            dateTimeFormat: "javascriptnative", //"iso8601",
            events: events
        };
        // do not use a real URL here, since this will mess up relative URLs
        this.eventSource.loadJSON(feed, "mapstory.org");
    },

    /** private: method[onResize]
     *  Private method called after the panel has been resized.
     */
    onResize: function() {
        gxp.TimelinePanel.superclass.onResize.apply(this, arguments);
        this.timeline && this.timeline.layout();
    },

    /** private: method[beforeDestroy]
     *  Cleanup.
     */
    beforeDestroy : function(){
        gxp.TimelinePanel.superclass.beforeDestroy.call(this);
        this.annotationsLayer = null;
        this.unbindViewer();
        this.unbindPlaybackTool();
        this.eventSource = null;
        if (this.timeline) {
            this.timeline.dispose();
            this.timeline = null;
        }
    }

});

/** api: xtype = gxp_timelinepanel */
Ext.reg("gxp_timelinepanel", gxp.TimelinePanel);
