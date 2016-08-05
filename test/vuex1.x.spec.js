import Vue from 'vue'
import Vuex from 'vuex'
import { createAction, handleAction, $inject } from '../src'

Vue.use(Vuex)

const CHANGE = 'change'
const SUCCESSONLY = 'successonly'

describe('vuex-action tests for vuex 1.x', () => {
  const store = new Vuex.Store({
    state: {
      obj: null,
      so: null
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
      [SUCCESSONLY]: handleAction((state, mutation) => {
        state.so = mutation
      })
    }
  })

  describe('createAction()', () => {
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

  describe('async actions with a single promise payload', () => {
    const vm = new Vue({
      store,
      vuex: {
        actions: {
          change: createAction(CHANGE)
        }
      }
    })

    it('resolved', done => {
      vm.change(Promise.resolve(1))
        .then(() => {
          expect(store.state.obj).to.equal(1)
        })
        .then(done)
    })

    it('rejected', done => {
      vm.change(Promise.reject(new Error('wow, it\'s rejected')))
        .then(() => {
          expect(store.state.obj).to.be.an.instanceof(Error)
          expect(store.state.obj.message).to.be.equal('wow, it\'s rejected')
        })
        .then(done)
    })
  })
})
