/**
 * Main application file for: minnpost-2014-follow-the-money
 *
 * This pulls in all the parts
 * and creates the main object for the application.
 */

// Create main application
require([
  'jquery', 'underscore', 'ractive', 'ractive-events-tap', 'mpConfig', 'mpFormatters',
  'helpers', 'base',
  'text!templates/application.mustache'
], function(
  $, _, Ractive, RactiveEventsTap, mpConfig, mpFormatters,
  helpers, Base,
  tApplication
  ) {
  'use strict';

  // Create new class for app
  var App = Base.BaseApp.extend({

    initialize: function() {
      
      // Create main application view
      this.mainView = new Ractive({
        el: this.$el,
        template: tApplication,
        data: {
        },
        partials: {
        }
      });
    },

    defaults: {
      name: 'minnpost-2014-follow-the-money',
      el: '.minnpost-2014-follow-the-money-container'
    }
  });

  var app = new App();
});
