/**
 * Aperta Server Library and Minecraft Aspects
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.1-.0
 * @license MIT
 * @todo seperation of MC and apertad APIs
 * @todo use aync.waterfall [more than now]
 **/

// NOTE: to use apertad with jQuery instead of request, just re-write request method
var request  = require('request'),
    fs       = require('fs'),
    chldpro  = require('child_process'),
    os       = require('os'),
    path     = require('path'),
    crypto   = require('crypto'),
    progress = require('request-progress'),
    unzip    = require('unzip'),
    async    = require('async'),
    mkdirp   = require('mkdirp'),
    pgp      = require('openpgp'),
    events   = require('events');

/**
 * apertad
 * @constructor
 **/
var apertad = function(server_uri, version, secure) {
  this.api_version = version;
  this.templates = {};
  this.pgp = {};
  this.pgp.keyring = {};
  this.pgp.master = {};

  server_uri = server_uri.replace(/\/$/g, ''); // remove trailing slash
  server_uri = server_uri.replace(/^https?:\/\//g, ''); // remove http(s)

  if(secure) { // TODO: ternary
    this.server = 'https://'+server_uri;
  } else {
    this.server = 'http://'+server_uri;
  }
  this.server = this.server+'/v'+version

  var minecraft_dir = 'gamedir';

  if(!path.isAbsolute(minecraft_dir)) {
    minecraft_dir = path.join(path.dirname(require.main.filename), minecraft_dir);
  }

  var _masterkey = path.join(path.dirname(require.main.filename), 'apertad/apertad.pub');
  this.setPubKeySigningKey(_masterkey, function(err) {
    if(err) {
      console.log(err);
    }

    console.log('[apertad]', 'set master key');
  })

  var minecraft_exists = false;
  if(fs.existsSync(minecraft_dir)) {
    minecraft_exists = true;
  } else {
    console.log('[apertad]', 'mkdirp minecraft dir, wil say not exists.')
    mkdirp.sync(minecraft_dir);
  }

  // list java version
  function getDirectories(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
  }

  var os_platform = os.platform(),
      os_arch     = os.arch().replace('x', ''),
      java_binary,
      java_dir;

    if(os_platform === 'win32') {
      os_platform = 'windows';
    } else if(os_platform === 'macosx') {
      os_platform = 'osx'; // darwin?
    } else { // default to nix
      os_platform = 'linux';
    }

  if(os_platform === 'windows') {
    java_dir = 'C:/Program Files/';

    java_dir += 'Java/';

    // search the dirs
    var versions;
    try {
      versions = fs.readdirSync(java_dir);
    } catch(err) {
      throw 'ERRJAVA';
    }

    // use the first one for now.
    java_dir += versions[0]+'/bin'
    java_binary = java_dir+'/java.exe'

    if(!fs.existsSync(java_binary)) {
      throw 'ERRJAVA'; // bug
    }
  } else {
    java_dir = '/usr/bin';
    java_binary = java_dir+'/java'

    if(fs.existsSync(java_binary) !== true) {
      throw 'ERRJAVALINUX';
    }
  }

  this.events = new events.EventEmitter();


  console.log('[apertad]', 'running on:', os_platform);
  console.log('[apertad]', 'arch:', os_arch);
  console.log('[apertad]', 'minecraft:', minecraft_dir);
  // console.log('[apertad]', 'minecraft exists:', minecraft_exists);
  console.log('[apertad]', 'java path:', java_dir+'/java');
  console.log('[apertad]', 'server:', server_uri);
  console.log('[apertad]', 'server endpoint:', '/v'+version);

  this.minecraft_dir = minecraft_dir;
  this.minecraft_assets = path.join(minecraft_dir, 'assets');
  this.minecraft_vers = path.join(minecraft_dir, 'versions');
  this.minecraft_tmp  = path.join(minecraft_dir, 'tmp');
  this.minecraft_libs = path.join(minecraft_dir, 'libraries');
  this.minecraft_envs = path.join(minecraft_dir, 'envs');
  this.minecraft_natives = os_platform;
  this.java_dir = java_dir;
  this.os_arch = os_arch;
  this.os_platform = os_platform;
  this.java_binary = java_binary;
}

/**
 * Send a request to the API.
 *
 * @param {method} String - GET/POST/DELETE/PUT
 * @param {url} String - aka endpoint i.e modpacks
 * @param {params} Object - params to send in the body on anything but GET.
 * @param {callback} Function - on success or error
 **/
apertad.prototype.request = function(method, url, params, cb) {
  method = method.toUpperCase();
  url = url.replace(/\/$/g, '');
  url = this.server+'/'+url;

  if(method === 'GET') {
    if(Object.keys(params).length !== 0) {
      var str = "";
      for (var key in params) {
          if (str != "") {
              str += "&";
          }
          str += key + "=" + encodeURIComponent(params[key]);
      }

      url = url+'?'+str;
    }
  } else if(method === 'PUT') {
    if(params['apikey'] !== undefined) {
      url += '?'+encodeURIComponent(params['apikey']);
      delete params['apikey'];
    }
  }

  var isJsonData = false;
  var body = params;
  if(Object.prototype.toString.call(params) === "[object Object]" && method !== 'GET') {
    console.log('[apertad]', 'is json')
    isJsonData = true
  } else {
    body = ''; // hack fix to fix GET body
  }

  console.log('[apertad]', method, url)
  request({
    method: method,
    uri: url,
    body:  body,
    json: isJsonData
  }, function(err, res, body) {
    if(err) {
      return cb(err);
    }

    return cb(null, body);
  });
}

apertad.prototype.get = function (url, params, cb) {
  this.request('GET', url, params, cb);
};

apertad.prototype.post = function(url, params, cb) {
  this.request('POST', url, params, cb);
}

apertad.prototype.put = function(url, params, cb) {
  this.request('PUT', url, params, cb);
}

apertad.prototype.delete = function(url, params, cb) {
  this.request('DELETE', url, params, cb);
}

/**
 * Set the key to be "ultimately trusted". This key is used to verify the
 * authicity of all public keys retrieved from the aperta server.
 * If this is incorrectly set, then all keys will fail to be imported from the
 * server.
 *
 * @param {path} String - path to the master key, should be ascii-armored.
 * @param {cb} Function - on success or error.
 **/
apertad.prototype.setPubKeySigningKey = function(path, cb) {
  var that = this;

  console.log('[CRTWRN]', 'master key has been requested to be changed.',
              'Seeing this more than once should be reported to the devs immediatly.');
  fs.exists(path, function(exists) {
    if(!exists) {
      return cb('ERRNOTEXIST');
    }

    fs.readFile(path, 'utf8', function(err, data) {
      if(err) {
        return cb(err);
      }

      var fingerprint,
          pgp_key;

      try {
        var pgpdata = pgp.key.readArmored(data);
        var pgp_key = pgpdata.keys[0].primaryKey; // this may need to be adjusted for single RSA keys?
        fingerprint = pgp_key.fingerprint;

        // set this as the master key.
        that.pgp.master.fingerprint = fingerprint
        that.pgp.master.key = pgp_key;
      } catch(err) {
        return cb(err);
      }

      return cb(null);
    })
  })
};

/**
 * Obtain and verify a public key by it's fingerprint, and insert it
 * into the keyring.
 * Currently the only supported method of obtaining a public key.
 *
 * @param {fingerprint} String - fingerprint of the key
 * @param {cb} Function - on success or error.
 * @callback {cb} err, openpgp::Key
 *
 * @todo lookup syntax for JSDoc callbacks
 **/
apertad.prototype.getPubKeyByFingerPrint = function(fingerprint, cb) {
  var that = this;

  this.get('pubkey/'+fingerprint, {}, function(err, data) {
    if(err) {
      return cb(err);
    }

    try {
      data = JSON.parse(data);
    } catch(err) {
      return cb(err);
    }

    try {
      var pubkey = pgp.key.readArmored(data.data).keys[0];
      var clearMessage = pgp.cleartext.readArmored(data.signature);

      // verify the public keys signature.
      pgp.verifyClearSignedMessage(pubkey, clearMessage).then(function(sigCheck){
        // insert the key intro our keyring.
        if(sigCheck.signatures[0].valid) {
          that.insertPubkeyIntoKeyring(pubkey, function() {
            return cb(null);
          });
        } else {
          return cb('ERRSIGINVALID');
        }
      });
    } catch(err) {
      return cb(err);
    }
  });
};

/**
 * Insert openpgp::Key into global keyring.
 *
 * @param {key} openpgp::Key - key to insert into keyring.
 * @param {cb} Function - on success or error
 **/
apertad.prototype.insertPubkeyIntoKeyring = function(key, cb) {
  // verify it is an actual pgp finerprint.
  // TODO: verify we have to refer to the method key.primaryKey
  this.pgp.keyring[key.primaryKey.fingerprint] = key;
}

/**
 * Dump the keyring to a file.
 *
 * @param {cb} String - on success or error.
 **/
apertad.prototype.dumpKeyring = function(cb) {

}

/**
 * Rebuild the keyring from a keyring archive.
 *
 * @param {cb} Function - on success or error
 **/
apertad.prototype.restoreKeyring = function(cb) {

}

/**
 * Get a public key from the keystore by it's fingerprint, if it exists.
 *
 * @param {fingeprint} String - the fingerprint of the requested public key.
 **/
apertad.prototype.getPubKeyFromKeyringByFingerprint = function(fingerprint) {
  return this.pgp.keyring[fingerprint];
}

/**
 * Verify a file by it's signature.
 *
 * @param {file_path} String - path to the file to be validated.
 * @param {file_sig} String - path to the file's signature.
 **/
apertad.prototype.verifySignature = function(file_path, file_sig, cb) {

};

/**
 * Get minecraft access tokens
 *
 * @param {username} String - username or email of minecraft user
 * @param {password} String - plaintext user password
 * @param {callback} Function - on success or error
 **/
apertad.prototype.mc_getClientAndAccess = function(username, password, callback) {
  if(callback === undefined) {
    callback = function() {};
  }

  var that = this;
  request({
    method: 'POST',
    uri: 'https://authserver.mojang.com/authenticate',
    body: {
      agent: {
        name: 'Minecraft',
        version: 1
      },
      username: username,
      password: password
    },
    json: true
  }, function(err, res, body) {
    if(err) {
      callback(err);
      return;
    }

    var uuidDash = function(uuid) {
      // TODO: make regex cleaner.z
      return uuid.replace(/([a-zA-Z0-9]{8})([a-zA-Z0-9]{4})([a-zA-Z0-9]{4})([a-zA-Z0-9]{4})([a-zA-Z0-9]{12})/, "$1-$2-$3-$4-$5");
    }

    if(body.selectedProfile === undefined) {
      return callback('bad_credentials');
    }

    var compilied = JSON.stringify({
      uuid: body.selectedProfile.id,
      uuidDash: uuidDash(body.selectedProfile.id), // TODO
      accessToken: body.accessToken,
      clientToken: body.clientToken,
      clientTokenDash: uuidDash(body.clientToken),
      username: username,
      user: body.selectedProfile.name
    });

    fs.writeFile(path.join(that.minecraft_dir, 'auth.json'), compilied, 'utf8', function(err) {
      if(err) {
        return callback(err);
      }

      return callback(null);
    });
  });
}

/**
 * Get the list of versions
 **/
apertad.prototype.mc_getVersions = function() {
  var that = this;
  request({
    method: 'GET',
    uri: ' http://s3.amazonaws.com/Minecraft.Download/versions/versions.json'
  }, function(err, res, body) {
    if(err) {
      cb(err);
      return;
    }

    var versions_list;
    try {
      versions_list = JSON.parse(body);
    } catch(err) {
      return cb(err);
    }

    return cb(null, versions_list.objects);
  });
}

/**
 * Get the assets for a index (version)
 *
 * @param {version} String - minecraft index version
 * @param {cb} Function - on success or error
 **/
apertad.prototype.mc_getAssets = function(version, cb) {
  var that = this;
  request({
    method: 'GET',
    uri: 'https://s3.amazonaws.com/Minecraft.Download/indexes/'+version+'.json'
  }, function(err, res, body) {
    if(err) {
      return cb(err);
    }

    var assets_list;
    try {
      assets_list = JSON.parse(body);
    } catch(err) {
      return cb(err);
    }

    return cb(null, assets_list.objects, assets_list);
  });
}

/**
 * Download libararies required by Minecraft and Forge.
 *
 * @param {version} String - Minecraft version
 * @param {onProgress} Function - on download progress every 100ms
 * @param {cb} Function - on success or error
 * @param {forge} String - Forge version
 *
 * @todo cleanup
 * @todo async.waterfall?
 **/
apertad.prototype.downloadAVersion = function(version, onProgress, cb, forge) {
  var sl   = path.join(this.minecraft_vers, version),
      sjs  = path.join(sl, version+'.json'),
      sja  = path.join(sl, version+'.jar'),
      that = this;

  // create the director[y/ies].
  mkdirp.sync(sl);

  var output = fs.createWriteStream(sja),
      mc_version_base,
      mc_version_jar,
      mc_version_json;

  // less code repatability.
  mc_version_base = 'http://s3.amazonaws.com/Minecraft.Download/versions/';
  mc_version_base += version+'/'+version;

  mc_version_jar = mc_version_base+'.jar';
  mc_version_json = mc_version_base+'.json';

  progress(request(mc_version_jar), {
    throttle: 100
  }).on('progress', function(state) {
    onProgress(null, state, path.basename(mc_version_jar));
  }).on('error', function(err) {
    console.log('[WARN]', 'request states error on downloading: ', lib_name, lib_ver)
    return onProgress(err);
  }).pipe(output);

  output.on('close', function() {
    onProgress(null, { percent: 100 }, path.basename(mc_version_jar));

    var output = fs.createWriteStream(sjs);

    progress(request(mc_version_json), {
      throttle: 100
    }).on('progress', function(state) {
      onProgress(null, state, path.basename(mc_version_json));
    }).on('error', function(err) {
      console.log('[WARN]', 'request states error on downloading: ', lib_name, lib_ver)
      return onProgress(err);
    }).pipe(output);

    output.on('close', function() {
      console.log('downloaded:', version+'.json');

      onProgress(null, { percent: 100 }, path.basename(mc_version_json));

      try {
        var lc = fs.readFileSync(sjs, 'utf8');
        var ll = JSON.parse(lc).libraries;
      } catch(err) {
        return cb('DOWNLOADERR', err);
      }

      // FORGE "HOOK" hacky at the moment.
      if(forge) { // TODO: seperate from version profile
        // check if it exists?
        console.log('INFO', 'told to use forge version', forge);

        var forge_info = path.join(that.minecraft_vers, forge, forge+'.json');

        if(!fs.existsSync(forge_info)) {
          console.log('WARN', 'we\'ve been told to use forge but the path wasn\'t found');
          console.log('INFO', 'path =', forge_info);
          return;
        }

        var lfc = fs.readFileSync(forge_info, 'utf8'),
            lfp = JSON.parse(lfc).versionInfo.libraries;

        // bad deps
        var maven_override = [
          'com.typesafe:config:1.2.1',
          'com.typesafe.akka:akka-actor_2.11:2.3.3'
        ];

        console.log('[INFO]', 'scanning for version conflicts and merging forge libs')
        for(var i = 0; i !== lfp.length; i++) { // TODO: document
          var remote_lib = lfp[i].name.split(':');

          for(var ii = 0; ii!== ll.length; ii++) {
            var local_lib = ll[ii].name.split(':')
            if(local_lib[0] === remote_lib[0] && local_lib[1] === remote_lib[1]) {
              if(local_lib[2] !== remote_lib[2]) {
                console.warn('[WARN]', 'local lib "'+local_lib[1]+'" is a different version than the forge requested lib.');
                ll.splice(ii, 1);
                break;
              }
            }
          }

          if(maven_override.indexOf(lfp[i].name) !== -1) {
            console.warn('[WARN]', 'overiding maven URL for remote dep', lfp[i].name);
            lfp[i].url = 'http://central.maven.org/maven2/';
          }

          console.log('[NOTICE]', 'INJECT {forge}', lfp[i].name);
          ll.push(lfp[i]);
        }
        console.log('[INFO]', 'done')
      }

      var natives     = [],
          non_natives = [];

      var downloadLib = function(lib_obj, lib_cb) {
        var so = lib_obj.name.split(':');

        var readahead = 0;

        var lib_package = so[0].replace(/\./g, '/'),
            lib_name    = so[1],
            lib_ver     = so[2].replace(/\.$/, ''),
            lib_path    = lib_name+'-'

        var sl = path.join(that.minecraft_libs, lib_package, lib_name, lib_ver);

        if(lib_obj.rules !== undefined) {
          for(var i = 0; i !== lib_obj.rules.length; i++) {
            var tnativer = lib_obj.rules[i];

            if(tnativer.action === 'disallow') {
              if(tnativer.os.name === that.os_platform) {
                console.log('[NOTICE]', 'This native is DISALLOWED on this platform');
                return lib_cb('[DISALLOWED] ', lib_name, lib_ver);
              }
            }
          }
        }

        // make the director[y/ies]
        mkdirp.sync(sl);

        if(lib_obj.natives !== undefined) {
          // console.log('NOTICE', 'this is a native');
          if(lib_obj.natives[that.minecraft_natives] !== undefined) {
            lib_path += lib_ver+'-'+lib_obj.natives[that.minecraft_natives].replace('${arch}', that.os_arch);
            lib_obj.path = path.join(sl, lib_path);
            natives.push(lib_obj);
          } else {
            console.log('[NOTICE]', 'Native isn\'t supported for this platform');
            return lib_cb('[SKIP] ', lib_name, lib_ver);
          }
        } else {
          readahead = 1; // is a non-native hook
          lib_path += lib_ver;
        }

        var lib_url = lib_path;

        var is_forge_jar = /net.minecraftforge:forge:/g;
        if(is_forge_jar.test(lib_obj.name)) {
          lib_url += '-universal';
        }

        // file ext
        lib_path += '.jar';
        lib_url  += '.jar';

        var dl = lib_package+'/'+lib_name+'/'+lib_ver+'/'+lib_url,
        sf = path.join(sl, lib_path),
        output = fs.createWriteStream(sf);

        if(readahead === 1) {
          non_natives.push(sf); // faster start times
        }

        // DEBUG: console.log('GET', 'https://libraries.minecraft.net/'+dl);
        var url = lib_obj.url || 'https://libraries.minecraft.net/';

        // show progress on download
        progress(request(url+dl), {
          throttle: 100
        }).on('progress', function(state) {
          onProgress(null, state, path.basename(url+dl));
        }).on('error', function(err) {
          console.log('[WARN]', 'request states error on downloading: ', lib_name, lib_ver)
          onProgress(err);
        }).pipe(output);

        output.on('close', function(err) {
          onProgress(null, { percent: 100 }, path.basename(url+dl));

          var is_cust = '';
          if(lib_obj.url) {
            is_cust += '[URL] ';
          }
          if(lib_obj.natives) {
            is_cust += '[NATIVE] ';
          }
          lib_cb(is_cust+'200 OK', lib_name, lib_ver);
        });
      }

      // super hacky async loop
      var i = 0;
      function loop(list, downloader, loop_cb) {
        if(list[i] === undefined) {
          return loop_cb(null);
        }

        downloader(list[i], function(s, ln, lv) {
          console.log(s, ln+'-'+lv);
          i++;
          loop(list, downloader, loop_cb);
        });
      }

      loop(ll, downloadLib, function() {
        fs.writeFile(path.join(that.minecraft_vers, version, version+'-natives.json'), JSON.stringify(natives), 'utf8', function(err) {
          if(err) {
            return cb(err);
          }

          fs.writeFile(path.join(that.minecraft_vers, version, version+'-libs.json'), JSON.stringify(non_natives), 'utf8', function(err) {
            if(err) {
              return cb(err);
            }

            return cb(null);
          });
        });
      });
    });
  });
}

/**
 * Download assets for {version} index of MC.
 *
 * @param {version} String - minecraft asset index number
 * @param {onProgrss} Function - called on progress every 100ms
 * @param {cb} Function - called on success or error
 **/
apertad.prototype.downloadVersionAssets = function(version, onProgress, cb) {
  var that = this;

  if(fs.existsSync(path.join(this.minecraft_assets, 'indexes', version+'.json'))) {
    return cb(null); // already exists, return
  }

  this.mc_getAssets(version, function(err, al, al_obj) {
    if(err) {
      cb(err);
      return;
    }

    var indexes = path.join(that.minecraft_assets, 'indexes')

    mkdirp.sync(indexes);

    fs.writeFileSync(path.join(indexes, version+'.json'), JSON.stringify(al_obj), 'utf8');

    var aa = [];
    for (var key in al) {
       if (al.hasOwnProperty(key)) {
         var obj = al[key];
         obj.name = key;
         aa.push(obj);
       }
    }

    var downloadAsset = function(hash, cb) {
      var sh = hash.substr(0, 2),
          sl = path.join(that.minecraft_assets, 'objects', sh),
          sf = path.join(sl, hash);

      mkdirp.sync(sl);

      var output = fs.createWriteStream(sf);

      var asset_url = 'http://resources.download.minecraft.net/'+sh+'/'+hash;

      progress(request(asset_url), {
        throttle: 2
      }).on('progress', function(state) {
        onProgress(null, state, path.basename(asset_url));
      }).on('error', function(err) {
        onProgress(err);
      }).pipe(output);

      output.on('close', function() {
        onProgress(null, { percent: 100 }, path.basename(asset_url));
        cb();
      });
    }

    var i = 0;
    function loop(list, downloader, cb) {
      if(list[i] === undefined) {
        cb(null);
        return;
      }

      downloader(list[i].hash, function() {
        console.log('[ASSET]', list[i].name);
        i++;
        loop(list, downloader, cb);
      });
    }

    loop(aa, downloadAsset, function() {
      cb(null)
    });
  });
}

/**
 * Create profile utiziling MC.
 *
 * @param {name} String - profile name
 * @param {version} String - minecraft version
 * @param {onProgress} Function - called on progress update every 100ms
 * @param {cb} Function - called on success or error
 * @param {forge_version} String - forge version to use.
 *
 * @todo async.waterfall
 **/
apertad.prototype.createProfile = function(name, version, onProgress, cb, forge_version) {
  var that = this,
      dir  = path.join(this.minecraft_envs, name);

  // create the director[y/ies]
  mkdirp.sync(dir);

  console.log('INFO', 'downloading libraries');
  this.downloadAVersion(version, onProgress, function(err) {
    if(err) {
      return cb(err);
    }

    var index,
        fp,
        fc;

    try {
      fp = path.join(that.minecraft_vers, version, version+'.json');
      fc = fs.readFileSync(fp, 'utf8');

      // parse the assets file
      index = JSON.parse(fc).assets;
    } catch(err) {
      return cb(err);
    }

    console.log('INFO', 'index is', index);
    console.log('INFO', 'downloading assets')

    that.downloadVersionAssets(index, onProgress, function(err) {
      if(err) {
        return cb(err);
      }

      var obj = {
        version: 1,
        mc_version: version,
        custom_opts: null
      };

      if(forge_version !== undefined) {
        obj.is_modded = true;
        obj.forge_version = forge_version;
        obj.forge_is_installed = false;
      }

      fs.writeFile(dir+'/profile.json', JSON.stringify(obj), 'utf8', function(err) {
        if(err) {
          return cb(err);
        } else {
          return cb(null);
        }
      });
    })
  }, forge_version);
}

/**
 * Launch a profile
 *
 * @param {name} String - Name of the profile, should be same as installed name
 * @param {stdout} Function - called on stdout of launcher instance.
 * @param {stderr} Function - called on stderr of launcher instance.
 * @param {cb} Function - callback
 **/
apertad.prototype.launchProfile = function(name, stdout, stderr, cb) {
  var dir          = path.join(this.minecraft_envs, name),
      that         = this,
      forge_opts   = '',
      natives_path = path.join(dir, 'natives'),
      exec         = chldpro.spawn;

  // launcher variables
  var forge_jar,
      forge_info,
      main_class,
      manifest,
      version,
      vmanifest,
      vnatives,
      vlibs,
      version_jar,
      launcher;

  // user related variables
  var auth,
      my_uuid,
      my_at,
      my_ct,
      my_un;

  // verify the profile exists.
  if(!fs.existsSync(dir)) {
    return cb('PROFILENOTFOUND');
  }

  try {
    forge_jar = '';
    manifest = JSON.parse(fs.readFileSync(dir+'/profile.json', 'utf8'));
    version = manifest.mc_version;
    vmanifest = JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'.json'), 'utf8'));
    vnatives= JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'-natives.json'), 'utf8'));
    vlibs = JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'-libs.json'), 'utf8'));
    version_jar = path.join(this.minecraft_vers, version, version+'.jar');
    main_class = 'net.minecraft.client.main.Main';

    auth = JSON.parse(fs.readFileSync(path.join(this.minecraft_dir, 'auth.json'), 'utf8'));
    my_uuid = auth.uuid;
    my_at   = auth.accessToken;
    my_ct   = auth.clientToken;
    my_un   = auth.user;

    if(manifest.is_modded === true) {
      forge_info = path.join(this.minecraft_vers, manifest.forge_version, manifest.forge_version+'.json');
      main_class = new String(JSON.parse(fs.readFileSync(forge_info, 'utf8')).versionInfo.mainClass);
      version = manifest.forge_version; // hacky, remove eventually
    }
  } catch(err) {
    return cb(err);
  }

  // extract the natives
  async.each(vnatives, function(file, callback) {
    file.path += '.jar'; // TODO: on download, not instancing.

    console.log('[INFO]', 'extract '+file.name);

    var uzs = fs.createReadStream(file.path)
    .pipe(unzip.Extract({
      path: natives_path
    }));

    uzs.on('error', function(err) {
      return callback(err);
    });

    uzs.on('close', function() {
      console.log('[INFO]', 'extracted '+file.name);
      return callback();
    });
  }, function(err) {
    if(err) {
      return cb(err);
    }

    var java_args = [
      '-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump',
      '-Xms512m',
      '-Xmx2048m',
      '-XX:+UseConcMarkSweepGC',
      '-XX:-UseAdaptiveSizePolicy',
      '-Duser.language=en',
      '-Djava.library.path='+natives_path,
      '-cp',
      vlibs.toString().replace(/\,/g, ';')+';'+version_jar,
      main_class,
      '--username',
      my_un,
      '--version',
      version,
      '--gameDir',
      dir,
      '--assetsDir',
      that.minecraft_assets,
      '--assetIndex',
      vmanifest.assets,
      '--uuid',
      my_uuid,
      '--userProperties',
      '{}',
      '--accessToken',
      my_at,
      '--userType',
      'mojang',
      '--tweakClass',
      'cpw.mods.fml.common.launcher.FMLTweaker'
    ];

    // net.minecraft.client.main.Main
    // java args: console.log(that.java_binary, java_args.toString().replace(/\,/g, ' '));

    try {
      if(!stdout) {
        stdout = function() {

        };
      }
      if(!stderr) {
        stderr = function() {

        }
      }

      launcher = exec(that.java_binary, java_args, { cwd: dir });
      launcher.stderr.on('data', stderr);
      launcher.stdout.on('data', stdout);
      launcher.on('close', function() {
        return cb();
      });
    } catch(err) {
      return cb(err);
    }
  });
}

