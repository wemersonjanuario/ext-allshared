"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getValidateOptions = getValidateOptions;
exports.getDefaultOptions = getDefaultOptions;
exports.getDefaultVars = getDefaultVars;
exports.extractFromSource = extractFromSource;
exports._toProd = _toProd;
exports._toDev = _toDev;
exports._getAllComponents = _getAllComponents;
exports._writeFilesToProdFolder = _writeFilesToProdFolder;

function getValidateOptions() {
  return {
    "type": "object",
    "properties": {
      "framework": {
        "type": ["string"]
      },
      "toolkit": {
        "type": ["string"]
      },
      "port": {
        "type": ["integer"]
      },
      "emit": {
        "type": ["boolean"]
      },
      "browser": {
        "type": ["boolean"]
      },
      "watch": {
        "type": ["string"]
      },
      "profile": {
        "type": ["string"]
      },
      "environment": {
        "type": ["string"]
      },
      "verbose": {
        "type": ["string"]
      },
      "theme": {
        "type": ["string"]
      },
      "treeshake": {
        "type": ["boolean"]
      },
      "packages": {
        "type": ["string", "array"]
      }
    },
    "additionalProperties": false
  };
}

function getDefaultOptions() {
  return {
    port: 1962,
    emit: true,
    browser: true,
    watch: 'yes',
    profile: '',
    treeshake: false,
    environment: 'development',
    verbose: 'no',
    toolkit: 'modern',
    packages: null
  };
}

function getDefaultVars() {
  return {
    watchStarted: false,
    firstTime: true,
    firstCompile: true,
    browserCount: 0,
    manifest: null,
    extPath: 'ext-angular',
    pluginErrors: [],
    deps: [],
    usedExtComponents: [],
    rebuild: true
  };
}

function toXtype(str) {
  return str.toLowerCase().replace(/_/g, '-');
}

