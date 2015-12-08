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

var mmd = require('./js/apertad.js'); // TODO: make a npm module.

// instance it.
var M = new mmd('mc.jaredallard.me:8080', '1', false);

// init the ui library
ui.init();

if(page) { // we're the launcher!
  page.register({
    name: 'mods',
    title: 'Mods',
    init: function() {
      page.show('mods');
    },
    exit: function() {
      page.hide('mods');
    },
    onBack: function() {
      page.show('mods');
    }
  });

  page.register({
    name: 'about',
    title: 'About',
    init: function() {
      page.show('about');
    },
    exit: function() {
      page.hide('about');
    },
    onBack: function() {
      page.show('about');
    }
  });

  page.set('mods');
}
