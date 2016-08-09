import Vue from 'vue'
import Vuex from 'vuex'
import { createAction, handleAction, $inject } from '../src'
import { STATUS } from '../src/utils'

Vue.use(Vuex)

const CHANGE = 'change'
const SUCCESS_ONLY = 'success_only'
const MOD_ACTION = 'mod_action'

describe('vuex-action tests for vuex 1.x', () => {
  const store = new Vuex.Store({
    state: {
      obj: null,
      so: null,
      status: ''
    },
    mutations: {
      [CHANGE]: handleAction({
        pending (state, mutation) {
          state.obj = mutation
        },
        success (state, mutation) {
          state.obj = mutation
        },
        error (state, mutation) {
          state.obj = mutation
        }
      }),
      [SUCCESS_ONLY]: handleAction((state, mutation) => {
        state.so = mutation
      })
    },
    modules: {
      mod: {
        state: {
          obj: null
        },
        mutations: {
          [MOD_ACTION]: handleAction({
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
      }
    },
    plugins: [
      store => {
        store.subscribe((mutation, state) => {
          state.status = mutation.payload[0].__status__
        })
      }
    ]
  })

  describe('create action', () => {
    it('create an action', () => {
      const action = createAction(CHANGE)
      expect(action).to.be.a('function')
    })

    it('create action without payload creator', () => {
      const vm = new Vue({
        store,
        vuex: {
          actions: {
            change: createAction(CHANGE)
          }
        }
      })

      expect(vm.change).to.be.a('function')
      vm.change(1)
      expect(store.state.obj).to.equal(1)
      vm.change(null)
      expect(store.state.obj).to.be.null
      vm.change({a: 1})
      expect(store.state.obj).to.be.an('object')
    })

    it('create action with a payload creator', () => {
      const vm = new Vue({
        store,
        vuex: {
          actions: {
            change: createAction(CHANGE, (args1, args2, args3) => ({
              args1, args2, args3
            }))
          }
        }
      })

      expect(vm.change).to.be.a('function')
      vm.change(1, 2)
      expect(store.state.obj).to.eql({ args1: 1, args2: 2, args3: undefined })
      vm.change(1, 2, 3)
      expect(store.state.obj).to.eql({ args1: 1, args2: 2, args3: 3 })
    })
  })

  describe('async actions', () => {
    const vm = new Vue({
      store,
      vuex: {
        actions: {
          change: createAction(CHANGE)
        }
      }
    })

    it('resolve a single promise payload', done => {
      vm.change(Promise.resolve(1))
        .then(() => {
          expect(store.state.obj).to.equal(1)
        })
        .then(done)
    })

    it('reject a single promise payload', done => {
      vm.change(Promise.reject(new Error('wow, it\'s rejected')))
        .then(() => {
          expect(store.state.obj).to.be.an('error')
          expect(store.state.obj.message).to.equal('wow, it\'s rejected')
        })
        .then(done)
    })

    it('handle parallel promises in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve) => setTimeout(() => resolve(2), 20))
      vm.change({
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.obj).to.eql({ p1: 1, p2: 2, other: 3 })
        expect(store.state.status).to.equal(STATUS.SUCCESS)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('handle promises in payload with dependencies', done => {
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
        expect(store.state.obj).to.eql({ p1: 1, p2: 2, p3: 3, p4: 4, other: 'other' })
        done()
      })
    })

    it('handle rejected promise in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('something went wrong')), 20)
      })
      vm.change({
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.obj).to.be.an('error')
        expect(store.state.obj.message).to.equal('something went wrong')
        expect(store.state.status).to.equal(STATUS.ERROR)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('contain origin args in the dependent function', () => {
      const testArgs1 = createAction(CHANGE, (...args) => ({
        p1: new Promise((resolve) => setTimeout(() => resolve(1), 10)),
        p2: new Promise((resolve) => setTimeout(() => resolve(2), 20)),
        p3: $inject((p1, p2, ...args) => {
          expect(p1).to.equal(1)
          expect(p2).to.equal(2)
          expect(args).to.be.an('array')
          expect(args.length).to.equal(2)
          expect(args[0]).to.equal('arg1')
          expect(args[1]).to.equal('arg2')
          return Promise.resolve(3)
        })('p1', 'p2')
      }))

      const testArgs2 = createAction(CHANGE, options => ({
        p1: new Promise((resolve) => setTimeout(() => resolve(1), 10)),
        p2: new Promise((resolve) => setTimeout(() => resolve(2), 20)),
        p3: $inject((p1, p2, options) => {
          expect(p1).to.equal(1)
          expect(p2).to.equal(2)
          expect(options).to.be.an('object')
          expect(options.opt1).to.equal('opt1')
          expect(options.opt2).to.equal('opt2')
          return Promise.resolve(3)
        })('p1', 'p2')
      }))

      testArgs1(vm.$store, 'args1', 'arg2')
      testArgs2(vm.$store, {
        opt1: 'opt1',
        opt2: 'opt2'
      })
    })
  })

  describe('handle action', () => {
    const vm = new Vue({
      store,
      vuex: {
        actions: {
          successonly: createAction(SUCCESS_ONLY)
        }
      }
    })

    it('pass success handler to handleAction', () => {
      vm.successonly(Promise.reject(new Error('dropped'))).then(() => {
        expect(store.state.so).to.be.null
      })
      vm.successonly(Promise.resolve('take it!')).then(() => {
        expect(store.state.so).to.equal('take it!')
      })
    })
  })

  describe('modules', () => {
    const vm = new Vue({
      store,
      vuex: {
        actions: {
          change: createAction(MOD_ACTION)
        }
      }
    })

    it('resolve a single promise payload', done => {
      vm.change(Promise.resolve(1))
        .then(() => {
          expect(store.state.mod.obj).to.equal(1)
        })
        .then(done)
    })

    it('reject a single promise payload', done => {
      vm.change(Promise.reject(new Error('wow, it\'s rejected')))
        .then(() => {
          expect(store.state.mod.obj).to.be.an.instanceof(Error)
          expect(store.state.mod.obj.message).to.equal('wow, it\'s rejected')
        })
        .then(done)
    })

    it('handle parallel promises in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve) => setTimeout(() => resolve(2), 20))
      vm.change({
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.mod.obj).to.eql({ p1: 1, p2: 2, other: 3 })
        expect(store.state.status).to.equal(STATUS.SUCCESS)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })

    it('handle promises in payload with dependencies', done => {
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
        expect(store.state.mod.obj).to.eql({ p1: 1, p2: 2, p3: 3, p4: 4, other: 'other' })
        done()
      })
    })

    it('handle rejected promise in payload', done => {
      const p1 = new Promise((resolve) => setTimeout(() => resolve(1), 10))
      const p2 = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('something went wrong')), 20)
      })
      vm.change({
        p1,
        p2,
        other: 3
      }).then(() => {
        expect(store.state.mod.obj).to.be.an('error')
        expect(store.state.mod.obj.message).to.equal('something went wrong')
        expect(store.state.status).to.equal(STATUS.ERROR)
        done()
      })
      expect(store.state.status).to.equal(STATUS.PENDING)
    })
  })
})
