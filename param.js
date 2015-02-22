var ObservNode = require('observ-node-array/single')
var Event = require('geval')

module.exports = Param

function Param(context, defaultValue){
  var obs = ObservNode(context)

  // handle defaultValue
  var set = obs.set
  obs.set = function(v){
    set(v == null ? defaultValue : v)
    if (typeof obs() === 'number'){
      broadcast({ 
        type: 'set', 
        value: obs(), 
        at: context.audio.currentTime 
      })
    }
  }

  obs.getValue = function(){
    return getValue(obs(), defaultValue)
  }

  if (defaultValue != null){
    set(defaultValue)
  }

  var broadcast = null
  obs.onSchedule = Event(function(b){
    broadcast = b
  })

  var release = null
  var lastNode = null
  obs.onNode(function(node){
    
    if (lastNode){
      release&&release()
      release = null
    }

    if (node){
      var release = node.onSchedule(broadcast)
    }

    lastNode = node
  })

  obs.triggerOn = function(at){
    return obs.node && obs.node.triggerOn && obs.node.triggerOn(at) || 0
  }

  obs.triggerOff = function(at){
    return obs.node && obs.node.triggerOff && obs.node.triggerOff(at) || 0
  }

  obs.getReleaseDuration = function(){
    return obs.node && obs.node.getReleaseDuration && obs.node.getReleaseDuration() || 0
  }

  return obs
}

Param.triggerOn = function(obj, at){
  for (var k in obj){
    if (obj[k] && obj[k].triggerOn){
      obj[k].triggerOn(at)
    }
  }
}

Param.triggerOff = function(obj, stopAt){
  for (var k in obj){
    if (obj[k] && obj[k].triggerOff){
      var release = obj[k].getReleaseDuration() || 0
      obj[k].triggerOff(stopAt-release)
    }
  }
}

Param.getReleaseDuration = function(obj){
  var result = 0
  for (var k in obj){
    if (obj[k] && obj[k].getReleaseDuration){
      var val = obj[k].getReleaseDuration()
      if (val > result){
        result = val
      }
    }
  }
  return result
}

function getValue(object, defaultValue){
  if (object instanceof Object && !Array.isArray(object)){
    return getValue(object.value, defaultValue)
  } else {
    return object != null ? object : defaultValue
  }
}