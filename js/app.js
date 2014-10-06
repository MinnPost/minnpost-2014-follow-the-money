/**
 * Main application file for: minnpost-2014-follow-the-money
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require([
  'jquery', 'underscore', 'ractive', 'ractive-events-tap', 'd3',
  'mpConfig', 'mpFormatters', 'base',
  'text!templates/application.mustache',
  'text!../data/dfl-top.json',
  'text!../data/top-gop.json',
  'text!../data/top-20-all.json'
], function(
  $, _, Ractive, RactiveEventsTap, d3, mpConfig, mpFormatters, Base,
  tApplication,
  dDFLTop, dGOPTop, dTop20
  ) {
  'use strict';

  // Parse JSON data
  dDFLTop = JSON.parse(dDFLTop);
  dGOPTop = JSON.parse(dGOPTop);
  dTop20 = JSON.parse(dTop20);

  // Create new class for app
  var App = Base.BaseApp.extend({

    initialize: function() {

      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: {
          top20: _.sortBy(dTop20, 'receipts').reverse(),
          top20Max: d3.max(dTop20, function(d) { return d.receipts; })
        }
      });

      // Create charts
      this.chartDFL3();
      this.chartGOPTop();
    },

    // The big 3
    chartDFL3: function() {
      var canvas, groups, raised, spent, lines;
      var $container = this.$('.chart-big-dfl');
      var w = $container.width();
      var h = 400;
      var positions = {
        '2014-fund': [w * 0.25, h * 0.3333],
        'win-mn': [w * 0.75, h * 0.3333],
        'abm': [w * 0.5, h * 0.66666]
      };
      var maxEdge = (h * 0.31);
      var scale = d3.scale.linear()
        .range([0, maxEdge * maxEdge])
        .domain([0, d3.max(dDFLTop, function(d) {
          return Math.max(
            d3.max(d.raised, function(d) { return d.amount; }) || 0,
            d3.max(d.spent, function(d) { return d.amount; }) || 0
          );
        })]);
      var line = d3.svg.line().interpolate('basis');

      // Edge amount
      function edgeAmount(d) {
        return Math.sqrt(scale(d.amount));
      }

      // Amount positions
      function positionAmount(xy) {
        return function(d, di) {
          if ((xy === 'x' && (di === 0 || di === 2)) ||
            (xy === 'y' &&  (di === 0 || di === 1))) {
            return edgeAmount(d) * -1;
          }
          else if ((xy === 'x' && (di === 1 || di === 3)) ||
            (xy === 'y' &&  (di === 2 || di === 3))) {
            return 0;
          }
        };
      }

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

      // Lines
      lines = _.filter(dDFLTop[2].raised, function(d, di) {
        return d.name !== 'other';
      });
      lines = canvas.selectAll('.group-link')
        .data(lines).enter()
        .append('path')
        .attr('class', 'group-link')
        .attr('d', function(d) {
          return line([positions[d.name], [w / 2, h / 1.9], positions.abm]);
        })
        .style('stroke-width', function(d) {
          return scale(d.amount / 200);
        });

      // Draw each group
      groups = canvas.selectAll('.group')
        .data(dDFLTop).enter()
        .append('g').attr('class', 'group')
        .attr('transform', function(d) {
          return 'translate(' + positions[d.id][0] + ', ' + positions[d.id][1] + ')';
        });

      // Raised
      raised = groups.selectAll('.raised')
        .data(function(d) {
          return (d.id !== 'abm') ? d.raised : [];
        }).enter()
        .append('rect')
        .attr('class', function(d) { return 'raised ' + d.name; })
        .attr('x', positionAmount('x'))
        .attr('y', positionAmount('y'))
        .attr('width', edgeAmount)
        .attr('height', edgeAmount);

      // Spent
      spent = groups.selectAll('.spent')
        .data(function(d) {
          return d.spent;
        }).enter()
        .append('rect')
        .attr('class', function(d) { return 'spent ' + d.name; })
        .attr('x', positionAmount('x'))
        .attr('y', positionAmount('y'))
        .attr('width', edgeAmount)
        .attr('height', edgeAmount);
    },

    // Top GOP
    chartGOPTop: function() {
      var canvas, groups, raised, spent, cash, lines;
      var $container = this.$('.chart-network-gop');
      var w = $container.width();
      var h = 400;
      var margin = 10;
      var cW = ((w - margin * 5) / 4);
      var cH = (h / 2) - margin;
      var maxEdge = Math.min(cW, cH);
      var scale = d3.scale.linear()
        .range([0, maxEdge * maxEdge])
        .domain([0, d3.max(dGOPTop, function(d) {
          return d.raised;
        })]);
      var line = d3.svg.line().interpolate('basis');

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

      // Draw each group
      groups = canvas.selectAll('.group')
        .data(dGOPTop).enter()
        .append('g').attr('class', 'group')
        .attr('transform', function(d, di) {
          // Translate to center bottom of cell, rotate, then shift
          return 'translate(' +
            (((cW + margin) * (di % 4)) + (cW / 2) + margin) +
            ', ' +
            (((cH + margin) * (Math.floor(di / 4) + 1))) + ') ' +
            'rotate(-180) ' +
            'translate(' + ((Math.sqrt(scale(d.raised)) / 2) * -1) + ', 0)';
        });

      // Raised
      raised = groups.selectAll('.raised')
        .data(function(d) { return [d]; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'raised'; })
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', function(d) {
          return Math.sqrt(scale(d.raised));
        })
        .attr('height', function(d) {
          return Math.sqrt(scale(d.raised));
        });

      // Spent
      raised = groups.selectAll('.spent')
        .data(function(d) { return [d]; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'spent'; })
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', function(d) {
          return Math.sqrt(scale(d.spent));
        })
        .attr('height', function(d) {
          return Math.sqrt(scale(d.spent));
        });

      // Spent
      cash = groups.selectAll('.cash')
        .data(function(d) { return [d]; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'cash'; })
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', function(d) {
          return Math.sqrt(scale(d.cash));
        })
        .attr('height', function(d) {
          return Math.sqrt(scale(d.cash));
        });
    },

    defaults: {
      name: 'minnpost-2014-follow-the-money',
      el: '.minnpost-2014-follow-the-money-container'
    }
  });

  // Instantiate
  return new App({});
});
