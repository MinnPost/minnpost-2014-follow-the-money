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
  'text!../data/dfl-top.json'
], function(
  $, _, Ractive, RactiveEventsTap, d3, mpConfig, mpFormatters, Base,
  tApplication,
  dDFLTop
  ) {
  'use strict';

  // Parse JSON data
  dDFLTop = JSON.parse(dDFLTop);

  // Create new class for app
  var App = Base.BaseApp.extend({

    initialize: function() {

      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: {
        }
      });

      // Create charts
      this.chartDFL3();
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
          return scale(d.amount / 100);
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
        .attr('title', function(d) { return d.name; })
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
        .attr('title', function(d) { return d.name; })
        .attr('x', positionAmount('x'))
        .attr('y', positionAmount('y'))
        .attr('width', edgeAmount)
        .attr('height', edgeAmount);
    },

    defaults: {
      name: 'minnpost-2014-follow-the-money',
      el: '.minnpost-2014-follow-the-money-container'
    }
  });

  // Instantiate
  return new App({});
});
