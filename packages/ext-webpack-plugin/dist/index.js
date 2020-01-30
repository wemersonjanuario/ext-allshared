'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require('@babel/polyfill');

const fs = require('fs');

const path = require('path');

const pluginUtil = require(`./pluginUtil`);

const replace = require("replace");

const configBundleName = "[name].js";
const defaultBundleName = "main.js";
const tmpCmdPluginFile = "temp.txt";

class ExtWebpackPlugin {
  constructor(options) {
    var constructorOutput = pluginUtil._constructor(options);

    this.vars = constructorOutput.vars;
    this.options = constructorOutput.options;
    this.vars.child = null;
    var me = this;
    var v = [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`];
    v.forEach(eventType => {
      process.on(eventType, function (eventType) {
        if (me.vars.child != null) {
          console.log('\nnode process and sencha cmd process ended');
          me.vars.child.kill();
          me.vars.child = null;
        } else {
          if (eventType != 0) {
            console.log('\nnode process ended');
          }
        }

        process.exit();
      });
    }); //console.log('added')
  }

  apply(compiler) {
    const vars = this.vars;
    const options = this.options;
    const app = this.app;

    if (!compiler.hooks) {
      console.log('not webpack 4');
      return;
    }

    compiler.hooks.thisCompilation.tap(`ext-this-compilation`, compilation => {
      pluginUtil.logh(app, `HOOK thisCompilation`);

      pluginUtil._thisCompilation(compiler, compilation, vars, options);

      if (vars.pluginErrors.length > 0) {
        compilation.errors.push(new Error(vars.pluginErrors.join("")));
        return;
      }
    }); //var cRun = 0;

    compiler.hooks.compilation.tap(`ext-compilation`, compilation => {
      pluginUtil.logh(app, `HOOK compilation`); //if (cRun == 0) {

      pluginUtil._compilation(compiler, compilation, vars, options); //}
      //cRun++;

    });
    compiler.hooks.afterCompile.tap('ext-after-compile', compilation => {
      pluginUtil.logh(app, `HOOK afterCompile`);

      pluginUtil._afterCompile(compiler, compilation, vars, options);
    });
    compiler.hooks.emit.tapAsync(`ext-emit`, (compilation, callback) => {
      pluginUtil.logh(app, `HOOK emit (async)`);

      pluginUtil._emit(compiler, compilation, vars, options, callback);
    });
    compiler.hooks.done.tap(`ext-done`, stats => {
      pluginUtil.logh(app, `HOOK done`);
      this.postBuildProcess(stats.compilation.outputOptions);

      pluginUtil._done(stats, vars, options);
    });
  }

  postBuildProcess(options) {
    /**
       * 1. Read the temp file written by the Cmd plugin to get the app.json configured build path
       * 2. Extract the path as a String, trimmed to the location of the build folder
       * 3. Copy webpack bundle to destination directory
       * 4. Delete the temp file
       */
    const outputPath = options.path;
    const bundleName = options.filename == configBundleName ? defaultBundleName : options.filename;
    const tempFilePath = outputPath + tmpCmdPluginFile;

    if (fs.existsSync(tempFilePath)) {
      const configProdPath = fs.readFileSync(tempFilePath, "utf8").toString().trim();
      fs.unlinkSync(tempFilePath);
      const trimmedProdPathIndex = process.cwd().length + 1;
      const prodBuildPath = configProdPath.substring(trimmedProdPathIndex);
      const copyBundleDest = path.join(prodBuildPath, bundleName);

      if (fs.existsSync(bundleName)) {
        fs.copyFileSync(bundleName, copyBundleDest);
        replace({
          regex: '</body>',
          replacement: '<script type="text/javascript" src="' + bundleName + '"></script></body>',
          paths: [path.join(prodBuildPath, 'index.html')]
        });
      }
    }
  }

}

exports.default = ExtWebpackPlugin;
module.exports = exports.default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZXF1aXJlIiwiZnMiLCJwYXRoIiwicGx1Z2luVXRpbCIsInJlcGxhY2UiLCJjb25maWdCdW5kbGVOYW1lIiwiZGVmYXVsdEJ1bmRsZU5hbWUiLCJ0bXBDbWRQbHVnaW5GaWxlIiwiRXh0V2VicGFja1BsdWdpbiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsImNvbnN0cnVjdG9yT3V0cHV0IiwiX2NvbnN0cnVjdG9yIiwidmFycyIsImNoaWxkIiwibWUiLCJ2IiwiZm9yRWFjaCIsImV2ZW50VHlwZSIsInByb2Nlc3MiLCJvbiIsImNvbnNvbGUiLCJsb2ciLCJraWxsIiwiZXhpdCIsImFwcGx5IiwiY29tcGlsZXIiLCJhcHAiLCJob29rcyIsInRoaXNDb21waWxhdGlvbiIsInRhcCIsImNvbXBpbGF0aW9uIiwibG9naCIsIl90aGlzQ29tcGlsYXRpb24iLCJwbHVnaW5FcnJvcnMiLCJsZW5ndGgiLCJlcnJvcnMiLCJwdXNoIiwiRXJyb3IiLCJqb2luIiwiX2NvbXBpbGF0aW9uIiwiYWZ0ZXJDb21waWxlIiwiX2FmdGVyQ29tcGlsZSIsImVtaXQiLCJ0YXBBc3luYyIsImNhbGxiYWNrIiwiX2VtaXQiLCJkb25lIiwic3RhdHMiLCJwb3N0QnVpbGRQcm9jZXNzIiwib3V0cHV0T3B0aW9ucyIsIl9kb25lIiwib3V0cHV0UGF0aCIsImJ1bmRsZU5hbWUiLCJmaWxlbmFtZSIsInRlbXBGaWxlUGF0aCIsImV4aXN0c1N5bmMiLCJjb25maWdQcm9kUGF0aCIsInJlYWRGaWxlU3luYyIsInRvU3RyaW5nIiwidHJpbSIsInVubGlua1N5bmMiLCJ0cmltbWVkUHJvZFBhdGhJbmRleCIsImN3ZCIsInByb2RCdWlsZFBhdGgiLCJzdWJzdHJpbmciLCJjb3B5QnVuZGxlRGVzdCIsImNvcHlGaWxlU3luYyIsInJlZ2V4IiwicmVwbGFjZW1lbnQiLCJwYXRocyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUFDQUEsT0FBTyxD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LFdBQVcsRUFBRSx5Q0FBdUNoQixVQUF2QyxHQUFrRCxvQkFGekQ7QUFHTmlCLFVBQUFBLEtBQUssRUFBRSxDQUFDcEUsSUFBSSxDQUFDcUMsSUFBTCxDQUFVeUIsYUFBVixFQUF5QixZQUF6QixDQUFEO0FBSEQsU0FBRCxDQUFQO0FBS0Q7QUFDRjtBQUNKOztBQXJHbUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcbnJlcXVpcmUoJ0BiYWJlbC9wb2x5ZmlsbCcpXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgcGx1Z2luVXRpbCA9IHJlcXVpcmUoYC4vcGx1Z2luVXRpbGApXG5jb25zdCByZXBsYWNlID0gcmVxdWlyZShcInJlcGxhY2VcIik7XG5cbmNvbnN0IGNvbmZpZ0J1bmRsZU5hbWUgPSBcIltuYW1lXS5qc1wiO1xuY29uc3QgZGVmYXVsdEJ1bmRsZU5hbWUgPSBcIm1haW4uanNcIlxuY29uc3QgdG1wQ21kUGx1Z2luRmlsZSA9IFwidGVtcC50eHRcIlxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdmFyIGNvbnN0cnVjdG9yT3V0cHV0ID0gcGx1Z2luVXRpbC5fY29uc3RydWN0b3Iob3B0aW9ucylcbiAgICB0aGlzLnZhcnMgPSBjb25zdHJ1Y3Rvck91dHB1dC52YXJzXG4gICAgdGhpcy5vcHRpb25zID0gY29uc3RydWN0b3JPdXRwdXQub3B0aW9uc1xuXG4gICAgdGhpcy52YXJzLmNoaWxkID0gbnVsbDtcbiAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgdmFyIHYgPSBbYGV4aXRgLCBgU0lHSU5UYCwgYFNJR1VTUjFgLCBgU0lHVVNSMmAsIGB1bmNhdWdodEV4Y2VwdGlvbmAsIGBTSUdURVJNYF1cbiAgICB2LmZvckVhY2goZXZlbnRUeXBlID0+IHtcbiAgICAgIHByb2Nlc3Mub24oZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudFR5cGUpe1xuICAgICAgICBpZiAobWUudmFycy5jaGlsZCAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1xcbm5vZGUgcHJvY2VzcyBhbmQgc2VuY2hhIGNtZCBwcm9jZXNzIGVuZGVkJylcbiAgICAgICAgICBtZS52YXJzLmNoaWxkLmtpbGwoKTtcbiAgICAgICAgICBtZS52YXJzLmNoaWxkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoZXZlbnRUeXBlICE9IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcXG5ub2RlIHByb2Nlc3MgZW5kZWQnKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLmV4aXQoKTtcbiAgICAgIH0pO1xuICAgIH0pXG4gICAgLy9jb25zb2xlLmxvZygnYWRkZWQnKVxuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBjb25zdCB2YXJzID0gdGhpcy52YXJzXG4gICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICAgIGNvbnN0IGFwcCA9IHRoaXMuYXBwXG5cbiAgICBpZiAoIWNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb25zb2xlLmxvZygnbm90IHdlYnBhY2sgNCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbXBpbGVyLmhvb2tzLnRoaXNDb21waWxhdGlvbi50YXAoYGV4dC10aGlzLWNvbXBpbGF0aW9uYCwgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICBwbHVnaW5VdGlsLmxvZ2goYXBwLCBgSE9PSyB0aGlzQ29tcGlsYXRpb25gKVxuICAgICAgcGx1Z2luVXRpbC5fdGhpc0NvbXBpbGF0aW9uKGNvbXBpbGVyLCBjb21waWxhdGlvbiwgdmFycywgb3B0aW9ucylcblxuICAgICAgaWYgKHZhcnMucGx1Z2luRXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29tcGlsYXRpb24uZXJyb3JzLnB1c2goIG5ldyBFcnJvcih2YXJzLnBsdWdpbkVycm9ycy5qb2luKFwiXCIpKSApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvL3ZhciBjUnVuID0gMDtcbiAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoYGV4dC1jb21waWxhdGlvbmAsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgcGx1Z2luVXRpbC5sb2doKGFwcCwgYEhPT0sgY29tcGlsYXRpb25gKVxuICAgICAgLy9pZiAoY1J1biA9PSAwKSB7XG4gICAgICAgIHBsdWdpblV0aWwuX2NvbXBpbGF0aW9uKGNvbXBpbGVyLCBjb21waWxhdGlvbiwgdmFycywgb3B0aW9ucyk7XG4gICAgICAvL31cbiAgICAgIC8vY1J1bisrO1xuICAgIH0pXG5cbiAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgcGx1Z2luVXRpbC5sb2doKGFwcCwgYEhPT0sgYWZ0ZXJDb21waWxlYClcbiAgICAgIHBsdWdpblV0aWwuX2FmdGVyQ29tcGlsZShjb21waWxlciwgY29tcGlsYXRpb24sIHZhcnMsIG9wdGlvbnMpXG4gICAgfSlcblxuICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwQXN5bmMoYGV4dC1lbWl0YCwgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgcGx1Z2luVXRpbC5sb2doKGFwcCwgYEhPT0sgZW1pdCAoYXN5bmMpYClcbiAgICAgIHBsdWdpblV0aWwuX2VtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCB2YXJzLCBvcHRpb25zLCBjYWxsYmFjaylcbiAgICB9KVxuXG4gICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoYGV4dC1kb25lYCwgKHN0YXRzKSA9PiB7XG4gICAgICBwbHVnaW5VdGlsLmxvZ2goYXBwLCBgSE9PSyBkb25lYClcbiAgICAgIHRoaXMucG9zdEJ1aWxkUHJvY2VzcyhzdGF0cy5jb21waWxhdGlvbi5vdXRwdXRPcHRpb25zKVxuICAgICAgcGx1Z2luVXRpbC5fZG9uZShzdGF0cywgdmFycywgb3B0aW9ucylcbiAgICB9KVxuICB9XG5cbiAgcG9zdEJ1aWxkUHJvY2VzcyhvcHRpb25zKSB7XG4gICAgLyoqXG4gICAgICAgKiAxLiBSZWFkIHRoZSB0ZW1wIGZpbGUgd3JpdHRlbiBieSB0aGUgQ21kIHBsdWdpbiB0byBnZXQgdGhlIGFwcC5qc29uIGNvbmZpZ3VyZWQgYnVpbGQgcGF0aFxuICAgICAgICogMi4gRXh0cmFjdCB0aGUgcGF0aCBhcyBhIFN0cmluZywgdHJpbW1lZCB0byB0aGUgbG9jYXRpb24gb2YgdGhlIGJ1aWxkIGZvbGRlclxuICAgICAgICogMy4gQ29weSB3ZWJwYWNrIGJ1bmRsZSB0byBkZXN0aW5hdGlvbiBkaXJlY3RvcnlcbiAgICAgICAqIDQuIERlbGV0ZSB0aGUgdGVtcCBmaWxlXG4gICAgICAgKi9cbiAgICAgIGNvbnN0IG91dHB1dFBhdGggPSBvcHRpb25zLnBhdGg7XG4gICAgICBjb25zdCBidW5kbGVOYW1lID0gKChvcHRpb25zLmZpbGVuYW1lID09IGNvbmZpZ0J1bmRsZU5hbWUpID8gZGVmYXVsdEJ1bmRsZU5hbWUgOiBvcHRpb25zLmZpbGVuYW1lKTtcbiAgICAgIGNvbnN0IHRlbXBGaWxlUGF0aCA9IG91dHB1dFBhdGggKyB0bXBDbWRQbHVnaW5GaWxlO1xuXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZW1wRmlsZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IGNvbmZpZ1Byb2RQYXRoID0gZnMucmVhZEZpbGVTeW5jKHRlbXBGaWxlUGF0aCwgXCJ1dGY4XCIpLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgICAgICBmcy51bmxpbmtTeW5jKHRlbXBGaWxlUGF0aCk7XG4gICAgICAgIGNvbnN0IHRyaW1tZWRQcm9kUGF0aEluZGV4ID0gcHJvY2Vzcy5jd2QoKS5sZW5ndGgrMTtcbiAgICAgICAgY29uc3QgcHJvZEJ1aWxkUGF0aCA9IGNvbmZpZ1Byb2RQYXRoLnN1YnN0cmluZyh0cmltbWVkUHJvZFBhdGhJbmRleClcbiAgICAgICAgY29uc3QgY29weUJ1bmRsZURlc3QgPSBwYXRoLmpvaW4ocHJvZEJ1aWxkUGF0aCwgYnVuZGxlTmFtZSk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJ1bmRsZU5hbWUpKSB7XG4gICAgICAgICAgZnMuY29weUZpbGVTeW5jKGJ1bmRsZU5hbWUsIGNvcHlCdW5kbGVEZXN0KTtcbiAgICAgICAgICByZXBsYWNlKHtcbiAgICAgICAgICAgIHJlZ2V4OiAnPC9ib2R5PicsXG4gICAgICAgICAgICByZXBsYWNlbWVudDogJzxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIicrYnVuZGxlTmFtZSsnXCI+PC9zY3JpcHQ+PC9ib2R5PicsXG4gICAgICAgICAgICBwYXRoczogW3BhdGguam9pbihwcm9kQnVpbGRQYXRoLCAnaW5kZXguaHRtbCcpXVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gIH1cbn1cbiJdfQ==