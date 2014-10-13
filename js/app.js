/**
 * Main application file for: minnpost-2014-follow-the-money
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require([
  'jquery', 'underscore', 'ractive', 'ractive-events-tap', 'd3', 'qtip',
  'mpConfig', 'mpFormatters', 'base',
  'text!templates/application.mustache',
  'text!templates/tooltip.underscore',
  'text!../data/top-dfl.json',
  'text!../data/top-gop.json',
  'text!../data/top-20.json',
  'text!../data/race-spending.json',
  'text!../data/combined-parties.json'
], function(
  $, _, Ractive, RactiveEventsTap, d3, qtip, mpConfig, mpFormatters, Base,
  tApplication, tTooltip,
  dTopDFL, dTopGOP, dTop20, dSpending, dParties
  ) {
  'use strict';

  // Parse JSON data
  dTopDFL = JSON.parse(dTopDFL);
  dTopGOP = JSON.parse(dTopGOP);
  dTop20 = JSON.parse(dTop20);
  dSpending = JSON.parse(dSpending);
  dParties = JSON.parse(dParties);

  // Create template functions
  tTooltip = _.template(tTooltip);

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      name: 'minnpost-2014-follow-the-money',
      el: '.minnpost-2014-follow-the-money-container'
    },

    // Start app
    initialize: function() {
      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: {
          top20: _.map(_.sortBy(dTop20, 'raised').reverse(), function(d, di) {
            d.tooltip = tTooltip({ d: d, f: mpFormatters });
            return d;
          }),
          top20Max: d3.max(dTop20, function(d) { return d.raised; }),
          combined: _.map(_.sortBy(dParties, 'raised').reverse(), function(d, di) {
            d.tooltip = tTooltip({ d: d, f: mpFormatters });
            return d;
          }),
          combinedMax: d3.max(dParties, function(d) { return d.raised; }),
          f: mpFormatters
        }
      });

      // Tooltips
      this.addTooltips('.chart-top-20 .chart-value');
      this.addTooltips('.chart-gop-v-dfl .chart-value');

      // Determine a max to use with ranges across visualizations
      this.max = Math.max(
        d3.max(dTopDFL, function(d) {
          return Math.max(d.raised, d.spent);
        }),
        d3.max(dTopGOP, function(d) {
          return Math.max(d.raised, d.spent);
        })
      );
      this.pacBoxH = this.pacBoxW = (this.$el.width() / 4) - 20;
      this.paxBoxMargin = 20;
      this.scale = d3.scale.linear()
        .range([0, this.pacBoxH])
        .domain([0, this.max]);
      this.areaScale = d3.scale.linear()
        .range([0, this.pacBoxH * this.pacBoxH])
        .domain([0, this.max]);

      // Tooltip
      this.$tooltip = $('<div class="tooltip mp">');
      this.$tooltip.appendTo('body');

      // Create charts
      this.chartDFL3();
      this.chartGOPTop();
      this.chartSpending();
    },

    // Add tooltips
    addTooltips: function(selector, options) {
      options = options || {};
      $(selector).qtip($.extend(true, {}, {
        position: {
          my: 'bottom center',
          at: 'top center',
          target: 'mouse'
        },
        style: {
          classes: 'qtip-light'
        }
      }, options));
    },

    // Draw network chart
    chartNetwork: function($container, data, w, h, scale, areaScale) {
      var thisApp = this;
      var flowScale = 1.5;
      var legendMargin = 10;
      var canvas, groups, raised, spent, lines, names, legend, legendEdge;
      var line = d3.svg.line();
      scale = scale || this.scale;
      areaScale = areaScale || this.areaScale;

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

      // Lines
      lines = _.filter(data, function(d, di) {
        return _.isObject(d['spent-to']);
      });
      lines = canvas.selectAll('.group-link')
        .data(lines).enter()
        .append('path')
        .attr('class', 'group-link')
        .attr('d', function(d) {
          return line([
            [d.x, d.y - (d.cellEdge / 2)],
            [
              d['spent-to'].toObject.x,
              d['spent-to'].toObject.y - (d['spent-to'].toObject.cellEdge / 2)
            ]
          ]);
        })
        .style('stroke-width', function(d) {
          return Math.max(2, scale(d['spent-to'].amount) / flowScale);
        });

      // Draw each group for each square for each pac
      groups = canvas.selectAll('.group')
        .data(data).enter()
        .append('g').attr('class', 'group')
        .attr('transform', function(d, di) {
          // Translate to center bottom of cell, rotate, then shift
          return 'translate(' + d.x + ', ' + d.y + ') ' +
            'rotate(-180) ' +
            'translate(' + ((d.cellEdge / 2) * -1) + ', 0)';
        })
        .attr('title', function(d) {
          return tTooltip({ d: d, f: mpFormatters });
        });

      // Raised
      raised = groups.selectAll('.raised')
        .data(function(d) { return [d]; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'raised'; })
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', function(d) {
          return d.cellEdge;
        })
        .attr('height', function(d) {
          return d.cellEdge;
        });

      // Spent
      spent = groups.selectAll('.spent')
        .data(function(d) { return [d]; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'spent'; })
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', function(d) {
          return Math.sqrt(areaScale(d.spent));
        })
        .attr('height', function(d) {
          return Math.sqrt(areaScale(d.spent));
        });

      // Names
      names = canvas.selectAll('.name')
        .data(data).enter()
        .append('foreignObject')
          .attr('class', function(d) { return ((d.party) ? d.party : '') + ' name'; })
          .attr('x', function(d) { return d.nameX || d.x || 0; })
          .attr('y', function(d) { return d.nameY || d.y || 0; })
          .attr('width', function(d) {
            return (d.nameW) ? d.nameW : (thisApp.pacBoxH - thisApp.paxBoxMargin);
          })
          .attr('height', 100)
          .append('xhtml:body')
            .attr('class', 'mp')
          .append('xhtml:div')
          .style({})
          .html(function(d) { return d.name; });


      // Add tooltips
      this.addTooltips($container.find('[title]'));

      // Make legend
      legendEdge = Math.sqrt(areaScale(100000));
      legend = d3.select($container[0]).append('svg')
        .attr('class', 'legend-container')
        .attr('width', w)
        .attr('height', 80);

      legend.append('rect')
        .attr('class', 'raised')
        .attr('x', legendMargin)
        .attr('y', legendMargin * 2)
        .attr('width', legendEdge)
        .attr('height', legendEdge);

      legend.append('foreignObject')
        .attr('class', 'legend-name')
        .attr('x', legendEdge + legendMargin * 2)
        .attr('y', legendMargin * 2 + (legendEdge / 10))
        .attr('width', w / 5)
        .attr('height', 100)
        .append('xhtml:body')
          .attr('class', 'mp')
        .append('xhtml:div')
        .style({})
        .html('$100,000 raised');

      legend.append('rect')
        .attr('class', 'spent')
        .attr('x', (w / 3) + legendMargin)
        .attr('y', legendMargin * 2)
        .attr('width', legendEdge)
        .attr('height', legendEdge);

      legend.append('foreignObject')
        .attr('class', 'legend-name')
        .attr('x', ((w / 3) + legendMargin) + (legendEdge + legendMargin))
        .attr('y', legendMargin * 2 + (legendEdge / 10))
        .attr('width', w / 5)
        .attr('height', 100)
        .append('xhtml:body')
          .attr('class', 'mp')
        .append('xhtml:div')
        .style({})
        .html('$100,000 spent');

      legend.append('rect')
        .attr('class', 'group-link-legend')
        .attr('x', (w * (2 / 3)) + legendMargin)
        .attr('y', legendMargin * 2 + 5)
        .attr('width', scale(100000) / flowScale)
        .attr('height', 25);

      legend.append('foreignObject')
        .attr('class', 'legend-name')
        .attr('x', ((w * (2 / 3)) + legendMargin) + (scale(100000) / flowScale + legendMargin * 2))
        .attr('y', legendMargin * 2 + (legendEdge / 10))
        .attr('width', w / 4)
        .attr('height', 100)
        .append('xhtml:body')
          .attr('class', 'mp')
        .append('xhtml:div')
        .style({})
        .html('$100,000 given to another group');
    },

    // The big 3
    chartDFL3: function() {
      var thisApp = this;
      var $container = this.$('.chart-big-dfl');
      var w = $container.width();
      var h = (this.pacBoxH + this.paxBoxMargin) * 2 + 50;

      // Add some draw and other info to data
      var networkData = _.map(dTopDFL, function(d, di) {
        d.x = w / 6;
        d.y = h / 2 - thisApp.paxBoxMargin;
        if (d.id === 'win-mn') {
          d.x = d.x * 5;
        }
        if (d.id === 'abm') {
          d.x = w / 2;
          d.y = h - thisApp.paxBoxMargin - 30;
        }

        d.cellEdge = Math.sqrt(thisApp.areaScale(d.raised));

        d.nameX = d.x - (thisApp.pacBoxH / 2) + (thisApp.paxBoxMargin / 2);
        d.nameY = (d.id === '2014-fund' || d.id === 'win-mn') ?
          d.y - d.cellEdge - 30 :
          (d.id === 'abm') ? d.y + 5 : 0;

        d.party = 'dfl';
        return d;
      });
      networkData = _.map(networkData, function(d) {
        if (d['spent-to']) {
          d['spent-to'].toObject = _.findWhere(networkData, { id: d['spent-to'].to });
        }
        return d;
      });

      // Network
      this.chartNetwork($container, networkData, w, h);
    },

    // Top GOP
    chartGOPTop: function() {
      var thisApp = this;
      var $container = this.$('.chart-network-gop');
      var w = $container.width();
      var h = (this.pacBoxH + this.paxBoxMargin) * 2 + 50;
      var margin = this.paxBoxMargin;
      var cW = this.pacBoxH;
      var cH = this.pacBoxH;

      // Calculate some draw data
      var networkData = _.map(dTopGOP, function(d, di) {
        d.x = (((cW + margin) * (di % 4)) + (cW / 2) + margin);
        d.y = (((cH + margin) * (Math.floor(di / 4) + 1)));
        d.cellEdge = Math.sqrt(thisApp.areaScale(d.raised));
        d.nameX = d.x - (thisApp.pacBoxH / 2) + (thisApp.paxBoxMargin / 2);
        d.nameY = d.y + 5;
        d.party = 'gop';
        return d;
      });
      networkData = _.map(networkData, function(d) {
        if (d['spent-to']) {
          d['spent-to'].toObject = _.findWhere(networkData, { id: d['spent-to'].to });
        }
        return d;
      });

      // Network
      this.chartNetwork($container, networkData, w, h);
    },

    // Spending on races
    chartSpending: function() {
      var thisApp = this;
      var $container = this.$('.chart-money-to-races');
      var w = $container.width();
      var margin = 10;
      var cW = w / 8 - margin;
      var cH = cW;
      var h = cH * 5 + 50;
      var scale, areaScale;

      // Combine with top 10 data
      var networkData = _.map(dSpending.pacs, function(d, di) {
        d = _.extend({}, _.findWhere(dTop20, { id: d.id }), d);
        return d;
      });

      // Sort
      networkData = _.sortBy(networkData, function(d) { return d.raised * -1; });
      networkData = _.sortBy(networkData, 'party');

      // Make scales
      scale = d3.scale.linear()
        .range([0, cW])
        .domain([0, d3.max(networkData, function(d) { return d.raised; })]);
      areaScale = d3.scale.linear()
        .range([0, cW * cW])
        .domain([0, d3.max(networkData, function(d) { return d.raised; })]);

      // Calculate some draw data
      networkData = _.map(networkData, function(d, di) {
        d.x = (di % 8) * (cW + margin) + (cW / 2) + margin;
        d.y = (d.party === 'dfl') ? cH + margin : (cH + margin) * 4;
        d.cellEdge = Math.sqrt(areaScale(d.raised));
        d.nameX = d.x - (cW / 2);
        d.nameY = d.y + 5;
        d.nameW = cW;
        return d;
      });
      networkData = _.map(networkData, function(d) {
        if (d['spent-to']) {
          d['spent-to'].toObject = _.findWhere(networkData, { id: d['spent-to'].to });
        }
        return d;
      });

      // Network
      this.chartNetwork($container, networkData, w, h, scale, areaScale);

    }
  });

  // Instantiate
  return new App({});
});
