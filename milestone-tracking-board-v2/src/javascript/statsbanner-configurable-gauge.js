(function() {
    var Ext = window.Ext4 || window.Ext;

    showTooltip = function(values){
        console.log('showTooltip',this)
    };
    /**
     * gauge chart for stats banner
     * abstract class
     */
    Ext.define('MilestoneTrackingApp.ConfigurableGauge', {
        extend: 'MilestoneTrackingApp.BannerWidget',
        alias:'widget.statsbannerconfigurablegauge',

        requires: [
            'Rally.ui.chart.Chart',
            'Rally.util.Timebox',
            'Rally.util.Colors'
        ],


        tpl: [
            '<div class="expanded-widget">',
                '<div class="stat-title" id="{uniqueid}" >{title}&nbsp;<span class="icon-help"></span></div>', //data-qtip="{tooltip}"
                '<div class="stat-metric">',
                    '<div class="metric-chart"></div>',
                    '<div class="metric-chart-text percent-offset">',
                        '{percentage}<div class="metric-percent">%</div>',
                    '</div>',
                    '<div class="metric-subtext">{calculatedUnits} of {totalUnits} {unit}<tpl if="secondaryUnit">, {secondaryCalculatedUnits} of {secondaryTotalUnits} {secondaryUnit}</tpl></div>',
                '</div>',
            '</div>',
            '<div class="collapsed-widget">',
                '<div class="stat-title">{title}</div>',
                '<div class="stat-metric">{percentage}<span class="metric-percent">%</span></div>',
            '</div>'
        ],

        config: {
            calculatedUnitFilter: null,
            totalUnitFilter: null,
            data: {
                percentage: 0,
                calculatedUnits: 0,
                totalUnits: 0,
                unit: '',
                title: ''
            }
        },

        _tzOffsetPromises: {},


        getTooltip: function(values){
            if (values.tooltip){
                return values.tooltip;
            }
            return '';
        },
        initComponent: function() {
            //Ext.QuickTips.init();

            //this.store.on('datachanged', this.onDataChanged, this);
            this.mon(this.store, 'datachanged', this.onDataChanged, this);
            this.callParent(arguments);
        },
        onDataChanged: function() {
            var data = this._getRenderData();
            this.update(data);
            this.refreshChart(this._getChartConfig(data));
        },

        getChartEl: function() {
            return this.getEl().down('.metric-chart');
        },

        //Override this function in the parent.
        _getRenderData: function() {
            return {};
        },
        updateStore: function(store){
            this.store = store;
            this.mon(this.store, 'datachanged', this.onDataChanged, this);
            //this.store.on('load', this.onDataChanged, this);
        },
        _getChartConfig: function(renderData) {
               var data = [{
                        name: '',
                        y: 100,
                        color: Rally.util.Colors.grey1
               }];

                if (!Ext.isEmpty(renderData)){
                    if (renderData.chartData && renderData.chartData instanceof Array){
                        data = renderData.chartData;
                     } else {
                        var percentage = renderData.percentage,
                            percentagePlanned = percentage % 100 || 100,
                            color = Rally.util.Colors.cyan_med,
                            secondaryColor = Rally.util.Colors.grey1;

                        if (percentage > 100) {
                            color = Rally.util.Colors.blue;
                            secondaryColor = Rally.util.Colors.cyan;
                        } else if (percentage > 70) {
                            color = Rally.util.Colors.cyan;
                        } else if (percentage === 0) {
                            color = Rally.util.Colors.grey1;
                        }

                        data = [
                            {
                                name: renderData.title + ' Total',
                                y: percentagePlanned,
                                color: color
                            },
                            {
                                name: '',
                                y: 100 - percentagePlanned,
                                color: secondaryColor
                            }
                        ]
                    }
                }

            return {
                chartData: {
                    series: [{
                        data: data
                    }]
                }
            };
        },
        expand: function() {
            this.callParent();
            if (this.chart) {
                this.chart.doLayout();
            } else {
                this._addChart(this._getChartConfig({}));
            }
        },

        onRender: function() {
            this.callParent(arguments);
            if (this.store.getRange().length === 0) {
                this._addEmptyChart();
            }
            console.log('onRender', this.getEl());

            this.tooltipObject = Ext.create('Rally.ui.tooltip.ToolTip', {
                target: this.getEl(),
                html: this.tooltip
            });

            this.getEl().on('mouseenter', function(e,t){
                console.log('mouseenter',e,t)
                this.tooltipObject.show();
            }, this);
            this.getEl().on('mouseleave', function(e,t){
                console.log('mouseleave', e, t)
                this.tooltipObject.hide();
            }, this);

        },
        _addEmptyChart: function() {
            this._cleanupChart();
            this._addChart({
                chartData: {
                    series: [{
                        data: [
                            {
                                name: '',
                                y: 100,
                                color: Rally.util.Colors.grey1,
                                pct: "N/A"
                            }
                        ]
                    }]
                }
            });
        },

        _cleanupChart: function () {
            if (this.chart) {
                this.chart.destroy();
                delete this.chart;
            }
        },

        onDestroy: function () {
            this._cleanupChart();
            this.callParent(arguments);
        },

        onResize: function() {
            if (this.chart && !this.getEl().up('.stats-banner.collapsed')) {
                this.chart.updateLayout();
            }
            this.callParent(arguments);
        },

        refreshChart: function(chartConfig) {
            Ext.suspendLayouts();
            this._cleanupChart();
            if (this.rendered && this.expanded) {
                this._addChart(chartConfig);
            }
            Ext.resumeLayouts();
            this.fireEvent('ready', this);
        },

        _addChart: function(chartConfig) {
            var height = 70,
                tooltipConfig = this._getTooltipConfig(this.enableTooltip);
            this.chart = Ext.create('Rally.ui.chart.Chart', Ext.apply({
                loadMask: false,
                renderTo: this.getChartEl(),
                cls: 'gauge',
                chartConfig: {
                    chart: {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        defaultSeriesType: 'pie',
                        height: height,
                        spacingTop: 0,
                        spacingRight: 0,
                        spacingBottom: 0,
                        spacingLeft: 0
                    },
                    plotOptions: {
                        pie: {
                            borderWidth: 0,
                            center: ['55%', '20%'],
                            dataLabels: {
                                enabled: false
                            },
                            size: height * .70,
                            innerSize: height * .60,
                            enableMouseTracking: true, //turns off chart hover, but for tooltips you'll need this on
                            shadow: false
                        }
                    },
                    title: '',
                    tooltip: tooltipConfig
                }
            }, chartConfig));
        },

        _getTooltipConfig: function(enableTooltip){

            if (!enableTooltip){
                return {
                    enabled: false
                };
            }

            return {
                enabled: true,
                backgroundColor: '#000000',
                borderWidth: 0,
                headerFormat:  '<span style="background-color:{point.color};"></span>{point.key}: {point.y}',
                pointFormat: '',
                style: {
                    fontFamily: "ProximaNova, Helvetica, Arial",
                    color: "#FFFFFF"
                }
            };
        },

        _getTZOffset: function() {
            var projectRef = Rally.util.Ref.getRelativeUri(this.getContext().getProject());
            if (!Ext.isDefined(this._tzOffsetPromises[projectRef])) {
                var deferred = this._tzOffsetPromises[projectRef] = Ext.create('Deft.Deferred');
                Rally.environment.getIoProvider().httpGet({
                    url: Rally.environment.getServer().getWsapiUrl() + '/iteration',
                    params: {
                        includeSchema: true,
                        pagesize:1,
                        fetch: false,
                        project: projectRef
                    },
                    success: function(results) {
                        deferred.resolve((results.Schema.properties.EndDate.format.tzOffset || 0) / 60);
                    },
                    requester: this,
                    scope: this
                });
            }
            return this._tzOffsetPromises[projectRef];
        }
    });
})();