(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare, execute) {
    if (typeof name != 'string')
      throw "System.register provided no module name";

    var entry;

    // dynamic
    if (typeof declare == 'boolean') {
      entry = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      entry = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }

    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }

  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute)
      throw new TypeError("Invalid System.register form for " + entry.name);

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, __useDefault: true };
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    var module = entry.module.exports;

    if (!module || !entry.declarative && module.__esModule !== true)
      module = { 'default': module, __useDefault: true };

    // return the defined module object
    return modules[name] = module;
  };

  return function(mains, declare) {

    var System;
    var System = {
      register: register, 
      get: load, 
      set: function(name, module) {
        modules[name] = module; 
      },
      newModule: function(module) {
        return module;
      },
      global: global 
    };
    System.set('@empty', {});

    declare(System);

    for (var i = 0; i < mains.length; i++)
      load(mains[i]);
  }

})(typeof window != 'undefined' ? window : global)
/* (['mainModule'], function(System) {
  System.register(...);
}); */

(['test'], function(System) {

(function() {
function define(){};  define.amd = {};
System.register("b-amd-shims-amd", [], false, function(__require, __exports, __module) {
  return (function() {
    return {hasBeenShimmed: false};
  }).call(this);
});
})();
(function() {
function define(){};  define.amd = {};
System.register("a-amd-shims-cjs", ["b-amd-shims-cjs"], false, function(__require, __exports, __module) {
  return (function(b) {
    b.hasBeenShimmed = true;
  }).call(this, __require('b-amd-shims-cjs'));
});
})();
(function() {
function define(){};  define.amd = {};
System.register("a-amd-shims-global", [], false, function(__require, __exports, __module) {
  return (function() {
    window.aAmdShimsGlobal = {hasBeenRun: true};
  }).call(this);
});
})();
(function() {
function define(){};  define.amd = {};
System.register("b-cjs-shims-amd", [], false, function(__require, __exports, __module) {
  return (function() {
    return {hasBeenShimmed: false};
  }).call(this);
});
})();
System.register("a-cjs-shims-cjs", ["b-cjs-shims-cjs"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var b = require("b-cjs-shims-cjs");
  b.hasBeenShimmed = true;
  global.define = __define;
  return module.exports;
});

System.register("_dummy-cjs", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var dummy = 1;
  module.exports = dummy;
  global.define = __define;
  return module.exports;
});

(function() {
function define(){};  define.amd = {};
System.register("b-es6-shims-amd", [], false, function(__require, __exports, __module) {
  return (function() {
    return {hasBeenShimmed: false};
  }).call(this);
});
})();
System.register("b-es6-shims-cjs", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {hasBeenShimmed: false};
  global.define = __define;
  return module.exports;
});

