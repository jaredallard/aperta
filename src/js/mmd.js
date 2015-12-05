/**
 * Minecraft Modded Daemon (mmd) api library
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.1.4
 * @license MIT
 * @todo seperation of MC and mmd APIs
 * @todo use aync.waterfall
 * @todo change name of library
 **/

// NOTE: to swap, just rewrite the request method
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
    events   = require('events');

var mmd = function(server_uri, version, secure) {
  this.api_version = version;
  this.templates = {};
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

  var minecraft_exists = false;
  if(fs.existsSync(minecraft_dir)) {
    minecraft_exists = true;
  } else {
    console.log('[mmd]', 'mkdirp minecraft dir, wil say not exists.')
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


  console.log('[mmd]', 'running on:', os_platform);
  console.log('[mmd]', 'arch:', os_arch);
  console.log('[mmd]', 'minecraft:', minecraft_dir);
  // console.log('[mmd]', 'minecraft exists:', minecraft_exists);
  console.log('[mmd]', 'java path:', java_dir+'/java');
  console.log('[mmd]', 'server:', server_uri);
  console.log('[mmd]', 'server endpoint:', '/v'+version);

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
 * @param method {string} GET/POST/DELETE/PUT
 * @param url {string} aka endpoint i.e modpacks
 * @param params {object} params to send in the body on anything but GET.
 **/
mmd.prototype.request = function(method, url, params, cb) {
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
    console.log('[mmd]', 'is json')
    isJsonData = true
  } else {
    body = ''; // hack fix to fix GET body
  }

  console.log('[mmd]', method, url)
  request({
    method: method,
    uri: url,
    body:  body,
    json: isJsonData
  }, function(err, res, body) {
    if(err) {
      cb(err);
      return;
    }

    cb(null, body);
  });
}

mmd.prototype.get = function (url, params, cb) {
  this.request('GET', url, params, cb);
};

mmd.prototype.post = function(url, params, cb) {
  this.request('POST', url, params, cb);
}

mmd.prototype.put = function(url, params, cb) {
  this.request('PUT', url, params, cb);
}

mmd.prototype.delete = function(url, params, cb) {
  this.request('DELETE', url, params, cb);
}

mmd.prototype.mc_getClientAndAccess = function(username, password, callback) {
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
 *
 **/
mmd.prototype.mc_getVersions = function() {
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
      cb(err);
      return;
    }

    cb(null, versions_list.objects);
  });
}

/**
 * Get the assets for a index (version)
 *
 * @param version {string} index
 **/
mmd.prototype.mc_getAssets = function(version, cb) {
  var that = this;
  request({
    method: 'GET',
    uri: 'https://s3.amazonaws.com/Minecraft.Download/indexes/'+version+'.json'
  }, function(err, res, body) {
    if(err) {
      cb(err);
      return;
    }

    var assets_list;
    try {
      assets_list = JSON.parse(body);
    } catch(err) {
      cb(err);
      return;
    }

    cb(null, assets_list.objects, assets_list);
  });
}

