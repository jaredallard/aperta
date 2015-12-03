/**
 * Load components
 **/

var DEBUG=true;

if(DEBUG) {
  var gui = require('nw.gui');
  var win = gui.Window.get();
  if(!win.isDevToolsOpen()) {
    win.showDevTools();
  }
}

var mmd = require('./js/mmd.js'); // TODO: make a npm module.

// instance it.
var M = new mmd('mc.jaredallard.me:8080', '1', false);

// init the ui library
ui.init();
