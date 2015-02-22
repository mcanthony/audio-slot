var Observ = require('observ')
var computed = require('observ/computed')
var watch = require('observ/watch')

var ObservStruct = require('observ-struct')
var Transform = require('../transform.js')
var Param = require('../param.js')
var Prop = require('../prop.js')

module.exports = OscillatorNode

function OscillatorNode(context){

  var targets = []

  var oscillator = context.audio.createOscillator()
  var power = context.audio.createGain()
  var amp = context.audio.createGain()
  var choker = context.audio.createGain()
  var output = context.audio.createGain()

  oscillator.connect(power)
  choker.gain.value = 0

  power.connect(amp)
  amp.connect(choker)

  oscillator.start()

  context.scheduler.on('data', onSchedule)

  var obs = ObservStruct({
    amp: Param(context, 1),
    noteOffset: Param(context, 0),
    octave: Param(context, 0),
    detune: Param(context, 0),
    shape: Prop('sine') //Param(context, multiplier.gain, 1)
  })


  var maxTime = null
  var lastOn = -1
  var lastOff = 0
  var hasTriggered = false
  var releaseNoteOffset = null
  var globalOffset = Prop(0)
  if (context.noteOffset){
    releaseNoteOffset = watch(context.noteOffset, globalOffset.set)
  }

  obs.context = context

  Transform(context, amp.gain, [ obs.amp ])
  Transform(context, oscillator.detune, [ obs.detune ])

  // main frequency
  Transform(context, oscillator.frequency, [ 
    { param: obs.octave, transform: transformOctave },
    { param: obs.noteOffset, transform: transformNote },
    { param: globalOffset, transform: transformNote } 
  ])

  // power rolloff
  Transform(context, power.gain, [ 440,
    { param: obs.octave, transform: transformOctave },
    { param: obs.noteOffset, transform: transformNote },
    { param: globalOffset, transform: transformNote },
    { transform: frequencyToPowerRolloff }
  ])

  obs.shape(function(shape){
    oscillator.type = shape
  })

  obs.getReleaseDuration = Param.getReleaseDuration.bind(this, obs)

  obs.triggerOn = function(at){
    at = Math.max(at||0, context.audio.currentTime)
    choker.connect(output)
    choker.gain.cancelScheduledValues(at)
    choker.gain.setValueAtTime(1, at)

    // start modulators
    Param.triggerOn(obs, at)

    maxTime = null
    hasTriggered = true

    if (lastOn < at){
      lastOn = at
    }
  }

  obs.triggerOff = function(at){
    at = Math.max(at||0, context.audio.currentTime)
    var stopAt = obs.getReleaseDuration() + at

    // stop modulators
    Param.triggerOff(obs, at)

    choker.gain.setValueAtTime(0, stopAt)

    if (stopAt > maxTime){
      maxTime = stopAt
    }

    if (lastOff < at){
      lastOff = at
    }
  }

  obs.destroy = function(){
    releaseNoteOffset&&releaseNoteOffset()
    releaseNoteOffset = null
    context.scheduler.removeListener('data', onSchedule)
  }

  obs.connect = output.connect.bind(output)
  obs.disconnect = output.disconnect.bind(output)

  return obs

  //

  function onSchedule(schedule){
    if (maxTime && context.audio.currentTime > maxTime){
      maxTime = null
      choker.disconnect()
    }
  }

  function flush(at){
    if (hasTriggered){
      var to = at + 0.2
      choker.connect(output)
      if ((!maxTime || maxTime < to) && lastOn < lastOff){
        maxTime = to
      }
    }
  }
}

function transformOctave(baseFrequency, value){
  return baseFrequency * Math.pow(2, value)
}

function transformNote(baseFrequency, value){
  return baseFrequency * Math.pow(2, value / 12)
}

function frequencyToPowerRolloff(value){
  return 1 - ((value / 20000) || 0)
}