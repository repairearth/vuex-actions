import {
  isFunc,
  STATUS
} from './utils'

/**
 * Using pure function define when it's necessary to bind `this` to the handler
 * Currently with es6 arrow function, it hit the error below on building
 * The `this` keyword is equivalent to `undefined` at the top level of an ES module, and has been rewritten
 * @param handlers
 */
const handleAction = handlers => (state, mutation) => {
  const { __status__: status, __payload__: payload } = mutation

  if (isFunc(handlers)) {
    status === STATUS.SUCCESS && handlers(state, payload)
  } else {
    const handler = handlers[status]
    isFunc(handler) && handler(state, payload)
  }
}

export default handleAction
