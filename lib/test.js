import bAmdShimsAmd from 'b-amd-shims-amd';
import bAmdShimsCjs from 'b-amd-shims-cjs';
import bAmdShimsEs6 from 'b-amd-shims-es6';
import bAmdShimsGlobal from 'b-amd-shims-global';

import bCjsShimsAmd from 'b-cjs-shims-amd';
import bCjsShimsCjs from 'b-cjs-shims-cjs';
import bCjsShimsEs6 from 'b-cjs-shims-es6';
import bCjsShimsGlobal from 'b-cjs-shims-global';

import bEs6ShimsAmd from 'b-es6-shims-amd';
import bEs6ShimsCjs from 'b-es6-shims-cjs';
import bEs6ShimsEs6 from 'b-es6-shims-es6';
import bEs6ShimsGlobal from 'b-es6-shims-global';

import bGlobalShimsAmd from 'b-global-shims-amd';
import bGlobalShimsCjs from 'b-global-shims-cjs';
import bGlobalShimsEs6 from 'b-global-shims-es6';
import bGlobalShimsGlobal from 'b-global-shims-global';


function render(label,shimSuccessful){
  var el = document.createElement('div');
  var result = shimSuccessful ? 'SUCCESS' : 'FAIL';
  el.innerHTML = label+': '+result;
  document.body.appendChild(el)
}
var test = "test";
//export { test };
  render('AMD Shims AMD',bAmdShimsAmd.hasBeenShimmed);
  render('AMD Shims CJS',bAmdShimsCjs.hasBeenShimmed);
  render('AMD Shims ES6',bAmdShimsEs6.hasBeenShimmed);
  render('AMD Shims Global',bAmdShimsGlobal.hasBeenShimmed);
  render('CJS Shims AMD',bCjsShimsAmd.hasBeenShimmed);
  render('CJS Shims CJS',bCjsShimsCjs.hasBeenShimmed);
  render('CJS Shims ES6',bCjsShimsEs6.hasBeenShimmed);
  render('CJS Shims Global',bCjsShimsGlobal.hasBeenShimmed);
  render('ES6 Shims AMD',bEs6ShimsAmd.hasBeenShimmed);
  render('ES6 Shims CJS',bEs6ShimsCjs.hasBeenShimmed);
  render('ES6 Shims ES6',bEs6ShimsEs6.hasBeenShimmed);
  render('ES6 Shims GLobal',bEs6ShimsGlobal.hasBeenShimmed);
  render('Global Shims AMD',bGlobalShimsAmd.hasBeenShimmed);
  render('Global Shims CJS',bGlobalShimsCjs.hasBeenShimmed);
  render('Global Shims ES6',bGlobalShimsEs6.hasBeenShimmed);
  render('Global Shims Global',bGlobalShimsGlobal.hasBeenShimmed);