mmd.prototype.downloadAVersion = function(version, onProgress, cb, forge) {
  var sl   = path.join(this.minecraft_vers, version),
      sjs  = path.join(sl, version+'.json'),
      sja  = path.join(sl, version+'.jar'),
      that = this;

  mkdirp.sync(sl);

  var output = fs.createWriteStream(sja);
  request.get('http://s3.amazonaws.com/Minecraft.Download/versions/'+version+'/'+version+'.jar').pipe(output);
  output.on('close', function() {
    console.log('downloaded:', version+'.jar');

    var output = fs.createWriteStream(sjs);
    request.get('http://s3.amazonaws.com/Minecraft.Download/versions/'+version+'/'+version+'.json').pipe(output);
    output.on('close', function() {
      console.log('downloaded:', version+'.json');

      var lc = fs.readFileSync(sjs, 'utf8');
      var ll = JSON.parse(lc).libraries;

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

        var lfc = fs.readFileSync(forge_info, 'utf8');
        var lfp = JSON.parse(lfc).versionInfo.libraries;

        // bad deps
        var maven_override = [
          'com.typesafe:config:1.2.1',
          'com.typesafe.akka:akka-actor_2.11:2.3.3'
        ];

        console.log('[INFO]', 'scanning for version conflicts and merging forge libs')
        for(var i = 0; i !== lfp.length; i++) {
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

      var downloadLib = function(lib_obj, cb) {
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
                return cb('[DISALLOWED] ', lib_name, lib_ver);
              }
            }
          }
        }

        // make that dir!
        mkdirp.sync(sl);

        if(lib_obj.natives !== undefined) {
          // console.log('NOTICE', 'this is a native');
          if(lib_obj.natives[that.minecraft_natives] !== undefined) {
            lib_path += lib_ver+'-'+lib_obj.natives[that.minecraft_natives].replace('${arch}', that.os_arch);
            lib_obj.path = path.join(sl, lib_path);
            natives.push(lib_obj);
          } else {
            console.log('[NOTICE]', 'Native isn\'t supported for this platform');
            return cb('[SKIP] ', lib_name, lib_ver);
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

        var dl = lib_package+'/'+lib_name+'/'+lib_ver+'/'+lib_url;
        var sf = path.join(sl, lib_path);
        var output = fs.createWriteStream(sf);

        if(readahead === 1) {
          non_natives.push(sf); // faster start times
        }

        // DEBUG: console.log('GET', 'https://libraries.minecraft.net/'+dl);
        var url = lib_obj.url || 'https://libraries.minecraft.net/';

        progress(request(url+dl), {
          throttle: 100
        }).on('progress', function(state) {
          onProgress(null, state, path.basename(url+dl));
        }).on('error', function(err) {
          console.log('[WARN]', 'request states error on downloading: ', lib_name, lib_ver)
          onProgress(err);
        }).pipe(output);

        // console.log('GET', url, dl);

        output.on('close', function(err) {
          onProgress(null, { percent: 100 }, path.basename(url+dl));

          var is_cust = '';
          if(lib_obj.url) {
            is_cust += '[URL] ';
          }
          if(lib_obj.natives) {
            is_cust += '[NATIVE] ';
          }
          cb(is_cust+'200 OK', lib_name, lib_ver);
        });
      }

      // super hacky async loop
      var i = 0;
      function loop(list, downloader, cb) {
        if(list[i] === undefined) {
          cb(null);
          return;
        }

        downloader(list[i], function(s, ln, lv) {
          console.log(s, ln+'-'+lv);
          i++;
          loop(list, downloader, cb);
        });
      }

      loop(ll, downloadLib, function() {
        // todo non sync
        console.log('INFO', 'wrote new JS dbs')
        fs.writeFileSync(path.join(that.minecraft_vers, version, version+'-natives.json'), JSON.stringify(natives), 'utf8');
        fs.writeFileSync(path.join(that.minecraft_vers, version, version+'-libs.json'), JSON.stringify(non_natives), 'utf8');
        cb(null)
      });
    });
  });
}

mmd.prototype.downloadVersionAssets = function(version, onProgress, cb) {
  var that = this;

  if(fs.existsSync(path.join(this.minecraft_assets, 'indexes', version+'.json'))) {
    return cb(null);
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
 * @todo async
 **/
mmd.prototype.createProfile = function(name, version, onProgress, cb, forge_version) {
  var that = this;

  var dir = path.join(this.minecraft_envs, name);
  mkdirp.sync(dir);

  console.log('INFO', 'downloading libraries');
  this.downloadAVersion(version, onProgress, function(err) {
    if(err) {
      cb(err);
      return;
    }

    var index;
    try {
      var fp = path.join(that.minecraft_vers, version, version+'.json');
      var fc = fs.readFileSync(fp, 'utf8');

      index = JSON.parse(fc).assets;
    } catch(err) {
      cb(err);
      return;
    }

    console.log('INFO', 'index is', index);
    console.log('INFO', 'downloading assets')

    that.downloadVersionAssets(index, onProgress, function(err) {
      if(err) {
        cb(err);
        return
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

      fs.writeFileSync(dir+'/profile.json', JSON.stringify(obj), 'utf8');

      if(cb) {
        cb(null);
      }
    })
  }, forge_version);
}

/**
 * Launch a profile
 * @todo async
 **/
mmd.prototype.launchProfile = function(name) {
  var dir          = path.join(this.minecraft_envs, name),
      that         = this,
      forge_opts   = '',
      natives_path = path.join(dir, 'natives'),
      exec         = chldpro.spawn;

  if(!fs.existsSync(dir)) {
    console.log('ERRNOTEXIST');
    return;
  }

  // TODO: PLEASSEEE work on try catch here
  var forge_jar = '';
  var manifest = JSON.parse(fs.readFileSync(dir+'/profile.json', 'utf8'));
  var version = manifest.mc_version;
  var vmanifest = JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'.json'), 'utf8'));
  var vnatives= JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'-natives.json'), 'utf8'));
  var vlibs = JSON.parse(fs.readFileSync(path.join(this.minecraft_vers, version, version+'-libs.json'), 'utf8'));
  var version_jar = path.join(this.minecraft_vers, version, version+'.jar');

  var auth = JSON.parse(fs.readFileSync(path.join(this.minecraft_dir, 'auth.json'), 'utf8'));

  var my_uuid = auth.uuid,
      my_at   = auth.accessToken,
      my_ct   = auth.clientToken,
      my_un   = auth.user;

  var main_class = 'net.minecraft.client.main.Main';

  if(manifest.is_modded === true) {
    forge_info = path.join(this.minecraft_vers, manifest.forge_version, manifest.forge_version+'.json');
    main_class = new String(JSON.parse(fs.readFileSync(forge_info, 'utf8')).versionInfo.mainClass);
    // main_class = 'net.minecraft.launchwrapper.Launch';
    version = manifest.forge_version; // hacky, remove eventually
  }

  async.each(vnatives, function(file, callback) {
    file.path += '.jar'; // add jar ext TODO: make this do it on download, not on instancing.

    console.log('[INFO]', 'extract '+file.name);

    var uzs = fs.createReadStream(file.path)
    .pipe(unzip.Extract({
      path: natives_path
    }));

    uzs.on('error', function() {
      console.log(error);
      throw 'extraction error, fatal.';
    });

    uzs.on('close', function() {
      console.log('[INFO]', 'extracted '+file.name);
      callback();
    });
  }, function(err) {
    if(err) {
      // do soemthing.
      console.log(err);
      return
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

    console.log(that.java_binary, java_args.toString().replace(/\,/g, ' '));

    var launcher = exec(that.java_binary, java_args, { cwd: dir });
    launcher.stderr.on('data', function(data) {
      console.log(data.toString());
    })
    launcher.stdout.on('data', function (data) {
      console.log(data.toString());
    });
  });
}