/**
 * Download a forge instance.
 *
 * @param {version} String - Forge version to use.
 * @param {onProgress} Function - called on download progress.
 * @param {cb} Function - called when forge is "installed", or on error.
 **/
apertad.prototype.downloadForge = function(version, onProgress, cb) {
  var base      = path.join(this.minecraft_vers, version),
      save_jar  = path.join(this.minecraft_tmp, version+'-src.jar'),
      ws        = fs.createWriteStream(save_jar);

  var forge_url = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/'
      forge_url += version+'/forge-'+version+'-installer.jar';

  // create the director[y/ies]
  mkdirp.sync(base);
  mkdirp.sync(path.basename(save_jar));

  // download forge
  console.log('[apertad]', 'GET', forge_url)
  progress(request(forge_url), {
    throttle: 100 // only deliver progress statuses every 100ms
  }).on('progress', function(state) {
    return onProgress(null, state, path.basename(forge_url));
  }).on('error', function(err) {
    return onProgress(err);
  }).pipe(ws);

  // when file is down being downloaded
  ws.on('close', function() {
    var uzs = fs.createReadStream(save_jar)
    .pipe(unzip.Parse())
    .on('entry', function (entry) {
      var fileName = entry.path;
      var type = entry.type; // 'Directory' or 'File'
      var size = entry.size;

      // only extract install_profile.json
      if (fileName === "install_profile.json") {
        entry.pipe(fs.createWriteStream(path.join(base, version+'.json')));
      } else {
        entry.autodrain();
      }
    });

    uzs.on('close', function() {
      fs.unlink(save_jar, function(err) {
        if(err) {
          return cb('DELFAILFORGE'); // failed to delete forge jar file
        }

        // no issues
        return cb();
      });
    });
  });
}

