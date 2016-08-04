import chai from 'chai'

global.chai = chai
global.expect = chai.expect
global.should = chai.should()

import '../src/createAction'
import './test.spec'
