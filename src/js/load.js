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

// close buttons
$('.login-drag-close').on('click', function() {
  winclose();
})

function winclose() {
  console.log('close window')
  var gui = require('nw.gui');
  var win = gui.Window.get();

  gui.App.closeAllWindows();
  gui.App.quit();

  win.close(true); // fallback
}
