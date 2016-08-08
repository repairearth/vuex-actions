import {
  isFunc,
  isPromise,
  hasPromise,
  buildPromiseQueue,
  STATUS,
  $inject
} from './utils'

const dispatchAction = (commit, action, status) => {
  const { type, payload } = action

  commit(type, {
    __status__: status,
    __payload__: payload
  })
}

const commitAsPending = (commit, action) => {
  dispatchAction(commit, action, STATUS.PENDING)
}

const commitAsSuccess = (commit, action) => {
  dispatchAction(commit, action, STATUS.SUCCESS)
}

const commitAsError = (commit, action) => {
  dispatchAction(commit, action, STATUS.ERROR)
}

function createAction (type, payloadCreator) {
  const finalPayloadCreator = isFunc(payloadCreator) ? payloadCreator : (...args) => args[0]

  return ({ dispatch, commit }, ...args) => {
    const payload = finalPayloadCreator(...args)
    const action = { type, payload }
    commit = commit || dispatch

    if (isPromise(payload)) {
      commitAsPending(commit, action)
      return payload.then(
        result => commitAsSuccess(commit, Object.assign(action, {payload: result})),
        error => commitAsError(commit, Object.assign(action, {payload: error}))
      )
    }

    if (hasPromise(payload)) {
      const promiseQueue = buildPromiseQueue(payload)
      commitAsPending(commit, action)
      return promiseQueue
        .run(...args)
        .then(result => commitAsSuccess(commit, action))
        .catch(error => commitAsError(commit, Object.assign(action, {payload: error})))
    }

    return commitAsSuccess(commit, action)
  }
}

export {
  $inject,
  createAction
}
