var blackList = ['start', 'stop', 'context', 'constructor', 'output']

module.exports = setParamsOn

function setParamsOn (params, modulators, target) {
  var k = null
  for (k in params) {
    if (isAudioParam(target[k])) {
      if (target[k].value !== params[k] && isFinite(params[k])) {
        target[k].cancelScheduledValues(0)
        target[k].setValueAtTime(params[k], 0)
        target[k].value = params[k]
      }
    } else if (k in target && isPropertyTarget(k) && typeof target[k] !== 'function') {
      if (target[k] !== params[k]) {
        target[k] = params[k]
      }
    }
  }

  for (k in modulators) {
    if (isAudioParam(target[k])) {
      target[k].value = 0
      modulators[k].connect(target[k])
    } else if (k in target && isPropertyTarget(k) && typeof target[k] !== 'function') {
      if (typeof modulators[k].resolved === 'function') {
        var val = modulators[k].resolved()
        if (val !== target[k]) {
          target[k] = val
        }
      }
    }
  }
}

function isPropertyTarget (key) {
  return !~blackList.indexOf(key) && key.charAt(0) !== '_'
}

function isAudioParam (node) {
  return (node instanceof Object && node.setValueAtTime)
}