(function() {
function define(){};  define.amd = {};
System.register("b-global-shims-amd", [], false, function(__require, __exports, __module) {
  return (function() {
    return {hasBeenShimmed: false};
  }).call(this);
});
})();
System.register("a-global-shims-cjs", [], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, []);
  (function() {
    (function() {
      window.aGlobalShimsCjs = {hasBeenRun: true};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("a-global-shims-global", [], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, []);
  (function() {
    (function() {
      window.aGlobalShimsGlobal = {hasBeenRun: true};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("b-amd-shims-cjs", ["a-amd-shims-cjs"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {hasBeenShimmed: false};
  global.define = __define;
  return module.exports;
});

System.register("b-amd-shims-global", ["a-amd-shims-global"], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, ["a-amd-shims-global"]);
  (function() {
    (function() {
      window.bAmdShimsGlobal = {hasBeenShimmed: window.aAmdShimsGlobal && window.aAmdShimsGlobal.hasBeenRun || false};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("b-cjs-shims-cjs", ["a-cjs-shims-cjs"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {hasBeenShimmed: false};
  global.define = __define;
  return module.exports;
});

System.register("a-cjs-shims-global", ["_dummy-cjs"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  require("_dummy-cjs");
  window.aCjsShimsGlobal = {hasBeenRun: true};
  global.define = __define;
  return module.exports;
});

System.register("b-es6-shims-global", ["a-es6-shims-global"], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, ["a-es6-shims-global"]);
  (function() {
    (function() {
      window.bEs6ShimsGlobal = {hasBeenShimmed: window.aEs6ShimsGlobal && window.aEs6ShimsGlobal.hasBeenRun || false};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("b-global-shims-cjs", ["a-global-shims-cjs"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {hasBeenShimmed: false};
  global.define = __define;
  return module.exports;
});

System.register("b-global-shims-global", ["a-global-shims-global"], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, ["a-global-shims-global"]);
  (function() {
    (function() {
      window.bGlobalShimsGlobal = {hasBeenShimmed: window.aGlobalShimsGlobal && window.aGlobalShimsGlobal.hasBeenRun || false};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("b-cjs-shims-global", ["a-cjs-shims-global"], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, ["a-cjs-shims-global"]);
  (function() {
    (function() {
      window.bCjsShimsGlobal = {hasBeenShimmed: window.aCjsShimsGlobal && window.aCjsShimsGlobal.hasBeenRun || false};
    })();
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, false);
});

System.register("b-amd-shims-es6", [], function (_export) {
  return {
    setters: [],
    execute: function () {
      "use strict";

      _export("default", {
        hasBeenShimmed: false
      });
    }
  };
});
System.register("b-cjs-shims-es6", [], function (_export) {
  return {
    setters: [],
    execute: function () {
      "use strict";

      _export("default", {
        hasBeenShimmed: false
      });
    }
  };
});
System.register("b-es6-shims-es6", [], function (_export) {
  return {
    setters: [],
    execute: function () {
      "use strict";

      _export("default", {
        hasBeenShimmed: false
      });
    }
  };
});
System.register('a-es6-shims-global', [], function (_export) {
  var foo;
  return {
    setters: [],
    execute: function () {
      'use strict';

      window.aEs6ShimsGlobal = {
        hasBeenRun: true
      };

      foo = 'bar';

      _export('foo', foo);
    }
  };
});
System.register("b-global-shims-es6", [], function (_export) {
  return {
    setters: [],
    execute: function () {
      "use strict";

      _export("default", {
        hasBeenShimmed: false
      });
    }
  };
});
System.register('test', ['b-amd-shims-amd', 'b-amd-shims-cjs', 'b-amd-shims-es6', 'b-amd-shims-global', 'b-cjs-shims-amd', 'b-cjs-shims-cjs', 'b-cjs-shims-es6', 'b-cjs-shims-global', 'b-es6-shims-amd', 'b-es6-shims-cjs', 'b-es6-shims-es6', 'b-es6-shims-global', 'b-global-shims-amd', 'b-global-shims-cjs', 'b-global-shims-es6', 'b-global-shims-global'], function (_export) {
  var bAmdShimsAmd, bAmdShimsCjs, bAmdShimsEs6, bAmdShimsGlobal, bCjsShimsAmd, bCjsShimsCjs, bCjsShimsEs6, bCjsShimsGlobal, bEs6ShimsAmd, bEs6ShimsCjs, bEs6ShimsEs6, bEs6ShimsGlobal, bGlobalShimsAmd, bGlobalShimsCjs, bGlobalShimsEs6, bGlobalShimsGlobal;

  function render(label, shimSuccessful) {
    var el = document.createElement('div');
    var result = shimSuccessful ? 'SUCCESS' : 'FAIL';
    el.innerHTML = label + ': ' + result;
    document.body.appendChild(el);
  }

  return {
    setters: [function (_bAmdShimsAmd) {
      bAmdShimsAmd = _bAmdShimsAmd['default'];
    }, function (_bAmdShimsCjs) {
      bAmdShimsCjs = _bAmdShimsCjs['default'];
    }, function (_bAmdShimsEs6) {
      bAmdShimsEs6 = _bAmdShimsEs6['default'];
    }, function (_bAmdShimsGlobal) {
      bAmdShimsGlobal = _bAmdShimsGlobal['default'];
    }, function (_bCjsShimsAmd) {
      bCjsShimsAmd = _bCjsShimsAmd['default'];
    }, function (_bCjsShimsCjs) {
      bCjsShimsCjs = _bCjsShimsCjs['default'];
    }, function (_bCjsShimsEs6) {
      bCjsShimsEs6 = _bCjsShimsEs6['default'];
    }, function (_bCjsShimsGlobal) {
      bCjsShimsGlobal = _bCjsShimsGlobal['default'];
    }, function (_bEs6ShimsAmd) {
      bEs6ShimsAmd = _bEs6ShimsAmd['default'];
    }, function (_bEs6ShimsCjs) {
      bEs6ShimsCjs = _bEs6ShimsCjs['default'];
    }, function (_bEs6ShimsEs6) {
      bEs6ShimsEs6 = _bEs6ShimsEs6['default'];
    }, function (_bEs6ShimsGlobal) {
      bEs6ShimsGlobal = _bEs6ShimsGlobal['default'];
    }, function (_bGlobalShimsAmd) {
      bGlobalShimsAmd = _bGlobalShimsAmd['default'];
    }, function (_bGlobalShimsCjs) {
      bGlobalShimsCjs = _bGlobalShimsCjs['default'];
    }, function (_bGlobalShimsEs6) {
      bGlobalShimsEs6 = _bGlobalShimsEs6['default'];
    }, function (_bGlobalShimsGlobal) {
      bGlobalShimsGlobal = _bGlobalShimsGlobal['default'];
    }],
    execute: function () {
      'use strict';

      render('AMD Shims AMD', bAmdShimsAmd.hasBeenShimmed);
      render('AMD Shims CJS', bAmdShimsCjs.hasBeenShimmed);
      render('AMD Shims ES6', bAmdShimsEs6.hasBeenShimmed);
      render('AMD Shims Global', bAmdShimsGlobal.hasBeenShimmed);
      render('CJS Shims AMD', bCjsShimsAmd.hasBeenShimmed);
      render('CJS Shims CJS', bCjsShimsCjs.hasBeenShimmed);
      render('CJS Shims ES6', bCjsShimsEs6.hasBeenShimmed);
      render('CJS Shims Global', bCjsShimsGlobal.hasBeenShimmed);
      render('ES6 Shims AMD', bEs6ShimsAmd.hasBeenShimmed);
      render('ES6 Shims CJS', bEs6ShimsCjs.hasBeenShimmed);
      render('ES6 Shims ES6', bEs6ShimsEs6.hasBeenShimmed);
      render('ES6 Shims Global', bEs6ShimsGlobal.hasBeenShimmed);
      render('Global Shims AMD', bGlobalShimsAmd.hasBeenShimmed);
      render('Global Shims CJS', bGlobalShimsCjs.hasBeenShimmed);
      render('Global Shims ES6', bGlobalShimsEs6.hasBeenShimmed);
      render('Global Shims Global', bGlobalShimsGlobal.hasBeenShimmed);
    }
  };
});
(function() {
  var loader = System;
  var hasOwnProperty = loader.global.hasOwnProperty;
  var moduleGlobals = {};
  var curGlobalObj;
  var ignoredGlobalProps;
  if (typeof indexOf == 'undefined')
    indexOf = Array.prototype.indexOf;
  System.set("@@global-helpers", System.newModule({
    prepareGlobal: function(moduleName, deps) {
      for (var i = 0; i < deps.length; i++) {
        var moduleGlobal = moduleGlobals[deps[i]];
        if (moduleGlobal)
          for (var m in moduleGlobal)
            loader.global[m] = moduleGlobal[m];
      }
      curGlobalObj = {};
      ignoredGlobalProps = ["indexedDB", "sessionStorage", "localStorage", "clipboardData", "frames", "webkitStorageInfo"];
      for (var g in loader.global) {
        if (indexOf.call(ignoredGlobalProps, g) != -1) { continue; }
        if (!hasOwnProperty || loader.global.hasOwnProperty(g)) {
          try {
            curGlobalObj[g] = loader.global[g];
          } catch (e) {
            ignoredGlobalProps.push(g);
          }
        }
      }
    },
    retrieveGlobal: function(moduleName, exportName, init) {
      var singleGlobal;
      var multipleExports;
      var exports = {};
      if (init) {
        var depModules = [];
        for (var i = 0; i < deps.length; i++)
          depModules.push(require(deps[i]));
        singleGlobal = init.apply(loader.global, depModules);
      }
      else if (exportName) {
        var firstPart = exportName.split(".")[0];
        singleGlobal = eval.call(loader.global, exportName);
        exports[firstPart] = loader.global[firstPart];
      }
      else {
        for (var g in loader.global) {
          if (indexOf.call(ignoredGlobalProps, g) != -1)
            continue;
          if ((!hasOwnProperty || loader.global.hasOwnProperty(g)) && g != loader.global && curGlobalObj[g] != loader.global[g]) {
            exports[g] = loader.global[g];
            if (singleGlobal) {
              if (singleGlobal !== loader.global[g])
                multipleExports = true;
            }
            else if (singleGlobal !== false) {
              singleGlobal = loader.global[g];
            }
          }
        }
      }
      moduleGlobals[moduleName] = exports;
      return multipleExports ? exports : singleGlobal;
    }
  }));
})();

});
//# sourceMappingURL=test-built.js.map