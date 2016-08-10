/*!
 * Vuex actions v1.0.2
 * (c) 2016 vnot
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.VuexActions = global.VuexActions || {})));
}(this, function (exports) { 'use strict';

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  var isFunc = function isFunc(v) {
    return typeof v === 'function';
  };
  var isObject = function isObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  };
  var isPromise = function isPromise(obj) {
    return isObject(obj) && isFunc(obj.then);
  };
  var hasPromise = function hasPromise(obj) {
    return isObject(obj) && Object.keys(obj).some(function (key) {
      return isPromise(obj[key]);
    });
  };
  var hasDeps = function hasDeps(fn) {
    return getDeps(fn) !== null;
  };

  var STATUS = {
    PENDING: 'pending',
    SUCCESS: 'success',
    ERROR: 'error'
  };

  var getDeps = function getDeps(fn) {
    if (isFunc(fn)) {
      return fn._deps;
    }
    return null;
  };

  var $inject = function $inject(fn) {
    return function () {
      for (var _len = arguments.length, deps = Array(_len), _key = 0; _key < _len; _key++) {
        deps[_key] = arguments[_key];
      }

      if (isFunc(fn) && deps.length) {
        fn._deps = deps;
      }
      return fn;
    };
  };

  var execute = function execute(fn, payload) {
    for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
      args[_key2 - 2] = arguments[_key2];
    }

    if (!isFunc(fn) || !hasDeps(fn)) return fn;
    return fn.apply(undefined, toConsumableArray(getDeps(fn).map(function (name) {
      return payload[name];
    })).concat(args));
  };

  var buildPromiseQueue = function buildPromiseQueue(payload) {
    var props = Object.keys(payload);
    var nonDependentProps = props.filter(function (key) {
      return !hasDeps(payload[key]);
    });
    var parsedProps = [].concat(toConsumableArray(nonDependentProps));
    var promiseQueue = [nonDependentProps];

    parseDependencies(promiseQueue);

    return { run: run };

    function parseDependencies(promiseQueue) {
      var remainProps = props.filter(function (prop) {
        return parsedProps.indexOf(prop) === -1;
      });
      var nextProps = [];

      if (!remainProps.length) return;

      remainProps.forEach(function (prop) {
        var isAllDepsParsed = getDeps(payload[prop]).every(function (dep) {
          return parsedProps.indexOf(dep) > -1 || !(dep in payload);
        });
        isAllDepsParsed && nextProps.push(prop);
      });

      if (nextProps.length) {
        promiseQueue.push(nextProps);
        parsedProps.push.apply(parsedProps, nextProps);
      }

      parseDependencies(promiseQueue);
    }

    function run() {
      for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      return promiseQueue.reduce(function (acc, props) {
        return acc.then(function () {
          return resolveProps.apply(undefined, [props].concat(args));
        });
      }, Promise.resolve(1));
    }

    function resolveProps(props) {
      for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }

      var promises = props.map(function (prop) {
        return execute.apply(undefined, [payload[prop], payload].concat(args));
      });

      return Promise.all(promises).then(function (res) {
        props.forEach(function (prop, index) {
          payload[prop] = res[index];
        });
      });
    }
  };

  var dispatchAction = function dispatchAction(commit, action, status) {
    var type = action.type;
    var payload = action.payload;


    commit(type, {
      __status__: status,
      __payload__: payload
    });
  };

  var commitAsPending = function commitAsPending(commit, action) {
    dispatchAction(commit, action, STATUS.PENDING);
  };

  var commitAsSuccess = function commitAsSuccess(commit, action) {
    dispatchAction(commit, action, STATUS.SUCCESS);
  };

  var commitAsError = function commitAsError(commit, action) {
    dispatchAction(commit, action, STATUS.ERROR);
  };

  function createAction(type, payloadCreator) {
    var finalPayloadCreator = isFunc(payloadCreator) ? payloadCreator : function () {
      return arguments.length <= 0 ? undefined : arguments[0];
    };

    return function (_ref) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var dispatch = _ref.dispatch;
      var commit = _ref.commit;

      var payload = finalPayloadCreator.apply(undefined, args);
      var action = { type: type, payload: payload };
      commit = commit || dispatch;

      if (isPromise(payload)) {
        commitAsPending(commit, action);
        return payload.then(function (result) {
          return commitAsSuccess(commit, Object.assign(action, { payload: result }));
        }, function (error) {
          return commitAsError(commit, Object.assign(action, { payload: error }));
        });
      }

      if (hasPromise(payload)) {
        var promiseQueue = buildPromiseQueue(payload);
        commitAsPending(commit, action);
        return promiseQueue.run.apply(promiseQueue, args).then(function (result) {
          return commitAsSuccess(commit, action);
        }).catch(function (error) {
          return commitAsError(commit, Object.assign(action, { payload: error }));
        });
      }

      return commitAsSuccess(commit, action);
    };
  }

  /**
   * Using pure function define when it's necessary to bind `this` to the handler
   * Currently with es6 arrow function, it hit the error below on building
   * The `this` keyword is equivalent to `undefined` at the top level of an ES module, and has been rewritten
   * @param handlers
   */
  var handleAction = function handleAction(handlers) {
    return function (state, mutation) {
      var status = mutation.__status__;
      var payload = mutation.__payload__;


      if (isFunc(handlers)) {
        status === STATUS.SUCCESS && handlers(state, payload);
      } else {
        var handler = handlers[status] || handlers[STATUS.SUCCESS];
        isFunc(handler) && handler(state, payload);
      }
    };
  };

  exports.createAction = createAction;
  exports.handleAction = handleAction;
  exports.$inject = $inject;

  Object.defineProperty(exports, '__esModule', { value: true });

}));