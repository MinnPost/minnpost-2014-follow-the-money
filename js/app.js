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
  'text!templates/tooltip.underscore',
  'text!../data/top-dfl.json',
  'text!../data/top-gop.json',
  'text!../data/top-20.json',
  'text!../data/race-spending.json',
  'text!../data/combined-parties.json'
], function(
  $, _, Ractive, RactiveEventsTap, d3, mpConfig, mpFormatters, Base,
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
          top20: _.sortBy(dTop20, 'receipts').reverse(),
          top20Max: d3.max(dTop20, function(d) { return d.receipts; }),
          combined: _.sortBy(dParties, 'raised').reverse(),
          combinedMax: d3.max(dParties, function(d) { return d.raised; })
        }
      });

      // Determine a max to use with ranges across visualizations
      this.max = Math.max(
        d3.max(dTopDFL, function(d) {
          return Math.max(
            d3.max(d.raised, function(d) { return d.amount; }) || 0,
            d3.max(d.spent, function(d) { return d.amount; }) || 0
          );
        }),
        d3.max(dTopGOP, function(d) {
          return d.raised;
        })
      );
      this.flowScale = 250;

      // Tooltip
      this.$tooltip = $('<div class="tooltip mp">');
      this.$tooltip.appendTo('body');

      // Create charts
      this.chartDFL3();
      this.chartGOPTop();
      this.chartSpending();
    },

    // The big 3
    chartDFL3: function() {
      var thisApp = this;
      var canvas, groups, raised, spent, lines, names;
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
        .domain([0, this.max]);
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
            return (edgeAmount(d) * -1) - 1;
          }
          else if ((xy === 'x' && (di === 1 || di === 3)) ||
            (xy === 'y' &&  (di === 2 || di === 3))) {
            return 0 + 1;
          }
        };
      }

      // Add tooltip
      function addTooltips(elements) {
        elements.on('mouseover', function(d) {
          var $this = $(this);
          d3.select(this).classed('active', true);
          thisApp.$tooltip.html($this.attr('data-tooltip'))
            .addClass('active');
          thisApp.$tooltip
            .css('left', ($this.offset().left - 30) + 'px')
            .css('top', ($this.offset().top - thisApp.$tooltip.outerHeight() - 5) + 'px');
        })
        .on('mouseout', function(d) {
          d3.select(this).classed('active', false);
          thisApp.$tooltip.removeClass('active');
        });
      }

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h + 30);

      // Lines
      lines = _.filter(dTopDFL[2].raised, function(d, di) {
        return d.name !== 'other sources';
      });
      lines = canvas.selectAll('.group-link')
        .data(lines).enter()
        .append('path')
        .attr('class', 'group-link')
        .attr('d', function(d) {
          return line([positions[d.name], [w / 2, h / 1.9], positions.abm]);
        })
        .style('stroke-width', function(d) {
          return scale(d.amount / thisApp.flowScale);
        })
        .attr('data-tooltip', function(d) {
          var name = (d.name === '2014-fund') ? '2014 Fund' : 'Win Minnesota';
          return mpFormatters.currency(d.amount, 0) + ' transfered from ' + name + ' to ABM.';
        });
      addTooltips(lines);

      // Draw each group
      groups = canvas.selectAll('.group')
        .data(dTopDFL).enter()
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
        .attr('class', function(d) { return 'raised ' + mpFormatters.identifier(d.name); })
        .attr('x', positionAmount('x'))
        .attr('y', positionAmount('y'))
        .attr('width', edgeAmount)
        .attr('height', edgeAmount)
        .attr('data-tooltip', function(d) {
          return 'Raised ' + mpFormatters.currency(d.amount, 0) + ' from ' + d.name + '.';
        });
      addTooltips(raised);

      // Spent
      spent = groups.selectAll('.spent')
        .data(function(d) { return d.spent; }).enter()
        .append('rect')
        .attr('class', function(d) { return 'spent ' + mpFormatters.identifier(d.name); })
        .attr('x', positionAmount('x'))
        .attr('y', positionAmount('y'))
        .attr('width', edgeAmount)
        .attr('height', edgeAmount)
        .attr('data-tooltip', function(d) {
          return 'Spent ' + mpFormatters.currency(d.amount, 0) + ' on ' + d.name + '.';
        });
      addTooltips(spent);

      // Names
      names = groups.selectAll('.name')
        .data(function(d) { return [d]; }).enter()
        .append('text').attr('class', 'name')
        .attr('x', function(d) { return 0; })
        .attr('y', function(d) {
          return (d.id === '2014-fund') ? h / 7.2 :
            (d.id === 'win-mn') ? h / 6.9 :
            (d.id === 'abm') ? h / 2.7 : 0;
        })
        .attr('text-anchor', 'middle')
        .text(function(d) { return d.name; });
    },

    // Top GOP
    chartGOPTop: function() {
      var thisApp = this;
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
        .domain([0, this.max]);
      var line = d3.svg.line().interpolate('basis');

      // Draw spent
      function drawSpent(moreThanCash) {
        groups.selectAll('.spent')
          .data(function(d) {
            if (moreThanCash === true) {
              return (d.spent >= d.cash) ? [d] : [];
            }
            else {
              return (d.spent < d.cash) ? [d] : [];
            }
          }).enter()
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
      }

      // Draw cash
      function drawCash(moreThanSpent) {
        groups.selectAll('.cash')
          .data(function(d){
            if (moreThanSpent === true) {
              return (d.cash >= d.spent) ? [d] : [];
            }
            else {
              return (d.cash < d.spent) ? [d] : [];
            }
          }).enter()
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
      }

      // Calculate some draw data
      dTopGOP = _.map(dTopGOP, function(d, di) {
        d.x = (((cW + margin) * (di % 4)) + (cW / 2) + margin);
        d.y = (((cH + margin) * (Math.floor(di / 4) + 1)));
        d.cellEdge = Math.sqrt(scale(d.raised));
        d.subPoint = (d.id === 'mn-business') ? [w / 1.25, h / 1.3] :
          (d.id === 'pro-jobs') ? [w / 2.5, h / 1.7] : [w / 2, h / 2];
        return d;
      });

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

      // Draw lines
      lines = _.filter(dTopGOP, function(d, di) {
        return _.isObject(d['spent-to']);
      });
      lines = _.map(lines, function(d, di) {
        d['spent-to'].toObject = _.findWhere(dTopGOP, { id: d['spent-to'].to });
        return d;
      });

      lines = canvas.selectAll('.group-link')
        .data(lines).enter()
        .append('path')
        .attr('class', 'group-link')
        .attr('d', function(d) {
          return line([
            [d.x, d.y - 2],
            [d['spent-to'].toObject.x, d['spent-to'].toObject.y]
          ]);
        })
        .style('stroke-width', function(d) {
          return Math.max(2, scale(d['spent-to'].amount / thisApp.flowScale));
        });

      // Draw each group
      groups = canvas.selectAll('.group')
        .data(dTopGOP).enter()
        .append('g').attr('class', 'group')
        .attr('transform', function(d, di) {
          // Translate to center bottom of cell, rotate, then shift
          return 'translate(' + d.x + ', ' + d.y + ') ' +
            'rotate(-180) ' +
            'translate(' + ((d.cellEdge / 2) * -1) + ', 0)';
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

      // Z-index doesn't work in SVG
      drawSpent(true);
      drawCash(false);
      drawCash(true);
      drawSpent(false);
    },

    // Spending on races
    chartSpending: function() {
      var thisApp = this;
      var pacs, canvas, groups, raised, spent, cash, lines;
      var $container = this.$('.chart-money-to-races');
      var w = $container.width();
      var h = 500;
      var margin = 10;
      var pacW = ((w - margin * 7) / 8);
      var pacH = (h / 3) - (margin * 2);
      var maxPaxEdge = Math.min(pacW, pacH);
      var scale = d3.scale.linear()
        .range([0, maxPaxEdge * maxPaxEdge])
        .domain([0, this.max]);
      var line = d3.svg.line().interpolate('basis');

      // Calculate some draw data
      pacs = _.map(dSpending.pacs, function(d, di) {
        return d;
      });

      // Draw canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

    }
  });

  // Instantiate
  return new App({});
});
