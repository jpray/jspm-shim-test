#jspm shim tests

Testing what types for modules can shim what types of modules (amd, cjs, es6, global) using [jspm](http://jspm.io/)

###General Idea:
module a shims module b

###Running Tests
`npm install`

`jspm install`

`grunt`

#last run produced the following results using jspm 0.15.3
```
AMD Shims AMD: SUCCESS
AMD Shims CJS: FAIL
AMD Shims ES6: FAIL
AMD Shims Global: SUCCESS
CJS Shims AMD: SUCCESS
CJS Shims CJS: FAIL
CJS Shims ES6: FAIL
CJS Shims Global: SUCCESS
ES6 Shims AMD: FAIL
ES6 Shims CJS: FAIL
ES6 Shims ES6: FAIL
ES6 Shims Global: FAIL
Global Shims AMD: SUCCESS
Global Shims CJS: FAIL
Global Shims ES6: FAIL
Global Shims Global: SUCCESS
```