/**
 * use forge!
 *
 * net.minecraft.launchwrapper.Launch
 * add forge to path
 **/
mmd.prototype.downloadForge = function(version, onProgress, cb) {
  var base = path.join(this.minecraft_vers, version);

  mkdirp.sync(base);

  var save_jar = path.join(base, version+'-src.jar');
  var ws = fs.createWriteStream(save_jar);

  var forge_url = 'http://files.minecraftforge.net/maven/net/minecraftforge/forge/'+version+'/forge-'+version+'-installer.jar';

  progress(request(forge_url), {
    throttle: 100
  }).on('progress', function(state) {
    onProgress(null, state, path.basename(forge_url));
  }).on('error', function(err) {
    onProgress(err);
  }).pipe(ws);

  ws.on('close', function() {
    var uzs = fs.createReadStream(save_jar)
    .pipe(unzip.Parse())
    .on('entry', function (entry) {
      var fileName = entry.path;
      var type = entry.type; // 'Directory' or 'File'
      var size = entry.size;

      if (fileName === "install_profile.json") {
        entry.pipe(fs.createWriteStream(path.join(base, version+'.json')));
      } else {
        entry.autodrain();
      }
    });

    uzs.on('close', function() {
      fs.unlink(save_jar); // remove the source file

      if(fs.existsSync(path.join(base, version+'.json'))) {
        cb('ERRINTEGRITY');
        return;
      }

      // no issues
      cb();
    });
  });
}

/**
 * Install a modpack by name
 **/
mmd.prototype.installModpack = function(name, onProgress, onFinished) {
  var that = this;
  this.get('modpack/'+name, {}, function(err, data) {
    if(err) {
      cb(err);
      return;
    }

    var dj;
    try {
      dj = JSON.parse(data);
    } catch(err) {
      cb(err);
      return;
    }

    if(dj.success === false) {
      cb("ERRNOTFOUND");
      return;
    }

    mkdirp.sync(that.minecraft_tmp);


    async.waterfall([
      function(cb) {
        console.log('[INFO]', 'installing forge version')
        that.downloadForge(dj.versions.forge, onProgress, function() {
          cb();
        });
      },
      function(cb) {
        console.log('[INFO]', 'installing mc, libs, and forge libs');
        that.createProfile(dj.name, dj.versions.mc, onProgress, function() {
          cb();
        }, dj.versions.forge);
      },
      function(cb) {
        if(dj.files.length === 0) {
          return cb();
        }

        console.log('[INFO]', 'installing modpack mods');

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
          var tmp_file = fs.createWriteStream(tmp_file_path);

          console.log('[INFO]', 'downloading type', modbun.type, 'from', modbun.uri);

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

            uzs.on('error', function() {
              // TODO: parse erorrs
            });

            uzs.on('close', function() {
              onProgress(null, { percent: 100 }, path.basename(modbun.uri));
              console.log('[INFO]', 'extracted type ', modbun.type, 'from {tmp}', tmp);
              callback();
            });
          });
        }, function(err) {
          cb(err);
        });
      }
    ], function(err) {
      if(err) {
        return onFinished(err);
      }

      onFinished(null);
    })
  });
}

// copy and paste usage, this is here purely because of the hell that is programming in nw.js
// var m = require('./js/mmd.js'); var o = new m('127.0.0.1', '1', false);
// var m = require('./js/mmd.js'); var o = new m('127.0.0.1', '1', false); o.createProfile('test', '1.7.10', function() {}, '1.7.10-10.13.4.1566-1.7.10')
// var m = require('./js/mmd.js'); var o = new m('127.0.0.1', '1', false); o.launchProfile('test');
// var m = require('./js/mmd.js'); var o = new m('127.0.0.1', '1', false); o.installModpack('rdelro')

module.exports = mmd;
