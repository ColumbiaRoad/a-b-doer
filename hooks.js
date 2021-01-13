"use strict";Object.defineProperty(exports,"__esModule",{value:true});exports.useHook=exports.useRef=void 0;/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */ /**
 * Initializes the reference object.
 * @returns {Ref}
 */const useRef=()=>{return{current:null}};/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */exports.useRef=useRef;const useHook=cb=>{setTimeout(cb,0)};exports.useHook=useHook;
