/**
 * RequireJS config which maps out where files are and shims
 * any non-compliant libraries.
 */
require.config({
  // Hack around jQuery
  map: {
    '*': {
      'jquery': 'jquery-noconflict'
    },
    'jquery-noconflict': {
      'jquery': 'jquery'
    }
  },
  shim: {
    
    
    
  },
  baseUrl: 'js',
  paths: {
    
    'requirejs': '../bower_components/requirejs/require',
    'almond': '../bower_components/almond/almond',
    'text': '../bower_components/text/text',
    'jquery': '../bower_components/jquery/dist/jquery',
    'underscore': '../bower_components/underscore/underscore',
    'ractive': '../bower_components/ractive/ractive-legacy',
    'ractive-events-tap': '../bower_components/ractive-events-tap/ractive-events-tap',
    'mpConfig': '../bower_components/minnpost-styles/dist/minnpost-styles.config',
    'mpFormatters': '../bower_components/minnpost-styles/dist/minnpost-styles.formatters',
    'jquery-noconflict': 'build/jquery-noconflict',
    'minnpost-2014-follow-the-money': 'app'
  }
});