/**
 * Install a modpack by name
 *
 * @param {name} String - modpack name
 * @param {onProgress} Function - called on progresss of download(s) every 100ms
 * @param {onFinished} Function - called when modpack is installed or fails to.
 **/
apertad.prototype.installModpack = function(name, onProgress, onFinished) {
  var that = this;
  this.get('modpack/'+name, {}, function(err, data) {
    if(err) {
      return cb(err);
    }

    var dj;
    try {
      dj = JSON.parse(data);
    } catch(err) {
      return cb(err);
    }

    if(dj.success === false) {
      return cb("ERRNOTFOUND");
    }

    // create the director[y/ies]
    mkdirp.sync(that.minecraft_tmp);

    async.waterfall([
      function(cb) {
        console.log('[INFO]', 'installing forge version')
        that.downloadForge(dj.versions.forge, onProgress, function(err) {
          return cb(err);
        });
      },
      function(cb) {
        console.log('[INFO]', 'installing mc, libs, and forge libs');
        that.createProfile(dj.name, dj.versions.mc, onProgress, function(err) {
          console.log(err);
          return cb(err);
        }, dj.versions.forge);
      },
      function(cb) {
        if(dj.files.length === 0) {
          return cb();
        }

        console.log('[INFO]', 'installing modpack mods');

        var downloadModpack = function() {
          async.each(dj.files, function(modbun, callback) {
            var base_dir;
            if(modbun.type === 'mods') {
              base_dir = path.join(that.minecraft_envs, dj.name, 'mods');
            } else if (modbun.type === 'config') {
              base_dir = path.join(that.minecraft_envs, dj.name, 'config');
            } else {
              console.warn('[DANGER]', 'module type was NOT expected to be', modbun.type);
              return callback('FATAL');
            }

            var tmp = crypto.randomBytes(4).readUInt32LE(0);
            var tmp_file_path = path.join(that.minecraft_tmp, tmp+'.zip');
            var tmp_file      = fs.createWriteStream(tmp_file_path);

            // progress handler
            progress(request(modbun.uri), {
              throttle: 1
            }).on('progress', function(state) {
              onProgress(null, state, path.basename(modbun.uri));
            }).on('error', function(err) {
              onProgress(err);
            }).pipe(tmp_file);

            tmp_file.on('close', function() {
              console.log('[INFO]', 'extracting type', modbun.type, 'from {tmp}', tmp);
              var uzs = fs.createReadStream(tmp_file_path)
              .pipe(unzip.Extract({
                path: base_dir
              }));

              uzs.on('error', function(err) {
                // TODO: parse non-critical errors, i.e file already exists.
                return callback(err);
              });

              uzs.on('close', function() {
                onProgress(null, { percent: 100 }, path.basename(modbun.uri));
                console.log('[INFO]', 'extracted type ', modbun.type, 'from {tmp}', tmp);
                return callback();
              });
            });
          }, function(err) {
            cb(err);
          });
        }

        if(dj.pgp) {
          if(dj.pgp.fingerprint) {
            that.getPubKeyByFingerPrint(dj.pgp.fingerprint, function(err) {
              if(err) {
                return console.log(err);
              }

              console.log('[apertad]', 'PGP (fingerprint)', dj.pgp.fingerprint,
                'successfully imported.')
            })
          }
        }
      }
    ], function(err) {
      if(err) {
        return onFinished(err);
      }

      return onFinished(null);
    })
  });
}

// copy and paste usage, this is here purely because of the hell that is programming in nw.js
// var m = require('./js/apertad.js'); var o = new m('127.0.0.1', '1', false);
// var m = require('./js/apertad.js'); var o = new m('127.0.0.1', '1', false); o.createProfile('test', '1.7.10', function() {}, '1.7.10-10.13.4.1566-1.7.10')
// var m = require('./js/apertad.js'); var o = new m('127.0.0.1', '1', false); o.launchProfile('test');
// var m = require('./js/apertad.js'); var o = new m('127.0.0.1', '1', false); o.installModpack('rdelro')

module.exports = apertad;