function extractFromSource(module, options, compilation, extComponents) {
  try {
    var js = module._source._value;

    const logv = require('./pluginUtil').logv; //logv(options,'HOOK succeedModule, FUNCTION extractFromSource: ' + module.resource)


    var statements = [];

    var generate = require("@babel/generator").default;

    var parse = require("babylon").parse;

    var traverse = require("ast-traverse");

    var ast = parse(js, {
      plugins: ['typescript', 'flow', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportDefaultFrom', 'exportExtensions', 'asyncGenerators', 'functionBind', 'functionSent', 'dynamicImport'],
      sourceType: 'module'
    });
    traverse(ast, {
      pre: function (node) {
        if (node.type === 'CallExpression' && node.callee && node.callee.object && node.callee.object.name === 'Ext') {
          statements.push(generate(node).code);
        }

        if (node.type === 'StringLiteral') {
          let code = node.value;

          for (var i = 0; i < code.length; ++i) {
            if (code.charAt(i) == '<') {
              if (code.substr(i, 4) == '<!--') {
                i += 4;
                i += code.substr(i).indexOf('-->') + 3;
              } else if (code.charAt(i + 1) !== '/') {
                var start = code.substring(i);
                var spaceEnd = start.indexOf(' ');
                var newlineEnd = start.indexOf('\n');
                var tagEnd = start.indexOf('>');
                var end = Math.min(spaceEnd, newlineEnd, tagEnd);

                if (end >= 0) {
                  var xtype = toXtype(start.substring(1, end));

                  if (extComponents.includes(xtype)) {
                    var theValue = node.value.toLowerCase();

                    if (theValue.indexOf('doctype html') == -1) {
                      var type = {
                        xtype: xtype
                      };
                      let config = JSON.stringify(type);
                      statements.push(`Ext.create(${config})`);
                    }
                  }

                  i += end;
                }
              }
            }
          }
        }
      }
    });
    return statements;
  } catch (e) {
    console.log(e);
    compilation.errors.push('extractFromSource: ' + e);
    return [];
  }
}

function changeIt(o) {
  const path = require('path');

  const fsx = require('fs-extra');

  const wherePath = path.resolve(process.cwd(), o.where);
  var js = fsx.readFileSync(wherePath).toString();
  var newJs = js.replace(o.from, o.to);
  fsx.writeFileSync(wherePath, newJs, 'utf-8', () => {
    return;
  });
}

function _toProd(vars, options) {
  const log = require('./pluginUtil').log;

  const logv = require('./pluginUtil').logv;

  logv(options, 'FUNCTION _toProd');

  try {
    const fsx = require('fs-extra');

    const fs = require('fs');

    const mkdirp = require('mkdirp');

    const path = require('path');

    const pathExtAngularProd = path.resolve(process.cwd(), `src/app/ext-angular-prod`);

    if (!fs.existsSync(pathExtAngularProd)) {
      mkdirp.sync(pathExtAngularProd);

      const t = require('./artifacts').extAngularModule('', '', '');

      fsx.writeFileSync(`${pathExtAngularProd}/ext-angular.module.ts`, t, 'utf-8', () => {
        return;
      });
    }

    var o = {};
    o.where = 'src/app/app.module.ts';
    o.from = `import { ExtAngularModule } from '@sencha/ext-angular'`;
    o.to = `import { ExtAngularModule } from './ext-angular-prod/ext-angular.module'`;
    changeIt(o);
    o = {};
    o.where = 'src/main.ts';
    o.from = `bootstrapModule( AppModule );`;
    o.to = `enableProdMode();bootstrapModule(AppModule);`;
    changeIt(o);
  } catch (e) {
    console.log(e);
    return [];
  }
}

function _toDev(vars, options) {
  const log = require('./pluginUtil').log;

  const logv = require('./pluginUtil').logv;

  logv(options, 'FUNCTION _toProd');

  try {
    const path = require('path');

    const pathExtAngularProd = path.resolve(process.cwd(), `src/app/ext-angular-prod`);

    require('rimraf').sync(pathExtAngularProd);

    var o = {};
    o.where = 'src/app/app.module.ts';
    o.from = `import { ExtAngularModule } from './ext-angular-prod/ext-angular.module'`;
    o.to = `import { ExtAngularModule } from '@sencha/ext-angular'`;
    changeIt(o);
    o = {};
    o.where = 'src/main.ts';
    o.from = `enableProdMode();bootstrapModule(AppModule);`;
    o.to = `bootstrapModule( AppModule );`;
    changeIt(o);
  } catch (e) {
    console.log(e);
    return [];
  }
}

function _getAllComponents(vars, options) {
  const log = require('./pluginUtil').log;

  const logv = require('./pluginUtil').logv;

  logv(options, 'FUNCTION _getAllComponents');

  try {
    const path = require('path');

    const fsx = require('fs-extra');

    var extComponents = [];
    const packageLibPath = path.resolve(process.cwd(), 'node_modules/@sencha/ext-angular/src/lib');
    var files = fsx.readdirSync(packageLibPath);
    files.forEach(fileName => {
      if (fileName && fileName.substr(0, 4) == 'ext-') {
        var end = fileName.substr(4).indexOf('.component');

        if (end >= 0) {
          extComponents.push(fileName.substring(4, end + 4));
        }
      }
    });
    return extComponents;
  } catch (e) {
    console.log(e);
    return [];
  }
}

function _writeFilesToProdFolder(vars, options) {
  const log = require('./pluginUtil').log;

  const logv = require('./pluginUtil').logv;

  logv(options, 'FUNCTION _writeFilesToProdFolder');

  try {
    const path = require('path');

    const fsx = require('fs-extra');

    const packageLibPath = path.resolve(process.cwd(), 'node_modules/@sencha/ext-angular/src/lib');
    const pathToExtAngularProd = path.resolve(process.cwd(), `src/app/ext-angular-prod`);
    const string = 'Ext.create({\"xtype\":\"';
    vars.deps.forEach(code => {
      var index = code.indexOf(string);

      if (index >= 0) {
        code = code.substring(index + string.length);
        var end = code.indexOf('\"');
        vars.usedExtComponents.push(code.substr(0, end));
      }
    });
    vars.usedExtComponents = [...new Set(vars.usedExtComponents)];
    var writeToPathWritten = false;
    var moduleVars = {
      imports: '',
      exports: '',
      declarations: ''
    };
    vars.usedExtComponents.forEach(xtype => {
      var capclassname = xtype.charAt(0).toUpperCase() + xtype.replace(/-/g, "_").slice(1);
      moduleVars.imports = moduleVars.imports + `import { Ext${capclassname}Component } from './ext-${xtype}.component';\n`;
      moduleVars.exports = moduleVars.exports + `    Ext${capclassname}Component,\n`;
      moduleVars.declarations = moduleVars.declarations + `    Ext${capclassname}Component,\n`;
      var classFile = `ext-${xtype}.component.ts`;
      const contents = fsx.readFileSync(`${packageLibPath}/${classFile}`).toString();
      fsx.writeFileSync(`${pathToExtAngularProd}/${classFile}`, contents, 'utf-8', () => {
        return;
      });
      writeToPathWritten = true;
    });

    if (writeToPathWritten) {
      var t = require('./artifacts').extAngularModule(moduleVars.imports, moduleVars.exports, moduleVars.declarations);

      fsx.writeFileSync(`${pathToExtAngularProd}/ext-angular.module.ts`, t, 'utf-8', () => {
        return;
      });
    }

    const baseContent = fsx.readFileSync(`${packageLibPath}/base.ts`).toString();
    fsx.writeFileSync(`${pathToExtAngularProd}/base.ts`, baseContent, 'utf-8', () => {
      return;
    });
  } catch (e) {
    console.log(e);
    return [];
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmd1bGFyVXRpbC5qcyJdLCJuYW1lcyI6WyJnZXRWYWxpZGF0ZU9wdGlvbnMiLCJnZXREZWZhdWx0T3B0aW9ucyIsInBvcnQiLCJlbWl0IiwiYnJvd3NlciIsIndhdGNoIiwicHJvZmlsZSIsInRyZWVzaGFrZSIsImVudmlyb25tZW50IiwidmVyYm9zZSIsInRvb2xraXQiLCJwYWNrYWdlcyIsImdldERlZmF1bHRWYXJzIiwid2F0Y2hTdGFydGVkIiwiZmlyc3RUaW1lIiwiZmlyc3RDb21waWxlIiwiYnJvd3NlckNvdW50IiwibWFuaWZlc3QiLCJleHRQYXRoIiwicGx1Z2luRXJyb3JzIiwiZGVwcyIsInVzZWRFeHRDb21wb25lbnRzIiwicmVidWlsZCIsInRvWHR5cGUiLCJzdHIiLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJleHRyYWN0RnJvbVNvdXJjZSIsIm1vZHVsZSIsIm9wdGlvbnMiLCJjb21waWxhdGlvbiIsImV4dENvbXBvbmVudHMiLCJqcyIsIl9zb3VyY2UiLCJfdmFsdWUiLCJsb2d2IiwicmVxdWlyZSIsInN0YXRlbWVudHMiLCJnZW5lcmF0ZSIsImRlZmF1bHQiLCJwYXJzZSIsInRyYXZlcnNlIiwiYXN0IiwicGx1Z2lucyIsInNvdXJjZVR5cGUiLCJwcmUiLCJub2RlIiwidHlwZSIsImNhbGxlZSIsIm9iamVjdCIsIm5hbWUiLCJwdXNoIiwiY29kZSIsInZhbHVlIiwiaSIsImxlbmd0aCIsImNoYXJBdCIsInN1YnN0ciIsImluZGV4T2YiLCJzdGFydCIsInN1YnN0cmluZyIsInNwYWNlRW5kIiwibmV3bGluZUVuZCIsInRhZ0VuZCIsImVuZCIsIk1hdGgiLCJtaW4iLCJ4dHlwZSIsImluY2x1ZGVzIiwidGhlVmFsdWUiLCJjb25maWciLCJKU09OIiwic3RyaW5naWZ5IiwiZSIsImNvbnNvbGUiLCJsb2ciLCJlcnJvcnMiLCJjaGFuZ2VJdCIsIm8iLCJwYXRoIiwiZnN4Iiwid2hlcmVQYXRoIiwicmVzb2x2ZSIsInByb2Nlc3MiLCJjd2QiLCJ3aGVyZSIsInJlYWRGaWxlU3luYyIsInRvU3RyaW5nIiwibmV3SnMiLCJmcm9tIiwidG8iLCJ3cml0ZUZpbGVTeW5jIiwiX3RvUHJvZCIsInZhcnMiLCJmcyIsIm1rZGlycCIsInBhdGhFeHRBbmd1bGFyUHJvZCIsImV4aXN0c1N5bmMiLCJzeW5jIiwidCIsImV4dEFuZ3VsYXJNb2R1bGUiLCJfdG9EZXYiLCJfZ2V0QWxsQ29tcG9uZW50cyIsInBhY2thZ2VMaWJQYXRoIiwiZmlsZXMiLCJyZWFkZGlyU3luYyIsImZvckVhY2giLCJmaWxlTmFtZSIsIl93cml0ZUZpbGVzVG9Qcm9kRm9sZGVyIiwicGF0aFRvRXh0QW5ndWxhclByb2QiLCJzdHJpbmciLCJpbmRleCIsIlNldCIsIndyaXRlVG9QYXRoV3JpdHRlbiIsIm1vZHVsZVZhcnMiLCJpbXBvcnRzIiwiZXhwb3J0cyIsImRlY2xhcmF0aW9ucyIsImNhcGNsYXNzbmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJjbGFzc0ZpbGUiLCJjb250ZW50cyIsImJhc2VDb250ZW50Il0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7QUFFTyxTQUFTQSxrQkFBVCxHQUE4QjtBQUNuQyxTQUFPO0FBQ0wsWUFBUSxRQURIO0FBRUwsa0JBQWM7QUFDWixtQkFBZTtBQUFDLGdCQUFRLENBQUUsUUFBRjtBQUFULE9BREg7QUFFWixpQkFBZTtBQUFDLGdCQUFRLENBQUUsUUFBRjtBQUFULE9BRkg7QUFHWixjQUFlO0FBQUMsZ0JBQVEsQ0FBRSxTQUFGO0FBQVQsT0FISDtBQUlaLGNBQWU7QUFBQyxnQkFBUSxDQUFFLFNBQUY7QUFBVCxPQUpIO0FBS1osaUJBQWU7QUFBQyxnQkFBUSxDQUFFLFNBQUY7QUFBVCxPQUxIO0FBTVosZUFBZTtBQUFDLGdCQUFRLENBQUUsUUFBRjtBQUFULE9BTkg7QUFPWixpQkFBZTtBQUFDLGdCQUFRLENBQUUsUUFBRjtBQUFULE9BUEg7QUFRWixxQkFBZTtBQUFDLGdCQUFRLENBQUUsUUFBRjtBQUFULE9B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VSxDQUFDRyxZQUQ3QyxDQUFSOztBQUdBckMsTUFBQUEsR0FBRyxDQUFDVyxhQUFKLENBQW1CLEdBQUVrQixvQkFBcUIsd0JBQTFDLEVBQW1FVixDQUFuRSxFQUFzRSxPQUF0RSxFQUErRSxNQUFJO0FBQUM7QUFBTyxPQUEzRjtBQUNEOztBQUVELFVBQU13QixXQUFXLEdBQUczQyxHQUFHLENBQUNNLFlBQUosQ0FBa0IsR0FBRWlCLGNBQWUsVUFBbkMsRUFBOENoQixRQUE5QyxFQUFwQjtBQUNBUCxJQUFBQSxHQUFHLENBQUNXLGFBQUosQ0FBbUIsR0FBRWtCLG9CQUFxQixVQUExQyxFQUFxRGMsV0FBckQsRUFBa0UsT0FBbEUsRUFBMkUsTUFBSTtBQUFDO0FBQU8sS0FBdkY7QUFFRCxHQTVDRCxDQTZDQSxPQUFPbEQsQ0FBUCxFQUFVO0FBQ1JDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZRixDQUFaO0FBQ0EsV0FBTyxFQUFQO0FBQ0Q7QUFDRiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRWYWxpZGF0ZU9wdGlvbnMoKSB7XG4gIHJldHVybiB7XG4gICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgIFwiZnJhbWV3b3JrXCI6ICAge1widHlwZVwiOiBbIFwic3RyaW5nXCIgXX0sXG4gICAgICBcInRvb2xraXRcIjogICAgIHtcInR5cGVcIjogWyBcInN0cmluZ1wiIF19LFxuICAgICAgXCJwb3J0XCI6ICAgICAgICB7XCJ0eXBlXCI6IFsgXCJpbnRlZ2VyXCIgXX0sXG4gICAgICBcImVtaXRcIjogICAgICAgIHtcInR5cGVcIjogWyBcImJvb2xlYW5cIiBdfSxcbiAgICAgIFwiYnJvd3NlclwiOiAgICAge1widHlwZVwiOiBbIFwiYm9vbGVhblwiIF19LFxuICAgICAgXCJ3YXRjaFwiOiAgICAgICB7XCJ0eXBlXCI6IFsgXCJzdHJpbmdcIiBdfSxcbiAgICAgIFwicHJvZmlsZVwiOiAgICAge1widHlwZVwiOiBbIFwic3RyaW5nXCIgXX0sXG4gICAgICBcImVudmlyb25tZW50XCI6IHtcInR5cGVcIjogWyBcInN0cmluZ1wiIF19LFxuICAgICAgXCJ2ZXJib3NlXCI6ICAgICB7XCJ0eXBlXCI6IFsgXCJzdHJpbmdcIiBdfSxcbiAgICAgIFwidGhlbWVcIjogICAgICAge1widHlwZVwiOiBbIFwic3RyaW5nXCIgXX0sXG4gICAgICBcInRyZWVzaGFrZVwiOiB7XCJ0eXBlXCI6IFsgXCJib29sZWFuXCIgXX0sXG4gICAgICBcInBhY2thZ2VzXCI6ICAgIHtcInR5cGVcIjogWyBcInN0cmluZ1wiLCBcImFycmF5XCIgXX1cbiAgICB9LFxuICAgIFwiYWRkaXRpb25hbFByb3BlcnRpZXNcIjogZmFsc2VcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdE9wdGlvbnMoKSB7XG4gIHJldHVybiB7XG4gICAgcG9ydDogMTk2MixcbiAgICBlbWl0OiB0cnVlLFxuICAgIGJyb3dzZXI6IHRydWUsXG4gICAgd2F0Y2g6ICd5ZXMnLFxuICAgIHByb2ZpbGU6ICcnLCBcbiAgICB0cmVlc2hha2U6IGZhbHNlLFxuICAgIGVudmlyb25tZW50OiAnZGV2ZWxvcG1lbnQnLCBcbiAgICB2ZXJib3NlOiAnbm8nLFxuICAgIHRvb2xraXQ6ICdtb2Rlcm4nLFxuICAgIHBhY2thZ2VzOiBudWxsXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRWYXJzKCkge1xuICByZXR1cm4ge1xuICAgIHdhdGNoU3RhcnRlZCA6IGZhbHNlLFxuICAgIGZpcnN0VGltZSA6IHRydWUsXG4gICAgZmlyc3RDb21waWxlOiB0cnVlLFxuICAgIGJyb3dzZXJDb3VudCA6IDAsXG4gICAgbWFuaWZlc3Q6IG51bGwsXG4gICAgZXh0UGF0aDogJ2V4dC1hbmd1bGFyJyxcbiAgICBwbHVnaW5FcnJvcnM6IFtdLFxuICAgIGRlcHM6IFtdLFxuICAgIHVzZWRFeHRDb21wb25lbnRzOiBbXSxcbiAgICByZWJ1aWxkOiB0cnVlXG4gIH1cbn1cblxuZnVuY3Rpb24gdG9YdHlwZShzdHIpIHtcbiAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL18vZywgJy0nKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEZyb21Tb3VyY2UobW9kdWxlLCBvcHRpb25zLCBjb21waWxhdGlvbiwgZXh0Q29tcG9uZW50cykge1xuICB0cnkge1xuICAgIHZhciBqcyA9IG1vZHVsZS5fc291cmNlLl92YWx1ZVxuICAgIGNvbnN0IGxvZ3YgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2d2XG4gICAgLy9sb2d2KG9wdGlvbnMsJ0hPT0sgc3VjY2VlZE1vZHVsZSwgRlVOQ1RJT04gZXh0cmFjdEZyb21Tb3VyY2U6ICcgKyBtb2R1bGUucmVzb3VyY2UpXG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IFtdXG5cbiAgICB2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKFwiQGJhYmVsL2dlbmVyYXRvclwiKS5kZWZhdWx0XG4gICAgdmFyIHBhcnNlID0gcmVxdWlyZShcImJhYnlsb25cIikucGFyc2VcbiAgICB2YXIgdHJhdmVyc2UgPSByZXF1aXJlKFwiYXN0LXRyYXZlcnNlXCIpXG5cbiAgICB2YXIgYXN0ID0gcGFyc2UoanMsIHtcbiAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgJ3R5cGVzY3JpcHQnLFxuICAgICAgICAnZmxvdycsXG4gICAgICAgICdkb0V4cHJlc3Npb25zJyxcbiAgICAgICAgJ29iamVjdFJlc3RTcHJlYWQnLFxuICAgICAgICAnY2xhc3NQcm9wZXJ0aWVzJyxcbiAgICAgICAgJ2V4cG9ydERlZmF1bHRGcm9tJyxcbiAgICAgICAgJ2V4cG9ydEV4dGVuc2lvbnMnLFxuICAgICAgICAnYXN5bmNHZW5lcmF0b3JzJyxcbiAgICAgICAgJ2Z1bmN0aW9uQmluZCcsXG4gICAgICAgICdmdW5jdGlvblNlbnQnLFxuICAgICAgICAnZHluYW1pY0ltcG9ydCdcbiAgICAgIF0sXG4gICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJ1xuICAgIH0pXG5cbiAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgIHByZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9uJyAmJiBub2RlLmNhbGxlZSAmJiBub2RlLmNhbGxlZS5vYmplY3QgJiYgbm9kZS5jYWxsZWUub2JqZWN0Lm5hbWUgPT09ICdFeHQnKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKGdlbmVyYXRlKG5vZGUpLmNvZGUpXG4gICAgICAgIH1cbiAgICAgICAgaWYobm9kZS50eXBlID09PSAnU3RyaW5nTGl0ZXJhbCcpIHtcbiAgICAgICAgICBsZXQgY29kZSA9IG5vZGUudmFsdWVcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvZGUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChjb2RlLmNoYXJBdChpKSA9PSAnPCcpIHtcbiAgICAgICAgICAgICAgaWYgKGNvZGUuc3Vic3RyKGksIDQpID09ICc8IS0tJykge1xuICAgICAgICAgICAgICAgIGkgKz0gNFxuICAgICAgICAgICAgICAgIGkgKz0gY29kZS5zdWJzdHIoaSkuaW5kZXhPZignLS0+JykgKyAzXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29kZS5jaGFyQXQoaSsxKSAhPT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gY29kZS5zdWJzdHJpbmcoaSlcbiAgICAgICAgICAgICAgICB2YXIgc3BhY2VFbmQgPSBzdGFydC5pbmRleE9mKCcgJylcbiAgICAgICAgICAgICAgICB2YXIgbmV3bGluZUVuZCA9IHN0YXJ0LmluZGV4T2YoJ1xcbicpXG4gICAgICAgICAgICAgICAgdmFyIHRhZ0VuZCA9IHN0YXJ0LmluZGV4T2YoJz4nKVxuICAgICAgICAgICAgICAgIHZhciBlbmQgPSBNYXRoLm1pbihzcGFjZUVuZCwgbmV3bGluZUVuZCwgdGFnRW5kKVxuICAgICAgICAgICAgICAgIGlmIChlbmQgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgdmFyIHh0eXBlID0gdG9YdHlwZShzdGFydC5zdWJzdHJpbmcoMSwgZW5kKSlcbiAgICAgICAgICAgICAgICAgIGlmKGV4dENvbXBvbmVudHMuaW5jbHVkZXMoeHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aGVWYWx1ZSA9IG5vZGUudmFsdWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhlVmFsdWUuaW5kZXhPZignZG9jdHlwZSBodG1sJykgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IHt4dHlwZTogeHR5cGV9XG4gICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbmZpZyA9IEpTT04uc3RyaW5naWZ5KHR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50cy5wdXNoKGBFeHQuY3JlYXRlKCR7Y29uZmlnfSlgKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpICs9IGVuZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gc3RhdGVtZW50c1xuICB9XG4gIGNhdGNoKGUpIHtcbiAgICBjb25zb2xlLmxvZyhlKVxuICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKCdleHRyYWN0RnJvbVNvdXJjZTogJyArIGUpXG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlSXQobykge1xuICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG4gIGNvbnN0IGZzeCA9IHJlcXVpcmUoJ2ZzLWV4dHJhJylcbiAgY29uc3Qgd2hlcmVQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIG8ud2hlcmUpXG4gIHZhciBqcyA9IGZzeC5yZWFkRmlsZVN5bmMod2hlcmVQYXRoKS50b1N0cmluZygpXG4gIHZhciBuZXdKcyA9IGpzLnJlcGxhY2Uoby5mcm9tLG8udG8pO1xuICBmc3gud3JpdGVGaWxlU3luYyh3aGVyZVBhdGgsIG5ld0pzLCAndXRmLTgnLCAoKT0+e3JldHVybn0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfdG9Qcm9kKHZhcnMsIG9wdGlvbnMpIHtcbiAgY29uc3QgbG9nID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9nXG4gIGNvbnN0IGxvZ3YgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2d2XG4gIGxvZ3Yob3B0aW9ucywnRlVOQ1RJT04gX3RvUHJvZCcpXG4gIHRyeSB7XG4gICAgY29uc3QgZnN4ID0gcmVxdWlyZSgnZnMtZXh0cmEnKVxuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKVxuICAgIGNvbnN0IG1rZGlycCA9IHJlcXVpcmUoJ21rZGlycCcpXG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG4gICAgY29uc3QgcGF0aEV4dEFuZ3VsYXJQcm9kID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGBzcmMvYXBwL2V4dC1hbmd1bGFyLXByb2RgKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aEV4dEFuZ3VsYXJQcm9kKSkge1xuICAgICAgbWtkaXJwLnN5bmMocGF0aEV4dEFuZ3VsYXJQcm9kKVxuICAgICAgY29uc3QgdCA9IHJlcXVpcmUoJy4vYXJ0aWZhY3RzJykuZXh0QW5ndWxhck1vZHVsZSgnJywgJycsICcnKVxuICAgICAgZnN4LndyaXRlRmlsZVN5bmMoYCR7cGF0aEV4dEFuZ3VsYXJQcm9kfS9leHQtYW5ndWxhci5tb2R1bGUudHNgLCB0LCAndXRmLTgnLCAoKSA9PiB7XG4gICAgICAgIHJldHVyblxuICAgICAgfSlcbiAgICB9XG5cbiAgICB2YXIgbyA9IHt9XG4gICAgby53aGVyZSA9ICdzcmMvYXBwL2FwcC5tb2R1bGUudHMnXG4gICAgby5mcm9tID0gYGltcG9ydCB7IEV4dEFuZ3VsYXJNb2R1bGUgfSBmcm9tICdAc2VuY2hhL2V4dC1hbmd1bGFyJ2BcbiAgICBvLnRvID0gYGltcG9ydCB7IEV4dEFuZ3VsYXJNb2R1bGUgfSBmcm9tICcuL2V4dC1hbmd1bGFyLXByb2QvZXh0LWFuZ3VsYXIubW9kdWxlJ2BcbiAgICBjaGFuZ2VJdChvKVxuXG4gICAgbyA9IHt9XG4gICAgby53aGVyZSA9ICdzcmMvbWFpbi50cydcbiAgICBvLmZyb20gPSBgYm9vdHN0cmFwTW9kdWxlKCBBcHBNb2R1bGUgKTtgXG4gICAgby50byA9IGBlbmFibGVQcm9kTW9kZSgpO2Jvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpO2BcbiAgICBjaGFuZ2VJdChvKVxuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5sb2coZSlcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX3RvRGV2KHZhcnMsIG9wdGlvbnMpIHtcbiAgY29uc3QgbG9nID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9nXG4gIGNvbnN0IGxvZ3YgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2d2XG4gIGxvZ3Yob3B0aW9ucywnRlVOQ1RJT04gX3RvUHJvZCcpXG4gIHRyeSB7XG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuICAgIGNvbnN0IHBhdGhFeHRBbmd1bGFyUHJvZCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBgc3JjL2FwcC9leHQtYW5ndWxhci1wcm9kYCk7XG4gICAgcmVxdWlyZSgncmltcmFmJykuc3luYyhwYXRoRXh0QW5ndWxhclByb2QpO1xuXG4gICAgdmFyIG8gPSB7fVxuICAgIG8ud2hlcmUgPSAnc3JjL2FwcC9hcHAubW9kdWxlLnRzJ1xuICAgIG8uZnJvbSA9IGBpbXBvcnQgeyBFeHRBbmd1bGFyTW9kdWxlIH0gZnJvbSAnLi9leHQtYW5ndWxhci1wcm9kL2V4dC1hbmd1bGFyLm1vZHVsZSdgXG4gICAgby50byA9IGBpbXBvcnQgeyBFeHRBbmd1bGFyTW9kdWxlIH0gZnJvbSAnQHNlbmNoYS9leHQtYW5ndWxhcidgXG4gICAgY2hhbmdlSXQobylcblxuICAgIG8gPSB7fVxuICAgIG8ud2hlcmUgPSAnc3JjL21haW4udHMnXG4gICAgby5mcm9tID0gYGVuYWJsZVByb2RNb2RlKCk7Ym9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSk7YFxuICAgIG8udG8gPSBgYm9vdHN0cmFwTW9kdWxlKCBBcHBNb2R1bGUgKTtgXG4gICAgY2hhbmdlSXQobylcbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUpXG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gX2dldEFsbENvbXBvbmVudHModmFycywgb3B0aW9ucykge1xuICBjb25zdCBsb2cgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2dcbiAgY29uc3QgbG9ndiA9IHJlcXVpcmUoJy4vcGx1Z2luVXRpbCcpLmxvZ3ZcbiAgbG9ndihvcHRpb25zLCdGVU5DVElPTiBfZ2V0QWxsQ29tcG9uZW50cycpXG5cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG4gICAgY29uc3QgZnN4ID0gcmVxdWlyZSgnZnMtZXh0cmEnKVxuXG4gICAgdmFyIGV4dENvbXBvbmVudHMgPSBbXVxuICAgIGNvbnN0IHBhY2thZ2VMaWJQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMvQHNlbmNoYS9leHQtYW5ndWxhci9zcmMvbGliJylcbiAgICB2YXIgZmlsZXMgPSBmc3gucmVhZGRpclN5bmMocGFja2FnZUxpYlBhdGgpXG4gICAgZmlsZXMuZm9yRWFjaCgoZmlsZU5hbWUpID0+IHtcbiAgICAgIGlmIChmaWxlTmFtZSAmJiBmaWxlTmFtZS5zdWJzdHIoMCwgNCkgPT0gJ2V4dC0nKSB7XG4gICAgICAgIHZhciBlbmQgPSBmaWxlTmFtZS5zdWJzdHIoNCkuaW5kZXhPZignLmNvbXBvbmVudCcpXG4gICAgICAgIGlmIChlbmQgPj0gMCkge1xuICAgICAgICAgIGV4dENvbXBvbmVudHMucHVzaChmaWxlTmFtZS5zdWJzdHJpbmcoNCwgZW5kICsgNCkpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBleHRDb21wb25lbnRzXG5cbiAgfVxuICBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUpXG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF93cml0ZUZpbGVzVG9Qcm9kRm9sZGVyKHZhcnMsIG9wdGlvbnMpIHtcbiAgY29uc3QgbG9nID0gcmVxdWlyZSgnLi9wbHVnaW5VdGlsJykubG9nXG4gIGNvbnN0IGxvZ3YgPSByZXF1aXJlKCcuL3BsdWdpblV0aWwnKS5sb2d2XG4gIGxvZ3Yob3B0aW9ucywnRlVOQ1RJT04gX3dyaXRlRmlsZXNUb1Byb2RGb2xkZXInKVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuICAgIGNvbnN0IGZzeCA9IHJlcXVpcmUoJ2ZzLWV4dHJhJylcblxuICAgIGNvbnN0IHBhY2thZ2VMaWJQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMvQHNlbmNoYS9leHQtYW5ndWxhci9zcmMvbGliJylcbiAgICBjb25zdCBwYXRoVG9FeHRBbmd1bGFyUHJvZCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBgc3JjL2FwcC9leHQtYW5ndWxhci1wcm9kYClcbiAgICBjb25zdCBzdHJpbmcgPSAnRXh0LmNyZWF0ZSh7XFxcInh0eXBlXFxcIjpcXFwiJ1xuXG4gICAgdmFycy5kZXBzLmZvckVhY2goY29kZSA9PiB7XG4gICAgICB2YXIgaW5kZXggPSBjb2RlLmluZGV4T2Yoc3RyaW5nKVxuICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgY29kZSA9IGNvZGUuc3Vic3RyaW5nKGluZGV4ICsgc3RyaW5nLmxlbmd0aClcbiAgICAgICAgdmFyIGVuZCA9IGNvZGUuaW5kZXhPZignXFxcIicpXG4gICAgICAgIHZhcnMudXNlZEV4dENvbXBvbmVudHMucHVzaChjb2RlLnN1YnN0cigwLCBlbmQpKVxuICAgICAgfVxuICAgIH0pXG4gICAgdmFycy51c2VkRXh0Q29tcG9uZW50cyA9IFsuLi5uZXcgU2V0KHZhcnMudXNlZEV4dENvbXBvbmVudHMpXVxuXG4gICAgdmFyIHdyaXRlVG9QYXRoV3JpdHRlbiA9IGZhbHNlXG4gICAgdmFyIG1vZHVsZVZhcnMgPSB7XG4gICAgICBpbXBvcnRzOiAnJyxcbiAgICAgIGV4cG9ydHM6ICcnLFxuICAgICAgZGVjbGFyYXRpb25zOiAnJ1xuICAgIH1cbiAgICB2YXJzLnVzZWRFeHRDb21wb25lbnRzLmZvckVhY2goeHR5cGUgPT4ge1xuICAgICAgdmFyIGNhcGNsYXNzbmFtZSA9IHh0eXBlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgeHR5cGUucmVwbGFjZSgvLS9nLCBcIl9cIikuc2xpY2UoMSlcbiAgICAgIG1vZHVsZVZhcnMuaW1wb3J0cyA9IG1vZHVsZVZhcnMuaW1wb3J0cyArIGBpbXBvcnQgeyBFeHQke2NhcGNsYXNzbmFtZX1Db21wb25lbnQgfSBmcm9tICcuL2V4dC0ke3h0eXBlfS5jb21wb25lbnQnO1xcbmBcbiAgICAgIG1vZHVsZVZhcnMuZXhwb3J0cyA9IG1vZHVsZVZhcnMuZXhwb3J0cyArIGAgICAgRXh0JHtjYXBjbGFzc25hbWV9Q29tcG9uZW50LFxcbmBcbiAgICAgIG1vZHVsZVZhcnMuZGVjbGFyYXRpb25zID0gbW9kdWxlVmFycy5kZWNsYXJhdGlvbnMgKyBgICAgIEV4dCR7Y2FwY2xhc3NuYW1lfUNvbXBvbmVudCxcXG5gXG4gICAgICB2YXIgY2xhc3NGaWxlID0gYGV4dC0ke3h0eXBlfS5jb21wb25lbnQudHNgXG4gICAgICBjb25zdCBjb250ZW50cyA9IGZzeC5yZWFkRmlsZVN5bmMoYCR7cGFja2FnZUxpYlBhdGh9LyR7Y2xhc3NGaWxlfWApLnRvU3RyaW5nKClcbiAgICAgIGZzeC53cml0ZUZpbGVTeW5jKGAke3BhdGhUb0V4dEFuZ3VsYXJQcm9kfS8ke2NsYXNzRmlsZX1gLCBjb250ZW50cywgJ3V0Zi04JywgKCk9PntyZXR1cm59KVxuICAgICAgd3JpdGVUb1BhdGhXcml0dGVuID0gdHJ1ZVxuICAgIH0pXG4gICAgaWYgKHdyaXRlVG9QYXRoV3JpdHRlbikge1xuICAgICAgdmFyIHQgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpLmV4dEFuZ3VsYXJNb2R1bGUoXG4gICAgICAgIG1vZHVsZVZhcnMuaW1wb3J0cywgbW9kdWxlVmFycy5leHBvcnRzLCBtb2R1bGVWYXJzLmRlY2xhcmF0aW9uc1xuICAgICAgKVxuICAgICAgZnN4LndyaXRlRmlsZVN5bmMoYCR7cGF0aFRvRXh0QW5ndWxhclByb2R9L2V4dC1hbmd1bGFyLm1vZHVsZS50c2AsIHQsICd1dGYtOCcsICgpPT57cmV0dXJufSlcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlQ29udGVudCA9IGZzeC5yZWFkRmlsZVN5bmMoYCR7cGFja2FnZUxpYlBhdGh9L2Jhc2UudHNgKS50b1N0cmluZygpXG4gICAgZnN4LndyaXRlRmlsZVN5bmMoYCR7cGF0aFRvRXh0QW5ndWxhclByb2R9L2Jhc2UudHNgLCBiYXNlQ29udGVudCwgJ3V0Zi04JywgKCk9PntyZXR1cm59KVxuXG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmxvZyhlKVxuICAgIHJldHVybiBbXVxuICB9XG59Il19