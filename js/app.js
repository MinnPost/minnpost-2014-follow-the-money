/**
 * Main application file for: minnpost-2014-follow-the-money
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 *
 * In retrospect, this should have been done just with Ractive and D3 is not
 * really necessary.
 */

// Create main application
require([
  'jquery', 'underscore', 'ractive', 'ractive-events-tap', 'd3', 'qtip',
  'mpConfig', 'mpFormatters', 'base',
  'text!templates/application.mustache',
  'text!templates/tooltip.underscore',
  'text!templates/race-group.underscore',
  'text!../data/top-dfl.json',
  'text!../data/top-gop.json',
  'text!../data/top-20.json',
  'text!../data/race-spending.json',
  'text!../data/combined-parties.json'
], function(
  $, _, Ractive, RactiveEventsTap, d3, qtip, mpConfig, mpFormatters, Base,
  tApplication, tTooltip, tRaceGroup,
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
  tRaceGroup = _.template(tRaceGroup);

  // Create new class for app
  var App = Base.BaseApp.extend({

    defaults: {
      name: 'minnpost-2014-follow-the-money',
      el: '.minnpost-2014-follow-the-money-container'
    },

    // Start app
    initialize: function() {

      // Attach extra formaters
      mpFormatters.currencyShort = this.currencyShort;

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
          f: mpFormatters,
          scale: this.scale,
          areaScale: this.areaScale
        }
      });

      // Tooltips
      this.addTooltips('.chart-top-20 .chart-value');
      this.addTooltips('.chart-gop-v-dfl .chart-value');

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
    chartNetwork: function($container, data, w, h, scale, areaScale, canvas) {
      var thisApp = this;
      var flowScale = 1.5;
      var legendMargin = 10;
      var groups, raised, spent, lines, names, legend, legendEdge;
      var line = d3.svg.line();
      scale = scale || this.scale;
      areaScale = areaScale || this.areaScale;

      // Draw canvas
      if (!canvas) {
        $container.html('');
        canvas = d3.select($container[0]).append('svg')
          .attr('width', w).attr('height', h);
      }

      // Lines
      lines = _.filter(data, function(d, di) {
        return _.isObject(d['spent-to']);
      });
      lines = canvas.selectAll('.group-link')
        .data(lines).enter()
        .append('path')
        .attr('class', 'group-link')
        .attr('data-from', function(d) { return d.id; })
        .attr('data-to', function(d) { return d['spent-to'].toObject.id; })
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
        .append('g')
        .attr('class', 'group')
        .attr('data-id', function(d) { return d.id; })
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
        .attr('class', 'raised')
        .attr('data-id', function(d) { return d.id; })
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
        .attr('class', 'spent')
        .attr('data-id', function(d) { return d.id; })
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
          .attr('class', function(d) {
            return ((d.party) ? d.party : '') + ' name ' + (d.nameClass ? d.nameClass : '');
          })
          .attr('data-id', function(d) { return d.id; })
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

      // Mouseover for highlighting
      groups
        .classed('hoverable', true)
        .on('mouseover', function(d, di) {
          canvas.selectAll('[data-id="' + d.id + '"], [data-from="' + d.id + '"], [data-to="' + d.id + '"]')
            .classed('active', true);
        })
        .on('mouseout', function(d, di) {
          canvas.selectAll('[data-id="' + d.id + '"], [data-from="' + d.id + '"], [data-to="' + d.id + '"]')
            .classed('active', false);
        });

      return canvas;
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
          d.y = h - thisApp.paxBoxMargin - 40;
        }

        d.cellEdge = Math.sqrt(thisApp.areaScale(d.raised));

        d.nameX = d.x - (thisApp.pacBoxH / 2) + (thisApp.paxBoxMargin / 2);
        d.nameY = (d.id === '2014-fund' || d.id === 'win-mn') ?
          d.y - d.cellEdge - 40 :
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
      var h = (this.pacBoxH + this.paxBoxMargin) * 2 + 40;
      var margin = this.paxBoxMargin;
      var cW = this.pacBoxH;
      var cH = this.pacBoxH;

      // Calculate some draw data
      var networkData = _.map(dTopGOP, function(d, di) {
        var top = (di < 4);
        var longName = d.name.length > 25;

        d.cellEdge = Math.sqrt(thisApp.areaScale(d.raised));

        d.x = top ? (((cW + margin) * (di % 4)) + (cW / 2) + margin) :
          (((w / 5 - margin / 2) * ((di - 4) % 5)) + (cW / 2) + margin);
        d.y = top ? (cH + margin) - (cH - d.cellEdge) + 50 :
          ((cH + margin) * 2) - 40;

        d.nameW = top ? (thisApp.pacBoxH - thisApp.paxBoxMargin) :
          (w / 5 - margin);
        d.nameX = top ? d.x - (thisApp.pacBoxH / 2) + (thisApp.paxBoxMargin / 2) :
          d.x - d.nameW / 2;
        d.nameY = top ? d.y - d.cellEdge - 5 - (longName ? 58 : 32) :
          d.y + 5;
        d.nameClass = top ? 'on-top' : '';

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
      var rM = margin * 7;
      var rW = (w - margin * 10) / 3 - rM;
      var h = cH * 5 + 100;
      var canvas, scale, areaScale, raceData, line, lines, races;

      // Combine with top 10 data
      var networkData = _.map(dSpending.pacs, function(d, di) {
        d = _.extend({}, _.findWhere(dTop20, { id: d.id }), d);
        return d;
      });

      // Sort
      //networkData = _.sortBy(networkData, 'party');

      // Make scales
      scale = d3.scale.linear()
        .range([0, cW])
        .domain([0, d3.max(networkData, function(d) { return d.raised; })]);
      areaScale = d3.scale.linear()
        .range([0, cW * cW])
        .domain([0, d3.max(networkData, function(d) { return d.raised; })]);

      // Calculate some draw data
      networkData = _.map(networkData, function(d, di) {
        var part = (d.party === 'dfl') ? (di % 7) : ((di - 7) % 8);
        d.x = part * (cW + margin) + (cW / 2) + margin;
        d.y = (d.party === 'dfl') ? cH + margin : (cH + margin) * 4 + 50;
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

      // Create race draw data
      raceData = _.map(dSpending.races, function(d, di) {
        d.x = (di % 3) * (rW + rM) + (margin * 8);
        d.y = cH * 2 + margin * 5;
        d.w = rW;
        d.h = cH - margin;
        d.cX = d.x + (d.w / 2);
        d.cY = d.y + (d.h / 2);
        return d;
      });

      // Create canvas
      $container.html('');
      canvas = d3.select($container[0]).append('svg')
        .attr('width', w).attr('height', h);

      // Create link data
      networkData = _.map(networkData, function(d) {
        if (d.races) {
          d.races = _.map(d.races, function(r, ri) {
            d.races[ri].toObject = _.findWhere(raceData, { id: r.name });
            return r;
          });
        }
        return d;
      });

      // Lines
      line = d3.svg.line();
      lines = _.filter(networkData, function(d, di) {
        return _.isArray(d.races);
      });
      lines = canvas.selectAll('.g-group-link')
        .data(lines).enter()
        .append('g')
        .each(function(g, gi) {
          // Add each race
          d3.select(this).selectAll('.group-link')
            .data(g.races).enter()
            .append('path')
            .attr('class', 'group-link')
            .attr('data-from', g.id)
            .attr('data-to', function(d) { return d.toObject.id; })
            .attr('d', function(d) {
              return line([
                [g.x, (g.party === 'dfl') ? g.y - (g.cellEdge / 4) :  g.y - (g.cellEdge / 1.5)],
                [d.toObject.cX, d.toObject.cY]
              ]);
            })
            .style('stroke-width', function(d) {
              return Math.max(2, scale(d.amount) / 1.5);
            });
        });

      // Network
      canvas = this.chartNetwork($container, networkData, w, h, scale, areaScale, canvas);

      // Draw race group boxes
      canvas.selectAll('.race')
        .data(raceData).enter()
        .append('rect')
        .attr('class', 'race')
        .attr('data-id', function(d) { return d.id; })
        .attr('x', function(d) { return d.x; })
        .attr('y', function(d) { return d.y; })
        .attr('width', function(d) { return d.w; })
        .attr('height', function(d) { return d.h; });

      races = canvas.selectAll('.race-title')
        .data(raceData).enter()
        .append('foreignObject')
        .attr('class', 'race-title')
        .attr('data-id', function(d) { return d.id; })
        .attr('title', function(d) {
          return tTooltip({ d: d, f: mpFormatters, type: 'race' });
        })
        .attr('x', function(d) { return d.x; })
        .attr('y', function(d) { return d.y; })
        .attr('width', function(d) { return d.w; })
        .attr('height', function(d) { return d.h; })
        .append('xhtml:body')
          .attr('class', 'mp')
          .append('xhtml:div')
            .style({})
            .html(function(d) { return tRaceGroup({ d: d, f: mpFormatters}); });

      // Add tooltips
      //this.addTooltips($container.find('.race-title'));

      // Mouse over for the race groups
      races
        .classed('hoverable', true)
        .on('mouseover', function(d, di) {
          canvas.selectAll('[data-id="' + d.id + '"], ' +
            '[data-from="' + d.id + '"], [data-to="' + d.id + '"]')
            .classed('active', true);
        })
        .on('mouseout', function(d, di) {
          canvas.selectAll('[data-id="' + d.id + '"], ' +
          '[data-from="' + d.id + '"], [data-to="' + d.id + '"]')
            .classed('active', false);
        });
    },

    // Rudimentary formatter for currency
    currencyShort: function(input) {
      input = parseFloat(input);

      if (input < 1000) {
        input = Math.round(input);
      }
      else if (input < 1000000) {
        input = input / 1000;
        input = Math.round(input * 10) / 10;
        input = input.toFixed(1) + 'K';
      }
      else {
        input = input / 1000000;
        input = Math.round(input * 10) / 10;
        input = input.toFixed(1) + 'M';
      }

      return '$' + input;
    }
  });

  // Instantiate
  return new App({});
});
