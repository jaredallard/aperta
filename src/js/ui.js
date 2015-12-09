/**
 * Ui Library.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

var debug = require('debug'),
    path  = require('path'),
    hand  = require('handlebars'),
    fs    = require('fs');

var gui = require('nw.gui');
var win = gui.Window.get();

// we don't use a true "class" because we don't need to make other instances of ui
window.ui = {
  templates: {},
  init: function() {
    debug('ui', 'init');
  },
  loginError: function() {
    $('.mdl-textfield').addClass('is-invalid');
  },
  mainError: function(error) {
    // TODO
    // show errors using this function.
  },
  doLogin: function() {
    debug('ui', 'do login');

    $('.mdl-textfield').removeClass('is-invalid');

    var user = $('#user').val();
    var password = $('#password').val();

    M.mc_getClientAndAccess(user, password, function(err) {
      if(err) {
        ui.loginError('Invalid Credentials');
        return console.log('Failed to get access tokens!');
      }

      ui.showMain();
    });
  },

  showMain: function() {
    var launcher = require('./launcher.json'),
        path     = require('path'),
        auth     = require(path.join(M.minecraft_dir, 'auth.json'));

    win.hide();

    var launcher_win = gui.Window.open(launcher.main, launcher.window);
    launcher_win.hide();
    launcher_win.reload();
    launcher_win.show();

    launcher_win.on('close', function() {
      this.hide();
      this.close(true);
      win.show();
    })
  },
  doMain: function() {
    var auth = require(path.join(M.minecraft_dir, 'auth.json'));

    var nBody = document.body.innerHTML.replace(/\{\{user\.name\}\}/g, auth.user);
    document.body.innerHTML = nBody;
  },
  doLogout: function() {
    fs.unlinkSync(path.join(M.minecraft_dir, 'auth.json'))
    gui.Window.get().close();
  },
  installOrLaunchMod: function(elem) {
    var modpack = $(elem).attr('data-name');
    console.log('[ui]', 'asked to install or launch mod:', modpack);

    if(!fs.existsSync(path.join(M.minecraft_envs, modpack))) {
      return this.installMod(elem);
    } else {
      return M.launchProfile(modpack);
    }
  },
  installMod: function(elem) {
    var that    = this,
        modpack = $(elem).attr('data-name');

    console.log('[ui]', 'asked to install mod:', modpack);

    $('.progress-wrapper').show();

    M.installModpack(modpack, function(err, state, filename) {
      if(err) {
        that.mainError('failed to install modpack!')
        return;
      }

      $('#p1na').text(filename.substr(0, 30));
      $('#p1nu').text(state.percent+'/100');
      document.querySelector('#p1').MaterialProgress.setProgress(state.percent);
    }, function(err) {
      if(err) {
        console.log(err);
        return;
      }

      $('.progress-wrapper').hide();
      $(elem).find('.mdl-button').text('LAUNCH')
    });
  },
  getMods: function() {
    if(ui.templates.mod===undefined) {
      ui.templates.mod = hand.compile($('#modpackListTemplate').html());
    }

    $('#mods').html('');

    M.get('modpack', {}, function(err, body) {
      if(err) {
        console.log(err);
        return;
      }

      var mods;
      try {
        mods = JSON.parse(body).result.results;
      } catch(err) {
        console.error(err);
        return;
      }

      for(var i = 0; i !== mods.length; i++) {
        var mod = mods[i].value;

        var installed_status = 'INSTALL'
        if(fs.existsSync(path.join(M.minecraft_envs, mod.name))) {
          installed_status = 'LAUNCH';
        }

        $('#mods').append(ui.templates.mod({
          name: mod.name,
          author: mod.authors[0].name,
          pubkey: mod.pubkey,
          image: mod.image,
          installed: installed_status,
          desc: mod.desc
        }));
      }
    });
  }
}
