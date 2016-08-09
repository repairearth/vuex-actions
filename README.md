# vuex-actions

> Action utilities for Vuex, supports promise-based async actions, inspired by [redux-actions][1].

[![Travis](https://img.shields.io/travis/weinot/vuex-actions.svg?style=flat)](https://travis-ci.org/weinot/vuex-actions)
[![Codecov](https://img.shields.io/codecov/c/github/weinot/vuex-actions.svg?maxAge=2592000)](https://codecov.io/gh/weinot/vuex-actions)
[![npm](https://img.shields.io/npm/v/vuex-actions.svg?style=flat)](https://www.npmjs.com/package/vuex-actions)
[![npm](https://img.shields.io/npm/dt/vuex-actions.svg?style=flat)](https://www.npmjs.com/package/vuex-actions)
[![npm](https://img.shields.io/npm/l/vuex-actions.svg?maxAge=2592000)]()

Well tested with vuex@1.0.0-rc.2 and vuex@2.0.0-rc.3, for other versions, use at your own risk :red_circle:.

```js
npm install --save vuex-actions
```
```js
import { createAction, handleAction, $inject } from 'vuex-actions'
```

### `createAction(type, payloadCreator = Identity)`

Wraps a `Vuex` action so that it has the ability to handle both normal actions and promise-based async actions, commit mutations with the resolved payload created by `payloadCreator`. If no payload creator is passed, or if it's not a function, the identity function is used. The parameter `type` is considered as a mutation's name, it will be automatically triggered in the action.

Example:

```js
let increment = createAction('INCREMENT', amount => amount)
// same as
increment = createAction('INCREMENT')

expect(increment).to.be.a('function')
```

### `handleAction(handlers)`

Wraps a mutation handler so that it can handle async actions created by `createAction`.

If a single handler is passed, it is used to handle both normal actions and success actions. (A success action is analogous to a resolved promise)

Otherwise, you can specify separate handlers for pending(), success() and error(). It's useful for tracking async action's status.

Example:

```js
const store = new Vuex.Store({
  state: {
    obj: null
  },
  mutations: {
	SINGLE: handleAction((state, mutation) => {
	  state.obj = mutation
	}),
    CHANGE: handleAction({
      pending (state, mutation) {
	    state.obj = mutation
	  },
	  success (state, mutation) {
	    state.obj = mutation
	  },
	  error (state, mutation) {
	    state.obj = mutation
	  }
    })
  }
})
```

**Normal actions**

```js
const vm = new Vue({
  store,
  vuex: {
    actions: {
      single: createAction('SINGLE')
    }
  }
})

vm.single(1)
expect(store.state.obj).to.equal(1)

vm.single(null)
expect(store.state.obj).to.be.null

vm.single({a: 1})
expect(store.state.obj).to.be.an('object')

// for vuex 2.x, the usage is similar
store.dispatch('single', 1)
expect(store.state.obj).to.equal(1)
```

**Async actions**

```js
const vm = new Vue({
  store,
  vuex: {
    actions: {
      change: createAction('CHANGE')
    }
  }
})
```

Give a promise as payload

```js
vm.change(Promise.resolve(1)).then(() => {
  expect(store.state.obj).to.equal(1)
})

vm.change(Promise.reject(new Error('wow, it\'s rejected'))).then(() => {
  expect(store.state.obj).to.be.an.instanceof(Error)
  expect(store.state.obj.message).to.equal('wow, it\'s rejected')
})
```

Handle parallel promises in payload

```js
const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 300))
const p2 = new Promise((resolve) => setTimeout(() => resolve(2), 300))

vm.change({
  p1,
  p2,
  other: 3
}).then(() => {
  expect(store.state.obj).to.eql({
    p1: 1,
    p2: 2,
    other: 3
  })
})
```

Handle rejected promise in payload
```js
const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 100))
const p2 = new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error('Something went wrong')), 100)
})

vm.change({
  p1,
  p2,
  other: 3
}).then(() => {
  expect(store.state.obj).to.be.an('error')
  expect(store.state.obj.message).to.equal('Something went wrong')
})
```

Using `$inject` to handle promises (has denpendencies) in sequence
```js
const p1 = Promise.resolve(1)
const p2 = Promise.resolve(2)
const getP3 = p2 => Promise.resolve(p2 + 1)
const getP4 = p3 => Promise.resolve(p3 + 1)

vm.change({
  p1,
  p2,
  p3: $inject(getP3)('p2'),
  p4: $inject(getP4)('p3'),
  other: 'other'
}).then(() => {
  expect(store.state.obj).to.eql({
    p1: 1,
    p2: 2,
    p3: 3,
    p4: 4,
    other: 'other'
  })
})
```

Access origin args in the dependent function
```js
const testArgs = createAction('CHANGE', options => ({
  p1: new Promise((resolve) => setTimeout(() => resolve(1), 10)),
  p2: new Promise((resolve) => setTimeout(() => resolve(2), 20)),
  p3: $inject((p1, p2, options) => {
    expect(p1).to.equal(1)
    expect(p2).to.equal(2)
    expect(options).to.be.an('object')
    expect(options.opt1).to.equal('opt1')
    expect(options.opt2).to.equal('opt2')
    return Promise.resolve(p1 + p2)
  })('p1', 'p2')
}))

testArgs(vm.$store, {
  opt1: 'opt1',
  opt2: 'opt2'
})
```

### Usage with plugin

```js
const store = new Vuex.Store({
  state: {
    obj: null,
    status: ''
  },
  plugins: [
    store => {
      store.subscribe((mutation, state) => {
		// vuex 1.x
        state.status = mutation.payload[0].__status__
		// vuex 2.x
		state.status = mutation.payload.__status__
		
		// status can be one of ['pending', 'success', 'error']
      })
    }
  ]
})
```

[1]: https://github.com/acdlite/redux-actions
