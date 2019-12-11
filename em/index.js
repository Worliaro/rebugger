/* eslint-disable space-before-function-paren */
/* eslint-disable quotes */
// type异常类型 caught 手动上报异常 unCaught 自动捕获代码异常 sourceError 资源加载异常 httpError 请求异常 unhandledRejection 未处理promise异常 handledRejection
import utils from "./lib/common";
import config from "./config/index";

var rebugger = {
  options: {
    apikey: "",
    useCustomField: "false",
    silent: false,
    silentDev: false,
    silentPre: false,
    // 异常上传模式
    reportMode: "onError",
    // 版本信息
    appVersion: "",
    // 环境信息
    env: "",
    // 用户信息
    user: {
      name: "",
      email: ""
    },
    // 其它自定义信息
    metaData: {},
    ip: "",
    cityId: "",
    cityName: "",
    // 自定义保存字段 数据将会保存在metaData里面 origin: localStorage / sessionStorage / window / cookie 不能获取跨域信息 需要将js文件下载
    customField: [
      {
        fullName: {
          origin: "localStorage",
          keyPaths: "user.fullName"
        },
        uid: {
          origin: "localStorage",
          keyPaths: "user.uid"
        }
      }
    ]
  },
  // 初始化 rebugger 框架内使用
  init(apikey, options) {},
  getHostName: function() {
    return document.domain;
  },
  report: function(paramStr) {
    var reportUrl = config.baseUrl;
    new Image().src = reportUrl + "?" + paramStr;
  },
  // 发送错误对象信息
  reportObject: function(obj) {
    let paramStr = "";
    for (var key in obj) {
      paramStr = paramStr + key + "=" + obj[key] + "&";
    }
    this.report(paramStr);
  },
  // 获取异常组件名称
  getComponentName(vm) {
    if (vm.$root === vm) return "root";
    var name = vm._isVue
      ? (vm.$options && vm.$options.name) ||
        (vm.$options && vm.$options._componentTag)
      : vm.name;
    return (
      (name ? "component <" + name + ">" : "anonymous component") +
      (vm._isVue && vm.$options && vm.$options.__file
        ? " at " + (vm.$options && vm.$options.__file)
        : "")
    );
  },
  initVueErrorHandler(vue) {
    vue.config.errorHandler = function(err, vm, info) {
      // handle error
      // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
      // 只在 2.2.0+ 可用
      console.error("Vue errror", err);
      // console.log(info);
      let componentName = rebugger.getComponentName(vm);
      let propsData = vm.$options && vm.$options.propsData;
      let {
        message, // 异常信息
        name, // 异常名称
        fileName, // 异常脚本url
        lineNumber, // 异常行号
        columnNumber, // 异常列号
        stack // 异常堆栈信息
      } = err;

      let initParam = {
        apikey: rebugger.options.apikey,
        ip: rebugger.options.ip,
        cityId: rebugger.options.cityId,
        cityName: rebugger.options.cityName
      };

      let stackStr = stack.toString();
      let arr = stackStr.split(/[\n]/);
      if (arr.length > 1 && !fileName) {
        let str = arr[1];
        let tempArr = str.split("(");
        if (tempArr.length == 2) {
          str = tempArr[1];
          let tmpArr = str.split(":");
          if (tmpArr.length > 1) {
            lineNumber = tmpArr[tmpArr.length - 2];
            columnNumber = tmpArr[tmpArr.length - 1];
            fileName = str.replace(":" + lineNumber + ":" + columnNumber, "");
            columnNumber = columnNumber.replace(")", "");
            console.log(lineNumber);
            console.log(columnNumber);
            console.log(fileName);
          }
        }
      }
      let errorInfo = {
        name: name,
        message: name + ":" + message,
        fileName,
        lineNumber,
        columnNumber,
        componentName,
        type: "unCaught",
        propsData: propsData ? JSON.stringify(propsData) : "",
        stack: stack.toString()
      };
      let baseInfo = utils.getBaseInfo();
      let params = Object.assign({}, initParam, baseInfo, errorInfo);
      console.log(params);
      rebugger.reportObject(params);
    };
  }
};
export default rebugger;
// debuger
(function() {
  let apikey = "";
  // 是否获取自定义字段收集
  let useCustomField = false;
  // 是否禁用 rebugger 不收集任何信息
  let silent = false;
  // 开发环境是否收集
  let silentDev = false;
  // 测试环境是否收集
  let silentTest = false;
  // 预发布环境是否收集
  let silentPre = false;
  // 异常上报模式 onError 立即上报 byDay 按天上报 onErrorOffline 立即上报但支持线下缓存
  let reportMode = "onError";

  var script = document.querySelector("#rebugger");
  if (script) {
    apikey = script.getAttribute("apikey");
    let useCustomFieldStr = script.getAttribute("useCustomField");
    let silentAttr = script.getAttribute("silent");
    if (useCustomFieldStr && useCustomFieldStr == "true") {
      useCustomField = true;
    }
    if (silentAttr && silentAttr == "true") {
      console.log("silent true");
      silent = true;
      return;
    }
    let silentDevAttr = script.getAttribute("silentDev");
    let domain = document.domain;
    if (silentDevAttr && silentDevAttr == "true") {
      silentDev = true;
      let isDev = false;
      let arr = domain.split(".");
      if (
        domain === "127.0.0.1" ||
        domain === "localhost" ||
        arr[0].indexOf("dev") != -1
      ) {
        // 开发环境禁用
        console.log("silentDev true");
        isDev = true;
        return;
      }
    }
    let silentTestAttr = script.getAttribute("silentTest");
    if (silentTestAttr && silentTestAttr == "true") {
      silentTest = true;
      if (domain.indexOf("test") != -1) {
        // 测试环境禁用
        console.log("silentTest true");
        return;
      }
    }
    let silentPreAttr = script.getAttribute("silentPre");
    if (silentPreAttr && silentPreAttr == "true") {
      silentPre = true;
      if (domain.indexOf("pre") != -1) {
        // 预发布环境禁用
        console.log("silentPre true");
        return;
      }
    }
  } else {
    console.warn("script should be set id = 'rebugger'");
    return;
  }

  let ip = "";
  let cityId = "";
  let cityName = "";
  // 获取客户端ip和城市信息
  if (returnCitySN) {
    ip = returnCitySN["cip"];
    cityId = returnCitySN["cid"];
    cityName = returnCitySN["cname"];
  }
  rebugger.options.ip = ip;
  rebugger.options.cityId = cityId;
  rebugger.options.cityName = cityName;
  let initParam = { apikey, ip, cityId, cityName };
  console.log("init rebugger");
  if (!apikey) {
    console.warn("rebugger request apikey");
    console.warn("rebugger 缺少apikey 请到rebugger管理后台注册应用后使用");
    // return;
  }

  rebugger.options.apikey = apikey;
  rebugger.options.useCustomField = useCustomField;
  rebugger.options.silent = silent;
  rebugger.options.silentDev = silentDev;
  rebugger.options.silentTest = silentTest;
  rebugger.options.silentPre = silentPre;

  // window.onerror = function(message, source, lineno, colno, error){
  //   console.log("window.onerror");
  //   console.log("msg ",message,source,lineno,colno,error);
  // }
  window.addEventListener(
    "error",
    event => {
      // 过滤js error
      let target = event.target || event.srcElement;
      let isElementTarget =
        target instanceof HTMLScriptElement ||
        target instanceof HTMLLinkElement ||
        target instanceof HTMLImageElement;
      if (!isElementTarget) {
        // js报错
        console.log("js error", event);
        let fileName, lineNumber, columnNumber;
        fileName = event.filename;
        // console.log(scriptURI);
        lineNumber = event.lineno;
        columnNumber = event.colno;

        let title = event.message;
        let stack = event.error ? event.error.stack : "";
        let errorInfo = {
          name: event.message,
          message: event.message,
          fileName,
          lineNumber,
          columnNumber,
          type: "unCaught",
          stack: stack.toString()
        };
        let baseInfo = utils.getBaseInfo();
        let params = Object.assign({}, initParam, baseInfo, errorInfo);
        console.log(params);
        rebugger.reportObject(params);
      } else {
        // 上报资源地址
        let src = target.src || target.href;
        console.log("资源加载异常", src);
        console.log(event);
        let tagName = target.tagName;
        console.log(tagName);
        let outerHTML = target.outerHTML;
        let selector = "";
        let paths = event.path;
        if (paths && paths.length > 0) {
          paths.reverse();
          // console.log(paths);
          let arr = [];
          if (paths.length > 4) {
            arr = paths.slice(paths.length - 5);
          } else {
            arr = paths;
          }
          arr.forEach((item, index) => {
            let className = item.className
              ? "." + item.className.replace(/\s+/g, ".")
              : "";
            if (index == arr.length - 1) {
              selector = selector + item.tagName.toLowerCase() + className;
            } else {
              selector =
                selector + item.tagName.toLowerCase() + className + " > ";
            }
          });
        } else {
          // 通过parentNode来寻找 先不递归 按层获取
          let selectorArr = [];
          let currentNode = target;
          let tagName = currentNode.tagName.toLowerCase();
          let className = currentNode.className
            ? "." + currentNode.className.replace(/\s+/g, ".")
            : "";
          if (tagName != "body") {
            selectorArr.push(tagName + className);
            currentNode = currentNode.parentNode;
            tagName = currentNode.tagName.toLowerCase();
            className = currentNode.className
              ? "." + currentNode.className.replace(/\s+/g, ".")
              : "";
            if (tagName != "body") {
              selectorArr.push(tagName + className);
              currentNode = currentNode.parentNode;
              tagName = currentNode.tagName.toLowerCase();
              className = currentNode.className
                ? "." + currentNode.className.replace(/\s+/g, ".")
                : "";
              if (tagName != "body") {
                selectorArr.push(tagName + className);
                currentNode = currentNode.parentNode;
                tagName = currentNode.tagName.toLowerCase();
                className = currentNode.className
                  ? "." + currentNode.className.replace(/\s+/g, ".")
                  : "";
                selectorArr.push(tagName + className);
              }
            }
          }
          selectorArr.reverse();
          selectorArr.forEach((item, index) => {
            if (index == selectorArr.length - 1) {
              selector = selector + item;
            } else {
              selector = selector + item + " > ";
            }
          });
        }
        // outerHTML XPath status 404 statusText selector
        let errorInfo = {
          src: src,
          tagName,
          outerHTML,
          status: 404,
          statusText: "Not Found",
          selector
        };
        let baseInfo = utils.getBaseInfo();
        let params = Object.assign({}, initParam, baseInfo, errorInfo);
        console.log(params);
        rebugger.reportObject(params);
      }
    },
    true
  );

  // 被Vue捕获的错误
  if (window.Vue) {
    rebugger.initVueErrorHandler(window.Vue);
  }
  // 未处理的promise错误 rejectionhandled unhandledrejection
  window.addEventListener("unhandledrejection", event => {
    // 错误的详细信息在reason字段
    // demo:settimeout error
    console.log("未处理的promise错误", event);
    let message = event.reason.message;
    let stack = event.reason.stack;
    let type = "unhandledRejection";
    if (!message && !stack) {
      message = "caught promise error";
      stack = JSON.stringify(event.reason);
    }
    let errorInfo = {
      name: event.reason.stack.name ? event.reason.stack.name : message,
      message,
      stack,
      type,
      columnNumber: event.reason.columnNumber,
      fileName: event.reason.fileName,
      lineNumber: event.reason.lineNumber
    };
    let reason = event.reason;
    // 未处理网络promiase异常
    if (message == "Network Error") {
      type = "httpError";
      errorInfo.type = "httpError";
      if (reason.config) {
        let requestInfo = {
          method: reason.config.method,
          url: reason.config.url
        };
        errorInfo.request = JSON.stringify(requestInfo);
        let responseInfo = {};
        // 未验证 待验证
        if (reason.response) {
          responseInfo.status = reason.response.status;
          responseInfo.statusText = reason.response.statusText;
        }
      }
    }
    // 未处理promise里面的语法异常
    if (message != "Network Error" && message != "caught promise error") {
      let stackStr = event.reason.stack.toString();
      let arr = stackStr.split(/[\n]/);
      let fileName, lineNumber, columnNumber;
      if (arr.length > 1 && arr[1].indexOf("at") != -1 && !errorInfo.fileName) {
        let str = arr[1];
        let tempArr = str.split("(");
        if (tempArr.length == 2) {
          str = tempArr[1];
          let tmpArr = str.split(":");
          if (tmpArr.length > 1) {
            lineNumber = tmpArr[tmpArr.length - 2];
            columnNumber = tmpArr[tmpArr.length - 1];
            fileName = str.replace(":" + lineNumber + ":" + columnNumber, "");
            columnNumber = columnNumber.replace(")", "");
            console.log(lineNumber);
            console.log(columnNumber);
            console.log(fileName);
            errorInfo.lineNumber = lineNumber;
            errorInfo.columnNumber = columnNumber;
            errorInfo.fileName = fileName;
          }
        }
      }
    }
    console.log(errorInfo);
    let baseInfo = utils.getBaseInfo();
    let params = Object.assign({}, initParam, baseInfo, errorInfo);
    console.log(params);
    rebugger.reportObject(params);
  });

  // 处理的promise错误
  window.addEventListener("rejectionhandled", event => {
    // 错误的详细信息在reason字段
    // demo:settimeout error
    console.log("rejectionhandled promise error", event);
    let title = event.reason.message;
    let stack = event.reason.stack;
  });
})();
