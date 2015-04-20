System.config({
  "baseURL": "/",
  "transpiler": "babel",
  "babelOptions": {
    "optional": [
      "runtime"
    ]
  },
  "paths": {
    "*": "lib/*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js"
  }
});

System.config({
  "meta": {
    "b-amd-shims-amd": {
      "deps": [
        "a-amd-shims-amd"
      ],
      "format": "amd"
    },
    "b-amd-shims-cjs": {
      "deps": [
        "a-amd-shims-cjs"
      ],
      "format": "cjs"
    },
    "b-amd-shims-es6": {
      "deps": [
        "a-amd-shims-es6"
      ],
      "format": "es6"
    },
    "b-amd-shims-global": {
      "deps": [
        "a-amd-shims-global"
      ],
      "format": "global"
    },
    //
    "b-cjs-shims-amd": {
      "deps": [
        "a-cjs-shims-amd"
      ],
      "format": "amd"
    },
    "b-cjs-shims-cjs": {
      "deps": [
        "a-cjs-shims-cjs"
      ],
      "format": "cjs"
    },
    "b-cjs-shims-es6": {
      "deps": [
        "a-cjs-shims-es6"
      ],
      "format": "es6"
    },
    "b-cjs-shims-global": {
      "deps": [
        "a-cjs-shims-global"
      ],
      "format": "global"
    },
    //
    // THROWS MIXED DEPENDENCY ERROR
    // "b-es6-shims-amd": {
    //   "deps": [
    //     "a-es6-shims-amd"
    //   ],
    //   "format": "amd"
    // },
    // THROWS MIXED DEPENDENCY ERROR
    // "b-es6-shims-cjs": {
    //   "deps": [
    //     "a-es6-shims-cjs"
    //   ],
    //   "format": "cjs"
    // },
    "b-es6-shims-es6": {
      "deps": [
        "a-es6-shims-es6"
      ],
      "format": "es6"
    },
    "b-es6-shims-global": {
      "deps": [
        "a-es6-shims-global"
      ],
      "format": "global"
    },
    
    "b-global-shims-amd": {
      "deps": [
        "a-global-shims-amd"
      ],
      "format": "amd"
    },
    "b-global-shims-cjs": {
      "deps": [
        "a-global-shims-cjs"
      ],
      "format": "cjs"
    },
    "b-global-shims-es6": {
      "deps": [
        "a-global-shims-es6"
      ],
      "format": "es6"
    },
    "b-global-shims-global": {
      "deps": [
        "a-global-shims-global"
      ],
      "format": "global"
    },
  }
});

System.config({
  "map": {
    "babel": "npm:babel-core@5.1.10",
    "babel-runtime": "npm:babel-runtime@5.1.10",
    "core-js": "npm:core-js@0.8.4",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:core-js@0.8.4": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});

