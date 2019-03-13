"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._extractFromSource = _extractFromSource;

function _getDefaultVars() {
  return {
    touchFile: '/src/index.js',
    watchStarted: false,
    buildstep: '1 of 1',
    firstTime: true,
    firstCompile: true,
    browserCount: 0,
    manifest: null,
    extPath: 'ext',
    pluginErrors: [],
    deps: [],
    usedExtComponents: [],
    rebuild: true
  };
}

function _extractFromSource(module, options, compilation, extComponents) {
  const logv = require('./pluginUtil').logv;

  logv(options.verbose, 'FUNCTION _extractFromSource');

  try {
    var js = module._source._value;

    const logv = require('./pluginUtil').logv;

    logv(options.verbose, 'FUNCTION extractFromSource');

    var generate = require("@babel/generator").default;

    var parse = require("babylon").parse;

    var traverse = require("ast-traverse");

    const statements = [];
    const ast = parse(js, {
      plugins: ['jsx', 'flow', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportExtensions', 'asyncGenerators', 'functionBind', 'functionSent', 'dynamicImport'],
      sourceType: 'module'
    });

    function addType(argNode) {
      var type;

      if (argNode.type === 'StringLiteral') {
        var xtype = require('./pluginUtil')._toXtype(argNode.value);

        if (xtype != 'extreact') {
          type = {
            xtype: require('./pluginUtil')._toXtype(argNode.value)
          };
        }
      } else {
        type = {
          xclass: js.slice(argNode.start, argNode.end)
        };
      }

      if (type != undefined) {
        let config = JSON.stringify(type);
        statements.push(`Ext.create(${config})`);
      }
    }

    traverse(ast, {
      pre: function (node) {
        if (node.type === 'CallExpression' && node.callee && node.callee.object && node.callee.object.name === 'Ext') {
          statements.push(generate(node).code);
        }

        if (node.type == 'VariableDeclarator' && node.init && node.init.type === 'CallExpression' && node.init.callee) {
          if (node.init.callee.name == 'reactify') {
            for (let i = 0; i < node.init.arguments.length; i++) {
              const valueNode = node.init.arguments[i];
              if (!valueNode) continue;
              addType(valueNode);
            }
          }
        } // // Convert React.createElement(...) calls to the equivalent Ext.create(...) calls to put in the manifest.
        // if (node.type === 'CallExpressionx' 
        //     && node.callee.object 
        //     && node.callee.object.name === 'React' 
        //     && node.callee.property.name === 'createElement') {
        //   const [props] = node.arguments
        //   let config
        //   if (Array.isArray(props.properties)) {
        //     config = generate(props).code
        //     for (let key in type) {
        //       config = `{\n  ${key}: '${type[key]}',${config.slice(1)}`
        //     }
        //   } else {
        //     config = JSON.stringify(type)
        //   }
        // }

      }
    });
    return statements;
  } catch (e) {
    console.log(module.resource);
    console.log(js);
    console.log(e);
    compilation.errors.push('extractFromSource: ' + e);
    return [];
  }
} // export function _toProd(vars, options) {
//   const logv = require('./pluginUtil').logv
//   logv(options.verbose,'FUNCTION _toProd (empty)')
//   try {
//   }
//   catch (e) {
//     console.log(e)
//     return []
//   }
// }
// export function _toDev(vars, options) {
//   const logv = require('./pluginUtil').logv
//   logv(options.verbose,'FUNCTION _toDev (empty)')
//   try {
//   }
//   catch (e) {
//     console.log(e)
//     return []
//   }
// }
// export function _getAllComponents(vars, options) {
//    const logv = require('./pluginUtil').logv
//   logv(options.verbose,'FUNCTION _getAllComponents (empty)')
//   try {
//     var extComponents = []
//      return extComponents
//   }
//   catch (e) {
//     console.log(e)
//     return []
//   }
// }
// export function _writeFilesToProdFolder(vars, options) {
//   const logv = require('./pluginUtil').logv
//   logv(options.verbose,'FUNCTION _writeFilesToProdFolder (empty)')
//   try {
//   }
//   catch (e) {
//     console.log(e)
//   }
// }
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yZWFjdFV0aWwuanMiXSwibmFtZXMiOlsiX2dldERlZmF1bHRWYXJzIiwidG91Y2hGaWxlIiwid2F0Y2hTdGFydGVkIiwiYnVpbGRzdGVwIiwiZmlyc3RUaW1lIiwiZmlyc3RDb21waWxlIiwiYnJvd3NlckNvdW50IiwibWFuaWZlc3QiLCJleHRQYXRoIiwicGx1Z2luRXJyb3JzIiwiZGVwcyIsInVzZWRFeHRDb21wb25lbnRzIiwicmVidWlsZCIsIl9leHRyYWN0RnJvbVNvdXJjZSIsIm1vZHVsZSIsIm9wdGlvbnMiLCJjb21waWxhdGlvbiIsImV4dENvbXBvbmVudHMiLCJsb2d2IiwicmVxdWlyZSIsInZlcmJvc2UiLCJqcyIsIl9zb3VyY2UiLCJfdmFsdWUiLCJnZW5lcmF0ZSIsImRlZmF1bHQiLCJwYXJzZSIsInRyYXZlcnNlIiwic3RhdGVtZW50cyIsImFzdCIsInBsdWdpbnMiLCJzb3VyY2VUeXBlIiwiYWRkVHlwZSIsImFyZ05vZGUiLCJ0eXBlIiwieHR5cGUiLCJfdG9YdHlwZSIsInZhbHVlIiwieGNsYXNzIiwic2xpY2UiLCJzdGFydCIsImVuZCIsInVuZGVmaW5lZCIsImNvbmZpZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJwdXNoIiwicHJlIiwibm9kZSIsImNhbGxlZSIsIm9iamVjdCIsIm5hbWUiLCJjb2RlIiwiaW5pdCIsImkiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJ2YWx1ZU5vZGUiLCJlIiwiY29uc29sZSIsImxvZyIsInJlc291cmNlIiwiZXJyb3JzIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztBQUVBLFNBQVNBLGVBQVQsR0FBMkI7QUFDekIsU0FBTztBQUNMQyxJQUFBQSxTQUFTLEVBQUUsZUFETjtBQUVMQyxJQUFBQSxZQUFZLEVBQUcsS0FGVjtBQUdMQyxJQUFBQSxTQUFTLEVBQUUsUUFITjtBQUlMQyxJQUFBQSxTQUFTLEVBQUcsSUFKUDtBQUtMQyxJQUFBQSxZQUFZLEVBQUUsSUFMVDtBQU1MQyxJQUFBQSxZQUFZ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QixJQUFuQixDQUF3Qix3QkFBd0JZLENBQWhEO0FBQ0EsV0FBTyxFQUFQO0FBQ0Q7QUFDRixDLENBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiXG5cbmZ1bmN0aW9uIF9nZXREZWZhdWx0VmFycygpIHtcbiAgcmV0dXJuIHtcbiAgICB0b3VjaEZpbGU6ICcvc3JjL2luZGV4LmpzJyxcbiAgICB3YXRjaFN0YXJ0ZWQgOiBmYWxzZSxcbiAgICBidWlsZHN0ZXA6ICcxIG9mIDEnLFxuICAgIGZpcnN0VGltZSA6IHRydWUsXG4gICAgZmlyc3RDb21waWxlOiB0cnVlLFxuICAgIGJyb3dzZXJDb3VudCA6IDAsXG4gICAgbWFuaWZlc3Q6IG51bGwsXG4gICAgZXh0UGF0aDogJ2V4dCcsXG4gICAgcGx1Z2luRXJyb3JzOiBbXSxcbiAgICBkZXBzOiBbXSxcbiAgICB1c2VkRXh0Q29tcG9uZW50czogW10sXG4gICAgcmVidWlsZDogdHJ1ZVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfZXh0cmFjdEZyb21Tb3VyY2UobW9kdWxlLCBvcHRpb25zLCBjb21waWxhdGlvbiwgZXh0Q29tcG9uZW50cykge1xuICBjb25zdCBsb2d2ID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9ndlxuICBsb2d2KG9wdGlvbnMudmVyYm9zZSwnRlVOQ1RJT04gX2V4dHJhY3RGcm9tU291cmNlJylcbiAgdHJ5IHtcbiAgICB2YXIganMgPSBtb2R1bGUuX3NvdXJjZS5fdmFsdWVcbiAgICBjb25zdCBsb2d2ID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9ndlxuICAgIGxvZ3Yob3B0aW9ucy52ZXJib3NlLCdGVU5DVElPTiBleHRyYWN0RnJvbVNvdXJjZScpXG4gICAgdmFyIGdlbmVyYXRlID0gcmVxdWlyZShcIkBiYWJlbC9nZW5lcmF0b3JcIikuZGVmYXVsdFxuICAgIHZhciBwYXJzZSA9IHJlcXVpcmUoXCJiYWJ5bG9uXCIpLnBhcnNlXG4gICAgdmFyIHRyYXZlcnNlID0gcmVxdWlyZShcImFzdC10cmF2ZXJzZVwiKVxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbXVxuICAgIFxuICAgIGNvbnN0IGFzdCA9IHBhcnNlKGpzLCB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgICdqc3gnLFxuICAgICAgICAnZmxvdycsXG4gICAgICAgICdkb0V4cHJlc3Npb25zJyxcbiAgICAgICAgJ29iamVjdFJlc3RTcHJlYWQnLFxuICAgICAgICAnY2xhc3NQcm9wZXJ0aWVzJyxcbiAgICAgICAgJ2V4cG9ydEV4dGVuc2lvbnMnLFxuICAgICAgICAnYXN5bmNHZW5lcmF0b3JzJyxcbiAgICAgICAgJ2Z1bmN0aW9uQmluZCcsXG4gICAgICAgICdmdW5jdGlvblNlbnQnLFxuICAgICAgICAnZHluYW1pY0ltcG9ydCdcbiAgICAgIF0sXG4gICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJ1xuICAgIH0pXG5cbiAgICBmdW5jdGlvbiBhZGRUeXBlKGFyZ05vZGUpIHtcbiAgICAgIHZhciB0eXBlXG4gICAgICBpZiAoYXJnTm9kZS50eXBlID09PSAnU3RyaW5nTGl0ZXJhbCcpIHtcbiAgICAgICAgdmFyIHh0eXBlID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykuX3RvWHR5cGUoYXJnTm9kZS52YWx1ZSlcbiAgICAgICAgaWYgKHh0eXBlICE9ICdleHRyZWFjdCcpIHtcbiAgICAgICAgICB0eXBlID0geyB4dHlwZTogcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykuX3RvWHR5cGUoYXJnTm9kZS52YWx1ZSkgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlID0geyB4Y2xhc3M6IGpzLnNsaWNlKGFyZ05vZGUuc3RhcnQsIGFyZ05vZGUuZW5kKSB9XG4gICAgICB9XG4gICAgICBpZiAodHlwZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IEpTT04uc3RyaW5naWZ5KHR5cGUpXG4gICAgICAgIHN0YXRlbWVudHMucHVzaChgRXh0LmNyZWF0ZSgke2NvbmZpZ30pYClcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgIHByZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBpZiAobm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nXG4gICAgICAgICAgICAmJiBub2RlLmNhbGxlZVxuICAgICAgICAgICAgJiYgbm9kZS5jYWxsZWUub2JqZWN0XG4gICAgICAgICAgICAmJiBub2RlLmNhbGxlZS5vYmplY3QubmFtZSA9PT0gJ0V4dCdcbiAgICAgICAgKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKGdlbmVyYXRlKG5vZGUpLmNvZGUpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PSAnVmFyaWFibGVEZWNsYXJhdG9yJyBcbiAgICAgICAgICAgICYmIG5vZGUuaW5pdCBcbiAgICAgICAgICAgICYmIG5vZGUuaW5pdC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nIFxuICAgICAgICAgICAgJiYgbm9kZS5pbml0LmNhbGxlZSBcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKG5vZGUuaW5pdC5jYWxsZWUubmFtZSA9PSAncmVhY3RpZnknKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuaW5pdC5hcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWVOb2RlID0gbm9kZS5pbml0LmFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgICAgaWYgKCF2YWx1ZU5vZGUpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBhZGRUeXBlKHZhbHVlTm9kZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAvLyBDb252ZXJ0IFJlYWN0LmNyZWF0ZUVsZW1lbnQoLi4uKSBjYWxscyB0byB0aGUgZXF1aXZhbGVudCBFeHQuY3JlYXRlKC4uLikgY2FsbHMgdG8gcHV0IGluIHRoZSBtYW5pZmVzdC5cbiAgICAgICAgLy8gaWYgKG5vZGUudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9ueCcgXG4gICAgICAgIC8vICAgICAmJiBub2RlLmNhbGxlZS5vYmplY3QgXG4gICAgICAgIC8vICAgICAmJiBub2RlLmNhbGxlZS5vYmplY3QubmFtZSA9PT0gJ1JlYWN0JyBcbiAgICAgICAgLy8gICAgICYmIG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWUgPT09ICdjcmVhdGVFbGVtZW50Jykge1xuICAgICAgICAvLyAgIGNvbnN0IFtwcm9wc10gPSBub2RlLmFyZ3VtZW50c1xuICAgICAgICAvLyAgIGxldCBjb25maWdcbiAgICAgICAgLy8gICBpZiAoQXJyYXkuaXNBcnJheShwcm9wcy5wcm9wZXJ0aWVzKSkge1xuICAgICAgICAvLyAgICAgY29uZmlnID0gZ2VuZXJhdGUocHJvcHMpLmNvZGVcbiAgICAgICAgLy8gICAgIGZvciAobGV0IGtleSBpbiB0eXBlKSB7XG4gICAgICAgIC8vICAgICAgIGNvbmZpZyA9IGB7XFxuICAke2tleX06ICcke3R5cGVba2V5XX0nLCR7Y29uZmlnLnNsaWNlKDEpfWBcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgY29uZmlnID0gSlNPTi5zdHJpbmdpZnkodHlwZSlcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBzdGF0ZW1lbnRzXG4gIH1cbiAgY2F0Y2goZSkge1xuICAgIGNvbnNvbGUubG9nKG1vZHVsZS5yZXNvdXJjZSlcbiAgICBjb25zb2xlLmxvZyhqcylcbiAgICBjb25zb2xlLmxvZyhlKVxuICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKCdleHRyYWN0RnJvbVNvdXJjZTogJyArIGUpXG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIF90b1Byb2QodmFycywgb3B0aW9ucykge1xuLy8gICBjb25zdCBsb2d2ID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9ndlxuLy8gICBsb2d2KG9wdGlvbnMudmVyYm9zZSwnRlVOQ1RJT04gX3RvUHJvZCAoZW1wdHkpJylcbi8vICAgdHJ5IHtcbi8vICAgfVxuLy8gICBjYXRjaCAoZSkge1xuLy8gICAgIGNvbnNvbGUubG9nKGUpXG4vLyAgICAgcmV0dXJuIFtdXG4vLyAgIH1cbi8vIH1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIF90b0Rldih2YXJzLCBvcHRpb25zKSB7XG4vLyAgIGNvbnN0IGxvZ3YgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2d2XG4vLyAgIGxvZ3Yob3B0aW9ucy52ZXJib3NlLCdGVU5DVElPTiBfdG9EZXYgKGVtcHR5KScpXG4vLyAgIHRyeSB7XG4vLyAgIH1cbi8vICAgY2F0Y2ggKGUpIHtcbi8vICAgICBjb25zb2xlLmxvZyhlKVxuLy8gICAgIHJldHVybiBbXVxuLy8gICB9XG4vLyB9XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBfZ2V0QWxsQ29tcG9uZW50cyh2YXJzLCBvcHRpb25zKSB7XG4vLyAgICBjb25zdCBsb2d2ID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9ndlxuLy8gICBsb2d2KG9wdGlvbnMudmVyYm9zZSwnRlVOQ1RJT04gX2dldEFsbENvbXBvbmVudHMgKGVtcHR5KScpXG4vLyAgIHRyeSB7XG4vLyAgICAgdmFyIGV4dENvbXBvbmVudHMgPSBbXVxuLy8gICAgICByZXR1cm4gZXh0Q29tcG9uZW50c1xuLy8gICB9XG4vLyAgIGNhdGNoIChlKSB7XG4vLyAgICAgY29uc29sZS5sb2coZSlcbi8vICAgICByZXR1cm4gW11cbi8vICAgfVxuLy8gfVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gX3dyaXRlRmlsZXNUb1Byb2RGb2xkZXIodmFycywgb3B0aW9ucykge1xuLy8gICBjb25zdCBsb2d2ID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9ndlxuLy8gICBsb2d2KG9wdGlvbnMudmVyYm9zZSwnRlVOQ1RJT04gX3dyaXRlRmlsZXNUb1Byb2RGb2xkZXIgKGVtcHR5KScpXG4vLyAgIHRyeSB7XG4vLyAgIH1cbi8vICAgY2F0Y2ggKGUpIHtcbi8vICAgICBjb25zb2xlLmxvZyhlKVxuLy8gICB9XG4vLyB9XG4iXX0=