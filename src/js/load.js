/**
 * Load components
 **/

var DEBUG=true;

if(DEBUG) {
  var gui = require('nw.gui');
  var win = gui.Window.get();

  try {
    if(!win.isDevToolsOpen()) {
      win.showDevTools();
    }
  } catch(err) {
    // win.showDevTools // nwjs-13-alpha7 support
  }
}

var apertad = require('./js/apertad.js'); // TODO: make a npm module.

// instance it.
var M = new apertad('mc.jaredallard.me:8080', '1', false);

// init the ui library
ui.init();

var page = page;

if(page) {
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
