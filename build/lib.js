var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports"], function (require, exports) {
    'use strict';
    var GUID;
    (function (GUID) {
        function version4() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        GUID.version4 = version4;
    })(GUID = exports.GUID || (exports.GUID = {}));
    exports.wdebug = document.location.search.indexOf('debug=1') > -1 ?
        console.log : function () { };
    var WS;
    (function (WS) {
        var _session = GUID.version4();
        function createClient(url, protos) {
            return new _Client(url, protos);
        }
        WS.createClient = createClient;
        function createNamedClient(name, url, protos) {
            return new _NamedClient(url, name, protos);
        }
        WS.createNamedClient = createNamedClient;
        var _Client = (function () {
            function _Client(_url, _protos) {
                this._url = _url;
                this._protos = _protos;
                this._isConnected = false;
            }
            _Client.prototype.readResponse = function (blob) {
                var _ = this;
                var blobReader = new FileReader();
                blobReader.onloadend = function (ev) {
                    var _res = JSON.parse(blobReader.result);
                    var res = {
                        ok: _res.ok,
                        data: _res.data,
                        type: _res.type
                    };
                    _.onmessage(res, _.sock, ev);
                };
                blobReader.readAsText(blob);
            };
            Object.defineProperty(_Client.prototype, "session", {
                get: function () {
                    return _session;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(_Client.prototype, "isConnected", {
                get: function () {
                    return this._isConnected;
                },
                enumerable: true,
                configurable: true
            });
            _Client.prototype.send = function (msg) {
                if (this._isConnected) {
                    this.sock.send(JSON.stringify(msg));
                }
            };
            _Client.prototype.start = function () {
                var _ = this;
                this.sock = new WebSocket(this._url, this._protos);
                this.sock.onopen = function onopen(ev) {
                    exports.wdebug('onopen: ', this, ev);
                    if (_.onopen) {
                        _._isConnected = true;
                        _.onopen(this, ev);
                    }
                };
                this.sock.onclose = function onclose(ev) {
                    exports.wdebug('onclose: ', this, ev);
                    _._isConnected = false;
                    if (_.onclose) {
                        _.onclose(this, ev);
                    }
                };
                this.sock.onerror = function onerror(ev) {
                    exports.wdebug('onerror: ', this, ev);
                    if (_.onerror) {
                        _.onerror(this, ev);
                    }
                };
                this.sock.onmessage = function onmessage(ev) {
                    exports.wdebug('onmessage: ', this, ev);
                    if (_.onmessage) {
                        _.readResponse(ev.data);
                    }
                };
            };
            return _Client;
        }());
        var _NamedClient = (function (_super) {
            __extends(_NamedClient, _super);
            function _NamedClient(_url, _name, _protos) {
                var _this = _super.call(this, _url, _protos) || this;
                _this._url = _url;
                _this._name = _name;
                _this._protos = _protos;
                return _this;
            }
            Object.defineProperty(_NamedClient.prototype, "name", {
                get: function () {
                    return this._name;
                },
                enumerable: true,
                configurable: true
            });
            return _NamedClient;
        }(_Client));
    })(WS = exports.WS || (exports.WS = {}));
});
//# sourceMappingURL=lib.js.map